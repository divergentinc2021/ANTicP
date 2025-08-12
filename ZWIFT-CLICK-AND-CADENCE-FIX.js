// Fixed Zwift Click connection method with enhanced handshake
async connectZwiftClick() {
    try {
        this.log('🎮 Connecting to Zwift Click...');
        this.updateSensorCard('controls', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'Zwift Click' },
                { namePrefix: 'CLICK' },
                { namePrefix: 'Zwift' }
            ],
            optionalServices: [
                '00000001-19ca-4651-86e5-fa29dcdd09d1',
                '0000180f-0000-1000-8000-00805f9b34fb',
                '0000180a-0000-1000-8000-00805f9b34fb'
            ]
        });

        const server = await device.gatt.connect();
        this.log(`📱 Connected to device: ${device.name}`);
        
        const zwiftService = await server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
        this.log('✅ Found Zwift Click service');
        
        // Get characteristics
        const measurementChar = await zwiftService.getCharacteristic('00000002-19ca-4651-86e5-fa29dcdd09d1');
        const controlChar = await zwiftService.getCharacteristic('00000003-19ca-4651-86e5-fa29dcdd09d1');
        const responseChar = await zwiftService.getCharacteristic('00000004-19ca-4651-86e5-fa29dcdd09d1');
        
        this.log('📝 Found all characteristics');
        
        // Setup response listener BEFORE handshake
        await responseChar.startNotifications();
        let handshakeComplete = false;
        
        responseChar.addEventListener('characteristicvaluechanged', (event) => {
            const data = new Uint8Array(event.target.value.buffer);
            const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
            this.log(`📥 Response data: ${hexString}`);
            
            // Check for handshake confirmation
            const response = new TextDecoder().decode(event.target.value);
            if (response.includes('RideOn')) {
                handshakeComplete = true;
                this.log('✅ Handshake confirmed!');
            }
        });
        
        // Setup measurement notifications with detailed logging
        await measurementChar.startNotifications();
        measurementChar.addEventListener('characteristicvaluechanged', (event) => {
            const data = new Uint8Array(event.target.value.buffer);
            const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
            this.log(`📊 Measurement data: ${hexString}`);
            this.handleZwiftClickData(event.target.value);
        });
        
        this.log('🔔 Notifications enabled');
        
        // Enhanced handshake sequence
        try {
            // Method 1: RideOn as text
            this.log('🤝 Sending RideOn handshake (text)...');
            const rideOnText = new TextEncoder().encode('RideOn');
            await controlChar.writeValue(rideOnText);
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Method 2: RideOn with protocol buffer wrapper
            if (!handshakeComplete) {
                this.log('🤝 Sending RideOn with PB wrapper...');
                // 0x0A = field 1, string type, 0x06 = length 6, then "RideOn"
                const pbRideOn = new Uint8Array([0x0A, 0x06, 0x52, 0x69, 0x64, 0x65, 0x4F, 0x6E]);
                await controlChar.writeValue(pbRideOn);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Method 3: Try init sequence
            if (!handshakeComplete) {
                this.log('🤝 Sending init sequence...');
                const initSeq = new Uint8Array([0x10, 0x01]); // Common BLE init
                await controlChar.writeValue(initSeq);
            }
            
        } catch (handshakeError) {
            this.log(`⚠️ Handshake warning: ${handshakeError.message} (continuing anyway)`);
        }
        
        this.connections.zwiftClick = { 
            device, 
            server, 
            service: zwiftService,
            measurementChar,
            controlChar,
            responseChar
        };
        
        this.updateSensorCard('controls', 'connected', device.name);
        this.log(`✅ Zwift Click connected: ${device.name} - Buttons should work now!`);
        this.showNotification('success', `Zwift Click connected - Press UP/DOWN buttons!`);
        
    } catch (error) {
        this.updateSensorCard('controls', 'error');
        this.log(`❌ Zwift Click connection failed: ${error.message}`);
        this.showNotification('error', `Zwift Click connection failed: ${error.message}`);
    }
}

