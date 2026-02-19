(async function () {
    const MIN_VERSIONS = {
        chrome: 90,
        edge: 90,
        firefox: 88,
        safari: 15,
        opera: 90,
        brave: 90,
        vivaldi: 5,
        duckduckgo: 1,
        tor: 12
    };
    
    const FRIENDLY_NAMES = {
        chrome: 'Google Chrome',
        edge: 'Microsoft Edge',
        firefox: 'Mozilla Firefox',
        safari: 'Safari',
        opera: 'Opera',
        brave: 'Brave',
        vivaldi: 'Vivaldi',
        duckduckgo: 'DuckDuckGo Browser',
        tor: 'Tor Browser',
        unknown: 'Unknown Browser'
    };
    
    const TOR_EXIT_CHECK = 'https://check.torproject.org/api/ip';
    
    function parseVersion(ua, regex) {
        const match = ua.match(regex);
        if (!match) return 0;
        const asNumber = parseInt(match[1], 10);
        return Number.isNaN(asNumber) ? 0 : asNumber;
    }
    
    async function isBraveBrowser() {
        try {
            if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
                return await navigator.brave.isBrave();
            }
        } catch (err) {
            console.warn('Brave detection failed', err);
        }
        return false;
    }
    
    async function isTorBrowser(ua) {
        if (/TorBrowser/i.test(ua)) return true;
        
        const firefoxMask = /Firefox\/10[2-9]\.0/i.test(ua) || /Firefox\/115\.0/i.test(ua);
        const hasNoPlugins = typeof navigator.plugins !== 'undefined' && navigator.plugins.length === 0;
        if (firefoxMask && hasNoPlugins) return true;
        
        const isLocalProtocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (isLocalProtocol || offline) {
            return firefoxMask && hasNoPlugins;
        }
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1500);
            const response = await fetch(TOR_EXIT_CHECK, { signal: controller.signal, mode: 'cors' });
            clearTimeout(timeout);
            if (response.ok) {
                const data = await response.json();
                if (data && (data.IsTor || data.is_tor)) {
                    return true;
                }
            }
        } catch (err) {
            console.warn('Tor exit node detection failed', err);
        }
        
        return false;
    }
    
    async function detectBrowser() {
        const ua = navigator.userAgent || '';
        
        if (await isTorBrowser(ua)) {
            return { name: 'tor', version: parseVersion(ua, /Firefox\/(\d+)/i), raw: ua };
        }
        
        if (/DuckDuckGo\//i.test(ua)) {
            return { name: 'duckduckgo', version: parseVersion(ua, /DuckDuckGo\/(\d+)/i), raw: ua };
        }
        
        if (await isBraveBrowser()) {
            return { name: 'brave', version: parseVersion(ua, /Chrome\/(\d+)/i), raw: ua };
        }
        
        if (/Vivaldi\/(\d+)/i.test(ua)) {
            return { name: 'vivaldi', version: parseVersion(ua, /Vivaldi\/(\d+)/i), raw: ua };
        }
        
        if (/OPR\/(\d+)/i.test(ua)) {
            return { name: 'opera', version: parseVersion(ua, /OPR\/(\d+)/i), raw: ua };
        }
        
        if (/Edg\/(\d+)/i.test(ua)) {
            return { name: 'edge', version: parseVersion(ua, /Edg\/(\d+)/i), raw: ua };
        }
        
        const isSafari = /Version\/(\d+).+Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua);
        if (isSafari) {
            return { name: 'safari', version: parseVersion(ua, /Version\/(\d+)/i), raw: ua };
        }
        
        if (/Firefox\/(\d+)/i.test(ua)) {
            return { name: 'firefox', version: parseVersion(ua, /Firefox\/(\d+)/i), raw: ua };
        }
        
        if (/Chrome\/(\d+)/i.test(ua)) {
            return { name: 'chrome', version: parseVersion(ua, /Chrome\/(\d+)/i), raw: ua };
        }
        
        return { name: 'unknown', version: 0, raw: ua };
    }
    
    function detectFeatures() {
        return {
            webgl: (() => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
                } catch {
                    return false;
                }
            })(),
            workers: typeof Worker !== 'undefined',
            wasm: typeof WebAssembly === 'object',
            pointerLock: 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document
        };
    }
    
    function buildIssues(support, browser) {
        const issues = [];
        if (!support.webgl) {
            issues.push('WebGL is not available. Enable hardware acceleration or update your graphics drivers.');
        }
        if (!support.workers) {
            issues.push('Web Workers are required for physics simulations.');
        }
        if (!support.wasm) {
            issues.push('WebAssembly support is required for AI tooling.');
        }
        if (!support.pointerLock) {
            issues.push('Pointer Lock API is unavailable. Camera controls may not work as expected.');
        }
        const minVersion = MIN_VERSIONS[browser.name];
        if (minVersion && browser.version && browser.version < minVersion) {
            issues.push(`Detected ${FRIENDLY_NAMES[browser.name] || browser.name} ${browser.version}. Minimum supported version is ${minVersion}.`);
        }
        return issues;
    }
    
    function getDismissalKey(browser) {
        // Create a key based on browser name and feature signature
        return `grav3_banner_dismissed_${browser.name}`;
    }
    
    function isDismissed(browser) {
        // Check if this banner has been dismissed for this browser
        return localStorage.getItem(getDismissalKey(browser)) === 'true';
    }
    
    function markDismissed(browser) {
        // Mark this banner as dismissed in localStorage
        localStorage.setItem(getDismissalKey(browser), 'true');
    }
    
    function renderWarning(issues, browser) {
        // Don't render if already dismissed
        if (isDismissed(browser)) return;
        
        if (!issues.length) return;
        const render = () => {
            if (document.getElementById('browser-support-warning')) return;
            const wrapper = document.createElement('div');
            wrapper.id = 'browser-support-warning';
            wrapper.innerHTML = `
                <strong>Limited Browser Support Detected</strong>
                <p>The Gravitation³ simulators run best on modern Chromium, Firefox, Safari, Brave, Vivaldi, DuckDuckGo, or Tor Browser builds.
                Your current browser (${browser.friendlyName} ${browser.version || '?'}) is missing critical features:</p>
                <ul>${issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
                <p>Please update your browser or switch to a fully supported option.</p>
                <button type="button" aria-label="Dismiss browser compatibility warning">Dismiss</button>
            `;
            
            // Check for prefers-reduced-motion
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            
            const style = document.createElement('style');
            style.textContent = `
                #browser-support-warning {
                    position: fixed;
                    top: 90px;
                    right: 20px;
                    max-width: 360px;
                    background: rgba(255, 69, 58, 0.12);
                    border: 1px solid rgba(255, 69, 58, 0.5);
                    border-radius: 12px;
                    padding: 16px 20px 12px;
                    color: #fff;
                    font-family: 'Neue Montreal', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    backdrop-filter: blur(8px);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
                    z-index: 2000;
                    ${!prefersReducedMotion ? 'animation: slideInRight 0.3s ease-out;' : ''}
                }
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                #browser-support-warning strong {
                    display: block;
                    margin-bottom: 6px;
                    font-size: 1rem;
                }
                #browser-support-warning ul {
                    margin: 8px 0 12px;
                    padding-left: 20px;
                    font-size: 0.9rem;
                }
                #browser-support-warning button {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    color: #fff;
                    border-radius: 999px;
                    padding: 4px 12px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    transition: ${prefersReducedMotion ? 'none' : 'background 0.2s'};
                }
                #browser-support-warning button:hover {
                    background: rgba(255, 255, 255, 0.08);
                }
            `;
            
            const dismissButton = wrapper.querySelector('button');
            dismissButton.addEventListener('click', () => {
                markDismissed(browser);
                wrapper.remove();
                style.remove();
            });
            
            document.body.appendChild(wrapper);
            document.head.appendChild(style);
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', render, { once: true });
        } else {
            render();
        }
    }
    
    const browser = await detectBrowser();
    browser.friendlyName = FRIENDLY_NAMES[browser.name] || browser.name || 'Unknown Browser';
    
    const support = detectFeatures();
    const issues = buildIssues(support, browser);
    
    window.GravBrowserSupport = {
        browser,
        support,
        issues,
        isSupported: issues.length === 0
    };
    
    renderWarning(issues, browser);
})();
