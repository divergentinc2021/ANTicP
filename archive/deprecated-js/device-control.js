// Enhanced Device Control Functions with Corrected Road Bike Gearing System
// Global variables for device control
let currentGear = 12; // Start at middle gear (12 out of 24)
let targetPower = 150;

// Road bike gearing configuration (user-definable)
let frontChainrings = [42, 52]; // Small to big: 42T (easier), 52T (harder)
let rearCassette = [30, 28, 26, 24, 23, 21, 19, 17, 15, 14, 13, 12, 11]; // Big to small: 30T (easier) to 11T (harder)

// CORRECTED: Gear order from easiest to hardest
function getGearCombination(gearNumber) {
    // Gears 1-13: Use 42T front chainring (easier gears)
    // Gears 14-24: Use 52T front chainring (harder gears)
    
    if (gearNumber <= 13) {
        // Easy gears: 42T front with cassette from biggest (30T) to smallest (11T)
        const frontTeeth = 42;
        const rearIndex = gearNumber - 1; // 0-12 index
        const rearTeeth = rearCassette[rearIndex];
        return { front: frontTeeth, rear: rearTeeth };
    } else {
        // Hard gears: 52T front with cassette from biggest (30T) to smallest (11T)
        const frontTeeth = 52;
        const rearIndex = gearNumber - 14; // 0-10 index (gears 14-24 map to 0-10)
        const rearTeeth = rearCassette[rearIndex];
        return { front: frontTeeth, rear: rearTeeth };
    }
}

// Calculate gear ratios and power mapping
function calculateGearRatio(frontTeeth, rearTeeth) {
    return frontTeeth / rearTeeth;
}

function calculateTargetPower(gearNumber) {
    const { front, rear } = getGearCombination(gearNumber);
    const gearRatio = calculateGearRatio(front, rear);
    
    // Power curve: base 80W + gear ratio scaling (realistic road bike power)
    const basePower = 80;
    const powerMultiplier = gearRatio * 30; // Adjust this for realistic feel
    
    return Math.round(basePower + powerMultiplier);
}

// Global functions for direct button onclick handlers
function pairDevice(deviceType) {
    console.log(`🔍 Pairing ${deviceType}...`);
    
    // Use native Bluetooth API to show device picker with improved filters
    pairDeviceDirect(deviceType);
}

