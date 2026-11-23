# Resumen de estilo de los 9 videos de referencia

Fuente: `referencias/analisis/*/hoja.jpg` (un cuadro por segundo) y `REPORTE.md`. Solo para estudiar patrones; no se copian guiones, personajes ni tomas.

**Límite de las hojas:** son cuadros fijos a 1 por segundo. Sirven para paleta, encuadre, subtítulos, estructura y efectos. El movimiento de cámara se midió aparte con `herramientas/medir_30fps.py` (ver la sección «Movimiento de cámara»).

## Los 9 videos agrupados por estilo

| Grupo | Videos | Qué es |
|---|---|---|
| **A. Mundo 3D pintado + personaje 2D** (el más cercano a nuestro look) | `v14044g…pnt70` (Sócrates, 78 s), `v14044g…0b0` (Epstein, 83 s), `export_1795411068394` (herencias, 72 s) | Personajes planos de caricatura (cabeza grande, contorno fino) sobre escenarios 3D con textura pintada |
| **B. 3D completo, sin personajes planos** | `v24044g…c0` (¿Qué pasaría si te pusieras a trabajar?, 62 s) | Objetos y escenas 3D oscuras con luz cálida, interfaces de celular, partículas |
| **C. Vector plano 2D con infografías** | `export_1795410244249`, `v14025g…ckcm7g`, `v14025g…ioh4rg` (siluetas negras, fondo verde azulado; 172 a 228 s), `export_1795410553504` (¿Qué pasaría si todos saltaran?, 87 s) | Personajes simples, cifras grandes, gráficas. Casi nada de 3D |
| **D. Tipografía y diseño editorial** | `v1c044g…namg` (portada de The Economist, 83 s) | Negro, rojo y blanco, texto animado, sin personajes |

Solo el grupo A (y en parte el B) corresponde al look que pide `CLAUDE.md`. Los grupos C y D sirven para estudiar ritmo y guion, no imagen.

## Lo que se repite en el grupo A

- **Escenarios:** colores saturados, textura pintada, fondo desenfocado y luz cálida con sombras azul-violeta (Grecia al atardecer, oficinas amarillas, noche azul con haces de luz dorada). La luz cambia con la historia.
- **Personaje:** cabeza redonda y grande, ojos y cejas muy expresivos, cuerpo pequeño. El chiste suele ser un primer plano de la cara.
- **Un rasgo por personaje:** corona, gorro negro, corona de laurel, sombrero de copa. Se reconoce de lejos.
- **Cantidad como chiste:** multitudes de cientos de personajes (los 501 jurados), pilas de papeles, lluvia de billetes.
- **Texto en pantalla:** etiqueta pequeña arriba con fecha o lugar («Atenas año 399 a. C.», «2005 Palm Beach»), cifras discretas arriba («501 jurados», «30 votos») y carteles dentro de la escena (señales, contratos, sellos).
- **Efectos planos 2D dentro de la escena 3D:** destellos, sellos, signos de pregunta, billetes, haces de luz.
- **Cambios de lugar:** continuos, con acercamientos, barridos y fundidos. Hay tomas largas sin corte (en el de Epstein el primer corte llega a los 22 s).
- **Cifras grandes a pantalla completa** con color de fondo para marcar un dato (herencias: «2», «3» sobre azul y rojo).

## Movimiento de cámara (medido a 30 fps)

Medido con `herramientas/medir_30fps.py` en los 4 videos relevantes. Datos cuadro por cuadro en `referencias/movimiento/<video>/`.

| Video | Dur. (s) | Cortes duros | Cuadros con cámara en movimiento | Cuadros con zoom | Movimientos | Duración mediana de un movimiento | Saturación media |
|---|---|---|---|---|---|---|---|
| Herencias | 72.0 | 10 | **90.6 %** | 86.6 % | 18 | 38 cuadros | 0.62 |
| Trabajar (3D completo) | 62.1 | 24 | 56.5 % | 51.7 % | 49 | 15 cuadros | 0.55 |
| Epstein | 83.1 | 10 | 46.7 % | 38.7 % | 60 | 9 cuadros | 0.46 |
| Sócrates | 77.8 | 22 | 39.2 % | 34.2 % | 55 | 9 cuadros | 0.45 |

