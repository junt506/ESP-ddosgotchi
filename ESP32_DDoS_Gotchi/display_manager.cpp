/*
 * Display Manager Implementation
 */

#include "display_manager.h"

// ============================================================================
// Pwnagotchi Faces (ASCII Art) - Definitions
// ============================================================================

// Happy face (normal operation)
const char* FACE_HAPPY[] = {
    " (◕‿◕) ",
    "  DDoS  ",
    " Gotchi "
};

// Alert face (warning)
const char* FACE_ALERT[] = {
    " (°□°) ",
    "  DDoS  ",
    " Gotchi "
};

// Under attack face
const char* FACE_ATTACK[] = {
    " (ಠ_ಠ) ",
    "  DDoS  ",
    " Gotchi "
};

// Stressed face (severe attack)
const char* FACE_STRESSED[] = {
    " (╯°□°)╯",
    "  DDoS   ",
    " Gotchi  "
};

// Quotes for each state
const char* QUOTE_HAPPY = "All systems normal";
const char* QUOTE_ALERT = "Hmm... suspicious";
const char* QUOTE_ATTACK = "UNDER ATTACK!";
const char* QUOTE_STRESSED = "HELP! DDoS!!!";

// ============================================================================
// Constructor
// ============================================================================

DisplayManager::DisplayManager() {
    tft = nullptr;
    lastState = STATE_HAPPY;
    lastPacketRate = 0;
    lastLatency = 0.0;
    lastPacketLoss = 0.0;
}

// ============================================================================
// Initialization
// ============================================================================

void DisplayManager::begin(TFT_eSPI* tftPtr) {
    tft = tftPtr;

    Serial.println("[DISPLAY] Initializing TFT...");

    // Turn on backlight (GPIO 21 on ESP32-2432S028R)
    pinMode(21, OUTPUT);
    digitalWrite(21, HIGH);
    Serial.println("[DISPLAY] Backlight enabled");

    tft->init();
    tft->setRotation(1); // Landscape: 0=portrait, 1=landscape, 2=portrait flip, 3=landscape flip
    tft->fillScreen(COLOR_BACKGROUND);

    Serial.print("[DISPLAY] TFT initialized. Width: ");
    Serial.print(tft->width());
    Serial.print(", Height: ");
    Serial.println(tft->height());
}

// ============================================================================
// Boot Screen
// ============================================================================

void DisplayManager::showBootScreen(const char* title, const char* message) {
    tft->fillScreen(COLOR_BACKGROUND);

    // Title - centered for landscape 320x240
    tft->setTextColor(COLOR_HAPPY);
    tft->setTextSize(2);
    tft->setCursor(20, 100);
    tft->println(title);

    // Message
    tft->setTextColor(COLOR_TEXT);
    tft->setTextSize(1);
    tft->setCursor(80, 140);
    tft->println(message);
}

// ============================================================================
// Main Update Function
// ============================================================================

void DisplayManager::update(NetworkStats& stats, AttackResult& result) {
    // Redraw face area if state changed
    if (result.state != lastState) {
        drawFaceArea(result.state);
        lastState = result.state;
    }

    // Only update stats if values changed significantly
    if (abs(stats.latency - lastLatency) > 1.0 ||
        abs(stats.packetLoss - lastPacketLoss) > 0.5 ||
        stats.packetRate != lastPacketRate) {
        drawStatsArea(stats, result);
        lastLatency = stats.latency;
        lastPacketLoss = stats.packetLoss;
        lastPacketRate = stats.packetRate;
    }

    // Only update graphs when new data is added (check history index)
    static uint8_t lastHistoryIndex = 0;
    if (stats.historyIndex != lastHistoryIndex) {
        drawGraphArea(stats);
        lastHistoryIndex = stats.historyIndex;
    }
}

// ============================================================================
// Draw Face Area (Left side)
// ============================================================================

