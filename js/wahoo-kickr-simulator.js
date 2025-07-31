/**
 * Wahoo Kickr Core Simulator
 * Simulates a Wahoo Kickr Core trainer for testing Bluetooth pairing and data
 */

class WahooKickrSimulator {
    constructor() {
        this.name = 'KICKR CORE 1234';
        this.isConnected = false;
        this.isPairing = false;
        this.currentPower = 0;
        this.targetPower = 150;
        this.cadence = 0;
        this.speed = 0;
        this.resistance = 0;
        this.battery = 85;
        
        // Simulation intervals
        this.powerInterval = null;
        this.dataInterval = null;
        
        console.log('🚴 Wahoo Kickr Core Simulator initialized');
        console.log('   Device Name: ' + this.name);
        console.log('   Battery: ' + this.battery + '%');
    }

    // Simulate appearing in Bluetooth device list
    async simulateBluetoothDiscovery() {
        console.log('📡 Simulating Bluetooth discovery...');
        console.log('   Device would appear as: ' + this.name);
        console.log('   Services: Fitness Machine (0x1826), Cycling Power (0x1818)');
        console.log('   Manufacturer: Wahoo (0x010C)');
        
        return {
            name: this.name,
            id: 'wahoo-kickr-simulator',
            manufacturerData: new Map([[0x010C, new Uint8Array([0x01, 0x02])]]),
            services: [0x1826, 0x1818, 0x180A, 0x180F]
        };
    }

    // Simulate pairing process
    async simulatePairing() {
        if (this.isPairing) {
            console.log('⚠️ Already in pairing mode');
            return false;
        }

        console.log('🔄 Starting Kickr Core pairing simulation...');
        this.isPairing = true;

        // Simulate pairing delay
        await this.sleep(1000);
        console.log('   📱 Device selected in browser popup');
        
        await this.sleep(500);
        console.log('   🔗 GATT connection established');
        
        await this.sleep(500);
        console.log('   🔍 Discovering services...');
        console.log('     • Fitness Machine Service (0x1826)');
        console.log('     • Cycling Power Service (0x1818)');
        console.log('     • Device Information Service (0x180A)');
        console.log('     • Battery Service (0x180F)');
        
        await this.sleep(500);
        console.log('   📊 Setting up characteristics...');
        console.log('     • Indoor Bike Data (notifications)');
        console.log('     • Fitness Machine Control Point');
        console.log('     • Cycling Power Measurement (notifications)');
        
        this.isConnected = true;
        this.isPairing = false;
        
        console.log('✅ Kickr Core simulation connected successfully!');
        this.startDataSimulation();
        
        return true;
    }

    // Start generating realistic trainer data
    startDataSimulation() {
        if (this.dataInterval) {
            clearInterval(this.dataInterval);
        }

        console.log('📊 Starting data simulation...');
        
        // Update power gradually towards target
        this.powerInterval = setInterval(() => {
            this.updatePower();
        }, 100);

        // Send data every 250ms (4Hz like real ANT+)
        this.dataInterval = setInterval(() => {
            this.sendTrainerData();
        }, 250);
    }

    // Simulate realistic power response
    updatePower() {
        if (!this.isConnected) return;

        // Gradually approach target power (simulate inertia)
        const powerDiff = this.targetPower - this.currentPower;
        const maxChange = 2; // Max 2W change per 100ms
        
        if (Math.abs(powerDiff) > maxChange) {
            this.currentPower += Math.sign(powerDiff) * maxChange;
        } else {
            this.currentPower = this.targetPower;
        }

        // Add some realistic noise
        this.currentPower += (Math.random() - 0.5) * 3;
        this.currentPower = Math.max(0, this.currentPower);

        // Calculate cadence and speed based on power
        if (this.currentPower > 0) {
            this.cadence = Math.round(60 + (this.currentPower / 5) + (Math.random() - 0.5) * 10);
            this.speed = Math.round((this.currentPower / 3.5) * 10) / 10; // Rough power to speed conversion
        } else {
            this.cadence = 0;
            this.speed = 0;
        }

        this.cadence = Math.max(0, Math.min(120, this.cadence));
        this.speed = Math.max(0, this.speed);
    }

