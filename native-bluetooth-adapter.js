// Native app wrapper for iOS/Android using Capacitor
// This file handles native Bluetooth when running as an app

import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

class NativeBluetoothAdapter {
    constructor() {
        this.isNative = Capacitor.isNativePlatform();
        this.devices = new Map();
    }

    async initialize() {
        if (!this.isNative) {
            console.log('Running in web mode, using Web Bluetooth API');
            return false;
        }

        try {
            await BleClient.initialize();
            console.log('Native Bluetooth initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize native Bluetooth:', error);
            return false;
        }
    }

    async requestDevice(options) {
        if (!this.isNative) {
            // Fall back to Web Bluetooth
            return navigator.bluetooth.requestDevice(options);
        }

        // Native implementation
        const device = await BleClient.requestDevice({
            services: options.filters[0].services || [],
            optionalServices: options.optionalServices || []
        });

        // Store device for later use
        this.devices.set(device.deviceId, device);
        
        // Return Web Bluetooth compatible object
        return {
            id: device.deviceId,
            name: device.name,
            gatt: {
                connect: async () => this.connect(device.deviceId),
                getPrimaryService: async (serviceId) => this.getPrimaryService(device.deviceId, serviceId)
            }
        };
    }

    async connect(deviceId) {
        await BleClient.connect(deviceId);
        return {
            getPrimaryService: async (serviceId) => this.getPrimaryService(deviceId, serviceId)
        };
    }

    async getPrimaryService(deviceId, serviceUuid) {
        // Return service wrapper
        return {
            getCharacteristic: async (characteristicUuid) => {
                return {
                    startNotifications: async () => {
                        await BleClient.startNotifications(
                            deviceId,
                            serviceUuid,
                            characteristicUuid,
                            (value) => {
                                // Convert to Web Bluetooth DataView format
                                const buffer = new ArrayBuffer(value.length);
                                const view = new DataView(buffer);
                                value.forEach((byte, i) => view.setUint8(i, byte));
                                
                                // Dispatch event like Web Bluetooth
                                this.dispatchCharacteristicEvent(characteristicUuid, view);
                            }
                        );
                    },
                    writeValue: async (data) => {
                        const bytes = Array.from(new Uint8Array(data));
                        await BleClient.write(deviceId, serviceUuid, characteristicUuid, bytes);
                    },
                    addEventListener: (event, callback) => {
                        // Store callback for characteristic
                        this.characteristicCallbacks = this.characteristicCallbacks || {};
                        this.characteristicCallbacks[characteristicUuid] = callback;
                    }
                };
            }
        };
    }

    dispatchCharacteristicEvent(characteristicUuid, value) {
        const callback = this.characteristicCallbacks?.[characteristicUuid];
        if (callback) {
            callback({ target: { value } });
        }
    }
}

// Export for use in main app
window.NativeBluetoothAdapter = NativeBluetoothAdapter;

// iOS-specific configuration
if (Capacitor.getPlatform() === 'ios') {
    // Request Bluetooth permissions
    console.log('Configuring for iOS platform');
}

// Android-specific configuration  
if (Capacitor.getPlatform() === 'android') {
    // Request location permission (required for BLE on Android)
    console.log('Configuring for Android platform');
}