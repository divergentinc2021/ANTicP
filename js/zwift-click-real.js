// Enhanced Zwift Click Real Device Integration
// This module handles real Zwift Click device input and translates it to virtual gear changes

class ZwiftClickHandler {
    constructor() {
        this.device = null;
        this.isConnected = false;
        this.onGearChangeCallback = null;
        this.inputReport = null;
    }

    // Connect to real Zwift Click device
    async connectRealDevice() {
        try {
            console.log('🔍 Scanning for Zwift Click device...');
            
            // Request Zwift Click device with HID service
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'CLICK' },
                    { namePrefix: 'ZC' },
                    { services: [0x1812] }, // HID Service
                    { services: ['6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'] } // Zwift custom service
                ],
                optionalServices: [
                    0x1812,    // Human Interface Device
                    0x1816,    // Cycling Speed and Cadence  
                    0x180A,    // Device Information
                    0x180F,    // Battery Service
                    '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'  // Zwift custom service
                ]
            });

            console.log('✅ Zwift Click device selected:', this.device.name);

            // Connect to GATT server
            const server = await this.device.gatt.connect();
            console.log('🔗 Connected to Zwift Click GATT server');

            // Set up disconnect handler
            this.device.addEventListener('gattserverdisconnected', () => {
                console.log('⚠️ Zwift Click disconnected');
                this.isConnected = false;
                if (window.addConnectionLog) {
                    window.addConnectionLog('⚠️ Zwift Click disconnected', 'warning');
                }
            });

            // Try to get HID service for button input
            await this.setupHIDService(server);
            
            this.isConnected = true;
            
            if (window.addConnectionLog) {
                window.addConnectionLog(`✅ Zwift Click connected: ${this.device.name}`, 'success');
                window.addConnectionLog('🎮 Real device button presses will now control gears', 'info');
            }

            return true;

        } catch (error) {
            console.error('❌ Zwift Click connection failed:', error);
            
            if (error.name === 'NotFoundError') {
                if (window.addConnectionLog) {
                    window.addConnectionLog('⚠️ No Zwift Click device selected', 'warning');
                }
            } else {
                if (window.addConnectionLog) {
                    window.addConnectionLog(`❌ Zwift Click connection failed: ${error.message}`, 'error');
                }
            }
            return false;
        }
    }

    // Set up HID service to listen for button presses
    async setupHIDService(server) {
        try {
            // Try HID service first (standard HID protocol)
            const hidService = await server.getPrimaryService(0x1812);
            console.log('📱 Found HID service');

            // Get HID Report characteristic for input
            const characteristics = await hidService.getCharacteristics();
            console.log(`📋 Found ${characteristics.length} HID characteristics`);

            for (const characteristic of characteristics) {
                console.log(`🔍 Checking characteristic: ${characteristic.uuid}`);
                
                // Look for input report characteristic (usually 0x2A4D)
                if (characteristic.uuid === '00002a4d-0000-1000-8000-00805f9b34fb' || 
                    characteristic.properties.notify) {
                    
                    console.log('✅ Found input report characteristic');
                    this.inputReport = characteristic;
                    
                    // Start listening for notifications (button presses)
                    await characteristic.startNotifications();
                    
                    characteristic.addEventListener('characteristicvaluechanged', (event) => {
                        this.handleButtonPress(event);
                    });
                    
                    if (window.addConnectionLog) {
                        window.addConnectionLog('🎮 Listening for Zwift Click button presses...', 'success');
                    }
                    break;
                }
            }

        } catch (error) {
            console.warn('⚠️ HID service not available, trying Zwift custom service');
            // Fallback to Zwift custom service
            await this.setupZwiftCustomService(server);
        }
    }

    // Fallback: Try Zwift's custom service
    async setupZwiftCustomService(server) {
        try {
            const zwiftService = await server.getPrimaryService('6e40fec1-b5a3-f393-e0a9-e50e24dcca9e');
            console.log('📱 Found Zwift custom service');

            const characteristics = await zwiftService.getCharacteristics();
            console.log(`📋 Found ${characteristics.length} Zwift characteristics`);

            // Look for notify characteristics
            for (const characteristic of characteristics) {
                if (characteristic.properties.notify) {
                    console.log(`✅ Found Zwift notify characteristic: ${characteristic.uuid}`);
                    
                    await characteristic.startNotifications();
                    characteristic.addEventListener('characteristicvaluechanged', (event) => {
                        this.handleButtonPress(event);
                    });
                    
                    if (window.addConnectionLog) {
                        window.addConnectionLog('🎮 Listening for Zwift Click via custom service...', 'success');
                    }
                    break;
                }
            }

        } catch (error) {
            console.error('❌ Could not set up Zwift Click input:', error);
            if (window.addConnectionLog) {
                window.addConnectionLog('⚠️ Zwift Click connected but button input may not work', 'warning');
            }
        }
    }

    // Handle real button press from Zwift Click
    handleButtonPress(event) {
        const value = event.target.value;
        const data = new Uint8Array(value.buffer);
        
        console.log('🎮 Zwift Click button data:', Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

        // Analyze the button press data
        // Different devices may send different patterns
        if (data.length > 0) {
            const buttonState = data[0]; // First byte usually contains button state
            
            // Check for gear up/down patterns
            // These patterns may vary by device - we'll detect changes
            if (this.lastButtonState !== undefined) {
                const buttonChange = buttonState ^ this.lastButtonState;
                
                if (buttonChange !== 0) {
                    // Determine if it's gear up or down based on the change
                    // This is device-specific logic that may need adjustment
                    if (buttonState > this.lastButtonState) {
                        this.triggerGearChange('up');
                    } else if (buttonState < this.lastButtonState) {
                        this.triggerGearChange('down');
                    }
                }
            }
            
            this.lastButtonState = buttonState;
        }

        // Alternative approach: Look for specific button patterns
        // Some devices may send specific codes for gear up/down
        if (data.length >= 2) {
            const button1 = data[0];
            const button2 = data[1];
            
            // Common HID patterns for up/down buttons
            if (button1 === 0x01 || button2 === 0x01) { // Example: gear up
                this.triggerGearChange('up');
            } else if (button1 === 0x02 || button2 === 0x02) { // Example: gear down
                this.triggerGearChange('down');
            }
        }
    }

    // Trigger gear change in our virtual system
    triggerGearChange(direction) {
        console.log(`🎮 Real Zwift Click button pressed: ${direction}`);
        
        if (window.addConnectionLog) {
            window.addConnectionLog(`🎮 Zwift Click: Gear ${direction}`, 'info');
        }
        
        // Call the existing gear change function
        if (typeof changeGear === 'function') {
            changeGear(direction);
        }
        
        // Call callback if registered
        if (this.onGearChangeCallback) {
            this.onGearChangeCallback(direction);
        }

        // Visual feedback
        const button = direction === 'up' ? 
            document.getElementById('gear-up-btn') : 
            document.getElementById('gear-down-btn');
            
        if (button) {
            // Flash the button to show it was triggered
            button.style.transform = 'scale(0.95)';
            button.style.background = '#28a745';
            setTimeout(() => {
                button.style.transform = '';
                button.style.background = '';
            }, 200);
        }
    }

    // Disconnect from device
    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
            console.log('🔌 Zwift Click disconnected');
        }
        
        this.device = null;
        this.isConnected = false;
        this.inputReport = null;
        this.lastButtonState = undefined;
    }

    // Set callback for gear changes
    onGearChange(callback) {
        this.onGearChangeCallback = callback;
    }

    // Check if device is connected
    isDeviceConnected() {
        return this.isConnected && this.device && this.device.gatt.connected;
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
            updateDeviceConnectionStatus('zwift-click', true, window.zwiftClickHandler.device.name);
            
            // Set up gear change callback
            window.zwiftClickHandler.onGearChange((direction) => {
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
        updateDeviceConnectionStatus('zwift-click', false);
        
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
                // Fallback to original pairing method
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
    console.log('🎮 Zwift Click real device handler initialized');
    
    if (window.addConnectionLog) {
        window.addConnectionLog('🎮 Zwift Click real device support enabled', 'info');
        window.addConnectionLog('💡 Pair your Zwift Click to control gears with real button presses', 'info');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZwiftClickHandler, pairZwiftClickReal, disconnectZwiftClickReal };
}