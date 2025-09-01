// Firebase configuration
// IMPORTANT: Replace these values with your actual Firebase project configuration
// Get these from Firebase Console > Project Settings > Your apps > Web app
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Zone calculation functions
function calculatePowerZones(ftp) {
    return [
        { zone: 1, name: 'Active Recovery', min: 0, max: Math.round(ftp * 0.54), percentage: '0-54%' },
        { zone: 2, name: 'Endurance', min: Math.round(ftp * 0.55), max: Math.round(ftp * 0.74), percentage: '55-74%' },
        { zone: 3, name: 'Tempo', min: Math.round(ftp * 0.75), max: Math.round(ftp * 0.89), percentage: '75-89%' },
        { zone: 4, name: 'Threshold', min: Math.round(ftp * 0.90), max: Math.round(ftp * 1.04), percentage: '90-104%' },
        { zone: 5, name: 'VO2Max', min: Math.round(ftp * 1.05), max: Math.round(ftp * 1.19), percentage: '105-119%' },
        { zone: 6, name: 'Anaerobic', min: Math.round(ftp * 1.20), max: Math.round(ftp * 1.49), percentage: '120-149%' },
        { zone: 7, name: 'Neuromuscular', min: Math.round(ftp * 1.50), max: '+', percentage: '150%+' }
    ];
}

function calculateHeartRateZones(maxHR) {
    return [
        { zone: 1, name: 'Active Recovery', min: 0, max: Math.round(maxHR * 0.59), percentage: '0-59%' },
        { zone: 2, name: 'Endurance', min: Math.round(maxHR * 0.60), max: Math.round(maxHR * 0.69), percentage: '60-69%' },
        { zone: 3, name: 'Tempo', min: Math.round(maxHR * 0.70), max: Math.round(maxHR * 0.79), percentage: '70-79%' },
        { zone: 4, name: 'Threshold', min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.89), percentage: '80-89%' },
        { zone: 5, name: 'VO2Max', min: Math.round(maxHR * 0.90), max: '+', percentage: '90%+' }
    ];
}

// Utility functions
function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('alertBox');
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `alert ${type} show`;
        setTimeout(() => {
            alertBox.classList.remove('show');
        }, 5000);
    }
}

function formatDate(date) {
    if (!date) return '-';
    if (date.toDate) date = date.toDate();
    return date.toLocaleDateString();
}

function calculateAge(birthdate) {
    if (!birthdate) return '-';
    if (birthdate.toDate) birthdate = birthdate.toDate();
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
    }
    return age;
}

// Check authentication state
function checkAuth(requiredRole = null) {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                if (requiredRole) {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists && userDoc.data().role === requiredRole) {
                        resolve(user);
                    } else {
                        reject('Insufficient permissions');
                    }
                } else {
                    resolve(user);
                }
            } else {
                reject('Not authenticated');
            }
        });
    });
}

// Export for use in other scripts
window.firebaseServices = {
    auth,
    db,
    storage,
    calculatePowerZones,
    calculateHeartRateZones,
    showAlert,
    formatDate,
    calculateAge,
    checkAuth
};
