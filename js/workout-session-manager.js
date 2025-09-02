// Workout Session Manager
class WorkoutSessionManager {
    constructor() {
        this.sessionState = {
            isRunning: false,
            isPaused: false,
            startTime: null,
            elapsedTime: 0,
            currentLap: 1,
            lapStartTime: null,
            lapType: 'warmup',
            currentGear: 1,
            resistance: -5,
            workoutFile: null,
            workoutIntervals: [],
            currentInterval: 0,
            intervalTimer: null,
            metrics: {
                power: [],
                heartRate: [],
                cadence: [],
                timestamps: []
            },
            laps: [],
            totals: {
                power: { sum: 0, count: 0, max: 0, avg: 0 },
                heartRate: { sum: 0, count: 0, max: 0, avg: 0 },
                cadence: { sum: 0, count: 0, max: 0, avg: 0 },
                distance: 0,
                kilojoules: 0,
                calories: 0
            }
        };

        this.sensorData = {
            kickr: null,
            zwiftClick: null,
            heartRate: null
        };

        this.resistanceMap = {
            1: -5,  // Warmup/Recovery
            2: 0,   // Easy
            3: 5,   // Moderate
            4: 10,  // Moderate-Hard
            5: 15,  // Hard
            6: 20,  // Very Hard
            7: 25,  // Maximum
            8: 30   // Sprint
        };

        this.powerZones = [
            { zone: 1, name: 'Recovery', min: 0, max: 120, color: '#4caf50' },
            { zone: 2, name: 'Endurance', min: 121, max: 164, color: '#8bc34a' },
            { zone: 3, name: 'Tempo', min: 165, max: 197, color: '#cddc39' },
            { zone: 4, name: 'Threshold', min: 198, max: 230, color: '#ffc107' },
            { zone: 5, name: 'VO2Max', min: 231, max: 263, color: '#ff9800' },
            { zone: 6, name: 'Anaerobic', min: 264, max: 329, color: '#ff5722' },
            { zone: 7, name: 'Neuromuscular', min: 330, max: 9999, color: '#f44336' }
        ];

        this.heartRateZones = [
            { zone: 1, name: 'Recovery', min: 0, max: 108, percentage: '0-60%' },
            { zone: 2, name: 'Aerobic', min: 109, max: 126, percentage: '60-70%' },
            { zone: 3, name: 'Tempo', min: 127, max: 144, percentage: '70-80%' },
            { zone: 4, name: 'Threshold', min: 145, max: 162, percentage: '80-90%' },
            { zone: 5, name: 'VO2Max', min: 163, max: 180, percentage: '90-100%' }
        ];
    }

    // Initialize Bluetooth connections
    async initializeSensors() {
        try {
            // Initialize KICKR Core
            await this.connectKickr();
            
            // Initialize Zwift Click
            await this.connectZwiftClick();
            
            // Initialize Heart Rate
            await this.connectHeartRate();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize sensors:', error);
            return false;
        }
    }

