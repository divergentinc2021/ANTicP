# Testing & Troubleshooting Guide

## Complete Testing Checklist

### 1. Firebase Configuration Test

```javascript
// Test this in browser console (F12)
// Navigate to your login page first

// Check if Firebase is loaded
console.log('Firebase loaded:', typeof firebase !== 'undefined');

// Check if Firebase is initialized
console.log('Firebase app:', firebase.apps.length > 0);

// Check services
console.log('Auth:', firebase.auth());
console.log('Firestore:', firebase.firestore());
console.log('Storage:', firebase.storage());
```

Expected output:
```
Firebase loaded: true
Firebase app: true
Auth: [Auth object]
Firestore: [Firestore object]
Storage: [Storage object]
```

### 2. Admin Login Test

1. **Navigate to login page**
   ```
   http://localhost:8080/pages/login.html
   ```

2. **Test admin login**
   ```
   Click "Admin Login"
   Enter: admin@yourgym.com
   Password: [your admin password]
   Click "Login as Admin"
   ```

3. **Expected result**
   - Should redirect to `/pages/admin.html`
   - Should see "Admin Dashboard" header
   - Should see user creation form

### 3. Create Test Member

1. **In admin dashboard**
   ```
   Fill in all required fields:
   - First Name: Test
   - Last Name: User
   - Username: testuser
   - Email: test@example.com
   - FTP: 200
   - Max Heart Rate: 170
   ```

2. **Check zone calculation**
   - Zones should auto-calculate as you type FTP and Max HR
   - Should see both Power and Heart Rate zones

3. **Click "Create User"**
   - Should see success message
   - User should appear in the users table

### 4. Test Member Login

1. **Log out from admin**
   ```
   Click "Logout" button
   ```

2. **Test quick login**
   ```
   In username field, enter: testuser
   Click "Access My Zones"
   ```

3. **Expected result**
   - Should redirect to `/pages/member.html`
   - Should see personalized zones
   - Should see profile information

### 5. Test Profile Edit (Member)

1. **In member dashboard**
   ```
   Click "Edit Profile"
   ```

2. **Try changing**
   - Username (to something unique)
   - First/Last name
   - Height/Weight

3. **Click "Save Changes"**
   - Should see success message
   - Changes should reflect immediately

### 6. Test Search (Admin)

1. **Log back in as admin**
2. **In users table search box**
   ```
   Type: test
   ```
3. **Expected**
   - Should filter to show only test user
   - Real-time filtering as you type

## Common Issues and Solutions

### Issue 1: "Firebase is not defined"

**Symptoms:**
```
Uncaught ReferenceError: firebase is not defined
```

**Solutions:**
1. Check script tags in HTML:
```html
<!-- These should be BEFORE your custom scripts -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js"></script>

<!-- Your scripts come AFTER -->
<script src="../js/firebase-config.js"></script>
<script src="../js/admin.js"></script>
```

2. Check internet connection
3. Check if Firebase CDN is blocked

### Issue 2: "Missing or insufficient permissions"

**Symptoms:**
```
FirebaseError: Missing or insufficient permissions.
```

**Solutions:**
1. Check Firestore rules are published
2. Verify user role in database:
```javascript
// In browser console
firebase.auth().currentUser.uid // Get current user ID
// Then check in Firestore if role = "admin"
```

3. Test rules in Rules Playground:
```
Go to Firestore → Rules → Rules playground
Test your specific operation
```

### Issue 3: "Username not found"

**Symptoms:**
- Member can't log in with username

**Solutions:**
1. Check username exists in Firestore:
```
Firestore → Data → usernames → [username]
```

2. Verify username is lowercase:
```javascript
// Username should be stored lowercase
username: "testuser" // ✅ Correct
username: "TestUser" // ❌ Wrong
```

3. Check username mapping has correct structure:
```javascript
{
  uid: "user-firebase-uid",
  email: "user@email.com"
}
```

### Issue 4: "Photo upload fails"

**Symptoms:**
- Photo doesn't upload
- No error message