void DisplayManager::drawFaceArea(AttackState state) {
    // Clear area
    tft->fillRect(FACE_X, FACE_Y, FACE_WIDTH, FACE_HEIGHT, COLOR_BACKGROUND);

    // Select face and quote based on state
    const char** face;
    const char* quote;
    uint16_t color = getStateColor(state);

    switch (state) {
        case STATE_HAPPY:
            face = (const char**)FACE_HAPPY;
            quote = QUOTE_HAPPY;
            break;
        case STATE_ALERT:
            face = (const char**)FACE_ALERT;
            quote = QUOTE_ALERT;
            break;
        case STATE_UNDER_ATTACK:
            face = (const char**)FACE_ATTACK;
            quote = QUOTE_ATTACK;
            break;
        case STATE_STRESSED:
            face = (const char**)FACE_STRESSED;
            quote = QUOTE_STRESSED;
            break;
        default:
            face = (const char**)FACE_HAPPY;
            quote = QUOTE_HAPPY;
            break;
    }

    // Draw face
    drawFace(face, color);

    // Draw quote
    drawQuote(quote, color);
}

// ============================================================================
// Draw Pwnagotchi Face
// ============================================================================

void DisplayManager::drawFace(const char* face[], uint16_t color) {
    tft->setTextColor(color);
    tft->setTextSize(2);

    int startY = FACE_Y + 20;

    for (int i = 0; i < 3; i++) {
        int textWidth = strlen(face[i]) * 12; // Approximate width
        int x = FACE_X + (FACE_WIDTH - textWidth) / 2;
        int y = startY + (i * 20);

        tft->setCursor(x, y);
        tft->println(face[i]);
    }
}

// ============================================================================
// Draw Quote Below Face
// ============================================================================

void DisplayManager::drawQuote(const char* quote, uint16_t color) {
    tft->setTextColor(color);
    tft->setTextSize(1);

    int textWidth = strlen(quote) * 6; // Approximate width
    int x = FACE_X + (FACE_WIDTH - textWidth) / 2;
    int y = FACE_Y + FACE_HEIGHT - 15;

    tft->setCursor(x, y);
    tft->println(quote);
}

// ============================================================================
// Draw Stats Area (Right side)
// ============================================================================

void DisplayManager::drawStatsArea(NetworkStats& stats, AttackResult& result) {
    // Clear area
    tft->fillRect(STATS_X, STATS_Y, STATS_WIDTH, STATS_HEIGHT, COLOR_BACKGROUND);

    // Title
    tft->setTextColor(COLOR_TEXT);
    tft->setTextSize(1);
    tft->setCursor(STATS_X, STATS_Y);
    tft->println("NETWORK STATUS");

    // Draw stats
    int lineY = STATS_Y + 15;

    // Latency
    uint16_t latencyColor = COLOR_TEXT;
    if (stats.latency > LATENCY_ATTACK) latencyColor = COLOR_ATTACK;
    else if (stats.latency > LATENCY_WARNING) latencyColor = COLOR_WARNING;
    else latencyColor = COLOR_HAPPY;
    drawStatLine(lineY, "Latency:", stats.latency, "ms", latencyColor);
    lineY += 12;

    // Packet Loss
    uint16_t lossColor = COLOR_TEXT;
    if (stats.packetLoss > PACKET_LOSS_ATTACK) lossColor = COLOR_ATTACK;
    else if (stats.packetLoss > PACKET_LOSS_WARNING) lossColor = COLOR_WARNING;
    else lossColor = COLOR_HAPPY;
    drawStatLine(lineY, "Loss:", stats.packetLoss, "%", lossColor);
    lineY += 12;

    // Packet Rate
    uint16_t rateColor = COLOR_TEXT;
    if (stats.packetRate > CONN_ATTACK_THRESHOLD) rateColor = COLOR_ATTACK;
    else if (stats.packetRate > CONN_WARNING_THRESHOLD) rateColor = COLOR_WARNING;
    else rateColor = COLOR_HAPPY;
    drawStatLine(lineY, "Rate:", (float)stats.packetRate, "pps", rateColor);
    lineY += 12;

    // Confidence
    drawStatLine(lineY, "Confidence:", (float)result.confidence, "%", COLOR_TEXT);
    lineY += 12;

    // RSSI
    drawStatLine(lineY, "WiFi:", (float)stats.rssi, "dBm", COLOR_TEXT);
}

