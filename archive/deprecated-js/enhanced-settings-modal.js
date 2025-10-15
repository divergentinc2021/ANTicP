/**
 * Enhanced Settings Modal Handler
 * Handles all the settings modal functionality that was missing onclick handlers
 */

class EnhancedSettingsModal {
    constructor() {
        this.isInitialized = false;
        this.connectedDevices = new Map();
        this.availableDevices = new Map();
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupModalEventHandlers();
        this.setupSettingsButtonHandlers();
        this.checkSystemPermissions();
        
        this.isInitialized = true;
        console.log('✅ Enhanced Settings Modal initialized');
    }

    setupModalEventHandlers() {
        // Modal open/close handlers are already in the main HTML
        // Just ensure the system checks run when modal opens
        const serialCog = document.getElementById('serial-permissions-cog');
        if (serialCog) {
            const originalClickHandler = serialCog.onclick;
            serialCog.onclick = (e) => {
                if (originalClickHandler) originalClickHandler(e);
                setTimeout(() => this.refreshSystemStatus(), 100);
            };
        }
    }

    setupSettingsButtonHandlers() {
        // Auto Pair Bluetooth Serial button
        const autoPairBtn = document.getElementById('auto-pair-bluetooth-serial');
        if (autoPairBtn) {
            autoPairBtn.onclick = () => this.handleAutoPairBluetoothSerial();
        }

        // Scan Available Devices button
        const scanDevicesBtn = document.getElementById('scan-available-devices');
        if (scanDevicesBtn) {
            scanDevicesBtn.onclick = () => this.handleScanAvailableDevices();
        }

        // Test Kickr Simulator button
        const testSimulatorBtn = document.getElementById('test-kickr-simulator');
        if (testSimulatorBtn) {
            testSimulatorBtn.onclick = () => this.handleTestKickrSimulator();
        }

        // Reset Connections button
        const resetConnectionsBtn = document.getElementById('reset-connections');
        if (resetConnectionsBtn) {
            resetConnectionsBtn.onclick = () => this.handleResetConnections();
        }

        // Manual testing buttons
        const scanBluetoothBtn = document.getElementById('scan-bluetooth');
        if (scanBluetoothBtn) {
            scanBluetoothBtn.onclick = () => this.handleScanBluetooth();
        }

        const scanSerialBtn = document.getElementById('scan-serial');
        if (scanSerialBtn) {
            scanSerialBtn.onclick = () => this.handleScanSerial();
        }

        const checkPortsBtn = document.getElementById('check-ports');
        if (checkPortsBtn) {
            checkPortsBtn.onclick = () => this.handleCheckPorts();
        }

        const testPermissionsBtn = document.getElementById('test-permissions');
        if (testPermissionsBtn) {
            testPermissionsBtn.onclick = () => this.handleTestPermissions();
        }
    }

    addLog(message) {
        const log = document.getElementById('serial-log');
        if (log) {
            const timestamp = new Date().toLocaleTimeString();
            log.textContent += `[${timestamp}] ${message}\n`;
            log.scrollTop = log.scrollHeight;
            
            // Keep log manageable
            const lines = log.textContent.split('\n');
            if (lines.length > 100) {
                log.textContent = lines.slice(-80).join('\n');
            }
        }
    }

