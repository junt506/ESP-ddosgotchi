/*
 * Attack Detector Implementation
 * Ported from backend/core/attack_detector.py
 */

#include "attack_detector.h"

// ============================================================================
// Constructor
// ============================================================================

AttackDetector::AttackDetector() {
    baselineLatency = 0.0;
    baselinePacketLoss = 0.0;
    baselinePacketRate = 0.0;
    baselineEstablished = false;
}

// ============================================================================
// Initialization
// ============================================================================

void AttackDetector::begin() {
    Serial.println("[DETECTOR] Initializing attack detector...");
    Serial.println("[DETECTOR] Learning baseline (30 samples)...");
}

// ============================================================================
// Main Analysis Function
// ============================================================================

AttackResult AttackDetector::analyze(NetworkStats& stats) {
    AttackResult result;

    // Update baseline during learning phase
    if (!baselineEstablished) {
        updateBaseline(stats);
    }

    // Detect attack state using thresholds
    result.state = detectStateByThresholds(stats);

    // Classify specific attack type
    result.attackType = classifyAttackType(stats);

    // Calculate confidence score
    result.confidence = calculateConfidence(stats, result.state);

    // Calculate anomaly score
    result.anomalyScore = calculateAnomalyScore(stats);

    // Set attack flag
    result.isUnderAttack = (result.state == STATE_UNDER_ATTACK ||
                           result.state == STATE_STRESSED);

    return result;
}

// ============================================================================
// Threshold-Based State Detection
// (Ported from attack_detector.py lines 54-83)
// ============================================================================

AttackState AttackDetector::detectStateByThresholds(NetworkStats& stats) {
    // STRESSED: Severe degradation
    if (stats.latency > LATENCY_STRESSED || stats.packetLoss > PACKET_LOSS_STRESSED) {
        return STATE_STRESSED;
    }

    // UNDER_ATTACK: Significant degradation
    if (stats.latency > LATENCY_ATTACK || stats.packetLoss > PACKET_LOSS_ATTACK) {
        return STATE_UNDER_ATTACK;
    }

    // ALERT: Warning threshold
    if (stats.latency > LATENCY_WARNING || stats.packetLoss > PACKET_LOSS_WARNING) {
        return STATE_ALERT;
    }

    // HAPPY: Normal operation
    return STATE_HAPPY;
}

// ============================================================================
// Attack Type Classification
// (Ported from attack_detector.py lines 85-98)
// ============================================================================

AttackType AttackDetector::classifyAttackType(NetworkStats& stats) {
    // ICMP Flood: Very high packet loss
    if (stats.packetLoss > PACKET_LOSS_STRESSED) {
        return ATTACK_ICMP_FLOOD;
    }

    // UDP Flood: High packet loss + high latency
    if (stats.packetLoss > PACKET_LOSS_ATTACK && stats.latency > LATENCY_ATTACK) {
        return ATTACK_UDP_FLOOD;
    }

    // SYN Flood: Very high latency but lower packet loss
    if (stats.latency > LATENCY_STRESSED && stats.packetLoss < PACKET_LOSS_WARNING) {
        return ATTACK_SYN_FLOOD;
    }

    // Mixed DDoS: Moderate latency + moderate packet loss
    if (stats.latency > 100 && stats.packetLoss > PACKET_LOSS_WARNING) {
        return ATTACK_MIXED;
    }

    // Volumetric: High packet rate (above baseline)
    if (baselineEstablished &&
        stats.packetRate > (baselinePacketRate * ANOMALY_MULTIPLIER)) {
        return ATTACK_VOLUMETRIC;
    }

    // Slow DDoS: Elevated latency
    if (stats.latency > LATENCY_WARNING) {
        return ATTACK_SLOW;
    }

    return ATTACK_NONE;
}

// ============================================================================
// Confidence Calculation
// (Ported from attack_detector.py lines 139-157)
// ============================================================================

