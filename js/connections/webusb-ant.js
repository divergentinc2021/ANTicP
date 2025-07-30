/**
 * WebUSB ANT+ Connection Module
 * Direct USB communication bypassing COM ports
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from '../core/logger.js';
import { platform } from '../core/platform.js';

export class WebUSBANTConnection extends EventEmitter {
    constructor() {
        super();
        this.device = null;
        this.interface = null;
        this.endpointIn = null;
        this.endpointOut = null;
        this.isConnected = false;
        this.isInitialized = false;
        this.transferLoop = null;
    }

    async connect() {
        if (!platform.isWebUSBSupported()) {
            const error = 'WebUSB not supported on this platform';
            logger.error(`❌ ${error}`);
            throw new Error(error);
        }

        try {
            logger.info('🔍 Requesting ANT+ USB device via WebUSB...');
            logger.info('💡 This bypasses COM port requirements');
            this.emit('connecting');
            
            // Check WebUSB API availability
            if (!navigator.usb) {
                throw new Error('WebUSB API not supported. Please use Chrome 61+ or Edge 79+.');
            }
            
            let device;
            try {
                // Request ANT+ device with specific vendor/product IDs
                device = await navigator.usb.requestDevice({
                    filters: [
                        // Garmin/Dynastream ANT+ devices
                        { vendorId: 0x0FCF, productId: 0x1008 }, // ANT USB Stick 2
                        { vendorId: 0x0FCF, productId: 0x1009 }, // ANT USB-m Stick
                        { vendorId: 0x0FCF, productId: 0x1004 }, // ANT Development Board
                        { vendorId: 0x0FCF, productId: 0x1006 }, // ANT USB Stick
                        // Generic ANT+ compatible devices
                        { vendorId: 0x0FCF }, // Any Dynastream device
                    ]
                });
                logger.info(`📱 ANT+ device selected: ${device.productName || 'ANT+ Device'}`);
            } catch (selectionError) {
                if (selectionError.name === 'NotFoundError') {
                    logger.info('ℹ️ No ANT+ USB device selected.');
                    logger.info('💡 Make sure your ANT+ USB stick is plugged in');
                    logger.info('💡 Look for "ANT USB Stick" in the device list');
                } else if (selectionError.name === 'SecurityError') {
                    logger.info('ℹ️ WebUSB access denied - make sure you\'re using HTTPS');
                }
                throw selectionError;
            }
            
            // Open and configure the device
            try {
                await device.open();
                logger.info('🔌 USB device opened successfully');
                
                // Get device info
                logger.info(`📊 Device Info:`);
                logger.info(`   Vendor ID: 0x${device.vendorId.toString(16).padStart(4, '0')}`);
                logger.info(`   Product ID: 0x${device.productId.toString(16).padStart(4, '0')}`);
                logger.info(`   Product Name: ${device.productName || 'Unknown'}`);
                logger.info(`   Manufacturer: ${device.manufacturerName || 'Unknown'}`);
                
                // Select configuration
                if (device.configuration === null) {
                    await device.selectConfiguration(1);
                    logger.info('⚙️ Configuration 1 selected');
                }
                
                // Find and claim the interface
                const interfaces = device.configuration.interfaces;
                logger.info(`🔍 Found ${interfaces.length} interface(s)`);
                
                // Look for the first available interface
                let targetInterface = null;
                for (const iface of interfaces) {
                    if (!iface.claimed) {
                        targetInterface = iface;
                        break;
                    }
                }
                
                if (!targetInterface) {
                    throw new Error('No available interface found on ANT+ device');
                }
                
                await device.claimInterface(targetInterface.interfaceNumber);
                this.interface = targetInterface;
                logger.info(`✅ Interface ${targetInterface.interfaceNumber} claimed`);
                
                // Find bulk endpoints
                const alt = targetInterface.alternate;
                this.endpointOut = alt.endpoints.find(ep => ep.direction === 'out' && ep.type === 'bulk');
                this.endpointIn = alt.endpoints.find(ep => ep.direction === 'in' && ep.type === 'bulk');
                
                if (!this.endpointOut || !this.endpointIn) {
                    throw new Error('Required bulk endpoints not found on ANT+ device');
                }
                
                logger.info(`📤 OUT Endpoint: ${this.endpointOut.endpointNumber} (packet size: ${this.endpointOut.packetSize})`);
                logger.info(`📥 IN Endpoint: ${this.endpointIn.endpointNumber} (packet size: ${this.endpointIn.packetSize})`);
                
            } catch (openError) {
                if (openError.name === 'NetworkError') {
                    logger.error('❌ Failed to open USB device - may be in use by another application');
                    throw new Error('ANT+ device is in use. Close other ANT+ software and try again.');
                }
                throw openError;
            }
            
            this.device = device;
            this.isConnected = true;
            
            const deviceName = `${device.manufacturerName || 'ANT+'} ${device.productName || 'USB Device'}`;
            logger.info(`🔌 WebUSB ANT+ connected: ${deviceName}`);
            this.emit('connected', { type: 'webusb', deviceName });
            
            // Initialize ANT+ communication
            await this.initialize();
            
            // Start listening for data
            this.startListening();
            
        } catch (error) {
            logger.error(`❌ WebUSB connection failed: ${error.message}`);
            this.emit('error', error);
            
            if (error.name === 'NotFoundError') {
                logger.info('💡 WebUSB Device Selection:');
                logger.info('  1. Make sure ANT+ USB stick is plugged in');
                logger.info('  2. Look for "ANT USB Stick" or "Dynastream" in device list');
                logger.info('  3. This works with libusbK or libusb drivers');
            } else if (error.name === 'SecurityError') {
                logger.info('💡 WebUSB Security:');
                logger.info('  • Make sure you\'re using HTTPS or localhost');
                logger.info('  • Enable chrome://flags/#enable-experimental-web-platform-features');
            } else if (error.message.includes('in use')) {
                logger.info('💡 Device In Use:');
                logger.info('  • Close ANT+ simulators or other ANT+ software');
                logger.info('  • Close Garmin Express');
                logger.info('  • Try disconnecting and reconnecting the USB stick');
            }
            throw error;
        }
    }

    async initialize() {
        if (!this.device) {
            throw new Error('No WebUSB connection available for initialization');
        }
        
        try {
            logger.info('🔧 Initializing ANT+ via WebUSB...');
            this.emit('initializing');
            
            // ANT+ Network Key (default public network key)
            const networkKey = [0xB9, 0xA5, 0x21, 0xFB, 0xBD, 0x72, 0xC3, 0x45];
            
            // Reset system first
            await this.sendMessage([0x4A, 0x00]);
            await this.sleep(1000);
            
            // Set network key for network 0
            await this.sendMessage([0x46, 0x00, ...networkKey]);
            await this.sleep(100);
            
            // Assign channels for different device types
            // Channel 0: FE-C (Fitness Equipment)
            await this.sendMessage([0x42, 0x00, 0x10, 0x00]);
            await this.sendMessage([0x51, 0x00, 0x11, 0x05, 0x01]);
            await this.sendMessage([0x43, 0x00, 0xF6, 0x1F]);
            await this.sendMessage([0x45, 0x00, 57]);
            await this.sleep(50);
            
            // Channel 1: Heart Rate  
            await this.sendMessage([0x42, 0x01, 0x10, 0x00]);
            await this.sendMessage([0x51, 0x01, 0x78, 0x05, 0x01]);
            await this.sendMessage([0x43, 0x01, 0x86, 0x1F]);
            await this.sendMessage([0x45, 0x01, 57]);
            await this.sleep(50);
            
            // Channel 2: Power Meter
            await this.sendMessage([0x42, 0x02, 0x10, 0x00]);
            await this.sendMessage([0x51, 0x02, 0x0B, 0x05, 0x01]);
            await this.sendMessage([0x43, 0x02, 0x86, 0x1F]);
            await this.sendMessage([0x45, 0x02, 57]);
            await this.sleep(50);
            
            // Open channels
            await this.sendMessage([0x4B, 0x00]);
            await this.sendMessage([0x4B, 0x01]);
            await this.sendMessage([0x4B, 0x02]);
            await this.sleep(100);
            
            this.isInitialized = true;
            logger.info('✅ ANT+ WebUSB initialization complete');
            logger.info('📡 Listening for ANT+ devices on all channels...');
            this.emit('initialized');
            
        } catch (error) {
            logger.error(`❌ ANT+ WebUSB initialization failed: ${error.message}`);
            this.emit('error', error);
            throw error;
        }
    }

    async sendMessage(payload) {
        if (!this.device || !this.endpointOut) {
            throw new Error('No WebUSB connection available for sending');
        }
        
        const SYNC_BYTE = 0xA4;
        const length = payload.length;
        
        // Build complete ANT+ message: [SYNC][LENGTH][DATA...][CHECKSUM]
        const message = [SYNC_BYTE, length, ...payload];
        
        // Calculate checksum
        let checksum = 0;
        for (let i = 0; i < message.length; i++) {
            checksum ^= message[i];
        }
        message.push(checksum);
        
        try {
            // Send via WebUSB bulk transfer
            const result = await this.device.transferOut(this.endpointOut.endpointNumber, new Uint8Array(message));
            
            if (result.status !== 'ok') {
                throw new Error(`USB transfer failed: ${result.status}`);
            }
            
            logger.debug(`📤 WebUSB ANT+: ${message.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
            
        } catch (error) {
            logger.error(`❌ Failed to send ANT+ message via WebUSB: ${error.message}`);
            throw error;
        }
    }

    async startListening() {
        if (!this.device || !this.endpointIn) return;
        
        logger.info('👂 Starting WebUSB data listener...');
        this.transferLoop = this.continuousRead();
    }

    async continuousRead() {
        while (this.isConnected && this.device) {
            try {
                // Read data from USB endpoint
                const result = await this.device.transferIn(this.endpointIn.endpointNumber, this.endpointIn.packetSize);
                
                if (result.status === 'ok' && result.data && result.data.byteLength > 0) {
                    this.processData(new Uint8Array(result.data.buffer));
                }
                
                // Small delay to prevent overwhelming the CPU
                await this.sleep(1);
                
            } catch (error) {
                if (this.isConnected) {
                    logger.error(`❌ WebUSB read error: ${error.message}`);
                    
                    // Try to recover from USB errors
                    if (error.name === 'NetworkError') {
                        logger.info('🔄 USB connection lost, attempting recovery...');
                        await this.sleep(1000);
                        continue;
                    }
                    
                    this.emit('error', error);
                }
                break;
            }
        }
    }

    processData(data) {
        try {
            logger.debug(`📦 WebUSB ANT+ Data: ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
            
            // ANT+ message structure: [SYNC] [LENGTH] [MESG_ID] [DATA...] [CHECKSUM]
            for (let i = 0; i < data.length; i++) {
                if (data[i] === 0xA4 && i + 3 < data.length) {
                    const length = data[i + 1];
                    const messageId = data[i + 2];
                    
                    if (i + length + 4 <= data.length) {
                        const messageData = data.slice(i + 3, i + 3 + length);
                        this.processMessage(messageId, messageData);
                        i += length + 3;
                    }
                }
            }
        } catch (error) {
            logger.error(`❌ Error processing WebUSB ANT+ data: ${error.message}`);
        }
    }

    processMessage(messageId, data) {
        try {
            switch (messageId) {
                case 0x4E: // Broadcast data
                    this.processBroadcastData(data);
                    break;
                case 0x40: // Channel event
                    this.processChannelEvent(data);
                    break;
                case 0x3E: // Channel response
                    this.processChannelResponse(data);
                    break;
                default:
                    logger.debug(`📡 ANT+ Message ID: 0x${messageId.toString(16)}, Data: ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
            }
        } catch (error) {
            logger.error(`❌ Error processing ANT+ message: ${error.message}`);
        }
    }

    processBroadcastData(data) {
        if (data.length < 9) return;
        
        const channel = data[0];
        const deviceType = data[8];
        const deviceId = (data[7] << 8) | data[6];
        const payload = data.slice(1, 9);
        
        logger.debug(`📡 Channel: ${channel}, Device Type: 0x${deviceType.toString(16)}, Device ID: ${deviceId}`);
        
        // Emit device data for processing by device modules
        this.emit('device-data', {
            channel,
            deviceType,
            deviceId,
            payload,
            source: 'webusb'
        });
    }

    processChannelEvent(data) {
        if (data.length < 3) return;
        
        const channel = data[0];
        const messageId = data[1];
        const messageCode = data[2];
        
        switch (messageCode) {
            case 0x01:
                logger.debug(`✅ ANT+ Channel ${channel}: Command successful`);
                break;
            case 0x15:
                logger.warn(`⚠️ ANT+ Channel ${channel}: Channel in wrong state`);
                break;
            case 0x28:
                logger.debug(`🔄 ANT+ Channel ${channel}: Transfer in progress`);
                break;
            default:
                logger.debug(`📡 ANT+ Channel ${channel} Event: 0x${messageCode.toString(16)}`);
        }
    }

    processChannelResponse(data) {
        if (data.length < 3) return;
        
        const channel = data[0];
        const messageId = data[1];
        const messageCode = data[2];
        
        logger.debug(`📡 ANT+ Channel ${channel} Response to 0x${messageId.toString(16)}: 0x${messageCode.toString(16)}`);
    }

    async disconnect() {
        if (!this.isConnected) return;
        
        try {
            this.isConnected = false;
            
            // Stop transfer loop
            if (this.transferLoop) {
                // The loop will exit naturally when isConnected becomes false
                this.transferLoop = null;
            }
            
            if (this.device) {
                // Release interface
                if (this.interface) {
                    await this.device.releaseInterface(this.interface.interfaceNumber);
                }
                
                // Close device
                await this.device.close();
                this.device = null;
            }
            
            this.interface = null;
            this.endpointIn = null;
            this.endpointOut = null;
            this.isInitialized = false;
            
            logger.info('🔌 WebUSB ANT+ device disconnected');
            this.emit('disconnected');
            
        } catch (error) {
            logger.error(`❌ WebUSB disconnect error: ${error.message}`);
            this.emit('error', error);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            connected: this.isConnected,
            initialized: this.isInitialized,
            type: 'webusb',
            deviceInfo: this.device ? {
                vendorId: this.device.vendorId,
                productId: this.device.productId,
                productName: this.device.productName,
                manufacturerName: this.device.manufacturerName
            } : null
        };
    }
}
