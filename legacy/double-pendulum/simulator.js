// Double Pendulum Physics Simulator with multiple pendulum support

class DoublePendulumSimulator {
    constructor() {
        // Physical parameters (defaults)
        this.l1 = 1.0;
        this.l2 = 1.0;
        this.m1 = 1.0;
        this.m2 = 1.0;
        this.g = 9.81;
        
        // Time and control
        this.time = 0;
        this.dt = 0.02;
        this.isRunning = false;
        
        // Multiple pendulum support
        this.pendulums = [];
        this.maxPendulums = 4;
        
        // Cache for lazy calculation
        this.cachedEnergy = 0;
        this.cachedEntropy = 0;
        this.entropyCounter = 0;
        
        // Add initial pendulum
        this.addPendulum();
        
        console.log('Simulator initialized with multiple pendulum support');
    }
    
    addPendulum() {
        if (this.pendulums.length >= this.maxPendulums) {
            console.log('Maximum number of pendulums reached');
            return;
        }
        
        const hue1 = (this.pendulums.length * 36) % 360;
        const hue2 = (hue1 + 180) % 360;
        
        const pendulum = {
            id: this.pendulums.length,
            state: [Math.PI / 2, 0, Math.PI / 2 - (this.pendulums.length * 0.01), 0],
            l1: this.l1,
            l2: this.l2,
            m1: this.m1,
            m2: this.m2,
            color1: `hsl(${hue1}, 80%, 60%)`,
            color2: `hsl(${hue2}, 80%, 60%)`,
            trail: [],
            maxTrailLength: 200,
            trailUpdateCounter: 0
        };
        
        pendulum.initialEnergy = this.calculateEnergyForPendulum(pendulum);
        this.pendulums.push(pendulum);
        
        console.log(`Added pendulum ${pendulum.id}, total: ${this.pendulums.length}`);
    }
    
    removePendulum(index) {
        if (this.pendulums.length <= 1) {
            console.log('Cannot remove last pendulum');
            return;
        }
        
        if (index >= 0 && index < this.pendulums.length) {
            this.pendulums.splice(index, 1);
            console.log(`Removed pendulum, remaining: ${this.pendulums.length}`);
        }
    }
    
    getPendulumCount() {
        return this.pendulums.length;
    }
    
    // Runge-Kutta 4th order integration for a single pendulum
    stepPendulum(pendulum) {
        const state = pendulum.state;
        const dt2 = this.dt * 0.5;
        const dt6 = this.dt / 6;
        
        const k1 = this.derivatives(state, pendulum);
        
        const state2 = [
            state[0] + k1[0] * dt2,
            state[1] + k1[1] * dt2,
            state[2] + k1[2] * dt2,
            state[3] + k1[3] * dt2
        ];
        const k2 = this.derivatives(state2, pendulum);
        
        const state3 = [
            state[0] + k2[0] * dt2,
            state[1] + k2[1] * dt2,
            state[2] + k2[2] * dt2,
            state[3] + k2[3] * dt2
        ];
        const k3 = this.derivatives(state3, pendulum);
        
        const state4 = [
            state[0] + k3[0] * this.dt,
            state[1] + k3[1] * this.dt,
            state[2] + k3[2] * this.dt,
            state[3] + k3[3] * this.dt
        ];
        const k4 = this.derivatives(state4, pendulum);
        
        pendulum.state[0] += (k1[0] + 2*k2[0] + 2*k3[0] + k4[0]) * dt6;
        pendulum.state[1] += (k1[1] + 2*k2[1] + 2*k3[1] + k4[1]) * dt6;
        pendulum.state[2] += (k1[2] + 2*k2[2] + 2*k3[2] + k4[2]) * dt6;
        pendulum.state[3] += (k1[3] + 2*k2[3] + 2*k3[3] + k4[3]) * dt6;
        
        // DB-1 fix: Update trail every 2 steps deterministically (not randomly)
        if (++pendulum.trailUpdateCounter % 2 === 0) {
            const pos = this.getPositionsForPendulum(pendulum);
            pendulum.trail.push({ x: pos.x2, y: pos.y2 });
            if (pendulum.trail.length > pendulum.maxTrailLength) {
                pendulum.trail.shift();
            }
        }
    }
    
