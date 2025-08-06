/**
 * CRITICAL SPEED & CADENCE DATA PARSING FIXES
 * Apply these fixes to the existing integrated-training-platform-real-metrics.html
 */

// 1. ADD TO CONSTRUCTOR - Revolution data storage for proper calculations
this.lastRevolutionData = {
    wheelRevolutions: null,
    lastWheelEventTime: null,
    crankRevolutions: null,
    lastCrankEventTime: null
};

// 2. ADD TO CONSTRUCTOR - Wheel circumference for speed calculations
this.wheelCircumference = 2.096; // meters (700x25c tire)

// 3. REPLACE handlePowerData METHOD with this FIXED version:
handlePowerData(dataValue) {
    // FIXED: Parse cycling power measurement characteristic correctly
    const flags = dataValue.getUint16(0, true);
    let index = 2;
    
    // Instantaneous power (watts) - always present
    const power = dataValue.getUint16(index, true);
    index += 2;
    
    this.realMetrics.power = power;
    this.updateMetricDisplay('power-display', `${power}`, `FIXED: Live from power meter`);
    this.markMetricAsLive('power-metric');
    
    // FIXED: Crank revolution data (if present) - gives us cadence
    if (flags & 0x20) {
        const crankRevolutions = dataValue.getUint16(index, true);
        const lastCrankEventTime = dataValue.getUint16(index + 2, true);
        
        // FIXED: Calculate cadence from crank revolution data
        if (this.lastRevolutionData.crankRevolutions !== null) {
            const revDiff = crankRevolutions - this.lastRevolutionData.crankRevolutions;
            let timeDiff = lastCrankEventTime - this.lastRevolutionData.lastCrankEventTime;
            
            // Handle time rollover (16-bit counter)
            if (timeDiff < 0) {
                timeDiff += 65536;
            }
            
            // Convert time from 1024ths of a second to seconds
            timeDiff = timeDiff / 1024;
            
            if (timeDiff > 0 && revDiff > 0) {
                const cadence = Math.round((revDiff / timeDiff) * 60);
                this.realMetrics.cadence = cadence;
                this.updateMetricDisplay('cadence-display', `${cadence}`, `FIXED: Live from power meter`);
                this.markMetricAsLive('cadence-metric');
                this.log(`🚴 FIXED cadence: ${revDiff} revs / ${timeDiff.toFixed(3)}s = ${cadence} RPM`);
            }
        }
        
        // Store for next calculation
        this.lastRevolutionData.crankRevolutions = crankRevolutions;
        this.lastRevolutionData.lastCrankEventTime = lastCrankEventTime;
    }
    
    this.lastDataUpdate.set('power', new Date());
    this.log(`⚡ FIXED power data: ${power}W`);
}

// 4. ADD NEW METHOD - Handle cycling speed and cadence service
async connectKickr() {
    try {
        this.log('⚡ Connecting to real Wahoo Kickr...');
        this.updateDeviceStatus('kickr', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['00001818-0000-1000-8000-00805f9b34fb'] }, // Cycling Power
                { services: ['00001826-0000-1000-8000-00805f9b34fb'] }, // Fitness Machine
                { services: ['00001816-0000-1000-8000-00805f9b34fb'] }, // Cycling Speed and Cadence
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' }
            ],
            optionalServices: [
                '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
                '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
                '00001818-0000-1000-8000-00805f9b34fb', // Cycling Power
                '00001826-0000-1000-8000-00805f9b34fb', // Fitness Machine
                '00001816-0000-1000-8000-00805f9b34fb'  // Cycling Speed and Cadence
            ]
        });

        const server = await device.gatt.connect();
        
        // FIXED: Connect to cycling power service for real power/cadence data
        try {
            const powerService = await server.getPrimaryService('00001818-0000-1000-8000-00805f9b34fb');
            const powerCharacteristic = await powerService.getCharacteristic('00002a63-0000-1000-8000-00805f9b34fb');
            
            await powerCharacteristic.startNotifications();
            powerCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handlePowerData(event.target.value);
            });
            
            this.log('✅ FIXED: Real power data notifications started');
        } catch (e) {
            this.log('⚠️ Power service not available');
        }

        // FIXED: Connect to cycling speed and cadence service
        try {
            const cscService = await server.getPrimaryService('00001816-0000-1000-8000-00805f9b34fb');
            const cscCharacteristic = await cscService.getCharacteristic('00002a5b-0000-1000-8000-00805f9b34fb');
            
            await cscCharacteristic.startNotifications();
            cscCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleSpeedCadenceData(event.target.value);
            });
            
            this.log('✅ FIXED: Real speed/cadence data notifications started');
        } catch (e) {
            this.log('⚠️ Speed/Cadence service not available');
        }

        // FIXED: Connect to fitness machine service for additional data
        try {
            const fitnessService = await server.getPrimaryService('00001826-0000-1000-8000-00805f9b34fb');
            const fitnessCharacteristic = await fitnessService.getCharacteristic('00002ad2-0000-1000-8000-00805f9b34fb');
            
            await fitnessCharacteristic.startNotifications();
            fitnessCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleFitnessData(event.target.value);
            });
            
            this.log('✅ FIXED: Real fitness machine data notifications started');
        } catch (e) {
            this.log('⚠️ Fitness machine service not available');
        }

        this.connectedDevices.set('kickr', { device, server });
        this.updateDeviceStatus('kickr', 'connected');
        this.updateDeviceInfo('kickr-device-info', `${device.name || 'Kickr'} - Real device providing FIXED live power, speed, cadence`);
        this.log(`✅ Real Kickr connected with FIXED data parsing: ${device.name}`);
        this.showNotification('success', `Real Kickr connected with FIXED data parsing: ${device.name}`);

    } catch (error) {
        this.updateDeviceStatus('kickr', 'error');
        this.log(`❌ Kickr connection failed: ${error.message}`);
        this.showNotification('error', `Kickr connection failed: ${error.message}`);
    }
}

