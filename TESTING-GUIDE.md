# ANTicP Testing Guide

## Overview

This guide provides step-by-step instructions for testing all features of the ANTicP indoor cycling training platform.

**Live Site:** https://divergentinc2021.github.io/ANTicP/

---

## Prerequisites

### Required Equipment (for full testing)
- **Smart Trainer:** Wahoo KICKR Core or KICKR (FTMS-compatible)
- **Zwift Click:** Zwift Click controller (optional)
- **Heart Rate Monitor:** Any Bluetooth HR monitor with Heart Rate Service

### Required Browser
- **Chrome 56+** or **Edge 79+** (for Web Bluetooth API)
- HTTPS connection (automatically provided by GitHub Pages)

### Test Accounts
You'll need:
- A member account (username/email)
- An admin account (email + password)

---

## Test Suite 1: User Authentication

### Test 1.1: Member Login

**Steps:**
1. Visit: https://divergentinc2021.github.io/ANTicP/
2. Enter a valid username in the "Username" field
3. Click "Access My Zones"

**Expected Result:**
- ✅ Loading spinner appears
- ✅ Redirect to `equipment-pairing.html`
- ✅ Username stored in SessionStorage: `currentUsername`
- ✅ User role stored: `userRole: 'member'`

**Verification:**
```javascript
// Open browser console (F12)
sessionStorage.getItem('currentUsername')  // Should show username
sessionStorage.getItem('userRole')         // Should show 'member'
```

---

### Test 1.2: Admin Login

**Steps:**
1. Visit: https://divergentinc2021.github.io/ANTicP/
2. Click "Admin Login →"
3. Enter admin email and password
4. Click "Login as Admin"

**Expected Result:**
- ✅ Redirect to `pages/admin.html`
- ✅ User role stored: `userRole: 'admin'`
- ✅ User list loads from Firestore
- ✅ Admin interface displays

---

### Test 1.3: Invalid Credentials

**Steps:**
1. Try logging in with:
   - Non-existent username
   - Wrong admin password
   - Empty fields

**Expected Result:**
- ✅ Error message displays
- ✅ No redirect occurs
- ✅ User remains on login page

---

## Test Suite 2: Equipment Pairing

### Test 2.1: KICKR/Smart Trainer Connection

**Requirements:**
- KICKR Core or FTMS-compatible trainer powered on
- Chrome or Edge browser
- Trainer in pairing mode

**Steps:**
1. Navigate to: `equipment-pairing.html` (after login)
2. Click "Connect KICKR" button
3. Browser Bluetooth picker appears
4. Select your KICKR device from the list
5. Click "Pair"

**Expected Result:**
- ✅ Bluetooth device picker appears
- ✅ KICKR appears in device list (e.g., "KICKR CORE 1234")
- ✅ Connection successful message
- ✅ Button changes to "✓ Connected"
- ✅ Status shows "Connected: KICKR CORE 1234"
- ✅ Green notification appears

**Verification:**
```javascript
// Check SessionStorage
sessionStorage.getItem('kickr-connected')  // 'true'
sessionStorage.getItem('kickr-name')       // 'KICKR CORE 1234'
sessionStorage.getItem('kickr-id')         // Device ID
```

**Troubleshooting:**
- If device doesn't appear: Ensure trainer is powered on and in pairing mode
- If connection fails: Refresh page and try again
- If button disabled: Ensure HTTPS and Chrome/Edge browser

---

### Test 2.2: Zwift Click Connection

**Requirements:**
- Zwift Click controller powered on (flashing light)
- Chrome or Edge browser

**Steps:**
1. Click "Connect Controller" button
2. Select "Zwift Click" from Bluetooth picker
3. Wait for connection

**Expected Result:**
- ✅ Bluetooth picker shows "Zwift Click"
- ✅ Connection successful
- ✅ Button shows "✓ Connected"
- ✅ Status updates

**Verification:**
```javascript
sessionStorage.getItem('zwift-connected')  // 'true'
sessionStorage.getItem('zwift-name')       // 'Zwift Click'
```

---

### Test 2.3: Heart Rate Monitor Connection

