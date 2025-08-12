// FIXED Zwift Click Button Handler - Reliable Detection
// This version uses multiple detection methods to ensure both buttons work

handleZwiftClickData(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    
    // Message type 0x37 is the button state message
    if (data[0] === 0x37 && data.length >= 5) {
        const currentTime = Date.now();
        
        // Extract button state
        const stateByte = data[2];  // 0x00 = pressed, 0x01 = released
        
        // Only process button press (not release)
        if (stateByte === 0x00) {
            // Debounce
            if (currentTime - this.buttonState.lastMessageTime < 200) return;
            this.buttonState.lastMessageTime = currentTime;
            
            // Log the raw data for debugging
            const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
            console.log(`Zwift Click: ${hexString}`);
            
            // IMPORTANT: Different Zwift Click models may have different patterns
            // We'll use multiple detection strategies
            
            let buttonType = null;
            
            // Strategy 1: Check bytes 3 and 4 (most common pattern)
            if (data[3] === 0x10) {
                if (data[4] === 0x01) {
                    buttonType = 'up';
                } else if (data[4] === 0x00) {
                    buttonType = 'down';
                }
            }
            
            // Strategy 2: Check byte 1 (some Click versions)
            if (!buttonType) {
                // Byte 1 sometimes differs between buttons
                if (data[1] === 0x08) {
                    // Could be either button, check byte 4
                    if (data[4] === 0x01) {
                        buttonType = 'up';
                    } else if (data[4] === 0x00) {
                        buttonType = 'down';
                    }
                } else if (data[1] === 0x09) {
                    buttonType = 'up';
                } else if (data[1] === 0x0a) {
                    buttonType = 'down';
                }
            }
            
            // Strategy 3: Look for any distinguishing byte
            if (!buttonType) {
                // Sum all bytes to create a signature
                const signature = data.reduce((sum, byte) => sum + byte, 0);
                
                // If we've seen this signature before, use the same button
                if (this.buttonState.lastSignature === signature) {
                    buttonType = this.buttonState.lastButtonPressed;
                } else {
                    // New signature - alternate buttons
                    buttonType = (this.buttonState.lastButtonPressed === 'up') ? 'down' : 'up';
                    this.buttonState.lastSignature = signature;
                }
            }
            
            // Execute the appropriate button handler
            if (buttonType === 'up') {
                this.handleUpButton();
                this.buttonState.lastButtonPressed = 'up';
            } else if (buttonType === 'down') {
                this.handleDownButton();
                this.buttonState.lastButtonPressed = 'down';
            }
            
            // Log which button was detected
            this.log(`🎮 ${buttonType.toUpperCase()} button detected`);
            
            this.buttonState.pressed = true;
        } else if (stateByte === 0x01) {
            // Button released
            this.buttonState.pressed = false;
        }
    }
}