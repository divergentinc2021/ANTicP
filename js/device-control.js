// Enhanced Device Control Functions with Road Bike Gearing System
// Global variables for device control
let currentGear = 12; // Start at middle gear (12 out of 24)
let targetPower = 150;

// Road bike gearing configuration (user-definable)
let frontChainrings = [52, 42]; // 2 chainrings
let rearCassette = [10, 11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28, 30]; // 12 cogs, smallest to biggest
let currentFront = 0; // Index for current front chainring (0 = 52T, 1 = 42T)

// Calculate gear ratios and power mapping
function calculateGearRatio(frontTeeth, rearTeeth) {
    return frontTeeth / rearTeeth;
}

function calculateTargetPower(gearNumber) {
    // Convert gear number (1-24) to front/rear combination
    const gearsPerChainring = Math.ceil(24 / frontChainrings.length);
    const frontIndex = Math.floor((gearNumber - 1) / gearsPerChainring);
    const rearIndex = (gearNumber - 1) % rearCassette.length;
    
    const frontTeeth = frontChainrings[Math.min(frontIndex, frontChainrings.length - 1)];
    const rearTeeth = rearCassette[rearIndex];
    const gearRatio = calculateGearRatio(frontTeeth, rearTeeth);
    
    // Power curve: base 100W + gear ratio scaling (realistic road bike power)
    const basePower = 100;
    const powerMultiplier = gearRatio * 25; // Adjust this for realistic feel
    
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
            // Specific HRM device filters
            filters = {
                filters: [
                    { services: [0x180D] }, // Heart Rate Service
                    { namePrefix: 'Polar H' },
                    { namePrefix: 'Polar' },
                    { namePrefix: 'Garmin HRM' },
                    { namePrefix: 'Wahoo TICKR' },
                    { namePrefix: 'TICKR' },
                    { namePrefix: 'Suunto' },
                    { namePrefix: 'HRM' },
                    { namePrefix: 'Heart Rate' }
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

// GEAR CONTROL FUNCTIONS (24-gear system with road bike ratios)
function changeGear(direction) {
    const oldGear = currentGear;
    
    if (direction === 'up') {
        currentGear = Math.min(24, currentGear + 1); // Max 24 gears
    } else if (direction === 'down') {
        currentGear = Math.max(1, currentGear - 1); // Min 1 gear
    }
    
    // Only update if gear actually changed
    if (currentGear !== oldGear) {
        targetPower = calculateTargetPower(currentGear);
        updateGearDisplay();
        
        // Calculate current front/rear combination for display
        const gearsPerChainring = Math.ceil(24 / frontChainrings.length);
        const frontIndex = Math.floor((currentGear - 1) / gearsPerChainring);
        const rearIndex = (currentGear - 1) % rearCassette.length;
        
        const frontTeeth = frontChainrings[Math.min(frontIndex, frontChainrings.length - 1)];
        const rearTeeth = rearCassette[rearIndex];
        const gearRatio = calculateGearRatio(frontTeeth, rearTeeth);
        
        console.log(`⚡ Gear: ${currentGear}/24, Ratio: ${gearRatio.toFixed(2)} (${frontTeeth}T/${rearTeeth}T), Target Power: ${targetPower}W`);
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
    
    // Update front/rear gear displays
    const gearsPerChainring = Math.ceil(24 / frontChainrings.length);
    const frontIndex = Math.floor((currentGear - 1) / gearsPerChainring);
    const rearIndex = (currentGear - 1) % rearCassette.length;
    
    const frontTeeth = frontChainrings[Math.min(frontIndex, frontChainrings.length - 1)];
    const rearTeeth = rearCassette[rearIndex];
    
    const frontGearDisplay = document.getElementById('zwift-front-gear');
    const rearGearDisplay = document.getElementById('zwift-rear-gear');
    
    if (frontGearDisplay) frontGearDisplay.textContent = `${frontTeeth}T`;
    if (rearGearDisplay) rearGearDisplay.textContent = `${rearTeeth}T`;
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
    
    console.log('🚴 Road bike gearing initialized:');
    console.log(`   Front chainrings: ${frontChainrings.join('T, ')}T`);
    console.log(`   Rear cassette: ${rearCassette.join('-')}T`);
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
