/**
 * Integrated Cycling Training App Controller
 * Orchestrates unified connection management, Strava integration, and Firebase backend
 */
import { UnifiedConnectionManager } from './connections/unified-connection-manager.js';
import { EnhancedStravaManager } from './enhanced-strava-integration.js';
import { SessionManager } from './session-manager.js';
import { EventEmitter } from './utils/event-emitter.js';
import { logger } from './core/logger.js';

export class IntegratedCyclingApp extends EventEmitter {
    constructor(firebaseManager) {
        super();
        this.firebaseManager = firebaseManager;
        
        // Core managers
        this.connectionManager = null;
        this.stravaManager = null;
        this.sessionManager = null;
        
        // Application state
        this.isInitialized = false;
        this.currentSession = null;
        this.connectedDevices = new Map();
        this.liveMetrics = {
            heartRate: 0,
            power: 0,
            cadence: 0,
            speed: 0,
            resistance: 0,
            gear: 1,
            duration: 0,
            distance: 0,
            energy: 0
        };
        
        // Auto-sync settings
        this.autoUploadToStrava = false;
        this.autoSaveToFirebase = true;
        
        // UI state
        this.uiElements = new Map();
        this.updateInterval = null;
        
        this.initialize();
    }

    async initialize() {
        try {
            logger.info('🚀 Initializing Integrated Cycling Training App...');
            
            // Initialize core managers
            this.connectionManager = new UnifiedConnectionManager(this.firebaseManager);
            this.stravaManager = new EnhancedStravaManager(this.firebaseManager);
            this.sessionManager = new SessionManager(this.firebaseManager);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize managers
            const connectionMethods = await this.connectionManager.initialize();
            await this.stravaManager.initialize();
            await this.sessionManager.initialize();
            
            // Initialize UI
            this.initializeUI();
            
            this.isInitialized = true;
            logger.info('✅ Integrated Cycling Training App initialized successfully');
            
            this.emit('initialized', {
                connectionMethods,
                stravaConnected: this.stravaManager.isConnectedToStrava(),
                firebaseConnected: this.firebaseManager?.isConnected() || false
            });
            
        } catch (error) {
            logger.error('❌ Failed to initialize app:', error);
            this.emit('initialization-error', error);
        }
    }

    setupEventListeners() {
        // Connection Manager Events
        this.connectionManager.on('zwift-click-connected', (data) => {
            this.handleZwiftClickConnected(data);
        });
        
        this.connectionManager.on('zwift-click-gear-change', (data) => {
            this.handleGearChange(data);
        });
        
        this.connectionManager.on('kickr-connected', (data) => {
            this.handleKickrConnected(data);
        });
        
        this.connectionManager.on('hrm-connected', (data) => {
            this.handleHRMConnected(data);
        });
        
        // Device data events
        this.connectionManager.on('heart-rate-data', (data) => {
            this.updateMetric('heartRate', data.heartRate);
        });
        
        this.connectionManager.on('power-data', (data) => {
            this.updateMetric('power', data.power);
            this.updateMetric('cadence', data.cadence);
        });
        
        this.connectionManager.on('speed-cadence-data', (data) => {
            this.updateMetric('speed', data.speed);
            this.updateMetric('cadence', data.cadence);
        });
        
        this.connectionManager.on('trainer-data', (data) => {
            this.updateMetric('power', data.power);
            this.updateMetric('resistance', data.resistance);
        });
        
        // Strava Manager Events
        this.stravaManager.on('connected', (athlete) => {
            this.handleStravaConnected(athlete);
        });
        
        this.stravaManager.on('activity-uploaded', (data) => {
            this.handleActivityUploaded(data);
        });
        
        this.stravaManager.on('disconnected', () => {
            this.handleStravaDisconnected();
        });
        
        // Session Manager Events
        this.sessionManager.on('session-started', (session) => {
            this.currentSession = session;
            this.handleSessionStarted(session);
        });
        
        this.sessionManager.on('session-ended', (session) => {
            this.handleSessionEnded(session);
        });
    }

    // ============================================================================
    // DEVICE CONNECTION METHODS
    // ============================================================================
    
    async connectZwiftClick() {
        try {
            logger.info('🎮 Connecting Zwift Click...');
            this.updateConnectionStatus('zwift-click', 'connecting');
            
            const zwiftClickHandler = await this.connectionManager.connectZwiftClick();
            
            if (zwiftClickHandler) {
                this.connectedDevices.set('zwift-click', zwiftClickHandler);
                this.updateConnectionStatus('zwift-click', 'connected');
                return { success: true, device: 'zwift-click' };
            }
            
        } catch (error) {
            this.updateConnectionStatus('zwift-click', 'error', error.message);
            throw error;
        }
    }

