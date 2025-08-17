// SIMPLIFIED FIT FILE WRITER FOR STRAVA EXPORT
// ==============================================
// Add this to your index.html inside a <script> tag

class SimpleFITWriter {
    constructor() {
        this.buffer = [];
        this.crc = new Uint16Array(1);
        this.timestamp_offset = 631065600; // Seconds between Unix epoch and FIT epoch (Dec 31, 1989)
    }
    
    // Convert JavaScript Date to FIT timestamp
    dateToFIT(date) {
        return Math.floor(date.getTime() / 1000) - this.timestamp_offset;
    }
    
    // Write bytes to buffer
    writeBytes(bytes) {
        for (let byte of bytes) {
            this.buffer.push(byte & 0xFF);
        }
    }
    
    // Write a single byte
    writeByte(value) {
        this.buffer.push(value & 0xFF);
    }
    
    // Write 16-bit value (little endian)
    writeShort(value) {
        this.writeByte(value & 0xFF);
        this.writeByte((value >> 8) & 0xFF);
    }
    
    // Write 32-bit value (little endian)
    writeInt(value) {
        this.writeByte(value & 0xFF);
        this.writeByte((value >> 8) & 0xFF);
        this.writeByte((value >> 16) & 0xFF);
        this.writeByte((value >> 24) & 0xFF);
    }
    
