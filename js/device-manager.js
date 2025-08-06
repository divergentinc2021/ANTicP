// Device Manager - Handles Bluetooth device connections
// Based on professional cycling app patterns

class DeviceManager extends EventEmitter {
    constructor() {
        super();
        this.connectedDevices = new Map();
        this.deviceFilters = {
            kickr: {
                filters: [
                    { namePrefix: 'KICKR' },
                    { namePrefix: 'Wahoo' },
                    { services: [0x1826] }, // Fitness Machine Service
                    { services: [0x1818] }  // Cycling Power Service
                ],
                optionalServices: [0x1826, 0x1818, 0x1816, 0x180A, 0x180F]
            },
            hrm: {
                filters: [
                    { services: [0x180D] }, // Heart Rate Service
                    { namePrefix: 'Polar' },
                    { namePrefix: 'Garmin' },
                    { namePrefix: 'Wahoo' },
                    { namePrefix: 'TICKR' }
                ],
                optionalServices: [0x180D, 0x180A, 0x180F]
            },
            'zwift-click': {
                filters: [
                    { namePrefix: 'Zwift' },
                    { namePrefix: 'Click' },
                    { services: [0x1812] } // HID Service
                ],
                optionalServices: [0x1812, 0x180A, 0x180F]
            }
        };
    }

    async connectDevice(deviceType) {
        if (!navigator.bluetooth) {
            throw new Error('Bluetooth not supported');
        }

        const filter = this.deviceFilters[deviceType];
        if (!filter) {
            throw new Error(`Unknown device type: ${deviceType}`);
        }

        try {
            // Request device
            const device = await navigator.bluetooth.requestDevice(filter);
            
            // Connect to GATT server
            const server = await device.gatt.connect();
            
            // Set up device data handler based on type
            let dataHandler;
            switch (deviceType) {
                case 'kickr':
                    dataHandler = new KickrDataHandler();
                    break;
                case 'hrm':
                    dataHandler = new HRMDataHandler();
                    break;
                case 'zwift-click':
                    dataHandler = new ZwiftClickHandler();
                    break;
                default:
                    throw new Error(`Unknown device type: ${deviceType}`);
            }

            await dataHandler.initialize(device, server);
            
            // Store connected device
            this.connectedDevices.set(deviceType, {
                device,
                server,
                dataHandler,
                name: device.name || `Unknown ${deviceType}`,
                connectedAt: new Date()
            });

            // Set up disconnect handler
            device.addEventListener('gattserverdisconnected', () => {
                this.handleDeviceDisconnected(deviceType);
            });

            // Set up data forwarding
            dataHandler.on('data', (data) => {
                this.emit('deviceData', { deviceType, ...data });
            });

            this.emit('deviceConnected', {
                type: deviceType,
                name: device.name || `Unknown ${deviceType}`,
                device
            });

            console.log(`✅ Connected to ${deviceType}: ${device.name}`);
            return { type: deviceType, name: device.name, device };

        } catch (error) {
            console.error(`❌ Failed to connect ${deviceType}:`, error);
            throw error;
        }
    }

    async disconnectDevice(deviceType) {
        const deviceInfo = this.connectedDevices.get(deviceType);
        if (!deviceInfo) {
            throw new Error(`Device ${deviceType} not connected`);
        }

        try {
            // Clean up data handler
            if (deviceInfo.dataHandler) {
                deviceInfo.dataHandler.cleanup();
            }

            // Disconnect GATT server
            if (deviceInfo.server && deviceInfo.server.connected) {
                deviceInfo.server.disconnect();
            }

            // Remove from connected devices
            this.connectedDevices.delete(deviceType);

            this.emit('deviceDisconnected', {
                type: deviceType,
                name: deviceInfo.name
            });

            console.log(`🔌 Disconnected ${deviceType}: ${deviceInfo.name}`);

        } catch (error) {
            console.error(`❌ Failed to disconnect ${deviceType}:`, error);
            throw error;
        }
    }

