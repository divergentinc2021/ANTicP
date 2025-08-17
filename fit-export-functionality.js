// FIT FILE EXPORT FUNCTIONALITY FOR TRAINING PLATFORM
// ====================================================
// Add this to your index.html to enable FIT file export for Strava

// 1. First, add the FIT.js library to your HTML head section:
// <script src="https://cdn.jsdelivr.net/npm/fit-file-writer@5.0.0/dist/fit-file-writer.min.js"></script>

// 2. Add this class to handle FIT file creation:

class FITExporter {
    constructor() {
        // Activity types for cycling
        this.SPORT = {
            CYCLING: 2,
            GENERIC: 0
        };
        
        // Sub sport types
        this.SUB_SPORT = {
            INDOOR_CYCLING: 6,
            VIRTUAL_ACTIVITY: 58
        };
    }

    createFITFile(sessionData, startTime, deviceName = 'Wahoo KICKR Core') {
        // Create a new FIT file
        const fit = new FitFileWriter();
        
        // File ID Message (required)
        fit.writeFileId({
            type: 'activity',
            manufacturer: 1, // Garmin
            product: 1,
            timeCreated: new Date(startTime),
            serialNumber: 0x12345678
        });
        
        // File Creator Message (identifies the software)
        fit.writeFileCreator({
            softwareVersion: 100,
            hardwareVersion: 255
        });
        
        // Sport Message
        fit.writeSport({
            sport: this.SPORT.CYCLING,
            subSport: this.SUB_SPORT.INDOOR_CYCLING
        });
        
        // Device Info Message (trainer)
        fit.writeDeviceInfo({
            timestamp: new Date(startTime),
            manufacturer: 32, // Wahoo Fitness
            product: 1,
            serialNumber: 12345,
            deviceIndex: 0,
            deviceType: 120, // Bike Power
            hardwareVersion: 1,
            softwareVersion: 1.0,
            productName: deviceName
        });
        
        // Session Message (summary)
        const duration = sessionData.length; // seconds
        const totalDistance = this.calculateTotalDistance(sessionData);
        const avgPower = this.calculateAverage(sessionData, 'power');
        const maxPower = this.calculateMax(sessionData, 'power');
        const avgCadence = this.calculateAverage(sessionData, 'cadence');
        const avgHeartRate = this.calculateAverage(sessionData, 'heartRate');
        const maxHeartRate = this.calculateMax(sessionData, 'heartRate');
        const avgSpeed = this.calculateAverage(sessionData, 'speed');
        const maxSpeed = this.calculateMax(sessionData, 'speed');
        const totalCalories = this.calculateCalories(sessionData);
        const totalAscent = 0; // Indoor cycling, no elevation
        const totalWork = this.calculateTotalWork(sessionData);
        
        fit.writeSession({
            timestamp: new Date(startTime + duration * 1000),
            startTime: new Date(startTime),
            totalElapsedTime: duration * 1000,
            totalTimerTime: duration * 1000,
            totalDistance: totalDistance,
            totalCalories: totalCalories,
            totalWork: totalWork,
            avgSpeed: avgSpeed,
            maxSpeed: maxSpeed,
            avgPower: Math.round(avgPower),
            maxPower: Math.round(maxPower),
            avgCadence: Math.round(avgCadence),
            avgHeartRate: Math.round(avgHeartRate),
            maxHeartRate: Math.round(maxHeartRate),
            totalAscent: totalAscent,
            sport: this.SPORT.CYCLING,
            subSport: this.SUB_SPORT.INDOOR_CYCLING,
            firstLapIndex: 0,
            numLaps: 1,
            eventType: 0,
            event: 0,
            avgWattsPerKg: avgPower / 75, // Assuming 75kg rider weight
            normalizedPower: this.calculateNormalizedPower(sessionData),
            trainingStressScore: this.calculateTSS(sessionData),
            intensityFactor: this.calculateIntensityFactor(sessionData),
            threshold_power: 250 // Default FTP, should be configurable
        });
        
        // Lap Message (one lap for the entire session, or multiple if lap button was pressed)
        fit.writeLap({
            timestamp: new Date(startTime + duration * 1000),
            startTime: new Date(startTime),
            totalElapsedTime: duration * 1000,
            totalTimerTime: duration * 1000,
            totalDistance: totalDistance,
            totalCalories: totalCalories,
            totalWork: totalWork,
            avgSpeed: avgSpeed,
            maxSpeed: maxSpeed,
            avgPower: Math.round(avgPower),
            maxPower: Math.round(maxPower),
            avgCadence: Math.round(avgCadence),
            avgHeartRate: Math.round(avgHeartRate),
            maxHeartRate: Math.round(maxHeartRate),
            lapTrigger: 'session_end',
            sport: this.SPORT.CYCLING,
            subSport: this.SUB_SPORT.INDOOR_CYCLING,
            avgWattsPerKg: avgPower / 75,
            normalizedPower: this.calculateNormalizedPower(sessionData)
        });
        
        // Record Messages (one per second of data)
        sessionData.forEach((dataPoint, index) => {
            const recordTime = new Date(dataPoint.timestamp);
            
            fit.writeRecord({
                timestamp: recordTime,
                distance: (dataPoint.speed / 3.6) * index, // Convert km/h to m/s and calculate distance
                speed: dataPoint.speed / 3.6, // Convert km/h to m/s
                power: dataPoint.power || 0,
                cadence: dataPoint.cadence || 0,
                heartRate: dataPoint.heartRate || 0,
                altitude: 100, // Fixed altitude for indoor
                grade: dataPoint.resistance || 0, // Use resistance as grade
                resistance: dataPoint.resistance || 0,
                temperature: 20, // Room temperature
                calories: Math.round(dataPoint.power * 0.239 / 60), // Rough calorie calculation
                leftRightBalance: 50, // Assuming balanced pedaling
                leftTorqueEffectiveness: 100,
                rightTorqueEffectiveness: 100,
                leftPedalSmoothness: 30,
                rightPedalSmoothness: 30,
                zone: dataPoint.zone || 1
            });
        });
        
        // Activity Message (final summary)
        fit.writeActivity({
            timestamp: new Date(startTime + duration * 1000),
            totalTimerTime: duration * 1000,
            localTimestamp: new Date(startTime),
            numSessions: 1,
            type: 'manual',
            event: 'activity',
            eventType: 'stop'
        });
        
        // Get the FIT file as a Uint8Array
        return fit.toArrayBuffer();
    }
    
