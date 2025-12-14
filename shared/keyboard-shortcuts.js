/**
 * Keyboard Shortcuts Manager for Gravitation³ Simulations
 * Displays help modal and handles keyboard shortcuts consistently
 */

class KeyboardShortcuts {
    constructor(options = {}) {
        this.modal = null;
        this.isModalOpen = false;
        const platform = typeof navigator !== 'undefined' && navigator.platform
            ? navigator.platform.toUpperCase()
            : '';
        this.isMac = platform.includes('MAC');
        
        this.shortcuts = options.shortcuts || this.getDefaultShortcuts();
        this.customShortcuts = options.customShortcuts || {};
        this.onShortcut = options.onShortcut || (() => {});
        
        // Merge custom shortcuts with default ones
        this.shortcuts = { ...this.shortcuts, ...this.customShortcuts };
        
        this.init();
    }

    getDefaultShortcuts() {
        const cmdKey = this.isMac ? 'cmd' : 'ctrl';
        
        return {
            help: {
                keys: ['?', 'h'],
                modifiers: [],
                description: 'Show this help menu',
                category: 'General'
            },
            pause: {
                keys: ['Space'],
                modifiers: [],
                description: 'Pause/Resume simulation',
                category: 'Simulation'
            },
            reset: {
                keys: ['r'],
                modifiers: [],
                description: 'Reset simulation',
                category: 'Simulation'
            },
            performance: {
                keys: ['p'],
                modifiers: ['shift'],
                description: 'Toggle performance monitor',
                category: 'View'
            },
            trails: {
                keys: ['t'],
                modifiers: [],
                description: 'Toggle trails',
                category: 'View'
            },
            clearTrails: {
                keys: ['c'],
                modifiers: [],
                description: 'Clear trails',
                category: 'View'
            },
            velocities: {
                keys: ['v'],
                modifiers: [],
                description: 'Toggle velocity arrows',
                category: 'View'
            },
            grid: {
                keys: ['g'],
                modifiers: [],
                description: 'Toggle grid',
                category: 'View'
            },
            screenshot: {
                keys: ['s'],
                modifiers: [cmdKey],
                description: 'Take screenshot',
                category: 'Actions'
            },
            export: {
                keys: ['e'],
                modifiers: [cmdKey],
                description: 'Export simulation data',
                category: 'Actions'
            },
            panLeft: {
                keys: ['a', 'ArrowLeft'],
                modifiers: ['shift'],
                description: 'Pan camera left',
                category: 'Camera'
            },
            panRight: {
                keys: ['d', 'ArrowRight'],
                modifiers: ['shift'],
                description: 'Pan camera right',
                category: 'Camera'
            },
            panUp: {
                keys: ['w', 'ArrowUp'],
                modifiers: ['shift'],
                description: 'Pan camera up',
                category: 'Camera'
            },
            panDown: {
                keys: ['s', 'ArrowDown'],
                modifiers: ['shift'],
                description: 'Pan camera down',
                category: 'Camera'
            },
            zoomIn: {
                keys: ['+', '='],
                modifiers: [],
                description: 'Zoom in',
                category: 'Camera'
            },
            zoomOut: {
                keys: ['-'],
                modifiers: [],
                description: 'Zoom out',
                category: 'Camera'
            },
            centerView: {
                keys: ['0'],
                modifiers: [],
                description: 'Center view',
                category: 'Camera'
            }
        };
    }

