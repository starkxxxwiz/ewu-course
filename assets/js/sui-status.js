// ==========================================
// EWU Portal V2 - Status & Analytics Intercom
// ==========================================

(function() {
    // Determine the API URL based on where the app is hosted
    // In production this will be api.aftabkabir.me
    const API_URL = 'https://api.aftabkabir.me/api';

    // 1. Check Site Status (Closure logic)
    fetch(`${API_URL}/status`)
        .then(res => res.json())
        .then(data => {
            if (data.closed || data.blocked) {
                // If site is closed or IP is blocked, immediately replace the entire page with a maintenance message
                document.documentElement.innerHTML = `
                    <head>
                        <title>Site Maintenance</title>
                        <style>
                            body {
                                margin: 0;
                                height: 100vh;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background-color: #0b0f19;
                                color: #ffffff;
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                text-align: center;
                            }
                            .container {
                                padding: 2rem;
                                border-radius: 12px;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid rgba(255,255,255,0.1);
                                max-width: 500px;
                            }
                            h1 { color: #D86C5A; margin-bottom: 1rem; }
                            p { color: #a4b1cd; line-height: 1.5; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Site is currently closed due to maintenance.</h1>
                            <p>We are currently performing updates. Please check back later.</p>
                        </div>
                    </body>
                `;
            }
        })
        .catch(err => {
            // Silently fail if API is unreachable to prevent breaking the local experience
            console.warn('Status check failed:', err);
        });

    // 2. Log Analytics Visit
    setTimeout(() => {
        fetch(`${API_URL}/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'visit', path: window.location.pathname })
        }).catch(() => {});
    }, 1000); // delay analytics slightly to free up main thread
})();