    // Send simulated data (like real Kickr would)
    sendTrainerData() {
        if (!this.isConnected) return;

        const data = {
            deviceName: this.name,
            power: Math.round(this.currentPower),
            targetPower: this.targetPower,
            cadence: this.cadence,
            speed: this.speed,
            resistance: this.resistance,
            timestamp: Date.now(),
            battery: this.battery
        };

        console.log(`🚴 Kickr Data: ${data.power}W, ${data.cadence}RPM, ${data.speed}km/h`);
        
        // Trigger UI updates if connected to the main app
        if (window.antApp && window.antApp.uiManager) {
            window.antApp.uiManager.updateDeviceMetrics('trainer', data);
        }

        return data;
    }

    // Simulate setting target power (from app)
    setTargetPower(watts) {
        const oldTarget = this.targetPower;
        this.targetPower = Math.max(0, Math.min(2000, watts));
        this.resistance = Math.round(this.targetPower / 15); // Rough conversion
        
        console.log(`🎯 Target power changed: ${oldTarget}W → ${this.targetPower}W`);
        console.log(`   Resistance: ${this.resistance}%`);
        
        return this.targetPower;
    }

    // Simulate disconnection
    async disconnect() {
        if (!this.isConnected) {
            console.log('⚠️ Already disconnected');
            return;
        }

        console.log('🔌 Disconnecting Kickr Core simulator...');
        
        // Stop data simulation
        if (this.powerInterval) {
            clearInterval(this.powerInterval);
            this.powerInterval = null;
        }
        
        if (this.dataInterval) {
            clearInterval(this.dataInterval);
            this.dataInterval = null;
        }

        this.isConnected = false;
        this.currentPower = 0;
        this.cadence = 0;
        this.speed = 0;
        
        console.log('✅ Kickr Core simulator disconnected');
    }

    // Get current status
    getStatus() {
        return {
            name: this.name,
            connected: this.isConnected,
            pairing: this.isPairing,
            power: Math.round(this.currentPower),
            targetPower: this.targetPower,
            cadence: this.cadence,
            speed: this.speed,
            resistance: this.resistance,
            battery: this.battery
        };
    }

    // Utility function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Test functions for easy console access
let kickrSimulator = null;

function startKickrSimulator() {
    if (kickrSimulator) {
        console.log('⚠️ Simulator already running');
        return kickrSimulator;
    }
    
    kickrSimulator = new WahooKickrSimulator();
    console.log('🚀 Kickr simulator started. Use these commands:');
    console.log('   • simulateKickrPairing() - Simulate pairing process');
    console.log('   • setKickrPower(watts) - Change target power');
    console.log('   • getKickrStatus() - Check current status');
    console.log('   • stopKickrSimulator() - Stop simulation');
    
    return kickrSimulator;
}

function simulateKickrPairing() {
    if (!kickrSimulator) {
        console.log('❌ Start simulator first with: startKickrSimulator()');
        return;
    }
    
    kickrSimulator.simulatePairing();
}

function setKickrPower(watts) {
    if (!kickrSimulator || !kickrSimulator.isConnected) {
        console.log('❌ Simulator not connected');
        return;
    }
    
    return kickrSimulator.setTargetPower(watts);
}

function getKickrStatus() {
    if (!kickrSimulator) {
        console.log('❌ Simulator not started');
        return null;
    }
    
    const status = kickrSimulator.getStatus();
    console.log('📊 Kickr Simulator Status:');
    console.log(`   Device: ${status.name}`);
    console.log(`   Connected: ${status.connected}`);
    console.log(`   Power: ${status.power}W (target: ${status.targetPower}W)`);
    console.log(`   Cadence: ${status.cadence}RPM`);
    console.log(`   Speed: ${status.speed}km/h`);
    console.log(`   Battery: ${status.battery}%`);
    
    return status;
}

function stopKickrSimulator() {
    if (!kickrSimulator) {
        console.log('⚠️ No simulator running');
        return;
    }
    
    kickrSimulator.disconnect();
    kickrSimulator = null;
    console.log('🛑 Kickr simulator stopped');
}

// Auto-start simulator for testing (optional)
console.log('🚴 Wahoo Kickr Core Simulator ready!');
console.log('💡 Start with: startKickrSimulator()');

// Make functions globally available
window.startKickrSimulator = startKickrSimulator;
window.simulateKickrPairing = simulateKickrPairing;
window.setKickrPower = setKickrPower;
window.getKickrStatus = getKickrStatus;
window.stopKickrSimulator = stopKickrSimulator;