// Fixed FTMS Indoor Bike Data handler with correct parsing order
handleIndoorBikeData(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
    this.log(`🚴 FTMS Data (${data.length} bytes): ${hexString}`);
    
    if (data.length < 4) {
        this.log('⚠️ Data too short, skipping');
        return;
    }
    
    // Parse flags (2 bytes, little endian)
    const flags = data[0] | (data[1] << 8);
    this.log(`📋 Flags: 0x${flags.toString(16).padStart(4, '0')} (binary: ${flags.toString(2).padStart(16, '0')})`);
    
    let index = 2;
    
    // IMPORTANT: Speed is ALWAYS present after flags (not optional!)
    // This is the instantaneous speed, always at bytes 2-3
    if (index + 1 < data.length) {
        const speedRaw = data[index] | (data[index + 1] << 8);
        const speedKmh = speedRaw * 0.01; // Resolution: 0.01 km/h
        this.liveMetrics.speed = speedKmh;
        this.updateMetric('speed', speedKmh.toFixed(1), 'km/h');
        this.log(`🚴 Speed: ${speedKmh.toFixed(1)} km/h (raw: ${speedRaw})`);
        index += 2;
    }
    
    // Average Speed Present (bit 1)
    if (flags & 0x0002) {
        this.log('📊 Average speed present, skipping 2 bytes');
        index += 2;
    }
    
    // Instantaneous Cadence Present (bit 2)
    if (flags & 0x0004) {
        if (index + 1 < data.length) {
            const cadenceRaw = data[index] | (data[index + 1] << 8);
            const cadenceRpm = cadenceRaw * 0.5; // Resolution: 0.5 rpm
            this.liveMetrics.cadence = Math.round(cadenceRpm);
            this.updateMetric('cadence', Math.round(cadenceRpm), 'rpm');
            this.log(`🔄 Cadence: ${Math.round(cadenceRpm)} RPM (raw: ${cadenceRaw})`);
            index += 2;
        }
    }
    
    // Average Cadence Present (bit 3)
    if (flags & 0x0008) {
        this.log('📊 Average cadence present, skipping 2 bytes');
        index += 2;
    }
    
    // Total Distance Present (bit 4)
    if (flags & 0x0010) {
        if (index + 2 < data.length) {
            // 3 bytes for distance (24-bit value)
            const distanceRaw = data[index] | (data[index + 1] << 8) | (data[index + 2] << 16);
            const distanceMeters = distanceRaw; // Resolution: 1 meter
            const distanceKm = distanceMeters / 1000;
            this.liveMetrics.distance = distanceKm;
            this.updateMetric('distance', distanceKm.toFixed(2), 'km');
            this.log(`📏 Distance: ${distanceKm.toFixed(2)} km`);
            index += 3;
        }
    }
    
    // Resistance Level Present (bit 5)
    if (flags & 0x0020) {
        if (index < data.length) {
            const resistance = data[index];
            this.liveMetrics.resistance = resistance;
            document.getElementById('resistance-display').textContent = `${resistance}%`;
            this.log(`🎚️ Resistance: ${resistance}%`);
            index += 1;
        }
    }
    
    // Instantaneous Power Present (bit 6)
    if (flags & 0x0040) {
        if (index + 1 < data.length) {
            const powerRaw = data[index] | (data[index + 1] << 8);
            this.liveMetrics.power = powerRaw; // Resolution: 1 watt
            this.updateMetric('power', powerRaw, 'W');
            this.log(`⚡ Power: ${powerRaw}W`);
            index += 2;
        }
    }
    
    // Average Power Present (bit 7)
    if (flags & 0x0080) {
        this.log('📊 Average power present, skipping 2 bytes');
        index += 2;
    }
    
    // Expended Energy Present (bit 8)
    if (flags & 0x0100) {
        this.log('📊 Energy data present, skipping 5 bytes');
        index += 2; // Total Energy (2 bytes)
        index += 2; // Energy Per Hour (2 bytes)
        index += 1; // Energy Per Minute (1 byte)
    }
    
    // Heart Rate Present (bit 9)
    if (flags & 0x0200) {
        if (index < data.length) {
            const heartRate = data[index];
            this.liveMetrics.heartRate = heartRate;
            this.updateMetric('hr', heartRate, 'bpm');
            this.log(`❤️ Heart Rate: ${heartRate} bpm`);
            index += 1;
        }
    }
    
    // Metabolic Equivalent Present (bit 10)
    if (flags & 0x0400) {
        this.log('📊 Metabolic equivalent present, skipping 1 byte');
        index += 1;
    }
    
    // Elapsed Time Present (bit 11)
    if (flags & 0x0800) {
        if (index + 1 < data.length) {
            const elapsedSeconds = data[index] | (data[index + 1] << 8);
            this.log(`⏱️ Elapsed time: ${elapsedSeconds} seconds`);
            index += 2;
        }
    }
    
    // Remaining Time Present (bit 12)
    if (flags & 0x1000) {
        this.log('📊 Remaining time present, skipping 2 bytes');
        index += 2;
    }
    
    this.log(`📊 Parsed ${index} of ${data.length} bytes`);
}

// Enhanced Zwift Click data handler with more debugging
handleZwiftClickData(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
    this.log(`🎮 Zwift Click data (${data.length} bytes): ${hexString}`);
    
    if (data.length === 0) return;
    
    const messageType = data[0];
    
    // Button press message (0x23)
    if (messageType === 0x23) {
        this.log('🎮 Button press message detected!');
        
        if (data.length >= 5) {
            // Extract button bitmap (4 bytes, little endian)
            const buttonBitmap = data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
            this.log(`🎮 Button bitmap: 0x${buttonBitmap.toString(16).padStart(8, '0')}`);
            
            // Bit logic: 0 = pressed, 1 = not pressed
            const upPressed = !(buttonBitmap & 0x01);
            const downPressed = !(buttonBitmap & 0x02);
            
            if (upPressed) {
                this.adjustResistance(5);
                this.log('🎮 ⬆️ UP button pressed - Increasing resistance');
                this.showNotification('info', 'Zwift Click: UP - Resistance +5%', 2000);
            }
            
            if (downPressed) {
                this.adjustResistance(-5);
                this.log('🎮 ⬇️ DOWN button pressed - Decreasing resistance');
                this.showNotification('info', 'Zwift Click: DOWN - Resistance -5%', 2000);
            }
            
            if (!upPressed && !downPressed) {
                this.log('🎮 Buttons released');
            }
        }
    } 
    // Keepalive messages
    else if (messageType === 0x19 || messageType === 0x15) {
        // Don't log keepalives to reduce noise
        // this.log(`🔄 Keepalive: 0x${messageType.toString(16)}`);
    }
    // Other message types
    else {
        this.log(`🎮 Unknown message type: 0x${messageType.toString(16)}`);
    }
}