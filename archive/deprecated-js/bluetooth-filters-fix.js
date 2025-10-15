/**
 * Bluetooth Connection Module - FIXED ZWIFT CLICK VERSION  
 * Enhanced connection handling with improved Zwift Click support
 */
import { EventEmitter } from '../utils/event-emitter.js';
import { logger } from '../core/logger.js';
import { platform } from '../core/platform.js';

export class BluetoothConnection extends EventEmitter {
    constructor() {
        super();
        this.device = null;
        this.server = null;
        this.services = new Map();
        this.characteristics = new Map();
        this.isConnected = false;
    }

    // Device-specific connection methods with FIXED Zwift Click filters
    static getKickrFilters() {
        return {
            filters: [
                { namePrefix: 'KICKR CORE' },
                { namePrefix: 'KICKR' },
                { namePrefix: 'Wahoo' },
                { services: [0x1826] },  // Fitness Machine
                { services: [0x1818] }   // Cycling Power
            ],
            optionalServices: [
                0x1826,    // Fitness Machine
                0x1818,    // Cycling Power
                0x1816,    // Cycling Speed and Cadence
                0x180A,    // Device Information
                0x180F,    // Battery Service
                '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'  // Wahoo custom
            ]
        };
    }

    // FIXED: Much more flexible Zwift Click filters
    static getZwiftClickFilters() {
        return {
            acceptAllDevices: true,  // This allows any device to be selected
            optionalServices: [
                0x1812,    // HID Service (Human Interface Device)
                0x1816,    // Cycling Speed and Cadence
                0x180A,    // Device Information
                0x180F,    // Battery Service
                0x1800,    // Generic Access
                0x1801,    // Generic Attribute
                '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e',  // Wahoo custom
                '0000fff0-0000-1000-8000-00805f9b34fb',  // Nordic UART
                '6e400001-b5a3-f393-e0a9-e50e24dcca9e',  // Nordic UART Service
                '49535343-fe7d-4ae5-8fa9-9fafd205e455'   // Issc proprietary service
            ]
        };
    }

    static getHRMFilters() {
        return {
            filters: [
                { services: [0x180D] },  // Heart Rate
                { namePrefix: 'Polar' },
                { namePrefix: 'Garmin' },
                { namePrefix: 'Wahoo' },
                { namePrefix: 'TICKR' }
            ],
            optionalServices: [0x180A, 0x180F]  // Device Information, Battery
        };
    }
}