    handleDeviceDisconnected(deviceType) {
        const deviceInfo = this.connectedDevices.get(deviceType);
        if (deviceInfo) {
            this.connectedDevices.delete(deviceType);
            
            this.emit('deviceDisconnected', {
                type: deviceType,
                name: deviceInfo.name,
                unexpected: true
            });

            console.log(`⚠️ ${deviceType} disconnected unexpectedly`);
        }
    }

    isDeviceConnected(deviceType) {
        return this.connectedDevices.has(deviceType);
    }

    hasConnectedDevices() {
        return this.connectedDevices.size > 0;
    }

    getConnectedDevices() {
        const devices = [];
        for (const [type, info] of this.connectedDevices) {
            devices.push({
                type,
                name: info.name,
                connectedAt: info.connectedAt
            });
        }
        return devices;
    }

    async setTrainerResistance(targetPower) {
        const kickr = this.connectedDevices.get('kickr');
        if (kickr && kickr.dataHandler) {
            await kickr.dataHandler.setTargetPower(targetPower);
        }
    }
}

// Base class for device data handlers
class DeviceDataHandler extends EventEmitter {
    constructor(deviceType) {
        super();
        this.deviceType = deviceType;
        this.device = null;
        this.server = null;
        this.characteristics = new Map();
    }

    async initialize(device, server) {
        this.device = device;
        this.server = server;
        await this.setupServices();
    }

    async setupServices() {
        // Override in subclasses
    }

    cleanup() {
        this.removeAllListeners();
        this.characteristics.clear();
    }

    async startNotifications(serviceUUID, characteristicUUID, handler) {
        try {
            const service = await this.server.getPrimaryService(serviceUUID);
            const characteristic = await service.getCharacteristic(characteristicUUID);
            
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', handler);
            
            this.characteristics.set(characteristicUUID, characteristic);
            
            console.log(`📡 Started notifications for ${characteristicUUID}`);
            
        } catch (error) {
            console.warn(`⚠️ Failed to setup notifications for ${characteristicUUID}:`, error);
        }
    }
}

// Kickr-specific data handler
class KickrDataHandler extends DeviceDataHandler {
    constructor() {
        super('kickr');
        this.lastDistance = 0;
        this.lastTime = Date.now();
        this.sessionStartTime = Date.now();
        this.lastWheelTime = null;
        this.lastWheelRevolutions = null;
        this.lastCrankTime = null;
        this.lastCrankRevolutions = null;
    }

    async setupServices() {
        // Try Cycling Power Service first
        await this.startNotifications(
            0x1818, // Cycling Power Service
            0x2A63, // Cycling Power Measurement
            (event) => this.handlePowerData(event)
        );

        // Try Fitness Machine Service as fallback
        await this.startNotifications(
            0x1826, // Fitness Machine Service
            0x2ACD, // Fitness Machine Status
            (event) => this.handleFitnessData(event)
        );

        // Try Control Point for resistance control
        await this.startNotifications(
            0x1826, // Fitness Machine Service
            0x2AD9, // Fitness Machine Control Point
            (event) => this.handleControlResponse(event)
        );
    }

    handlePowerData(event) {
        const dataView = event.target.value;
        const data = this.parsePowerData(dataView);
        
        if (data.power || data.speed || data.cadence) {
            this.emit('data', data);
        }
    }

    handleFitnessData(event) {
        const dataView = event.target.value;
        const data = this.parseFitnessData(dataView);
        
        if (data.power || data.speed) {
            this.emit('data', data);
        }
    }

