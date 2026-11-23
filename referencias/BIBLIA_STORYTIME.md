# Biblia de storytime serializado (estudio de un storytime de referencia en 4 partes)

Fuente: medido sobre `referencias\videos\parte1.mp4`–`parte4.mp4` con `herramientas\medir_30fps.py`, ffmpeg/ffprobe y faster-whisper el 23/11/2026; la carpeta temporal `out\analisis_storytime\` se eliminó tras extraer las métricas (las cifras de este documento son la única copia). Solo para estudiar el estilo: no se copian guiones, personajes ni tomas.

## Formato

- 4 partes, 576x1024 (9:16), 30 fps, h264, AAC estéreo 44.1 kHz.
- Duraciones: 190.13 / 170.63 / 111.90 / 112.86 s (media 146.4 s). Las dos primeras son más largas; las dos últimas duran ~112 s.
- Voz: 2.6–2.9 pal/s medidas (486 / 465 / 296 / 280 palabras; 2.67 / 2.94 / 2.89 / 2.72 pal/s sobre tiempo de habla), más lento que el formato 1. Una voz narradora continua.
- Volumen: LUFS −14.53 / −15.06 / −20.58 / −14.83; LRA 3.5–4.3 LU; true peak ≈ −0.05 dBTP (P3 −5.42, la mezcla más baja). Silencio 3.9–13.9 % (inflado por la tarjeta final).
- **Nuestra regla: duración por episodio 90–180 s (tope de Shorts: 3 min); voz 2.8–3.4 pal/s; mezcla final −14 LUFS y true peak ≤ −1 dBTP; música y efectos 10–14 dB bajo la voz (como `CLAUDE.md`).**

## Estructura del episodio (medido)

| Bloque | P1 (s) | P2 (s) | P3 (s) | P4 (s) | % del episodio |
|---|---|---|---|---|---|
| Etiqueta «PARTE X» (pastilla arriba a la izquierda) | 0.0–3.9 | 0.0–3.9 | 0.0–3.9 | 0.0–3.9 | sale en fundido 3.5–3.9 s |
| Recap «ANTES:» | — | 0.0–2.5 | 0.0–2.5 | 0.0–2.5 | corte duro a color en el cuadro 75 |
| Cuerpo | 3.9–182.6 | 2.5–163.1 | 2.5–105.4 | 2.5–106.3 | ~92–94 % |
| Tarjeta CTA | 182.6–186.1 | 163.1–166.6 | 105.37–108.9 | 106.33–108.83 | ~2–3 % |
| Tarjeta final de la plataforma | 186.1–190.13 | 166.6–170.63 | 108.9–111.9 | 108.83–112.86 | ~2–3.5 % |

- **Gancho (0–3 s):** titular grande arriba y un gesto gráfico inmediato (flecha curva hacia una tarjeta).
- **Recap de 2.5 s:** un fotograma de la parte anterior, desaturado y con viñeta; título «PARTE X» + «ANTES:» arriba y dos líneas de resumen en dos tonos abajo; la segunda línea entra a ~1.2 s.
- **Flashback:** gris dentro del cuerpo (P1 ~24–27 s, saturación 0.04–0.11).
- **Puntos de giro:** marcados con tarjetas de cifra o de documento.
- **Saltos de tiempo:** reloj o tarjeta sepia.

## Fórmula del guion para episodios

1. **Recap «ANTES:»** (solo partes 2+): 2–3 s, una idea en dos líneas (situación + consecuencia con cifra).
2. **Gancho del episodio** (paradoja o pregunta de 10–16 palabras) en los primeros 3 s, con la etiqueta de parte visible.
3. **Lugar y situación** en presente.
4. **Escalada** en 4–6 momentos (más que el formato 1, por la duración), cada uno con una tarjeta o acción visual; 1–2 chistes de exageración.
5. **Momento de misterio** / «Espera… ¿qué?» a mitad del episodio.
6. **Giro** con tarjeta de cifra o documento.
7. **Cliffhanger:** cortar en la frase de mayor tensión (subtítulo interrumpido) justo antes de la CTA; solo el último episodio resuelve con remate irónico.
8. **CTA** de 2.5–3.5 s pidiendo la siguiente parte.

- En la referencia, 3 de 4 partes cierran con cliffhanger (personaje sosteniendo un documento o cifra en primer plano, o escena nocturna de tensión); la última resuelve y remite a más historias.

## Ritmo

| Parte | Cortes/min (0.1) | Cortes/min (0.3) | Toma media (s, 0.3) | Toma mín–máx (s, 0.3) | Pal/s |
|---|---|---|---|---|---|
| P1 | 23.0 | 19.6 | 3.02 | 0.97–16.2 | 2.67 |
| P2 | 25.0 | 19.3 | 3.05 | 0.93–11.74 | 2.94 |
| P3 | 27.3 | 22.5 | 2.60 | 0.70–5.70 | 2.89 |
| P4 | 33.5 | 26.1 | 2.26 | 0.87–6.87 | 2.72 |
| Media | 27.2 | 21.9 | 2.73 | — | 2.81 |

- El ritmo se acelera de parte en parte (toma media 3.0 → 2.3 s).

## Imagen

- **Personajes:** 2D plano vectorial, cabeza negra redonda grande (35–45 % del ancho en plano medio), cuerpo en tubo, manos de guante, zapatos blancos; contorno blanco fino + halo cálido; expresión mínima (ojos punto u óvalo, cejas de trazo, gotas de sudor). Se distinguen por accesorios y color de ropa, no por la cara. Plano medio en diálogo, plano entero en reacciones; cabeza a 30–45 % de altura, pies a 76–83 %; en diálogo, uno a la izquierda (15–35 % del ancho) y otro a la derecha (60–85 %).
- **Fondos y profundidad:** escenarios ilustrados planos con desenfoque suave (profundidad de campo), tres capas (fondo en perspectiva, muebles, personaje nítido); paneos laterales lentos; viñeteado en recap, flashback y CTA.
- **Color e iluminación:** saturación media 0.26 (0.248 / 0.311 / 0.269 / 0.205), brillo Y medio 133/255 (136.3 / 124.2 / 128.8 / 143.1); azules fríos y beiges cálidos; recap a saturación 0.09–0.18, flashback 0.04–0.11; escenas nocturnas azules de brillo bajo. Sin sombras azul-violeta.
- **Nuestra regla: el estilo visual del Formato 2 sigue usando nuestro pipeline Remotion + Three.js (`src\videos\melaza\look\toon.ts` y `src\videos\melaza\look\shade.ts`; plantillas equivalentes en `plantillas\alejandro\` y `plantillas\puente\`), con personajes planos de caricatura (contorno, luz cálida y sombras azul-violeta) sobre mundos 3D pintados. De la referencia solo se adaptan: (a) la composición y el encuadre, (b) las tarjetas centrales de datos y documentos, (c) los recaps desaturados «ANTES:» y (d) los subtítulos en mayúsculas de 1–3 palabras con la palabra clave resaltada.**
- **Flashbacks:** los recuerdos dentro del episodio van en tramos desaturados (saturación ≤ 0.11, como el flashback medido de la referencia, 0.04–0.11), con viñeta, y vuelven a color con corte duro o fundido corto. No se adoptan el contorno claro del personaje ni el desenfoque de fondo (desactivado por rendimiento).

## Cámara y edición (medido)

| Parte | Cámara en movimiento (%) | Cambio de imagen (%) | Tramos congelados ≥12 cuadros (n / cuadros) |
|---|---|---|---|
| P1 | 37.1 | 82.2 | 66 / 2493 |
| P2 | 35.8 | 76.8 | 67 / 2383 |
| P3 | 43.8 | 77.1 | 37 / 1275 |
| P4 | 58.6 | 82.9 | 23 / 586 |
| Media | 43.8 | 79.8 | — |

- Casi todo es corte duro; fundido a gris solo para flashback y fundido sepia para saltos de tiempo; corte duro a color al terminar el recap.
- El movimiento viene sobre todo de la animación del personaje y de paneos lentos, no de la cámara (por eso cámara 36–59 % frente a 77–83 % de cambio de imagen). No hay sacudidas.
- Método: `medir_30fps.py --sin-rotulos` (ORB + afín, ignora 0–15 % y 55–80 % de altura, puede subestimar) y diferencia de gris > 0.5/255 a 144x256.
- **Nuestra regla: se mantiene la meta de `CLAUDE.md` (> 80 % de cuadros con cámara en movimiento, XFADE de 6 cuadros entre escenarios); dentro de cada escenario se permiten cortes de cámara de ~2.5 s para igualar el ritmo de la referencia.**

## Apoyos visuales e infografías

- Tipos: tarjeta de documento (recibo, carta, nota), sobre con cifra, mapa de cuadrícula con pines, bandeja de entrada, reloj, tarjeta de cifra grande.
- Ocupan el centro (≈20–80 % del cuadro), duran 2–4 s y entran en un corte.
- Marcas: óvalo rojo sobre la cifra clave, flecha roja curva, X roja; nunca sobre personajes. Sin emojis.
- Título de la tarjeta arriba (≈11–24 % de altura) en dos tonos (blanco + celeste) con contorno oscuro.

## Subtítulos y tipografía

- Línea centrada a ≈72–75 % de altura (recap ≈75–80 %), 70–75 % del ancho, altura de mayúscula ≈2.4–3 % del alto; palo seco redondeado extra negrita (tipo Montserrat ExtraBold); todo en mayúsculas; contorno oscuro grueso + sombra suave; sin recuadro; 1–3 palabras visibles, palabra por palabra.
- Dos tonos: blanco base, celeste para la palabra clave o cifra; en el recap, línea 1 blanca y línea 2 amarilla.
- Etiqueta de episodio: pastilla azul marino con borde y texto celeste, arriba a la izquierda (x 4–30 %, y 4–8 %), 0–3.9 s.
- Título del recap: «PARTE X» celeste centrado (y 14–20 %) y «ANTES:» blanco debajo (y 22–24 %).
- **Nuestra regla: subtítulos dinámicos sincronizados con `palabras.json`, dentro de la zona segura de `CLAUDE.md` (libre el 20 % inferior y el 10 % superior); adoptar mayúsculas, dos tonos (blanco + color de acento para palabra clave) y 1–3 palabras por bloque.**

## Audio

| Parte | LUFS | LRA (LU) | True peak (dBTP) | Silencio (%) |
|---|---|---|---|---|
| P1 | −14.53 | 3.6 | −0.05 | 5.8 |
| P2 | −15.06 | 3.5 | −0.04 | 3.9 |
| P3 | −20.58 | 4.0 | −5.42 | 13.9 |
| P4 | −14.83 | 4.3 | −0.05 | 5.7 |
| Media | −16.25 | 3.85 | −1.39 | 7.33 |

- P3 tiene la mezcla más baja y la tarjeta final casi muda, lo que infla su silencio.
- **Nuestra regla: −14 LUFS, true peak ≤ −1 dBTP, música 10–14 dB bajo la voz, sin cola muda al final (la tarjeta final de plataforma no se replica).**

## Reglas para episodios serializados

1. Cada episodio dura 90–180 s y funciona solo: recap + gancho propio.
2. Etiqueta «PARTE X» de 0 a 4 s en todas las partes.
3. Las partes 2+ abren con recap «ANTES:» de 2–3 s, desaturado (saturación ≤ 0.18) con viñeta, y corte duro a color.
4. Las partes 1 a N−1 terminan en cliffhanger: frase de mayor tensión cortada + plano de personaje con objeto o cifra clave, seguido de CTA de 2.5–3.5 s pidiendo la siguiente parte.
5. La última parte resuelve con remate irónico y remite a otras historias del canal.
6. Mantener personajes, paleta, tipografía y escenarios idénticos entre partes (continuidad visual); guardar la definición de personajes y escenarios para reutilizarla.
7. Acelerar ligeramente el ritmo en las últimas partes (toma media de ~3.0 a ~2.3 s).
8. Historia real con fuentes verificadas en todas las partes; cifras de cada parte con fuente, igual que el formato 1.
9. Publicar las partes con numeración consistente en título y miniatura; no se replica la tarjeta final de la plataforma de origen.

## Para ignorar al medir

- Marca de agua de la plataforma (izquierda media x 2–25 % y 46–56 %; abajo a la derecha x 78–99 % y 75–86 %).
- Pastilla de parte, barra negra superior del recap (0–8 %), tarjeta CTA y tarjeta final (inflan silencio, congelados y LUFS).
- Resolución 576x1024 recomprimida: bitrate y saturación no son comparables 1:1 con renders a 1080x1920.

## Diferencias con el formato 1

| Aspecto | Formato 1 (`BIBLIA_DE_ESTILO`) | Formato 2 (storytime) |
|---|---|---|
| Duración | 40–55 s | 90–180 s por episodio |
| Voz (pal/s) | 3.2–3.8 | 2.8–3.4 |
| Tomas | 6–8 de 4–7 s | escenarios con cortes internos de ~2.5 s |
| Cierre | remate irónico | cliffhanger + CTA (salvo la última parte) |
| Apertura | gancho | recap «ANTES:» + gancho |
| Subtítulos | zona segura de `CLAUDE.md` | igual zona segura; añade dos tonos y mayúsculas |