    step() {
        if (!this.isRunning) return;
        
        const pendulums = this.pendulums;
        for (let i = 0; i < pendulums.length; i++) {
            this.stepPendulum(pendulums[i]);
        }
        
        this.time += this.dt;
        
        // Lazy cache update every 10 steps
        if (++this.entropyCounter >= 10) {
            this.cachedEnergy = this.calculateEnergy();
            this.cachedEntropy = this.calculateEntropy();
            this.entropyCounter = 0;
        }
    }
    
    // Calculate derivatives for double pendulum equations of motion
    derivatives(state, pendulum) {
        const [theta1, omega1, theta2, omega2] = state;
        const { l1, l2, m1, m2 } = pendulum;
        const g = this.g;
        
        const delta = theta2 - theta1;
        const den1 = (m1 + m2) * l1 - m2 * l1 * Math.cos(delta) * Math.cos(delta);
        const den2 = (l2 / l1) * den1;
        
        const dtheta1 = omega1;
        const dtheta2 = omega2;
        
        const domega1 = (
            m2 * l1 * omega1 * omega1 * Math.sin(delta) * Math.cos(delta) +
            m2 * g * Math.sin(theta2) * Math.cos(delta) +
            m2 * l2 * omega2 * omega2 * Math.sin(delta) -
            (m1 + m2) * g * Math.sin(theta1)
        ) / den1;
        
        const domega2 = (
            -m2 * l2 * omega2 * omega2 * Math.sin(delta) * Math.cos(delta) +
            (m1 + m2) * g * Math.sin(theta1) * Math.cos(delta) -
            (m1 + m2) * l1 * omega1 * omega1 * Math.sin(delta) -
            (m1 + m2) * g * Math.sin(theta2)
        ) / den2;
        
        return [dtheta1, domega1, dtheta2, domega2];
    }
    
    
    // Get Cartesian positions for first pendulum (for compatibility)
    getPositions() {
        if (this.pendulums.length === 0) return { x1: 0, y1: 0, x2: 0, y2: 0 };
        return this.getPositionsForPendulum(this.pendulums[0]);
    }
    
    // Get Cartesian positions of bobs for a specific pendulum
    getPositionsForPendulum(pendulum) {
        const [theta1, , theta2] = pendulum.state;
        
        const x1 = pendulum.l1 * Math.sin(theta1);
        const y1 = -pendulum.l1 * Math.cos(theta1);
        
        const x2 = x1 + pendulum.l2 * Math.sin(theta2);
        const y2 = y1 - pendulum.l2 * Math.cos(theta2);
        
        return { x1, y1, x2, y2 };
    }
    
    // Calculate total energy for first pendulum (for compatibility)
    calculateEnergy() {
        if (this.pendulums.length === 0) return 0;
        return this.calculateEnergyForPendulum(this.pendulums[0]);
    }
    
    // Calculate total energy for a specific pendulum
    calculateEnergyForPendulum(pendulum) {
        const [theta1, omega1, theta2, omega2] = pendulum.state;
        const pos = this.getPositionsForPendulum(pendulum);
        
        // Kinetic energy
        const v1x = pendulum.l1 * omega1 * Math.cos(theta1);
        const v1y = pendulum.l1 * omega1 * Math.sin(theta1);
        const v2x = v1x + pendulum.l2 * omega2 * Math.cos(theta2);
        const v2y = v1y + pendulum.l2 * omega2 * Math.sin(theta2);
        
        const ke = 0.5 * pendulum.m1 * (v1x * v1x + v1y * v1y) +
                   0.5 * pendulum.m2 * (v2x * v2x + v2y * v2y);
        
        // Potential energy
        const pe = pendulum.m1 * this.g * pos.y1 + pendulum.m2 * this.g * pos.y2;
        
        return ke + pe;
    }
    
