# ANTicP Navigation Flow Documentation

## Overview

The ANTicP indoor cycling training platform now has a streamlined, logical navigation flow that separates user authentication, equipment setup, and workout execution into distinct pages.

---

## Page Structure

### Production Pages (Active)

1. **index.html** (Root) - Login Page
2. **equipment-pairing.html** (Root) - Sensor Connection Setup
3. **workout.html** (Root) - Main Training Application
4. **pages/member.html** - Member Dashboard
5. **pages/admin.html** - Admin Panel
6. **pages/workout-session.html** - Alternative Workout Tracker (with Chart.js graphing)

### Archived Pages

All test, debug, and experimental files have been moved to the `archive/` directory. See `archive/README.md` for details.

---

## User Navigation Flow

### Member Workflow

```
┌─────────────────┐
│  index.html     │ ← Entry point
│  (Login Page)   │
└────────┬────────┘
         │
         ├─ Username login
         │
         v
┌──────────────────────┐
│ equipment-pairing.   │
│ html                 │ ← Connect Bluetooth sensors
│ (Sensor Setup)       │
└────────┬─────────────┘
         │
         ├─ Connect KICKR
         ├─ Connect Zwift Click
         ├─ Connect HR Monitor
         │  (or skip)
         v
┌─────────────────────┐
│  workout.html       │
│  (Training App)     │ ← Main workout interface
└─────────────────────┘
```

**Alternative Path from Member Dashboard:**

```
┌─────────────────┐
│  index.html     │
│  (Login)        │
└────────┬────────┘
         │
         v
┌─────────────────────┐
│  pages/member.html  │
│  (Dashboard)        │ ← View zones & profile
└────────┬────────────┘
         │
         ├─ Click "Start Workout"
         v
┌──────────────────────┐
│ equipment-pairing.   │
│ html                 │
└────────┬─────────────┘
         │
         v
┌─────────────────────┐
│  workout.html       │
└─────────────────────┘
```

### Admin Workflow

```
┌─────────────────┐
│  index.html     │
│  (Login Page)   │
└────────┬────────┘
         │
         ├─ Admin login (email + password)
         │
         v
┌─────────────────────┐
│  pages/admin.html   │
│  (Admin Panel)      │ ← Manage users & zones
└─────────────────────┘
```

---

## Page Details

### 1. index.html - Login Page

**Purpose:** User authentication entry point

**Features:**
- Username-only login for members (quick gym access)
- Email + password login for admins
- Firebase Authentication integration
- Automatic redirect based on user role

**Redirects:**
- Members → `equipment-pairing.html`
- Admins → `pages/admin.html`

**Files:**
- HTML: `/index.html`
- JavaScript: `/js/login.js`
- Firebase: `/js/firebase-config.js`

---

### 2. equipment-pairing.html - Sensor Setup

**Purpose:** Connect Bluetooth sensors before workout

**Features:**
- Web Bluetooth API integration
- Connect to KICKR/Wahoo smart trainers
- Connect to Zwift Click controllers
- Connect to heart rate monitors
- SessionStorage for connection persistence
- "Skip for Now" option to go directly to workout
- Shows previously connected devices

**Sensor Information Stored:**
```javascript
sessionStorage:
  - 'kickr-connected': 'true' | 'false'
  - 'kickr-id': device.id
  - 'kickr-name': device.name
  - 'zwift-connected': 'true' | 'false'
  - 'zwift-id': device.id
  - 'zwift-name': device.name
  - 'hr-connected': 'true' | 'false'
  - 'hr-id': device.id
  - 'hr-name': device.name
  - 'sensorsConnected': JSON.stringify({kickr, zwift, heart})
```

**Redirects:**
- "Start Workout" button → `workout.html`
- "Skip for Now" button → `workout.html`

**Files:**
- HTML: `/equipment-pairing.html`
- Embedded JavaScript (self-contained)

---

### 3. workout.html - Main Training Application

**Purpose:** Full-featured indoor cycling training app

**Features:**
- 8-zone training system (Recovery → Sprint)
- Real-time Bluetooth connectivity (FTMS protocol)
- Zwift Click gear shifting integration
- Heart rate monitoring
- Power, cadence, speed display
- FIT file export (Strava compatible)
- CSV data export
- Session recording
- Zone-based resistance control
- Real-time metrics display

**Technologies:**
- Web Bluetooth API
- FTMS (Fitness Machine Service) Protocol
- Zwift Click Custom Protocol
- Heart Rate Service (BLE)
- FIT SDK for file export

**Files:**
- HTML: `/workout.html` (1641 lines, monolithic)
- All JavaScript embedded in HTML

**Note:** This is the original, fully functional training app from `index.html`

---

### 4. pages/member.html - Member Dashboard

**Purpose:** Member profile and training zones view

**Features:**
- View personal profile information
- Display power zones (based on FTP)
- Display heart rate zones (based on max HR)
- Edit profile information
- Upload profile photo
- "Start Workout" button to begin training session

