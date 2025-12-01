// Utility function to generate a random salt for password hashing
function generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash a password with salt using SHA-256
async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random session token
function generateSessionToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Check if user is logged in by verifying session token
function isLoggedIn() {
    const token = localStorage.getItem('sessionToken');
    const expiry = localStorage.getItem('sessionExpiry');
    if (!token || !expiry) return false;
    return Date.now() < parseInt(expiry);
}

// Redirect to dashboard if logged in, else to login
function checkAccess() {
    if (window.location.pathname.includes('dashboard.html')) {
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
        } else {
            // Set user greeting
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            document.getElementById('userGreeting').textContent = `Hello, ${userData.username || 'User'}!`;
            // Start inactivity timer
            startInactivityTimer();
        }
    } else if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html') || window.location.pathname.includes('reset.html')) {
        if (isLoggedIn()) {
            window.location.href = 'dashboard.html';
        }
    }
}

// Start auto-logout timer after 10 minutes of inactivity
function startInactivityTimer() {
    clearTimeout(window.inactivityTimeout);
    window.inactivityTimeout = setTimeout(() => {
        logout();
    }, 10 * 60 * 1000); // 10 minutes
}

// Reset inactivity timer on user activity
function resetInactivityTimer() {
    if (isLoggedIn()) {
        startInactivityTimer();
    }
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength (8+ chars, upper, lower, number, symbol)
function validatePasswordStrength(password) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*]/.test(password);
    const isLongEnough = password.length >= 8;
    if (isLongEnough && hasUpper && hasLower && hasNumber && hasSymbol) return 'strong';
    if (isLongEnough && (hasUpper || hasLower) && (hasNumber || hasSymbol)) return 'moderate';
    return 'weak';
}

// Update password strength meter
function updatePasswordStrength(inputId, meterId) {
    const password = document.getElementById(inputId).value;
    const strength = validatePasswordStrength(password);
    const meter = document.getElementById(meterId);
    meter.innerHTML = `<div class="strength-${strength}"></div>`;
}

// Real-time validation for inputs
function validateInput(inputId, errorId, validator) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    input.addEventListener('input', () => {
        const value = input.value.trim();
        if (!value) {
            error.textContent = 'This field is required.';
        } else if (validator && !validator(value)) {
            error.textContent = 'Invalid format.';
        } else {
            error.textContent = '';
        }
    });
}

// Handle registration
async function handleRegistration(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const hint = document.getElementById('hint').value.trim();

    // Check for empty fields
    if (!username || !email || !password || !hint) {
        alert('All fields are required.');
        return;
    }

    // Validate email
    if (!isValidEmail(email)) {
        document.getElementById('emailError').textContent = 'Invalid email format.';
        return;
    }

    // Check password strength
    if (validatePasswordStrength(password) === 'weak') {
        document.getElementById('passwordError').textContent = 'Password is too weak.';
        return;
    }

    // Check unique username
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.some(user => user.username === username)) {
        document.getElementById('usernameError').textContent = 'Username already taken.';
        return;
    }

    // Hash password
    const salt = generateSalt();
    const hashedPassword = await hashPassword(password, salt);

    // Store user with hint
    const newUser = { username, email, passwordHash: hashedPassword, salt, hint };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    alert('Registration successful! Redirecting to login.');
    window.location.href = 'login.html';
}

