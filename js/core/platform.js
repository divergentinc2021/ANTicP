/**
 * Platform Detection and Capabilities
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from './logger.js';

export class Platform extends EventEmitter {
    constructor() {
        super();
        this.info = {
            name: 'Unknown',
            isMobile: false,
            isAndroid: false,
            isIOS: false,
            hasWebSerial: false,
            hasWebBluetooth: false,
            hasWebUSB: false
        };
        this.permissions = {
            https: false,
            webBluetooth: false,
            location: 'prompt',
            bluetooth: 'prompt'
        };
    }

    async detect() {
        logger.info('🔍 Detecting platform...');
        
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
        const isAndroid = /android/.test(userAgent);
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isWindows = /windows/.test(userAgent);
        const isMac = /macintosh|mac os x/.test(userAgent);
        const isLinux = /linux/.test(userAgent);

        let platformName = 'Unknown';
        if (isAndroid) platformName = 'Android';
        else if (isIOS) platformName = 'iOS';
        else if (isWindows) platformName = 'Windows';
        else if (isMac) platformName = 'macOS';
        else if (isLinux) platformName = 'Linux';

        this.info = {
            name: platformName,
            isMobile: isMobile,
            isAndroid: isAndroid,
            isIOS: isIOS,
            hasWebSerial: 'serial' in navigator,
            hasWebBluetooth: 'bluetooth' in navigator,
            hasWebUSB: 'usb' in navigator
        };

        logger.info(`📱 Platform: ${this.info.name}`);
        
        await this.checkPermissions();
        this.emit('platform-detected', this.info);
        
        return this.info;
    }

    async checkPermissions() {
        // Check HTTPS
        this.permissions.https = location.protocol === 'https:' || location.hostname === 'localhost';
        
        // Check Web Bluetooth API
        this.permissions.webBluetooth = 'bluetooth' in navigator;
        
        // Check location permission (required for Bluetooth on Android)
        if (this.info.isAndroid && 'permissions' in navigator) {
            try {
                const result = await navigator.permissions.query({name: 'geolocation'});
                this.permissions.location = result.state;
            } catch (error) {
                logger.warn('⚠️ Could not check location permission status');
                this.permissions.location = 'unknown';
            }
        }

        this.emit('permissions-checked', this.permissions);
    }

    async requestLocationPermission() {
        if (!this.info.isAndroid) return true;
        
        try {
            await navigator.geolocation.getCurrentPosition(() => {}, () => {});
            const result = await navigator.permissions.query({name: 'geolocation'});
            this.permissions.location = result.state;
            this.emit('location-permission-changed', result.state);
            logger.info('✅ Location permission granted');
            return result.state === 'granted';
        } catch (error) {
            logger.error(`❌ Location permission denied: ${error.message}`);
            return false;
        }
    }

    getCapabilities() {
        let capabilities = [];
        if (this.info.hasWebSerial) capabilities.push('USB ANT+');
        if (this.info.hasWebBluetooth) capabilities.push('Bluetooth');
        if (this.info.hasWebUSB) capabilities.push('WebUSB');
        
        return capabilities;
    }

    isUSBSupported() {
        return this.info.hasWebSerial && !this.info.isMobile;
    }

    isBluetoothSupported() {
        return this.info.hasWebBluetooth && 
               this.permissions.https && 
               (!this.info.isAndroid || this.permissions.location === 'granted');
    }

    showAndroidInstructions() {
        return this.info.isAndroid;
    }
}

// Create global platform instance
export const platform = new Platform();