    async connectKickr() {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: ['fitness_machine'] },
                    { namePrefix: 'KICKR' }
                ],
                optionalServices: ['device_information']
            });

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('fitness_machine');
            
            // Get characteristics
            const indoorBikeChar = await service.getCharacteristic('00002ad2-0000-1000-8000-00805f9b34fb');
            const controlPoint = await service.getCharacteristic('00002ad9-0000-1000-8000-00805f9b34fb');
            
            // Subscribe to notifications
            await indoorBikeChar.startNotifications();
            indoorBikeChar.addEventListener('characteristicvaluechanged', (event) => {
                this.handleKickrData(event.target.value);
            });

            this.sensorData.kickr = {
                device: device,
                server: server,
                service: service,
                controlPoint: controlPoint
            };

            console.log('KICKR Core connected');
            return true;
        } catch (error) {
            console.error('KICKR connection failed:', error);
            throw error;
        }
    }

    async connectZwiftClick() {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { services: ['00001812-0000-1000-8000-00805f9b34fb'] }
                ]
            });

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('00001812-0000-1000-8000-00805f9b34fb');
            const characteristic = await service.getCharacteristic('00002a4d-0000-1000-8000-00805f9b34fb');
            
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleZwiftClickData(event.target.value);
            });

            this.sensorData.zwiftClick = {
                device: device,
                server: server,
                service: service
            };

            console.log('Zwift Click connected');
            return true;
        } catch (error) {
            console.error('Zwift Click connection failed:', error);
            throw error;
        }
    }

    async connectHeartRate() {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['heart_rate'] }]
            });

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('heart_rate');
            const characteristic = await service.getCharacteristic('heart_rate_measurement');
            
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.handleHeartRateData(event.target.value);
            });

            this.sensorData.heartRate = {
                device: device,
                server: server,
                service: service
            };

            console.log('Heart Rate sensor connected');
            return true;
        } catch (error) {
            console.error('Heart Rate connection failed:', error);
            throw error;
        }
    }

    // Handle sensor data
    handleKickrData(value) {
        const data = new DataView(value.buffer);
        
        // Parse indoor bike data (simplified)
        let offset = 2; // Skip flags
        
        // Instantaneous Speed (if present)
        if (data.byteLength > offset + 1) {
            const speed = data.getUint16(offset, true) / 100; // km/h
            offset += 2;
        }
        
        // Instantaneous Cadence (if present)
        if (data.byteLength > offset + 1) {
            const cadence = data.getUint16(offset, true) / 2; // rpm
            this.updateCadence(cadence);
            offset += 2;
        }
        
        // Instantaneous Power (if present)
        if (data.byteLength > offset + 1) {
            const power = data.getInt16(offset, true); // watts
            this.updatePower(power);
        }
    }

    handleZwiftClickData(value) {
        const data = new Uint8Array(value.buffer);
        
        // Detect button press patterns
        if (data[0] === 0x01) {
            // Up button - increase gear
            this.changeGear(1);
        } else if (data[0] === 0x02) {
            // Down button - decrease gear
            this.changeGear(-1);
        }
    }

    handleHeartRateData(value) {
        const data = new DataView(value.buffer);
        const flags = data.getUint8(0);
        const heartRate = flags & 0x01 ? data.getUint16(1, true) : data.getUint8(1);
        
        this.updateHeartRate(heartRate);
    }

    // Update methods
    updatePower(power) {
        this.sessionState.metrics.power.push(power);
        this.sessionState.totals.power.sum += power;
        this.sessionState.totals.power.count++;
        this.sessionState.totals.power.max = Math.max(this.sessionState.totals.power.max, power);
        this.sessionState.totals.power.avg = Math.round(this.sessionState.totals.power.sum / this.sessionState.totals.power.count);
        
        // Update kilojoules
        this.sessionState.totals.kilojoules += (power / 1000);
        
        // Update UI if exists
        if (typeof updatePowerDisplay === 'function') {
            updatePowerDisplay(power);
        }
    }

    updateCadence(cadence) {
        this.sessionState.metrics.cadence.push(cadence);
        this.sessionState.totals.cadence.sum += cadence;
        this.sessionState.totals.cadence.count++;
        this.sessionState.totals.cadence.max = Math.max(this.sessionState.totals.cadence.max, cadence);
        this.sessionState.totals.cadence.avg = Math.round(this.sessionState.totals.cadence.sum / this.sessionState.totals.cadence.count);
        
        if (typeof updateCadenceDisplay === 'function') {
            updateCadenceDisplay(cadence);
        }
    }

    updateHeartRate(heartRate) {
        this.sessionState.metrics.heartRate.push(heartRate);
        this.sessionState.totals.heartRate.sum += heartRate;
        this.sessionState.totals.heartRate.count++;
        this.sessionState.totals.heartRate.max = Math.max(this.sessionState.totals.heartRate.max, heartRate);
        this.sessionState.totals.heartRate.avg = Math.round(this.sessionState.totals.heartRate.sum / this.sessionState.totals.heartRate.count);
        
        if (typeof updateHeartRateDisplay === 'function') {
            updateHeartRateDisplay(heartRate);
        }
    }

    // Gear management
    changeGear(direction) {
        const newGear = Math.max(1, Math.min(8, this.sessionState.currentGear + direction));
        if (newGear !== this.sessionState.currentGear) {
            this.setGear(newGear);
        }
    }

    setGear(gearNumber) {
        this.sessionState.currentGear = gearNumber;
        this.sessionState.resistance = this.resistanceMap[gearNumber];
        
        // Set resistance on KICKR
        if (this.sensorData.kickr && this.sensorData.kickr.controlPoint) {
            this.setKickrResistance(this.sessionState.resistance);
        }
        
        if (typeof updateGearDisplay === 'function') {
            updateGearDisplay(gearNumber);
        }
        
        console.log(`Gear: ${gearNumber}, Resistance: ${this.sessionState.resistance}%`);
    }

    async setKickrResistance(resistancePercent) {
        if (!this.sensorData.kickr || !this.sensorData.kickr.controlPoint) return;
        
        try {
            // FTMS Set Target Resistance Level
            const buffer = new ArrayBuffer(3);
            const view = new DataView(buffer);
            view.setUint8(0, 0x04); // Set Target Resistance Level opcode
            view.setInt16(1, resistancePercent * 10, true); // Resistance in 0.1% units
            
            await this.sensorData.kickr.controlPoint.writeValue(buffer);
            console.log(`Resistance set to ${resistancePercent}%`);
        } catch (error) {
            console.error('Failed to set resistance:', error);
        }
    }

    // Workout file management
    async loadWorkoutFile(fileContent) {
        try {
            // Parse workout file (assuming JSON format)
            const workout = JSON.parse(fileContent);
            this.sessionState.workoutFile = workout;
            this.sessionState.workoutIntervals = workout.intervals || [];
            console.log('Workout file loaded:', workout.name);
            return true;
        } catch (error) {
            console.error('Failed to load workout file:', error);
            return false;
        }
    }

    // Session management
    startSession() {
        this.sessionState.isRunning = true;
        this.sessionState.startTime = Date.now();
        this.sessionState.lapStartTime = Date.now();
        
        // Start warmup with gear 1
        this.setGear(1);
        
        console.log('Session started');
    }

    pauseSession() {
        this.sessionState.isPaused = !this.sessionState.isPaused;
        console.log(this.sessionState.isPaused ? 'Session paused' : 'Session resumed');
        return this.sessionState.isPaused;
    }

    stopSession() {
        this.sessionState.isRunning = false;
        clearInterval(this.sessionState.intervalTimer);
        
        const sessionData = this.exportSessionData();
        console.log('Session stopped', sessionData);
        
        return sessionData;
    }

    // Export session data
    exportSessionData() {
        return {
            user: sessionStorage.getItem('currentUser'),
            startTime: new Date(this.sessionState.startTime),
            duration: this.sessionState.elapsedTime,
            laps: this.sessionState.laps,
            metrics: this.sessionState.metrics,
            totals: this.sessionState.totals,
            timestamp: new Date()
        };
    }

    // Convert to CSV
    exportToCSV() {
        const data = this.exportSessionData();
        let csv = 'Timestamp,Power(W),HeartRate(bpm),Cadence(rpm),Gear,Resistance(%)\n';
        
        for (let i = 0; i < data.metrics.timestamps.length; i++) {
            const timestamp = data.metrics.timestamps[i] || new Date();
            const power = data.metrics.power[i] || 0;
            const hr = data.metrics.heartRate[i] || 0;
            const cadence = data.metrics.cadence[i] || 0;
            
            csv += `${timestamp.toISOString()},${power},${hr},${cadence},${this.sessionState.currentGear},${this.sessionState.resistance}\n`;
        }
        
        return csv;
    }

    // Email workout file
    async emailWorkoutFile(email, csvData) {
        try {
            // This would normally send to your backend
            const response = await fetch('https://your-backend.com/email-workout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: email || 'support@divergentbiz.com',
                    subject: `Workout Session - ${new Date().toLocaleDateString()}`,
                    csvData: csvData
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Failed to email workout:', error);
            return false;
        }
    }
}

// Export for use
window.WorkoutSessionManager = WorkoutSessionManager;
