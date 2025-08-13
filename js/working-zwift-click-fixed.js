// FIXED Working Zwift Click Handler - Properly detects both UP and DOWN buttons
// This version includes pattern learning and saving for persistent button detection

class WorkingZwiftClickHandler {
    constructor() {
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.zwiftService = null;
        this.characteristics = new Map();
        this.currentGear = 12; // Start in middle gear
        this.maxGears = 24;
        this.baseResistance = 0; // Base resistance for Kickr
        this.kickrConnection = null;
        
        // Button pattern storage
        this.buttonPatterns = new Map();
        this.learningMode = null;
        
        // Load saved patterns
        this.loadSavedPatterns();
    }
    
    // Load saved button patterns from localStorage
    loadSavedPatterns() {
        try {
            const saved = localStorage.getItem('zwiftClickPatterns');
            if (saved) {
                const patterns = JSON.parse(saved);
                if (patterns.up) this.buttonPatterns.set(patterns.up, 'up');
                if (patterns.down) this.buttonPatterns.set(patterns.down, 'down');
                console.log('✅ Loaded saved Zwift Click button patterns');
                this.addLog('✅ Loaded saved button patterns', 'success');
            }
        } catch (error) {
            console.error('Failed to load saved patterns:', error);
        }
    }
    
    // Save button patterns to localStorage
    savePatterns() {
        try {
            const patterns = {
                up: null,
                down: null
            };
            
            for (const [pattern, type] of this.buttonPatterns) {
                if (type === 'up' && !patterns.up) patterns.up = pattern;
                if (type === 'down' && !patterns.down) patterns.down = pattern;
            }
            
            localStorage.setItem('zwiftClickPatterns', JSON.stringify(patterns));
            console.log('💾 Saved button patterns');
        } catch (error) {
            console.error('Failed to save patterns:', error);
        }
    }

    // Connect to Zwift Click using the working approach
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
                    '00000001-19ca-4651-86e5-fa29dcdd09d1', // Classic Zwift service
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
            this.addLog('✅ Connected to GATT server', 'success');

            // Set up disconnect handler
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

            // Get the Zwift service
            this.zwiftService = await this.server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
            console.log('✅ Got Zwift service');
            this.addLog('✅ Found Zwift Click service', 'success');

            // Get all characteristics
            await this.setupCharacteristics();

            // Start listening for button presses
            await this.startListening();

            this.isConnected = true;
            
            // Show appropriate message based on whether patterns are saved
            if (this.buttonPatterns.size >= 2) {
                this.addLog('🎮 Zwift Click ready with saved button patterns!', 'success');
            } else {
                this.addLog('🎮 Zwift Click ready! Press UP 3x then DOWN 3x to learn buttons', 'info');
            }
            
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
        
        // Convert to hex string for pattern matching
        const hexString = Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
        
        console.log(`🎮 Button data from ${characteristicUuid.slice(-4)}: ${hexString}`);
        
