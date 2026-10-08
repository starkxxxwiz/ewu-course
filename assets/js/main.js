// ========================================
// Main JavaScript - Common functionality
// ========================================

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            const isHidden = mobileMenu.classList.toggle('hidden');
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
            // If button uses SVG, update path between hamburger and close (X)
            const svgPath = this.querySelector('svg path');
            if (svgPath) {
                if (mobileMenu.classList.contains('hidden')) {
                    svgPath.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
                } else {
                    svgPath.setAttribute('d', 'M6 18L18 6M6 6l12 12');
                }
            }
        });
    }
});
