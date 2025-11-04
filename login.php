<?php
session_start();

// Redirect if already logged in
if (isset($_SESSION['user_logged_in']) && $_SESSION['user_logged_in'] === true) {
    header('Location: advise.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EWU Portal - Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        dark: {
                            900: '#0f0f23',
                            800: '#1a1a2e',
                            700: '#16213e',
                            600: '#0f3460',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        .glass-effect {
            background: rgba(255, 255, 255, 0.07);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.36);
        }

        .input-field {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(59, 130, 246, 0.3);
            transition: all 0.3s ease;
        }

        .input-field:focus {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(59, 130, 246, 0.6);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }

        .login-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            transition: all 0.3s ease;
        }

        .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
        }

        .login-btn:active {
            transform: translateY(0);
        }

        .animated-gradient {
            background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #4facfe);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
        }

        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        .pulse-effect {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }
    </style>
</head>
<body class="animated-gradient min-h-screen">
    <!-- Navigation -->
    <nav class="glass-effect sticky top-0 z-50">
        <div class="container mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-xl">
                        <i class="fas fa-graduation-cap text-cyan-400 text-xl"></i>
                    </div>
                    <span class="text-xl font-bold">EWU Courses</span>
                </div>
                <!-- Desktop Navigation -->
                <div class="hidden md:flex gap-4">
                    <a href="index.php" class="text-gray-300 hover:text-white transition-colors">Home</a>
                    <a href="documentation.php" class="text-gray-300 hover:text-white transition-colors">Documentation</a>
                    <a href="learn-more.php" class="text-gray-300 hover:text-white transition-colors">Learn More</a>
                    <a href="login.php" class="text-cyan-400 font-medium">Login</a>
                </div>
                <!-- Mobile Menu Button -->
                <button id="mobileMenuBtn" class="md:hidden text-white text-2xl focus:outline-none">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
            <!-- Mobile Menu -->
            <div id="mobileMenu" class="hidden md:hidden mt-4 pb-4 space-y-3">
                <a href="index.php" class="block text-gray-300 hover:text-white transition-colors py-2">Home</a>
                <a href="documentation.php" class="block text-gray-300 hover:text-white transition-colors py-2">Documentation</a>
                <a href="learn-more.php" class="block text-gray-300 hover:text-white transition-colors py-2">Learn More</a>
                <a href="login.php" class="block text-cyan-400 font-medium hover:text-cyan-300 transition-colors py-2">Login</a>
            </div>
        </div>
    </nav>

    <div class="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <div class="w-full max-w-md">
        <!-- Logo/Header -->
        <div class="text-center mb-8">
            <div class="inline-block glass-effect rounded-full p-4 mb-4">
                <i class="fas fa-graduation-cap text-6xl text-cyan-400"></i>
            </div>
            <h1 class="text-4xl font-bold text-white mb-2">EWU Portal</h1>
            <p class="text-gray-300">Sign in to access course schedules</p>
        </div>

        <!-- Login Form -->
        <div class="glass-effect rounded-3xl p-8">
            <form id="loginForm" class="space-y-6">
                <!-- Alert Messages -->
                <div id="alertBox" class="hidden rounded-xl p-4 mb-4">
                    <div class="flex items-center gap-3">
                        <i id="alertIcon" class="text-xl"></i>
                        <p id="alertMessage" class="text-sm font-medium"></p>
                    </div>
                </div>

                <!-- Username -->
                <div>
                    <label class="block text-sm font-medium text-cyan-300 mb-2">
                        <i class="fas fa-user mr-2"></i>Student ID
                    </label>
                    <input 
                        type="text" 
                        id="username" 
                        name="username" 
                        required
                        placeholder="Enter your student ID"
                        class="input-field w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 outline-none"
                    >
                </div>

                <!-- Password -->
                <div>
                    <label class="block text-sm font-medium text-cyan-300 mb-2">
                        <i class="fas fa-lock mr-2"></i>Password
                    </label>
                    <div class="relative">
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            required
                            placeholder="Enter your password"
                            class="input-field w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 outline-none pr-12"
                        >
                        <button 
                            type="button" 
                            onclick="togglePassword()"
                            class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                            <i id="passwordIcon" class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>

                <!-- Submit Button -->
                <button 
                    type="submit" 
                    id="loginBtn"
                    class="login-btn w-full py-3 rounded-xl font-semibold text-white text-lg flex items-center justify-center gap-3"
                >
                    <i class="fas fa-sign-in-alt"></i>
                    <span id="btnText">Sign In</span>
                </button>

                <!-- Info -->
                <div class="text-center text-sm text-gray-400 mt-4">
                    <i class="fas fa-info-circle mr-1"></i>
                    Use your EWU portal credentials
                </div>
            </form>
        </div>

        <!-- Footer -->
        <div class="text-center mt-6 text-gray-400 text-sm">
            <p>&copy; 2025 East West University</p>
        </div>
        </div>
    </div>

    <script>
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
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
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
                const response = await fetch('auth.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    showAlert('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'advise.php';
                    }, 1000);
                } else {
                    showAlert(data.message || 'Login failed. Please try again.', 'error');
                    loginBtn.disabled = false;
                    loginBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                    btnText.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
                }
            } catch (error) {
                showAlert('Connection error. Please check your internet connection.', 'error');
                loginBtn.disabled = false;
                loginBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                btnText.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
            }
        });

        // Auto-focus username field
        document.getElementById('username').focus();

        // Enter key support
        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('loginForm').dispatchEvent(new Event('submit'));
            }
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', function() {
                mobileMenu.classList.toggle('hidden');
                const icon = this.querySelector('i');
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            });
        }
    </script>
</body>
</html>

