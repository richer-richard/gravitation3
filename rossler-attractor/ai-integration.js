/**
 * AI Integration for Rossler Attractor Simulation
 * Loads and uses the trained TensorFlow.js model for predictions
 */

class RosslerAI {
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
        this.dataSender = null;
        this.isCollectingData = false;
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
                
                if (data.models.rossler_attractor) {
                    this.isLoaded = true;
                    this.isLoading = false;
                    this.updateStatus('connected', 'Model Ready');
                    console.log('✓ Connected to Rossler Attractor AI model');
                    
                    // Start periodic predictions
                    this.startPredictions();
                } else {
                    this.isLoaded = false;
                    this.isLoading = false;
                    this.updateStatus('unavailable', 'Model Unavailable');
                    console.warn('⚠️ Rossler Attractor model is not loaded on the server');
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
        
        // Initialize data sender
        this.initDataSender();
    }

    /**
     * Initialize data collection sender
     */
    initDataSender() {
        if (typeof DataSender === 'undefined') {
            console.warn('DataSender not available');
            return;
        }
        
        this.dataSender = new DataSender({
            simulationName: 'Rossler Attractor',
            sendInterval: 100,
            enabled: false // Disabled by default
        });
        
        console.log('📡 Data sender initialized (disabled by default)');
    }

    /**
     * Start collecting training data
     */
    startDataCollection() {
        if (!this.dataSender) {
            console.error('Data sender not initialized');
            return;
        }
        
        if (this.isCollectingData) {
            console.log('📡 Data collection already running');
            return;
        }
        
        // Get simulator from global scope
        const simulator = window.app?.simulator;
        if (!simulator) {
            console.error('Simulator not found');
            return;
        }
        
        this.dataSender.configure({ enabled: true });
        this.dataSender.start(simulator);
        this.isCollectingData = true;
        
        console.log('📡 Started collecting training data for Rossler Attractor');
    }

    /**
     * Stop collecting training data
     */
    stopDataCollection() {
        if (this.dataSender && this.isCollectingData) {
            this.dataSender.stop();
            this.isCollectingData = false;
            console.log('📡 Stopped data collection');
        }
    }

    /**
     * Update the AI status indicator
     */
    updateStatus(state, text) {
        if (!this.statusTextElement) return;
        
        this.statusTextElement.textContent = text;
        
        // Remove all state classes
        this.statusElement.classList.remove('connected', 'active', 'error');
        
        // Add appropriate class
        if (state === 'connected') {
            this.statusElement.classList.add('connected');
        } else if (state === 'active') {
            this.statusElement.classList.add('connected', 'active');
            if (this.canvasContainer) {
                this.canvasContainer.classList.add('ai-active');
            }
        } else if (state === 'error') {
            // Keep default styling for error
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
        if (!this.isLoaded || !window.app?.simulator) return;
        
        try {
            // Get current simulation state
            const simulator = window.app.simulator;
            const trajectories = simulator.trajectories;
            
            if (!trajectories || trajectories.length === 0) {
                return;
            }
            
            // Prepare data for API (first trajectory)
            const trajectory = trajectories[0];
            const state = trajectory.state;
            
            const requestData = {
                x: state.x || 0,
                y: state.y || 0,
                z: state.z || 0,
                a: simulator.a || 0.2,
                b: simulator.b || 0.2,
                c: simulator.c || 5.7,
                time: simulator.time || 0
            };
            
            // Call API silently in background
            const response = await fetch(`${this.modelBaseUrl}/api/rossler/predict`, {
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
        this.stopDataCollection();
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        this.isLoaded = false;
    }
}

// Create global AI instance
window.rosslerAI = new RosslerAI();

// Auto-initialize when page loads
window.addEventListener('load', () => {
    // Wait a moment for simulation to initialize
    setTimeout(() => {
        window.rosslerAI.init();
    }, 1000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.rosslerAI) {
        window.rosslerAI.dispose();
    }
});
