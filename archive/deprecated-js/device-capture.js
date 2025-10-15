/**
 * Device Capture Manager
 * Handles capturing device specifications and generating downloadable files
 */
import { logger } from './logger.js';

export class DeviceCaptureManager {
    constructor(connectionManager, sessionData) {
        this.connectionManager = connectionManager;
        this.sessionData = sessionData;
        this.capturedData = {};
    }

    async captureAllConnectedDevices() {
        logger.info('📊 Capturing device specifications...');
        
        try {
            // Get all device specs from connection manager
            const deviceSpecs = await this.connectionManager.getAllDeviceSpecs();
            
            if (Object.keys(deviceSpecs).length === 0) {
                logger.warn('⚠️ No connected devices found to capture');
                return;
            }

            // Store captured data with session info
            this.capturedData = {
                captureTime: new Date().toISOString(),
                sessionSummary: this.getSessionSummary(),
                devices: deviceSpecs
            };

            // Generate and download files for each device
            await this.generateDeviceFiles();
            
            // Generate session log
            await this.generateSessionLog();
            
            logger.info(`✅ Successfully captured specs for ${Object.keys(deviceSpecs).length} device(s)`);
            
        } catch (error) {
            logger.error(`❌ Device capture failed: ${error.message}`);
        }
    }

    async generateDeviceFiles() {
        for (const [connectionKey, specs] of Object.entries(this.capturedData.devices)) {
            const deviceType = this.getDeviceTypeFromKey(connectionKey);
            const filename = this.getDeviceFilename(deviceType, specs.deviceInfo.name);
            
            // Enhance specs with session data
            const enhancedSpecs = this.enhanceDeviceSpecs(specs, deviceType);
            
            // Generate and download JSON file
            this.downloadJSON(enhancedSpecs, filename);
            
            logger.info(`📄 Generated ${filename}`);
        }
    }

    async generateSessionLog() {
        const logContent = this.generateMarkdownLog();
        const filename = `ant-session-log-${this.formatDateForFilename(new Date())}.md`;
        
        this.downloadText(logContent, filename);
        logger.info(`📄 Generated ${filename}`);
    }

    enhanceDeviceSpecs(specs, deviceType) {
        const enhanced = {
            ...specs,
            deviceType: deviceType,
            capabilities: this.getDeviceCapabilities(deviceType),
            sessionData: this.getDeviceSessionData(deviceType),
            technicalSpecs: this.getTechnicalSpecs(deviceType, specs)
        };

        return enhanced;
    }

    getDeviceCapabilities(deviceType) {
        const capabilities = {
            trainer: {
                maxPower: 4000,
                minResistance: 0,
                maxResistance: 100,
                powerAccuracy: 1,
                supportedMetrics: ['power', 'cadence', 'speed', 'resistance'],
                controlFeatures: ['resistance_control', 'power_target', 'slope_simulation']
            },
            'zwift-click': {
                gearRange: '1-12',
                buttonTypes: ['up', 'down'],
                supportedMetrics: ['gear_position'],
                batteryType: 'CR2032',
                communicationProtocol: 'ANT+ over BLE'
            },
            hrm: {
                maxHeartRate: 240,
                minHeartRate: 30,
                accuracy: 1,
                supportedMetrics: ['heart_rate', 'rr_intervals'],
                zones: ['recovery', 'aerobic', 'anaerobic', 'vo2max', 'neuromuscular']
            }
        };

        return capabilities[deviceType] || {};
    }

    getDeviceSessionData(deviceType) {
        if (!this.sessionData) return {};

        switch (deviceType) {
            case 'trainer':
                return {
                    duration: this.sessionData.trainer?.duration || '00:00:00',
                    totalDistance: this.sessionData.trainer?.distance || 0,
                    avgPower: this.sessionData.trainer?.avgPower || 0,
                    maxPower: this.sessionData.trainer?.maxPower || 0,
                    totalEnergy: this.sessionData.trainer?.totalEnergy || 0
                };
            case 'hrm':
                return {
                    duration: this.sessionData.hrm?.duration || '00:00:00',
                    avgHR: this.sessionData.hrm?.avgHR || 0,
                    maxHR: this.sessionData.hrm?.maxHR || 0,
                    timeInZones: this.sessionData.hrm?.timeInZones || {}
                };
            default:
                return {};
        }
    }