**Requirements:**
- Bluetooth HR monitor (chest strap or watch)
- HR monitor active and broadcasting

**Steps:**
1. Click "Connect HR Monitor"
2. Select your HR device from picker
3. Confirm pairing

**Expected Result:**
- ✅ HR monitor appears in list
- ✅ Connection successful
- ✅ Status shows connected

**Verification:**
```javascript
sessionStorage.getItem('hr-connected')  // 'true'
sessionStorage.getItem('hr-name')       // Device name
```

---

### Test 2.4: Skip Sensors

**Steps:**
1. On equipment-pairing.html
2. Click "Skip for Now"
3. Confirm in dialog

**Expected Result:**
- ✅ Redirect to `workout.html`
- ✅ No sensor data in SessionStorage
- ✅ Workout app loads
- ✅ Can connect sensors later from workout page

---

### Test 2.5: Connection Persistence

**Steps:**
1. Connect all sensors
2. Click "Start Workout"
3. Navigate to workout.html
4. Check connection status

**Expected Result:**
- ✅ Device info persists in SessionStorage
- ✅ Workout page shows "previously connected" status
- ✅ Can reconnect without re-pairing

---

## Test Suite 3: Main Workout App

### Test 3.1: Basic Navigation

**Steps:**
1. Navigate to: `workout.html`
2. Observe interface

**Expected Result:**
- ✅ 8 training zones visible (Z1-Z8)
- ✅ Metrics panel displays (Power, Speed, Cadence, HR)
- ✅ Sensor connection buttons visible
- ✅ Control buttons present (Start, Pause, Stop)
- ✅ Session timer at 00:00:00

---

### Test 3.2: Sensor Connection from Workout

**Steps:**
1. If sensors not connected, click connection buttons
2. Connect KICKR, Zwift Click, HR monitor
3. Observe status updates

**Expected Result:**
- ✅ Bluetooth pickers appear
- ✅ Devices connect successfully
- ✅ Connection indicators turn green
- ✅ Status shows "Connected"

---

### Test 3.3: Live Metrics Display

**Requirements:** Connected KICKR and HR monitor

**Steps:**
1. Start pedaling on trainer
2. Observe metrics panel
3. Change resistance/speed
4. Watch values update

**Expected Result:**
- ✅ Power (watts) updates in real-time
- ✅ Speed (km/h) updates
- ✅ Cadence (RPM) updates
- ✅ Heart Rate (BPM) updates
- ✅ Values reflect actual effort
- ✅ Update frequency: ~1 second

---

### Test 3.4: Zone Switching (Manual Mode)

**Steps:**
1. Click different zone indicators (Z1-Z8)
2. Observe resistance changes
3. Feel resistance on trainer

**Expected Result:**
- ✅ Selected zone highlights
- ✅ Zone info updates (name, FTP %, resistance)
- ✅ Resistance command sent to KICKR
- ✅ Trainer resistance changes (~2-3 seconds)
- ✅ Notification shows zone change

**Zone Resistance Values:**
- Z1 (Recovery): -5% resistance
- Z2 (Endurance): 0% resistance
- Z3 (Tempo): +5% resistance
- Z4 (Threshold): +10% resistance
- Z5 (VO2 Max): +15% resistance
- Z6 (Anaerobic): +20% resistance
- Z7 (Neuromuscular): +25% resistance
- Z8 (Sprint): +30% resistance

---

### Test 3.5: Zwift Click Button Control

**Requirements:** Connected Zwift Click

**Steps:**
1. Press UP button on Zwift Click
2. Press DOWN button on Zwift Click
3. Observe zone changes

**Expected Result:**
- ✅ UP button: Cycles to next zone
- ✅ DOWN button: Marks lap (in manual mode)
- ✅ Resistance changes accordingly
- ✅ Console logs button presses
- ✅ Debouncing prevents double-triggers

**Debug Mode:**
```javascript
// Enable in console to see raw button data
window.buttonState.debugMode = true
```

---

### Test 3.6: Session Recording

**Steps:**
1. Click "Start Session"
2. Pedal for 2-3 minutes
3. Click "Pause"
4. Resume pedaling
5. Click "Stop Session"

