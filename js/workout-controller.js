// Workout Controller - Main control logic for workout session
class WorkoutController {
    constructor() {
        this.sessionManager = null;
        this.sensorManager = null;
        this.chart = null;
        this.timerInterval = null;
        this.metricsInterval = null;
        
        this.state = {
            isRunning: false,
            isPaused: false,
            lapType: 'warmup',
            currentGear: 1,
            resistance: -5,
            startTime: null,
            lapStartTime: null,
            elapsedTime: 0,
            currentLap: 1,
            metrics: {
                power: [],
                heartRate: [],
                cadence: [],
                timestamps: []
            }
        };

        this.gearResistanceMap = {
            1: -5,  // Warmup
            2: 0,   // Easy
            3: 5,   // Moderate
            4: 10,  // Moderate-Hard
            5: 15,  // Hard
            6: 20,  // Very Hard
            7: 25,  // Maximum
            8: 30   // Sprint
        };
    }

    async initialize() {
        // Display username
        const username = sessionStorage.getItem('currentUser') || 'Guest';
        document.getElementById('username').textContent = username;

        // Initialize chart
        this.initChart();

        // Initialize sensor manager
        this.sensorManager = new (window.SensorManager || MockSensorManager)();
        
        // Set up sensor callbacks
        this.sensorManager.setCallbacks({
            onPowerUpdate: (power) => this.updatePower(power),
            onCadenceUpdate: (cadence) => this.updateCadence(cadence),
            onHeartRateUpdate: (hr) => this.updateHeartRate(hr),
            onGearChange: (direction) => this.changeGear(direction)
        });

        // Try to connect sensors or enable simulation
        const sensorsConnected = await this.connectSensors();
        if (!sensorsConnected) {
            console.log('Using simulation mode');
            this.sensorManager.enableSimulation();
        }

        // Set up keyboard controls for testing
        this.setupKeyboardControls();

        // Initialize session manager if available
        if (window.WorkoutSessionManager) {
            this.sessionManager = new WorkoutSessionManager();
        }
    }

    async connectSensors() {
        try {
            // Check if sensors were connected in previous page
            const savedSensors = JSON.parse(sessionStorage.getItem('sensorsConnected') || '{}');
            
            if (savedSensors.kickr && savedSensors.zwift && savedSensors.heart) {
                // Try to reconnect
                await this.sensorManager.connectKickr();
                await this.sensorManager.connectZwiftClick();
                await this.sensorManager.connectHeartRate();
                return true;
            }
        } catch (error) {
            console.log('Could not connect real sensors:', error);
        }
        return false;
    }

