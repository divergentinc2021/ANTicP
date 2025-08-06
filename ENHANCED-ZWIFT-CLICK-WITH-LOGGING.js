// ============================================================================
// IMPROVED ZWIFT CLICK CONNECTION WITH COMPREHENSIVE LOGGING
// Handles both Zwift Click (encrypted) and Zwift Ride (unencrypted) protocols
// ============================================================================

async pairControls() {
    try {
        this.log('🎮 Pairing Controls (Zwift Click/Ride)...');
        this.updateSensorCard('controls', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'Zwift' },
                { namePrefix: 'Zwift Click' },
                { namePrefix: 'Zwift SF2' },  // Zwift Ride advertises as SF2
                { services: ['00000001-19ca-4651-86e5-fa29dcdd09d1'] }
            ],
            optionalServices: [
                '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
                '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
                '00000001-19ca-4651-86e5-fa29dcdd09d1'  // Zwift Service
            ]
        });

        this.log(`📱 Found device: ${device.name || 'Unknown'} (ID: ${device.id})`);
        
        const server = await device.gatt.connect();
        this.log('🔗 GATT server connected');
        
        const zwiftService = await server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
        this.log('📡 Zwift service acquired');
        
        // Get all characteristics and log them
        const characteristics = await zwiftService.getCharacteristics();
        this.log(`🔍 Found ${characteristics.length} characteristics:`);
        characteristics.forEach((char, index) => {
            this.log(`  ${index + 1}. ${char.uuid} - Properties: ${this.getCharacteristicProperties(char)}`);
        });
        
        // Get specific characteristics
        const measurementChar = await zwiftService.getCharacteristic('00000002-19ca-4651-86e5-fa29dcdd09d1');
        const controlPointChar = await zwiftService.getCharacteristic('00000003-19ca-4651-86e5-fa29dcdd09d1');
        const responseChar = await zwiftService.getCharacteristic('00000004-19ca-4651-86e5-fa29dcdd09d1');
        
        this.log('📋 All required characteristics found');
        this.log(`  📊 Measurement: ${measurementChar.uuid} (${this.getCharacteristicProperties(measurementChar)})`);
        this.log(`  📝 Control Point: ${controlPointChar.uuid} (${this.getCharacteristicProperties(controlPointChar)})`);
        this.log(`  📥 Response: ${responseChar.uuid} (${this.getCharacteristicProperties(responseChar)})`);
        
        // Check if device name suggests Zwift Ride (unencrypted) or Click (encrypted)
        const isZwiftRide = device.name && (device.name.includes('SF2') || device.name.includes('Ride'));
        this.log(`🔍 Device type detected: ${isZwiftRide ? 'Zwift Ride (unencrypted)' : 'Zwift Click (encrypted)'}`);
        
        // Start response notifications first
        this.log('👂 Starting response characteristic notifications...');
        await responseChar.startNotifications();
        
        // Set up response listener with detailed logging
        responseChar.addEventListener('characteristicvaluechanged', (event) => {
            this.handleZwiftResponse(event.target.value, isZwiftRide);
        });
        
        this.log('✅ Response notifications active');
        
        // Try to read current response value
        try {
            const currentResponse = await responseChar.readValue();
            this.log(`📖 Current response value: ${this.dataViewToHex(currentResponse)}`);
            if (currentResponse.byteLength > 0) {
                this.handleZwiftResponse(currentResponse, isZwiftRide);
            }
        } catch (readError) {
            this.log(`⚠️ Could not read current response: ${readError.message}`);
        }
        
        // Perform handshake
        this.log('🤝 Initiating handshake...');
        
        if (isZwiftRide) {
            // Simple RideOn handshake for Zwift Ride
            this.log('📤 Sending simple RideOn handshake for Zwift Ride...');
            const rideOnMessage = new TextEncoder().encode('RideOn');
            this.log(`📤 Handshake data: ${this.uint8ArrayToHex(rideOnMessage)} ("${new TextDecoder().decode(rideOnMessage)}")`);
            await controlPointChar.writeValue(rideOnMessage);
        } else {
            // Complex handshake for Zwift Click (encrypted)
            this.log('📤 Sending complex RideOn handshake for Zwift Click...');
            
            // Create RideOn message with additional bytes for encryption handshake
            const rideOnBytes = new TextEncoder().encode('RideOn');
            const handshakeData = new Uint8Array(rideOnBytes.length + 2);
            handshakeData.set(rideOnBytes, 0);
            handshakeData[rideOnBytes.length] = 0x01;     // Additional byte
            handshakeData[rideOnBytes.length + 1] = 0x02; // Additional byte
            
            this.log(`📤 Complex handshake data: ${this.uint8ArrayToHex(handshakeData)}`);
            await controlPointChar.writeValue(handshakeData);
        }
        
        this.log('⏱️ Waiting for handshake response...');
        
        // Store connection info
        this.sensorConnections.controls = { 
            device, 
            server, 
            service: zwiftService,
            measurementChar,
            controlPointChar,
            responseChar,
            isZwiftRide,
            handshakeComplete: false
        };
        
        // Set a timeout for handshake
        setTimeout(() => {
            if (!this.sensorConnections.controls?.handshakeComplete) {
                this.log('⏰ Handshake timeout - proceeding anyway');
                this.startControlsMonitoring();
            }
        }, 5000);
        
        this.updateSensorCard('controls', 'connected', device.name);
        this.log(`✅ Controls paired: ${device.name}`);
        this.showNotification('success', `Controls paired: ${device.name}`);
        
    } catch (error) {
        this.updateSensorCard('controls', 'error');
        this.log(`❌ Controls pairing failed: ${error.message}`);
        this.log(`🔍 Error details: ${error.stack}`);
        this.showNotification('error', `Controls pairing failed: ${error.message}`);
    }
}

