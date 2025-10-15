# ANTicP Deployment Guide

## Overview

This guide covers deploying the ANTicP indoor cycling training platform to GitHub Pages.

**Repository:** https://github.com/divergentinc2021/ANTicP

---

## Pre-Deployment Checklist

### ✅ Code Organization Complete
- [x] Archive directory created with 60+ old files
- [x] Production files in root and pages/ directory
- [x] Navigation paths updated for new structure
- [x] Documentation created (PRD, CODEBASE-ANALYSIS, NAVIGATION-FLOW)

### ✅ New File Structure
```
/ANTicP/
├── index.html                     ← Login page (ENTRY POINT)
├── equipment-pairing.html         ← Sensor pairing
├── workout.html                   ← Main workout app
├── pages/
│   ├── admin.html
│   ├── member.html
│   ├── login.html (backup)
│   └── workout-session.html
├── js/                            ← JavaScript modules
├── css/                           ← Stylesheets
├── assets/                        ← Images
├── archive/                       ← Archived files
└── Documentation (.md files)
```

---

## Step 1: Configure Firebase

Before deploying, you **must** configure Firebase credentials.

### Edit: `/js/firebase-config.js`

```javascript
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### Firebase Console Setup Required:

1. **Authentication:**
   - Enable Email/Password authentication
   - Add authorized domains (your GitHub Pages URL)

2. **Cloud Firestore:**
   - Create database in production mode
   - Set up security rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null;
       }
       match /usernames/{username} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

3. **Firebase Storage:**
   - Enable storage for profile photos
   - Configure CORS if needed

---

## Step 2: Git Commit Changes

### Current Git Status:
```
- 60+ files deleted (moved to archive)
- 5 files modified (index.html, login.js, member.js, etc.)
- 7+ new files (equipment-pairing.html, workout.html, docs, archive/)
```

### Commit Commands:

```bash
cd ANTicP

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Major reorganization: Phase 1-3 complete

Phase 1: Project Organization
- Created archive/ directory structure
- Moved 60+ test/debug files to archive
- Created archive documentation

Phase 2: Workout Session Tracker
- Added Chart.js integration to pages/workout-session.html
- Implemented real Bluetooth connections
- Fixed graph to display power, HR, cadence

Phase 3: Page Flow Reorganization
- Renamed index.html -> workout.html (main app)
- Created new index.html (login entry point)
- Created equipment-pairing.html (sensor setup)
- Updated all navigation paths
- Added persistent Bluetooth connection support

Documentation:
- Created PRD.md (Product Requirements)
- Created CODEBASE-ANALYSIS.md (File inventory)
- Created NAVIGATION-FLOW.md (Page flow guide)
- Created NAVIGATION-TEST-RESULTS.md (Path verification)
- Created DEPLOYMENT-GUIDE.md (This file)

🤖 Generated with Claude Code
https://claude.com/claude-code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub
git push origin main
```

---

## Step 3: Enable GitHub Pages

### Via GitHub Web Interface:

1. Go to: https://github.com/divergentinc2021/ANTicP

2. Click **Settings** tab

3. Scroll to **Pages** section (left sidebar)

4. Configure:
   - **Source:** Deploy from a branch
   - **Branch:** main
   - **Folder:** / (root)

5. Click **Save**

6. Wait 2-5 minutes for deployment

7. Your site will be available at:
   ```
   https://divergentinc2021.github.io/ANTicP/
   ```

### Via Command Line (Alternative):

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

gh repo view divergentinc2021/ANTicP --web

# Then configure via web interface as above
```

---

## Step 4: Verify Deployment

### Check These URLs:

1. **Login Page (Entry):**
   ```
   https://divergentinc2021.github.io/ANTicP/
   ```
   - Should show login page with username input
   - "Admin Login" link should work

2. **Equipment Pairing:**
   ```
   https://divergentinc2021.github.io/ANTicP/equipment-pairing.html
   ```
   - Requires authentication (will redirect if not logged in)

3. **Main Workout App:**
   ```
   https://divergentinc2021.github.io/ANTicP/workout.html
   ```
   - Should load full training interface

