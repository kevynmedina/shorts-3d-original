@echo off
rem ==========================================================================
rem  RENDERIZAR_BAILE.bat - short "baile" (1080x1920, 30 fps)
rem
rem  Uso:
rem    RENDERIZAR_BAILE.bat                 render de 2 tramos + union + efectos + mezcla
rem                                         -> out\baile_final.mp4
rem    RENDERIZAR_BAILE.bat solo_mezcla     salta el render: une los tramos ya existentes
rem                                         (out\baile_A.mp4, out\baile_B.mp4) y mezcla
rem    RENDERIZAR_BAILE.bat solo_mezcla X   igual, pero escribe out\X.mp4 (pruebas)
rem
rem  Los cuadros totales NO son constantes: se leen de src\videos\baile\tomas\cortes.ts
rem  (herramientas\generar_shots_baile.mjs, que tambien regenera src\videos\baile\shots.json).
rem  Genera efectos.wav y efectos_ajustados.wav si faltan (src\videos\baile\audio\).
rem  Requisitos: Node.js, ffmpeg/ffprobe en PATH y .venv\Scripts\python.exe
rem ==========================================================================
setlocal
cd /d "%~dp0"
title Renderizar baile

set "COMPOSICION=baile"
set "TRAMO_A=out\baile_A.mp4"
set "TRAMO_B=out\baile_B.mp4"
set "VIDEO_UNIDO=out\baile_video.mp4"
set "SALIDA=out\baile_final.mp4"
set "PYTHON=.venv\Scripts\python.exe"
set "AUDIO=src\videos\baile\audio"

set "MODO=completo"
if /i "%~1"=="solo_mezcla" set "MODO=solo_mezcla"
if not "%~2"=="" (
  set "SALIDA=out\%~2.mp4"
  set "VIDEO_UNIDO=out\%~2_video.mp4"
)

echo ==== Renderizar %COMPOSICION% (1080x1920, 30 fps) - modo %MODO% ====
echo.

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo ERROR: no se encontro ffmpeg en PATH. Instalalo ^(winget install Gyan.FFmpeg^) y abre una ventana nueva.
  goto :fin_error
)
where ffprobe >nul 2>nul
if errorlevel 1 (
  echo ERROR: no se encontro ffprobe en PATH. Reinstala ffmpeg.
  goto :fin_error
)
if not exist "%PYTHON%" (
  echo ERROR: falta %PYTHON%. Crea el entorno: python -m venv .venv
  goto :fin_error
)
if not exist "src\videos\baile\voz.wav" (
  echo ERROR: falta src\videos\baile\voz.wav ^(genera la voz con herramientas\generar_voz.py^).
  goto :fin_error
)
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: no se encontro Node.js. Instalalo desde https://nodejs.org y vuelve a intentar.
  goto :fin_error
)
if not exist "node_modules\" (
  echo Instalando dependencias por primera vez...
  call npm install
  if errorlevel 1 (
    echo ERROR: fallo npm install.
    goto :fin_error
  )
)
if not exist "out\" mkdir "out"

rem ---- Cuadros totales (desde cortes.ts) y shots.json para el QA ----
set "TOTAL_CUADROS="
for /f "usebackq delims=" %%i in (`node herramientas\generar_shots_baile.mjs --total`) do set "TOTAL_CUADROS=%%i"
if "%TOTAL_CUADROS%"=="" (
  echo ERROR: no se pudo leer el total de cuadros de cortes.ts.
  goto :fin_error
)
node herramientas\generar_shots_baile.mjs
set /a CORTE=TOTAL_CUADROS/2
set /a FIN_A=CORTE-1
set /a FIN_B=TOTAL_CUADROS-1
echo Cuadros totales: %TOTAL_CUADROS% ^(tramo A: 0-%FIN_A%, tramo B: %CORTE%-%FIN_B%^)
echo.

rem ---- Efectos y niveles (si faltan) ----
if not exist "%AUDIO%\efectos.wav" (
  echo Generando efectos y musica...
  "%PYTHON%" "%AUDIO%\generar_efectos.py"
  if errorlevel 1 goto :fin_error
)
if not exist "%AUDIO%\efectos_ajustados.wav" (
  echo Ajustando niveles de los efectos...
  "%PYTHON%" "%AUDIO%\ajustar_niveles.py"
  if errorlevel 1 goto :fin_error
)

if /i "%MODO%"=="solo_mezcla" goto :union

where npx >nul 2>nul
if errorlevel 1 (
  echo ERROR: no se encontro npx. Reinstala Node.js y vuelve a intentar.
  goto :fin_error
)

rem ---- Render por tramos (memoria) ----
echo Iniciando render (tramo A: cuadros 0-%FIN_A%)...
call npx remotion render src\index.ts %COMPOSICION% "%TRAMO_A%" --codec h264 --crf 16 --gl=angle --concurrency=3 --timeout=240000 --frames=0-%FIN_A%
if errorlevel 1 (
  echo.
  echo ERROR: fallo el render del tramo A. Revisa el mensaje de arriba.
  goto :fin_error
)
echo.
echo Iniciando render (tramo B: cuadros %CORTE%-%FIN_B%)...
call npx remotion render src\index.ts %COMPOSICION% "%TRAMO_B%" --codec h264 --crf 16 --gl=angle --concurrency=3 --timeout=240000 --frames=%CORTE%-%FIN_B%
if errorlevel 1 (
  echo.
  echo ERROR: fallo el render del tramo B. Revisa el mensaje de arriba.
  goto :fin_error
)

:union
if not exist "%TRAMO_A%" (
  echo ERROR: falta %TRAMO_A%. Ejecuta primero el render completo.
  goto :fin_error
)
if not exist "%TRAMO_B%" (
  echo ERROR: falta %TRAMO_B%. Ejecuta primero el render completo.
  goto :fin_error
)
echo.
echo Uniendo tramos -^> %VIDEO_UNIDO% ...
ffmpeg -v error -y -i "%TRAMO_A%" -i "%TRAMO_B%" -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0,scale=in_range=pc:out_range=tv,format=yuv420p[v]" -map "[v]" -c:v libx264 -crf 16 -pix_fmt yuv420p -color_range tv -r 30 "%VIDEO_UNIDO%"
if errorlevel 1 (
  echo ERROR: fallo la union de tramos con ffmpeg.
  goto :fin_error
)

echo.
echo Mezclando voz y efectos a -14 LUFS -^> %SALIDA% ...
"%PYTHON%" "%AUDIO%\mezclar.py" "%VIDEO_UNIDO%" "%SALIDA%"
if errorlevel 1 (
  echo ERROR: fallo la mezcla de audio.
  goto :fin_error
)

echo.
echo ==== Listo ====
echo Video final: "%~dp0%SALIDA%"
echo.
pause
exit /b 0

:fin_error
echo.
pause
exit /b 1
