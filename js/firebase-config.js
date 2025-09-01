// Firebase Configuration and Manager
// Professional Firebase integration for cycling training app

class FirebaseManager {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Firebase configuration (replace with your config)
            const firebaseConfig = {
                apiKey: "your-api-key",
                authDomain: "cycletracker-pro.firebaseapp.com",
                projectId: "cycletracker-pro",
                storageBucket: "cycletracker-pro.appspot.com",
                messagingSenderId: "123456789",
                appId: "your-app-id"
            };

            // Initialize Firebase
            this.app = firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();

            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                console.log('Auth state changed:', user ? user.email : 'Not signed in');
            });

            this.initialized = true;
            console.log('🔥 Firebase initialized successfully');

        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            // Initialize with mock data for demo
            this.initializeMockMode();
        }
    }

    initializeMockMode() {
        console.log('🔧 Initializing mock mode for demo');
        this.initialized = true;
        this.currentUser = { uid: 'demo-user', email: 'demo@example.com' };
    }

    // Authentication
    async signIn() {
        try {
            if (!firebase.auth) {
                // Mock sign in for demo
                this.currentUser = { uid: 'demo-user', email: 'demo@example.com' };
                return this.currentUser;
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            const result = await this.auth.signInWithPopup(provider);
            this.currentUser = result.user;
            
            // Create or update user profile
            await this.createUserProfile(result.user);
            
            console.log('✅ Signed in successfully:', result.user.email);
            return result.user;
            
        } catch (error) {
            console.error('❌ Sign in failed:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            if (this.auth) {
                await this.auth.signOut();
            }
            this.currentUser = null;
            console.log('👋 Signed out successfully');
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            throw error;
        }
    }

    isSignedIn() {
        return !!this.currentUser;
    }

    getCurrentUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    // User Profile Management
    async createUserProfile(user) {
        try {
            if (!this.db) {
                console.log('Demo mode - would create user profile');
                return;
            }

            const userRef = this.db.collection('users').doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                const profileData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    
                    // Athlete data
                    age: null,
                    weight: null,
                    height: null,
                    gender: null,
                    ftp: null,
                    maxHeartRate: null,
                    restingHeartRate: null,
                    
                    // Preferences
                    units: 'metric',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    
                    // Integrations
                    strava: {
                        connected: false,
                        athleteId: null,
                        accessToken: null,
                        refreshToken: null,
                        expiresAt: null
                    },
                    
                    // Stats
                    totalSessions: 0,
                    totalDistance: 0,
                    totalTime: 0,
                    totalEnergy: 0
                };
                
                await userRef.set(profileData);
                console.log('✅ User profile created');
            }
            
        } catch (error) {
            console.error('❌ Failed to create user profile:', error);
        }
    }

    async getUserProfile(userId = null) {
        try {
            const uid = userId || this.getCurrentUserId();
            if (!uid) throw new Error('No user ID provided');

            if (!this.db) {
                // Return mock profile for demo
                return {
                    age: 30,
                    weight: 75,
                    maxHeartRate: 185,
                    ftp: 250,
                    units: 'metric'
                };
            }

            const userDoc = await this.db.collection('users').doc(uid).get();
            return userDoc.exists ? userDoc.data() : null;
            
        } catch (error) {
            console.error('❌ Failed to get user profile:', error);
            return null;
        }
    }

    async saveUserProfile(profileData, userId = null) {
        try {
            const uid = userId || this.getCurrentUserId();
            if (!uid) throw new Error('No user ID provided');

            if (!this.db) {
                console.log('Demo mode - would save profile:', profileData);
                return;
            }

            const updateData = {
                ...profileData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('users').doc(uid).update(updateData);
            console.log('✅ User profile saved');
            
        } catch (error) {
            console.error('❌ Failed to save user profile:', error);
            throw error;
        }
    }

    // Session Management
    async saveSession(sessionData, userId = null) {
        try {
            const uid = userId || this.getCurrentUserId();
            if (!uid) throw new Error('No user ID provided');

            if (!this.db) {
                console.log('Demo mode - would save session:', sessionData.id);
                return sessionData.id;
            }

            const sessionDoc = {
                ...sessionData,
                userId: uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                year: new Date(sessionData.startTime).getFullYear(),
                month: new Date(sessionData.startTime).getMonth() + 1,
                day: new Date(sessionData.startTime).getDate()
            };

            const sessionRef = await this.db.collection('sessions').add(sessionDoc);
            await this.updateUserStats(uid, sessionData);
            
            console.log('✅ Session saved:', sessionRef.id);
            return sessionRef.id;
            
        } catch (error) {
            console.error('❌ Failed to save session:', error);
            throw error;
        }
    }

    async getSessionHistory(userId = null, limit = 50) {
        try {
            if (!this.db) {
                // Return mock sessions for demo
                return [
                    {
                        id: 'session1',
                        type: 'Interval Training',
                        duration: 45,
                        distance: 18.5,
                        avgPower: 280,
                        avgHR: 162,
                        startTime: new Date(Date.now() - 86400000).toISOString() // Yesterday
                    },
                    {
                        id: 'session2', 
                        type: 'Endurance Ride',
                        duration: 90,
                        distance: 42.1,
                        avgPower: 220,
                        avgHR: 148,
                        startTime: new Date(Date.now() - 172800000).toISOString() // 2 days ago
                    }
                ];
            }

            const uid = userId || this.getCurrentUserId();
            if (!uid) return [];

            const sessionsQuery = this.db.collection('sessions')
                .where('userId', '==', uid)
                .orderBy('startTime', 'desc')
                .limit(limit);

            const snapshot = await sessionsQuery.get();
            const sessions = [];
            snapshot.forEach(doc => {
                sessions.push({ id: doc.id, ...doc.data() });
            });
            
            return sessions;
            
        } catch (error) {
            console.error('❌ Failed to get session history:', error);
            return [];
        }
    }

    async getRecentSessions(days = 7, userId = null) {
        try {
            if (!this.db) {
                return []; // Mock return for demo
            }

            const uid = userId || this.getCurrentUserId();
            if (!uid) return [];

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            const sessionsQuery = this.db.collection('sessions')
                .where('userId', '==', uid)
                .where('startTime', '>=', cutoffDate.toISOString())
                .orderBy('startTime', 'desc');

            const snapshot = await sessionsQuery.get();
            const sessions = [];
            snapshot.forEach(doc => {
                sessions.push({ id: doc.id, ...doc.data() });
            });
            
            return sessions;
            
        } catch (error) {
            console.error('❌ Failed to get recent sessions:', error);
            return [];
        }
    }

    async getAllSessions(userId = null) {
        return this.getSessionHistory(userId, 1000);
    }

    async getSession(sessionId) {
        try {
            if (!this.db) {
                return { id: sessionId, type: 'Demo Session' };
            }

            const sessionDoc = await this.db.collection('sessions').doc(sessionId).get();
            return sessionDoc.exists ? { id: sessionDoc.id, ...sessionDoc.data() } : null;
            
        } catch (error) {
            console.error('❌ Failed to get session:', error);
            return null;
        }
    }

    async updateUserStats(userId, sessionData) {
        if (!this.db) return;

        try {
            const userRef = this.db.collection('users').doc(userId);
            await userRef.update({
                totalSessions: firebase.firestore.FieldValue.increment(1),
                totalDistance: firebase.firestore.FieldValue.increment(sessionData.metrics.distance || 0),
                totalTime: firebase.firestore.FieldValue.increment(sessionData.metrics.duration || 0),
                totalEnergy: firebase.firestore.FieldValue.increment(sessionData.metrics.totalEnergy || 0),
                lastActivityAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
        } catch (error) {
            console.error('❌ Failed to update user stats:', error);
        }
    }

    // Strava Integration
    async saveStravaTokens(tokens, userId = null) {
        try {
            if (!this.db) {
                console.log('Demo mode - would save Strava tokens');
                return;
            }

            const uid = userId || this.getCurrentUserId();
            if (!uid) throw new Error('No user ID provided');

            const updateData = {
                'strava.connected': true,
                'strava.athleteId': tokens.athleteId,
                'strava.accessToken': tokens.accessToken,
                'strava.refreshToken': tokens.refreshToken,
                'strava.expiresAt': tokens.expiresAt,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('users').doc(uid).update(updateData);
            console.log('✅ Strava tokens saved');
            
        } catch (error) {
            console.error('❌ Failed to save Strava tokens:', error);
            throw error;
        }
    }

    async getStravaTokens(userId = null) {
        try {
            const profile = await this.getUserProfile(userId);
            return profile?.strava || { connected: false };
            
        } catch (error) {
            console.error('❌ Failed to get Strava tokens:', error);
            return { connected: false };
        }
    }

    async removeStravaTokens(userId = null) {
        try {
            if (!this.db) {
                console.log('Demo mode - would remove Strava tokens');
                return;
            }

            const uid = userId || this.getCurrentUserId();
            if (!uid) throw new Error('No user ID provided');

            const updateData = {
                'strava.connected': false,
                'strava.athleteId': null,
                'strava.accessToken': null,
                'strava.refreshToken': null,
                'strava.expiresAt': null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('users').doc(uid).update(updateData);
            console.log('✅ Strava tokens removed');
            
        } catch (error) {
            console.error('❌ Failed to remove Strava tokens:', error);
            throw error;
        }
    }

    async updateSessionWithStravaId(sessionId, stravaId) {
        try {
            if (!this.db) {
                console.log('Demo mode - would update session with Strava ID');
                return;
            }

            await this.db.collection('sessions').doc(sessionId).update({
                stravaId: stravaId,
                stravaUploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Session updated with Strava ID:', stravaId);
            
        } catch (error) {
            console.error('❌ Failed to update session with Strava ID:', error);
            throw error;
        }
    }
}