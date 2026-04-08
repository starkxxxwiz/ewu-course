// ==========================================
// EWU Portal V2 - Status & Analytics Intercom
// ==========================================

(function() {
    // Determine the API URL based on where the app is hosted
    const API_URL = 'https://api.aftabkabir.me/api';

    function injectScreen(type) {
        let titleLine = '', subLine = '', iconSvg = '', glowColor = '';
        
        if (type === 'blocked') {
            document.title = 'Access Restricted';
            titleLine = 'Access Restricted';
            subLine = 'Your connection has been blocked by the security gateway due to unauthorized or suspicious activity. If you believe this is a mistake, please contact the administrator.';
            glowColor = 'rgba(239, 68, 68, 0.4)'; // Red
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-red-500 mb-6 mx-auto"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" /><path d="M12 11m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 12l0 2.5" /></svg>`;
        } else {
            document.title = 'Site Maintenance';
            titleLine = 'System Offline';
            subLine = 'We are currently performing scheduled maintenance to improve the platform. The dashboard will be back online shortly. Thank you for your patience.';
            glowColor = 'rgba(59, 130, 246, 0.4)'; // Blue
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500 mb-6 mx-auto"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5" /></svg>`;
        }

        document.documentElement.innerHTML = `
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        margin: 0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #0b0f19;
                        background-image: radial-gradient(circle at center, ${glowColor} 0%, transparent 40%);
                        color: #ffffff;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
                        padding: 1rem;
                    }
                    .glass-container {
                        background: rgba(17, 24, 39, 0.7);
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                        border-radius: 1.5rem;
                        padding: 3rem 2rem;
                        max-w-px: 500px;
                        width: 100%;
                        text-align: center;
                        animation: fadeInUp 0.5s ease-out;
                    }
                    h1 {
                        font-size: 1.75rem;
                        font-weight: 700;
                        margin: 0 0 1rem 0;
                        letter-spacing: -0.025em;
                    }
                    p {
                        color: #9ca3af;
                        line-height: 1.6;
                        font-size: 0.95rem;
                        margin: 0;
                    }
                    .text-blue-500 { color: #3b82f6; }
                    .text-red-500 { color: #ef4444; }
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                </style>
            </head>
            <body>
                <div class="glass-container">
                    ${iconSvg}
                    <h1>${titleLine}</h1>
                    <p>${subLine}</p>
                </div>
            </body>
        `;
    }

    // 1. Check Site Status (Closure & Block logic)
    fetch(`${API_URL}/status`)
        .then(res => res.json())
        .then(data => {
            if (data.blocked) {
                injectScreen('blocked');
            } else if (data.closed) {
                injectScreen('maintenance');
            }
        })
        .catch(err => {
            console.warn('Status check failed:', err);
        });

    // 2. Log Analytics Visit
    setTimeout(() => {
        fetch(`${API_URL}/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'visit', path: window.location.pathname })
        }).catch(() => {});
    }, 1000);
})();