    parsePowerData(dataView) {
        const data = {};
        
        try {
            if (dataView.byteLength >= 8) {
                const flags = dataView.getUint16(0, true);
                let offset = 2;
                
                // Power is always present
                data.power = dataView.getUint16(offset, true);
                offset += 2;
                
                // Handle additional fields based on flags
                if (flags & 0x01) { // Pedal Power Balance Present
                    offset += 1;
                }
                if (flags & 0x04) { // Accumulated Energy Present
                    offset += 2;
                }
                if (flags & 0x10) { // Wheel Revolution Data Present
                    const wheelRevolutions = dataView.getUint32(offset, true);
                    offset += 4;
                    const lastWheelEventTime = dataView.getUint16(offset, true);
                    offset += 2;
                    
                    // Calculate speed from wheel data
                    const wheelCircumference = 2.105; // Standard road bike wheel (700x25c)
                    const timeDiff = (lastWheelEventTime - this.lastWheelTime) / 1024; // Convert to seconds
                    
                    if (this.lastWheelTime && timeDiff > 0) {
                        const revDiff = wheelRevolutions - this.lastWheelRevolutions;
                        data.speed = (revDiff * wheelCircumference * 3.6) / timeDiff; // km/h
                    }
                    
                    this.lastWheelTime = lastWheelEventTime;
                    this.lastWheelRevolutions = wheelRevolutions;
                }
                if (flags & 0x20) { // Crank Revolution Data Present
                    const crankRevolutions = dataView.getUint16(offset, true);
                    offset += 2;
                    const lastCrankEventTime = dataView.getUint16(offset, true);
                    
                    // Calculate cadence from crank data
                    const timeDiff = (lastCrankEventTime - this.lastCrankTime) / 1024; // Convert to seconds
                    
                    if (this.lastCrankTime && timeDiff > 0) {
                        const revDiff = crankRevolutions - this.lastCrankRevolutions;
                        data.cadence = Math.round((revDiff * 60) / timeDiff); // RPM
                    }
                    
                    this.lastCrankTime = lastCrankEventTime;
                    this.lastCrankRevolutions = crankRevolutions;
                }
            } else if (dataView.byteLength >= 4) {
                // Simple 4-byte power reading
                data.power = dataView.getUint16(2, true);
            }
            
            // Calculate speed from power if not available from wheel data
            if (!data.speed && data.power > 0) {
                // Estimate speed using power-to-speed approximation
                const efficiency = 0.22; // 22% efficiency typical for cycling
                const dragCoeff = 0.004; // Typical aerodynamic drag
                data.speed = Math.pow(data.power * efficiency / dragCoeff, 1/3) * 3.6;
            }
            
            // Calculate distance and time
            const currentTime = Date.now();
            const timeDiffSeconds = (currentTime - this.lastTime) / 1000;
            
            if (data.speed && timeDiffSeconds > 0) {
                const distanceIncrement = (data.speed * timeDiffSeconds) / 3600; // km
                this.lastDistance += distanceIncrement;
                data.distance = parseFloat(this.lastDistance.toFixed(2));
            }
            
            data.time = Math.floor((currentTime - this.sessionStartTime) / 1000);
            this.lastTime = currentTime;
            
        } catch (error) {
            console.error('Power data parsing error:', error);
        }
        
        return data;
    }

    parseFitnessData(dataView) {
        const data = {};
        
        try {
            if (dataView.byteLength >= 8) {
                // Parse fitness machine data format
                data.power = dataView.getUint16(2, true);
                
                if (data.power > 0) {
                    // Estimate speed from power
                    const efficiency = 0.22;
                    const dragCoeff = 0.004;
                    data.speed = Math.pow(data.power * efficiency / dragCoeff, 1/3) * 3.6;
                }
                
                // Calculate distance and time
                const currentTime = Date.now();
                const timeDiffSeconds = (currentTime - this.lastTime) / 1000;
                
                if (data.speed && timeDiffSeconds > 0) {
                    const distanceIncrement = (data.speed * timeDiffSeconds) / 3600;
                    this.lastDistance += distanceIncrement;
                    data.distance = parseFloat(this.lastDistance.toFixed(2));
                }
                
                data.time = Math.floor((currentTime - this.sessionStartTime) / 1000);
                this.lastTime = currentTime;
            }
        } catch (error) {
            console.error('Fitness data parsing error:', error);
        }
        
        return data;
    }

