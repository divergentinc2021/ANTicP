// FIXED Zwift Click handler for devices that use single/double click
// Your device sends the same data for both buttons, but uses click count to distinguish

handleZwiftClickData(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    
    // Message type 0x37 is the button state message
    if (data[0] === 0x37 && data.length >= 5) {
        const stateByte = data[2];
        
        // Only process button press (0x00), not release (0x01)
        if (stateByte === 0x00) {
            const currentTime = Date.now();
            
            // Check if this is a double-click (two presses within 300ms)
            const timeSinceLastPress = currentTime - this.buttonState.lastMessageTime;
            
            if (timeSinceLastPress < 300 && timeSinceLastPress > 50) {
                // This is the second press of a double-click
                // Clear any pending single-click timer
                if (this.buttonState.clickTimer) {
                    clearTimeout(this.buttonState.clickTimer);
                    this.buttonState.clickTimer = null;
                }
                
                // Execute DOWN button action (double-click)
                this.handleDownButton();
                this.buttonState.lastButtonPressed = 'down';
                this.buttonState.lastMessageTime = 0; // Reset to prevent triple-click
                
            } else if (timeSinceLastPress > 500) {
                // This could be a single click - wait to see if another click follows
                this.buttonState.lastMessageTime = currentTime;
                
                // Clear any existing timer
                if (this.buttonState.clickTimer) {
                    clearTimeout(this.buttonState.clickTimer);
                }
                
                // Set timer to execute single-click after delay
                this.buttonState.clickTimer = setTimeout(() => {
                    // No second click came - this is a single click (UP button)
                    this.handleUpButton();
                    this.buttonState.lastButtonPressed = 'up';
                    this.buttonState.clickTimer = null;
                }, 250); // Wait 250ms to see if double-click
            }
            
            this.buttonState.pressed = true;
        } else if (stateByte === 0x01) {
            // Button released
            this.buttonState.pressed = false;
        }
    }
}

// Alternative simpler version - just alternate between buttons
handleZwiftClickDataSimple(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    
    if (data[0] === 0x37 && data.length >= 5) {
        const stateByte = data[2];
        
        if (stateByte === 0x00) {
            const currentTime = Date.now();
            
            // Debounce - ignore if too soon after last press
            if (currentTime - this.buttonState.lastMessageTime < 200) return;
            this.buttonState.lastMessageTime = currentTime;
            
            // Simply alternate between UP and DOWN
            if (this.buttonState.lastButtonPressed !== 'down') {
                this.handleDownButton();
                this.buttonState.lastButtonPressed = 'down';
            } else {
                this.handleUpButton();
                this.buttonState.lastButtonPressed = 'up';
            }
        }
    }
}

// Add clickTimer to buttonState in constructor:
this.buttonState = {
    pressed: false,
    lastMessageTime: 0,
    lastButtonPressed: null,
    clickTimer: null  // Add this for double-click detection
};