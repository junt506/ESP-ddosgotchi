# ESP32 DDoS Gotchi

**Lightweight DDoS Detection System for ESP32**

A Pwnagotchi-inspired network attack detector optimized for the ESP32-2432S028R (Cheap Yellow Display). Monitors your network for DDoS attacks and displays real-time statistics with cute ASCII faces!

![ESP32 DDoS Gotchi](https://img.shields.io/badge/ESP32-DDoS%20Gotchi-green)
![Version](https://img.shields.io/badge/version-1.0-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

## 📋 Features

- **Multi-Method DDoS Detection**
  - WiFi packet rate monitoring (promiscuous mode)
  - ICMP ping latency measurement
  - Packet loss percentage tracking
  - Baseline anomaly detection
  - Attack type classification (ICMP/UDP/SYN/Mixed/Volumetric)

- **Pwnagotchi-Style Interface**
  - Animated ASCII faces (happy when safe, stressed under attack)
  - Color-coded states: Green = Happy, Yellow = Alert, Red = Attack
  - Real-time graphs (latency & packet loss)
  - Network statistics display

- **Optimized for Embedded**
  - < 280KB RAM usage
  - 2-second update interval
  - 60-point historical data (2 minutes)
  - No external dependencies (offline operation)

## 🛠️ Hardware Requirements

### Required Hardware

- **ESP32-2432S028R** (Cheap Yellow Display)
  - ESP32-WROOM-32 module
  - 2.8" ILI9341 TFT LCD (320×240)
  - XPT2046 resistive touchscreen
  - USB-C power/programming

### Pinout Reference

| Component | Pin | GPIO |
|-----------|-----|------|
| TFT_MISO  | 12  | GPIO12 |
| TFT_MOSI  | 13  | GPIO13 |
| TFT_SCLK  | 14  | GPIO14 |
| TFT_CS    | 15  | GPIO15 |
| TFT_DC    | 2   | GPIO2 |
| TFT_BL    | 21  | GPIO21 |
| TOUCH_CS  | 33  | GPIO33 |

## 📦 Software Requirements

### Arduino IDE Setup

1. **Install Arduino IDE**
   - Download from: https://www.arduino.cc/en/software
   - Version 1.8.19 or newer (or Arduino IDE 2.x)

2. **Add ESP32 Board Support**
   - Open Arduino IDE
   - Go to `File` → `Preferences`
   - Add to "Additional Boards Manager URLs":
     ```
     https://espressif.github.io/arduino-esp32/package_esp32_index.json
     ```
   - Go to `Tools` → `Board` → `Boards Manager`
   - Search for "ESP32"
   - Install **"ESP32 by Espressif Systems"** (version 2.0.11 or newer)

3. **Select Board**
   - Go to `Tools` → `Board` → `ESP32 Arduino`
   - Select **"ESP32 Dev Module"**

### Required Libraries

Install these libraries via `Sketch` → `Include Library` → `Manage Libraries`:

| Library | Version | Purpose |
|---------|---------|---------|
| **TFT_eSPI** | 2.5.0+ | ILI9341 display driver |
| **ESP32Ping** | 1.7+ | ICMP ping functionality |

#### Installing TFT_eSPI

```bash
# In Arduino IDE Library Manager:
Search: "TFT_eSPI"
Install: "TFT_eSPI by Bodmer"
```

⚠️ **IMPORTANT**: After installing TFT_eSPI, you MUST configure it for the ESP32-2432S028R board.

#### Installing ESP32Ping

```bash
# In Arduino IDE Library Manager:
Search: "ESP32Ping"
Install: "ESP32Ping by marian-craciunescu"
```

## ⚙️ Installation

### Step 1: Clone or Download

```bash
git clone https://github.com/yourusername/ESP32-DDoS-Gotchi.git
cd ESP32-DDoS-Gotchi
```

Or download as ZIP and extract.

### Step 2: Configure TFT_eSPI Library

**Critical Step**: The TFT_eSPI library needs board-specific pin configuration.

1. Locate your TFT_eSPI library folder:
   - **Windows**: `C:\Users\<YourName>\Documents\Arduino\libraries\TFT_eSPI\`
   - **macOS**: `~/Documents/Arduino/libraries/TFT_eSPI/`
   - **Linux**: `~/Arduino/libraries/TFT_eSPI/`

2. **Backup the original** `User_Setup.h`:
   ```bash
   cp User_Setup.h User_Setup.h.backup
   ```

3. **Copy the provided configuration**:
   ```bash
   # Copy from this project
   cp ESP32_DDoS_Gotchi/User_Setup.h <Arduino_Libraries_Path>/TFT_eSPI/User_Setup.h
   ```

   Or manually copy the contents of `User_Setup.h` from this project to the TFT_eSPI library folder.

### Step 3: Configure WiFi Credentials

1. Open `ESP32_DDoS_Gotchi/config.h`

2. Update your WiFi credentials:
   ```cpp
   #define WIFI_SSID "YOUR_WIFI_SSID"
   #define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
   ```

### Step 4: Adjust Detection Thresholds (Optional)

In `config.h`, you can customize detection sensitivity:

```cpp
// Connection thresholds
#define CONN_WARNING_THRESHOLD 20      // Yellow alert
#define CONN_ATTACK_THRESHOLD 50       // Red alert

// Latency thresholds (milliseconds)
#define LATENCY_WARNING 50
#define LATENCY_ATTACK 200
#define LATENCY_STRESSED 500

// Packet loss thresholds (percentage)
#define PACKET_LOSS_WARNING 5.0
#define PACKET_LOSS_ATTACK 20.0
#define PACKET_LOSS_STRESSED 50.0
```

### Step 5: Upload to ESP32

1. **Connect ESP32** via USB-C cable

2. **Select Port**:
   - Go to `Tools` → `Port`
   - Select the COM/tty port for your ESP32
   - If no port appears, install CH340/CP2102 USB drivers

3. **Configure Upload Settings**:
   ```
   Board: "ESP32 Dev Module"
   Upload Speed: "921600"
   CPU Frequency: "240MHz"
   Flash Frequency: "80MHz"
   Flash Mode: "QIO"
   Flash Size: "4MB"
   Partition Scheme: "Default 4MB with spiffs"
   ```

4. **Upload**:
   - Click the Upload button (→) in Arduino IDE
   - Wait for compilation and upload
   - If upload fails, press and hold the **BOOT** button on the ESP32 when you see "Connecting..."

5. **Monitor Serial Output**:
   - Open `Tools` → `Serial Monitor`
   - Set baud rate to **115200**
   - You should see initialization messages

## 🚀 Usage

### First Boot

On first boot, you'll see:

1. **Boot Screen**: "ESP32 DDoS Gotchi - Initializing..."
2. **WiFi Connection**: Connecting to your network
3. **Baseline Learning**: 30 seconds of traffic analysis to establish normal behavior
4. **Ready!**: Main monitoring screen appears

### Main Display Layout

```
┌─────────────────────────────────────┐
│  (◕‿◕)         NETWORK STATUS       │
│   DDoS         Latency: 12.3 ms     │
│  Gotchi        Loss: 0.2%           │
│ "All systems   Rate: 25 pps         │
│    normal"     Confidence: 95%      │
│                WiFi: -45 dBm        │
├─────────────────────────────────────┤
│ Latency (ms) ▁▂▃▂▁▂▃▄▃▂▁▁▂▃▂▁      │
├─────────────────────────────────────┤
│ Packet Loss (%) ▁▁▁▂▁▁▁▁▁▁▁▁▁▁     │
└─────────────────────────────────────┘
```

### Attack States

| State | Face | Color | Trigger |
|-------|------|-------|---------|
| **Happy** | (◕‿◕) | Green | Latency < 10ms, Loss < 1% |
| **Alert** | (°□°) | Yellow | Latency > 50ms OR Loss > 5% |
| **Under Attack** | (ಠ_ಠ) | Red | Latency > 200ms OR Loss > 20% |
| **Stressed** | (╯°□°)╯ | Red | Latency > 500ms OR Loss > 50% |

### Attack Types Detected

- **ICMP Flood**: Very high packet loss (>50%)
- **UDP Flood**: High loss + high latency
- **SYN Flood**: Very high latency, low loss
- **Mixed DDoS**: Moderate latency + packet loss
- **Volumetric**: Packet rate 3x above baseline
- **Slow DDoS**: Elevated latency

### Serial Monitor Output

Example output during normal operation:

```
[STATE] 😊 HAPPY | Confidence: 92%
[METRICS] Latency: 8.2 ms | Packet Loss: 0.3% | Packet Rate: 28 pps
[NETWORK] Packets: 1523 | WiFi RSSI: -42 dBm
─────────────────────────────────────
```

During attack:

```
[STATE] 🚨 UNDER ATTACK | Confidence: 87%
[ATTACK] Type: UDP Flood
[METRICS] Latency: 245.7 ms | Packet Loss: 23.8% | Packet Rate: 156 pps
[NETWORK] Packets: 8934 | WiFi RSSI: -45 dBm
─────────────────────────────────────
```

## 🧪 Testing

### Simulate an Attack (for testing)

You can test the detector using tools like `hping3` from another machine:

```bash
# UDP Flood test
hping3 --udp --flood --rand-source <ESP32_IP>

# SYN Flood test
hping3 -S --flood --rand-source <ESP32_IP>

# ICMP Flood test
hping3 --icmp --flood <ESP32_IP>
```

⚠️ **WARNING**: Only test on your own network! Unauthorized DDoS attacks are illegal.

### Normal Traffic Test

Generate normal traffic to verify baseline learning:

```bash
# Ping test
ping <ESP32_IP>

# Simple HTTP requests (if you add a web server)
curl http://<ESP32_IP>
```

## 🔧 Troubleshooting

### Display Issues

**Problem**: Display is blank or white
- **Solution**:
  1. Verify `User_Setup.h` was copied correctly
  2. Check power supply (use USB 2.0 port, not USB 3.0 if issues)
  3. Try `tft.invertDisplay(1)` in display_manager.cpp

**Problem**: Display is garbled or wrong colors
- **Solution**:
  1. Try different `tft.setRotation()` values (0-3)
  2. Verify SPI pins in `User_Setup.h`

**Problem**: Touch not working
- **Solution**: Touch is not currently used in this version (display-only)

### WiFi Issues

**Problem**: Won't connect to WiFi
- **Solution**:
  1. Check SSID/password in `config.h`
  2. Verify WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
  3. Check Serial Monitor for error messages

**Problem**: WiFi keeps disconnecting
- **Solution**:
  1. Move closer to router
  2. Check RSSI value (should be > -70 dBm)
  3. Reduce `SPI_FREQUENCY` in `User_Setup.h` to 20MHz

### Detection Issues

**Problem**: False positives (detects attacks when none exist)
- **Solution**:
  1. Increase thresholds in `config.h`
  2. Wait for baseline learning (30 samples = ~60 seconds)
  3. Ensure no other devices are flooding network

**Problem**: Doesn't detect real attacks
- **Solution**:
  1. Decrease thresholds in `config.h`
  2. Verify attack is targeting the network (not just one device)
  3. Check Serial Monitor for actual metrics

### Upload Issues

**Problem**: Upload timeout / "Connecting..."
- **Solution**:
  1. Press and hold BOOT button during upload
  2. Install CH340/CP2102 USB drivers
  3. Try lower upload speed (115200)

**Problem**: Compilation errors
- **Solution**:
  1. Verify all libraries are installed
  2. Check ESP32 board package version (use 2.0.11+)
  3. Clear Arduino IDE cache

## 📊 Technical Details

### Detection Algorithm

The system uses multiple detection methods:

1. **Threshold-Based Detection**
   - Compares latency/packet loss to predefined thresholds
   - Four states: Happy, Alert, Under Attack, Stressed

2. **Baseline Anomaly Detection**
   - Learns normal traffic patterns (30 sample baseline)
   - Alerts if metrics exceed 3x baseline

3. **Attack Type Classification**
   - Pattern matching based on metric combinations
   - Identifies specific attack vectors

4. **Confidence Scoring**
   - Weighted calculation (0-100%)
   - Factors: latency (40%), packet loss (40%), anomaly (20%)

### Memory Usage

```
Code:           ~150 KB
Global vars:    ~80 KB
Stack:          ~20 KB
Heap (dynamic): ~30 KB
Display buffer: ~150 KB
────────────────────────
Total:          ~280 KB (ESP32 has ~320 KB)
```

### Performance

- **Update Rate**: 2 seconds (network stats)
- **Display Refresh**: 500ms (smooth animation)
- **Ping Interval**: 10 seconds
- **History Window**: 60 points (2 minutes)

## 🔒 Security Notes

- This device monitors network traffic but **cannot block attacks**
- It's a **detection tool**, not a prevention tool
- For actual DDoS mitigation, use:
  - Hardware firewalls
  - Cloud-based DDoS protection (Cloudflare, AWS Shield)
  - ISP-level filtering

## 📚 Project Structure

```
ESP32_DDoS_Gotchi/
├── ESP32_DDoS_Gotchi.ino    # Main Arduino sketch
├── config.h                  # Configuration & thresholds
├── network_monitor.h/cpp     # WiFi sniffer & ping
├── attack_detector.h/cpp     # Detection algorithm
├── display_manager.h/cpp     # TFT UI & graphs
├── User_Setup.h              # TFT_eSPI configuration
└── README.md                 # This file
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test thoroughly on hardware
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Credits

- **Original DDoS Gotchi**: Desktop Python version
- **TFT_eSPI**: Bodmer (https://github.com/Bodmer/TFT_eSPI)
- **ESP32Ping**: marian-craciunescu
- **Inspiration**: Pwnagotchi (https://pwnagotchi.ai)

## 📧 Support

- **Issues**: https://github.com/yourusername/ESP32-DDoS-Gotchi/issues
- **Discussions**: https://github.com/yourusername/ESP32-DDoS-Gotchi/discussions

---

**Made with ❤️ for network security enthusiasts**

*Remember: Use this tool responsibly and only on networks you own or have permission to monitor.*
