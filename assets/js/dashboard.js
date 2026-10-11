// ========================================
// Student Dashboard Logic
// Handles session verification, student ID display, and navigation
// ========================================

const API_BASE_URL = 'https://api.aftabkabir.me';

// Retrieve student ID from local/session storage
function getStoredStudentId() {
    try {
        const id = localStorage.getItem('studentId')
            || localStorage.getItem('ewu_student_id')
            || sessionStorage.getItem('studentId')
            || localStorage.getItem('userId');
        if (id && id !== 'User' && id !== 'Student') {
            return id;
        }
    } catch (e) {
        console.warn('Storage read error:', e);
    }
    return null;
}

// Update student ID in UI badges
function updateStudentIdDisplay(id) {
    const studentId = id || getStoredStudentId() || 'Student ID';
    const userBadge = document.getElementById('userId');
    const userBadgeMobile = document.getElementById('userIdMobile');

    if (userBadge) {
        userBadge.textContent = studentId;
    }
    if (userBadgeMobile) {
        userBadgeMobile.textContent = studentId;
    }
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

        // Set Student ID in badges
        if (data.userId && data.userId !== 'User' && data.userId !== 'Student') {
            try {
                localStorage.setItem('studentId', data.userId);
            } catch (e) {}
            updateStudentIdDisplay(data.userId);
        } else {
            // Worker returns userId: 'User' on generic session check
            // Use stored student ID from login if available
            const saved = getStoredStudentId();
            if (saved) {
                updateStudentIdDisplay(saved);
            } else {
                updateStudentIdDisplay('Student ID');
            }
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

    try {
        localStorage.removeItem('studentId');
        localStorage.removeItem('ewu_student_id');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('studentId');
    } catch (e) {}

    window.location.href = 'login.html';
}

// Make logout available globally
window.handleLogout = handleLogout;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Dynamic copyright year
    const yearEl = document.getElementById('dynamicYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Immediately display student ID if saved (avoids UI delay)
    updateStudentIdDisplay();

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
