// Session Manager - Handles training session lifecycle
// Professional training session management based on cycling app patterns

class SessionManager extends EventEmitter {
    constructor() {
        super();
        this.activeSessions = new Map();
        this.sessionCounter = 0;
    }

    async startSession(config) {
        const sessionId = this.generateSessionId();
        
        const session = new TrainingSession({
            id: sessionId,
            type: config.type || 'custom',
            startTime: config.startTime || new Date().toISOString(),
            userId: config.userId,
            status: 'active'
        });

        this.activeSessions.set(sessionId, session);
        
        // Start session data collection
        session.start();
        
        this.emit('sessionStarted', session);
        
        console.log(`🎯 Training session started: ${sessionId}`);
        return session;
    }

    async pauseSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.pause();
        this.emit('sessionPaused', session);
        
        console.log(`⏸️ Training session paused: ${sessionId}`);
        return session;
    }

    async resumeSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.resume();
        this.emit('sessionResumed', session);
        
        console.log(`▶️ Training session resumed: ${sessionId}`);
        return session;
    }

    async stopSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        // Stop data collection and finalize session
        session.stop();
        
        // Remove from active sessions
        this.activeSessions.delete(sessionId);
        
        this.emit('sessionStopped', session);
        
        console.log(`⏹️ Training session stopped: ${sessionId}`);
        return session.getSessionData();
    }

    getActiveSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }

    getAllActiveSessions() {
        return Array.from(this.activeSessions.values());
    }

    generateSessionId() {
        return `session_${Date.now()}_${++this.sessionCounter}`;
    }
}

class TrainingSession {
    constructor(config) {
        this.id = config.id;
        this.type = config.type;
        this.startTime = new Date(config.startTime);
        this.endTime = null;
        this.userId = config.userId;
        this.status = 'created'; // created, active, paused, stopped
        
        // Session data
        this.dataPoints = [];
        this.intervals = [];
        this.pausedDuration = 0;
        this.pausedAt = null;
        
        // Metrics tracking
        this.metrics = {
            duration: 0,
            distance: 0,
            totalEnergy: 0,
            avgPower: 0,
            maxPower: 0,
            avgHeartRate: 0,
            maxHeartRate: 0,
            avgCadence: 0,
            maxCadence: 0,
            avgSpeed: 0,
            maxSpeed: 0,
            normalizedPower: 0,
            intensityFactor: 0,
            trainingStressScore: 0
        };
        
        // Power data for analysis
        this.powerData = [];
        this.heartRateData = [];
        this.cadenceData = [];
        this.speedData = [];
        
        // Training zones time
        this.powerZones = {
            zone1: 0, // Active Recovery
            zone2: 0, // Endurance
            zone3: 0, // Tempo
            zone4: 0, // Lactate Threshold
            zone5: 0, // VO2 Max
            zone6: 0, // Anaerobic Capacity
            zone7: 0  // Neuromuscular Power
        };
        
        this.heartRateZones = {
            zone1: 0,
            zone2: 0,
            zone3: 0,
            zone4: 0,
            zone5: 0
        };
    }

    start() {
        this.status = 'active';
        this.actualStartTime = new Date();
        console.log(`🎯 Session ${this.id} started at ${this.actualStartTime.toISOString()}`);
    }

    pause() {
        if (this.status === 'active') {
            this.status = 'paused';
            this.pausedAt = new Date();
            console.log(`⏸️ Session ${this.id} paused`);
        }
    }

    resume() {
        if (this.status === 'paused' && this.pausedAt) {
            this.status = 'active';
            this.pausedDuration += Date.now() - this.pausedAt.getTime();
            this.pausedAt = null;
            console.log(`▶️ Session ${this.id} resumed`);
        }
    }

    stop() {
        this.status = 'stopped';
        this.endTime = new Date();
        
        // Calculate final metrics
        this.calculateFinalMetrics();
        
        console.log(`⏹️ Session ${this.id} stopped at ${this.endTime.toISOString()}`);
    }

