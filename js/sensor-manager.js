// Sensor Manager for Bluetooth Devices
class SensorManager {
    constructor() {
        this.devices = {
            kickr: null,
            zwiftClick: null,
            heartRate: null
        };
        
        this.characteristics = {
            kickr: null,
            zwiftClick: null,
            heartRate: null
        };
        
        this.data = {
            power: 0,
            cadence: 0,
            speed: 0,
            heartRate: 0,
            resistance: 0,
            currentGear: 1
        };
        
        this.callbacks = {
            onPowerUpdate: null,
            onCadenceUpdate: null,
            onSpeedUpdate: null,
            onHeartRateUpdate: null,
            onGearChange: null
        };
        
        this.isConnected = {
            kickr: false,
            zwiftClick: false,
            heartRate: false
        };
    }

    // KICKR Core Connection
    async connectKickr() {
        try {
            console.log('Connecting to KICKR Core...');
            
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: ['cycling_power'] },
                    { services: ['fitness_machine'] },
                    { namePrefix: 'KICKR' }
                ],
                optionalServices: [
                    'cycling_power',
                    'fitness_machine',
                    'cycling_speed_and_cadence',
                    0x1818, // Cycling Power Service
                    0x1826, // Fitness Machine Service
                    0x1816  // Cycling Speed and Cadence
                ]
            });

            this.devices.kickr = device;
            const server = await device.gatt.connect();
            
            // Try to get Fitness Machine Service (FTMS)
            try {
                const ftmsService = await server.getPrimaryService(0x1826);
                const indoorBikeChar = await ftmsService.getCharacteristic(0x2ad2);
                
                await indoorBikeChar.startNotifications();
                indoorBikeChar.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleKickrData(event.target.value);
                });
                
                this.characteristics.kickr = indoorBikeChar;
                
                // Get control point for resistance
                const controlPoint = await ftmsService.getCharacteristic(0x2ad9);
                this.characteristics.kickrControl = controlPoint;
                
            } catch (ftmsError) {
                console.log('FTMS not available, trying Cycling Power Service...');
                
                // Fallback to Cycling Power Service
                const powerService = await server.getPrimaryService(0x1818);
                const powerMeasurement = await powerService.getCharacteristic(0x2a63);
                
                await powerMeasurement.startNotifications();
                powerMeasurement.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleCyclingPowerData(event.target.value);
                });
                
                this.characteristics.kickr = powerMeasurement;
            }
            
            this.isConnected.kickr = true;
            console.log('KICKR Core connected successfully');
            
            device.addEventListener('gattserverdisconnected', () => {
                console.log('KICKR Core disconnected');
                this.isConnected.kickr = false;
            });
            
            return true;
            
        } catch (error) {
            console.error('Failed to connect to KICKR Core:', error);
            throw error;
        }
    }

    // Handle KICKR FTMS Data
    handleKickrData(value) {
        const data = new DataView(value.buffer);
        const flags = data.getUint16(0, true);
        let index = 2;
        
        // Instantaneous Speed
        if (flags & 0x0001) {
            const speed = data.getUint16(index, true) / 100;
            this.data.speed = speed;
            index += 2;
        }
        
        // Average Speed
        if (flags & 0x0002) {
            index += 2; // Skip average speed
        }
        
        // Instantaneous Cadence
        if (flags & 0x0004) {
            const cadence = data.getUint16(index, true) / 2;
            this.data.cadence = Math.round(cadence);
            index += 2;
        }
        
        // Average Cadence
        if (flags & 0x0008) {
            index += 2; // Skip average cadence
        }
        
        // Total Distance
        if (flags & 0x0010) {
            index += 3; // Skip total distance (24 bits)
        }
        
        // Resistance Level
        if (flags & 0x0020) {
            const resistance = data.getInt16(index, true);
            this.data.resistance = resistance;
            index += 2;
        }
        
        // Instantaneous Power
        if (flags & 0x0040) {
            const power = data.getInt16(index, true);
            this.data.power = power;
            index += 2;
        }
        
        // Trigger callbacks
        if (this.callbacks.onPowerUpdate) {
            this.callbacks.onPowerUpdate(this.data.power);
        }
        if (this.callbacks.onCadenceUpdate) {
            this.callbacks.onCadenceUpdate(this.data.cadence);
        }
        if (this.callbacks.onSpeedUpdate) {
            this.callbacks.onSpeedUpdate(this.data.speed);
        }
    }

    // Handle Cycling Power Data
    handleCyclingPowerData(value) {
        const data = new DataView(value.buffer);
        const flags = data.getUint16(0, true);
        const power = data.getInt16(2, true);
        
        this.data.power = power;
        
        // Check for cadence data
        if (flags & 0x0010) {
            // Wheel revolution data present
            const wheelRevs = data.getUint32(4, true);
            const wheelTime = data.getUint16(8, true);
        }
        
        if (flags & 0x0020) {
            // Crank revolution data present
            const crankRevs = data.getUint16(flags & 0x0010 ? 10 : 4, true);
            const crankTime = data.getUint16(flags & 0x0010 ? 12 : 6, true);
            
            // Calculate cadence from crank revolutions
            if (this.lastCrankTime) {
                const timeDiff = (crankTime - this.lastCrankTime) & 0xFFFF;
                const revDiff = crankRevs - this.lastCrankRevs;
                
                if (timeDiff > 0) {
                    this.data.cadence = Math.round((revDiff * 60 * 1024) / timeDiff);
                }
            }
            
            this.lastCrankRevs = crankRevs;
            this.lastCrankTime = crankTime;
        }
        
        if (this.callbacks.onPowerUpdate) {
            this.callbacks.onPowerUpdate(this.data.power);
        }
        if (this.callbacks.onCadenceUpdate) {
            this.callbacks.onCadenceUpdate(this.data.cadence);
        }
    }

    // Set KICKR Resistance
    async setResistance(resistanceLevel) {
        if (!this.characteristics.kickrControl) {
            console.error('KICKR control point not available');
            return;
        }
        
        try {
            // FTMS Set Target Resistance Level command
            // Op Code: 0x04, Resistance Level: signed 16-bit
            const command = new Uint8Array(3);
            command[0] = 0x04; // Set Target Resistance Level
            
            // Convert resistance to little-endian 16-bit signed integer
            const resistance = Math.max(-100, Math.min(100, resistanceLevel));
            const resValue = Math.round(resistance * 10); // FTMS uses 0.1% units
            
            command[1] = resValue & 0xFF;
            command[2] = (resValue >> 8) & 0xFF;
            
            await this.characteristics.kickrControl.writeValue(command);
            console.log(`Resistance set to ${resistanceLevel}%`);
            
        } catch (error) {
            console.error('Failed to set resistance:', error);
        }
    }

    // Zwift Click Connection
    async connectZwiftClick() {
        try {
            console.log('Connecting to Zwift Click...');
            
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'ZWIFT CLICK' },
                    { services: ['device_information'] }
                ],
                optionalServices: [
                    0x1812, // HID Service
                    0x180a, // Device Information
                    0x180f, // Battery Service
                    '00001818-0000-1000-8000-00805f9b34fb', // Generic Access
                    '00001523-1212-efde-1523-785feabcd123'  // Custom Zwift Service
                ]
            });

            this.devices.zwiftClick = device;
            const server = await device.gatt.connect();
            
            // Try to get notifications for button presses
            try {
                // Try HID Service
                const hidService = await server.getPrimaryService(0x1812);
                const reportChar = await hidService.getCharacteristic(0x2a4d);
                
                await reportChar.startNotifications();
                reportChar.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleZwiftClickButton(event.target.value);
                });
                
                this.characteristics.zwiftClick = reportChar;
                
            } catch (hidError) {
                console.log('HID service not available, trying custom service...');
                
                // Try custom Zwift service
                const customService = await server.getPrimaryService('00001523-1212-efde-1523-785feabcd123');
                const customChar = await customService.getCharacteristic('00001524-1212-efde-1523-785feabcd123');
                
                await customChar.startNotifications();
                customChar.addEventListener('characteristicvaluechanged', (event) => {
                    this.handleZwiftClickButton(event.target.value);
                });
                
                this.characteristics.zwiftClick = customChar;
            }
            
            // Get battery level
            try {
                const batteryService = await server.getPrimaryService(0x180f);
                const batteryChar = await batteryService.getCharacteristic(0x2a19);
                const batteryValue = await batteryChar.readValue();
                this.data.battery = batteryValue.getUint8(0);
            } catch (batteryError) {
                console.log('Battery service not available');
            }
            
            this.isConnected.zwiftClick = true;
            console.log('Zwift Click connected successfully');
            
            device.addEventListener('gattserverdisconnected', () => {
                console.log('Zwift Click disconnected');
                this.isConnected.zwiftClick = false;
            });
            
            return true;
            
        } catch (error) {
            console.error('Failed to connect to Zwift Click:', error);
            throw error;
        }
    }

    // Handle Zwift Click Button Presses
    handleZwiftClickButton(value) {
        const data = new Uint8Array(value.buffer);
        
        // Analyze button press pattern
        // Up button typically: 0x01 or specific pattern
        // Down button typically: 0x02 or specific pattern
        
        let buttonPressed = null;
        
        // Check various byte positions for button indicators
        for (let i = 0; i < data.length; i++) {
            if (data[i] === 0x01 || data[i] === 0x10) {
                buttonPressed = 'up';
                break;
            } else if (data[i] === 0x02 || data[i] === 0x20) {
                buttonPressed = 'down';
                break;
            }
        }
        
        if (buttonPressed === 'up' && this.data.currentGear < 8) {
            this.data.currentGear++;
            this.handleGearChange();
        } else if (buttonPressed === 'down' && this.data.currentGear > 1) {
            this.data.currentGear--;
            this.handleGearChange();
        }
        
        console.log('Zwift Click button:', buttonPressed, 'Current gear:', this.data.currentGear);
    }

    // Handle gear change
    handleGearChange() {
        // Gear to resistance mapping
        const gearResistance = {
            1: -5,
            2: 0,
            3: 5,
            4: 10,
            5: 15,
            6: 20,
            7: 25,
            8: 30
        };
        
        const resistance = gearResistance[this.data.currentGear];
        
        // Set resistance on KICKR
        if (this.isConnected.kickr) {
            this.setResistance(resistance);
        }
        
        // Trigger callback
        if (this.callbacks.onGearChange) {
            this.callbacks.onGearChange(this.data.currentGear, resistance);
        }
    }

    // Heart Rate Connection
    async connectHeartRate() {
        try {
            console.log('Connecting to Heart Rate sensor...');
            
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['heart_rate'] }],
                optionalServices: ['battery_service']
            });

            this.devices.heartRate = device;
            const server = await device.gatt.connect();
            
            const service = await server.getPrimaryService('heart_rate');
            const characteristic = await service.getCharacteristic('heart_rate_measurement');
            
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleHeartRateData(event.target.value);
            });
            
            this.characteristics.heartRate = characteristic;
            this.isConnected.heartRate = true;
            
            console.log('Heart Rate sensor connected successfully');
            
            device.addEventListener('gattserverdisconnected', () => {
                console.log('Heart Rate sensor disconnected');
                this.isConnected.heartRate = false;
            });
            
            return true;
            
        } catch (error) {
            console.error('Failed to connect to Heart Rate sensor:', error);
            throw error;
        }
    }

    // Handle Heart Rate Data
    handleHeartRateData(value) {
        const data = new DataView(value.buffer);
        const flags = data.getUint8(0);
        
        let heartRate;
        if (flags & 0x01) {
            // 16-bit heart rate
            heartRate = data.getUint16(1, true);
        } else {
            // 8-bit heart rate
            heartRate = data.getUint8(1);
        }
        
        this.data.heartRate = heartRate;
        
        if (this.callbacks.onHeartRateUpdate) {
            this.callbacks.onHeartRateUpdate(heartRate);
        }
    }

    // Disconnect all devices
    disconnectAll() {
        if (this.devices.kickr && this.devices.kickr.gatt.connected) {
            this.devices.kickr.gatt.disconnect();
        }
        if (this.devices.zwiftClick && this.devices.zwiftClick.gatt.connected) {
            this.devices.zwiftClick.gatt.disconnect();
        }
        if (this.devices.heartRate && this.devices.heartRate.gatt.connected) {
            this.devices.heartRate.gatt.disconnect();
        }
    }

    // Get current data
    getData() {
        return this.data;
    }

    // Check connection status
    getConnectionStatus() {
        return this.isConnected;
    }

    // Set callbacks
    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }
}

// Export for use in other scripts
window.SensorManager = SensorManager;