    async connectKickr() {
        try {
            logger.info('⚡ Connecting Wahoo Kickr...');
            this.updateConnectionStatus('kickr', 'connecting');
            
            const kickrHandler = await this.connectionManager.connectBluetoothDevice('kickr');
            
            if (kickrHandler) {
                this.connectedDevices.set('kickr', kickrHandler);
                this.updateConnectionStatus('kickr', 'connected');
                return { success: true, device: 'kickr' };
            }
            
        } catch (error) {
            this.updateConnectionStatus('kickr', 'error', error.message);
            throw error;
        }
    }

    async connectHeartRateMonitor() {
        try {
            logger.info('❤️ Connecting Heart Rate Monitor...');
            this.updateConnectionStatus('hrm', 'connecting');
            
            const hrmHandler = await this.connectionManager.connectBluetoothDevice('hrm');
            
            if (hrmHandler) {
                this.connectedDevices.set('hrm', hrmHandler);
                this.updateConnectionStatus('hrm', 'connected');
                return { success: true, device: 'hrm' };
            }
            
        } catch (error) {
            this.updateConnectionStatus('hrm', 'error', error.message);
            throw error;
        }
    }

    async connectAllDevices() {
        const results = [];
        
        try {
            // Connect devices in parallel for faster setup
            const connectionPromises = [
                this.connectZwiftClick().catch(e => ({ success: false, device: 'zwift-click', error: e })),
                this.connectKickr().catch(e => ({ success: false, device: 'kickr', error: e })),
                this.connectHeartRateMonitor().catch(e => ({ success: false, device: 'hrm', error: e }))
            ];
            
            const connectionResults = await Promise.all(connectionPromises);
            results.push(...connectionResults);
            
            const successfulConnections = results.filter(r => r.success);
            const failedConnections = results.filter(r => !r.success);
            
            logger.info(`✅ Connected ${successfulConnections.length} devices, ${failedConnections.length} failed`);
            
            return {
                success: successfulConnections.length > 0,
                connected: successfulConnections,
                failed: failedConnections,
                totalDevices: results.length
            };
            
        } catch (error) {
            logger.error('❌ Failed to connect all devices:', error);
            return { success: false, error: error.message, results };
        }
    }

    // ============================================================================
    // STRAVA INTEGRATION METHODS
    // ============================================================================
    
    async connectStrava() {
        try {
            logger.info('🔗 Connecting to Strava...');
            this.updateConnectionStatus('strava', 'connecting');
            
            const result = await this.stravaManager.connect();
            
            if (result.success) {
                this.updateConnectionStatus('strava', 'connected');
                this.autoUploadToStrava = true;
                return result;
            }
            
        } catch (error) {
            this.updateConnectionStatus('strava', 'error', error.message);
            throw error;
        }
    }

    async disconnectStrava() {
        try {
            await this.stravaManager.disconnect();
            this.updateConnectionStatus('strava', 'disconnected');
            this.autoUploadToStrava = false;
            
        } catch (error) {
            logger.error('❌ Failed to disconnect Strava:', error);
        }
    }

    async uploadCurrentSessionToStrava(options = {}) {
        try {
            if (!this.currentSession) {
                throw new Error('No active session to upload');
            }
            
            if (!this.stravaManager.isConnectedToStrava()) {
                throw new Error('Not connected to Strava');
            }
            
            logger.info('📤 Uploading current session to Strava...');
            
            const result = await this.stravaManager.uploadActivity(this.currentSession, options);
            
            if (result.success) {
                this.currentSession.stravaActivityId = result.activityId;
                logger.info(`✅ Session uploaded to Strava: ${result.activityId}`);
            }
            
            return result;
            
        } catch (error) {
            logger.error('❌ Failed to upload session to Strava:', error);
            throw error;
        }
    }

    // ============================================================================
    // SESSION MANAGEMENT & UI METHODS
    // ============================================================================
    
    async startTrainingSession(workoutType = 'free-ride', workoutData = null) {
        try {
            if (this.currentSession) {
                throw new Error('Session already in progress');
            }
            
            logger.info(`🚴 Starting ${workoutType} session...`);
            
            const sessionData = {
                workoutType,
                workoutData,
                startTime: new Date().toISOString(),
                connectedDevices: Array.from(this.connectedDevices.keys()),
                metrics: { ...this.liveMetrics },
                dataPoints: []
            };
            
            this.currentSession = await this.sessionManager.startSession(sessionData);
            this.startMetricsCollection();
            this.updateSessionUI('started');
            
            logger.info(`✅ Training session started: ${this.currentSession.id}`);
            return this.currentSession;
            
        } catch (error) {
            logger.error('❌ Failed to start training session:', error);
            throw error;
        }
    }

