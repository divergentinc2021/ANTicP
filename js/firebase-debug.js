// Firebase Debug Logger
class FirebaseDebugger {
    constructor() {
        this.logs = [];
        this.isEnabled = true;
        this.logToConsole = true;
        this.logToFile = false;
        this.startTime = Date.now();
    }

    log(category, message, data = null) {
        if (!this.isEnabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            elapsed: Date.now() - this.startTime,
            category,
            message,
            data
        };

        this.logs.push(logEntry);

        if (this.logToConsole) {
            const style = this.getCategoryStyle(category);
            console.log(
                `%c[${category}] ${message}`,
                style,
                data || ''
            );
        }

        // Display in debug panel if exists
        this.updateDebugPanel(logEntry);
    }

    getCategoryStyle(category) {
        const styles = {
            'AUTH': 'color: #4CAF50; font-weight: bold;',
            'FIRESTORE': 'color: #2196F3; font-weight: bold;',
            'STORAGE': 'color: #FF9800; font-weight: bold;',
            'ERROR': 'color: #f44336; font-weight: bold;',
            'SUCCESS': 'color: #8BC34A; font-weight: bold;',
            'WARNING': 'color: #FFC107; font-weight: bold;',
            'INFO': 'color: #00BCD4; font-weight: bold;',
            'NETWORK': 'color: #9C27B0; font-weight: bold;'
        };
        return styles[category] || 'color: #666;';
    }

    updateDebugPanel(logEntry) {
        const panel = document.getElementById('firebase-debug-panel');
        if (!panel) return;

        const logElement = document.createElement('div');
        logElement.className = `debug-log-entry debug-${logEntry.category.toLowerCase()}`;
        
        const time = new Date(logEntry.timestamp).toLocaleTimeString();
        logElement.innerHTML = `
            <span class="debug-time">[${time}]</span>
            <span class="debug-category">[${logEntry.category}]</span>
            <span class="debug-message">${logEntry.message}</span>
            ${logEntry.data ? `<pre class="debug-data">${JSON.stringify(logEntry.data, null, 2)}</pre>` : ''}
        `;

        panel.appendChild(logElement);
        panel.scrollTop = panel.scrollHeight;
    }

    testFirebaseConnection() {
        this.log('INFO', 'Starting Firebase connection test...');

        // Test 1: Check if Firebase is loaded
        if (typeof firebase === 'undefined') {
            this.log('ERROR', 'Firebase SDK not loaded!');
            return false;
        }
        this.log('SUCCESS', 'Firebase SDK loaded successfully');

        // Test 2: Check Firebase configuration
        try {
            const app = firebase.app();
            this.log('SUCCESS', 'Firebase app initialized', {
                name: app.name,
                options: app.options
            });
        } catch (error) {
            this.log('ERROR', 'Firebase app initialization failed', error);
            return false;
        }

        // Test 3: Check Auth service
        try {
            const auth = firebase.auth();
            this.log('SUCCESS', 'Firebase Auth service available');
            
            // Check current auth state
            auth.onAuthStateChanged((user) => {
                if (user) {
                    this.log('AUTH', 'User authenticated', {
                        uid: user.uid,
                        email: user.email,
                        emailVerified: user.emailVerified
                    });
                } else {
                    this.log('AUTH', 'No user authenticated');
                }
            });
        } catch (error) {
            this.log('ERROR', 'Firebase Auth service error', error);
        }

        // Test 4: Check Firestore service
        try {
            const db = firebase.firestore();
            this.log('SUCCESS', 'Firestore service available');
            
            // Test Firestore connection
            db.collection('_test').doc('_test').get()
                .then(() => {
                    this.log('FIRESTORE', 'Firestore connection successful');
                })
                .catch((error) => {
                    if (error.code === 'permission-denied') {
                        this.log('WARNING', 'Firestore permission denied (expected for test collection)');
                    } else {
                        this.log('ERROR', 'Firestore connection error', error);
                    }
                });
        } catch (error) {
            this.log('ERROR', 'Firestore service error', error);
        }

        // Test 5: Check Storage service
        try {
            const storage = firebase.storage();
            this.log('SUCCESS', 'Storage service available');
        } catch (error) {
            this.log('ERROR', 'Storage service error', error);
        }

        return true;
    }

    async testUserCreation(email, password) {
        this.log('AUTH', `Testing user creation with email: ${email}`);
        
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            this.log('SUCCESS', 'User created successfully', {
                uid: userCredential.user.uid,
                email: userCredential.user.email
            });
            
            // Try to create user document in Firestore
            try {
                await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    role: 'member'
                });
                this.log('FIRESTORE', 'User document created successfully');
            } catch (firestoreError) {
                this.log('ERROR', 'Failed to create user document', firestoreError);
            }
            
            return userCredential.user;
        } catch (error) {
            this.log('ERROR', 'User creation failed', {
                code: error.code,
                message: error.message
            });
            
            // Provide specific error guidance
            switch (error.code) {
                case 'auth/email-already-in-use':
                    this.log('WARNING', 'Email is already registered');
                    break;
                case 'auth/invalid-email':
                    this.log('WARNING', 'Invalid email format');
                    break;
                case 'auth/operation-not-allowed':
                    this.log('ERROR', 'Email/password auth not enabled in Firebase Console');
                    break;
                case 'auth/weak-password':
                    this.log('WARNING', 'Password is too weak');
                    break;
                default:
                    this.log('ERROR', 'Unknown error occurred');
            }
            
            throw error;
        }
    }

    async testUserLogin(email, password) {
        this.log('AUTH', `Testing user login with email: ${email}`);
        
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            this.log('SUCCESS', 'User logged in successfully', {
                uid: userCredential.user.uid,
                email: userCredential.user.email
            });
            return userCredential.user;
        } catch (error) {
            this.log('ERROR', 'Login failed', {
                code: error.code,
                message: error.message
            });
            throw error;
        }
    }

    exportLogs() {
        const logData = {
            startTime: new Date(this.startTime).toISOString(),
            endTime: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            totalLogs: this.logs.length,
            logs: this.logs
        };
        
        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `firebase-debug-${Date.now()}.json`;
        a.click();
        
        this.log('INFO', 'Debug logs exported');
    }

    clearLogs() {
        this.logs = [];
        const panel = document.getElementById('firebase-debug-panel');
        if (panel) {
            panel.innerHTML = '';
        }
        this.log('INFO', 'Debug logs cleared');
    }
}

// Create global instance
window.firebaseDebugger = new FirebaseDebugger();

// Auto-run tests when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add debug panel to page if not exists
    if (!document.getElementById('firebase-debug-panel')) {
        const panel = document.createElement('div');
        panel.id = 'firebase-debug-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 0;
            right: 0;
            width: 400px;
            height: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            padding: 10px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
        `;
        document.body.appendChild(panel);
    }

    // Add toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'firebase-debug-toggle';
    toggleBtn.textContent = '🐛 Debug';
    toggleBtn.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        padding: 10px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 10001;
    `;
    toggleBtn.onclick = () => {
        const panel = document.getElementById('firebase-debug-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    };
    document.body.appendChild(toggleBtn);

    // Run initial tests
    setTimeout(() => {
        window.firebaseDebugger.testFirebaseConnection();
    }, 1000);
});
