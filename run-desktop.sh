#!/bin/bash
# Quick launcher for DDoS Gotchi Desktop

echo "🚀 Starting DDoS Gotchi Desktop..."

# Check Python dependencies
MISSING_DEPS=0

if ! python3 -c "import netifaces" 2>/dev/null; then
    echo "❌ Missing: netifaces"
    MISSING_DEPS=1
fi

if ! python3 -c "import psutil" 2>/dev/null; then
    echo "❌ Missing: psutil"
    MISSING_DEPS=1
fi

if ! python3 -c "import matplotlib" 2>/dev/null; then
    echo "❌ Missing: matplotlib"
    MISSING_DEPS=1
fi

if ! python3 -c "import tkinter" 2>/dev/null; then
    echo "❌ Missing: tkinter (install via system package manager)"
    echo "   Ubuntu/Debian: sudo apt-get install python3-tk python3-pil.imagetk"
    echo "   Fedora: sudo dnf install python3-tkinter python3-pillow-tk"
    exit 1
fi

# Install Python dependencies if needed
if [ $MISSING_DEPS -eq 1 ]; then
    echo "📦 Installing Python dependencies..."
    pip3 install -r requirements-desktop.txt
fi

# Run the desktop app
python3 ddos_gotchi_desktop.py
