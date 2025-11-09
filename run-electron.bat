@echo off
REM DDoS Gotchi v3.0 - Electron HUD Launcher for Windows
REM This script starts the Python backend and Electron frontend

echo.
echo DDoS Gotchi v3.0 - Futuristic HUD Edition
echo ==============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3 is not installed
    echo Please install Python 3 from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python found
python --version

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed
    echo Please install Node.js which includes npm
    pause
    exit /b 1
)

echo [OK] npm found
npm --version
echo.

REM Check Python dependencies
echo Checking Python dependencies...

python -c "import psutil" 2>nul
if errorlevel 1 (
    echo Installing Python dependencies...
    pip install -r requirements-electron.txt --user
)

python -c "import websockets" 2>nul
if errorlevel 1 (
    echo Installing websockets...
    pip install websockets --user
)

python -c "import netifaces" 2>nul
if errorlevel 1 (
    echo Installing netifaces...
    pip install netifaces --user
)

python -c "import aiohttp" 2>nul
if errorlevel 1 (
    echo Installing aiohttp...
    pip install aiohttp --user
)

echo [OK] Python dependencies installed
echo.

REM Check and install Electron dependencies
echo Checking Electron dependencies...
cd electron

if not exist "node_modules\" (
    echo Installing Electron dependencies...
    echo This may take a few minutes on first run...
    call npm install
    echo [OK] Electron dependencies installed
) else (
    echo [OK] Electron dependencies OK
)

cd ..
echo.

REM Start Python backend in background
echo Starting Python backend...
start /B python backend_electron.py

REM Wait for backend to start
timeout /t 2 /nobreak >nul

echo [OK] Backend started
echo.

REM Start Electron app
echo Launching Futuristic HUD Interface...
echo.
cd electron
call npm start

REM Cleanup: Kill backend when Electron exits
cd ..
echo.
echo Shutting down...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq backend_electron.py*" >nul 2>&1
echo Backend stopped
echo.
echo Thank you for using DDoS Gotchi!
echo Goodbye!
