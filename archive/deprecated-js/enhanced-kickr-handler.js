// Enhanced Wahoo Kickr Core Handler with Service Discovery
// Handles power, cadence, speed data with comprehensive BLE service discovery

class EnhancedKickrHandler {
    constructor() {
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.services = new Map();
        this.characteristics = new Map();
        this.dataBuffer = new Map();
        
        // Wahoo Kickr Standard Services
        this.knownServices = {
            // Standard BLE Services
            '0x1826': 'Fitness Machine Service',
            '0x1818': 'Cycling Power Service',
            '0x1816': 'Cycling Speed and Cadence Service',
            '0x180A': 'Device Information Service',
            '0x180F': 'Battery Service',
            
            // Full UUIDs
            '00001826-0000-1000-8000-00805f9b34fb': 'Fitness Machine Service',
            '00001818-0000-1000-8000-00805f9b34fb': 'Cycling Power Service',
            '00001816-0000-1000-8000-00805f9b34fb': 'Cycling Speed and Cadence Service',
            
            // Known Wahoo-specific services
            'a026ee0c-0a7d-4ab3-97fa-f1500f9feb8b': 'Wahoo Trainer Service',
            'a026ee0d-0a7d-4ab3-97fa-f1500f9feb8b': 'Wahoo Control Service'
        };

        this.knownCharacteristics = {
            // Power Service
            '0x2A63': 'Cycling Power Measurement',
            '0x2A65': 'Cycling Power Feature',
            '0x2A5D': 'Cycling Power Control Point',
            
            // Speed/Cadence Service  
            '0x2A5B': 'CSC Measurement',
            '0x2A5C': 'CSC Feature',
            
            // Fitness Machine Service
            '0x2ACD': 'Treadmill Data',
            '0x2ACE': 'Cross Trainer Data', 
            '0x2AD2': 'Indoor Bike Data',
            '0x2AD9': 'Fitness Machine Control Point',
            '0x2ACC': 'Fitness Machine Feature',
            
            // Full UUIDs
            '00002a63-0000-1000-8000-00805f9b34fb': 'Cycling Power Measurement',
            '00002a5b-0000-1000-8000-00805f9b34fb': 'CSC Measurement',
            '00002ad2-0000-1000-8000-00805f9b34fb': 'Indoor Bike Data'
        };
    }

