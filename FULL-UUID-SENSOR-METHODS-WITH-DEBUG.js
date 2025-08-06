// ============================================================================
// FINAL FIX: FULL BLUETOOTH UUIDS + ZWIFT CLICK HANDSHAKE DEBUGGING
// Use FULL UUIDs instead of standard names for maximum compatibility
// ============================================================================

// ✅ POWER SOURCE - Using FULL UUID for Cycling Power Service
async pairPowerSource() {
    try {
        this.log('⚡ Pairing Power Source...');
        this.updateSensorCard('power', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['00001818-0000-1000-8000-00805f9b34fb'] },  // ✅ FULL UUID for Cycling Power
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'Stages' },
                { namePrefix: 'Quarq' }
            ],
            optionalServices: [
                '00001818-0000-1000-8000-00805f9b34fb', // Cycling Power
                '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
                '0000180a-0000-1000-8000-00805f9b34fb'  // Device Information
            ]
        });

        const server = await device.gatt.connect();
        const powerService = await server.getPrimaryService('00001818-0000-1000-8000-00805f9b34fb');
        const powerChar = await powerService.getCharacteristic('00002a63-0000-1000-8000-00805f9b34fb'); // Cycling Power Measurement
        
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

// ✅ SPEED SOURCE - Using FULL UUID for Cycling Speed and Cadence Service
async pairSpeedSource() {
    try {
        this.log('🚴 Pairing Speed Source...');
        this.updateSensorCard('speed', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['00001816-0000-1000-8000-00805f9b34fb'] },  // ✅ FULL UUID for CSC
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'Garmin' },
                { namePrefix: 'Speed' }
            ],
            optionalServices: [
                '00001816-0000-1000-8000-00805f9b34fb', // Cycling Speed and Cadence
                '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
                '0000180a-0000-1000-8000-00805f9b34fb'  // Device Information
            ]
        });

        const server = await device.gatt.connect();
        const cscService = await server.getPrimaryService('00001816-0000-1000-8000-00805f9b34fb');
        const cscChar = await cscService.getCharacteristic('00002a5b-0000-1000-8000-00805f9b34fb'); // CSC Measurement
        
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

// ✅ CADENCE SOURCE - Using FULL UUID for Cycling Speed and Cadence Service
async pairCadenceSource() {
    try {
        this.log('🔄 Pairing Cadence Source...');
        this.updateSensorCard('cadence', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['00001816-0000-1000-8000-00805f9b34fb'] },  // ✅ FULL UUID for CSC
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'Garmin' },
                { namePrefix: 'Cadence' }
            ],
            optionalServices: [
                '00001816-0000-1000-8000-00805f9b34fb', // Cycling Speed and Cadence
                '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
                '0000180a-0000-1000-8000-00805f9b34fb'  // Device Information
            ]
        });

        const server = await device.gatt.connect();
        const cscService = await server.getPrimaryService('00001816-0000-1000-8000-00805f9b34fb');
        const cscChar = await cscService.getCharacteristic('00002a5b-0000-1000-8000-00805f9b34fb'); // CSC Measurement
        
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

// ✅ RESISTANCE - Using FULL UUID for Fitness Machine Service
async pairResistance() {
    try {
        this.log('🎚️ Pairing Controllable Trainer...');
        this.updateSensorCard('resistance', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['00001826-0000-1000-8000-00805f9b34fb'] },  // ✅ FULL UUID for Fitness Machine
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'Tacx' },
                { namePrefix: 'Elite' }
            ],
            optionalServices: [
                '00001826-0000-1000-8000-00805f9b34fb', // Fitness Machine
                '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
                '0000180a-0000-1000-8000-00805f9b34fb'  // Device Information
            ]
        });

        const server = await device.gatt.connect();
        const fitnessService = await server.getPrimaryService('00001826-0000-1000-8000-00805f9b34fb');
        const controlChar = await fitnessService.getCharacteristic('00002ad9-0000-1000-8000-00805f9b34fb'); // Fitness Machine Control Point
        
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

