/*
 * TFT_eSPI User_Setup.h for ESP32-2432S028R
 * (Cheap Yellow Display - CYD)
 *
 * INSTALLATION:
 * Copy this file to: Arduino/libraries/TFT_eSPI/User_Setup.h
 * (Replace the existing User_Setup.h)
 *
 * Hardware: ESP32-2432S028R
 * - Display: 2.8" ILI9341 320x240
 * - Touch: XPT2046 Resistive
 */

// ============================================================================
// Driver Selection
// ============================================================================
#define ILI9341_DRIVER      // 2.8" 320x240 TFT

// ============================================================================
// ESP32 Pin Configuration for ESP32-2432S028R
// ============================================================================

// TFT Display Pins
#define TFT_MISO 12
#define TFT_MOSI 13
#define TFT_SCLK 14
#define TFT_CS   15  // Chip select control pin
#define TFT_DC   2   // Data Command control pin
#define TFT_RST  -1  // Set to -1 if display RESET is connected to ESP32 RST pin
#define TFT_BL   21  // LED back-light control pin

// Touch Controller Pins (XPT2046)
#define TOUCH_CS 33

// ============================================================================
// Display Configuration
// ============================================================================

// Fonts
#define LOAD_GLCD   // Font 1. Original Adafruit 8 pixel font needs ~1820 bytes in FLASH
#define LOAD_FONT2  // Font 2. Small 16 pixel high font, needs ~3534 bytes in FLASH, 96 characters
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font, needs ~5848 bytes in FLASH, 96 characters
#define LOAD_FONT6  // Font 6. Large 48 pixel font, needs ~2666 bytes in FLASH, only characters 1234567890:-.apm
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font, needs ~2438 bytes in FLASH, only characters 1234567890:.
#define LOAD_FONT8  // Font 8. Large 75 pixel font needs ~3256 bytes in FLASH, only characters 1234567890:-.
#define LOAD_GFXFF  // FreeFonts. Include access to the 48 Adafruit_GFX free fonts FF1 to FF48 and custom fonts

#define SMOOTH_FONT // Enable anti-aliased fonts

// ============================================================================
// SPI Configuration
// ============================================================================

#define SPI_FREQUENCY  40000000  // 40MHz (maximum for ILI9341)
#define SPI_READ_FREQUENCY  20000000
#define SPI_TOUCH_FREQUENCY  2500000

// ============================================================================
// Optional Features
// ============================================================================

// Transactions are automatically enabled for ESP32
// #define SUPPORT_TRANSACTIONS
