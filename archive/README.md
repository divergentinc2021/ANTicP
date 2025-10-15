# Archive Directory

This directory contains files that were moved out of the main project structure during the codebase organization phase. These files are preserved for reference but are not part of the active application.

## Directory Structure

### `/debug/` (9 files)
Test and debugging pages used during development.

**Files:**
- `admin-debug.html` - Admin functionality testing
- `debug-integrated-platform.html` - Platform integration debugging
- `device-capture-test.html` - Device connection testing
- `firebase-test.html` - Firebase connection testing
- `firebase-fix.html` - Firebase issue troubleshooting
- `permissions-test.html` - Permissions API testing
- `simple-zwift-test.html` - Basic Zwift Click testing
- `speed-cadence-data-parsing-test.html` - Data parsing validation
- `test-fit-converter.html` - FIT file conversion testing

**Status:** Development/testing files not needed in production

---

### `/zwift-click-debug/` (9 files)
Specialized debugging tools for Zwift Click controller integration.

**Files:**
- `zwift-click-debug.html`
- `zwift-click-debug-2.html`
- `zwift-click-debug-simple.html`
- `zwift-click-minimal.html`
- `zwift-click-enhanced.html`
- `zwift-click-filters.html`
- `zwift-click-filters-enhanced.html`
- `zwift-click-test.html`
- `zwift-click-test-page.html`

**Status:** Iterative debugging versions superseded by working implementation in `index.html`

---

### `/simulators/` (3 files)
Device simulator pages for testing without physical hardware.

**Files:**
- `cycling-power-simulator.html` - Virtual power meter
- `heart-rate-simulator.html` - Virtual HR monitor
- `trainer-simulator.html` - Virtual FTMS smart trainer

**Status:** Development tools for testing without Bluetooth devices

---

### `/versions/` (10 files)
Historical versions of the main application page.

**Files:**
- `index-backup.html`
- `index-fixed.html`
- `index-integrated.html`
- `index-no-zwift.html`
- `index-original.html`
- `index-simple.html`
- `index-with-strava.html`
- `index-working.html`
- `index-working-backup.html`
- `index-zones-only.html`

**Status:** Old versions kept for reference. Current production version is `/index.html`

---

### `/integrated-platforms/` (6 files)
Alternative implementations exploring different UI approaches.

**Files:**
- `integrated-platform.html` - Unified platform attempt
- `integrated-platform-fixed.html` - Bug fix version
- `integrated-platform-simple.html` - Simplified version
- `integrated-platform-tabs.html` - Tab-based UI
- `integrated-platform-clean.html` - Cleaned-up version
- `integrated-platform-zones.html` - Zone-focused version

**Status:** Experimental alternatives to main implementation

---

### `/experimental/` (8 files)
Incomplete features and experimental pages that need future development.

**Files:**
- `workout-session.html` - ⚠️ To be restored and fixed in Phase 2
- `workout-session-fixed.html` - Attempted fix version
- `workout-session-simple.html` - Simplified attempt
- `training-app.html` - Alternative training app (missing JS dependencies)
- `gym-index.html` - Gym-specific variant
- `pedal.html` - Pedal-specific page
- `sensor-settings.html` - Sensor configuration page
- `setup-admin.html` - Admin setup wizard

**Status:** Incomplete implementations requiring additional work

**Note:** `workout-session.html` will be restored in Phase 2 for Chart.js integration

---

### `/deprecated-js/` (15 files)
Superseded JavaScript modules no longer used in production.

**Files:**
- `admin.js` - Replaced by `admin-fixed.js`
- `critical-fixes.js` - Fixes merged into main code
- `device-control.js` - Functionality integrated elsewhere
- `firebase-debug.js` - Debugging code
- `firebase-setup.js` - Setup utilities
- `enhanced-kickr-handler.js` - Enhanced version not needed
- `enhanced-settings-modal.js` - Settings enhancements
- `enhanced-zwift-filters.js` - Filter improvements
- `integrated-cycling-app.js` - Integrated app attempt
- `simple-zwift-click.js` - Simplified Zwift code
- `app-updated.js` (core/) - Updated version superseded
- `device-capture.js` (core/) - Capture utilities
- `bluetooth-enhanced.js` (connections/) - Enhanced BT handling
- `bluetooth-improved.js` (connections/) - Improved BT code
- `bluetooth-filters-fix.js` (connections/) - Filter fixes

**Status:** Superseded by current working implementations

---

## Active Production Files

The following files remain in the main project as they are fully functional:

### HTML Pages:
- `/index.html` - Main training application (1641 lines, fully functional)
- `/pages/login.html` - User authentication
- `/pages/member.html` - Member dashboard
- `/pages/admin.html` - Admin panel

### JavaScript Modules:
- `/js/firebase-config.js` - Firebase configuration and zone calculations
- `/js/login.js` - Authentication logic
- `/js/member.js` - Member dashboard logic
- `/js/admin-fixed.js` - Admin panel logic

---

## Archive Date

**Created:** October 15, 2025
**Phase:** Phase 1 - Project Organization

## Notes

- All archived files are preserved for historical reference
- Files can be restored if needed for future development
- Active development should focus on production files only
- See `CODEBASE-ANALYSIS.md` and `PRD.md` in root directory for full project documentation