    getTechnicalSpecs(deviceType, specs) {
        const technical = {
            connectionMethod: 'Bluetooth Low Energy',
            protocols: ['ANT+ over BLE'],
            dataUpdateRate: '1-4 Hz',
            range: '3-10 meters',
            platform: navigator.userAgent
        };

        // Add device-specific technical details
        if (specs.bluetoothInfo?.services) {
            technical.bluetoothServices = specs.bluetoothInfo.services.length;
            technical.primaryServices = specs.bluetoothInfo.services
                .filter(s => s.name !== 'Unknown Service')
                .map(s => s.name);
        }

        return technical;
    }

    getDeviceTypeFromKey(connectionKey) {
        if (connectionKey.includes('trainer') || connectionKey.includes('kickr')) {
            return 'trainer';
        } else if (connectionKey.includes('zwift') || connectionKey.includes('click')) {
            return 'zwift-click';
        } else if (connectionKey.includes('hrm') || connectionKey.includes('heart')) {
            return 'hrm';
        }
        return 'unknown';
    }

    getDeviceFilename(deviceType, deviceName) {
        const sanitizedName = (deviceName || 'unknown')
            .replace(/[^a-zA-Z0-9]/g, '-')
            .toLowerCase();
        
        const typeMap = {
            'trainer': 'wahoo-kickr',
            'zwift-click': 'zwift-click',
            'hrm': 'heart-rate-monitor'
        };

        const prefix = typeMap[deviceType] || deviceType;
        const timestamp = this.formatDateForFilename(new Date());
        
        return `${prefix}-specs-${timestamp}.json`;
    }

    getSessionSummary() {
        const summary = {
            startTime: new Date().toISOString(),
            platform: navigator.userAgent,
            connectedDevices: this.connectionManager.getConnectionSummary(),
            totalDevices: this.connectionManager.connections?.size || 0
        };

        // Add session statistics if available
        if (this.sessionData) {
            if (this.sessionData.trainer) {
                summary.trainer = {
                    totalDistance: this.sessionData.trainer.distance || 0,
                    maxPower: this.sessionData.trainer.maxPower || 0,
                    sessionDuration: this.sessionData.trainer.duration || '00:00:00'
                };
            }

            if (this.sessionData.hrm) {
                summary.heartRate = {
                    avgHR: this.sessionData.hrm.avgHR || 0,
                    maxHR: this.sessionData.hrm.maxHR || 0
                };
            }
        }

        return summary;
    }

    generateMarkdownLog() {
        const timestamp = new Date().toISOString();
        const date = new Date().toLocaleDateString();
        
        let markdown = `# ANT+ Session Log - ${date}\n\n`;
        
        // Session Summary
        markdown += `## Session Summary\n`;
        markdown += `- **Capture Time**: ${timestamp}\n`;
        markdown += `- **Platform**: ${navigator.platform}\n`;
        markdown += `- **Browser**: ${navigator.userAgent.split(' ').pop()}\n`;
        markdown += `- **Total Devices**: ${Object.keys(this.capturedData.devices).length}\n\n`;

        // Device Details
        markdown += `## Connected Devices\n\n`;

        for (const [connectionKey, specs] of Object.entries(this.capturedData.devices)) {
            const deviceType = this.getDeviceTypeFromKey(connectionKey);
            const deviceName = specs.deviceInfo.name || 'Unknown Device';
            
            markdown += `### ${deviceName} (${this.getDeviceTypeDisplayName(deviceType)})\n`;
            markdown += `- **Status**: Connected ✅\n`;
            markdown += `- **Device ID**: ${specs.deviceInfo.id || 'Unknown'}\n`;
            markdown += `- **Manufacturer**: ${specs.deviceInfo.manufacturer || 'Unknown'}\n`;
            markdown += `- **Model**: ${specs.deviceInfo.modelNumber || 'Unknown'}\n`;
            markdown += `- **Firmware**: ${specs.deviceInfo.firmwareRevision || 'Unknown'}\n`;

            // Add session data if available
            if (specs.sessionData) {
                markdown += `\n**Session Performance:**\n`;
                Object.entries(specs.sessionData).forEach(([key, value]) => {
                    if (value && value !== 0) {
                        const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        markdown += `- **${displayKey}**: ${value}\n`;
                    }
                });
            }

            // Add Bluetooth services
            if (specs.bluetoothInfo?.services) {
                markdown += `\n**Bluetooth Services:**\n`;
                specs.bluetoothInfo.services.forEach(service => {
                    if (service.name !== 'Unknown Service') {
                        markdown += `- ${service.name} (${service.characteristics.length} characteristics)\n`;
                    }
                });
            }

            markdown += `\n`;
        }

        // Technical Details
        markdown += `## Technical Details\n\n`;
        markdown += `### Connection Summary\n`;
        markdown += `- **Protocol**: Bluetooth Low Energy (ANT+ over BLE)\n`;
        markdown += `- **Connection Method**: Web Bluetooth API\n`;
        markdown += `- **Data Rate**: 1-4 Hz per device\n`;
        markdown += `- **Range**: 3-10 meters\n\n`;

        // Add raw device data section
        markdown += `### Raw Device Specifications\n`;
        markdown += `The complete device specifications are available in the corresponding JSON files:\n\n`;
        
        for (const [connectionKey, specs] of Object.entries(this.capturedData.devices)) {
            const deviceType = this.getDeviceTypeFromKey(connectionKey);
            const filename = this.getDeviceFilename(deviceType, specs.deviceInfo.name);
            markdown += `- [${specs.deviceInfo.name || 'Unknown Device'}](${filename})\n`;
        }

        markdown += `\n---\n\n`;
        markdown += `*Generated by ANT+ Cross-Platform Bluetooth Receiver on ${timestamp}*\n`;

        return markdown;
    }

