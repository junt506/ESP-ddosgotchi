/*
 * Attack Detector - DDoS Detection Algorithm
 *
 * Ported from desktop DDoS Gotchi Python implementation
 * Multi-method attack detection with confidence scoring
 */

#ifndef ATTACK_DETECTOR_H
#define ATTACK_DETECTOR_H

#include <Arduino.h>
#include "config.h"
#include "network_monitor.h"

// ============================================================================
// Attack Detection Result Structure
// ============================================================================

struct AttackResult {
    AttackState state;          // Current attack state
    AttackType attackType;      // Specific attack type detected
    uint8_t confidence;         // Confidence percentage (0-100)
    float anomalyScore;         // Anomaly score (0-100)
    bool isUnderAttack;         // Simple boolean flag

    AttackResult() {
        state = STATE_HAPPY;
        attackType = ATTACK_NONE;
        confidence = 0;
        anomalyScore = 0.0;
        isUnderAttack = false;
    }
};

// ============================================================================
// Attack Detector Class
// ============================================================================

class AttackDetector {
public:
    AttackDetector();

    void begin();
    AttackResult analyze(NetworkStats& stats);

private:
    // Baseline values for anomaly detection
    float baselineLatency;
    float baselinePacketLoss;
    float baselinePacketRate;
    bool baselineEstablished;

    // Detection methods
    AttackState detectStateByThresholds(NetworkStats& stats);
    AttackType classifyAttackType(NetworkStats& stats);
    uint8_t calculateConfidence(NetworkStats& stats, AttackState state);
    float calculateAnomalyScore(NetworkStats& stats);

    // Helper functions
    void updateBaseline(NetworkStats& stats);
    bool isAnomalous(NetworkStats& stats);
};

#endif // ATTACK_DETECTOR_H
