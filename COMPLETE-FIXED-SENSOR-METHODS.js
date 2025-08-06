// ============================================================================
// COMPLETE FIX: CORRECT SERVICE NAMES + IMPROVED ZWIFT CLICK HANDSHAKE
// Replace ALL sensor pairing methods in zwift-style-sensor-pairing-platform.html
// ============================================================================

// ✅ FIXED POWER SOURCE PAIRING
async pairPowerSource() {
    try {
        this.log('⚡ Pairing Power Source...');
        this.updateSensorCard('power', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['cycling_power'] },    // ✅ FIXED - Standard service name
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'Stages' },
                { namePrefix: 'Quarq' }
            ],
            optionalServices: ['cycling_power', 'battery_service', 'device_information']
        });

        const server = await device.gatt.connect();
        const powerService = await server.getPrimaryService('cycling_power');
        const powerChar = await powerService.getCharacteristic('cycling_power_measurement');
        
        await powerChar.startNotifications();
        powerChar.addEventListener('characteristicvaluechanged', (event) => {
            this.handlePowerData(event.target.value);
        });
        
        this.sensorConnections.powerSource = { device, server, service: powerService };
        this.updateSensorCard('power', 'connected', device.name);
        this.log(`✅ Power source paired: ${device.name}`);
        this.showNotification('success', `Power source paired: ${device.name}`);
        
    } catch (error) {
        this.updateSensorCard('power', 'error');
        this.log(`❌ Power pairing failed: ${error.message}`);
        this.showNotification('error', `Power pairing failed: ${error.message}`);
    }
}

// ✅ FIXED SPEED SOURCE PAIRING
async pairSpeedSource() {
    try {
        this.log('🚴 Pairing Speed Source...');
        this.updateSensorCard('speed', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['cycling_speed_and_cadence'] },  // ✅ FIXED - Standard service name
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'Garmin' },
                { namePrefix: 'Speed' }
            ],
            optionalServices: ['cycling_speed_and_cadence', 'battery_service', 'device_information']
        });

        const server = await device.gatt.connect();
        const cscService = await server.getPrimaryService('cycling_speed_and_cadence');
        const cscChar = await cscService.getCharacteristic('csc_measurement');
        
        await cscChar.startNotifications();
        cscChar.addEventListener('characteristicvaluechanged', (event) => {
            this.handleSpeedData(event.target.value);
        });
        
        this.sensorConnections.speedSource = { device, server, service: cscService };
        this.updateSensorCard('speed', 'connected', device.name);
        this.log(`✅ Speed source paired: ${device.name}`);
        this.showNotification('success', `Speed source paired: ${device.name}`);
        
    } catch (error) {
        this.updateSensorCard('speed', 'error');
        this.log(`❌ Speed pairing failed: ${error.message}`);
        this.showNotification('error', `Speed pairing failed: ${error.message}`);
    }
}

// ✅ FIXED CADENCE SOURCE PAIRING
async pairCadenceSource() {
    try {
        this.log('🔄 Pairing Cadence Source...');
        this.updateSensorCard('cadence', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['cycling_speed_and_cadence'] },  // ✅ FIXED - Standard service name
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'Garmin' },
                { namePrefix: 'Cadence' }
            ],
            optionalServices: ['cycling_speed_and_cadence', 'battery_service', 'device_information']
        });

        const server = await device.gatt.connect();
        const cscService = await server.getPrimaryService('cycling_speed_and_cadence');
        const cscChar = await cscService.getCharacteristic('csc_measurement');
        
        await cscChar.startNotifications();
        cscChar.addEventListener('characteristicvaluechanged', (event) => {
            this.handleCadenceData(event.target.value);
        });
        
        this.sensorConnections.cadenceSource = { device, server, service: cscService };
        this.updateSensorCard('cadence', 'connected', device.name);
        this.log(`✅ Cadence source paired: ${device.name}`);
        this.showNotification('success', `Cadence source paired: ${device.name}`);
        
    } catch (error) {
        this.updateSensorCard('cadence', 'error');
        this.log(`❌ Cadence pairing failed: ${error.message}`);
        this.showNotification('error', `Cadence pairing failed: ${error.message}`);
    }
}

