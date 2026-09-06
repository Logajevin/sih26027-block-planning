@echo off
title Launching SIH26027 Command Center...
cd /d "%~dp0"
start "" http://localhost:8000
python run_server.py
