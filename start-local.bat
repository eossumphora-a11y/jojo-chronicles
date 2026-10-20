@echo off
cd /d "%~dp0"
start "" "http://127.0.0.1:8765/studio/"
python local_server.py
if errorlevel 1 py local_server.py
pause
