// Login JavaScript
const { auth, db, showAlert } = window.firebaseServices;

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            checkUserRoleAndRedirect(user);
        }
    });
    
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Member login form
    document.getElementById('loginForm').addEventListener('submit', handleMemberLogin);
    
    // Admin login form
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
}

// Handle member login (username only)
async function handleMemberLogin(e) {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const username = document.getElementById('username').value.toLowerCase().trim();
    
    if (!username) {
        showAlert('Please enter your username', 'error');
        return;
    }
    
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    
    try {
        // Look up username in the usernames collection
        const usernameDoc = await db.collection('usernames').doc(username).get();
        
        if (!usernameDoc.exists) {
            showAlert('Username not found. Please check your username or contact admin.', 'error');
            return;
        }
        
        const { email, uid } = usernameDoc.data();
        
        // Get user data to check if active
        const userDoc = await db.collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
            showAlert('User account not found. Please contact admin.', 'error');
            return;
        }
        
        const userData = userDoc.data();
        
        // Sign in with email (using email as password for members)
        await auth.signInWithEmailAndPassword(email, email);
        
        // Store username in session for quick reference
        sessionStorage.setItem('currentUsername', username);
        sessionStorage.setItem('userRole', userData.role);
        
        // Redirect based on role
        if (userData.role === 'admin') {
            window.location.href = 'pages/admin.html';
        } else {
            window.location.href = 'equipment-pairing.html';
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            showAlert('Invalid username. Please try again.', 'error');
        } else if (error.code === 'auth/too-many-requests') {
            showAlert('Too many failed attempts. Please try again later.', 'error');
        } else {
            showAlert('Login failed. Please try again or contact admin.', 'error');
        }
    } finally {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value.toLowerCase().trim();
    const password = document.getElementById('adminPassword').value;
    
    if (!email || !password) {
        showAlert('Please enter email and password', 'error');
        return;
    }
    
    try {
        // Sign in with email and password
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Check if user is admin
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
        
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
            await auth.signOut();
            showAlert('You do not have admin privileges', 'error');
            return;
        }
        
        sessionStorage.setItem('userRole', 'admin');
        window.location.href = 'pages/admin.html';
        
    } catch (error) {
        console.error('Admin login error:', error);
        
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            showAlert('Invalid email or password', 'error');
        } else if (error.code === 'auth/invalid-email') {
            showAlert('Invalid email format', 'error');
        } else {
            showAlert('Login failed. Please try again.', 'error');
        }
    }
}

// Check user role and redirect
async function checkUserRoleAndRedirect(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            sessionStorage.setItem('userRole', userData.role);
            
            if (userData.role === 'admin') {
                window.location.href = 'pages/admin.html';
            } else {
                window.location.href = 'equipment-pairing.html';
            }
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

// Show/hide admin login modal
window.showAdminLogin = function() {
    document.getElementById('adminLoginModal').style.display = 'block';
    document.getElementById('adminEmail').focus();
};

window.hideAdminLogin = function() {
    document.getElementById('adminLoginModal').style.display = 'none';
    document.getElementById('adminLoginForm').reset();
};

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideAdminLogin();
    }
});

// Close modal on outside click
document.getElementById('adminLoginModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'adminLoginModal') {
        hideAdminLogin();
    }
});