// ✅ HEART RATE - Already correct but included for completeness
async pairHeartRate() {
    try {
        this.log('❤️ Pairing Heart Rate Monitor...');
        this.updateSensorCard('hr', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['heart_rate'] }],  // Standard name works for heart rate
            optionalServices: ['battery_service']
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const characteristic = await service.getCharacteristic('heart_rate_measurement');
        
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            this.handleHeartRateData(event.target.value);
        });

        this.sensorConnections.heartRate = { device, server, service };
        this.updateSensorCard('hr', 'connected', device.name);
        this.log(`✅ Heart rate monitor paired: ${device.name}`);
        this.showNotification('success', `Heart rate monitor paired: ${device.name}`);

    } catch (error) {
        this.updateSensorCard('hr', 'error');
        this.log(`❌ Heart rate pairing failed: ${error.message}`);
        this.showNotification('error', `Heart rate pairing failed: ${error.message}`);
    }
}

// ✅ ZWIFT CLICK - COMPLETELY REWRITTEN WITH EXTENSIVE HANDSHAKE DEBUGGING
async pairControls() {
    try {
        this.log('🎮 🎮 🎮 PAIRING ZWIFT CLICK WITH FULL DEBUGGING 🎮 🎮 🎮');
        this.updateSensorCard('controls', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'Zwift' },
                { namePrefix: 'Zwift Click' },
                { namePrefix: 'Zwift SF2' },
                { services: ['00000001-19ca-4651-86e5-fa29dcdd09d1'] }
            ],
            optionalServices: [
                '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
                '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
                '00000001-19ca-4651-86e5-fa29dcdd09d1'  // Zwift Service
            ]
        });

        this.log(`📱 📱 📱 FOUND DEVICE: ${device.name || 'Unknown'} (ID: ${device.id}) 📱 📱 📱`);
        
        const server = await device.gatt.connect();
        this.log('🔗 🔗 🔗 GATT SERVER CONNECTED 🔗 🔗 🔗');
        
        const zwiftService = await server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
        this.log('📡 📡 📡 ZWIFT SERVICE ACQUIRED 📡 📡 📡');
        
        // Get characteristics with detailed logging
        const measurementChar = await zwiftService.getCharacteristic('00000002-19ca-4651-86e5-fa29dcdd09d1');
        const controlPointChar = await zwiftService.getCharacteristic('00000003-19ca-4651-86e5-fa29dcdd09d1');
        const responseChar = await zwiftService.getCharacteristic('00000004-19ca-4651-86e5-fa29dcdd09d1');
        
        this.log('📋 📋 📋 ALL CHARACTERISTICS FOUND 📋 📋 📋');
        this.log(`  📊 Measurement: ${measurementChar.uuid}`);
        this.log(`  📝 Control Point: ${controlPointChar.uuid}`);
        this.log(`  📥 Response: ${responseChar.uuid}`);
        
        // STEP 1: Start response notifications FIRST
        this.log('👂 👂 👂 STARTING RESPONSE NOTIFICATIONS 👂 👂 👂');
        await responseChar.startNotifications();
        this.log('✅ ✅ ✅ RESPONSE NOTIFICATIONS ACTIVE ✅ ✅ ✅');
        
        // Set up response handler with maximum debugging
        let handshakeReceived = false;
        responseChar.addEventListener('characteristicvaluechanged', (event) => {
            const data = new Uint8Array(event.target.value.buffer);
            const hexData = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
            this.log(`📥 📥 📥 RESPONSE RECEIVED: ${hexData} (${data.length} bytes) 📥 📥 📥`);
            
            try {
                const textData = new TextDecoder().decode(event.target.value);
                this.log(`📜 📜 📜 RESPONSE AS TEXT: "${textData}" 📜 📜 📜`);
                
                if (textData.includes('RideOn')) {
                    this.log('🎉 🎉 🎉 RIDEON HANDSHAKE SUCCESSFUL! 🎉 🎉 🎉');
                    handshakeReceived = true;
                    this.startControlsNotificationsDebug(measurementChar);
                    return;
                }
            } catch (e) {
                this.log('📜 Response is not valid text - checking hex patterns');
            }
            
            // Check for RideOn in hex (52 69 64 65 4f 6e = "RideOn")
            if (data.length >= 6 && 
                data[0] === 0x52 && data[1] === 0x69 && data[2] === 0x64 && 
                data[3] === 0x65 && data[4] === 0x4f && data[5] === 0x6e) {
                this.log('🎉 🎉 🎉 RIDEON DETECTED IN HEX FORMAT! 🎉 🎉 🎉');
                handshakeReceived = true;
                this.startControlsNotificationsDebug(measurementChar);
                return;
            }
            
            // Log any other response for analysis
            if (data.length > 0) {
                this.log(`🔍 Unknown response - First bytes: ${hexData.substring(0, 17)}...`);
            }
        });
        
        // STEP 2: Try reading current response value
        this.log('📖 📖 📖 READING CURRENT RESPONSE VALUE 📖 📖 📖');
        try {
            const currentResponse = await responseChar.readValue();
            if (currentResponse.byteLength > 0) {
                const currentData = new Uint8Array(currentResponse.buffer);
                const hexData = Array.from(currentData).map(b => b.toString(16).padStart(2, '0')).join(' ');
                this.log(`📖 Current response value: ${hexData}`);
                
                // Process the current value
                const event = { target: { value: currentResponse } };
                responseChar.dispatchEvent(new CustomEvent('characteristicvaluechanged', { detail: event }));
            } else {
                this.log('📖 Current response is empty - proceeding with handshake');
            }
        } catch (readError) {
            this.log(`⚠️ Could not read current response: ${readError.message}`);
        }
        
        // STEP 3: Send handshake
        this.log('🤝 🤝 🤝 SENDING HANDSHAKE 🤝 🤝 🤝');
        
        const rideOnMessage = new TextEncoder().encode('RideOn');
        const hexHandshake = Array.from(rideOnMessage).map(b => b.toString(16).padStart(2, '0')).join(' ');
        this.log(`📤 Handshake bytes: ${hexHandshake} = "${new TextDecoder().decode(rideOnMessage)}"`);
        
        await controlPointChar.writeValue(rideOnMessage);
        this.log('📤 ✅ ✅ ✅ HANDSHAKE WRITTEN TO CONTROL POINT ✅ ✅ ✅');
        
        // STEP 4: Set up timeout to detect no response
        setTimeout(() => {
            if (!handshakeReceived) {
                this.log('⏰ ⏰ ⏰ NO HANDSHAKE RESPONSE AFTER 15 SECONDS ⏰ ⏰ ⏰');
                this.log('🔍 🔍 🔍 DIAGNOSTIC INFORMATION 🔍 🔍 🔍');
                this.log(`  Device: ${device.name || 'Unknown'}`);
                this.log(`  Connected: ${device.gatt?.connected || 'Unknown'}`);
                this.log(`  Service UUID: 00000001-19ca-4651-86e5-fa29dcdd09d1`);
                this.log(`  Control Point UUID: 00000003-19ca-4651-86e5-fa29dcdd09d1`);
                this.log(`  Response UUID: 00000004-19ca-4651-86e5-fa29dcdd09d1`);
                this.log('🚀 Starting button monitoring anyway - device might not need handshake...');
                this.startControlsNotificationsDebug(measurementChar);
            }
        }, 15000);
        
        // Store connection
        this.sensorConnections.controls = { 
            device, server, service: zwiftService,
            measurementChar, controlPointChar, responseChar
        };
        
        this.updateSensorCard('controls', 'connected', device.name);
        this.log(`✅ ✅ ✅ CONTROLS PAIRED: ${device.name} ✅ ✅ ✅`);
        this.showNotification('success', `Controls paired: ${device.name}`);
        
    } catch (error) {
        this.updateSensorCard('controls', 'error');
        this.log(`❌ ❌ ❌ CONTROLS PAIRING FAILED: ${error.message} ❌ ❌ ❌`);
        this.log(`🔍 Error stack: ${error.stack}`);
        this.showNotification('error', `Controls pairing failed: ${error.message}`);
    }
}

