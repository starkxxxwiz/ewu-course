// ==========================================
// EWU Portal V2 - Status & Analytics Intercom
// ==========================================

(function() {
    // Determine the API URL based on where the app is hosted
    const API_URL = 'https://api.aftabkabir.me/api';

    function injectScreen(type, config = {}) {
        let titleHtml = '', contentHtml = '', bgGradient = '', themeGlow = '';

        if (type === 'blocked') {
            document.title = 'Access Restricted';
            bgGradient = `radial-gradient(circle at top right, rgba(239, 68, 68, 0.15) 0%, transparent 40%), radial-gradient(circle at bottom left, rgba(185, 28, 28, 0.1) 0%, transparent 40%)`;
            themeGlow = 'rgba(239, 68, 68, 0.5)';
            contentHtml = `
                <div class="glass-container restricted">
                    <div class="icon-wrap red-glow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" class="text-red-500" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" /><path d="M12 11m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 12l0 2.5" /></svg>
                    </div>
                    <h1 class="font-bold tracking-tight title-text text-red-50">CRITICAL ACCESS DENIED</h1>
                    <div class="separator bg-red-500/20"></div>
                    <p class="body-text text-red-100/70">Your connection to this edge node has been unilaterally blocked by the master security firewall. This implies severe unauthorized activity originating from your network.</p>
                    <div class="meta-info border-red-500/10 bg-red-500/5">
                        <span class="text-red-400">STATUS:</span> FILTER_BLOCK_ACTIVE
                    </div>
                </div>
            `;
        } else if (type === 'maintenance') {
            document.title = 'System Offline';
            bgGradient = `radial-gradient(circle at top, rgba(59, 130, 246, 0.15) 0%, transparent 60%), radial-gradient(circle at bottom, rgba(139, 92, 246, 0.15) 0%, transparent 40%)`;
            themeGlow = 'rgba(59, 130, 246, 0.4)';
            contentHtml = `
                <div class="glass-container maintenance">
                    <div class="icon-wrap blue-glow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="none" class="text-blue-400" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5" /></svg>
                    </div>
                    <h1 class="font-bold tracking-tight title-text text-blue-50 relative">
                        Routine Maintenance
                        <span class="absolute -top-1 -right-4 w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    </h1>
                    <p class="body-text text-blue-100/60 max-w-sm mx-auto">We are momentarily orchestrating infrastructural updates to guarantee high-performance computing on the portal. Online presence will resume momentarily.</p>
                </div>
            `;
        } else if (type === 'wpb') {
            document.title = 'System Notice';
            bgGradient = `radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 80%)`;
            themeGlow = 'rgba(139, 92, 246, 0.3)';
            const alignClass = config.align || 'text-center';
            const sizeClass = config.fontSize || 'text-base';
            const weightClass = config.fontWeight || 'font-normal';
            const iconHtml = config.icon ? `<div class="mb-6 text-purple-400 [&>svg]:w-14 [&>svg]:h-14">${config.icon}</div>` : '';
            
            contentHtml = `
                <div class="glass-container wpb-notice ${alignClass}">
                    ${iconHtml}
                    <div class="text-gray-100 ${sizeClass} ${weightClass} leading-relaxed">${config.content || ''}</div>
                </div>
            `;
        }

        document.documentElement.innerHTML = `
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
                        background: #0b0f19; background-image: ${bgGradient};
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        padding: 1.5rem; color: white;
                    }
                    .glass-container {
                        background: rgba(17, 24, 39, 0.65);
                        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px ${themeGlow};
                        border-radius: 1.5rem; padding: 3.5rem 2.5rem;
                        width: 100%; max-width: 550px;
                        animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    .glass-container.maintenance {
                        max-width: 480px;
                        text-align: center;
                        background: linear-gradient(180deg, rgba(31, 41, 55, 0.5) 0%, rgba(17, 24, 39, 0.8) 100%);
                    }
                    .glass-container.restricted {
                        text-align: left;
                        border-left: 4px solid #ef4444;
                        max-width: 500px;
                    }
                    .icon-wrap {
                        display: inline-flex; align-items: center; justify-content: center;
                        width: 4.5rem; height: 4.5rem; border-radius: 1rem; margin-bottom: 2rem;
                    }
                    .icon-wrap.red-glow { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); }
                    .icon-wrap.blue-glow { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); margin: 0 auto 2rem auto; }
                    .title-text { font-size: 1.875rem; margin: 0 0 1rem 0; line-height: 1.2; }
                    .body-text { font-size: 1rem; line-height: 1.6; margin: 0; }
                    .separator { height: 1px; width: 100%; margin: 1.5rem 0; }
                    .meta-info {
                        margin-top: 2rem; padding: 1rem; border-radius: 0.5rem;
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                        font-size: 0.85rem; border: 1px solid;
                    }
                    .text-center { text-align: center; }
                    .text-left { text-align: left; }
                    .text-right { text-align: right; }
                    .font-normal { font-weight: 400; }
                    .font-semibold { font-weight: 600; }
                    .font-bold { font-weight: 700; }
                    .text-xs { font-size: 0.75rem; }
                    .text-sm { font-size: 0.875rem; }
                    .text-base { font-size: 1rem; }
                    .text-xl { font-size: 1.25rem; }
                    .text-3xl { font-size: 1.875rem; line-height: 1.2;}
                    .text-5xl { font-size: 2.5rem; line-height: 1.1; }
                    
                    @keyframes popIn {
                        0% { opacity: 0; transform: scale(0.95) translateY(20px); filter: blur(10px); }
                        100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: .5; }
                    }
                    .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                    .relative { position: relative; }
                    .absolute { position: absolute; }
                    .-top-1 { top: -0.25rem; }
                    .-right-4 { right: -1rem; }
                </style>
            </head>
            <body>
                ${contentHtml}
            </body>
        `;
    }

    function injectUpperBanner(config) {
        const p = window.location.pathname;
        if(config.pages !== '*' && !config.pages.split(',').map(s=>s.trim()).includes(p)) return;

        const position = config.position || 'fixed';
        const sizeClass = config.fontSize || '0.875rem';
        const glowClass = config.glow ? 'box-shadow: 0 0 20px rgba(139, 92, 246, 0.5); border-bottom: 1px solid rgba(139, 92, 246, 0.4);' : 'box-shadow: 0 4px 20px rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.05);';
        
        let innerHtml = `<span style="font-size: ${sizeClass}; font-weight: 500;">${config.content}</span>`;
        if (config.marquee) {
            innerHtml = `<marquee scrollamount="5" style="font-size: ${sizeClass}; font-weight: 500; width: 100%;">${config.content}</marquee>`;
        }

        const banner = document.createElement('div');
        banner.style.cssText = `
            position: ${position};
            top: 0; left: 0; right: 0;
            background: rgba(17, 24, 39, 0.85);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            color: #f3f4f6;
            z-index: 999999;
            padding: 0.75rem 1.5rem;
            text-align: center;
            display: flex; align-items: center; justify-content: center;
            font-family: system-ui, -apple-system, sans-serif;
            ${glowClass}
        `;
        banner.innerHTML = innerHtml;
        document.body.prepend(banner);

        // Add padding to body so fixed banner doesn't overlap content
        if(position === 'fixed') {
            document.body.style.paddingTop = `calc(${banner.offsetHeight}px + ${document.body.style.paddingTop || '0px'})`;
        }
    }

    // 1. Check Site Status (Closure & Block logic)
    fetch(`${API_URL}/status`)
        .then(res => res.json())
        .then(data => {
            if (data.blocked) {
                injectScreen('blocked');
                return;
            } else if (data.closed) {
                injectScreen('maintenance');
                return;
            }
            
            // Custom Notice injection
            if (data.customNotice) {
                if (data.customNotice.wpb && data.customNotice.wpb.enabled) {
                    injectScreen('wpb', data.customNotice.wpb);
                    return; // Prevents the rest of the site from executing
                }
                if (data.customNotice.unb && data.customNotice.unb.enabled) {
                    const checkBody = setInterval(() => {
                        if(document.body) {
                            injectUpperBanner(data.customNotice.unb);
                            clearInterval(checkBody);
                        }
                    }, 50);
                }
            }
        })
        .catch(err => {
            console.warn('Status proxy degraded:', err);
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
