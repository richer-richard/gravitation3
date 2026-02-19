/**
 * AI Integration for Double Pendulum Simulation
 * Loads and uses the trained TensorFlow.js model for predictions
 */

class DoublePendulumAI {
    constructor() {
        const runtimeConfig = (typeof window !== 'undefined' && window.GRAVITATION3_CONFIG) ? window.GRAVITATION3_CONFIG : {};
        this.modelBaseUrl = runtimeConfig.modelBaseUrl || 'http://localhost:5003';

        this.model = null;
        this.isLoading = false;
        this.isLoaded = false;
        this.predictionInterval = null;
        this.statusElement = document.getElementById('ai-status');
        this.statusTextElement = document.getElementById('ai-status-text');
        this.canvasContainer = document.getElementById('canvas-container');
    }

    /**
     * Initialize and connect to the AI API
     */
    async init() {
        if (this.isLoading || this.isLoaded) return;
        
        this.isLoading = true;
        this.updateStatus('loading', 'Connecting...');
        
        try {
            console.log('Connecting to AI Model Server...');
            
            // Check if API is available
            const response = await fetch(`${this.modelBaseUrl}/health`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.models.double_pendulum) {
                    this.isLoaded = true;
                    this.isLoading = false;
                    this.updateStatus('connected', 'Model Ready');
                    console.log('✓ Connected to Double Pendulum AI model');
                    
                    // Start periodic predictions
                    this.startPredictions();
                } else {
                    this.isLoaded = false;
                    this.isLoading = false;
                    this.updateStatus('unavailable', 'Model Unavailable');
                    console.warn('⚠️ Double Pendulum model is not loaded on the server');
                    return;
                }
            } else {
                throw new Error('API server not responding');
            }
            
        } catch (error) {
            console.error('Failed to connect to AI server:', error);
            console.log('\n========================================');
            console.log('To start all required servers:');
            console.log('========================================');
            console.log('\nTerminal 1 - Data Server (port 5002):');
            console.log('  cd api && ./start_data_server.sh');
            console.log('\nTerminal 2 - LLM Chatbot Server (port 5001):');
            console.log('  cd api && ./start_llm_server.sh');
            console.log('\nTerminal 3 - AI Model Server (port 5003):');
            console.log('  cd api && ./start_model_server.sh');
            console.log('\nOr run all together:');
            console.log('  cd scripts && bash start_api.sh');
            console.log('========================================\n');
            this.isLoading = false;
            this.updateStatus('error', 'Server Offline');
        }
    }

    /**
     * Update the AI status indicator
     */
    updateStatus(state, text) {
        if (!this.statusElement || !this.statusTextElement) return;

        this.statusTextElement.textContent = text;
        
        // Remove all state classes
        this.statusElement.classList.remove('connected', 'active', 'error');
        
        // Add appropriate class
        if (state === 'connected') {
            this.statusElement.classList.add('connected');
            // Always show as online when connected
            this.statusTextElement.textContent = 'Model Online';
        } else if (state === 'active') {
            this.statusElement.classList.add('connected', 'active');
            if (this.canvasContainer) {
                this.canvasContainer.classList.add('ai-active');
            }
            this.statusTextElement.textContent = 'Predicting';
        } else if (state === 'error') {
            this.statusTextElement.textContent = 'Server Offline';
        } else if (state === 'unavailable') {
            this.statusTextElement.textContent = 'Model Unavailable';
        }
    }

    /**
     * Start making periodic predictions
     */
    startPredictions() {
        if (this.predictionInterval) return;
        
        // Make predictions every 2 seconds
        this.predictionInterval = setInterval(() => {
            this.makePrediction();
        }, 2000);
    }

    /**
     * Stop predictions
     */
    stopPredictions() {
        if (this.predictionInterval) {
            clearInterval(this.predictionInterval);
            this.predictionInterval = null;
        }
        if (this.canvasContainer) {
            this.canvasContainer.classList.remove('ai-active');
        }
        if (this.isLoaded) {
            this.updateStatus('connected', 'Model Ready');
        }
    }

    /**
     * Make a prediction with the current simulation state
     */
    async makePrediction() {
        if (!this.isLoaded || !window.pendulums) return;
        
        try {
            // Keep showing connected state (don't pulse the UI)
            // The AI is still working in the background
            
            // Get current simulation state
            const pendulums = window.pendulums;
            if (!pendulums || pendulums.length === 0) {
                return;
            }
            
            // Prepare data for API (first pendulum)
            const pendulum = pendulums[0];
            const requestData = {
                theta1: pendulum.theta1 || 0,
                theta2: pendulum.theta2 || 0,
                omega1: pendulum.omega1 || 0,
                omega2: pendulum.omega2 || 0,
                l1: pendulum.l1 || 1,
                l2: pendulum.l2 || 1,
                m1: pendulum.m1 || 1,
                m2: pendulum.m2 || 1
            };
            
            // Call API silently in background
            const response = await fetch(`${this.modelBaseUrl}/api/double-pendulum/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            if (response.ok) {
                const result = await response.json();
                // Only log predictions occasionally to avoid console spam
                if (Math.random() < 0.1) {
                    console.log('AI Prediction:', result.prediction);
                }
            }
            
        } catch (error) {
            // Silently handle errors to prevent console spam
            // Only reconnect if we've lost connection
            if (error.message.includes('fetch')) {
                this.isLoaded = false;
                this.updateStatus('error', 'Server Offline');
                this.stopPredictions();
            }
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stopPredictions();
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        this.isLoaded = false;
    }
}

// Create global AI instance
window.doublePendulumAI = new DoublePendulumAI();

// Auto-initialize when page loads
window.addEventListener('load', () => {
    // Wait a moment for simulation to initialize
    setTimeout(() => {
        window.doublePendulumAI.init();
    }, 1000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.doublePendulumAI) {
        window.doublePendulumAI.dispose();
    }
});
