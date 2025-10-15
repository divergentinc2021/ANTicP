// Member Dashboard JavaScript
const { auth, db, storage, calculatePowerZones, calculateHeartRateZones, showAlert, calculateAge } = window.firebaseServices;

let currentUser = null;
let userData = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkAuth();
        setupEventListeners();
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '../pages/login.html';
    }
});

// Check authentication
async function checkAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                await loadUserData();
                resolve(user);
            } else {
                reject('Not authenticated');
            }
        });
    });
}

// Load user data
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (!userDoc.exists) {
            throw new Error('User data not found');
        }
        
        userData = userDoc.data();
        displayUserProfile();
        displayZones();
    } catch (error) {
        console.error('Error loading user data:', error);
        showAlert('Error loading profile data', 'error');
    }
}

// Display user profile
function displayUserProfile() {
    // Header info
    document.getElementById('headerUsername').textContent = userData.username || 'User';
    
    // Profile photo
    if (userData.photoURL) {
        document.getElementById('headerPhoto').innerHTML = `<img src="${userData.photoURL}" alt="Profile">`;
        document.getElementById('profilePhoto').innerHTML = `<img src="${userData.photoURL}" alt="Profile">`;
    } else {
        const initial = (userData.firstName || userData.username || 'U')[0].toUpperCase();
        document.getElementById('headerInitial').textContent = initial;
        document.getElementById('profileInitial').textContent = initial;
    }
    
    // Profile details
    document.getElementById('fullName').textContent = 
        userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}` 
            : userData.firstName || '-';
    
    document.getElementById('username').textContent = userData.username || '-';
    document.getElementById('email').textContent = userData.email || '-';
    document.getElementById('ftp').textContent = userData.ftp ? `${userData.ftp} watts` : '-';
    document.getElementById('maxHeartRate').textContent = userData.maxHeartRate ? `${userData.maxHeartRate} bpm` : '-';
    document.getElementById('height').textContent = userData.height ? `${userData.height} cm` : '-';
    document.getElementById('weight').textContent = userData.weight ? `${userData.weight} kg` : '-';
    
    // Calculate and display age
    const age = calculateAge(userData.birthdate);
    document.getElementById('age').textContent = age !== '-' ? `${age} years` : '-';
}

// Display training zones
function displayZones() {
    // Power Zones
    if (userData.ftp) {
        const powerZones = userData.powerZones || calculatePowerZones(userData.ftp);
        const powerTable = document.getElementById('powerZonesTable');
        
        powerTable.innerHTML = powerZones.map(zone => {
            const maxValue = zone.max === '+' ? '∞' : zone.max;
            return `
                <tr>
                    <td><span class="zone-badge zone-${zone.zone}">Z${zone.zone}</span></td>
                    <td>${zone.name}</td>
                    <td>${zone.min} - ${maxValue}</td>
                    <td>${zone.percentage}</td>
                </tr>
            `;
        }).join('');
    } else {
        document.getElementById('powerZonesTable').innerHTML = 
            '<tr><td colspan="4" style="text-align: center; color: #999;">FTP not set</td></tr>';
    }
    
    // Heart Rate Zones
    if (userData.maxHeartRate) {
        const hrZones = userData.heartRateZones || calculateHeartRateZones(userData.maxHeartRate);
        const hrTable = document.getElementById('heartRateZonesTable');
        
        hrTable.innerHTML = hrZones.map(zone => {
            const maxValue = zone.max === '+' ? '∞' : zone.max;
            return `
                <tr>
                    <td><span class="zone-badge zone-${zone.zone}">Z${zone.zone}</span></td>
                    <td>${zone.name}</td>
                    <td>${zone.min} - ${maxValue}</td>
                    <td>${zone.percentage}</td>
                </tr>
            `;
        }).join('');
    } else {
        document.getElementById('heartRateZonesTable').innerHTML = 
            '<tr><td colspan="4" style="text-align: center; color: #999;">Max HR not set</td></tr>';
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('editForm').addEventListener('submit', handleEditProfile);
}

// Open edit modal
window.openEditModal = function() {
    document.getElementById('editModal').classList.add('show');
    
    // Pre-fill form with current data
    document.getElementById('editUsername').value = userData.username || '';
    document.getElementById('editFirstName').value = userData.firstName || '';
    document.getElementById('editLastName').value = userData.lastName || '';
    document.getElementById('editHeight').value = userData.height || '';
    document.getElementById('editWeight').value = userData.weight || '';
};

// Close edit modal
window.closeEditModal = function() {
    document.getElementById('editModal').classList.remove('show');
};

// Handle profile edit
async function handleEditProfile(e) {
    e.preventDefault();
    
    try {
        const newUsername = document.getElementById('editUsername').value.toLowerCase().trim();
        
        // Check if username changed and is available
        if (newUsername !== userData.username) {
            const usernameCheck = await db.collection('usernames').doc(newUsername).get();
            
            if (usernameCheck.exists) {
                showAlert('Username already taken', 'error');
                return;
            }
        }
        
        // Prepare update data
        const updateData = {
            firstName: document.getElementById('editFirstName').value.trim(),
            lastName: document.getElementById('editLastName').value.trim(),
            height: parseInt(document.getElementById('editHeight').value) || null,
            weight: parseFloat(document.getElementById('editWeight').value) || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Update username if changed
        if (newUsername !== userData.username) {
            updateData.username = newUsername;
            
            // Update username mapping
            if (userData.username) {
                await db.collection('usernames').doc(userData.username).delete();
            }
            await db.collection('usernames').doc(newUsername).set({
                uid: currentUser.uid,
                email: userData.email
            });
        }
        
        // Update user document
        await db.collection('users').doc(currentUser.uid).update(updateData);
        
        showAlert('Profile updated successfully!');
        closeEditModal();
        
        // Reload user data
        await loadUserData();
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Error updating profile', 'error');
    }
}

// Logout
window.logout = function() {
    auth.signOut().then(() => {
        sessionStorage.clear();
        window.location.href = '../pages/login.html';
    });
};

// Start Workout - Navigate to equipment pairing page
window.startWorkout = function() {
    window.location.href = '../equipment-pairing.html';
};

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEditModal();
    }
});

// Close modal on outside click
document.getElementById('editModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'editModal') {
        closeEditModal();
    }
});
