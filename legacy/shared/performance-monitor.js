/**
 * Performance Monitor Widget for Gravitation³ Simulations
 * Displays FPS, step time, render time, and provides device optimization
 */

class PerformanceMonitor {
    constructor(options = {}) {
        this.container = null;
        this.statsElement = null;
        this.visible = options.visible !== false; // Visible by default
        this.positionKey = 'gravPerfMonitorPosition';
        this.position = this.resolveInitialPosition(options.position); // top-left, top-right, bottom-left, bottom-right
        this.protectedSelectors = options.protectedSelectors || [
            '.nav-ribbon',
            '.sim-header',
            '.controls-panel',
            '.control-panel',
            '.sim-controls',
            '.server-notification',
            '#server-setup-notification',
            '.ai-status'
        ];
        this.resizeTimer = null;
        this.boundHandleResize = this.handleResize.bind(this);
        
        // Performance metrics
        this.fps = 0;
        this.frameCount = 0;
        this.lastFrameTime = Date.now();
        this.stepTime = 0;
        this.renderTime = 0;
        this.lastStepStart = 0;
        this.lastRenderStart = 0;
        
        // Moving averages for smoother display
        this.fpsHistory = [];
        this.stepTimeHistory = [];
        this.renderTimeHistory = [];
        this.historyLength = 30; // Average over 30 frames
        
        // Performance thresholds
        this.thresholds = {
            fps: { good: 55, warning: 30, poor: 0 },
            stepTime: { good: 0, warning: 5, poor: 10 }, // milliseconds
            renderTime: { good: 0, warning: 12, poor: 25 } // milliseconds
        };
        
        this.init();
    }

    init() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'performance-monitor';
        this.container.className = 'performance-monitor';
        this.container.style.display = this.visible ? 'block' : 'none';
        
        // Create header with toggle button
        const header = document.createElement('div');
        header.className = 'perf-header';
        header.innerHTML = `
            <span class="perf-title">Performance</span>
            <div class="perf-actions">
                <button class="perf-move" title="Move widget">⇲</button>
                <button class="perf-close" title="Close (Shift+P)">×</button>
            </div>
        `;
        
        // Create stats display
        this.statsElement = document.createElement('div');
        this.statsElement.className = 'perf-stats';
        this.statsElement.innerHTML = `
            <div class="perf-stat">
                <span class="perf-label">FPS:</span>
                <span class="perf-value perf-fps" data-status="good">--</span>
            </div>
            <div class="perf-stat">
                <span class="perf-label">Step:</span>
                <span class="perf-value perf-step" data-status="good">-- ms</span>
            </div>
            <div class="perf-stat">
                <span class="perf-label">Render:</span>
                <span class="perf-value perf-render" data-status="good">-- ms</span>
            </div>
        `;
        
        this.container.appendChild(header);
        this.container.appendChild(this.statsElement);
        
        // Add to document
        document.body.appendChild(this.container);
        
        // Add event listeners
        const closeBtn = header.querySelector('.perf-close');
        closeBtn.addEventListener('click', () => this.toggle());
        const moveBtn = header.querySelector('.perf-move');
        moveBtn.addEventListener('click', () => this.cyclePosition());
        
