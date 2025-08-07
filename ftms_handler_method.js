// FTMS INDOOR BIKE DATA HANDLER (Speed + Cadence from Smart Trainer)
// Add this method to the ZwiftStyleSensorPairingApp class

handleFTMSIndoorBikeData(dataValue) {
    const data = new Uint8Array(dataValue.buffer);
    const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
    this.log(`🎯 🎯 🎯 FTMS INDOOR BIKE DATA: ${hexString} (${data.length} bytes) 🎯 🎯 🎯`);
    
    if (data.length < 4) {
        this.log('⚠️ FTMS data too short, skipping');
        return;
    }
    
    // Parse flags (bytes 0-1, little endian)
    const flags = data[0] | (data[1] << 8);
    this.log(`🔍 FTMS Flags: 0x${flags.toString(16).padStart(4, '0')}`);
    
    let index = 2; // Start after flags
    
    // Check if Instantaneous Speed Present (bit 0)
    if (flags & 0x0001) {
        if (index + 1 < data.length) {
            const speedRaw = data[index] | (data[index + 1] << 8);
            const speedKmh = speedRaw * 0.01; // 0.01 km/h resolution
            const speedMph = speedKmh * 0.621371; // Convert to mph
            
            this.liveMetrics.speed = speedKmh;
            this.updateSensorValue('speed', speedKmh.toFixed(1), 'km/h');
            this.updateLiveMetric('live-speed-display', speedMph.toFixed(1), 'Live from FTMS trainer');
            this.markMetricAsLive('live-speed-metric');
            this.log(`🚴 FTMS Speed: ${speedKmh.toFixed(1)} km/h (${speedMph.toFixed(1)} mph)`);
            
            index += 2;
        }
    }
    
    // Check if Average Speed Present (bit 1) - skip if present
    if (flags & 0x0002) {
        index += 2;
    }
    
    // Check if Instantaneous Cadence Present (bit 2)
    if (flags & 0x0004) {
        if (index + 1 < data.length) {
            const cadenceRaw = data[index] | (data[index + 1] << 8);
            const cadenceRpm = cadenceRaw * 0.5; // 0.5 rpm resolution
            
            this.liveMetrics.cadence = Math.round(cadenceRpm);
            this.updateSensorValue('cadence', Math.round(cadenceRpm), 'rpm');
            this.updateLiveMetric('live-cadence-display', Math.round(cadenceRpm), 'Live from FTMS trainer');
            this.markMetricAsLive('live-cadence-metric');
            this.log(`🔄 FTMS Cadence: ${Math.round(cadenceRpm)} RPM`);
            
            index += 2;
        }
    }
    
    // Check if Average Cadence Present (bit 3) - skip if present
    if (flags & 0x0008) {
        index += 2;
    }
    
    // Check if Instantaneous Power Present (bit 6)
    if (flags & 0x0040) {
        if (index + 1 < data.length) {
            const powerRaw = data[index] | (data[index + 1] << 8);
            this.log(`🔋 FTMS Power: ${powerRaw}W (from Indoor Bike Data)`);
            index += 2;
        }
    }
}