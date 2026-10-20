@echo off
setlocal
cd /d "%~dp0"
echo.
echo === JOJO CHRONICLES - INSTALLAZIONE AUDIO LOCALE ===
echo Python 3.10-3.12 consigliato. La prima installazione richiede Internet.
echo.
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -m venv .venv
) else (
  python -m venv .venv
)
if errorlevel 1 goto fail
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto fail
".venv\Scripts\python.exe" -m pip install -r "transcription\requirements.txt"
if errorlevel 1 goto fail
echo.
echo Installazione completata. Ora avvia start-local.bat
pause
exit /b 0
:fail
echo.
echo Installazione non riuscita. Controlla Python e la connessione Internet.
pause
exit /b 1
