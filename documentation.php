<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation - EWU Course Schedule</title>
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

    .animated-gradient {
        background: linear-gradient(-45deg, #0f0f23, #1a1a2e, #16213e, #0f3460);
        background-size: 400% 400%;
        animation: gradient 15s ease infinite;
    }

    @keyframes gradient {
        0% {
            background-position: 0% 50%;
        }

        50% {
            background-position: 100% 50%;
        }

        100% {
            background-position: 0% 50%;
        }
    }

    .fade-in {
        opacity: 0;
        animation: fadeIn 0.8s ease forwards;
    }

    @keyframes fadeIn {
        to {
            opacity: 1;
        }
    }

    .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        transition: all 0.3s ease;
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
    }

    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
    }

    /* Collapsible Section Styles */
    .collapsible {
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .collapsible:hover {
        background: rgba(102, 126, 234, 0.1);
    }

    .collapsible-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.4s ease-out, padding 0.4s ease-out;
    }

    .collapsible-content.active {
        max-height: 2000px;
        padding: 1.5rem;
    }

    .rotate-icon {
        transition: transform 0.3s ease;
    }

    .rotate-icon.active {
        transform: rotate(180deg);
    }

    /* Tooltip Styles */
    .tooltip {
        position: relative;
        display: inline-block;
    }

    .tooltip .tooltip-text {
        visibility: hidden;
        width: 220px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
        text-align: center;
        border-radius: 8px;
        padding: 8px 12px;
        position: absolute;
        z-index: 1;
        bottom: 125%;
        left: 50%;
        margin-left: -110px;
        opacity: 0;
        transition: opacity 0.3s;
        font-size: 0.875rem;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .tooltip .tooltip-text::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #764ba2 transparent transparent transparent;
    }

    .tooltip:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
    }

    /* Code Block Styles */
    .code-block {
        background: rgba(15, 15, 35, 0.8);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: 12px;
        padding: 1rem;
        font-family: 'Courier New', monospace;
        color: #4ade80;
        overflow-x: auto;
    }

    /* Step Number Circle */
    .step-number {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1.125rem;
        color: white;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        flex-shrink: 0;
    }

    /* Scroll Animation */
    .scroll-reveal {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
    }

    .scroll-reveal.active {
        opacity: 1;
        transform: translateY(0);
    }

    /* Interactive Card Hover */
    .interactive-card {
        transition: all 0.3s ease;
    }

    .interactive-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 40px rgba(102, 126, 234, 0.3);
    }

    /* Video Container */
    .video-container {
        position: relative;
        padding-bottom: 56.25%;
        height: 0;
        overflow: hidden;
        border-radius: 16px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
    }

    .video-container iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
    </style>
</head>

