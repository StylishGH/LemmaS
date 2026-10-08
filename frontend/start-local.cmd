@echo off
title LEMMAS Web - Launcher Local
echo =======================================================
echo          INICIANDO SERVICOS LOCAIS DO LEMMAS
echo =======================================================
echo.

cd /d "%~dp0\.."

echo [1/2] Iniciando API Python Shim (FastAPI) na porta 8000...
start "LEMMAS Backend (FastAPI)" cmd /k "python -m uvicorn web.api.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Iniciando Frontend Next.js na porta 3000...
cd /d "%~dp0"
start "LEMMAS Frontend (Next.js)" cmd /k "npm run dev"

echo.
echo =======================================================
echo Servicos iniciados com sucesso!
echo - Frontend:  http://localhost:3000
echo - Backend:   http://localhost:8000/api/health
echo - Docs API:  http://localhost:8000/docs
echo =======================================================
ping 127.0.0.1 -n 3 >nul
start http://localhost:3000
