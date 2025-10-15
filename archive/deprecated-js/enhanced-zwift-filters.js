// Enhanced Bluetooth filters with proper Zwift Click support
// This file provides updated Bluetooth device filters for better Zwift Click compatibility

// Enhanced Zwift Click filters with proper service UUIDs
function getEnhancedZwiftClickFilters() {
    return {
        filters: [
            { namePrefix: 'Zwift Click' },
            { namePrefix: 'CLICK' },
            { namePrefix: 'Click' },
            { namePrefix: 'ZC' }
        ],
        optionalServices: [
            // Zwift Classic Service UUID (older devices)
            '00000001-19ca-4651-86e5-fa29dcdd09d1',
            // Zwift New Service UUID (newer devices) - FC82 as 128-bit
            '0000fc82-0000-1000-8000-00805f9b34fb',
            // Standard services
            0x1812,    // HID Service
            0x1816,    // Cycling Speed and Cadence
            0x180A,    // Device Information
            0x180F,    // Battery Service
            0x1800,    // Generic Access
            0x1801,    // Generic Attribute
            // Fallback services
            '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e'  // Wahoo custom
        ]
    };
}

// Override the getZwiftClickFilters method if the BluetoothConnection class exists
if (window.BluetoothConnection && typeof window.BluetoothConnection.getZwiftClickFilters === 'function') {
    window.BluetoothConnection.getZwiftClickFilters = getEnhancedZwiftClickFilters;
    console.log('✅ Enhanced Zwift Click filters loaded');
}

// Export the function for use by other modules
window.getEnhancedZwiftClickFilters = getEnhancedZwiftClickFilters;