<body class="animated-gradient min-h-screen text-white">
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
                    <a href="documentation.php" class="text-cyan-400 font-medium">Documentation</a>
                    <a href="learn-more.php" class="text-gray-300 hover:text-white transition-colors">Learn More</a>
                    <?php if (isset($_SESSION['user_logged_in']) && $_SESSION['user_logged_in'] === true): ?>
                        <a href="advise.php" class="text-gray-300 hover:text-white transition-colors">Dashboard</a>
                        <a href="logout.php" class="text-gray-300 hover:text-white transition-colors">Logout</a>
                    <?php else: ?>
                        <a href="login.php" class="text-gray-300 hover:text-white transition-colors">Login</a>
                    <?php endif; ?>
                </div>
                <!-- Mobile Menu Button -->
                <button id="mobileMenuBtn" class="md:hidden text-white text-2xl focus:outline-none">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
            <!-- Mobile Menu -->
            <div id="mobileMenu" class="hidden md:hidden mt-4 pb-4 space-y-3">
                <a href="index.php" class="block text-gray-300 hover:text-white transition-colors py-2">Home</a>
                <a href="documentation.php" class="block text-cyan-400 font-medium hover:text-cyan-300 transition-colors py-2">Documentation</a>
                <a href="learn-more.php" class="block text-gray-300 hover:text-white transition-colors py-2">Learn More</a>
                <?php if (isset($_SESSION['user_logged_in']) && $_SESSION['user_logged_in'] === true): ?>
                    <a href="advise.php" class="block text-gray-300 hover:text-white transition-colors py-2">Dashboard</a>
                    <a href="logout.php" class="block text-gray-300 hover:text-white transition-colors py-2">Logout</a>
                <?php else: ?>
                    <a href="login.php" class="block text-gray-300 hover:text-white transition-colors py-2">Login</a>
                <?php endif; ?>
            </div>
        </div>
    </nav>

    <!-- Header Section -->
    <section class="py-16 px-4">
        <div class="container mx-auto max-w-6xl text-center fade-in">
            <div class="inline-block glass-effect rounded-full p-4 mb-6">
                <i class="fas fa-book-open text-6xl text-cyan-400"></i>
            </div>
            <h1 class="text-4xl lg:text-5xl font-bold mb-6">
                <span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Documentation
                </span>
            </h1>
            <p class="text-gray-300 text-lg max-w-3xl mx-auto">
                Quick guide to browse and filter EWU courses.
            </p>
        </div>
    </section>

    <!-- Quick Start Section -->
    <section class="py-12 px-4">
        <div class="container mx-auto max-w-5xl">
            <div class="glass-effect rounded-3xl p-8 mb-12 scroll-reveal interactive-card">
                <h2 class="text-3xl font-bold mb-6 text-center">
                    <i class="fas fa-rocket text-purple-400 mr-3"></i>Quick Start Guide
                </h2>
                
                <div class="space-y-6">
                    <!-- Step 1 -->
                    <div class="flex gap-4 items-start">
                        <div class="step-number">1</div>
                        <div class="flex-1">
                            <h3 class="text-xl font-bold mb-2">Login with EWU Credentials</h3>
                            <p class="text-gray-300">Enter your student ID and portal password.</p>
                        </div>
                    </div>

                    <!-- Step 2 -->
                    <div class="flex gap-4 items-start">
                        <div class="step-number">2</div>
                        <div class="flex-1">
                            <h3 class="text-xl font-bold mb-2">View Course Schedule</h3>
                            <p class="text-gray-300">All courses load automatically after login.</p>
                        </div>
                    </div>

                    <!-- Step 3 -->
                    <div class="flex gap-4 items-start">
                        <div class="step-number">3</div>
                        <div class="flex-1">
                            <h3 class="text-xl font-bold mb-2">Filter & Search</h3>
                            <p class="text-gray-300">Use filters to find specific courses quickly.</p>
                        </div>
                    </div>

                    <!-- Step 4 -->
                    <div class="flex gap-4 items-start">
                        <div class="step-number">4</div>
                        <div class="flex-1">
                            <h3 class="text-xl font-bold mb-2">Export to PDF</h3>
                            <p class="text-gray-300">Click "Export PDF" to download your schedule.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section (Collapsible) -->
    <section class="py-12 px-4">
        <div class="container mx-auto max-w-5xl">
            <h2 class="text-3xl font-bold mb-8 text-center">
                <i class="fas fa-star text-yellow-400 mr-3"></i>Detailed Features
            </h2>

            <div class="space-y-4">
                <!-- Search Feature -->
                <div class="glass-effect rounded-2xl overflow-hidden scroll-reveal">
                    <div class="collapsible p-6 flex justify-between items-center" onclick="toggleCollapsible(this)">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-search text-cyan-400 text-2xl"></i>
                            <h3 class="text-xl font-bold">Advanced Search</h3>
                        </div>
                        <i class="fas fa-chevron-down rotate-icon text-cyan-400"></i>
                    </div>
                    <div class="collapsible-content border-t border-cyan-500/20">
                        <p class="text-gray-300 mb-4">Search courses by:</p>
                        <ul class="space-y-2 text-gray-300">
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Course code (e.g., CSE 425)</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Faculty name</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Room number</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Time slot</span>
                            </li>
                        </ul>
                        <div class="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p class="text-sm text-blue-300">
                                <i class="fas fa-lightbulb mr-2"></i>Get real-time suggestions as you type!
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Filter Feature -->
                <div class="glass-effect rounded-2xl overflow-hidden scroll-reveal">
                    <div class="collapsible p-6 flex justify-between items-center" onclick="toggleCollapsible(this)">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-filter text-purple-400 text-2xl"></i>
                            <h3 class="text-xl font-bold">Smart Filtering</h3>
                        </div>
                        <i class="fas fa-chevron-down rotate-icon text-cyan-400"></i>
                    </div>
                    <div class="collapsible-content border-t border-cyan-500/20">
                        <p class="text-gray-300 mb-4">Filter courses by:</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                <h4 class="font-bold mb-2 text-purple-300">
                                    <i class="fas fa-book mr-2"></i>Course Code
                                </h4>
                                <p class="text-sm text-gray-300">Select specific courses from the dropdown</p>
                            </div>
                            <div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <h4 class="font-bold mb-2 text-green-300">
                                    <i class="fas fa-chair mr-2"></i>Seat Availability
                                </h4>
                                <p class="text-sm text-gray-300">Show only courses with open seats</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sort Feature -->
                <div class="glass-effect rounded-2xl overflow-hidden scroll-reveal">
                    <div class="collapsible p-6 flex justify-between items-center" onclick="toggleCollapsible(this)">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-sort text-green-400 text-2xl"></i>
                            <h3 class="text-xl font-bold">Sorting Options</h3>
                        </div>
                        <i class="fas fa-chevron-down rotate-icon text-cyan-400"></i>
                    </div>
                    <div class="collapsible-content border-t border-cyan-500/20">
                        <p class="text-gray-300 mb-4">Sort courses by:</p>
                        <ul class="space-y-3 text-gray-300">
                            <li class="flex items-center gap-3">
                                <span class="bg-green-500/20 text-green-300 px-3 py-1 rounded-lg text-sm font-medium">Default</span>
                                <span>Original order</span>
                            </li>
                            <li class="flex items-center gap-3">
                                <span class="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg text-sm font-medium">A → Z</span>
                                <span>Faculty name A-Z</span>
                            </li>
                            <li class="flex items-center gap-3">
                                <span class="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg text-sm font-medium">Z → A</span>
                                <span>Faculty name Z-A</span>
                            </li>
                            <li class="flex items-center gap-3">
                                <span class="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-lg text-sm font-medium">Seats</span>
                                <span>Most seats available</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- PDF Export Feature -->
                <div class="glass-effect rounded-2xl overflow-hidden scroll-reveal">
                    <div class="collapsible p-6 flex justify-between items-center" onclick="toggleCollapsible(this)">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-file-pdf text-red-400 text-2xl"></i>
                            <h3 class="text-xl font-bold">PDF Export</h3>
                        </div>
                        <i class="fas fa-chevron-down rotate-icon text-cyan-400"></i>
                    </div>
                    <div class="collapsible-content border-t border-cyan-500/20">
                        <p class="text-gray-300 mb-4">Export features:</p>
                        <ul class="space-y-2 text-gray-300 mb-4">
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Includes all filtered courses</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Professional table format</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Includes student ID and date</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Perfect for offline use</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Refresh Feature -->
                <div class="glass-effect rounded-2xl overflow-hidden scroll-reveal">
                    <div class="collapsible p-6 flex justify-between items-center" onclick="toggleCollapsible(this)">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-sync-alt text-blue-400 text-2xl"></i>
                            <h3 class="text-xl font-bold">Real-time Refresh</h3>
                        </div>
                        <i class="fas fa-chevron-down rotate-icon text-cyan-400"></i>
                    </div>
                    <div class="collapsible-content border-t border-cyan-500/20">
                        <p class="text-gray-300 mb-4">Refresh button features:</p>
                        <ul class="space-y-2 text-gray-300">
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Click the green button (bottom-right)</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Updates data without page reload</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Keeps your scroll position</span>
                            </li>
                            <li class="flex items-start gap-3">
                                <i class="fas fa-check text-green-400 mt-1"></i>
                                <span>Shows success notification</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- FAQ Section -->
    <section class="py-12 px-4">
        <div class="container mx-auto max-w-5xl">
            <h2 class="text-3xl font-bold mb-8 text-center">
                <i class="fas fa-question-circle text-pink-400 mr-3"></i>Frequently Asked Questions
            </h2>

            <div class="space-y-4">
                <div class="glass-effect rounded-2xl overflow-hidden scroll-reveal">
                    <div class="collapsible p-6 flex justify-between items-center" onclick="toggleCollapsible(this)">
                        <h3 class="text-lg font-bold">Is my data secure?</h3>
                        <i class="fas fa-chevron-down rotate-icon text-cyan-400"></i>
                    </div>
                    <div class="collapsible-content border-t border-cyan-500/20">
                        <p class="text-gray-300">
                            Yes! We don't store your credentials. Authentication goes directly through EWU portal. Your password is never saved.
                        </p>
                    </div>
                </div>

                <div class="glass-effect rounded-2xl overflow-hidden scroll-reveal">
                    <div class="collapsible p-6 flex justify-between items-center" onclick="toggleCollapsible(this)">
                        <h3 class="text-lg font-bold">Can I access this on mobile devices?</h3>
                        <i class="fas fa-chevron-down rotate-icon text-cyan-400"></i>
                    </div>
                    <div class="collapsible-content border-t border-cyan-500/20">
                        <p class="text-gray-300">
                            Yes! Works on all devices – phones, tablets, and desktops.
                        </p>
                    </div>
                </div>

                <div class="glass-effect rounded-2xl overflow-hidden scroll-reveal">
                    <div class="collapsible p-6 flex justify-between items-center" onclick="toggleCollapsible(this)">
                        <h3 class="text-lg font-bold">Why can't I see some courses?</h3>
                        <i class="fas fa-chevron-down rotate-icon text-cyan-400"></i>
                    </div>
                    <div class="collapsible-content border-t border-cyan-500/20">
                        <p class="text-gray-300">
                            Check your filters. Make sure "Available Only" is off and no course filter is selected. Click the refresh button to reload data.
                        </p>
                    </div>
                </div>

                <div class="glass-effect rounded-2xl overflow-hidden scroll-reveal">
                    <div class="collapsible p-6 flex justify-between items-center" onclick="toggleCollapsible(this)">
                        <h3 class="text-lg font-bold">How often is the course data updated?</h3>
                        <i class="fas fa-chevron-down rotate-icon text-cyan-400"></i>
                    </div>
                    <div class="collapsible-content border-t border-cyan-500/20">
                        <p class="text-gray-300">
                            Data comes directly from EWU portal in real-time. Refresh anytime for the latest seat availability.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section class="py-16 px-4">
        <div class="container mx-auto max-w-4xl">
            <div class="glass-effect rounded-3xl p-8 text-center scroll-reveal">
                <div class="inline-block glass-effect rounded-full p-4 mb-6">
                    <i class="fas fa-envelope text-5xl text-cyan-400"></i>
                </div>
                <h2 class="text-3xl font-bold mb-4">Need Help?</h2>
                <p class="text-gray-300 mb-6 text-lg">
                    Get in touch for support or suggestions.
                </p>
                <a href="mailto:aftabkabir7766@gmail.com" 
                   class="btn-primary px-8 py-4 rounded-xl font-semibold inline-flex items-center gap-3 text-lg">
                    <i class="fas fa-paper-plane"></i>
                    Contact Support
                </a>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="glass-effect py-8 mt-12 border-t border-cyan-500/20">
        <div class="container mx-auto px-4 text-center text-gray-400 text-sm">
            <p class="mb-2">&copy; 2025 East West University. Educational use only.</p>
            <p>Built with <i class="fas fa-heart text-red-500"></i> for students</p>
        </div>
    </footer>

    <script>
    // Collapsible functionality
    function toggleCollapsible(element) {
        const content = element.nextElementSibling;
        const icon = element.querySelector('.rotate-icon');
        
        content.classList.toggle('active');
        icon.classList.toggle('active');
    }

    // Scroll reveal animation
    function reveal() {
        const reveals = document.querySelectorAll('.scroll-reveal');
        
        for (let i = 0; i < reveals.length; i++) {
            const windowHeight = window.innerHeight;
            const elementTop = reveals[i].getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add('active');
            }
        }
    }

    window.addEventListener('scroll', reveal);
    reveal(); // Check on load

    // Fade in animation on load
    document.addEventListener('DOMContentLoaded', function() {
        const fadeElements = document.querySelectorAll('.fade-in');
        
        const fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                }
            });
        });

        fadeElements.forEach(element => {
            element.style.animationPlayState = 'paused';
            fadeInObserver.observe(element);
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
    });
    </script>
</body>

</html>

