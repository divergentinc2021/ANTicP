// ZWIFT CLICK FIX FOR index.html
// Replace the connectZwiftClick() and handleZwiftClickData() methods with these versions

// ============================================================================
// REPLACE connectZwiftClick() METHOD - Line ~878
// ============================================================================

async connectZwiftClick() {
    try {
        this.log('🎮 Connecting to Zwift Click...');
        this.log('💡 Make sure LED is pulsing blue (press button to wake)');
        document.getElementById('zwiftclick-card').classList.add('connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'Zwift Click' },
                { namePrefix: 'CLICK' },
                { name: 'CLICK' }
            ],
            optionalServices: [
                '00000001-19ca-4651-86e5-fa29dcdd09d1',
                '0000180f-0000-1000-8000-00805f9b34fb'
            ]
        });

        this.log(`✅ Found: ${device.name}`);
        const server = await device.gatt.connect();
        this.log('✅ Connected to GATT server');
        
        const service = await server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
        this.log('✅ Got Zwift Click service');
        
        // Get all characteristics and identify them properly
        const allChars = await service.getCharacteristics();
        this.log(`📋 Found ${allChars.length} characteristics`);
        
        let measurementChar = null;
        let controlChar = null;
        let responseChar = null;
        
        // Identify characteristics by full UUID
        for (const char of allChars) {
            const uuid = char.uuid;
            if (uuid === '00000002-19ca-4651-86e5-fa29dcdd09d1') {
                measurementChar = char;
                this.log('✅ Found measurement characteristic');
            } else if (uuid === '00000003-19ca-4651-86e5-fa29dcdd09d1') {
                controlChar = char;
                this.log('✅ Found control characteristic');
            } else if (uuid === '00000004-19ca-4651-86e5-fa29dcdd09d1') {
                responseChar = char;
                this.log('✅ Found response characteristic');
            }
        }
        
        // Setup notifications on measurement characteristic
        if (measurementChar && measurementChar.properties.notify) {
            await measurementChar.startNotifications();
            measurementChar.addEventListener('characteristicvaluechanged', (event) => {
                this.handleZwiftClickData(event.target.value);
            });
            this.log('🔔 Listening for button presses');
        }
        
        // Setup indications on response characteristic if available
        if (responseChar && responseChar.properties.indicate) {
            await responseChar.startNotifications();
            this.log('🔔 Response notifications enabled');
        }
        
        // CRITICAL FIX: Send handshake using writeWithoutResponse
        if (controlChar && controlChar.properties.writeWithoutResponse) {
            this.log('📤 Sending handshake...');
            const handshake = new TextEncoder().encode('RideOn');
            await controlChar.writeValueWithoutResponse(handshake);
            this.log('✅ Handshake sent: "RideOn"');
            
            // Send additional init sequences
            await new Promise(resolve => setTimeout(resolve, 200));
            try {
                const initCmd = new Uint8Array([0x00, 0x01]);
                await controlChar.writeValueWithoutResponse(initCmd);
                this.log('✅ Init sequence sent');
            } catch (e) {
                // Some init commands might fail, that's ok
            }
        }
        
        // Try to read battery level
        try {
            const batteryService = await server.getPrimaryService('0000180f-0000-1000-8000-00805f9b34fb');
            const batteryChar = await batteryService.getCharacteristic('00002a19-0000-1000-8000-00805f9b34fb');
            const batteryValue = await batteryChar.readValue();
            const batteryLevel = batteryValue.getUint8(0);
            this.log(`🔋 Battery level: ${batteryLevel}%`);
        } catch (e) {
            // Battery service not available
        }
        
        this.connections.zwiftClick = { device, server, service, measurementChar, controlChar };
        document.getElementById('zwiftclick-card').classList.remove('connecting');
        document.getElementById('zwiftclick-card').classList.add('connected');
        
        this.log('✅ Zwift Click connected - Buttons ready!');
        this.log('💡 UP = Zone/+5% | DOWN = Lap/-5%');
        this.showNotification('success', 'Zwift Click connected!');
        
    } catch (error) {
        document.getElementById('zwiftclick-card').classList.remove('connecting');
        this.log(`❌ Zwift Click connection failed: ${error.message}`);
        this.showNotification('error', 'Zwift Click connection failed');
    }
}

// ============================================================================
// REPLACE handleZwiftClickData() METHOD - Line ~927
// ============================================================================

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
        
        // Only process button press events (not releases)
        if (stateByte === 0x00) {
            // Debounce - prevent multiple triggers
            if (currentTime - this.buttonState.lastMessageTime < 200) return;
            this.buttonState.lastMessageTime = currentTime;
            
            // Handle button based on ID
            if (buttonId === 0x01) {
                this.handleUpButton();
                this.log('🎮 UP button pressed');
            } else if (buttonId === 0x00) {
                this.handleDownButton();
                this.log('🎮 DOWN button pressed');
            }
        }
    } else if (data.length === 3 && data[0] === 0x19) {
        // This is a keepalive/status message (0x19 0x10 0x5d), ignore it
        return;
    }
}