// Improved Bluetooth filters for specific device detection
async function pairDeviceDirect(deviceType) {
    try {
        let filters = {};
        
        if (deviceType === 'kickr') {
            // Specific Wahoo Kickr filters
            filters = {
                filters: [
                    { namePrefix: 'KICKR CORE' },
                    { namePrefix: 'KICKR SNAP' },
                    { namePrefix: 'KICKR' },
                    { namePrefix: 'Wahoo KICKR' },
                    { namePrefix: 'Wahoo' },
                    { manufacturerData: [{ companyIdentifier: 0x010C }] }, // Wahoo company ID
                    { services: [0x1826] }, // Fitness Machine Service
                    { services: [0x1818] }  // Cycling Power Service
                ],
                optionalServices: [
                    0x1826,    // Fitness Machine
                    0x1818,    // Cycling Power
                    0x1816,    // Cycling Speed and Cadence
                    0x180A,    // Device Information
                    0x180F,    // Battery Service
                    '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'  // Wahoo custom service
                ]
            };
        } else if (deviceType === 'hrm') {
            // Enhanced HRM device filters including watches
            filters = {
                filters: [
                    { services: [0x180D] }, // Heart Rate Service (most important)
                    // Chest straps
                    { namePrefix: 'Polar H' },
                    { namePrefix: 'Polar' },
                    { namePrefix: 'Garmin HRM' },
                    { namePrefix: 'Wahoo TICKR' },
                    { namePrefix: 'TICKR' },
                    { namePrefix: 'Suunto' },
                    { namePrefix: 'HRM' },
                    { namePrefix: 'Heart Rate' },
                    // Watches with HRM
                    { namePrefix: 'Apple Watch' },
                    { namePrefix: 'Galaxy Watch' },
                    { namePrefix: 'Fitbit' },
                    { namePrefix: 'Garmin' },
                    { namePrefix: 'Forerunner' },
                    { namePrefix: 'fenix' },
                    { namePrefix: 'Venu' },
                    { namePrefix: 'Vivoactive' },
                    { namePrefix: 'Instinct' },
                    { namePrefix: 'Amazfit' },
                    { namePrefix: 'Huawei Watch' },
                    { namePrefix: 'TicWatch' },
                    { namePrefix: 'Wear OS' }
                ],
                optionalServices: [
                    0x180D,    // Heart Rate
                    0x180A,    // Device Information
                    0x180F     // Battery Service
                ]
            };
        } else if (deviceType === 'zwift-click') {
            // Specific Zwift Click filters - much more targeted
            filters = {
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'CLICK' },
                    { namePrefix: 'ZC' },
                    { manufacturerData: [{ companyIdentifier: 0x0348 }] }, // Zwift company ID
                    { services: ['6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'] } // Zwift Click service
                ],
                optionalServices: [
                    0x1812,    // HID Service (Human Interface Device)
                    0x1816,    // Cycling Speed and Cadence
                    0x180A,    // Device Information
                    0x180F,    // Battery Service
                    '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'  // Zwift custom service
                ]
            };
        }
        
        console.log(`🔍 Using filters for ${deviceType}:`, filters);
        
        const device = await navigator.bluetooth.requestDevice(filters);
        console.log(`✅ Selected device: ${device.name}`);
        alert(`Device Selected: ${device.name || 'Unknown Device'}\\nReady to connect!`);
        
        // Try to connect
        const server = await device.gatt.connect();
        console.log('✅ Connected to GATT server');
        
        // Update UI to show connected status
        updateDeviceConnectionStatus(deviceType, true, device.name);
        
        alert(`Successfully connected to ${device.name}!`);
        
    } catch (error) {
        if (error.name === 'NotFoundError') {
            console.log('⚠️ No device selected');
            alert(`No ${deviceType} device selected.\\n\\nMake sure your device is:\\n• Powered on\\n• In pairing mode\\n• Close to your computer`);
        } else if (error.name === 'SecurityError') {
            alert(`Bluetooth access denied.\\n\\nPlease:\\n• Allow Bluetooth access\\n• Grant location permission (Android)\\n• Use HTTPS or localhost`);
        } else {
            console.error(`❌ Pairing failed:`, error);
            alert(`Pairing failed: ${error.message}\\n\\nTry:\\n• Putting device in pairing mode\\n• Moving closer to device\\n• Refreshing the page`);
        }
    }
}

function updateDeviceConnectionStatus(deviceType, connected, deviceName = '') {
    const statusIndicator = document.getElementById(`${deviceType}-status`);
    const statusText = document.getElementById(`${deviceType}-status-text`);
    
    if (statusIndicator && statusText) {
        if (connected) {
            statusIndicator.className = 'status-indicator status-active';
            statusText.textContent = `Connected: ${deviceName}`;
        } else {
            statusIndicator.className = 'status-indicator status-inactive';
            statusText.textContent = 'Ready to Pair';
        }
    }
}

function disconnectDevice(deviceType) {
    console.log(`🔌 Disconnecting ${deviceType}...`);
    updateDeviceConnectionStatus(deviceType, false);
    alert(`Disconnected ${deviceType}`);
}

// CORRECTED GEAR CONTROL FUNCTIONS (24-gear system, easiest to hardest)
function changeGear(direction) {
    const oldGear = currentGear;
    
    if (direction === 'up') {
        currentGear = Math.min(24, currentGear + 1); // Harder gear
    } else if (direction === 'down') {
        currentGear = Math.max(1, currentGear - 1); // Easier gear
    }
    
    // Only update if gear actually changed
    if (currentGear !== oldGear) {
        targetPower = calculateTargetPower(currentGear);
        updateGearDisplay();
        
        // Get current gear combination for display
        const { front, rear } = getGearCombination(currentGear);
        const gearRatio = calculateGearRatio(front, rear);
        
        console.log(`⚡ Gear: ${currentGear}/24, Ratio: ${gearRatio.toFixed(2)} (${front}T/${rear}T), Target Power: ${targetPower}W`);
    }
}

