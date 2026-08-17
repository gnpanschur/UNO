@echo off
title UNO 2D Multiplayer Server
echo ===================================================
echo Starte UNO 2D Multiplayer Game Server...
echo ===================================================

cd /d "%~dp0"

IF NOT EXIST node_modules (
    echo Installiere Node-Abhaengigkeiten...
    call npm install
)

echo.
echo Server wird gestartet...
echo Das Spiel wird unter http://localhost:3000 im Browser geoeffnet.
echo.

start "" "http://localhost:3000"
npm start

pause