**Redirects:**
- "Start Workout" button → `../equipment-pairing.html`
- "Logout" button → `../index.html`

**Files:**
- HTML: `/pages/member.html`
- JavaScript: `/js/member.js`
- Firebase: `/js/firebase-config.js`

---

### 5. pages/admin.html - Admin Panel

**Purpose:** User management and zone calculations

**Features:**
- View all registered users
- Create new user accounts
- Edit user profiles
- Delete user accounts
- Calculate training zones (power & HR)
- Upload user profile photos
- Set FTP and max heart rate values

**Files:**
- HTML: `/pages/admin.html`
- JavaScript: `/js/admin-fixed.js`
- Firebase: `/js/firebase-config.js`

---

### 6. pages/workout-session.html - Alternative Workout Tracker

**Purpose:** Chart.js-based workout session tracker (Phase 2 implementation)

**Features:**
- Real-time graphing with Chart.js
- Displays power, heart rate, and cadence on graph
- Real Bluetooth connections to sensors
- Session management with laps
- Timer and metrics tracking
- CSV export for workout data
- Zone-based training with resistance control

**Technologies:**
- Chart.js for real-time graphing
- Web Bluetooth API
- Real sensor integration via WorkingSensorManager
- SessionStorage for data persistence

**Files:**
- HTML: `/pages/workout-session.html`
- JavaScript: `/js/working-sensor-manager.js`
- JavaScript: `/js/workout-session-controller.js`

**Redirects:**
- After save → `../pages/member.html`
- Sign out → `../pages/login.html`

---

## Persistent Bluetooth Connections

### Implementation

The equipment-pairing.html page implements connection persistence using SessionStorage:

1. **Connection Phase** (equipment-pairing.html):
   - User clicks "Connect" for each sensor
   - Web Bluetooth API prompts for device selection
   - Device info saved to SessionStorage
   - Connection state tracked

2. **Workout Phase** (workout.html):
   - Standalone connection management
   - Has its own sensor connection UI
   - Can check SessionStorage for previously connected devices
   - Users can reconnect if needed

### Technical Note

Web Bluetooth API connections don't persist across page navigation by default. The current implementation:
- ✅ Saves device IDs and names for reference
- ✅ Shows "previously connected" status
- ✅ Allows quick reconnection
- ❌ Cannot auto-reconnect without user interaction (browser security limitation)

### Future Enhancement Options

1. **Service Workers**: Maintain connections in background
2. **Single-Page Application**: Avoid page navigation altogether
3. **Progressive Web App**: Use PWA capabilities for better persistence

---

## File Organization

### Root Directory

```
/ANTicP/
├── index.html                  ← Login page
├── equipment-pairing.html      ← Sensor pairing
├── workout.html                ← Main training app
├── manifest.json               ← PWA manifest
├── README.md                   ← Project documentation
├── PRD.md                      ← Product Requirements Document
├── CODEBASE-ANALYSIS.md        ← Complete code audit
├── NAVIGATION-FLOW.md          ← This document
├── pages/                      ← User-facing pages
│   ├── login.html              ← Original login (kept as backup)
│   ├── member.html             ← Member dashboard
│   ├── admin.html              ← Admin panel
│   └── workout-session.html    ← Chart.js workout tracker
├── js/                         ← JavaScript modules
│   ├── firebase-config.js      ← Firebase setup & zone calculations
│   ├── login.js                ← Authentication logic
│   ├── member.js               ← Member dashboard logic
│   ├── admin-fixed.js          ← Admin panel logic
│   ├── working-sensor-manager.js      ← Bluetooth sensor connections
│   ├── workout-session-controller.js  ← Workout session management
│   ├── core/                   ← Core modules
│   ├── connections/            ← Connection handlers
│   └── utils/                  ← Utility functions
├── css/                        ← Stylesheets
├── assets/                     ← Images and resources
└── archive/                    ← Archived files (see archive/README.md)
    ├── debug/                  ← Debug pages (9 files)
    ├── zwift-click-debug/      ← Zwift debugging (9 files)
    ├── simulators/             ← Device simulators (3 files)
    ├── versions/               ← Old index versions (10 files)
    ├── integrated-platforms/   ← Alternative implementations (6 files)
    ├── experimental/           ← Incomplete features (8 files)
    ├── deprecated-js/          ← Old JavaScript (15 files)
    └── README.md               ← Archive documentation
```

---

## Session Management

### SessionStorage Keys

```javascript
// Authentication
'currentUsername': string           // Logged-in username
'userRole': 'member' | 'admin'     // User role

// Sensor Connections (from equipment-pairing.html)
'kickr-connected': 'true' | 'false'
'kickr-id': string                  // Bluetooth device ID
'kickr-name': string                // Device friendly name
'zwift-connected': 'true' | 'false'
'zwift-id': string
'zwift-name': string
'hr-connected': 'true' | 'false'
'hr-id': string
'hr-name': string
'sensorsConnected': JSON            // Summary object

// Workout Data (from workout-session.html)
'workoutSessions': JSON             // Array of saved sessions
```

