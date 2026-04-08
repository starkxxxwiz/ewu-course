// ========================================
// Authentication JavaScript with Intelligent Retry
// ========================================

// **IMPORTANT:** Update this to your actual Worker API domain
const API_BASE_URL = 'https://api.aftabkabir.me';

// Initialize retry handler
const retryHandler = new RetryHandler();

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

// Login attempt function (will be wrapped with retry logic)
async function attemptLogin(username, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            username: username,
            password: password
        })
    });

    const data = await response.json();

    // Check for invalid credentials (don't retry these)
    if (data.status === 'error' && (
        data.message?.toLowerCase().includes('invalid') || 
        data.message?.toLowerCase().includes('incorrect') ||
        data.message?.toLowerCase().includes('wrong')
    )) {
        return { 
            status: 'invalid_credentials', 
            message: data.message 
        };
    }

    // Check for success
    if (data.status === 'success') {
        return { 
            status: 'success', 
            data: data 
        };
    }

    // Any other error should trigger retry
    throw new Error(data.message || 'Login failed');
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
    btnText.innerHTML = 'Signing in...';

    // Use retry handler for login
    await retryHandler.executeWithRetry(
        () => attemptLogin(username, password),
        {
            operationName: 'Login',
            onSuccess: (result) => {
                showAlert('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'advise.html';
                }, 1000);
            },
            onInvalidCredentials: (result) => {
                showAlert(result.message || 'Invalid credentials. Please check your student ID and password.', 'error');
                loginBtn.disabled = false;
                loginBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                btnText.textContent = 'Sign In';
            },
            onRetryAttempt: (attemptNum, elapsedTime) => {
                console.log(`Login attempt ${attemptNum} failed. Elapsed time: ${elapsedTime}s`);
                showAlert(`Connection timeout. Retrying automatically... (Attempt ${attemptNum})`, 'info');
            }
        }
    );
});

// Auto-focus username field
document.getElementById('username')?.focus();

// Enter key support
document.getElementById('password')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('loginForm').dispatchEvent(new Event('submit'));
    }
});