4. **Member Dashboard:**
   ```
   https://divergentinc2021.github.io/ANTicP/pages/member.html
   ```
   - Shows training zones and profile

5. **Admin Panel:**
   ```
   https://divergentinc2021.github.io/ANTicP/pages/admin.html
   ```
   - Admin user management

6. **Workout Session Tracker:**
   ```
   https://divergentinc2021.github.io/ANTicP/pages/workout-session.html
   ```
   - Chart.js graphing interface

---

## Step 5: Test User Flows

### Test 1: Member Login → Workout
```
1. Visit: https://divergentinc2021.github.io/ANTicP/
2. Enter username (if account exists)
3. Should redirect to: equipment-pairing.html
4. Click "Start Workout" or "Skip for Now"
5. Should redirect to: workout.html
6. Verify app loads correctly
```

### Test 2: Admin Login
```
1. Visit: https://divergentinc2021.github.io/ANTicP/
2. Click "Admin Login →"
3. Enter admin email + password
4. Should redirect to: pages/admin.html
5. Verify user list loads
```

### Test 3: Bluetooth Connections
```
1. Login as member
2. Go to equipment-pairing.html
3. Click "Connect KICKR" (requires Chrome/Edge)
4. Bluetooth device picker should appear
5. Connect device
6. Verify "Connected" status
7. Click "Start Workout"
8. Verify connection persists (device info in SessionStorage)
```

---

## Step 6: Create Test User

### Option 1: Via Admin Panel (Recommended)

1. Login with admin credentials
2. Go to Admin Panel
3. Click "Create New User"
4. Fill in:
   - Username: testuser
   - Email: testuser@example.com
   - First Name: Test
   - Last Name: User
   - FTP: 200 watts
   - Max Heart Rate: 180 bpm
   - Weight: 75 kg
   - Height: 175 cm
5. Click "Create User"
6. Default password: `ChangeMe123!`

### Option 2: Via Firebase Console

1. Go to Firebase Console → Authentication
2. Add user manually
3. Add corresponding document in Firestore → users collection

---

## Step 7: Browser Compatibility Testing

### Required for Full Functionality:
- **Chrome 56+** (recommended)
- **Edge 79+** (recommended)
- **Opera 43+**

### Limited Functionality:
- **Firefox 111+** (Web Bluetooth behind flag)
- **Safari** (No Web Bluetooth support)

### Test Checklist:
- [ ] Login page displays correctly
- [ ] Firebase authentication works
- [ ] Navigation between pages works
- [ ] Bluetooth device picker appears (Chrome/Edge only)
- [ ] Charts render correctly (Chart.js)
- [ ] Profile photos upload
- [ ] Zone calculations display
- [ ] CSV export downloads
- [ ] Session data persists

---

## Troubleshooting

### Issue 1: Firebase Not Configured
**Symptom:** Login fails, console shows Firebase errors
**Solution:** Configure Firebase credentials in `js/firebase-config.js`

### Issue 2: Bluetooth Not Available
**Symptom:** "Connect" buttons don't work
**Solution:**
- Use Chrome or Edge browser
- Ensure HTTPS (GitHub Pages provides this)
- Check browser console for errors

### Issue 3: 404 Errors
**Symptom:** Pages not found
**Solution:**
- Verify GitHub Pages is enabled
- Check branch is `main` not `master`
- Wait 5 minutes for deployment
- Clear browser cache

### Issue 4: Redirect Loops
**Symptom:** Page keeps redirecting
**Solution:**
- Clear SessionStorage: `sessionStorage.clear()`
- Clear cookies
- Check Firebase authentication state

### Issue 5: Navigation Paths Wrong
**Symptom:** Links lead to 404
**Solution:**
- All paths are relative, should work automatically
- Check NAVIGATION-TEST-RESULTS.md for verified paths
- Verify no hardcoded absolute paths

---

## Post-Deployment Configuration

### 1. Add Custom Domain (Optional)

In GitHub repo settings → Pages:
```
Custom domain: cycling.yourdomain.com
```

Update DNS:
```
CNAME record: cycling -> divergentinc2021.github.io
```

### 2. Enable HTTPS

GitHub Pages automatically provides HTTPS. Ensure:
- [x] "Enforce HTTPS" is checked in Pages settings

