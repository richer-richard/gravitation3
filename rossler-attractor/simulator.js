/**
 * Rössler Attractor Simulator
 * Implements the Rössler system using RK4 integration
 */

class Trajectory {
    constructor(x, y, z, color, name) {
        this.state = { x, y, z };
        this.color = color;
        this.name = name;
        this.trail = [];
    }
}

class RosslerSimulator {
    constructor(a = 0.2, b = 0.2, c = 5.7, dt = 0.001) {
        // Rössler parameters - validate inputs (HB-1 fix)
        this.a = this.validateA(a);
        this.b = this.validateB(b);
        this.c = this.validateC(c);
        
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

    validateA(a) {
        if (!isFinite(a)) { console.warn('Invalid a. Using default a = 0.2'); return 0.2; }
        return a;
    }

    validateB(b) {
        if (!isFinite(b)) { console.warn('Invalid b. Using default b = 0.2'); return 0.2; }
        return b;
    }

    validateC(c) {
        if (!isFinite(c)) { console.warn('Invalid c. Using default c = 5.7'); return 5.7; }
        if (c <= 0) { console.warn('C should be positive. Using default c = 5.7'); return 5.7; }
        return c;
    }

    validateTimeStep(dt) {
        if (!isFinite(dt)) { console.warn('Invalid time step. Using default dt = 0.001'); return 0.001; }
        if (dt <= 0) { console.warn('Time step must be positive. Using default dt = 0.001'); return 0.001; }
        if (dt > 0.1) console.warn(`Time step dt = ${dt} is large. May miss dynamics.`);
        if (dt < 1e-6) console.warn(`Time step dt = ${dt} is very small. May cause numerical issues.`);
        return dt;
    }

    setParameters(a, b, c) {
        this.a = this.validateA(a);
        this.b = this.validateB(b);
        this.c = this.validateC(c);
    }

    setInitialConditions(trajectories) {
        this.trajectories = trajectories.map(t => ({...t, trail: []}));
        this.initialTrajectories = JSON.parse(JSON.stringify(trajectories));
        this.time = 0;
        this.steps = 0;
        this.initialEnergy = this.calculateTotalEnergy();
    }

    // Rössler equations: dx/dt = -y - z, dy/dt = x + ay, dz/dt = b + z(x - c)
    rosslerDerivatives(state) {
        return {
            x: -state.y - state.z,
            y: state.x + this.a * state.y,
            z: this.b + state.z * (state.x - this.c)
        };
    }

    // RK4 integration step
    rk4Step(state) {
        const k1 = this.rosslerDerivatives(state);
        
        const k2 = this.rosslerDerivatives({
            x: state.x + 0.5 * this.dt * k1.x,
            y: state.y + 0.5 * this.dt * k1.y,
            z: state.z + 0.5 * this.dt * k1.z
        });
        
        const k3 = this.rosslerDerivatives({
            x: state.x + 0.5 * this.dt * k2.x,
            y: state.y + 0.5 * this.dt * k2.y,
            z: state.z + 0.5 * this.dt * k2.z
        });
        
        const k4 = this.rosslerDerivatives({
            x: state.x + this.dt * k3.x,
            y: state.y + this.dt * k3.y,
            z: state.z + this.dt * k3.z
        });
        
        return {
            x: state.x + (this.dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
            y: state.y + (this.dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
            z: state.z + (this.dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z)
        };
    }

    step(numSteps = 1) {
        for (let i = 0; i < numSteps; i++) {
            for (const trajectory of this.trajectories) {
                trajectory.state = this.rk4Step(trajectory.state);
            }
            this.time += this.dt;
            this.steps++;
        }
    }

    calculateTotalEnergy() {
        let energy = 0;
        for (const trajectory of this.trajectories) {
            const s = trajectory.state;
            energy += s.x * s.x + s.y * s.y + s.z * s.z;
        }
        return energy / this.trajectories.length;
    }

    calculateEntropy() {
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
            const deriv = this.rosslerDerivatives(t.state);
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
            const deriv = this.rosslerDerivatives(trajectory.state);
            const speed = Math.sqrt(deriv.x * deriv.x + deriv.y * deriv.y + deriv.z * deriv.z);
            return {
                id: trajectory.name || `trajectory-${idx + 1}`,
                name: trajectory.name || `Trajectory ${idx + 1}`,
                type: 'rossler-trajectory',
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
                id: 'rossler-attractor',
                name: 'Rössler Attractor',
                type: 'chaotic-attractor',
                dimension: 3
            },
            parameters: { a: this.a, b: this.b, c: this.c, dt: this.dt },
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
            this.a = params.a ?? this.a;
            this.b = params.b ?? this.b;
            this.c = params.c ?? this.c;
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

        if (data.parameters) {
            this.a = data.parameters.a;
            this.b = data.parameters.b;
            this.c = data.parameters.c;
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
    classic: {
        a: 0.2,
        b: 0.2,
        c: 5.7,
        trajectories: [
            new Trajectory(1, 1, 1, 0x00d4ff, 'Trajectory 1'),
            new Trajectory(1.01, 1, 1, 0xec4899, 'Trajectory 2')
        ]
    },
    chaotic: {
        a: 0.1,
        b: 0.1,
        c: 4,
        trajectories: [
            new Trajectory(0.5, 0.5, 0.5, 0xff0000, 'Chaos 1'),
            new Trajectory(0.51, 0.5, 0.5, 0x00ff00, 'Chaos 2'),
            new Trajectory(0.5, 0.51, 0.5, 0x0000ff, 'Chaos 3')
        ]
    },
    periodic: {
        a: 0.3,
        b: 0.3,
        c: 3,
        trajectories: [
            new Trajectory(1, 0, 0, 0x00d4ff, 'Periodic 1'),
            new Trajectory(-1, 0, 0, 0xec4899, 'Periodic 2')
        ]
    },
    funnel: {
        a: 0.2,
        b: 0.2,
        c: 9,
        trajectories: [
            new Trajectory(2, 2, 2, 0x00d4ff, 'Funnel 1'),
            new Trajectory(2.1, 2, 2, 0xff8800, 'Funnel 2'),
            new Trajectory(2, 2.1, 2, 0x8b5cf6, 'Funnel 3')
        ]
    }
};
