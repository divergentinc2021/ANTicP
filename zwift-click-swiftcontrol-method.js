// FIXED Zwift Click detection based on SwiftControl implementation
// Reference: https://github.com/jonasbark/swiftcontrol

handleZwiftClickData(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    
    // Message type 0x37 is the button state message
    if (data[0] === 0x37 && data.length >= 5) {
        const stateByte = data[2];
        
        // Only process button press (0x00), not release (0x01)
        if (stateByte === 0x00) {
            const currentTime = Date.now();
            
            // Debounce
            if (currentTime - this.buttonState.lastMessageTime < 150) return;
            this.buttonState.lastMessageTime = currentTime;
            
            // Log for debugging
            const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
            console.log(`Zwift Click raw: ${hexString}`);
            
            // DETECTION METHOD FROM SWIFTCONTROL:
            // They found that the buttons can be distinguished by looking at 
            // the COMBINATION of bytes, not just byte 4
            
            // Check multiple bytes to identify the button
            const byte1 = data[1];
            const byte3 = data[3];
            const byte4 = data[4];
            
            let isUpButton = false;
            let isDownButton = false;
            
            // Pattern 1: Standard detection (byte 4)
            if (byte3 === 0x10) {
                if (byte4 === 0x01) {
                    // This might be UP
                    isUpButton = true;
                } else if (byte4 === 0x00) {
                    // This might be DOWN
                    isDownButton = true;
                }
            }
            
            // Pattern 2: Check byte 1 variations (from SwiftControl)
            // Some Zwift Clicks use byte 1 to distinguish
            if (!isUpButton && !isDownButton) {
                if (byte1 === 0x08) {
                    // Most common pattern
                    // Need to check message sequence or timing
                    // First message after pause is usually UP
                    const timeSinceLastMessage = currentTime - this.buttonState.lastMessageTime;
                    if (timeSinceLastMessage > 1000) {
                        // Long gap, probably UP button
                        isUpButton = true;
                    } else {
                        // Quick succession, might be DOWN
                        isDownButton = true;
                    }
                } else if (byte1 === 0x09) {
                    // Alternative pattern for UP
                    isUpButton = true;
                } else if (byte1 === 0x0a || byte1 === 0x07) {
                    // Alternative pattern for DOWN
                    isDownButton = true;
                }
            }
            
            // Pattern 3: Message counting (some devices send 2 messages for one button)
            if (!isUpButton && !isDownButton) {
                // Count messages in quick succession
                if (this.buttonState.messageBuffer) {
                    const timeDiff = currentTime - this.buttonState.messageBuffer.time;
                    if (timeDiff < 100) {
                        // Two messages quickly = DOWN button
                        isDownButton = true;
                        this.buttonState.messageBuffer = null;
                    } else {
                        // Single message = UP button
                        isUpButton = true;
                        this.buttonState.messageBuffer = { time: currentTime, data: hexString };
                    }
                } else {
                    // Start buffer
                    this.buttonState.messageBuffer = { time: currentTime, data: hexString };
                    // Wait to see if another message comes
                    setTimeout(() => {
                        if (this.buttonState.messageBuffer && 
                            this.buttonState.messageBuffer.time === currentTime) {
                            // No second message came, it was UP
                            this.handleUpButton();
                            this.buttonState.lastButtonPressed = 'up';
                            this.buttonState.messageBuffer = null;
                        }
                    }, 100);
                    return; // Wait for potential second message
                }
            }
            
            // Execute the detected button
            if (isUpButton) {
                this.handleUpButton();
                this.buttonState.lastButtonPressed = 'up';
            } else if (isDownButton) {
                this.handleDownButton();
                this.buttonState.lastButtonPressed = 'down';
            } else {
                // Fallback: alternate
                this.log(`⚠️ Unknown pattern: ${hexString}, using alternation`);
                if (this.buttonState.lastButtonPressed !== 'down') {
                    this.handleDownButton();
                    this.buttonState.lastButtonPressed = 'down';
                } else {
                    this.handleUpButton();
                    this.buttonState.lastButtonPressed = 'up';
                }
            }
            
            this.buttonState.pressed = true;
        } else if (stateByte === 0x01) {
            // Button released
            this.buttonState.pressed = false;
        }
    }
}

// Add to constructor's buttonState:
this.buttonState = {
    pressed: false,
    lastMessageTime: 0,
    lastButtonPressed: null,
    messageBuffer: null,  // For detecting double messages
    debugMode: true
};