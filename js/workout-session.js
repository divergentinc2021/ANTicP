// Workout Session Manager
class WorkoutSessionManager {
    constructor() {
        this.sessionData = {
            user: sessionStorage.getItem('currentUser') || 'Guest',
            startTime: null,
            endTime: null,
            isPaused: false,
            currentLap: 0,
            laps: [],
            workoutFile: null,
            intervals: [],
            currentInterval: 0,
            metrics: {
                power: [],
                heartRate: [],
                cadence: [],
                speed: [],
                timestamps: []
            },
            gearChanges: [],
            emailSent: false
        };
        
        this.sensorManager = null;
        this.intervalTimer = null;
        this.metricsTimer = null;
    }

    // Initialize session
    async initialize() {
        // Initialize sensor manager
        this.sensorManager = new SensorManager();
        
        // Set up callbacks
        this.sensorManager.setCallbacks({
            onPowerUpdate: (power) => this.updatePower(power),
            onCadenceUpdate: (cadence) => this.updateCadence(cadence),
            onSpeedUpdate: (speed) => this.updateSpeed(speed),
            onHeartRateUpdate: (hr) => this.updateHeartRate(hr),
            onGearChange: (gear, resistance) => this.handleGearChange(gear, resistance)
        });
        
        // Check for email-received workout files
        await this.checkForWorkoutFiles();
    }

    // Check for workout files from email
    async checkForWorkoutFiles() {
        try {
            // This would connect to your email service API
            // For now, we'll simulate with localStorage
            const workoutFiles = localStorage.getItem('workoutFiles');
            if (workoutFiles) {
                this.sessionData.workoutFile = JSON.parse(workoutFiles);
                this.parseWorkoutFile();
            }
        } catch (error) {
            console.error('Error checking for workout files:', error);
        }
    }

    // Parse workout file (seconds file format)
    parseWorkoutFile() {
        if (!this.sessionData.workoutFile) return;
        
        // Parse the workout structure
        // Expected format: array of intervals with duration and target power/zones
        this.sessionData.intervals = this.sessionData.workoutFile.intervals || [];
        
        console.log('Workout file loaded:', this.sessionData.intervals.length, 'intervals');
    }

    // Start warmup
    startWarmup() {
        this.sessionData.startTime = Date.now();
        this.sessionData.currentLap = 1;
        
        // Create warmup lap
        const warmupLap = {
            number: 1,
            type: 'warmup',
            startTime: Date.now(),
            endTime: null,
            metrics: {
                power: [],
                heartRate: [],
                cadence: [],
                speed: []
            }
        };
        
        this.sessionData.laps.push(warmupLap);
        
        // Set resistance to -5 for warmup
        if (this.sensorManager && this.sensorManager.isConnected.kickr) {
            this.sensorManager.setResistance(-5);
        }
        
        // Start collecting metrics
        this.startMetricsCollection();
        
        return warmupLap;
    }

    // Complete warmup and start main workout
    async startMainWorkout() {
        // Complete warmup lap
        const warmupLap = this.sessionData.laps[0];
        if (warmupLap) {
            warmupLap.endTime = Date.now();
            warmupLap.duration = (warmupLap.endTime - warmupLap.startTime) / 1000;
            
            // Calculate averages
            this.calculateLapAverages(warmupLap);
        }
        
        // Start automated intervals if workout file exists
        if (this.sessionData.intervals.length > 0) {
            this.startAutomatedIntervals();
        } else {
            // Manual lap mode
            this.startManualLap();
        }
    }

    // Start automated intervals
    startAutomatedIntervals() {
        this.sessionData.currentInterval = 0;
        this.processNextInterval();
    }

    // Process next interval
    processNextInterval() {
        if (this.sessionData.currentInterval >= this.sessionData.intervals.length) {
            // All intervals complete, start cooldown
            this.startCooldown();
            return;
        }
        
        const interval = this.sessionData.intervals[this.sessionData.currentInterval];
        
        // Create new lap for this interval
        const lap = {
            number: this.sessionData.currentLap + 1,
            type: 'interval',
            intervalData: interval,
            startTime: Date.now(),
            endTime: null,
            targetPower: interval.targetPower || 0,
            targetZone: interval.zone || 'tempo',
            duration: interval.duration || 60,
            metrics: {
                power: [],
                heartRate: [],
                cadence: [],
                speed: []
            }
        };
        
        this.sessionData.laps.push(lap);
        this.sessionData.currentLap++;
        
        // Set resistance based on interval
        if (interval.resistance !== undefined && this.sensorManager) {
            this.sensorManager.setResistance(interval.resistance);
        }
        
        // Update UI to show current interval
        this.updateIntervalDisplay(interval);
        
        // Set timer for next interval
        this.intervalTimer = setTimeout(() => {
            this.completeCurrentInterval();
        }, interval.duration * 1000);
    }

