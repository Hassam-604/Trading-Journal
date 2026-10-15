@echo off
setlocal
cd /d "%~dp0"
title Trading Journal

:: Locate Python
set PYTHON_CMD=python
if exist "..\.venv\Scripts\python.exe" (
    set PYTHON_CMD=..\.venv\Scripts\python.exe
) else if exist ".venv\Scripts\python.exe" (
    set PYTHON_CMD=.venv\Scripts\python.exe
)

echo Starting Trading Journal Web App...
echo Application URL: http://127.0.0.1:8000/
echo API Docs:        http://127.0.0.1:8000/docs
echo.
echo Press Ctrl+C to stop the server.
echo.

:: Open browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:8000/"

:: Launch server
%PYTHON_CMD% -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause

