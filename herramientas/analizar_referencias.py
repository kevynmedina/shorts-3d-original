"""Analiza los videos de referencia (TikToks / Shorts) de una carpeta y saca patrones.

Por cada video crea referencias/analisis/<nombre>/ con:
  cuadros/seg_NNN.jpg  -> un cuadro por segundo (o cada --cada segundos)
  hoja.jpg             -> todos esos cuadros en una sola imagen, con su segundo
  cortes.jpg           -> el primer cuadro de cada toma (después de cada corte)
  transcripcion.json   -> texto y palabras con tiempos (solo si faster-whisper está instalado)
  resumen.json         -> duración, formato, cortes, duración de tomas, silencios,
                          loudness (LUFS), pico, palabras por segundo y gancho

Y al final un reporte conjunto: referencias/analisis/REPORTE.md (promedios y tabla).

Los videos se usan para medir patrones (ritmo, estructura, encuadre), no para
copiar guiones, personajes ni tomas.

Uso:
  .venv\\Scripts\\python.exe herramientas\\analizar_referencias.py
  .venv\\Scripts\\python.exe herramientas\\analizar_referencias.py --forzar --cada 0.5
  .venv\\Scripts\\python.exe herramientas\\analizar_referencias.py --sin-voz

Transcripción opcional:
  .venv\\Scripts\\python.exe -m pip install faster-whisper
"""
import argparse
import json
import re
import statistics
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "referencias" / "videos"
SALIDA = RAIZ / "referencias" / "analisis"
EXTENSIONES = {".mp4", ".mov", ".webm", ".mkv", ".m4v"}
TW, TH = 180, 320  # miniatura en las hojas


def correr(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def info(ruta):
    r = correr(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(ruta)])
    d = json.loads(r.stdout or "{}")
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), {})
    a = next((s for s in d.get("streams", []) if s.get("codec_type") == "audio"), None)
    num, _, den = (v.get("avg_frame_rate") or "0/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 0.0
    return {
        "duracion_s": round(float(d.get("format", {}).get("duration", 0)), 2),
        "ancho": v.get("width"),
        "alto": v.get("height"),
        "fps": round(fps, 2),
        "tiene_audio": a is not None,
    }


def cortes(ruta, umbral):
    r = correr(["ffmpeg", "-hide_banner", "-i", str(ruta), "-vf",
                f"select='gt(scene,{umbral})',showinfo", "-an", "-f", "null", "-"])
    tiempos = [round(float(t), 2) for t in re.findall(r"pts_time:([\d.]+)", r.stderr)]
    # una transición suave (fundido, barrido) dispara varios cuadros seguidos: se cuenta una vez
    unidos = []
    for t in tiempos:
        if not unidos or t - unidos[-1] > 0.4:
            unidos.append(t)
    return unidos


def silencios(ruta, umbral_db=-35, minimo=0.3):
    r = correr(["ffmpeg", "-hide_banner", "-i", str(ruta), "-af",
                f"silencedetect=n={umbral_db}dB:d={minimo}", "-vn", "-f", "null", "-"])
    ini = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    dur = [float(x) for x in re.findall(r"silence_duration: ([\d.]+)", r.stderr)]
    return [{"inicio": round(i, 2), "duracion": round(d, 2)} for i, d in zip(ini, dur)]


def loudness(ruta):
    r = correr(["ffmpeg", "-hide_banner", "-i", str(ruta), "-af", "ebur128=peak=true",
                "-vn", "-f", "null", "-"])
    resumen = r.stderr.split("Summary:")[-1]
    lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", resumen)
    pico = re.search(r"Peak:\s+(-?[\d.]+) dBFS", resumen)
    return (float(lufs.group(1)) if lufs else None, float(pico.group(1)) if pico else None)


def extraer_cuadros(ruta, carpeta, cada):
    carpeta.mkdir(parents=True, exist_ok=True)
    correr(["ffmpeg", "-v", "error", "-y", "-i", str(ruta), "-vf",
            f"fps=1/{cada},scale={TW * 2}:-2", "-q:v", "3", str(carpeta / "seg_%03d.jpg")])
    return sorted(carpeta.glob("seg_*.jpg"))


def cuadro_en(ruta, t, destino):
    correr(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(ruta),
            "-frames:v", "1", "-vf", f"scale={TW * 2}:-2", "-q:v", "3", str(destino)])
    return destino if destino.exists() else None


