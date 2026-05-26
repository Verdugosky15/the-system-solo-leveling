@echo off
title THE SYSTEM - Servidor local
echo.
echo   ============================================
echo     THE SYSTEM - Iniciando servidor local...
echo   ============================================
echo.
echo   No cierres esta ventana mientras uses la app.
echo   Para cerrar la app: cierra esta ventana.
echo.
cd /d "%~dp0"
start "" http://localhost:8123/index.html
python -m http.server 8123 2>nul || py -m http.server 8123
pause
