@echo off
cd /d "%~dp0"

echo Memulai server...
start "WEB SJS Server" cmd /k "npm start"

echo Menunggu server siap...
timeout /t 3 /nobreak >nul

echo Membuka browser...
start "" "http://localhost:5057"

echo.
echo Selesai. Jangan tutup jendela "WEB SJS Server".
pause
