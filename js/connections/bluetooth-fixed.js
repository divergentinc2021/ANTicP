/**
 * Bluetooth Connection Module - FIXED VERSION
 * Addresses Bluetooth permissions, device selection, and connection issues
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
                // Use more comprehensive filters for ANT+ devices
                device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: [
                        'heart_rate',                    // 0x180D - Heart Rate
                        'cycling_power',                 // 0x1818 - Cycling Power  
                        'cycling_speed_and_cadence',     // 0x1816 - CSC
                        'fitness_equipment',             // 0x1826 - FTMS
                        'device_information',            // 0x180A - Device Info
                        'battery_service',               // 0x180F - Battery
                        'generic_access',                // 0x1800 - Generic Access
                        'generic_attribute',             // 0x1801 - Generic Attribute
                        '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e', // Wahoo custom
                        '00001812-0000-1000-8000-00805f9b34fb', // HID Service
                        '0000fff0-0000-1000-8000-00805f9b34fb', // Nordic UART
                        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
                        '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Issc proprietary service
                    ]
                });
            } catch (selectionError) {
                if (selectionError.name === 'NotFoundError') {
                    logger.info('ℹ️ No Bluetooth device selected or found');
                    logger.info('💡 Make sure your ANT+ device is:');
                    logger.info('  • In pairing mode');
                    logger.info('  • Close to your computer (within 3 feet)');
                    logger.info('  • Not connected to another device');
                } else if (selectionError.name === 'SecurityError') {
                    logger.info('ℹ️ Bluetooth access denied or not available');
                    await this.showPermissionHelp();
                } else if (selectionError.name === 'NotSupportedError') {
                    logger.info('ℹ️ Bluetooth not supported on this device/browser');
                }
                throw selectionError;
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
            } else if (error.name === 'SecurityError') {
                await this.showPermissionHelp();
            } else if (error.name === 'NetworkError') {
                logger.info('💡 Connection Issues:');
                logger.info('  • Move closer to the Bluetooth device');
                logger.info('  • Make sure the device isn\'t connected elsewhere');
                logger.info('  • Try restarting Bluetooth on your computer');
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

    async discoverServices() {
        if (!this.server) return;
        
        logger.info('🔍 Discovering services...');
        this.emit('discovering-services');
        
        try {
            // Get primary services
            const services = await this.server.getPrimaryServices();
            logger.info(`📋 Found ${services.length} services`);
            
            for (const service of services) {
                logger.debug(`🔧 Service: ${service.uuid}`);
                this.services.set(service.uuid, service);
                
                try {
                    const characteristics = await service.getCharacteristics();
                    logger.debug(`  📊 ${characteristics.length} characteristics`);
                    
                    for (const char of characteristics) {
                        logger.debug(`    📈 Characteristic: ${char.uuid}`);
                        this.characteristics.set(char.uuid, char);
                        
                        // Set up notifications for known characteristics
                        if (char.properties.notify) {
                            try {
                                await char.startNotifications();
                                char.addEventListener('characteristicvaluechanged', this.handleData.bind(this));
                                logger.debug(`    🔔 Notifications enabled for ${char.uuid}`);
                            } catch (e) {
                                logger.debug(`    ⚠️ Failed to enable notifications: ${e.message}`);
                            }
                        }
                    }
                } catch (charError) {
                    logger.debug(`  ❌ Failed to get characteristics: ${charError.message}`);
                }
            }
            
            // Start monitoring specific known services
            await this.startServiceMonitoring();
            this.emit('services-discovered', this.services);
            
        } catch (error) {
            logger.error(`❌ Service discovery failed: ${error.message}`);
            this.emit('error', error);
        }
    }

    async startServiceMonitoring() {
        if (!this.server) return;
        
        try {
            // Heart Rate Service
            if (this.services.has('heart_rate')) {
                logger.info('❤️ Setting up Heart Rate monitoring...');
                const hrService = this.services.get('heart_rate');
                const hrChar = await hrService.getCharacteristic('heart_rate_measurement');
                await hrChar.startNotifications();
                hrChar.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleHeartRateData(event);
                });
                logger.info('✅ Heart Rate monitoring active');
            }
            
            // Cycling Power Service  
            if (this.services.has('cycling_power')) {
                logger.info('⚡ Setting up Power monitoring...');
                const powerService = this.services.get('cycling_power');
                const powerChar = await powerService.getCharacteristic('cycling_power_measurement');
                await powerChar.startNotifications();
                powerChar.addEventListener('characteristicvaluechanged', (event) => {
                    this.handlePowerData(event);
                });
                logger.info('✅ Power monitoring active');
            }
            
            // Fitness Equipment (FTMS)
            if (this.services.has('fitness_equipment')) {
                logger.info('🚴 Setting up Fitness Equipment monitoring...');
                const ftmsService = this.services.get('fitness_equipment');
                
                try {
                    const indoorBikeChar = await ftmsService.getCharacteristic('indoor_bike_data');
                    await indoorBikeChar.startNotifications();
                    indoorBikeChar.addEventListener('characteristicvaluechanged', (event) => {
                        this.handleTrainerData(event);
                    });
                    logger.info('✅ Indoor Bike Data monitoring active');
                } catch (e) {
                    logger.info('ℹ️ Indoor Bike Data not available');
                }
                
                try {
                    const controlChar = await ftmsService.getCharacteristic('fitness_machine_control_point');
                    this.controlCharacteristic = controlChar;
                    logger.info('✅ Fitness Machine Control available');
                } catch (e) {
                    logger.info('ℹ️ Fitness Machine Control not available');
                }
            }
            
            // Speed and Cadence
            if (this.services.has('cycling_speed_and_cadence')) {
                logger.info('🚴 Setting up Speed/Cadence monitoring...');
                const cscService = this.services.get('cycling_speed_and_cadence');
                const cscChar = await cscService.getCharacteristic('csc_measurement');
                await cscChar.startNotifications(); 
                cscChar.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleSpeedCadenceData(event);
                });
                logger.info('✅ Speed/Cadence monitoring active');
            }
            
        } catch (error) {
            logger.error(`❌ Service monitoring setup failed: ${error.message}`);
        }
    }

    handleData(event) {
        const char = event.target;
        const value = event.target.value;
        const data = new Uint8Array(value.buffer);
        
        logger.debug(`📊 Data from ${char.uuid}: ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        
        // Emit raw data for processing by device modules
        this.emit('device-data', {
            serviceUuid: char.service.uuid,
            characteristicUuid: char.uuid,
            data: data,
            source: 'bluetooth'
        });
    }

    handleHeartRateData(event) {
        try {
            const value = event.target.value;
            const heartRate = value.getUint8(1);
            
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
            const flags = value.getUint16(0, true);
            const power = value.getUint16(2, true);
            
            let cadence = 0;
            if (flags & 0x20 && value.byteLength >= 6) {
                cadence = value.getUint8(5);
            }
            
            this.emit('power-data', {
                power: power,
                cadence: cadence,
                speed: (power / 10).toFixed(1),
                resistance: Math.round(power / 20),
                source: 'bluetooth'
            });
            
            logger.debug(`⚡ Power: ${power}W, Cadence: ${cadence}RPM`);
        } catch (error) {
            logger.error(`❌ Error parsing power data: ${error.message}`);
        }
    }

    handleTrainerData(event) {
        try {
            const value = event.target.value;
            const flags = value.getUint16(0, true);
            let offset = 2;
            
            let power = 0, cadence = 0, speed = 0, resistance = 0;
            
            if (flags & 0x01) {
                speed = value.getUint16(offset, true) / 100;
                offset += 2;
            }
            
            if (flags & 0x08) {
                cadence = value.getUint16(offset, true) / 2;
                offset += 2;
            }
            
            if (flags & 0x40) {
                power = value.getInt16(offset, true);
                offset += 2;
            }
            
            if (flags & 0x200) {
                resistance = value.getInt16(offset, true);
            }
            
            this.emit('trainer-data', {
                power: power,
                cadence: cadence,
                speed: speed.toFixed(1),
                resistance: resistance,
                source: 'trainer'
            });
            
            logger.debug(`🚴 Trainer: ${power}W, ${cadence}RPM, ${speed.toFixed(1)}km/h`);
        } catch (error) {
            logger.error(`❌ Error parsing trainer data: ${error.message}`);
        }
    }

    handleSpeedCadenceData(event) {
        try {
            const value = event.target.value;
            const flags = value.getUint8(0);
            
            let cadence = 0, speed = 0;
            
            if (flags & 0x01) {
                const wheelRevs = value.getUint32(1, true);
                const wheelTime = value.getUint16(5, true);
                speed = (wheelRevs * 2.1 * 3.6 / 1000).toFixed(1);
            }
            
            if (flags & 0x02) {
                const crankRevs = value.getUint16(7, true);
                cadence = Math.round(crankRevs / 60);
            }
            
            this.emit('speed-cadence-data', {
                power: 0,
                cadence: cadence,
                speed: speed,
                resistance: 0,
                source: 'bluetooth'
            });
            
            logger.debug(`🚴 Speed: ${speed}km/h, Cadence: ${cadence}RPM`);
        } catch (error) {
            logger.error(`❌ Error parsing speed/cadence data: ${error.message}`);
        }
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

    async disconnect() {
        if (!this.isConnected || !this.device) return;
        
        try {
            await this.device.gatt.disconnect();
            logger.info('🔌 Bluetooth device disconnected');
        } catch (error) {
            logger.error(`❌ Bluetooth disconnect error: ${error.message}`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            connected: this.isConnected,
            deviceName: this.device?.name || null,
            servicesCount: this.services.size,
            type: 'bluetooth'
        };
    }

    // Device-specific connection methods
    static getKickrFilters() {
        return {
            filters: [
                { namePrefix: 'KICKR CORE' },
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { services: ['fitness_equipment'] },
                { services: ['cycling_power'] }
            ],
            optionalServices: [
                'fitness_equipment',
                'cycling_power', 
                'cycling_speed_and_cadence',
                'device_information',
                'battery_service',
                '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'
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
                '00001812-0000-1000-8000-00805f9b34fb', // HID Service
                'cycling_speed_and_cadence',
                'device_information', 
                'battery_service',
                '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'
            ]
        };
    }

    static getHRMFilters() {
        return {
            filters: [
                { services: ['heart_rate'] },
                { namePrefix: 'Polar' },
                { namePrefix: 'Garmin' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'TICKR' }
            ],
            optionalServices: ['device_information', 'battery_service']
        };
    }
}
