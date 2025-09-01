/**
 * FIT File Converter for Strava Upload
 * Converts training session data to FIT format compatible with Strava
 */

export class FitFileConverter {
    constructor() {
        // FIT protocol constants
        this.FIT_PROTOCOL_VERSION = 0x20; // 2.0
        this.FIT_PROFILE_VERSION = 2100; // 21.00
        this.FIT_MANUFACTURER_ID = 1; // Garmin
        this.FIT_PRODUCT_ID = 2803; // Edge 1030
        
        // Message type definitions
        this.MSG_FILE_ID = 0;
        this.MSG_FILE_CREATOR = 49;
        this.MSG_EVENT = 21;
        this.MSG_DEVICE_INFO = 23;
        this.MSG_RECORD = 20;
        this.MSG_LAP = 19;
        this.MSG_SESSION = 18;
        this.MSG_ACTIVITY = 34;
        
        // Field definitions for record message
        this.FIELD_TIMESTAMP = 253;
        this.FIELD_POSITION_LAT = 0;
        this.FIELD_POSITION_LONG = 1;
        this.FIELD_ALTITUDE = 2;
        this.FIELD_HEART_RATE = 3;
        this.FIELD_CADENCE = 4;
        this.FIELD_DISTANCE = 5;
        this.FIELD_SPEED = 6;
        this.FIELD_POWER = 7;
        this.FIELD_TEMPERATURE = 13;
        this.FIELD_ENHANCED_SPEED = 73;
        this.FIELD_ENHANCED_ALTITUDE = 78;
        
        // Event types
        this.EVENT_TIMER = 0;
        this.EVENT_SESSION = 8;
        this.EVENT_LAP = 9;
        this.EVENT_ACTIVITY = 26;
        
        // Sport types
        this.SPORT_CYCLING = 2;
        this.SUB_SPORT_INDOOR_CYCLING = 6;
    }

    /**
     * Convert session data to FIT file format
     */
    convertToFIT(sessionData) {
        try {
            console.log('Converting session to FIT format...');
            
            // Prepare data
            const startTime = this.toFitTimestamp(new Date(sessionData.startTime));
            const records = this.prepareRecords(sessionData);
            
            // Build FIT file structure
            const fitData = [];
            
            // Add FIT header
            this.addHeader(fitData);
            
            // Add definition and data messages
            this.addFileId(fitData, startTime);
            this.addFileCreator(fitData);
            this.addDeviceInfo(fitData, startTime);
            this.addEvent(fitData, startTime, this.EVENT_TIMER, 'start');
            
            // Add record messages
            this.addRecords(fitData, records, startTime);
            
            // Add summary messages
            const summary = this.calculateSummary(records, sessionData);
            this.addLap(fitData, startTime, summary);
            this.addSession(fitData, startTime, summary);
            this.addActivity(fitData, startTime, summary);
            
            // Add stop event
            const endTime = startTime + Math.floor(summary.totalElapsedTime);
            this.addEvent(fitData, endTime, this.EVENT_TIMER, 'stop_all');
            
            // Calculate and add CRC
            this.addCRC(fitData);
            
            // Convert to Uint8Array
            const buffer = new Uint8Array(fitData);
            
            console.log('✅ FIT file created successfully');
            return buffer;
            
        } catch (error) {
            console.error('❌ FIT conversion failed:', error);
            throw error;
        }
    }

