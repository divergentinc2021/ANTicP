// Admin Dashboard JavaScript
const { auth, db, storage, calculatePowerZones, calculateHeartRateZones, showAlert } = window.firebaseServices;

let currentEditUserId = null;
let allUsers = [];
let photoFile = null;
let photoURL = null;

// Check if user is admin on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAdminAuth();
        if (!user) {
            window.location.href = '../pages/login.html';
            return;
        }
        loadUsers();
        setupEventListeners();
        setupZoneCalculation();
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '../pages/login.html';
    }
});

// Check admin authentication
async function checkAdminAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().role === 'admin') {
                    resolve(user);
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('userForm').addEventListener('submit', handleFormSubmit);
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', filterUsers);
    
    // Photo upload
    document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);
}

// Setup zone calculation on input change
function setupZoneCalculation() {
    const ftpInput = document.getElementById('ftp');
    const maxHRInput = document.getElementById('maxHeartRate');
    
    ftpInput.addEventListener('input', updateZonePreview);
    maxHRInput.addEventListener('input', updateZonePreview);
}

// Update zone preview
function updateZonePreview() {
    const ftp = parseInt(document.getElementById('ftp').value);
    const maxHR = parseInt(document.getElementById('maxHeartRate').value);
    const zonePreview = document.getElementById('zonePreview');
    
    if (!ftp && !maxHR) {
        zonePreview.innerHTML = '<p style="color: #666;">Enter FTP and Max Heart Rate to see zones</p>';
        return;
    }
    
    let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">';
    
    if (ftp) {
        const powerZones = calculatePowerZones(ftp);
        html += '<div><h4 style="margin-bottom: 10px;">Power Zones</h4><table class="zone-table" style="font-size: 12px;">';
        html += '<tr><th>Zone</th><th>Watts</th><th>%FTP</th></tr>';
        powerZones.forEach(zone => {
            const max = zone.max === '+' ? '+' : `${zone.max}W`;
            html += `<tr><td>Z${zone.zone}</td><td>${zone.min}-${max}</td><td>${zone.percentage}</td></tr>`;
        });
        html += '</table></div>';
    }
    
    if (maxHR) {
        const hrZones = calculateHeartRateZones(maxHR);
        html += '<div><h4 style="margin-bottom: 10px;">Heart Rate Zones</h4><table class="zone-table" style="font-size: 12px;">';
        html += '<tr><th>Zone</th><th>BPM</th><th>%Max</th></tr>';
        hrZones.forEach(zone => {
            const max = zone.max === '+' ? '+' : `${zone.max}`;
            html += `<tr><td>Z${zone.zone}</td><td>${zone.min}-${max}</td><td>${zone.percentage}</td></tr>`;
        });
        html += '</table></div>';
    }
    
    html += '</div>';
    zonePreview.innerHTML = html;
}