**Expected Result:**
- ✅ Timer starts counting
- ✅ Metrics recorded every second
- ✅ Pause freezes timer
- ✅ Resume continues recording
- ✅ Stop prompts for save

---

### Test 3.7: FIT File Export

**Steps:**
1. Complete a session
2. Click "Stop Session"
3. Choose "Export FIT"

**Expected Result:**
- ✅ FIT file downloads
- ✅ Filename format: `workout_TIMESTAMP.fit`
- ✅ File contains:
  - Session data
  - Power values
  - HR values
  - Cadence values
  - Timestamps
- ✅ Compatible with Strava/TrainingPeaks

**Verification:**
- Upload FIT file to Strava
- Check activity appears correctly
- Verify graphs show data

---

### Test 3.8: CSV Export

**Steps:**
1. Complete a session
2. Export as CSV

**Expected Result:**
- ✅ CSV file downloads
- ✅ Contains columns: Time, Power, HR, Cadence, Speed
- ✅ One row per second
- ✅ Opens in Excel/Sheets correctly

---

## Test Suite 4: Chart.js Workout Tracker

### Test 4.1: Page Load and Chart Initialization

**Steps:**
1. Navigate to: `pages/workout-session.html`
2. Observe page elements

**Expected Result:**
- ✅ Page loads successfully
- ✅ 8 zone indicators visible (Z1-Z8)
- ✅ Timer shows 00:00:00
- ✅ Metrics grid displays (Power, HR, Cadence, Speed)
- ✅ Lap table present
- ✅ Control buttons visible (STOP, PAUSE, LAP)
- ✅ Graph section visible with canvas element
- ✅ Chart.js loaded (check console for errors)

**Verification:**
```javascript
// Open console (F12)
typeof Chart  // Should return 'function', not 'undefined'
```

---

### Test 4.2: Connect Sensors

**Requirements:** KICKR and HR monitor available

**Steps:**
1. Connect sensors via equipment-pairing page
2. Navigate to workout-session.html
3. Or connect directly from workout-session page

**Expected Result:**
- ✅ Sensors connect successfully
- ✅ Connection state loads from SessionStorage
- ✅ Ready to receive data

---

### Test 4.3: Start Workout Session

**Steps:**
1. Click "COMPLETE WARMUP" button
2. Button changes to "START WORKOUT"
3. Click "START WORKOUT"
4. Button changes to "LAP"
5. Start pedaling

**Expected Result:**
- ✅ Timer starts counting
- ✅ Session status: "Warmup" → "Active"
- ✅ Button progresses through states
- ✅ Current lap table updates

---

### Test 4.4: Real-Time Graph Updates

**Requirements:** Connected sensors, active workout

**Steps:**
1. Pedal at steady pace
2. Observe graph in real-time
3. Change effort (harder/easier)
4. Watch graph respond

**Expected Result:**
- ✅ **Power line** (orange) displays and updates
- ✅ **Heart Rate line** (red) displays and updates
- ✅ **Cadence line** (green) displays and updates
- ✅ Graph shows last 60 seconds of data
- ✅ Lines are smooth (tension: 0.3)
- ✅ X-axis scrolls with time
- ✅ Y-axis scales appropriately
- ✅ Legend shows all three metrics
- ✅ Updates every second

**Graph Configuration:**
```javascript
// Expected Chart.js setup
Power:    Orange line, left Y-axis
HR:       Red line, right Y-axis
Cadence:  Green line, hidden Y-axis
```

---

### Test 4.5: Graph Scaling and Responsiveness

**Steps:**
1. Pedal very easy (low power)
2. Then sprint (high power)
3. Observe graph scaling

**Expected Result:**
- ✅ Y-axis adjusts automatically
- ✅ All data points visible
- ✅ No data clipping
- ✅ Graph remains readable
- ✅ Responsive to window resize

---

### Test 4.6: Zone Switching with Graph

**Steps:**
1. While workout active, click different zones
2. Observe graph during zone changes

**Expected Result:**
- ✅ Resistance changes on trainer
- ✅ Power values respond to new resistance
- ✅ Graph shows power increase/decrease
- ✅ HR responds to effort change (delayed)
- ✅ Zone indicator updates
- ✅ Zone info displays correctly

