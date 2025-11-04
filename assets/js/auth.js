// ========================================
// Authentication JavaScript
// ========================================

// **IMPORTANT:** Update this to your actual Worker API domain
const API_BASE_URL = 'https://api.aftabkabir.me';

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        passwordIcon.className = 'fas fa-eye';
    }
}

// Show alert
function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('alertBox');
    const alertIcon = document.getElementById('alertIcon');
    const alertMessage = document.getElementById('alertMessage');

    alertBox.classList.remove('hidden', 'bg-red-500/20', 'bg-green-500/20', 'bg-blue-500/20', 'border', 'border-red-400/30', 'border-green-400/30', 'border-blue-400/30', 'text-red-300', 'text-green-300', 'text-blue-300');

    if (type === 'error') {
        alertBox.classList.add('bg-red-500/20', 'border', 'border-red-400/30', 'text-red-300');
        alertIcon.className = 'fas fa-exclamation-circle text-xl';
    } else if (type === 'success') {
        alertBox.classList.add('bg-green-500/20', 'border', 'border-green-400/30', 'text-green-300');
        alertIcon.className = 'fas fa-check-circle text-xl';
    } else {
        alertBox.classList.add('bg-blue-500/20', 'border', 'border-blue-400/30', 'text-blue-300');
        alertIcon.className = 'fas fa-info-circle text-xl pulse-effect';
    }

    alertMessage.textContent = message;
}

// Handle form submission
document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');

    // Validation
    if (!username || !password) {
        showAlert('Please enter both student ID and password', 'error');
        return;
    }

    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.classList.add('opacity-75', 'cursor-not-allowed');
    btnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';

    try {
        // Call Worker API login endpoint
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Important: send cookies
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'advise.html';
            }, 1000);
        } else {
            showAlert(data.message || 'Login failed. Please try again.', 'error');
            loginBtn.disabled = false;
            loginBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            btnText.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Connection error. Please check your internet connection.', 'error');
        loginBtn.disabled = false;
        loginBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        btnText.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
    }
});

// Auto-focus username field
document.getElementById('username')?.focus();

// Enter key support
document.getElementById('password')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});

