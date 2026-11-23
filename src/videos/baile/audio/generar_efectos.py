"""Efectos y música de época para el short «La plaga de baile de Estrasburgo» (baile).

Todo se sintetiza con numpy/scipy (sin muestras de terceros). Los tiempos salen de palabras.json (anclas por
frase, igual que cortes.ts): si cambia la voz, se regenera palabras.json y este script recalcula todo.
Salida: efectos.wav (estéreo, int16, 48 kHz) con la duración de la composición (última palabra + 1 s).
Ejecutar con .venv\\Scripts\\python.exe.

Guion sonoro (ver investigacion\\temas\\2026-11-23_plaga_baile_guion.md):
  T1  música de época (tambor + fídula, jiga en re dórico), pasos de bailarines, bolsa de monedas en «contrató».
  T2  silencio de época; la música asoma en «bailar» y se corta en «Sin música» (silencio musical).
  T3  la música vuelve en «Baila» y sube con la multitud (murmullo y pasos crecientes hasta «cuatrocientos»).
  T4  médicos, tarima; monedas en «paga la orquesta»; el murmullo se suspende en «Espera… ¿qué?».
  T5  golpes suaves de cuerpos en «cae rendida»; martillazos del pregonero; la música SE CORTA DE GOLPE en «prohibir».
  T6  motor de camión grave y bostezos en cadena.
  T7  capilla: casi silencio, chisporroteo de velas, gota de agua bendita, pasos con eco y un último paso en la última palabra.
"""
import json
import math
import unicodedata
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, lfilter

SR = 48000
RUTA = Path(__file__).resolve().parent
PALABRAS = json.loads((RUTA.parent / "palabras.json").read_text(encoding="utf-8"))
rng = np.random.default_rng(1518)


def _norm(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    return "".join(c for c in s.lower() if c.isalnum())


def T(frase, n=0, k=0, fin=False):
    """Inicio (s) de la k-ésima palabra de la n-ésima aparición de una frase (o su fin si fin=True)."""
    ws = [_norm(w) for w in frase.split()]
    cuenta = -1
    for i in range(len(PALABRAS) - len(ws) + 1):
        if all(_norm(PALABRAS[i + j]["palabra"]) == w for j, w in enumerate(ws)):
            cuenta += 1
            if cuenta == n:
                p = PALABRAS[i + (len(ws) - 1 if fin else k)]
                return p["fin"] if fin else p["inicio"]
    raise SystemExit(f"frase no encontrada: {frase}")


DUR = math.ceil((PALABRAS[-1]["fin"] + 1.0) * 30) / 30  # mismo criterio que CORTES.fin
N = int(DUR * SR)
L = np.zeros(N)
R = np.zeros(N)


# ---------------------------------------------------------------- primitivas
def ruido(n):
    return rng.standard_normal(n)


def filtro(x, tipo, fc, orden=2):
    fc = np.atleast_1d(fc) / (SR / 2)
    b, a = butter(orden, fc if len(fc) > 1 else fc[0], btype=tipo)
    return lfilter(b, a, x)


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (SR * tau))


def poner(sig, t, ganancia=1.0, pan=0.0):
    """Suma una señal mono en el estéreo con panorama pan (-1 izquierda, +1 derecha)."""
    i = int(t * SR)
    if i < 0 or i >= N:
        return
    k = min(len(sig), N - i)
    gl = math.cos((pan + 1) * math.pi / 4)
    gr = math.sin((pan + 1) * math.pi / 4)
    L[i:i + k] += ganancia * gl * sig[:k]
    R[i:i + k] += ganancia * gr * sig[:k]


def capa(sig, ganancia=1.0, pan=0.0):
    poner(sig, 0.0, ganancia, pan)


