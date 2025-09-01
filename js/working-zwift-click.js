// Working Zwift Click Handler - Based on Successful Connection Test
// This intercepts Zwift Click button presses and converts them to Kickr resistance/gear changes

class WorkingZwiftClickHandler {
    constructor() {
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.zwiftService = null;
        this.characteristics = new Map();
        this.currentGear = 1;
        this.maxGears = 24;
        this.baseResistance = 0; // Base resistance for Kickr
        this.kickrConnection = null;
    }

    // Connect to Zwift Click using the working approach from simple test
    async connectZwiftClick() {
        try {
            console.log('🔍 Connecting to Zwift Click...');
            
            // Request device using the same filters that worked in simple test
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'CLICK' },
                    { namePrefix: 'Click' }
                ],
                optionalServices: [
                    '00000001-19ca-4651-86e5-fa29dcdd09d1', // Classic Zwift service (your device has this!)
                    '0000fc82-0000-1000-8000-00805f9b34fb', // New Zwift service
                    0x180A, // Device Information
                    0x180F  // Battery
                ]
            });

            console.log(`✅ Found Zwift Click: ${this.device.name}`);
            this.addLog(`✅ Found Zwift Click: ${this.device.name}`, 'success');

            // Connect to GATT server
            this.server = await this.device.gatt.connect();
            console.log('✅ Connected to Zwift Click GATT server');
            this.addLog('✅ Connected to Zwift Click GATT server', 'success');

            // Set up disconnect handler
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

            // Get the Zwift service (we know it's 00000001-19ca-4651-86e5-fa29dcdd09d1)
            this.zwiftService = await this.server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
            console.log('✅ Got Zwift service');
            this.addLog('✅ Found Zwift Click service', 'success');

            // Get all characteristics
            await this.setupCharacteristics();

            // Start listening for button presses
            await this.startListening();

            this.isConnected = true;
            this.addLog('🎮 Zwift Click ready! Press buttons to control Kickr resistance/gears', 'success');
            
            return true;

        } catch (error) {
            console.error('❌ Zwift Click connection failed:', error);
            
            if (error.name === 'NotFoundError') {
                this.addLog('⚠️ No Zwift Click selected. Make sure it\'s powered on and in pairing mode.', 'warning');
            } else {
                this.addLog(`❌ Connection failed: ${error.message}`, 'error');
            }
            
            return false;
        }
    }

    // Setup characteristics for the Zwift service
    async setupCharacteristics() {
        try {
            const characteristics = await this.zwiftService.getCharacteristics();
            console.log(`📋 Found ${characteristics.length} characteristics in Zwift service`);
            this.addLog(`📋 Found ${characteristics.length} characteristics`, 'info');

            for (const char of characteristics) {
                this.characteristics.set(char.uuid, char);
                
                const props = [];
                if (char.properties.read) props.push('read');
                if (char.properties.write) props.push('write');
                if (char.properties.writeWithoutResponse) props.push('writeWithoutResponse');
                if (char.properties.notify) props.push('notify');
                if (char.properties.indicate) props.push('indicate');

                console.log(`  🔧 Characteristic: ${char.uuid} [${props.join(', ')}]`);
                this.addLog(`  🔧 Characteristic: ...${char.uuid.slice(-4)} [${props.join(', ')}]`, 'info');
            }

        } catch (error) {
            console.error('❌ Failed to setup characteristics:', error);
            throw error;
        }
    }

    // Start listening for button presses
    async startListening() {
        try {
            let listeningCount = 0;

            // Set up notifications on all characteristics that support them
            for (const [uuid, char] of this.characteristics) {
                if (char.properties.notify || char.properties.indicate) {
                    try {
                        await char.startNotifications();
                        char.addEventListener('characteristicvaluechanged', (event) => {
                            this.handleButtonData(event, uuid);
                        });
                        
                        console.log(`🔔 Started notifications on ${uuid}`);
                        listeningCount++;
                    } catch (e) {
                        console.warn(`⚠️ Failed to start notifications on ${uuid}:`, e.message);
                    }
                }
            }

            if (listeningCount > 0) {
                this.addLog(`🔔 Listening for button presses on ${listeningCount} characteristics`, 'success');
            } else {
                throw new Error('No notification characteristics available');
            }

        } catch (error) {
            console.error('❌ Failed to start listening:', error);
            this.addLog(`❌ Failed to start listening: ${error.message}`, 'error');
            throw error;
        }
    }

    // Handle button data from Zwift Click
    handleButtonData(event, characteristicUuid) {
        const value = event.target.value;
        const data = new Uint8Array(value.buffer);
        
        console.log(`🎮 Button data from ${characteristicUuid}:`, Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        this.addLog(`🎮 Button press detected: ${Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`, 'info');

        // Analyze the button data to determine gear up/down
        this.analyzeButtonPress(data);
    }

    // Analyze button press data and determine action
    analyzeButtonPress(data) {
        if (data.length === 0) return;

        // For Zwift Click, we need to detect patterns in the data
        // This is based on observing actual button press patterns
        
        // Simple approach: look for changes in the first few bytes
        if (this.lastButtonData) {
            const changed = this.hasDataChanged(data, this.lastButtonData);
            
            if (changed) {
                // Determine direction based on data patterns
                // This may need adjustment based on your specific device
                
                if (data[0] > this.lastButtonData[0] || (data.length > 1 && data[1] !== this.lastButtonData[1])) {
                    this.handleGearChange('up');
                } else if (data[0] < this.lastButtonData[0]) {
                    this.handleGearChange('down');
                }
            }
        }

        // Store current data for next comparison
        this.lastButtonData = new Uint8Array(data);
    }

    // Check if button data has changed
    hasDataChanged(newData, oldData) {
        if (newData.length !== oldData.length) return true;
        
        for (let i = 0; i < newData.length; i++) {
            if (newData[i] !== oldData[i]) return true;
        }
        
        return false;
    }

    // Handle gear change and control Kickr
    handleGearChange(direction) {
        console.log(`🎮 Zwift Click: Gear ${direction}`);
        this.addLog(`🎮 Zwift Click: Gear ${direction}`, 'success');

        // Update virtual gear
        if (direction === 'up' && this.currentGear < this.maxGears) {
            this.currentGear++;
        } else if (direction === 'down' && this.currentGear > 1) {
            this.currentGear--;
        }

        // Update UI
        this.updateGearDisplay();

        // Calculate resistance based on gear (example mapping)
        const resistancePercent = this.calculateResistanceFromGear(this.currentGear);
        
        // Apply resistance to Kickr Core
        this.applyResistanceToKickr(resistancePercent);

        // Visual feedback
        this.showButtonFeedback(direction);
    }

    // Calculate resistance percentage from gear (customize this mapping)
    calculateResistanceFromGear(gear) {
        // Example: Map 24 gears to resistance range
        // Gear 1 = -10% resistance (easiest)
        // Gear 12 = 0% resistance (neutral)  
        // Gear 24 = +10% resistance (hardest)
        
        const minResistance = -10;
        const maxResistance = 10;
        const resistanceRange = maxResistance - minResistance;
        
        // Linear mapping: (gear - 1) / (maxGears - 1) gives us 0-1 range
        const normalizedGear = (gear - 1) / (this.maxGears - 1);
        const resistance = minResistance + (normalizedGear * resistanceRange);
        
        return Math.round(resistance);
    }

    // Apply resistance to Wahoo Kickr Core
    applyResistanceToKickr(resistancePercent) {
        // Update the resistance slider in the UI
        const resistanceSlider = document.getElementById('kickr-resistance-slider');
        const resistanceDisplay = document.getElementById('kickr-resistance-display');
        
        if (resistanceSlider && resistanceDisplay) {
            resistanceSlider.value = resistancePercent;
            resistanceDisplay.textContent = `${resistancePercent}%`;
            
            // Trigger the resistance change event if there's a handler
            resistanceSlider.dispatchEvent(new Event('input', { bubbles: true }));
            
            this.addLog(`🚴 Applied ${resistancePercent}% resistance to Kickr Core`, 'success');
        }

        // If you have direct Kickr connection, send resistance command here
        // This would require implementing the FE-C resistance control protocol
    }

    // Update gear display in UI
    updateGearDisplay() {
        const gearDisplay = document.getElementById('zwift-gear');
        if (gearDisplay) {
            gearDisplay.textContent = this.currentGear;
        }

        // Update gear ratios if you have that display
        const gearRatios = this.calculateGearRatio(this.currentGear);
        const frontGearDisplay = document.getElementById('zwift-front-gear');
        const rearGearDisplay = document.getElementById('zwift-rear-gear');
        
        if (frontGearDisplay && rearGearDisplay && gearRatios) {
            frontGearDisplay.textContent = gearRatios.front;
            rearGearDisplay.textContent = gearRatios.rear;
        }

        // Update source indicator
        const gearSource = document.getElementById('gear-source');
        if (gearSource) {
            gearSource.textContent = 'Real Zwift Click';
            gearSource.style.color = '#28a745';
        }
    }

    // Calculate gear ratios for display (optional)
    calculateGearRatio(gear) {
        // Simple 2x12 setup mapping
        const frontChainrings = [42, 52];
        const rearCassette = [30, 28, 26, 24, 23, 21, 19, 17, 15, 14, 13, 11];
        
        const frontIndex = gear <= 12 ? 0 : 1;
        const rearIndex = gear <= 12 ? (gear - 1) : (gear - 13);
        
        return {
            front: frontChainrings[frontIndex],
            rear: rearCassette[rearIndex % rearCassette.length]
        };
    }

    // Show visual feedback for button press
    showButtonFeedback(direction) {
        const button = direction === 'up' ? 
            document.getElementById('gear-up-btn') : 
            document.getElementById('gear-down-btn');
            
        if (button) {
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
        this.addLog('⚠️ Zwift Click disconnected', 'warning');
        
        // Reset state
        this.server = null;
        this.zwiftService = null;
        this.characteristics.clear();
        this.lastButtonData = null;

        // Update UI
        const gearSource = document.getElementById('gear-source');
        if (gearSource) {
            gearSource.textContent = 'Virtual Controls';
            gearSource.style.color = '#6c757d';
        }
    }

    // Disconnect from device
    async disconnect() {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            try {
                await this.device.gatt.disconnect();
                console.log('🔌 Zwift Click disconnected');
                this.addLog('🔌 Zwift Click disconnected', 'info');
            } catch (error) {
                console.error('❌ Error disconnecting:', error);
            }
        }
        
        this.device = null;
        this.isConnected = false;
        this.handleDisconnection();
    }

    // Utility function to add log messages (connects to your existing log system)
    addLog(message, type = 'info') {
        if (window.addConnectionLog) {
            window.addConnectionLog(message, type);
        } else {
            console.log(message);
        }
    }

    // Check if connected
    isDeviceConnected() {
        return this.isConnected && this.device && this.device.gatt && this.device.gatt.connected;
    }

    // Get status
    getStatus() {
        return {
            connected: this.isConnected,
            deviceName: this.device?.name || null,
            currentGear: this.currentGear,
            zwiftServiceFound: !!this.zwiftService,
            characteristicsCount: this.characteristics.size
        };
    }
}