---

## Development Phases Completed

### ✅ Phase 1: Project Organization
- Created archive directory structure (7 subdirectories)
- Moved 45 HTML files to appropriate archive folders
- Moved 15 deprecated JavaScript files to archive
- Created comprehensive archive documentation

### ✅ Phase 2: Workout Session Tracker
- Restored workout-session-fixed.html to pages/workout-session.html
- Added Chart.js CDN for graphing
- Integrated real Bluetooth connections via WorkingSensorManager
- Configured real-time graph for power, heart rate, and cadence
- Fixed navigation paths for pages/ directory structure
- Implemented session management and CSV export

### ✅ Phase 3: Page Flow Reorganization
- Renamed index.html → workout.html (main training app)
- Copied pages/login.html → index.html (new entry point)
- Updated all login redirects (admin → pages/admin.html, member → equipment-pairing.html)
- Created equipment-pairing.html with Bluetooth sensor setup
- Added "Start Workout" button to member dashboard
- Implemented SessionStorage-based connection persistence
- Created navigation flow documentation

---

## Testing Checklist

### User Login Flow
- [ ] Member can log in with username
- [ ] Admin can log in with email + password
- [ ] Redirect to correct page based on role
- [ ] Invalid credentials show error message

### Equipment Pairing Flow
- [ ] Can connect to KICKR/Wahoo trainer
- [ ] Can connect to Zwift Click
- [ ] Can connect to heart rate monitor
- [ ] Device names displayed after connection
- [ ] Can skip sensor pairing
- [ ] Connection state saved to SessionStorage
- [ ] Redirects to workout.html after setup

### Workout Flow
- [ ] Workout app loads correctly
- [ ] Bluetooth sensors connect and provide data
- [ ] Real-time metrics display (power, HR, cadence)
- [ ] Zone switching works
- [ ] FIT file export functions
- [ ] Session recording works

### Alternative Workout Tracker (pages/workout-session.html)
- [ ] Chart.js loads and displays graph
- [ ] Graph shows power, heart rate, and cadence
- [ ] Real-time data updates on graph
- [ ] Sensor connections work
- [ ] Session management (start, pause, stop)
- [ ] CSV export downloads
- [ ] Redirects back to member dashboard after save

### Member Dashboard
- [ ] Displays user profile correctly
- [ ] Shows power and HR zones
- [ ] "Start Workout" button navigates to equipment-pairing
- [ ] Edit profile updates database
- [ ] Logout clears session and returns to login

### Admin Panel
- [ ] Lists all users
- [ ] Can create new users
- [ ] Can edit user information
- [ ] Zone calculations work correctly
- [ ] Can upload profile photos

---

## Known Issues & Limitations

### Bluetooth Connection Persistence
**Issue:** Web Bluetooth connections don't persist across page navigation
**Workaround:** equipment-pairing.html saves device IDs; users can quickly reconnect
**Future Fix:** Implement Service Workers or convert to SPA

### Path References
**Issue:** Some old code may have hardcoded paths
**Status:** All login and navigation paths updated in Phase 3
**Action:** Monitor for any remaining path issues

### Security
**Issue:** Members use email as password (noted in CODEBASE-ANALYSIS.md)
**Status:** Documented but not yet fixed
**Priority:** Medium (future enhancement)

---

## Deployment Notes

### GitHub Pages Deployment
- Entry point is now `index.html` (login page)
- All paths are relative
- Works with GitHub Pages root or subdirectory deployment

### Local Development
```bash
# Serve from root directory
python -m http.server 8000
# Or
npx serve
```

Navigate to: `http://localhost:8000/`

### Firebase Setup Required
```javascript
// Configure in js/firebase-config.js
firebase.initializeApp({
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    // ...
});
```

---

## Future Enhancements

### Priority 1 (Critical)
- [ ] Implement proper password system for members
- [ ] Add password reset functionality
- [ ] Add email verification

### Priority 2 (High)
- [ ] Convert to Progressive Web App (PWA)
- [ ] Implement Service Workers for offline support
- [ ] Add automatic Bluetooth reconnection
- [ ] Implement Firebase session saving for workout-session.html

### Priority 3 (Medium)
- [ ] Add workout history page
- [ ] Implement Strava OAuth integration
- [ ] Add workout programming/scheduling
- [ ] Create mobile app version (Capacitor)

### Priority 4 (Nice to Have)
- [ ] Add interval training templates
- [ ] Social features (leaderboards, challenges)
- [ ] Virtual route integration
- [ ] Multi-language support

---

## Support & Documentation

- **PRD**: See `PRD.md` for product requirements and vision
- **Code Analysis**: See `CODEBASE-ANALYSIS.md` for detailed file inventory
- **Archive Info**: See `archive/README.md` for archived file details
- **GitHub**: [divergentinc2021/ANTicP](https://github.com/divergentinc2021/ANTicP)

---

**Last Updated:** October 15, 2025
**Version:** 3.0 (Phase 3 Complete)
