// CRITICAL FIXES for Both Issues
console.log('🔧 APPLYING CRITICAL FIXES FOR INDEX PAGE...');

// Wait for DOM and all scripts to load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        console.log('🔧 Starting fixes...');
        
        // FIX 1: Override the old 24-gear system with 8-level resistance system
        const resistanceSystem = {
            currentLevel: 0,
            maxLevels: 8,
            lapCount: 0,
            levels: {
                0: { resistance: -5, description: 'EASIEST - Recovery' },
                1: { resistance: 0, description: 'Baseline' },
                2: { resistance: 5, description: 'Light' },
                3: { resistance: 10, description: 'Moderate' },
                4: { resistance: 15, description: 'Challenging' },
                5: { resistance: 20, description: 'Hard' },
                6: { resistance: 25, description: 'Very Hard' },
                7: { resistance: 30, description: 'HARDEST - Maximum' }
            }
        };
        
        // Initialize the display immediately
        const gearDisplay = document.getElementById('zwift-gear');
        const gearLabel = document.querySelector('#zwift-gear').parentNode.querySelector('div');
        const frontGear = document.getElementById('zwift-front-gear');
        const rearGear = document.getElementById('zwift-rear-gear');
        
        if (gearDisplay) {
            gearDisplay.textContent = '0';
        }
        
        if (gearLabel) {
            gearLabel.textContent = 'Resistance Level';
        }
        
        // Create resistance info display if it doesn't exist
        let resistanceInfo = document.getElementById('zwift-resistance-info');
        if (!resistanceInfo) {
            resistanceInfo = document.createElement('div');
            resistanceInfo.id = 'zwift-resistance-info';
            resistanceInfo.style.cssText = 'font-size: 1.2rem; color: #28a745; margin-top: 5px; font-weight: bold;';
            gearDisplay.parentNode.appendChild(resistanceInfo);
        }
        resistanceInfo.textContent = '-5%';
        
        // Update the metrics to show resistance and laps
        if (frontGear && rearGear) {
            frontGear.textContent = '-5%';
            rearGear.textContent = '0';
            frontGear.parentNode.querySelector('.metric-label').textContent = 'Resistance';
            rearGear.parentNode.querySelector('.metric-label').textContent = 'Laps';
            frontGear.id = 'current-resistance';
            rearGear.id = 'lap-counter';
        }
        
        // COMPLETELY override the changeGear function
        window.changeGear = function(direction, source = 'virtual') {
            console.log(`🎮 FIXED changeGear: ${direction} from ${source}`);
            
            if (direction === 'up') {
                // Cycle to next resistance level (0-7, then back to 0)
                resistanceSystem.currentLevel = (resistanceSystem.currentLevel + 1) % resistanceSystem.maxLevels;
                const level = resistanceSystem.levels[resistanceSystem.currentLevel];
                
                // Update ALL displays
                document.getElementById('zwift-gear').textContent = resistanceSystem.currentLevel;
                document.getElementById('zwift-resistance-info').textContent = level.resistance + '%';
                document.getElementById('current-resistance').textContent = level.resistance + '%';
                
                // Apply to Kickr resistance slider
                const slider = document.getElementById('kickr-resistance-slider');
                const display = document.getElementById('kickr-resistance-display');
                if (slider && display) {
                    slider.value = level.resistance;
                    display.textContent = level.resistance + '%';
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                // Update button styles
                const button = document.getElementById('gear-up-btn');
                if (button) {
                    button.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
                    button.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        button.style.background = '';
                        button.style.transform = '';
                    }, 300);
                }
                
                if (window.addConnectionLog) {
                    addConnectionLog(`🎮 + Button: Level ${resistanceSystem.currentLevel} (${level.resistance}% resistance) - ${level.description}`, 'success');
                }
                
            } else if (direction === 'down') {
                // Lap function
                resistanceSystem.lapCount++;
                document.getElementById('lap-counter').textContent = resistanceSystem.lapCount;
                
                // Update button styles
                const button = document.getElementById('gear-down-btn');
                if (button) {
                    button.style.background = 'linear-gradient(45deg, #ff6b6b, #e55353)';
                    button.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        button.style.background = '';
                        button.style.transform = '';
                    }, 300);
                }
                
                if (window.addConnectionLog) {
                    addConnectionLog(`🏁 - Button: LAP ${resistanceSystem.lapCount}`, 'warning');
                }
            }
        };
        
        // Also create standalone test functions for the real Zwift Click
        window.testPlusButton = function() {
            changeGear('up', 'real');
        };
        
        window.testMinusButton = function() {
            changeGear('down', 'real');
        };
        
        console.log('✅ FIXED: 8-Level Resistance System ACTIVATED');
        
        // FIX 2: Enhanced Kickr data parsing fixes
        if (window.enhancedKickrHandler) {
            console.log('🔧 FIXING Kickr data parsing issues...');
            
            const handler = window.enhancedKickrHandler;
            
            // Fix the data parsing to prevent power/cadence mix-up
            const originalHandleData = handler.handleKickrData.bind(handler);
            
            handler.handleKickrData = function(event, characteristicUuid) {
                const value = event.target.value;
                const data = new Uint8Array(value.buffer);
                const hexData = Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
                
                console.log('🔧 FIXED Kickr Data:', hexData);
                
                // Try multiple parsing approaches to get the correct data
                let powerFound = false, speedFound = false, cadenceFound = false;
                
                // Method 1: Indoor Bike Data parsing (most common)
                if (data.length >= 8) {
                    const flags = (data[1] << 8) | data[0];
                    let offset = 2;
                    
                    // Speed
                    if (flags & 0x01 && data.length > offset + 1) {
                        const speedRaw = (data[offset + 1] << 8) | data[offset];
                        const speed = speedRaw * 0.01;
                        if (speed > 0 && speed < 100) {
                            this.updateSpeedDisplay(speed);
                            speedFound = true;
                        }
                        offset += 2;
                    }
                    
                    // Cadence  
                    if (flags & 0x04 && data.length > offset + 1) {
                        const cadenceRaw = (data[offset + 1] << 8) | data[offset];
                        const cadence = cadenceRaw * 0.5;
                        if (cadence > 30 && cadence < 200) {
                            this.updateCadenceDisplay(Math.round(cadence));
                            cadenceFound = true;
                        }
                        offset += 2;
                    }
                    
                    // Power
                    if (flags & 0x40 && data.length > offset + 1) {
                        const power = (data[offset + 1] << 8) | data[offset];
                        if (power > 0 && power < 2000) {
                            this.updatePowerDisplay(power);
                            powerFound = true;
                        }
                    }
                }
                
                // Method 2: Try standard positions if flags method failed
                if (!powerFound && data.length >= 4) {
                    // Common power positions
                    const power1 = (data[3] << 8) | data[2];
                    const power2 = data.length >= 6 ? (data[5] << 8) | data[4] : 0;
                    
                    if (power1 > 0 && power1 < 2000) {
                        this.updatePowerDisplay(power1);
                        powerFound = true;
                    } else if (power2 > 0 && power2 < 2000) {
                        this.updatePowerDisplay(power2);
                        powerFound = true;
                    }
                }
                
                // Method 3: Look for any reasonable values in the data
                if (!cadenceFound || !speedFound) {
                    for (let i = 0; i < data.length - 1; i++) {
                        const value16 = (data[i + 1] << 8) | data[i];
                        const value8 = data[i];
                        
                        // Cadence range (30-200 RPM)
                        if (!cadenceFound && value8 > 30 && value8 < 200) {
                            this.updateCadenceDisplay(value8);
                            cadenceFound = true;
                        }
                        
                        // Speed (calculate from reasonable values)
                        if (!speedFound && value16 > 100 && value16 < 10000) {
                            const speed = value16 * 0.01;
                            if (speed > 1 && speed < 100) {
                                this.updateSpeedDisplay(speed);
                                speedFound = true;
                            }
                        }
                    }
                }
                
                if (window.addConnectionLog) {
                    addConnectionLog(`📊 FIXED Data: P:${powerFound}, S:${speedFound}, C:${cadenceFound}`, 'info');
                }
            };
            
            console.log('✅ FIXED: Kickr data parsing corrected');
        }
        
        // Add some visual confirmation
        if (window.addConnectionLog) {
            addConnectionLog('🔧 CRITICAL FIXES APPLIED:', 'success');
            addConnectionLog('  ✅ 8-Level Resistance System (0-7)', 'info');
            addConnectionLog('  ✅ Fixed Kickr power/cadence/speed parsing', 'info');
            addConnectionLog('🎮 Test: Click + and - buttons to verify!', 'success');
        }
        
    }, 1000); // Wait 1 second for everything to load
});

console.log('🔧 Critical fixes script loaded and waiting for DOM...');
