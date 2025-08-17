// FIX FOR ZWIFT CLICK DOWN BUTTON
// ================================
// The DOWN button on your Zwift Click only sends RELEASE events, not PRESS events.
// This fix detects the DOWN button using its RELEASE event instead.

// 1. ADD this property to buttonState object (around line 640):
lastDownReleaseTime: 0,

// 2. REPLACE the entire handleZwiftClickData method with this version:

handleZwiftClickData(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    
    // Debug logging if enabled
    if (this.buttonState.debugMode) {
        const hexString = Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
        console.log(`Zwift Click data: ${hexString}`);
    }
    
    // Check for the 0x37 message type (button state message)
    if (data.length >= 5 && data[0] === 0x37) {
        const currentTime = Date.now();
        
        // Extract button state information
        const stateByte = data[2];  // 0x00 = pressed, 0x01 = released
        const buttonId = data[4];   // 0x01 = UP, 0x00 = DOWN
        
        // Handle UP button on PRESS (normal behavior)
        if (stateByte === 0x00 && buttonId === 0x01) {
            // Debounce - prevent multiple triggers
            if (currentTime - this.buttonState.lastMessageTime < 200) return;
            this.buttonState.lastMessageTime = currentTime;
            
            this.handleUpButton();
            this.log('🎮 UP button pressed');
        }
        
        // SPECIAL HANDLING: DOWN button on RELEASE
        // Your Zwift Click DOWN button only sends RELEASE events (0x37 0x08 0x01 0x10 0x00)
        // but no PRESS events, so we detect it on the first RELEASE in a sequence
        if (stateByte === 0x01 && buttonId === 0x00) {
            // Check if this is the first release event in a sequence
            // (DOWN button sends multiple release events but no press event)
            if (currentTime - this.buttonState.lastDownReleaseTime > 500) {
                // This is a new DOWN button press/release cycle
                this.handleDownButton();
                this.log('🎮 DOWN button detected (via release)');
            }
            this.buttonState.lastDownReleaseTime = currentTime;
        }
    } else if (data.length === 3 && data[0] === 0x19) {
        // This is a keepalive/status message (0x19 0x10 0x64), ignore it
        return;
    }
}