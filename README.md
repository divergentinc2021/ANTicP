# 🏋️ ANTicP - Indoor Cycling Training Platform

## ✅ PRODUCTION READY - Version 3.0

**Live Site:** https://divergentinc2021.github.io/ANTicP/

A comprehensive web-based indoor cycling training platform with **Bluetooth sensor integration**, **real-time Chart.js graphing**, **8-zone training system**, and **Firebase backend**.

---

## 🎯 Recent Updates (Version 3.0 - October 2025)

### Phase 1: Project Organization ✅
- Archived 60+ legacy test/debug files
- Created organized directory structure
- Comprehensive documentation

### Phase 2: Workout Session Tracker ✅
- Integrated Chart.js for real-time graphing
- Real Bluetooth connections for power, HR, cadence
- Session management and CSV export

### Phase 3: Page Flow Reorganization ✅
- New login page as entry point (index.html)
- Equipment pairing interface (equipment-pairing.html)
- Main workout app (workout.html - renamed from index.html)
- Persistent Bluetooth connections via SessionStorage

### Core Platform Features ✅
1. **Proper Bluetooth UUIDs**: All services and characteristics use full UUID format
2. **FTMS Indoor Bike Data Parsing**: Extracts speed, cadence, power from KICKR Core
3. **Zwift Click Integration**: Proper handshake and button handling
4. **Resistance Control**: Full control over trainer resistance via FTMS
5. **Live Metrics Display**: Real-time updates for all sensor data
6. **Chart.js Graphing**: Real-time power, HR, and cadence visualization
7. **Firebase Backend**: User authentication, profiles, and data storage
8. **8-Zone Training**: Recovery through Sprint zones with automatic resistance

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[PRD.md](PRD.md)** | Product Requirements Document |
| **[CODEBASE-ANALYSIS.md](CODEBASE-ANALYSIS.md)** | Complete file inventory (84 files analyzed) |
| **[NAVIGATION-FLOW.md](NAVIGATION-FLOW.md)** | Page flow guide with user journeys |
| **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** | GitHub Pages deployment instructions |
| **[DEPLOYMENT-VERIFICATION.md](DEPLOYMENT-VERIFICATION.md)** | Live deployment test results |
| **[TESTING-GUIDE.md](TESTING-GUIDE.md)** | Comprehensive testing procedures |
| **[archive/README.md](archive/README.md)** | Archived files documentation |

---

## 🗺️ Navigation Flow

```
Login (index.html) → Equipment Pairing → Workout (workout.html)
                  ↓
             Admin Panel (pages/admin.html)
```

**Member Journey:**
1. Login with username
2. Connect Bluetooth sensors (KICKR, Zwift Click, HR monitor)
3. Start workout with real-time metrics and Chart.js graphs

**Admin Journey:**
1. Login with email + password
2. Manage users, calculate zones, upload photos

---

## 🚴 How to Use

### 1. Open the Platform
   - Visit: https://divergentinc2021.github.io/ANTicP/
   - Or open `index.html` locally in Chrome or Edge

### 2. Login
   - **Members:** Enter username, redirect to equipment pairing
   - **Admins:** Click "Admin Login →", enter email + password

### 3. Equipment Pairing (Members)
   - **Connect KICKR Core:** Click button, select trainer
     - Provides: Power, Speed, Cadence, Resistance Control
   - **Connect Zwift Click** (Optional): Click button, select controller
     - UP button: Cycle zones, DOWN button: Mark lap
   - **Connect HR Monitor** (Optional): Click button, select device
     - Provides: Real-time heart rate
   - Or click "Skip for Now" to proceed without sensors

### 4. Start Workout
   - Choose training zone (Z1-Z8)
   - See real-time metrics: Power, HR, Cadence, Speed
   - Watch Chart.js graph update live
   - Record session data
   - Export as FIT or CSV for Strava/TrainingPeaks

---

## ✨ Features

### 🚴 Training Features
- **8-Zone Training System** (Recovery → Sprint)
- **Real-time Metrics** (Power, HR, Cadence, Speed)
- **Chart.js Graphing** (Live power, HR, cadence visualization)
- **Zone-Based Resistance Control** (Automatic trainer adjustment)
- **Session Recording** (Start/pause/stop with lap marking)
- **Data Export** (FIT & CSV formats for Strava/TrainingPeaks)
- **Interval Training Support**
- **Bluetooth Sensor Integration** (FTMS, Zwift Click, HR)

### 👤 User Management
- **Member Dashboard** (Personalized training zones)
- **Admin Panel** (User management, zone calculations)
- **Firebase Authentication** (Role-based access)
- **Profile Management** (Photos, metrics, zones)
- **Automatic Zone Calculation** (Power & HR zones from FTP/Max HR)

### 📱 Technical
- **Progressive Web App** (PWA-ready)
- **Responsive Design** (Mobile-friendly)
- **Persistent Connections** (SessionStorage-based)
- **Real-time Database** (Cloud Firestore)
- **Secure Authentication** (Firebase Auth)
- **HTTPS** (Required for Bluetooth API)

---

## 📁 Project Structure

```
/ANTicP/
├── index.html                    # Login page (ENTRY POINT)
├── equipment-pairing.html        # Sensor pairing interface
├── workout.html                  # Main training app
├── pages/
│   ├── admin.html               # Admin panel
│   ├── member.html              # Member dashboard
│   ├── workout-session.html     # Chart.js tracker
│   └── login.html               # Login backup
├── js/                          # JavaScript modules (11 files)
├── css/                         # Stylesheets
├── assets/                      # Images
├── archive/                     # Archived files (60+)
└── Documentation/               # 8 comprehensive guides
```

---

## 🌐 Browser Compatibility

| Browser | Status | Bluetooth | Chart.js |
|---------|--------|-----------|----------|
| **Chrome 56+** | ✅ Full Support | ✅ Yes | ✅ Yes |
| **Edge 79+** | ✅ Full Support | ✅ Yes | ✅ Yes |
| **Firefox 111+** | ⚠️ Partial | ⚠️ Behind flag | ✅ Yes |
| **Safari 14+** | ⚠️ Limited | ❌ No | ✅ Yes |

**Recommended:** Chrome or Edge for full Bluetooth functionality

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

---

## 📊 Project Statistics

- **Live Since:** October 2025
- **Version:** 3.0 (Phase 1-3 Complete)
- **Production Files:** 6 HTML pages, 11 JS modules
- **Archived Files:** 60+ test/debug files
- **Documentation:** 8 comprehensive guides
- **Last Commit:** 74 files changed, 6071+ insertions

---

## 🔗 Quick Links

- **Live Site:** https://divergentinc2021.github.io/ANTicP/
- **Repository:** https://github.com/divergentinc2021/ANTicP
- **Issues:** https://github.com/divergentinc2021/ANTicP/issues
- **Documentation:** See guides in repository

---

## 🎯 Roadmap

### Completed ✅
- Phase 1: Project organization
- Phase 2: Chart.js workout tracker
- Phase 3: Page flow reorganization

### Coming Soon 🚀
- Workout history page
- Enhanced Strava integration
- Progressive Web App features
- Service Workers for offline support
- Mobile app (iOS/Android via Capacitor)

---

**Made with ❤️ for cyclists everywhere**

**Powered by:** Firebase • Chart.js • Web Bluetooth • GitHub Pages

---

*For detailed information, see the complete documentation guides in the repository.*

**Version 3.0** | October 2025 | © ANTicP
