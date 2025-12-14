/**
 * Lorenz Attractor Simulator
 * Implements the Lorenz system using RK4 integration
 */

class Trajectory {
    constructor(x, y, z, color, name) {
        this.state = { x, y, z };
        this.color = color;
        this.name = name;
        this.trail = [];
    }
}

class LorenzSimulator {
    constructor(sigma = 10, rho = 28, beta = 8/3, dt = 0.001) {
        // Lorenz parameters - validate inputs (HB-1 fix)
        this.sigma = this.validateSigma(sigma);
        this.rho = this.validateRho(rho);
        this.beta = this.validateBeta(beta);
        
        // Integration - validate time step (HB-1 fix)
        this.dt = this.validateTimeStep(dt);
        this.time = 0;
        this.steps = 0;
        
        // Trajectories
        this.trajectories = [];
        this.initialTrajectories = [];
        
        // Stats
        this.initialEnergy = 0;
    }

    /**
     * Validate sigma parameter (HB-1 fix)
     */
    validateSigma(sigma) {
        const value = parseFloat(sigma);
        if (!isFinite(value)) {
            console.warn('Invalid sigma. Using default sigma = 10');
            return 10;
        }
        if (value < 0.1) {
            console.warn('Sigma must be >= 0.1. Clamping to 0.1');
            return 0.1;
        }
        return value;
    }

    /**
     * Validate rho parameter (HB-1 fix)
     */
    validateRho(rho) {
        const value = parseFloat(rho);
        if (!isFinite(value)) {
            console.warn('Invalid rho. Using default rho = 28');
            return 28;
        }
        if (value <= 0) {
            console.warn('Rho must be positive. Using default rho = 28');
            return 28;
        }
        return value;
    }

    /**
     * Validate beta parameter (HB-1 fix)
     */
    validateBeta(beta) {
        const value = parseFloat(beta);
        if (!isFinite(value)) {
            console.warn('Invalid beta. Using default beta = 8/3');
            return 8/3;
        }
        if (value <= 0) {
            console.warn('Beta must be positive. Using default beta = 8/3');
            return 8/3;
        }
        return value;
    }

    /**
     * Validate time step parameter (HB-1 fix)
     */
    validateTimeStep(dt) {
        const value = parseFloat(dt);
        if (!isFinite(value)) {
            console.warn('Invalid time step. Using default dt = 0.001');
            return 0.001;
        }
        if (value <= 0) {
            console.warn('Time step must be positive. Using default dt = 0.001');
            return 0.001;
        }
        if (value > 0.1) console.warn(`Time step dt = ${value} is large. May miss dynamics.`);
        if (value < 1e-6) console.warn(`Time step dt = ${value} is very small. May cause numerical issues.`);
        return value;
    }

    setParameters(sigma, rho, beta) {
        this.sigma = this.validateSigma(sigma);
        this.rho = this.validateRho(rho);
        this.beta = this.validateBeta(beta);
    }

    setInitialConditions(trajectories) {
        this.trajectories = trajectories.map(t => ({...t, trail: []}));
        this.initialTrajectories = JSON.parse(JSON.stringify(trajectories));
        this.time = 0;
        this.steps = 0;
        this.initialEnergy = this.calculateTotalEnergy();
    }

    // Lorenz equations: dx/dt, dy/dt, dz/dt
    lorenzDerivatives(state) {
        return {
            x: this.sigma * (state.y - state.x),
            y: state.x * (this.rho - state.z) - state.y,
            z: state.x * state.y - this.beta * state.z
        };
    }

