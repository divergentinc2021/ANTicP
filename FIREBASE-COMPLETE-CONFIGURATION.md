# Complete Firebase Project Configuration

## Project Structure Overview

```
gym-zone-manager/
├── pages/
│   ├── login.html          # Main login page
│   ├── admin.html          # Admin dashboard
│   └── member.html         # Member dashboard
├── js/
│   ├── firebase-config.js  # Firebase configuration & utilities
│   ├── login.js           # Login functionality
│   ├── admin.js           # Admin dashboard logic
│   └── member.js          # Member dashboard logic
├── setup-admin.html        # Admin setup wizard (optional)
├── index.html             # Redirect to login
├── firebase.json          # Firebase hosting config
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
└── .firebaserc           # Firebase project config

## Firebase Services Architecture

### 1. Authentication Flow
```
User Login
    ↓
Username entered → Check 'usernames' collection
    ↓
Get email & UID → Sign in with email
    ↓
Check user role → Redirect to appropriate dashboard
```

### 2. Data Structure

#### Firestore Collections:

**users** (Main user data)
```json
{
  "userId": {
    "email": "user@example.com",
    "username": "johndoe",
    "role": "member|admin",
    "firstName": "John",
    "lastName": "Doe",
    "ftp": 250,
    "maxHeartRate": 180,
    "height": 175,
    "weight": 70,
    "birthdate": "1990-01-01",
    "gender": "M",
    "country": "US",
    "photoURL": "https://storage.url/photo.jpg",
    "powerZones": [
      {"zone": 1, "name": "Active Recovery", "min": 0, "max": 135, "percentage": "0-54%"},
      {"zone": 2, "name": "Endurance", "min": 138, "max": 185, "percentage": "55-74%"},
      // ... more zones
    ],
    "heartRateZones": [
      {"zone": 1, "name": "Active Recovery", "min": 0, "max": 106, "percentage": "0-59%"},
      // ... more zones
    ],
    "restingHeartRate": 60,
    "lactateThreshold": 165,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**usernames** (Username to UID mapping)
```json
{
  "johndoe": {
    "uid": "firebase-user-uid",
    "email": "user@example.com"
  }
}
```

### 3. Storage Structure
```
/users/{userId}/profile.jpg    # User profile photos
/gym/logo.png                  # Gym branding (future)
/workouts/{workoutId}/         # Workout files (future)
```

## Environment Configuration

### Development (.env.development)
```bash
# Firebase Configuration
FIREBASE_API_KEY=your-dev-api-key
FIREBASE_AUTH_DOMAIN=your-dev-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-dev-project
FIREBASE_STORAGE_BUCKET=your-dev-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-dev-sender-id
FIREBASE_APP_ID=your-dev-app-id

# App Configuration
APP_ENV=development
APP_URL=http://localhost:8080
```

### Production (.env.production)
```bash
# Firebase Configuration
FIREBASE_API_KEY=your-prod-api-key
FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-prod-project
FIREBASE_STORAGE_BUCKET=your-prod-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-prod-sender-id
FIREBASE_APP_ID=your-prod-app-id

# App Configuration
APP_ENV=production
APP_URL=https://yourgym.web.app
```

## Firebase Configuration Files

### firebase.json (Hosting configuration)
```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "**/*.md",
      "setup-admin.html"
    ],
    "redirects": [
      {
        "source": "/",
        "destination": "/pages/login.html",
        "type": 301
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|jpg|jpeg|gif|png|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=604800"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### .firebaserc (Project configuration)
```json
{
  "projects": {
    "default": "your-project-id",
    "staging": "your-staging-project",
    "production": "your-production-project"
  }
}
```

### firestore.indexes.json (Database indexes)
```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "role",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "username",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## API Endpoints (Cloud Functions - Optional)

### functions/index.js (Future enhancement)
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Bulk user creation
exports.bulkCreateUsers = functions.https.onCall(async (data, context) => {
  // Check admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can bulk create users');
  }

  const { users } = data;
  const results = [];

  for (const user of users) {
    try {
      // Create auth user
      const userRecord = await admin.auth().createUser({
        email: user.email,
        password: user.email // Using email as password
      });

      // Create Firestore document
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        ...user,
        role: 'member',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      results.push({ success: true, email: user.email });
    } catch (error) {
      results.push({ success: false, email: user.email, error: error.message });
    }
  }

  return results;
});

// Export users to CSV
exports.exportUsers = functions.https.onCall(async (data, context) => {
  // Check admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can export users');
  }

  const snapshot = await admin.firestore().collection('users').get();
  const users = [];

  snapshot.forEach(doc => {
    users.push(doc.data());
  });

  return users;
});