    /**
     * Prepare records from session data
     */
    prepareRecords(sessionData) {
        const records = [];
        const dataPoints = sessionData.dataPoints || [];
        
        // Ensure we have data points
        if (dataPoints.length === 0) {
            // Create synthetic data if no data points
            const duration = sessionData.metrics?.duration || 3600; // Default 1 hour
            const interval = 1; // 1 second intervals
            
            for (let i = 0; i <= duration; i += interval) {
                records.push({
                    timestamp: i,
                    heartRate: sessionData.metrics?.avgHeartRate || 0,
                    power: sessionData.metrics?.avgPower || 0,
                    cadence: sessionData.metrics?.avgCadence || 0,
                    speed: sessionData.metrics?.avgSpeed || 0,
                    distance: (sessionData.metrics?.distance || 0) * (i / duration) * 1000, // meters
                    altitude: 100, // Default altitude
                    temperature: 20 // Default temperature
                });
            }
        } else {
            // Process actual data points
            dataPoints.forEach((point, index) => {
                records.push({
                    timestamp: index,
                    heartRate: point.heartRate || 0,
                    power: point.power || 0,
                    cadence: point.cadence || 0,
                    speed: point.speed || 0,
                    distance: point.distance || (index * 10), // meters
                    altitude: point.altitude || 100,
                    temperature: point.temperature || 20
                });
            });
        }
        
        return records;
    }

    /**
     * Add FIT file header
     */
    addHeader(data) {
        data.push(0x0E); // Header size
        data.push(0x20); // Protocol version
        data.push(0x00, 0x08); // Profile version (little endian)
        data.push(0x00, 0x00, 0x00, 0x00); // Data size (placeholder, will be updated)
        data.push(0x2E, 0x46, 0x49, 0x54); // ".FIT"
        data.push(0x00, 0x00); // CRC (placeholder)
    }

    /**
     * Add File ID message
     */
    addFileId(data, timestamp) {
        // Definition message
        data.push(0x40); // Definition message header
        data.push(0x00); // Reserved
        data.push(0x00); // Architecture (little endian)
        data.push(0x00, this.MSG_FILE_ID); // Global message number
        data.push(0x05); // Number of fields
        
        // Field definitions
        data.push(0x03, 0x04, 0x8C); // serial_number
        data.push(0x04, 0x04, 0x86); // time_created  
        data.push(0x01, 0x02, 0x84); // manufacturer
        data.push(0x02, 0x02, 0x84); // product
        data.push(0x00, 0x01, 0x00); // type
        
        // Data message
        data.push(0x00); // Data message header
        this.addUint32(data, 123456789); // serial_number
        this.addUint32(data, timestamp); // time_created
        this.addUint16(data, this.FIT_MANUFACTURER_ID); // manufacturer
        this.addUint16(data, this.FIT_PRODUCT_ID); // product
        data.push(0x04); // type: activity
    }

    /**
     * Add File Creator message
     */
    addFileCreator(data) {
        // Definition message
        data.push(0x41); // Definition message header
        data.push(0x00); // Reserved
        data.push(0x00); // Architecture
        data.push(0x00, this.MSG_FILE_CREATOR); // Global message number
        data.push(0x02); // Number of fields
        
        // Field definitions
        data.push(0x00, 0x02, 0x84); // software_version
        data.push(0x01, 0x02, 0x84); // hardware_version
        
        // Data message
        data.push(0x01); // Data message header
        this.addUint16(data, 100); // software_version
        this.addUint16(data, 100); // hardware_version
    }

    /**
     * Add Device Info message
     */
    addDeviceInfo(data, timestamp) {
        // Definition message
        data.push(0x42); // Definition message header
        data.push(0x00); // Reserved
        data.push(0x00); // Architecture
        data.push(0x00, this.MSG_DEVICE_INFO); // Global message number
        data.push(0x05); // Number of fields
        
        // Field definitions
        data.push(0xFD, 0x04, 0x86); // timestamp
        data.push(0x00, 0x01, 0x02); // device_index
        data.push(0x01, 0x01, 0x02); // device_type
        data.push(0x02, 0x02, 0x84); // manufacturer
        data.push(0x04, 0x02, 0x84); // product
        
        // Data message
        data.push(0x02); // Data message header
        this.addUint32(data, timestamp); // timestamp
        data.push(0x00); // device_index
        data.push(0x79); // device_type: bike_power
        this.addUint16(data, this.FIT_MANUFACTURER_ID); // manufacturer
        this.addUint16(data, this.FIT_PRODUCT_ID); // product
    }

