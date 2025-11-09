/*
 * ESP32 DDoS Gotchi
 *
 * Lightweight DDoS detection system for ESP32-2432S028R
 * Displays network health with Pwnagotchi-style interface
 *
 * Hardware: ESP32-2432S028R (Cheap Yellow Display)
 *   - 2.8" ILI9341 TFT (320x240)
 *   - XPT2046 Resistive Touch
 *   - ESP32-WROOM-32
 *
 * Author: Ported from desktop DDoS Gotchi
 * Date: 2025
 */

#include <WiFi.h>
#include <TFT_eSPI.h>
#include <esp_wifi.h>
#include "config.h"
#include "network_monitor.h"
#include "attack_detector.h"
#include "display_manager.h"

// ============================================================================
// Global Objects
// ============================================================================

TFT_eSPI tft = TFT_eSPI();
NetworkMonitor netMonitor;
AttackDetector detector;
DisplayManager display;

// ============================================================================
// Timing Variables
// ============================================================================

unsigned long lastNetworkUpdate = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastPingCheck = 0;

// ============================================================================
// Setup
// ============================================================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n\n╔══════════════════════════════════════╗");
    Serial.println("║     ESP32 DDoS Gotchi v1.0          ║");
    Serial.println("║  Lightweight Network Attack Detector ║");
    Serial.println("╚══════════════════════════════════════╝\n");

    // Initialize display first (so we can show status)
    Serial.println("[INIT] Initializing display...");
    display.begin(&tft);
    display.showBootScreen("ESP32 DDoS Gotchi", "Initializing...");
    delay(1000);

    // Initialize WiFi
    Serial.println("[INIT] Connecting to WiFi...");
    display.showBootScreen("ESP32 DDoS Gotchi", "Connecting to WiFi...");
    connectWiFi();

    // Initialize network monitor
    Serial.println("[INIT] Starting network monitor...");
    display.showBootScreen("ESP32 DDoS Gotchi", "Starting monitor...");
    netMonitor.begin();

    // Initialize attack detector
    Serial.println("[INIT] Initializing detector...");
    detector.begin();

    // Show ready screen
    display.showBootScreen("ESP32 DDoS Gotchi", "Ready!");
    delay(1500);

    Serial.println("\n[READY] System initialized successfully!");
    Serial.println("===========================================\n");
}

// ============================================================================
// Main Loop
// ============================================================================

void loop() {
    unsigned long currentMillis = millis();

    // Network monitoring (every 2 seconds)
    if (currentMillis - lastNetworkUpdate >= NETWORK_UPDATE_INTERVAL) {
        lastNetworkUpdate = currentMillis;

        // Update network statistics
        netMonitor.update();

        // Get current metrics
        NetworkStats stats = netMonitor.getStats();

        // Run attack detection
        AttackResult result = detector.analyze(stats);

        // Log to serial
        logStatus(stats, result);
    }

    // Ping check (every 10 seconds)
    if (currentMillis - lastPingCheck >= PING_CHECK_INTERVAL) {
        lastPingCheck = currentMillis;
        netMonitor.measureLatency();
    }

    // Display update (every 500ms for smooth animation)
    if (currentMillis - lastDisplayUpdate >= DISPLAY_UPDATE_INTERVAL) {
        lastDisplayUpdate = currentMillis;

        NetworkStats stats = netMonitor.getStats();
        AttackResult result = detector.analyze(stats);

        display.update(stats, result);
    }

    // Small delay to prevent watchdog timeout
    delay(10);
}

// ============================================================================
// WiFi Connection
// ============================================================================

void connectWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("[WIFI] Connecting to ");
    Serial.print(WIFI_SSID);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(" Connected!");
        Serial.print("[WIFI] IP Address: ");
        Serial.println(WiFi.localIP());
        Serial.print("[WIFI] Gateway: ");
        Serial.println(WiFi.gatewayIP());
        Serial.print("[WIFI] SSID: ");
        Serial.println(WiFi.SSID());
        Serial.print("[WIFI] RSSI: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    } else {
        Serial.println(" FAILED!");
        Serial.println("[ERROR] Could not connect to WiFi");
        Serial.println("[ERROR] Please check config.h and update credentials");

        display.showBootScreen("WiFi Error", "Check credentials!");
        while (1) {
            delay(1000);
        }
    }
}

// ============================================================================
// Serial Logging
// ============================================================================

void logStatus(NetworkStats& stats, AttackResult& result) {
    // Print separator
    Serial.println("─────────────────────────────────────");

    // Print attack state
    Serial.print("[STATE] ");
    switch (result.state) {
        case STATE_HAPPY:
            Serial.print("😊 HAPPY");
            break;
        case STATE_ALERT:
            Serial.print("⚠️  ALERT");
            break;
        case STATE_UNDER_ATTACK:
            Serial.print("🚨 UNDER ATTACK");
            break;
        case STATE_STRESSED:
            Serial.print("😰 STRESSED");
            break;
    }
    Serial.print(" | Confidence: ");
    Serial.print(result.confidence);
    Serial.println("%");

    // Print attack type if detected
    if (result.attackType != ATTACK_NONE) {
        Serial.print("[ATTACK] Type: ");
        switch (result.attackType) {
            case ATTACK_ICMP_FLOOD: Serial.println("ICMP Flood"); break;
            case ATTACK_UDP_FLOOD: Serial.println("UDP Flood"); break;
            case ATTACK_SYN_FLOOD: Serial.println("SYN Flood"); break;
            case ATTACK_MIXED: Serial.println("Mixed DDoS"); break;
            case ATTACK_SLOW: Serial.println("Slow DDoS"); break;
            case ATTACK_VOLUMETRIC: Serial.println("Volumetric Attack"); break;
            default: break;
        }
    }

    // Print metrics
    Serial.print("[METRICS] Latency: ");
    Serial.print(stats.latency, 1);
    Serial.print(" ms | Packet Loss: ");
    Serial.print(stats.packetLoss, 1);
    Serial.print("% | Packet Rate: ");
    Serial.print(stats.packetRate);
    Serial.println(" pps");

    Serial.print("[NETWORK] Packets: ");
    Serial.print(stats.totalPackets);
    Serial.print(" | WiFi RSSI: ");
    Serial.print(stats.rssi);
    Serial.println(" dBm");
}
