// Enhanced Zwift Click Real Device Integration - UPDATED VERSION
// This module handles real Zwift Click device input and translates it to virtual gear changes
// Updated with proper Zwift service UUIDs and protocol handling based on SwiftControl research

class ZwiftClickHandler {
    constructor() {
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.onGearChangeCallback = null;
        this.zwiftService = null;
        this.writeCharacteristic = null;
        this.indicateCharacteristic = null;
        this.notifyCharacteristic = null;
        this.lastButtonState = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
    }

    // Connect to real Zwift Click device using updated service UUIDs
    async connectRealDevice() {
        try {
            console.log('🔍 Scanning for Zwift Click device...');
            
            if (window.addConnectionLog) {
                window.addConnectionLog('🔍 Scanning for Zwift Click device...', 'info');
            }
            
            // Request Zwift Click device with proper service UUIDs
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'CLICK' },
                    { namePrefix: 'Click' },
                    { namePrefix: 'ZC' }
                ],
                optionalServices: [
                    // Zwift Classic Service UUID (older devices)
                    '00000001-19ca-4651-86e5-fa29dcdd09d1',
                    // Zwift New Service UUID (newer devices) - FC82 as 128-bit
                    '0000fc82-0000-1000-8000-00805f9b34fb',
                    // Standard services that might be present
                    0x1812,    // Human Interface Device
                    0x180A,    // Device Information
                    0x180F,    // Battery Service
                    0x1800,    // Generic Access
                    0x1801,    // Generic Attribute
                    // Fallback custom services
                    '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'
                ]
            });

            console.log('✅ Zwift Click device selected:', this.device.name || 'Unknown Click Device');
            
            if (window.addConnectionLog) {
                window.addConnectionLog(`✅ Zwift Click device selected: ${this.device.name || 'Unknown Click Device'}`, 'success');
            }

            // Connect to GATT server with retry logic
            await this.connectWithRetry();
            
            // Set up disconnect handler
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

            // Try to find and setup Zwift service
            const serviceSetup = await this.setupZwiftService();
            
            if (serviceSetup) {
                this.isConnected = true;
                
                if (window.deviceConnectionLogger) {
                    window.deviceConnectionLogger.logConnection('zwift-click', 'connected', this.device.name);
                }
                
                if (window.addConnectionLog) {
                    window.addConnectionLog('🎮 Real Zwift Click connected and ready for button presses!', 'success');
                    window.addConnectionLog('💡 Try pressing the buttons on your Zwift Click to control gears', 'info');
                }
                
                return true;
            } else {
                throw new Error('Failed to setup Zwift service - device may not be a compatible Zwift Click');
            }

        } catch (error) {
            console.error('❌ Zwift Click connection failed:', error);
            
            if (error.name === 'NotFoundError') {
                if (window.addConnectionLog) {
                    window.addConnectionLog('⚠️ No Zwift Click device selected', 'warning');
                    window.addConnectionLog('💡 Make sure your Zwift Click is:', 'info');
                    window.addConnectionLog('  • Powered on and in pairing mode', 'info');
                    window.addConnectionLog('  • Not connected to another device', 'info');
                    window.addConnectionLog('  • Close to your computer (within 10 feet)', 'info');
                    window.addConnectionLog('  • Has fresh batteries', 'info');
                }
            } else {
                if (window.addConnectionLog) {
                    window.addConnectionLog(`❌ Zwift Click connection failed: ${error.message}`, 'error');
                }
            }
            
            if (window.deviceConnectionLogger) {
                window.deviceConnectionLogger.logConnection('zwift-click', 'error', error.message);
            }
            
            return false;
        }
    }

    // Connect with retry logic
    async connectWithRetry() {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
            try {
                if (window.addConnectionLog && attempt > 1) {
                    window.addConnectionLog(`🔄 Connection attempt ${attempt}/${this.maxReconnectAttempts}...`, 'info');
                }
                
                this.server = await this.device.gatt.connect();
                console.log('🔗 Connected to Zwift Click GATT server');
                
                if (window.addConnectionLog) {
                    window.addConnectionLog('🔗 Connected to Zwift Click GATT server', 'success');
                }
                
                return; // Success, exit retry loop
                
            } catch (error) {
                lastError = error;
                console.warn(`Connection attempt ${attempt} failed:`, error);
                
                if (attempt < this.maxReconnectAttempts) {
                    await this.sleep(1000 * attempt); // Exponential backoff
                }
            }
        }
        
        throw lastError; // All attempts failed
    }

    // Setup Zwift service and characteristics
    async setupZwiftService() {
        if (!this.server) return false;
        
        try {
            console.log('🔍 Looking for Zwift service...');
            
            if (window.addConnectionLog) {
                window.addConnectionLog('🔍 Looking for Zwift service...', 'info');
            }
            
            // Try different service UUIDs in order of preference
            const serviceUUIDs = [
                '0000fc82-0000-1000-8000-00805f9b34fb',     // New Zwift service (FC82)
                '00000001-19ca-4651-86e5-fa29dcdd09d1',     // Classic Zwift service
                '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'      // Alternative service
            ];
            
            let foundService = null;
            
            for (const serviceUUID of serviceUUIDs) {
                try {
                    foundService = await this.server.getPrimaryService(serviceUUID);
                    console.log(`✅ Found Zwift service: ${serviceUUID}`);
                    
                    if (window.addConnectionLog) {
                        window.addConnectionLog(`✅ Found Zwift service: ${serviceUUID}`, 'success');
                    }
                    
                    this.zwiftService = foundService;
                    break;
                } catch (e) {
                    console.log(`Service ${serviceUUID} not found, trying next...`);
                }
            }
            
            if (!this.zwiftService) {
                // Fallback: try to discover all services and find one that looks like Zwift
                const allServices = await this.server.getPrimaryServices();
                console.log(`🔍 Found ${allServices.length} services total:`, allServices.map(s => s.uuid));
                
                if (window.addConnectionLog) {
                    window.addConnectionLog(`🔍 Found ${allServices.length} services, checking for Zwift compatibility...`, 'info');
                }
                
                // Look for services with characteristics that might be Zwift
                for (const service of allServices) {
                    try {
                        const characteristics = await service.getCharacteristics();
                        if (characteristics.length >= 2) { // Zwift services usually have multiple characteristics
                            console.log(`🔍 Service ${service.uuid} has ${characteristics.length} characteristics, trying as Zwift service`);
                            this.zwiftService = service;
                            break;
                        }
                    } catch (e) {
                        // Skip services that can't be read
                        continue;
                    }
                }
            }
            
            if (!this.zwiftService) {
                console.error('❌ No compatible Zwift service found');
                if (window.addConnectionLog) {
                    window.addConnectionLog('❌ No compatible Zwift service found', 'error');
                    window.addConnectionLog('💡 This device might not be a Zwift Click or may have different firmware', 'warning');
                }
                return false;
            }
            
            // Get characteristics
            await this.setupCharacteristics();
            
            // Initialize the connection with handshake
            await this.performHandshake();
            
            // Start listening for button presses
            await this.startListening();
            
            return true;
            
        } catch (error) {
            console.error('❌ Zwift service setup failed:', error);
            if (window.addConnectionLog) {
                window.addConnectionLog(`❌ Zwift service setup failed: ${error.message}`, 'error');
            }
            return false;
        }
    }

    // Setup characteristics for communication
    async setupCharacteristics() {
        try {
            const characteristics = await this.zwiftService.getCharacteristics();
            console.log(`📋 Found ${characteristics.length} characteristics`);
            
            if (window.addConnectionLog) {
                window.addConnectionLog(`📋 Found ${characteristics.length} characteristics`, 'info');
            }
            
            // Map characteristics based on properties
            for (const char of characteristics) {
                console.log(`🔍 Characteristic ${char.uuid}: properties = ${JSON.stringify(char.properties)}`);
                
                if (char.properties.write || char.properties.writeWithoutResponse) {
                    this.writeCharacteristic = char;
                    console.log(`✅ Write characteristic: ${char.uuid}`);
                }
                
                if (char.properties.indicate) {
                    this.indicateCharacteristic = char;
                    console.log(`✅ Indicate characteristic: ${char.uuid}`);
                }
                
                if (char.properties.notify) {
                    this.notifyCharacteristic = char;
                    console.log(`✅ Notify characteristic: ${char.uuid}`);
                }
            }
            
            if (window.addConnectionLog) {
                window.addConnectionLog(`✅ Mapped characteristics: Write=${!!this.writeCharacteristic}, Indicate=${!!this.indicateCharacteristic}, Notify=${!!this.notifyCharacteristic}`, 'success');
            }
            
        } catch (error) {
            console.error('❌ Failed to setup characteristics:', error);
            throw error;
        }
    }

    // Perform handshake with device
    async performHandshake() {
        if (this.writeCharacteristic) {
            try {
                console.log('🤝 Performing handshake with Zwift Click...');
                
                // Send "RideOn" as handshake (new protocol)
                const handshakeMessage = new TextEncoder().encode('RideOn');
                await this.writeCharacteristic.writeValue(handshakeMessage);
                
                console.log('✅ Handshake sent');
                
                if (window.addConnectionLog) {
                    window.addConnectionLog('✅ Handshake completed with Zwift Click', 'success');
                }
                
                // Wait a moment for response
                await this.sleep(500);
                
            } catch (error) {
                console.warn('⚠️ Handshake failed, but continuing anyway:', error);
                if (window.addConnectionLog) {
                    window.addConnectionLog('⚠️ Handshake failed, but device may still work', 'warning');
                }
            }
        }
    }

    // Start listening for button presses
    async startListening() {
        try {
            // Set up notification listener
            if (this.notifyCharacteristic) {
                await this.notifyCharacteristic.startNotifications();
                this.notifyCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleButtonData(event, 'notify');
                });
                console.log('🔔 Started listening for notifications');
                
                if (window.addConnectionLog) {
                    window.addConnectionLog('🔔 Started listening for button presses (notify)', 'success');
                }
            }
            
            // Set up indication listener
            if (this.indicateCharacteristic) {
                await this.indicateCharacteristic.startNotifications();
                this.indicateCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleButtonData(event, 'indicate');
                });
                console.log('🔔 Started listening for indications');
                
                if (window.addConnectionLog) {
                    window.addConnectionLog('🔔 Started listening for button presses (indicate)', 'success');
                }
            }
            
            if (!this.notifyCharacteristic && !this.indicateCharacteristic) {
                throw new Error('No notification characteristics available');
            }
            
        } catch (error) {
            console.error('❌ Failed to start listening:', error);
            if (window.addConnectionLog) {
                window.addConnectionLog(`❌ Failed to start listening: ${error.message}`, 'error');
            }
            throw error;
        }
    }

    // Handle button data from device
    handleButtonData(event, source) {
        const value = event.target.value;
        const data = new Uint8Array(value.buffer);
        
        console.log(`🎮 Button data from ${source}:`, Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        
        if (window.addConnectionLog) {
            window.addConnectionLog(`🎮 Button data received: ${Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`, 'info');
        }
        
        // Check if this is a button press message (message id 0x23 for new protocol)
        if (data.length > 0 && data[0] === 0x23) {
            this.handleProtocolBufferMessage(data);
        } else {
            // Try to detect button presses using simpler patterns
            this.handleSimpleButtonPress(data);
        }
    }

    // Handle protocol buffer message (new Zwift protocol)
    handleProtocolBufferMessage(data) {
        try {
            console.log('📦 Processing protocol buffer message');
            
            if (data.length >= 5) { // Need at least 5 bytes for the bitmap
                // Bytes 1-4 contain the 32-bit button bitmap (inverse logic)
                const buttonBitmap = (data[4] << 24) | (data[3] << 16) | (data[2] << 8) | data[1];
                
                console.log(`📊 Button bitmap: 0x${buttonBitmap.toString(16).padStart(8, '0')}`);
                
                // Inverse logic: bit set to 0 means button is pressed
                const buttonsPressed = (~buttonBitmap) & 0xFFFFFFFF;
                
                if (buttonsPressed !== 0) {
                    this.decodeButtonPress(buttonsPressed);
                }
            }
        } catch (error) {
            console.error('❌ Error processing protocol buffer:', error);
        }
    }

    // Handle simple button press detection
    handleSimpleButtonPress(data) {
        if (data.length === 0) return;
        
        // Compare with last state to detect changes
        if (this.lastButtonState !== null) {
            // Look for changes in the data
            let changed = false;
            for (let i = 0; i < Math.min(data.length, this.lastButtonState.length); i++) {
                if (data[i] !== this.lastButtonState[i]) {
                    changed = true;
                    break;
                }
            }
            
            if (changed) {
                // Try to determine direction based on common patterns
                if (data[0] > this.lastButtonState[0] || (data.length > 1 && data[1] > this.lastButtonState[1])) {
                    this.triggerGearChange('up', 'real');
                } else if (data[0] < this.lastButtonState[0] || (data.length > 1 && data[1] < this.lastButtonState[1])) {
                    this.triggerGearChange('down', 'real');
                }
            }
        }
        
        // Store current state for next comparison
        this.lastButtonState = new Uint8Array(data);
    }

    // Decode button press from bitmap
    decodeButtonPress(buttonBitmap) {
        console.log(`🔍 Decoding button press: 0x${buttonBitmap.toString(16)}`);
        
        // Common button mappings (these may need adjustment based on actual device)
        const BUTTON_GEAR_UP = 0x01;
        const BUTTON_GEAR_DOWN = 0x02;
        const BUTTON_ALT_UP = 0x04;
        const BUTTON_ALT_DOWN = 0x08;
        
        if (buttonBitmap & BUTTON_GEAR_UP || buttonBitmap & BUTTON_ALT_UP) {
            this.triggerGearChange('up', 'real');
        } else if (buttonBitmap & BUTTON_GEAR_DOWN || buttonBitmap & BUTTON_ALT_DOWN) {
            this.triggerGearChange('down', 'real');
        }
    }

    // Trigger gear change in our virtual system
    triggerGearChange(direction, source = 'real') {
        console.log(`🎮 Real Zwift Click button pressed: ${direction}`);
        
        if (window.addConnectionLog) {
            window.addConnectionLog(`🎮 Zwift Click: Gear ${direction} (real button press!)`, 'success');
        }
        
        // Call the existing gear change function with source indication
        if (typeof changeGear === 'function') {
            changeGear(direction, source);
        }
        
        // Call callback if registered
        if (this.onGearChangeCallback) {
            this.onGearChangeCallback(direction, source);
        }

        // Visual feedback
        const button = direction === 'up' ? 
            document.getElementById('gear-up-btn') : 
            document.getElementById('gear-down-btn');
            
        if (button) {
            // Flash the button to show it was triggered by real device
            button.style.transform = 'scale(0.95)';
            button.style.background = '#28a745';
            button.style.boxShadow = '0 0 20px #28a745';
            setTimeout(() => {
                button.style.transform = '';
                button.style.background = '';
                button.style.boxShadow = '';
            }, 300);
        }
    }

    // Handle disconnection
    handleDisconnection() {
        console.log('⚠️ Zwift Click disconnected');
        this.isConnected = false;
        
        if (window.deviceConnectionLogger) {
            window.deviceConnectionLogger.logConnection('zwift-click', 'disconnected');
        }
        
        if (window.addConnectionLog) {
            window.addConnectionLog('⚠️ Zwift Click disconnected', 'warning');
        }
        
        // Reset state
        this.server = null;
        this.zwiftService = null;
        this.writeCharacteristic = null;
        this.indicateCharacteristic = null;
        this.notifyCharacteristic = null;
        this.lastButtonState = null;
    }

    // Disconnect from device
    async disconnect() {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            try {
                await this.device.gatt.disconnect();
                console.log('🔌 Zwift Click disconnected');
            } catch (error) {
                console.error('❌ Error disconnecting Zwift Click:', error);
            }
        }
        
        this.device = null;
        this.isConnected = false;
        this.server = null;
        this.zwiftService = null;
        this.writeCharacteristic = null;
        this.indicateCharacteristic = null;
        this.notifyCharacteristic = null;
        this.lastButtonState = null;
        this.reconnectAttempts = 0;
    }

    // Set callback for gear changes
    onGearChange(callback) {
        this.onGearChangeCallback = callback;
    }

    // Check if device is connected
    isDeviceConnected() {
        return this.isConnected && this.device && this.device.gatt && this.device.gatt.connected;
    }

    // Helper method to sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            deviceName: this.device?.name || null,
            hasZwiftService: !!this.zwiftService,
            hasWriteChar: !!this.writeCharacteristic,
            hasNotifyChar: !!this.notifyCharacteristic,
            hasIndicateChar: !!this.indicateCharacteristic
        };
    }
}