    /**
     * Add Event message
     */
    addEvent(data, timestamp, eventType, eventGroup) {
        // Definition message
        data.push(0x43); // Definition message header
        data.push(0x00); // Reserved
        data.push(0x00); // Architecture
        data.push(0x00, this.MSG_EVENT); // Global message number
        data.push(0x04); // Number of fields
        
        // Field definitions
        data.push(0xFD, 0x04, 0x86); // timestamp
        data.push(0x00, 0x01, 0x00); // event
        data.push(0x01, 0x01, 0x00); // event_type
        data.push(0x04, 0x01, 0x02); // event_group
        
        // Data message
        data.push(0x03); // Data message header
        this.addUint32(data, timestamp); // timestamp
        data.push(eventType); // event
        data.push(eventGroup === 'start' ? 0x00 : 0x04); // event_type
        data.push(0x00); // event_group
    }

    /**
     * Add Record messages
     */
    addRecords(data, records, startTime) {
        // Definition message for records
        data.push(0x44); // Definition message header
        data.push(0x00); // Reserved
        data.push(0x00); // Architecture
        data.push(0x00, this.MSG_RECORD); // Global message number
        data.push(0x08); // Number of fields
        
        // Field definitions
        data.push(this.FIELD_TIMESTAMP, 0x04, 0x86); // timestamp
        data.push(this.FIELD_HEART_RATE, 0x01, 0x02); // heart_rate
        data.push(this.FIELD_CADENCE, 0x01, 0x02); // cadence
        data.push(this.FIELD_DISTANCE, 0x04, 0x86); // distance
        data.push(this.FIELD_SPEED, 0x02, 0x84); // speed
        data.push(this.FIELD_POWER, 0x02, 0x84); // power
        data.push(this.FIELD_ALTITUDE, 0x02, 0x84); // altitude
        data.push(this.FIELD_TEMPERATURE, 0x01, 0x01); // temperature
        
        // Add data messages for each record
        records.forEach((record, index) => {
            data.push(0x04); // Data message header
            
            // timestamp
            this.addUint32(data, startTime + record.timestamp);
            
            // heart_rate (bpm)
            data.push(Math.min(255, Math.max(0, Math.round(record.heartRate || 0))));
            
            // cadence (rpm)
            data.push(Math.min(255, Math.max(0, Math.round(record.cadence || 0))));
            
            // distance (cm)
            this.addUint32(data, Math.round((record.distance || 0) * 100));
            
            // speed (m/s * 1000)
            this.addUint16(data, Math.round((record.speed || 0) * 1000));
            
            // power (watts)
            this.addUint16(data, Math.min(65535, Math.max(0, Math.round(record.power || 0))));
            
            // altitude (m * 5 + 500)
            this.addUint16(data, Math.round((record.altitude || 100) * 5 + 500));
            
            // temperature (C)
            data.push(Math.min(127, Math.max(-128, Math.round(record.temperature || 20))));
        });
    }

