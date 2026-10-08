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

    if (!alertBox || !alertIcon || !alertMessage) return;

    alertBox.classList.remove('hidden', 'alert-error', 'alert-success', 'alert-info');

    if (type === 'error') {
        alertBox.classList.add('alert-error');
        alertIcon.className = 'fas fa-exclamation-circle text-xl text-red-400';
    } else if (type === 'success') {
        alertBox.classList.add('alert-success');
        alertIcon.className = 'fas fa-check-circle text-xl text-emerald-400';
    } else {
        alertBox.classList.add('alert-info');
        alertIcon.className = 'fas fa-info-circle text-xl text-[#D86C5A] pulse-effect';
    }

    alertMessage.textContent = message;
}

// Login attempt function (will be wrapped with retry logic)
async function attemptLogin(username, password) {
    let response;
    let data;

    try {
        response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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

        data = await response.json();
    } catch (err) {
        // Network timeout / connection error - throw to trigger immediate retry
        throw new Error('Connection to portal failed. Retrying...');
    }

    const statusCode = response ? response.status : 500;
    const errorMsg = (data && (data.message || data.error)) ? (data.message || data.error) : '';
    const lowerMsg = errorMsg.toLowerCase();

    // ONLY TWO TERMINAL CASES STOP THE AUTO RETRY:
    // Case 1: Incorrect username or password
    const isIncorrectCredentials = 
        (lowerMsg.includes('username') || lowerMsg.includes('password') || lowerMsg.includes('credential')) &&
        (lowerMsg.includes('incorrect') || lowerMsg.includes('wrong') || lowerMsg.includes('invalid password') || lowerMsg.includes('invalid username'));

    // Case 2: User ID blocked by admin
    const isBlocked = 
        statusCode === 403 || 
        lowerMsg.includes('restricted from logging in') || 
        lowerMsg.includes('account has been restricted') || 
        lowerMsg.includes('account has been blocked') ||
        lowerMsg.includes('blocked');

    if (isIncorrectCredentials || isBlocked) {
        return { 
            status: 'invalid_credentials', 
            message: errorMsg || (isBlocked ? 'Your account has been restricted from logging in.' : 'Username or password is incorrect')
        };
    }

    // Check for success
    if (data && (data.status === 'success' || data.userId)) {
        return { 
            status: 'success', 
            data: data 
        };
    }

    // ALL OTHER CASES (Advising is ongoing, Invalid answer/captcha, 500, portal busy, unknown response)
    // -> Throw to trigger automatic next attempt
    throw new Error(errorMsg || 'Login attempt failed. Retrying...');
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
    btnText.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Signing in...';

    // Use retry handler for login
    await retryHandler.executeWithRetry(
        () => attemptLogin(username, password),
        {
            operationName: 'Login',
            retryDelay: 1000,
            onSuccess: (result) => {
                showAlert('Login successful! Redirecting...', 'success');
                btnText.innerHTML = '<i class="fas fa-check mr-2"></i>Redirecting...';
                setTimeout(() => {
                    window.location.href = 'advise.html';
                }, 800);
            },
            onInvalidCredentials: (result) => {
                showAlert(result.message || 'Invalid credentials. Please check your student ID and password.', 'error');
                loginBtn.disabled = false;
                loginBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                btnText.textContent = 'Sign In';
            },
            onRetryAttempt: (attemptNum, elapsedTime, errorReason) => {
                console.log(`Login attempt ${attemptNum} failed. Elapsed time: ${elapsedTime}s. Reason: ${errorReason}`);
                showAlert(`${errorReason || 'Portal busy'}. Retrying automatically... (Attempt ${attemptNum + 1})`, 'info');
                btnText.innerHTML = `<i class="fas fa-sync-alt fa-spin mr-2"></i>Retrying (Attempt ${attemptNum + 1})...`;
            },
            onStop: () => {
                loginBtn.disabled = false;
                loginBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                btnText.textContent = 'Sign In';
                showAlert('Login process stopped.', 'info');
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