def hoja(imagenes, etiquetas, destino, columnas=8):
    if not imagenes:
        return
    filas = (len(imagenes) + columnas - 1) // columnas
    lienzo = Image.new("RGB", (columnas * TW, filas * (TH + 22)), (20, 20, 24))
    dib = ImageDraw.Draw(lienzo)
    for i, (img, txt) in enumerate(zip(imagenes, etiquetas)):
        x, y = (i % columnas) * TW, (i // columnas) * (TH + 22)
        with Image.open(img) as im:
            im = im.convert("RGB")
            im.thumbnail((TW, TH))
            lienzo.paste(im, (x + (TW - im.width) // 2, y + 22))
        dib.text((x + 4, y + 4), txt, fill=(255, 220, 90))
    lienzo.save(destino, quality=88)


def registrar_cuda():
    """Hace visibles las DLL de CUDA instaladas con pip (nvidia-cublas-cu12, nvidia-cudnn-cu12)."""
    import os
    import site
    bases = site.getsitepackages() + [site.getusersitepackages()]
    for base in bases:
        for bin_dir in (Path(base) / "nvidia").glob("*/bin"):
            os.add_dll_directory(str(bin_dir))
            os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ["PATH"]


def transcribir(ruta, modelo_nombre):
    registrar_cuda()
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None
    import numpy as np

    # audio decodificado con ffmpeg (16 kHz mono) para no depender de PyAV
    crudo = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ruta), "-vn", "-ac", "1", "-ar", "16000",
                            "-f", "f32le", "-"], capture_output=True).stdout
    audio = np.frombuffer(crudo, np.float32)
    # intenta GPU; si faltan las librerías CUDA (cublas/cudnn), sigue en CPU
    for dispositivo in ("auto", "cpu"):
        try:
            modelo = WhisperModel(modelo_nombre, device=dispositivo,
                                  compute_type="float16" if dispositivo == "auto" else "int8")
            segmentos, datos = modelo.transcribe(audio, word_timestamps=True, vad_filter=True)
            segs, palabras = [], []
            for s in segmentos:  # la transcripción real ocurre al recorrer
                segs.append({"inicio": round(s.start, 2), "fin": round(s.end, 2), "texto": s.text.strip()})
                for w in s.words or []:
                    palabras.append({"palabra": w.word.strip(), "inicio": round(w.start, 2), "fin": round(w.end, 2)})
            return {"idioma": datos.language, "segmentos": segs, "palabras": palabras}
        except RuntimeError as e:
            if dispositivo == "cpu" or not re.search(r"cublas|cudnn|cuda", str(e), re.I):
                raise
            print("  GPU no disponible para Whisper, usando CPU...")


def gancho(trans):
    """Primera frase (hasta . ? ! o 4 s) y cuántas palabras tiene."""
    if not trans or not trans["palabras"]:
        return None
    frase = []
    for w in trans["palabras"]:
        frase.append(w)
        if re.search(r"[.?!¿¡…]$", w["palabra"]) or w["fin"] >= 4.0:
            break
    return {"texto": " ".join(w["palabra"] for w in frase), "palabras": len(frase),
            "fin_s": frase[-1]["fin"]}


def analizar(ruta, args):
    out = SALIDA / ruta.stem
    resumen_p = out / "resumen.json"
    if resumen_p.exists() and not args.forzar:
        print(f"  ya analizado (usa --forzar para repetir)")
        return json.loads(resumen_p.read_text(encoding="utf-8"))
    out.mkdir(parents=True, exist_ok=True)

    r = {"archivo": ruta.name, **info(ruta)}
    dur = r["duracion_s"]

    print("  cortes...")
    c = cortes(ruta, args.umbral)
    limites = [0.0] + c + [dur]
    tomas = [round(b - a, 2) for a, b in zip(limites, limites[1:]) if b - a > 0.05]
    r.update({"cortes_s": c, "num_tomas": len(tomas), "duracion_tomas_s": tomas,
              "toma_promedio_s": round(statistics.mean(tomas), 2) if tomas else None,
              "primer_corte_s": c[0] if c else None})

    print("  cuadros...")
    imgs = extraer_cuadros(ruta, out / "cuadros", args.cada)
    hoja(imgs, [f"{i * args.cada:.1f}s" for i in range(len(imgs))], out / "hoja.jpg")
    tomas_img = [cuadro_en(ruta, t + 0.05, out / f"toma_{i:02d}.jpg") for i, t in enumerate([0.0] + c)]
    pares = [(p, f"toma {i + 1} @ {t:.1f}s") for i, (p, t) in enumerate(zip(tomas_img, [0.0] + c)) if p]
    hoja([p for p, _ in pares], [e for _, e in pares], out / "cortes.jpg")
    for p, _ in pares:
        p.unlink()

    if r["tiene_audio"]:
        print("  audio...")
        r["lufs"], r["pico_dbfs"] = loudness(ruta)
        s = silencios(ruta)
        r["silencios"] = s
        r["silencio_total_s"] = round(sum(x["duracion"] for x in s), 2)

        if not args.sin_voz:
            print("  transcripción...")
            t = transcribir(ruta, args.modelo)
            if t is None:
                r["transcripcion"] = "no disponible (pip install faster-whisper)"
            else:
                (out / "transcripcion.json").write_text(json.dumps(t, ensure_ascii=False, indent=2), encoding="utf-8")
                n = len(t["palabras"])
                habla = (t["palabras"][-1]["fin"] - t["palabras"][0]["inicio"]) if n else 0
                r.update({"idioma": t["idioma"], "num_palabras": n,
                          "palabras_por_segundo": round(n / habla, 2) if habla else None,
                          "gancho": gancho(t),
                          "ultima_frase": t["segmentos"][-1]["texto"] if t["segmentos"] else None})

    resumen_p.write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
    return r


