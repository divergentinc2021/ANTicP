# Creating Your First Admin User - Detailed Guide

## Method 1: Using Firebase Console (Recommended for First Admin)

### Step 1: Create Authentication User

1. **Navigate to Authentication**
   ```
   Firebase Console → Authentication → Users tab
   ```

2. **Add New User**
   ```
   Click "Add user" button
   ↓
   Enter details:
   - Email: admin@yourgym.com
   - Password: [Strong password with 8+ characters]
   ↓
   Click "Add user"
   ```

3. **Copy the User UID**
   ```
   After user creation:
   - Find the new user in the list
   - Click on the user row
   - Copy the "User UID" (looks like: xY3kL9mN2pQ8rS5tU7vW1)
   - Save this somewhere temporarily
   ```

### Step 2: Create Firestore Document

1. **Navigate to Firestore**
   ```
   Firebase Console → Firestore Database → Data tab
   ```

2. **Create Users Collection** (if it doesn't exist)
   ```
   Click "Start collection"
   ↓
   Collection ID: users
   ↓
   Click "Next"
   ```

3. **Create Admin Document**
   ```
   Document ID: [Paste the User UID you copied]
   ↓
   Add fields by clicking "Add field":
   ```

   | Field Name | Type | Value |
   |------------|------|-------|
   | email | string | admin@yourgym.com |
   | role | string | admin |
   | username | string | admin |
   | firstName | string | Admin |
   | lastName | string | User |
   | ftp | number | 250 |
   | maxHeartRate | number | 180 |
   | createdAt | timestamp | (click clock icon) |
   | updatedAt | timestamp | (click clock icon) |

4. **Save the Document**
   ```
   Click "Save"
   ```

### Step 3: Create Username Mapping

1. **Create Usernames Collection**
   ```
   Go back to Firestore root
   ↓
   Click "Start collection"
   ↓
   Collection ID: usernames
   ↓
   Click "Next"
   ```

2. **Create Username Document**
   ```
   Document ID: admin (or whatever username you chose)
   ↓
   Add fields:
   ```

   | Field Name | Type | Value |
   |------------|------|-------|
   | uid | string | [The User UID from Step 1] |
   | email | string | admin@yourgym.com |

3. **Save the Document**
   ```
   Click "Save"
   ```

## Method 2: Using Admin Setup Script (Automated)

Create this HTML file as `setup-admin.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Setup - Gym Zone Manager</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }
        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            margin-top: 10px;
        }
        button:hover {
            background: #5a67d8;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .message {
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            display: none;
        }
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            display: block;
        }
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            display: block;
        }
        .steps {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
        }
        .steps h3 {
            margin-bottom: 10px;
            color: #333;
        }
        .steps ol {
            margin-left: 20px;
            color: #666;
        }
        .steps li {
            margin-bottom: 5px;
        }
        code {
            background: #f4f4f4;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏋️ Admin Setup Wizard</h1>
        
        <div class="steps">
            <h3>This wizard will:</h3>
            <ol>
                <li>Create an admin user in Firebase Auth</li>
                <li>Set up the admin profile in Firestore</li>
                <li>Create username mapping for quick login</li>
                <li>Configure initial zones</li>
            </ol>
        </div>

        <form id="setupForm">
            <div class="form-group">
                <label for="adminEmail">Admin Email *</label>
                <input type="email" id="adminEmail" required placeholder="admin@yourgym.com">
            </div>

            <div class="form-group">
                <label for="adminPassword">Admin Password *</label>
                <input type="password" id="adminPassword" required placeholder="Minimum 8 characters">
            </div>

            <div class="form-group">
                <label for="adminUsername">Admin Username *</label>
                <input type="text" id="adminUsername" required placeholder="admin">
            </div>

            <div class="form-group">
                <label for="firstName">First Name *</label>
                <input type="text" id="firstName" required placeholder="John">
            </div>

            <div class="form-group">
                <label for="lastName">Last Name *</label>
                <input type="text" id="lastName" required placeholder="Doe">
            </div>

            <div class="form-group">
                <label for="gymName">Gym Name</label>
                <input type="text" id="gymName" placeholder="Awesome Gym">
            </div>

            <button type="submit" id="setupBtn">Create Admin Account</button>
        </form>

        <div id="message" class="message"></div>

        <div id="successInfo" style="display: none; margin-top: 20px;">
            <h3>✅ Setup Complete!</h3>
            <p>Your admin account has been created successfully.</p>
            <p><strong>Next steps:</strong></p>
            <ol>
                <li>Navigate to <code>/pages/login.html</code></li>
                <li>Click "Admin Login"</li>
                <li>Use your email and password to log in</li>
            </ol>
            <button onclick="window.location.href='pages/login.html'">Go to Login Page</button>
        </div>
    </div>

    <!-- Firebase SDKs -->
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
    
    <script src="js/firebase-config.js"></script>
    <script>
        const { auth, db, calculatePowerZones, calculateHeartRateZones } = window.firebaseServices;

        document.getElementById('setupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const setupBtn = document.getElementById('setupBtn');
            const messageDiv = document.getElementById('message');
            
            setupBtn.disabled = true;
            setupBtn.textContent = 'Creating admin account...';
            
            try {
                // Get form data
                const adminData = {
                    email: document.getElementById('adminEmail').value.toLowerCase(),
                    password: document.getElementById('adminPassword').value,
                    username: document.getElementById('adminUsername').value.toLowerCase(),
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    gymName: document.getElementById('gymName').value
                };
                
                // Create auth user
                setupBtn.textContent = 'Creating authentication user...';
                const userCredential = await auth.createUserWithEmailAndPassword(
                    adminData.email,
                    adminData.password
                );
                
                const uid = userCredential.user.uid;
                
                // Create Firestore document
                setupBtn.textContent = 'Setting up admin profile...';
                const defaultFTP = 250;
                const defaultMaxHR = 180;
                
                await db.collection('users').doc(uid).set({
                    email: adminData.email,
                    username: adminData.username,
                    firstName: adminData.firstName,
                    lastName: adminData.lastName,
                    role: 'admin',
                    gymName: adminData.gymName || null,
                    ftp: defaultFTP,
                    maxHeartRate: defaultMaxHR,
                    powerZones: calculatePowerZones(defaultFTP),
                    heartRateZones: calculateHeartRateZones(defaultMaxHR),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Create username mapping
                setupBtn.textContent = 'Creating username mapping...';
                await db.collection('usernames').doc(adminData.username).set({
                    uid: uid,
                    email: adminData.email
                });
                
                // Success
                messageDiv.className = 'message success';
                messageDiv.textContent = 'Admin account created successfully!';
                document.getElementById('successInfo').style.display = 'block';
                document.getElementById('setupForm').style.display = 'none';
                
                // Sign out so they can test login
                await auth.signOut();
                
            } catch (error) {
                console.error('Setup error:', error);
                messageDiv.className = 'message error';
                
                if (error.code === 'auth/email-already-in-use') {
                    messageDiv.textContent = 'This email is already registered. Please use a different email.';
                } else if (error.code === 'auth/weak-password') {
                    messageDiv.textContent = 'Password is too weak. Please use at least 8 characters.';
                } else if (error.code === 'auth/invalid-email') {
                    messageDiv.textContent = 'Invalid email format.';
                } else {
                    messageDiv.textContent = `Error: ${error.message}`;
                }
                
                setupBtn.disabled = false;
                setupBtn.textContent = 'Create Admin Account';
            }
        });
    </script>
</body>
</html>
```

### How to Use the Setup Script:
1. Save the file as `setup-admin.html` in your project root
2. Open it in your browser
3. Fill in the admin details
4. Click "Create Admin Account"
5. The script will automatically set everything up

## Method 3: Using Firebase Admin SDK (Production)

For production environments, create a Node.js script:

```javascript
// setup-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function createAdmin() {
  try {
    // Create auth user
    const userRecord = await auth.createUser({
      email: 'admin@yourgym.com',
      password: 'SecurePassword123!',
      displayName: 'Admin User',
      emailVerified: true
    });

    // Create Firestore document
    await db.collection('users').doc(userRecord.uid).set({
      email: 'admin@yourgym.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      ftp: 250,
      maxHeartRate: 180,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create username mapping
    await db.collection('usernames').doc('admin').set({
      uid: userRecord.uid,
      email: 'admin@yourgym.com'
    });

    console.log('Admin user created successfully!');
    console.log('UID:', userRecord.uid);
    console.log('Email:', userRecord.email);
    
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();
```

## Verifying Admin Setup

1. **Check Authentication**
   ```
   Firebase Console → Authentication → Users
   Should see: admin@yourgym.com
   ```

2. **Check Firestore**
   ```
   Firebase Console → Firestore → Data
   → users → [admin UID]
   Should see: role = "admin"
   ```

3. **Check Username Mapping**
   ```
   Firebase Console → Firestore → Data
   → usernames → admin
   Should see: uid and email fields
   ```

4. **Test Login**
   - Go to `/pages/login.html`
   - Click "Admin Login"
   - Enter email and password
   - Should redirect to admin dashboard

## Troubleshooting Admin Creation

### Issue: "Permission denied" when creating admin
**Solution:** Temporarily modify Firestore rules:
```javascript
// Temporary rule for setup
match /users/{userId} {
  allow write: if true; // Remove this after setup!
}
```

### Issue: "Email already in use"
**Solution:** 
1. Go to Authentication → Users
2. Delete the existing user
3. Try again

### Issue: "Cannot log in as admin"
**Check:**
1. Role field is exactly "admin" (case-sensitive)
2. Username mapping exists
3. Email/password are correct