    // Complete current interval
    completeCurrentInterval() {
        const currentLap = this.sessionData.laps[this.sessionData.laps.length - 1];
        if (currentLap) {
            currentLap.endTime = Date.now();
            currentLap.actualDuration = (currentLap.endTime - currentLap.startTime) / 1000;
            
            // Calculate averages
            this.calculateLapAverages(currentLap);
        }
        
        // Move to next interval
        this.sessionData.currentInterval++;
        this.processNextInterval();
    }

    // Start cooldown
    startCooldown() {
        const cooldownLap = {
            number: this.sessionData.currentLap + 1,
            type: 'cooldown',
            startTime: Date.now(),
            endTime: null,
            metrics: {
                power: [],
                heartRate: [],
                cadence: [],
                speed: []
            }
        };
        
        this.sessionData.laps.push(cooldownLap);
        this.sessionData.currentLap++;
        
        // Set resistance to -5 for cooldown
        if (this.sensorManager && this.sensorManager.isConnected.kickr) {
            this.sensorManager.setResistance(-5);
        }
        
        // Cooldown for 5 minutes
        setTimeout(() => {
            this.completeCooldown();
        }, 5 * 60 * 1000);
    }

    // Complete cooldown
    completeCooldown() {
        const cooldownLap = this.sessionData.laps[this.sessionData.laps.length - 1];
        if (cooldownLap) {
            cooldownLap.endTime = Date.now();
            cooldownLap.duration = (cooldownLap.endTime - cooldownLap.startTime) / 1000;
            
            // Calculate averages
            this.calculateLapAverages(cooldownLap);
        }
        
        // Session complete
        this.completeSession();
    }

    // Start manual lap
    startManualLap() {
        const lap = {
            number: this.sessionData.currentLap + 1,
            type: 'manual',
            startTime: Date.now(),
            endTime: null,
            metrics: {
                power: [],
                heartRate: [],
                cadence: [],
                speed: []
            }
        };
        
        this.sessionData.laps.push(lap);
        this.sessionData.currentLap++;
    }

    // Complete manual lap
    completeManualLap() {
        const currentLap = this.sessionData.laps[this.sessionData.laps.length - 1];
        if (currentLap && currentLap.type === 'manual') {
            currentLap.endTime = Date.now();
            currentLap.duration = (currentLap.endTime - currentLap.startTime) / 1000;
            
            // Calculate averages
            this.calculateLapAverages(currentLap);
            
            // Start new manual lap
            this.startManualLap();
        }
    }

    // Start metrics collection
    startMetricsCollection() {
        this.metricsTimer = setInterval(() => {
            if (!this.sessionData.isPaused) {
                this.collectMetrics();
            }
        }, 1000); // Collect every second
    }

    // Collect current metrics
    collectMetrics() {
        const timestamp = Date.now();
        const currentLap = this.sessionData.laps[this.sessionData.laps.length - 1];
        
        // Get current sensor data
        const sensorData = this.sensorManager ? this.sensorManager.getData() : {
            power: 0,
            heartRate: 0,
            cadence: 0,
            speed: 0
        };
        
        // Store in session metrics
        this.sessionData.metrics.timestamps.push(timestamp);
        this.sessionData.metrics.power.push(sensorData.power);
        this.sessionData.metrics.heartRate.push(sensorData.heartRate);
        this.sessionData.metrics.cadence.push(sensorData.cadence);
        this.sessionData.metrics.speed.push(sensorData.speed);
        
        // Store in current lap metrics
        if (currentLap) {
            currentLap.metrics.power.push(sensorData.power);
            currentLap.metrics.heartRate.push(sensorData.heartRate);
            currentLap.metrics.cadence.push(sensorData.cadence);
            currentLap.metrics.speed.push(sensorData.speed);
        }
    }

