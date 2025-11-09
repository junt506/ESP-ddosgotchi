@echo off
REM DDoS Gotchi v3.0 - Desktop Launcher for Windows

echo.
echo Starting DDoS Gotchi Desktop...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3 is not installed
    echo Please install Python 3 from: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check Python dependencies
set MISSING_DEPS=0

python -c "import netifaces" 2>nul
if errorlevel 1 (
    echo [MISSING] netifaces
    set MISSING_DEPS=1
)

python -c "import psutil" 2>nul
if errorlevel 1 (
    echo [MISSING] psutil
    set MISSING_DEPS=1
)

python -c "import matplotlib" 2>nul
if errorlevel 1 (
    echo [MISSING] matplotlib
    set MISSING_DEPS=1
)

python -c "import tkinter" 2>nul
if errorlevel 1 (
    echo [ERROR] tkinter is not available
    echo Tkinter should come with Python on Windows.
    echo Please reinstall Python and make sure to check "tcl/tk and IDLE" during installation.
    pause
    exit /b 1
)

REM Install Python dependencies if needed
if %MISSING_DEPS%==1 (
    echo.
    echo Installing Python dependencies...
    pip install -r requirements-desktop.txt
    echo.
)

REM Run the desktop app
echo Launching DDoS Gotchi Desktop...
python ddos_gotchi_desktop.py

pause