// Update FTP for all users (recalculate zones)
exports.updateUserFTP = functions.https.onCall(async (data, context) => {
  // Check admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can update FTP');
  }

  const { userId, newFTP } = data;
  
  // Recalculate zones
  const powerZones = calculatePowerZones(newFTP);
  
  await admin.firestore().collection('users').doc(userId).update({
    ftp: newFTP,
    powerZones: powerZones,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});
```

## Deployment Commands

### Initial Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Select:
# - Firestore
# - Hosting
# - Storage
```

### Deploy Everything
```bash
# Deploy all services
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### Deploy to Different Environments
```bash
# Deploy to staging
firebase use staging
firebase deploy

# Deploy to production
firebase use production
firebase deploy
```

## Monitoring & Analytics

### Add Analytics (optional)
```javascript
// In firebase-config.js
firebase.analytics();

// Track events
firebase.analytics().logEvent('login', {
  method: 'username',
  role: userData.role
});

firebase.analytics().logEvent('user_created', {
  admin_id: currentUser.uid
});
```

### Performance Monitoring
```javascript
// Add to HTML pages
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-performance-compat.js"></script>

// In firebase-config.js
const perf = firebase.performance();
```

## Backup Strategy

### Automated Backups
```bash
# Export Firestore data
gcloud firestore export gs://your-backup-bucket/$(date +%Y%m%d)

# Schedule daily backups (using Cloud Scheduler)
gcloud scheduler jobs create app-engine backup-firestore \
  --schedule="0 2 * * *" \
  --time-zone="America/New_York" \
  --location="us-central1"
```

### Manual Backup Script
```javascript
// backup.js
const admin = require('firebase-admin');
const fs = require('fs');

async function backupUsers() {
  const snapshot = await admin.firestore().collection('users').get();
  const users = [];
  
  snapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });
  
  fs.writeFileSync(
    `backup-${Date.now()}.json`,
    JSON.stringify(users, null, 2)
  );
  
  console.log(`Backed up ${users.length} users`);
}

backupUsers();
```

## Cost Optimization

### Firestore Usage
- **Reads**: ~$0.06 per 100,000 documents
- **Writes**: ~$0.18 per 100,000 documents
- **Storage**: ~$0.18 per GB/month

### Optimization Tips
1. Use compound queries instead of multiple reads
2. Cache user data in sessionStorage
3. Implement pagination for large lists
4. Use Firebase Storage for images (cheaper than Firestore)
5. Set up budget alerts in Google Cloud Console

### Free Tier Limits
- **Authentication**: 10,000 users/month
- **Firestore**: 
  - 1 GiB storage
  - 50,000 reads/day
  - 20,000 writes/day
- **Storage**: 5 GB storage, 1 GB/day downloads
- **Hosting**: 10 GB storage, 360 MB/day transfer

## Security Checklist

- [ ] Firebase config not committed to public repo
- [ ] Firestore rules restrict access appropriately
- [ ] Storage rules validate file types and sizes
- [ ] Admin role properly protected
- [ ] Password reset functionality enabled
- [ ] 2FA enabled on Firebase account
- [ ] API keys restricted to specific domains
- [ ] CORS configured properly
- [ ] SSL certificate active (automatic with Firebase Hosting)
- [ ] Regular security rules review scheduled

## Next Steps & Enhancements

1. **Add Features**
   - Workout tracking
   - Progress graphs
   - Zone time tracking
   - Equipment preferences
   - Training plans

2. **Mobile Apps**
   - React Native implementation
   - Flutter implementation
   - PWA configuration

3. **Integrations**
   - Strava API
   - Garmin Connect
   - Zwift
   - TrainingPeaks

4. **Advanced Analytics**
   - Performance trends
   - Zone distribution
   - FTP progression
   - Training load
