# Threat Intelligence Integration

DDoSGotchi now includes powerful threat intelligence capabilities to identify malicious IPs connecting to your system.

## Features

- 🛡️ **Real-time threat detection** - Automatically checks IPs against threat databases
- 💀 **Malicious IP badges** - Visual indicators for known bad actors
- 📊 **Threat scoring** - Confidence levels from 0-100%
- 🌐 **Multiple sources** - AbuseIPDB (recommended) + GreyNoise (optional)
- 💾 **Smart caching** - Avoids rate limits and speeds up repeated checks
- 🔍 **Detailed threat info** - Click any IP to see full threat intelligence report

## Free Threat Intelligence Sources

### 1. AbuseIPDB (Recommended - Always Works)
- **Requires free API key**
- Community-driven malicious IP database
- Free tier: 1000 checks/day
- Abuse confidence scores
- **Reliable and actively maintained**

### 2. GreyNoise (Optional - Disabled by Default)
- **No API key required but has strict rate limits**
- Identifies internet scanners and malicious actors
- Free community API (limited requests)
- **Disabled by default** - set `ENABLE_GREYNOISE=true` to enable

## Setup

### Get AbuseIPDB API Key (Recommended)

1. Visit https://www.abuseipdb.com/
2. Create a free account
3. Go to your account page
4. Copy your API key

### Configure API Keys

**Linux/Mac:**
```bash
# AbuseIPDB (recommended)
export ABUSEIPDB_API_KEY="your_api_key_here"

# GreyNoise (optional - only if you want to enable it)
export ENABLE_GREYNOISE=true

# Run the app
./run-electron.sh
```

**Windows:**
```cmd
REM AbuseIPDB (recommended)
set ABUSEIPDB_API_KEY=your_api_key_here

REM GreyNoise (optional - only if you want to enable it)
set ENABLE_GREYNOISE=true

REM Run the app
run-electron.bat
```

**Or permanently:**
Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
```bash
export ABUSEIPDB_API_KEY="your_api_key_here"
# export ENABLE_GREYNOISE=true  # Uncomment to enable GreyNoise
```

## How It Works

1. **Detection**: Backend checks each unique IP against enabled threat sources
2. **Rate Limiting**: 1 new IP checked per second to respect API limits
3. **Caching**: Results cached for 1 hour to minimize API calls
4. **Sequential Checking**: IPs checked one at a time to avoid rate limit errors
5. **Display**: Malicious IPs shown with badges and threat scores

## Visual Indicators

### In Active Connections Panel:
- **💀 MALICIOUS (XX%)** - Known malicious IP (red badge)
- **⚠️ SUSPICIOUS (XX%)** - Suspicious activity (orange badge)
- **No badge** - Benign or unknown

### In Network Status:
- **Threats Detected: X** - Count of malicious IPs (red = threats, green = none)

### In Connection Details Modal:
- Full threat intelligence report
- Threat level, confidence score, sources
- Tags (abuse score, reports, scanner type)
- GreyNoise classification
- AbuseIPDB reports and scores

## Testing

Known malicious IPs for testing (these are real threat actor IPs):
- `185.220.101.1` - Known Tor exit node
- `45.142.212.61` - Known scanner
- `103.75.200.1` - Reported abuse

**Note**: Your normal connections will likely be benign. Malicious IPs are rare unless you're actually under attack or running a honeypot.

## Honeypot Use Case

DDoSGotchi is perfect for honeypot deployments:
- **Detection only** - No blocking, just analysis
- **Threat intelligence** - Identifies known bad actors
- **Visualization** - See attacks in real-time 3D
- **Data collection** - Track attack patterns and sources

## Privacy & Security

- Only public IPs are checked (private/local IPs skipped)
- No data is sent except the IP address
- All APIs use HTTPS
- No logging of benign traffic to external services

## Rate Limits

**GreyNoise Community API:**
- No official limit
- Respectful usage recommended

**AbuseIPDB Free Tier:**
- 1000 checks/day
- DDoSGotchi checks max 5 IPs/second
- Caching ensures we don't exceed limits

## Troubleshooting

**No threats detected:**
- Normal! Most connections are legitimate
- Check "Threats Detected" counter in Network Status
- Malicious IPs only appear during actual attacks

**API errors:**
- Check API key is correct
- Verify internet connection
- Check daily rate limit (1000/day for AbuseIPDB)

**Slow performance:**
- Threat checking is async and doesn't block UI
- Cache hits are instant
- Only new unique IPs trigger API calls

## Future Enhancements

Potential additions:
- More threat intel sources (VirusTotal, AlienVault OTX)
- IP reputation scoring
- Threat feed export
- Historical threat tracking
- Country-based risk scoring

## Credits

- **GreyNoise** - https://greynoise.io/
- **AbuseIPDB** - https://www.abuseipdb.com/
