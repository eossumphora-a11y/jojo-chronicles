@echo off
cd /d "%~dp0"
start "" "http://localhost:8765/studio/"
python -m http.server 8765
if errorlevel 1 py -m http.server 8765
pause