    addDataPoint(data) {
        if (this.status !== 'active') return;

        const timestamp = new Date();
        const dataPoint = {
            timestamp: timestamp.toISOString(),
            time: Math.floor((timestamp.getTime() - this.actualStartTime.getTime() - this.pausedDuration) / 1000),
            ...data
        };

        this.dataPoints.push(dataPoint);
        
        // Update real-time metrics
        this.updateMetrics(dataPoint);
        
        // Store data for analysis
        if (data.power !== undefined) this.powerData.push({ time: dataPoint.time, value: data.power });
        if (data.heartRate !== undefined) this.heartRateData.push({ time: dataPoint.time, value: data.heartRate });
        if (data.cadence !== undefined) this.cadenceData.push({ time: dataPoint.time, value: data.cadence });
        if (data.speed !== undefined) this.speedData.push({ time: dataPoint.time, value: data.speed });
        
        // Update training zones
        this.updateTrainingZones(dataPoint);
    }

    updateMetrics(dataPoint) {
        const currentTime = dataPoint.time;
        
        // Duration
        this.metrics.duration = currentTime;
        
        // Distance
        if (dataPoint.distance !== undefined) {
            this.metrics.distance = dataPoint.distance;
        }
        
        // Power metrics
        if (dataPoint.power !== undefined && dataPoint.power > 0) {
            this.metrics.maxPower = Math.max(this.metrics.maxPower, dataPoint.power);
            
            // Calculate average power
            const validPowerData = this.powerData.filter(p => p.value > 0);
            if (validPowerData.length > 0) {
                const sum = validPowerData.reduce((acc, p) => acc + p.value, 0);
                this.metrics.avgPower = Math.round(sum / validPowerData.length);
            }
        }
        
        // Heart rate metrics
        if (dataPoint.heartRate !== undefined && dataPoint.heartRate > 0) {
            this.metrics.maxHeartRate = Math.max(this.metrics.maxHeartRate, dataPoint.heartRate);
            
            // Calculate average heart rate
            if (this.heartRateData.length > 0) {
                const sum = this.heartRateData.reduce((acc, hr) => acc + hr.value, 0);
                this.metrics.avgHeartRate = Math.round(sum / this.heartRateData.length);
            }
        }
        
        // Cadence metrics
        if (dataPoint.cadence !== undefined && dataPoint.cadence > 0) {
            this.metrics.maxCadence = Math.max(this.metrics.maxCadence, dataPoint.cadence);
            
            // Calculate average cadence
            const validCadenceData = this.cadenceData.filter(c => c.value > 0);
            if (validCadenceData.length > 0) {
                const sum = validCadenceData.reduce((acc, c) => acc + c.value, 0);
                this.metrics.avgCadence = Math.round(sum / validCadenceData.length);
            }
        }
        
        // Speed metrics
        if (dataPoint.speed !== undefined && dataPoint.speed > 0) {
            this.metrics.maxSpeed = Math.max(this.metrics.maxSpeed, dataPoint.speed);
            
            // Calculate average speed
            const validSpeedData = this.speedData.filter(s => s.value > 0);
            if (validSpeedData.length > 0) {
                const sum = validSpeedData.reduce((acc, s) => acc + s.value, 0);
                this.metrics.avgSpeed = parseFloat((sum / validSpeedData.length).toFixed(1));
            }
        }
    }

    updateTrainingZones(dataPoint) {
        // Update power zones (requires user FTP)
        if (dataPoint.power !== undefined && dataPoint.power > 0) {
            const userFTP = 250; // Should come from user profile
            const powerPercent = (dataPoint.power / userFTP) * 100;
            
            let zone = 'zone1';
            if (powerPercent >= 150) zone = 'zone7';
            else if (powerPercent >= 120) zone = 'zone6';
            else if (powerPercent >= 105) zone = 'zone5';
            else if (powerPercent >= 90) zone = 'zone4';
            else if (powerPercent >= 76) zone = 'zone3';
            else if (powerPercent >= 56) zone = 'zone2';
            
            this.powerZones[zone] += 1; // Increment by 1 second
        }
        
        // Update heart rate zones (requires user max HR)
        if (dataPoint.heartRate !== undefined && dataPoint.heartRate > 0) {
            const maxHR = 185; // Should come from user profile
            const hrPercent = (dataPoint.heartRate / maxHR) * 100;
            
            let zone = 'zone1';
            if (hrPercent >= 90) zone = 'zone5';
            else if (hrPercent >= 80) zone = 'zone4';
            else if (hrPercent >= 70) zone = 'zone3';
            else if (hrPercent >= 60) zone = 'zone2';
            
            this.heartRateZones[zone] += 1;
        }
    }

