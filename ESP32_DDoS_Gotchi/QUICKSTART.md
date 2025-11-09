# Quick Start Guide

Get your ESP32 DDoS Gotchi running in 5 minutes!

## 📦 What You Need

- ESP32-2432S028R board
- USB-C cable
- Computer with Arduino IDE
- WiFi network (2.4GHz)

## 🚀 Fast Setup

### 1. Install Arduino IDE & ESP32

```bash
# Download Arduino IDE from: https://www.arduino.cc/en/software

# In Arduino IDE:
File → Preferences → Additional Boards Manager URLs:
https://espressif.github.io/arduino-esp32/package_esp32_index.json

Tools → Board → Boards Manager → Search "ESP32" → Install
```

### 2. Install Libraries

```bash
# In Arduino IDE Library Manager (Sketch → Include Library → Manage Libraries):

1. Search "TFT_eSPI" → Install (by Bodmer)
2. Search "ESP32Ping" → Install (by marian-craciunescu)
```

### 3. Configure TFT_eSPI

⚠️ **CRITICAL STEP**

**Option A - Automatic (Recommended)**

1. Find your Arduino libraries folder:
   - Windows: `Documents\Arduino\libraries\`
   - Mac: `~/Documents/Arduino/libraries/`
   - Linux: `~/Arduino/libraries/`

2. Copy `User_Setup.h` from this project to `TFT_eSPI/User_Setup.h`
   ```bash
   cp ESP32_DDoS_Gotchi/User_Setup.h Arduino/libraries/TFT_eSPI/User_Setup.h
   ```

**Option B - Manual**

1. Open `Arduino/libraries/TFT_eSPI/User_Setup.h`
2. Find and uncomment:
   ```cpp
   #define ILI9341_DRIVER
   ```
3. Set these pins:
   ```cpp
   #define TFT_MISO 12
   #define TFT_MOSI 13
   #define TFT_SCLK 14
   #define TFT_CS   15
   #define TFT_DC   2
   #define TFT_BL   21
   ```

### 4. Test Display (Recommended)

Before running the full program, test your display:

1. Open `examples/DisplayTest/DisplayTest.ino`
2. Upload to ESP32
3. You should see colored screens and "Display Test OK!"

If this fails, your `User_Setup.h` is not configured correctly.

### 5. Configure WiFi

Edit `ESP32_DDoS_Gotchi/config.h`:

```cpp
#define WIFI_SSID "YourWiFiName"
#define WIFI_PASSWORD "YourPassword"
```

### 6. Upload Main Program

1. Connect ESP32 via USB
2. Select:
   - `Tools → Board → ESP32 Dev Module`
   - `Tools → Port → (your COM/tty port)`
3. Click Upload (→)
4. If stuck on "Connecting...", hold the BOOT button

### 7. Monitor Serial Output

```bash
Tools → Serial Monitor → 115200 baud

You should see:
[INIT] Initializing display...
[INIT] Connecting to WiFi...
[NETMON] WiFi promiscuous mode enabled
[DETECTOR] Learning baseline...
[READY] System initialized successfully!
```

## 🎉 Done!

Your ESP32 DDoS Gotchi is now running! You should see:

- **Happy face** (◕‿◕) in green if network is healthy
- **Latency graph** showing ping times
- **Packet loss graph** showing network quality
- **Real-time statistics** on the right

## 🧪 Quick Test

From another computer on the same network:

```bash
# Get ESP32 IP from Serial Monitor, then:
ping <ESP32_IP>

# You should see latency values update on the display
```

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| Display blank | Copy `User_Setup.h` to TFT_eSPI folder |
| Won't upload | Hold BOOT button, check USB drivers |
| WiFi won't connect | Check SSID/password, use 2.4GHz WiFi |
| Compilation error | Install all libraries, use ESP32 v2.0.11+ |

## 📚 Next Steps

- Read full [README.md](README.md) for detailed documentation
- Adjust thresholds in `config.h` for your network
- Test attack detection with controlled traffic

## 💡 Tips

- **Baseline Learning**: Wait 60 seconds after boot for accurate detection
- **False Positives**: Increase thresholds in `config.h`
- **Better Range**: Use external antenna if available
- **Power Issues**: Use USB 2.0 port (not USB 3.0) if display flickers

---

**Need Help?** Check the full README.md or open an issue on GitHub!