    init() {
        // Create modal
        this.createModal();
        
        // Add keyboard event listener
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Show tooltip on first visit
        this.showFirstVisitTooltip();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'keyboard-shortcuts-modal';
        this.modal.className = 'keyboard-modal';
        this.modal.style.display = 'none';
        
        const overlay = document.createElement('div');
        overlay.className = 'keyboard-overlay';
        overlay.addEventListener('click', () => this.closeModal());
        
        const content = document.createElement('div');
        content.className = 'keyboard-content';
        
        const header = document.createElement('div');
        header.className = 'keyboard-header';
        header.innerHTML = `
            <h2>Keyboard Shortcuts</h2>
            <button class="keyboard-close" title="Close (Esc)">×</button>
        `;
        
        const shortcutsContainer = document.createElement('div');
        shortcutsContainer.className = 'keyboard-shortcuts';
        
        // Group shortcuts by category
        const categories = {};
        for (const [id, shortcut] of Object.entries(this.shortcuts)) {
            const category = shortcut.category || 'Other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({ id, ...shortcut });
        }
        
        // Render each category
        for (const [category, shortcuts] of Object.entries(categories)) {
            const categorySection = document.createElement('div');
            categorySection.className = 'keyboard-category';
            
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = category;
            categorySection.appendChild(categoryTitle);
            
            const shortcutsList = document.createElement('div');
            shortcutsList.className = 'keyboard-list';
            
            shortcuts.forEach(shortcut => {
                const item = document.createElement('div');
                item.className = 'keyboard-item';
                
                const keys = document.createElement('div');
                keys.className = 'keyboard-keys';
                
                // Add modifier keys
                if (shortcut.modifiers && shortcut.modifiers.length > 0) {
                    shortcut.modifiers.forEach(modifier => {
                        const modKey = document.createElement('kbd');
                        modKey.textContent = this.formatKey(modifier);
                        keys.appendChild(modKey);
                        
                        const plus = document.createElement('span');
                        plus.textContent = '+';
                        plus.className = 'key-plus';
                        keys.appendChild(plus);
                    });
                }
                
                // Add main key (show first one if multiple)
                const mainKey = document.createElement('kbd');
                mainKey.textContent = this.formatKey(shortcut.keys[0]);
                keys.appendChild(mainKey);
                
                // If there are alternative keys, show them
                if (shortcut.keys.length > 1) {
                    const or = document.createElement('span');
                    or.textContent = 'or';
                    or.className = 'key-or';
                    keys.appendChild(or);
                    
                    const altKey = document.createElement('kbd');
                    altKey.textContent = this.formatKey(shortcut.keys[1]);
                    keys.appendChild(altKey);
                }
                
                const description = document.createElement('div');
                description.className = 'keyboard-description';
                description.textContent = shortcut.description;
                
                item.appendChild(keys);
                item.appendChild(description);
                shortcutsList.appendChild(item);
            });
            
            categorySection.appendChild(shortcutsList);
            shortcutsContainer.appendChild(categorySection);
        }
        
        const platformNote = document.createElement('p');
        platformNote.className = 'keyboard-platform-note';
        platformNote.textContent = this.isMac
            ? 'Modifier shortcuts use ⌘ on macOS. Use Ctrl on Windows/Linux.'
            : 'Modifier shortcuts use Ctrl on Windows/Linux. Use ⌘ on macOS.';

        content.appendChild(header);
        content.appendChild(platformNote);
        content.appendChild(shortcutsContainer);
        
        this.modal.appendChild(overlay);
        this.modal.appendChild(content);
        
        document.body.appendChild(this.modal);
        
        // Add event listeners
        const closeBtn = header.querySelector('.keyboard-close');
        closeBtn.addEventListener('click', () => this.closeModal());
        
        // Inject styles
        this.injectStyles();
    }

    formatKey(key) {
        const keyMap = {
            'meta': this.isMac ? '⌘' : 'Ctrl',
            'cmd': this.isMac ? '⌘' : 'Ctrl',
            'command': this.isMac ? '⌘' : 'Ctrl',
            'ctrl': this.isMac ? '⌃' : 'Ctrl',
            'control': this.isMac ? '⌃' : 'Ctrl',
            'alt': this.isMac ? '⌥' : 'Alt',
            'option': this.isMac ? '⌥' : 'Alt',
            'shift': this.isMac ? '⇧' : 'Shift',
            'Space': '␣ Space',
            'ArrowUp': '↑',
            'ArrowDown': '↓',
            'ArrowLeft': '←',
            'ArrowRight': '→',
            'Enter': '↵ Enter',
            'Escape': 'Esc',
            'Backspace': '⌫',
            'Delete': 'Del',
            'Tab': '⇥ Tab'
        };
        
        return keyMap[key] || key.toUpperCase();
    }

    handleKeyPress(event) {
        // Don't handle shortcuts when typing in input fields
        if (event.target.matches('input, textarea, select')) {
            return;
        }
        
        const key = event.key.toLowerCase();
        const hasCtrl = event.ctrlKey || event.metaKey; // metaKey for Mac Command
        const hasAlt = event.altKey;
        const hasShift = event.shiftKey;
        
        // Special case for help modal
        if ((key === '?' || (key === 'h' && !hasCtrl && !hasAlt)) && !this.isModalOpen) {
            event.preventDefault();
            this.openModal();
            return;
        }
        
        // Close modal with Escape
        if (key === 'escape' && this.isModalOpen) {
            event.preventDefault();
            this.closeModal();
            return;
        }
        
        // Don't process other shortcuts when modal is open
        if (this.isModalOpen) {
            return;
        }
        
        // Check each shortcut
        for (const [id, shortcut] of Object.entries(this.shortcuts)) {
            if (!shortcut.keys.includes(key) && !shortcut.keys.includes(event.key)) {
                continue;
            }
            
            // Check modifiers
            const requiresCtrl = shortcut.modifiers && (
                shortcut.modifiers.includes('ctrl') ||
                shortcut.modifiers.includes('cmd') ||
                shortcut.modifiers.includes('command') ||
                shortcut.modifiers.includes('meta')
            );
            const requiresAlt = shortcut.modifiers && shortcut.modifiers.includes('alt');
            const requiresShift = shortcut.modifiers && shortcut.modifiers.includes('shift');
            
            if (requiresCtrl !== hasCtrl) continue;
            if (requiresAlt !== hasAlt) continue;
            if (requiresShift !== hasShift) continue;
            
            // Match found!
            event.preventDefault();
            this.onShortcut(id, event);
            return;
        }
    }

    openModal() {
        this.isModalOpen = true;
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Mark as visited
        localStorage.setItem('gravitation-shortcuts-seen', 'true');
    }

