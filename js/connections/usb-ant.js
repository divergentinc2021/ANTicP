/**
 * USB ANT+ Connection Module
 * Based on the working implementation from usb-fix.js
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from '../core/logger.js';
import { platform } from '../core/platform.js';

export class USBANTConnection extends EventEmitter {
    constructor() {
        super();
        this.port = null;
        this.reader = null;
        this.isConnected = false;
        this.isInitialized = false;
    }

    async connect() {
        if (!platform.isUSBSupported()) {
            const error = 'USB ANT+ not supported on this platform';
            logger.error(`❌ ${error}`);
            throw new Error(error);
        }

        try {
            logger.info('🔍 Requesting USB ANT+ device...');
            this.emit('connecting');
            
            // Request serial port with optional filters for common ANT+ device identifiers
            const port = await navigator.serial.requestPort({
                filters: [
                    // Common ANT+ USB stick vendor IDs
                    { usbVendorId: 0x0FCF }, // Dynastream/Garmin ANT+ sticks
                    { usbVendorId: 0x1FC9 }, // Generic ANT+ devices
                    { usbVendorId: 0x0483 }, // Some other ANT+ manufacturers
                ]
            });
            
            logger.info('📱 ANT+ device selected, opening connection...');
            
            // Open with standard ANT+ baud rate
            await port.open({ baudRate: 57600 });
            
            this.port = port;
            this.isConnected = true;
            
            logger.info('🔌 USB ANT+ stick connected successfully');
            this.emit('connected', { type: 'usb', deviceName: 'USB ANT+ Stick' });
            
            // Initialize ANT+ stick with proper network key and setup
            await this.initialize();
            
            // Start listening for data
            this.startListening();
            
        } catch (error) {
            logger.error(`❌ USB connection failed: ${error.message}`);
            this.emit('error', error);
            
            if (error.message.includes('No port selected')) {
                logger.info('ℹ️ Make sure to select an ANT+ USB stick, not a Bluetooth adapter');
                logger.info('ℹ️ ANT+ sticks usually appear as "USB Serial Device" or "Silicon Labs CP210x"');
            }
            throw error;
        }
    }

    async initialize() {
        if (!this.port) {
            throw new Error('No USB connection available for initialization');
        }
        
        try {
            logger.info('🔧 Initializing ANT+ stick...');
            this.emit('initializing');
            
            // ANT+ Network Key (default public network key)
            const networkKey = [0xB9, 0xA5, 0x21, 0xFB, 0xBD, 0x72, 0xC3, 0x45];
            
            // Reset system
            await this.sendMessage([0x4A, 0x00]);
            await this.sleep(1000);
            
            // Set network key
            await this.sendMessage([0x46, 0x00, ...networkKey]);
            await this.sleep(100);
            
            // Assign channels for different device types
            // Channel 0: FE-C (Trainer)
            await this.sendMessage([0x42, 0x00, 0x10, 0x00]); // Assign channel 0, type 0x10 (slave)
            await this.sendMessage([0x51, 0x00, 0x11, 0x05, 0x01]); // Set channel ID: device type 0x11, transmission type 0x05
            await this.sendMessage([0x43, 0x00, 0xF6, 0x1F]); // Set channel period (8182 = 0x1FF6)
            await this.sendMessage([0x45, 0x00, 57]); // Set RF frequency (2457 MHz)
            
            // Channel 1: Heart Rate  
            await this.sendMessage([0x42, 0x01, 0x10, 0x00]); // Assign channel 1
            await this.sendMessage([0x51, 0x01, 0x78, 0x05, 0x01]); // Device type 0x78 (HR)
            await this.sendMessage([0x43, 0x01, 0x86, 0x1F]); // Period 8070 (0x1F86)
            await this.sendMessage([0x45, 0x01, 57]); // RF frequency
            
            // Channel 2: Power Meter
            await this.sendMessage([0x42, 0x02, 0x10, 0x00]); // Assign channel 2  
            await this.sendMessage([0x51, 0x02, 0x0B, 0x05, 0x01]); // Device type 0x0B (Power)
            await this.sendMessage([0x43, 0x02, 0x86, 0x1F]); // Period 8070
            await this.sendMessage([0x45, 0x02, 57]); // RF frequency
            
            // Open channels
            await this.sendMessage([0x4B, 0x00]); // Open channel 0
            await this.sendMessage([0x4B, 0x01]); // Open channel 1  
            await this.sendMessage([0x4B, 0x02]); // Open channel 2
            
            this.isInitialized = true;
            logger.info('✅ ANT+ stick initialized successfully');
            logger.info('📡 Listening for FE-C trainers, heart rate monitors, and power meters...');
            this.emit('initialized');
            
        } catch (error) {
            logger.error(`❌ ANT+ initialization failed: ${error.message}`);
            this.emit('error', error);
            throw error;
        }
    }

    async sendMessage(payload) {
        if (!this.port || !this.port.writable) {
            throw new Error('No writable USB connection');
        }
        
        const SYNC_BYTE = 0xA4;
        const length = payload.length;
        
        // Build complete message: [SYNC][LENGTH][DATA...][CHECKSUM]
        const message = [SYNC_BYTE, length, ...payload];
        
        // Calculate checksum
        let checksum = 0;
        for (let i = 0; i < message.length; i++) {
            checksum ^= message[i];
        }
        message.push(checksum);
        
        // Send message
        const writer = this.port.writable.getWriter();
        await writer.write(new Uint8Array(message));
        writer.releaseLock();
        
        logger.debug(`📤 ANT+: ${message.map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    }

    async startListening() {
        if (!this.port || !this.port.readable) return;
        
        try {
            this.reader = this.port.readable.getReader();
            
            while (this.isConnected) {
                const { value, done } = await this.reader.read();
                if (done) break;
                
                this.processData(value);
            }
        } catch (error) {
            logger.error(`❌ USB reading error: ${error.message}`);
            this.emit('error', error);
        }
    }

    processData(data) {
        try {
            const dataArray = new Uint8Array(data);
            logger.debug(`📦 USB ANT+ Data: ${Array.from(dataArray).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
            
            // ANT+ message structure: [SYNC] [LENGTH] [MESG_ID] [DATA...] [CHECKSUM]
            // SYNC byte is usually 0xA4
            
            for (let i = 0; i < dataArray.length; i++) {
                if (dataArray[i] === 0xA4 && i + 3 < dataArray.length) {
                    const length = dataArray[i + 1];
                    const messageId = dataArray[i + 2];
                    
                    if (i + length + 4 <= dataArray.length) {
                        const messageData = dataArray.slice(i + 3, i + 3 + length);
                        this.processMessage(messageId, messageData);
                        i += length + 3; // Skip to after this message
                    }
                }
            }
        } catch (error) {
            logger.error(`❌ Error processing ANT+ data: ${error.message}`);
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
            source: 'usb'
        });
    }

    processChannelEvent(data) {
        if (data.length < 3) return;
        
        const channel = data[0];
        const messageId = data[1];
        const messageCode = data[2];
        
        switch (messageCode) {
            case 0x01: // Response no error
                logger.debug(`✅ ANT+ Channel ${channel}: Command successful`);
                break;
            case 0x15: // Channel in wrong state
                logger.warn(`⚠️ ANT+ Channel ${channel}: Channel in wrong state`);
                break;
            case 0x28: // Transfer in progress
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
            
            if (this.reader) {
                await this.reader.cancel();
                this.reader.releaseLock();
                this.reader = null;
            }
            
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
            
            this.isInitialized = false;
            logger.info('🔌 USB ANT+ stick disconnected');
            this.emit('disconnected');
            
        } catch (error) {
            logger.error(`❌ USB disconnect error: ${error.message}`);
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
            type: 'usb'
        };
    }
}
