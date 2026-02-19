/**
 * Error Handling Utility for Simulations
 * Detects and recovers from numerical errors (NaN, Infinity)
 */

class SimulationErrorHandler {
    constructor() {
        this.lastValidStates = [];
        this.errorCount = 0;
        this.maxConsecutiveErrors = 5;
        this.errorCallback = null;
    }

    /**
     * Check if a value is valid (not NaN or Infinity)
     */
    static isValidNumber(value) {
        return isFinite(value) && !isNaN(value);
    }

    /**
     * Check if a 3D vector/position is valid
     */
    static isValidVector(vector) {
        if (!vector) return false;
        return this.isValidNumber(vector.x) && 
               this.isValidNumber(vector.y) && 
               this.isValidNumber(vector.z);
    }

    /**
     * Check if a state object is valid
     */
    static isValidState(state) {
        // Handle different state formats
        if (state.x !== undefined) {
            // Simple x,y,z state
            return this.isValidNumber(state.x) && 
                   this.isValidNumber(state.y) && 
                   this.isValidNumber(state.z);
        } else if (state.position) {
            // Body with position and velocity
            return this.isValidVector(state.position) && 
                   this.isValidVector(state.velocity);
        }
        return false;
    }

    /**
     * Validate all bodies in a simulation
     */
    validateBodies(bodies) {
        for (const body of bodies) {
            if (!SimulationErrorHandler.isValidState(body)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Save current state as valid checkpoint
     */
    saveCheckpoint(state) {
        // Keep only last 10 checkpoints to avoid memory issues
        if (this.lastValidStates.length >= 10) {
            this.lastValidStates.shift();
        }
        this.lastValidStates.push(this.deepCopy(state));
        this.errorCount = 0; // Reset error count on successful checkpoint
    }

    /**
     * Get last valid state for recovery
     */
    getLastValidState() {
        return this.lastValidStates.length > 0 
            ? this.deepCopy(this.lastValidStates[this.lastValidStates.length - 1])
            : null;
    }

    /**
     * Deep copy helper
     */
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Handle error and attempt recovery
     */
    handleError(errorType, details) {
        this.errorCount++;

        const errorInfo = {
            type: errorType,
            details: details,
            count: this.errorCount,
            canRecover: this.lastValidStates.length > 0,
            timestamp: Date.now()
        };

        // Call custom error callback if provided
        if (this.errorCallback) {
            this.errorCallback(errorInfo);
        }

        // Return recovery information
        return {
            shouldStop: this.errorCount >= this.maxConsecutiveErrors,
            lastValidState: this.getLastValidState(),
            errorInfo: errorInfo
        };
    }

    /**
     * Set callback for error notifications
     */
    onError(callback) {
        this.errorCallback = callback;
    }

    /**
     * Reset error handler state
     */
    reset() {
        this.lastValidStates = [];
        this.errorCount = 0;
    }

    /**
     * Create error modal/notification
     */
    static showErrorModal(errorInfo) {
        // Remove existing modal if any
        const existingModal = document.getElementById('sim-error-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'sim-error-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(20, 20, 40, 0.95);
            border: 2px solid #ff4444;
            border-radius: 10px;
            padding: 30px;
            max-width: 500px;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        `;

        const title = document.createElement('h3');
        title.textContent = '⚠️ Simulation Error Detected';
        title.style.cssText = 'margin-top: 0; color: #ff4444; font-size: 20px;';

        const message = document.createElement('p');
        message.style.cssText = 'line-height: 1.6; margin: 15px 0;';
        
        let errorMessage = '';
        switch (errorInfo.type) {
            case 'NaN':
                errorMessage = 'The simulation produced invalid values (NaN). This typically happens with extreme parameter values or time steps.';
                break;
            case 'Infinity':
                errorMessage = 'The simulation produced infinite values. This can occur with very small distances between objects or extreme velocities.';
                break;
            case 'InvalidState':
                errorMessage = 'The simulation state became invalid. Please check your parameters and initial conditions.';
                break;
            default:
                errorMessage = 'An unexpected error occurred in the simulation.';
        }
        message.textContent = errorMessage;

        const details = document.createElement('div');
        details.style.cssText = 'background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 5px; margin: 15px 0; font-size: 14px;';
        details.innerHTML = `
            <strong>Details:</strong><br>
            Error Count: ${errorInfo.count}<br>
            Can Recover: ${errorInfo.canRecover ? 'Yes' : 'No'}<br>
            ${errorInfo.details ? `Info: ${errorInfo.details}` : ''}
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 20px;';

        if (errorInfo.canRecover) {
            const recoverBtn = document.createElement('button');
            recoverBtn.textContent = 'Recover to Last Valid State';
            recoverBtn.style.cssText = `
                flex: 1;
                padding: 12px 20px;
                background: #4444ff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
            `;
            recoverBtn.onmouseover = () => recoverBtn.style.background = '#5555ff';
            recoverBtn.onmouseout = () => recoverBtn.style.background = '#4444ff';
            recoverBtn.onclick = () => {
                modal.remove();
                if (window.app && window.app.recoverFromError) {
                    window.app.recoverFromError();
                }
            };
            buttonContainer.appendChild(recoverBtn);
        }

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset Simulation';
        resetBtn.style.cssText = `
            flex: 1;
            padding: 12px 20px;
            background: #666;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        `;
        resetBtn.onmouseover = () => resetBtn.style.background = '#777';
        resetBtn.onmouseout = () => resetBtn.style.background = '#666';
        resetBtn.onclick = () => {
            modal.remove();
            if (window.app && window.app.reset) {
                window.app.reset();
            }
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: transparent;
            border: none;
            color: #888;
            font-size: 24px;
            cursor: pointer;
            padding: 5px 10px;
        `;
        closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
        closeBtn.onmouseout = () => closeBtn.style.color = '#888';
        closeBtn.onclick = () => modal.remove();

        buttonContainer.appendChild(resetBtn);

        modal.appendChild(closeBtn);
        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(details);
        modal.appendChild(buttonContainer);

        document.body.appendChild(modal);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimulationErrorHandler;
}
