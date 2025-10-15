/**
 * Bluetooth Connection Module - ENHANCED WITH HRM WATCH SUPPORT
 * Fixed service UUIDs and enhanced connection handling
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from '../core/logger.js';
import { platform } from '../core/platform.js';

export class BluetoothConnection extends EventEmitter {
    constructor() {
        super();
        this.device = null;
        this.server = null;
        this.services = new Map();
        this.characteristics = new Map();
        this.isConnected = false;
    }

    async connect(options = {}) {
        // Check comprehensive Bluetooth support
        if (!await this.checkBluetoothSupport()) {
            return;
        }

        try {
            logger.info('🔍 Scanning for Bluetooth ANT+ devices...');
            this.emit('connecting');
            
            let device;
            try {
                // Use proper UUIDs for Bluetooth services
                device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: [
                        0x180D,                          // Heart Rate
                        0x1818,                          // Cycling Power  
                        0x1816,                          // Cycling Speed and Cadence
                        0x1826,                          // Fitness Machine
                        0x180A,                          // Device Information
                        0x180F,                          // Battery Service
                        0x1800,                          // Generic Access
                        0x1801,                          // Generic Attribute
                        '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e', // Wahoo custom
                        0x1812,                          // HID Service
                        '0000fff0-0000-1000-8000-00805f9b34fb', // Nordic UART
                        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
                        '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Issc proprietary service
                    ]
                });
            } catch (selectionError) {
                if (selectionError.name === 'NotFoundError') {
                    logger.info('⚠️ No Bluetooth device selected');
                    return;
                } else {
                    throw selectionError;
                }
            }
            
            logger.info(`📱 Selected device: ${device.name || 'Unknown'} (${device.id})`);
            
            // Connect to device
            logger.info('🔗 Connecting to GATT server...');
            const server = await device.gatt.connect();
            
            // Add artificial delay to prevent rapid connection issues
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
            
            // Additional connection stabilization for certain devices
            if (device.name && (device.name.includes('KICKR') || device.name.includes('TICKR'))) {
                logger.debug('⏱️ Wahoo device detected, adding stabilization delay...');
                for (let i = 0; i < 3; i++) {
                    if (!server.connected) {
                        throw new Error('Connection lost during Wahoo stabilization');
                    }
                    await this.sleep(1000);
                }
            }
            
            // Store connection
            this.device = device;
            this.server = server;
            this.isConnected = true;
            
            logger.info(`✅ Connected to ${device.name || 'Unknown Device'}`);
            
            // Log connection to enhanced monitoring system
            if (typeof window !== 'undefined' && window.deviceConnectionLogger) {
                window.deviceConnectionLogger.logConnection('bluetooth', 'connected', `- ${device.name || 'Unknown Device'}`);
            }
            
            this.emit('connected', { 
                type: 'bluetooth', 
                deviceName: device.name || 'Unknown Device',
                deviceId: device.id 
            });
            
            // Discover and setup services
            await this.discoverServices();
            
            // Set up disconnect handling
            device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
            
        } catch (error) {
            logger.error(`❌ Bluetooth connection failed: ${error.message}`);
            
            // Log error to enhanced monitoring system
            if (typeof window !== 'undefined' && window.deviceConnectionLogger) {
                window.deviceConnectionLogger.logConnection('bluetooth', 'error', `- ${error.message}`);
            }
            
            this.emit('error', error);
            
            if (error.name === 'NotFoundError') {
                logger.info('💡 Device Selection Tips:');
                logger.info('  • Make sure Bluetooth is enabled on your device');
                logger.info('  • Put your ANT+ device in pairing mode');
                logger.info('  • Look for devices like "KICKR", "TICKR", "Zwift Click"');
                logger.info('  • Try turning the device off and on again');
            } else if (error.name === 'SecurityError') {
                await this.showPermissionHelp();
            } else if (error.name === 'NetworkError') {
                logger.info('💡 Connection Issues:');
                logger.info('  • Move closer to the Bluetooth device');
                logger.info('  • Make sure the device isn\'t connected elsewhere');
                logger.info('  • Try restarting Bluetooth on your computer');
                logger.info('  • Check if the device is in pairing mode');
            } else if (error.message.includes('Invalid Service name')) {
                logger.info('💡 Browser Compatibility Issue:');
                logger.info('  • Try updating your browser to the latest version');
                logger.info('  • Some Bluetooth service names may not be recognized');
                logger.info('  • This is a known issue with some browser versions');
            }
            
            throw error;
        }
    }

    async connectToSpecificDevice(filters, deviceType) {
        if (!await this.checkBluetoothSupport()) {
            return;
        }

        try {
            logger.info(`🔍 Scanning for ${deviceType} devices...`);
            
            // Log connection attempt to enhanced monitoring system
            if (typeof window !== 'undefined' && window.deviceConnectionLogger) {
                window.deviceConnectionLogger.logConnection(deviceType, 'connecting', '- Scanning for devices');
            }
            
            this.emit('connecting');
            
            const device = await navigator.bluetooth.requestDevice(filters);
            logger.info(`📱 Selected ${deviceType}: ${device.name || 'Unknown'} (${device.id})`);
            
            // Connect to device
            logger.info('🔗 Connecting to GATT server...');
            const server = await device.gatt.connect();
            
            // Add connection delay based on platform and device type
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
            
            // Store connection
            this.device = device;
            this.server = server;
            this.isConnected = true;
            
            logger.info(`✅ Connected to ${deviceType}: ${device.name || 'Unknown Device'}`);
            
            // Log successful connection to enhanced monitoring system
            if (typeof window !== 'undefined' && window.deviceConnectionLogger) {
                window.deviceConnectionLogger.logConnection(deviceType, 'connected', `- ${device.name || 'Unknown Device'}`);
            }
            
            this.emit('connected', { 
                type: 'bluetooth', 
                deviceType: deviceType,
                deviceName: device.name || 'Unknown Device',
                deviceId: device.id 
            });
            
            // Discover and setup services for this specific device type
            await this.discoverServices(deviceType);
            
            // Set up disconnect handling
            device.addEventListener('gattserverdisconnected', () => this.onDisconnected(deviceType));
            
        } catch (error) {
            logger.error(`❌ ${deviceType} connection failed: ${error.message}`);
            
            // Log error to enhanced monitoring system
            if (typeof window !== 'undefined' && window.deviceConnectionLogger) {
                window.deviceConnectionLogger.logConnection(deviceType, 'error', `- ${error.message}`);
            }
            
            this.emit('error', error);
            throw error;
        }
    }

    async discoverServices(deviceType = null) {
        if (!this.server || !this.server.connected) {
            throw new Error('Not connected to device');
        }

        try {
            logger.info('🔍 Discovering services...');
            const services = await this.server.getPrimaryServices();
            
            logger.info(`📋 Found ${services.length} services:`);
            
            for (const service of services) {
                logger.info(`  📡 Service: ${service.uuid}`);
                this.services.set(service.uuid, service);
                
                // Discover characteristics for each service
                try {
                    const characteristics = await service.getCharacteristics();
                    logger.info(`    📊 Found ${characteristics.length} characteristics`);
                    
                    for (const characteristic of characteristics) {
                        logger.debug(`      📈 Characteristic: ${characteristic.uuid}`);
                        this.characteristics.set(characteristic.uuid, characteristic);
                        
                        // Set up notifications for relevant characteristics
                        await this.setupCharacteristicNotifications(characteristic, deviceType);
                    }
                } catch (charError) {
                    logger.warn(`⚠️ Could not read characteristics for service ${service.uuid}: ${charError.message}`);
                }
            }
            
        } catch (error) {
            logger.error(`❌ Service discovery failed: ${error.message}`);
            throw error;
        }
    }

    async setupCharacteristicNotifications(characteristic, deviceType) {
        try {
            // Check if characteristic supports notifications
            if (!characteristic.properties.notify) {
                return;
            }
            
            // Set up notifications based on characteristic UUID
            switch (characteristic.uuid) {
                case '00002a37-0000-1000-8000-00805f9b34fb': // Heart Rate Measurement
                    logger.info('❤️ Setting up heart rate notifications...');
                    await characteristic.startNotifications();
                    characteristic.addEventListener('characteristicvaluechanged', this.handleHeartRateData.bind(this));
                    break;
                    
                case '00002a63-0000-1000-8000-00805f9b34fb': // Cycling Power Measurement
                    logger.info('⚡ Setting up power notifications...');
                    await characteristic.startNotifications();
                    characteristic.addEventListener('characteristicvaluechanged', this.handlePowerData.bind(this));
                    break;
                    
                case '00002a5b-0000-1000-8000-00805f9b34fb': // CSC Measurement
                    logger.info('🚴 Setting up speed/cadence notifications...');
                    await characteristic.startNotifications();
                    characteristic.addEventListener('characteristicvaluechanged', this.handleSpeedCadenceData.bind(this));
                    break;
                    
                case '00002acc-0000-1000-8000-00805f9b34fb': // Fitness Machine Control Point
                    logger.info('🎛️ Setting up trainer control notifications...');
                    await characteristic.startNotifications();
                    characteristic.addEventListener('characteristicvaluechanged', this.handleTrainerData.bind(this));
                    break;
                    
                default:
                    // Try to set up notifications for unknown characteristics
                    try {
                        await characteristic.startNotifications();
                        characteristic.addEventListener('characteristicvaluechanged', (event) => {
                            logger.debug(`📊 Data from ${characteristic.uuid}:`, new Uint8Array(event.target.value.buffer));
                        });
                    } catch (notifyError) {
                        // Some characteristics may not support notifications
                        logger.debug(`⚠️ Could not set up notifications for ${characteristic.uuid}`);
                    }
                    break;
            }
            
        } catch (error) {
            logger.warn(`⚠️ Could not set up notifications for ${characteristic.uuid}: ${error.message}`);
        }
    }

    handleHeartRateData(event) {
        try {
            const value = event.target.value;
            const heartRate = value.getUint8(1);
            
            // Log to enhanced monitoring system
            if (typeof window !== 'undefined' && window.deviceConnectionLogger) {
                window.deviceConnectionLogger.logData('hrm', { heartRate });
            }
            
            this.emit('heart-rate-data', {
                heartRate: heartRate,
                source: 'bluetooth'
            });
            
            logger.debug(`❤️ HR: ${heartRate} BPM`);
        } catch (error) {
            logger.error(`❌ Error parsing heart rate data: ${error.message}`);
        }
    }

    handlePowerData(event) {
        try {
            const value = event.target.value;
            // Power data parsing - simplified for demonstration
            const power = value.getUint16(2, true); // Little endian
            const cadence = value.getUint8(4);
            
            this.emit('power-data', {
                power: power,
                cadence: cadence,
                source: 'bluetooth'
            });
            
            logger.debug(`⚡ Power: ${power}W, Cadence: ${cadence}RPM`);
        } catch (error) {
            logger.error(`❌ Error parsing power data: ${error.message}`);
        }
    }

    handleSpeedCadenceData(event) {
        try {
            const value = event.target.value;
            // Speed/cadence data parsing - simplified
            const cadence = value.getUint16(2, true);
            const speed = value.getUint16(4, true);
            
            this.emit('speed-cadence-data', {
                speed: speed * 0.036, // Convert to km/h
                cadence: cadence,
                source: 'bluetooth'
            });
            
            logger.debug(`🚴 Speed: ${(speed * 0.036).toFixed(1)}km/h, Cadence: ${cadence}RPM`);
        } catch (error) {
            logger.error(`❌ Error parsing speed/cadence data: ${error.message}`);
        }
    }

    handleTrainerData(event) {
        try {
            const value = event.target.value;
            // Trainer data parsing - simplified
            const power = value.getUint16(2, true);
            const resistance = value.getUint8(4);
            
            this.emit('trainer-data', {
                power: power,
                resistance: resistance,
                source: 'bluetooth'
            });
            
            logger.debug(`🎛️ Trainer: ${power}W, ${resistance}% resistance`);
        } catch (error) {
            logger.error(`❌ Error parsing trainer data: ${error.message}`);
        }
    }

    onDisconnected(deviceType = 'bluetooth') {
        logger.info(`🔌 ${deviceType} device disconnected`);
        
        // Log disconnection to enhanced monitoring system
        if (typeof window !== 'undefined' && window.deviceConnectionLogger) {
            window.deviceConnectionLogger.logConnection(deviceType, 'disconnected', '- Device disconnected');
        }
        
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.services.clear();
        this.characteristics.clear();
        
        this.emit('disconnected', {
            type: 'bluetooth',
            deviceType: deviceType
        });
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            try {
                await this.device.gatt.disconnect();
                logger.info('🔌 Bluetooth device disconnected successfully');
            } catch (error) {
                logger.error(`❌ Disconnect error: ${error.message}`);
            }
        }
        
        this.onDisconnected();
    }

    async checkBluetoothSupport() {
        if (!navigator.bluetooth) {
            const error = new Error('Web Bluetooth API not supported');
            logger.error('❌ Web Bluetooth API not supported in this browser');
            logger.info('💡 Bluetooth Requirements:');
            logger.info('  • Use Chrome, Edge, or Opera browser');
            logger.info('  • Ensure HTTPS connection (or localhost)');
            logger.info('  • Enable Bluetooth on your device');
            this.emit('error', error);
            return false;
        }
        
        // Check if Bluetooth is available
        try {
            const availability = await navigator.bluetooth.getAvailability();
            if (!availability) {
                const error = new Error('Bluetooth not available on this device');
                logger.error('❌ Bluetooth not available on this device');
                this.emit('error', error);
                return false;
            }
        } catch (availError) {
            logger.warn('⚠️ Could not check Bluetooth availability:', availError.message);
            // Continue anyway as some browsers don't support getAvailability()
        }
        
        return true;
    }

    async showPermissionHelp() {
        logger.info('🔒 Bluetooth Permission Help:');
        logger.info('  • Allow Bluetooth access when prompted');
        logger.info('  • Check browser settings for blocked permissions');
        logger.info('  • Ensure you\'re on HTTPS (or localhost)');
        
        if (platform.info.isAndroid) {
            logger.info('  • Android may require location permission for Bluetooth');
            logger.info('  • Check Settings > Apps > Browser > Permissions');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Static methods for device-specific filters
    static getKickrFilters() {
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
    }

    static getZwiftClickFilters() {
        return {
            filters: [
                { namePrefix: 'Zwift Click' },
                { namePrefix: 'CLICK' },
                { namePrefix: 'Click' }
            ],
            optionalServices: [
                0x1812,    // HID Service
                0x1816,    // Cycling Speed and Cadence
                0x180A,    // Device Information
                0x180F,    // Battery Service
                '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'  // Wahoo custom
            ]
        };
    }

    static getHRMFilters() {
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
                { namePrefix: 'TICKR X' },
                // Fitness Watches and Wristbands
                { namePrefix: 'Apple Watch' },
                { namePrefix: 'Galaxy Watch' },
                { namePrefix: 'Galaxy Fit' },
                { namePrefix: 'Fitbit' },
                { namePrefix: 'Amazfit' },
                { namePrefix: 'Huawei' },
                { namePrefix: 'SUUNTO' },
                { namePrefix: 'Coros' },
                { namePrefix: 'Fenix' },
                { namePrefix: 'Forerunner' },
                { namePrefix: 'Vivoactive' },
                { namePrefix: 'Venu' },
                { namePrefix: 'Instinct' },
                { namePrefix: 'Mi Band' },
                { namePrefix: 'Mi Watch' },
                { namePrefix: 'GT 2' },
                { namePrefix: 'GTS' },
                { namePrefix: 'GTR' },
                { namePrefix: 'Charge' },
                { namePrefix: 'Versa' },
                { namePrefix: 'Ionic' },
                { namePrefix: 'Sense' },
                // Additional common HRM device patterns
                { namePrefix: 'HR' },
                { namePrefix: 'Heart' },
                { namePrefix: 'BLE' }
            ],
            optionalServices: [
                0x180A,    // Device Information
                0x180F,    // Battery Service
                0x1800,    // Generic Access
                0x1801     // Generic Attribute
            ]
        };
    }
}
