@echo off
title PT-BOT Tactical Mission IDE
cd /d "%~dp0..\.."

echo ===================================================================
echo   PT-BOT ATOM VX - TACTICAL MISSION SUITE ^& EMBEDDED IDE
echo   Starting Standalone Desktop Application...
echo ===================================================================

if exist "%~dp0..\..\node_modules\electron\dist\electron.exe" (
    start "" "%~dp0..\..\node_modules\electron\dist\electron.exe" .
    exit
)

if exist "%~dp0..\..\node_modules\.bin\electron.cmd" (
    start "" "%~dp0..\..\node_modules\.bin\electron.cmd" .
    exit
)

start "" npx electron .
exit