    updateStatus(elementId, text, success = true) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            element.style.color = success ? '#28a745' : '#dc3545';
            element.style.fontWeight = 'bold';
        }
    }

    async handleAutoPairBluetoothSerial() {
        this.addLog('🤖 Starting Auto-Pair Bluetooth Serial...');
        this.updateStatus('bluetooth-serial-status', 'Auto-pairing in progress...', false);

        try {
            // Check if Web Serial API is available
            if (!navigator.serial) {
                throw new Error('Web Serial API not supported');
            }

            // Request serial port access
            const port = await navigator.serial.requestPort();
            this.addLog(`✅ Serial port selected: ${port.constructor.name}`);

            // Try to open the port with common baud rates
            const baudRates = [9600, 115200, 57600, 38400, 19200];
            let connected = false;

            for (const baudRate of baudRates) {
                try {
                    await port.open({ baudRate });
                    this.addLog(`✅ Connected at ${baudRate} baud`);
                    connected = true;
                    
                    // Store connection for later use
                    this.connectedDevices.set('serial', { port, baudRate });
                    
                    // Set up data reading
                    this.setupSerialDataReader(port);
                    break;
                } catch (error) {
                    this.addLog(`⚠️ Failed at ${baudRate} baud: ${error.message}`);
                    try {
                        await port.close();
                    } catch (closeError) {
                        // Ignore close errors
                    }
                }
            }

            if (connected) {
                this.updateStatus('bluetooth-serial-status', 'Serial bridge connected successfully!', true);
            } else {
                throw new Error('Could not connect at any baud rate');
            }

        } catch (error) {
            this.addLog(`❌ Auto-pair failed: ${error.message}`);
            this.updateStatus('bluetooth-serial-status', 'Auto-pairing failed', false);
        }
    }

    async setupSerialDataReader(port) {
        try {
            const reader = port.readable.getReader();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                // Convert received data to string
                const text = new TextDecoder().decode(value);
                this.addLog(`📡 Serial data: ${text.trim()}`);
                
                // Parse ANT+ data if applicable
                this.parseSerialAntData(text);
            }
        } catch (error) {
            this.addLog(`⚠️ Serial reader error: ${error.message}`);
        }
    }

    parseSerialAntData(data) {
        // Basic ANT+ data parsing
        if (data.includes('HR:')) {
            const hrMatch = data.match(/HR:(\d+)/);
            if (hrMatch) {
                const heartRate = parseInt(hrMatch[1]);
                this.addLog(`❤️ Heart Rate from serial: ${heartRate} BPM`);
                
                // Update HRM display if available
                if (window.deviceConnectionLogger) {
                    window.deviceConnectionLogger.logData('hrm', { heartRate });
                }
            }
        }
        
        if (data.includes('PWR:')) {
            const pwrMatch = data.match(/PWR:(\d+)/);
            if (pwrMatch) {
                const power = parseInt(pwrMatch[1]);
                this.addLog(`⚡ Power from serial: ${power}W`);
                
                // Update trainer display if available
                if (window.deviceConnectionLogger) {
                    window.deviceConnectionLogger.logData('kickr', { power });
                }
            }
        }
    }

    async handleScanAvailableDevices() {
        this.addLog('🔍 Scanning for all available devices...');
        
        // Scan for Bluetooth devices
        if (navigator.bluetooth) {
            try {
                this.addLog('📶 Scanning Bluetooth devices...');
                
                // Scan for different device types
                const deviceTypes = [
                    { name: 'Heart Rate Monitors', filters: [{ services: [0x180D] }] },
                    { name: 'Trainers/Power Meters', filters: [{ services: [0x1826] }, { services: [0x1818] }] },
                    { name: 'Zwift Click', filters: [{ namePrefix: 'Zwift' }, { services: [0x1812] }] }
                ];

                for (const deviceType of deviceTypes) {
                    try {
                        const device = await navigator.bluetooth.requestDevice({
                            filters: deviceType.filters,
                            optionalServices: [0x180D, 0x1826, 0x1818, 0x1812, 0x180A, 0x180F]
                        });
                        
                        this.addLog(`✅ Found ${deviceType.name}: ${device.name || 'Unknown'}`);
                        this.availableDevices.set(device.id, { device, type: deviceType.name });
                        
                    } catch (error) {
                        if (error.name !== 'NotFoundError') {
                            this.addLog(`⚠️ ${deviceType.name} scan error: ${error.message}`);
                        }
                    }
                }
                
            } catch (error) {
                this.addLog(`❌ Bluetooth scan failed: ${error.message}`);
            }
        }

        // Scan for Serial devices
        if (navigator.serial) {
            try {
                this.addLog('🔌 Checking serial ports...');
                const ports = await navigator.serial.getPorts();
                this.addLog(`📋 Found ${ports.length} serial ports with permissions`);
                
                ports.forEach((port, index) => {
                    const info = port.getInfo();
                    this.addLog(`  Port ${index + 1}: Vendor=${info.usbVendorId || 'Unknown'}, Product=${info.usbProductId || 'Unknown'}`);
                });
                
            } catch (error) {
                this.addLog(`❌ Serial scan failed: ${error.message}`);
            }
        }

        this.addLog('✅ Device scan completed');
    }

    handleTestKickrSimulator() {
        this.addLog('🚴 Launching Enhanced Kickr Simulator...');
        
        // Use the existing simulator launch function
        if (typeof launchEnhancedKickrSimulator === 'function') {
            launchEnhancedKickrSimulator();
            this.addLog('✅ Simulator launched successfully');
        } else {
            // Fallback: open simulator directly
            const simulatorWindow = window.open('enhanced-kickr-simulator.html', '_blank', 'width=950,height=750');
            if (simulatorWindow) {
                this.addLog('✅ Simulator window opened');
            } else {
                this.addLog('❌ Failed to open simulator (popup blocked?)');
            }
        }
    }

    async handleResetConnections() {
        this.addLog('🔄 Resetting all connections...');
        
        // Disconnect all stored connections
        for (const [key, connection] of this.connectedDevices) {
            try {
                if (connection.port) {
                    await connection.port.close();
                    this.addLog(`✅ Disconnected serial ${key}`);
                } else if (connection.device && connection.device.gatt) {
                    await connection.device.gatt.disconnect();
                    this.addLog(`✅ Disconnected Bluetooth ${key}`);
                }
            } catch (error) {
                this.addLog(`⚠️ Error disconnecting ${key}: ${error.message}`);
            }
        }
        
        // Clear stored connections
        this.connectedDevices.clear();
        this.availableDevices.clear();
        
        // Reset UI status indicators
        const statusElements = ['kickr-status-text', 'zwift-status-text', 'hrm-status-text'];
        statusElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Ready to Pair';
            }
        });
        
        const indicators = ['kickr-status', 'zwift-status', 'hrm-status'];
        indicators.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.className = 'status-indicator status-inactive';
            }
        });
        
        // Reset enhanced status
        this.updateStatus('bluetooth-serial-status', 'All connections reset - ready for new connections', true);
        
        this.addLog('✅ All connections reset successfully');
    }

    async handleScanBluetooth() {
        this.addLog('📶 Scanning for Bluetooth devices...');
        
        if (!navigator.bluetooth) {
            this.addLog('❌ Bluetooth not available');
            return;
        }

        try {
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [0x180D, 0x1826, 0x1818, 0x1812, 0x180A, 0x180F]
            });
            
            this.addLog(`✅ Selected: ${device.name || 'Unknown Device'}`);
            this.addLog(`   ID: ${device.id}`);
            
            // Try to connect and get info
            try {
                const server = await device.gatt.connect();
                const services = await server.getPrimaryServices();
                
                this.addLog(`📋 Found ${services.length} services:`);
                services.forEach((service, index) => {
                    this.addLog(`  Service ${index + 1}: ${service.uuid}`);
                });
                
                await device.gatt.disconnect();
                
            } catch (connectError) {
                this.addLog(`⚠️ Could not connect for details: ${connectError.message}`);
            }
            
        } catch (error) {
            if (error.name !== 'NotFoundError') {
                this.addLog(`❌ Bluetooth scan failed: ${error.message}`);
            } else {
                this.addLog('⚠️ No device selected');
            }
        }
    }

    async handleScanSerial() {
        this.addLog('🔌 Requesting serial port access...');
        
        if (!navigator.serial) {
            this.addLog('❌ Web Serial API not supported');
            return;
        }

        try {
            const port = await navigator.serial.requestPort();
            const info = port.getInfo();
            
            this.addLog('✅ Serial port selected:');
            this.addLog(`   Vendor ID: ${info.usbVendorId || 'Unknown'}`);
            this.addLog(`   Product ID: ${info.usbProductId || 'Unknown'}`);
            this.addLog(`   Serial Number: ${info.usbSerialNumber || 'Unknown'}`);
            
        } catch (error) {
            if (error.name !== 'NotFoundError') {
                this.addLog(`❌ Serial port selection failed: ${error.message}`);
            } else {
                this.addLog('⚠️ No serial port selected');
            }
        }
    }

    async handleCheckPorts() {
        this.addLog('📋 Checking existing port permissions...');
        
        if (navigator.serial) {
            try {
                const ports = await navigator.serial.getPorts();
                this.addLog(`✅ Found ${ports.length} ports with permissions:`);
                
                ports.forEach((port, index) => {
                    const info = port.getInfo();
                    this.addLog(`  Port ${index + 1}:`);
                    this.addLog(`    Vendor: 0x${(info.usbVendorId || 0).toString(16).padStart(4, '0')}`);
                    this.addLog(`    Product: 0x${(info.usbProductId || 0).toString(16).padStart(4, '0')}`);
                    if (info.usbSerialNumber) {
                        this.addLog(`    Serial: ${info.usbSerialNumber}`);
                    }
                });
                
                if (ports.length === 0) {
                    this.addLog('💡 No ports found. Click "Get Serial" to grant access to a device.');
                }
                
            } catch (error) {
                this.addLog(`❌ Could not check ports: ${error.message}`);
            }
        } else {
            this.addLog('❌ Web Serial API not supported');
        }
        
        // Also check Bluetooth devices
        if (navigator.bluetooth) {
            this.addLog('📶 Checking Bluetooth availability...');
            try {
                const available = await navigator.bluetooth.getAvailability();
                this.addLog(`✅ Bluetooth available: ${available}`);
            } catch (error) {
                this.addLog(`⚠️ Could not check Bluetooth: ${error.message}`);
            }
        }
    }

    async handleTestPermissions() {
        this.addLog('🔐 Testing all permissions...');
        
        // Test HTTPS
        const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
        this.addLog(`🔒 HTTPS: ${isHTTPS ? '✅ Secure' : '❌ Not secure'}`);
        
        // Test Bluetooth API
        const hasBluetooth = 'bluetooth' in navigator;
        this.addLog(`📶 Bluetooth API: ${hasBluetooth ? '✅ Available' : '❌ Not available'}`);
        
        if (hasBluetooth) {
            try {
                const available = await navigator.bluetooth.getAvailability();
                this.addLog(`   Bluetooth hardware: ${available ? '✅ Available' : '❌ Not available'}`);
            } catch (error) {
                this.addLog(`   Bluetooth check failed: ${error.message}`);
            }
        }
        
        // Test Serial API
        const hasSerial = 'serial' in navigator;
        this.addLog(`🔌 Serial API: ${hasSerial ? '✅ Available' : '❌ Not available'}`);
        
        // Test Geolocation (required for Bluetooth on Android)
        if ('geolocation' in navigator) {
            try {
                await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                this.addLog('📍 Location: ✅ Permission granted');
            } catch (error) {
                this.addLog(`📍 Location: ⚠️ ${error.message}`);
            }
        }
        
        // Test Permissions API
        if ('permissions' in navigator) {
            const permissions = ['bluetooth', 'geolocation'];
            for (const permission of permissions) {
                try {
                    const result = await navigator.permissions.query({ name: permission });
                    this.addLog(`🔐 ${permission}: ${result.state}`);
                } catch (error) {
                    this.addLog(`🔐 ${permission}: Could not check (${error.message})`);
                }
            }
        }
        
        this.addLog('✅ Permission test completed');
    }

    async refreshSystemStatus() {
        // Refresh the system status indicators in the modal
        await this.checkSystemPermissions();
    }

    async checkSystemPermissions() {
        // This function should update the status indicators in the modal
        // It's similar to the code already in the HTML but extracted here for reuse
        
        // HTTPS Check
        const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
        const httpsResult = document.getElementById('https-result');
        const httpsStatus = document.getElementById('https-status');
        if (httpsResult && httpsStatus) {
            httpsResult.textContent = isHTTPS ? '✅ Secure' : '❌ Not HTTPS';
            httpsStatus.style.background = isHTTPS ? '#d4edda' : '#f8d7da';
        }
        
        // Bluetooth Check
        const hasBluetoothAPI = 'bluetooth' in navigator;
        const bluetoothResult = document.getElementById('bluetooth-result');
        const bluetoothStatus = document.getElementById('bluetooth-status');
        if (bluetoothResult && bluetoothStatus) {
            bluetoothResult.textContent = hasBluetoothAPI ? '✅ Available' : '❌ Not supported';
            bluetoothStatus.style.background = hasBluetoothAPI ? '#d4edda' : '#f8d7da';
        }
        
        // Serial Check
        const hasSerialAPI = 'serial' in navigator;
        const serialResult = document.getElementById('serial-result');
        const serialStatus = document.getElementById('serial-status');
        if (serialResult && serialStatus) {
            serialResult.textContent = hasSerialAPI ? '✅ Available' : '❌ Not supported';
            serialStatus.style.background = hasSerialAPI ? '#d4edda' : '#f8d7da';
        }
        
        // Location Check (Android specific)
        const isAndroid = /android/i.test(navigator.userAgent);
        const locationResult = document.getElementById('location-result');
        const locationStatus = document.getElementById('location-status');
        if (locationResult && locationStatus) {
            if (isAndroid && 'permissions' in navigator) {
                try {
                    const result = await navigator.permissions.query({name: 'geolocation'});
                    locationResult.textContent = `${result.state === 'granted' ? '✅' : '⚠️'} ${result.state}`;
                    const color = result.state === 'granted' ? '#d4edda' : result.state === 'denied' ? '#f8d7da' : '#fff3cd';
                    locationStatus.style.background = color;
                } catch (error) {
                    locationResult.textContent = '❓ Unknown';
                    locationStatus.style.background = '#fff3cd';
                }
            } else {
                locationResult.textContent = isAndroid ? '❓ Cannot check' : 'ℹ️ Not needed';
                locationStatus.style.background = '#fff3cd';
            }
        }
    }
}

// Initialize the enhanced settings modal
window.enhancedSettingsModal = new EnhancedSettingsModal();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other scripts have loaded
    setTimeout(() => {
        window.enhancedSettingsModal.init();
        console.log('🚀 Enhanced Settings Modal ready');
    }, 100);
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedSettingsModal;
}
