"""Efectos y cama sonora sintetizados para el short de la Gran Inundación de Melaza.

Todo se sintetiza con numpy/scipy (sin muestras de terceros). Los tiempos vienen de
palabras.json (alineados a la voz). Salida: un stem estéreo de efectos a 48 kHz.
Ejecutar con .venv\\Scripts\\python.exe.
"""
import json
import unicodedata
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

SR = 48000
DUR = 48.5
RUTA = Path(__file__).resolve().parent
PALABRAS = RUTA.parent / "palabras.json"

rng = np.random.default_rng(7)


def _norm(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return "".join(c for c in s.lower() if c.isalnum())


def t_de(palabra, n=0):
    """Inicio (s) de la n-ésima aparición de una palabra en palabras.json (sin acentos ni puntuación)."""
    datos = json.loads(PALABRAS.read_text(encoding="utf-8"))
    hits = [p["inicio"] for p in datos if _norm(p["palabra"]) == _norm(palabra)]
    return hits[n]


def ruido(n):
    return rng.standard_normal(n)


def pasa_bajas(x, fc):
    b, a = butter(2, fc / (SR / 2), btype="low")
    return lfilter(b, a, x)


def pasa_altas(x, fc):
    b, a = butter(2, fc / (SR / 2), btype="high")
    return lfilter(b, a, x)


def pasa_banda(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], btype="band")
    return lfilter(b, a, x)


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (SR * tau))


def poner(buf, t, sig, gain=1.0):
    i = int(t * SR)
    if i < 0 or i >= len(buf):
        return
    k = min(len(sig), len(buf) - i)
    buf[i:i + k] += gain * sig[:k]


def gota(freq, dur=0.09, tau=0.018):
    """Gota: tono breve con caída de pitch (plop de agua)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq * (1.0 + 2.5 * np.exp(-t / 0.008))
    fase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(fase) * env_exp(n, tau)


def golpe(n_seg, tau_ataque=0.004, tau=0.25, bajo=90):
    """Golpe sordo (madera, metal o tanque): ruido grave + tono bajo con caída."""
    n = int(n_seg * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (bajo * np.exp(-t * 6)) * t) * env_exp(n, tau)
    rui = pasa_bajas(ruido(n), 400) * env_exp(n, tau_ataque * 10)
    return 0.8 * sub + 0.6 * rui


def crujido(dur, base=500):
    """Crujido metálico: ruido filtrado con modulación irregular (plancha que cede)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * (9 + 6 * t) * t)
    r = pasa_banda(ruido(n), base, base * 4)
    return r * mod * np.exp(-t / (dur * 0.6))


def rugido(dur, t0_fuerte=0.0):
    """Rugido de la ola: ruido grave que crece, con borboteo y salpicadura."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.clip(t / (dur * 0.35), 0, 1) * np.exp(-np.clip(t - dur * 0.7, 0, None) * 1.5)
    grave = pasa_bajas(ruido(n), 260)
    medio = pasa_banda(ruido(n), 300, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.5 * t))
    return env * (1.0 * grave + 0.35 * medio)


def pasos_caballo(t0, n_pasos, paso=0.19):
    """Cascos al galope: golpes cortos y secos en pares."""
    out = []
    for k in range(n_pasos):
        t = t0 + k * paso + (0.03 if k % 2 else 0)
        n = int(0.05 * SR)
        clic = pasa_banda(ruido(n), 1800, 4200) * env_exp(n, 0.012)
        out.append((t, clic * 0.6))
    return out


def murmullo_gente(dur, nivel=1.0):
    """Gente huyendo: voces lejanas como ruido de banda vocal modulado."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    base = pasa_banda(ruido(n), 250, 1100)
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * (4 + 2 * np.sin(t)) * t)
    return nivel * base * trem * np.exp(-t / (dur * 0.8))


def cama_cocina(dur):
    """Cocina de noche: zumbido de nevera muy bajo y grillos lejanos."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    zumbido = 0.25 * np.sin(2 * np.pi * 58 * t) + 0.12 * np.sin(2 * np.pi * 116 * t)
    grillos = pasa_banda(ruido(n), 3800, 5200) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t)) ** 4
    return pasa_bajas(zumbido * 0.2 + grillos * 0.05, 4000)


def pad_bajo(dur, notas=(55.0, 82.41, 110.0)):
    """Cama sonora tenue: acorde mayor grave con respiración lenta (sin melodía)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for f in notas:
        sig += 0.5 * np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)
    env = 0.6 + 0.4 * np.sin(2 * np.pi * t / 6.0)
    return pasa_bajas(sig * env, 900)


