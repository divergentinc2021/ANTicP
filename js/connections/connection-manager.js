/**
 * Connection Manager - Coordinates USB and Bluetooth connections
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from '../core/logger.js';
import { USBANTConnection } from './usb-ant.js';
import { BluetoothConnection } from './bluetooth.js';

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
            usbConnection.on('connecting', () => this.emit('usb-connecting'));
            usbConnection.on('connected', (data) => {
                this.activeConnection = usbConnection;
                this.connections.set('usb', usbConnection);
                this.emit('usb-connected', data);
            });
            usbConnection.on('error', (error) => this.emit('usb-error', error));
            usbConnection.on('disconnected', () => {
                this.connections.delete('usb');
                if (this.activeConnection === usbConnection) {
                    this.activeConnection = null;
                }
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

    async connectBluetooth() {
        try {
            const bluetoothConnection = new BluetoothConnection();
            
            // Set up event listeners
            bluetoothConnection.on('connecting', () => this.emit('bluetooth-connecting'));
            bluetoothConnection.on('connected', (data) => {
                this.activeConnection = bluetoothConnection;
                this.connections.set('bluetooth', bluetoothConnection);
                this.emit('bluetooth-connected', data);
            });
            bluetoothConnection.on('error', (error) => this.emit('bluetooth-error', error));
            bluetoothConnection.on('disconnected', () => {
                this.connections.delete('bluetooth');
                if (this.activeConnection === bluetoothConnection) {
                    this.activeConnection = null;
                }
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
            bluetoothConnection.on('connecting', () => this.emit('bluetooth-connecting'));
            bluetoothConnection.on('connected', (data) => {
                this.connections.set(`bluetooth-${deviceType}`, bluetoothConnection);
                this.emit('bluetooth-device-connected', { ...data, deviceType });
            });
            bluetoothConnection.on('error', (error) => this.emit('bluetooth-device-error', { error, deviceType }));
            bluetoothConnection.on('disconnected', () => {
                this.connections.delete(`bluetooth-${deviceType}`);
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
            await usbConnection.disconnect();
        }
    }

    async disconnectBluetooth() {
        const bluetoothConnection = this.connections.get('bluetooth');
        if (bluetoothConnection) {
            await bluetoothConnection.disconnect();
        }
    }

    async disconnectBluetoothDevice(deviceType) {
        const connection = this.connections.get(`bluetooth-${deviceType}`);
        if (connection) {
            await connection.disconnect();
        }
    }

    async disconnectAll() {
        const disconnectPromises = [];
        
        for (const [key, connection] of this.connections) {
            disconnectPromises.push(connection.disconnect());
        }
        
        await Promise.all(disconnectPromises);
        this.connections.clear();
        this.activeConnection = null;
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
            connections: {}
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

    hasBluetoothConnection() {
        return this.connections.has('bluetooth');
    }

    hasBluetoothDevice(deviceType) {
        return this.connections.has(`bluetooth-${deviceType}`);
    }
}
