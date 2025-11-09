#!/usr/bin/env python3
"""
DDoS Gotchi - Traffic Simulator
Generates artificial network traffic to test attack detection
"""

import socket
import threading
import time
import sys

def create_connections(target, port, duration=30):
    """Create a single connection and keep it alive"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect((target, port))
        time.sleep(duration)
        sock.close()
    except Exception as e:
        pass  # Silently ignore connection errors

def simulate_traffic(intensity='medium'):
    """
    Simulate DDoS traffic with different intensity levels

    intensity options:
    - 'low': 20 connections (just above warning threshold)
    - 'medium': 50 connections (moderate attack)
    - 'high': 100 connections (full attack mode)
    - 'extreme': 200 connections (stress test)
    """

    intensities = {
        'low': 20,
        'medium': 50,
        'high': 100,
        'extreme': 200
    }

    num_connections = intensities.get(intensity, 50)

    print(f"\n{'='*60}")
    print(f"  DDoS Gotchi - Traffic Simulator")
    print(f"{'='*60}")
    print(f"\nIntensity Level: {intensity.upper()}")
    print(f"Connections: {num_connections}")
    print(f"Target: google.com:80")
    print(f"Duration: 30 seconds\n")
    print("Starting in 3 seconds... (Switch to DDoS Gotchi now!)")
    print("Press Ctrl+C to stop\n")

    time.sleep(3)

    threads = []

    try:
        for i in range(num_connections):
            thread = threading.Thread(
                target=create_connections,
                args=('google.com', 80, 30),
                daemon=True
            )
            thread.start()
            threads.append(thread)

            # Progress indicator
            if (i + 1) % 10 == 0:
                print(f"✓ Created {i + 1}/{num_connections} connections...")

            time.sleep(0.05)  # Small delay between connections

        print(f"\n🚀 All {num_connections} connections active!")
        print("⚡ Check DDoS Gotchi - it should be in ATTACK MODE now!")
        print("\nAttack effects you should see:")
        print("  🔴 Screen turns RED")
        print("  😡 Face changes to (╬ಠ益ಠ)")
        print("  🌀 3D blob spins faster and turns red")
        print("  🔔 Desktop notification")
        print("  🎵 Attack sound plays")
        print("\nConnections will auto-close in 30 seconds...")

        # Wait for connections to complete
        for thread in threads:
            thread.join()

        print("\n✅ Simulation complete - attack should end now!\n")

    except KeyboardInterrupt:
        print("\n\n⚠️  Simulation stopped by user")
        print("Connections will close automatically...\n")

if __name__ == "__main__":
    # Check command line arguments
    if len(sys.argv) > 1:
        intensity = sys.argv[1].lower()
        if intensity not in ['low', 'medium', 'high', 'extreme']:
            print("Usage: python3 test_attack.py [low|medium|high|extreme]")
            print("Default: medium")
            sys.exit(1)
    else:
        intensity = 'medium'

    simulate_traffic(intensity)