    // Helper functions for calculations
    calculateTotalDistance(sessionData) {
        let distance = 0;
        sessionData.forEach((point, index) => {
            if (index > 0) {
                const speed = point.speed || 0; // km/h
                distance += (speed / 3.6); // Add distance in meters (1 second intervals)
            }
        });
        return distance;
    }
    
    calculateAverage(sessionData, field) {
        const values = sessionData.map(d => d[field] || 0).filter(v => v > 0);
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    
    calculateMax(sessionData, field) {
        const values = sessionData.map(d => d[field] || 0);
        return Math.max(...values);
    }
    
    calculateCalories(sessionData) {
        // Using simplified formula: calories = (average_power * time_in_seconds * 3.6) / 1000
        const avgPower = this.calculateAverage(sessionData, 'power');
        const duration = sessionData.length; // seconds
        return Math.round((avgPower * duration * 3.6) / 1000);
    }
    
    calculateTotalWork(sessionData) {
        // Total work in joules = sum of (power * 1 second)
        return sessionData.reduce((total, point) => {
            return total + (point.power || 0);
        }, 0);
    }
    
    calculateNormalizedPower(sessionData) {
        // Simplified NP calculation (should use 30-second rolling average)
        const powers = sessionData.map(d => d.power || 0);
        if (powers.length === 0) return 0;
        
        // Calculate 30-second rolling averages
        const rollingAvgs = [];
        for (let i = 0; i < powers.length; i++) {
            const start = Math.max(0, i - 29);
            const end = i + 1;
            const slice = powers.slice(start, end);
            const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
            rollingAvgs.push(Math.pow(avg, 4));
        }
        
        const avgPower4 = rollingAvgs.reduce((a, b) => a + b, 0) / rollingAvgs.length;
        return Math.round(Math.pow(avgPower4, 0.25));
    }
    
    calculateTSS(sessionData) {
        // TSS = (duration * NP * IF) / (FTP * 3600) * 100
        const duration = sessionData.length; // seconds
        const np = this.calculateNormalizedPower(sessionData);
        const ftp = 250; // Default FTP, should be configurable
        const intensityFactor = np / ftp;
        
        return Math.round((duration * np * intensityFactor) / (ftp * 36));
    }
    
    calculateIntensityFactor(sessionData) {
        const np = this.calculateNormalizedPower(sessionData);
        const ftp = 250; // Default FTP
        return (np / ftp).toFixed(2);
    }
    
    downloadFIT(sessionData, startTime, filename = null) {
        try {
            const fitData = this.createFITFile(sessionData, startTime);
            const blob = new Blob([fitData], { type: 'application/vnd.ant.fit' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Generate filename if not provided
            if (!filename) {
                const date = new Date(startTime);
                const dateStr = date.toISOString().split('T')[0];
                const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
                filename = `Indoor_Cycling_${dateStr}_${timeStr}.fit`;
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Error creating FIT file:', error);
            return false;
        }
    }
}

// 3. UPDATE your exportSession() method in the SmartTrainerPlatform class:

exportSession() {
    if (this.session.data.length === 0) {
        this.showNotification('error', 'No data to export');
        return;
    }
    
    // Show export options
    const exportType = confirm('Export as FIT file for Strava?\n\nOK = FIT file (Strava compatible)\nCancel = CSV file (spreadsheet)');
    
    if (exportType) {
        // Export as FIT file
        const fitExporter = new FITExporter();
        const success = fitExporter.downloadFIT(
            this.session.data, 
            this.session.startTime
        );
        
        if (success) {
            this.log('📥 Session exported as FIT file (Strava compatible)');
            this.showNotification('success', 'FIT file exported - Ready for Strava upload!', 5000);
        } else {
            this.log('❌ Failed to export FIT file');
            this.showNotification('error', 'FIT export failed');
        }
    } else {
        // Export as CSV (existing functionality)
        const csv = this.convertToCSV(this.session.data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `training_${new Date().toISOString()}.csv`;
        a.click();
        
        this.log('📥 Session data exported as CSV');
        this.showNotification('success', 'CSV file exported successfully');
    }
}

// 4. Optional: Add dedicated FIT export button to your HTML:
/*
<button class="btn btn-primary" id="export-fit" disabled>
    <img src="https://cdn.jsdelivr.net/gh/FortAwesome/Font-Awesome/svgs/brands/strava.svg" width="16"> Export to Strava
</button>
*/

// 5. Add event listener for dedicated FIT button (if you add it):
/*
document.getElementById('export-fit')?.addEventListener('click', () => {
    if (this.session.data.length === 0) {
        this.showNotification('error', 'No data to export');
        return;
    }
    
    const fitExporter = new FITExporter();
    const success = fitExporter.downloadFIT(
        this.session.data, 
        this.session.startTime
    );
    
    if (success) {
        this.log('📥 Session exported for Strava');
        this.showNotification('success', 'FIT file ready for Strava upload!', 5000);
    }
});
*/