// ✅ FIXED RESISTANCE PAIRING
async pairResistance() {
    try {
        this.log('🎚️ Pairing Controllable Trainer...');
        this.updateSensorCard('resistance', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['fitness_machine'] },  // ✅ FIXED - Standard service name
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'Tacx' },
                { namePrefix: 'Elite' }
            ],
            optionalServices: ['fitness_machine', 'battery_service', 'device_information']
        });

        const server = await device.gatt.connect();
        const fitnessService = await server.getPrimaryService('fitness_machine');
        const controlChar = await fitnessService.getCharacteristic('fitness_machine_control_point');
        
        this.sensorConnections.resistance = { 
            device, server, service: fitnessService, controlChar 
        };
        
        this.updateSensorCard('resistance', 'connected', device.name);
        this.log(`✅ Controllable trainer paired: ${device.name}`);
        this.showNotification('success', `Controllable trainer paired: ${device.name}`);
        
    } catch (error) {
        this.updateSensorCard('resistance', 'error');
        this.log(`❌ Resistance pairing failed: ${error.message}`);
        this.showNotification('error', `Resistance pairing failed: ${error.message}`);
    }
}

// ✅ COMPLETELY REWRITTEN ZWIFT CLICK PAIRING WITH PROPER HANDSHAKE LOGGING
async pairControls() {
    try {
        this.log('🎮 Pairing Controls (Zwift Click/Ride)...');
        this.updateSensorCard('controls', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'Zwift' },
                { namePrefix: 'Zwift Click' },
                { namePrefix: 'Zwift SF2' },
                { services: ['00000001-19ca-4651-86e5-fa29dcdd09d1'] }
            ],
            optionalServices: [
                '0000180a-0000-1000-8000-00805f9b34fb',
                '0000180f-0000-1000-8000-00805f9b34fb',
                '00000001-19ca-4651-86e5-fa29dcdd09d1'
            ]
        });

        this.log(`📱 Found device: ${device.name || 'Unknown'} (ID: ${device.id})`);
        
        const server = await device.gatt.connect();
        this.log('🔗 GATT server connected');
        
        const zwiftService = await server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
        this.log('📡 Zwift service acquired');
        
        // Get characteristics with detailed logging
        const measurementChar = await zwiftService.getCharacteristic('00000002-19ca-4651-86e5-fa29dcdd09d1');
        const controlPointChar = await zwiftService.getCharacteristic('00000003-19ca-4651-86e5-fa29dcdd09d1');
        const responseChar = await zwiftService.getCharacteristic('00000004-19ca-4651-86e5-fa29dcdd09d1');
        
        this.log('📋 All required characteristics found');
        
        // CRITICAL: Start response notifications BEFORE sending handshake
        this.log('👂 Starting response characteristic notifications...');
        await responseChar.startNotifications();
        this.log('✅ Response notifications active');
        
        // Set up detailed response handler
        responseChar.addEventListener('characteristicvaluechanged', (event) => {
            const data = new Uint8Array(event.target.value.buffer);
            const hexData = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
            this.log(`📥 RESPONSE: ${hexData} (${data.length} bytes)`);
            
            try {
                const textData = new TextDecoder().decode(event.target.value);
                this.log(`📜 Response as text: "${textData}"`);
                
                if (textData.includes('RideOn')) {
                    this.log('✅ ✅ ✅ RIDEON HANDSHAKE SUCCESSFUL! ✅ ✅ ✅');
                    this.startControlsNotifications(measurementChar);
                    return;
                }
            } catch (e) {
                this.log('📜 Response is not text data');
            }
            
            // Check for other response patterns
            if (data.length > 0) {
                this.log(`🔍 First byte: 0x${data[0].toString(16)}`);
                if (data[0] === 0x52 && data[1] === 0x69) { // "Ri" from RideOn
                    this.log('🔍 Detected RideOn prefix - this might be the response!');
                    this.startControlsNotifications(measurementChar);
                }
            }
        });
        
        // Try reading current value first
        try {
            this.log('📖 Reading current response value...');
            const currentResponse = await responseChar.readValue();
            if (currentResponse.byteLength > 0) {
                const currentData = new Uint8Array(currentResponse.buffer);
                const hexData = Array.from(currentData).map(b => b.toString(16).padStart(2, '0')).join(' ');
                this.log(`📖 Current response: ${hexData}`);
                
                // Trigger the event handler manually
                responseChar.dispatchEvent(new CustomEvent('characteristicvaluechanged', {
                    detail: { target: { value: currentResponse } }
                }));
            } else {
                this.log('📖 Current response is empty');
            }
        } catch (readError) {
            this.log(`⚠️ Could not read current response: ${readError.message}`);
        }
        
        // Send handshake with detailed logging
        this.log('🤝 🤝 🤝 INITIATING HANDSHAKE 🤝 🤝 🤝');
        
        const rideOnMessage = new TextEncoder().encode('RideOn');
        const hexHandshake = Array.from(rideOnMessage).map(b => b.toString(16).padStart(2, '0')).join(' ');
        this.log(`📤 Handshake data: ${hexHandshake} ("${new TextDecoder().decode(rideOnMessage)}")`);
        
        await controlPointChar.writeValue(rideOnMessage);
        this.log('📤 ✅ HANDSHAKE SENT - Waiting for response...');
        
        // Set up timeout to detect if no response comes
        let handshakeTimeout = setTimeout(() => {
            this.log('⏰ ⚠️ NO HANDSHAKE RESPONSE RECEIVED AFTER 10 SECONDS');
            this.log('🔍 This might mean:');
            this.log('  1. Device needs a different handshake format');
            this.log('  2. Device is encrypted and needs key exchange first');
            this.log('  3. Response is coming on measurement characteristic instead');
            this.log('🚀 Starting notifications anyway to monitor for data...');
            this.startControlsNotifications(measurementChar);
        }, 10000);
        
        // Store connection
        this.sensorConnections.controls = { 
            device, server, service: zwiftService,
            measurementChar, controlPointChar, responseChar,
            handshakeTimeout
        };
        
        this.updateSensorCard('controls', 'connected', device.name);
        this.log(`✅ Controls paired: ${device.name}`);
        this.showNotification('success', `Controls paired: ${device.name}`);
        
    } catch (error) {
        this.updateSensorCard('controls', 'error');
        this.log(`❌ Controls pairing failed: ${error.message}`);
        this.log(`🔍 Error stack: ${error.stack}`);
        this.showNotification('error', `Controls pairing failed: ${error.message}`);
    }
}

