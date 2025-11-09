/*
 * Network Monitor - WiFi Packet Sniffer & Latency Monitor
 *
 * Monitors network traffic using ESP32's promiscuous mode
 * Measures latency and packet loss via ICMP ping
 */

#ifndef NETWORK_MONITOR_H
#define NETWORK_MONITOR_H

#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <ESP32Ping.h>
#include "config.h"

// ============================================================================
// Network Statistics Structure
// ============================================================================

struct NetworkStats {
    float latency;              // Current ping latency (ms)
    float packetLoss;           // Packet loss percentage
    uint32_t packetRate;        // Packets per second
    uint32_t totalPackets;      // Total packets captured
    int8_t rssi;                // WiFi signal strength
    bool isConnected;           // WiFi connection status

    // Historical data for graphing
    float latencyHistory[MAX_HISTORY_POINTS];
    float packetLossHistory[MAX_HISTORY_POINTS];
    uint32_t packetRateHistory[MAX_HISTORY_POINTS];
    uint8_t historyIndex;
    uint8_t historyCount;

    NetworkStats() {
        latency = 0.0;
        packetLoss = 0.0;
        packetRate = 0;
        totalPackets = 0;
        rssi = 0;
        isConnected = false;
        historyIndex = 0;
        historyCount = 0;

        // Initialize history arrays
        for (int i = 0; i < MAX_HISTORY_POINTS; i++) {
            latencyHistory[i] = 0.0;
            packetLossHistory[i] = 0.0;
            packetRateHistory[i] = 0;
        }
    }

    // Add data point to history
    void addHistoryPoint(float lat, float loss, uint32_t rate) {
        latencyHistory[historyIndex] = lat;
        packetLossHistory[historyIndex] = loss;
        packetRateHistory[historyIndex] = rate;

        historyIndex = (historyIndex + 1) % MAX_HISTORY_POINTS;
        if (historyCount < MAX_HISTORY_POINTS) {
            historyCount++;
        }
    }
};

// ============================================================================
// Network Monitor Class
// ============================================================================

class NetworkMonitor {
public:
    NetworkMonitor();

    void begin();
    void update();
    void measureLatency();
    NetworkStats& getStats();

private:
    NetworkStats stats;

    // Packet counting
    uint32_t packetCount;
    uint32_t lastPacketCount;
    unsigned long lastRateCalculation;

    // Baseline learning
    uint32_t baselineSum;
    uint8_t baselineSamples;
    float baselinePacketRate;

    // WiFi sniffer callback (must be static)
    static void wifiSnifferCallback(void* buf, wifi_promiscuous_pkt_type_t type);
    static NetworkMonitor* instance; // Singleton for callback access

    // Ping measurement
    bool pingGateway();

    // Rate calculation
    void calculatePacketRate();
};

#endif // NETWORK_MONITOR_H
