// ========================================
// Student Dashboard Logic
// Handles session verification, user state, and navigation
// ========================================

const API_BASE_URL = 'https://api.aftabkabir.me';

// Update Bangladesh Standard Time
function updateBDTime() {
    const now = new Date();
    const options = {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    const bdTime = now.toLocaleString('en-US', options);

    const desktopEl = document.getElementById('currentTime');
    const mobileEl = document.getElementById('currentTimeMobile');

    if (desktopEl) desktopEl.textContent = bdTime;
    if (mobileEl) mobileEl.textContent = bdTime;
}

// Check authentication state on page load
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data || !data.loggedIn) {
            window.location.href = 'login.html';
            return false;
        }

        // Set User ID in badges
        if (data.userId) {
            const userBadge = document.getElementById('userId');
            const userBadgeMobile = document.getElementById('userIdMobile');
            if (userBadge) userBadge.textContent = data.userId;
            if (userBadgeMobile) userBadgeMobile.textContent = data.userId;
        }

        return true;
    } catch (error) {
        console.warn('Auth status check failed, redirecting to login:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Handle user logout
async function handleLogout(event) {
    if (event) event.preventDefault();

    try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }

    window.location.href = 'login.html';
}

// Make logout available globally
window.handleLogout = handleLogout;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Dynamic copyright year
    const yearEl = document.getElementById('dynamicYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // BD Time updates
    updateBDTime();
    setInterval(updateBDTime, 1000);

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Verify authentication
    checkAuth();
});