    /**
     * Add Lap message
     */
    addLap(data, startTime, summary) {
        // Definition message
        data.push(0x45); // Definition message header
        data.push(0x00); // Reserved
        data.push(0x00); // Architecture
        data.push(0x00, this.MSG_LAP); // Global message number
        data.push(0x15); // Number of fields
        
        // Field definitions
        data.push(0xFD, 0x04, 0x86); // timestamp
        data.push(0x02, 0x04, 0x86); // start_time
        data.push(0x07, 0x04, 0x86); // total_elapsed_time
        data.push(0x08, 0x04, 0x86); // total_timer_time
        data.push(0x09, 0x04, 0x86); // total_distance
        data.push(0x0D, 0x02, 0x84); // avg_speed
        data.push(0x0E, 0x02, 0x84); // max_speed
        data.push(0x0F, 0x01, 0x02); // avg_heart_rate
        data.push(0x10, 0x01, 0x02); // max_heart_rate
        data.push(0x11, 0x01, 0x02); // avg_cadence
        data.push(0x12, 0x01, 0x02); // max_cadence
        data.push(0x13, 0x02, 0x84); // avg_power
        data.push(0x14, 0x02, 0x84); // max_power
        data.push(0x15, 0x02, 0x84); // total_ascent
        data.push(0x16, 0x02, 0x84); // total_descent
        data.push(0x18, 0x01, 0x00); // sport
        data.push(0x21, 0x02, 0x84); // total_calories
        data.push(0x2A, 0x02, 0x84); // enhanced_avg_speed
        data.push(0x2B, 0x02, 0x84); // enhanced_max_speed
        data.push(0x5D, 0x04, 0x86); // enhanced_avg_altitude
        data.push(0x5F, 0x04, 0x86); // enhanced_max_altitude
        
        // Data message
        data.push(0x05); // Data message header
        this.addUint32(data, startTime + Math.floor(summary.totalElapsedTime)); // timestamp
        this.addUint32(data, startTime); // start_time
        this.addUint32(data, Math.round(summary.totalElapsedTime * 1000)); // total_elapsed_time (ms)
        this.addUint32(data, Math.round(summary.totalTimerTime * 1000)); // total_timer_time (ms)
        this.addUint32(data, Math.round(summary.totalDistance * 100)); // total_distance (cm)
        this.addUint16(data, Math.round(summary.avgSpeed * 1000)); // avg_speed (m/s * 1000)
        this.addUint16(data, Math.round(summary.maxSpeed * 1000)); // max_speed (m/s * 1000)
        data.push(Math.round(summary.avgHeartRate)); // avg_heart_rate
        data.push(Math.round(summary.maxHeartRate)); // max_heart_rate
        data.push(Math.round(summary.avgCadence)); // avg_cadence
        data.push(Math.round(summary.maxCadence)); // max_cadence
        this.addUint16(data, Math.round(summary.avgPower)); // avg_power
        this.addUint16(data, Math.round(summary.maxPower)); // max_power
        this.addUint16(data, Math.round(summary.totalAscent)); // total_ascent
        this.addUint16(data, Math.round(summary.totalDescent)); // total_descent
        data.push(this.SPORT_CYCLING); // sport
        this.addUint16(data, Math.round(summary.totalCalories)); // total_calories
        this.addUint16(data, Math.round(summary.avgSpeed * 1000)); // enhanced_avg_speed
        this.addUint16(data, Math.round(summary.maxSpeed * 1000)); // enhanced_max_speed
        this.addUint32(data, Math.round(summary.avgAltitude * 5 + 500)); // enhanced_avg_altitude
        this.addUint32(data, Math.round(summary.maxAltitude * 5 + 500)); // enhanced_max_altitude
    }

