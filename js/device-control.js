// Enhanced Device Control Functions
// Global variables for device control
let currentResistance = 0;
let targetPower = 150;
let currentGear = 4;

// Global functions for direct button onclick handlers
function pairDevice(deviceType) {
    console.log(`🔍 Pairing ${deviceType}...`);
    
    // Use native Bluetooth API to show device picker (like original Quick Connect)
    pairDeviceDirect(deviceType);
}

// Direct Bluetooth API for device selection popup
async function pairDeviceDirect(deviceType) {
    try {
        let filters = {};
        
        if (deviceType === 'kickr') {
            filters = {
                filters: [
                    { namePrefix: 'KICKR' },
                    { namePrefix: 'Wahoo' },
                    { services: [0x1826] }, // Fitness Machine
                    { services: [0x1818] }  // Cycling Power
                ],
                optionalServices: [0x1826, 0x1818, 0x180A, 0x180F]
            };
        } else if (deviceType === 'hrm') {
            filters = {
                filters: [
                    { services: [0x180D] }, // Heart Rate
                    { namePrefix: 'Polar' },
                    { namePrefix: 'Garmin' },
                    { namePrefix: 'TICKR' }
                ],
                optionalServices: [0x180D, 0x180A, 0x180F]
            };
        } else if (deviceType === 'zwift-click') {
            filters = {
                acceptAllDevices: true,
                optionalServices: [0x1812, 0x1816, 0x180A, 0x180F]
            };
        }
        
        const device = await navigator.bluetooth.requestDevice(filters);
        console.log(`✅ Selected device: ${device.name}`);
        alert(`Device Selected: ${device.name || 'Unknown Device'}\nReady to connect!`);
        
        // Try to connect
        const server = await device.gatt.connect();
        console.log('✅ Connected to GATT server');
        alert(`Successfully connected to ${device.name}!`);
        
    } catch (error) {
        if (error.name === 'NotFoundError') {
            console.log('⚠️ No device selected');
        } else {
            console.error(`❌ Pairing failed:`, error);
            alert(`Pairing failed: ${error.message}`);
        }
    }
}

function disconnectDevice(deviceType) {
    console.log(`🔌 Disconnecting ${deviceType}...`);
    alert(`Disconnecting ${deviceType}...`);
}

// RESISTANCE CONTROL FUNCTIONS
function adjustResistance(change) {
    currentResistance += change;
    
    // Clamp resistance between -10 and +10
    currentResistance = Math.max(-10, Math.min(10, currentResistance));
    
    // Calculate new target power (base 150W + resistance adjustment)
    targetPower = Math.max(50, 150 + (currentResistance * 15)); // 15W per resistance point
    
    // Update UI
    updateResistanceDisplay();
    
    console.log(`🎛️ Resistance: ${currentResistance}%, Target Power: ${targetPower}W`);
}

function updateResistanceDisplay() {
    // Update resistance display
    const resistanceDisplay = document.getElementById('kickr-resistance-display');
    if (resistanceDisplay) {
        resistanceDisplay.textContent = currentResistance;
    }
    
    // Update target power display
    const targetPowerDisplay = document.getElementById('kickr-target-power');
    if (targetPowerDisplay) {
        targetPowerDisplay.textContent = targetPower;
    }
    
    // Update resistance value
    const resistanceValue = document.getElementById('kickr-resistance-value');
    if (resistanceValue) {
        resistanceValue.textContent = Math.abs(currentResistance);
    }
}

// GEAR CONTROL FUNCTIONS (linked to resistance)
function changeGear(direction) {
    if (direction === 'up') {
        currentGear = Math.min(11, currentGear + 1); // Max 11 gears
        adjustResistance(1); // Harder gear = more resistance
    } else if (direction === 'down') {
        currentGear = Math.max(1, currentGear - 1); // Min 1 gear
        adjustResistance(-1); // Easier gear = less resistance
    }
    
    // Update gear display
    const gearDisplay = document.getElementById('zwift-gear');
    if (gearDisplay) {
        gearDisplay.textContent = currentGear;
    }
    
    console.log(`⚡ Gear: ${currentGear}, Resistance: ${currentResistance}%`);
}

// Initialize displays
function initializeControls() {
    updateResistanceDisplay();
    
    const gearDisplay = document.getElementById('zwift-gear');
    if (gearDisplay) {
        gearDisplay.textContent = currentGear;
    }
}

// Debug function to check app status
function checkApp() {
    console.log('App status:', window.antApp ? 'Ready' : 'Not ready');
    if (window.antApp) {
        console.log('Available methods:', Object.getOwnPropertyNames(window.antApp));
        console.log('Connection manager:', window.antApp.connectionManager ? 'Ready' : 'Not ready');
    }
}

// Auto-initialize after DOM loads
document.addEventListener('DOMContentLoaded', initializeControls);

// Auto-check app status after 2 seconds
setTimeout(checkApp, 2000);
