# Firebase Security Rules Configuration

## Firestore Rules (Complete Version)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // Users collection rules
    match /users/{userId} {
      // Anyone authenticated can read user data (for displaying names, etc.)
      allow read: if isAuthenticated();
      
      // Only the user themselves can update their non-critical fields
      allow update: if isOwner(userId) && 
        // Prevent users from changing these fields
        (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'ftp', 'maxHeartRate', 'email']));
      
      // Only admins can create or delete users
      allow create: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Special rule for admins to update any user field
    match /users/{userId} {
      allow write: if isAdmin();
    }
    
    // Username mappings - used for quick login
    match /usernames/{username} {
      // Anyone can read (needed for login check)
      allow read: if true;
      
      // Only authenticated users can create/update their own username
      allow create: if isAuthenticated() && 
        request.resource.data.uid == request.auth.uid;
      
      // Only admin or owner can update
      allow update: if isAuthenticated() && 
        (isAdmin() || request.resource.data.uid == request.auth.uid);
      
      // Only admin can delete
      allow delete: if isAdmin();
    }
    
    // Admin-only collections (future use)
    match /settings/{document=**} {
      allow read, write: if isAdmin();
    }
    
    // Workout sessions (future feature)
    match /sessions/{sessionId} {
      // Users can read their own sessions
      allow read: if isAuthenticated() && 
        (isAdmin() || resource.data.userId == request.auth.uid);
      
      // Users can create their own sessions
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      
      // Users can update their own sessions
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      
      // Only admin can delete
      allow delete: if isAdmin();
    }
  }
}
```

## Storage Rules (Complete Version)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to validate image file
    function isValidImage() {
      return request.resource.contentType.matches('image/.*') && 
        request.resource.size < 5 * 1024 * 1024; // 5MB max
    }
    
    // User profile photos
    match /users/{userId}/{fileName} {
      // Anyone can read profile photos
      allow read: if true;
      
      // Users can upload their own photos, admins can upload for anyone
      allow create: if request.auth != null && 
        (request.auth.uid == userId || isAdmin()) && 
        isValidImage();
      
      // Users can update their own photos, admins can update anyone's
      allow update: if request.auth != null && 
        (request.auth.uid == userId || isAdmin()) && 
        isValidImage();
      
      // Users can delete their own photos, admins can delete anyone's
      allow delete: if request.auth != null && 
        (request.auth.uid == userId || isAdmin());
    }
    
    // Gym logos and general images (admin only)
    match /gym/{allPaths=**} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Workout videos/files (future feature)
    match /workouts/{workoutId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
  }
}
```

## How to Apply These Rules

### For Firestore:
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click on "Rules" tab
4. Delete all existing content
5. Copy and paste the Firestore rules above
6. Click "Publish"
7. Wait for confirmation message

### For Storage:
1. Go to Firebase Console
2. Navigate to Storage
3. Click on "Rules" tab
4. Delete all existing content
5. Copy and paste the Storage rules above
6. Click "Publish"
7. Wait for confirmation message

## Testing Your Rules

### Test Firestore Rules:
1. Go to Firestore Database → Rules tab
2. Click "Rules playground"
3. Test scenarios:
   ```
   Scenario 1: Non-authenticated read
   - Operation: get
   - Location: /users/{userId}
   - Authenticated: OFF
   - Result: Should DENY
   
   Scenario 2: Member reading users
   - Operation: get
   - Location: /users/{userId}
   - Authenticated: ON
   - Auth UID: [any test UID]
   - Result: Should ALLOW
   
   Scenario 3: Admin creating user
   - Operation: create
   - Location: /users/{newUserId}
   - Authenticated: ON
   - Auth UID: [your admin UID]
   - Result: Should ALLOW
   ```

### Test Storage Rules:
1. Try uploading a profile photo as a member
2. Try uploading a photo for another user as admin
3. Try uploading a file larger than 5MB (should fail)

## Security Best Practices

1. **Never allow unrestricted write access**
   ```javascript
   // ❌ BAD
   allow write: if true;
   
   // ✅ GOOD
   allow write: if isAdmin();
   ```

2. **Always validate data types**
   ```javascript
   // Check that FTP is a number
   request.resource.data.ftp is number
   ```

3. **Limit file sizes**
   ```javascript
   request.resource.size < 5 * 1024 * 1024 // 5MB
   ```

4. **Use helper functions for clarity**
   ```javascript
   function isAdmin() {
     return request.auth != null && 
       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
   }
   ```

## Common Issues and Solutions

### Issue: "Missing or insufficient permissions"
**Solution:** Check that:
- User is authenticated
- User has the correct role
- Rules are published
- Path is correct

### Issue: "Photo upload fails"
**Solution:** Verify:
- File is under 5MB
- File is an image type
- User is authenticated
- Storage rules are published

### Issue: "Cannot read username collection"
**Solution:** Ensure:
- Read rule for usernames is `allow read: if true;`
- Rules are published
- Collection name is exactly "usernames"