    /**
     * Add Session message
     */
    addSession(data, startTime, summary) {
        // Similar structure to Lap message but with session-specific fields
        // Definition message
        data.push(0x46); // Definition message header
        data.push(0x00); // Reserved
        data.push(0x00); // Architecture
        data.push(0x00, this.MSG_SESSION); // Global message number
        data.push(0x15); // Number of fields
        
        // Use same field definitions as lap
        data.push(0xFD, 0x04, 0x86); // timestamp
        data.push(0x02, 0x04, 0x86); // start_time
        data.push(0x07, 0x04, 0x86); // total_elapsed_time
        data.push(0x08, 0x04, 0x86); // total_timer_time
        data.push(0x09, 0x04, 0x86); // total_distance
        data.push(0x0E, 0x02, 0x84); // avg_speed
        data.push(0x0F, 0x02, 0x84); // max_speed
        data.push(0x10, 0x01, 0x02); // avg_heart_rate
        data.push(0x11, 0x01, 0x02); // max_heart_rate
        data.push(0x12, 0x01, 0x02); // avg_cadence
        data.push(0x13, 0x01, 0x02); // max_cadence
        data.push(0x14, 0x02, 0x84); // avg_power
        data.push(0x15, 0x02, 0x84); // max_power
        data.push(0x16, 0x02, 0x84); // total_ascent
        data.push(0x17, 0x02, 0x84); // total_descent
        data.push(0x05, 0x01, 0x00); // sport
        data.push(0x06, 0x01, 0x00); // sub_sport
        data.push(0x0B, 0x02, 0x84); // total_calories
        data.push(0x2C, 0x02, 0x84); // enhanced_avg_speed
        data.push(0x2D, 0x02, 0x84); // enhanced_max_speed
        data.push(0x00, 0x01, 0x00); // event
        
        // Data message
        data.push(0x06); // Data message header
        this.addUint32(data, startTime + Math.floor(summary.totalElapsedTime)); // timestamp
        this.addUint32(data, startTime); // start_time
        this.addUint32(data, Math.round(summary.totalElapsedTime * 1000)); // total_elapsed_time
        this.addUint32(data, Math.round(summary.totalTimerTime * 1000)); // total_timer_time
        this.addUint32(data, Math.round(summary.totalDistance * 100)); // total_distance
        this.addUint16(data, Math.round(summary.avgSpeed * 1000)); // avg_speed
        this.addUint16(data, Math.round(summary.maxSpeed * 1000)); // max_speed
        data.push(Math.round(summary.avgHeartRate)); // avg_heart_rate
        data.push(Math.round(summary.maxHeartRate)); // max_heart_rate
        data.push(Math.round(summary.avgCadence)); // avg_cadence
        data.push(Math.round(summary.maxCadence)); // max_cadence
        this.addUint16(data, Math.round(summary.avgPower)); // avg_power
        this.addUint16(data, Math.round(summary.maxPower)); // max_power
        this.addUint16(data, Math.round(summary.totalAscent)); // total_ascent
        this.addUint16(data, Math.round(summary.totalDescent)); // total_descent
        data.push(this.SPORT_CYCLING); // sport
        data.push(this.SUB_SPORT_INDOOR_CYCLING); // sub_sport
        this.addUint16(data, Math.round(summary.totalCalories)); // total_calories
        this.addUint16(data, Math.round(summary.avgSpeed * 1000)); // enhanced_avg_speed
        this.addUint16(data, Math.round(summary.maxSpeed * 1000)); // enhanced_max_speed
        data.push(this.EVENT_SESSION); // event
    }

    /**
     * Add Activity message
     */
    addActivity(data, startTime, summary) {
        // Definition message
        data.push(0x47); // Definition message header
        data.push(0x00); // Reserved
        data.push(0x00); // Architecture
        data.push(0x00, this.MSG_ACTIVITY); // Global message number
        data.push(0x06); // Number of fields
        
        // Field definitions
        data.push(0xFD, 0x04, 0x86); // timestamp
        data.push(0x00, 0x04, 0x86); // total_timer_time
        data.push(0x01, 0x02, 0x84); // num_sessions
        data.push(0x02, 0x01, 0x00); // type
        data.push(0x03, 0x01, 0x00); // event
        data.push(0x04, 0x01, 0x00); // event_type
        
        // Data message
        data.push(0x07); // Data message header
        this.addUint32(data, startTime + Math.floor(summary.totalElapsedTime)); // timestamp
        this.addUint32(data, Math.round(summary.totalTimerTime * 1000)); // total_timer_time
        this.addUint16(data, 1); // num_sessions
        data.push(0x00); // type: manual
        data.push(this.EVENT_ACTIVITY); // event
        data.push(0x01); // event_type: stop
    }

