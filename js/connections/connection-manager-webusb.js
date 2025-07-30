/**
 * Connection Manager - WebUSB Enhanced Version
 * Includes WebUSB for direct ANT+ communication bypassing COM ports
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from '../core/logger.js';
import { USBANTConnection } from './usb-ant-fixed.js';
import { WebUSBANTConnection } from './webusb-ant.js';
import { BluetoothConnection } from './bluetooth-fixed.js';

export class ConnectionManager extends EventEmitter {
    constructor() {
        super();
        this.connections = new Map();
        this.activeConnection = null;
    }

    async connectUSB() {
        try {
            const usbConnection = new USBANTConnection();
            
            // Set up event listeners
            usbConnection.on('connecting', () => {
                logger.info('🔍 Connecting to USB ANT+ device (Serial)...');
                this.emit('usb-connecting');
            });
            
            usbConnection.on('connected', (data) => {
                this.activeConnection = usbConnection;
                this.connections.set('usb', usbConnection);
                logger.info(`✅ USB ANT+ connected: ${data.deviceName}`);
                this.emit('usb-connected', data);
            });
            
            usbConnection.on('error', (error) => {
                logger.error(`❌ USB connection error: ${error.message}`);
                this.emit('usb-error', error);
            });
            
            usbConnection.on('disconnected', () => {
                this.connections.delete('usb');
                if (this.activeConnection === usbConnection) {
                    this.activeConnection = null;
                }
                logger.info('🔌 USB ANT+ disconnected');
                this.emit('usb-disconnected');
            });
            
            usbConnection.on('device-data', (data) => this.emit('device-data', data));
            
            await usbConnection.connect();
            return usbConnection;
            
        } catch (error) {
            logger.error(`❌ USB connection failed: ${error.message}`);
            throw error;
        }
    }

    async connectWebUSB() {
        try {
            const webusbConnection = new WebUSBANTConnection();
            
            // Set up event listeners
            webusbConnection.on('connecting', () => {
                logger.info('🔍 Connecting to ANT+ device via WebUSB...');
                this.emit('webusb-connecting');
            });
            
            webusbConnection.on('connected', (data) => {
                this.activeConnection = webusbConnection;
                this.connections.set('webusb', webusbConnection);
                logger.info(`✅ WebUSB ANT+ connected: ${data.deviceName}`);
                this.emit('webusb-connected', data);
            });
            
            webusbConnection.on('error', (error) => {
                logger.error(`❌ WebUSB connection error: ${error.message}`);
                this.emit('webusb-error', error);
            });
            
            webusbConnection.on('disconnected', () => {
                this.connections.delete('webusb');
                if (this.activeConnection === webusbConnection) {
                    this.activeConnection = null;
                }
                logger.info('🔌 WebUSB ANT+ disconnected');
                this.emit('webusb-disconnected');
            });
            
            webusbConnection.on('device-data', (data) => this.emit('device-data', data));
            
            await webusbConnection.connect();
            return webusbConnection;
            
        } catch (error) {
            logger.error(`❌ WebUSB connection failed: ${error.message}`);
            throw error;
        }
    }

    async connectBluetooth() {
        try {
            const bluetoothConnection = new BluetoothConnection();
            
            // Set up event listeners
            bluetoothConnection.on('connecting', () => {
                logger.info('🔍 Scanning for Bluetooth devices...');
                this.emit('bluetooth-connecting');
            });
            
            bluetoothConnection.on('connected', (data) => {
                this.activeConnection = bluetoothConnection;
                this.connections.set('bluetooth', bluetoothConnection);
                logger.info(`✅ Bluetooth connected: ${data.deviceName}`);
                this.emit('bluetooth-connected', data);
            });
            
            bluetoothConnection.on('error', (error) => {
                logger.error(`❌ Bluetooth connection error: ${error.message}`);
                this.emit('bluetooth-error', error);
            });
            
            bluetoothConnection.on('disconnected', () => {
                this.connections.delete('bluetooth');
                if (this.activeConnection === bluetoothConnection) {
                    this.activeConnection = null;
                }
                logger.info('🔌 Bluetooth disconnected');
                this.emit('bluetooth-disconnected');
            });
            
            // Forward device-specific data events
            bluetoothConnection.on('device-data', (data) => this.emit('device-data', data));
            bluetoothConnection.on('heart-rate-data', (data) => this.emit('heart-rate-data', data));
            bluetoothConnection.on('power-data', (data) => this.emit('power-data', data));
            bluetoothConnection.on('trainer-data', (data) => this.emit('trainer-data', data));
            bluetoothConnection.on('speed-cadence-data', (data) => this.emit('speed-cadence-data', data));
            
            await bluetoothConnection.connect();
            return bluetoothConnection;
            
        } catch (error) {
            logger.error(`❌ Bluetooth connection failed: ${error.message}`);
            throw error;
        }
    }

    async connectBluetoothDevice(deviceType) {
        try {
            const bluetoothConnection = new BluetoothConnection();
            
            // Set up event listeners
            bluetoothConnection.on('connecting', () => {
                logger.info(`🔍 Connecting to ${deviceType}...`);
                this.emit('bluetooth-connecting');
            });
            
            bluetoothConnection.on('connected', (data) => {
                this.connections.set(`bluetooth-${deviceType}`, bluetoothConnection);
                logger.info(`✅ ${deviceType} connected: ${data.deviceName}`);
                this.emit('bluetooth-device-connected', { ...data, deviceType });
            });
            
            bluetoothConnection.on('error', (error) => {
                logger.error(`❌ ${deviceType} connection error: ${error.message}`);
                this.emit('bluetooth-device-error', { error, deviceType });
            });
            
            bluetoothConnection.on('disconnected', () => {
                this.connections.delete(`bluetooth-${deviceType}`);
                logger.info(`🔌 ${deviceType} disconnected`);
                this.emit('bluetooth-device-disconnected', { deviceType });
            });
            
            // Forward device-specific data events with device type
            bluetoothConnection.on('device-data', (data) => this.emit('device-data', { ...data, deviceType }));
            bluetoothConnection.on('heart-rate-data', (data) => this.emit('heart-rate-data', { ...data, deviceType }));
            bluetoothConnection.on('power-data', (data) => this.emit('power-data', { ...data, deviceType }));
            bluetoothConnection.on('trainer-data', (data) => this.emit('trainer-data', { ...data, deviceType }));
            bluetoothConnection.on('speed-cadence-data', (data) => this.emit('speed-cadence-data', { ...data, deviceType }));
            
            // Get device-specific filters
            let filters;
            switch (deviceType) {
                case 'kickr':
                case 'trainer':
                    filters = BluetoothConnection.getKickrFilters();
                    break;
                case 'zwift-click':
                case 'shifter':
                    filters = BluetoothConnection.getZwiftClickFilters();
                    break;
                case 'hrm':
                case 'heart-rate':
                    filters = BluetoothConnection.getHRMFilters();
                    break;
                default:
                    throw new Error(`Unknown device type: ${deviceType}`);
            }
            
            await bluetoothConnection.connectToSpecificDevice(filters, deviceType);
            return bluetoothConnection;
            
        } catch (error) {
            logger.error(`❌ Bluetooth ${deviceType} connection failed: ${error.message}`);
            throw error;
        }
    }

    async disconnectUSB() {
        const usbConnection = this.connections.get('usb');
        if (usbConnection) {
            try {
                await usbConnection.disconnect();
                logger.info('🔌 USB ANT+ disconnected successfully');
            } catch (error) {
                logger.error(`❌ USB disconnect error: ${error.message}`);
            }
        }
    }

    async disconnectWebUSB() {
        const webusbConnection = this.connections.get('webusb');
        if (webusbConnection) {
            try {
                await webusbConnection.disconnect();
                logger.info('🔌 WebUSB ANT+ disconnected successfully');
            } catch (error) {
                logger.error(`❌ WebUSB disconnect error: ${error.message}`);
            }
        }
    }

    async disconnectBluetooth() {
        const bluetoothConnection = this.connections.get('bluetooth');
        if (bluetoothConnection) {
            try {
                await bluetoothConnection.disconnect();
                logger.info('🔌 Bluetooth disconnected successfully');
            } catch (error) {
                logger.error(`❌ Bluetooth disconnect error: ${error.message}`);
            }
        }
    }

    async disconnectBluetoothDevice(deviceType) {
        const connection = this.connections.get(`bluetooth-${deviceType}`);
        if (connection) {
            try {
                await connection.disconnect();
                logger.info(`🔌 ${deviceType} disconnected successfully`);
            } catch (error) {
                logger.error(`❌ ${deviceType} disconnect error: ${error.message}`);
            }
        }
    }

    async disconnectAll() {
        const disconnectPromises = [];
        
        for (const [key, connection] of this.connections) {
            logger.info(`🔌 Disconnecting ${key}...`);
            disconnectPromises.push(
                connection.disconnect().catch(error => {
                    logger.error(`❌ Error disconnecting ${key}: ${error.message}`);
                })
            );
        }
        
        try {
            await Promise.all(disconnectPromises);
            this.connections.clear();
            this.activeConnection = null;
            logger.info('✅ All connections disconnected');
        } catch (error) {
            logger.error(`❌ Error during disconnect all: ${error.message}`);
        }
    }

    getConnection(type) {
        return this.connections.get(type);
    }

    getActiveConnection() {
        return this.activeConnection;
    }

    getAllConnections() {
        return Array.from(this.connections.values());
    }

    getConnectionStatus() {
        const status = {
            totalConnections: this.connections.size,
            connections: {},
            activeConnection: this.activeConnection?.getStatus() || null
        };
        
        for (const [key, connection] of this.connections) {
            status.connections[key] = connection.getStatus();
        }
        
        return status;
    }

    isConnected(type = null) {
        if (type) {
            return this.connections.has(type);
        }
        return this.connections.size > 0;
    }

    hasUSBConnection() {
        return this.connections.has('usb');
    }

    hasWebUSBConnection() {
        return this.connections.has('webusb');
    }

    hasBluetoothConnection() {
        return this.connections.has('bluetooth');
    }

    hasBluetoothDevice(deviceType) {
        return this.connections.has(`bluetooth-${deviceType}`);
    }

    getConnectionSummary() {
        const summary = {
            usb: this.hasUSBConnection(),
            webusb: this.hasWebUSBConnection(),
            bluetooth: this.hasBluetoothConnection(),
            devices: []
        };

        for (const [key, connection] of this.connections) {
            if (key.startsWith('bluetooth-')) {
                const deviceType = key.replace('bluetooth-', '');
                summary.devices.push({
                    type: deviceType,
                    status: connection.getStatus()
                });
            }
        }

        return summary;
    }

    // Helper method to check if any connection method is available
    async checkAvailableConnectionMethods() {
        const methods = {
            usb: false,
            webusb: false,
            bluetooth: false,
            issues: []
        };

        // Check USB Serial API
        if ('serial' in navigator) {
            methods.usb = true;
        } else {
            methods.issues.push('USB Serial API not supported (requires Chrome/Edge 89+)');
        }

        // Check WebUSB API
        if ('usb' in navigator) {
            methods.webusb = true;
        } else {
            methods.issues.push('WebUSB API not supported (requires Chrome 61+/Edge 79+)');
        }

        // Check Bluetooth API
        if ('bluetooth' in navigator) {
            try {
                const available = await navigator.bluetooth.getAvailability();
                methods.bluetooth = available;
                if (!available) {
                    methods.issues.push('Bluetooth not available on this device');
                }
            } catch (error) {
                methods.issues.push(`Bluetooth check failed: ${error.message}`);
            }
        } else {
            methods.issues.push('Bluetooth API not supported (requires Chrome/Edge)');
        }

        // Check HTTPS requirement
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            methods.issues.push('HTTPS required for Web APIs (USB, WebUSB, and Bluetooth)');
        }

        return methods;
    }
}