// Enhanced start notifications method
async startControlsNotifications(measurementChar) {
    try {
        // Clear timeout if handshake succeeded
        if (this.sensorConnections.controls?.handshakeTimeout) {
            clearTimeout(this.sensorConnections.controls.handshakeTimeout);
            this.log('⏰ Handshake timeout cleared - response received!');
        }
        
        this.log('👂 Starting measurement characteristic notifications...');
        await measurementChar.startNotifications();
        
        measurementChar.addEventListener('characteristicvaluechanged', (event) => {
            const data = new Uint8Array(event.target.value.buffer);
            const hexData = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
            const timestamp = new Date().toLocaleTimeString();
            
            this.log(`🎮 [${timestamp}] BUTTON DATA: ${hexData} (${data.length} bytes)`);
            
            if (data.length === 0) {
                this.log('⚠️ Empty button data');
                return;
            }
            
            // Enhanced button detection
            this.log(`🔍 Message ID: 0x${data[0].toString(16)}`);
            
            if (data[0] === 0x23) {
                this.log('🎯 🎯 🎯 BUTTON PRESS DETECTED! 🎯 🎯 🎯');
                
                if (data.length >= 5) {
                    const buttonBitmap = data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
                    this.log(`🎮 Button bitmap: 0x${buttonBitmap.toString(16)}`);
                    
                    const upPressed = !(buttonBitmap & 0x01);
                    const downPressed = !(buttonBitmap & 0x02);
                    
                    if (upPressed) {
                        this.log('📈 📈 📈 UP BUTTON PRESSED! 📈 📈 📈');
                        this.gearUp();
                    }
                    
                    if (downPressed) {
                        this.log('📉 📉 📉 DOWN BUTTON PRESSED! 📉 📉 📉');
                        this.gearDown();
                    }
                } else {
                    this.log('⚠️ Button message too short');
                }
            } else if (data[0] === 0x19 || data[0] === 0x15) {
                this.log(`🔄 Keepalive: 0x${data[0].toString(16)}`);
            } else {
                this.log(`❓ Unknown message: 0x${data[0].toString(16)}`);
            }
        });
        
        this.log('✅ ✅ ✅ CONTROLS MONITORING ACTIVE! ✅ ✅ ✅');
        this.log('🎮 Press buttons on your Zwift Click to test...');
        
    } catch (error) {
        this.log(`❌ Failed to start controls notifications: ${error.message}`);
    }
}
