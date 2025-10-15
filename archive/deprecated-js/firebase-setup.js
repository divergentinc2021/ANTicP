// Firebase Setup and Test User Creation Script
// This script creates a test user with all calculated zones and metrics

class FirebaseSetup {
    constructor() {
        this.testUserData = {
            email: 'testuser@grannygear.com',
            password: 'GrannyGear2024!',
            profile: {
                name: 'Test User',
                gender: 'male',
                height: 172, // cm
                weight: 75, // kg
                age: 35,
                ftp: 230, // watts
                maxHeartRate: 180, // bpm
                restingHeartRate: 65, // bpm
                createdAt: new Date().toISOString(),
                role: 'admin' // admin access
            }
        };

        this.zones = {};
        this.calculateAllZones();
    }

    calculateAllZones() {
        // Power Zones (Based on FTP: 230W)
        this.zones.power = [
            { 
                zone: 1, 
                name: 'Active Recovery', 
                min: 0, 
                max: Math.round(this.testUserData.profile.ftp * 0.55), // 0-127W
                percentage: '0-55%',
                color: '#4caf50',
                description: 'Easy spinning, recovery rides'
            },
            { 
                zone: 2, 
                name: 'Endurance', 
                min: Math.round(this.testUserData.profile.ftp * 0.56), // 128W
                max: Math.round(this.testUserData.profile.ftp * 0.75), // 173W
                percentage: '56-75%',
                color: '#8bc34a',
                description: 'All-day riding pace'
            },
            { 
                zone: 3, 
                name: 'Tempo', 
                min: Math.round(this.testUserData.profile.ftp * 0.76), // 174W
                max: Math.round(this.testUserData.profile.ftp * 0.90), // 207W
                percentage: '76-90%',
                color: '#ffc107',
                description: 'Brisk pace, moderate effort'
            },
            { 
                zone: 4, 
                name: 'Threshold', 
                min: Math.round(this.testUserData.profile.ftp * 0.91), // 208W
                max: Math.round(this.testUserData.profile.ftp * 1.05), // 242W
                percentage: '91-105%',
                color: '#ff9800',
                description: 'Sustainable hard effort'
            },
            { 
                zone: 5, 
                name: 'VO2 Max', 
                min: Math.round(this.testUserData.profile.ftp * 1.06), // 243W
                max: Math.round(this.testUserData.profile.ftp * 1.20), // 276W
                percentage: '106-120%',
                color: '#ff5722',
                description: 'Very hard, 3-8 minute efforts'
            },
            { 
                zone: 6, 
                name: 'Anaerobic', 
                min: Math.round(this.testUserData.profile.ftp * 1.21), // 277W
                max: Math.round(this.testUserData.profile.ftp * 1.50), // 345W
                percentage: '121-150%',
                color: '#f44336',
                description: 'Short, explosive efforts'
            },
            { 
                zone: 7, 
                name: 'Neuromuscular', 
                min: Math.round(this.testUserData.profile.ftp * 1.51), // 346W
                max: 9999,
                percentage: '150%+',
                color: '#d32f2f',
                description: 'Maximum sprints'
            }
        ];

        // Heart Rate Zones (Based on Max HR: 180 bpm, Resting: 65 bpm)
        const hrReserve = this.testUserData.profile.maxHeartRate - this.testUserData.profile.restingHeartRate; // 115
        
        this.zones.heartRate = [
            { 
                zone: 1, 
                name: 'Recovery', 
                min: this.testUserData.profile.restingHeartRate, // 65
                max: Math.round(this.testUserData.profile.restingHeartRate + (hrReserve * 0.50)), // 122
                percentage: '50-60% HRR',
                color: '#4caf50',
                description: 'Very light activity'
            },
            { 
                zone: 2, 
                name: 'Aerobic', 
                min: Math.round(this.testUserData.profile.restingHeartRate + (hrReserve * 0.51)), // 123
                max: Math.round(this.testUserData.profile.restingHeartRate + (hrReserve * 0.70)), // 145
                percentage: '60-70% HRR',
                color: '#8bc34a',
                description: 'Light aerobic training'
            },
            { 
                zone: 3, 
                name: 'Tempo', 
                min: Math.round(this.testUserData.profile.restingHeartRate + (hrReserve * 0.71)), // 146
                max: Math.round(this.testUserData.profile.restingHeartRate + (hrReserve * 0.80)), // 157
                percentage: '70-80% HRR',
                color: '#ffc107',
                description: 'Moderate intensity'
            },
            { 
                zone: 4, 
                name: 'Threshold', 
                min: Math.round(this.testUserData.profile.restingHeartRate + (hrReserve * 0.81)), // 158
                max: Math.round(this.testUserData.profile.restingHeartRate + (hrReserve * 0.90)), // 168
                percentage: '80-90% HRR',
                color: '#ff9800',
                description: 'Hard intensity'
            },
            { 
                zone: 5, 
                name: 'VO2 Max', 
                min: Math.round(this.testUserData.profile.restingHeartRate + (hrReserve * 0.91)), // 169
                max: this.testUserData.profile.maxHeartRate, // 180
                percentage: '90-100% HRR',
                color: '#f44336',
                description: 'Maximum effort'
            }
        ];

        // Training Stress Score (TSS) targets
        this.zones.tssTargets = {
            recovery: { min: 0, max: 30, description: 'Recovery ride' },
            maintenance: { min: 31, max: 60, description: 'Maintenance/Easy' },
            productive: { min: 61, max: 90, description: 'Productive training' },
            race: { min: 91, max: 120, description: 'Race simulation' },
            epic: { min: 121, max: 999, description: 'Epic/Competition' }
        };

        // Cadence targets
        this.zones.cadenceTargets = {
            recovery: { min: 85, max: 95, description: 'Easy spinning' },
            endurance: { min: 85, max: 95, description: 'Comfortable rhythm' },
            tempo: { min: 85, max: 95, description: 'Steady rhythm' },
            threshold: { min: 85, max: 95, description: 'Race pace' },
            vo2max: { min: 90, max: 110, description: 'High cadence' },
            sprint: { min: 110, max: 130, description: 'Maximum RPM' }
        };

        console.log('Zones calculated:', this.zones);
    }

