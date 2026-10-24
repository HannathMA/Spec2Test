@echo off
title Spec2Test AI Platform
echo ===================================================
echo Starting Spec2Test AI (Backend + Frontend)
echo ===================================================
echo.
cd /d "%~dp0"

echo Activating Python Virtual Environment...
call .venv\Scripts\activate.bat

echo Starting Backend & Frontend Servers...
echo Backend:  http://127.0.0.1:8000 (Swagger: http://127.0.0.1:8000/docs)
echo Frontend: http://localhost:5173
echo.
npm run dev
pause