// Enhanced response handler with detailed logging
handleZwiftResponse(dataValue, isZwiftRide = false) {
    const data = new Uint8Array(dataValue.buffer);
    const hexData = this.uint8ArrayToHex(data);
    
    this.log(`📥 Zwift response received: ${hexData} (${data.length} bytes)`);
    
    // Try to decode as text
    try {
        const textData = new TextDecoder().decode(dataValue);
        this.log(`📜 Response as text: "${textData}"`);
        
        if (textData.includes('RideOn')) {
            this.log('✅ RideOn response detected - handshake successful!');
            if (this.sensorConnections.controls) {
                this.sensorConnections.controls.handshakeComplete = true;
            }
            this.startControlsMonitoring();
            return;
        }
    } catch (e) {
        this.log('📜 Response is not valid text');
    }
    
    // Check for protocol buffer or encrypted data
    if (data.length > 6 && data[0] === 0x52 && data[1] === 0x69) { // "Ri" start of RideOn
        this.log('🔍 Looks like RideOn response with additional data');
        this.log(`🔍 Additional bytes: ${hexData.substring(12)}`); // Skip "RideOn" part
        
        if (this.sensorConnections.controls) {
            this.sensorConnections.controls.handshakeComplete = true;
        }
        this.startControlsMonitoring();
    } else if (data.length > 0) {
        this.log(`🔍 Unknown response format - first byte: 0x${data[0].toString(16)}`);
        this.log('🔍 This might be encrypted data or a different protocol');
    }
}

// Start monitoring for button presses with enhanced logging
async startControlsMonitoring() {
    try {
        const connection = this.sensorConnections.controls;
        if (!connection) {
            this.log('❌ No controls connection available');
            return;
        }
        
        this.log('👂 Starting controls monitoring...');
        
        await connection.measurementChar.startNotifications();
        connection.measurementChar.addEventListener('characteristicvaluechanged', (event) => {
            this.handleControlsDataEnhanced(event.target.value);
        });
        
        this.log('✅ Controls monitoring active - waiting for button presses');
        this.log('🎮 Press buttons on your Zwift Click/Ride to test...');
        
        // Test connectivity by logging periodic status
        this.controlsMonitoringInterval = setInterval(() => {
            if (connection.device && connection.device.gatt.connected) {
                this.log('🔄 Controls connection status: Active (waiting for button presses)');
            } else {
                this.log('⚠️ Controls connection lost');
                this.clearControlsMonitoring();
            }
        }, 30000); // Every 30 seconds
        
    } catch (error) {
        this.log(`❌ Failed to start controls monitoring: ${error.message}`);
    }
}