    async endTrainingSession() {
        try {
            if (!this.currentSession) {
                throw new Error('No active session to end');
            }
            
            logger.info('🏁 Ending training session...');
            
            this.stopMetricsCollection();
            const finalMetrics = this.calculateSessionMetrics();
            
            const completedSession = await this.sessionManager.endSession(this.currentSession.id, {
                endTime: new Date().toISOString(),
                finalMetrics,
                totalDataPoints: this.currentSession.dataPoints?.length || 0
            });
            
            // Auto-upload to Strava if enabled
            if (this.autoUploadToStrava && this.stravaManager.isConnectedToStrava()) {
                try {
                    await this.uploadCurrentSessionToStrava();
                } catch (stravaError) {
                    logger.warn('⚠️ Failed to auto-upload to Strava:', stravaError.message);
                }
            }
            
            this.updateSessionUI('ended');
            this.currentSession = null;
            
            return { success: true, session: completedSession };
            
        } catch (error) {
            logger.error('❌ Failed to end training session:', error);
            throw error;
        }
    }

    initializeUI() {
        // Cache UI elements
        this.uiElements = new Map([
            ['zwift-status', document.getElementById('zwift-status')],
            ['zwift-status-text', document.getElementById('zwift-status-text')],
            ['kickr-status', document.getElementById('kickr-status')],
            ['kickr-status-text', document.getElementById('kickr-status-text')],
            ['hrm-status', document.getElementById('hrm-status')],
            ['hrm-status-text', document.getElementById('hrm-status-text')],
            ['strava-status', document.getElementById('strava-status')],
            ['strava-status-text', document.getElementById('strava-status-text')],
            ['heart-rate-display', document.getElementById('heart-rate-display')],
            ['power-display', document.getElementById('power-display')],
            ['gear-display', document.getElementById('gear-display')],
            ['start-session-btn', document.getElementById('start-session-btn')],
            ['end-session-btn', document.getElementById('end-session-btn')]
        ]);
        
        this.setupUIEventListeners();
        logger.info('✅ UI initialized');
    }

    setupUIEventListeners() {
        // Connection buttons
        const addClickListener = (btnId, handler) => {
            const btn = document.getElementById(btnId);
            if (btn) btn.addEventListener('click', handler);
        };

        addClickListener('connect-zwift-btn', () => this.connectZwiftClick());
        addClickListener('connect-kickr-btn', () => this.connectKickr());
        addClickListener('connect-hrm-btn', () => this.connectHeartRateMonitor());
        addClickListener('connect-strava-btn', () => this.connectStrava());
        addClickListener('connect-all-btn', () => this.connectAllDevices());
        addClickListener('start-session-btn', () => this.startTrainingSession());
        addClickListener('end-session-btn', () => this.endTrainingSession());
        addClickListener('upload-strava-btn', () => this.uploadCurrentSessionToStrava());
    }

    updateConnectionStatus(deviceType, status, message = '') {
        const statusEl = this.uiElements.get(`${deviceType}-status`);
        const textEl = this.uiElements.get(`${deviceType}-status-text`);
        
        if (statusEl) {
            const colors = {
                'connected': '#28a745',
                'connecting': '#ffc107', 
                'error': '#dc3545',
                'disconnected': '#dc3545'
            };
            statusEl.style.background = colors[status] || '#6c757d';
        }
        
        if (textEl) {
            const statusText = {
                'connected': 'Connected',
                'connecting': 'Connecting...',
                'error': 'Error',
                'disconnected': 'Disconnected'
            };
            textEl.textContent = statusText[status] || 'Unknown';
        }
        
        if (message) {
            this.showNotification(status === 'error' ? 'error' : 'success', message);
        }
    }

    updateSessionUI(status) {
        const startBtn = this.uiElements.get('start-session-btn');
        const endBtn = this.uiElements.get('end-session-btn');
        
        if (status === 'started') {
            if (startBtn) startBtn.disabled = true;
            if (endBtn) endBtn.disabled = false;
        } else if (status === 'ended') {
            if (startBtn) startBtn.disabled = false;
            if (endBtn) endBtn.disabled = true;
        }
    }