// 5. ADD NEW METHOD - Handle CSC (Cycling Speed and Cadence) data
handleSpeedCadenceData(dataValue) {
    // FIXED: Parse CSC measurement characteristic correctly
    const flags = dataValue.getUint8(0);
    let index = 1;
    
    this.log(`🔧 CSC Data received - Flags: 0x${flags.toString(16)}`);
    
    // FIXED: Wheel revolution data (if present) - gives us speed
    if (flags & 0x1) {
        const wheelRevolutions = dataValue.getUint32(index, true);
        const lastWheelEventTime = dataValue.getUint16(index + 4, true);
        index += 6;
        
        // FIXED: Calculate speed from wheel revolution data
        if (this.lastRevolutionData.wheelRevolutions !== null) {
            const revDiff = wheelRevolutions - this.lastRevolutionData.wheelRevolutions;
            let timeDiff = lastWheelEventTime - this.lastRevolutionData.lastWheelEventTime;
            
            // Handle time rollover (16-bit counter)
            if (timeDiff < 0) {
                timeDiff += 65536;
            }
            
            // Convert time from 1024ths of a second to seconds
            timeDiff = timeDiff / 1024;
            
            if (timeDiff > 0 && revDiff > 0) {
                // FIXED: Calculate speed using wheel circumference
                const distance = revDiff * this.wheelCircumference; // meters
                const speed = (distance / timeDiff) * 3.6; // convert m/s to km/h
                
                this.realMetrics.speed = speed;
                this.updateMetricDisplay('speed-display', `${speed.toFixed(1)}`, `FIXED: Live from trainer`);
                this.markMetricAsLive('speed-metric');
                this.log(`🚴 FIXED speed: ${revDiff} revs × ${this.wheelCircumference}m / ${timeDiff.toFixed(3)}s = ${speed.toFixed(1)} km/h`);
            }
        }
        
        // Store for next calculation
        this.lastRevolutionData.wheelRevolutions = wheelRevolutions;
        this.lastRevolutionData.lastWheelEventTime = lastWheelEventTime;
    }
    
    // FIXED: Crank revolution data (if present) - gives us cadence
    if (flags & 0x2) {
        const crankRevolutions = dataValue.getUint16(index, true);
        const lastCrankEventTime = dataValue.getUint16(index + 2, true);
        
        // FIXED: Calculate cadence from crank revolution data
        if (this.lastRevolutionData.crankRevolutions !== null) {
            const revDiff = crankRevolutions - this.lastRevolutionData.crankRevolutions;
            let timeDiff = lastCrankEventTime - this.lastRevolutionData.lastCrankEventTime;
            
            // Handle time rollover (16-bit counter)
            if (timeDiff < 0) {
                timeDiff += 65536;
            }
            
            // Convert time from 1024ths of a second to seconds
            timeDiff = timeDiff / 1024;
            
            if (timeDiff > 0 && revDiff > 0) {
                const cadence = Math.round((revDiff / timeDiff) * 60);
                this.realMetrics.cadence = cadence;
                this.updateMetricDisplay('cadence-display', `${cadence}`, `FIXED: Live from trainer`);
                this.markMetricAsLive('cadence-metric');
                this.log(`🚴 FIXED cadence: ${revDiff} revs / ${timeDiff.toFixed(3)}s = ${cadence} RPM`);
            }
        }
        
        // Store for next calculation
        this.lastRevolutionData.crankRevolutions = crankRevolutions;
        this.lastRevolutionData.lastCrankEventTime = lastCrankEventTime;
    }
    
    this.lastDataUpdate.set('csc', new Date());
}

// 6. UPDATE THE LOG MESSAGES - Update the platform title and log messages
// In the HTML, update the title and description:
// <h1>🚴 ANTicP - Real Live Metrics Platform (FIXED)</h1>
// <p>Fixed speed/cadence data parsing - Now showing correct real-time metrics!</p>

// In the initialize() method, update the log messages:
this.log('🚀 Initializing FIXED Real Live Metrics Platform...');
this.log('🔧 FIXED: Proper revolution → speed/cadence conversion implemented');
this.log('📡 Platform will ONLY show data from connected devices with FIXED parsing');