// Enhanced controls data handler with comprehensive logging
handleControlsDataEnhanced(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    const hexData = this.uint8ArrayToHex(data);
    const timestamp = new Date().toLocaleTimeString();
    
    this.log(`🎮 [${timestamp}] Controls data: ${hexData} (${data.length} bytes)`);
    
    if (data.length === 0) {
        this.log('⚠️ Empty data received');
        return;
    }
    
    // Log first few bytes for analysis
    this.log(`🔍 First byte: 0x${data[0].toString(16)} (${data[0]})`);
    if (data.length > 1) {
        this.log(`🔍 Second byte: 0x${data[1].toString(16)} (${data[1]})`);
    }
    if (data.length > 4) {
        this.log(`🔍 Bytes 2-5: ${Array.from(data.slice(1, 5)).map(b => '0x' + b.toString(16)).join(' ')}`);
    }
    
    // Check for protocol buffer message ID 0x23 (button press)
    if (data[0] === 0x23) {
        this.log('🎯 Protocol buffer button press detected (0x23)!');
        
        if (data.length >= 5) {
            // Extract 32-bit bitmap (little endian)
            const buttonBitmap = data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
            this.log(`🎮 Button bitmap: 0x${buttonBitmap.toString(16)} (${buttonBitmap})`);
            
            // Inverse logic - bit set to 0 means button is pressed
            const upPressed = !(buttonBitmap & 0x01);
            const downPressed = !(buttonBitmap & 0x02);
            
            this.log(`🔍 Button analysis:`);
            this.log(`  📈 Up button (bit 0): ${upPressed ? 'PRESSED' : 'not pressed'} (${(buttonBitmap & 0x01) ? '1' : '0'})`);
            this.log(`  📉 Down button (bit 1): ${downPressed ? 'PRESSED' : 'not pressed'} (${(buttonBitmap & 0x02) ? '1' : '0'})`);
            
            if (upPressed) {
                this.gearUp();
                this.log(`🎮 ✅ GEAR UP TRIGGERED (bitmap: 0x${buttonBitmap.toString(16)})`);
            }
            
            if (downPressed) {
                this.gearDown();
                this.log(`🎮 ✅ GEAR DOWN TRIGGERED (bitmap: 0x${buttonBitmap.toString(16)})`);
            }
            
            if (!upPressed && !downPressed) {
                this.log('🎮 Button released or other buttons pressed');
            }
        } else {
            this.log('⚠️ Protocol buffer message too short for button data');
        }
    } 
    // Check for keepalive messages
    else if (data[0] === 0x19 || data[0] === 0x15) {
        this.log(`🔄 Keepalive message: 0x${data[0].toString(16)}`);
    }
    // Check for other known message types
    else if (data[0] === 0x01 || data[0] === 0x02) {
        this.log(`📨 Handshake/setup message: 0x${data[0].toString(16)}`);
    }
    // Unknown message
    else {
        this.log(`❓ Unknown message type: 0x${data[0].toString(16)}`);
        this.log(`🔍 Full data for analysis: ${hexData}`);
        
        // Try to find patterns
        if (data.length > 1) {
            let hasPattern = false;
            
            // Check for repeated bytes
            const firstByte = data[0];
            if (data.every(byte => byte === firstByte)) {
                this.log(`🔍 Pattern: All bytes are 0x${firstByte.toString(16)}`);
                hasPattern = true;
            }
            
            // Check for incrementing pattern
            let isIncrementing = true;
            for (let i = 1; i < data.length; i++) {
                if (data[i] !== data[i-1] + 1) {
                    isIncrementing = false;
                    break;
                }
            }
            if (isIncrementing) {
                this.log(`🔍 Pattern: Incrementing sequence starting from 0x${data[0].toString(16)}`);
                hasPattern = true;
            }
            
            if (!hasPattern) {
                this.log(`🔍 No obvious pattern detected - might be encrypted or compressed data`);
            }
        }
    }
}

// Utility methods for enhanced logging
getCharacteristicProperties(characteristic) {
    const props = [];
    if (characteristic.properties.read) props.push('read');
    if (characteristic.properties.write) props.push('write');
    if (characteristic.properties.writeWithoutResponse) props.push('writeWithoutResponse');
    if (characteristic.properties.notify) props.push('notify');
    if (characteristic.properties.indicate) props.push('indicate');
    return props.join(', ') || 'none';
}

dataViewToHex(dataView) {
    const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    return this.uint8ArrayToHex(bytes);
}

uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join(' ');
}

clearControlsMonitoring() {
    if (this.controlsMonitoringInterval) {
        clearInterval(this.controlsMonitoringInterval);
        this.controlsMonitoringInterval = null;
        this.log('🛑 Controls monitoring cleared');
    }
}

// Enhanced gear control with logging
gearUp() {
    if (this.liveMetrics.gear < 24) {
        this.liveMetrics.gear++;
        this.updateLiveMetric('live-gear-display', this.liveMetrics.gear, 'Zwift Click gear up');
        this.updateSensorValue('controls', this.liveMetrics.gear, 'gear');
        this.log(`⚙️ 📈 GEAR UP: ${this.liveMetrics.gear - 1} → ${this.liveMetrics.gear}`);
    } else {
        this.log(`⚙️ 🚫 GEAR UP blocked: Already at maximum gear (${this.liveMetrics.gear})`);
    }
}

gearDown() {
    if (this.liveMetrics.gear > 1) {
        this.liveMetrics.gear--;
        this.updateLiveMetric('live-gear-display', this.liveMetrics.gear, 'Zwift Click gear down');
        this.updateSensorValue('controls', this.liveMetrics.gear, 'gear');
        this.log(`⚙️ 📉 GEAR DOWN: ${this.liveMetrics.gear + 1} → ${this.liveMetrics.gear}`);
    } else {
        this.log(`⚙️ 🚫 GEAR DOWN blocked: Already at minimum gear (${this.liveMetrics.gear})`);
    }
}