**Solutions:**
1. Check file size (must be < 5MB)
2. Check file type (must be image/*)
3. Check Storage rules are published
4. Check browser console for errors:
```javascript
// Look for errors like:
// - Storage: Unauthorized
// - Storage: Object does not exist
```

### Issue 5: "Cannot create user - Email already in use"

**Symptoms:**
```
auth/email-already-in-use
```

**Solutions:**
1. Check Authentication → Users
2. Delete existing user with that email
3. Or use a different email

### Issue 6: "Zones not calculating"

**Symptoms:**
- Zones show as empty or undefined

**Solutions:**
1. Check FTP and Max HR are numbers:
```javascript
ftp: 200        // ✅ Correct
ftp: "200"      // ❌ Wrong (string)
```

2. Check calculation functions:
```javascript
// Test in console
console.log(calculatePowerZones(200));
console.log(calculateHeartRateZones(170));
```

### Issue 7: "Page redirects to login immediately"

**Symptoms:**
- Can't stay on admin/member page

**Solutions:**
1. Check authentication state:
```javascript
firebase.auth().onAuthStateChanged(user => {
    console.log('Current user:', user);
});
```

2. Check session storage:
```javascript
console.log('Role:', sessionStorage.getItem('userRole'));
console.log('Username:', sessionStorage.getItem('currentUsername'));
```

## Debug Mode Script

Add this to any page for debugging:

```html
<script>
// Debug helper
window.debugFirebase = function() {
    console.group('🔥 Firebase Debug Info');
    
    // Check Firebase
    console.log('Firebase initialized:', firebase.apps.length > 0);
    
    // Check Auth
    const user = firebase.auth().currentUser;
    console.log('Current user:', user ? user.email : 'Not logged in');
    console.log('User UID:', user ? user.uid : 'N/A');
    
    // Check Firestore
    firebase.firestore().collection('users').limit(1).get()
        .then(snap => console.log('Firestore connected:', !snap.empty))
        .catch(err => console.error('Firestore error:', err));
    
    // Check Storage
    const testRef = firebase.storage().ref('test.txt');
    console.log('Storage ref created:', !!testRef);
    
    // Check session
    console.log('Session role:', sessionStorage.getItem('userRole'));
    console.log('Session username:', sessionStorage.getItem('currentUsername'));
    
    console.groupEnd();
};

// Auto-run on page load
window.addEventListener('load', () => {
    console.log('Type debugFirebase() to see Firebase status');
});
</script>
```

## Testing with Different Browsers

### Chrome/Edge
- Open DevTools: F12
- Check Console for errors
- Check Network tab for failed requests

### Firefox
- Open DevTools: F12
- Check for CORS errors
- Check Storage → Session Storage

### Safari
- Enable Developer menu: Preferences → Advanced → Show Develop menu
- Open Web Inspector: Cmd+Opt+I
- Check for security errors

## Performance Testing

### Check Firestore queries efficiency:
```javascript
// Time the user load
console.time('Load users');
db.collection('users').where('role', '==', 'member').get()
    .then(snap => {
        console.timeEnd('Load users');
        console.log('Users loaded:', snap.size);
    });
```

### Monitor Firebase usage:
1. Go to Firebase Console → Usage
2. Check daily active users
3. Monitor Firestore reads/writes
4. Check Storage bandwidth

## Security Testing

### Test unauthorized access:
1. Log out completely
2. Try to access `/pages/admin.html` directly
3. Should redirect to login

### Test role escalation:
1. Log in as member
2. Try to access admin page
3. Should redirect to login

### Test data modification:
1. As member, try to change FTP in console:
```javascript
// This should fail with permission error
firebase.firestore().collection('users').doc('someUserId').update({
    ftp: 999
});
```

## Deployment Testing

### Local testing:
```bash
# Install http-server
npm install -g http-server

# Run in project directory
http-server -c-1

# Open
http://localhost:8080/pages/login.html
```

### Firebase Hosting testing:
```bash
# Deploy to Firebase
firebase deploy --only hosting

# Test production URL
https://your-project.web.app/pages/login.html
```

## Monitoring Setup

### Enable Firebase monitoring:
1. Go to Firebase Console → Performance
2. Add Performance Monitoring SDK if needed
3. Monitor page load times

### Set up error logging:
```javascript
// Add to firebase-config.js
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Could send to Firebase Analytics or Crashlytics
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
```

## Support Resources

- **Firebase Status**: https://status.firebase.google.com/
- **Firebase Documentation**: https://firebase.google.com/docs
- **Stack Overflow**: Tag with `firebase`, `firestore`
- **GitHub Issues**: Create issue in your repository
