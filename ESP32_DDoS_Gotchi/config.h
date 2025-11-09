/*
 * ESP32 DDoS Gotchi - Configuration
 * Optimized for ESP32-2432S028R (Cheap Yellow Display)
 *
 * Based on the desktop DDoS Gotchi detector
 * Ported for embedded use with ESP32
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// WiFi Configuration
// ============================================================================
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ============================================================================
// Detection Thresholds (tuned for embedded network monitoring)
// ============================================================================

// Connection thresholds
#define CONN_WARNING_THRESHOLD 20      // Yellow alert at 20 packets/sec
#define CONN_ATTACK_THRESHOLD 50       // Red alert at 50 packets/sec

// Latency thresholds (milliseconds)
#define LATENCY_HAPPY 10               // < 10ms = happy
#define LATENCY_WARNING 50             // 50-200ms = warning
#define LATENCY_ATTACK 200             // > 200ms = under attack
#define LATENCY_STRESSED 500           // > 500ms = severely stressed

// Packet loss thresholds (percentage)
#define PACKET_LOSS_HAPPY 1.0          // < 1% = happy
#define PACKET_LOSS_WARNING 5.0        // 5-20% = warning
#define PACKET_LOSS_ATTACK 20.0        // > 20% = under attack
#define PACKET_LOSS_STRESSED 50.0      // > 50% = ICMP flood

// ============================================================================
// Attack Detection Parameters
// ============================================================================

// Packet rate monitoring
#define PACKET_RATE_WINDOW 10          // Calculate rate over 10 second window
#define BASELINE_LEARNING_SAMPLES 30   // Learn baseline over 30 samples
#define ANOMALY_MULTIPLIER 3.0         // Alert if 3x above baseline

// Ping configuration
#define PING_COUNT 10                  // Send 10 pings per check
#define PING_TIMEOUT_MS 5000           // 5 second timeout
#define PING_INTERVAL_MS 100           // 100ms between pings

// Update intervals
#define NETWORK_UPDATE_INTERVAL 2000   // Check network every 2 seconds
#define DISPLAY_UPDATE_INTERVAL 2000   // Update display every 2 seconds (reduced to prevent flicker)
#define PING_CHECK_INTERVAL 10000      // Ping gateway every 10 seconds

// ============================================================================
// Display Configuration
// ============================================================================

// Screen dimensions (ESP32-2432S028R in landscape)
#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 240

// Display zones
#define FACE_X 10
#define FACE_Y 10
#define FACE_WIDTH 140
#define FACE_HEIGHT 100

#define STATS_X 160
#define STATS_Y 10
#define STATS_WIDTH 150
#define STATS_HEIGHT 100

#define GRAPH_X 10
#define GRAPH_Y 120
#define GRAPH_WIDTH 300
#define GRAPH_HEIGHT 110

// Colors (RGB565 format)
#define COLOR_HAPPY TFT_GREEN
#define COLOR_WARNING TFT_YELLOW
#define COLOR_ATTACK TFT_RED
#define COLOR_BACKGROUND TFT_BLACK
#define COLOR_TEXT TFT_WHITE
#define COLOR_GRAPH_LATENCY TFT_CYAN
#define COLOR_GRAPH_LOSS TFT_ORANGE

// ============================================================================
// Data Storage Limits (Memory optimization for ESP32)
// ============================================================================

#define MAX_HISTORY_POINTS 60          // 60 data points (2 min at 2sec updates)
#define MAX_TRACKED_IPS 20             // Track up to 20 unique IPs

// ============================================================================
// Attack State Enum
// ============================================================================

enum AttackState {
    STATE_HAPPY = 0,
    STATE_ALERT = 1,
    STATE_UNDER_ATTACK = 2,
    STATE_STRESSED = 3
};

// ============================================================================
// Attack Type Enum (from desktop version)
// ============================================================================

enum AttackType {
    ATTACK_NONE = 0,
    ATTACK_ICMP_FLOOD = 1,     // Packet loss > 50%
    ATTACK_UDP_FLOOD = 2,      // Packet loss > 20% AND latency > 200ms
    ATTACK_SYN_FLOOD = 3,      // Latency > 500ms AND packet loss < 10%
    ATTACK_MIXED = 4,          // Latency > 100ms AND packet loss > 10%
    ATTACK_SLOW = 5,           // Latency > 50ms
    ATTACK_VOLUMETRIC = 6      // High packet rate (> threshold)
};

#endif // CONFIG_H
