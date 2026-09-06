@echo off
title Indian Railways Automatic Block Planning Engine (SIH26027)
cd /d "%~dp0"
echo ======================================================================
echo Starting Indian Railways Automatic Block Planning Engine (SIH26027)
echo Web Dashboard: http://localhost:8000
echo API Docs:      http://localhost:8000/docs
echo ======================================================================
python run_server.py
pause
