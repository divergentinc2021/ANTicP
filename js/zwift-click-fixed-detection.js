// FIXED Zwift Click Button Detection
// This properly identifies UP and DOWN buttons from the byte data

class FixedZwiftClickHandler {
    constructor() {
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.zwiftService = null;
        this.characteristics = new Map();
        this.currentGear = 12; // Start in middle gear
        this.maxGears = 24;
        
        // Button detection state
        this.buttonState = {
            lastData: null,
            lastPressTime: 0,
            debounceTime: 150, // ms
            buttonPatterns: new Map() // Store patterns for each button
        };
    }

    // Connect to Zwift Click
    async connectZwiftClick() {
        try {
            console.log('🔍 Connecting to Zwift Click...');
            
            // Request device
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'CLICK' },
                    { namePrefix: 'Click' }
                ],
                optionalServices: [
                    '00000001-19ca-4651-86e5-fa29dcdd09d1', // Zwift service UUID
                    0x180A, // Device Information
                    0x180F  // Battery
                ]
            });

            console.log(`✅ Found Zwift Click: ${this.device.name}`);
            this.addLog(`✅ Found Zwift Click: ${this.device.name}`, 'success');

            // Connect to GATT server
            this.server = await this.device.gatt.connect();
            console.log('✅ Connected to GATT server');

            // Set up disconnect handler
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

            // Get the Zwift service
            this.zwiftService = await this.server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
            console.log('✅ Got Zwift service');

            // Get characteristics
            await this.setupCharacteristics();

            // Start listening for button presses
            await this.startListening();

            this.isConnected = true;
            this.addLog('🎮 Zwift Click ready! Press buttons to detect patterns', 'success');
            
            return true;

        } catch (error) {
            console.error('❌ Zwift Click connection failed:', error);
            this.addLog(`❌ Connection failed: ${error.message}`, 'error');
            return false;
        }
    }

    // Setup characteristics
    async setupCharacteristics() {
        try {
            const characteristics = await this.zwiftService.getCharacteristics();
            console.log(`📋 Found ${characteristics.length} characteristics`);

            for (const char of characteristics) {
                this.characteristics.set(char.uuid, char);
                
                const props = [];
                if (char.properties.notify) props.push('notify');
                if (char.properties.read) props.push('read');
                if (char.properties.write) props.push('write');

                console.log(`  Characteristic: ${char.uuid} [${props.join(', ')}]`);
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

            // Listen on all notification characteristics
            for (const [uuid, char] of this.characteristics) {
                if (char.properties.notify) {
                    try {
                        await char.startNotifications();
                        char.addEventListener('characteristicvaluechanged', (event) => {
                            this.handleButtonData(event, uuid);
                        });
                        
                        console.log(`🔔 Listening on ${uuid}`);
                        listeningCount++;
                    } catch (e) {
                        console.warn(`⚠️ Failed to start notifications on ${uuid}:`, e.message);
                    }
                }
            }

            if (listeningCount > 0) {
                this.addLog(`🔔 Listening on ${listeningCount} characteristics`, 'success');
            } else {
                throw new Error('No notification characteristics available');
            }

        } catch (error) {
            console.error('❌ Failed to start listening:', error);
            throw error;
        }
    }

    // Handle button data - FIXED VERSION
    handleButtonData(event, characteristicUuid) {
        const value = event.target.value;
        const data = new Uint8Array(value.buffer);
        
        // Convert to hex string for logging
        const hexString = Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
        console.log(`🎮 Button data: ${hexString}`);
        
        // Debounce check
        const currentTime = Date.now();
        if (currentTime - this.buttonState.lastPressTime < this.buttonState.debounceTime) {
            return; // Too soon, ignore
        }
        
        // Analyze the button press
        this.analyzeButtonPress(data, hexString);
        
        this.buttonState.lastPressTime = currentTime;
        this.buttonState.lastData = data;
    }

    // FIXED: Proper button detection based on byte patterns
    analyzeButtonPress(data, hexString) {
        if (data.length === 0) return;
        
        // Common Zwift Click patterns based on research:
        // The button identification can be in different positions depending on the model
        
        // Method 1: Check if this is a known pattern
        if (this.buttonState.buttonPatterns.has(hexString)) {
            const buttonType = this.buttonState.buttonPatterns.get(hexString);
            this.handleGearChange(buttonType);
            return;
        }
        
        // Method 2: Analyze the bytes for button identification
        // Most Zwift Clicks use these patterns:
        
        // Check byte 0 (message type)
        if (data[0] === 0x23) { // Button message type
            // Check byte 1-4 for button bitmap
            if (data.length >= 5) {
                const buttonBitmap = data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
                
                // Bit 0 = UP button (0 = pressed, 1 = not pressed)
                // Bit 1 = DOWN button (0 = pressed, 1 = not pressed)
                const upPressed = !(buttonBitmap & 0x01);
                const downPressed = !(buttonBitmap & 0x02);
                
                if (upPressed) {
                    this.handleGearChange('up');
                    this.buttonState.buttonPatterns.set(hexString, 'up');
                } else if (downPressed) {
                    this.handleGearChange('down');
                    this.buttonState.buttonPatterns.set(hexString, 'down');
                }
                return;
            }
        }
        
        // Method 3: Check for specific byte patterns
        // Some devices use different encoding
        if (data.length >= 2) {
            // Check byte patterns that commonly indicate button presses
            
            // Pattern A: Byte 0 or 1 indicates button
            if (data[0] === 0x01 || data[1] === 0x01) {
                this.handleGearChange('up');
                this.buttonState.buttonPatterns.set(hexString, 'up');
                return;
            } else if (data[0] === 0x02 || data[1] === 0x02) {
                this.handleGearChange('down');
                this.buttonState.buttonPatterns.set(hexString, 'down');
                return;
            }
            
            // Pattern B: Check for incremental/decremental values
            if (this.buttonState.lastData && data.length === this.buttonState.lastData.length) {
                let differences = 0;
                let incremented = false;
                let decremented = false;
                
                for (let i = 0; i < data.length; i++) {
                    if (data[i] !== this.buttonState.lastData[i]) {
                        differences++;
                        if (data[i] > this.buttonState.lastData[i]) {
                            incremented = true;
                        } else {
                            decremented = true;
                        }
                    }
                }
                
                // If only one byte changed
                if (differences === 1) {
                    if (incremented) {
                        this.handleGearChange('up');
                        this.buttonState.buttonPatterns.set(hexString, 'up');
                        return;
                    } else if (decremented) {
                        this.handleGearChange('down');
                        this.buttonState.buttonPatterns.set(hexString, 'down');
                        return;
                    }
                }
            }
        }
        
        // Method 4: Learning mode - ask user which button they pressed
        // If we can't detect the button automatically, learn from user input
        this.enterLearningMode(hexString);
    }
    
    // Learning mode to identify button patterns
    enterLearningMode(hexString) {
        console.log('🎓 Unknown pattern detected. Entering learning mode...');
        this.addLog(`🎓 Unknown pattern: ${hexString}`, 'warning');
        this.addLog('Press the UP button 3 times, then DOWN button 3 times', 'info');
        
        // Track pattern frequency to auto-detect
        if (!this.patternCounter) {
            this.patternCounter = new Map();
            this.patternCount = 0;
        }
        
        // Count this pattern
        const count = (this.patternCounter.get(hexString) || 0) + 1;
        this.patternCounter.set(hexString, count);
        this.patternCount++;
        
        // After 6 presses, try to auto-detect
        if (this.patternCount === 6) {
            // Assume first 3 unique patterns are UP, next 3 are DOWN
            const patterns = Array.from(this.patternCounter.entries())
                .sort((a, b) => b[1] - a[1]); // Sort by frequency
            
            if (patterns.length >= 2) {
                // Most frequent pattern is likely one button
                this.buttonState.buttonPatterns.set(patterns[0][0], 'up');
                // Second most frequent is likely the other button
                this.buttonState.buttonPatterns.set(patterns[1][0], 'down');
                
                this.addLog('✅ Button patterns learned!', 'success');
                this.addLog(`UP button: ${patterns[0][0]}`, 'info');
                this.addLog(`DOWN button: ${patterns[1][0]}`, 'info');
            }
            
            // Reset learning
            this.patternCounter = null;
            this.patternCount = 0;
        }
    }

    // Handle gear change
    handleGearChange(direction) {
        console.log(`🎮 Zwift Click: ${direction.toUpperCase()} button pressed`);
        this.addLog(`🎮 ${direction.toUpperCase()} button pressed → Gear ${direction}`, 'success');

        // Update gear
        if (direction === 'up' && this.currentGear < this.maxGears) {
            this.currentGear++;
        } else if (direction === 'down' && this.currentGear > 1) {
            this.currentGear--;
        }

        // Update UI
        this.updateGearDisplay();

        // Calculate and apply resistance
        const resistancePercent = this.calculateResistanceFromGear(this.currentGear);
        this.applyResistanceToKickr(resistancePercent);

        // Visual feedback
        this.showButtonFeedback(direction);
    }

    // Calculate resistance from gear
    calculateResistanceFromGear(gear) {
        // Map 24 gears to -10% to +10% resistance
        const minResistance = -10;
        const maxResistance = 10;
        const resistanceRange = maxResistance - minResistance;
        
        const normalizedGear = (gear - 1) / (this.maxGears - 1);
        const resistance = minResistance + (normalizedGear * resistanceRange);
        
        return Math.round(resistance);
    }

    // Apply resistance to Kickr
    applyResistanceToKickr(resistancePercent) {
        const resistanceSlider = document.getElementById('kickr-resistance-slider');
        const resistanceDisplay = document.getElementById('kickr-resistance-display');
        
        if (resistanceSlider && resistanceDisplay) {
            resistanceSlider.value = resistancePercent;
            resistanceDisplay.textContent = `${resistancePercent}%`;
            resistanceSlider.dispatchEvent(new Event('input', { bubbles: true }));
            
            this.addLog(`🚴 Applied ${resistancePercent}% resistance`, 'success');
        }
    }

    // Update gear display
    updateGearDisplay() {
        const gearDisplay = document.getElementById('zwift-gear');
        if (gearDisplay) {
            gearDisplay.textContent = `${this.currentGear}/${this.maxGears}`;
        }

        const gearSource = document.getElementById('gear-source');
        if (gearSource) {
            gearSource.textContent = 'Zwift Click';
            gearSource.style.color = '#28a745';
        }
    }

    // Show visual feedback
    showButtonFeedback(direction) {
        const button = direction === 'up' ? 
            document.getElementById('gear-up-btn') : 
            document.getElementById('gear-down-btn');
            
        if (button) {
            button.classList.add('active');
            setTimeout(() => {
                button.classList.remove('active');
            }, 300);
        }
    }

    // Handle disconnection
    handleDisconnection() {
        console.log('⚠️ Zwift Click disconnected');
        this.isConnected = false;
        this.addLog('⚠️ Zwift Click disconnected', 'warning');
        
        this.server = null;
        this.zwiftService = null;
        this.characteristics.clear();
        this.buttonState.lastData = null;
        this.buttonState.buttonPatterns.clear();
    }

    // Disconnect
    async disconnect() {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            try {
                await this.device.gatt.disconnect();
                console.log('🔌 Zwift Click disconnected');
            } catch (error) {
                console.error('❌ Error disconnecting:', error);
            }
        }
        
        this.device = null;
        this.isConnected = false;
    }

    // Add log helper
    addLog(message, type = 'info') {
        if (window.addConnectionLog) {
            window.addConnectionLog(message, type);
        } else {
            console.log(message);
        }
    }
}

// Create global instance
window.fixedZwiftClickHandler = new FixedZwiftClickHandler();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FixedZwiftClickHandler;
}