// Create global instance
window.workingZwiftClickHandler = new WorkingZwiftClickHandler();

// Global pairing function
async function pairWorkingZwiftClick() {
    try {
        const success = await window.workingZwiftClickHandler.connectZwiftClick();
        
        if (success) {
            // Update UI status indicators
            const statusText = document.getElementById('zwift-status-text');
            const statusIndicator = document.getElementById('zwift-status');
            
            if (statusText) statusText.textContent = 'Connected';
            if (statusIndicator) {
                statusIndicator.style.background = '#28a745';
                statusIndicator.className = 'status-indicator connected';
            }
        }
        
        return success;
    } catch (error) {
        console.error('❌ Pairing failed:', error);
        return false;
    }
}

// Global disconnect function
async function disconnectWorkingZwiftClick() {
    try {
        await window.workingZwiftClickHandler.disconnect();
        
        // Update UI status indicators
        const statusText = document.getElementById('zwift-status-text');
        const statusIndicator = document.getElementById('zwift-status');
        
        if (statusText) statusText.textContent = 'Ready to Pair';
        if (statusIndicator) {
            statusIndicator.style.background = '#6c757d';
            statusIndicator.className = 'status-indicator';
        }
        
    } catch (error) {
        console.error('❌ Disconnect failed:', error);
    }
}

// Override the global pairDevice function for Zwift Click
const originalPairDevice = window.pairDevice;
window.pairDevice = function(deviceType) {
    if (deviceType === 'zwift-click') {
        pairWorkingZwiftClick();
    } else {
        if (originalPairDevice) {
            originalPairDevice(deviceType);
        }
    }
};

// Override the global disconnectDevice function for Zwift Click
const originalDisconnectDevice = window.disconnectDevice;
window.disconnectDevice = function(deviceType) {
    if (deviceType === 'zwift-click') {
        disconnectWorkingZwiftClick();
    } else {
        if (originalDisconnectDevice) {
            originalDisconnectDevice(deviceType);
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Working Zwift Click handler loaded');
    
    if (window.addConnectionLog) {
        window.addConnectionLog('🎮 Working Zwift Click handler ready', 'success');
        window.addConnectionLog('💡 This version uses the tested connection approach', 'info');
        window.addConnectionLog('🚴 Button presses will control Kickr resistance and gears', 'info');
    }
});