---

### Test 4.7: Lap Marking

**Steps:**
1. During workout, click "LAP" button
2. Or press DOWN button on Zwift Click
3. Observe lap table

**Expected Result:**
- ✅ Current lap completes
- ✅ New lap starts (timer resets for lap)
- ✅ Lap data added to table:
  - Lap number
  - Duration
  - Average power
  - Average HR
  - Average cadence
- ✅ Lap inserts at top of table
- ✅ Current lap row updates

---

### Test 4.8: Pause and Resume

**Steps:**
1. Click "PAUSE" during workout
2. Stop pedaling
3. Wait 30 seconds
4. Click "RESUME"
5. Start pedaling again

**Expected Result:**
- ✅ Timer pauses
- ✅ Button text changes to "RESUME"
- ✅ Graph stops updating
- ✅ Session status: "Paused"
- ✅ Resume restarts timer
- ✅ Graph continues from where it left off
- ✅ No data gap in recording

---

### Test 4.9: Save Session and CSV Export

**Steps:**
1. Complete a workout session
2. Click "STOP"
3. Confirm save

**Expected Result:**
- ✅ Confirmation dialog appears
- ✅ Timer stops
- ✅ Session data prepared
- ✅ CSV file downloads automatically
  - Filename: `workout_TIMESTAMP.csv`
  - Format: `Timestamp,Power,HeartRate,Cadence,Speed`
  - Contains all data points
- ✅ Success notification displays
- ✅ Redirect to member dashboard after 2 seconds

---

### Test 4.10: Chart.js Performance

**Steps:**
1. Run a 10-minute workout session
2. Observe graph performance
3. Check browser memory usage

**Expected Result:**
- ✅ Graph updates smoothly (no lag)
- ✅ No memory leaks
- ✅ Page remains responsive
- ✅ 60-second rolling window maintains performance
- ✅ Browser console shows no errors

**Performance Metrics:**
- Graph update frequency: 1 second
- Data points displayed: 60 (last 60 seconds)
- Memory usage: Stable (no growth over time)

---

## Test Suite 5: Member Dashboard

### Test 5.1: Profile Display

**Steps:**
1. Login as member
2. Navigate to pages/member.html
3. Or access directly

**Expected Result:**
- ✅ Profile photo or initial displays
- ✅ Full name shown
- ✅ Username displayed
- ✅ Email visible
- ✅ FTP shown (if set)
- ✅ Max HR shown (if set)
- ✅ Height, weight, age displayed
- ✅ Data loaded from Firebase

---

### Test 5.2: Training Zones Display

**Steps:**
1. View power zones table
2. View heart rate zones table

**Expected Result:**
- ✅ **Power Zones** (if FTP set):
  - Z1-Z7 listed
  - Zone names displayed
  - Power ranges in watts
  - % of FTP shown
  - Color-coded badges
- ✅ **Heart Rate Zones** (if Max HR set):
  - Z1-Z5 listed
  - Zone names displayed
  - HR ranges in bpm
  - % of Max HR shown
  - Color-coded badges

---

### Test 5.3: Start Workout Button

**Steps:**
1. Click "🚴 Start Workout" button in header

**Expected Result:**
- ✅ Redirect to `../equipment-pairing.html`
- ✅ Equipment pairing page loads
- ✅ User can connect sensors
- ✅ Flow: Dashboard → Pairing → Workout

---

### Test 5.4: Edit Profile

**Steps:**
1. Click "Edit Profile" button
2. Modify fields:
   - Username
   - First name
   - Last name
   - Height
   - Weight
3. Click "Save Changes"

**Expected Result:**
- ✅ Edit modal appears
- ✅ Current values pre-filled
- ✅ Can modify fields
- ✅ Save button updates Firebase
- ✅ Success message appears
- ✅ Modal closes
- ✅ Dashboard refreshes with new data
- ✅ Username mapping updated in Firestore

---

### Test 5.5: Logout

**Steps:**
1. Click "Logout" button