// Handle login with rate limiting
async function handleLogin(event) {
    event.preventDefault();
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Rate limiting: Check failed attempts
    let failedAttempts = parseInt(localStorage.getItem('failedAttempts') || '0');
    const lastAttempt = parseInt(localStorage.getItem('lastAttempt') || '0');
    if (failedAttempts >= 3 && Date.now() - lastAttempt < 5 * 60 * 1000) { // 5 min cooldown
        document.getElementById('loginError').textContent = 'Too many failed attempts. Try again later.';
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.username === identifier || u.email === identifier);

    if (!user) {
        // Increment failed attempts
        failedAttempts++;
        localStorage.setItem('failedAttempts', failedAttempts.toString());
        localStorage.setItem('lastAttempt', Date.now().toString());
        document.getElementById('loginError').textContent = 'Invalid username/email or password.';
        return;
    }

    // Verify password
    const hashedInput = await hashPassword(password, user.salt);
    if (hashedInput !== user.passwordHash) {
        // Increment failed attempts
        failedAttempts++;
        localStorage.setItem('failedAttempts', failedAttempts.toString());
        localStorage.setItem('lastAttempt', Date.now().toString());
        document.getElementById('loginError').textContent = 'Invalid username/email or password.';
        return;
    }

    // Successful login: Reset failed attempts, create session
    localStorage.removeItem('failedAttempts');
    localStorage.removeItem('lastAttempt');
    const sessionToken = generateSessionToken();
    const sessionExpiry = Date.now() + (10 * 60 * 1000); // 10 minutes
    localStorage.setItem('sessionToken', sessionToken);
    localStorage.setItem('sessionExpiry', sessionExpiry.toString());
    localStorage.setItem('userData', JSON.stringify({ username: user.username, email: user.email }));

    alert('Login successful! Redirecting to dashboard.');
    window.location.href = 'dashboard.html';
}

// Handle verification step in reset
function handleVerify(event) {
    event.preventDefault();
    const email = document.getElementById('resetEmail').value.trim();
    const hint = document.getElementById('resetHint').value.trim();

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email);

    if (!user || hint !== user.hint) {
        document.getElementById('verifyError').textContent = 'Invalid email or hint.';
        return;
    }

    // Hide verify step, show reset step
    document.getElementById('verifyStep').style.display = 'none';
    document.getElementById('resetStep').style.display = 'block';
    // Store user index for reset
    window.resetUserIndex = users.indexOf(user);
}

// Handle new password creation in reset
async function handleNewPassword(event) {
    event.preventDefault();
    const newPassword = document.getElementById('newPassword').value;

    if (validatePasswordStrength(newPassword) === 'weak') {
        document.getElementById('newPasswordError').textContent = 'Password is too weak.';
        return;
    }

    // Update password
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const salt = generateSalt();
    const hashedPassword = await hashPassword(newPassword, salt);
    users[window.resetUserIndex].passwordHash = hashedPassword;
    users[window.resetUserIndex].salt = salt;
    localStorage.setItem('users', JSON.stringify(users));

    alert('Password reset successful! Redirecting to login.');
    window.location.href = 'login.html';
}

// Handle logout
function logout() {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('userData');
    clearTimeout(window.inactivityTimeout);
    window.location.href = 'login.html';
}

// Toggle dark/light theme
function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

// Load theme on page load
function loadTheme() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
        document.body.classList.add('dark');
    }
}

// Event listeners and initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check access on every page load
    checkAccess();

    // Load theme
    loadTheme();

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Registration form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
        // Real-time validation
        validateInput('username', 'usernameError');
        validateInput('email', 'emailError', isValidEmail);
        validateInput('hint', 'hintError');
        document.getElementById('password').addEventListener('input', () => updatePasswordStrength('password', 'passwordStrength'));
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        // Real-time validation
        validateInput('loginIdentifier', 'loginError');
        validateInput('loginPassword', 'loginPasswordError');
    }

    // Reset forms
    const verifyForm = document.getElementById('verifyForm');
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerify);
        // Real-time validation
        validateInput('resetEmail', 'verifyError', isValidEmail);
        validateInput('resetHint', 'verifyHintError');
    }

    const newPasswordForm = document.getElementById('newPasswordForm');
    if (newPasswordForm) {
        newPasswordForm.addEventListener('submit', handleNewPassword);
        document.getElementById('newPassword').addEventListener('input', () => updatePasswordStrength('newPassword', 'newPasswordStrength'));
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Reset inactivity timer on user activity
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
});