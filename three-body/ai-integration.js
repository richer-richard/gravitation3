/**
 * AI Integration for Three-Body Simulation
 * Loads and uses the trained TensorFlow.js model for predictions
 */

class ThreeBodyAI {
    constructor() {
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
            const response = await fetch('http://localhost:5003/health');
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.models.three_body) {
                    this.isLoaded = true;
                    this.isLoading = false;
                    this.updateStatus('connected', 'Model Ready');
                    console.log('✓ Connected to Three-Body AI model');
                    
                    // Start periodic predictions
                    this.startPredictions();
                } else {
                    throw new Error('Three-Body model not loaded on server');
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
            this.canvasContainer.classList.add('ai-active');
            this.statusTextElement.textContent = 'Predicting';
        } else if (state === 'error') {
            this.statusTextElement.textContent = 'Server Offline';
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
        this.canvasContainer.classList.remove('ai-active');
        if (this.isLoaded) {
            this.updateStatus('connected', 'Model Ready');
        }
    }

    /**
     * Make a prediction with the current simulation state
     */
    async makePrediction() {
        if (!this.isLoaded || !window.simulator) return;
        
        try {
            // Show active state
            this.updateStatus('active', 'Predicting');
            
            // Get current simulation state
            const bodies = window.simulator.bodies;
            if (!bodies || bodies.length === 0) {
                this.updateStatus('connected', 'Model Ready');
                return;
            }
            
            // Prepare data for API
            const positions = [];
            const velocities = [];
            
            for (let i = 0; i < Math.min(3, bodies.length); i++) {
                const body = bodies[i];
                positions.push({
                    x: body.position.x || 0,
                    y: body.position.y || 0,
                    z: body.position.z || 0
                });
                velocities.push({
                    vx: body.velocity.x || 0,
                    vy: body.velocity.y || 0,
                    vz: body.velocity.z || 0
                });
            }
            
            // Call API
            const response = await fetch('http://localhost:5003/api/three-body/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ positions, velocities })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('AI Prediction:', result.prediction);
            } else {
                console.error('Prediction failed:', await response.text());
            }
            
            // Return to connected state after a short delay
            setTimeout(() => {
                if (this.isLoaded) {
                    this.updateStatus('connected', 'Model Ready');
                    this.canvasContainer.classList.remove('ai-active');
                }
            }, 500);
            
        } catch (error) {
            console.error('Prediction error:', error);
            this.updateStatus('connected', 'Model Ready');
            this.canvasContainer.classList.remove('ai-active');
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
window.threeBodyAI = new ThreeBodyAI();

// Auto-initialize when page loads
window.addEventListener('load', () => {
    // Wait a moment for simulation to initialize
    setTimeout(() => {
        window.threeBodyAI.init();
    }, 1000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.threeBodyAI) {
        window.threeBodyAI.dispose();
    }
});