        // Analyze the button data
        this.analyzeButtonPress(data, hexString);
    }

    // FIXED: Analyze button press with pattern learning
    analyzeButtonPress(data, hexString) {
        if (data.length === 0) return;
        
        // Debounce
        const now = Date.now();
        if (this.lastPressTime && (now - this.lastPressTime) < 150) {
            return; // Too soon, ignore
        }
        this.lastPressTime = now;
        
        // Check if this is a known pattern
        if (this.buttonPatterns.has(hexString)) {
            const buttonType = this.buttonPatterns.get(hexString);
            console.log(`✅ Recognized ${buttonType.toUpperCase()} button pattern`);
            this.handleGearChange(buttonType);
            return;
        }
        
        // Try to auto-detect common patterns
        console.log(`🔍 Analyzing new pattern: ${hexString}`);
        
        // Method 1: Message type 0x23 with button bitmap
        if (data[0] === 0x23 && data.length >= 5) {
            const buttonBitmap = data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
            const upPressed = !(buttonBitmap & 0x01);
            const downPressed = !(buttonBitmap & 0x02);
            
            if (upPressed) {
                console.log('✅ Auto-detected UP button (0x23 pattern)');
                this.buttonPatterns.set(hexString, 'up');
                this.savePatterns();
                this.handleGearChange('up');
                return;
            } else if (downPressed) {
                console.log('✅ Auto-detected DOWN button (0x23 pattern)');
                this.buttonPatterns.set(hexString, 'down');
                this.savePatterns();
                this.handleGearChange('down');
                return;
            }
        }
        
        // Method 2: Check for 0x01/0x02 patterns
        if (data.length >= 2) {
            // Look for 0x01 (often UP) and 0x02 or 0x00 (often DOWN)
            let detectedButton = null;
            
            // Check multiple byte positions
            if (data[0] === 0x01 || data[1] === 0x01 || (data.length > 4 && data[4] === 0x01)) {
                detectedButton = 'up';
            } else if (data[0] === 0x02 || data[1] === 0x02 || (data.length > 4 && data[4] === 0x00 && data[3] === 0x10)) {
                detectedButton = 'down';
            }
            
            if (detectedButton) {
                console.log(`✅ Auto-detected ${detectedButton.toUpperCase()} button (byte pattern)`);
                this.buttonPatterns.set(hexString, detectedButton);
                this.savePatterns();
                this.handleGearChange(detectedButton);
                return;
            }
        }
        
        // Method 3: Learning mode
        console.log('⚠️ Unknown pattern - entering learning mode');
        this.enterLearningMode(hexString);
    }
    
    // Learning mode for unknown patterns
    enterLearningMode(hexString) {
        if (!this.learningMode) {
            this.learningMode = {
                patterns: [],
                count: 0
            };
            this.addLog('🎓 Learning mode: Press UP 3 times, then DOWN 3 times', 'warning');
        }
        
        // Track this pattern
        if (!this.learningMode.patterns.includes(hexString)) {
            this.learningMode.patterns.push(hexString);
        }
        this.learningMode.count++;
        
        // Assume first 3 presses are UP, next 3 are DOWN
        if (this.learningMode.count <= 3) {
            this.buttonPatterns.set(hexString, 'up');
            this.handleGearChange('up');
            this.addLog(`Learning ${this.learningMode.count}/6: Marked as UP button`, 'info');
        } else if (this.learningMode.count <= 6) {
            this.buttonPatterns.set(hexString, 'down');
            this.handleGearChange('down');
            this.addLog(`Learning ${this.learningMode.count}/6: Marked as DOWN button`, 'info');
        }
        
        // After 6 presses, save and exit learning mode
        if (this.learningMode.count >= 6) {
            this.savePatterns();
            this.addLog('✅ Button patterns learned and saved successfully!', 'success');
            
            // Show what was learned
            const upPatterns = [];
            const downPatterns = [];
            for (const [pattern, type] of this.buttonPatterns) {
                if (type === 'up') upPatterns.push(pattern);
                if (type === 'down') downPatterns.push(pattern);
            }
            
            if (upPatterns.length > 0) {
                console.log(`UP button patterns: ${upPatterns.join(' | ')}`);
            }
            if (downPatterns.length > 0) {
                console.log(`DOWN button patterns: ${downPatterns.join(' | ')}`);
            }
            
            this.learningMode = null;
        }
    }

    // Handle gear change and control Kickr
    handleGearChange(direction) {
        console.log(`🎮 Zwift Click: ${direction.toUpperCase()} button pressed`);
        this.addLog(`🎮 Zwift Click: Gear ${direction}`, 'success');

        // Update virtual gear
        if (direction === 'up' && this.currentGear < this.maxGears) {
            this.currentGear++;
        } else if (direction === 'down' && this.currentGear > 1) {
            this.currentGear--;
        }

        // Update UI
        this.updateGearDisplay();

        // Calculate resistance based on gear
        const resistancePercent = this.calculateResistanceFromGear(this.currentGear);
        
        // Apply resistance to Kickr Core
        this.applyResistanceToKickr(resistancePercent);

        // Visual feedback
        this.showButtonFeedback(direction);
    }

    // Calculate resistance percentage from gear
    calculateResistanceFromGear(gear) {
        // Map 24 gears to resistance range
        // Gear 1 = -10% resistance (easiest)
        // Gear 12 = 0% resistance (neutral)  
        // Gear 24 = +10% resistance (hardest)
        
        const minResistance = -10;
        const maxResistance = 10;
        const resistanceRange = maxResistance - minResistance;
        
        // Linear mapping
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
            
            // Trigger the resistance change event
            resistanceSlider.dispatchEvent(new Event('input', { bubbles: true }));
            
            this.addLog(`🚴 Applied ${resistancePercent}% resistance to Kickr`, 'success');
        }
    }

    // Update gear display in UI
    updateGearDisplay() {
        const gearDisplay = document.getElementById('zwift-gear');
        if (gearDisplay) {
            gearDisplay.textContent = this.currentGear;
        }

        // Update gear ratios if available
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

    // Calculate gear ratios for display
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

    // Clear learned patterns
    clearPatterns() {
        this.buttonPatterns.clear();
        localStorage.removeItem('zwiftClickPatterns');
        this.learningMode = null;
        this.addLog('🗑️ Cleared all learned button patterns', 'info');
        console.log('🗑️ Cleared all button patterns');
    }

    // Utility function to add log messages
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
            characteristicsCount: this.characteristics.size,
            patternsLearned: this.buttonPatterns.size
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

// Global clear patterns function
function clearZwiftClickPatterns() {
    window.workingZwiftClickHandler.clearPatterns();
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
    console.log('🎮 Working Zwift Click handler loaded - FIXED VERSION');
    
    if (window.addConnectionLog) {
        window.addConnectionLog('🎮 Zwift Click handler ready - Fixed button detection', 'success');
        window.addConnectionLog('💡 Buttons will auto-learn on first use', 'info');
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkingZwiftClickHandler;
}