def main():
    izq = np.zeros(int(DUR * SR))
    der = np.zeros(int(DUR * SR))

    def canal(sig, pan=0.0, gain=1.0, ini=None):
        if ini is None:
            ini = 0.0
        l = gain * sig * (1 - max(pan, 0)) ** 0.5
        r = gain * sig * (1 + min(pan, 0)) ** 0.5
        poner(izq, ini, l)
        poner(der, ini, r)

    # --- Cama sonora tenue (baja, por debajo de la voz) ---
    canal(pad_bajo(DUR), gain=0.05, ini=0.0)

    # --- E1 (0-19.3 s): goteras tapadas y crujido del tanque ---
    t_gota = np.arange(0.6, 18.0, 0.62)
    for k, t in enumerate(t_gota):
        canal(gota(900 + 90 * (k % 5)), pan=-0.3 + 0.6 * ((k * 0.37) % 1), gain=0.10, ini=t)
    canal(crujido(3.5, base=350), pan=0.2, gain=0.18, ini=t_de("Tiene", 0) + 0.2)
    canal(crujido(2.2, base=620), pan=-0.2, gain=0.14, ini=14.9)

    # --- Ruptura del tanque (~18.9 s) y arranque de la ola ---
    t_rot = t_de("cede", 0) + 0.02
    canal(golpe(1.4, tau=0.45, bajo=70), pan=0.0, gain=0.17, ini=t_rot)  # -7,5 dB (QA: 4 dB por encima de la voz)
    canal(crujido(0.9, base=900), pan=0.0, gain=0.25, ini=t_rot)

    # --- E2 (19.3-29.6 s): rugido de la ola ---
    t_ola = t_de("ola", 0)
    canal(rugido(10.5), pan=0.0, gain=0.34, ini=t_ola)

    # --- Caballos y gente huyendo (~22 s) ---
    t_cab = t_de("caballos", 0)
    for t, clic in pasos_caballo(t_cab, 22):
        canal(clic, pan=-0.4 + 0.8 * rng.random(), gain=0.5, ini=t)
    canal(murmullo_gente(5.0), pan=0.0, gain=0.07, ini=t_cab)

    # --- Golpe ámbar del velo (~29.6 s) ---
    t_des = t_de("desgracia", 0)
    canal(golpe(2.0, tau=0.5, bajo=80), pan=0.0, gain=0.12, ini=t_des - 0.02)  # -5 dB  # -6 dB respecto a la versión anterior

    # --- E3 (29.6-47.2 s): cocina nocturna y frasco que rebosa ---
    canal(cama_cocina(DUR - 29.6), pan=0.0, gain=0.4, ini=29.6)
    # Toma 6: burbujas desde «fermentación» hasta «reventó»; tapa y goteo hasta «tapa» (2.ª aparición).
    t_ferm = t_de("fermentacion", 0)
    t_rev = t_de("reventó", 0)
    t_tapa = t_de("tapa", 1)
    for k in range(int((t_rev - t_ferm) / 0.27)):
        canal(gota(300 + 35 * (k % 7), dur=0.16, tau=0.05), pan=0.3 * np.sin(k), gain=0.12, ini=t_ferm + k * 0.27)
    canal(golpe(0.6, tau=0.12, bajo=140), pan=0.0, gain=0.25, ini=t_rev)
    for k in range(9):
        canal(gota(260 + 40 * k, dur=0.20, tau=0.06), pan=0.25 * np.sin(k), gain=0.12, ini=t_tapa + k * 0.42)  # -4,5 dB

    mezcla = np.stack([izq, der], axis=1)
    pico = np.max(np.abs(mezcla))
    if pico > 0.95:
        mezcla *= 0.95 / pico
    salida = RUTA / "efectos.wav"
    wavfile.write(str(salida), SR, (mezcla * 32767).astype(np.int16))
    print("escrito", salida, "duracion_s", round(len(mezcla) / SR, 2), "pico", round(float(pico), 3))


if __name__ == "__main__":
    main()
