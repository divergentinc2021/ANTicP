# Firebase Setup Instructions for Gym Zone Manager

## Prerequisites
- A Google account
- Basic knowledge of web development
- Visual Studio Code installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "gym-zone-manager")
4. Follow the setup wizard (you can disable Google Analytics if not needed)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project dashboard, click on "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication by clicking on it and toggling the "Enable" switch
5. Click "Save"

## Step 3: Set up Firestore Database

1. Click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in production mode" for now (we'll add rules later)
4. Select your preferred location (choose closest to your gym)
5. Click "Enable"

## Step 4: Set up Firebase Storage (for profile photos)

1. Click on "Storage" in the left sidebar
2. Click "Get started"
3. Accept the default security rules for now
4. Choose the same location as your Firestore
5. Click "Done"

## Step 5: Get Your Firebase Configuration

1. Click on the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click on the "</>" (Web) icon
5. Register your app with a nickname (e.g., "gym-zone-web")
6. Copy the Firebase configuration object

## Step 6: Update the Configuration in Your Code

1. Open `js/firebase-config.js` in Visual Studio Code
2. Replace the placeholder configuration with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

## Step 7: Set up Security Rules

### Firestore Rules
1. Go to Firestore Database → Rules
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admins to read/write everything
    match /{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users can read their own data
    match /users/{userId} {
      allow read, update: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone authenticated can read usernames (for login)
    match /usernames/{username} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

### Storage Rules
1. Go to Storage → Rules
2. Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can upload their own profile photos
    match /users/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

3. Click "Publish"

## Step 8: Create Your First Admin User

1. Go to Authentication → Users tab
2. Click "Add user"
3. Enter an admin email and a strong password
4. Click "Add user"
5. Copy the User UID
6. Go to Firestore Database
7. Click "Start collection"
8. Collection ID: `users`
9. Document ID: paste the User UID you copied
10. Add these fields:
    - `email` (string): admin email
    - `role` (string): `admin`
    - `firstName` (string): Admin first name
    - `lastName` (string): Admin last name
    - `username` (string): admin username
    - `createdAt` (timestamp): Current time
11. Click "Save"

## Step 9: Deploy Your Application

### Option A: Using Firebase Hosting (Recommended)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. In your project directory, run: `firebase init`
3. Select "Hosting"
4. Choose your Firebase project
5. Set public directory to current directory (`.`)
6. Configure as single-page app: No
7. Don't overwrite existing files
8. Run: `firebase deploy`
9. Your app will be available at: `https://your-project.web.app`

### Option B: Using GitHub Pages
1. Push your code to a GitHub repository
2. Go to Settings → Pages
3. Select source: Deploy from branch
4. Select branch: main (or master)
5. Select folder: / (root)
6. Click Save
7. Your app will be available at: `https://yourusername.github.io/repository-name`

### Option C: Local Development
1. Install a local server: `npm install -g http-server`
2. Run in your project directory: `http-server -c-1`
3. Open: `http://localhost:8080/pages/login.html`

## Step 10: Test Your Application

1. Navigate to your login page (`/pages/login.html`)
2. Click "Admin Login"
3. Log in with your admin credentials
4. Create a test member user
5. Log out
6. Test member login with username only

## File Structure Required

```
your-project/
├── pages/
│   ├── login.html
│   ├── admin.html
│   └── member.html
├── js/
│   ├── firebase-config.js
│   ├── login.js
│   ├── admin.js
│   └── member.js
└── index.html (optional redirect)
```

## Optional: Create Index Redirect

Create an `index.html` in your root directory:

```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=pages/login.html">
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to login page...</p>
</body>
</html>
```

## Troubleshooting

### Common Issues:

1. **"Permission denied" errors**
   - Check your Firestore rules
   - Ensure user is properly authenticated
   - Verify user role in database

2. **Photos not uploading**
   - Check Storage rules
   - Verify file size (max 5MB)
   - Check browser console for errors

3. **Login not working**
   - Ensure Authentication is enabled
   - Check if username exists in 'usernames' collection
   - Verify email/password combination

4. **Admin can't access dashboard**
   - Verify 'role' field is set to 'admin' in Firestore
   - Check authentication state

## Security Best Practices

1. **Never commit your Firebase config to public repos** - Use environment variables in production
2. **Regularly review your security rules**
3. **Enable 2FA on your Firebase account**
4. **Monitor usage in Firebase Console**
5. **Set up budget alerts to avoid unexpected charges**

## Next Steps

1. Customize the zone calculations based on your gym's methodology
2. Add more fields as needed (equipment preferences, training goals, etc.)
3. Implement workout tracking features
4. Add data export functionality
5. Create mobile apps using React Native or Flutter

## Support

For Firebase issues: https://firebase.google.com/support
For implementation questions: Create an issue in your GitHub repository
