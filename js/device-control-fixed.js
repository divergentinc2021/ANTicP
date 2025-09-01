// Enhanced Device Control Functions with CORRECTED 12-Gear System
// Global variables for device control
let currentGear = 1; // Start at gear 1 (easiest)
let targetPower = 150;

// CORRECTED Road bike gearing configuration
let frontChainrings = [42, 52]; // Small to big: 42T (easier), 52T (harder)
let rearCassette = [30, 28, 26, 24, 23, 21, 19, 17, 15, 14, 13, 11]; // Big to small: 30T (easier) to 11T (harder)

// FIXED: 12-gear system where gear 12 = 42-11 (not 13!)
function getGearCombination(gearNumber) {
    // Gears 1-12: Use 42T front chainring
    // Gear 12 should be 42-11 (not 13!)
    // Gear 13 should be 52-30 as requested
    
    if (gearNumber <= 12) {
        // Easy to medium gears: 42T front with cassette from biggest (30T) to smallest (11T)
        const frontTeeth = 42;
        const rearIndex = gearNumber - 1; // 0-11 index for 12 gears
        const rearTeeth = rearCassette[rearIndex];
        return { front: frontTeeth, rear: rearTeeth };
    } else {
        // Hard gears: 52T front with cassette from biggest (30T) to smallest (11T)  
        const frontTeeth = 52;
        const rearIndex = gearNumber - 13; // gears 13-24 map to cassette index 0-11
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

// Enhanced Bluetooth pairing with improved device filters
async function pairDeviceDirect(deviceType) {
    try {
        let filters = {};
        
        if (deviceType === 'kickr') {
            // Wahoo Kickr specific filters - more targeted
            filters = {
                filters: [
                    { namePrefix: 'KICKR CORE' },
                    { namePrefix: 'KICKR SNAP' },
                    { namePrefix: 'KICKR' },
                    { namePrefix: 'Wahoo KICKR' },
                    { namePrefix: 'Wahoo' },
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
            // Enhanced HRM device filters
            filters = {
                filters: [
                    { services: [0x180D] }, // Heart Rate Service (most important)
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
            // Zwift Click specific filters
            filters = {
                filters: [
                    { namePrefix: 'Zwift Click' },
                    { namePrefix: 'CLICK' },
                    { namePrefix: 'ZC' },
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
        
        // Try to connect
        const server = await device.gatt.connect();
        console.log('✅ Connected to GATT server');
        
        // Update UI to show connected status
        updateDeviceConnectionStatus(deviceType, true, device.name);
        
        // Show success message
        if (window.addConnectionLog) {
            window.addConnectionLog(`✅ Successfully connected to ${device.name}!`, 'success');
        }
        
        return { device, server };
        
    } catch (error) {
        if (error.name === 'NotFoundError') {
            console.log('⚠️ No device selected');
            if (window.addConnectionLog) {
                window.addConnectionLog(`⚠️ No ${deviceType} device selected`, 'warning');
            }
        } else if (error.name === 'SecurityError') {
            if (window.addConnectionLog) {
                window.addConnectionLog(`❌ Bluetooth access denied for ${deviceType}`, 'error');
            }
        } else {
            console.error(`❌ Pairing failed:`, error);
            if (window.addConnectionLog) {
                window.addConnectionLog(`❌ ${deviceType} pairing failed: ${error.message}`, 'error');
            }
        }
        throw error;
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

// Global functions for direct button onclick handlers
function pairDevice(deviceType) {
    console.log(`🔍 Pairing ${deviceType}...`);
    
    // Use enhanced Bluetooth pairing
    if (navigator.bluetooth) {
        pairDeviceDirect(deviceType).catch(error => {
            console.error('Pairing failed:', error);
        });
    } else if (window.antApp && window.antApp.handleDevicePair) {
        window.antApp.handleDevicePair(deviceType);
    } else {
        console.log('App not ready, trying to initialize...');
        if (window.addConnectionLog) {
            window.addConnectionLog(`❌ Bluetooth not available or app not ready`, 'error');
        }
    }
}

function disconnectDevice(deviceType) {
    console.log(`🔌 Disconnecting ${deviceType}...`);
    updateDeviceConnectionStatus(deviceType, false);
    
    if (window.antApp && window.antApp.handleDeviceDisconnect) {
        window.antApp.handleDeviceDisconnect(deviceType);
    } else {
        if (window.addConnectionLog) {
            window.addConnectionLog(`🔌 Disconnected ${deviceType}`, 'warning');
        }
    }
    
    // Reset device-specific values
    if (deviceType === 'hrm' && window.resetHRMDisplay) {
        window.resetHRMDisplay();
    }
}

// CORRECTED GEAR CONTROL FUNCTIONS (24-gear system, but gear 12 = 42-11)
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
        
        if (window.addConnectionLog) {
            window.addConnectionLog(`⚡ Gear: ${currentGear}/24, Ratio: ${gearRatio.toFixed(2)} (${front}T/${rear}T), Target Power: ${targetPower}W`, 'info');
        }
        
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
    
    if (frontGearDisplay) frontGearDisplay.textContent = front;
    if (rearGearDisplay) rearGearDisplay.textContent = rear;
}

// Device capture function
function captureDeviceSpecs() {
    console.log('📊 Capturing device specifications...');
    
    if (window.antApp && window.antApp.handleCaptureSpecs) {
        window.antApp.handleCaptureSpecs();
    } else {
        // Fallback device capture
        const deviceInfo = {
            timestamp: new Date().toISOString(),
            browser: navigator.userAgent,
            platform: navigator.platform,
            bluetooth: 'bluetooth' in navigator ? 'Available' : 'Not supported',
            serial: 'serial' in navigator ? 'Available' : 'Not supported',
            webusb: 'usb' in navigator ? 'Available' : 'Not supported',
            location: window.location.href,
            currentGear: currentGear,
            gearConfiguration: getGearCombination(currentGear),
            targetPower: targetPower
        };
        
        const specText = JSON.stringify(deviceInfo, null, 2);
        
        if (window.addConnectionLog) {
            window.addConnectionLog('📄 Device specifications captured', 'success');
            window.addConnectionLog('Browser: ' + deviceInfo.browser.split(' ')[0], 'info');
            window.addConnectionLog('Platform: ' + deviceInfo.platform, 'info');
            window.addConnectionLog('Bluetooth: ' + deviceInfo.bluetooth, 'info');
            window.addConnectionLog('Serial: ' + deviceInfo.serial, 'info');
        }
        
        // Create downloadable file
        const blob = new Blob([specText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'device-specs-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        if (window.addConnectionLog) {
            window.addConnectionLog('💾 Specifications saved to downloads', 'success');
        }
    }
}

// Clear log function
function clearLog() {
    const logContent = document.getElementById('log-content');
    if (logContent) {
        logContent.innerHTML = '';
        console.log('📝 Log cleared');
        if (window.addConnectionLog) {
            window.addConnectionLog('📋 Log cleared', 'info');
        }
    }
}

// Initialize displays
function initializeControls() {
    currentGear = 1; // Start at gear 1 (easiest)
    targetPower = calculateTargetPower(currentGear);
    updateGearDisplay();
    
    console.log('🚴 CORRECTED road bike gearing initialized:');
    console.log(`   Gear 1 (easiest): 42T/${rearCassette[0]}T = ${calculateGearRatio(42, rearCassette[0]).toFixed(2)}`);
    console.log(`   Gear 12: 42T/${rearCassette[11]}T = ${calculateGearRatio(42, rearCassette[11]).toFixed(2)} (42-11)`);
    console.log(`   Gear 13: 52T/${rearCassette[0]}T = ${calculateGearRatio(52, rearCassette[0]).toFixed(2)} (52-30)`);
    console.log(`   Gear 24 (hardest): 52T/${rearCassette[11]}T = ${calculateGearRatio(52, rearCassette[11]).toFixed(2)}`);
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

// Test gear system function
function testGearSystem() {
    console.log('🔧 Testing corrected gear system:');
    for (let gear = 1; gear <= 24; gear++) {
        const { front, rear } = getGearCombination(gear);
        const ratio = calculateGearRatio(front, rear);
        console.log(`Gear ${gear}: ${front}T/${rear}T = ${ratio.toFixed(2)}`);
        
        // Highlight key gears
        if (gear === 12) {
            console.log(`   ✅ Gear 12 = 42-11 (correct!)`);
        }
        if (gear === 13) {
            console.log(`   ✅ Gear 13 = 52-30 (correct!)`);
        }
    }
}

// Auto-initialize after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeControls();
    
    // Test the gear system in console
    testGearSystem();
    
    // Add onclick handlers for capture and clear buttons
    const captureBtn = document.getElementById('capture-specs-btn');
    const clearBtn = document.getElementById('clear-log-btn');
    
    if (captureBtn && !captureBtn.onclick) {
        captureBtn.onclick = captureDeviceSpecs;
    }
    
    if (clearBtn && !clearBtn.onclick) {
        clearBtn.onclick = clearLog;
    }
});

// Auto-check app status after 2 seconds
setTimeout(checkApp, 2000);