    /**
     * Calculate summary statistics
     */
    calculateSummary(records, sessionData) {
        const metrics = sessionData.metrics || {};
        
        // Calculate from records if available
        let summary = {
            totalElapsedTime: metrics.duration || records.length,
            totalTimerTime: metrics.duration || records.length,
            totalDistance: metrics.distance || 0,
            avgSpeed: 0,
            maxSpeed: 0,
            avgHeartRate: 0,
            maxHeartRate: 0,
            avgCadence: 0,
            maxCadence: 0,
            avgPower: 0,
            maxPower: 0,
            totalAscent: 0,
            totalDescent: 0,
            totalCalories: Math.round((metrics.totalEnergy || 0) * 0.239), // kJ to kcal
            avgAltitude: 100,
            maxAltitude: 100
        };
        
        if (records.length > 0) {
            let totalSpeed = 0, totalHR = 0, totalCadence = 0, totalPower = 0;
            let prevAltitude = records[0].altitude;
            
            records.forEach(record => {
                totalSpeed += record.speed || 0;
                totalHR += record.heartRate || 0;
                totalCadence += record.cadence || 0;
                totalPower += record.power || 0;
                
                summary.maxSpeed = Math.max(summary.maxSpeed, record.speed || 0);
                summary.maxHeartRate = Math.max(summary.maxHeartRate, record.heartRate || 0);
                summary.maxCadence = Math.max(summary.maxCadence, record.cadence || 0);
                summary.maxPower = Math.max(summary.maxPower, record.power || 0);
                summary.maxAltitude = Math.max(summary.maxAltitude, record.altitude || 100);
                
                // Calculate ascent/descent
                const altDiff = (record.altitude || 100) - prevAltitude;
                if (altDiff > 0) summary.totalAscent += altDiff;
                else summary.totalDescent += Math.abs(altDiff);
                prevAltitude = record.altitude || 100;
            });
            
            const count = records.length;
            summary.avgSpeed = metrics.avgSpeed || (totalSpeed / count);
            summary.avgHeartRate = metrics.avgHeartRate || (totalHR / count);
            summary.avgCadence = metrics.avgCadence || (totalCadence / count);
            summary.avgPower = metrics.avgPower || (totalPower / count);
        }
        
        // Convert distance to meters if in km
        if (summary.totalDistance < 1000) {
            summary.totalDistance *= 1000;
        }
        
        return summary;
    }

    /**
     * Add CRC to FIT file
     */
    addCRC(data) {
        // Update data size in header
        const dataSize = data.length - 14; // Subtract header size
        data[4] = dataSize & 0xFF;
        data[5] = (dataSize >> 8) & 0xFF;
        data[6] = (dataSize >> 16) & 0xFF;
        data[7] = (dataSize >> 24) & 0xFF;
        
        // Calculate header CRC
        let headerCrc = 0;
        for (let i = 0; i < 12; i++) {
            headerCrc = this.crc16(data[i], headerCrc);
        }
        data[12] = headerCrc & 0xFF;
        data[13] = (headerCrc >> 8) & 0xFF;
        
        // Calculate file CRC
        let fileCrc = 0;
        for (let i = 0; i < data.length; i++) {
            fileCrc = this.crc16(data[i], fileCrc);
        }
        
        // Add file CRC at the end
        data.push(fileCrc & 0xFF);
        data.push((fileCrc >> 8) & 0xFF);
    }

    /**
     * CRC-16 calculation
     */
    crc16(byte, crc) {
        const crcTable = [
            0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
            0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400
        ];
        
        let tmp = crcTable[crc & 0xF];
        crc = (crc >> 4) & 0x0FFF;
        crc = crc ^ tmp ^ crcTable[byte & 0xF];
        
        tmp = crcTable[crc & 0xF];
        crc = (crc >> 4) & 0x0FFF;
        crc = crc ^ tmp ^ crcTable[(byte >> 4) & 0xF];
        
        return crc;
    }

    /**
     * Convert JavaScript Date to FIT timestamp
     */
    toFitTimestamp(date) {
        // FIT timestamps are seconds since 00:00 Dec 31 1989 UTC
        const FIT_EPOCH = new Date('1989-12-31T00:00:00Z').getTime();
        return Math.floor((date.getTime() - FIT_EPOCH) / 1000);
    }

    /**
     * Helper methods for adding multi-byte values
     */
    addUint16(data, value) {
        data.push(value & 0xFF);
        data.push((value >> 8) & 0xFF);
    }

    addUint32(data, value) {
        data.push(value & 0xFF);
        data.push((value >> 8) & 0xFF);
        data.push((value >> 16) & 0xFF);
        data.push((value >> 24) & 0xFF);
    }