def rampa(puntos):
    """Envolvente lineal por tramos [(t, v), ...] sobre toda la duración."""
    ts = np.arange(N) / SR
    return np.interp(ts, [p[0] for p in puntos], [p[1] for p in puntos])


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- música de época
def fidula(freq, dur, vol=1.0):
    n = int((dur + 0.08) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.6 * t) * np.clip(t / 0.15, 0, 1)
    fase = 2 * np.pi * np.cumsum(freq * vib) / SR
    s = sum(np.sin(k * fase) / k ** 1.1 for k in range(1, 11))
    s = filtro(s, "low", 3200) + 0.05 * filtro(ruido(n), "band", [1500, 4000])  # arco
    ataque = np.clip(t / 0.012, 0, 1)
    cola = np.clip((dur + 0.08 - t) / 0.07, 0, 1)
    return vol * 0.35 * s * ataque * cola


def tambor(vol=1.0):
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = 62 + 70 * np.exp(-t / 0.03)
    cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.10)
    golpe = filtro(ruido(n), "low", 900) * env_exp(n, 0.02)
    return vol * (0.9 * cuerpo + 0.5 * golpe)


def palillo(vol=1.0):
    n = int(0.06 * SR)
    return vol * 0.5 * filtro(ruido(n), "band", [2000, 5000]) * env_exp(n, 0.012)