// Handle photo upload
function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showAlert('Photo size must be less than 5MB', 'error');
            return;
        }
        
        photoFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('photoPreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// Upload photo to Firebase Storage
async function uploadPhoto(userId) {
    if (!photoFile) return null;
    
    try {
        const storageRef = storage.ref(`users/${userId}/profile.jpg`);
        const snapshot = await storageRef.put(photoFile);
        const downloadURL = await snapshot.ref.getDownloadURL();
        return downloadURL;
    } catch (error) {
        console.error('Photo upload error:', error);
        return null;
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    
    try {
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            username: document.getElementById('username').value.toLowerCase(),
            email: document.getElementById('email').value.toLowerCase(),
            birthdate: document.getElementById('birthdate').value ? new Date(document.getElementById('birthdate').value) : null,
            gender: document.getElementById('gender').value,
            height: parseInt(document.getElementById('height').value) || null,
            weight: parseFloat(document.getElementById('weight').value) || null,
            ftp: parseInt(document.getElementById('ftp').value),
            maxHeartRate: parseInt(document.getElementById('maxHeartRate').value),
            restingHeartRate: parseInt(document.getElementById('restingHeartRate').value) || null,
            lactateThreshold: parseInt(document.getElementById('lactateThreshold').value) || null,
            country: document.getElementById('country').value,
            role: 'member',
            powerZones: calculatePowerZones(parseInt(document.getElementById('ftp').value)),
            heartRateZones: calculateHeartRateZones(parseInt(document.getElementById('maxHeartRate').value)),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (currentEditUserId) {
            // Update existing user
            delete formData.createdAt;
            
            // Upload photo if changed
            if (photoFile) {
                const photoURL = await uploadPhoto(currentEditUserId);
                if (photoURL) formData.photoURL = photoURL;
            }
            
            await db.collection('users').doc(currentEditUserId).update(formData);
            showAlert('User updated successfully!');
            resetForm();
        } else {
            // Check if username already exists
            const usernameCheck = await db.collection('users')
                .where('username', '==', formData.username)
                .get();
            
            if (!usernameCheck.empty) {
                showAlert('Username already exists!', 'error');
                submitBtn.disabled = false;
                return;
            }
            
            // Create auth user with email as both email and password
            const userCredential = await auth.createUserWithEmailAndPassword(
                formData.email,
                formData.email // Using email as password for simplicity
            );
            
            // Upload photo if provided
            if (photoFile) {
                const photoURL = await uploadPhoto(userCredential.user.uid);
                if (photoURL) formData.photoURL = photoURL;
            }
            
            // Save user data to Firestore
            await db.collection('users').doc(userCredential.user.uid).set(formData);
            
            // Create username mapping for quick login
            await db.collection('usernames').doc(formData.username).set({
                uid: userCredential.user.uid,
                email: formData.email
            });
            
            showAlert('User created successfully!');
            resetForm();
        }
        
        loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        showAlert(error.message || 'Error saving user', 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Load all users
async function loadUsers() {
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'member')
            .orderBy('createdAt', 'desc')
            .get();
        
        allUsers = [];
        snapshot.forEach(doc => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users', 'error');
    }
}

// Display users in table
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const photoHTML = user.photoURL 
            ? `<img src="${user.photoURL}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`
            : `<div style="width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${(user.firstName || 'U')[0]}</div>`;
        
        return `
            <tr>
                <td>${photoHTML}</td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.ftp}W</td>
                <td>${user.maxHeartRate} BPM</td>
                <td>
                    <div class="user-actions">
                        <button class="btn-edit" onclick="editUser('${user.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteUser('${user.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter users based on search
function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        displayUsers(allUsers);
        return;
    }
    
    const filtered = allUsers.filter(user => 
        user.firstName?.toLowerCase().includes(searchTerm) ||
        user.lastName?.toLowerCase().includes(searchTerm) ||
        user.username?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
    );
    
    displayUsers(filtered);
}

// Edit user
window.editUser = async function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    currentEditUserId = userId;
    document.getElementById('formTitle').textContent = 'Edit User';
    document.getElementById('submitBtn').textContent = 'Update User';
    
    // Fill form with user data
    document.getElementById('firstName').value = user.firstName || '';
    document.getElementById('lastName').value = user.lastName || '';
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('birthdate').value = user.birthdate ? new Date(user.birthdate.toDate()).toISOString().split('T')[0] : '';
    document.getElementById('gender').value = user.gender || '';
    document.getElementById('height').value = user.height || '';
    document.getElementById('weight').value = user.weight || '';
    document.getElementById('ftp').value = user.ftp || '';
    document.getElementById('maxHeartRate').value = user.maxHeartRate || '';
    document.getElementById('restingHeartRate').value = user.restingHeartRate || '';
    document.getElementById('lactateThreshold').value = user.lactateThreshold || '';
    document.getElementById('country').value = user.country || '';
    
    // Show photo if exists
    if (user.photoURL) {
        document.getElementById('photoPreview').innerHTML = `<img src="${user.photoURL}" alt="Profile">`;
    }
    
    // Update zone preview
    updateZonePreview();
    
    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
};

// Delete user
window.deleteUser = async function(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const user = allUsers.find(u => u.id === userId);
        
        // Delete from Firestore
        await db.collection('users').doc(userId).delete();
        
        // Delete username mapping
        if (user.username) {
            await db.collection('usernames').doc(user.username).delete();
        }
        
        // Delete from auth (note: this requires admin SDK in production)
        // For now, we'll just remove from Firestore
        
        showAlert('User deleted successfully!');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Error deleting user', 'error');
    }
};

// Reset form
function resetForm() {
    document.getElementById('userForm').reset();
    document.getElementById('formTitle').textContent = 'Create New User';
    document.getElementById('submitBtn').textContent = 'Create User';
    document.getElementById('photoPreview').innerHTML = '<span>No Photo</span>';
    document.getElementById('zonePreview').innerHTML = '<p style="color: #666;">Enter FTP and Max Heart Rate to see zones</p>';
    currentEditUserId = null;
    photoFile = null;
}

// Logout
window.logout = function() {
    auth.signOut().then(() => {
        window.location.href = '../pages/login.html';
    });
};
