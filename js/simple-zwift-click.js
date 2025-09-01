// Simple Zwift Click Handler with Cycling Resistance System
// + button cycles through 8 resistance levels
// - button triggers lap function

class SimpleZwiftClickHandler {
    constructor() {
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.currentGear = 0; // Start at gear 0 (-5%)
        this.maxGears = 8; // 0-7 total gears
        this.lastButtonData = null;
        
        // Resistance mapping: Gear -> Resistance %
        this.resistanceMap = {
            0: -5,   // Gear 0 = -5%
            1: 0,    // Gear 1 = 0%
            2: 5,    // Gear 2 = +5%
            3: 10,   // Gear 3 = +10%
            4: 15,   // Gear 4 = +15%
            5: 20,   // Gear 5 = +20%
            6: 25,   // Gear 6 = +25%
            7: 30    // Gear 7 = +30%
        };
        
        this.lapCount = 0;
    }

    // Connect using the working method from simple test
    async connect() {
        try {
            this.addLog('🔍 Connecting to Zwift Click...', 'info');
            
            // Use exact same filters that worked in simple test
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'CLICK' },
                    { namePrefix: 'Click' }
                ],
                optionalServices: [
                    '00000001-19ca-4651-86e5-fa29dcdd09d1', // Classic Zwift service (WORKING!)
                    0x180A, // Device Information
                    0x180F  // Battery
                ]
            });

            this.addLog(`✅ Found Zwift Click: ${this.device.name}`, 'success');

            // Connect to GATT server
            this.server = await this.device.gatt.connect();
            this.addLog('✅ Connected to Zwift Click', 'success');

            // Set up disconnect handler
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

            // Get the working Zwift service
            const zwiftService = await this.server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
            this.addLog('✅ Got Zwift service', 'success');

            // Get all characteristics and start listening
            const characteristics = await zwiftService.getCharacteristics();
            this.addLog(`📋 Found ${characteristics.length} characteristics`, 'info');

            let listeningCount = 0;
            for (const char of characteristics) {
                if (char.properties.notify || char.properties.indicate) {
                    try {
                        await char.startNotifications();
                        char.addEventListener('characteristicvaluechanged', (event) => {
                            this.handleButtonData(event);
                        });
                        listeningCount++;
                    } catch (e) {
                        // Ignore characteristics that can't be monitored
                    }
                }
            }

            if (listeningCount > 0) {
                this.isConnected = true;
                this.addLog(`🔔 Listening on ${listeningCount} characteristics`, 'success');
                this.addLog('🎮 Zwift Click ready! + button = cycle resistance, - button = lap', 'success');
                this.updateUI();
                return true;
            } else {
                throw new Error('No notification characteristics found');
            }

        } catch (error) {
            if (error.name === 'NotFoundError') {
                this.addLog('⚠️ No Zwift Click selected. Make sure it\'s powered on.', 'warning');
            } else {
                this.addLog(`❌ Connection failed: ${error.message}`, 'error');
            }
            return false;
        }
    }

    // Handle button data from device
    handleButtonData(event) {
        const value = event.target.value;
        const data = new Uint8Array(value.buffer);
        
        // Log button data for debugging
        const hexData = Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
        this.addLog(`🎮 Button data: ${hexData}`, 'info');

        // Check if data changed (indicates button press)
        if (this.lastButtonData && this.hasDataChanged(data, this.lastButtonData)) {
            this.detectButtonPress(data, this.lastButtonData);
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

    // Detect which button was pressed based on data changes
    detectButtonPress(newData, oldData) {
        // Simple detection: look for increases/decreases in first bytes
        // This may need adjustment based on your specific device patterns
        
        const newValue = newData[0] || 0;
        const oldValue = oldData[0] || 0;
        
        if (newValue > oldValue) {
            this.handlePlusButton();
        } else if (newValue < oldValue) {
            this.handleMinusButton();
        }
        
        // Alternative: check multiple bytes for more reliable detection
        for (let i = 0; i < Math.min(newData.length, oldData.length); i++) {
            if (newData[i] > oldData[i]) {
                this.handlePlusButton();
                break;
            } else if (newData[i] < oldData[i]) {
                this.handleMinusButton();
                break;
            }
        }
    }

    // Handle + button press (cycle through gears 0-7)
    handlePlusButton() {
        // Cycle to next gear (0-7, then back to 0)
        this.currentGear = (this.currentGear + 1) % this.maxGears;
        
        const resistance = this.resistanceMap[this.currentGear];
        
        this.addLog(`🎮 + Button: Gear ${this.currentGear} (${resistance}% resistance)`, 'success');
        
        // Apply resistance to Kickr
        this.applyResistance(resistance);
        
        // Update UI
        this.updateUI();
        
        // Visual feedback
        this.showButtonFeedback('up');
    }

    // Handle - button press (lap function)
    handleMinusButton() {
        this.lapCount++;
        this.addLog(`🏁 - Button: LAP ${this.lapCount}`, 'warning');
        
        // You can add more lap functionality here, like:
        // - Reset timer
        // - Save current stats
        // - Display lap time
        
        // Visual feedback
        this.showButtonFeedback('lap');
        
        // Update lap counter in UI
        this.updateLapDisplay();
    }

    // Apply resistance to Kickr Core
    applyResistance(resistancePercent) {
        // Update the resistance slider
        const resistanceSlider = document.getElementById('kickr-resistance-slider');
        const resistanceDisplay = document.getElementById('kickr-resistance-display');
        
        if (resistanceSlider && resistanceDisplay) {
            resistanceSlider.value = resistancePercent;
            resistanceDisplay.textContent = `${resistancePercent}%`;
            
            // Trigger the change event to update Kickr
            resistanceSlider.dispatchEvent(new Event('input', { bubbles: true }));
            
            this.addLog(`🚴 Applied ${resistancePercent}% resistance to Kickr`, 'success');
        }
    }

    // Update UI displays
    updateUI() {
        // Update gear display
        const gearDisplay = document.getElementById('zwift-gear');
        if (gearDisplay) {
            gearDisplay.textContent = this.currentGear;
        }

        // Update resistance display
        const currentResistance = this.resistanceMap[this.currentGear];
        const resistanceInfo = document.getElementById('zwift-resistance-info');
        if (resistanceInfo) {
            resistanceInfo.textContent = `${currentResistance}%`;
        }

        // Update status
        const gearSource = document.getElementById('gear-source');
        if (gearSource) {
            gearSource.textContent = 'Real Zwift Click';
            gearSource.style.color = '#28a745';
        }
    }

    // Update lap display
    updateLapDisplay() {
        const lapDisplay = document.getElementById('lap-counter');
        if (lapDisplay) {
            lapDisplay.textContent = this.lapCount;
        }
    }

    // Show visual feedback for button press
    showButtonFeedback(type) {
        let button;
        
        if (type === 'up') {
            button = document.getElementById('gear-up-btn');
        } else if (type === 'lap') {
            button = document.getElementById('lap-btn') || document.getElementById('gear-down-btn');
        }
        
        if (button) {
            const originalBg = button.style.background;
            button.style.background = type === 'lap' ? '#ff6b6b' : '#28a745';
            button.style.transform = 'scale(0.95)';
            button.style.boxShadow = `0 0 20px ${type === 'lap' ? '#ff6b6b' : '#28a745'}`;
            
            setTimeout(() => {
                button.style.background = originalBg;
                button.style.transform = '';
                button.style.boxShadow = '';
            }, 300);
        }
    }

    // Handle disconnection
    handleDisconnection() {
        this.isConnected = false;
        this.addLog('⚠️ Zwift Click disconnected', 'warning');
        
        // Reset UI
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
                this.addLog('🔌 Zwift Click disconnected', 'info');
            } catch (error) {
                console.error('Error disconnecting:', error);
            }
        }
        
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.lastButtonData = null;
    }

    // Utility to add log messages
    addLog(message, type = 'info') {
        // Try to use existing log function
        if (window.addConnectionLog) {
            window.addConnectionLog(message, type);
        } else if (window.logger && window.logger.info) {
            if (type === 'error') window.logger.error(message);
            else if (type === 'warning') window.logger.warn(message);
            else if (type === 'success') window.logger.info(message);
            else window.logger.info(message);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Get current status
    getStatus() {
        return {
            connected: this.isConnected,
            deviceName: this.device?.name || null,
            currentGear: this.currentGear,
            currentResistance: this.resistanceMap[this.currentGear],
            lapCount: this.lapCount
        };
    }
}

// Create global instance
window.simpleZwiftClick = new SimpleZwiftClickHandler();

// Global functions for UI buttons
async function pairSimpleZwiftClick() {
    try {
        const success = await window.simpleZwiftClick.connect();
        return success;
    } catch (error) {
        console.error('Pairing failed:', error);
        return false;
    }
}

async function disconnectSimpleZwiftClick() {
    try {
        await window.simpleZwiftClick.disconnect();
    } catch (error) {
        console.error('Disconnect failed:', error);
    }
}

// Manual gear control functions (for testing)
function testPlusButton() {
    window.simpleZwiftClick.handlePlusButton();
}

function testMinusButton() {
    window.simpleZwiftClick.handleMinusButton();
}

console.log('🎮 Simple Zwift Click Handler loaded with cycling resistance system');