    // Calculate lap averages
    calculateLapAverages(lap) {
        const calculate = (arr) => {
            if (arr.length === 0) return 0;
            return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        };
        
        lap.averages = {
            power: calculate(lap.metrics.power),
            heartRate: calculate(lap.metrics.heartRate),
            cadence: calculate(lap.metrics.cadence),
            speed: calculate(lap.metrics.speed)
        };
        
        lap.max = {
            power: Math.max(...lap.metrics.power),
            heartRate: Math.max(...lap.metrics.heartRate),
            cadence: Math.max(...lap.metrics.cadence),
            speed: Math.max(...lap.metrics.speed)
        };
    }

    // Update metrics displays
    updatePower(power) {
        // Update UI
        const powerEl = document.getElementById('currentPower');
        if (powerEl) powerEl.textContent = power;
    }

    updateCadence(cadence) {
        const cadenceEl = document.getElementById('currentCadence');
        if (cadenceEl) cadenceEl.textContent = cadence;
    }

    updateSpeed(speed) {
        const speedKmh = (speed * 3.6).toFixed(1);
        // Update distance calculation
        const distance = this.calculateTotalDistance();
        const distanceEl = document.getElementById('distance');
        if (distanceEl) distanceEl.textContent = distance.toFixed(1);
    }

    updateHeartRate(hr) {
        const hrEl = document.getElementById('currentHR');
        if (hrEl) hrEl.textContent = hr;
        
        // Calculate HR percentage (assuming max HR of 190)
        const maxHR = 190;
        const percentage = Math.round((hr / maxHR) * 100);
        const percentEl = document.getElementById('hrPercent');
        if (percentEl) percentEl.textContent = percentage;
    }

    handleGearChange(gear, resistance) {
        // Log gear change
        this.sessionData.gearChanges.push({
            timestamp: Date.now(),
            gear: gear,
            resistance: resistance
        });
        
        // Update UI
        document.querySelectorAll('.gear-indicator').forEach(indicator => {
            indicator.classList.remove('active');
        });
        const activeGear = document.querySelector(`.gear-indicator[data-gear="${gear}"]`);
        if (activeGear) activeGear.classList.add('active');
    }

    // Calculate total distance
    calculateTotalDistance() {
        if (this.sessionData.metrics.speed.length === 0) return 0;
        
        // Distance = sum of (speed * time_interval)
        let distance = 0;
        for (let i = 1; i < this.sessionData.metrics.speed.length; i++) {
            const speed = this.sessionData.metrics.speed[i]; // m/s
            const timeInterval = 1; // 1 second
            distance += (speed * timeInterval) / 1000; // Convert to km
        }
        
        return distance;
    }

    // Pause/Resume session
    togglePause() {
        this.sessionData.isPaused = !this.sessionData.isPaused;
        
        if (this.sessionData.isPaused && this.intervalTimer) {
            clearTimeout(this.intervalTimer);
        }
        
        return this.sessionData.isPaused;
    }

    // Stop and save session
    async stopSession() {
        // Clear timers
        if (this.intervalTimer) clearTimeout(this.intervalTimer);
        if (this.metricsTimer) clearInterval(this.metricsTimer);
        
        // Complete current lap
        const currentLap = this.sessionData.laps[this.sessionData.laps.length - 1];
        if (currentLap && !currentLap.endTime) {
            currentLap.endTime = Date.now();
            currentLap.duration = (currentLap.endTime - currentLap.startTime) / 1000;
            this.calculateLapAverages(currentLap);
        }
        
        this.sessionData.endTime = Date.now();
        
        // Save to CSV
        const csvData = this.exportToCSV();
        
        // Convert to FIT
        const fitData = await this.convertToFIT();
        
        // Save session
        this.saveSession(csvData, fitData);
        
        return { csv: csvData, fit: fitData };
    }

