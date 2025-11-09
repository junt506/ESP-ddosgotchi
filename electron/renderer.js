// ============================================================================
// DDOS GOTCHI v3.0 - Neural Nexus HUD Renderer
// ============================================================================

import { NeuralNexusVisualization } from './visualization.js';

// ============================================================================
// PWNAGOTCHI FACES & QUOTES
// ============================================================================

const FACES = {
    HAPPY: "(◕‿‿◕)",
    INTENSE: "(⌐■_■)",
    COOL: "(◕‿◕)✧",
    EXCITED: "ヽ(◕‿‿◕)ﾉ",
    ATTACK: "(╬ಠ益ಠ)",
    BORED: "(◡‿◡✿)",
};

const QUOTES_NORMAL = [
    "monitoring packets...",
    "sniffing networks...",
    "analyzing traffic...",
    "watching connections...",
    "all systems operational",
    "scanning for threats...",
    "neural network active",
    "defenses online",
];

const QUOTES_ATTACK = [
    "ATTACK DETECTED!",
    "network under siege!",
    "defensive mode activated",
    "repelling intruders!",
    "threat neutralization active",
];

// ============================================================================
// CONFIGURATION & SETTINGS
// ============================================================================

const DEFAULT_SETTINGS = {
    // Attack detection thresholds
    latencyWarning: 50,
    latencyAttack: 200,
    packetLossWarning: 5,
    packetLossAttack: 20,
    connectionWarning: 50,
    connectionAttack: 100,

    // UI preferences
    updateInterval: 1000, // ms
    soundAlerts: true,
    desktopNotifications: true,
    colorScheme: 'classic', // classic, cyberpunk, matrix

    // Performance
    maxDataPoints: 120,
    maxLogEntries: 100,
};

let settings = {...DEFAULT_SETTINGS};

// ============================================================================
// STATE VARIABLES
// ============================================================================

let ws = null;
let reconnectInterval = null;
let isAttackMode = false;
let visualization = null;
let lastNotificationTime = 0;
let attackStartTime = null;

// Graph data storage
let latencyHistory = [];
let packetLossHistory = [];
let timestampHistory = [];

// Historical data (last 24 hours)
let historicalData = [];
const maxHistoricalHours = 24;

// Connection tracking - refresh every 4 seconds
let connectionsByIP = new Map(); // Map<ip, {firstSeen, lastSeen, ports: Set, connCount, isLocal, bytes}>
let maxLogEntries = 50;
let connectionLogRefreshInterval = null;
let lastRefreshTime = 0;

// Protocol distribution tracking
let protocolData = {TCP: 0, UDP: 0, ICMP: 0, OTHER: 0};

// Suspicious ports list
const SUSPICIOUS_PORTS = new Set([
    21, 22, 23, 25, 53, 135, 137, 138, 139, 445, 1433, 1434, 3306, 3389, 5900, 8080
]);

// Sound alert context
let audioContext = null;
let lastAlertSound = 0;

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    console.log('DDoS Gotchi v3.0 - Neural Nexus Initializing...');

    // Request notification permission
    requestNotificationPermission();

    // Initialize audio context for sound alerts
    initAudioContext();

    // Load saved settings
    loadSettings();

    // Apply color scheme
    applyColorScheme(settings.colorScheme);

    // Generate protocol chart
    generateProtocolChart();

    // Initialize visualization immediately
    const centerDisplay = document.getElementById('center-display');
    visualization = new NeuralNexusVisualization(centerDisplay);
    console.log('✓ Neural Nexus visualization online');

    // Add settings panel
    createSettingsPanel();

    // Connect to backend
    connectWebSocket();

    // Start periodic updates
    setInterval(updateTime, 1000);
    setInterval(() => updateQuote(null, true), 5000);

    // Connection log refresh every 4 seconds
    connectionLogRefreshInterval = setInterval(refreshConnectionLog, 4000);

    // Historical data cleanup (every hour)
    setInterval(cleanupHistoricalData, 3600000);

    // Set initial mode
    document.body.classList.add('mode-normal');

    // Add keyboard shortcuts
    setupKeyboardShortcuts();

    console.log('Initialization complete');
}

// ============================================================================
// NOTIFICATIONS & ALERTS
// ============================================================================

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showDesktopNotification(title, body, urgent = false) {
    if (!settings.desktopNotifications) return;
    if ('Notification' in window && Notification.permission === 'granted') {
        const now = Date.now();
        // Rate limit: no more than 1 notification per 10 seconds
        if (now - lastNotificationTime < 10000) return;

        lastNotificationTime = now;

        const notification = new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="70" font-size="60">🛡️</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="70" font-size="60">⚠️</text></svg>',
            requireInteraction: urgent,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto-close after 5 seconds if not urgent
        if (!urgent) {
            setTimeout(() => notification.close(), 5000);
        }
    }
}

function playAlertSound(frequency = 800, duration = 100) {
    if (!settings.soundAlerts) return;

    const now = Date.now();
    // Rate limit: no more than 1 sound per second
    if (now - lastAlertSound < 1000) return;
    lastAlertSound = now;

    if (!audioContext) return;

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
        console.error('Audio error:', error);
    }
}

function initAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
        console.warn('Audio context not available:', error);
    }
}

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

function loadSettings() {
    try {
        const saved = localStorage.getItem('ddosGotchiSettings');
        if (saved) {
            settings = {...DEFAULT_SETTINGS, ...JSON.parse(saved)};
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

function saveSettings() {
    try {
        localStorage.setItem('ddosGotchiSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

function applyColorScheme(scheme) {
    document.body.classList.remove('theme-classic', 'theme-cyberpunk', 'theme-matrix');
    document.body.classList.add(`theme-${scheme}`);
}

// ============================================================================
// HISTORICAL DATA
// ============================================================================

function trackHistoricalData(data) {
    const now = new Date();
    historicalData.push({
        timestamp: now.getTime(),
        latency: data.latency || 0,
        packetLoss: data.packet_loss || 0,
        connections: data.total_connections || 0,
        attackDetected: data.attack_detected || false,
    });
}

function cleanupHistoricalData() {
    const cutoffTime = Date.now() - (maxHistoricalHours * 3600000);
    historicalData = historicalData.filter(entry => entry.timestamp > cutoffTime);
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + , for settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            toggleSettingsPanel();
        }
        // Ctrl/Cmd + Shift + C for color scheme cycling
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            cycleColorScheme();
        }
    });
}

function cycleColorScheme() {
    const schemes = ['classic', 'cyberpunk', 'matrix'];
    const currentIndex = schemes.indexOf(settings.colorScheme);
    const nextIndex = (currentIndex + 1) % schemes.length;
    settings.colorScheme = schemes[nextIndex];
    applyColorScheme(settings.colorScheme);
    saveSettings();
}

// ============================================================================
// SETTINGS PANEL UI
// ============================================================================

function createSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.className = 'settings-panel hidden';
    panel.innerHTML = `
        <div class="settings-content">
            <div class="settings-header">
                <h2>⚙️ Settings</h2>
                <button class="close-btn" onclick="toggleSettingsPanel()">×</button>
            </div>
            <div class="settings-body">
                <div class="settings-section">
                    <h3>Attack Detection Thresholds</h3>
                    <div class="setting-item">
                        <label>Latency Warning (ms):</label>
                        <input type="number" id="setting-latency-warning" value="${settings.latencyWarning}" min="10" max="500">
                    </div>
                    <div class="setting-item">
                        <label>Latency Attack (ms):</label>
                        <input type="number" id="setting-latency-attack" value="${settings.latencyAttack}" min="50" max="1000">
                    </div>
                    <div class="setting-item">
                        <label>Packet Loss Warning (%):</label>
                        <input type="number" id="setting-packet-warning" value="${settings.packetLossWarning}" min="1" max="20">
                    </div>
                    <div class="setting-item">
                        <label>Packet Loss Attack (%):</label>
                        <input type="number" id="setting-packet-attack" value="${settings.packetLossAttack}" min="5" max="50">
                    </div>
                    <div class="setting-item">
                        <label>Connection Warning:</label>
                        <input type="number" id="setting-conn-warning" value="${settings.connectionWarning}" min="10" max="200">
                    </div>
                    <div class="setting-item">
                        <label>Connection Attack:</label>
                        <input type="number" id="setting-conn-attack" value="${settings.connectionAttack}" min="50" max="500">
                    </div>
                </div>

                <div class="settings-section">
                    <h3>Alerts & Notifications</h3>
                    <div class="setting-item">
                        <label>Desktop Notifications:</label>
                        <input type="checkbox" id="setting-notifications" ${settings.desktopNotifications ? 'checked' : ''}>
                    </div>
                    <div class="setting-item">
                        <label>Sound Alerts:</label>
                        <input type="checkbox" id="setting-sound" ${settings.soundAlerts ? 'checked' : ''}>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>Appearance</h3>
                    <div class="setting-item">
                        <label>Color Scheme:</label>
                        <select id="setting-color-scheme">
                            <option value="classic" ${settings.colorScheme === 'classic' ? 'selected' : ''}>Classic Green</option>
                            <option value="cyberpunk" ${settings.colorScheme === 'cyberpunk' ? 'selected' : ''}>Cyberpunk Pink</option>
                            <option value="matrix" ${settings.colorScheme === 'matrix' ? 'selected' : ''}>Matrix Lime</option>
                        </select>
                    </div>
                </div>

                <div class="settings-section">
                    <h3>Performance</h3>
                    <div class="setting-item">
                        <label>Update Interval (ms):</label>
                        <input type="number" id="setting-update-interval" value="${settings.updateInterval}" min="500" max="5000" step="500">
                    </div>
                </div>
            </div>
            <div class="settings-footer">
                <button class="btn-save" onclick="saveSettingsFromPanel()">Save Settings</button>
                <button class="btn-reset" onclick="resetSettings()">Reset to Defaults</button>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Add click outside to close
    panel.addEventListener('click', (e) => {
        if (e.target === panel) {
            toggleSettingsPanel();
        }
    });
}

function toggleSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

function saveSettingsFromPanel() {
    settings.latencyWarning = parseInt(document.getElementById('setting-latency-warning').value);
    settings.latencyAttack = parseInt(document.getElementById('setting-latency-attack').value);
    settings.packetLossWarning = parseInt(document.getElementById('setting-packet-warning').value);
    settings.packetLossAttack = parseInt(document.getElementById('setting-packet-attack').value);
    settings.connectionWarning = parseInt(document.getElementById('setting-conn-warning').value);
    settings.connectionAttack = parseInt(document.getElementById('setting-conn-attack').value);
    settings.desktopNotifications = document.getElementById('setting-notifications').checked;
    settings.soundAlerts = document.getElementById('setting-sound').checked;
    settings.colorScheme = document.getElementById('setting-color-scheme').value;
    settings.updateInterval = parseInt(document.getElementById('setting-update-interval').value);

    applyColorScheme(settings.colorScheme);
    saveSettings();

    showDesktopNotification('Settings Saved', 'Your preferences have been updated.', false);
    toggleSettingsPanel();
}

function resetSettings() {
    if (confirm('Reset all settings to defaults?')) {
        settings = {...DEFAULT_SETTINGS};
        saveSettings();
        location.reload();
    }
}

// Make functions globally accessible for onclick handlers
window.toggleSettingsPanel = toggleSettingsPanel;
window.saveSettingsFromPanel = saveSettingsFromPanel;
window.resetSettings = resetSettings;

// Generate protocol distribution chart
function generateProtocolChart() {
    const container = document.getElementById('protocol-chart');
    const protocols = ['TCP', 'UDP', 'ICMP', 'OTHER'];
    const colors = {
        TCP: '#0F0',      // Green
        UDP: '#0088FF',   // Blue
        ICMP: '#FFA500',  // Orange
        OTHER: '#888'     // Gray
    };

    protocols.forEach(protocol => {
        const barContainer = document.createElement('div');
        barContainer.className = 'protocol-bar-container';

        const label = document.createElement('div');
        label.className = 'protocol-label';
        label.textContent = protocol;

        const barWrapper = document.createElement('div');
        barWrapper.className = 'protocol-bar-wrapper';

        const bar = document.createElement('div');
        bar.className = 'protocol-bar';
        bar.id = `protocol-bar-${protocol.toLowerCase()}`;
        bar.style.backgroundColor = colors[protocol];
        bar.style.width = '0%';

        const percentage = document.createElement('span');
        percentage.className = 'protocol-percentage';
        percentage.id = `protocol-pct-${protocol.toLowerCase()}`;
        percentage.textContent = '0%';
        percentage.style.color = colors[protocol];

        barWrapper.appendChild(bar);
        barContainer.appendChild(label);
        barContainer.appendChild(barWrapper);
        barContainer.appendChild(percentage);

        container.appendChild(barContainer);
    });
}

// ============================================================================
// WEBSOCKET CONNECTION
// ============================================================================

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
        console.log('✓ Connected to backend');
        updateQuote("connected to backend!", false);

        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            updateUI(data);
        } catch (error) {
            console.error('Error parsing data:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('✗ Disconnected from backend. Reconnecting...');
        updateQuote("connection lost... retrying", false);

        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect...');
                connectWebSocket();
            }, 3000);
        }
    };
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================

function updateUI(data) {
    // Track historical data
    trackHistoricalData(data);

    // Update attack mode state
    const wasAttackMode = isAttackMode;
    isAttackMode = data.attack_detected || false;

    // Update visualization attack state
    if (visualization) {
        visualization.setAttackMode(isAttackMode);
    }

    // Attack detection notifications
    if (isAttackMode !== wasAttackMode) {
        if (isAttackMode) {
            // Attack started
            attackStartTime = Date.now();
            document.body.classList.remove('mode-normal');
            document.body.classList.add('mode-attack');

            // Alert user
            showDesktopNotification(
                '🚨 DDoS Attack Detected!',
                `${data.total_connections || 0} connections detected. Latency: ${data.latency || 0}ms`,
                true
            );
            playAlertSound(800, 200); // Warning tone
        } else {
            // Attack ended
            const duration = attackStartTime ? ((Date.now() - attackStartTime) / 1000).toFixed(0) : 0;
            document.body.classList.remove('mode-attack');
            document.body.classList.add('mode-normal');

            showDesktopNotification(
                '✅ Attack Mitigated',
                `Network stabilized after ${duration}s. System returning to normal.`,
                false
            );
            playAlertSound(600, 100); // All clear tone
            attackStartTime = null;
        }
    }

    // Warning thresholds (when not in attack mode)
    if (!isAttackMode) {
        const latency = data.latency || 0;
        const packetLoss = data.packet_loss || 0;
        const connections = data.total_connections || 0;

        if (latency > settings.latencyWarning ||
            packetLoss > settings.packetLossWarning ||
            connections > settings.connectionWarning) {
            playAlertSound(500, 50); // Minor alert
        }
    }

    // Update network info
    if (data.network_info) {
        document.getElementById('stat-my-ip').textContent = data.network_info.local_ip || '0.0.0.0';
        document.getElementById('stat-gateway').textContent = data.network_info.gateway || '0.0.0.0';
        document.getElementById('stat-network').textContent = data.network_info.network || '0.0.0.0/24';
    }

    // Update stats
    document.getElementById('stat-connections').textContent = data.total_connections || 0;
    document.getElementById('stat-unique-ips').textContent = data.unique_ips || 0;

    // Update threat count
    const threatCount = data.threats?.malicious_count || 0;
    const threatCountEl = document.getElementById('stat-threats');
    threatCountEl.textContent = threatCount;
    threatCountEl.style.color = threatCount > 0 ? '#FF0000' : '#00FF00';

    document.getElementById('stat-latency').textContent = `${data.latency || 0} ms`;
    document.getElementById('stat-packet-loss').textContent = `${(data.packet_loss || 0).toFixed(1)}%`;

    // Update threat level
    const threatEl = document.getElementById('stat-threat');
    threatEl.classList.remove('threat-normal', 'threat-warning', 'threat-attack');

    if (isAttackMode) {
        threatEl.textContent = 'ATTACK';
        threatEl.classList.add('threat-attack');
    } else if (data.threat_level === 'warning') {
        threatEl.textContent = 'WARNING';
        threatEl.classList.add('threat-warning');
    } else {
        threatEl.textContent = 'NORMAL';
        threatEl.classList.add('threat-normal');
    }

    // Update Pwnagotchi face
    updateFace(data);

    // Track connections
    if (data.connections) {
        trackConnections(data.connections, data.threats);
    }

    // Update protocol distribution
    if (data.protocol_distribution) {
        updateProtocolDistribution(data.protocol_distribution);
    }

    // Update graphs (faster for smoother display)
    updateGraphs(data.latency || 0, data.packet_loss || 0);
}

function updateFace(data) {
    const faceEl = document.getElementById('gotchi-face');

    if (data.attack_detected) {
        faceEl.textContent = FACES.ATTACK;
    } else if (data.total_connections > 50) {
        faceEl.textContent = FACES.INTENSE;
    } else if (data.total_connections > 20) {
        faceEl.textContent = FACES.COOL;
    } else if (data.total_connections > 0) {
        faceEl.textContent = FACES.HAPPY;
    } else {
        faceEl.textContent = FACES.BORED;
    }
}

function updateQuote(customQuote = null, checkAttack = true) {
    const quoteEl = document.getElementById('gotchi-quote');

    if (customQuote) {
        quoteEl.textContent = customQuote;
        return;
    }

    if (checkAttack && isAttackMode) {
        quoteEl.textContent = QUOTES_ATTACK[Math.floor(Math.random() * QUOTES_ATTACK.length)];
    } else {
        quoteEl.textContent = QUOTES_NORMAL[Math.floor(Math.random() * QUOTES_NORMAL.length)];
    }
}

// Track connections grouped by IP
function trackConnections(connections, threats = {}) {
    if (!connections || connections.length === 0) return;

    const now = Date.now();
    const currentIPs = new Set();
    const threatData = threats?.ip_threat_data || {};

    connections.forEach(conn => {
        const ip = conn.remote_ip;
        currentIPs.add(ip);

        const isLocal = ip.startsWith('192.168.') ||
                       ip.startsWith('10.') ||
                       ip.startsWith('172.');

        // Get threat info for this IP
        const threat = threatData[ip] || null;

        if (!connectionsByIP.has(ip)) {
            // New IP
            connectionsByIP.set(ip, {
                firstSeen: now,
                lastSeen: now,
                ports: new Set([conn.remote_port]),
                localPorts: new Set([conn.local_port]),
                connCount: 1,
                isLocal: isLocal,
                threat: threat
            });
        } else {
            // Update existing IP
            const entry = connectionsByIP.get(ip);
            entry.lastSeen = now;
            entry.ports.add(conn.remote_port);
            entry.localPorts.add(conn.local_port);
            entry.connCount = connections.filter(c => c.remote_ip === ip).length;
            entry.threat = threat;  // Update threat data
        }
    });

    // Remove IPs not seen in last 30 seconds
    for (const [ip, entry] of connectionsByIP.entries()) {
        if (now - entry.lastSeen > 30000) {
            connectionsByIP.delete(ip);
        }
    }
}

// Refresh connection log every 4 seconds
function refreshConnectionLog() {
    const logEl = document.getElementById('connection-log');
    const totalIPsEl = document.getElementById('total-ips');
    const newIPsEl = document.getElementById('new-ips');

    const now = Date.now();

    // Sort IPs by most recent activity
    const sortedIPs = Array.from(connectionsByIP.entries())
        .sort((a, b) => b[1].lastSeen - a[1].lastSeen);

    // Count new IPs (first seen in last 4 seconds)
    const newCount = sortedIPs.filter(([ip, entry]) => (now - entry.firstSeen) < 4000).length;

    // Update summary
    totalIPsEl.textContent = `${sortedIPs.length} unique IP${sortedIPs.length !== 1 ? 's' : ''}`;
    newIPsEl.textContent = `${newCount} new`;
    newIPsEl.style.color = newCount > 0 ? '#F00' : '#0F0';

    // Clear and rebuild log
    logEl.innerHTML = '';

    const maxEntries = settings.maxLogEntries || 100;
    sortedIPs.slice(0, maxEntries).forEach(([ip, entry]) => {
        const age = now - entry.firstSeen;
        const isNew = age < 4000;

        const ipEntry = document.createElement('div');

        // Red for new IPs, green for existing, cyan for local
        if (isNew) {
            ipEntry.className = `ip-entry new-connection ${entry.isLocal ? 'local' : 'public'}`;
        } else {
            ipEntry.className = `ip-entry ${entry.isLocal ? 'local' : 'public'}`;
        }

        // Create IP header
        const ipHeader = document.createElement('div');
        ipHeader.className = 'ip-header';

        const ipLabel = document.createElement('span');
        ipLabel.className = 'ip-label';
        const prefix = entry.isLocal ? 'LOCAL' : 'REMOTE';
        ipLabel.textContent = `${prefix}`;

        const ipAddress = document.createElement('span');
        ipAddress.className = 'ip-address';
        ipAddress.textContent = ip;

        // Add threat indicator if malicious
        if (entry.threat && entry.threat.is_threat) {
            const threatBadge = document.createElement('span');
            threatBadge.className = 'threat-badge';
            const threatLevel = entry.threat.threat_level || 'suspicious';
            const confidence = entry.threat.confidence || 0;

            if (threatLevel === 'malicious') {
                threatBadge.textContent = `💀 MALICIOUS (${confidence}%)`;
                threatBadge.style.background = '#8B0000';
            } else if (threatLevel === 'suspicious') {
                threatBadge.textContent = `⚠️ SUSPICIOUS (${confidence}%)`;
                threatBadge.style.background = '#FF8C00';
            }

            threatBadge.style.color = '#FFF';
            threatBadge.style.padding = '2px 6px';
            threatBadge.style.borderRadius = '3px';
            threatBadge.style.fontSize = '10px';
            threatBadge.style.fontWeight = 'bold';
            threatBadge.style.marginLeft = '6px';

            ipAddress.appendChild(threatBadge);
        }

        const connCount = document.createElement('span');
        connCount.className = 'conn-count';
        connCount.textContent = `${entry.connCount} conn${entry.connCount !== 1 ? 's' : ''}`;

        ipHeader.appendChild(ipLabel);
        ipHeader.appendChild(ipAddress);
        ipHeader.appendChild(connCount);

        // Create port info with suspicious port highlighting
        const portInfo = document.createElement('div');
        portInfo.className = 'port-info';
        const portsArray = Array.from(entry.ports).slice(0, 5);
        const localPortsArray = Array.from(entry.localPorts).slice(0, 3);

        // Check for suspicious ports
        const suspiciousPorts = portsArray.filter(p => SUSPICIOUS_PORTS.has(p));
        const hasSuspiciousPorts = suspiciousPorts.length > 0;

        if (hasSuspiciousPorts) {
            portInfo.innerHTML = `Ports: ${portsArray.map(p =>
                SUSPICIOUS_PORTS.has(p) ? `<span class="suspicious-port">${p}</span>` : p
            ).join(', ')}${entry.ports.size > 5 ? '...' : ''} → ${localPortsArray.join(', ')} <span class="warning-icon">⚠️</span>`;
        } else {
            portInfo.textContent = `Ports: ${portsArray.join(', ')}${entry.ports.size > 5 ? '...' : ''} → ${localPortsArray.join(', ')}`;
        }

        // Create timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'ip-timestamp';
        timestamp.textContent = `First seen: ${new Date(entry.firstSeen).toLocaleTimeString()}`;

        ipEntry.appendChild(ipHeader);
        ipEntry.appendChild(portInfo);
        ipEntry.appendChild(timestamp);

        // Make IP entry clickable for details
        ipEntry.style.cursor = 'pointer';
        ipEntry.addEventListener('click', () => showConnectionDetails(ip, entry));

        logEl.appendChild(ipEntry);
    });

    lastRefreshTime = now;
}

// ============================================================================
// CONNECTION DETAILS MODAL
// ============================================================================

async function showConnectionDetails(ip, entry) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'connection-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
        <h2>🔍 Connection Details</h2>
        <button class="close-btn" onclick="this.closest('.connection-modal').remove()">×</button>
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';
    body.innerHTML = `
        <div class="detail-section">
            <h3>IP Information</h3>
            <div class="detail-row"><span class="detail-label">IP Address:</span> <span class="detail-value">${ip}</span></div>
            <div class="detail-row"><span class="detail-label">Type:</span> <span class="detail-value">${entry.isLocal ? 'Local Network' : 'Remote/Public'}</span></div>
            <div class="detail-row"><span class="detail-label">Connection Count:</span> <span class="detail-value">${entry.connCount}</span></div>
            <div class="detail-row"><span class="detail-label">First Seen:</span> <span class="detail-value">${new Date(entry.firstSeen).toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Last Seen:</span> <span class="detail-value">${new Date(entry.lastSeen).toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Duration:</span> <span class="detail-value">${((entry.lastSeen - entry.firstSeen) / 1000).toFixed(0)}s</span></div>
        </div>

        <div class="detail-section">
            <h3>Port Analysis</h3>
            <div class="detail-row"><span class="detail-label">Remote Ports:</span> <span class="detail-value">${Array.from(entry.ports).join(', ')}</span></div>
            <div class="detail-row"><span class="detail-label">Local Ports:</span> <span class="detail-value">${Array.from(entry.localPorts).join(', ')}</span></div>
            ${Array.from(entry.ports).some(p => SUSPICIOUS_PORTS.has(p)) ?
                `<div class="detail-row warning"><span class="detail-label">⚠️ Suspicious Ports:</span> <span class="detail-value">${Array.from(entry.ports).filter(p => SUSPICIOUS_PORTS.has(p)).join(', ')}</span></div>` : ''}
        </div>

        ${entry.threat ? `
        <div class="detail-section threat-section">
            <h3>🛡️ Threat Intelligence</h3>
            <div class="detail-row">
                <span class="detail-label">Threat Level:</span>
                <span class="detail-value" style="color: ${entry.threat.is_threat ? '#FF0000' : '#00FF00'}; font-weight: bold;">
                    ${entry.threat.is_threat ? '⚠️ ' + entry.threat.threat_level.toUpperCase() : '✓ BENIGN'}
                </span>
            </div>
            ${entry.threat.is_threat ? `
                <div class="detail-row">
                    <span class="detail-label">Confidence:</span>
                    <span class="detail-value">${entry.threat.confidence}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Sources:</span>
                    <span class="detail-value">${entry.threat.sources.join(', ')}</span>
                </div>
                ${entry.threat.tags && entry.threat.tags.length > 0 ? `
                    <div class="detail-row">
                        <span class="detail-label">Tags:</span>
                        <span class="detail-value">${entry.threat.tags.join(', ')}</span>
                    </div>
                ` : ''}
                ${entry.threat.details.greynoise ? `
                    <div class="detail-row">
                        <span class="detail-label">GreyNoise:</span>
                        <span class="detail-value">${entry.threat.details.greynoise.classification} ${entry.threat.details.greynoise.name ? '- ' + entry.threat.details.greynoise.name : ''}</span>
                    </div>
                ` : ''}
                ${entry.threat.details.abuseipdb ? `
                    <div class="detail-row">
                        <span class="detail-label">AbuseIPDB:</span>
                        <span class="detail-value">Score: ${entry.threat.details.abuseipdb.abuse_score}%, Reports: ${entry.threat.details.abuseipdb.total_reports}</span>
                    </div>
                ` : ''}
            ` : ''}
        </div>
        ` : ''}

        <div class="detail-section" id="geo-section">
            <h3>Geographic Information</h3>
            <div class="detail-row"><span class="detail-label">Loading...</span></div>
        </div>
    `;

    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Fetch Geo-IP data (only for non-local IPs)
    if (!entry.isLocal) {
        fetchGeoIPData(ip);
    } else {
        document.getElementById('geo-section').innerHTML = `
            <h3>Geographic Information</h3>
            <div class="detail-row"><span class="detail-label">Location:</span> <span class="detail-value">Local Network (no geo data)</span></div>
        `;
    }
}

async function fetchGeoIPData(ip) {
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}`);
        const data = await response.json();

        if (data.status === 'success') {
            document.getElementById('geo-section').innerHTML = `
                <h3>Geographic Information</h3>
                <div class="detail-row"><span class="detail-label">Country:</span> <span class="detail-value">${data.country} ${data.countryCode ? `(${data.countryCode})` : ''}</span></div>
                <div class="detail-row"><span class="detail-label">Region:</span> <span class="detail-value">${data.regionName || 'Unknown'}</span></div>
                <div class="detail-row"><span class="detail-label">City:</span> <span class="detail-value">${data.city || 'Unknown'}</span></div>
                <div class="detail-row"><span class="detail-label">ISP:</span> <span class="detail-value">${data.isp || 'Unknown'}</span></div>
                <div class="detail-row"><span class="detail-label">Organization:</span> <span class="detail-value">${data.org || 'Unknown'}</span></div>
                <div class="detail-row"><span class="detail-label">Coordinates:</span> <span class="detail-value">${data.lat}, ${data.lon}</span></div>
                <div class="detail-row"><span class="detail-label">Timezone:</span> <span class="detail-value">${data.timezone || 'Unknown'}</span></div>
            `;
        } else {
            document.getElementById('geo-section').innerHTML = `
                <h3>Geographic Information</h3>
                <div class="detail-row"><span class="detail-label">Error:</span> <span class="detail-value">Unable to fetch geo data</span></div>
            `;
        }
    } catch (error) {
        console.error('Geo-IP fetch error:', error);
        document.getElementById('geo-section').innerHTML = `
            <h3>Geographic Information</h3>
            <div class="detail-row"><span class="detail-label">Error:</span> <span class="detail-value">Network error fetching geo data</span></div>
        `;
    }
}

function updateProtocolDistribution(distribution) {
    // Update protocol data
    protocolData = distribution;

    // Calculate total
    const total = distribution.TCP + distribution.UDP + distribution.ICMP + distribution.OTHER;

    if (total === 0) {
        // No connections, set all to 0%
        ['tcp', 'udp', 'icmp', 'other'].forEach(protocol => {
            const bar = document.getElementById(`protocol-bar-${protocol}`);
            const pct = document.getElementById(`protocol-pct-${protocol}`);
            if (bar && pct) {
                bar.style.width = '0%';
                pct.textContent = '0%';
            }
        });
        return;
    }

    // Update each protocol bar
    Object.keys(distribution).forEach(protocol => {
        const count = distribution[protocol];
        const percentage = Math.round((count / total) * 100);

        const bar = document.getElementById(`protocol-bar-${protocol.toLowerCase()}`);
        const pct = document.getElementById(`protocol-pct-${protocol.toLowerCase()}`);

        if (bar && pct) {
            // Smooth transition for bar width
            bar.style.width = `${percentage}%`;
            pct.textContent = `${percentage}%`;
        }
    });
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    document.getElementById('current-time').textContent = timeStr;
}

// ============================================================================
// GRAPHS - KIBANA-STYLE INTERACTIVE GRAPHS
// ============================================================================

// Helper function for rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}

// Graph state for interactivity
const graphState = {
    latency: { hovering: false, hoverIndex: -1 },
    packetloss: { hovering: false, hoverIndex: -1 }
};

function updateGraphs(latency, packetLoss) {
    // Add to history
    const now = new Date();
    latencyHistory.push(latency);
    packetLossHistory.push(packetLoss);
    timestampHistory.push(now);

    // Keep only recent data (use settings value)
    const maxPoints = settings.maxDataPoints || 120;
    if (latencyHistory.length > maxPoints) {
        latencyHistory.shift();
        packetLossHistory.shift();
        timestampHistory.shift();
    }

    // Draw both graphs
    drawInteractiveGraph('latency-graph', latencyHistory, '#0F0', 200, timestampHistory, 'latency');
    drawInteractiveGraph('packetloss-graph', packetLossHistory, '#F00', 100, timestampHistory, 'packetloss');
}

function drawInteractiveGraph(canvasId, data, color, maxValue, timestamps, graphKey) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Increased margins for better spacing
    const marginTop = 30;
    const marginBottom = 80;  // More space for time labels
    const marginLeft = 60;
    const marginRight = 30;

    const graphWidth = width - marginLeft - marginRight;
    const graphHeight = height - marginTop - marginBottom;

    // Clear canvas with high quality
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    if (data.length < 2) return;

    const maxPoints = settings.maxDataPoints || 120;
    const pointSpacing = graphWidth / (maxPoints - 1);

    // Draw enhanced grid with better quality
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
        const y = marginTop + (graphHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(marginLeft + graphWidth, y);
        ctx.stroke();

        // Y-axis labels
        const value = maxValue - (maxValue / 5) * i;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.font = '12px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(1), marginLeft - 10, y + 4);
    }

    // Vertical grid lines (fewer to avoid clutter)
    const verticalGridCount = 6;
    for (let i = 0; i <= verticalGridCount; i++) {
        const x = marginLeft + (graphWidth / verticalGridCount) * i;
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.05)';
        ctx.beginPath();
        ctx.moveTo(x, marginTop);
        ctx.lineTo(x, marginTop + graphHeight);
        ctx.stroke();
    }

    // Fill area under the line
    const areaColor = color === '#0F0' ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 0, 0, 0.15)';
    ctx.fillStyle = areaColor;
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop + graphHeight);

    data.forEach((value, index) => {
        const x = marginLeft + index * pointSpacing;
        const y = marginTop + graphHeight - (value / maxValue) * graphHeight;
        ctx.lineTo(x, y);
    });

    ctx.lineTo(marginLeft + (data.length - 1) * pointSpacing, marginTop + graphHeight);
    ctx.closePath();
    ctx.fill();

    // Draw data line with better quality
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.beginPath();

    data.forEach((value, index) => {
        const x = marginLeft + index * pointSpacing;
        const y = marginTop + graphHeight - (value / maxValue) * graphHeight;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw time labels (fewer, non-overlapping, shorter format)
    if (timestamps && timestamps.length > 0) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.font = '13px Courier New';
        ctx.textAlign = 'center';

        // Only show 3 time labels to prevent overlap
        const labelCount = 3;
        const labelIndices = [];
        for (let i = 0; i < labelCount; i++) {
            labelIndices.push(Math.floor((data.length - 1) * (i / (labelCount - 1))));
        }

        labelIndices.forEach(index => {
            if (index < timestamps.length) {
                const x = marginLeft + index * pointSpacing;
                // Shorter format: "5:11 PM" instead of "5:11:02 PM"
                const time = timestamps[index].toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                ctx.fillText(time, x, height - 30);
            }
        });
    }

    // Draw crosshair and tooltip if hovering
    const state = graphState[graphKey];
    if (state && state.hovering && state.hoverIndex >= 0 && state.hoverIndex < data.length) {
        const hoverX = marginLeft + state.hoverIndex * pointSpacing;
        const hoverY = marginTop + graphHeight - (data[state.hoverIndex] / maxValue) * graphHeight;

        // Draw vertical crosshair line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(hoverX, marginTop);
        ctx.lineTo(hoverX, marginTop + graphHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw horizontal crosshair line
        ctx.beginPath();
        ctx.moveTo(marginLeft, hoverY);
        ctx.lineTo(marginLeft + graphWidth, hoverY);
        ctx.stroke();

        // Highlight the point
        ctx.fillStyle = color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(hoverX, hoverY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw professional tooltip card
        const value = data[state.hoverIndex].toFixed(2);
        const timestamp = timestamps[state.hoverIndex];
        const timeStr = timestamp.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const unit = graphKey === 'latency' ? ' ms' : '%';

        // Tooltip dimensions - larger with more breathing room
        const tooltipWidth = 200;
        const tooltipHeight = 85;
        const tooltipPadding = 20;

        // Position tooltip to the side or above, never overlapping
        let tooltipX, tooltipY;

        // Try to position to the right of the cursor
        if (hoverX + 20 + tooltipWidth < width) {
            tooltipX = hoverX + 20;
            tooltipY = hoverY - tooltipHeight / 2;
        }
        // Try to position to the left
        else if (hoverX - 20 - tooltipWidth > 0) {
            tooltipX = hoverX - 20 - tooltipWidth;
            tooltipY = hoverY - tooltipHeight / 2;
        }
        // Position above
        else {
            tooltipX = hoverX - tooltipWidth / 2;
            tooltipY = hoverY - tooltipHeight - 20;
        }

        // Keep tooltip within canvas bounds
        if (tooltipX < 10) tooltipX = 10;
        if (tooltipX + tooltipWidth > width - 10) tooltipX = width - tooltipWidth - 10;
        if (tooltipY < 10) tooltipY = 10;
        if (tooltipY + tooltipHeight > height - 10) tooltipY = height - tooltipHeight - 10;

        // Draw tooltip shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // Draw tooltip background with rounded corners
        ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
        roundRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw tooltip border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        roundRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
        ctx.stroke();

        // Draw tooltip text with better spacing
        ctx.textAlign = 'left';

        // Time section
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 14px Courier New';
        ctx.fillText('Time:', tooltipX + tooltipPadding, tooltipY + 28);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '13px Courier New';
        ctx.fillText(timeStr, tooltipX + tooltipPadding, tooltipY + 48);

        // Value section (more spacing from Time section)
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 14px Courier New';
        ctx.fillText('Value:', tooltipX + tooltipPadding, tooltipY + tooltipHeight - 12);

        ctx.fillStyle = color;
        ctx.font = 'bold 15px Courier New';
        ctx.fillText(value + unit, tooltipX + tooltipPadding + 60, tooltipY + tooltipHeight - 12);
    }

    // Setup mouse events (only once per canvas)
    if (!canvas.hasMouseEvents) {
        canvas.hasMouseEvents = true;

        // Store margins for this canvas
        const marginLeft = 60;

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Scale for canvas resolution
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const scaledX = mouseX * scaleX;

            // Adjust for left margin
            const graphX = scaledX - marginLeft;

            // Find nearest data point
            const index = Math.round(graphX / pointSpacing);

            if (index >= 0 && index < data.length) {
                graphState[graphKey].hovering = true;
                graphState[graphKey].hoverIndex = index;

                // Redraw to show tooltip
                if (graphKey === 'latency') {
                    drawInteractiveGraph(canvasId, latencyHistory, color, maxValue, timestamps, graphKey);
                } else {
                    drawInteractiveGraph(canvasId, packetLossHistory, color, maxValue, timestamps, graphKey);
                }
            }
        });

        canvas.addEventListener('mouseleave', () => {
            graphState[graphKey].hovering = false;
            graphState[graphKey].hoverIndex = -1;

            // Redraw without tooltip
            if (graphKey === 'latency') {
                drawInteractiveGraph(canvasId, latencyHistory, color, maxValue, timestamps, graphKey);
            } else {
                drawInteractiveGraph(canvasId, packetLossHistory, color, maxValue, timestamps, graphKey);
            }
        });

        // Add cursor style
        canvas.style.cursor = 'crosshair';
    }
}

// ============================================================================
// START APPLICATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    init();
});
