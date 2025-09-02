// Workout Session Controller - Uses working sensor code from index.html
class WorkoutSessionController {
    constructor() {
        // Sensor manager
        this.sensorManager = new WorkingSensorManager();
        
        // Zone configuration - matching index.html
        this.zones = [
            { id: 1, name: 'Recovery', resistance: -5, ftpRange: '50-60%', cadence: '80+', color: '#4CAF50' },
            { id: 2, name: 'Endurance', resistance: 0, ftpRange: '60-75%', cadence: '85-95', color: '#8BC34A' },
            { id: 3, name: 'Tempo', resistance: 5, ftpRange: '75-85%', cadence: '85-95', color: '#FFEB3B' },
            { id: 4, name: 'Threshold', resistance: 10, ftpRange: '85-95%', cadence: '85-95', color: '#FFC107' },
            { id: 5, name: 'VO2 Max', resistance: 15, ftpRange: '95-105%', cadence: '90+', color: '#FF9800' },
            { id: 6, name: 'Anaerobic', resistance: 20, ftpRange: '105-120%', cadence: '90+', color: '#FF5722' },
            { id: 7, name: 'Neuromuscular', resistance: 25, ftpRange: '120-150%', cadence: '95+', color: '#F44336' },
            { id: 8, name: 'Sprint', resistance: 30, ftpRange: '150%+', cadence: '100+', color: '#9C27B0' }
        ];
        
        // Session state
        this.state = {
            isRunning: false,
            isPaused: false,
            currentZone: 1,
            lapType: 'warmup',
            lapCount: 0,
            startTime: null,
            lapStartTime: null,
            elapsedTime: 0,
            autoMode: false
        };
        
        // Metrics tracking
        this.sessionMetrics = {
            power: [],
            heartRate: [],
            cadence: [],
            speed: [],
            timestamps: []
        };
        
        this.lapData = [];
        
        // Chart instance
        this.chart = null;
        
        // Timers
        this.timerInterval = null;
    }
    
    async initialize() {
        // Display username
        const username = sessionStorage.getItem('currentUser') || 'Guest';
        document.getElementById('usernameDisplay').textContent = username;
        
        // Initialize chart
        this.initChart();
        
        // Set up sensor callbacks
        this.sensorManager.setCallbacks({
            onPowerUpdate: (power) => this.updatePower(power),
            onCadenceUpdate: (cadence) => this.updateCadence(cadence),
            onHeartRateUpdate: (hr) => this.updateHeartRate(hr),
            onSpeedUpdate: (speed) => this.updateSpeed(speed),
            onButtonPress: (button) => this.handleButtonPress(button)
        });
        
        // Set up zone click handlers
        document.querySelectorAll('.zone-indicator').forEach(zone => {
            zone.addEventListener('click', (e) => {
                this.setZone(parseInt(e.target.dataset.zone));
            });
        });
        
        // Try to connect sensors from session
        await this.connectSensorsFromSession();
        
        // Start in zone 1 (warmup)
        this.setZone(1);
        
        console.log('✅ Workout session initialized');
    }
    
    async connectSensorsFromSession() {
        const sensorsConnected = JSON.parse(sessionStorage.getItem('sensorsConnected') || '{}');
        
        if (sensorsConnected.kickr) {
            try {
                await this.sensorManager.connectTrainer();
                this.showNotification('success', '✅ KICKR Core connected');
            } catch (error) {
                console.log('Could not connect KICKR:', error);
            }
        }
        
        if (sensorsConnected.zwift) {
            try {
                await this.sensorManager.connectZwiftClick();
                this.showNotification('success', '✅ Zwift Click connected');
            } catch (error) {
                console.log('Could not connect Zwift Click:', error);
            }
        }
        
        if (sensorsConnected.heart) {
            try {
                await this.sensorManager.connectHeartRate();
                this.showNotification('success', '✅ Heart Rate connected');
            } catch (error) {
                console.log('Could not connect Heart Rate:', error);
            }
        }
    }
    
    // Zone management
    setZone(zoneId) {
        this.state.currentZone = zoneId;
        const zone = this.zones.find(z => z.id === zoneId);
        
        // Update display
        document.querySelectorAll('.zone-indicator').forEach(indicator => {
            indicator.classList.toggle('active', parseInt(indicator.dataset.zone) === zoneId);
        });
        
        document.getElementById('zone-name').textContent = `Zone ${zone.id} - ${zone.name}`;
        document.getElementById('zone-resistance').textContent = `${zone.resistance}%`;
        document.getElementById('zone-power').textContent = zone.ftpRange;
        document.getElementById('zone-cadence').textContent = zone.cadence;
        
        // Set resistance on trainer
        this.sensorManager.setResistance(zone.resistance + 50); // Convert to 0-100 scale
        
        this.showNotification('info', `Zone ${zoneId}: ${zone.name} (${zone.resistance}% resistance)`);
        console.log(`🎯 Zone ${zoneId} - ${zone.name} (Resistance: ${zone.resistance}%)`);
    }
    
