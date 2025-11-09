/*
 * ESP32-2432S028R Display Test
 *
 * Simple test sketch to verify your TFT display is working correctly
 * Upload this FIRST before trying the full DDoS Gotchi program
 *
 * Expected Result:
 * - Screen fills with colors (red, green, blue, white, black)
 * - Text displays "ESP32-2432S028R" and "Display Test OK!"
 * - Cycles every 2 seconds
 */

#include <TFT_eSPI.h>

TFT_eSPI tft = TFT_eSPI();

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n=================================");
    Serial.println("ESP32-2432S028R Display Test");
    Serial.println("=================================\n");

    // Initialize display
    Serial.println("[1/3] Initializing TFT...");
    tft.init();
    tft.setRotation(1); // Landscape mode (320x240)
    Serial.println("      ✓ TFT initialized");

    // Fill screen with color
    Serial.println("[2/3] Testing colors...");
    tft.fillScreen(TFT_RED);
    delay(500);
    tft.fillScreen(TFT_GREEN);
    delay(500);
    tft.fillScreen(TFT_BLUE);
    delay(500);
    Serial.println("      ✓ Colors OK");

    // Draw test text
    Serial.println("[3/3] Testing text...");
    tft.fillScreen(TFT_BLACK);
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    tft.setCursor(40, 100);
    tft.println("ESP32-2432S028R");
    tft.setCursor(60, 130);
    tft.setTextColor(TFT_GREEN);
    tft.println("Display Test OK!");
    Serial.println("      ✓ Text OK");

    Serial.println("\n✓ ALL TESTS PASSED!");
    Serial.println("Display is working correctly.");
    Serial.println("You can now upload the DDoS Gotchi sketch.\n");
}

void loop() {
    // Cycle through colors
    delay(2000);

    tft.fillScreen(TFT_RED);
    delay(500);

    tft.fillScreen(TFT_GREEN);
    delay(500);

    tft.fillScreen(TFT_BLUE);
    delay(500);

    tft.fillScreen(TFT_BLACK);

    // Redraw text
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(2);
    tft.setCursor(40, 100);
    tft.println("ESP32-2432S028R");
    tft.setCursor(60, 130);
    tft.setTextColor(TFT_GREEN);
    tft.println("Display Test OK!");
}