uint8_t AttackDetector::calculateConfidence(NetworkStats& stats, AttackState state) {
    uint8_t confidence = 0;

    // Latency-based confidence
    if (stats.latency > LATENCY_STRESSED) {
        confidence += 60;
    } else if (stats.latency > LATENCY_ATTACK) {
        confidence += 40;
    } else if (stats.latency > LATENCY_WARNING) {
        confidence += 20;
    } else if (stats.latency < LATENCY_HAPPY) {
        confidence += 10;
    }

    // Packet loss-based confidence
    if (stats.packetLoss > PACKET_LOSS_STRESSED) {
        confidence += 60;
    } else if (stats.packetLoss > PACKET_LOSS_ATTACK) {
        confidence += 40;
    } else if (stats.packetLoss > PACKET_LOSS_WARNING) {
        confidence += 25;
    } else if (stats.packetLoss < PACKET_LOSS_HAPPY) {
        confidence += 15;
    }

    // Anomaly-based confidence boost
    if (isAnomalous(stats)) {
        confidence += 20;
    }

    // Cap at 100%
    if (confidence > 100) {
        confidence = 100;
    }

    return confidence;
}

// ============================================================================
// Anomaly Score Calculation
// (Ported from attack_detector.py lines 100-137)
// ============================================================================

float AttackDetector::calculateAnomalyScore(NetworkStats& stats) {
    if (!baselineEstablished) {
        return 0.0;
    }

    float score = 0.0;

    // Latency deviation
    if (baselineLatency > 0) {
        float latencyDeviation = abs(stats.latency - baselineLatency) / baselineLatency;
        score += latencyDeviation * 40.0; // Weight: 40%
    }

    // Packet loss deviation
    if (baselinePacketLoss > 0) {
        float lossDeviation = abs(stats.packetLoss - baselinePacketLoss) / baselinePacketLoss;
        score += lossDeviation * 30.0; // Weight: 30%
    } else if (stats.packetLoss > 0) {
        score += stats.packetLoss; // Direct contribution if baseline is zero
    }

    // Packet rate deviation
    if (baselinePacketRate > 0) {
        float rateDeviation = abs(stats.packetRate - baselinePacketRate) / baselinePacketRate;
        score += rateDeviation * 30.0; // Weight: 30%
    }

    // Cap at 100
    if (score > 100.0) {
        score = 100.0;
    }

    return score;
}

// ============================================================================
// Baseline Update (Learning Phase)
// ============================================================================

void AttackDetector::updateBaseline(NetworkStats& stats) {
    // Only update if we have enough history
    if (stats.historyCount < BASELINE_LEARNING_SAMPLES) {
        return;
    }

    // Calculate average from history
    float sumLatency = 0.0;
    float sumLoss = 0.0;
    float sumRate = 0.0;

    for (int i = 0; i < stats.historyCount; i++) {
        sumLatency += stats.latencyHistory[i];
        sumLoss += stats.packetLossHistory[i];
        sumRate += stats.packetRateHistory[i];
    }

    baselineLatency = sumLatency / stats.historyCount;
    baselinePacketLoss = sumLoss / stats.historyCount;
    baselinePacketRate = sumRate / stats.historyCount;

    baselineEstablished = true;

    Serial.println("\n[DETECTOR] ✓ Baseline established:");
    Serial.print("           Latency: ");
    Serial.print(baselineLatency, 2);
    Serial.println(" ms");
    Serial.print("           Packet Loss: ");
    Serial.print(baselinePacketLoss, 2);
    Serial.println("%");
    Serial.print("           Packet Rate: ");
    Serial.print(baselinePacketRate, 1);
    Serial.println(" pps\n");
}

// ============================================================================
// Check if Current Stats are Anomalous
// ============================================================================

bool AttackDetector::isAnomalous(NetworkStats& stats) {
    if (!baselineEstablished) {
        return false;
    }

    // Check if any metric exceeds anomaly threshold
    bool latencyAnomaly = (stats.latency > baselineLatency * ANOMALY_MULTIPLIER);
    bool lossAnomaly = (stats.packetLoss > baselinePacketLoss * ANOMALY_MULTIPLIER);
    bool rateAnomaly = (stats.packetRate > baselinePacketRate * ANOMALY_MULTIPLIER);

    return (latencyAnomaly || lossAnomaly || rateAnomaly);
}
