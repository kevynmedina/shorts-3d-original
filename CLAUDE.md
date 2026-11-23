# CLAUDE.md

Instrucciones del proyecto para Claude Code. Fuentes de verdad: `SKILL.md` y `referencias\BIBLIA_DE_ESTILO.md`.

## 1. Idioma obligatorio

Toda comunicación, reportes, guiones y preguntas interactivas van exclusivamente en español. Se mantienen en inglés solo nombres de archivos, rutas, comandos, flags y código.

## 2. Orquestación de agentes

- **Opus** coordina: define el plan, pide las paradas de aprobación y decide qué agente trabaja en cada paso.
- **`lector-proyecto`**: lee y explora el proyecto. No escribe ni edita archivos.
- **`programador`** (`.claude\agents\programador.md`): implementa y edita, siguiendo el plan aprobado por el orquestador.
- **`researcher`**: investiga hechos reales con fuentes verificables (fechas, cifras, nombres, citas). Cada dato lleva su fuente.
- **`qa-check`**: valida el resultado junto con los scripts nativos `herramientas\medir_30fps.py` y `plantillas\scripts\short_qa.py`.

Nota para esta sesión: estos agentes pueden no cargarse como tipos nombrados. En ese caso se usa `general-purpose` y se le pasa como instrucción la definición del archivo correspondiente en `.claude\agents\`.

## 3. Estilo: caricatura 2D en mundo 3D (Three.js + Remotion, 1080x1920, 30 fps)

- **Historia real con fuentes verificadas.** Cada cifra, nombre y chiste tiene fuente. Si las cifras varían entre fuentes antiguas y historiadores modernos, se usa la estimación moderna y se dice así. No se copian guiones, personajes ni tomas del canal de referencia.
- **Duración objetivo:** 40 a 55 segundos.
- **Fórmula narrativa combinada** (en este orden):
  1. **Gancho:** paradoja de 10 a 16 palabras, dicha como hecho.
  2. **Lugar:** en presente, con detalles concretos.
  3. **Escalada:** de 3 a 4 momentos, con 1 o 2 chistes de exageración.
  4. **Momento de misterio:** «Espera… ¿qué?».
  5. **Momento en que se rompe** + doble línea seca: «Por suerte… / Por desgracia…».
  6. **Giro:** «Fíjate…» con una comparación cotidiana.
  7. **Remate irónico** en la última frase.
- **Voz:** una sola voz narrativa continua, de 3.2 a 3.8 palabras por segundo, casi sin silencios. Se genera con `edge-tts` (por ejemplo `es-MX-JorgeNeural`). Nunca se describe con la voz lo que ya se ve en pantalla.
- **Subtítulos dinámicos obligatorios:** subtítulos grandes, centrados y con contorno oscuro, sincronizados palabra a palabra con `palabras.json`, colocados en una zona segura: sin tapar a los personajes ni la interfaz inferior de YouTube Shorts (dejar libre aproximadamente el 20 % inferior y el 10 % superior del cuadro 1080x1920). Las cifras discretas arriba del cuadro se mantienen. Sin recuadros, subrayados ni flechas sobre los personajes.
- **Densidad visual:** dividir el guion en 6 a 8 tomas cortas (4 a 7 s por toma); cada frase clave tiene una acción visual explícita en pantalla; evitar escenas largas estáticas y planos congelados (ningún tramo de 12 cuadros o más sin movimiento, salvo que sea intencional).
- **Cámara:** meta estricta de más del 80 % de los cuadros en movimiento (`SKILL.md`). Casi sin cortes duros. Las transiciones entre escenarios son continuas: `XFADE` de 6 cuadros.
- **Sonido:** sintetizado con los recursos de `plantillas\audio\`. Música y efectos de 5 a 10 dB debajo de la voz. Mezcla final a -14 LUFS.
- **Look:** personajes planos de caricatura sobre mundos 3D pintados, con líneas de tinta sobre la geometría y luz cálida con sombras azul-violeta. Revisa el look con fotos de prueba antes del render final.

## 4. Entorno Windows

- Usar siempre `.venv\Scripts\python.exe` para ejecutar Python.
- Al armar el proyecto ejecutable, preparar `RENDERIZAR.bat` en la carpeta del proyecto. Debe usar rutas relativas, admitir espacios y dejar la ventana abierta con la ruta del resultado.
- Los renders salen en `out\`. No borrar proyectos ni cuadros existentes.

## 5. Paradas de aprobación

- **Parada 1:** aprobar tema, fuentes, guion y plan de escenarios 3D antes de instalar dependencias, generar voz o programar escenas.
- **Parada 2:** revisar las fotos de prueba por escena y el QA técnico antes de dar por terminado el MP4 en `out\`.

Sin estas aprobaciones no se avanza al siguiente bloque.