    closeModal() {
        this.isModalOpen = false;
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    showFirstVisitTooltip() {
        const hasSeenShortcuts = localStorage.getItem('gravitation-shortcuts-seen');
        if (hasSeenShortcuts) return;
        
        // Show a subtle tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'keyboard-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <strong>💡 Tip:</strong> Press <kbd>?</kbd> to see keyboard shortcuts
                <button class="tooltip-close">×</button>
            </div>
        `;
        
        document.body.appendChild(tooltip);
        
        const closeBtn = tooltip.querySelector('.tooltip-close');
        closeBtn.addEventListener('click', () => {
            tooltip.remove();
            localStorage.setItem('gravitation-shortcuts-seen', 'true');
        });
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, 10000);
    }

    injectStyles() {
        if (document.getElementById('keyboard-shortcuts-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'keyboard-shortcuts-styles';
        style.textContent = `
            .keyboard-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                align-items: center;
                justify-content: center;
            }
            
            .keyboard-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(4px);
            }
            
            .keyboard-content {
                position: relative;
                background: linear-gradient(135deg, var(--primary-dark, #0a0e27) 0%, var(--secondary-dark, #1a1e3a) 100%);
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
                border-radius: 16px;
                max-width: 800px;
                max-height: 85vh;
                width: 90%;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .keyboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px;
                border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
                position: sticky;
                top: 0;
                background: var(--surface-glass, rgba(10, 14, 39, 0.95));
                backdrop-filter: blur(10px);
                z-index: 1;
            }
            
            .keyboard-header h2 {
                margin: 0;
                color: var(--accent-blue, #00d4ff);
                font-size: 24px;
                font-weight: 600;
            }
            
            .keyboard-close {
                background: none;
                border: none;
                color: var(--text-primary, #ffffff);
                font-size: 32px;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                line-height: 1;
                opacity: 0.6;
                transition: opacity 0.2s;
            }
            
            .keyboard-close:hover {
                opacity: 1;
            }
            
            .keyboard-shortcuts {
                padding: 24px;
            }
            
            .keyboard-platform-note {
                margin: 0;
                padding: 12px 24px 0 24px;
                color: var(--text-secondary, rgba(255, 255, 255, 0.65));
                font-size: 13px;
            }
            
            .keyboard-category {
                margin-bottom: 32px;
            }
            
            .keyboard-category:last-child {
                margin-bottom: 0;
            }
            
            .keyboard-category h3 {
                color: var(--accent-purple, #8b5cf6);
                font-size: 16px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 0 0 16px 0;
            }
            
            .keyboard-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .keyboard-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background: var(--bg-overlay, rgba(255, 255, 255, 0.03));
                border: 1px solid transparent;
                border-radius: 8px;
                transition: background 0.2s;
            }
            
            .keyboard-item:hover {
                background: var(--surface-muted, rgba(255, 255, 255, 0.08));
                border-color: var(--border-color, rgba(255, 255, 255, 0.1));
            }
            
            .keyboard-keys {
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 200px;
            }
            
            .keyboard-keys kbd {
                background: linear-gradient(180deg, var(--surface-muted, #2a2f47) 0%, var(--surface-glass, #1a1e35) 100%);
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
                border-bottom-width: 3px;
                border-radius: 6px;
                padding: 6px 12px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                font-weight: 600;
                color: var(--text-primary, #ffffff);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                min-width: 32px;
                text-align: center;
            }
            
            .key-plus, .key-or {
                color: var(--text-muted, rgba(255, 255, 255, 0.4));
                font-size: 12px;
            }
            
            .keyboard-description {
                color: var(--text-primary, rgba(255, 255, 255, 0.8));
                font-size: 14px;
                flex: 1;
                text-align: right;
            }
            
            .keyboard-tooltip {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 9999;
                animation: slideInUp 0.5s ease-out;
            }
            
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .tooltip-content {
                background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 300px;
            }
            
            .tooltip-content strong {
                white-space: nowrap;
            }
            
            .tooltip-content kbd {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                padding: 4px 8px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                font-weight: 600;
            }
            
            .tooltip-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                line-height: 1;
                border-radius: 50%;
                margin-left: auto;
                transition: background 0.2s;
            }
            
            .tooltip-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            @media (max-width: 768px) {
                .keyboard-content {
                    max-width: 95%;
                    max-height: 90vh;
                }
                
                .keyboard-header {
                    padding: 16px;
                }
                
                .keyboard-header h2 {
                    font-size: 20px;
                }
                
                .keyboard-shortcuts {
                    padding: 16px;
                }
                
                .keyboard-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                
                .keyboard-keys {
                    min-width: auto;
                }
                
                .keyboard-description {
                    text-align: left;
                }
                
                .keyboard-tooltip {
                    bottom: 20px;
                    right: 20px;
                    left: 20px;
                }
                
                .tooltip-content {
                    min-width: auto;
                    font-size: 13px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    destroy() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        
        // Remove tooltip if it exists
        const tooltip = document.querySelector('.keyboard-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
}
