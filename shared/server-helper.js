/**
 * Server Connection Helper
 * Checks if required servers are running and provides setup instructions
 */

class ServerHelper {
    constructor() {
        this.servers = {
            llm: {
                name: 'LLM Chatbot Server',
                url: 'http://localhost:5001/api/health',
                port: 5001,
                status: 'unknown',
                required: true
            },
            data: {
                name: 'Data Collection Server',
                url: 'http://localhost:5002/api/health',
                port: 5002,
                status: 'unknown',
                required: false
            },
            model: {
                name: 'AI Model Server',
                url: 'http://localhost:5003/api/health',
                port: 5003,
                status: 'unknown',
                required: false
            }
        };
        
        this.notificationShown = false;
        this.checkInterval = null;
    }
    
    /**
     * Start monitoring servers
     */
    async startMonitoring() {
        // Initial check
        await this.checkServers();
        
        // Check every 10 seconds
        this.checkInterval = setInterval(() => {
            this.checkServers();
        }, 10000);
    }
    
    /**
     * Stop monitoring servers
     */
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    
    /**
     * Check if all servers are running
     */
    async checkServers() {
        const results = await Promise.all([
            this.checkServer('data'),
            this.checkServer('llm')
        ]);
        
        const allRunning = results.every(r => r);
        
        if (!allRunning && !this.notificationShown) {
            this.showSetupNotification();
        } else if (allRunning && this.notificationShown) {
            this.hideSetupNotification();
        }
        
        return allRunning;
    }
    