**Expected Result:**
- ✅ SessionStorage cleared
- ✅ Firebase auth signs out
- ✅ Redirect to `../pages/login.html`
- ✅ Cannot access protected pages without re-login

---

## Test Suite 6: Admin Panel

### Test 6.1: User List Display

**Steps:**
1. Login as admin
2. View user list

**Expected Result:**
- ✅ All users displayed in table
- ✅ Columns visible:
  - Profile photo
  - Name
  - Username
  - Email
  - FTP
  - Max HR
  - Actions (Edit, Delete)
- ✅ Data loaded from Firestore
- ✅ Real-time updates

---

### Test 6.2: Create New User

**Steps:**
1. Click "Create New User"
2. Fill in all fields:
   - Username: testuser
   - Email: testuser@example.com
   - First Name: Test
   - Last Name: User
   - FTP: 200
   - Max HR: 180
   - Weight: 75
   - Height: 175
3. Click "Create User"

**Expected Result:**
- ✅ User created in Firebase Auth
- ✅ User document created in Firestore
- ✅ Username mapping created
- ✅ Default password: `ChangeMe123!`
- ✅ Power zones calculated automatically
- ✅ HR zones calculated automatically
- ✅ Success notification
- ✅ Modal closes
- ✅ New user appears in list

---

### Test 6.3: Edit User

**Steps:**
1. Click "Edit" on a user
2. Modify FTP from 200 to 220
3. Save changes

**Expected Result:**
- ✅ Edit modal pre-fills current data
- ✅ Can modify fields
- ✅ FTP change recalculates power zones
- ✅ Changes saved to Firestore
- ✅ User list updates
- ✅ Zone calculations correct

---

### Test 6.4: Zone Calculation

**Steps:**
1. Create/edit user with FTP: 200
2. Check calculated zones

**Expected Result:**
```
Power Zones (FTP = 200):
Z1: 0-108W (50-54%)
Z2: 110-148W (55-74%)
Z3: 150-170W (75-85%)
Z4: 172-190W (86-95%)
Z5: 192-210W (96-105%)
Z6: 212-240W (106-120%)
Z7: 242-300W (121-150%)
Z8: 302+W (151%+)
```

---

### Test 6.5: Delete User

**Steps:**
1. Click "Delete" on a user
2. Confirm deletion

**Expected Result:**
- ✅ Confirmation dialog appears
- ✅ User deleted from Auth
- ✅ User document deleted from Firestore
- ✅ Username mapping deleted
- ✅ User disappears from list
- ✅ Success notification

---

### Test 6.6: Photo Upload

**Steps:**
1. Create/edit user
2. Click photo upload
3. Select image file
4. Save

**Expected Result:**
- ✅ File picker appears
- ✅ Can select image (JPG, PNG)
- ✅ Image uploads to Firebase Storage
- ✅ Photo URL stored in user document
- ✅ Photo displays in user list
- ✅ Photo appears in member dashboard

---

## Test Suite 7: Cross-Browser Testing

### Test 7.1: Chrome

**Version:** Chrome 56+

**Expected Result:**
- ✅ All features work
- ✅ Web Bluetooth available
- ✅ Chart.js renders correctly
- ✅ Firebase works
- ✅ No console errors

---

### Test 7.2: Edge

**Version:** Edge 79+

**Expected Result:**
- ✅ All features work
- ✅ Web Bluetooth available
- ✅ Identical to Chrome experience

---

### Test 7.3: Firefox

**Version:** Firefox 111+

**Expected Result:**
- ⚠️ Web Bluetooth behind flag
- ✅ Chart.js works
- ✅ Firebase works
- ⚠️ Cannot connect Bluetooth sensors
- ✅ Can test UI/Firebase features

---

### Test 7.4: Safari

**Version:** Safari 14+

**Expected Result:**
- ❌ Web Bluetooth not supported
- ✅ Chart.js works
- ✅ Firebase works
- ❌ Cannot connect sensors
- ✅ Can view interface only

---

## Test Suite 8: Mobile Responsive Testing

### Test 8.1: Mobile Chrome (Android)

**Steps:**
1. Visit site on Android phone
2. Test all pages