    showNotification(type, message, duration = 5000) {
        console.log(`${type.toUpperCase()}: ${message}`);
        // Create notification UI element if it doesn't exist
        let notification = document.getElementById('app-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'app-notification';
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 9999;
                padding: 12px 24px; border-radius: 6px; color: white;
                font-weight: 500; opacity: 0; transition: opacity 0.3s;
            `;
            document.body.appendChild(notification);
        }
        
        const colors = {
            success: '#28a745',
            error: '#dc3545', 
            info: '#17a2b8',
            warning: '#ffc107'
        };
        
        notification.style.background = colors[type] || colors.info;
        notification.textContent = message;
        notification.style.opacity = '1';
        
        setTimeout(() => {
            notification.style.opacity = '0';
        }, duration);
    }

    // Event handlers
    handleZwiftClickConnected(data) {
        logger.info(`🎮 Zwift Click connected: ${data.deviceName}`);
        this.showNotification('success', `Zwift Click connected: ${data.deviceName}`);
    }

    handleGearChange(data) {
        this.liveMetrics.gear = data.currentGear;
        this.liveMetrics.resistance = data.resistance;
        
        const gearDisplay = this.uiElements.get('gear-display');
        if (gearDisplay) {
            gearDisplay.textContent = data.currentGear;
        }
        
        this.applyResistanceToTrainer(data.resistance);
    }

    handleKickrConnected(data) {
        logger.info(`⚡ Kickr connected: ${data.deviceName}`);
        this.showNotification('success', `Kickr connected: ${data.deviceName}`);
    }

    handleHRMConnected(data) {
        logger.info(`❤️ HRM connected: ${data.deviceName}`);
        this.showNotification('success', `Heart Rate Monitor connected: ${data.deviceName}`);
    }

    handleStravaConnected(athlete) {
        logger.info(`🔗 Strava connected: ${athlete.firstname} ${athlete.lastname}`);
        this.showNotification('success', `Strava connected: ${athlete.firstname}`);
    }

    handleStravaDisconnected() {
        logger.info('🔗 Strava disconnected');
        this.showNotification('info', 'Strava disconnected');
    }

    handleActivityUploaded(data) {
        logger.info(`📤 Activity uploaded: ${data.stravaActivityId}`);
        this.showNotification('success', 'Activity uploaded to Strava!');
    }

    handleSessionStarted(session) {
        logger.info(`🚴 Session started: ${session.id}`);
        this.showNotification('info', 'Training session started');
    }

    handleSessionEnded(session) {
        logger.info(`🏁 Session ended: ${session.id}`);
        this.showNotification('success', 'Training session completed');
    }

    // Utility methods
    updateMetric(metricName, value) {
        if (this.liveMetrics.hasOwnProperty(metricName)) {
            this.liveMetrics[metricName] = value;
            this.updateMetricDisplay(metricName, value);
        }
    }

    updateMetricDisplay(metricName, value) {
        const elementId = `${metricName.toLowerCase().replace(/([A-Z])/g, '-$1')}-display`;
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.formatMetricValue(metricName, value);
        }
    }

    formatMetricValue(metricName, value) {
        switch (metricName) {
            case 'heartRate': return `${Math.round(value)} bpm`;
            case 'power': return `${Math.round(value)}W`;
            case 'cadence': return `${Math.round(value)} rpm`;
            case 'speed': return `${value.toFixed(1)} km/h`;
            case 'resistance': return `${value}%`;
            case 'gear': return `${value}`;
            default: return String(value);
        }
    }

    startMetricsCollection() {
        this.updateInterval = setInterval(() => {
            if (this.currentSession) {
                const dataPoint = {
                    timestamp: new Date().toISOString(),
                    ...this.liveMetrics
                };
                
                if (!this.currentSession.dataPoints) {
                    this.currentSession.dataPoints = [];
                }
                this.currentSession.dataPoints.push(dataPoint);
                
                // Update duration
                const startTime = new Date(this.currentSession.startTime);
                this.liveMetrics.duration = Math.floor((new Date() - startTime) / 1000);
                
                this.updateMetricsUI();
            }
        }, 1000);
    }

    stopMetricsCollection() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateMetricsUI() {
        Object.entries(this.liveMetrics).forEach(([metric, value]) => {
            this.updateMetricDisplay(metric, value);
        });
    }

    calculateSessionMetrics() {
        return this.liveMetrics; // Simplified for now
    }

    applyResistanceToTrainer(resistancePercent) {
        const resistanceSlider = document.getElementById('kickr-resistance-slider');
        if (resistanceSlider) {
            resistanceSlider.value = resistancePercent;
            resistanceSlider.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Public API
    getAppStatus() {
        return {
            initialized: this.isInitialized,
            sessionActive: !!this.currentSession,
            connectedDevices: Array.from(this.connectedDevices.keys()),
            stravaConnected: this.stravaManager?.isConnectedToStrava() || false,
            metrics: { ...this.liveMetrics }
        };
    }

    async cleanup() {
        if (this.currentSession) await this.endTrainingSession();
        this.stopMetricsCollection();
        if (this.connectionManager) await this.connectionManager.disconnectAll();
    }
}

// Global initialization
let cyclingApp = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const firebaseManager = window.firebaseManager || null;
        cyclingApp = new IntegratedCyclingApp(firebaseManager);
        window.cyclingApp = cyclingApp;
        
        logger.info('🚀 Integrated Cycling Training App is ready!');
        
    } catch (error) {
        logger.error('❌ Failed to initialize app:', error);
    }
});

window.addEventListener('beforeunload', async () => {
    if (cyclingApp) await cyclingApp.cleanup();
});