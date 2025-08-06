// CORRECTED SENSOR PAIRING METHODS - REPLACE IN zwift-style-sensor-pairing-platform.html

// ============================================================================
// FIXED SENSOR PAIRING METHODS (CORRECT BLUETOOTH SERVICE NAMES)
// ============================================================================

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
                { namePrefix: 'Quarq' },
                { namePrefix: 'PowerTap' }
            ],
            optionalServices: ['cycling_power', 'battery_service', 'device_information']
        });

        const server = await device.gatt.connect();
        const powerService = await server.getPrimaryService('cycling_power');
        const powerChar = await powerService.getCharacteristic('cycling_power_measurement'); // ✅ FIXED
        
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
                { namePrefix: 'Bontrager' },
                { namePrefix: 'Speed' }
            ],
            optionalServices: ['cycling_speed_and_cadence', 'battery_service', 'device_information']
        });

        const server = await device.gatt.connect();
        const cscService = await server.getPrimaryService('cycling_speed_and_cadence');
        const cscChar = await cscService.getCharacteristic('csc_measurement'); // ✅ FIXED
        
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
        const cscChar = await cscService.getCharacteristic('csc_measurement'); // ✅ FIXED
        
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
        const controlChar = await fitnessService.getCharacteristic('fitness_machine_control_point'); // ✅ FIXED
        
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

// Heart Rate is already correct but here's the fixed version for completeness
async pairHeartRate() {
    try {
        this.log('❤️ Pairing Heart Rate Monitor...');
        this.updateSensorCard('hr', 'connecting');
        
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['heart_rate'] }],  // ✅ Already correct
            optionalServices: ['battery_service']
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('heart_rate');
        const characteristic = await service.getCharacteristic('heart_rate_measurement'); // ✅ Already correct
        
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
