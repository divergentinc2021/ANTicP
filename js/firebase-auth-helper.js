// Firebase Authentication Helper
// This script ensures proper authentication before any Firestore operations

class FirebaseAuthHelper {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.authStateListeners = [];
    }

    // Initialize Firebase with authentication
    async initialize() {
        if (this.isInitialized) return true;

        try {
            // Check if Firebase is already initialized
            if (!firebase.apps.length) {
                const firebaseConfig = {
                    apiKey: "AIzaSyBfxSIng1612n0vHHwJq1_eAr8gCtyjMs4",
                    authDomain: "grannygearindoortraining.firebaseapp.com",
                    databaseURL: "https://grannygearindoortraining-default-rtdb.europe-west1.firebasedatabase.app",
                    projectId: "grannygearindoortraining",
                    storageBucket: "grannygearindoortraining.firebasestorage.app",
                    messagingSenderId: "991408564365",
                    appId: "1:991408564365:web:8adc32967da8aa8d419ac4",
                    measurementId: "G-MJE6NXW1MZ"
                };
                
                firebase.initializeApp(firebaseConfig);
                console.log('✅ Firebase initialized');
            }

            // Set up auth state listener
            firebase.auth().onAuthStateChanged((user) => {
                this.currentUser = user;
                console.log('Auth state changed:', user ? user.email : 'No user');
                
                // Notify all listeners
                this.authStateListeners.forEach(callback => callback(user));
            });

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            return false;
        }
    }

    // Ensure user is authenticated before operations
    async ensureAuthenticated() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe();
                
                if (user) {
                    console.log('✅ User authenticated:', user.email);
                    resolve(user);
                } else {
                    console.log('⚠️ No user authenticated, trying anonymous...');
                    this.signInAnonymously()
                        .then(resolve)
                        .catch(reject);
                }
            });
        });
    }

    // Sign in anonymously for testing
    async signInAnonymously() {
        try {
            const result = await firebase.auth().signInAnonymously();
            console.log('✅ Signed in anonymously');
            return result.user;
        } catch (error) {
            console.error('❌ Anonymous sign in failed:', error);
            throw error;
        }
    }

    // Sign in with email and password
    async signInWithEmail(email, password) {
        try {
            const result = await firebase.auth().signInWithEmailAndPassword(email, password);
            console.log('✅ Signed in:', email);
            return result.user;
        } catch (error) {
            console.error('❌ Email sign in failed:', error);
            
            // If user doesn't exist, try to create
            if (error.code === 'auth/user-not-found') {
                return this.createUser(email, password);
            }
            throw error;
        }
    }

    // Create new user
    async createUser(email, password) {
        try {
            const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
            console.log('✅ User created:', email);
            return result.user;
        } catch (error) {
            console.error('❌ User creation failed:', error);
            throw error;
        }
    }

    // Sign in test user
    async signInTestUser() {
        return this.signInWithEmail('testuser@grannygear.com', 'GrannyGear2024!');
    }

    // Safe Firestore write
    async safeWrite(collection, doc, data) {
        try {
            // Ensure authenticated first
            await this.ensureAuthenticated();
            
            const db = firebase.firestore();
            await db.collection(collection).doc(doc).set(data, { merge: true });
            
            console.log('✅ Firestore write successful');
            return true;
        } catch (error) {
            console.error('❌ Firestore write failed:', error);
            
            if (error.code === 'permission-denied') {
                console.log('⚠️ Permission denied. Trying with authentication...');
                
                // Try to authenticate and retry
                await this.signInTestUser();
                
                try {
                    const db = firebase.firestore();
                    await db.collection(collection).doc(doc).set(data, { merge: true });
                    console.log('✅ Firestore write successful after auth');
                    return true;
                } catch (retryError) {
                    console.error('❌ Still failed after auth:', retryError);
                    throw retryError;
                }
            }
            throw error;
        }
    }

    // Safe Firestore read
    async safeRead(collection, doc) {
        try {
            // Ensure authenticated first
            await this.ensureAuthenticated();
            
            const db = firebase.firestore();
            const snapshot = await db.collection(collection).doc(doc).get();
            
            if (snapshot.exists) {
                console.log('✅ Firestore read successful');
                return snapshot.data();
            } else {
                console.log('ℹ️ Document does not exist');
                return null;
            }
        } catch (error) {
            console.error('❌ Firestore read failed:', error);
            
            if (error.code === 'permission-denied') {
                console.log('⚠️ Permission denied. Check Firestore rules.');
            }
            throw error;
        }
    }

    // Add auth state listener
    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        
        // If already authenticated, call immediately
        if (this.currentUser) {
            callback(this.currentUser);
        }
    }

    // Sign out
    async signOut() {
        try {
            await firebase.auth().signOut();
            console.log('✅ Signed out');
            return true;
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            return false;
        }
    }

    // Get current user
    getCurrentUser() {
        return firebase.auth().currentUser;
    }

    // Check if authenticated
    isAuthenticated() {
        return !!firebase.auth().currentUser;
    }
}

// Create global instance
window.firebaseAuthHelper = new FirebaseAuthHelper();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.firebaseAuthHelper.initialize();
    });
} else {
    window.firebaseAuthHelper.initialize();
}

// Export for use
window.FirebaseAuthHelper = FirebaseAuthHelper;