    // Calculate entropy (measure of divergence between pendulums)
    calculateEntropy() {
        if (this.pendulums.length < 2) return 0;
        
        let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0;
        const pendulums = this.pendulums;
        const n = pendulums.length;
        
        for (let i = 0; i < n; i++) {
            const state = pendulums[i].state;
            const l1 = pendulums[i].l1;
            const l2 = pendulums[i].l2;
            
            const t1 = state[0];
            const t2 = state[2];
            
            const x1 = l1 * Math.sin(t1);
            const y1 = -l1 * Math.cos(t1);
            const x2 = x1 + l2 * Math.sin(t2);
            const y2 = y1 - l2 * Math.cos(t2);
            
            sumX += x2;
            sumY += y2;
            sumX2 += x2 * x2;
            sumY2 += y2 * y2;
        }
        
        const meanX = sumX / n;
        const meanY = sumY / n;
        const varX = (sumX2 / n) - (meanX * meanX);
        const varY = (sumY2 / n) - (meanY * meanY);
        
        const spread = Math.sqrt(varX + varY);
        return spread > 0 ? Math.log(1 + spread * 10) : 0;
    }
    
    // Control methods
    play() {
        this.isRunning = true;
    }
    
    pause() {
        this.isRunning = false;
    }
    
    setTimeStep(dt) {
        this.dt = dt;
    }
    
    reset(preset = 'default') {
        this.time = 0;
        
        // Reset each pendulum with slight variations
        this.pendulums.forEach((pendulum, index) => {
            pendulum.l1 = this.l1;
            pendulum.l2 = this.l2;
            pendulum.m1 = this.m1;
            pendulum.m2 = this.m2;
            pendulum.trail = [];
            
            // Set initial conditions based on preset with slight variations
            const variation = index * 0.01;
            switch(preset) {
                case 'chaos':
                    pendulum.state = [Math.PI / 2 + 0.1 + variation, 0, Math.PI / 2 - variation, 0];
                    break;
                case 'asymmetric':
                    pendulum.state = [Math.PI / 4 + variation, 0, 3 * Math.PI / 4 - variation, 0];
                    break;
                case 'spin':
                    pendulum.state = [Math.PI / 2 + variation, 3, Math.PI / 2 - variation, 3];
                    break;
                default:
                    pendulum.state = [Math.PI / 2 + variation, 0, Math.PI / 2 - variation, 0];
            }
            
            pendulum.initialEnergy = this.calculateEnergyForPendulum(pendulum);
        });
        
        console.log('Reset to ' + preset);
    }

    /**
     * AI-Ready Methods for Training and Prediction
     */

    /**
     * Get complete formatted state for AI consumption
     * Returns all relevant information for AI analysis
     */
    getState() {
        return {
            time: this.time,
            energy: this.calculateEnergy(),
            entropy: this.calculateEntropy(),
            parameters: {
                l1: this.l1,
                l2: this.l2,
                m1: this.m1,
                m2: this.m2,
                g: this.g,
                dt: this.dt,
                numPendulums: this.pendulums.length
            },
            trajectory: this.getRecentTrajectory(100),
            visualizationMode: 'default',
            pendulumStates: this.pendulums.map(p => ({
                angles: [p.state[0], p.state[2]],
                angularVelocities: [p.state[1], p.state[3]],
                energy: this.calculateEnergyForPendulum(p),
                trailLength: p.trail.length
            }))
        };
    }

    /**
     * Get recent trajectory points for pattern recognition
     * @param {number} n - Number of recent points to return
     * @returns {Array} Array of trajectory snapshots
     */
    getRecentTrajectory(n = 100) {
        // Get trajectory from first pendulum's trail
        if (this.pendulums.length === 0) return [];
        
        const firstPendulum = this.pendulums[0];
        const startIdx = Math.max(0, firstPendulum.trail.length - n);
        const recentTrail = firstPendulum.trail.slice(startIdx);
        
        // Build trajectory with state information
        return recentTrail.map((point, idx) => {
            const relativeTime = this.time - (recentTrail.length - idx - 1) * this.dt;
            return {
                time: relativeTime,
                position: { x: point.x, y: point.y },
                angles: [firstPendulum.state[0], firstPendulum.state[2]]
            };
        });
    }