def musica():
    """Jiga en re dórico (6/8 sentido en corcheas) a 148 pulsos; devuelve (melodía, tambores, armonía) sin envolvente."""
    corchea = 60 / 148 / 1.0 * 0.5 * 2 / 2  # ~0,2027 s
    frases = [
        [74, 77, 81, 77, 74, 77, 76, 74, 72, 76, 79, 76, 72, 76, 74, 72],
        [74, 77, 81, 84, 81, 77, 79, 76, 77, 74, 72, 74, 69, 72, 74, 74],
    ]
    mel = np.zeros(N)
    arm = np.zeros(N)
    bat = np.zeros(N)
    k = 0
    t = 0.0
    while t < DUR - 0.2:
        nota = frases[(k // 16) % 2][k % 16]
        fn = fidula(midi(nota), corchea * 0.92)
        i = int(t * SR)
        mel[i:i + len(fn)] += fn[:N - i]
        # armonía: tercera abajo y bordón cada compás (corcheas 0 y 8)
        fa = fidula(midi(nota - 5 if k % 4 else nota - 3), corchea * 0.9, 0.55)
        arm[i:i + len(fa)] += fa[:N - i]
        if k % 8 == 0:
            fb = fidula(midi(38 if (k // 8) % 2 == 0 else 45), corchea * 7.5, 0.6)
            arm[i:i + len(fb)] += fb[:N - i]
        # tambor: bombo en 0 y 4, palillos en contratiempos
        if k % 4 == 0:
            tb = tambor(1.0 if k % 8 == 0 else 0.7)
            bat[i:i + len(tb)] += tb[:N - i]
        if k % 4 in (2, 3) or k % 8 == 7:
            pl = palillo(0.8)
            bat[i:i + len(pl)] += pl[:N - i]
        k += 1
        t += corchea
    return mel, bat, arm


# ---------------------------------------------------------------- pasos, multitud, golpes
def paso(tipo="piedra", vol=1.0):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    base = filtro(ruido(n), "low", 1400 if tipo == "piedra" else 800) * env_exp(n, 0.018)
    thump = np.sin(2 * np.pi * 110 * t) * env_exp(n, 0.03)
    return vol * (0.7 * base + 0.5 * thump)


def murmullo(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    base = filtro(ruido(n), "band", [220, 1300])
    # sílabas lentas: modulación irregular
    mod = 0.55 + 0.25 * np.sin(2 * np.pi * (3.1 + 0.7 * np.sin(t * 0.9)) * t) + 0.2 * np.sin(2 * np.pi * 5.3 * t + 1.2)
    return base * mod


def golpe_cuerpo(vol=1.0):
    n = int(0.30 * SR)
    t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (75 * np.exp(-t * 4)) * t) * env_exp(n, 0.07)
    roce = filtro(ruido(n), "low", 600) * env_exp(n, 0.05)
    return vol * (0.9 * thump + 0.5 * roce)


def moneda(vol=1.0):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f0 = rng.uniform(2300, 3800)
    s = sum(np.sin(2 * np.pi * f0 * r * t) * a for r, a in [(1, 1), (2.76, 0.6), (5.4, 0.35)])
    return vol * 0.35 * s * env_exp(n, 0.07) * np.clip(t / 0.001, 0, 1)


def bolsa_monedas(t0, n=10, vol=1.0):
    thump = golpe_cuerpo(0.5)
    poner(thump, t0, vol * 0.5, 0.3)
    for k in range(n):
        poner(moneda(vol * rng.uniform(0.4, 1.0)), t0 + 0.03 + k * rng.uniform(0.035, 0.08), 1.0, rng.uniform(-0.6, 0.6))


def martillazo(vol=1.0):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    toc = np.sin(2 * np.pi * (200 * np.exp(-t * 20) + 90) * t) * env_exp(n, 0.04)
    clic = filtro(ruido(n), "band", [900, 4000]) * env_exp(n, 0.008)
    return vol * (0.8 * toc + 0.7 * clic)


def bostezo(dur=1.5, f0=150, vol=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    env = np.sin(np.pi * u) ** 1.5
    f = f0 * (1.35 - 0.55 * u)
    fase = 2 * np.pi * np.cumsum(f) / SR
    voz = sum(np.sin(k * fase) / k for k in range(1, 14))
    abre = 350 + 450 * np.sin(np.pi * np.clip(u * 1.1, 0, 1))
    formantes = filtro(voz, "band", [500, 900]) + 0.6 * filtro(voz, "band", [1100, 1700]) + 0.5 * filtro(ruido(n), "band", [900, 2500])
    return vol * 0.35 * formantes * env * (1 + 0 * abre)


def motor(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ral = 11 + 0.8 * np.sin(2 * np.pi * 0.3 * t)
    ciclo = np.cumsum(ral) / SR
    s = sum(np.sin(2 * np.pi * h * ciclo) / h for h in range(1, 9)) * 0.45
    ru = filtro(ruido(n), "low", 160) * 1.2 + 0.18 * filtro(ruido(n), "band", [400, 2500])
    return filtro(s, "low", 220) + ru


def reverb_capilla(x, seg=1.8, mezcla=0.45):
    n = int(seg * SR)
    ir = ruido(n) * np.exp(-np.arange(n) / (SR * 0.45))
    ir = filtro(ir, "low", 3500)
    ir[0] = 0
    h = fftconvolve(x, ir / np.sqrt(np.sum(ir ** 2)))[:len(x)]
    return (1 - mezcla) * x + mezcla * 2.2 * h


# ---------------------------------------------------------------- anclas (s)
t_contrato = T("contrato")
t_es = T("Es julio")
t_bailar_a = T("pone a bailar", k=2)
t_sin = T("Sin musica")
t_baila = T("Baila de cuatro")
t_miran = T("la miran")
t_30 = T("treinta")
t_400 = T("cuatrocientos")
t_medicos = T("Los medicos")
t_paga = T("paga la orquesta")
t_orq = T("orquesta")
t_espera = T("Espera")
t_entonces = T("Y entonces")
t_rompe = T("se rompe")
t_cae = T("cae rendida")
t_muertos = T("muertos")
t_suerte = T("Por suerte")
t_desg = T("Por desgracia")
t_prohibir = T("prohibir")
t_fijate = T("Fijate")
t_t6 = t_fijate - 0.25                  # inicio visual de T6
t_alfinal = T("Al final")
t_t7 = t_alfinal - 0.25
t_bendita = T("agua bendita", k=1)
t_zap = T("ponen zapatos")
t_bost = T("bostezo")
t_ultima = T("pusieron zapatos", k=1)   # última palabra: «zapatos»

# ---------------------------------------------------------------- música con compuertas
mel, bat, arm = musica()
g_mus = rampa([
    (0, 0), (0.15, 0.8), (t_es - 0.3, 0.8), (t_es, 0),              # T1: música; se va al empezar T2
    (t_bailar_a - 0.01, 0), (t_bailar_a, 0.5), (t_sin - 0.04, 0.55), (t_sin, 0),   # «bailar»: asoma y se calla en «Sin música»
    (t_baila - 0.01, 0), (t_baila, 0.30),                           # vuelve en «Baila»
    (t_30, 0.55), (t_400, 0.85), (t_orq, 1.0),                      # crece con la multitud
    (t_espera, 1.0), (t_espera + 0.3, 0.35), (t_entonces - 0.1, 0.35), (t_entonces + 0.3, 1.0),   # suspenso de «Espera… ¿qué?»
    (t_suerte, 1.0), (t_suerte + 0.3, 0.85),
    (t_prohibir - 0.003, 0.85), (t_prohibir, 0),                    # SE CORTA DE GOLPE en «prohibir»
    (DUR, 0),
])
cuerpo_musica = (mel + 0.8 * arm) * g_mus
# la segunda fídula/armonía entra con la multitud: ya está en `arm`; los tambores suben con la intensidad
g_bat = np.clip(g_mus * (0.6 + 0.8 * rampa([(0, 0.4), (t_30, 0.7), (t_orq, 1.0), (DUR, 1.0)])), 0, 1.3)
capa(cuerpo_musica * 0.8, 1.0, -0.15)
capa(bat * g_bat, 0.9, 0.1)

# ---------------------------------------------------------------- pasos de bailarines (densidad = tamaño de la multitud)
def conteo(t):
    """Número aproximado de bailarines visibles en el tiempo t."""
    if t < t_es:
        return 8
    if t < T("sale a la calle"):
        return 0
    if t < t_miran:
        return 1
    if t < t_400:
        return 1 + 400 * ((t - t_miran) / (t_400 - t_miran)) ** 3
    if t < t_orq:
        return 120 + 140 * (t - t_400) / (t_orq - t_400)
    if t < t_rompe:
        return 260
    if t < t_cae + 3.5:
        return 260 * max(0.0, 1 - (t - t_rompe) / (t_cae + 3.5 - t_rompe))
    return 0


def vol_pasos(t):
    return 0.12 + 0.5 * min(1.0, math.sqrt(conteo(t) / 260))


t = 0.2
while t < t_suerte:
    c = conteo(t)
    if c > 0 and not (t_sin - 0.1 < t < t_sin + 1.0 and False):
        poner(paso("piedra", vol_pasos(t) * rng.uniform(0.6, 1.0)), t, 1.0, rng.uniform(-0.8, 0.8))
    # cadencia: un bailarín ~2,2 pasos/s; multitud hasta ~28 eventos/s
    tasa = min(28.0, 2.2 * (1 + math.sqrt(max(c, 0)) * 1.2)) if c > 0 else 4.0
    t += rng.exponential(1 / tasa) if c > 10 else 1 / tasa

# murmullo de la multitud: crece de «miran» a «cuatrocientos», sostiene, se suspende en «Espera», cae en «rendida»
mur = murmullo(DUR)
g_mur = rampa([
    (0, 0), (t_miran - 0.2, 0), (t_miran + 1.0, 0.12), (t_30, 0.30), (t_400, 0.8), (t_orq, 1.0),
    (t_espera, 1.0), (t_espera + 0.3, 0.12), (t_entonces, 0.12), (t_rompe, 0.9),
    (t_cae + 1.0, 0.55), (t_muertos + 0.5, 0.18), (t_suerte + 0.4, 0),
    (DUR, 0),
])
capa(mur * g_mur * 0.5, 1.0, 0.0)

# ---------------------------------------------------------------- monedas
bolsa_monedas(t_contrato + 0.1, 11, 0.9)             # T1: la mano entrega la bolsa
bolsa_monedas(t_paga + 0.15, 9, 0.8)                 # T4: «paga la orquesta»

# ---------------------------------------------------------------- «se rompe»: crujido y cuerpos que caen
crujir = filtro(ruido(int(0.4 * SR)), "band", [300, 2500]) * env_exp(int(0.4 * SR), 0.09)
poner(crujir, t_rompe + 0.05, 0.6)
for k in range(30):
    tk = t_cae - 0.2 + (t_muertos + 0.4 - t_cae) * (k / 30) ** 0.9 + rng.uniform(-0.04, 0.04)
    poner(golpe_cuerpo(rng.uniform(0.25, 0.7)), tk, 1.0, rng.uniform(-0.9, 0.9))

# ---------------------------------------------------------------- martillazos del pregonero y corte de música
th = t_desg + 0.1
while th < t_prohibir - 0.3:
    poner(martillazo(0.9), th, 1.0, -0.3)
    th += 0.53
poner(martillazo(1.2), t_prohibir, 1.0, 0.0)           # el último golpe cae con el corte de la música
poner(golpe_cuerpo(1.0), t_prohibir + 0.02, 0.8, 0.0)

# ---------------------------------------------------------------- T6: motor de camión y bostezos
d6 = t_t7 - t_t6 + 1.2
mot = motor(d6)
g6 = np.interp(np.arange(len(mot)) / SR, [0, 0.8, d6 - 1.8, d6], [0, 1, 1, 0])
poner(mot * g6, t_t6, 0.55, 0.0)
yawns = [(t_t6 + 0.05, 150, 1.0), (t_t6 + 1.0, 135, 0.7), (t_t6 + 1.9, 175, 0.7), (t_t6 + 2.9, 120, 0.6), (t_t6 + 4.0, 160, 0.6), (t_bost - 0.1, 140, 0.8)]
for ty, f0, v in yawns:
    poner(bostezo(1.4, f0, v), ty, 1.0, rng.uniform(-0.5, 0.5))

# ---------------------------------------------------------------- T7: capilla (casi silencio, velas, gota, pasos con eco)
d7 = DUR - t_t7
n7 = int(d7 * SR)
t7 = np.arange(n7) / SR
sala = filtro(ruido(n7), "low", 180) * 0.05
llama = filtro(ruido(n7), "band", [500, 1100]) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * t7)) * 0.01
capilla = (sala + llama) * np.interp(t7, [0, 0.8], [0, 1])
for k in range(int(d7 * 4)):                        # chisporroteo de velas
    tc = rng.uniform(0, d7 - 0.05)
    nn = int(rng.uniform(0.002, 0.012) * SR)
    cl = filtro(ruido(nn), "band", [2500, 7000]) * env_exp(nn, 0.003)
    i = int(tc * SR)
    capilla[i:i + nn] += cl[:n7 - i] * rng.uniform(0.04, 0.16)
# gota de agua bendita
nd = int(0.12 * SR)
td_ = np.arange(nd) / SR
gota = np.sin(2 * np.pi * np.cumsum(1400 * (1 + 1.8 * np.exp(-td_ / 0.01))) / SR) * env_exp(nd, 0.03)
i = int((t_bendita - t_t7) * SR)
capilla[i:i + nd] += gota * 0.35
# pasos de Troffea con los zapatos (cada 0,25 s desde que se los pone) y último paso en la última palabra
pasos7 = np.zeros(n7)
tp = t_zap + 0.55
while tp < t_ultima - 0.15:
    s = paso("madera", 0.9)
    i = int((tp - t_t7) * SR)
    pasos7[i:i + len(s)] += s[:n7 - i]
    tp += 0.25
s = paso("madera", 1.4)
i = int((t_ultima - t_t7) * SR)
pasos7[i:i + len(s)] += s[:n7 - i]
capilla += reverb_capilla(pasos7) * 0.8
poner(capilla, t_t7, 1.0, 0.0)

# ---------------------------------------------------------------- salida
est = np.stack([L, R], axis=1)
est *= 0.7 / max(1e-9, np.max(np.abs(est)))
wavfile.write(str(RUTA / "efectos.wav"), SR, (est * 32767).astype(np.int16))
print(f"escrito {RUTA / 'efectos.wav'}  duracion={DUR:.3f}s ({N} muestras)")
