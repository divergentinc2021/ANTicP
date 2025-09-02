// Working Sensor Connection Module - Based on index.html working code
class WorkingSensorManager {
    constructor() {
        this.connections = {
            trainer: null,
            zwiftClick: null,
            heartRate: null
        };
        
        this.metrics = {
            power: 0,
            cadence: 0,
            speed: 0,
            heartRate: 0,
            resistance: 0
        };
        
        this.buttonState = {
            lastMessageTime: 0,
            lastDownReleaseTime: 0,
            debugMode: false
        };
        
        this.callbacks = {
            onPowerUpdate: null,
            onCadenceUpdate: null,
            onHeartRateUpdate: null,
            onSpeedUpdate: null,
            onButtonPress: null
        };
        
        this.currentZone = 1;
        this.autoMode = false;
    }
    
    // ============================================================================
    // KICKR CORE CONNECTION - From working index.html
    // ============================================================================
    
    async connectTrainer() {
        try {
            console.log('🚴 Connecting to KICKR Core...');
            
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'KICKR' },
                    { namePrefix: 'WAHOO' }
                ],
                optionalServices: [
                    '00001826-0000-1000-8000-00805f9b34fb',  // FTMS
                    '00001818-0000-1000-8000-00805f9b34fb',  // Cycling Power
                    '0000180d-0000-1000-8000-00805f9b34fb'   // Heart Rate
                ]
            });

            const server = await device.gatt.connect();
            
            // Try FTMS first
            let service;
            let dataChar;
            let controlChar;
            
            try {
                service = await server.getPrimaryService('00001826-0000-1000-8000-00805f9b34fb');
                dataChar = await service.getCharacteristic('00002ad2-0000-1000-8000-00805f9b34fb');
                
                // Try to get control characteristic for resistance
                try {
                    controlChar = await service.getCharacteristic('00002ad9-0000-1000-8000-00805f9b34fb');
                } catch (e) {
                    console.log('Control characteristic not available');
                }
                
                console.log('✅ Using FTMS service');
            } catch (e) {
                // Fallback to Cycling Power
                service = await server.getPrimaryService('00001818-0000-1000-8000-00805f9b34fb');
                dataChar = await service.getCharacteristic('00002a63-0000-1000-8000-00805f9b34fb');
                console.log('✅ Using Cycling Power service');
            }
            
            // Start notifications
            await dataChar.startNotifications();
            dataChar.addEventListener('characteristicvaluechanged', (event) => {
                this.handleTrainerData(event.target.value);
            });
            
            this.connections.trainer = { 
                device, 
                server, 
                service, 
                dataChar,
                controlChar 
            };
            
            console.log('✅ KICKR Core connected');
            return true;
            
        } catch (error) {
            console.error('❌ Trainer connection failed:', error);
            throw error;
        }
    }
    
    handleTrainerData(value) {
        const data = new Uint8Array(value.buffer);
        
        // Parse FTMS Indoor Bike Data
        const flags = data[0] | (data[1] << 8);
        let index = 2;
        
        // Speed (if present)
        if (!(flags & 0x0001)) {
            if (index + 1 < data.length) {
                const speedRaw = data[index] | (data[index + 1] << 8);
                this.metrics.speed = Math.round(speedRaw * 0.01 * 10) / 10; // km/h
                if (this.callbacks.onSpeedUpdate) {
                    this.callbacks.onSpeedUpdate(this.metrics.speed);
                }
                index += 2;
            }
        }
        
        // Skip average speed if present
        if (flags & 0x0002) index += 2;
        
        // Cadence
        if (flags & 0x0004) {
            if (index + 1 < data.length) {
                const cadenceRaw = data[index] | (data[index + 1] << 8);
                this.metrics.cadence = Math.round(cadenceRaw * 0.5);
                if (this.callbacks.onCadenceUpdate) {
                    this.callbacks.onCadenceUpdate(this.metrics.cadence);
                }
                index += 2;
            }
        }
        
        // Skip to power if present
        if (flags & 0x0008) index += 2; // Average cadence
        if (flags & 0x0010) index += 3; // Distance
        if (flags & 0x0020) index += 1; // Resistance
        
        // Power
        if (flags & 0x0040) {
            if (index + 1 < data.length) {
                const powerRaw = data[index] | (data[index + 1] << 8);
                this.metrics.power = powerRaw;
                if (this.callbacks.onPowerUpdate) {
                    this.callbacks.onPowerUpdate(this.metrics.power);
                }
            }
        }
    }
    
    // ============================================================================
    // ZWIFT CLICK CONNECTION - From working index.html
    // ============================================================================
    
    async connectZwiftClick() {
        try {
            console.log('🎮 Connecting to Zwift Click...');
            
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'CLICK' }
                ],
                optionalServices: [
                    '00000001-19ca-4651-86e5-fa29dcdd09d1',
                    '0000180f-0000-1000-8000-00805f9b34fb'
                ]
            });

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('00000001-19ca-4651-86e5-fa29dcdd09d1');
            
            // Get characteristics
            const measurementChar = await service.getCharacteristic('00000002-19ca-4651-86e5-fa29dcdd09d1');
            const controlChar = await service.getCharacteristic('00000003-19ca-4651-86e5-fa29dcdd09d1');
            const responseChar = await service.getCharacteristic('00000004-19ca-4651-86e5-fa29dcdd09d1');
            
            // Setup notifications
            await measurementChar.startNotifications();
            measurementChar.addEventListener('characteristicvaluechanged', (event) => {
                this.handleZwiftClickData(event.target.value);
            });
            
            await responseChar.startNotifications();
            
            // Send handshake
            const handshake = new TextEncoder().encode('RideOn');
            await controlChar.writeValueWithoutResponse(handshake);
            
            this.connections.zwiftClick = { device, server, service };
            
            console.log('✅ Zwift Click connected - Buttons ready!');
            return true;
            
        } catch (error) {
            console.error('❌ Zwift Click connection failed:', error);
            throw error;
        }
    }
    
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
                
                if (this.callbacks.onButtonPress) {
                    this.callbacks.onButtonPress('up');
                }
                console.log('🎮 UP button pressed');
            }
            
            // SPECIAL HANDLING: DOWN button on RELEASE
            // Your Zwift Click DOWN button only sends RELEASE events
            // but no PRESS events, so we detect it on the first RELEASE
            if (stateByte === 0x01 && buttonId === 0x00) {
                // Initialize if needed
                if (!this.buttonState.lastDownReleaseTime) {
                    this.buttonState.lastDownReleaseTime = 0;
                }
                
                // Check if this is a new button press (500ms gap)
                if (currentTime - this.buttonState.lastDownReleaseTime > 500) {
                    // Trigger DOWN button action
                    if (this.callbacks.onButtonPress) {
                        this.callbacks.onButtonPress('down');
                    }
                    console.log('🎮 DOWN button detected (via release)');
                }
                this.buttonState.lastDownReleaseTime = currentTime;
            }
        } else if (data.length === 3 && data[0] === 0x19) {
            // Keepalive message - ignore
            return;
        }
    }
    
    // ============================================================================
    // HEART RATE CONNECTION - From working index.html
    // ============================================================================
    
    async connectHeartRate() {
        try {
            console.log('❤️ Connecting to Heart Rate Monitor...');
            
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['0000180d-0000-1000-8000-00805f9b34fb'] }]
            });

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('0000180d-0000-1000-8000-00805f9b34fb');
            const characteristic = await service.getCharacteristic('00002a37-0000-1000-8000-00805f9b34fb');
            
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                const value = event.target.value;
                const hr = value.getUint8(1);
                this.metrics.heartRate = hr;
                if (this.callbacks.onHeartRateUpdate) {
                    this.callbacks.onHeartRateUpdate(hr);
                }
            });

            this.connections.heartRate = { device, server, service };
            
            console.log('✅ Heart Rate Monitor connected');
            return true;
            
        } catch (error) {
            console.error('❌ HR connection failed:', error);
            throw error;
        }
    }
    
    // ============================================================================
    // RESISTANCE CONTROL - From working index.html
    // ============================================================================
    
    async setResistance(value) {
        // Ensure value is within valid range (0-100%)
        value = Math.max(0, Math.min(100, value));
        
        this.metrics.resistance = value;
        
        if (this.connections.trainer?.controlChar) {
            try {
                // FTMS Set Target Resistance command
                const command = new Uint8Array([0x04, value]);
                await this.connections.trainer.controlChar.writeValue(command);
                console.log(`🎚️ Resistance set to ${value}%`);
            } catch (error) {
                console.log(`❌ Failed to set resistance: ${error.message}`);
            }
        }
    }
    
    // ============================================================================
    // UTILITY METHODS
    // ============================================================================
    
    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }
    
    isConnected(sensor) {
        switch(sensor) {
            case 'trainer':
                return this.connections.trainer && this.connections.trainer.server.connected;
            case 'zwiftClick':
                return this.connections.zwiftClick && this.connections.zwiftClick.server.connected;
            case 'heartRate':
                return this.connections.heartRate && this.connections.heartRate.server.connected;
            default:
                return false;
        }
    }
    
    disconnect(sensor) {
        if (this.connections[sensor] && this.connections[sensor].server) {
            this.connections[sensor].server.disconnect();
            this.connections[sensor] = null;
            console.log(`Disconnected ${sensor}`);
        }
    }
    
    disconnectAll() {
        Object.keys(this.connections).forEach(sensor => {
            this.disconnect(sensor);
        });
    }
    
    getMetrics() {
        return { ...this.metrics };
    }
}

// Export for use
window.WorkingSensorManager = WorkingSensorManager;