    calculateFinalMetrics() {
        if (this.powerData.length === 0) return;
        
        // Calculate Normalized Power (NP)
        this.metrics.normalizedPower = this.calculateNormalizedPower();
        
        // Calculate Intensity Factor (IF)
        const userFTP = 250; // Should come from user profile
        if (userFTP > 0) {
            this.metrics.intensityFactor = parseFloat((this.metrics.normalizedPower / userFTP).toFixed(3));
        }
        
        // Calculate Training Stress Score (TSS)
        if (this.metrics.normalizedPower > 0 && this.metrics.duration > 0) {
            const hours = this.metrics.duration / 3600;
            this.metrics.trainingStressScore = Math.round(
                (this.metrics.duration * this.metrics.normalizedPower * this.metrics.intensityFactor) / (userFTP * 36)
            );
        }
        
        // Calculate total energy (kJ)
        if (this.metrics.avgPower > 0) {
            this.metrics.totalEnergy = Math.round((this.metrics.avgPower * this.metrics.duration) / 1000);
        }
    }

    calculateNormalizedPower() {
        if (this.powerData.length === 0) return 0;
        
        // 30-second rolling average
        const rollingAverages = [];
        const windowSize = 30;
        
        for (let i = 0; i <= this.powerData.length - windowSize; i++) {
            const window = this.powerData.slice(i, i + windowSize);
            const avg = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
            rollingAverages.push(avg);
        }
        
        // Raise to 4th power, average, then take 4th root
        if (rollingAverages.length === 0) return 0;
        
        const fourthPowers = rollingAverages.map(avg => Math.pow(avg, 4));
        const avgFourthPower = fourthPowers.reduce((sum, p) => sum + p, 0) / fourthPowers.length;
        
        return Math.round(Math.pow(avgFourthPower, 0.25));
    }

    getSessionData() {
        return {
            id: this.id,
            type: this.type,
            startTime: this.startTime.toISOString(),
            endTime: this.endTime ? this.endTime.toISOString() : null,
            actualStartTime: this.actualStartTime ? this.actualStartTime.toISOString() : null,
            userId: this.userId,
            status: this.status,
            metrics: { ...this.metrics },
            powerZones: { ...this.powerZones },
            heartRateZones: { ...this.heartRateZones },
            dataPoints: [...this.dataPoints],
            powerData: [...this.powerData],
            heartRateData: [...this.heartRateData],
            cadenceData: [...this.cadenceData],
            speedData: [...this.speedData],
            pausedDuration: this.pausedDuration,
            createdAt: new Date().toISOString()
        };
    }

    // Get summary for display
    getSummary() {
        return {
            id: this.id,
            type: this.type,
            duration: Math.round(this.metrics.duration / 60), // minutes
            distance: this.metrics.distance,
            avgPower: this.metrics.avgPower,
            maxPower: this.metrics.maxPower,
            avgHeartRate: this.metrics.avgHeartRate,
            maxHeartRate: this.metrics.maxHeartRate,
            normalizedPower: this.metrics.normalizedPower,
            intensityFactor: this.metrics.intensityFactor,
            trainingStressScore: this.metrics.trainingStressScore,
            totalEnergy: this.metrics.totalEnergy,
            startTime: this.startTime.toISOString()
        };
    }

    // Export to common formats
    exportToFIT() {
        // TODO: Implement FIT file export for Strava/Garmin Connect
        console.log('FIT export not yet implemented');
    }

    exportToTCX() {
        // TODO: Implement TCX export for TrainingPeaks
        console.log('TCX export not yet implemented');
    }

    exportToGPX() {
        // TODO: Implement GPX export (if GPS data available)
        console.log('GPX export not yet implemented');
    }

    get isPaused() {
        return this.status === 'paused';
    }

    get isActive() {
        return this.status === 'active';
    }

    get isStopped() {
        return this.status === 'stopped';
    }
}