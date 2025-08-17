// FIT EXPORT FUNCTIONALITY - ADD TO YOUR INDEX.HTML
// ==================================================

// STEP 1: Add this SimpleFITWriter class right after the opening <script> tag in your index.html

class SimpleFITWriter {
    constructor() {
        this.buffer = [];
        this.timestamp_offset = 631065600; // Seconds between Unix epoch and FIT epoch (Dec 31, 1989)
    }
    
    dateToFIT(date) {
        return Math.floor(date.getTime() / 1000) - this.timestamp_offset;
    }
    
    writeBytes(bytes) {
        for (let byte of bytes) {
            this.buffer.push(byte & 0xFF);
        }
    }
    
    writeByte(value) {
        this.buffer.push(value & 0xFF);
    }
    
    writeShort(value) {
        this.writeByte(value & 0xFF);
        this.writeByte((value >> 8) & 0xFF);
    }
    
    writeInt(value) {
        this.writeByte(value & 0xFF);
        this.writeByte((value >> 8) & 0xFF);
        this.writeByte((value >> 16) & 0xFF);
        this.writeByte((value >> 24) & 0xFF);
    }
    
    createIndoorCyclingFIT(sessionData, startTime) {
        // FIT File Header
        this.writeByte(14);
        this.writeByte(0x20);
        this.writeShort(2140);
        this.writeInt(0);
        this.writeBytes([46, 70, 73, 84]);
        this.writeShort(0);
        
        const dataStartIndex = this.buffer.length;
        
        // File ID Message
        this.writeByte(0x40);
        this.writeByte(0);
        this.writeByte(0);
        this.writeShort(0);
        this.writeByte(5);
        
        this.writeByte(3); this.writeByte(4); this.writeByte(140);
        this.writeByte(4); this.writeByte(4); this.writeByte(134);
        this.writeByte(1); this.writeByte(2); this.writeByte(132);
        this.writeByte(2); this.writeByte(2); this.writeByte(132);
        this.writeByte(0); this.writeByte(1); this.writeByte(0);
        
        this.writeByte(0x00);
        this.writeInt(0x12345678);
        this.writeInt(this.dateToFIT(new Date(startTime)));
        this.writeShort(1);
        this.writeShort(2080);
        this.writeByte(4);
        
        // Session Message
        this.writeByte(0x41);
        this.writeByte(0);
        this.writeByte(0);
        this.writeShort(18);
        this.writeByte(17);
        
        this.writeByte(253); this.writeByte(4); this.writeByte(134);
        this.writeByte(2); this.writeByte(4); this.writeByte(134);
        this.writeByte(7); this.writeByte(4); this.writeByte(134);
        this.writeByte(9); this.writeByte(4); this.writeByte(134);
        this.writeByte(11); this.writeByte(2); this.writeByte(132);
        this.writeByte(13); this.writeByte(2); this.writeByte(132);
        this.writeByte(14); this.writeByte(2); this.writeByte(132);
        this.writeByte(16); this.writeByte(1); this.writeByte(2);
        this.writeByte(17); this.writeByte(1); this.writeByte(2);
        this.writeByte(18); this.writeByte(1); this.writeByte(2);
        this.writeByte(19); this.writeByte(1); this.writeByte(2);
        this.writeByte(20); this.writeByte(2); this.writeByte(132);
        this.writeByte(21); this.writeByte(2); this.writeByte(132);
        this.writeByte(5); this.writeByte(1); this.writeByte(0);
        this.writeByte(6); this.writeByte(1); this.writeByte(0);
        this.writeByte(26); this.writeByte(2); this.writeByte(132);
        this.writeByte(48); this.writeByte(4); this.writeByte(134);
        
        const duration = sessionData.length;
        const totalDistance = sessionData.reduce((sum, d, i) => {
            return sum + (i > 0 ? (d.speed || 0) / 3.6 : 0);
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
        const totalWork = avgPower * duration || 0;
        
        this.writeByte(0x01);
        this.writeInt(this.dateToFIT(new Date(startTime + duration * 1000)));
        this.writeInt(this.dateToFIT(new Date(startTime)));
        this.writeInt(duration * 1000);
        this.writeInt(Math.round(totalDistance * 100));
        this.writeShort(totalCalories);
        this.writeShort(Math.round(avgSpeed * 1000 / 3.6));
        this.writeShort(Math.round(maxSpeed * 1000 / 3.6));
        this.writeByte(avgHR);
        this.writeByte(maxHR);
        this.writeByte(avgCadence);
        this.writeByte(maxCadence);
        this.writeShort(avgPower);
        this.writeShort(maxPower);
        this.writeByte(2);
        this.writeByte(6);
        this.writeShort(1);
        this.writeInt(totalWork);
        
        // Record Messages
        this.writeByte(0x42);
        this.writeByte(0);
        this.writeByte(0);
        this.writeShort(20);
        this.writeByte(8);
        
        this.writeByte(253); this.writeByte(4); this.writeByte(134);
        this.writeByte(5); this.writeByte(4); this.writeByte(134);
        this.writeByte(6); this.writeByte(2); this.writeByte(132);
        this.writeByte(3); this.writeByte(1); this.writeByte(2);
        this.writeByte(4); this.writeByte(1); this.writeByte(2);
        this.writeByte(7); this.writeByte(2); this.writeByte(132);
        this.writeByte(2); this.writeByte(2); this.writeByte(131);
        this.writeByte(9); this.writeByte(1); this.writeByte(1);
        
        let accumulatedDistance = 0;
        sessionData.forEach((point, index) => {
            this.writeByte(0x02);
            this.writeInt(this.dateToFIT(new Date(point.timestamp)));
            
            if (index > 0) {
                accumulatedDistance += (point.speed || 0) / 3.6;
            }
            this.writeInt(Math.round(accumulatedDistance * 100));
            
            this.writeShort(Math.round((point.speed || 0) * 1000 / 3.6));
            this.writeByte(point.heartRate || 0);
            this.writeByte(point.cadence || 0);
            this.writeShort(point.power || 0);
            this.writeShort(1000);
            this.writeByte(point.resistance || 0);
        });
        
        // Activity Message
        this.writeByte(0x43);
        this.writeByte(0);
        this.writeByte(0);
        this.writeShort(34);
        this.writeByte(5);
        
        this.writeByte(253); this.writeByte(4); this.writeByte(134);
        this.writeByte(0); this.writeByte(4); this.writeByte(134);
        this.writeByte(1); this.writeByte(2); this.writeByte(132);
        this.writeByte(2); this.writeByte(1); this.writeByte(0);
        this.writeByte(3); this.writeByte(1); this.writeByte(0);
        
        this.writeByte(0x03);
        this.writeInt(this.dateToFIT(new Date(startTime + duration * 1000)));
        this.writeInt(duration * 1000);
        this.writeShort(1);
        this.writeByte(0);
        this.writeByte(26);
        
        const dataSize = this.buffer.length - dataStartIndex;
        this.buffer[4] = dataSize & 0xFF;
        this.buffer[5] = (dataSize >> 8) & 0xFF;
        this.buffer[6] = (dataSize >> 16) & 0xFF;
        this.buffer[7] = (dataSize >> 24) & 0xFF;
        
        this.writeShort(0);
        
        return new Uint8Array(this.buffer);
    }
}

// STEP 2: REPLACE your existing exportSession() method with this enhanced version:

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