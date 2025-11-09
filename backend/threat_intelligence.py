"""
Threat Intelligence Module for DDoSGotchi
Integrates with multiple free threat intelligence APIs to identify malicious IPs
"""

import asyncio
import aiohttp
import time
from typing import Dict, Optional
from datetime import datetime, timedelta
import ipaddress


class ThreatIntelligence:
    def __init__(self, abuseipdb_key: Optional[str] = None, enable_greynoise: bool = False):
        self.abuseipdb_key = abuseipdb_key
        self.enable_greynoise = enable_greynoise
        self.cache = {}  # IP -> threat data cache
        self.cache_ttl = 3600  # 1 hour cache
        self.session = None

        # Rate limiting
        self.last_abuseipdb_check = 0
        self.abuseipdb_delay = 1.0  # 1 second between checks (free tier: 1000/day)
        self.last_greynoise_check = 0
        self.greynoise_delay = 2.0  # 2 seconds between checks (free tier has stricter limits)

        # Statistics
        self.total_checks = 0
        self.cache_hits = 0
        self.malicious_ips_found = set()

    async def init_session(self):
        """Initialize aiohttp session"""
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def close(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()

    def is_private_ip(self, ip: str) -> bool:
        """Check if IP is private/local"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local
        except ValueError:
            return False

    async def check_ip(self, ip: str) -> Dict:
        """
        Check an IP against threat intelligence sources
        Returns combined threat data
        """
        self.total_checks += 1

        # Skip private IPs
        if self.is_private_ip(ip):
            return {
                'ip': ip,
                'is_threat': False,
                'threat_level': 'benign',
                'confidence': 0,
                'sources': [],
                'details': 'Private/Local IP',
                'cached': False
            }

        # Check cache
        if ip in self.cache:
            cache_entry = self.cache[ip]
            if time.time() - cache_entry['timestamp'] < self.cache_ttl:
                self.cache_hits += 1
                cache_entry['cached'] = True
                return cache_entry

        await self.init_session()

        # Run checks in parallel
        tasks = []

        # Only check GreyNoise if explicitly enabled
        if self.enable_greynoise:
            tasks.append(self.check_greynoise(ip))

        # Only check AbuseIPDB if API key is provided
        if self.abuseipdb_key:
            tasks.append(self.check_abuseipdb(ip))

        # If no sources enabled, return benign
        if not tasks:
            return {
                'ip': ip,
                'is_threat': False,
                'threat_level': 'benign',
                'confidence': 0,
                'sources': [],
                'details': 'No threat intelligence sources configured',
                'cached': False
            }

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Combine results
        threat_data = self.combine_results(ip, results)

        # Cache the result
        threat_data['timestamp'] = time.time()
        threat_data['cached'] = False
        self.cache[ip] = threat_data

        # Track malicious IPs
        if threat_data['is_threat']:
            self.malicious_ips_found.add(ip)

        return threat_data

    async def check_greynoise(self, ip: str) -> Dict:
        """
        Check IP against GreyNoise Community API (free, no key required)
        Identifies internet scanners and malicious actors
        """
        try:
            # Rate limiting
            elapsed = time.time() - self.last_greynoise_check
            if elapsed < self.greynoise_delay:
                await asyncio.sleep(self.greynoise_delay - elapsed)

            url = f"https://api.greynoise.io/v3/community/{ip}"
            headers = {'Accept': 'application/json'}

            async with self.session.get(url, headers=headers, timeout=5) as response:
                self.last_greynoise_check = time.time()
                if response.status == 200:
                    data = await response.json()

                    # GreyNoise classifications:
                    # - noise: true = Known internet scanner
                    # - riot: true = Common business service (benign)
                    # - classification: malicious/benign/unknown

                    is_noise = data.get('noise', False)
                    classification = data.get('classification', 'unknown')
                    name = data.get('name', 'Unknown')

                    return {
                        'source': 'greynoise',
                        'is_threat': classification == 'malicious',
                        'is_scanner': is_noise,
                        'classification': classification,
                        'name': name,
                        'message': data.get('message', '')
                    }
                else:
                    return {'source': 'greynoise', 'error': f'HTTP {response.status}'}
        except Exception as e:
            return {'source': 'greynoise', 'error': str(e)}

    async def check_abuseipdb(self, ip: str) -> Dict:
        """
        Check IP against AbuseIPDB (requires API key)
        Free tier: 1000 checks/day
        """
        if not self.abuseipdb_key:
            return {'source': 'abuseipdb', 'error': 'No API key'}

        try:
            # Rate limiting
            elapsed = time.time() - self.last_abuseipdb_check
            if elapsed < self.abuseipdb_delay:
                await asyncio.sleep(self.abuseipdb_delay - elapsed)

            url = "https://api.abuseipdb.com/api/v2/check"
            headers = {
                'Key': self.abuseipdb_key,
                'Accept': 'application/json'
            }
            params = {
                'ipAddress': ip,
                'maxAgeInDays': '90'
            }

            async with self.session.get(url, headers=headers, params=params, timeout=10) as response:
                self.last_abuseipdb_check = time.time()

                if response.status == 200:
                    data = await response.json()
                    ip_data = data.get('data', {})

                    abuse_score = ip_data.get('abuseConfidenceScore', 0)
                    total_reports = ip_data.get('totalReports', 0)
                    is_whitelisted = ip_data.get('isWhitelisted', False)

                    return {
                        'source': 'abuseipdb',
                        'is_threat': abuse_score > 25 and not is_whitelisted,
                        'abuse_score': abuse_score,
                        'total_reports': total_reports,
                        'is_whitelisted': is_whitelisted,
                        'country_code': ip_data.get('countryCode', ''),
                        'usage_type': ip_data.get('usageType', ''),
                        'isp': ip_data.get('isp', '')
                    }
                else:
                    return {'source': 'abuseipdb', 'error': f'HTTP {response.status}'}
        except Exception as e:
            return {'source': 'abuseipdb', 'error': str(e)}

    def combine_results(self, ip: str, results: list) -> Dict:
        """Combine results from multiple threat intelligence sources"""
        threat_data = {
            'ip': ip,
            'is_threat': False,
            'threat_level': 'benign',  # benign, suspicious, malicious
            'confidence': 0,
            'sources': [],
            'details': {},
            'tags': [],
            'errors': []  # Track errors for debugging
        }

        threat_count = 0
        total_confidence = 0

        for result in results:
            if isinstance(result, Exception):
                error_msg = f"Exception: {str(result)}"
                threat_data['errors'].append(error_msg)
                # Errors tracked in threat_data but not printed to reduce console spam
                continue

            if 'error' in result:
                source = result.get('source', 'unknown')
                error_msg = f"{source}: {result['error']}"
                threat_data['errors'].append(error_msg)
                # Errors tracked in threat_data but not printed to reduce console spam
                continue

            source = result.get('source', 'unknown')
            threat_data['sources'].append(source)
            threat_data['details'][source] = result

            # GreyNoise
            if source == 'greynoise':
                if result.get('is_threat'):
                    threat_count += 1
                    total_confidence += 75
                    threat_data['tags'].append(f"Malicious ({result.get('classification')})")
                elif result.get('is_scanner'):
                    threat_data['tags'].append(f"Scanner: {result.get('name')}")

            # AbuseIPDB
            if source == 'abuseipdb':
                abuse_score = result.get('abuse_score', 0)
                if result.get('is_threat'):
                    threat_count += 1
                    total_confidence += abuse_score
                    threat_data['tags'].append(f"Abuse Score: {abuse_score}%")
                if result.get('total_reports', 0) > 0:
                    threat_data['tags'].append(f"{result.get('total_reports')} reports")

        # Determine threat level
        if threat_count > 0:
            threat_data['is_threat'] = True
            avg_confidence = total_confidence / max(len(threat_data['sources']), 1)
            threat_data['confidence'] = min(100, int(avg_confidence))

            if avg_confidence >= 75:
                threat_data['threat_level'] = 'malicious'
            else:
                threat_data['threat_level'] = 'suspicious'

        return threat_data

    def get_statistics(self) -> Dict:
        """Get threat intelligence statistics"""
        cache_hit_rate = (self.cache_hits / max(self.total_checks, 1)) * 100

        return {
            'total_checks': self.total_checks,
            'cache_hits': self.cache_hits,
            'cache_hit_rate': round(cache_hit_rate, 1),
            'malicious_ips_count': len(self.malicious_ips_found),
            'cached_ips': len(self.cache)
        }