    getDeviceTypeDisplayName(deviceType) {
        const displayNames = {
            'trainer': 'Smart Trainer',
            'zwift-click': 'Wireless Shifter',
            'hrm': 'Heart Rate Monitor'
        };
        return displayNames[deviceType] || 'Unknown Device';
    }

    formatDateForFilename(date) {
        return date.toISOString()
            .replace(/[:.]/g, '-')
            .split('T')[0] + '_' + 
            date.toTimeString().slice(0, 8).replace(/:/g, '-');
    }

    downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        this.downloadFile(jsonString, filename, 'application/json');
    }

    downloadText(content, filename) {
        this.downloadFile(content, filename, 'text/markdown');
    }

    downloadFile(content, filename, mimeType) {
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
        } catch (error) {
            logger.error(`❌ Failed to download ${filename}: ${error.message}`);
        }
    }

    // Method to capture specific device type
    async captureDevice(deviceType) {
        logger.info(`📊 Capturing ${deviceType} specifications...`);
        
        try {
            const connection = this.connectionManager.getConnection(`bluetooth-${deviceType}`);
            if (!connection) {
                logger.warn(`⚠️ No ${deviceType} connection found`);
                return;
            }

            const specs = await connection.getDeviceSpecs();
            if (!specs) {
                logger.warn(`⚠️ Could not get ${deviceType} specifications`);
                return;
            }

            const enhancedSpecs = this.enhanceDeviceSpecs(specs, deviceType);
            const filename = this.getDeviceFilename(deviceType, specs.deviceInfo.name);
            
            this.downloadJSON(enhancedSpecs, filename);
            logger.info(`✅ Successfully captured ${deviceType} specs`);
            
        } catch (error) {
            logger.error(`❌ Failed to capture ${deviceType}: ${error.message}`);
        }
    }

    // Get current session statistics for display
    getSessionStats() {
        const stats = {
            devicesConnected: Object.keys(this.capturedData.devices || {}).length,
            lastCaptureTime: this.capturedData.captureTime || null,
            availableFiles: []
        };

        if (this.capturedData.devices) {
            for (const [connectionKey, specs] of Object.entries(this.capturedData.devices)) {
                const deviceType = this.getDeviceTypeFromKey(connectionKey);
                const filename = this.getDeviceFilename(deviceType, specs.deviceInfo.name);
                
                stats.availableFiles.push({
                    deviceName: specs.deviceInfo.name || 'Unknown',
                    deviceType: this.getDeviceTypeDisplayName(deviceType),
                    filename: filename
                });
            }
        }

        return stats;
    }
}