def promedio(lista, clave):
    v = [x[clave] for x in lista if isinstance(x.get(clave), (int, float))]
    return round(statistics.mean(v), 2) if v else None


def reporte(res):
    def f(v, suf=""):
        return "—" if v is None else f"{v}{suf}"

    lineas = ["# Reporte de videos de referencia", "",
              "Patrones medidos para orientar ritmo y estructura. No se copian guiones, personajes ni tomas.", "",
              "## Promedios", "",
              f"- Videos analizados: {len(res)}",
              f"- Duración: {f(promedio(res, 'duracion_s'), ' s')}",
              f"- Tomas por video: {f(promedio(res, 'num_tomas'))}",
              f"- Duración de toma: {f(promedio(res, 'toma_promedio_s'), ' s')}",
              f"- Primer corte: {f(promedio(res, 'primer_corte_s'), ' s')}",
              f"- Palabras por segundo: {f(promedio(res, 'palabras_por_segundo'))}",
              f"- Silencio total: {f(promedio(res, 'silencio_total_s'), ' s')}",
              f"- Loudness: {f(promedio(res, 'lufs'), ' LUFS')}", "",
              "## Por video", "",
              "| Video | Dur. (s) | Tomas | Toma prom. (s) | 1er corte (s) | Pal/s | LUFS | Silencio (s) |",
              "|---|---|---|---|---|---|---|---|"]
    for r in res:
        lineas.append(f"| {r['archivo']} | {f(r.get('duracion_s'))} | {f(r.get('num_tomas'))} | "
                      f"{f(r.get('toma_promedio_s'))} | {f(r.get('primer_corte_s'))} | "
                      f"{f(r.get('palabras_por_segundo'))} | {f(r.get('lufs'))} | {f(r.get('silencio_total_s'))} |")
    ganchos = [(r["archivo"], r["gancho"]) for r in res if isinstance(r.get("gancho"), dict)]
    if ganchos:
        lineas += ["", "## Ganchos (primera frase)", ""]
        for a, g in ganchos:
            lineas.append(f"- **{a}** ({g['palabras']} palabras, {g['fin_s']} s): {g['texto']}")
    lineas += ["", "Imágenes por video: `analisis/<nombre>/hoja.jpg` (un cuadro por intervalo) "
               "y `analisis/<nombre>/cortes.jpg` (inicio de cada toma).", ""]
    (SALIDA / "REPORTE.md").write_text("\n".join(lineas), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description="Analiza videos de referencia.")
    ap.add_argument("--entrada", type=Path, default=ENTRADA)
    ap.add_argument("--cada", type=float, default=1.0, help="segundos entre cuadros extraídos")
    ap.add_argument("--umbral", type=float, default=0.1, help="sensibilidad de cortes (0-1, menor = más cortes)")
    ap.add_argument("--modelo", default="small", help="modelo de faster-whisper (tiny, base, small, medium)")
    ap.add_argument("--sin-voz", action="store_true", help="no transcribir")
    ap.add_argument("--forzar", action="store_true", help="repetir videos ya analizados")
    args = ap.parse_args()

    videos = sorted(p for p in args.entrada.glob("*") if p.suffix.lower() in EXTENSIONES)
    if not videos:
        print(f"No hay videos en {args.entrada}. Copia ahí tus .mp4 / .mov / .webm.")
        sys.exit(1)
    SALIDA.mkdir(parents=True, exist_ok=True)
    res = []
    for i, v in enumerate(videos, 1):
        print(f"[{i}/{len(videos)}] {v.name}")
        try:
            res.append(analizar(v, args))
        except Exception as e:  # un video dañado no detiene el resto
            print(f"  error: {e}")
    reporte(res)
    print(f"\nListo: {SALIDA / 'REPORTE.md'}")


if __name__ == "__main__":
    main()
