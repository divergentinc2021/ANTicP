// CycleTracker Pro - Main Application
// Professional Training Sessions • Device Management • Strava Integration

class CycleTrackerApp {
    constructor() {
        this.currentSession = null;
        this.sessionManager = new SessionManager();
        this.deviceManager = new DeviceManager();
        this.firebaseManager = new FirebaseManager();
        this.stravaManager = new StravaManager();
        
        this.resistanceSystem = {
            currentLevel: 4,
            minLevel: 1,
            maxLevel: 8,
            levels: {
                1: { resistance: '10%', description: 'Recovery - Very Easy', color: '#27ae60', power: 80 },
                2: { resistance: '20%', description: 'Endurance - Easy', color: '#2ecc71', power: 120 },
                3: { resistance: '35%', description: 'Aerobic - Moderate Easy', color: '#3498db', power: 160 },
                4: { resistance: '50%', description: 'Tempo - Moderate', color: '#f39c12', power: 200 },
                5: { resistance: '65%', description: 'Threshold - Hard', color: '#e67e22', power: 250 },
                6: { resistance: '80%', description: 'VO2 Max - Very Hard', color: '#e74c3c', power: 300 },
                7: { resistance: '90%', description: 'Anaerobic - Extremely Hard', color: '#c0392b', power: 350 },
                8: { resistance: '100%', description: 'Maximum - All Out', color: '#8e44ad', power: 400 }
            }
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserProfile();
        this.initializeUI();
        this.checkAuthStatus();
        console.log('🚴‍♂️ CycleTracker Pro initialized');
    }

    setupEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-tab')) {
                const tabName = e.target.getAttribute('onclick').match(/'(\w+)'/)[1];
                this.switchTab(tabName);
            }
        });

        // Device connection events
        this.deviceManager.on('deviceConnected', (device) => {
            this.updateDeviceStatus(device.type, 'connected', device.name);
        });

        this.deviceManager.on('deviceDisconnected', (device) => {
            this.updateDeviceStatus(device.type, 'disconnected');
        });

        this.deviceManager.on('deviceData', (data) => {
            if (this.currentSession) {
                this.currentSession.addDataPoint(data);
                this.updateLiveMetrics(data);
            }
        });

        // Session events
        this.sessionManager.on('sessionStarted', (session) => {
            this.currentSession = session;
            this.updateSessionUI('active');
        });

        this.sessionManager.on('sessionStopped', (session) => {
            this.saveSession(session);
            this.currentSession = null;
            this.updateSessionUI('stopped');
        });
    }

    // Tab Management
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active from all nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(`${tabName}-tab`).classList.add('active');
        event.target.classList.add('active');
        
        console.log(`Switched to ${tabName} tab`);
    }

    // Training Session Management
    async startTrainingSession(sessionType = 'custom') {
        try {
            if (this.currentSession) {
                throw new Error('Session already active');
            }

            // Check if devices are connected
            if (!this.deviceManager.hasConnectedDevices()) {
                const connect = confirm('No devices connected. Would you like to auto-connect devices first?');
                if (connect) {
                    await this.autoConnectDevices();
                }
            }

            // Create new session
            const session = await this.sessionManager.startSession({
                type: sessionType,
                startTime: new Date().toISOString(),
                userId: this.firebaseManager.getCurrentUserId()
            });

            this.currentSession = session;
            this.updateSessionUI('active');
            this.updateSessionStatus('Training session active');

            // Enable session controls
            document.getElementById('start-session-btn').disabled = true;
            document.getElementById('pause-session-btn').disabled = false;
            document.getElementById('stop-session-btn').disabled = false;

            console.log('Training session started:', session.id);

        } catch (error) {
            console.error('Failed to start training session:', error);
            alert('Failed to start training session: ' + error.message);
        }
    }

    pauseTrainingSession() {
        if (this.currentSession) {
            this.sessionManager.pauseSession(this.currentSession.id);
            this.updateSessionStatus('Training session paused');
            
            document.getElementById('pause-session-btn').textContent = this.currentSession.isPaused ? '▶️ Resume' : '⏸️ Pause';
        }
    }

    async stopTrainingSession() {
        if (this.currentSession) {
            try {
                const session = await this.sessionManager.stopSession(this.currentSession.id);
                
                // Save to Firebase
                await this.firebaseManager.saveSession(session);
                
                // Sync to Strava if connected
                if (this.stravaManager.isConnected()) {
                    await this.stravaManager.uploadActivity(session);
                }

                this.updateSessionStatus('Training session saved successfully');
                this.currentSession = null;
                this.updateSessionUI('stopped');
                
                // Reset session controls
                document.getElementById('start-session-btn').disabled = false;
                document.getElementById('pause-session-btn').disabled = true;
                document.getElementById('stop-session-btn').disabled = true;
                
                // Refresh history tab
                this.loadSessionHistory();

                console.log('Training session stopped and saved');

            } catch (error) {
                console.error('Failed to stop training session:', error);
                alert('Failed to stop training session: ' + error.message);
            }
        }
    }

    selectSessionType(type) {
        console.log('Selected session type:', type);
        
        // Highlight selected session type
        document.querySelectorAll('.session-card').forEach(card => {
            card.style.transform = '';
        });
        
        event.currentTarget.style.transform = 'scale(1.02)';
        
        // Pre-configure session based on type
        const configurations = {
            endurance: { targetPower: 200, duration: 90 },
            intervals: { targetPower: 300, duration: 45 },
            recovery: { targetPower: 120, duration: 30 },
            custom: { targetPower: 200, duration: 60 }
        };
        
        const config = configurations[type];
        if (config) {
            // Set resistance level based on target power
            const level = this.getPowerToResistanceLevel(config.targetPower);
            this.changeResistance(null, level);
        }
    }

    // Resistance Control
    changeResistance(direction, targetLevel = null) {
        const previousLevel = this.resistanceSystem.currentLevel;
        
        if (targetLevel) {
            this.resistanceSystem.currentLevel = Math.max(1, Math.min(8, targetLevel));
        } else if (direction === 'up' && this.resistanceSystem.currentLevel < this.resistanceSystem.maxLevel) {
            this.resistanceSystem.currentLevel++;
        } else if (direction === 'down' && this.resistanceSystem.currentLevel > this.resistanceSystem.minLevel) {
            this.resistanceSystem.currentLevel--;
        }
        
        if (previousLevel !== this.resistanceSystem.currentLevel) {
            const levelInfo = this.resistanceSystem.levels[this.resistanceSystem.currentLevel];
            
            // Update UI
            document.getElementById('resistance-level').textContent = this.resistanceSystem.currentLevel;
            document.getElementById('resistance-level').style.color = levelInfo.color;
            document.getElementById('resistance-description').textContent = levelInfo.description;
            
            // Send resistance change to connected trainer
            if (this.deviceManager.isDeviceConnected('kickr')) {
                this.deviceManager.setTrainerResistance(levelInfo.power);
            }
            
            console.log(`Resistance changed to level ${this.resistanceSystem.currentLevel}: ${levelInfo.description}`);
        }
    }

    getPowerToResistanceLevel(targetPower) {
        for (let level = 1; level <= 8; level++) {
            if (this.resistanceSystem.levels[level].power >= targetPower) {
                return level;
            }
        }
        return 8; // Return max level if target is very high
    }

    // Device Management
    async autoConnectDevices() {
        try {
            this.updateConnectionLog('🚀 Starting auto-connect for all devices...');
            
            const deviceTypes = ['kickr', 'hrm', 'zwift-click'];
            for (const deviceType of deviceTypes) {
                try {
                    await this.connectDevice(deviceType);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay between connections
                } catch (error) {
                    console.warn(`Failed to auto-connect ${deviceType}:`, error.message);
                }
            }
            
            this.updateConnectionLog('✅ Auto-connect process completed');
            
        } catch (error) {
            console.error('Auto-connect failed:', error);
            this.updateConnectionLog(`❌ Auto-connect failed: ${error.message}`);
        }
    }

    async connectDevice(deviceType) {
        try {
            this.updateConnectionLog(`🔍 Connecting ${deviceType}...`);
            const device = await this.deviceManager.connectDevice(deviceType);
            this.updateDeviceStatus(deviceType, 'connected', device.name);
            this.updateConnectionLog(`✅ ${deviceType} connected: ${device.name}`);
        } catch (error) {
            this.updateDeviceStatus(deviceType, 'error');
            this.updateConnectionLog(`❌ ${deviceType} connection failed: ${error.message}`);
            throw error;
        }
    }

    async disconnectDevice(deviceType) {
        try {
            await this.deviceManager.disconnectDevice(deviceType);
            this.updateDeviceStatus(deviceType, 'disconnected');
            this.updateConnectionLog(`🔌 ${deviceType} disconnected`);
        } catch (error) {
            console.error(`Failed to disconnect ${deviceType}:`, error);
            this.updateConnectionLog(`❌ ${deviceType} disconnect failed: ${error.message}`);
        }
    }

    updateDeviceStatus(deviceType, status, deviceName = null) {
        const statusElement = document.getElementById(`${deviceType}-connection-status`);
        const indicatorElement = document.getElementById(`${deviceType}-status-indicator`);
        const deviceNameElement = document.getElementById(`${deviceType}-device-name`);
        const connectBtn = document.getElementById(`connect-${deviceType}-btn`);
        const disconnectBtn = document.getElementById(`disconnect-${deviceType}-btn`);
        
        if (statusElement) {
            const statusTexts = {
                connected: 'Connected',
                connecting: 'Connecting...',
                disconnected: 'Not Connected',
                error: 'Connection Error'
            };
            
            statusElement.textContent = statusTexts[status] || status;
            statusElement.className = `device-status-${status}`;
        }
        
        if (indicatorElement) {
            const colors = {
                connected: '#28a745',
                connecting: '#ffc107',
                disconnected: '#6c757d',
                error: '#dc3545'
            };
            indicatorElement.style.background = colors[status] || '#6c757d';
        }
        
        if (deviceNameElement && deviceName) {
            deviceNameElement.textContent = deviceName;
        }
        
        if (connectBtn && disconnectBtn) {
            if (status === 'connected') {
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
            } else {
                connectBtn.disabled = false;
                disconnectBtn.disabled = true;
            }
        }
    }

    updateConnectionLog(message) {
        const logElement = document.getElementById('device-connection-log');
        if (logElement) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = `[${timestamp}] ${message}\n`;
            logElement.textContent += logEntry;
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    // UI Updates
    updateLiveMetrics(data) {
        if (data.power !== undefined) {
            document.getElementById('session-power').textContent = data.power;
        }
        if (data.speed !== undefined) {
            document.getElementById('session-speed').textContent = data.speed.toFixed(1);
        }
        if (data.cadence !== undefined) {
            document.getElementById('session-cadence').textContent = data.cadence;
        }
        if (data.heartRate !== undefined) {
            document.getElementById('session-hr').textContent = data.heartRate;
        }
        if (data.distance !== undefined) {
            document.getElementById('session-distance').textContent = data.distance.toFixed(2);
        }
        if (data.time !== undefined) {
            const minutes = Math.floor(data.time / 60);
            const seconds = data.time % 60;
            document.getElementById('session-time').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateSessionUI(status) {
        const sessionCard = document.getElementById('current-session-card');
        if (status === 'active') {
            sessionCard.classList.add('session-active');
        } else {
            sessionCard.classList.remove('session-active');
        }
    }

    updateSessionStatus(message) {
        const statusElement = document.getElementById('session-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    // User Profile & Firebase
    async loadUserProfile() {
        try {
            const profile = await this.firebaseManager.getUserProfile();
            if (profile) {
                document.getElementById('user-age').value = profile.age || '';
                document.getElementById('user-weight').value = profile.weight || '';
                document.getElementById('user-max-hr').value = profile.maxHR || '';
                document.getElementById('user-ftp').value = profile.ftp || '';
            }
        } catch (error) {
            console.warn('Failed to load user profile:', error);
        }
    }

    async saveProfile() {
        try {
            const profile = {
                age: parseInt(document.getElementById('user-age').value),
                weight: parseFloat(document.getElementById('user-weight').value),
                maxHR: parseInt(document.getElementById('user-max-hr').value),
                ftp: parseInt(document.getElementById('user-ftp').value),
                updatedAt: new Date().toISOString()
            };

            await this.firebaseManager.saveUserProfile(profile);
            alert('Profile saved successfully!');

        } catch (error) {
            console.error('Failed to save profile:', error);
            alert('Failed to save profile: ' + error.message);
        }
    }

    async checkAuthStatus() {
        const isSignedIn = await this.firebaseManager.isSignedIn();
        this.updateAuthUI(isSignedIn);
    }

    async signIn() {
        try {
            await this.firebaseManager.signIn();
            this.updateAuthUI(true);
            this.loadUserProfile();
        } catch (error) {
            console.error('Sign in failed:', error);
            alert('Sign in failed: ' + error.message);
        }
    }

    async signOut() {
        try {
            await this.firebaseManager.signOut();
            this.updateAuthUI(false);
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    }

    updateAuthUI(isSignedIn) {
        const authStatus = document.getElementById('auth-status');
        const signInBtn = document.getElementById('sign-in-btn');
        const signOutBtn = document.getElementById('sign-out-btn');

        if (isSignedIn) {
            authStatus.textContent = 'Signed in';
            authStatus.style.color = '#28a745';
            signInBtn.disabled = true;
            signOutBtn.disabled = false;
        } else {
            authStatus.textContent = 'Not signed in';
            authStatus.style.color = '#dc3545';
            signInBtn.disabled = false;
            signOutBtn.disabled = true;
        }
    }

    // Strava Integration
    async connectStrava() {
        try {
            await this.stravaManager.connect();
            this.updateStravaUI(true);
        } catch (error) {
            console.error('Strava connection failed:', error);
            alert('Strava connection failed: ' + error.message);
        }
    }

    async disconnectStrava() {
        try {
            await this.stravaManager.disconnect();
            this.updateStravaUI(false);
        } catch (error) {
            console.error('Strava disconnect failed:', error);
        }
    }

    async syncWithStrava() {
        try {
            if (!this.stravaManager.isConnected()) {
                throw new Error('Strava not connected');
            }

            // Get recent sessions from Firebase
            const recentSessions = await this.firebaseManager.getRecentSessions(7); // Last 7 days
            
            for (const session of recentSessions) {
                if (!session.stravaId) { // Only sync sessions not already on Strava
                    await this.stravaManager.uploadActivity(session);
                }
            }

            alert('Successfully synced with Strava!');

        } catch (error) {
            console.error('Strava sync failed:', error);
            alert('Strava sync failed: ' + error.message);
        }
    }

    updateStravaUI(isConnected) {
        const stravaStatus = document.getElementById('strava-status');
        const connectBtn = document.getElementById('connect-strava-btn');
        const disconnectBtn = document.getElementById('disconnect-strava-btn');

        if (isConnected) {
            stravaStatus.textContent = 'Connected';
            stravaStatus.style.color = '#28a745';
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
        } else {
            stravaStatus.textContent = 'Not connected';
            stravaStatus.style.color = '#666';
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
        }
    }

    // History Management
    async loadSessionHistory() {
        try {
            const sessions = await this.firebaseManager.getSessionHistory();
            this.renderSessionHistory(sessions);
        } catch (error) {
            console.error('Failed to load session history:', error);
        }
    }

    renderSessionHistory(sessions) {
        const historyContainer = document.getElementById('session-history');
        if (!historyContainer || !sessions.length) return;

        historyContainer.innerHTML = sessions.map(session => `
            <div class="session-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="color: #155724; margin: 0;">${this.getSessionTypeIcon(session.type)} ${session.type}</h4>
                        <p style="color: #666; margin: 5px 0;">${session.duration} min • ${session.avgPower}W avg • ${session.avgHR} BPM avg</p>
                        <small style="color: #999;">${this.formatDate(session.startTime)}</small>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.2rem; font-weight: bold; color: #28a745;">${session.distance.toFixed(1)} km</div>
                        <button onclick="app.viewSession('${session.id}')" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 5px;">View Details</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getSessionTypeIcon(type) {
        const icons = {
            'endurance': '🚴',
            'intervals': '⚡',
            'recovery': '🧘',
            'custom': '🎯'
        };
        return icons[type] || '🚴';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ', ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    async viewSession(sessionId) {
        try {
            const session = await this.firebaseManager.getSession(sessionId);
            // TODO: Open session detail modal or navigate to detail view
            console.log('Viewing session:', session);
        } catch (error) {
            console.error('Failed to load session details:', error);
        }
    }

    async exportData() {
        try {
            const sessions = await this.firebaseManager.getAllSessions();
            const csvData = this.convertToCSV(sessions);
            
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cycletracker-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }

    convertToCSV(sessions) {
        const headers = ['Date', 'Type', 'Duration (min)', 'Distance (km)', 'Avg Power (W)', 'Avg HR (BPM)', 'Max Power (W)', 'Max HR (BPM)'];
        const rows = sessions.map(session => [
            session.startTime,
            session.type,
            session.duration,
            session.distance,
            session.avgPower,
            session.avgHR,
            session.maxPower,
            session.maxHR
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    initializeUI() {
        // Set initial resistance level
        const initialLevel = this.resistanceSystem.levels[this.resistanceSystem.currentLevel];
        document.getElementById('resistance-level').textContent = this.resistanceSystem.currentLevel;
        document.getElementById('resistance-level').style.color = initialLevel.color;
        document.getElementById('resistance-description').textContent = initialLevel.description;
        
        // Load session history
        this.loadSessionHistory();
        
        console.log('UI initialized');
    }
}

// Global functions for onclick handlers
let app;

function switchTab(tabName) {
    app.switchTab(tabName);
}

function startTrainingSession() {
    app.startTrainingSession();
}

function pauseTrainingSession() {
    app.pauseTrainingSession();
}

function stopTrainingSession() {
    app.stopTrainingSession();
}

function selectSessionType(type) {
    app.selectSessionType(type);
}

function changeResistance(direction) {
    app.changeResistance(direction);
}

function autoConnectDevices() {
    app.autoConnectDevices();
}

function connectDevice(deviceType) {
    app.connectDevice(deviceType);
}

function disconnectDevice(deviceType) {
    app.disconnectDevice(deviceType);
}

function signIn() {
    app.signIn();
}

function signOut() {
    app.signOut();
}

function saveProfile() {
    app.saveProfile();
}

function connectStrava() {
    app.connectStrava();
}

function disconnectStrava() {
    app.disconnectStrava();
}

function syncWithStrava() {
    app.syncWithStrava();
}

function exportData() {
    app.exportData();
}

function viewStats() {
    // TODO: Implement stats view
    console.log('View stats clicked');
}

function viewSession(sessionId) {
    app.viewSession(sessionId);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new CycleTrackerApp();
});