- **Solo Herencias supera nuestra meta** (más del 80 % de cuadros en movimiento). Tiene pocos movimientos, pero largos (más de 1 s) y casi todos de acercamiento o alejamiento lento. Es el modelo de cámara a seguir.
- **Sócrates y Epstein** (los más parecidos a nuestro look) están en 39 y 47 %: muchos movimientos de ~9 cuadros (0.3 s) con la cámara quieta entre uno y otro. Quedan por debajo del 65 % que la biblia midió en el canal de referencia.
- **Nuestra meta del 80 %** es más exigente que casi todos los videos de referencia. Para cumplirla hay que mantener un acercamiento o deriva lenta en casi todas las tomas, en vez de movimientos cortos con pausas.
- **Con cuidado:** los cuadros de cortes duros no cuentan como movimiento, y los ~4 s finales de pantalla de TikTok también entran en el cálculo. «Trabajar» es muy oscuro (brillo medio 0.19), lo que dificulta detectar puntos de referencia, así que su 56.5 % puede estar subestimado.

## Subtítulos observados

| Video | Posición | Estilo |
|---|---|---|
| Sócrates y Epstein | ~75 a 80 % de la altura | Blanco, palabra activa en amarillo, contorno oscuro |
| Herencias | ~55 a 65 % | Blanco y amarillo, grande, centrado |
| ¿Qué pasaría si todos saltaran? | ~80 % | Blanco, una a tres palabras |
| Trabajar | ~5 a 10 % (arriba) | Blanco pequeño sin contorno |

Con nuestra regla (libre el 20 % inferior y el 10 % superior), la zona usable es de 10 a 80 %. Lo más práctico es la zona media-baja, hacia el 60 a 72 %. Ojo: en Sócrates y Epstein los subtítulos caen justo en el borde del 80 % y se montan sobre la interfaz de YouTube; ahí conviene subirlos.

## Estructura narrativa

- **Gancho:** en 6 de 9 videos es una paradoja o un «¿Qué pasaría si…?» en los primeros 3 a 4 s.
- **Sócrates y Epstein** siguen casi punto por punto nuestra fórmula: dato con fecha y lugar, escalada, «Por desgracia…» (Sócrates, 52 s; Epstein, 57 s), «Por suerte…» y «Fíjate…» como giro (Sócrates, 56 s; Epstein, 61 s), y remate irónico.
- **Trabajar** cierra en bucle: termina en el mismo sofá del inicio con una frase que da la vuelta («Vale… pero empiezo el lunes»).
- **Cierre:** la mayoría termina de golpe en la última frase. El de «todos saltaran» agrega 10 s de «SÍGUEME» con redes, que nuestra biblia descarta.

## Para ignorar al medir

Todos tienen la marca de agua de TikTok con el usuario abajo a la derecha, y la pantalla de búsqueda de TikTok pegada al final (~4 s). Eso infla la duración y distorsiona el volumen y los silencios del cierre. Los videos de los grupos C («Part 2», «Part 3») además traen barras de título arriba y abajo.

## Qué conviene tomar para nuestros shorts

1. Personaje con un rasgo reconocible (accesorio) y primeros planos de la cara para cada chiste.
2. Una etiqueta pequeña arriba con fecha y lugar en cada cambio de escenario.
3. Multitudes y pilas como chiste visual de exageración.
4. Una cifra grande a pantalla completa para el dato más fuerte, no más de una o dos por video.
5. Cambiar la luz con la historia (cálido → atardecer → azul para la explicación).
6. Cierre en bucle cuando el guion lo permita.
7. Subtítulos con palabra activa resaltada, en la zona de 55 a 72 %.
8. Cámara al estilo de Herencias: pocos movimientos pero largos (más de 1 s), con acercamiento o deriva lenta en casi todas las tomas, para pasar del 80 % de cuadros en movimiento.

## Contradicción por resolver

`referencias/BIBLIA_DE_ESTILO.md` dice «Nuestra regla: sin subtítulos». `CLAUDE.md` dice que los subtítulos dinámicos son obligatorios. Rige `CLAUDE.md`; la biblia está desactualizada en ese punto.