    cycleZone() {
        const nextZone = this.state.currentZone >= 8 ? 1 : this.state.currentZone + 1;
        this.setZone(nextZone);
    }
    
    // Button handling
    handleButtonPress(button) {
        if (button === 'up') {
            if (this.state.autoMode) {
                // AUTO MODE: Increase resistance by 5%
                const currentResistance = this.sensorManager.metrics.resistance;
                this.sensorManager.setResistance(Math.min(100, currentResistance + 5));
                this.showNotification('info', `Resistance +5% (${currentResistance + 5}%)`);
            } else {
                // MANUAL MODE: Cycle zones
                this.cycleZone();
            }
        } else if (button === 'down') {
            if (this.state.autoMode) {
                // AUTO MODE: Decrease resistance by 5%
                const currentResistance = this.sensorManager.metrics.resistance;
                this.sensorManager.setResistance(Math.max(0, currentResistance - 5));
                this.showNotification('info', `Resistance -5% (${currentResistance - 5}%)`);
            } else {
                // MANUAL MODE: Trigger lap
                this.triggerLap();
            }
        }
    }
    
    // Metric updates
    updatePower(power) {
        document.getElementById('power').textContent = power;
        this.addMetricToChart('power', power);
    }
    
    updateCadence(cadence) {
        document.getElementById('cadence').textContent = cadence;
        this.addMetricToChart('cadence', cadence);
    }
    
    updateHeartRate(heartRate) {
        document.getElementById('heartRate').textContent = heartRate;
        this.addMetricToChart('heartRate', heartRate);
    }
    
    updateSpeed(speed) {
        document.getElementById('speed').textContent = speed.toFixed(1);
    }
    
