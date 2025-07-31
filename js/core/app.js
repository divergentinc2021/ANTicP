/**
 * Main Application Controller
 * Orchestrates all modules and handles the main application flow
 */
import { logger } from './logger.js';
import { platform } from './platform.js';
import { ConnectionManager } from '../connections/connection-manager.js';
import { UIManager } from '../ui/ui-manager.js';
import { DeviceCaptureManager } from './device-capture.js';

export class App {
    constructor() {
        this.connectionManager = new ConnectionManager();
        this.uiManager = new UIManager();
        this.sessionData = {
            trainer: { distance: 0, startTime: null, maxPower: 0, avgPower: 0, totalEnergy: 0 },
            hrm: { avgHR: 0, maxHR: 0, hrHistory: [], timeInZones: {} }
        };
        this.deviceCapture = new DeviceCaptureManager(this.connectionManager, this.sessionData);
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            logger.info('🚀 Initializing ANT+ Receiver Application...');
            
            // Initialize logger with DOM element
            logger.init('log-content');
            
            // Initialize UI Manager
            this.uiManager.init();
            
            // Detect platform and check permissions
            await platform.detect();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update UI based on platform capabilities
            this.uiManager.updateConnectionMethods();
            
            this.initialized = true;
            logger.info('✅ Application initialized successfully');
            logger.info(`📱 Platform: ${platform.info.name}`);
            
            // Additional Android-specific logging
            if (platform.info.isAndroid) {
                logger.info('📱 Android detected - make sure you\'re using Chrome browser');
                logger.info('🔐 HTTPS and location permissions required for Bluetooth');
            }
            
        } catch (error) {
            logger.error(`❌ Application initialization failed: ${error.message}`);
            throw error;
        }
    }

    setupEventListeners() {
        // UI Manager events
        this.uiManager.on('usb-connect-requested', () => this.handleUSBConnect());
        this.uiManager.on('bluetooth-connect-requested', () => this.handleBluetoothConnect());
        this.uiManager.on('device-pair-requested', (deviceType) => this.handleDevicePair(deviceType));
        this.uiManager.on('location-permission-requested', () => this.handleLocationPermission());
        this.uiManager.on('clear-log-requested', () => this.handleClearLog());
        this.uiManager.on('capture-specs-requested', () => this.handleCaptureSpecs());
        
        // Connection Manager events
        this.connectionManager.on('usb-connecting', () => {
            logger.info('🔍 Requesting USB ANT+ device...');
            this.uiManager.updateConnectionStatus('Connecting to USB ANT+...', 'info');
        });
        
        this.connectionManager.on('usb-connected', (data) => {
            logger.info('🔌 USB ANT+ stick connected successfully');
            this.uiManager.updateConnectionStatus(`Connected via ${data.deviceName}`, 'success');
            this.uiManager.setConnectionMethodActive('usb', true);
        });
        
        this.connectionManager.on('usb-error', (error) => {
            logger.error(`❌ USB connection failed: ${error.message}`);
            this.uiManager.updateConnectionStatus('USB connection failed', 'error');
            this.uiManager.setConnectionMethodActive('usb', false);
            
            if (error.message.includes('No port selected')) {
                logger.info('ℹ️ Make sure to select an ANT+ USB stick, not a Bluetooth adapter');
                logger.info('ℹ️ ANT+ sticks usually appear as "USB Serial Device" or "Silicon Labs CP210x"');
            }
        });
        
        this.connectionManager.on('usb-disconnected', () => {
            logger.info('🔌 USB ANT+ stick disconnected');
            this.uiManager.updateConnectionStatus('USB disconnected', 'warning');
            this.uiManager.setConnectionMethodActive('usb', false);
        });
        
        // Bluetooth events
        this.connectionManager.on('bluetooth-connecting', () => {
            logger.info('🔍 Scanning for Bluetooth devices...');
            this.uiManager.updateConnectionStatus('Scanning for Bluetooth devices...', 'info');
        });
        
        this.connectionManager.on('bluetooth-connected', (data) => {
            logger.info(`📱 Connected to ${data.deviceName}`);
            this.uiManager.updateConnectionStatus(`Connected to ${data.deviceName}`, 'success');
            this.uiManager.setConnectionMethodActive('bluetooth', true);
        });
        
        this.connectionManager.on('bluetooth-error', (error) => {
            logger.error(`❌ Bluetooth connection failed: ${error.message}`);
            this.uiManager.updateConnectionStatus('Bluetooth connection failed', 'error');
            this.uiManager.setConnectionMethodActive('bluetooth', false);
        });
        
        this.connectionManager.on('bluetooth-disconnected', () => {
            logger.info('📱 Bluetooth device disconnected');
            this.uiManager.updateConnectionStatus('Bluetooth disconnected', 'warning');
            this.uiManager.setConnectionMethodActive('bluetooth', false);
        });
        
        // Device-specific Bluetooth events
        this.connectionManager.on('bluetooth-device-connected', (data) => {
            logger.info(`✅ ${data.deviceType} connected: ${data.deviceName}`);
            this.uiManager.updateConnectionStatus(`Connected to ${data.deviceName}`, 'success');
            this.uiManager.updateDeviceStatus(data.deviceType, 'active');
        });
        
        this.connectionManager.on('bluetooth-device-error', (data) => {
            logger.error(`❌ ${data.deviceType} connection failed: ${data.error.message}`);
            this.uiManager.updateConnectionStatus(`${data.deviceType} connection failed`, 'error');
            this.uiManager.updateDeviceStatus(data.deviceType, 'inactive');
        });
        
        this.connectionManager.on('bluetooth-device-disconnected', (data) => {
            logger.info(`⚠️ ${data.deviceType} disconnected`);
            this.uiManager.updateDeviceStatus(data.deviceType, 'inactive');
        });
        
        // Data events
        this.connectionManager.on('device-data', (data) => this.handleDeviceData(data));
        this.connectionManager.on('heart-rate-data', (data) => this.handleHeartRateData(data));
        this.connectionManager.on('power-data', (data) => this.handlePowerData(data));
        this.connectionManager.on('trainer-data', (data) => this.handleTrainerData(data));
        this.connectionManager.on('speed-cadence-data', (data) => this.handleSpeedCadenceData(data));
        
        // Platform events
        platform.on('platform-detected', () => {
            this.uiManager.updateConnectionMethods();
        });
        
        platform.on('permissions-checked', () => {
            this.uiManager.updateConnectionMethods();
        });
        
        platform.on('location-permission-changed', () => {
            this.uiManager.updateConnectionMethods();
        });
        
        // Browser events
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                logger.info('📱 App moved to background');
            } else {
                logger.info('📱 App brought to foreground');
                this.checkConnectionStatus();
            }
        });
        
        // Bluetooth disconnect monitoring
        if (platform.info.hasWebBluetooth) {
            document.addEventListener('bluetoothdevicedisconnected', (event) => {
                logger.warn('⚠️ Bluetooth device disconnected');
                this.uiManager.updateConnectionStatus('Device disconnected', 'error');
            });
        }
    }

    async handleUSBConnect() {
        try {
            await this.connectionManager.connectUSB();
        } catch (error) {
            // Error handling is done in event listeners
        }
    }

    async handleBluetoothConnect() {
        try {
            await this.connectionManager.connectBluetooth();
        } catch (error) {
            // Error handling is done in event listeners
        }
    }

    async handleDevicePair(deviceType) {
        try {
            logger.info(`🔍 Pairing ${deviceType}...`);
            this.uiManager.updateDeviceStatus(deviceType, 'searching');
            await this.connectionManager.connectBluetoothDevice(deviceType);
        } catch (error) {
            // Error handling is done in event listeners
        }
    }

    async handleLocationPermission() {
        try {
            const granted = await platform.requestLocationPermission();
            if (granted) {
                this.uiManager.updateConnectionMethods();
            }
        } catch (error) {
            logger.error(`❌ Location permission error: ${error.message}`);
        }
    }

    async handleSerialPermission() {
        try {
            logger.info('🔍 Requesting serial port access for COM port connections...');
            const granted = await platform.requestSerialPermission();
            if (granted) {
                logger.info('✅ Serial port access granted - devices can now connect via COM ports');
                this.uiManager.updateConnectionMethods();
            } else {
                logger.warn('⚠️ Serial port access denied - some Bluetooth devices may not connect properly');
            }
        } catch (error) {
            logger.error(`❌ Serial permission error: ${error.message}`);
        }
    }

    handleClearLog() {
        logger.clear();
        this.uiManager.clearLog();
    }

    async handleCaptureSpecs() {
        logger.info('📊 Starting device specification capture...');
        
        try {
            await this.deviceCapture.captureAllConnectedDevices();
            
            const stats = this.deviceCapture.getSessionStats();
            if (stats.devicesConnected > 0) {
                logger.info(`✅ Device capture completed!`);
                logger.info(`📄 Generated files:`);
                stats.availableFiles.forEach(file => {
                    logger.info(`   • ${file.filename} (${file.deviceType})`);
                });
                logger.info(`📄 Session log: ant-session-log-${new Date().toISOString().split('T')[0]}.md`);
            } else {
                logger.warn('⚠️ No devices connected to capture');
                logger.info('💡 Connect some devices first, then try capturing again');
            }
        } catch (error) {
            logger.error(`❌ Device capture failed: ${error.message}`);
        }
    }

    handleDeviceData(data) {
        // Process raw device data based on source and device type
        if (data.source === 'usb') {
            this.processUSBDeviceData(data);
        } else if (data.source === 'bluetooth') {
            this.processBluetoothDeviceData(data);
        }
    }

    processUSBDeviceData(data) {
        // Process USB ANT+ data
        const { deviceType, deviceId, payload } = data;
        
        switch (deviceType) {
            case 0x11: // FE-C (Fitness Equipment)
                this.processFECData(payload, deviceId);
                break;
            case 0x78: // Heart Rate
                this.processHeartRateDataUSB(payload, deviceId);
                break;
            case 0x0B: // Power Meter
                this.processPowerMeterData(payload, deviceId);
                break;
            case 0x79: // Speed and Cadence
                this.processSpeedCadenceDataUSB(payload, deviceId);
                break;
            default:
                logger.debug(`📡 Unknown USB device type: 0x${deviceType.toString(16)}`);
        }
    }

    processBluetoothDeviceData(data) {
        // Process Bluetooth data
        logger.debug(`📊 Bluetooth data from ${data.serviceUuid}`);
    }

    handleHeartRateData(data) {
        this.updateHRMSession(data.heartRate);
        this.uiManager.updateDeviceMetrics('hrm', data);
        logger.debug(`❤️ HR: ${data.heartRate} BPM`);
    }

    handlePowerData(data) {
        this.updateTrainerSession(data);
        this.uiManager.updateDeviceMetrics('trainer', data);
        logger.debug(`⚡ Power: ${data.power}W, Cadence: ${data.cadence}RPM`);
    }

    handleTrainerData(data) {
        this.updateTrainerSession(data);
        this.uiManager.updateDeviceMetrics('trainer', data);
        logger.debug(`🚴 Trainer: ${data.power}W, ${data.cadence}RPM, ${data.speed}km/h`);
    }

    handleSpeedCadenceData(data) {
        this.uiManager.updateDeviceMetrics('trainer', data);
        logger.debug(`🚴 Speed: ${data.speed}km/h, Cadence: ${data.cadence}RPM`);
    }

    // USB ANT+ data processing functions
    processFECData(payload, deviceId) {
        const dataPage = payload[0];
        
        switch (dataPage) {
            case 0x10: // General FE Data
                const speed = (payload[5] << 8) | payload[4];
                const heartRate = payload[6];
                
                const data = {
                    power: 0,
                    cadence: 0,
                    speed: (speed * 0.001).toFixed(1),
                    resistance: 0,
                    source: 'usb-fec'
                };
                
                this.uiManager.updateDeviceMetrics('trainer', data);
                
                if (heartRate > 0) {
                    this.handleHeartRateData({ heartRate, source: 'usb-fec' });
                }
                
                logger.debug(`🚴 FE-C General: Speed=${data.speed}km/h, HR=${heartRate}bpm`);
                break;
                
            case 0x19: // Specific Trainer Data
                const instantCadence = payload[2];
                const instantPower = (payload[6] << 8) | payload[5];
                
                const trainerData = {
                    power: instantPower,
                    cadence: instantCadence,
                    speed: 0,
                    resistance: Math.round(instantPower / 20),
                    source: 'usb-trainer'
                };
                
                this.uiManager.updateDeviceMetrics('trainer', trainerData);
                logger.debug(`🚴 FE-C Trainer: Power=${instantPower}W, Cadence=${instantCadence}rpm`);
                break;
        }
    }

    processHeartRateDataUSB(payload, deviceId) {
        const dataPage = payload[0];
        
        if (dataPage <= 0x03) {
            const heartRate = payload[7];
            
            if (heartRate > 0) {
                this.handleHeartRateData({ heartRate, source: 'usb-hr' });
            }
        }
    }

    processPowerMeterData(payload, deviceId) {
        const dataPage = payload[0];
        
        if (dataPage === 0x10) {
            const instantCadence = payload[3];
            const instantPower = (payload[7] << 8) | payload[6];
            
            const powerData = {
                power: instantPower,
                cadence: instantCadence,
                speed: (instantPower * 0.036).toFixed(1),
                resistance: Math.round(instantPower / 20),
                source: 'usb-power'
            };
            
            this.uiManager.updateDeviceMetrics('trainer', powerData);
            logger.debug(`⚡ Power: ${instantPower}W, Cadence: ${instantCadence}rpm`);
        }
    }

    processSpeedCadenceDataUSB(payload, deviceId) {
        logger.debug(`🚴 Speed/Cadence data received from device ${deviceId}`);
    }

    updateTrainerSession(data) {
        if (!this.sessionData.trainer.startTime && data.power > 0) {
            this.sessionData.trainer.startTime = Date.now();
        }
        
        if (data.power > this.sessionData.trainer.maxPower) {
            this.sessionData.trainer.maxPower = data.power;
        }

        // Calculate average power
        if (data.power > 0) {
            const currentAvg = this.sessionData.trainer.avgPower || 0;
            const powerHistory = this.sessionData.trainer.powerHistory || [];
            powerHistory.push(data.power);
            
            // Keep only last 20 power readings for moving average
            if (powerHistory.length > 20) {
                powerHistory.shift();
            }
            
            this.sessionData.trainer.powerHistory = powerHistory;
            this.sessionData.trainer.avgPower = Math.round(
                powerHistory.reduce((a, b) => a + b, 0) / powerHistory.length
            );
        }
        
        if (this.sessionData.trainer.startTime) {
            const elapsedTime = Date.now() - this.sessionData.trainer.startTime;
            const speedKmh = parseFloat(data.speed) || 0;
            this.sessionData.trainer.distance += speedKmh * (1000 / 3600000);
            
            // Calculate total energy (kJ)
            if (data.power > 0) {
                this.sessionData.trainer.totalEnergy += (data.power * (elapsedTime / 1000)) / 1000;
            }
            
            // Update UI with session data
            const sessionData = {
                ...data,
                distance: this.sessionData.trainer.distance.toFixed(2),
                time: this.formatTime(elapsedTime),
                avgPower: this.sessionData.trainer.avgPower,
                totalEnergy: Math.round(this.sessionData.trainer.totalEnergy)
            };
            
            this.uiManager.updateDeviceMetrics('trainer', sessionData);
        }
    }

    updateHRMSession(heartRate) {
        this.sessionData.hrm.hrHistory.push(heartRate);
        if (this.sessionData.hrm.hrHistory.length > 20) {
            this.sessionData.hrm.hrHistory.shift();
        }
        
        const avgHR = this.sessionData.hrm.hrHistory.reduce((a, b) => a + b, 0) / this.sessionData.hrm.hrHistory.length;
        this.sessionData.hrm.avgHR = Math.round(avgHR);
        
        if (heartRate > this.sessionData.hrm.maxHR) {
            this.sessionData.hrm.maxHR = heartRate;
        }

        // Calculate HR zones (basic implementation)
        const zones = this.calculateHRZones(heartRate);
        if (!this.sessionData.hrm.timeInZones[zones.current]) {
            this.sessionData.hrm.timeInZones[zones.current] = 0;
        }
        this.sessionData.hrm.timeInZones[zones.current] += 1; // increment by 1 second approximation
        
        const hrmData = {
            heartRate,
            avgHR: this.sessionData.hrm.avgHR,
            maxHR: this.sessionData.hrm.maxHR,
            zone: zones.current
        };
        
        this.uiManager.updateDeviceMetrics('hrm', hrmData);
    }

    calculateHRZones(heartRate) {
        // Basic HR zone calculation (using age-based max HR estimation)
        const maxHR = 220 - 30; // Assuming 30 years old, should be configurable
        const restingHR = 65;    // Should be configurable
        
        const hrReserve = maxHR - restingHR;
        const intensity = (heartRate - restingHR) / hrReserve;
        
        let zone = 'recovery';
        if (intensity > 0.85) zone = 'neuromuscular';
        else if (intensity > 0.75) zone = 'vo2max';
        else if (intensity > 0.65) zone = 'anaerobic';
        else if (intensity > 0.55) zone = 'aerobic';
        
        return {
            current: zone,
            intensity: Math.round(intensity * 100),
            zones: ['recovery', 'aerobic', 'anaerobic', 'vo2max', 'neuromuscular']
        };
    }

    checkConnectionStatus() {
        // Check and potentially reconnect Bluetooth devices
        const bluetoothConnections = Array.from(this.connectionManager.connections.entries())
            .filter(([key]) => key.startsWith('bluetooth'));
        
        bluetoothConnections.forEach(([key, connection]) => {
            if (connection.device && !connection.device.gatt.connected) {
                logger.warn(`⚠️ ${key} connection lost, attempting reconnect...`);
                connection.device.gatt.connect().then(() => {
                    logger.info(`✅ ${key} reconnected successfully`);
                }).catch(error => {
                    logger.error(`❌ ${key} reconnection failed: ${error.message}`);
                });
            }
        });
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getSessionData() {
        return {
            ...this.sessionData,
            connections: this.connectionManager.getConnectionStatus(),
            platform: platform.info
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    try {
        await app.init();
        
        // Make app available globally for debugging
        window.antApp = app;
        
    } catch (error) {
        console.error('Failed to initialize ANT+ Receiver:', error);
    }
});