// Enhanced notification start with maximum debugging
async startControlsNotificationsDebug(measurementChar) {
    try {
        this.log('👂 👂 👂 STARTING MEASUREMENT NOTIFICATIONS 👂 👂 👂');
        await measurementChar.startNotifications();
        this.log('✅ ✅ ✅ MEASUREMENT NOTIFICATIONS ACTIVE ✅ ✅ ✅');
        
        measurementChar.addEventListener('characteristicvaluechanged', (event) => {
            const data = new Uint8Array(event.target.value.buffer);
            const hexData = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
            const timestamp = new Date().toLocaleTimeString();
            
            this.log(`🎮 🎮 🎮 [${timestamp}] BUTTON DATA: ${hexData} (${data.length} bytes) 🎮 🎮 🎮`);
            
            if (data.length === 0) {
                this.log('⚠️ Empty button data received');
                return;
            }
            
            this.log(`🔍 Message ID: 0x${data[0].toString(16).padStart(2, '0')} (${data[0]})`);
            
            if (data[0] === 0x23) {
                this.log('🎯 🎯 🎯 PROTOCOL BUFFER BUTTON PRESS DETECTED! 🎯 🎯 🎯');
                
                if (data.length >= 5) {
                    const buttonBitmap = data[1] | (data[2] << 8) | (data[3] << 16) | (data[4] << 24);
                    this.log(`🎮 Button bitmap: 0x${buttonBitmap.toString(16).padStart(8, '0')} (${buttonBitmap})`);
                    
                    // Detailed bit analysis
                    this.log(`🔍 Bit analysis:`);
                    this.log(`  Bit 0 (up): ${(buttonBitmap & 0x01) ? '1' : '0'} -> ${!(buttonBitmap & 0x01) ? 'PRESSED' : 'not pressed'}`);
                    this.log(`  Bit 1 (down): ${(buttonBitmap & 0x02) ? '1' : '0'} -> ${!(buttonBitmap & 0x02) ? 'PRESSED' : 'not pressed'}`);
                    
                    const upPressed = !(buttonBitmap & 0x01);
                    const downPressed = !(buttonBitmap & 0x02);
                    
                    if (upPressed) {
                        this.log('📈 📈 📈 UP BUTTON PRESSED - TRIGGERING GEAR UP! 📈 📈 📈');
                        this.gearUp();
                    }
                    
                    if (downPressed) {
                        this.log('📉 📉 📉 DOWN BUTTON PRESSED - TRIGGERING GEAR DOWN! 📉 📉 📉');
                        this.gearDown();
                    }
                    
                    if (!upPressed && !downPressed) {
                        this.log('🎮 Buttons released or other buttons active');
                    }
                } else {
                    this.log('⚠️ Button message too short for bitmap analysis');
                }
            } else if (data[0] === 0x19 || data[0] === 0x15) {
                this.log(`🔄 Keepalive message: 0x${data[0].toString(16)}`);
            } else {
                this.log(`❓ Unknown message type: 0x${data[0].toString(16)} - Full data: ${hexData}`);
            }
        });
        
        this.log('🎮 🎮 🎮 ZWIFT CLICK MONITORING FULLY ACTIVE! 🎮 🎮 🎮');
        this.log('👆 👆 👆 PRESS BUTTONS ON YOUR ZWIFT CLICK TO TEST! 👆 👆 👆');
        
    } catch (error) {
        this.log(`❌ ❌ ❌ FAILED TO START CONTROLS NOTIFICATIONS: ${error.message} ❌ ❌ ❌`);
    }
}
