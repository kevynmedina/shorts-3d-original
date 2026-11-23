"""Ajusta los efectos ventana a ventana (0,5 s) para que queden 7,5 dB por debajo de la voz.

Sidechain por voz: si la voz baja (pausas), los efectos también bajan; si la voz sube, se mantienen en
su relación. Ganancia limitada a 0,05–4 y suavizada 50 ms. Salida: efectos_ajustados.wav (estéreo, 48 kHz).
"""
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d

RUTA = Path(__file__).resolve().parent
VOZ = RUTA.parent / "voz.wav"
EFECTOS = RUTA / "efectos.wav"
SALIDA = RUTA / "efectos_ajustados.wav"
OBJETIVO_DB = -7.5
VENTANA = 0.5


def mono(x):
    return x.mean(axis=1) if x.ndim > 1 else x


sr, voz = wavfile.read(VOZ)
voz = mono(voz.astype(np.float64))
sr2, ef = wavfile.read(EFECTOS)
ef = ef.astype(np.float64)
assert sr == sr2 == 48000, "se espera 48 kHz"
n = min(len(voz), len(ef))
ef = ef[:n]
w = int(VENTANA * sr)
paso = w
ganancia = np.ones(n)
for i in range(0, n, paso):
    seg_v = voz[i:i + w]
    seg_e = mono(ef[i:i + w])
    rv = np.sqrt(np.mean(seg_v ** 2)) + 1e-9
    re = np.sqrt(np.mean(seg_e ** 2)) + 1e-9
    objetivo = rv * 10 ** (OBJETIVO_DB / 20)
    g = float(np.clip(objetivo / re, 0.05, 4.0)) if rv > 2e-3 else 0.05
    ganancia[i:i + w] = g
ganancia = uniform_filter1d(ganancia, size=int(0.05 * sr))
salida = (ef * ganancia[:, None] if ef.ndim > 1 else ef * ganancia) / 32768.0  # int16 -> float (-1..1), sin normalizar pico
if np.max(np.abs(salida)) > 0.99:
    raise SystemExit('clipping: bajar la ganancia máxima')
wavfile.write(str(SALIDA), sr, salida.astype(np.float32))
print("escrito", SALIDA, "ganancia_media_db", round(20 * np.log10(np.mean(ganancia)), 2))