    async setTargetPower(targetPower) {
        try {
            const controlPoint = this.characteristics.get(0x2AD9);
            if (controlPoint) {
                // Send target power command to trainer
                const buffer = new ArrayBuffer(3);
                const view = new DataView(buffer);
                view.setUint8(0, 0x05); // Set Target Power command
                view.setUint16(1, targetPower, true); // Target power in watts
                
                await controlPoint.writeValue(buffer);
                console.log(`🎯 Set target power to ${targetPower}W`);
            }
        } catch (error) {
            console.error('Failed to set target power:', error);
        }
    }

    handleControlResponse(event) {
        // Handle control point responses if needed
        const dataView = event.target.value;
        console.log('Control response:', new Uint8Array(dataView.buffer));
    }
}

// Heart Rate Monitor data handler
class HRMDataHandler extends DeviceDataHandler {
    constructor() {
        super('hrm');
        this.hrHistory = [];
        this.maxHistory = 60; // Keep last 60 readings for average calculation
    }

    async setupServices() {
        await this.startNotifications(
            0x180D, // Heart Rate Service
            0x2A37, // Heart Rate Measurement
            (event) => this.handleHeartRateData(event)
        );
    }

    handleHeartRateData(event) {
        const dataView = event.target.value;
        const data = this.parseHeartRateData(dataView);
        
        if (data.heartRate) {
            this.emit('data', data);
        }
    }

    parseHeartRateData(dataView) {
        const data = {};
        
        try {
            if (dataView.byteLength >= 2) {
                const flags = dataView.getUint8(0);
                let heartRate;
                
                if (flags & 0x01) { // 16-bit heart rate
                    heartRate = dataView.getUint16(1, true);
                } else { // 8-bit heart rate
                    heartRate = dataView.getUint8(1);
                }
                
                if (heartRate > 0 && heartRate < 220) { // Sanity check
                    data.heartRate = heartRate;
                    
                    // Update history for average calculation
                    this.hrHistory.push(heartRate);
                    if (this.hrHistory.length > this.maxHistory) {
                        this.hrHistory.shift();
                    }
                    
                    // Calculate average
                    const sum = this.hrHistory.reduce((a, b) => a + b, 0);
                    data.avgHeartRate = Math.round(sum / this.hrHistory.length);
                    
                    // Calculate HR zones (basic example)
                    const maxHR = 185; // Should come from user profile
                    const hrPercent = (heartRate / maxHR) * 100;
                    
                    if (hrPercent >= 90) data.hrZone = 5;
                    else if (hrPercent >= 80) data.hrZone = 4;
                    else if (hrPercent >= 70) data.hrZone = 3;
                    else if (hrPercent >= 60) data.hrZone = 2;
                    else data.hrZone = 1;
                }
            }
        } catch (error) {
            console.error('Heart rate data parsing error:', error);
        }
        
        return data;
    }
}

// Zwift Click data handler
class ZwiftClickHandler extends DeviceDataHandler {
    constructor() {
        super('zwift-click');
        this.lastButtonState = 0;
    }

    async setupServices() {
        await this.startNotifications(
            0x1812, // HID Service
            0x2A4D, // HID Report
            (event) => this.handleButtonData(event)
        );
    }

    handleButtonData(event) {
        const dataView = event.target.value;
        const data = this.parseButtonData(dataView);
        
        if (data.buttonAction) {
            this.emit('data', data);
        }
    }

    parseButtonData(dataView) {
        const data = {};
        
        try {
            if (dataView.byteLength >= 1) {
                const buttonState = dataView.getUint8(0);
                
                if (buttonState !== this.lastButtonState) {
                    // Button state changed
                    if (buttonState === 1) {
                        data.buttonAction = 'up';
                    } else if (buttonState === 2) {
                        data.buttonAction = 'down';
                    }
                    
                    this.lastButtonState = buttonState;
                    console.log(`🎮 Zwift Click: ${data.buttonAction}`);
                }
            }
        } catch (error) {
            console.error('Button data parsing error:', error);
        }
        
        return data;
    }
}

// Simple EventEmitter implementation
class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    off(event, listener) {
        if (!this.events[event]) return;
        
        const index = this.events[event].indexOf(listener);
        if (index > -1) {
            this.events[event].splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    removeAllListeners() {
        this.events = {};
    }
}