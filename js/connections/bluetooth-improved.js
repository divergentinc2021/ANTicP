/**
 * Enhanced Bluetooth Connection with improved Zwift Click support
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
                        0x1812,                          // HID Service (for Zwift Click)
                        '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e', // Wahoo custom
                        '0000fff0-0000-1000-8000-00805f9b34fb', // Nordic UART
                        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
                        '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Issc proprietary service
                    ]
                });
            } catch (selectionError) {
                if (selectionError.name === 'NotFoundError') {
                    logger.info('ℹ️ No Bluetooth device selected or found');
                    logger.info('💡 Make sure your ANT+ device is:');
                    logger.info('  • In pairing mode (check device manual)');
                    logger.info('  • Close to your computer (within 3 feet)');
                    logger.info('  • Not connected to another device');
                    logger.info('  • Powered on and discoverable');
                } else if (selectionError.name === 'SecurityError') {
                    logger.info('ℹ️ Bluetooth access denied or not available');
                    await this.showPermissionHelp();
                } else if (selectionError.name === 'NotSupportedError') {
                    logger.info('ℹ️ Bluetooth not supported on this device/browser');
                } else if (selectionError.message.includes('Invalid Service name')) {
                    logger.error('❌ Bluetooth service configuration error');
                    logger.info('💡 This is a browser compatibility issue - trying fallback method...');
                    // Try with minimal services as fallback
                    device = await navigator.bluetooth.requestDevice({
                        acceptAllDevices: true,
                        optionalServices: [0x180D, 0x1818, 0x1816, 0x1826, 0x180A, 0x180F, 0x1812]
                    });
                }
                
                if (!device) {
                    throw selectionError;
                }
            }

            logger.info(`📱 Found device: ${device.name || 'Unknown Device'} (${device.id})`);
            
            // Connect to GATT server with retry logic
            logger.info('🔗 Connecting to GATT server...');
            let server;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    server = await device.gatt.connect();
                    break;
                } catch (connectError) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        if (connectError.name === 'NetworkError') {
                            logger.error('❌ Failed to connect - device may be out of range or busy');
                            throw new Error('Bluetooth connection failed. Move closer to the device and try again.');
                        }
                        throw connectError;
                    }
                    logger.info(`🔄 Connection attempt ${retryCount} failed, retrying...`);
                    await this.sleep(1000);
                }
            }
            
            // Store connection
            this.device = device;
            this.server = server;
            this.isConnected = true;
            
            logger.info(`✅ Connected to ${device.name || 'Unknown Device'}`);
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

    async checkBluetoothSupport() {
        // Check basic Bluetooth API availability
        if (!navigator.bluetooth) {
            const error = 'Bluetooth API not supported. Please use Chrome, Edge, or Opera browser.';
            logger.error(`❌ ${error}`);
            this.emit('error', new Error(error));
            return false;
        }
        
        // Check HTTPS requirement
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            const error = 'Bluetooth requires HTTPS. Please use https:// or localhost.';
            logger.error(`❌ ${error}`);
            this.emit('error', new Error(error));
            return false;
        }
        
        // Check for Web Serial API (needed for COM port access)
        if ('serial' in navigator) {
            logger.info('✅ Web Serial API available for COM port access');
            
            // Try to check serial permission
            try {
                const serialPorts = await navigator.serial.getPorts();
                if (serialPorts.length === 0) {
                    logger.info('💡 No serial ports currently granted. Click the "🔌 Set Serial Port" button to grant access.');
                } else {
                    logger.info(`📶 Found ${serialPorts.length} previously granted serial port(s)`);
                }
            } catch (error) {
                logger.warn('⚠️ Could not check existing serial ports');
            }
        } else {
            logger.warn('⚠️ Web Serial API not available - limited COM port support');
        }
        
        // Check Bluetooth availability
        try {
            const available = await navigator.bluetooth.getAvailability();
            if (!available) {
                const error = 'Bluetooth is not available on this device.';
                logger.error(`❌ ${error}`);
                logger.info('💡 Make sure Bluetooth is enabled in your system settings');
                this.emit('error', new Error(error));
                return false;
            }
        } catch (e) {
            logger.warn('⚠️ Could not check Bluetooth availability');
        }
        
        // Check location permission for Android
        if (platform.info.isAndroid) {
            try {
                const permission = await navigator.permissions.query({name: 'geolocation'});
                if (permission.state !== 'granted') {
                    logger.warn('⚠️ Location permission required for Bluetooth on Android');
                    logger.info('💡 Please grant location permission when prompted');
                    
                    // Try to request location permission
                    try {
                        await navigator.geolocation.getCurrentPosition(() => {}, () => {});
                    } catch (locationError) {
                        logger.error('❌ Location permission denied - Bluetooth may not work properly');
                    }
                }
            } catch (permError) {
                logger.warn('⚠️ Could not check location permission');
            }
        }
        
        return true;
    }

    // Device-specific connection methods with improved filters
    static getKickrFilters() {
        return {
            filters: [
                { namePrefix: 'KICKR CORE' },
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { services: [0x1826] },  // Fitness Machine
                { services: [0x1818] }   // Cycling Power
            ],
            optionalServices: [
                0x1826,    // Fitness Machine
                0x1818,    // Cycling Power
                0x1816,    // Cycling Speed and Cadence
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
                { namePrefix: 'Click' },
                { namePrefix: 'Zwift' },
                { services: [0x1812] },  // HID Service
                { services: ['6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'] },  // Wahoo custom
                // Add more flexible matching
                { acceptAllDevices: true }  // This will show all devices for manual selection
            ],
            optionalServices: [
                0x1812,    // HID Service
                0x1816,    // Cycling Speed and Cadence
                0x180A,    // Device Information
                0x180F,    // Battery Service
                '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e',  // Wahoo custom
                '0000fff0-0000-1000-8000-00805f9b34fb'   // Nordic UART
            ]
        };
    }

    static getHRMFilters() {
        return {
            filters: [
                { services: [0x180D] },  // Heart Rate
                { namePrefix: 'Polar' },
                { namePrefix: 'Garmin' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'TICKR' }
            ],
            optionalServices: [0x180A, 0x180F]  // Device Information, Battery
        };
    }

    // Rest of the methods remain the same...
    async connectToSpecificDevice(filters, deviceType) {
        if (!await this.checkBluetoothSupport()) {
            return;
        }

        try {
            logger.info(`🔍 Scanning specifically for ${deviceType}...`);
            this.emit('connecting');
            
            const device = await navigator.bluetooth.requestDevice(filters);
            logger.info(`📱 Found ${deviceType}: ${device.name || 'Unknown'}`);
            
            // Connect with retry logic
            let server;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    server = await device.gatt.connect();
                    break;
                } catch (connectError) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        throw connectError;
                    }
                    logger.info(`🔄 ${deviceType} connection attempt ${retryCount} failed, retrying...`);
                    await this.sleep(1000);
                }
            }
            
            // Store connection
            this.device = device;
            this.server = server;
            this.isConnected = true;
            
            logger.info(`✅ ${deviceType} connected`);
            this.emit('connected', { 
                type: 'bluetooth', 
                deviceName: device.name || deviceType,
                deviceId: device.id,
                deviceType
            });
            
            // Discover and setup services
            await this.discoverServices();
            
            // Set up disconnect handling  
            device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
            
        } catch (error) {
            logger.error(`❌ ${deviceType} connection failed: ${error.message}`);
            this.emit('error', error);
            throw error;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async disconnect() {
        if (!this.isConnected || !this.device) return;
        
        try {
            await this.device.gatt.disconnect();
            logger.info('🔌 Bluetooth device disconnected');
        } catch (error) {
            logger.error(`❌ Bluetooth disconnect error: ${error.message}`);
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            deviceName: this.device?.name || null,
            servicesCount: this.services.size,
            type: 'bluetooth'
        };
    }

    // Simplified methods for this example - add the rest as needed
    async showPermissionHelp() {
        logger.info('🔐 Bluetooth Permission Help:');
        logger.info('  • Make sure you\'re using HTTPS (not HTTP)');
        logger.info('  • Allow Bluetooth access when prompted');
        
        if (platform.info.isAndroid) {
            logger.info('  • Grant location permission (required on Android)');
            logger.info('  • Enable "Precise location" in Chrome site settings');
        }
        
        logger.info('  • Check browser settings for blocked permissions');
        logger.info('  • Try refreshing the page and clicking again');
    }

    async discoverServices() {
        // Simplified for this example
        if (!this.server) return;
        logger.info('🔍 Discovering services...');
        // Add full service discovery implementation as needed
    }

    onDisconnected(event) {
        logger.warn('⚠️ Bluetooth device disconnected');
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.services.clear();
        this.characteristics.clear();
        this.emit('disconnected');
    }
}
