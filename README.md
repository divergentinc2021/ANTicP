# ANTicP - Smart Trainer Control Platform

## ✅ FIXED AND READY TO USE!

The platform is now properly configured to work with your **Wahoo KICKR Core** and **Zwift Click**!

### 🎯 What's Been Fixed:

1. **Proper Bluetooth UUIDs**: All services and characteristics now use full UUID format
2. **FTMS Indoor Bike Data Parsing**: Correctly extracts speed, cadence, power from your KICKR Core
3. **Zwift Click Integration**: Proper handshake and button handling
4. **Resistance Control**: Full control over trainer resistance via FTMS
5. **Live Metrics Display**: Real-time updates for all sensor data

### 🚴 How to Use:

1. **Open the Platform**:
   - Open `index.html` in Chrome or Edge browser
   - Or visit: https://divergentinc2021.github.io/ANTicP/

2. **Connect Your KICKR Core**:
   - Click "Connect KICKR Core" button
   - Select your trainer from the list
   - This will automatically connect:
     - Power meter
     - Speed sensor (via FTMS)
     - Cadence sensor (via FTMS)
     - Resistance control

3. **Connect Zwift Click** (Optional):
   - Click "Connect Zwift Click" button
   - Select your Zwift Click device
   - Use UP/DOWN buttons to adjust resistance

4. **Connect Heart Rate Monitor** (Optional):
   - Click "Connect HR Monitor" button
   - Select your heart rate device

### 📊 Features:

- **Live Metrics**: Real-time power, speed, cadence, heart rate
- **Resistance Control**: Adjust trainer resistance (0-100%)
- **ERG/SIM Modes**: Switch between training modes
- **Session Recording**: Start/pause/stop training sessions
- **Data Export**: Export session data as CSV
- **Activity Log**: Real-time connection and data log

### 🔧 Troubleshooting:

**If sensors don't connect:**
1. Make sure Bluetooth is enabled on your device
2. Ensure sensors are powered on and not connected to other apps
3. Try refreshing the page and reconnecting
4. Use Chrome or Edge browser (Firefox doesn't support Web Bluetooth)

**If data doesn't appear:**
1. Start pedaling - sensors need movement to generate data
2. Check the activity log for error messages
3. Try disconnecting and reconnecting the sensor

**KICKR Core specific:**
- The KICKR Core provides speed/cadence via FTMS Indoor Bike Data
- No separate speed/cadence sensors needed
- All data comes through the single trainer connection

**Zwift Click specific:**
- Make sure Zwift Click is in pairing mode (hold button for 3 seconds)
- The device should show as "Zwift Click" in the pairing dialog
- UP button increases resistance by 5%
- DOWN button decreases resistance by 5%

### 🚀 Quick Start:

```javascript
// The app automatically initializes when you open the page
// All connections are handled through the UI buttons
// No manual configuration needed!
```

### 📱 Supported Devices:

- ✅ Wahoo KICKR Core
- ✅ Wahoo KICKR (all models)
- ✅ Zwift Click
- ✅ Tacx trainers (with FTMS)
- ✅ Elite trainers (with FTMS)
- ✅ Any Bluetooth heart rate monitor
- ✅ Any FTMS-compatible trainer

### 🌐 Live Link:

Access the platform directly at:
**https://divergentinc2021.github.io/ANTicP/**

The index.html file is now the main entry point with all fixes applied!

---

## Technical Details

### Bluetooth Services Used:

- **Fitness Machine Service (FTMS)**: `00001826-0000-1000-8000-00805f9b34fb`
  - Indoor Bike Data: `00002ad2-0000-1000-8000-00805f9b34fb`
  - Control Point: `00002ad9-0000-1000-8000-00805f9b34fb`

- **Cycling Power Service**: `00001818-0000-1000-8000-00805f9b34fb`
  - Power Measurement: `00002a63-0000-1000-8000-00805f9b34fb`

- **Heart Rate Service**: `0000180d-0000-1000-8000-00805f9b34fb`
  - Heart Rate Measurement: `00002a37-0000-1000-8000-00805f9b34fb`

- **Zwift Click Service**: `00000001-19ca-4651-86e5-fa29dcdd09d1`
  - Measurement: `00000002-19ca-4651-86e5-fa29dcdd09d1`
  - Control: `00000003-19ca-4651-86e5-fa29dcdd09d1`
  - Response: `00000004-19ca-4651-86e5-fa29dcdd09d1`

### Data Parsing:

The FTMS Indoor Bike Data characteristic provides multiple data points in a single notification:
- Instantaneous Speed (always present)
- Instantaneous Cadence (bit 2)
- Instantaneous Power (bit 6)
- Total Distance (bit 4)
- Resistance Level (bit 5)

Each data point is checked via bit flags before parsing to ensure compatibility across different trainers.
