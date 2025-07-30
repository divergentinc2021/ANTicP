/**
 * Bluetooth Connection Module
 * Based on the working implementation from bluetooth-fix.js
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
        if (!platform.isBluetoothSupported()) {
            const error = 'Bluetooth not supported or permissions missing';
            logger.error(`❌ ${error}`);
            throw new Error(error);
        }

        try {
            logger.info('🔍 Scanning for Bluetooth ANT+ devices...');
            this.emit('connecting');
            
            // Use more specific filters for ANT+ devices
            const device = await navigator.bluetooth.requestDevice({
                // Accept any device, but prioritize ANT+ devices
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
                    '0000fff0-0000-1000-8000-00805f9b34fb'  // Nordic UART
                ]
            });

            logger.info(`📱 Found device: ${device.name || 'Unknown Device'} (${device.id})`);
            
            // Connect to GATT server
            logger.info('🔗 Connecting to GATT server...');
            const server = await device.gatt.connect();
            
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
            
            if (error.message.includes('User cancelled')) {
                logger.info('ℹ️ Device selection was cancelled');
            } else if (error.message.includes('not found')) {
                logger.info('ℹ️ No ANT+ compatible Bluetooth devices found');
                logger.info('ℹ️ Make sure your ANT+ device is in pairing mode');
            } else if (error.message.includes('GATT')) {
                logger.info('ℹ️ Failed to connect to device - try moving closer or restarting the device');
            }
            
            throw error;
        }
    }

    async connectToSpecificDevice(filters, deviceType) {
        if (!platform.isBluetoothSupported()) {
            const error = 'Bluetooth not supported or permissions missing';
            logger.error(`❌ ${error}`);
            throw new Error(error);
        }

        try {
            logger.info(`🔍 Scanning specifically for ${deviceType}...`);
            this.emit('connecting');
            
            const device = await navigator.bluetooth.requestDevice(filters);
            logger.info(`📱 Found ${deviceType}: ${device.name || 'Unknown'}`);
            
            const server = await device.gatt.connect();
            
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
