"""Mezcla final de baile: voz + efectos ajustados, loudnorm en dos pasadas y mux con el video.

Reproduce la cadena de la mezcla aprobada (out/baile_final.mp4, -14,0 LUFS, -1,5 dBTP):
  1. voz.wav (mono) y efectos_ajustados.wav pasan a 48 kHz estereo con aformat y se suman con
     amix normalize=0 duration=longest (niveles relativos intactos) -> WAV float32 intermedio.
  2. Pasada 1: loudnorm I=-14 TP=-1.5 LRA=11 print_format=json (medicion).
  3. Pasada 2: loudnorm con los valores medidos y linear=true, aresample 48 kHz y apad hasta la
     duracion completa del video; video copiado, audio AAC 256 kb/s 48 kHz, -t = duracion del video
     (sin -shortest, no se pierde ningun cuadro).

Uso: python mezclar.py <video_unido.mp4> <salida.mp4>
Los intermedios (<salida>_mezcla_sin_norm.wav y <salida>_loudnorm_p1.json) quedan junto a la salida.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

RUTA = Path(__file__).resolve().parent
VOZ = RUTA.parent / "voz.wav"
EFECTOS = RUTA / "efectos_ajustados.wav"
LUFS, TP, LRA = -14, -1.8, 11


def ejecutar(args, capturar=False):
    r = subprocess.run(args, capture_output=capturar, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        if capturar:
            sys.stderr.write(r.stderr[-3000:])
        raise SystemExit(f"ERROR: fallo {args[0]} (codigo {r.returncode})")
    return r


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Uso: python mezclar.py <video_unido.mp4> <salida.mp4>")
    video, salida = Path(sys.argv[1]), Path(sys.argv[2])
    for f in (video, VOZ, EFECTOS):
        if not f.exists():
            raise SystemExit(f"ERROR: falta {f}")
    mezcla = salida.with_name(salida.stem + "_mezcla_sin_norm.wav")
    medida = salida.with_name(salida.stem + "_loudnorm_p1.json")

    dur = float(ejecutar(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=duration", "-of", "default=nw=1:nk=1", str(video)], True).stdout.strip())
    dur_s = f"{dur:.3f}"
    print(f"Duracion del video: {dur_s} s")

    print("Mezclando voz + efectos...")
    ejecutar(["ffmpeg", "-v", "error", "-y", "-i", str(VOZ), "-i", str(EFECTOS), "-filter_complex",
              "[0:a]aformat=sample_rates=48000:channel_layouts=stereo[v];"
              "[1:a]aformat=sample_rates=48000:channel_layouts=stereo[e];"
              "[v][e]amix=inputs=2:duration=longest:normalize=0[m]",
              "-map", "[m]", "-c:a", "pcm_f32le", str(mezcla)])

    print("Loudnorm pasada 1 (medicion)...")
    r = ejecutar(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mezcla), "-af",
                  f"loudnorm=I={LUFS}:TP={TP}:LRA={LRA}:print_format=json", "-f", "null", "-"], True)
    bloque = re.findall(r"\{[^{}]*\}", r.stderr)
    if not bloque:
        raise SystemExit("ERROR: no se pudo leer la medicion de loudnorm")
    m = json.loads(bloque[-1])
    medida.write_text(json.dumps(m, indent=1), encoding="utf-8")
    print(f"  medido: I={m['input_i']} TP={m['input_tp']} LRA={m['input_lra']} offset={m['target_offset']}")

    print("Loudnorm pasada 2 + mux con el video...")
    filtro = (f"[1:a]loudnorm=I={LUFS}:TP={TP}:LRA={LRA}:measured_I={m['input_i']}:"
              f"measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
              f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
              f"aresample=48000,apad=whole_dur={dur_s}[a]")
    ejecutar(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-i", str(mezcla), "-filter_complex", filtro,
              "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
              "-t", dur_s, str(salida)])
    print(f"Escrito {salida}")


if __name__ == "__main__":
    main()