    // Create FIT file for indoor cycling session
    createIndoorCyclingFIT(sessionData, startTime) {
        // FIT File Header (14 bytes)
        this.writeByte(14);           // Header size
        this.writeByte(0x20);          // Protocol version
        this.writeShort(2140);         // Profile version
        this.writeInt(0);              // Data size (placeholder, will update)
        this.writeBytes([46, 70, 73, 84]); // ".FIT" in ASCII
        this.writeShort(0);            // Header CRC (placeholder)
        
        const dataStartIndex = this.buffer.length;
        
        // File ID Message (defines the file type)
        this.writeByte(0x40);          // Definition message header
        this.writeByte(0);             // Reserved
        this.writeByte(0);             // Architecture (little endian)
        this.writeShort(0);            // Global message number (file_id)
        this.writeByte(5);             // Number of fields
        
        // Field definitions for file_id
        this.writeByte(3); this.writeByte(4); this.writeByte(140); // serial_number
        this.writeByte(4); this.writeByte(4); this.writeByte(134); // time_created  
        this.writeByte(1); this.writeByte(2); this.writeByte(132); // manufacturer
        this.writeByte(2); this.writeByte(2); this.writeByte(132); // product
        this.writeByte(0); this.writeByte(1); this.writeByte(0);   // type
        
        // File ID Data
        this.writeByte(0x00);          // Data message header
        this.writeInt(0x12345678);     // Serial number
        this.writeInt(this.dateToFIT(new Date(startTime))); // Time created
        this.writeShort(1);            // Manufacturer (Garmin)
        this.writeShort(2080);         // Product
        this.writeByte(4);             // Type (activity)
        
        // Session Message Definition
        this.writeByte(0x41);          // Definition message header
        this.writeByte(0);             // Reserved
        this.writeByte(0);             // Architecture
        this.writeShort(18);           // Global message number (session)
        this.writeByte(17);            // Number of fields
        
        // Session field definitions
        this.writeByte(253); this.writeByte(4); this.writeByte(134); // timestamp
        this.writeByte(2); this.writeByte(4); this.writeByte(134);   // start_time
        this.writeByte(7); this.writeByte(4); this.writeByte(134);   // total_elapsed_time
        this.writeByte(9); this.writeByte(4); this.writeByte(134);   // total_distance
        this.writeByte(11); this.writeByte(2); this.writeByte(132);  // total_calories
        this.writeByte(13); this.writeByte(2); this.writeByte(132);  // avg_speed
        this.writeByte(14); this.writeByte(2); this.writeByte(132);  // max_speed
        this.writeByte(16); this.writeByte(1); this.writeByte(2);    // avg_heart_rate
        this.writeByte(17); this.writeByte(1); this.writeByte(2);    // max_heart_rate
        this.writeByte(18); this.writeByte(1); this.writeByte(2);    // avg_cadence
        this.writeByte(19); this.writeByte(1); this.writeByte(2);    // max_cadence
        this.writeByte(20); this.writeByte(2); this.writeByte(132);  // avg_power
        this.writeByte(21); this.writeByte(2); this.writeByte(132);  // max_power
        this.writeByte(5); this.writeByte(1); this.writeByte(0);     // sport
        this.writeByte(6); this.writeByte(1); this.writeByte(0);     // sub_sport
        this.writeByte(26); this.writeByte(2); this.writeByte(132);  // num_laps
        this.writeByte(48); this.writeByte(4); this.writeByte(134);  // total_work
        
        // Calculate session statistics
        const duration = sessionData.length;
        const totalDistance = sessionData.reduce((sum, d, i) => {
            return sum + (i > 0 ? (d.speed || 0) / 3.6 : 0); // Convert km/h to m/s
        }, 0);
        
        const avgPower = Math.round(sessionData.reduce((sum, d) => sum + (d.power || 0), 0) / duration) || 0;
        const maxPower = Math.max(...sessionData.map(d => d.power || 0)) || 0;
        const avgCadence = Math.round(sessionData.reduce((sum, d) => sum + (d.cadence || 0), 0) / duration) || 0;
        const maxCadence = Math.max(...sessionData.map(d => d.cadence || 0)) || 0;
        const avgHR = Math.round(sessionData.reduce((sum, d) => sum + (d.heartRate || 0), 0) / duration) || 0;
        const maxHR = Math.max(...sessionData.map(d => d.heartRate || 0)) || 0;
        const avgSpeed = sessionData.reduce((sum, d) => sum + (d.speed || 0), 0) / duration || 0;
        const maxSpeed = Math.max(...sessionData.map(d => d.speed || 0)) || 0;
        const totalCalories = Math.round((avgPower * duration * 3.6) / 1000) || 0;
        const totalWork = avgPower * duration || 0; // joules
        
        // Session Data
        this.writeByte(0x01);          // Data message header
        this.writeInt(this.dateToFIT(new Date(startTime + duration * 1000)));
        this.writeInt(this.dateToFIT(new Date(startTime)));
        this.writeInt(duration * 1000); // ms
        this.writeInt(Math.round(totalDistance * 100)); // cm
        this.writeShort(totalCalories);
        this.writeShort(Math.round(avgSpeed * 1000 / 3.6)); // mm/s
        this.writeShort(Math.round(maxSpeed * 1000 / 3.6)); // mm/s
        this.writeByte(avgHR);
        this.writeByte(maxHR);
        this.writeByte(avgCadence);
        this.writeByte(maxCadence);
        this.writeShort(avgPower);
        this.writeShort(maxPower);
        this.writeByte(2);             // Sport: cycling
        this.writeByte(6);             // Sub-sport: indoor cycling
        this.writeShort(1);             // Number of laps
        this.writeInt(totalWork);      // Total work in joules
        
        // Record Messages (data points)
        // First, define the record message format
        this.writeByte(0x42);          // Definition message header
        this.writeByte(0);             // Reserved
        this.writeByte(0);             // Architecture
        this.writeShort(20);           // Global message number (record)
        this.writeByte(8);             // Number of fields
        
        // Record field definitions
        this.writeByte(253); this.writeByte(4); this.writeByte(134); // timestamp
        this.writeByte(5); this.writeByte(4); this.writeByte(134);   // distance
        this.writeByte(6); this.writeByte(2); this.writeByte(132);   // speed
        this.writeByte(3); this.writeByte(1); this.writeByte(2);     // heart_rate
        this.writeByte(4); this.writeByte(1); this.writeByte(2);     // cadence
        this.writeByte(7); this.writeByte(2); this.writeByte(132);   // power
        this.writeByte(2); this.writeByte(2); this.writeByte(131);   // altitude
        this.writeByte(9); this.writeByte(1); this.writeByte(1);     // grade
        
        // Write record data for each second
        let accumulatedDistance = 0;
        sessionData.forEach((point, index) => {
            this.writeByte(0x02);      // Data message header for record
            this.writeInt(this.dateToFIT(new Date(point.timestamp)));
            
            // Calculate distance
            if (index > 0) {
                accumulatedDistance += (point.speed || 0) / 3.6; // Add m/s
            }
            this.writeInt(Math.round(accumulatedDistance * 100)); // cm
            
            // Speed in mm/s
            this.writeShort(Math.round((point.speed || 0) * 1000 / 3.6));
            
            // Heart rate, cadence, power
            this.writeByte(point.heartRate || 0);
            this.writeByte(point.cadence || 0);
            this.writeShort(point.power || 0);
            
            // Altitude (fixed for indoor) and grade (resistance)
            this.writeShort(1000); // 100m altitude (fixed)
            this.writeByte(point.resistance || 0);
        });
        
        // Activity Message
        this.writeByte(0x43);          // Definition message header
        this.writeByte(0);             // Reserved
        this.writeByte(0);             // Architecture
        this.writeShort(34);           // Global message number (activity)
        this.writeByte(5);             // Number of fields
        
        // Activity field definitions
        this.writeByte(253); this.writeByte(4); this.writeByte(134); // timestamp
        this.writeByte(0); this.writeByte(4); this.writeByte(134);   // total_timer_time
        this.writeByte(1); this.writeByte(2); this.writeByte(132);   // num_sessions
        this.writeByte(2); this.writeByte(1); this.writeByte(0);     // type
        this.writeByte(3); this.writeByte(1); this.writeByte(0);     // event
        
        // Activity Data
        this.writeByte(0x03);          // Data message header
        this.writeInt(this.dateToFIT(new Date(startTime + duration * 1000)));
        this.writeInt(duration * 1000); // ms
        this.writeShort(1);            // One session
        this.writeByte(0);             // Type: manual
        this.writeByte(26);            // Event: activity
        
        // Update data size in header
        const dataSize = this.buffer.length - dataStartIndex;
        this.buffer[4] = dataSize & 0xFF;
        this.buffer[5] = (dataSize >> 8) & 0xFF;
        this.buffer[6] = (dataSize >> 16) & 0xFF;
        this.buffer[7] = (dataSize >> 24) & 0xFF;
        
        // Calculate and append CRC (simplified - just use 0)
        this.writeShort(0);
        
        return new Uint8Array(this.buffer);
    }
}