// ============================================================================
// Draw Single Stat Line
// ============================================================================

void DisplayManager::drawStatLine(int y, const char* label, float value,
                                   const char* unit, uint16_t color) {
    // Label
    tft->setTextColor(COLOR_TEXT);
    tft->setTextSize(1);
    tft->setCursor(STATS_X, y);
    tft->print(label);

    // Value
    tft->setTextColor(color);
    tft->setCursor(STATS_X + 70, y);

    // Format based on value
    if (value < 10.0) {
        tft->printf("%.1f", value);
    } else {
        tft->printf("%.0f", value);
    }

    tft->print(" ");
    tft->print(unit);
}

// ============================================================================
// Draw Graph Area (Bottom)
// ============================================================================

void DisplayManager::drawGraphArea(NetworkStats& stats) {
    // Clear area
    tft->fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT, COLOR_BACKGROUND);

    // Split graph area in half
    int graphHeight = GRAPH_HEIGHT / 2 - 5;

    // Draw latency graph (top half)
    drawGraph(GRAPH_X, GRAPH_Y,
              GRAPH_WIDTH, graphHeight,
              stats.latencyHistory,
              stats.historyCount,
              stats.historyIndex,
              0.0, 500.0,
              COLOR_GRAPH_LATENCY,
              "Latency (ms)");

    // Draw packet loss graph (bottom half)
    drawGraph(GRAPH_X, GRAPH_Y + graphHeight + 10,
              GRAPH_WIDTH, graphHeight,
              stats.packetLossHistory,
              stats.historyCount,
              stats.historyIndex,
              0.0, 100.0,
              COLOR_GRAPH_LOSS,
              "Packet Loss (%)");
}

// ============================================================================
// Draw Simple Line Graph
// ============================================================================

void DisplayManager::drawGraph(int x, int y, int w, int h,
                                float* data, uint8_t count, uint8_t index,
                                float minVal, float maxVal,
                                uint16_t color, const char* label) {
    if (count < 2) return; // Need at least 2 points

    // Draw label
    tft->setTextColor(color);
    tft->setTextSize(1);
    tft->setCursor(x, y);
    tft->println(label);

    // Graph area
    int graphY = y + 10;
    int graphH = h - 10;

    // Draw border
    tft->drawRect(x, graphY, w, graphH, COLOR_TEXT);

    // Draw graph lines
    float xStep = (float)w / (count - 1);

    for (int i = 0; i < count - 1; i++) {
        // Get data points (in circular buffer order)
        int idx1 = (index + i) % MAX_HISTORY_POINTS;
        int idx2 = (index + i + 1) % MAX_HISTORY_POINTS;

        if (idx1 >= count || idx2 >= count) continue;

        float val1 = data[idx1];
        float val2 = data[idx2];

        // Clamp values
        val1 = constrain(val1, minVal, maxVal);
        val2 = constrain(val2, minVal, maxVal);

        // Map to graph coordinates
        int x1 = x + (i * xStep);
        int y1 = graphY + graphH - ((val1 - minVal) / (maxVal - minVal) * graphH);

        int x2 = x + ((i + 1) * xStep);
        int y2 = graphY + graphH - ((val2 - minVal) / (maxVal - minVal) * graphH);

        // Draw line segment
        tft->drawLine(x1, y1, x2, y2, color);
    }
}

// ============================================================================
// Get Color for Attack State
// ============================================================================

uint16_t DisplayManager::getStateColor(AttackState state) {
    switch (state) {
        case STATE_HAPPY:
            return COLOR_HAPPY;
        case STATE_ALERT:
            return COLOR_WARNING;
        case STATE_UNDER_ATTACK:
        case STATE_STRESSED:
            return COLOR_ATTACK;
        default:
            return COLOR_TEXT;
    }
}
