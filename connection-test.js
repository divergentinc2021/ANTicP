/**
 * Connection Test and Diagnostic Tool
 * Use this to test USB and Bluetooth connections independently
 */

import { logger } from './js/core/logger.js';
import { platform } from './js/core/platform.js';
import { ConnectionManager } from './js/connections/connection-manager-fixed.js';

class ConnectionTester {
    constructor() {
        this.connectionManager = new ConnectionManager();
        this.testResults = {};
    }

    async runDiagnostics() {
        console.log('🔍 Running ANT+ Connection Diagnostics...');
        
        // Initialize logger
        logger.init();
        
        // Detect platform
        await platform.detect();
        console.log(`📱 Platform: ${platform.info.name}`);
        console.log(`🌐 Browser: ${navigator.userAgent}`);
        
        // Check available connection methods
        const methods = await this.connectionManager.checkAvailableConnectionMethods();
        console.log('📋 Available Connection Methods:', methods);
        
        // Test USB capabilities
        await this.testUSBCapabilities();
        
        // Test Bluetooth capabilities
        await this.testBluetoothCapabilities();
        
        // Display summary
        this.displaySummary();
    }

    async testUSBCapabilities() {
        console.log('\n🔌 Testing USB Capabilities...');
        
        this.testResults.usb = {
            apiSupported: 'serial' in navigator,
            browserSupported: navigator.userAgent.includes('Chrome') || navigator.userAgent.includes('Edge'),
            platform: platform.info.name,
            issues: []
        };

        if (!this.testResults.usb.apiSupported) {
            this.testResults.usb.issues.push('Web Serial API not supported');
        }

        if (!this.testResults.usb.browserSupported) {
            this.testResults.usb.issues.push('Browser not supported (use Chrome or Edge)');
        }

        if (platform.info.isMobile) {
            this.testResults.usb.issues.push('USB not available on mobile devices');
        }

        console.log('USB Test Results:', this.testResults.usb);
    }

    async testBluetoothCapabilities() {
        console.log('\n📱 Testing Bluetooth Capabilities...');
        
        this.testResults.bluetooth = {
            apiSupported: 'bluetooth' in navigator,
            httpsRequired: location.protocol === 'https:' || location.hostname === 'localhost',
            bluetoothAvailable: false,
            locationPermission: 'unknown',
            issues: []
        };

        if (!this.testResults.bluetooth.apiSupported) {
            this.testResults.bluetooth.issues.push('Web Bluetooth API not supported');
        }

        if (!this.testResults.bluetooth.httpsRequired) {
            this.testResults.bluetooth.issues.push('HTTPS required for Bluetooth');
        }

        if (this.testResults.bluetooth.apiSupported) {
            try {
                this.testResults.bluetooth.bluetoothAvailable = await navigator.bluetooth.getAvailability();
                if (!this.testResults.bluetooth.bluetoothAvailable) {
                    this.testResults.bluetooth.issues.push('Bluetooth not available on device');
                }
            } catch (error) {
                this.testResults.bluetooth.issues.push(`Bluetooth availability check failed: ${error.message}`);
            }
        }

        // Check location permission on Android
        if (platform.info.isAndroid && 'permissions' in navigator) {
            try {
                const result = await navigator.permissions.query({name: 'geolocation'});
                this.testResults.bluetooth.locationPermission = result.state;
                if (result.state !== 'granted') {
                    this.testResults.bluetooth.issues.push('Location permission required on Android');
                }
            } catch (error) {
                this.testResults.bluetooth.issues.push('Could not check location permission');
            }
        }

        console.log('Bluetooth Test Results:', this.testResults.bluetooth);
    }

    displaySummary() {
        console.log('\n📊 Connection Diagnostic Summary:');
        console.log('=====================================');
        
        // USB Summary
        const usbStatus = this.testResults.usb.issues.length === 0 ? '✅ READY' : '❌ ISSUES';
        console.log(`🔌 USB ANT+: ${usbStatus}`);
        if (this.testResults.usb.issues.length > 0) {
            this.testResults.usb.issues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        // Bluetooth Summary
        const bluetoothStatus = this.testResults.bluetooth.issues.length === 0 ? '✅ READY' : '❌ ISSUES';
        console.log(`📱 Bluetooth: ${bluetoothStatus}`);
        if (this.testResults.bluetooth.issues.length > 0) {
            this.testResults.bluetooth.issues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (this.testResults.usb.issues.length > 0) {
            console.log('   For USB ANT+:');
            console.log('   • Use Chrome or Edge browser (89+)');
            console.log('   • Use a desktop/laptop computer');
            console.log('   • Make sure ANT+ USB stick is plugged in');
        }
        
        if (this.testResults.bluetooth.issues.length > 0) {
            console.log('   For Bluetooth:');
            console.log('   • Use HTTPS or localhost');
            console.log('   • Enable Bluetooth on your device');
            console.log('   • Grant location permission (Android)');
            console.log('   • Use Chrome, Edge, or Opera browser');
        }
    }

    // Manual connection test methods
    async testUSBConnection() {
        console.log('\n🔌 Testing USB Connection...');
        try {
            const connection = await this.connectionManager.connectUSB();
            console.log('✅ USB connection successful!');
            console.log('📊 Connection status:', connection.getStatus());
            
            // Disconnect after test
            setTimeout(async () => {
                await this.connectionManager.disconnectUSB();
                console.log('🔌 Test USB connection closed');
            }, 5000);
            
        } catch (error) {
            console.error('❌ USB connection test failed:', error.message);
        }
    }

    async testBluetoothConnection() {
        console.log('\n📱 Testing Bluetooth Connection...');
        try {
            const connection = await this.connectionManager.connectBluetooth();
            console.log('✅ Bluetooth connection successful!');
            console.log('📊 Connection status:', connection.getStatus());
            
            // Disconnect after test
            setTimeout(async () => {
                await this.connectionManager.disconnectBluetooth();
                console.log('📱 Test Bluetooth connection closed');
            }, 5000);
            
        } catch (error) {
            console.error('❌ Bluetooth connection test failed:', error.message);
        }
    }
}

// Make tester available globally for manual testing
window.connectionTester = new ConnectionTester();

// Auto-run diagnostics when loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.connectionTester.runDiagnostics();
        console.log('\n🧪 Manual Test Commands:');
        console.log('   connectionTester.testUSBConnection()     - Test USB ANT+ connection');
        console.log('   connectionTester.testBluetoothConnection() - Test Bluetooth connection');
    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
    }
});

export { ConnectionTester };