**Expected Result:**
- ✅ Responsive layout
- ✅ Touch targets adequate size
- ✅ Text readable without zoom
- ✅ Buttons work with touch
- ✅ Web Bluetooth available (if supported by device)

---

### Test 8.2: Mobile Safari (iOS)

**Steps:**
1. Visit site on iPhone/iPad
2. Test navigation

**Expected Result:**
- ✅ Responsive layout
- ✅ UI adapts to screen size
- ❌ Web Bluetooth not available
- ✅ Can test auth and UI features

---

## Troubleshooting Guide

### Issue: Bluetooth Device Not Found

**Symptoms:** Device doesn't appear in picker

**Solutions:**
1. Ensure device is powered on
2. Put device in pairing mode
3. Check device is not connected to another app
4. Restart device
5. Refresh browser page
6. Clear browser cache
7. Use Chrome or Edge (not Firefox/Safari)

---

### Issue: Connection Drops

**Symptoms:** Device connects then disconnects

**Solutions:**
1. Check device battery
2. Move closer to device
3. Remove interference (other Bluetooth devices)
4. Restart browser
5. Restart device
6. Check HTTPS connection (required)

---

### Issue: Chart Not Displaying

**Symptoms:** Graph section empty

**Solutions:**
1. Check browser console for errors
2. Verify Chart.js CDN loaded: `typeof Chart`
3. Ensure sensors connected and sending data
4. Refresh page
5. Try different browser
6. Check JavaScript console for initialization errors

---

### Issue: Firebase Connection Error

**Symptoms:** "Firebase not configured" or auth errors

**Solutions:**
1. Verify Firebase credentials in `js/firebase-config.js`
2. Check Firebase console for service status
3. Verify domain authorized in Firebase Auth settings
4. Check browser console for specific error
5. Clear browser cache and cookies
6. Verify Firestore security rules

---

### Issue: Data Not Persisting

**Symptoms:** SessionStorage data lost

**Solutions:**
1. Check if cookies/storage enabled
2. Verify not in incognito mode
3. Check browser storage settings
4. Review browser console for errors
5. Ensure not clearing storage manually

---

## Performance Benchmarks

### Expected Performance
```
Page Load Time:         < 2 seconds
Bluetooth Connection:   2-5 seconds
Graph Update Latency:   < 100ms
Firebase Query Time:    < 500ms
Sensor Data Latency:    ~1 second (Bluetooth limitation)
```

### Monitoring Tools
```javascript
// Measure page load time
performance.timing.loadEventEnd - performance.timing.navigationStart

// Monitor sensor update rate
console.time('sensorUpdate')
// ... wait for update ...
console.timeEnd('sensorUpdate')

// Check memory usage
performance.memory.usedJSHeapSize / 1048576  // MB
```

---

## Test Report Template

```markdown
## Test Session Report

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Browser:** Chrome 120 / Edge 120 / Firefox 121
**Device:** Desktop / Mobile

### Tests Completed
- [ ] Authentication (Member & Admin)
- [ ] Equipment Pairing
- [ ] Main Workout App
- [ ] Chart.js Workout Tracker
- [ ] Member Dashboard
- [ ] Admin Panel
- [ ] Cross-browser
- [ ] Mobile Responsive

### Issues Found
1. Issue description
   - Severity: High/Medium/Low
   - Steps to reproduce
   - Expected vs Actual result

### Performance Notes
- Page load time: X seconds
- Bluetooth connection time: X seconds
- Graph performance: Smooth / Laggy

### Recommendations
- Suggestion 1
- Suggestion 2
```

---

## Conclusion

This testing guide covers all major features of the ANTicP platform. For best results:

1. Test with **Chrome or Edge** for full Bluetooth support
2. Use **real hardware** (KICKR, Zwift Click, HR monitor) for complete testing
3. Test both **member and admin** workflows
4. Verify **Chart.js graphing** with live data
5. Test on **multiple devices** (desktop, mobile)
6. Report any issues with detailed reproduction steps

**Happy Testing!** 🚴‍♂️

---

**Created:** October 15, 2025
**Version:** 1.0
**For:** ANTicP v3.0 (Phase 1-3 Complete)
