/**
 * Unified Connection Manager - Enhanced Integration
 * Merges working Zwift Click, advanced Bluetooth patterns, and Firebase integration
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from '../core/logger.js';
import { platform } from '../core/platform.js';

export class UnifiedConnectionManager extends EventEmitter {
    constructor(firebaseManager) {
        super();
        this.firebaseManager = firebaseManager;
        this.connections = new Map();
        this.activeDevices = new Map();
        this.connectionState = {
            isScanning: false,
            connectedDevices: 0,
            lastError: null
        };
        
        // Device-specific handlers
        this.zwiftClickHandler = null;
        this.kickrHandler = null;
        this.hrmHandler = null;
        
        // Enhanced monitoring
        this.deviceLogger = null;
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 3;
    }

    async initialize() {
        try {
            // Check available connection methods
            const methods = await this.checkAvailableConnectionMethods();
            
            if (!methods.bluetooth && !methods.usb) {
                throw new Error('No supported connection methods available');
            }
            
            // Initialize device logging if available
            if (typeof window !== 'undefined' && window.deviceConnectionLogger) {
                this.deviceLogger = window.deviceConnectionLogger;
            }
            
            logger.info('🚀 Unified Connection Manager initialized');
            this.emit('initialized', methods);
            
            return methods;
            
        } catch (error) {
            logger.error('❌ Failed to initialize connection manager:', error);
            throw error;
        }
    }

    // ============================================================================
    // ENHANCED ZWIFT CLICK INTEGRATION (from working implementation)
    // ============================================================================
    
    async connectZwiftClick() {
        try {
            logger.info('🎮 Connecting to Zwift Click...');
            this.logConnection('zwift-click', 'connecting', 'Starting connection');
            
            // Request device using proven working filters
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'CLICK' },
                    { namePrefix: 'Click' }
                ],
                optionalServices: [
                    '00000001-19ca-4651-86e5-fa29dcdd09d1', // Working Zwift service!
                    0x180A, // Device Information
                    0x180F  // Battery
                ]
            });

            logger.info(`✅ Found Zwift Click: ${device.name}`);
            this.logConnection('zwift-click', 'found', `Device: ${device.name}`);

            // Connect to GATT server with platform-specific delays
            const server = await device.gatt.connect();
            
            // Add connection stabilization delay
            if (platform.info.isAndroid) {
                logger.debug('⏱️ Adding Android connection delay...');
                await this.sleep(2000);
            } else {
                await this.sleep(1000);
            }

            // Verify connection is still active
            if (!server.connected) {
                throw new Error('Connection lost during setup');
            }

            // Create Zwift Click handler
            this.zwiftClickHandler = new ZwiftClickHandler(device, server, this);
            await this.zwiftClickHandler.initialize();
            
            // Store connection
            this.connections.set('zwift-click', {
                device,
                server,
                handler: this.zwiftClickHandler,
                type: 'zwift-click',
                connected: true
            });
            
            this.activeDevices.set('zwift-click', this.zwiftClickHandler);
            this.connectionState.connectedDevices++;
            
            // Set up disconnect handling
            device.addEventListener('gattserverdisconnected', () => {
                this.handleZwiftClickDisconnection();
            });

            this.logConnection('zwift-click', 'connected', `Successfully connected: ${device.name}`);
            this.emit('zwift-click-connected', { 
                deviceName: device.name,
                deviceId: device.id
            });
            
            return this.zwiftClickHandler;
            
        } catch (error) {
            if (error.name === 'NotFoundError') {
                logger.info('⚠️ No Zwift Click selected. Make sure device is powered on and in pairing mode.');
                this.logConnection('zwift-click', 'cancelled', 'User cancelled selection');
            } else {
                logger.error(`❌ Zwift Click connection failed: ${error.message}`);
                this.logConnection('zwift-click', 'error', error.message);
                this.emit('zwift-click-error', error);
            }
            throw error;
        }
    }

    handleZwiftClickDisconnection() {
        logger.info('⚠️ Zwift Click disconnected');
        this.logConnection('zwift-click', 'disconnected', 'Device disconnected');
        
        this.connections.delete('zwift-click');
        this.activeDevices.delete('zwift-click');
        this.connectionState.connectedDevices--;
        
        if (this.zwiftClickHandler) {
            this.zwiftClickHandler.cleanup();
            this.zwiftClickHandler = null;
        }
        
        this.emit('zwift-click-disconnected');
        
        // Attempt reconnection if not too many attempts
        this.attemptReconnection('zwift-click');
    }

    // ============================================================================
    // ENHANCED BLUETOOTH CONNECTIVITY (from advanced patterns)
    // ============================================================================
    
    async connectBluetoothDevice(deviceType, customFilters = null) {
        try {
            logger.info(`🔍 Connecting to ${deviceType}...`);
            this.logConnection(deviceType, 'connecting', 'Starting connection');
            
            // Get device-specific filters
            const filters = customFilters || this.getDeviceFilters(deviceType);
            
            // Request device with enhanced error handling
            let device;
            try {
                device = await navigator.bluetooth.requestDevice(filters);
            } catch (selectionError) {
                if (selectionError.name === 'NotFoundError') {
                    logger.info(`⚠️ No ${deviceType} selected`);
                    this.logConnection(deviceType, 'cancelled', 'User cancelled selection');
                    return null;
                } else {
                    throw selectionError;
                }
            }
            
            logger.info(`📱 Selected ${deviceType}: ${device.name || 'Unknown'} (${device.id})`);
            
            // Connect with platform-aware delays
            const server = await device.gatt.connect();
            
            // Platform-specific connection stabilization
            if (platform.info.isAndroid) {
                logger.debug('⏱️ Adding Android connection delay...');
                await this.sleep(2000);
            } else {
                await this.sleep(1000);
            }
            
            // Additional stabilization for Wahoo devices
            if (device.name && (device.name.includes('KICKR') || device.name.includes('TICKR'))) {
                logger.debug('⏱️ Wahoo device detected, adding stabilization delay...');
                for (let i = 0; i < 3; i++) {
                    if (!server.connected) {
                        throw new Error('Connection lost during Wahoo stabilization');
                    }
                    await this.sleep(1000);
                }
            }
            
            // Verify connection is still active
            if (!server.connected) {
                throw new Error('Connection lost during setup');
            }
            
            // Create device handler
            const handler = await this.createDeviceHandler(deviceType, device, server);
            
            // Store connection
            this.connections.set(deviceType, {
                device,
                server,
                handler,
                type: deviceType,
                connected: true
            });
            
            this.activeDevices.set(deviceType, handler);
            this.connectionState.connectedDevices++;
            
            // Set up disconnect handling
            device.addEventListener('gattserverdisconnected', () => {
                this.handleDeviceDisconnection(deviceType);
            });
            
            this.logConnection(deviceType, 'connected', `Successfully connected: ${device.name || 'Unknown Device'}`);
            this.emit(`${deviceType}-connected`, {
                deviceName: device.name || 'Unknown Device',
                deviceId: device.id,
                deviceType
            });
            
            return handler;
            
        } catch (error) {
            logger.error(`❌ ${deviceType} connection failed: ${error.message}`);
            this.logConnection(deviceType, 'error', error.message);
            this.connectionState.lastError = error;
            this.emit(`${deviceType}-error`, error);
            
            // Provide helpful error messages
            this.provideConnectionHelp(error, deviceType);
            throw error;
        }
    }

    async createDeviceHandler(deviceType, device, server) {
        switch (deviceType) {
            case 'kickr':
            case 'trainer':
                return new KickrHandler(device, server, this);
            case 'hrm':
            case 'heart-rate':
                return new HRMHandler(device, server, this);
            default:
                return new GenericBluetoothHandler(device, server, this);
        }
    }

    getDeviceFilters(deviceType) {
        switch (deviceType) {
            case 'kickr':
            case 'trainer':
                return {
                    filters: [
                        { namePrefix: 'KICKR' },
                        { namePrefix: 'Wahoo' },
                        { services: [0x1826] }, // Fitness Machine
                        { services: [0x1818] }  // Cycling Power
                    ],
                    optionalServices: [
                        0x1826,    // Fitness Machine
                        0x1818,    // Cycling Power
                        0x180A,    // Device Information
                        0x180F,    // Battery Service
                        '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'  // Wahoo custom
                    ]
                };
                
            case 'zwift-click':
            case 'shifter':
                return {
                    filters: [
                        { namePrefix: 'Zwift Click' },
                        { namePrefix: 'CLICK' },
                        { namePrefix: 'Click' }
                    ],
                    optionalServices: [
                        '00000001-19ca-4651-86e5-fa29dcdd09d1', // Working Zwift service!
                        0x1812,    // HID Service
                        0x1816,    // Cycling Speed and Cadence
                        0x180A,    // Device Information
                        0x180F     // Battery Service
                    ]
                };
                
            case 'hrm':
            case 'heart-rate':
                return {
                    filters: [
                        { services: [0x180D] },  // Heart Rate Service - Primary filter
                        // Chest Straps
                        { namePrefix: 'Polar' },
                        { namePrefix: 'Garmin' },
                        { namePrefix: 'Wahoo' },
                        { namePrefix: 'TICKR' },
                        { namePrefix: 'H10' },
                        { namePrefix: 'H9' },
                        // Fitness Watches
                        { namePrefix: 'Apple Watch' },
                        { namePrefix: 'Galaxy Watch' },
                        { namePrefix: 'Fitbit' },
                        { namePrefix: 'Amazfit' },
                        { namePrefix: 'SUUNTO' }
                    ],
                    optionalServices: [
                        0x180A,    // Device Information
                        0x180F,    // Battery Service
                        0x1800,    // Generic Access
                        0x1801     // Generic Attribute
                    ]
                };
                
            default:
                return {
                    acceptAllDevices: true,
                    optionalServices: [
                        0x180D,    // Heart Rate
                        0x1818,    // Cycling Power  
                        0x1816,    // Cycling Speed and Cadence
                        0x1826,    // Fitness Machine
                        0x180A,    // Device Information
                        0x180F     // Battery Service
                    ]
                };
        }
    }

    // ============================================================================
    // CONNECTION MANAGEMENT & MONITORING
    // ============================================================================
    
    handleDeviceDisconnection(deviceType) {
        logger.info(`⚠️ ${deviceType} disconnected`);
        this.logConnection(deviceType, 'disconnected', 'Device disconnected');
        
        const connection = this.connections.get(deviceType);
        if (connection && connection.handler) {
            connection.handler.cleanup();
        }
        
        this.connections.delete(deviceType);
        this.activeDevices.delete(deviceType);
        this.connectionState.connectedDevices--;
        
        this.emit(`${deviceType}-disconnected`);
        
        // Attempt reconnection
        this.attemptReconnection(deviceType);
    }

    async attemptReconnection(deviceType) {
        const attempts = this.reconnectAttempts.get(deviceType) || 0;
        
        if (attempts >= this.maxReconnectAttempts) {
            logger.info(`⚠️ Max reconnection attempts reached for ${deviceType}`);
            this.reconnectAttempts.delete(deviceType);
            return;
        }
        
        this.reconnectAttempts.set(deviceType, attempts + 1);
        
        logger.info(`🔄 Attempting to reconnect ${deviceType} (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);
        
        // Wait before reconnection attempt with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
        await this.sleep(delay);
        
        try {
            if (deviceType === 'zwift-click') {
                await this.connectZwiftClick();
            } else {
                await this.connectBluetoothDevice(deviceType);
            }
            
            // Reset attempts on successful reconnection
            this.reconnectAttempts.delete(deviceType);
            logger.info(`✅ ${deviceType} reconnected successfully`);
            
        } catch (error) {
            logger.warn(`❌ Failed to reconnect ${deviceType}: ${error.message}`);
            
            // Schedule another attempt
            setTimeout(() => {
                this.attemptReconnection(deviceType);
            }, delay);
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    
    provideConnectionHelp(error, deviceType) {
        if (error.name === 'SecurityError') {
            logger.info('🔒 Bluetooth Permission Help:');
            logger.info('  • Allow Bluetooth access when prompted');
            logger.info('  • Check browser settings for blocked permissions');
            logger.info('  • Ensure you\'re on HTTPS (or localhost)');
        } else if (error.name === 'NetworkError') {
            logger.info(`💡 ${deviceType} Connection Issues:`);
            logger.info('  • Move closer to the Bluetooth device');
            logger.info('  • Make sure the device isn\'t connected elsewhere');
            logger.info('  • Try restarting Bluetooth on your computer');
            logger.info('  • Check if the device is in pairing mode');
        }
    }

    logConnection(deviceType, status, message) {
        if (this.deviceLogger) {
            this.deviceLogger.logConnection(deviceType, status, message);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkBluetoothSupport() {
        if (!navigator.bluetooth) {
            const error = new Error('Web Bluetooth API not supported');
            logger.error('❌ Web Bluetooth API not supported in this browser');
            logger.info('💡 Bluetooth Requirements:');
            logger.info('  • Use Chrome, Edge, or Opera browser');
            logger.info('  • Ensure HTTPS connection (or localhost)');
            logger.info('  • Enable Bluetooth on your device');
            return false;
        }
        
        try {
            const availability = await navigator.bluetooth.getAvailability();
            if (!availability) {
                const error = new Error('Bluetooth not available on this device');
                logger.error('❌ Bluetooth not available on this device');
                return false;
            }
        } catch (availError) {
            logger.warn('⚠️ Could not check Bluetooth availability:', availError.message);
        }
        
        return true;
    }

    async checkAvailableConnectionMethods() {
        const methods = {
            usb: false,
            bluetooth: false,
            issues: []
        };

        // Check USB Serial API
        if ('serial' in navigator) {
            methods.usb = true;
        } else {
            methods.issues.push('USB Serial API not supported (requires Chrome/Edge 89+)');
        }

        // Check Bluetooth API
        methods.bluetooth = await this.checkBluetoothSupport();
        if (!methods.bluetooth) {
            methods.issues.push('Bluetooth not available');
        }

        // Check HTTPS requirement
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            methods.issues.push('HTTPS required for Web APIs (both USB and Bluetooth)');
        }

        return methods;
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    async disconnectDevice(deviceType) {
        const connection = this.connections.get(deviceType);
        if (!connection) return;
        
        try {
            if (connection.device && connection.device.gatt && connection.device.gatt.connected) {
                await connection.device.gatt.disconnect();
            }
            
            if (connection.handler) {
                connection.handler.cleanup();
            }
            
            this.connections.delete(deviceType);
            this.activeDevices.delete(deviceType);
            this.connectionState.connectedDevices--;
            
            logger.info(`🔌 ${deviceType} disconnected successfully`);
            this.logConnection(deviceType, 'disconnected', 'Manual disconnection');
            
        } catch (error) {
            logger.error(`❌ Error disconnecting ${deviceType}: ${error.message}`);
        }
    }

    async disconnectAll() {
        const deviceTypes = Array.from(this.connections.keys());
        
        for (const deviceType of deviceTypes) {
            await this.disconnectDevice(deviceType);
        }
        
        logger.info('✅ All devices disconnected');
    }

    getDevice(deviceType) {
        return this.activeDevices.get(deviceType);
    }

    isConnected(deviceType = null) {
        if (deviceType) {
            return this.connections.has(deviceType);
        }
        return this.connections.size > 0;
    }

    getConnectionState() {
        return {
            ...this.connectionState,
            connectedDevices: Array.from(this.activeDevices.keys()),
            totalDevices: this.connections.size
        };
    }

    getConnectionSummary() {
        const summary = {
            connected: this.connections.size > 0,
            devices: {}
        };

        for (const [deviceType, connection] of this.connections) {
            summary.devices[deviceType] = {
                connected: connection.connected,
                deviceName: connection.device?.name || 'Unknown',
                deviceId: connection.device?.id
            };
        }

        return summary;
    }
}

// ============================================================================
// DEVICE-SPECIFIC HANDLERS
// ============================================================================

class ZwiftClickHandler extends EventEmitter {
    constructor(device, server, manager) {
        super();
        this.device = device;
        this.server = server;
        this.manager = manager;
        this.zwiftService = null;
        this.characteristics = new Map();
        this.currentGear = 1;
        this.maxGears = 24;
        this.lastButtonData = null;
        
        // Resistance mapping
        this.resistanceMap = {};
        this.generateResistanceMap();
    }

    async initialize() {
        try {
            // Get the working Zwift service
            this.zwiftService = await this.server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
            logger.info('✅ Got Zwift Click service');

            // Get all characteristics
            const characteristics = await this.zwiftService.getCharacteristics();
            logger.info(`📋 Found ${characteristics.length} characteristics in Zwift service`);

            for (const char of characteristics) {
                this.characteristics.set(char.uuid, char);
                logger.debug(`  🔧 Characteristic: ${char.uuid}`);
            }

            // Start listening for button presses
            await this.startListening();
            
            logger.info('🎮 Zwift Click handler initialized');
            
        } catch (error) {
            logger.error('❌ Failed to initialize Zwift Click handler:', error);
            throw error;
        }
    }

    async startListening() {
        let listeningCount = 0;

        for (const [uuid, char] of this.characteristics) {
            if (char.properties.notify || char.properties.indicate) {
                try {
                    await char.startNotifications();
                    char.addEventListener('characteristicvaluechanged', (event) => {
                        this.handleButtonData(event);
                    });
                    listeningCount++;
                } catch (e) {
                    logger.warn(`⚠️ Failed to start notifications on ${uuid}:`, e.message);
                }
            }
        }

        if (listeningCount > 0) {
            logger.info(`🔔 Listening for Zwift Click button presses on ${listeningCount} characteristics`);
        } else {
            throw new Error('No notification characteristics available');
        }
    }

    handleButtonData(event) {
        const value = event.target.value;
        const data = new Uint8Array(value.buffer);
        
        logger.debug(`🎮 Zwift Click button data: ${Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);

        // Check if data changed (indicates button press)
        if (this.lastButtonData && this.hasDataChanged(data, this.lastButtonData)) {
            this.detectButtonPress(data, this.lastButtonData);
        }

        this.lastButtonData = new Uint8Array(data);
    }

    hasDataChanged(newData, oldData) {
        if (newData.length !== oldData.length) return true;
        
        for (let i = 0; i < newData.length; i++) {
            if (newData[i] !== oldData[i]) return true;
        }
        
        return false;
    }

    detectButtonPress(newData, oldData) {
        // Simple detection logic - can be enhanced based on specific device patterns
        const newValue = newData[0] || 0;
        const oldValue = oldData[0] || 0;
        
        if (newValue > oldValue) {
            this.handleGearUp();
        } else if (newValue < oldValue) {
            this.handleGearDown();
        }
    }

    handleGearUp() {
        if (this.currentGear < this.maxGears) {
            this.currentGear++;
        } else {
            this.currentGear = 1; // Wrap around
        }
        
        this.applyGearChange('up');
    }

    handleGearDown() {
        if (this.currentGear > 1) {
            this.currentGear--;
        } else {
            this.currentGear = this.maxGears; // Wrap around
        }
        
        this.applyGearChange('down');
    }

    applyGearChange(direction) {
        const resistance = this.resistanceMap[this.currentGear] || 0;
        
        logger.info(`🎮 Zwift Click: Gear ${direction} → Gear ${this.currentGear} (${resistance}% resistance)`);
        
        // Emit gear change event for UI updates
        this.emit('gear-change', {
            direction,
            currentGear: this.currentGear,
            resistance,
            maxGears: this.maxGears
        });
        
        // Forward to manager for broader handling
        this.manager.emit('zwift-click-gear-change', {
            direction,
            currentGear: this.currentGear,
            resistance,
            maxGears: this.maxGears
        });
    }

    generateResistanceMap() {
        // Map 24 gears to resistance range (-10% to +10%)
        const minResistance = -10;
        const maxResistance = 10;
        const resistanceRange = maxResistance - minResistance;
        
        for (let gear = 1; gear <= this.maxGears; gear++) {
            const normalizedGear = (gear - 1) / (this.maxGears - 1);
            this.resistanceMap[gear] = Math.round(minResistance + (normalizedGear * resistanceRange));
        }
    }

    getCurrentGear() {
        return this.currentGear;
    }

    getCurrentResistance() {
        return this.resistanceMap[this.currentGear] || 0;
    }

    cleanup() {
        // Clean up event listeners and resources
        logger.info('🧹 Cleaning up Zwift Click handler');
    }
}

class KickrHandler extends EventEmitter {
    constructor(device, server, manager) {
        super();
        this.device = device;
        this.server = server;
        this.manager = manager;
        this.services = new Map();
        this.characteristics = new Map();
    }

    async initialize() {
        // Implementation for Kickr trainer
        logger.info('⚡ Kickr handler initialized');
    }

    cleanup() {
        logger.info('🧹 Cleaning up Kickr handler');
    }
}

class HRMHandler extends EventEmitter {
    constructor(device, server, manager) {
        super();
        this.device = device;
        this.server = server;
        this.manager = manager;
    }

    async initialize() {
        // Implementation for heart rate monitors
        logger.info('❤️ HRM handler initialized');
    }

    cleanup() {
        logger.info('🧹 Cleaning up HRM handler');
    }
}

class GenericBluetoothHandler extends EventEmitter {
    constructor(device, server, manager) {
        super();
        this.device = device;
        this.server = server;
        this.manager = manager;
    }

    async initialize() {
        logger.info('📡 Generic Bluetooth handler initialized');
    }

    cleanup() {
        logger.info('🧹 Cleaning up generic handler');
    }
}