    // Export to CSV
    exportToCSV() {
        let csv = 'Timestamp,ElapsedTime,Power,HeartRate,Cadence,Speed,Gear,Lap\n';
        
        for (let i = 0; i < this.sessionData.metrics.timestamps.length; i++) {
            const timestamp = this.sessionData.metrics.timestamps[i];
            const elapsedTime = (timestamp - this.sessionData.startTime) / 1000;
            const power = this.sessionData.metrics.power[i];
            const hr = this.sessionData.metrics.heartRate[i];
            const cadence = this.sessionData.metrics.cadence[i];
            const speed = this.sessionData.metrics.speed[i];
            
            // Find current gear at this timestamp
            let currentGear = 1;
            for (const change of this.sessionData.gearChanges) {
                if (change.timestamp <= timestamp) {
                    currentGear = change.gear;
                }
            }
            
            // Find current lap
            let currentLap = 0;
            for (const lap of this.sessionData.laps) {
                if (timestamp >= lap.startTime && (!lap.endTime || timestamp <= lap.endTime)) {
                    currentLap = lap.number;
                    break;
                }
            }
            
            csv += `${timestamp},${elapsedTime.toFixed(0)},${power},${hr},${cadence},${speed.toFixed(2)},${currentGear},${currentLap}\n`;
        }
        
        return csv;
    }

    // Convert to FIT file
    async convertToFIT() {
        // This would implement FIT file generation
        // For now, return a placeholder
        const fitData = {
            fileId: {
                type: 'activity',
                manufacturer: 'grannygear',
                product: 1,
                timeCreated: this.sessionData.startTime
            },
            activity: {
                timestamp: this.sessionData.startTime,
                totalTimerTime: (this.sessionData.endTime - this.sessionData.startTime) / 1000,
                numSessions: 1,
                type: 'cycling'
            },
            session: {
                startTime: this.sessionData.startTime,
                totalElapsedTime: (this.sessionData.endTime - this.sessionData.startTime) / 1000,
                totalDistance: this.calculateTotalDistance() * 1000, // meters
                sport: 'cycling'
            },
            laps: this.sessionData.laps.map(lap => ({
                startTime: lap.startTime,
                totalElapsedTime: lap.duration,
                avgPower: lap.averages?.power || 0,
                maxPower: lap.max?.power || 0,
                avgHeartRate: lap.averages?.heartRate || 0,
                maxHeartRate: lap.max?.heartRate || 0,
                avgCadence: lap.averages?.cadence || 0,
                maxCadence: lap.max?.cadence || 0
            })),
            records: this.sessionData.metrics.timestamps.map((timestamp, i) => ({
                timestamp: timestamp,
                power: this.sessionData.metrics.power[i],
                heartRate: this.sessionData.metrics.heartRate[i],
                cadence: this.sessionData.metrics.cadence[i],
                speed: this.sessionData.metrics.speed[i]
            }))
        };
        
        return fitData;
    }

    // Save session
    saveSession(csvData, fitData) {
        // Save to localStorage
        const sessions = JSON.parse(localStorage.getItem('workoutSessions') || '[]');
        sessions.push({
            user: this.sessionData.user,
            date: new Date().toISOString(),
            duration: (this.sessionData.endTime - this.sessionData.startTime) / 1000,
            csvData: csvData,
            fitData: fitData,
            summary: {
                laps: this.sessionData.laps.length,
                avgPower: this.calculateSessionAverage('power'),
                avgHeartRate: this.calculateSessionAverage('heartRate'),
                avgCadence: this.calculateSessionAverage('cadence'),
                distance: this.calculateTotalDistance()
            }
        });
        
        localStorage.setItem('workoutSessions', JSON.stringify(sessions));
        
        // Send email with FIT file
        this.sendEmailWithFIT(fitData);
    }

    // Calculate session average
    calculateSessionAverage(metric) {
        const data = this.sessionData.metrics[metric];
        if (data.length === 0) return 0;
        return Math.round(data.reduce((a, b) => a + b, 0) / data.length);
    }

    // Send email with FIT file
    async sendEmailWithFIT(fitData) {
        try {
            // This would connect to your email service
            // For now, we'll simulate
            console.log('Sending FIT file to user email...');
            
            // You would implement actual email sending here
            // using an email service API
            
            this.sessionData.emailSent = true;
        } catch (error) {
            console.error('Failed to send email:', error);
        }
    }

    // Update interval display
    updateIntervalDisplay(interval) {
        // Update UI to show current interval info
        console.log('Current interval:', interval);
    }

    // Complete session
    completeSession() {
        this.stopSession();
        alert('Workout complete! Your session has been saved and a FIT file will be emailed to you.');
        window.location.href = 'pedal.html';
    }
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.WorkoutSessionManager = WorkoutSessionManager;
}
