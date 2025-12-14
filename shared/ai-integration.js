/**
 * AI Integration Module
 * Connects browser simulations to Python AI prediction API
 */

class AIIntegration {
    constructor(apiUrl = 'http://localhost:5003') {
        this.apiUrl = apiUrl;
        this.isConnected = false;
        this.models = {};
        this.checkConnection();
    }

    /**
     * Check if API server is running
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.apiUrl}/api/status`);
            const data = await response.json();
            this.isConnected = data.ready;
            this.models = data.models;
            console.log('AI API Status:', data);
            return data;
        } catch (error) {
            console.warn('AI API not available:', error.message);
            this.isConnected = false;
            return null;
        }
    }

    /**
     * Get Three-Body AI prediction
     * @param {Array} trajectory - Recent trajectory data [[time, [positions...]], ...]
     * @returns {Promise<Object>} Prediction result
     */
    async predictThreeBody(trajectory) {
        if (!this.isConnected) {
            throw new Error('AI API not connected. Start the API server first.');
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/three-body/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ trajectory })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Three-body prediction failed:', error);
            throw error;
        }
    }

    /**
     * Get Double-Pendulum AI prediction
     * @param {Array} trajectory - Recent trajectory data
     * @returns {Promise<Object>} Prediction result
     */
    async predictDoublePendulum(trajectory) {
        if (!this.isConnected) {
            throw new Error('AI API not connected. Start the API server first.');
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/double-pendulum/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ trajectory })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Double-pendulum prediction failed:', error);
            throw error;
        }
    }

    /**
     * Classify Double-Pendulum behavior
     * @param {Array} features - System features for classification
     * @returns {Promise<Object>} Classification result
     */
    async classifyDoublePendulum(features) {
        if (!this.isConnected) {
            throw new Error('AI API not connected. Start the API server first.');
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/double-pendulum/classify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ features })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Double-pendulum classification failed:', error);
            throw error;
        }
    }

    /**
     * Get hybrid prediction (AI + numerical comparison)
     * @param {Array} trajectory - Recent trajectory data
     * @returns {Promise<Object>} Hybrid prediction result
     */
    async hybridThreeBody(trajectory) {
        if (!this.isConnected) {
            throw new Error('AI API not connected. Start the API server first.');
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/hybrid/three-body`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ trajectory })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Hybrid prediction failed:', error);
            throw error;
        }
    }

    /**
     * Format trajectory data from simulator for AI prediction
     * @param {Object} simulator - Simulator instance
     * @param {number} sequenceLength - Number of recent steps to include
     * @returns {Array} Formatted trajectory
     */
    formatTrajectoryForThreeBody(simulator, sequenceLength = 50) {
        const history = simulator.history;
        if (!history || history.positions.length < sequenceLength) {
            throw new Error(`Need at least ${sequenceLength} steps of history`);
        }

        const startIdx = history.positions.length - sequenceLength;
        const trajectory = [];

        for (let i = startIdx; i < history.positions.length; i++) {
            const positions = history.positions[i];
            const flatPositions = [];
            
            // Flatten positions: [x1, y1, z1, x2, y2, z2, x3, y3, z3]
            positions.forEach(pos => {
                flatPositions.push(pos.x, pos.y, pos.z);
            });

            // Add velocities if available (interpolate from position differences)
            const velocities = [];
            if (i > 0) {
                const prevPositions = history.positions[i - 1];
                const dt = history.time[i] - history.time[i - 1];
                
                positions.forEach((pos, idx) => {
                    const prevPos = prevPositions[idx];
                    velocities.push(
                        (pos.x - prevPos.x) / dt,
                        (pos.y - prevPos.y) / dt,
                        (pos.z - prevPos.z) / dt
                    );
                });
            } else {
                // For first point, use zeros
                velocities.push(...new Array(positions.length * 3).fill(0));
            }

            trajectory.push([...flatPositions, ...velocities]);
        }

        return trajectory;
    }

    /**
     * Format trajectory data for double pendulum
     * @param {Object} simulator - DoublePendulumSimulator instance
     * @param {number} sequenceLength - Number of recent steps
     * @returns {Array} Formatted trajectory
     */
    formatTrajectoryForDoublePendulum(simulator, sequenceLength = 50) {
        const pendulum = simulator.pendulums[0];
        if (!pendulum || pendulum.trail.length < sequenceLength) {
            throw new Error(`Need at least ${sequenceLength} steps of history`);
        }

        const startIdx = pendulum.trail.length - sequenceLength;
        const trajectory = [];

        for (let i = startIdx; i < pendulum.trail.length; i++) {
            // Get state at this time step
            // Format: [theta1, omega1, theta2, omega2]
            trajectory.push([...pendulum.state]);
        }

        return trajectory;
    }

    /**
     * Extract features for double pendulum classification
     * @param {Object} simulator - DoublePendulumSimulator instance
     * @returns {Array} Feature vector
     */
    extractDoublePendulumFeatures(simulator) {
        const pendulum = simulator.pendulums[0];
        if (!pendulum) {
            throw new Error('No pendulum available');
        }

        // Extract features: [theta1, omega1, theta2, omega2, energy, l1, l2, m1, m2, g, entropy, trail_length, time]
        const energy = simulator.calculateEnergyForPendulum(pendulum);
        const entropy = simulator.calculateEntropy();
        
        return [
            pendulum.state[0],  // theta1
            pendulum.state[1],  // omega1
            pendulum.state[2],  // theta2
            pendulum.state[3],  // omega2
            energy,
            simulator.l1,
            simulator.l2,
            simulator.m1,
            simulator.m2,
            simulator.g,
            entropy,
            pendulum.trail.length,
            simulator.time
        ];
    }
}

// Export for use in simulations
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIIntegration;
}
