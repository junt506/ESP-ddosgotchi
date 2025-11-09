/*
 * Network Monitor Implementation
 */

#include "network_monitor.h"

// Static instance for callback
NetworkMonitor* NetworkMonitor::instance = nullptr;

// ============================================================================
// Constructor
// ============================================================================

NetworkMonitor::NetworkMonitor() {
    packetCount = 0;
    lastPacketCount = 0;
    lastRateCalculation = 0;
    baselineSum = 0;
    baselineSamples = 0;
    baselinePacketRate = 0.0;

    instance = this; // Set static instance for callback
}

// ============================================================================
// Initialization
// ============================================================================

void NetworkMonitor::begin() {
    Serial.println("[NETMON] Initializing network monitor...");

    // Set WiFi to promiscuous mode for packet sniffing
    esp_wifi_set_promiscuous(true);
    esp_wifi_set_promiscuous_rx_cb(&wifiSnifferCallback);

    Serial.println("[NETMON] WiFi promiscuous mode enabled");
    Serial.println("[NETMON] Learning baseline traffic...");

    lastRateCalculation = millis();
}

// ============================================================================
// WiFi Sniffer Callback
// ============================================================================

void IRAM_ATTR NetworkMonitor::wifiSnifferCallback(void* buf, wifi_promiscuous_pkt_type_t type) {
    // Count all packet types
    if (instance != nullptr) {
        instance->packetCount++;
        instance->stats.totalPackets++;
    }
}

// ============================================================================
// Update Network Statistics
// ============================================================================

void NetworkMonitor::update() {
    // Update WiFi connection status
    stats.isConnected = (WiFi.status() == WL_CONNECTED);
    if (stats.isConnected) {
        stats.rssi = WiFi.RSSI();
    }

    // Calculate packet rate
    calculatePacketRate();

    // Add to history
    stats.addHistoryPoint(stats.latency, stats.packetLoss, stats.packetRate);
}

// ============================================================================
// Calculate Packet Rate
// ============================================================================

void NetworkMonitor::calculatePacketRate() {
    unsigned long currentMillis = millis();
    unsigned long elapsed = currentMillis - lastRateCalculation;

    // Calculate rate every second
    if (elapsed >= 1000) {
        uint32_t packetsInWindow = packetCount - lastPacketCount;
        float elapsedSeconds = elapsed / 1000.0;

        stats.packetRate = (uint32_t)(packetsInWindow / elapsedSeconds);

        // Update baseline (learning phase)
        if (baselineSamples < BASELINE_LEARNING_SAMPLES) {
            baselineSum += stats.packetRate;
            baselineSamples++;

            if (baselineSamples == BASELINE_LEARNING_SAMPLES) {
                baselinePacketRate = baselineSum / (float)BASELINE_LEARNING_SAMPLES;
                Serial.print("[NETMON] Baseline learned: ");
                Serial.print(baselinePacketRate, 1);
                Serial.println(" pps");
            }
        }

        lastPacketCount = packetCount;
        lastRateCalculation = currentMillis;
    }
}

// ============================================================================
// Measure Latency via ICMP Ping
// ============================================================================

void NetworkMonitor::measureLatency() {
    if (!stats.isConnected) {
        stats.latency = 0.0;
        stats.packetLoss = 100.0;
        return;
    }

    IPAddress gateway = WiFi.gatewayIP();

    Serial.print("[PING] Pinging gateway ");
    Serial.print(gateway);
    Serial.print("...");

    // Perform ping test
    int successCount = 0;
    float totalLatency = 0.0;

    for (int i = 0; i < PING_COUNT; i++) {
        if (Ping.ping(gateway, 1)) {
            successCount++;
            totalLatency += Ping.averageTime();
        }
        delay(PING_INTERVAL_MS);
    }

    // Calculate results
    if (successCount > 0) {
        stats.latency = totalLatency / successCount;
    } else {
        stats.latency = PING_TIMEOUT_MS; // Max latency on failure
    }

    stats.packetLoss = ((PING_COUNT - successCount) / (float)PING_COUNT) * 100.0;

    Serial.print(" Done. Latency: ");
    Serial.print(stats.latency, 1);
    Serial.print(" ms, Loss: ");
    Serial.print(stats.packetLoss, 1);
    Serial.println("%");
}

// ============================================================================
// Get Current Statistics
// ============================================================================

NetworkStats& NetworkMonitor::getStats() {
    return stats;
}
