@echo off
cd /d "%~dp0"
echo Building...
call npm run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo.
echo Starting server at http://127.0.0.1:8765/amblyopia-vision-demo.html
echo Keep this window open. Press Ctrl+C to stop.
echo.
start "" "http://127.0.0.1:8765/amblyopia-vision-demo.html"
python -m http.server 8765 --bind 127.0.0.1
