// Fixed Zwift Click button handler with proper detection and mode-based behavior
// This replaces the buggy handleZwiftClickData method

handleZwiftClickData(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    
    // Message type 0x37 is the button state message
    if (data[0] === 0x37 && data.length >= 5) {
        const currentTime = Date.now();
        
        // Log raw data for debugging
        const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
        
        // Extract button information
        const stateByte = data[2];     // 0x00 = pressed, 0x01 = released
        const byte3 = data[3];         // Usually 0x10
        const byte4 = data[4];         // 0x01 or 0x00 helps identify button
        
        // Only process button press, not release
        if (stateByte === 0x00) {
            // Debounce - prevent multiple triggers
            if (currentTime - this.buttonState.lastMessageTime < 250) return;
            this.buttonState.lastMessageTime = currentTime;
            
            // Determine which button based on byte 4
            // From your logs: "37 08 00 10 01" vs "37 08 00 10 00"
            // byte4 = 0x01 usually means one button
            // byte4 = 0x00 usually means the other button
            
            let isUpButton = false;
            let isDownButton = false;
            
            // Check if we can identify the button from the pattern
            if (byte3 === 0x10) {
                if (byte4 === 0x01) {
                    isUpButton = true;
                } else if (byte4 === 0x00) {
                    isDownButton = true;
                }
            }
            
            // If we couldn't identify, use alternating pattern as fallback
            if (!isUpButton && !isDownButton) {
                // Log for debugging
                this.log(`🔍 Unknown button pattern: ${hexString}`);
                
                // Use alternating logic
                if (this.buttonState.lastButtonPressed === 'up') {
                    isDownButton = true;
                } else {
                    isUpButton = true;
                }
            }
            
            // Handle the button press
            if (isUpButton) {
                this.handleUpButton();
                this.buttonState.lastButtonPressed = 'up';
            } else if (isDownButton) {
                this.handleDownButton();
                this.buttonState.lastButtonPressed = 'down';
            }
            
            this.buttonState.pressed = true;
        } else if (stateByte === 0x01) {
            // Button released
            this.buttonState.pressed = false;
        }
    }
}

handleUpButton() {
    // UP Button behavior depends on mode
    if (this.autoMode) {
        // AUTO MODE: Increase resistance by 5%
        const currentResistance = this.metrics.resistance;
        const newResistance = Math.min(100, currentResistance + 5);
        this.setResistance(newResistance);
        this.log(`🎮 UP (Auto) → Resistance: ${newResistance}%`);
        this.showNotification('info', `Resistance: ${newResistance}%`, 1500);
    } else {
        // MANUAL MODE: Cycle to next zone
        this.log('🎮 UP (Manual) → Next Zone');
        this.cycleZone();
    }
}

handleDownButton() {
    // DOWN Button behavior depends on mode
    if (this.autoMode) {
        // AUTO MODE: Decrease resistance by 5%
        const currentResistance = this.metrics.resistance;
        const newResistance = Math.max(0, currentResistance - 5);
        this.setResistance(newResistance);
        this.log(`🎮 DOWN (Auto) → Resistance: ${newResistance}%`);
        this.showNotification('info', `Resistance: ${newResistance}%`, 1500);
    } else {
        // MANUAL MODE: Trigger lap
        this.log('🎮 DOWN (Manual) → LAP');
        this.triggerLap();
    }
}

// Also update the toggle handler to show mode change
setupEventListeners() {
    // ... existing code ...
    
    // Interval controls with mode change notification
    document.getElementById('auto-interval-toggle')?.addEventListener('change', (e) => {
        this.autoMode = e.target.checked;
        
        if (this.autoMode) {
            this.log('🤖 AUTO MODE: UP/DOWN adjust resistance ±5%');
            this.showNotification('warning', '🤖 AUTO MODE: Buttons now adjust resistance', 3000);
            
            // Update control description
            document.getElementById('controls-description').innerHTML = 
                '<strong>AUTO MODE Active:</strong> UP = +5% Resistance | DOWN = -5% Resistance';
        } else {
            this.log('👤 MANUAL MODE: UP cycles zones, DOWN triggers lap');
            this.showNotification('info', '👤 MANUAL MODE: UP = Zone | DOWN = Lap', 3000);
            
            // Update control description
            document.getElementById('controls-description').innerHTML = 
                '<strong>MANUAL MODE Active:</strong> UP = Next Zone | DOWN = Trigger Lap';
        }
    });
}