    // Chart management
    initChart() {
        const ctx = document.getElementById('metricsChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Power (W)',
                        data: [],
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        borderWidth: 2,
                        tension: 0.3
                    },
                    {
                        label: 'Heart Rate (bpm)',
                        data: [],
                        borderColor: '#f44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        borderWidth: 2,
                        tension: 0.3
                    },
                    {
                        label: 'Cadence (rpm)',
                        data: [],
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 2,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    addMetricToChart(metric, value) {
        if (!this.chart) return;
        
        const now = new Date();
        this.sessionMetrics[metric].push(value);
        this.sessionMetrics.timestamps.push(now);
        
        // Keep last 60 data points
        const maxPoints = 60;
        const datasets = {
            power: 0,
            heartRate: 1,
            cadence: 2
        };
        
        if (this.sessionMetrics.timestamps.length > maxPoints) {
            this.sessionMetrics.timestamps.shift();
            this.sessionMetrics.power.shift();
            this.sessionMetrics.heartRate.shift();
            this.sessionMetrics.cadence.shift();
        }
        
        this.chart.data.labels = this.sessionMetrics.timestamps.map(t => 
            t.toLocaleTimeString().substr(0, 5)
        );
        
        this.chart.data.datasets[0].data = this.sessionMetrics.power;
        this.chart.data.datasets[1].data = this.sessionMetrics.heartRate;
        this.chart.data.datasets[2].data = this.sessionMetrics.cadence;
        
        this.chart.update('none');
    }
    
    // Timer management
    startTimer() {
        if (!this.state.startTime) {
            this.state.startTime = Date.now();
            this.state.lapStartTime = Date.now();
        }
        
        this.timerInterval = setInterval(() => {
            if (!this.state.isPaused) {
                this.updateTimer();
            }
        }, 1000);
    }
    
    updateTimer() {
        const elapsed = Date.now() - this.state.startTime;
        const totalSeconds = Math.floor(elapsed / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        document.getElementById('timer').textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            
        // Update lap time
        const lapElapsed = Date.now() - this.state.lapStartTime;
        const lapSeconds = Math.floor(lapElapsed / 1000);
        const lapHours = Math.floor(lapSeconds / 3600);
        const lapMinutes = Math.floor((lapSeconds % 3600) / 60);
        const lapSecs = lapSeconds % 60;
        
        document.getElementById('lapTime').textContent = 
            `${String(lapHours).padStart(2, '0')}:${String(lapMinutes).padStart(2, '0')}:${String(lapSecs).padStart(2, '0')}`;
    }
    
    // Lap management
    triggerLap() {
        this.state.lapCount++;
        
        // Calculate lap averages
        const lapMetrics = {
            avgPower: this.calculateAverage(this.sessionMetrics.power),
            avgHR: this.calculateAverage(this.sessionMetrics.heartRate),
            avgCadence: this.calculateAverage(this.sessionMetrics.cadence)
        };
        
        // Add lap to table
        this.addLapToTable(this.state.lapCount, lapMetrics);
        
        // Reset lap timer
        this.state.lapStartTime = Date.now();
        
        this.showNotification('success', `LAP ${this.state.lapCount} completed`);
        console.log(`🏁 LAP ${this.state.lapCount} triggered`);
    }
    
    addLapToTable(lapNumber, metrics) {
        const tbody = document.getElementById('lapTableBody');
        const row = tbody.insertRow(0);
        row.innerHTML = `
            <td>Lap ${lapNumber}</td>
            <td>${document.getElementById('lapTime').textContent}</td>
            <td>${Math.round(metrics.avgPower)}</td>
            <td>${Math.round(metrics.avgHR)}</td>
            <td>${Math.round(metrics.avgCadence)}</td>
        `;
    }
    
    calculateAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    
    // Session controls
    handleLap() {
        if (!this.state.isRunning) {
            // Start session
            this.state.isRunning = true;
            this.state.lapType = 'warmup';
            this.startTimer();
            document.getElementById('lapBtn').textContent = 'START WORKOUT';
            document.getElementById('sessionStatus').textContent = 'Warmup';
            this.showNotification('success', 'Warmup started');
        } else if (this.state.lapType === 'warmup') {
            // Complete warmup, start workout
            this.triggerLap();
            this.state.lapType = 'workout';
            this.setZone(2); // Move to zone 2 for workout
            document.getElementById('lapBtn').textContent = 'LAP';
            document.getElementById('sessionStatus').textContent = 'Active';
            this.showNotification('success', 'Workout started');
        } else {
            // Normal lap
            this.triggerLap();
        }
    }
    
    pauseSession() {
        if (!this.state.isRunning) return;
        
        this.state.isPaused = !this.state.isPaused;
        document.getElementById('pauseBtn').textContent = this.state.isPaused ? 'RESUME' : 'PAUSE';
        document.getElementById('sessionStatus').textContent = this.state.isPaused ? 'Paused' : 'Active';
        
        this.showNotification('info', this.state.isPaused ? 'Session paused' : 'Session resumed');
    }
    
    stopSession() {
        if (!this.state.isRunning) return;
        
        if (confirm('Stop workout and save session?')) {
            clearInterval(this.timerInterval);
            this.saveSession();
        }
    }
    
    saveSession() {
        const sessionData = {
            user: sessionStorage.getItem('currentUser'),
            startTime: new Date(this.state.startTime),
            duration: Date.now() - this.state.startTime,
            laps: this.state.lapCount,
            metrics: this.sessionMetrics,
            timestamp: new Date()
        };
        
        // Convert to CSV
        let csv = 'Timestamp,Power,HeartRate,Cadence,Speed\n';
        for (let i = 0; i < this.sessionMetrics.timestamps.length; i++) {
            csv += `${this.sessionMetrics.timestamps[i]?.toISOString() || ''},`;
            csv += `${this.sessionMetrics.power[i] || 0},`;
            csv += `${this.sessionMetrics.heartRate[i] || 0},`;
            csv += `${this.sessionMetrics.cadence[i] || 0},`;
            csv += `${this.sessionMetrics.speed?.[i] || 0}\n`;
        }
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workout_${Date.now()}.csv`;
        a.click();
        
        this.showNotification('success', 'Workout saved!');
        
        setTimeout(() => {
            window.location.href = 'sensor-settings.html';
        }, 2000);
    }
    
    // Utility functions
    showNotification(type, message, duration = 3000) {
        const notification = document.getElementById('notification');
        notification.className = `notification ${type} show`;
        notification.textContent = message;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
}

// Global functions for HTML onclick
let controller;

function toggleSettings() {
    alert('Settings panel - TODO');
}

function signOut() {
    if (confirm('Sign out? Any unsaved data will be lost.')) {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

function stopSession() {
    if (controller) controller.stopSession();
}

function pauseSession() {
    if (controller) controller.pauseSession();
}

function handleLap() {
    if (controller) controller.handleLap();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    controller = new WorkoutSessionController();
    await controller.initialize();
});
