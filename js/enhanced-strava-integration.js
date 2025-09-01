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
                this.autoUploadToStrava = true; // Enable auto-upload on successful connection
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
    // SESSION MANAGEMENT
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
            
            // Start metrics collection
            this.startMetricsCollection();
            
            // Update UI
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
            
            // Stop metrics collection
            this.stopMetricsCollection();
            
            // Calculate final metrics
            const finalMetrics = this.calculateSessionMetrics();
            
            // End session in session manager
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
            
            // Update UI
            this.updateSessionUI('ended');
            
            const sessionSummary = {
                id: completedSession.id,
                duration: finalMetrics.duration,
                distance: finalMetrics.distance,
                avgPower: finalMetrics.avgPower,
                maxPower: finalMetrics.maxPower,
                avgHeartRate: finalMetrics.avgHeartRate,
                totalEnergy: finalMetrics.totalEnergy
            };
            
            logger.info('✅ Training session completed:', sessionSummary);
            
            // Clear current session
            this.currentSession = null;
            
            return { success: true, session: completedSession, summary: sessionSummary };
            
        } catch (error) {
            logger.error('❌ Failed to end training session:', error);
            throw error;
        }
    }

    startMetricsCollection() {
        // Collect metrics every second
        this.updateInterval = setInterval(() => {
            if (this.currentSession) {
                const dataPoint = {
                    timestamp: new Date().toISOString(),
                    ...this.liveMetrics
                };
                
                // Add to session data points
                if (!this.currentSession.dataPoints) {
                    this.currentSession.dataPoints = [];
                }
                this.currentSession.dataPoints.push(dataPoint);
                
                // Update session duration
                const startTime = new Date(this.currentSession.startTime);
                const now = new Date();
                this.liveMetrics.duration = Math.floor((now - startTime) / 1000);
                
                // Update distance (simple calculation)
                if (this.liveMetrics.speed > 0) {
                    this.liveMetrics.distance += (this.liveMetrics.speed / 3600); // km per second
                }
                
                // Update energy (simple calculation)
                if (this.liveMetrics.power > 0) {
                    this.liveMetrics.energy += (this.liveMetrics.power / 1000); // kJ per second
                }
                
                // Update UI
                this.updateMetricsUI();
            }
        }, 1000);
        
        logger.info('📊 Metrics collection started');
    }

    stopMetricsCollection() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            logger.info('📊 Metrics collection stopped');
        }
    }

    calculateSessionMetrics() {
        if (!this.currentSession?.dataPoints) {
            return this.liveMetrics;
        }
        
        const dataPoints = this.currentSession.dataPoints;
        const metrics = {
            duration: this.liveMetrics.duration,
            distance: this.liveMetrics.distance,
            totalEnergy: this.liveMetrics.energy,
            avgPower: 0,
            maxPower: 0,
            avgHeartRate: 0,
            maxHeartRate: 0,
            avgCadence: 0,
            avgSpeed: 0,
            normalizedPower: 0,
            intensityFactor: 0,
            trainingStressScore: 0
        };
        
        if (dataPoints.length === 0) return metrics;
        
        // Calculate averages and maximums
        let totalPower = 0, totalHR = 0, totalCadence = 0, totalSpeed = 0;
        let powerCount = 0, hrCount = 0, cadenceCount = 0, speedCount = 0;
        
        dataPoints.forEach(point => {
            if (point.power > 0) {
                totalPower += point.power;
                powerCount++;
                metrics.maxPower = Math.max(metrics.maxPower, point.power);
            }
            
            if (point.heartRate > 0) {
                totalHR += point.heartRate;
                hrCount++;
                metrics.maxHeartRate = Math.max(metrics.maxHeartRate, point.heartRate);
            }
            
            if (point.cadence > 0) {
                totalCadence += point.cadence;
                cadenceCount++;
            }
            
            if (point.speed > 0) {
                totalSpeed += point.speed;
                speedCount++;
            }
        });
        
        metrics.avgPower = powerCount > 0 ? Math.round(totalPower / powerCount) : 0;
        metrics.avgHeartRate = hrCount > 0 ? Math.round(totalHR / hrCount) : 0;
        metrics.avgCadence = cadenceCount > 0 ? Math.round(totalCadence / cadenceCount) : 0;
        metrics.avgSpeed = speedCount > 0 ? Math.round((totalSpeed / speedCount) * 10) / 10 : 0;
        
        // Calculate normalized power (simplified)
        if (powerCount > 0) {
            const powerSum = dataPoints.reduce((sum, point) => sum + Math.pow(point.power || 0, 4), 0);
            metrics.normalizedPower = Math.round(Math.pow(powerSum / powerCount, 0.25));
        }
        
        return metrics;
    }

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================
    
    handleZwiftClickConnected(data) {
        logger.info(`🎮 Zwift Click connected: ${data.deviceName}`);
        this.updateDeviceStatus('zwift-click', 'connected', data.deviceName);
    }

    handleGearChange(data) {
        this.liveMetrics.gear = data.currentGear;
        this.liveMetrics.resistance = data.resistance;
        
        logger.info(`🎮 Gear changed: ${data.direction} → Gear ${data.currentGear} (${data.resistance}%)`);
        
        // Update UI
        this.updateGearUI(data);
        
        // Apply resistance to trainer if connected
        this.applyResistanceToTrainer(data.resistance);
    }

    handleKickrConnected(data) {
        logger.info(`⚡ Kickr connected: ${data.deviceName}`);
        this.updateDeviceStatus('kickr', 'connected', data.deviceName);
    }

    handleHRMConnected(data) {
        logger.info(`❤️ Heart Rate Monitor connected: ${data.deviceName}`);
        this.updateDeviceStatus('hrm', 'connected', data.deviceName);
    }

    handleStravaConnected(athlete) {
        logger.info(`🔗 Strava connected: ${athlete.firstname} ${athlete.lastname}`);
        this.updateStravaUI('connected', athlete);
    }

    handleStravaDisconnected() {
        logger.info('🔗 Strava disconnected');
        this.updateStravaUI('disconnected');
    }

    handleActivityUploaded(data) {
        logger.info(`📤 Activity uploaded to Strava: ${data.stravaActivityId}`);
        this.showNotification('success', `Activity uploaded to Strava successfully!`);
    }

    handleSessionStarted(session) {
        logger.info(`🚴 Training session started: ${session.id}`);
        this.showNotification('info', `Training session started`);
    }

    handleSessionEnded(session) {
        logger.info(`🏁 Training session ended: ${session.id}`);
        this.showNotification('success', `Training session completed`);
    }

    // ============================================================================
    // UI UPDATE METHODS
    // ============================================================================
    
    initializeUI() {
        // Cache UI elements for performance
        this.uiElements = new Map([
            // Device status elements
            ['zwift-status', document.getElementById('zwift-status')],
            ['zwift-status-text', document.getElementById('zwift-status-text')],
            ['kickr-status', document.getElementById('kickr-status')],
            ['kickr-status-text', document.getElementById('kickr-status-text')],
            ['hrm-status', document.getElementById('hrm-status')],
            ['hrm-status-text', document.getElementById('hrm-status-text')],
            ['strava-status', document.getElementById('strava-status')],
            ['strava-status-text', document.getElementById('strava-status-text')],
            
            // Metrics displays
            ['heart-rate-display', document.getElementById('heart-rate-display')],
            ['power-display', document.getElementById('power-display')],
            ['cadence-display', document.getElementById('cadence-display')],
            ['speed-display', document.getElementById('speed-display')],
            ['resistance-display', document.getElementById('resistance-display')],
            ['gear-display', document.getElementById('gear-display')],
            ['duration-display', document.getElementById('duration-display')],
            ['distance-display', document.getElementById('distance-display')],
            ['energy-display', document.getElementById('energy-display')],
            
            // Session controls
            ['start-session-btn', document.getElementById('start-session-btn')],
            ['end-session-btn', document.getElementById('end-session-btn')],
            ['upload-strava-btn', document.getElementById('upload-strava-btn')],
            
            // Connection buttons
            ['connect-zwift-btn', document.getElementById('connect-zwift-btn')],
            ['connect-kickr-btn', document.getElementById('connect-kickr-btn')],
            ['connect-hrm-btn', document.getElementById('connect-hrm-btn')],
            ['connect-strava-btn', document.getElementById('connect-strava-btn')],
            ['connect-all-btn', document.getElementById('connect-all-btn')]
        ]);
        
        // Set up event listeners for UI controls
        this.setupUIEventListeners();
        
        logger.info('✅ UI initialized');
    }

    setupUIEventListeners() {
        // Device connection buttons
        const connectZwiftBtn = this.uiElements.get('connect-zwift-btn');
        if (connectZwiftBtn) {
            connectZwiftBtn.addEventListener('click', () => this.connectZwiftClick());
        }
        
        const connectKickrBtn = this.uiElements.get('connect-kickr-btn');
        if (connectKickrBtn) {
            connectKickrBtn.addEventListener('click', () => this.connectKickr());
        }
        
        const connectHrmBtn = this.uiElements.get('connect-hrm-btn');
        if (connectHrmBtn) {
            connectHrmBtn.addEventListener('click', () => this.connectHeartRateMonitor());
        }
        
        const connectStravaBtn = this.uiElements.get('connect-strava-btn');
        if (connectStravaBtn) {
            connectStravaBtn.addEventListener('click', () => this.connectStrava());
        }
        
        const connectAllBtn = this.uiElements.get('connect-all-btn');
        if (connectAllBtn) {
            connectAllBtn.addEventListener('click', () => this.connectAllDevices());
        }
        
        // Session control buttons
        const startSessionBtn = this.uiElements.get('start-session-btn');
        if (startSessionBtn) {
            startSessionBtn.addEventListener('click', () => this.startTrainingSession());
        }
        
        const endSessionBtn = this.uiElements.get('end-session-btn');
        if (endSessionBtn) {
            endSessionBtn.addEventListener('click', () => this.endTrainingSession());
        }
        
        const uploadStravaBtn = this.uiElements.get('upload-strava-btn');
        if (uploadStravaBtn) {
            uploadStravaBtn.addEventListener('click', () => this.uploadCurrentSessionToStrava());
        }
    }

    updateMetric(metricName, value) {
        if (this.liveMetrics.hasOwnProperty(metricName)) {
            this.liveMetrics[metricName] = value;
            this.updateSingleMetricUI(metricName, value);
        }
    }

    updateSingleMetricUI(metricName, value) {
        const elementId = `${metricName.toLowerCase().replace(/([A-Z])/g, '-$1')}-display`;
        const element = document.getElementById(elementId);
        
        if (element) {
            element.textContent = this.formatMetricValue(metricName, value);
        }
    }

    updateMetricsUI() {
        Object.entries(this.liveMetrics).forEach(([metric, value]) => {
            this.updateSingleMetricUI(metric, value);
        });
    }

    formatMetricValue(metricName, value) {
        switch (metricName) {
            case 'heartRate':
                return `${Math.round(value)} bpm`;
            case 'power':
                return `${Math.round(value)}W`;
            case 'cadence':
                return `${Math.round(value)} rpm`;
            case 'speed':
                return `${value.toFixed(1)} km/h`;
            case 'resistance':
                return `${value}%`;
            case 'gear':
                return `${value}`;
            case 'duration':
                return this.formatDuration(value);
            case 'distance':
                return `${value.toFixed(2)} km`;
            case 'energy':
                return `${Math.round(value)} kJ`;
            default:
                return String(value);
        }
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    updateConnectionStatus(deviceType, status, message = '') {
        const statusElement = this.uiElements.get(`${deviceType}-status`);
        const textElement = this.uiElements.get(`${deviceType}-status-text`);
        
        if (statusElement) {
            statusElement.className = `status-indicator ${status}`;
            
            switch (status) {
                case 'connected':
                    statusElement.style.background = '#28a745';
                    break;
                case 'connecting':
                    statusElement.style.background = '#ffc107';
                    break;
                case 'error':
                case 'disconnected':
                    statusElement.style.background = '#dc3545';
                    break;
                default:
                    statusElement.style.background = '#6c757d';
            }
        }
        
        if (textElement) {
            const statusText = {
                'connected': 'Connected',
                'connecting': 'Connecting...',
                'error': 'Error',
                'disconnected': 'Disconnected'
            };
            
            textElement.textContent = statusText[status] || 'Unknown';
        }
        
        // Show message if provided
        if (message && (status === 'error' || status === 'connected')) {
            this.showNotification(status === 'error' ? 'error' : 'success', message);
        }
    }

    updateGearUI(gearData) {
        const gearDisplay = this.uiElements.get('gear-display');
        if (gearDisplay) {
            gearDisplay.textContent = gearData.currentGear;
        }
        
        // Add visual feedback for gear changes
        this.showGearChangeEffect(gearData.direction);
    }

    showGearChangeEffect(direction) {
        // Add visual feedback for gear changes
        const gearDisplay = this.uiElements.get('gear-display');
        if (gearDisplay) {
            gearDisplay.style.transform = 'scale(1.2)';
            gearDisplay.style.color = direction === 'up' ? '#28a745' : '#ffc107';
            
            setTimeout(() => {
                gearDisplay.style.transform = '';
                gearDisplay.style.color = '';
            }, 300);
        }
    }

    updateStravaUI(status, athlete = null) {
        const stravaStatus = this.uiElements.get('strava-status');
        const stravaText = this.uiElements.get('strava-status-text');
        
        if (status === 'connected' && athlete) {
            if (stravaStatus) stravaStatus.style.background = '#fc5200'; // Strava orange
            if (stravaText) stravaText.textContent = `Connected: ${athlete.firstname}`;
        } else {
            if (stravaStatus) stravaStatus.style.background = '#6c757d';
            if (stravaText) stravaText.textContent = 'Not Connected';
        }
    }

    showNotification(type, message, duration = 5000) {
        // Create or update notification element
        let notification = document.getElementById('app-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'app-notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.className = `notification ${type} show`;
        notification.textContent = message;
        
        // Auto-hide after duration
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }

    applyResistanceToTrainer(resistancePercent) {
        const kickrHandler = this.connectedDevices.get('kickr');
        if (kickrHandler && typeof kickrHandler.setResistance === 'function') {
            kickrHandler.setResistance(resistancePercent);
        } else {
            // Update UI resistance slider if no direct trainer control
            const resistanceSlider = document.getElementById('kickr-resistance-slider');
            if (resistanceSlider) {
                resistanceSlider.value = resistancePercent;
                resistanceSlider.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    // Getter methods
    isAppInitialized() {
        return this.isInitialized;
    }

    getCurrentSession() {
        return this.currentSession;
    }

    getLiveMetrics() {
        return { ...this.liveMetrics };
    }

    getConnectedDevices() {
        return Array.from(this.connectedDevices.keys());
    }

    isDeviceConnected(deviceType) {
        return this.connectedDevices.has(deviceType);
    }

    isStravaConnected() {
        return this.stravaManager?.isConnectedToStrava() || false;
    }

    getAppStatus() {
        return {
            initialized: this.isInitialized,
            sessionActive: !!this.currentSession,
            connectedDevices: this.getConnectedDevices(),
            stravaConnected: this.isStravaConnected(),
            metrics: this.getLiveMetrics()
        };
    }

    // Settings methods
    setAutoUploadToStrava(enabled) {
        this.autoUploadToStrava = enabled;
        logger.info(`Auto-upload to Strava: ${enabled ? 'enabled' : 'disabled'}`);
    }

    setAutoSaveToFirebase(enabled) {
        this.autoSaveToFirebase = enabled;
        logger.info(`Auto-save to Firebase: ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Cleanup method
    async cleanup() {
        logger.info('🧹 Cleaning up Integrated Cycling App...');
        
        // Stop any active session
        if (this.currentSession) {
            await this.endTrainingSession();
        }
        
        // Stop metrics collection
        this.stopMetricsCollection();
        
        // Disconnect all devices
        if (this.connectionManager) {
            await this.connectionManager.disconnectAll();
        }
        
        // Clear intervals and listeners
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        logger.info('✅ Cleanup completed');
    }
}

// Global app instance for easy access
let cyclingApp = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Firebase manager (assuming it exists)
        const firebaseManager = window.firebaseManager || null;
        
        // Create integrated app
        cyclingApp = new IntegratedCyclingApp(firebaseManager);
        
        // Make globally accessible
        window.cyclingApp = cyclingApp;
        
        logger.info('🚀 Integrated Cycling Training App is ready!');
        
    } catch (error) {
        logger.error('❌ Failed to initialize app on DOM ready:', error);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', async () => {
    if (cyclingApp) {
        await cyclingApp.cleanup();
    }
});

/**
 * Enhanced Strava Integration Manager
 * Professional Strava API integration with Firebase backend and advanced session handling
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from '../core/logger.js';

export class EnhancedStravaManager extends EventEmitter {
    constructor(firebaseManager) {
        super();
        this.firebaseManager = firebaseManager;
        
        // Strava API Configuration
        this.clientId = process.env.STRAVA_CLIENT_ID || 'your-strava-client-id';
        this.clientSecret = process.env.STRAVA_CLIENT_SECRET || 'your-strava-client-secret';
        this.redirectUri = `${window.location.origin}/auth/strava/callback`;
        
        // API Endpoints
        this.baseUrl = 'https://www.strava.com/api/v3';
        this.authUrl = 'https://www.strava.com/oauth/authorize';
        this.tokenUrl = 'https://www.strava.com/oauth/token';
        this.deauthorizeUrl = 'https://www.strava.com/oauth/deauthorize';
        
        // Connection State
        this.isConnected = false;
        this.athleteData = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresAt = null;
        
        // Rate limiting
        this.lastApiCall = 0;
        this.minApiInterval = 100; // 100ms between calls
        this.dailyLimit = 1000;
        this.hourlyLimit = 100;
        this.apiCallCount = { daily: 0, hourly: 0 };
        
        // Auto-sync settings
        this.autoSync = false;
        this.syncQueue = [];
        this.syncInProgress = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            // Load existing tokens from Firebase
            await this.loadStoredTokens();
            
            // Validate existing connection
            if (this.accessToken) {
                const isValid = await this.validateToken();
                if (isValid) {
                    logger.info('✅ Existing Strava connection validated');
                    this.emit('connected', this.athleteData);
                } else {
                    logger.info('⚠️ Stored Strava tokens invalid, clearing...');
                    await this.clearStoredTokens();
                }
            }
            
            // Set up periodic token refresh
            this.setupTokenRefreshTimer();
            
            logger.info('🚀 Enhanced Strava Manager initialized');
            
        } catch (error) {
            logger.error('❌ Failed to initialize Strava Manager:', error);
        }
    }

    // ============================================================================
    // OAUTH AUTHENTICATION FLOW
    // ============================================================================
    
    async connect(customScopes = null) {
        try {
            // Check if already connected and valid
            if (this.isConnected && await this.validateToken()) {
                logger.info('✅ Already connected to Strava');
                return { success: true, existing: true };
            }

            // Define required scopes
            const defaultScopes = [
                'read',
                'activity:read',
                'activity:write',
                'profile:read_all'
            ];
            
            const scopes = customScopes || defaultScopes;
            const scope = scopes.join(',');
            const state = this.generateSecureState();
            
            // Store state for CSRF protection
            sessionStorage.setItem('strava_oauth_state', state);
            sessionStorage.setItem('strava_oauth_timestamp', Date.now().toString());
            
            const authUrl = `${this.authUrl}?` +
                `client_id=${this.clientId}&` +
                `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
                `response_type=code&` +
                `approval_prompt=auto&` +
                `scope=${scope}&` +
                `state=${state}`;
            
            logger.info('🔗 Starting Strava OAuth flow...');
            
            // Handle different environments
            if (this.isElectronApp()) {
                return await this.handleElectronOAuth(authUrl);
            } else {
                return await this.handleWebOAuth(authUrl);
            }
            
        } catch (error) {
            logger.error('❌ Strava connection failed:', error);
            this.emit('connection-error', error);
            throw error;
        }
    }

    async handleWebOAuth(authUrl) {
        return new Promise((resolve, reject) => {
            // Open OAuth popup with optimized settings
            const popup = window.open(
                authUrl, 
                'strava-auth', 
                'width=700,height=800,scrollbars=yes,resizable=yes,status=yes,location=yes'
            );
            
            if (!popup) {
                reject(new Error('Popup blocked. Please allow popups for this site.'));
                return;
            }
            
            // Monitor popup state
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    reject(new Error('Authorization cancelled by user'));
                }
            }, 1000);

            // Handle OAuth callback
            const messageHandler = async (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'strava-oauth-callback') {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    
                    try {
                        const result = await this.handleOAuthCallback(event.data);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }
            };

            window.addEventListener('message', messageHandler);
            
            // Timeout handling
            setTimeout(() => {
                if (!popup.closed) {
                    clearInterval(checkClosed);
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    reject(new Error('OAuth flow timeout'));
                }
            }, 300000); // 5 minute timeout
        });
    }

    async handleElectronOAuth(authUrl) {
        // Implementation for Electron apps
        const { shell } = require('electron');
        shell.openExternal(authUrl);
        
        // Set up local server to handle callback
        // This would require additional setup in Electron environment
        throw new Error('Electron OAuth not implemented yet');
    }

    async handleOAuthCallback(data) {
        try {
            if (data.error) {
                throw new Error(`Strava authorization failed: ${data.error_description || data.error}`);
            }

            if (!data.code) {
                throw new Error('Authorization code not received');
            }

            // Validate state parameter (CSRF protection)
            const storedState = sessionStorage.getItem('strava_oauth_state');
            const storedTimestamp = sessionStorage.getItem('strava_oauth_timestamp');
            
            if (!storedState || data.state !== storedState) {
                throw new Error('Invalid OAuth state - possible CSRF attack');
            }
            
            // Check timestamp to prevent replay attacks (within 10 minutes)
            if (Date.now() - parseInt(storedTimestamp) > 600000) {
                throw new Error('OAuth state expired');
            }
            
            // Clean up stored state
            sessionStorage.removeItem('strava_oauth_state');
            sessionStorage.removeItem('strava_oauth_timestamp');

            // Exchange authorization code for tokens
            const tokenData = await this.exchangeCodeForTokens(data.code);
            
            // Store tokens and athlete data
            await this.saveTokens(tokenData);
            
            this.isConnected = true;
            this.athleteData = tokenData.athlete;
            
            logger.info(`✅ Connected to Strava: ${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`);
            this.emit('connected', this.athleteData);
            
            return { success: true, athlete: this.athleteData };
            
        } catch (error) {
            logger.error('❌ OAuth callback handling failed:', error);
            this.emit('connection-error', error);
            throw error;
        }
    }

    async exchangeCodeForTokens(authCode) {
        try {
            const response = await this.makeApiCall(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code: authCode,
                    grant_type: 'authorization_code'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`Token exchange failed: ${errorData?.message || response.statusText}`);
            }

            const tokenData = await response.json();
            
            // Validate response
            if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.athlete) {
                throw new Error('Invalid token response from Strava');
            }

            return tokenData;
            
        } catch (error) {
            logger.error('❌ Token exchange failed:', error);
            throw error;
        }
    }

    // ============================================================================
    // TOKEN MANAGEMENT
    // ============================================================================
    
    async validateToken() {
        if (!this.accessToken) {
            return false;
        }
        
        // Check if token is expired
        if (this.expiresAt && Date.now() >= this.expiresAt) {
            logger.info('🔄 Access token expired, refreshing...');
            return await this.refreshAccessToken();
        }
        
        // Validate token with a simple API call
        try {
            const athlete = await this.getAthleteProfile();
            return athlete !== null;
        } catch (error) {
            logger.warn('⚠️ Token validation failed:', error.message);
            return await this.refreshAccessToken();
        }
    }

    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('No refresh token available');
            }

            logger.info('🔄 Refreshing Strava access token...');

            const response = await this.makeApiCall(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`Token refresh failed: ${errorData?.message || response.statusText}`);
            }

            const tokenData = await response.json();
            
            // Update stored tokens
            await this.updateTokens({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: tokenData.expires_at
            });

            logger.info('✅ Access token refreshed successfully');
            return true;
            
        } catch (error) {
            logger.error('❌ Token refresh failed:', error);
            this.isConnected = false;
            this.emit('token-refresh-failed', error);
            return false;
        }
    }

    setupTokenRefreshTimer() {
        // Set up automatic token refresh 30 minutes before expiration
        const checkInterval = 60000; // Check every minute
        
        setInterval(() => {
            if (this.expiresAt && this.accessToken) {
                const timeUntilExpiry = this.expiresAt - Date.now();
                const thirtyMinutes = 30 * 60 * 1000;
                
                if (timeUntilExpiry <= thirtyMinutes && timeUntilExpiry > 0) {
                    this.refreshAccessToken().catch(error => {
                        logger.error('❌ Automatic token refresh failed:', error);
                    });
                }
            }
        }, checkInterval);
    }

    // ============================================================================
    // SESSION & ACTIVITY MANAGEMENT
    // ============================================================================
    
    async uploadActivity(sessionData, options = {}) {
        try {
            if (!this.isConnected || !await this.validateToken()) {
                throw new Error('Not connected to Strava or token invalid');
            }

            // Check if already uploaded
            if (sessionData.stravaActivityId) {
                logger.info(`Activity already uploaded: ${sessionData.stravaActivityId}`);
                return { success: true, activityId: sessionData.stravaActivityId, existing: true };
            }

            // Rate limiting check
            await this.checkRateLimit();

            // Convert session to Strava activity format
            const activityData = this.convertSessionToStravaActivity(sessionData, options);
            
            logger.info('📤 Uploading activity to Strava...');
            
            const response = await this.makeStravaApiCall('/activities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(activityData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`Activity upload failed: ${errorData?.message || response.statusText}`);
            }

            const uploadedActivity = await response.json();
            
            // Update session with Strava ID in Firebase
            if (this.firebaseManager) {
                await this.firebaseManager.updateSession(sessionData.id, {
                    stravaActivityId: uploadedActivity.id,
                    stravaUploadedAt: new Date().toISOString()
                });
            }
            
            logger.info(`✅ Activity uploaded to Strava: ${uploadedActivity.id}`);
            this.emit('activity-uploaded', {
                sessionId: sessionData.id,
                stravaActivityId: uploadedActivity.id,
                activity: uploadedActivity
            });
            
            return {
                success: true,
                activityId: uploadedActivity.id,
                activity: uploadedActivity
            };
            
        } catch (error) {
            logger.error('❌ Activity upload failed:', error);
            this.emit('activity-upload-error', { sessionData, error });
            throw error;
        }
    }

    convertSessionToStravaActivity(sessionData, options = {}) {
        const metrics = sessionData.metrics || {};
        const startTime = new Date(sessionData.startTime || sessionData.createdAt);
        
        // Activity type mapping
        const activityTypeMap = {
            'endurance': 'Ride',
            'intervals': 'Workout', 
            'recovery': 'Ride',
            'free-ride': 'VirtualRide',
            'custom': 'VirtualRide',
            'race': 'Race'
        };

        // Base activity data
        const activityData = {
            name: options.customName || this.generateActivityName(sessionData),
            type: activityTypeMap[sessionData.workoutType] || 'VirtualRide',
            start_date_local: startTime.toISOString(),
            elapsed_time: Math.round(metrics.duration || sessionData.duration || 0),
            description: options.customDescription || this.generateActivityDescription(sessionData),
            trainer: true,
            commute: false,
            private: options.private || false
        };

        // Distance (convert km to meters)
        if (metrics.distance > 0) {
            activityData.distance = Math.round(metrics.distance * 1000);
        }

        // Power metrics
        if (metrics.avgPower > 0) {
            activityData.average_watts = Math.round(metrics.avgPower);
        }
        if (metrics.maxPower > 0) {
            activityData.max_watts = Math.round(metrics.maxPower);
        }
        if (metrics.normalizedPower > 0) {
            activityData.weighted_average_watts = Math.round(metrics.normalizedPower);
        }

        // Heart rate metrics  
        if (metrics.avgHeartRate > 0) {
            activityData.average_heartrate = Math.round(metrics.avgHeartRate);
        }
        if (metrics.maxHeartRate > 0) {
            activityData.max_heartrate = Math.round(metrics.maxHeartRate);
        }

        // Cadence
        if (metrics.avgCadence > 0) {
            activityData.average_cadence = Math.round(metrics.avgCadence);
        }

        // Calories (convert kJ to kcal if needed)
        if (metrics.totalEnergy > 0) {
            activityData.calories = Math.round(metrics.totalEnergy * 4.184); // kJ to kcal conversion
        }

        return activityData;
    }

    generateActivityName(sessionData) {
        const workoutNames = {
            'endurance': 'Endurance Training',
            'intervals': 'Interval Workout',
            'recovery': 'Recovery Ride',
            'free-ride': 'Free Ride',
            'custom': 'Indoor Training',
            'race': 'Virtual Race'
        };

        const baseName = workoutNames[sessionData.workoutType] || 'Indoor Training';
        const date = new Date(sessionData.startTime || sessionData.createdAt);
        
        // Format: "Interval Workout - Jan 15"
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return `${baseName} - ${dateStr}`;
    }

    generateActivityDescription(sessionData) {
        const metrics = sessionData.metrics || {};
        const duration = Math.round((metrics.duration || 0) / 60);
        
        let description = `Indoor cycling session via ANTicP Training Platform\\n\\n`;
        
        // Basic metrics
        if (duration > 0) description += `Duration: ${duration} minutes\\n`;
        if (metrics.distance > 0) description += `Distance: ${metrics.distance.toFixed(1)} km\\n`;
        if (metrics.avgSpeed > 0) description += `Avg Speed: ${metrics.avgSpeed.toFixed(1)} km/h\\n`;
        
        // Power metrics
        if (metrics.avgPower > 0) description += `Average Power: ${metrics.avgPower}W\\n`;
        if (metrics.maxPower > 0) description += `Max Power: ${metrics.maxPower}W\\n`;
        if (metrics.normalizedPower > 0) description += `Normalized Power: ${metrics.normalizedPower}W\\n`;
        if (metrics.intensityFactor) description += `Intensity Factor: ${metrics.intensityFactor.toFixed(2)}\\n`;
        if (metrics.trainingStressScore > 0) description += `TSS: ${metrics.trainingStressScore}\\n`;
        
        // Heart rate metrics
        if (metrics.avgHeartRate > 0) description += `Avg Heart Rate: ${metrics.avgHeartRate} bpm\\n`;
        if (metrics.maxHeartRate > 0) description += `Max Heart Rate: ${metrics.maxHeartRate} bpm\\n`;
        
        // Energy and cadence
        if (metrics.totalEnergy > 0) description += `Energy: ${metrics.totalEnergy} kJ\\n`;
        if (metrics.avgCadence > 0) description += `Avg Cadence: ${metrics.avgCadence} rpm\\n`;

        // Power zones if available
        if (sessionData.powerZoneDistribution) {
            description += `\\nPower Zone Distribution:\\n`;
            const zones = sessionData.powerZoneDistribution;
            Object.keys(zones).forEach((zone, index) => {
                const minutes = Math.round(zones[zone] / 60);
                if (minutes > 0) {
                    description += `Zone ${index + 1}: ${minutes} min\\n`;
                }
            });
        }

        // Workout details
        if (sessionData.workoutName) {
            description += `\\nWorkout: ${sessionData.workoutName}\\n`;
        }
        
        if (sessionData.notes) {
            description += `\\nNotes: ${sessionData.notes}\\n`;
        }

        return description.trim();
    }

    // ============================================================================
    // API UTILITIES
    // ============================================================================
    
    async makeStravaApiCall(endpoint, options = {}) {
        if (!this.accessToken) {
            throw new Error('No access token available');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            ...options.headers
        };

        return await this.makeApiCall(url, { ...options, headers });
    }

    async makeApiCall(url, options = {}) {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        
        if (timeSinceLastCall < this.minApiInterval) {
            await this.sleep(this.minApiInterval - timeSinceLastCall);
        }
        
        this.lastApiCall = Date.now();

        try {
            const response = await fetch(url, {
                timeout: 30000, // 30 second timeout
                ...options
            });
            
            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || 60;
                logger.warn(`⚠️ Rate limited, retrying after ${retryAfter} seconds`);
                await this.sleep(retryAfter * 1000);
                return await this.makeApiCall(url, options); // Retry
            }
            
            return response;
            
        } catch (error) {
            if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
                throw new Error('API request timed out');
            }
            throw error;
        }
    }

    async checkRateLimit() {
        // Simple rate limiting - can be enhanced with Redis/database storage
        const now = Date.now();
        const hourStart = Math.floor(now / 3600000) * 3600000;
        const dayStart = Math.floor(now / 86400000) * 86400000;
        
        if (this.apiCallCount.hourly >= this.hourlyLimit) {
            const waitTime = hourStart + 3600000 - now;
            throw new Error(`Hourly rate limit exceeded. Wait ${Math.ceil(waitTime / 60000)} minutes.`);
        }
        
        if (this.apiCallCount.daily >= this.dailyLimit) {
            const waitTime = dayStart + 86400000 - now;
            throw new Error(`Daily rate limit exceeded. Wait ${Math.ceil(waitTime / 3600000)} hours.`);
        }
        
        this.apiCallCount.hourly++;
        this.apiCallCount.daily++;
    }

    // ============================================================================
    // DATA PERSISTENCE (Firebase Integration)
    // ============================================================================
    
    async loadStoredTokens() {
        try {
            if (!this.firebaseManager) return;
            
            const tokens = await this.firebaseManager.getStravaTokens();
            if (tokens) {
                this.accessToken = tokens.accessToken;
                this.refreshToken = tokens.refreshToken;
                this.expiresAt = tokens.expiresAt;
                this.isConnected = tokens.connected || false;
                this.athleteData = tokens.athleteData || null;
                
                logger.info('✅ Loaded stored Strava tokens');
            }
        } catch (error) {
            logger.error('❌ Failed to load stored tokens:', error);
        }
    }

    async saveTokens(tokenData) {
        try {
            const tokensToStore = {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: tokenData.expires_at * 1000, // Convert to milliseconds
                athleteData: tokenData.athlete,
                connected: true,
                connectedAt: new Date().toISOString()
            };

            if (this.firebaseManager) {
                await this.firebaseManager.saveStravaTokens(tokensToStore);
            }

            // Update local state
            this.accessToken = tokensToStore.accessToken;
            this.refreshToken = tokensToStore.refreshToken;
            this.expiresAt = tokensToStore.expiresAt;
            this.athleteData = tokensToStore.athleteData;
            this.isConnected = true;

            logger.info('✅ Strava tokens saved successfully');
            
        } catch (error) {
            logger.error('❌ Failed to save tokens:', error);
            throw error;
        }
    }

    async updateTokens(tokenData) {
        try {
            this.accessToken = tokenData.access_token;
            this.refreshToken = tokenData.refresh_token;
            this.expiresAt = tokenData.expires_at * 1000;

            if (this.firebaseManager) {
                await this.firebaseManager.updateStravaTokens({
                    accessToken: this.accessToken,
                    refreshToken: this.refreshToken,
                    expiresAt: this.expiresAt,
                    lastRefreshed: new Date().toISOString()
                });
            }

            logger.info('✅ Strava tokens updated successfully');
            
        } catch (error) {
            logger.error('❌ Failed to update tokens:', error);
        }
    }

    async clearStoredTokens() {
        try {
            if (this.firebaseManager) {
                await this.firebaseManager.removeStravaTokens();
            }

            this.accessToken = null;
            this.refreshToken = null;
            this.expiresAt = null;
            this.athleteData = null;
            this.isConnected = false;

            logger.info('✅ Strava tokens cleared');
            
        } catch (error) {
            logger.error('❌ Failed to clear tokens:', error);
        }
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================
    
    async disconnect() {
        try {
            // Revoke token on Strava's end
            if (this.accessToken) {
                await this.makeApiCall(this.deauthorizeUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            // Clear stored tokens
            await this.clearStoredTokens();
            
            logger.info('✅ Disconnected from Strava successfully');
            this.emit('disconnected');
            
        } catch (error) {
            logger.error('❌ Strava disconnect failed:', error);
            // Still clear local tokens even if revoke fails
            await this.clearStoredTokens();
            this.emit('disconnect-error', error);
        }
    }

    async getAthleteProfile() {
        try {
            if (!this.isConnected || !await this.validateToken()) {
                throw new Error('Not connected to Strava');
            }

            const response = await this.makeStravaApiCall('/athlete');

            if (!response.ok) {
                throw new Error(`Failed to get athlete profile: ${response.statusText}`);
            }

            const athlete = await response.json();
            this.athleteData = athlete;
            
            return athlete;
            
        } catch (error) {
            logger.error('❌ Failed to get athlete profile:', error);
            throw error;
        }
    }

    async getRecentActivities(limit = 10, before = null, after = null) {
        try {
            if (!this.isConnected || !await this.validateToken()) {
                throw new Error('Not connected to Strava');
            }

            let endpoint = `/athlete/activities?per_page=${limit}`;
            if (before) endpoint += `&before=${before}`;
            if (after) endpoint += `&after=${after}`;

            const response = await this.makeStravaApiCall(endpoint);

            if (!response.ok) {
                throw new Error(`Failed to get activities: ${response.statusText}`);
            }

            return await response.json();
            
        } catch (error) {
            logger.error('❌ Failed to get recent activities:', error);
            throw error;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    
    generateSecureState() {
        // Generate cryptographically secure random state
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    isElectronApp() {
        return typeof process !== 'undefined' && process.versions && process.versions.electron;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Getters
    isConnectedToStrava() {
        return this.isConnected;
    }

    getAthleteData() {
        return this.athleteData;
    }

    getConnectionStatus() {
        return {
            connected: this.isConnected,
            athlete: this.athleteData,
            tokenExpiry: this.expiresAt,
            tokenValid: this.accessToken && (!this.expiresAt || Date.now() < this.expiresAt)
        };
    }
}

// OAuth callback handler for web environments
if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/strava/callback')) {
    // Extract parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    // Send data to parent window (for popup flow)
    if (window.opener && window.opener !== window) {
        window.opener.postMessage({
            type: 'strava-oauth-callback',
            code: code,
            state: state,
            error: error,
            error_description: errorDescription
        }, window.location.origin);
        
        window.close();
    }
    
    // Handle direct callback (non-popup flow)
    else {
        // Store callback data for main app to process
        sessionStorage.setItem('strava_callback_data', JSON.stringify({
            code,
            state,
            error,
            error_description: errorDescription
        }));
        
        // Redirect to main app
        window.location.href = '/';
    }
}