    /**
     * Check if a specific server is running
     */
    async checkServer(serverKey) {
        const server = this.servers[serverKey];
        
        try {
            const response = await fetch(server.url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
            
            server.status = response.ok ? 'running' : 'error';
            return response.ok;
        } catch (error) {
            server.status = 'offline';
            return false;
        }
    }
    
    /**
     * Show setup notification with instructions
     */
    showSetupNotification() {
        if (this.notificationShown) return;
        
        const offlineServers = Object.entries(this.servers)
            .filter(([key, server]) => server.status !== 'running')
            .map(([key, server]) => server);
        
        if (offlineServers.length === 0) return;
        
        const notification = document.createElement('div');
        notification.id = 'server-setup-notification';
        notification.className = 'server-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <div class="notification-icon">⚠️</div>
                    <h3>AI Servers Not Running</h3>
                    <button class="notification-close" onclick="document.getElementById('server-setup-notification').remove()">×</button>
                </div>
                <p class="notification-message">
                    The AI chatbot requires backend servers to be running. 
                    ${offlineServers.length === 2 ? 'Both servers are' : 'At least one server is'} currently offline.
                    <br><br>
                    <strong>Note:</strong> For security reasons, you need to manually start these servers in your terminal before using the AI features.
                </p>
                <div class="server-status-list">
                    ${Object.entries(this.servers).map(([key, server]) => `
                        <div class="server-status-item ${server.status}">
                            <span class="status-icon">${server.status === 'running' ? '✅' : '❌'}</span>
                            <span class="server-name">${server.name}</span>
                            <span class="status-text">${server.status === 'running' ? 'Running' : 'Offline'}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="notification-instructions">
                    <p><strong>Quick Start:</strong></p>
                    <div class="terminal-commands">
                        <div class="terminal-block">
                            <div class="terminal-label">Terminal 1 - Data Server:</div>
                            <code>cd api && ./start_data_server.sh</code>
                        </div>
                        <div class="terminal-block">
                            <div class="terminal-label">Terminal 2 - LLM Chatbot Server:</div>
                            <code>cd api && ./start_llm_server.sh</code>
                        </div>
                        <div class="terminal-block">
                            <div class="terminal-label">Terminal 3 - AI Model Server:</div>
                            <code>cd api && ./start_model_server.sh</code>
                        </div>
                    </div>
                    <p class="help-text">
                        Or run all servers together: <code style="display: inline-block; background: rgba(0, 0, 0, 0.3); padding: 2px 6px; border-radius: 3px; margin: 4px 0;">cd scripts && bash start_api.sh</code>
                        <br><br>
                        See <a href="../docs/LIVE_DATA_ACCESS_GUIDE.md" target="_blank">LIVE_DATA_ACCESS_GUIDE.md</a> for detailed setup instructions.
                    </p>
                </div>
                <div class="notification-actions">
                    <button class="notification-btn retry" onclick="window.ServerHelper?.checkServers()">
                        🔄 Check Again
                    </button>
                    <button class="notification-btn dismiss" onclick="document.getElementById('server-setup-notification').style.display='none'">
                        Dismiss
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        this.notificationShown = true;
        
        // Add styles if not already present
        if (!document.getElementById('server-helper-styles')) {
            this.addStyles();
        }
    }
    
    /**
     * Hide setup notification
     */
    hideSetupNotification() {
        const notification = document.getElementById('server-setup-notification');
        if (notification) {
            notification.remove();
        }
        this.notificationShown = false;
    }
    
    /**
     * Add notification styles
     */
    addStyles() {
        const style = document.createElement('style');
        style.id = 'server-helper-styles';
        style.textContent = `
            .server-notification {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 550px;
                max-width: calc(100vw - 800px);
                background: rgba(26, 31, 58, 0.98);
                backdrop-filter: blur(20px);
                border: 2px solid rgba(249, 115, 22, 0.5);
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5),
                            0 0 60px rgba(249, 115, 22, 0.3);
                z-index: 10000;
                font-family: 'Neue Montreal', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                animation: fadeInScale 0.3s ease;
            }
            
            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            .notification-content {
                padding: 24px;
            }
            
            .notification-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            
            .notification-icon {
                font-size: 28px;
            }
            
            .notification-header h3 {
                flex: 1;
                margin: 0;
                font-size: 18px;
                font-weight: 700;
                background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .notification-close {
                background: transparent;
                border: none;
                color: #94a3b8;
                font-size: 28px;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s;
            }
            
            .notification-close:hover {
                background: var(--bg-overlay, rgba(255, 255, 255, 0.1));
                color: white;
            }
            
            .notification-message {
                color: #e0e6ed;
                font-size: 14px;
                line-height: 1.6;
                margin: 0 0 16px 0;
            }
            
            .server-status-list {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .server-status-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                margin-bottom: 4px;
                border-radius: 6px;
                font-size: 13px;
                background: rgba(255, 140, 0, 0.15) !important;
                border: 1px solid #ff8c00;
                box-shadow: 0 0 15px rgba(255, 140, 0, 0.4),
                            inset 0 0 15px rgba(255, 140, 0, 0.1),
                            0 0 30px rgba(255, 140, 0, 0.25);
                animation: orange-glow-pulse 2s ease-in-out infinite;
            }
            
            .server-status-item:last-child {
                margin-bottom: 0;
            }
            
            @keyframes orange-glow-pulse {
                0% {
                    box-shadow: 0 0 15px rgba(255, 140, 0, 0.4),
                                inset 0 0 15px rgba(255, 140, 0, 0.1),
                                0 0 30px rgba(255, 140, 0, 0.25);
                }
                50% {
                    box-shadow: 0 0 25px rgba(255, 140, 0, 0.6),
                                inset 0 0 25px rgba(255, 140, 0, 0.2),
                                0 0 45px rgba(255, 140, 0, 0.4);
                }
                100% {
                    box-shadow: 0 0 15px rgba(255, 140, 0, 0.4),
                                inset 0 0 15px rgba(255, 140, 0, 0.1),
                                0 0 30px rgba(255, 140, 0, 0.25);
                }
            }
            
            .status-icon {
                font-size: 16px;
            }
            
            .server-name {
                flex: 1;
                color: #e0e6ed;
                font-weight: 500;
            }
            
            .status-text {
                color: #94a3b8;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .notification-instructions {
                background: rgba(124, 58, 237, 0.1);
                border: 1px solid rgba(124, 58, 237, 0.3);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .notification-instructions p {
                margin: 0 0 12px 0;
                color: #e0e6ed;
                font-size: 14px;
            }
            
            .notification-instructions strong {
                color: #a78bfa;
            }
            
            .terminal-commands {
                margin-bottom: 12px;
            }
            
            .terminal-block {
                margin-bottom: 12px;
            }
            
            .terminal-block:last-child {
                margin-bottom: 0;
            }
            
            .terminal-label {
                color: #94a3b8;
                font-size: 12px;
                margin-bottom: 4px;
                font-weight: 500;
            }
            
            .terminal-commands code {
                display: block;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
                padding: 10px 14px;
                border-radius: 6px;
                color: #00d4ff;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                user-select: all;
                cursor: text;
            }
            
            .help-text {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 12px;
            }
            
            .help-text a {
                color: #a78bfa;
                text-decoration: none;
                border-bottom: 1px solid rgba(167, 139, 250, 0.3);
                transition: all 0.2s;
            }
            
            .help-text a:hover {
                color: #c4b5fd;
                border-bottom-color: rgba(196, 181, 253, 0.6);
            }
            
            .notification-actions {
                display: flex;
                gap: 8px;
            }
            
            .notification-btn {
                flex: 1;
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            
            .notification-btn.retry {
                background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
                color: white;
            }
            
            .notification-btn.retry:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
            }
            
            .notification-btn.dismiss {
                background: var(--bg-overlay, rgba(255, 255, 255, 0.05));
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
                color: #94a3b8;
            }
            
            .notification-btn.dismiss:hover {
                background: var(--bg-overlay, rgba(255, 255, 255, 0.1));
                color: white;
            }
            
            @media (max-width: 1200px) {
                .server-notification {
                    max-width: calc(100vw - 100px);
                }
            }
            
            @media (max-width: 768px) {
                .server-notification {
                    top: 50%;
                    left: 16px;
                    right: 16px;
                    width: auto;
                    max-width: none;
                    transform: translate(0, -50%);
                }
                
                @keyframes fadeInScale {
                    from {
                        opacity: 0;
                        transform: translate(0, -50%) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translate(0, -50%) scale(1);
                    }
                }
                
                .notification-content {
                    padding: 20px;
                }
                
                .terminal-commands code {
                    font-size: 11px;
                    padding: 8px 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Create global instance
window.ServerHelper = new ServerHelper();

// Auto-start monitoring when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ServerHelper.startMonitoring();
    });
} else {
    window.ServerHelper.startMonitoring();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServerHelper;
}