function updateGearDisplay() {
    // Update gear display
    const gearDisplay = document.getElementById('zwift-gear');
    if (gearDisplay) {
        gearDisplay.textContent = currentGear;
    }
    
    // Update target power display
    const targetPowerDisplay = document.getElementById('kickr-target-power');
    if (targetPowerDisplay) {
        targetPowerDisplay.textContent = targetPower;
    }
    
    // Update resistance display to show gear info
    const resistanceDisplay = document.getElementById('kickr-resistance-display');
    if (resistanceDisplay) {
        resistanceDisplay.textContent = `Gear ${currentGear}`;
    }
    
    // Update resistance value to show current gear
    const resistanceValue = document.getElementById('kickr-resistance-value');
    if (resistanceValue) {
        resistanceValue.textContent = currentGear;
    }
    
    // Update front/rear gear displays with actual teeth
    const { front, rear } = getGearCombination(currentGear);
    
    const frontGearDisplay = document.getElementById('zwift-front-gear');
    const rearGearDisplay = document.getElementById('zwift-rear-gear');
    
    if (frontGearDisplay) frontGearDisplay.textContent = `${front}T`;
    if (rearGearDisplay) rearGearDisplay.textContent = `${rear}T`;
}

// Direct gear adjustment functions for resistance buttons
function adjustGear(change) {
    const direction = change > 0 ? 'up' : 'down';
    for (let i = 0; i < Math.abs(change); i++) {
        changeGear(direction);
    }
}

// Device capture function
function captureDeviceSpecs() {
    console.log('📊 Capturing device specifications...');
    
    if (window.antApp && window.antApp.handleCaptureSpecs) {
        window.antApp.handleCaptureSpecs();
    } else {
        alert('📊 Device Capture\\n\\nThis feature captures detailed specifications of connected ANT+ devices.\\n\\nConnect some devices first, then try again.');
        console.log('Device capture: App not ready or no devices connected');
    }
}

// Clear log function
function clearLog() {
    const logContent = document.getElementById('log-content');
    if (logContent) {
        logContent.textContent = '';
        console.log('📝 Log cleared');
    }
}

// Initialize displays
function initializeControls() {
    currentGear = 12; // Start at middle gear
    targetPower = calculateTargetPower(currentGear);
    updateGearDisplay();
    
    console.log('🚴 Corrected road bike gearing initialized:');
    console.log(`   Gear 1 (easiest): 42T/${rearCassette[0]}T = ${calculateGearRatio(42, rearCassette[0]).toFixed(2)}`);
    console.log(`   Gear 13: 42T/${rearCassette[12]}T = ${calculateGearRatio(42, rearCassette[12]).toFixed(2)}`);
    console.log(`   Gear 14: 52T/${rearCassette[0]}T = ${calculateGearRatio(52, rearCassette[0]).toFixed(2)}`);
    console.log(`   Gear 24 (hardest): 52T/${rearCassette[10]}T = ${calculateGearRatio(52, rearCassette[10]).toFixed(2)}`);
    console.log(`   Starting gear: ${currentGear}/24`);
    console.log(`   Starting power: ${targetPower}W`);
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
document.addEventListener('DOMContentLoaded', function() {
    initializeControls();
    
    // Add onclick handlers for capture and clear buttons
    const captureBtn = document.getElementById('capture-specs-btn');
    const clearBtn = document.getElementById('clear-log-btn');
    
    if (captureBtn) {
        captureBtn.onclick = captureDeviceSpecs;
    }
    
    if (clearBtn) {
        clearBtn.onclick = clearLog;
    }
});

// Auto-check app status after 2 seconds
setTimeout(checkApp, 2000);