    async checkFirebaseConfig() {
        console.log('🔍 Checking Firebase Configuration...');
        
        // Check if Firebase is loaded
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK not loaded!');
            this.provideSolution();
            return false;
        }
        console.log('✅ Firebase SDK loaded');

        // Check Firebase app initialization
        try {
            const app = firebase.app();
            console.log('✅ Firebase app initialized');
            console.log('📱 App name:', app.name);
            console.log('🔧 Project ID:', app.options.projectId);
            
            // Check specific services
            this.checkAuthService();
            this.checkFirestoreService();
            this.checkStorageService();
            
            return true;
        } catch (error) {
            console.error('❌ Firebase app initialization failed:', error);
            this.provideSolution();
            return false;
        }
    }

    checkAuthService() {
        try {
            const auth = firebase.auth();
            console.log('✅ Auth service available');
            
            // Check if email/password auth is enabled
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('👤 Current user:', user.email);
                } else {
                    console.log('👤 No user logged in');
                }
            });
        } catch (error) {
            console.error('❌ Auth service error:', error);
        }
    }

    checkFirestoreService() {
        try {
            const db = firebase.firestore();
            console.log('✅ Firestore service available');
            
            // Test Firestore connection
            db.collection('_test').doc('connection').get()
                .then(() => {
                    console.log('✅ Firestore connection successful');
                })
                .catch((error) => {
                    if (error.code === 'permission-denied') {
                        console.log('⚠️ Firestore permission test (expected)');
                    } else {
                        console.error('❌ Firestore error:', error);
                    }
                });
        } catch (error) {
            console.error('❌ Firestore service error:', error);
        }
    }

    checkStorageService() {
        try {
            const storage = firebase.storage();
            console.log('✅ Storage service available');
        } catch (error) {
            console.error('❌ Storage service error:', error);
        }
    }

    provideSolution() {
        console.log('\n📋 SOLUTION STEPS:');
        console.log('1. Check if Firebase scripts are loaded in HTML');
        console.log('2. Verify firebase-config.js is loaded AFTER Firebase scripts');
        console.log('3. Check browser console for script loading errors');
        console.log('4. Ensure you\'re running on localhost or HTTPS');
        console.log('\n📝 Required script tags in HTML:');
        console.log(`
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js"></script>
<script src="js/firebase-config.js"></script>
        `);
    }

    async createTestUser() {
        console.log('\n👤 Creating test user...');
        console.log('Email:', this.testUserData.email);
        console.log('Password:', this.testUserData.password);
        
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not initialized');
            }

            const auth = firebase.auth();
            const db = firebase.firestore();

            // Try to sign in first (user might already exist)
            try {
                const existingUser = await auth.signInWithEmailAndPassword(
                    this.testUserData.email,
                    this.testUserData.password
                );
                console.log('✅ Test user already exists, signed in successfully');
                await this.updateUserProfile(existingUser.user.uid);
                return existingUser.user;
            } catch (signInError) {
                // User doesn't exist, create new one
                console.log('📝 Creating new test user...');
            }

            // Create new user
            const userCredential = await auth.createUserWithEmailAndPassword(
                this.testUserData.email,
                this.testUserData.password
            );

            console.log('✅ User created successfully');
            console.log('UID:', userCredential.user.uid);

            // Create user profile in Firestore
            await this.createUserProfile(userCredential.user.uid);

            return userCredential.user;

        } catch (error) {
            console.error('❌ Error creating test user:', error);
            
            // Provide specific error guidance
            switch (error.code) {
                case 'auth/email-already-in-use':
                    console.log('ℹ️ Email already in use - trying to sign in...');
                    return this.signInTestUser();
                case 'auth/weak-password':
                    console.error('Password is too weak');
                    break;
                case 'auth/operation-not-allowed':
                    console.error('⚠️ Email/password auth not enabled in Firebase Console!');
                    console.log('Fix: Go to Firebase Console > Authentication > Sign-in method > Enable Email/Password');
                    break;
                default:
                    console.error('Error details:', error.message);
            }
            throw error;
        }
    }

    async signInTestUser() {
        try {
            const auth = firebase.auth();
            const userCredential = await auth.signInWithEmailAndPassword(
                this.testUserData.email,
                this.testUserData.password
            );
            console.log('✅ Test user signed in successfully');
            await this.updateUserProfile(userCredential.user.uid);
            return userCredential.user;
        } catch (error) {
            console.error('❌ Sign in failed:', error);
            throw error;
        }
    }

    async createUserProfile(uid) {
        try {
            const db = firebase.firestore();
            
            const userDoc = {
                ...this.testUserData.profile,
                uid: uid,
                email: this.testUserData.email,
                zones: this.zones,
                preferences: {
                    units: 'metric',
                    autoLap: true,
                    autoPause: false,
                    soundAlerts: true
                },
                stats: {
                    totalRides: 0,
                    totalDistance: 0,
                    totalTime: 0,
                    totalCalories: 0,
                    bestFTP: this.testUserData.profile.ftp,
                    lastActivity: null
                }
            };

            await db.collection('users').doc(uid).set(userDoc);
            console.log('✅ User profile created in Firestore');
            console.log('📊 Power Zones:', this.zones.power);
            console.log('❤️ Heart Rate Zones:', this.zones.heartRate);
            
            // Store in sessionStorage for immediate use
            sessionStorage.setItem('currentUser', this.testUserData.profile.name);
            sessionStorage.setItem('userProfile', JSON.stringify(userDoc));
            sessionStorage.setItem('userZones', JSON.stringify(this.zones));
            
            return userDoc;
        } catch (error) {
            console.error('❌ Error creating user profile:', error);
            throw error;
        }
    }

    async updateUserProfile(uid) {
        try {
            const db = firebase.firestore();
            
            // Update existing profile with zones
            await db.collection('users').doc(uid).update({
                zones: this.zones,
                ftp: this.testUserData.profile.ftp,
                maxHeartRate: this.testUserData.profile.maxHeartRate,
                restingHeartRate: this.testUserData.profile.restingHeartRate,
                lastUpdated: new Date().toISOString()
            });
            
            console.log('✅ User profile updated with zones');
            
            // Update sessionStorage
            sessionStorage.setItem('currentUser', this.testUserData.profile.name);
            sessionStorage.setItem('userZones', JSON.stringify(this.zones));
            
        } catch (error) {
            console.error('⚠️ Could not update profile, creating new one...');
            return this.createUserProfile(uid);
        }
    }

    displayTestUserInfo() {
        console.log('\n📋 TEST USER CREDENTIALS:');
        console.log('========================');
        console.log('Email:', this.testUserData.email);
        console.log('Password:', this.testUserData.password);
        console.log('\n📊 USER METRICS:');
        console.log('FTP:', this.testUserData.profile.ftp, 'watts');
        console.log('Max HR:', this.testUserData.profile.maxHeartRate, 'bpm');
        console.log('Resting HR:', this.testUserData.profile.restingHeartRate, 'bpm');
        console.log('Height:', this.testUserData.profile.height, 'cm');
        console.log('Weight:', this.testUserData.profile.weight, 'kg');
        console.log('\n⚡ POWER ZONES:');
        this.zones.power.forEach(z => {
            console.log(`Zone ${z.zone} (${z.name}): ${z.min}-${z.max}W (${z.percentage})`);
        });
        console.log('\n❤️ HEART RATE ZONES:');
        this.zones.heartRate.forEach(z => {
            console.log(`Zone ${z.zone} (${z.name}): ${z.min}-${z.max} bpm (${z.percentage})`);
        });
    }

    async runFullSetup() {
        console.log('🚀 Starting Full Firebase Setup...\n');
        
        // Step 1: Check Firebase
        const isConfigured = await this.checkFirebaseConfig();
        
        if (!isConfigured) {
            console.error('\n❌ Firebase not properly configured. Please fix the issues above.');
            return false;
        }

        // Step 2: Create test user
        try {
            await this.createTestUser();
            this.displayTestUserInfo();
            
            console.log('\n✅ SETUP COMPLETE!');
            console.log('You can now use the test user to login.');
            
            return true;
        } catch (error) {
            console.error('\n❌ Setup failed:', error);
            return false;
        }
    }
}

// Create global instance
window.firebaseSetup = new FirebaseSetup();

// Auto-run setup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Firebase Setup Tool Ready');
        console.log('Run: firebaseSetup.runFullSetup() to create test user');
    });
} else {
    console.log('Firebase Setup Tool Ready');
    console.log('Run: firebaseSetup.runFullSetup() to create test user');
}

// Export for use in other scripts
window.FirebaseSetup = FirebaseSetup;
