/*
 * Display Manager - TFT UI with Graphs and Pwnagotchi Faces
 *
 * Manages ILI9341 display with:
 * - Pwnagotchi-style ASCII faces
 * - Real-time graphs (latency & packet loss)
 * - Status information
 * - Color-coded attack states
 */

#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <Arduino.h>
#include <TFT_eSPI.h>
#include "config.h"
#include "network_monitor.h"
#include "attack_detector.h"

// ============================================================================
// Pwnagotchi Faces (ASCII Art)
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
// Display Manager Class
// ============================================================================

class DisplayManager {
public:
    DisplayManager();

    void begin(TFT_eSPI* tftPtr);
    void update(NetworkStats& stats, AttackResult& result);
    void showBootScreen(const char* title, const char* message);

private:
    TFT_eSPI* tft;

    // Last state tracking (for redraw optimization)
    AttackState lastState;
    uint32_t lastPacketRate;
    float lastLatency;
    float lastPacketLoss;

    // Drawing functions
    void drawFaceArea(AttackState state);
    void drawStatsArea(NetworkStats& stats, AttackResult& result);
    void drawGraphArea(NetworkStats& stats);

    // Helper functions
    void drawFace(const char* face[], uint16_t color);
    void drawQuote(const char* quote, uint16_t color);
    void drawGraph(int x, int y, int w, int h,
                   float* data, uint8_t count, uint8_t index,
                   float minVal, float maxVal,
                   uint16_t color, const char* label);
    void drawStatLine(int y, const char* label, float value,
                      const char* unit, uint16_t color);

    uint16_t getStateColor(AttackState state);
};

#endif // DISPLAY_MANAGER_H