    /**
     * Save FIT file to disk
     */
    downloadFIT(buffer, filename) {
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `workout_${Date.now()}.fit`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Convert CSV data to FIT format
     */
    async convertCSVToFIT(csvData) {
        try {
            console.log('Converting CSV to FIT format...');
            
            // Parse CSV data
            const lines = csvData.trim().split('\n');
            const headers = lines[0].split(',');
            
            // Find relevant column indices
            const indices = {
                timestamp: headers.indexOf('timestamp'),
                heartRate: headers.indexOf('heart_rate'),
                power: headers.indexOf('power'),
                cadence: headers.indexOf('cadence'),
                speed: headers.indexOf('speed'),
                distance: headers.indexOf('distance'),
                altitude: headers.indexOf('altitude'),
                temperature: headers.indexOf('temperature')
            };
            
            // Parse data rows
            const dataPoints = [];
            let startTime = null;
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                
                // Parse timestamp
                const timestamp = values[indices.timestamp];
                if (!timestamp || timestamp === '') continue;
                
                const date = new Date(timestamp);
                if (!startTime) startTime = date;
                
                dataPoints.push({
                    timestamp: Math.floor((date - startTime) / 1000),
                    heartRate: parseFloat(values[indices.heartRate]) || 0,
                    power: parseFloat(values[indices.power]) || 0,
                    cadence: parseFloat(values[indices.cadence]) || 0,
                    speed: parseFloat(values[indices.speed]) || 0,
                    distance: parseFloat(values[indices.distance]) || 0,
                    altitude: parseFloat(values[indices.altitude]) || 100,
                    temperature: parseFloat(values[indices.temperature]) || 20
                });
            }
            
            // Create session data structure
            const sessionData = {
                startTime: startTime.toISOString(),
                dataPoints: dataPoints,
                metrics: this.calculateMetricsFromDataPoints(dataPoints)
            };
            
            // Convert to FIT
            return this.convertToFIT(sessionData);
            
        } catch (error) {
            console.error('❌ CSV to FIT conversion failed:', error);
            throw error;
        }
    }

    /**
     * Calculate metrics from data points
     */
    calculateMetricsFromDataPoints(dataPoints) {
        if (dataPoints.length === 0) {
            return {};
        }
        
        let totalHR = 0, totalPower = 0, totalCadence = 0, totalSpeed = 0;
        let maxHR = 0, maxPower = 0, maxCadence = 0, maxSpeed = 0;
        let validHR = 0, validPower = 0, validCadence = 0, validSpeed = 0;
        
        dataPoints.forEach(point => {
            if (point.heartRate > 0) {
                totalHR += point.heartRate;
                maxHR = Math.max(maxHR, point.heartRate);
                validHR++;
            }
            if (point.power > 0) {
                totalPower += point.power;
                maxPower = Math.max(maxPower, point.power);
                validPower++;
            }
            if (point.cadence > 0) {
                totalCadence += point.cadence;
                maxCadence = Math.max(maxCadence, point.cadence);
                validCadence++;
            }
            if (point.speed > 0) {
                totalSpeed += point.speed;
                maxSpeed = Math.max(maxSpeed, point.speed);
                validSpeed++;
            }
        });
        
        const lastPoint = dataPoints[dataPoints.length - 1];
        
        return {
            duration: lastPoint.timestamp,
            distance: lastPoint.distance / 1000, // Convert to km
            avgHeartRate: validHR > 0 ? totalHR / validHR : 0,
            maxHeartRate: maxHR,
            avgPower: validPower > 0 ? totalPower / validPower : 0,
            maxPower: maxPower,
            avgCadence: validCadence > 0 ? totalCadence / validCadence : 0,
            maxCadence: maxCadence,
            avgSpeed: validSpeed > 0 ? totalSpeed / validSpeed : 0,
            maxSpeed: maxSpeed,
            totalEnergy: (totalPower / validPower) * (lastPoint.timestamp / 1000) // kJ
        };
    }
}

// Export for use in other modules
export default FitFileConverter;
