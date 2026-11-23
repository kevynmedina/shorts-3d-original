@echo off
rem ==========================================================================
rem  RENDERIZAR.bat - short "melaza" (1080x1920, 30 fps)
rem
rem  Uso:
rem    RENDERIZAR.bat                 (doble clic) render de los 2 tramos + union + mezcla
rem                                   -> out\video.mp4 y out\melaza_final.mp4
rem    RENDERIZAR.bat solo_mezcla     salta el render: une los tramos ya existentes
rem                                   (out\video_A.mp4, out\video_B.mp4) y hace la mezcla
rem    RENDERIZAR.bat solo_mezcla X   igual, pero escribe out\X.mp4 (y out\X_video.mp4)
rem                                   para pruebas, sin tocar out\melaza_final.mp4
rem
rem  Requisitos: Node.js (node, npx), ffmpeg/ffprobe en PATH y .venv\Scripts\python.exe
rem  Mezcla: src\videos\melaza\audio\mezclar.py (voz.wav + efectos_ajustados.wav,
rem  loudnorm en dos pasadas a -14 LUFS, true peak -1.5 dBTP).
rem ==========================================================================
setlocal
cd /d "%~dp0"
title Renderizar melaza

rem ---- Parametros ----
set "COMPOSICION=melaza"
set "TOTAL_CUADROS=1451"
set "CORTE=726"
set "TRAMO_A=out\video_A.mp4"
set "TRAMO_B=out\video_B.mp4"
set "VIDEO_UNIDO=out\video.mp4"
set "SALIDA=out\melaza_final.mp4"
set "PYTHON=.venv\Scripts\python.exe"
set "MEZCLADOR=src\videos\melaza\audio\mezclar.py"

set /a FIN_A=CORTE-1
set /a FIN_B=TOTAL_CUADROS-1

set "MODO=completo"
if /i "%~1"=="solo_mezcla" set "MODO=solo_mezcla"
if not "%~2"=="" (
  set "SALIDA=out\%~2.mp4"
  set "VIDEO_UNIDO=out\%~2_video.mp4"
)

echo ==== Renderizar %COMPOSICION% (1080x1920, 30 fps) - modo %MODO% ====
echo.

rem ---- Comprobaciones ----
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
if not exist "%MEZCLADOR%" (
  echo ERROR: falta %MEZCLADOR%.
  goto :fin_error
)
if not exist "out\" mkdir "out"

if /i "%MODO%"=="solo_mezcla" goto :union

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: no se encontro Node.js. Instalalo desde https://nodejs.org y vuelve a intentar.
  goto :fin_error
)
where npx >nul 2>nul
if errorlevel 1 (
  echo ERROR: no se encontro npx. Reinstala Node.js y vuelve a intentar.
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
if not exist "src\index.ts" (
  echo ERROR: falta src\index.ts en esta carpeta.
  goto :fin_error
)

rem ---- Render por tramos ----
echo Iniciando render (tramo A: cuadros 0-%FIN_A%)...
call npx remotion render src\index.ts %COMPOSICION% "%TRAMO_A%" --codec h264 --crf 16 --gl=angle --concurrency=3 --timeout=180000 --frames=0-%FIN_A%
if errorlevel 1 (
  echo.
  echo ERROR: fallo el render del tramo A. Revisa el mensaje de arriba.
  goto :fin_error
)

echo.
echo Iniciando render (tramo B: cuadros %CORTE%-%FIN_B%)...
call npx remotion render src\index.ts %COMPOSICION% "%TRAMO_B%" --codec h264 --crf 16 --gl=angle --concurrency=3 --timeout=180000 --frames=%CORTE%-%FIN_B%
if errorlevel 1 (
  echo.
  echo ERROR: fallo el render del tramo B. Revisa el mensaje de arriba.
  goto :fin_error
)

:union
rem ---- Union de tramos ----
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
ffmpeg -v error -y -i "%TRAMO_A%" -i "%TRAMO_B%" -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v libx264 -crf 16 -pix_fmt yuv420p -r 30 "%VIDEO_UNIDO%"
if errorlevel 1 (
  echo ERROR: fallo la union de tramos con ffmpeg.
  goto :fin_error
)

rem ---- Mezcla de audio (loudnorm en dos pasadas) ----
echo.
echo Mezclando voz y efectos a -14 LUFS -^> %SALIDA% ...
"%PYTHON%" "%MEZCLADOR%" "%VIDEO_UNIDO%" "%SALIDA%"
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