    /**
     * Get current state vector for AI prediction input
     * Returns a flat array of all state variables
     */
    getCurrentState() {
        const stateVector = [];
        
        // Add time
        stateVector.push(this.time);
        
        // Add state for each pendulum (angles and angular velocities)
        for (const pendulum of this.pendulums) {
            stateVector.push(...pendulum.state);
        }
        
        // Add derived quantities
        stateVector.push(this.calculateEnergy());
        stateVector.push(this.calculateEntropy());
        
        return {
            vector: stateVector,
            labels: this.getStateLabels(),
            metadata: {
                time: this.time,
                numPendulums: this.pendulums.length,
                dimension: stateVector.length
            }
        };
    }

    /**
     * Get labels for state vector components
     * Helper method for getCurrentState
     */
    getStateLabels() {
        const labels = ['time'];
        
        for (let i = 0; i < this.pendulums.length; i++) {
            labels.push(
                `pendulum${i}_theta1`,
                `pendulum${i}_omega1`,
                `pendulum${i}_theta2`,
                `pendulum${i}_omega2`
            );
        }
        
        labels.push('energy', 'entropy');
        
        return labels;
    }

    /**
     * Export simulation data using the shared schema
     */
    exportData() {
        const builder = (typeof window !== 'undefined' &&
            window.SimulationExport &&
            typeof window.SimulationExport.createSimulationExport === 'function')
            ? window.SimulationExport.createSimulationExport
            : null;

        const maxTrailLength = this.pendulums.length
            ? Math.max(...this.pendulums.map(p => p.trail.length))
            : 0;
        const timeHistory = [];
        const positionHistory = [];
        const energyHistory = [];
        
        for (let i = 0; i < maxTrailLength; i++) {
            const t = this.time - (maxTrailLength - i - 1) * this.dt;
            timeHistory.push(t);
            
            const positions = this.pendulums.map(pendulum => {
                if (i < pendulum.trail.length) {
                    const point = pendulum.trail[i];
                    return [point.x, point.y];
                }
                return [0, 0];
            });
            positionHistory.push(positions);
            
            if (this.pendulums.length > 0) {
                energyHistory.push(this.calculateEnergyForPendulum(this.pendulums[0]));
            } else {
                energyHistory.push(0);
            }
        }
        
        const entities = this.pendulums.map((pendulum, idx) => ({
            id: pendulum.id || `pendulum-${idx + 1}`,
            name: pendulum.name || `Pendulum ${idx + 1}`,
            type: 'double-pendulum',
            color: [pendulum.color1, pendulum.color2],
            mass: pendulum.m1 + pendulum.m2,
            state: {
                angles: [pendulum.state[0], pendulum.state[2]],
                angularVelocity: [pendulum.state[1], pendulum.state[3]],
                rods: [pendulum.l1, pendulum.l2],
                energy: this.calculateEnergyForPendulum(pendulum)
            }
        }));
        
        const entityHistory = entities.map((entity, idx) => ({
            id: entity.id,
            tracks: {
                bobPosition: positionHistory.map(step => step[idx] || [0, 0])
            }
        }));
        
        const config = {
            simulation: {
                id: 'double-pendulum',
                name: 'Double Pendulum',
                type: 'mechanical',
                dimension: 2
            },
            parameters: {
                l1: this.l1,
                l2: this.l2,
                m1: this.m1,
                m2: this.m2,
                g: this.g,
                dt: this.dt
            },
            state: {
                time: this.time,
                dt: this.dt,
                steps: this.steps,
                aggregates: {
                    energy: this.calculateEnergy(),
                    entropy: this.calculateEntropy()
                },
                entities
            },
            history: {
                time: timeHistory,
                aggregates: {
                    energy: energyHistory
                },
                entities: entityHistory
            },
            metadata: {
                engine: 'Web'
            },
            custom: {
                pendulums: this.pendulums.length
            }
        };
        
        if (builder) {
            return builder(config);
        }
        
        return {
            schemaVersion: 1,
            ...config,
            metadata: {
                exportedAt: new Date().toISOString(),
                source: 'Gravitation³',
                engine: config.metadata.engine || 'Web',
                schema: 'SimulationExport@v1'
            }
        };
    }
}
