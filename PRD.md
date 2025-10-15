# Product Requirements Document (PRD)
# ANTicP - Smart Trainer Control Platform

**Version:** 1.0.0
**Last Updated:** October 15, 2025
**Project Repository:** https://github.com/divergentinc2021/ANTicP
**Live Demo:** https://divergentinc2021.github.io/ANTicP/

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [Current Features](#current-features)
4. [Technical Architecture](#technical-architecture)
5. [User Experience](#user-experience)
6. [Device Compatibility](#device-compatibility)
7. [Data Management](#data-management)
8. [Deployment & Infrastructure](#deployment--infrastructure)
9. [Known Issues & Limitations](#known-issues--limitations)
10. [Future Roadmap](#future-roadmap)

---

## 1. Executive Summary

**ANTicP** (ANT+ & Integrated Cycling Platform) is a progressive web application designed for indoor cycling enthusiasts and athletes. It provides a comprehensive training platform that connects to smart trainers, heart rate monitors, and Zwift Click controllers via Web Bluetooth API and USB, enabling users to perform structured workouts with zone-based training, interval management, and session recording.

### Key Metrics
- **Platform:** Web-based (PWA) with mobile app capability
- **Primary Technology:** Web Bluetooth API, Capacitor
- **Target Users:** Indoor cyclists, triathletes, fitness enthusiasts
- **Deployment:** GitHub Pages + Firebase
- **Offline Support:** Progressive Web App

---

## 2. Product Vision

### Mission Statement
To provide a free, accessible, and powerful indoor cycling training platform that integrates seamlessly with modern smart trainers and fitness devices, enabling athletes to train effectively without requiring expensive third-party subscriptions.

### Core Value Propositions
1. **Free & Open:** No subscription fees, open-source architecture
2. **Universal Compatibility:** Works with Wahoo, Tacx, Elite, and FTMS-compatible trainers
3. **Browser-Based:** No installation required, works on desktop and mobile
4. **Data Export:** Full ownership of training data with Strava integration
5. **Zone Training:** Professional-grade zone-based training system
6. **Interval Workouts:** Structured workout support with JSON file import

---

## 3. Current Features

### 3.1 Core Training Features

#### Zone-Based Training System
- **8 Training Zones** with customizable resistance levels:
  - Zone 1: Recovery (0% resistance, 50-60% FTP)
  - Zone 2: Endurance (5% resistance, 60-70% FTP)
  - Zone 3: Tempo (10% resistance, 70-80% FTP)
  - Zone 4: Threshold (15% resistance, 80-90% FTP)
  - Zone 5: VO2 Max (20% resistance, 90-105% FTP)
  - Zone 6: Anaerobic (25% resistance, 105-120% FTP)
  - Zone 7: Neuromuscular (30% resistance, 120-150% FTP)
  - Zone 8: Sprint (35% resistance, 150%+ FTP)

- Visual zone indicators with color-coded display
- Real-time zone information and target metrics
- One-click zone switching via UI or Zwift Click buttons

#### Training Modes
- **Manual Mode:** Full control over zone selection and lap tracking
- **Auto Mode:** Resistance adjustments via controller buttons (±5%)
- **Interval Training:** Automated workout progression with file import

#### Live Metrics Display
Real-time display of:
- Power (Watts)
- Speed (km/h)
- Cadence (RPM)
- Heart Rate (BPM)
- Resistance Level (%)
- Session Duration
- Current Training Zone

### 3.2 Device Connectivity

#### Supported Bluetooth Devices
1. **Smart Trainers (FTMS Protocol)**
   - Wahoo KICKR Core
   - Wahoo KICKR (all models)
   - Tacx trainers with FTMS
   - Elite trainers with FTMS
   - Any FTMS-compatible trainer

2. **Zwift Click Controller**
   - Button-based zone cycling (Manual mode)
   - Resistance adjustment (Auto mode)
   - Lap triggering
   - Full handshake protocol support

3. **Heart Rate Monitors**
   - Any Bluetooth HR monitor
   - Polar HR monitors
   - Garmin HR monitors
   - Wahoo TICKR series

#### Bluetooth Services Supported
- **Fitness Machine Service (FTMS):** `0x1826`
  - Indoor Bike Data: `0x2AD2`
  - Control Point: `0x2AD9`
- **Cycling Power Service:** `0x1818`
- **Heart Rate Service:** `0x180D`
- **Zwift Click Custom Service:** `00000001-19ca-4651-86e5-fa29dcdd09d1`

### 3.3 Session Management

#### Session Recording
- Start/Pause/Stop functionality
- Real-time data collection (1 second intervals)
- Automatic session statistics calculation
- Lap counter with manual lap marking
- Set tracking for interval workouts

#### Session Statistics
- Total duration
- Average and maximum power
- Average and maximum heart rate
- Average and maximum cadence
- Average and maximum speed
- Total distance
- Total energy expenditure (kJ/kcal)

### 3.4 Data Export

#### Export Formats
1. **FIT File Export (Strava-compatible)**
   - Full FIT protocol implementation
   - Compatible with Strava, TrainingPeaks, Garmin Connect
   - Includes session, lap, and record messages
   - Proper CRC-16 checksums
   - Indoor cycling sport type

2. **CSV Export**
   - Raw data export
   - Timestamp, zone, power, speed, cadence, heart rate, resistance
   - Compatible with Excel and data analysis tools

### 3.5 Interval Training

#### Workout Import
- JSON format workout files
- Support for Zwift-style workout structure
- Automatic zone mapping based on interval color codes
- Real-time interval progression

#### Interval Display
- Current interval name and duration
- Visual progress bar
- Elapsed and remaining time
- Lap and set counters
- Automatic zone changes in Auto mode

### 3.6 User Interface

#### Design Principles
- **Modern Glass-morphism UI:** Translucent panels with blur effects
- **Color-Coded Zones:** Intuitive visual feedback for each training zone
- **Mobile-First Design:** Responsive layout for all screen sizes
- **Real-time Activity Log:** Terminal-style logging for debugging
- **Toast Notifications:** User-friendly status messages

#### Key UI Components
- Training zone panel with circular indicators
- Sensor pairing cards (Trainer, Zwift Click, HR Monitor)
- Live metrics grid (6 metric cards)
- Interval training panel with toggle switch
- Session controls (Start, Pause, Stop, Export)
- Activity log with scrollable console

---

## 4. Technical Architecture

### 4.1 Technology Stack

#### Frontend
- **HTML5:** Semantic markup with embedded styles and scripts
- **CSS3:** Custom CSS with CSS Variables, Flexbox, Grid
- **JavaScript (ES6+):** Modular ES6 classes, async/await patterns
- **Web APIs:**
  - Web Bluetooth API (primary connectivity)
  - Web Serial API (USB ANT+ support)
  - LocalStorage API (settings persistence)
  - File API (workout import)

#### Backend Services
- **Firebase Authentication:** User authentication system
- **Cloud Firestore:** User profiles and workout data
- **Firebase Storage:** Session data and workout files
- **Firebase Hosting:** Optional hosting platform

#### Build & Deployment
- **GitHub Actions:** Automated CI/CD pipeline
- **GitHub Pages:** Static site hosting
- **Capacitor 5.0:** Native mobile app packaging
  - iOS support
  - Android support
  - Bluetooth LE plugin

### 4.2 Project Structure

```
ANTicP/
├── index.html                 # Main application (all-in-one with embedded JS)
├── css/
│   ├── styles.css            # Global styles
│   ├── fix-clicks.css        # Zwift Click button fixes
│   └── workout-session.css   # Session UI styles
├── js/
│   ├── core/
│   │   ├── app.js           # Main application controller
│   │   ├── logger.js        # Logging utilities
│   │   ├── platform.js      # Platform detection
│   │   └── device-capture.js # Device specification capture
│   ├── connections/
│   │   ├── bluetooth.js     # Bluetooth connection manager
│   │   ├── connection-manager.js # Unified connection handler
│   │   └── unified-connection-manager.js
│   ├── devices/             # Device-specific handlers (future)
│   ├── protocols/           # Protocol parsers (future)
│   ├── ui/
│   │   └── ui-manager.js    # UI state management
│   └── utils/
│       ├── event-emitter.js # Event system
│       └── fit-file-converter.js # FIT file generation
├── pages/
│   ├── login.html           # User authentication
│   ├── member.html          # Member dashboard
│   └── admin.html           # Admin panel
├── .github/
│   └── workflows/
│       ├── static.yml       # GitHub Pages deployment
│       ├── quick-android-build.yml # Android build
│       └── build-native-apps.yml   # iOS/Android builds
├── manifest.json            # PWA manifest
├── package.json             # Node dependencies
├── firestore.rules          # Firestore security rules
└── storage.rules            # Firebase Storage rules
```

### 4.3 Architecture Patterns

#### Modular Design
- **Event-Driven Architecture:** EventEmitter pattern for component communication
- **Separation of Concerns:** Core logic separated from UI and device handling
- **Service-Oriented:** Bluetooth, UI, and data services are isolated modules

#### Data Flow
```
User Action → UI Manager → App Controller → Connection Manager → Bluetooth/USB
                                    ↓
                            Session Data Collection
                                    ↓
                            Metrics Update → UI Update
                                    ↓
                        Export (FIT/CSV) → File Download
```

#### State Management
- **Connection State:** Managed by ConnectionManager
- **Session State:** Managed by App Controller
- **UI State:** Managed by UIManager
- **Device State:** Tracked per device type

### 4.4 Key Classes & Modules

#### SmartTrainerPlatform (index.html)
Primary application class that handles:
- Zone management and cycling
- Zwift Click button handling
- Resistance control via FTMS
- Session recording and export
- Interval training automation
- Real-time metrics display

#### SimpleFITWriter (index.html)
FIT file generation with:
- File header and metadata
- Session and lap messages
- Record messages (per-second data)
- CRC-16 checksum calculation
- Proper FIT protocol compliance

#### App (js/core/app.js)
Main application controller:
- Module orchestration
- Event listener setup
- Data processing pipeline
- Session statistics calculation
- Connection status monitoring

#### BluetoothConnection (js/connections/bluetooth.js)
Bluetooth connectivity:
- Device discovery and pairing
- Service and characteristic management
- FTMS data parsing
- Heart rate data handling
- Power meter integration
- Auto-reconnection logic

#### FitFileConverter (js/utils/fit-file-converter.js)
Advanced FIT file conversion:
- Complete FIT protocol implementation
- Multi-message type support
- CSV to FIT conversion
- Strava-compatible output

---

## 5. User Experience

### 5.1 User Journey

#### First-Time User
1. **Landing:** User opens https://divergentinc2021.github.io/ANTicP/
2. **Platform Check:** App detects browser compatibility
3. **Device Pairing:**
   - Click "Connect KICKR Core" → Select trainer
   - Click "Connect Zwift Click" → Select controller
   - Click "Connect HR Monitor" → Select heart rate device
4. **Training Setup:**
   - App starts in Zone 1 (Recovery)
   - User can toggle Manual/Auto mode
   - Optional: Load interval workout file
5. **Training Session:**
   - Click "Start Session"
   - Real-time metrics update
   - Use Zwift Click to adjust zones/resistance
   - Mark laps as needed
6. **Session Completion:**
   - Click "Stop Session"
   - Export as FIT or CSV
   - Upload to Strava or analyze locally

#### Returning User
1. Browser remembers previous device connections
2. One-click reconnection
3. Immediate training start

### 5.2 User Personas

#### Persona 1: Competitive Cyclist
- **Age:** 28-45
- **Goal:** Structured training with FTP-based zones
- **Needs:** Accurate power data, interval workouts, Strava integration
- **Pain Points:** Expensive training apps, subscription fatigue

#### Persona 2: Fitness Enthusiast
- **Age:** 30-50
- **Goal:** Stay fit with indoor cycling
- **Needs:** Easy setup, basic metrics, heart rate monitoring
- **Pain Points:** Complex software, technical barriers

#### Persona 3: Triathlete
- **Age:** 25-40
- **Goal:** Maintain cycling fitness during off-season
- **Needs:** Zone training, session export, HR/power correlation
- **Pain Points:** Multiple device management, data silos

### 5.3 Accessibility

#### Browser Compatibility
- **Supported:**
  - Chrome/Chromium (Desktop & Android)
  - Edge (Desktop)
  - Opera (Desktop)
  - Bluefy (iOS - limited)
- **Not Supported:**
  - Firefox (no Web Bluetooth)
  - Safari (no Web Bluetooth on macOS/iOS)

#### Platform Requirements
- **Desktop:** Windows 10+, macOS 12+, Linux (with BlueZ 5.41+)
- **Mobile:** Android 8+ (Chrome), iOS 16+ (Bluefy browser)
- **Bluetooth:** Bluetooth 4.0+ (BLE)
- **HTTPS:** Required for Web Bluetooth (or localhost)

---

## 6. Device Compatibility

### 6.1 Tested Devices

#### Smart Trainers ✅
- Wahoo KICKR Core
- Wahoo KICKR V5
- Wahoo KICKR SNAP

#### Controllers ✅
- Zwift Click (all models)

#### Heart Rate Monitors ✅
- Wahoo TICKR
- Polar H10
- Garmin HRM-Dual

### 6.2 Compatibility Matrix

| Device Type | Protocol | Tested | Status |
|------------|----------|--------|---------|
| Wahoo KICKR | FTMS | Yes | ✅ Full Support |
| Tacx Neo | FTMS | No | ⚠️ Should Work |
| Elite Direto | FTMS | No | ⚠️ Should Work |
| Saris H3 | FTMS | No | ⚠️ Should Work |
| Zwift Click | Custom | Yes | ✅ Full Support |
| Any HR Monitor | BLE HR | Yes | ✅ Full Support |

### 6.3 Connection Requirements

#### FTMS Trainers
- Must advertise Fitness Machine Service (`0x1826`)
- Indoor Bike Data characteristic required
- Control Point characteristic for resistance

#### Zwift Click
- Custom Zwift service (`00000001-19ca-4651-86e5-fa29dcdd09d1`)
- Requires "RideOn" handshake
- Button state messages with UP/DOWN detection

#### Heart Rate Monitors
- Standard BLE Heart Rate Service (`0x180D`)
- Heart Rate Measurement characteristic

---

## 7. Data Management

### 7.1 Data Collection

#### Session Data Points
Collected every 1 second:
- Timestamp (Unix epoch)
- Current training zone
- Power (Watts)
- Speed (km/h)
- Cadence (RPM)
- Heart Rate (BPM)
- Resistance level (%)

#### Session Metadata
- Start time
- End time
- Total duration
- Device information
- User ID (if authenticated)

### 7.2 Data Storage

#### Local Storage
- Session data stored in memory during workout
- Export triggers file download
- No automatic cloud sync (user controls data)

#### Firebase Storage (Optional)
- User profiles
- Workout history
- Personal bests
- Training zones (FTP, Max HR)

#### Security & Privacy
- All Bluetooth communication is device-local
- No telemetry sent to external servers
- User owns all exported data
- Firebase rules enforce user-level access control

### 7.3 Data Export Specifications

#### FIT File Format
- **Header:** 14 bytes, protocol version 2.0
- **Messages:**
  - File ID (manufacturer, product, serial)
  - Session (summary statistics)
  - Lap (per-lap data)
  - Records (per-second data points)
  - Activity (overall summary)
- **Sport Type:** Indoor Cycling (2, sub-sport 6)
- **CRC-16:** Full checksum validation

#### CSV Format
- **Headers:** timestamp, zone, power, speed, cadence, heartRate, resistance
- **Encoding:** UTF-8
- **Line Endings:** LF
- **Compatible:** Excel, Google Sheets, Python pandas

---

## 8. Deployment & Infrastructure

### 8.1 Hosting

#### GitHub Pages (Primary)
- **URL:** https://divergentinc2021.github.io/ANTicP/
- **SSL:** Automatic HTTPS via GitHub
- **CDN:** GitHub's global CDN
- **Deployment:** Automated via GitHub Actions

#### Firebase Hosting (Optional)
- **URL:** Configurable subdomain
- **SSL:** Automatic via Firebase
- **CDN:** Firebase global CDN

### 8.2 CI/CD Pipeline

#### GitHub Actions Workflows

**1. Static Pages Deployment**
```yaml
Trigger: Push to main branch
Steps:
  - Checkout code
  - Setup GitHub Pages
  - Upload artifact (entire repo)
  - Deploy to Pages
```

**2. Android Build**
```yaml
Trigger: Manual or release
Steps:
  - Setup Java & Android SDK
  - Install Capacitor dependencies
  - Build APK/AAB
  - Upload to Google Play (optional)
```

**3. iOS Build**
```yaml
Trigger: Manual or release
Steps:
  - Setup Xcode
  - Install Capacitor dependencies
  - Build IPA
  - Upload to TestFlight (optional)
```

### 8.3 Native Mobile Apps

#### Capacitor Configuration
- **App ID:** `com.anticip.trainer`
- **App Name:** ANTicP Training Platform
- **Version:** 1.0.0
- **Web Dir:** `.` (root directory)

#### Plugins
- `@capacitor/app` - App lifecycle
- `@capacitor/core` - Core functionality
- `@capacitor-community/bluetooth-le` - Enhanced Bluetooth support

#### Build Commands
```bash
# Initialize Capacitor
npm run cap:init

# Add platforms
npm run cap:add:ios
npm run cap:add:android

# Sync web assets
npm run cap:sync

# Run on device
npm run ios
npm run android
```

---

## 9. Known Issues & Limitations

### 9.1 Current Issues

#### Bluetooth Connectivity
- **iOS Safari:** No Web Bluetooth support (use Bluefy browser)
- **Firefox:** No Web Bluetooth API support
- **Range:** Bluetooth limited to ~10 meters
- **Multiple Devices:** Cannot connect same device to multiple apps simultaneously

#### Zwift Click Button Detection
- **DOWN Button:** May require release detection instead of press
- **Debouncing:** 200ms delay to prevent double-triggers
- **Handshake:** Requires "RideOn" message for initialization

#### Mobile Compatibility
- **Android:** Requires Chrome browser and location permission
- **iOS:** Limited support, requires Bluefy or native app
- **Background:** App may disconnect when backgrounded

#### Data Accuracy
- **Speed Calculation:** Estimated from power (not wheel speed)
- **Distance:** Accumulated estimate, not GPS-based
- **Cadence:** Depends on trainer FTMS support

### 9.2 Browser-Specific Limitations

#### Chrome/Edge
- ✅ Full Web Bluetooth support
- ✅ HTTPS required (or localhost)
- ⚠️ Android requires location permission

#### Firefox
- ❌ No Web Bluetooth API
- Recommendation: Use Chrome

#### Safari
- ❌ No Web Bluetooth on macOS
- ❌ No Web Bluetooth on iOS
- Workaround: Use Bluefy browser or native app

### 9.3 Technical Debt

- **Monolithic index.html:** Application logic embedded in single file
- **No TypeScript:** No type safety
- **No Unit Tests:** No automated testing
- **No E2E Tests:** Manual testing only
- **Limited Error Handling:** Some edge cases not covered
- **No Offline Workout Library:** No pre-built workouts included

---

## 10. Future Roadmap

### 10.1 Short-Term (Next 3 Months)

#### Enhanced Features
- [ ] Pre-built interval workout library
- [ ] Custom workout creator UI
- [ ] Power-based auto-resistance (ERG mode)
- [ ] Virtual partner/pacer feature
- [ ] Session history with charts

#### Technical Improvements
- [ ] Refactor to modular architecture
- [ ] TypeScript migration
- [ ] Unit test coverage
- [ ] E2E test suite (Playwright)
- [ ] Performance optimization

#### Device Support
- [ ] ANT+ USB stick support (Chrome Serial API)
- [ ] Garmin Vector pedals
- [ ] Stages power meters
- [ ] Cycling speed/cadence sensors

### 10.2 Mid-Term (3-6 Months)

#### Advanced Training Features
- [ ] FTP test protocol
- [ ] Ramp test
- [ ] Training load tracking (TSS/IF)
- [ ] Fitness trends and analytics
- [ ] Power curve analysis
- [ ] VO2Max estimation

#### Social Features
- [ ] User profiles
- [ ] Workout sharing
- [ ] Leaderboards
- [ ] Group workout sessions
- [ ] Live multiplayer (WebRTC)

#### Integrations
- [ ] Strava Auto-Upload
- [ ] TrainingPeaks sync
- [ ] Garmin Connect integration
- [ ] Zwift workout import

### 10.3 Long-Term (6-12 Months)

#### Platform Expansion
- [ ] Native iOS app (App Store)
- [ ] Native Android app (Google Play)
- [ ] Desktop app (Electron)
- [ ] Smart TV apps (AndroidTV, tvOS)

#### Virtual Training Environment
- [ ] 3D virtual routes
- [ ] Video playback sync
- [ ] Gradient simulation
- [ ] Real-world GPS route import

#### AI & Machine Learning
- [ ] Personalized training plans
- [ ] Performance predictions
- [ ] Fatigue detection
- [ ] Recovery recommendations

#### Hardware Integration
- [ ] Custom ANT+ bridge device
- [ ] Direct trainer control (WiFi)
- [ ] Multi-screen support
- [ ] VR headset integration

---

## Appendix A: Glossary

- **ANT+:** Wireless protocol for sports and fitness devices
- **FTMS:** Fitness Machine Service (Bluetooth profile)
- **FTP:** Functional Threshold Power (cycling metric)
- **ERG Mode:** Trainer automatically adjusts resistance to maintain target power
- **SIM Mode:** Trainer simulates gradient/terrain resistance
- **BLE:** Bluetooth Low Energy
- **PWA:** Progressive Web App
- **TSS:** Training Stress Score
- **IF:** Intensity Factor

## Appendix B: API Reference

### SmartTrainerPlatform Class

```javascript
// Main application class
class SmartTrainerPlatform {
  constructor()
  async initialize()

  // Zone management
  setZone(zoneId)
  cycleZone()

  // Device connections
  async connectTrainer()
  async connectZwiftClick()
  async connectHeartRate()

  // Resistance control
  async setResistance(value)

  // Session management
  startSession()
  pauseSession()
  stopSession()
  exportSession()

  // Interval training
  async loadIntervalFile(file)
  displayInterval(index)
  nextInterval()

  // Button handling
  handleUpButton()
  handleDownButton()

  // Lap management
  triggerLap()
}
```

### SimpleFITWriter Class

```javascript
// FIT file generation
class SimpleFITWriter {
  constructor()

  // Main conversion
  createIndoorCyclingFIT(sessionData, startTime)

  // Timestamp conversion
  dateToFIT(date)

  // Byte writing
  writeByte(value)
  writeShort(value)
  writeInt(value)
  writeBytes(bytes)
}
```

---

## Appendix C: Configuration

### Firebase Configuration

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.storage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### Capacitor Configuration

```json
{
  "appId": "com.anticip.trainer",
  "appName": "ANTicP Training Platform",
  "webDir": ".",
  "bundledWebRuntime": false
}
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-15 | System Analysis | Initial PRD creation |

---

**END OF DOCUMENT**