// Global instance
window.zwiftClickHandler = new ZwiftClickHandler();

// Enhanced pairing function that connects to real device
async function pairZwiftClickReal() {
    try {
        const success = await window.zwiftClickHandler.connectRealDevice();
        
        if (success) {
            // Update UI to show real device connected
            if (typeof updateDeviceConnectionStatus === 'function') {
                updateDeviceConnectionStatus('zwift-click', true, window.zwiftClickHandler.device.name);
            }
            
            // Set up gear change callback
            window.zwiftClickHandler.onGearChange((direction, source) => {
                console.log(`🎮 Real device triggered gear ${direction}`);
            });
            
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Real Zwift Click pairing failed:', error);
        return false;
    }
}

// Enhanced disconnect function
async function disconnectZwiftClickReal() {
    try {
        await window.zwiftClickHandler.disconnect();
        
        if (typeof updateDeviceConnectionStatus === 'function') {
            updateDeviceConnectionStatus('zwift-click', false);
        }
        
        if (window.addConnectionLog) {
            window.addConnectionLog('🔌 Zwift Click disconnected', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Zwift Click disconnect failed:', error);
    }
}

// Override the original pairDevice function for Zwift Click
const originalPairDevice = window.pairDevice;
window.pairDevice = function(deviceType) {
    if (deviceType === 'zwift-click') {
        // Try to connect to real Zwift Click device
        pairZwiftClickReal().then(success => {
            if (!success) {
                // Fallback to original pairing method if available
                if (originalPairDevice) {
                    originalPairDevice(deviceType);
                }
            }
        });
    } else {
        // Use original pairing for other devices
        if (originalPairDevice) {
            originalPairDevice(deviceType);
        }
    }
};

// Override the original disconnectDevice function for Zwift Click
const originalDisconnectDevice = window.disconnectDevice;
window.disconnectDevice = function(deviceType) {
    if (deviceType === 'zwift-click') {
        disconnectZwiftClickReal();
    } else {
        // Use original disconnect for other devices
        if (originalDisconnectDevice) {
            originalDisconnectDevice(deviceType);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Enhanced Zwift Click real device handler initialized');
    
    if (window.addConnectionLog) {
        window.addConnectionLog('🎮 Enhanced Zwift Click real device support enabled', 'info');
        window.addConnectionLog('💡 This version supports both old and new Zwift Click protocols', 'info');
        window.addConnectionLog('🔧 Click "Pair Real Click" to connect your Zwift Click device', 'info');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZwiftClickHandler, pairZwiftClickReal, disconnectZwiftClickReal };
}