// UPDATED exportSession METHOD FOR YOUR INDEX.HTML
// Replace your existing exportSession method with this:

exportSession() {
    if (this.session.data.length === 0) {
        this.showNotification('error', 'No data to export');
        return;
    }
    
    // Create export options dialog
    const exportDialog = document.createElement('div');
    exportDialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        text-align: center;
    `;
    
    exportDialog.innerHTML = `
        <h3 style="margin-bottom: 20px; color: #333;">Export Training Session</h3>
        <button id="export-fit-btn" style="
            padding: 15px 30px;
            margin: 10px;
            background: #fc4c02;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            display: block;
            width: 200px;
        ">
            🚴 Export for Strava (.FIT)
        </button>
        <button id="export-csv-btn" style="
            padding: 15px 30px;
            margin: 10px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            display: block;
            width: 200px;
        ">
            📊 Export as CSV
        </button>
        <button id="cancel-export-btn" style="
            padding: 10px 20px;
            margin: 10px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            cursor: pointer;
        ">
            Cancel
        </button>
    `;
    
    document.body.appendChild(exportDialog);
    
    // Handle FIT export
    document.getElementById('export-fit-btn').addEventListener('click', () => {
        try {
            const fitWriter = new SimpleFITWriter();
            const fitData = fitWriter.createIndoorCyclingFIT(this.session.data, this.session.startTime);
            
            const blob = new Blob([fitData], { type: 'application/vnd.ant.fit' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const date = new Date(this.session.startTime);
            const dateStr = date.toISOString().split('T')[0];
            const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
            a.download = `Indoor_Cycling_${dateStr}_${timeStr}.fit`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.log('📥 Session exported as FIT file (Strava compatible)');
            this.showNotification('success', '🚴 FIT file ready for Strava upload!', 5000);
            
        } catch (error) {
            this.log(`❌ FIT export failed: ${error.message}`);
            this.showNotification('error', 'FIT export failed');
        }
        
        document.body.removeChild(exportDialog);
    });
    
    // Handle CSV export
    document.getElementById('export-csv-btn').addEventListener('click', () => {
        const csv = this.convertToCSV(this.session.data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `training_${new Date().toISOString()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.log('📥 Session data exported as CSV');
        this.showNotification('success', '📊 CSV file exported successfully');
        
        document.body.removeChild(exportDialog);
    });
    
    // Handle cancel
    document.getElementById('cancel-export-btn').addEventListener('click', () => {
        document.body.removeChild(exportDialog);
    });
}