    initChart() {
        const ctx = document.getElementById('chart').getContext('2d');
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
                        position: 'top',
                        labels: {
                            color: 'white',
                            font: { size: 10 }
                        }
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: { size: 10 }
                        }
                    }
                }
            }
        });
    }

    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                this.changeGear(1);
            } else if (e.key === 'ArrowDown') {
                this.changeGear(-1);
            } else if (e.key === ' ') {
                e.preventDefault();
                this.pauseSession();
            }
        });
    }

    // Gear management
    changeGear(direction) {
        const newGear = Math.max(1, Math.min(8, this.state.currentGear + direction));
        if (newGear !== this.state.currentGear) {
            this.setGear(newGear);
        }
    }

    setGear(gear) {
        this.state.currentGear = gear;
        this.state.resistance = this.gearResistanceMap[gear];
        
        // Update display
        document.getElementById('currentGear').textContent = gear;
        document.getElementById('currentResistance').textContent = `${this.state.resistance}%`;
        
        // Flash gear section
        const gearSection = document.querySelector('.gear-section');
        gearSection.classList.add('changing');
        setTimeout(() => gearSection.classList.remove('changing'), 300);
        
        // Set resistance on trainer if connected
        if (this.sensorManager && this.sensorManager.setResistance) {
            this.sensorManager.setResistance(this.state.resistance);
        }
        
        console.log(`Gear: ${gear}, Resistance: ${this.state.resistance}%`);
    }

    // Metric updates
    updatePower(power) {
        document.getElementById('power').textContent = Math.round(power);
        this.addMetricAnimation('power');
        this.state.metrics.power.push(power);
        this.updateChart();
    }

    updateCadence(cadence) {
        document.getElementById('cadence').textContent = Math.round(cadence);
        this.addMetricAnimation('cadence');
        this.state.metrics.cadence.push(cadence);
        this.updateChart();
    }

    updateHeartRate(heartRate) {
        document.getElementById('heartRate').textContent = Math.round(heartRate);
        this.addMetricAnimation('heartRate');
        this.state.metrics.heartRate.push(heartRate);
        this.updateChart();
    }

    addMetricAnimation(metricId) {
        const element = document.getElementById(metricId).parentElement;
        element.classList.add('updated');
        setTimeout(() => element.classList.remove('updated'), 300);
    }

    updateChart() {
        if (!this.chart) return;
        
        const maxPoints = 60; // Show last 60 data points
        const startIdx = Math.max(0, this.state.metrics.timestamps.length - maxPoints);
        
        this.chart.data.labels = this.state.metrics.timestamps
            .slice(startIdx)
            .map((t, i) => i);
        
        this.chart.data.datasets[0].data = this.state.metrics.power.slice(startIdx);
        this.chart.data.datasets[1].data = this.state.metrics.heartRate.slice(startIdx);
        this.chart.data.datasets[2].data = this.state.metrics.cadence.slice(startIdx);
        
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
                this.collectMetrics();
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
    }

    collectMetrics() {
        this.state.metrics.timestamps.push(new Date());
        
        // If no real data, generate simulation data
        if (this.state.metrics.power.length === this.state.metrics.timestamps.length - 1) {
            const basePower = 150 + (this.state.resistance * 5);
            const power = basePower + (Math.random() * 50 - 25);
            this.updatePower(power);
        }
        
        if (this.state.metrics.heartRate.length === this.state.metrics.timestamps.length - 1) {
            const baseHR = 120 + (this.state.currentGear * 5);
            const hr = baseHR + (Math.random() * 20 - 10);
            this.updateHeartRate(hr);
        }
        
        if (this.state.metrics.cadence.length === this.state.metrics.timestamps.length - 1) {
            const baseCadence = 75 + (this.state.currentGear * 2);
            const cadence = baseCadence + (Math.random() * 10 - 5);
            this.updateCadence(cadence);
        }
    }

    // Session controls
    handleLap() {
        const lapBtn = document.getElementById('lapBtn');
        
        if (!this.state.isRunning) {
            // Start warmup
            this.state.isRunning = true;
            this.state.lapType = 'warmup';
            this.setGear(1); // Start in gear 1 for warmup
            
            lapBtn.textContent = 'START WORKOUT';
            lapBtn.classList.add('start');
            
            this.startTimer();
            console.log('Warmup started');
        } else if (this.state.lapType === 'warmup') {
            // Complete warmup, start workout
            this.state.lapType = 'workout';
            this.state.currentLap++;
            this.state.lapStartTime = Date.now();
            
            lapBtn.textContent = 'LAP';
            lapBtn.classList.remove('start');
            
            // Set to gear 2 for workout start
            this.setGear(2);
            
            console.log('Workout started');
        } else {
            // Record lap
            this.state.currentLap++;
            this.state.lapStartTime = Date.now();
            console.log(`Lap ${this.state.currentLap} started`);
        }
    }

    pauseSession() {
        if (!this.state.isRunning) return;
        
        this.state.isPaused = !this.state.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (this.state.isPaused) {
            document.body.classList.add('paused');
            pauseBtn.textContent = 'RESUME';
        } else {
            document.body.classList.remove('paused');
            pauseBtn.textContent = 'PAUSE';
        }
        
        console.log(this.state.isPaused ? 'Session paused' : 'Session resumed');
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
            metrics: this.state.metrics,
            laps: this.state.currentLap,
            timestamp: new Date()
        };
        
        // Convert to CSV
        let csv = 'Timestamp,Power,HeartRate,Cadence\n';
        for (let i = 0; i < this.state.metrics.timestamps.length; i++) {
            csv += `${this.state.metrics.timestamps[i].toISOString()},`;
            csv += `${this.state.metrics.power[i] || 0},`;
            csv += `${this.state.metrics.heartRate[i] || 0},`;
            csv += `${this.state.metrics.cadence[i] || 0}\n`;
        }
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workout_${Date.now()}.csv`;
        a.click();
        
        alert('Workout saved!');
        window.location.href = 'sensor-settings.html';
    }

    signOut() {
        if (confirm('Sign out? Any unsaved data will be lost.')) {
            sessionStorage.clear();
            window.location.href = 'pedal.html';
        }
    }
}

// Mock sensor manager for testing
class MockSensorManager {
    constructor() {
        this.callbacks = {};
    }
    
    setCallbacks(callbacks) {
        this.callbacks = callbacks;
    }
    
    enableSimulation() {
        console.log('Simulation mode enabled');
        // Simulation is handled by the controller's collectMetrics method
    }
    
    async connectKickr() { return false; }
    async connectZwiftClick() { return false; }
    async connectHeartRate() { return false; }
    setResistance(percent) { console.log(`Mock: Set resistance to ${percent}%`); }
}

// Global functions for HTML onclick handlers
let controller;

function toggleSettings() {
    alert('Settings panel would open here');
}

function signOut() {
    if (controller) controller.signOut();
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
    controller = new WorkoutController();
    await controller.initialize();
    console.log('Workout controller initialized');
});