        // Apply styles
        this.injectStyles();
        this.applyPosition(false);
        this.ensureNoOverlap();
        window.addEventListener('resize', this.boundHandleResize);
    }

    injectStyles() {
        if (document.getElementById('performance-monitor-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'performance-monitor-styles';
        style.textContent = `
            .performance-monitor {
                position: fixed;
                background: var(--surface-glass, rgba(10, 14, 39, 0.95));
                border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
                border-radius: 8px;
                padding: 12px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                color: var(--text-primary, #ffffff);
                z-index: 9999;
                min-width: 180px;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .performance-monitor.top-left {
                top: 20px;
                left: 20px;
            }
            
            .performance-monitor.top-right {
                top: 20px;
                right: 20px;
            }
            
            .performance-monitor.bottom-left {
                bottom: 20px;
                left: 20px;
            }
            
            .performance-monitor.bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .perf-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
            }
            
            .perf-title {
                font-weight: bold;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--accent-blue, #00d4ff);
            }
            
            .perf-actions {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .perf-move {
                background: none;
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: var(--text-primary, #ffffff);
                font-size: 13px;
                cursor: pointer;
                padding: 0 6px;
                height: 24px;
                border-radius: 4px;
                line-height: 1;
                opacity: 0.75;
                transition: opacity 0.2s, background 0.2s;
            }
            
            .perf-move:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.08);
            }
            
            .perf-close {
                background: none;
                border: none;
                color: var(--text-primary, #ffffff);
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                line-height: 1;
                opacity: 0.6;
                transition: opacity 0.2s;
            }
            
            .perf-close:hover {
                opacity: 1;
            }
            
            .perf-stats {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .perf-stat {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .perf-label {
                color: var(--text-secondary, rgba(255, 255, 255, 0.7));
                font-weight: 500;
            }
            
            .perf-value {
                font-weight: bold;
                padding: 2px 8px;
                border-radius: 4px;
                min-width: 70px;
                text-align: right;
            }
            
            .perf-value[data-status="good"] {
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
            }
            
            .perf-value[data-status="warning"] {
                background: rgba(251, 191, 36, 0.2);
                color: #fbbf24;
            }
            
            .perf-value[data-status="poor"] {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }
            
            @media (max-width: 768px) {
                .performance-monitor {
                    font-size: 11px;
                    padding: 10px;
                    min-width: 160px;
                }
                
                .performance-monitor.top-right,
                .performance-monitor.bottom-right {
                    right: 10px;
                }
                
                .performance-monitor.top-left,
                .performance-monitor.bottom-left {
                    left: 10px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Call this at the start of each simulation step
    startStepTimer() {
        this.lastStepStart = performance.now();
    }

    // Call this at the end of each simulation step
    endStepTimer() {
        if (this.lastStepStart > 0) {
            this.stepTime = performance.now() - this.lastStepStart;
            this.stepTimeHistory.push(this.stepTime);
            if (this.stepTimeHistory.length > this.historyLength) {
                this.stepTimeHistory.shift();
            }
        }
    }

    // Call this at the start of each render
    startRenderTimer() {
        this.lastRenderStart = performance.now();
    }

    // Call this at the end of each render
    endRenderTimer() {
        if (this.lastRenderStart > 0) {
            this.renderTime = performance.now() - this.lastRenderStart;
            this.renderTimeHistory.push(this.renderTime);
            if (this.renderTimeHistory.length > this.historyLength) {
                this.renderTimeHistory.shift();
            }
        }
    }

    // Call this once per frame to update FPS
    update() {
        const currentTime = Date.now();
        this.frameCount++;
        
        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.fpsHistory.push(this.fps);
            if (this.fpsHistory.length > this.historyLength) {
                this.fpsHistory.shift();
            }
            
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
            
            this.updateDisplay();
        }
    }

    updateDisplay() {
        if (!this.visible) return;
        
        // Calculate averages
        const avgFps = this.getAverage(this.fpsHistory);
        const avgStepTime = this.getAverage(this.stepTimeHistory);
        const avgRenderTime = this.getAverage(this.renderTimeHistory);
        
        // Update FPS
        const fpsElement = this.statsElement.querySelector('.perf-fps');
        fpsElement.textContent = avgFps.toFixed(0);
        fpsElement.setAttribute('data-status', this.getStatus('fps', avgFps));
        
        // Update Step Time
        const stepElement = this.statsElement.querySelector('.perf-step');
        stepElement.textContent = avgStepTime.toFixed(2) + ' ms';
        stepElement.setAttribute('data-status', this.getStatus('stepTime', avgStepTime));
        
        // Update Render Time
        const renderElement = this.statsElement.querySelector('.perf-render');
        renderElement.textContent = avgRenderTime.toFixed(2) + ' ms';
        renderElement.setAttribute('data-status', this.getStatus('renderTime', avgRenderTime));
    }

    getAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

    getStatus(metric, value) {
        const thresholds = this.thresholds[metric];
        
        if (metric === 'fps') {
            if (value >= thresholds.good) return 'good';
            if (value >= thresholds.warning) return 'warning';
            return 'poor';
        } else {
            // For time metrics, lower is better
            if (value <= thresholds.warning) return 'good';
            if (value <= thresholds.poor) return 'warning';
            return 'poor';
        }
    }

    toggle() {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'block' : 'none';
        if (this.visible) {
            this.refreshPosition();
        }
    }

    show() {
        this.visible = true;
        this.container.style.display = 'block';
        this.refreshPosition();
    }

    hide() {
        this.visible = false;
        this.container.style.display = 'none';
    }

    getMetrics() {
        return {
            fps: this.getAverage(this.fpsHistory),
            stepTime: this.getAverage(this.stepTimeHistory),
            renderTime: this.getAverage(this.renderTimeHistory),
            totalTime: this.getAverage(this.stepTimeHistory) + this.getAverage(this.renderTimeHistory)
        };
    }

    // Suggest optimizations based on performance
    getSuggestions() {
        const metrics = this.getMetrics();
        const suggestions = [];
        
        if (metrics.fps < 30) {
            suggestions.push('Low FPS detected. Try reducing trail length or particles.');
        }
        
        if (metrics.stepTime > 10) {
            suggestions.push('Simulation step is slow. Consider increasing time step (dt).');
        }
        
        if (metrics.renderTime > 25) {
            suggestions.push('Rendering is slow. Try disabling effects or reducing quality.');
        }
        
        if (metrics.totalTime > 33) { // More than 33ms = less than 30 FPS
            suggestions.push('Overall performance is poor. Consider using a lower resolution or simpler settings.');
        }
        
        return suggestions;
    }

    resolveInitialPosition(initialPosition) {
        const allowed = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        if (initialPosition && allowed.includes(initialPosition)) return initialPosition;
        try {
            const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(this.positionKey) : null;
            if (stored && allowed.includes(stored)) return stored;
        } catch (err) {
            // Ignore storage errors (private browsing, etc.)
        }
        return 'top-right';
    }

    savePosition() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.positionKey, this.position);
            }
        } catch (err) {
            // ignore
        }
    }

    applyPosition(save = true) {
        if (!this.container) return;
        const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        this.container.classList.remove(...positions);
        this.container.classList.add(this.position);
        
        const offsets = this.getOffsetsForPosition(this.position);
        ['top', 'right', 'bottom', 'left'].forEach((prop) => {
            this.container.style[prop] = offsets[prop] !== undefined ? offsets[prop] : '';
        });
        
        if (save) this.savePosition();
    }

    getOffsetsForPosition(position) {
        const prefersNarrow = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 768px)').matches : false;
        const margin = prefersNarrow ? 10 : 20;
        const topOffset = `${this.getSafeTopOffset()}px`;
        const bottomOffset = `${this.getSafeBottomOffset()}px`;
        switch (position) {
            case 'top-left':
                return { top: topOffset, left: `${margin}px` };
            case 'bottom-left':
                return { bottom: bottomOffset, left: `${margin}px` };
            case 'bottom-right':
                return { bottom: bottomOffset, right: `${margin}px` };
            case 'top-right':
            default:
                return { top: topOffset, right: `${margin}px` };
        }
    }

    getSafeTopOffset() {
        const baseOffset = 20;
        const candidates = [baseOffset];
        ['.nav-ribbon', '.sim-header'].forEach((selector) => {
            const el = document.querySelector(selector);
            if (this.isElementVisible(el)) {
                const rect = el.getBoundingClientRect();
                candidates.push(Math.max(0, rect.bottom) + 20);
            }
        });
        return Math.min(Math.max(...candidates), Math.max(20, window.innerHeight - 200));
    }

    getSafeBottomOffset() {
        const baseOffset = 20;
        const candidates = [baseOffset];
        ['.ai-status', '.footer'].forEach((selector) => {
            const el = document.querySelector(selector);
            if (this.isElementVisible(el)) {
                const rect = el.getBoundingClientRect();
                const distanceFromViewportBottom = window.innerHeight - rect.bottom;
                if (distanceFromViewportBottom < 200) {
                    candidates.push(rect.height + 40);
                }
            }
        });
        return Math.min(Math.max(...candidates), Math.max(20, window.innerHeight - 200));
    }

    ensureNoOverlap() {
        if (!this.container) return;
        const tried = new Set();
        let safety = 0;
        while (this.detectOverlap() && safety < 8) {
            tried.add(this.position);
            this.position = this.nextPosition(this.position);
            this.applyPosition(false);
            safety++;
            if (tried.has(this.position)) break;
        }
        this.savePosition();
    }

    detectOverlap() {
        if (!this.container) return false;
        const containerRect = this.container.getBoundingClientRect();
        return this.protectedSelectors.some((selector) => {
            const elements = document.querySelectorAll(selector);
            return Array.from(elements).some((el) => {
                if (!this.isElementVisible(el)) return false;
                const rect = el.getBoundingClientRect();
                if (!rect.width && !rect.height) return false;
                return this.rectsIntersect(containerRect, rect);
            });
        });
    }

    rectsIntersect(a, b) {
        return !(
            a.right < b.left ||
            a.left > b.right ||
            a.bottom < b.top ||
            a.top > b.bottom
        );
    }

    cyclePosition(direction = 1) {
        this.position = this.nextPosition(this.position, direction);
        this.applyPosition();
        this.ensureNoOverlap();
    }

    nextPosition(current, direction = 1) {
        const positions = ['top-right', 'bottom-right', 'bottom-left', 'top-left'];
        const index = positions.includes(current) ? positions.indexOf(current) : 0;
        const offset = direction >= 0 ? 1 : -1;
        const nextIndex = (index + offset + positions.length) % positions.length;
        return positions[nextIndex];
    }

    refreshPosition() {
        this.applyPosition(false);
        this.ensureNoOverlap();
    }

    handleResize() {
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() => {
            this.refreshPosition();
        }, 150);
    }

    isElementVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        window.removeEventListener('resize', this.boundHandleResize);
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = null;
        }
    }
}
