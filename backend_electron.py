#!/usr/bin/env python3
"""
DDoS Gotchi v3.0 - Backend Server for Electron HUD
Real-time network monitoring with WebSocket communication
"""

import asyncio
import json
import psutil
import netifaces
import time
import os
from collections import defaultdict, deque
from datetime import datetime
import websockets
import subprocess
import re
from backend.threat_intelligence import ThreatIntelligence

class DDoSGotchiBackend:
    def __init__(self):
        # Network monitoring data
        self.connection_counts = defaultdict(int)
        self.recent_connections = []
        self.seen_ips = set()
        self.last_refresh = time.time()

        # Performance metrics
        self.latency_data = deque(maxlen=100)
        self.packet_loss_data = deque(maxlen=100)

        # Attack detection
        self.attack_threshold = 50  # connections per IP
        self.total_connections_threshold = 100

        # Timing
        self.last_update = time.time()
        self.connection_check_interval = 1.0
        self.refresh_interval = 15.0

        # Threat Intelligence (optional API keys from environment)
        abuseipdb_key = os.environ.get('ABUSEIPDB_API_KEY')
        enable_greynoise = os.environ.get('ENABLE_GREYNOISE', '').lower() in ('true', '1', 'yes')
        self.threat_intel = ThreatIntelligence(
            abuseipdb_key=abuseipdb_key,
            enable_greynoise=enable_greynoise
        )
        self.ip_threats = {}  # IP -> threat data
        self.threat_check_queue = asyncio.Queue()
        self.last_threat_check = time.time()

    def get_local_ip(self):
        """Get the local IP address"""
        try:
            interfaces = netifaces.interfaces()
            for interface in interfaces:
                if interface.startswith(('lo', 'docker', 'veth')):
                    continue

                addrs = netifaces.ifaddresses(interface)
                if netifaces.AF_INET in addrs:
                    for addr_info in addrs[netifaces.AF_INET]:
                        ip = addr_info.get('addr')
                        if ip and not ip.startswith('127.'):
                            return ip
        except Exception as e:
            print(f"Error getting local IP: {e}")

        return "127.0.0.1"

    def get_gateway_ip(self):
        """Get the default gateway IP address"""
        try:
            gateways = netifaces.gateways()
            if 'default' in gateways and netifaces.AF_INET in gateways['default']:
                return gateways['default'][netifaces.AF_INET][0]
        except Exception as e:
            print(f"Error getting gateway IP: {e}")

        return "0.0.0.0"

    def get_network_address(self):
        """Get the network address (IP/CIDR)"""
        try:
            interfaces = netifaces.interfaces()
            for interface in interfaces:
                if interface.startswith(('lo', 'docker', 'veth')):
                    continue

                addrs = netifaces.ifaddresses(interface)
                if netifaces.AF_INET in addrs:
                    for addr_info in addrs[netifaces.AF_INET]:
                        ip = addr_info.get('addr')
                        netmask = addr_info.get('netmask')

                        if ip and netmask and not ip.startswith('127.'):
                            # Calculate CIDR notation
                            cidr = sum([bin(int(x)).count('1') for x in netmask.split('.')])

                            # Calculate network address
                            ip_parts = [int(x) for x in ip.split('.')]
                            mask_parts = [int(x) for x in netmask.split('.')]
                            network_parts = [str(ip_parts[i] & mask_parts[i]) for i in range(4)]
                            network = '.'.join(network_parts)

                            return f"{network}/{cidr}"
        except Exception as e:
            print(f"Error getting network address: {e}")

        return "0.0.0.0/24"

    def get_network_info(self):
        """Get complete network information"""
        return {
            'local_ip': self.get_local_ip(),
            'gateway': self.get_gateway_ip(),
            'network': self.get_network_address()
        }

    def measure_latency(self):
        """Measure network latency using ping"""
        try:
            result = subprocess.run(
                ['ping', '-c', '1', '-W', '1', '8.8.8.8'],
                capture_output=True,
                text=True,
                timeout=2
            )

            if result.returncode == 0:
                match = re.search(r'time=(\d+\.?\d*)', result.stdout)
                if match:
                    return float(match.group(1))
        except Exception as e:
            print(f"Error measuring latency: {e}")

        return 0.0

    def measure_packet_loss(self):
        """Measure packet loss using ping"""
        try:
            result = subprocess.run(
                ['ping', '-c', '10', '-W', '1', '8.8.8.8'],
                capture_output=True,
                text=True,
                timeout=12
            )

            if result.returncode == 0:
                match = re.search(r'(\d+)% packet loss', result.stdout)
                if match:
                    return float(match.group(1))
        except Exception as e:
            print(f"Error measuring packet loss: {e}")

        return 0.0

    def get_network_connections(self):
        """Get all active network connections with protocol information"""
        connections = []
        protocol_counts = {'TCP': 0, 'UDP': 0, 'ICMP': 0, 'OTHER': 0}

        try:
            import socket
            for conn in psutil.net_connections(kind='inet'):
                if conn.status == 'ESTABLISHED' and conn.raddr:
                    # Determine protocol type
                    protocol = 'OTHER'
                    if conn.type == socket.SOCK_STREAM:
                        protocol = 'TCP'
                        protocol_counts['TCP'] += 1
                    elif conn.type == socket.SOCK_DGRAM:
                        protocol = 'UDP'
                        protocol_counts['UDP'] += 1
                    elif conn.type == socket.SOCK_RAW:
                        protocol = 'ICMP'
                        protocol_counts['ICMP'] += 1
                    else:
                        protocol_counts['OTHER'] += 1

                    connections.append({
                        'local_ip': conn.laddr.ip if conn.laddr else '',
                        'local_port': conn.laddr.port if conn.laddr else 0,
                        'remote_ip': conn.raddr.ip if conn.raddr else '',
                        'remote_port': conn.raddr.port if conn.raddr else 0,
                        'status': conn.status,
                        'protocol': protocol
                    })
        except Exception as e:
            print(f"Error getting connections: {e}")

        return connections, protocol_counts

    def detect_attack(self, connections):
        """Detect potential DDoS attacks"""
        # Count connections per IP
        ip_counts = defaultdict(int)
        for conn in connections:
            remote_ip = conn['remote_ip']
            if remote_ip:
                ip_counts[remote_ip] += 1

        # Check for attack patterns
        attack_detected = False
        attack_ips = []

        # Single IP threshold
        for ip, count in ip_counts.items():
            if count >= self.attack_threshold:
                attack_detected = True
                attack_ips.append(ip)

        # Total connections threshold
        if len(connections) >= self.total_connections_threshold:
            attack_detected = True

        return {
            'attack_detected': attack_detected,
            'attack_ips': attack_ips,
            'ip_counts': dict(ip_counts)
        }

    async def check_threats(self, unique_ips):
        """Check unique IPs for threats (rate-limited, async)"""
        # Only check new IPs we haven't checked yet
        ips_to_check = [ip for ip in unique_ips if ip not in self.ip_threats]

        # Limit to 1 new check per iteration to respect API rate limits
        ips_to_check = ips_to_check[:1]

        if ips_to_check:
            # Check IPs sequentially to respect rate limits
            results = []
            for ip in ips_to_check:
                try:
                    result = await self.threat_intel.check_ip(ip)
                    results.append(result)
                except Exception as e:
                    results.append(e)

            # Store results and report only threats (benign IPs not logged to reduce spam)
            for ip, result in zip(ips_to_check, results):
                if isinstance(result, Exception):
                    continue  # Silently skip errors

                self.ip_threats[ip] = result

                # Only log threats - keep console clean
                if result.get('is_threat'):
                    threat_level = result.get('threat_level', 'unknown')
                    confidence = result.get('confidence', 0)
                    sources = ', '.join(result.get('sources', []))
                    tags = ', '.join(result.get('tags', []))
                    print(f"\n⚠️  THREAT DETECTED: {ip}")
                    print(f"   Level: {threat_level.upper()} | Confidence: {confidence}%")
                    print(f"   Sources: {sources}")
                    if tags:
                        print(f"   Tags: {tags}")
                    print()

        # Clean up old entries (keep cache fresh)
        if len(self.ip_threats) > 500:
            # Remove oldest 100 entries
            ips_to_remove = list(self.ip_threats.keys())[:100]
            for ip in ips_to_remove:
                del self.ip_threats[ip]

    async def monitor_network(self):
        """Main network monitoring loop"""
        while True:
            current_time = time.time()

            # Get network connections with protocol information
            connections, protocol_counts = self.get_network_connections()

            # Detect attacks
            attack_info = self.detect_attack(connections)

            # Get unique IPs
            unique_ips = list(set(c['remote_ip'] for c in connections if c['remote_ip']))

            # Check for threats (rate-limited, async)
            await self.check_threats(unique_ips)

            # Count malicious IPs
            malicious_ips = [ip for ip, threat_data in self.ip_threats.items()
                            if threat_data.get('is_threat', False) and ip in unique_ips]

            # Get new connections (not seen before)
            new_connections = []
            for conn in connections:
                remote_ip = conn['remote_ip']
                if remote_ip and remote_ip not in self.seen_ips:
                    self.seen_ips.add(remote_ip)
                    new_connections.append(conn)

            # Store recent connections for display
            if new_connections:
                self.recent_connections = new_connections[-15:]

            # Reset seen IPs periodically
            if current_time - self.last_refresh >= self.refresh_interval:
                self.seen_ips.clear()
                self.last_refresh = current_time

            # Measure latency and packet loss (every 10 seconds to avoid overhead)
            if current_time - self.last_update >= 10.0:
                latency = self.measure_latency()
                packet_loss = self.measure_packet_loss()

                self.latency_data.append(latency)
                self.packet_loss_data.append(packet_loss)
                self.last_update = current_time

            # Prepare data to send
            data = {
                'timestamp': datetime.now().isoformat(),
                'total_connections': len(connections),
                'unique_ips': len(unique_ips),
                'latency': self.latency_data[-1] if self.latency_data else 0,
                'packet_loss': self.packet_loss_data[-1] if self.packet_loss_data else 0,
                'attack_detected': attack_info['attack_detected'],
                'attack_ips': attack_info['attack_ips'],
                'threat_level': 'warning' if len(connections) > 20 else ('critical' if attack_info['attack_detected'] else 'normal'),
                'connections': connections,  # All active connections
                'recent_connections': self.recent_connections,
                'network_info': self.get_network_info(),
                'protocol_distribution': protocol_counts,
                'threats': {
                    'malicious_count': len(malicious_ips),
                    'malicious_ips': malicious_ips,
                    'ip_threat_data': self.ip_threats
                }
            }

            # Store for WebSocket broadcast
            self.current_data = data

            await asyncio.sleep(self.connection_check_interval)

    async def websocket_handler(self, websocket):
        """Handle WebSocket connections from Electron frontend"""
        print(f"✓ Client connected: {websocket.remote_address}")

        try:
            # Send initial data
            if hasattr(self, 'current_data'):
                await websocket.send(json.dumps(self.current_data))

            # Keep connection alive and send updates
            while True:
                if hasattr(self, 'current_data'):
                    await websocket.send(json.dumps(self.current_data))

                await asyncio.sleep(1.0)

        except websockets.exceptions.ConnectionClosed:
            print(f"✗ Client disconnected: {websocket.remote_address}")
        except Exception as e:
            print(f"WebSocket error: {e}")

    async def start_server(self):
        """Start the WebSocket server"""
        # Initialize threat intelligence session
        await self.threat_intel.init_session()

        try:
            # Start network monitoring in background
            asyncio.create_task(self.monitor_network())

            # Start WebSocket server
            print("🛡️  DDoS Gotchi Backend v3.0 - HUD Edition")
            print("=" * 60)
            print("WebSocket server starting on ws://localhost:8765")
            print("Waiting for Electron frontend to connect...")
            print("")
            print("🛡️  Threat Intelligence Status:")
            if self.threat_intel.enable_greynoise:
                print(f"   ✓ GreyNoise: Enabled (set via ENABLE_GREYNOISE)")
            else:
                print(f"   ℹ GreyNoise: Disabled (set ENABLE_GREYNOISE=true to enable)")
            if self.threat_intel.abuseipdb_key:
                print(f"   ✓ AbuseIPDB: Enabled (API key configured)")
            else:
                print(f"   ℹ AbuseIPDB: Disabled (set ABUSEIPDB_API_KEY to enable)")
            print("=" * 60)

            async with websockets.serve(self.websocket_handler, "localhost", 8765):
                await asyncio.Future()  # run forever
        finally:
            # Clean up threat intelligence session
            await self.threat_intel.close()
            print("\n✓ Backend shutdown complete")

if __name__ == "__main__":
    backend = DDoSGotchiBackend()
    try:
        asyncio.run(backend.start_server())
    except KeyboardInterrupt:
        print("\n✓ Shutting down gracefully...")