### 3. Set Up Firebase Hosting (Alternative)

For better performance:
```bash
firebase init hosting
firebase deploy
```

---

## Monitoring & Analytics

### Firebase Console Monitoring:

1. **Authentication Dashboard:**
   - Track user logins
   - Monitor authentication errors

2. **Firestore Dashboard:**
   - Check database reads/writes
   - Monitor query performance

3. **Storage Dashboard:**
   - Track photo uploads
   - Monitor storage usage

### Google Analytics (Optional):

Add to `index.html` head:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## Backup & Recovery

### Create Backup Before Deployment:

```bash
# Create backup branch
git checkout -b backup-pre-deployment
git push origin backup-pre-deployment

# Return to main
git checkout main
```

### Rollback if Needed:

```bash
# Revert to previous commit
git revert HEAD

# Or reset to specific commit
git reset --hard COMMIT_HASH
git push origin main --force
```

---

## Security Considerations

### ⚠️ Known Security Issues:

1. **Member Password Issue:**
   - Members currently use email as password
   - **TODO:** Implement proper password system
   - **Priority:** High

2. **No Email Verification:**
   - Users can register without email confirmation
   - **TODO:** Add email verification
   - **Priority:** Medium

3. **Client-Side Validation:**
   - All validation is client-side
   - **TODO:** Add server-side validation
   - **Priority:** Medium

### Best Practices:

- ✅ Use HTTPS (GitHub Pages provides this)
- ✅ Firebase Authentication for user management
- ✅ Firestore security rules configured
- ⚠️ Regular security audits needed
- ⚠️ Update dependencies regularly

---

## Maintenance

### Regular Tasks:

**Weekly:**
- [ ] Check Firebase usage (Authentication, Firestore, Storage)
- [ ] Review error logs in Firebase Console
- [ ] Monitor user feedback

**Monthly:**
- [ ] Update Firebase SDK versions
- [ ] Update Chart.js version
- [ ] Review and optimize Firestore queries
- [ ] Check for browser compatibility issues

**Quarterly:**
- [ ] Security audit
- [ ] Performance optimization
- [ ] Feature requests review
- [ ] Backup database

---

## Support & Resources

### Documentation:
- **PRD.md** - Product requirements and vision
- **CODEBASE-ANALYSIS.md** - Complete file inventory and status
- **NAVIGATION-FLOW.md** - Page flow and navigation details
- **NAVIGATION-TEST-RESULTS.md** - Path verification results
- **archive/README.md** - Archived files documentation

### External Resources:
- Firebase Documentation: https://firebase.google.com/docs
- Web Bluetooth API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API
- Chart.js Documentation: https://www.chartjs.org/docs/
- GitHub Pages: https://docs.github.com/en/pages

### Repository:
- GitHub: https://github.com/divergentinc2021/ANTicP
- Issues: https://github.com/divergentinc2021/ANTicP/issues

---

## Quick Reference Commands

```bash
# Clone repository
git clone https://github.com/divergentinc2021/ANTicP.git
cd ANTicP

# Check status
git status

# Stage all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# View remote
git remote -v

# Create new branch
git checkout -b feature-name

# Switch branch
git checkout main

# Pull latest changes
git pull origin main

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

---

## Next Steps After Deployment

1. **Test thoroughly** with real users
2. **Monitor Firebase usage** and costs
3. **Gather user feedback**
4. **Plan Phase 4 features:**
   - Proper member password system
   - Workout history page
   - Strava integration completion
   - Progressive Web App features
   - Service Workers for offline support

---

## Deployment Status

**Ready to Deploy:** ✅ YES

**Completed:**
- [x] Code organization (Phase 1)
- [x] Workout session tracker (Phase 2)
- [x] Page flow reorganization (Phase 3)
- [x] Documentation created
- [x] Navigation paths verified
- [x] Deployment guide created

**Pending:**
- [ ] Firebase configuration (user must provide credentials)
- [ ] Git commit and push
- [ ] GitHub Pages activation
- [ ] User testing

---

**Created:** October 15, 2025
**Version:** 1.0
**Author:** Claude Code
