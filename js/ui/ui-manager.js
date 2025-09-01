/**
 * UI Manager - Handles all user interface updates and interactions
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from '../core/logger.js';
import { platform } from '../core/platform.js';

export class UIManager extends EventEmitter {
    constructor() {
        super();
        this.elements = {};
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        this.cacheElements();
        this.setupEventListeners();
        this.setupPlatformDisplay();
        this.initialized = true;
        
        logger.info('🎨 UI Manager initialized');
    }

    cacheElements() {
        // Platform elements
        this.elements.platformDetected = document.getElementById('platform-detected');
        this.elements.platformCapabilities = document.getElementById('platform-capabilities');
        this.elements.androidInstructions = document.getElementById('android-instructions');
        
        // Permission elements
        this.elements.httpsStatus = document.getElementById('https-status');
        this.elements.httpsIndicator = document.getElementById('https-indicator');
        this.elements.bluetoothApiStatus = document.getElementById('bluetooth-api-status');
        this.elements.bluetoothApiIndicator = document.getElementById('bluetooth-api-indicator');
        this.elements.locationStatus = document.getElementById('location-status');
        this.elements.locationIndicator = document.getElementById('location-indicator');
        this.elements.requestLocationBtn = document.getElementById('request-location-btn');
        this.elements.bluetoothStatus = document.getElementById('bluetooth-status');
        this.elements.bluetoothIndicator = document.getElementById('bluetooth-indicator');
        
        // Connection elements
        this.elements.usbMethod = document.getElementById('usb-method');
        this.elements.bluetoothMethod = document.getElementById('bluetooth-method');
        this.elements.usbConnectBtn = document.getElementById('usb-connect-btn');
        this.elements.bluetoothConnectBtn = document.getElementById('bluetooth-connect-btn');
        this.elements.connectionStatus = document.getElementById('connection-status');
        this.elements.statusText = document.getElementById('status-text');
        
        // Device buttons
        this.elements.scanKickrBtn = document.getElementById('scan-kickr-btn');
        this.elements.scanZwiftBtn = document.getElementById('scan-zwift-btn');
        this.elements.scanHrmBtn = document.getElementById('scan-hrm-btn');
        
        // Device cards
        this.elements.kickrCard = document.getElementById('kickr-card');
        this.elements.zwiftCard = document.getElementById('zwift-click-card');
        this.elements.hrmCard = document.getElementById('hrm-card');
        
        // Warning messages
        this.elements.usbAndroidWarning = document.getElementById('usb-android-warning');
        
        // Log elements
        this.elements.logContent = document.getElementById('log-content');
    }

    setupEventListeners() {
        // Connection buttons
        if (this.elements.usbConnectBtn) {
            this.elements.usbConnectBtn.addEventListener('click', () => {
                this.emit('usb-connect-requested');
            });
        }
        
        if (this.elements.bluetoothConnectBtn) {
            this.elements.bluetoothConnectBtn.addEventListener('click', () => {
                this.emit('bluetooth-connect-requested');
            });
        }
        
        // Device pairing buttons
        if (this.elements.scanKickrBtn) {
            this.elements.scanKickrBtn.addEventListener('click', () => {
                this.emit('device-pair-requested', 'kickr');
            });
        }
        
        if (this.elements.scanZwiftBtn) {
            this.elements.scanZwiftBtn.addEventListener('click', () => {
                this.emit('device-pair-requested', 'zwift-click');
            });
        }
        
        if (this.elements.scanHrmBtn) {
            this.elements.scanHrmBtn.addEventListener('click', () => {
                this.emit('device-pair-requested', 'hrm');
            });
        }
        
        // Location permission button
        if (this.elements.requestLocationBtn) {
            this.elements.requestLocationBtn.addEventListener('click', () => {
                this.emit('location-permission-requested');
            });
        }
        
        // Clear log button
        const clearLogBtn = document.querySelector('.clear-log, button[onclick="clearLog()"]');
        if (clearLogBtn) {
            clearLogBtn.addEventListener('click', () => {
                this.emit('clear-log-requested');
            });
        }
        
        // Device specs capture button
        const captureBtn = document.querySelector('button[onclick="captureDeviceSpecs()"]');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => {
                this.emit('capture-specs-requested');
            });
        }
    }

    setupPlatformDisplay() {
        // Listen to platform events
        platform.on('platform-detected', (info) => {
            this.updatePlatformDisplay(info);
        });
        
        platform.on('permissions-checked', (permissions) => {
            this.updatePermissionsDisplay(permissions);
        });
        
        platform.on('location-permission-changed', (state) => {
            this.updateLocationPermission(state);
        });
    }

    updatePlatformDisplay(platformInfo) {
        if (this.elements.platformDetected) {
            this.elements.platformDetected.textContent = `📱 Platform: ${platformInfo.name}`;
        }
        
        if (this.elements.platformCapabilities) {
            let capabilities = [];
            if (platformInfo.hasWebSerial) capabilities.push('USB ANT+');
            if (platformInfo.hasWebBluetooth) capabilities.push('Bluetooth');
            if (platformInfo.hasWebUSB) capabilities.push('WebUSB');
            
            if (capabilities.length > 0) {
                this.elements.platformCapabilities.textContent = `✅ Available APIs: ${capabilities.join(', ')}`;
                this.elements.platformCapabilities.style.color = '#27ae60';
            } else {
                this.elements.platformCapabilities.textContent = '❌ Limited connectivity options available';
                this.elements.platformCapabilities.style.color = '#e74c3c';
            }
        }
        
        // Show Android-specific instructions
        if (platformInfo.isAndroid) {
            if (this.elements.androidInstructions) {
                this.elements.androidInstructions.style.display = 'block';
            }
            if (this.elements.usbAndroidWarning) {
                this.elements.usbAndroidWarning.style.display = 'block';
            }
        }
    }

    updatePermissionsDisplay(permissions) {
        this.updatePermissionItem('https-status', 'https-indicator', permissions.https);
        this.updatePermissionItem('bluetooth-api-status', 'bluetooth-api-indicator', permissions.webBluetooth);
        this.updatePermissionItem('bluetooth-status', 'bluetooth-indicator', 
            permissions.webBluetooth && permissions.https && 
            (!platform.info.isAndroid || permissions.location === 'granted'));
        
        // Location permission (Android only)
        if (platform.info.isAndroid) {
            if (this.elements.locationStatus) {
                this.elements.locationStatus.style.display = 'flex';
            }
            this.updateLocationPermission(permissions.location);
        }
    }

    updatePermissionItem(itemId, indicatorId, granted) {
        const item = document.getElementById(itemId);
        const indicator = document.getElementById(indicatorId);
        
        if (!item || !indicator) return;
        
        if (granted === true) {
            item.className = 'permission-item permission-granted';
            indicator.textContent = '✅';
        } else if (granted === false) {
            item.className = 'permission-item permission-denied';
            indicator.textContent = '❌';
        } else {
            item.className = 'permission-item permission-unknown';
            indicator.textContent = '❓';
        }
    }

    updateLocationPermission(state) {
        this.updatePermissionItem('location-status', 'location-indicator', state === 'granted');
        
        if (this.elements.requestLocationBtn) {
            if (state === 'prompt') {
                this.elements.requestLocationBtn.style.display = 'inline-block';
            } else {
                this.elements.requestLocationBtn.style.display = 'none';
            }
        }
    }

    updateConnectionMethods() {
        // USB Method
        if (platform.isUSBSupported()) {
            this.setConnectionMethodAvailable('usb-method', 'usb-connect-btn', true);
        } else {
            this.setConnectionMethodAvailable('usb-method', 'usb-connect-btn', false);
        }
        
        // Bluetooth Method
        if (platform.isBluetoothSupported()) {
            this.setConnectionMethodAvailable('bluetooth-method', 'bluetooth-connect-btn', true);
            this.setDeviceButtonsEnabled(true);
        } else {
            this.setConnectionMethodAvailable('bluetooth-method', 'bluetooth-connect-btn', false);
            this.setDeviceButtonsEnabled(false);
        }
    }

    setConnectionMethodAvailable(methodId, buttonId, available) {
        const method = document.getElementById(methodId);
        const button = document.getElementById(buttonId);
        
        if (!method || !button) return;
        
        if (available) {
            method.classList.remove('unavailable');
            method.classList.add('available');
            button.disabled = false;
        } else {
            method.classList.remove('available');
            method.classList.add('unavailable');
            button.disabled = true;
        }
    }

    setDeviceButtonsEnabled(enabled) {
        const buttons = [
            this.elements.scanKickrBtn,
            this.elements.scanZwiftBtn,
            this.elements.scanHrmBtn
        ];
        
        buttons.forEach(btn => {
            if (btn) {
                btn.disabled = !enabled;
            }
        });
    }

    updateConnectionStatus(message, type) {
        if (!this.elements.connectionStatus || !this.elements.statusText) return;
        
        this.elements.connectionStatus.style.display = 'block';
        this.elements.statusText.textContent = message;
        
        if (type === 'success') {
            this.elements.connectionStatus.style.background = '#d4edda';
            this.elements.connectionStatus.style.color = '#155724';
            this.elements.connectionStatus.style.border = '1px solid #c3e6cb';
        } else if (type === 'error') {
            this.elements.connectionStatus.style.background = '#f8d7da';
            this.elements.connectionStatus.style.color = '#721c24';
            this.elements.connectionStatus.style.border = '1px solid #f5c6cb';
        } else {
            this.elements.connectionStatus.style.background = '#fff3cd';
            this.elements.connectionStatus.style.color = '#856404';
            this.elements.connectionStatus.style.border = '1px solid #ffeaa7';
        }
    }

    setConnectionMethodActive(type, active) {
        const methodElement = type === 'usb' ? this.elements.usbMethod : this.elements.bluetoothMethod;
        
        if (!methodElement) return;
        
        if (active) {
            methodElement.classList.add('active');
        } else {
            methodElement.classList.remove('active');
        }
    }

    updateDeviceStatus(deviceType, status) {
        const statusIndicator = document.getElementById(`${deviceType}-status`);
        const statusText = document.getElementById(`${deviceType}-status-text`);
        const card = document.getElementById(`${deviceType}-card`) || 
                     document.getElementById(`${deviceType === 'trainer' ? 'kickr' : deviceType}-card`);
        
        if (!statusIndicator || !statusText) return;
        
        switch (status) {
            case 'receiving':
            case 'active':
                statusIndicator.className = 'status-indicator status-active';
                statusText.textContent = 'Broadcasting';
                if (card) card.classList.add('receiving');
                break;
            case 'searching':
            case 'connecting':
                statusIndicator.className = 'status-indicator status-searching';
                statusText.textContent = 'Searching...';
                if (card) card.classList.remove('receiving');
                break;
            default:
                statusIndicator.className = 'status-indicator status-inactive';
                statusText.textContent = 'No Signal';
                if (card) card.classList.remove('receiving');
                break;
        }
    }

    updateDeviceMetrics(deviceType, metrics) {
        // Update metrics based on device type
        switch (deviceType) {
            case 'kickr':
            case 'trainer':
                this.updateKickrMetrics(metrics);
                break;
            case 'hrm':
            case 'heart-rate':
                this.updateHRMMetrics(metrics);
                break;
            case 'zwift-click':
            case 'shifter':
                this.updateZwiftClickMetrics(metrics);
                break;
        }
    }

    updateKickrMetrics(data) {
        this.setElementText('kickr-power-value', data.power || '---');
        this.setElementText('kickr-cadence-value', data.cadence || '---');
        this.setElementText('kickr-speed-value', data.speed || '---');
        this.setElementText('kickr-resistance-value', data.resistance || '---');
        
        // Update session data if needed
        if (data.distance !== undefined) {
            this.setElementText('kickr-distance-value', data.distance);
        }
        if (data.time !== undefined) {
            this.setElementText('kickr-time-value', data.time);
        }
        
        this.updateDeviceStatus('kickr', 'receiving');
        this.animateMetricUpdate('kickr-power-metric');
        this.setElementText('kickr-last-update', `Last update: ${new Date().toLocaleTimeString()}`);
    }

    updateHRMMetrics(data) {
        this.setElementText('hr-current-value', data.heartRate || '---');
        
        if (data.avgHR !== undefined) {
            this.setElementText('hr-avg-value', data.avgHR);
        }
        
        this.updateDeviceStatus('hrm', 'receiving');
        this.animateMetricUpdate('hr-current-metric');
        this.setElementText('hrm-last-update', `Last update: ${new Date().toLocaleTimeString()}`);
    }

    updateZwiftClickMetrics(data) {
        if (data.gear !== undefined) {
            this.setElementText('zwift-gear', data.gear);
        }
        if (data.frontGear !== undefined) {
            this.setElementText('zwift-front-gear', data.frontGear);
        }
        if (data.rearGear !== undefined) {
            this.setElementText('zwift-rear-gear', data.rearGear);
        }
        
        this.updateDeviceStatus('zwift', 'receiving');
        this.setElementText('zwift-last-update', `Last update: ${new Date().toLocaleTimeString()}`);
    }

    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    animateMetricUpdate(metricId) {
        const metric = document.getElementById(metricId);
        if (metric) {
            metric.classList.add('updated');
            setTimeout(() => metric.classList.remove('updated'), 300);
        }
    }

    showMessage(message, type = 'info') {
        // Create or update a message display area
        let messageArea = document.getElementById('message-area');
        if (!messageArea) {
            messageArea = document.createElement('div');
            messageArea.id = 'message-area';
            messageArea.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 300px;
                z-index: 1000;
            `;
            document.body.appendChild(messageArea);
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            margin-bottom: 10px;
            padding: 10px;
            border-radius: 5px;
            animation: slideIn 0.3s ease;
        `;
        
        messageArea.appendChild(messageDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }

    clearLog() {
        if (this.elements.logContent) {
            this.elements.logContent.textContent = '';
        }
    }
}