    // Enhanced connection with service discovery
    async connect() {
        try {
            this.addLog('🔍 Scanning for Wahoo Kickr Core...', 'info');
            
            // Enhanced filters for Wahoo devices
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'KICKR' },
                    { namePrefix: 'Wahoo' },
                    { namePrefix: 'KICKR CORE' },
                    { services: [0x1826] }, // Fitness Machine
                    { services: [0x1818] }, // Power
                    { services: [0x1816] }  // Speed/Cadence
                ],
                optionalServices: [
                    0x1826, 0x1818, 0x1816, 0x180A, 0x180F,
                    'a026ee0c-0a7d-4ab3-97fa-f1500f9feb8b', // Wahoo Trainer
                    'a026ee0d-0a7d-4ab3-97fa-f1500f9feb8b'  // Wahoo Control
                ]
            });

            this.addLog(`✅ Found Kickr: ${this.device.name || 'Unknown'}`, 'success');

            // Connect to GATT server
            this.server = await this.device.gatt.connect();
            this.addLog('✅ Connected to Kickr GATT server', 'success');

            // Set up disconnect handler
            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

            // Discover all services and characteristics
            await this.discoverServices();

            // Set up data monitoring
            await this.setupDataMonitoring();

            this.isConnected = true;
            this.updateConnectionStatus('connected', this.device.name);
            
            return true;

        } catch (error) {
            if (error.name === 'NotFoundError') {
                this.addLog('⚠️ No Kickr selected. Make sure it\'s powered on.', 'warning');
            } else {
                this.addLog(`❌ Kickr connection failed: ${error.message}`, 'error');
            }
            return false;
        }
    }

    // Comprehensive service and characteristic discovery
    async discoverServices() {
        try {
            this.addLog('🔍 Discovering services and characteristics...', 'info');
            
            const services = await this.server.getPrimaryServices();
            this.addLog(`📋 Found ${services.length} services`, 'info');

            for (const service of services) {
                const serviceUuid = service.uuid;
                const serviceName = this.knownServices[serviceUuid] || 
                                  this.knownServices[this.normalizeUuid(serviceUuid)] || 
                                  'Unknown Service';
                
                this.services.set(serviceUuid, service);
                this.addLog(`  📡 Service: ${serviceName} (${serviceUuid})`, 'info');

                try {
                    const characteristics = await service.getCharacteristics();
                    
                    for (const characteristic of characteristics) {
                        const charUuid = characteristic.uuid;
                        const charName = this.knownCharacteristics[charUuid] || 
                                        this.knownCharacteristics[this.normalizeUuid(charUuid)] || 
                                        'Unknown Characteristic';
                        
                        this.characteristics.set(charUuid, characteristic);
                        
                        const properties = [];
                        if (characteristic.properties.read) properties.push('read');
                        if (characteristic.properties.write) properties.push('write');
                        if (characteristic.properties.notify) properties.push('notify');
                        if (characteristic.properties.indicate) properties.push('indicate');
                        
                        this.addLog(`    🔧 ${charName} (${charUuid}) - ${properties.join(', ')}`, 'info');
                    }
                } catch (charError) {
                    this.addLog(`    ⚠️ Could not get characteristics for service ${serviceName}`, 'warning');
                }
            }

        } catch (error) {
            this.addLog(`❌ Service discovery failed: ${error.message}`, 'error');
        }
    }

    // Set up data monitoring on all notification characteristics
    async setupDataMonitoring() {
        try {
            this.addLog('📡 Setting up data monitoring...', 'info');
            let monitoringCount = 0;

            for (const [uuid, characteristic] of this.characteristics) {
                if (characteristic.properties.notify || characteristic.properties.indicate) {
                    try {
                        await characteristic.startNotifications();
                        
                        characteristic.addEventListener('characteristicvaluechanged', (event) => {
                            this.handleKickrData(event, uuid);
                        });
                        
                        const charName = this.knownCharacteristics[uuid] || 
                                        this.knownCharacteristics[this.normalizeUuid(uuid)] || 
                                        'Unknown';
                        
                        this.addLog(`  ✅ Monitoring: ${charName}`, 'success');
                        monitoringCount++;
                        
                    } catch (notifyError) {
                        // Skip characteristics that can't be monitored
                    }
                }
            }

            if (monitoringCount > 0) {
                this.addLog(`🔔 Successfully monitoring ${monitoringCount} characteristics`, 'success');
                this.addLog('🎯 Ready to receive power, speed, and cadence data!', 'success');
            } else {
                this.addLog('⚠️ No notification characteristics found', 'warning');
            }

        } catch (error) {
            this.addLog(`❌ Data monitoring setup failed: ${error.message}`, 'error');
        }
    }

    // Enhanced data parsing for Kickr measurements
    handleKickrData(event, characteristicUuid) {
        const value = event.target.value;
        const data = new Uint8Array(value.buffer);
        const hexData = Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
        
        // Log all data for debugging
        const charName = this.knownCharacteristics[characteristicUuid] || 
                         this.knownCharacteristics[this.normalizeUuid(characteristicUuid)] || 
                         'Unknown';
        
        this.addLog(`📊 ${charName}: ${hexData}`, 'info');

        // Parse specific data types
        try {
            if (this.isPowerMeasurement(characteristicUuid)) {
                this.parsePowerData(data);
            } else if (this.isSpeedCadenceMeasurement(characteristicUuid)) {
                this.parseSpeedCadenceData(data);
            } else if (this.isIndoorBikeData(characteristicUuid)) {
                this.parseIndoorBikeData(data);
            } else {
                // Try to parse as generic fitness data
                this.parseGenericData(data);
            }
        } catch (parseError) {
            this.addLog(`⚠️ Data parsing error for ${charName}: ${parseError.message}`, 'warning');
        }
    }

    // Check if characteristic is power measurement
    isPowerMeasurement(uuid) {
        const normalized = this.normalizeUuid(uuid);
        return normalized === '0x2a63' || uuid.includes('2a63');
    }

    // Check if characteristic is speed/cadence measurement  
    isSpeedCadenceMeasurement(uuid) {
        const normalized = this.normalizeUuid(uuid);
        return normalized === '0x2a5b' || uuid.includes('2a5b');
    }

    // Check if characteristic is indoor bike data
    isIndoorBikeData(uuid) {
        const normalized = this.normalizeUuid(uuid);
        return normalized === '0x2ad2' || uuid.includes('2ad2');
    }

    // Parse power measurement data
    parsePowerData(data) {
        if (data.length >= 4) {
            // Standard power measurement format
            const flags = (data[1] << 8) | data[0];
            const power = (data[3] << 8) | data[2];
            
            if (power >= 0 && power <= 4000) { // Reasonable power range
                this.updatePowerDisplay(power);
                this.addLog(`⚡ Power: ${power}W`, 'success');
            }
            
            // Check for additional data
            if (data.length >= 8 && (flags & 0x20)) { // Accumulated energy present
                const energy = (data[7] << 8) | data[6];
                this.addLog(`🔋 Energy: ${energy}kJ`, 'info');
            }
        }
    }

    // Parse speed and cadence data
    parseSpeedCadenceData(data) {
        if (data.length >= 5) {
            // CSC Measurement format
            const flags = data[0];
            let offset = 1;
            
            if (flags & 0x01) { // Wheel revolution data present
                const wheelRevs = (data[4] << 24) | (data[3] << 16) | (data[2] << 8) | data[1];
                const wheelTime = (data[6] << 8) | data[5]; // Last wheel event time
                
                // Calculate speed (simplified)
                const speed = this.calculateSpeed(wheelRevs, wheelTime);
                if (speed > 0 && speed < 100) { // Reasonable speed range
                    this.updateSpeedDisplay(speed);
                    this.addLog(`🚴 Speed: ${speed.toFixed(1)} km/h`, 'success');
                }
                offset += 6;
            }
            
            if (flags & 0x02 && data.length > offset + 3) { // Crank revolution data present
                const crankRevs = (data[offset + 3] << 24) | (data[offset + 2] << 16) | 
                                 (data[offset + 1] << 8) | data[offset];
                const crankTime = (data[offset + 5] << 8) | data[offset + 4];
                
                // Calculate cadence (simplified)
                const cadence = this.calculateCadence(crankRevs, crankTime);
                if (cadence > 0 && cadence < 200) { // Reasonable cadence range
                    this.updateCadenceDisplay(Math.round(cadence));
                    this.addLog(`🔄 Cadence: ${Math.round(cadence)} RPM`, 'success');
                }
            }
        }
    }

    // Parse indoor bike data (comprehensive fitness machine data)
    parseIndoorBikeData(data) {
        if (data.length >= 4) {
            const flags = (data[1] << 8) | data[0];
            let offset = 2;
            
            // Instantaneous Speed (if present)
            if (flags & 0x01 && data.length > offset + 1) {
                const speed = ((data[offset + 1] << 8) | data[offset]) * 0.01; // km/h
                this.updateSpeedDisplay(speed);
                this.addLog(`🚴 Speed: ${speed.toFixed(1)} km/h`, 'success');
                offset += 2;
            }
            
            // Average Speed (if present)
            if (flags & 0x02 && data.length > offset + 1) {
                offset += 2; // Skip for now
            }
            
            // Instantaneous Cadence (if present)
            if (flags & 0x04 && data.length > offset + 1) {
                const cadence = ((data[offset + 1] << 8) | data[offset]) * 0.5; // RPM
                this.updateCadenceDisplay(Math.round(cadence));
                this.addLog(`🔄 Cadence: ${Math.round(cadence)} RPM`, 'success');
                offset += 2;
            }
            
            // Instantaneous Power (if present)
            if (flags & 0x40 && data.length > offset + 1) {
                const power = (data[offset + 1] << 8) | data[offset]; // Watts
                this.updatePowerDisplay(power);
                this.addLog(`⚡ Power: ${power}W`, 'success');
                offset += 2;
            }
        }
    }

    // Generic data parsing fallback
    parseGenericData(data) {
        // Try to find power-like values (16-bit integers in reasonable range)
        for (let i = 0; i < data.length - 1; i++) {
            const value = (data[i + 1] << 8) | data[i];
            
            // Looks like power?
            if (value > 0 && value < 2000) {
                this.updatePowerDisplay(value);
                this.addLog(`🔍 Potential Power: ${value}W`, 'info');
                break;
            }
        }
        
        // Try to find cadence-like values
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            if (value > 30 && value < 180) { // Typical cadence range
                this.updateCadenceDisplay(value);
                this.addLog(`🔍 Potential Cadence: ${value} RPM`, 'info');
                break;
            }
        }
    }

    // Calculate speed from wheel revolutions (simplified)
    calculateSpeed(wheelRevs, wheelTime) {
        // Store previous values for calculation
        if (!this.lastWheelRevs) {
            this.lastWheelRevs = wheelRevs;
            this.lastWheelTime = wheelTime;
            return 0;
        }
        
        const revDiff = wheelRevs - this.lastWheelRevs;
        const timeDiff = wheelTime - this.lastWheelTime;
        
        if (revDiff > 0 && timeDiff > 0) {
            // Assume 700c wheel (~2.1m circumference)
            const distance = revDiff * 2.1; // meters
            const timeSeconds = timeDiff / 1024; // Convert to seconds
            const speed = (distance / timeSeconds) * 3.6; // Convert to km/h
            
            this.lastWheelRevs = wheelRevs;
            this.lastWheelTime = wheelTime;
            
            return speed;
        }
        
        return 0;
    }

    // Calculate cadence from crank revolutions
    calculateCadence(crankRevs, crankTime) {
        if (!this.lastCrankRevs) {
            this.lastCrankRevs = crankRevs;
            this.lastCrankTime = crankTime;
            return 0;
        }
        
        const revDiff = crankRevs - this.lastCrankRevs;
        const timeDiff = crankTime - this.lastCrankTime;
        
        if (revDiff > 0 && timeDiff > 0) {
            const timeSeconds = timeDiff / 1024; // Convert to seconds
            const rpm = (revDiff / timeSeconds) * 60; // Convert to RPM
            
            this.lastCrankRevs = crankRevs;
            this.lastCrankTime = crankTime;
            
            return rpm;
        }
        
        return 0;
    }

    // Update power display
    updatePowerDisplay(power) {
        const powerElement = document.getElementById('kickr-power-value');
        if (powerElement) {
            powerElement.textContent = power;
            powerElement.style.color = '#e74c3c';
        }
        
        // Update last update time
        this.updateLastUpdateTime();
    }

    // Update speed display  
    updateSpeedDisplay(speed) {
        const speedElement = document.getElementById('kickr-speed-value');
        if (speedElement) {
            speedElement.textContent = speed.toFixed(1);
            speedElement.style.color = '#9b59b6';
        }
        
        this.updateLastUpdateTime();
    }

    // Update cadence display
    updateCadenceDisplay(cadence) {
        const cadenceElement = document.getElementById('kickr-cadence-value');
        if (cadenceElement) {
            cadenceElement.textContent = cadence;
            cadenceElement.style.color = '#3498db';
        }
        
        this.updateLastUpdateTime();
    }

    // Update last update timestamp
    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('kickr-last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `📡 Live: ${new Date().toLocaleTimeString()}`;
            lastUpdateElement.style.color = '#28a745';
        }
    }

    // Update connection status
    updateConnectionStatus(status, details = '') {
        if (window.deviceConnectionLogger) {
            window.deviceConnectionLogger.logConnection('kickr', status, details);
        }
    }

    // Handle disconnection
    handleDisconnection() {
        this.isConnected = false;
        this.addLog('⚠️ Kickr Core disconnected', 'warning');
        this.updateConnectionStatus('disconnected');
        
        // Clear displays
        const elements = ['kickr-power-value', 'kickr-speed-value', 'kickr-cadence-value'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '---';
                element.style.color = '#6c757d';
            }
        });
    }

    // Disconnect from device
    async disconnect() {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            try {
                await this.device.gatt.disconnect();
                this.addLog('🔌 Kickr Core disconnected', 'info');
            } catch (error) {
                console.error('Error disconnecting:', error);
            }
        }
        
        this.device = null;
        this.server = null;
        this.isConnected = false;
        this.services.clear();
        this.characteristics.clear();
    }

    // Normalize UUID for comparison
    normalizeUuid(uuid) {
        if (uuid.length === 4) {
            return '0x' + uuid.toLowerCase();
        } else if (uuid.length === 36) {
            // Extract the significant part from full UUID
            const significant = uuid.substring(4, 8);
            return '0x' + significant.toLowerCase();
        }
        return uuid.toLowerCase();
    }

    // Utility to add log messages
    addLog(message, type = 'info') {
        if (window.addConnectionLog) {
            window.addConnectionLog(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Get current status
    getStatus() {
        return {
            connected: this.isConnected,
            deviceName: this.device?.name || null,
            servicesFound: this.services.size,
            characteristicsFound: this.characteristics.size
        };
    }
}

// Create global instance
window.enhancedKickrHandler = new EnhancedKickrHandler();

// Global functions for UI
async function pairEnhancedKickr() {
    try {
        const success = await window.enhancedKickrHandler.connect();
        return success;
    } catch (error) {
        console.error('Enhanced Kickr pairing failed:', error);
        return false;
    }
}

async function disconnectEnhancedKickr() {
    try {
        await window.enhancedKickrHandler.disconnect();
    } catch (error) {
        console.error('Enhanced Kickr disconnect failed:', error);
    }
}

console.log('🚴 Enhanced Wahoo Kickr Core Handler loaded with comprehensive service discovery');
