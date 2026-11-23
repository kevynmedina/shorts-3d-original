"""Genera la voz del narrador con edge-tts y los tiempos por palabra.

Salida en la carpeta indicada:
  voz.mp3         -> audio original de edge-tts
  voz.wav         -> mono, 48 kHz (lo que exigen ajustar_niveles.py y mezclar.py)
  palabras.json   -> [{"palabra", "inicio", "fin"}] en segundos, para subtítulos y cortes

Uso:
  .venv\\Scripts\\python.exe herramientas\\generar_voz.py src\\videos\\baile\\guion.txt src\\videos\\baile
  .venv\\Scripts\\python.exe herramientas\\generar_voz.py guion.txt carpeta --voz es-MX-JorgeNeural --velocidad +8%
"""
import argparse
import asyncio
import json
import subprocess
from pathlib import Path

import edge_tts

TICKS = 10_000_000  # edge-tts da offset y duración en unidades de 100 ns


async def generar(texto, voz, velocidad, mp3):
    com = edge_tts.Communicate(texto, voz, rate=velocidad, boundary="WordBoundary")
    palabras = []
    with open(mp3, "wb") as f:
        async for trozo in com.stream():
            if trozo["type"] == "audio":
                f.write(trozo["data"])
            elif trozo["type"] == "WordBoundary":
                ini = trozo["offset"] / TICKS
                palabras.append({"palabra": trozo["text"], "inicio": round(ini, 3),
                                 "fin": round(ini + trozo["duration"] / TICKS, 3)})
    return palabras


def marcar_suspenso(texto, palabras):
    """edge-tts no devuelve la puntuación: alinea con el guion y marca las palabras seguidas de «…»."""
    import re

    def norm(s):
        return re.sub(r"[^\w]", "", s.lower())

    tokens = texto.split()
    i = 0
    for w in palabras:
        objetivo = norm(w["palabra"])
        for j in range(i, min(i + 4, len(tokens))):
            if norm(tokens[j]) == objetivo:
                w["suspenso"] = tokens[j].endswith("…")
                w["texto"] = tokens[j]  # la palabra con su puntuación del guion, para subtítulos
                i = j + 1
                break


def recortar_pausas(wav, palabras, pausa_max, pausa_suspenso):
    """Acorta los silencios entre palabras más largos que pausa_max (o pausa_suspenso tras «…»).

    Quita el centro de cada silencio con un fundido de 10 ms y corre los tiempos de las palabras."""
    import numpy as np

    sr = 48000
    crudo = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"],
                           capture_output=True, check=True).stdout
    audio = np.frombuffer(crudo, np.float32).copy()
    fundido = int(0.01 * sr)
    partes, cursor, quitado = [], 0, 0.0
    nuevas = [dict(palabras[0])]
    for a, b in zip(palabras, palabras[1:]):
        limite = pausa_suspenso if a.get("suspenso") else pausa_max
        hueco = b["inicio"] - a["fin"]
        if hueco > limite:
            sobra = hueco - limite
            centro = (a["fin"] + b["inicio"]) / 2
            c0, c1 = int((centro - sobra / 2) * sr), int((centro + sobra / 2) * sr)
            trozo = audio[cursor:c0].copy()
            trozo[-fundido:] *= np.linspace(1, 0, fundido, dtype=np.float32)
            partes.append(trozo)
            cursor = c1
            audio[c1:c1 + fundido] *= np.linspace(0, 1, fundido, dtype=np.float32)
            quitado += (c1 - c0) / sr
        nuevas.append({**b, "inicio": round(b["inicio"] - quitado, 3), "fin": round(b["fin"] - quitado, 3)})
    partes.append(audio[cursor:])
    final = np.concatenate(partes)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-",
                    "-c:a", "pcm_s16le", str(wav)], input=final.tobytes(), check=True)
    return nuevas, quitado


def main():
    ap = argparse.ArgumentParser(description="Voz con edge-tts + palabras.json")
    ap.add_argument("guion", type=Path)
    ap.add_argument("salida", type=Path)
    ap.add_argument("--voz", default="es-MX-JorgeNeural")
    ap.add_argument("--velocidad", default="+25%", help="p. ej. +8%% o -5%%")
    ap.add_argument("--pausa-max", type=float, default=0.18, help="silencio máximo entre palabras (s); 0 = no recortar")
    ap.add_argument("--pausa-suspenso", type=float, default=0.40, help="silencio máximo tras «…» (s)")
    args = ap.parse_args()

    texto = " ".join(args.guion.read_text(encoding="utf-8").split())
    args.salida.mkdir(parents=True, exist_ok=True)
    mp3, wav = args.salida / "voz.mp3", args.salida / "voz.wav"

    palabras = asyncio.run(generar(texto, args.voz, args.velocidad, mp3))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", "48000", str(wav)], check=True)
    marcar_suspenso(texto, palabras)
    if args.pausa_max > 0 and palabras:
        palabras, quitado = recortar_pausas(wav, palabras, args.pausa_max, args.pausa_suspenso)
        print(f"pausas recortadas: {quitado:.2f} s")
    for w in palabras:
        w.pop("suspenso", None)
        w.setdefault("texto", w["palabra"])
    (args.salida / "palabras.json").write_text(json.dumps(palabras, ensure_ascii=False, indent=1), encoding="utf-8")

    dur = palabras[-1]["fin"] if palabras else 0
    habla = dur - palabras[0]["inicio"] if palabras else 0
    print(f"{len(palabras)} palabras, voz {dur:.2f} s, {len(palabras) / habla:.2f} palabras/s" if habla else "sin palabras")


if __name__ == "__main__":
    main()