    // RK4 integration step
    rk4Step(state) {
        const k1 = this.lorenzDerivatives(state);
        
        const k2 = this.lorenzDerivatives({
            x: state.x + 0.5 * this.dt * k1.x,
            y: state.y + 0.5 * this.dt * k1.y,
            z: state.z + 0.5 * this.dt * k1.z
        });
        
        const k3 = this.lorenzDerivatives({
            x: state.x + 0.5 * this.dt * k2.x,
            y: state.y + 0.5 * this.dt * k2.y,
            z: state.z + 0.5 * this.dt * k2.z
        });
        
        const k4 = this.lorenzDerivatives({
            x: state.x + this.dt * k3.x,
            y: state.y + this.dt * k3.y,
            z: state.z + this.dt * k3.z
        });
        
        const nextState = {
            x: state.x + (this.dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
            y: state.y + (this.dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
            z: state.z + (this.dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z)
        };
        
        return this.validateState(nextState, state);
    }

    validateState(state, fallback) {
        const limit = 1e6;
        if (!isFinite(state.x) || !isFinite(state.y) || !isFinite(state.z)) {
            console.warn('Lorenz state became invalid. Reverting to last valid state.');
            return { ...fallback };
        }
        if (Math.abs(state.x) > limit || Math.abs(state.y) > limit || Math.abs(state.z) > limit) {
            console.warn('Lorenz state exceeded safe bounds. Clamping to limits.');
            return {
                x: Math.max(Math.min(state.x, limit), -limit),
                y: Math.max(Math.min(state.y, limit), -limit),
                z: Math.max(Math.min(state.z, limit), -limit)
            };
        }
        return state;
    }

    step(numSteps = 1) {
        for (let i = 0; i < numSteps; i++) {
            // Update each trajectory
            for (const trajectory of this.trajectories) {
                trajectory.state = this.rk4Step(trajectory.state);
            }
            
            this.time += this.dt;
            this.steps++;
        }
    }

    calculateTotalEnergy() {
        // Use a Lyapunov-like function as "energy"
        let energy = 0;
        for (const trajectory of this.trajectories) {
            const s = trajectory.state;
            energy += s.x * s.x + s.y * s.y + s.z * s.z;
        }
        return energy / this.trajectories.length;
    }

    calculateEntropy() {
        // Measure of spread/divergence using variance
        if (this.trajectories.length < 2) return 0;
        
        let meanX = 0, meanY = 0, meanZ = 0;
        for (const t of this.trajectories) {
            meanX += t.state.x;
            meanY += t.state.y;
            meanZ += t.state.z;
        }
        meanX /= this.trajectories.length;
        meanY /= this.trajectories.length;
        meanZ /= this.trajectories.length;
        
        let variance = 0;
        for (const t of this.trajectories) {
            const dx = t.state.x - meanX;
            const dy = t.state.y - meanY;
            const dz = t.state.z - meanZ;
            variance += dx * dx + dy * dy + dz * dz;
        }
        
        return Math.sqrt(variance / this.trajectories.length);
    }

    getMaxDistance() {
        let maxDist = 0;
        for (const t of this.trajectories) {
            const dist = Math.sqrt(
                t.state.x * t.state.x + 
                t.state.y * t.state.y + 
                t.state.z * t.state.z
            );
            maxDist = Math.max(maxDist, dist);
        }
        return maxDist;
    }

    getAverageVelocity() {
        let totalVel = 0;
        for (const t of this.trajectories) {
            const deriv = this.lorenzDerivatives(t.state);
            const vel = Math.sqrt(deriv.x * deriv.x + deriv.y * deriv.y + deriv.z * deriv.z);
            totalVel += vel;
        }
        return totalVel / this.trajectories.length;
    }

    reset() {
        this.trajectories = JSON.parse(JSON.stringify(this.initialTrajectories));
        this.trajectories.forEach(t => t.trail = []);
        this.time = 0;
        this.steps = 0;
        this.initialEnergy = this.calculateTotalEnergy();
    }

    exportData() {
        const builder = (typeof window !== 'undefined' &&
            window.SimulationExport &&
            typeof window.SimulationExport.createSimulationExport === 'function')
            ? window.SimulationExport.createSimulationExport
            : null;

        const entities = this.trajectories.map((trajectory, idx) => {
            const deriv = this.lorenzDerivatives(trajectory.state);
            const speed = Math.sqrt(deriv.x * deriv.x + deriv.y * deriv.y + deriv.z * deriv.z);
            return {
                id: trajectory.name || `trajectory-${idx + 1}`,
                name: trajectory.name || `Trajectory ${idx + 1}`,
                type: 'lorenz-trajectory',
                color: trajectory.color,
                mass: null,
                state: {
                    position: [trajectory.state.x, trajectory.state.y, trajectory.state.z],
                    velocityMagnitude: speed
                }
            };
        });

        const entityHistory = this.trajectories.map((trajectory, idx) => ({
            id: trajectory.name || `trajectory-${idx + 1}`,
            tracks: {
                position: (trajectory.trail || []).map(point => [point.x, point.y, point.z])
            }
        }));

        const config = {
            simulation: {
                id: 'lorenz-attractor',
                name: 'Lorenz Attractor',
                type: 'chaotic-attractor',
                dimension: 3
            },
            parameters: {
                sigma: this.sigma,
                rho: this.rho,
                beta: this.beta,
                dt: this.dt
            },
            state: {
                time: this.time,
                dt: this.dt,
                steps: this.steps,
                aggregates: {
                    energy: this.calculateTotalEnergy(),
                    entropy: this.calculateEntropy()
                },
                entities
            },
            history: {
                time: [],
                aggregates: {
                    energy: []
                },
                entities: entityHistory
            },
            metadata: {
                engine: 'Web'
            },
            custom: {
                trajectories: this.trajectories.length
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

    importData(data) {
        const isSchemaFormat = data && data.schemaVersion && data.state;
        if (isSchemaFormat) {
            const params = data.parameters || {};
            this.sigma = params.sigma ?? this.sigma;
            this.rho = params.rho ?? this.rho;
            this.beta = params.beta ?? this.beta;
            this.dt = params.dt ?? this.dt;

            const entities = (data.state && data.state.entities) || [];
            if (!entities.length) {
                throw new Error('No trajectory data found in export');
            }

            const trajectories = entities.map(entity => {
                const position = entity.state && entity.state.position ? entity.state.position : [0, 0, 0];
                return new Trajectory(
                    position[0],
                    position[1],
                    position[2],
                    entity.color || 0xffffff,
                    entity.name || entity.id
                );
            });

            this.setInitialConditions(trajectories);
            this.time = data.state.time ?? 0;
            this.steps = data.state.steps ?? 0;
            return;
        }

        // Legacy support
        if (data.parameters) {
            this.sigma = data.parameters.sigma;
            this.rho = data.parameters.rho;
            this.beta = data.parameters.beta;
            this.dt = data.parameters.dt;
        }
        
        if (data.trajectories) {
            this.setInitialConditions(data.trajectories.map(t => 
                new Trajectory(t.state.x, t.state.y, t.state.z, t.color, t.name)
            ));
        }
    }
}

// Preset configurations
const PRESETS = {
    single: {
        sigma: 10,
        rho: 28,
        beta: 8/3,
        trajectories: [
            new Trajectory(1, 1, 1, 0x00d4ff, 'Clean Butterfly')
        ]
    },
    classic: {
        sigma: 10,
        rho: 28,
        beta: 8/3,
        trajectories: [
            new Trajectory(1, 1, 1, 0x00d4ff, 'Trajectory 1'),
            new Trajectory(1.01, 1, 1, 0xec4899, 'Trajectory 2')
        ]
    },
    multicolor: {
        sigma: 10,
        rho: 28,
        beta: 8/3,
        trajectories: [
            new Trajectory(1, 1, 1, 0xff0000, 'Red'),
            new Trajectory(2, 1, 1, 0x00ff00, 'Green'),
            new Trajectory(1, 2, 1, 0x0000ff, 'Blue'),
            new Trajectory(1, 1, 2, 0xffff00, 'Yellow')
        ]
    },
    chaos: {
        sigma: 10,
        rho: 28,
        beta: 8/3,
        trajectories: [
            new Trajectory(0.1, 0, 0, 0x00d4ff, 'Chaos 1'),
            new Trajectory(0.11, 0, 0, 0xec4899, 'Chaos 2'),
            new Trajectory(0.12, 0, 0, 0x00ff88, 'Chaos 3')
        ]
    },
    symmetric: {
        sigma: 10,
        rho: 28,
        beta: 8/3,
        trajectories: [
            new Trajectory(5, 5, 10, 0x00d4ff, 'Sym 1'),
            new Trajectory(-5, -5, 10, 0xec4899, 'Sym 2'),
            new Trajectory(5, -5, 10, 0xff8800, 'Sym 3'),
            new Trajectory(-5, 5, 10, 0x8b5cf6, 'Sym 4')
        ]
    },
    professional: {
        sigma: 10,
        rho: 28,
        beta: 8/3,
        trajectories: [
            new Trajectory(0.1, 0, 0, 0x00d4ff, 'Origin'),
            new Trajectory(0.11, 0, 0, 0xec4899, 'Perturbed'),
            new Trajectory(1, 1, 1, 0x10b981, 'Central'),
            new Trajectory(-10, -10, 25, 0xf59e0b, 'Upper'),
            new Trajectory(5, 5, 10, 0x8b5cf6, 'Mid')
        ]
    }
};
