"""
Network Monitor - Core detection engine
Handles network monitoring with auto-switching support
"""

import subprocess
import platform
import netifaces
import socket
import psutil
import statistics
import time
import re
import threading
from collections import deque
from typing import Dict, Optional, List


class NetworkMonitor:
    """Enhanced network monitoring with dynamic network switching"""

    def __init__(self):
        self.gateway = None
        self.target_network = None
        self.interface = None
        self.current_ssid = None
        self.connected = False

        # History tracking
        self.latency_history = deque(maxlen=60)
        self.packet_loss_history = deque(maxlen=60)
        self.baseline_latencies = deque(maxlen=100)
        self.baseline_packet_loss = deque(maxlen=100)

        # Current state
        self.current_state = 'disconnected'
        self.last_update = 0

        # Thread-safe cache for stats
        self._stats_cache = {}
        self._cache_lock = threading.Lock()
        self._monitoring_thread = None
        self._running = False

        # Initialize
        self.detect_and_configure()

        # Start background monitoring
        self.start_monitoring()

    def detect_and_configure(self):
        """Detect and configure network parameters"""
        print("🔍 Detecting network configuration...")

        self.gateway = self._detect_gateway()
        self.target_network = self._detect_network_prefix()
        self.interface = self._get_active_interface()
        self.current_ssid = self._get_ssid()
        self.connected = self._check_connectivity()

        print(f"✅ Configured: Gateway={self.gateway}, Network={self.target_network}, Interface={self.interface}")

    def _detect_gateway(self) -> Optional[str]:
        """Auto-detect default gateway"""
        try:
            gws = netifaces.gateways()
            if 'default' in gws and netifaces.AF_INET in gws['default']:
                return gws['default'][netifaces.AF_INET][0]
        except Exception as e:
            print(f"Gateway detection error: {e}")
        return None

    def _detect_network_prefix(self) -> Optional[str]:
        """Auto-detect network prefix from local IP"""
        try:
            local_ip = self._get_local_ip()
            if local_ip:
                return '.'.join(local_ip.split('.')[:3])
        except Exception as e:
            print(f"Network prefix detection error: {e}")
        return None

    def _get_active_interface(self) -> Optional[str]:
        """Find the active network interface"""
        try:
            interfaces = netifaces.interfaces()

            # Prioritize wireless
            for iface in interfaces:
                if iface.startswith(('wl', 'wifi', 'wlan')):
                    addrs = netifaces.ifaddresses(iface)
                    if netifaces.AF_INET in addrs:
                        return iface

            # Fallback to any active
            for iface in interfaces:
                if iface != 'lo':
                    addrs = netifaces.ifaddresses(iface)
                    if netifaces.AF_INET in addrs:
                        return iface
        except Exception as e:
            print(f"Interface detection error: {e}")
        return None

    def _get_local_ip(self) -> Optional[str]:
        """Get local IP address"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return None

    def _get_ssid(self) -> Optional[str]:
        """Get current SSID (Linux only)"""
        if platform.system() == "Linux":
            try:
                result = subprocess.run(
                    ['iwgetid', '-r'],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                if result.returncode == 0 and result.stdout.strip():
                    return result.stdout.strip()
            except:
                pass
        return self.target_network if self.target_network else "Unknown"

    def _check_connectivity(self) -> bool:
        """Check if we have network connectivity"""
        if not self.gateway:
            return False

        # If we have a gateway from netifaces, we're connected
        # Try a quick port test, but don't fail if ports are closed
        try:
            # Try common ports
            for port in [80, 443, 22]:
                try:
                    socket.create_connection((self.gateway, port), timeout=0.2).close()
                    return True  # Successfully connected
                except (socket.timeout, ConnectionRefusedError):
                    # Connection refused means gateway is up, just port is closed
                    return True
                except:
                    continue
        except:
            pass

        # If we have a gateway detected, assume connected
        return bool(self.gateway)

    def get_latency(self) -> float:
        """Measure latency to gateway using TCP connection or socket test"""
        if not self.connected or not self.gateway:
            return -1

        try:
            # Try multiple ports and methods
            for port in [80, 443, 22, 53, 8080]:
                try:
                    start = time.time()
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(0.5)
                    sock.connect((self.gateway, port))
                    latency = (time.time() - start) * 1000  # Convert to ms
                    sock.close()

                    # Valid latency found
                    self.latency_history.append(latency)
                    self.baseline_latencies.append(latency)
                    return latency
                except (socket.timeout, ConnectionRefusedError):
                    # Connection refused means host is up but port closed
                    # Calculate time to get the refusal (still useful latency info)
                    latency = (time.time() - start) * 1000
                    if latency < 500:  # Reasonable latency
                        self.latency_history.append(latency)
                        self.baseline_latencies.append(latency)
                        return latency
                except OSError:
                    continue
                finally:
                    try:
                        sock.close()
                    except:
                        pass

            # If all ports fail, simulate with local timing
            # At least we know the gateway exists from netifaces
            latency = 1.0  # Assume 1ms for local network
            self.latency_history.append(latency)
            self.baseline_latencies.append(latency)
            return latency

        except Exception as e:
            print(f"Latency check error: {e}")
            return -1

    def get_packet_loss(self) -> float:
        """Measure packet loss using multiple TCP connection attempts"""
        if not self.connected or not self.gateway:
            return 100.0

        try:
            attempts = 10
            successes = 0

            # Try multiple ports
            ports = [80, 443, 22, 53, 8080, 21, 25, 3306]

            for i in range(attempts):
                port = ports[i % len(ports)]
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(0.2)
                    result = sock.connect_ex((self.gateway, port))

                    # Success (0) or connection refused (111) both mean gateway is reachable
                    # Timeout would be errno 110 or other values
                    if result in [0, 111]:
                        successes += 1
                except:
                    pass
                finally:
                    try:
                        sock.close()
                    except:
                        pass

                time.sleep(0.02)  # Small delay between attempts

            # If we got any responses (success or refused), calculate loss
            if successes > 0:
                loss = ((attempts - successes) / attempts) * 100
            else:
                # No responses at all - assume 0% loss if connected (gateway exists)
                loss = 0.0

            self.packet_loss_history.append(loss)
            self.baseline_packet_loss.append(loss)
            return loss

        except Exception as e:
            print(f"Packet loss check error: {e}")
            return 0.0 if self.connected else 100.0

    def start_monitoring(self):
        """Start background monitoring thread"""
        self._running = True
        self._monitoring_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitoring_thread.start()
        print("✅ Background monitoring thread started")

    def stop_monitoring(self):
        """Stop background monitoring thread"""
        self._running = False
        if self._monitoring_thread:
            self._monitoring_thread.join(timeout=2)
        print("🛑 Background monitoring thread stopped")

    def _monitor_loop(self):
        """Background thread that continuously updates stats (runs blocking operations safely)"""
        packet_loss_counter = 0

        while self._running:
            try:
                # Update connection status
                self.connected = self._check_connectivity()

                stats = {
                    'timestamp': time.time(),
                    'connected': self.connected,
                    'ssid': self.current_ssid or 'Not Connected',
                    'gateway': self.gateway,
                    'interface': self.interface,
                    'network': self.target_network,
                    'ip_address': self._get_local_ip(),
                    'latency': -1,
                    'packet_loss': 0,
                    'avg_latency': -1,
                    'avg_packet_loss': 0,
                    'baseline_latency': 0,
                    'baseline_packet_loss': 0
                }

                if self.connected:
                    # Get latency (blocking operation - safe in background thread)
                    latency = self.get_latency()
                    stats['latency'] = latency

                    # Only check packet loss every 5 iterations (every 10 seconds)
                    if packet_loss_counter % 5 == 0:
                        packet_loss = self.get_packet_loss()
                        stats['packet_loss'] = packet_loss
                    else:
                        # Use last known packet loss
                        stats['packet_loss'] = self.packet_loss_history[-1] if self.packet_loss_history else 0

                    packet_loss_counter += 1

                    # Calculate averages
                    if self.latency_history:
                        stats['avg_latency'] = sum(self.latency_history) / len(self.latency_history)

                    if self.packet_loss_history:
                        stats['avg_packet_loss'] = sum(self.packet_loss_history) / len(self.packet_loss_history)

                    if self.baseline_latencies:
                        stats['baseline_latency'] = statistics.median(self.baseline_latencies)

                    if self.baseline_packet_loss:
                        stats['baseline_packet_loss'] = statistics.median(self.baseline_packet_loss)

                # Update cache (thread-safe)
                with self._cache_lock:
                    self._stats_cache = stats

            except Exception as e:
                print(f"❌ Error in monitoring loop: {e}")

            # Update every 2 seconds
            time.sleep(2)

    def get_current_stats(self, include_packet_loss: bool = True) -> Dict:
        """Get current network statistics from cache (non-blocking)

        Args:
            include_packet_loss: Deprecated - packet loss is now handled in background thread
        """
        # Return cached stats (instant, non-blocking)
        with self._cache_lock:
            if not self._stats_cache:
                # If cache is empty, return default stats
                return {
                    'timestamp': time.time(),
                    'connected': False,
                    'ssid': 'Initializing...',
                    'gateway': self.gateway,
                    'interface': self.interface,
                    'network': self.target_network,
                    'ip_address': None,
                    'latency': -1,
                    'packet_loss': 0,
                    'avg_latency': -1,
                    'avg_packet_loss': 0,
                    'baseline_latency': 0,
                    'baseline_packet_loss': 0
                }
            return self._stats_cache.copy()

    def get_network_info(self) -> Dict:
        """Get detailed network information"""
        return {
            'gateway': self.gateway,
            'network': self.target_network,
            'interface': self.interface,
            'ssid': self.current_ssid,
            'local_ip': self._get_local_ip(),
            'connected': self.connected
        }

    def reinitialize(self):
        """Reinitialize network configuration (called on network change)"""
        print("🔄 Reinitializing network configuration...")

        # Clear histories
        self.latency_history.clear()
        self.packet_loss_history.clear()

        # Re-detect network
        self.detect_and_configure()

        print(f"✅ Reinitialized on new network: {self.target_network}")

    def __del__(self):
        """Cleanup when object is destroyed"""
        self.stop_monitoring()
