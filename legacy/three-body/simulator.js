/**
 * Three-Body Simulator - JavaScript Implementation
 * RK4 Integration for browser-based simulation
 */

class Vector3D {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(v) {
        return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    subtract(v) {
        return new Vector3D(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    multiply(scalar) {
        return new Vector3D(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    copy() {
        return new Vector3D(this.x, this.y, this.z);
    }

    toArray() {
        return [this.x, this.y, this.z];
    }
}

class Body {
    constructor(position, velocity, mass, color, name) {
        this.position = position.copy();
        this.velocity = velocity.copy();
        this.mass = mass;
        this.color = color;
        this.name = name;
    }

    copy() {
        return new Body(this.position, this.velocity, this.mass, this.color, this.name);
    }
}

class ThreeBodySimulator {
    constructor(G = 1.0, dt = 0.005) {
        // SIM-1 fix: Initialize validation metrics tracking
        this.validationMetrics = {
            totalCorrections: 0,
            corrections: {
                G: 0,
                dt: 0,
                mass: 0
            },
            history: []
        };
        
        // Validate parameters before using them (HB-1 fix)
        this.G = this.validateGravitationalConstant(G);
        this.dt = this.validateTimeStep(dt);
        this.time = 0.0;
        this.bodies = [];
        this.initialBodies = [];
        this.steps = 0;
        
        // History tracking - lazy record
        this.history = {
            time: [],
            positions: [],
            energies: []
        };
        this.recordCounter = 0;
        
        this.initialEnergy = 0;
        
        // Collision settings
        this.collisionsEnabled = true;
        this.collisionRestitution = 1.0;
        
        // Error handling
        this.errorHandler = new SimulationErrorHandler();
        this.errorHandler.onError((errorInfo) => {
            SimulationErrorHandler.showErrorModal(errorInfo);
        });
    }

    setInitialConditions(bodies) {
        this.bodies = bodies.map(b => b.copy());
        this.initialBodies = bodies.map(b => b.copy());
        this.time = 0.0;
        this.steps = 0;
        
        // Clear history
        this.history = {
            time: [],
            positions: [],
            energies: []
        };
        
        this.initialEnergy = this.calculateTotalEnergy();
        this.recordState();
    }

    reset() {
        this.setInitialConditions(this.initialBodies);
        this.errorHandler.reset();
    }

    /**
     * Restore simulation state from checkpoint
     */
    restoreState(state) {
        if (!state || !state.bodies) return;
        
        this.bodies = state.bodies.map(b => new Body(
            new Vector3D(b.position.x, b.position.y, b.position.z),
            new Vector3D(b.velocity.x, b.velocity.y, b.velocity.z),
            b.mass,
            b.color,
            b.name
        ));
        
        this.time = state.time || 0;
        this.steps = state.steps || 0;
    }

    /**
     * Validate gravitational constant parameter (HB-1 fix)
     * SIM-1 fix: Track validation corrections
     * @param {number} G - The gravitational constant
     * @returns {number} - Validated G value
     */
    validateGravitationalConstant(G) {
        // Check if G is a valid number
        if (!isFinite(G)) {
            console.warn('Invalid gravitational constant. Using default G = 1.0');
            this.validationMetrics.corrections.G++;
            this.validationMetrics.totalCorrections++;
            return 1.0;
        }
        
        // G must be positive for physics to make sense
        if (G <= 0) {
            console.warn('Gravitational constant must be positive. Using default G = 1.0');
            this.validationMetrics.corrections.G++;
            this.validationMetrics.totalCorrections++;
            return 1.0;
        }
        
        // Warn if G is unusually large or small
        if (G < 0.001 || G > 1000) {
            console.warn(`Gravitational constant G = ${G} is unusual. Physics may appear strange.`);
        }
        
        return G;
    }

    /**
     * Validate time step parameter (HB-1 fix)
     * SIM-1 fix: Track validation corrections
     * @param {number} dt - The time step
     * @returns {number} - Validated dt value
     */
    validateTimeStep(dt) {
        // Check if dt is a valid number
        if (!isFinite(dt)) {
            console.warn('Invalid time step. Using default dt = 0.001');
            this.validationMetrics.corrections.dt++;
            this.validationMetrics.totalCorrections++;
            return 0.001;
        }
        
        // Time step must be positive
        if (dt <= 0) {
            console.warn('Time step must be positive. Using default dt = 0.001');
            this.validationMetrics.corrections.dt++;
            this.validationMetrics.totalCorrections++;
            return 0.001;
        }
        
        // Warn if dt is too large (may skip important dynamics)
        if (dt > 0.1) {
            console.warn(`Time step dt = ${dt} is very large. May miss important dynamics.`);
        }
        
        // Warn if dt is extremely small (may cause numerical issues)
        if (dt < 1e-6) {
            console.warn(`Time step dt = ${dt} is very small. May cause numerical issues.`);
        }
        
        return dt;
    }

    /**
     * Validate body mass parameter (HB-1 fix)
     * SIM-1 fix: Track validation corrections
     * @param {number} mass - The body mass
     * @returns {number} - Validated mass value
     */
    validateMass(mass) {
        // Check if mass is a valid number
        if (!isFinite(mass)) {
            console.warn('Invalid mass value. Using default mass = 1.0');
            this.validationMetrics.corrections.mass++;
            this.validationMetrics.totalCorrections++;
            return 1.0;
        }
        
        // Mass must be positive
        if (mass <= 0) {
            console.warn('Mass must be positive. Using default mass = 1.0');
            this.validationMetrics.corrections.mass++;
            this.validationMetrics.totalCorrections++;
            return 1.0;
        }
        
        // Warn if mass is extremely small or large
        if (mass < 0.001 || mass > 10000) {
            console.warn(`Mass = ${mass} is unusual. Physics may be problematic.`);
        }
        
        return mass;
    }

    /**
     * Clamp acceleration magnitude to prevent numerical instability
     * @param {Vector3D} acceleration - The acceleration vector
     * @returns {Vector3D} - Clamped acceleration
     */
    clampAcceleration(acceleration) {
        // Maximum reasonable acceleration (prevents explosive forces when bodies get very close)
        const maxAcceleration = 1000.0;
        
        const mag = acceleration.magnitude();
        
        // If acceleration is invalid (NaN/Infinity), return zero
        if (!isFinite(mag)) {
            return new Vector3D(0, 0, 0);
        }
        
        // If exceeds max, clamp to max while preserving direction
        if (mag > maxAcceleration) {
            return acceleration.multiply(maxAcceleration / mag);
        }
        
        return acceleration;
    }

    /**
     * Clamp velocity magnitude to prevent overflow
     * @param {Vector3D} velocity - The velocity vector
     * @returns {Vector3D} - Clamped velocity
     */
    clampVelocity(velocity) {
        // Maximum reasonable velocity (escape velocity or higher)
        const maxVelocity = 100.0;
        
        const mag = velocity.magnitude();
        
        // If velocity is invalid (NaN/Infinity), return zero
        if (!isFinite(mag)) {
            return new Vector3D(0, 0, 0);
        }
        
        // If exceeds max, clamp to max while preserving direction
        if (mag > maxVelocity) {
            return velocity.multiply(maxVelocity / mag);
        }
        
        return velocity;
    }

    calculateDerivative(positions, velocities) {
        const n = positions.length;
        const dPos = velocities.map(v => v.copy());
        const dVel = [];
        const G = this.G;
        const bodies = this.bodies;
        const minDistance = 0.01;

        for (let i = 0; i < n; i++) {
            let ax = 0, ay = 0, az = 0;
            const pi = positions[i];

            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    const pj = positions[j];
                    const dx = pj.x - pi.x;
                    const dy = pj.y - pi.y;
                    const dz = pj.z - pi.z;
                    
                    let r2 = dx * dx + dy * dy + dz * dz;
                    if (r2 < minDistance * minDistance) {
                        r2 = minDistance * minDistance;
                    }
                    
                    const r = Math.sqrt(r2);
                    const factor = G * bodies[j].mass / (r2 * r);
                    
                    ax += dx * factor;
                    ay += dy * factor;
                    az += dz * factor;
                }
            }

            dVel.push(this.clampAcceleration(new Vector3D(ax, ay, az)));
        }

        return { dPos, dVel };
    }

    rk4Step() {
        const positions = this.bodies.map(b => b.position.copy());
        const velocities = this.bodies.map(b => b.velocity.copy());

        // k1
        const k1 = this.calculateDerivative(positions, velocities);

        // k2
        const pos2 = positions.map((p, i) => p.add(k1.dPos[i].multiply(this.dt * 0.5)));
        const vel2 = velocities.map((v, i) => v.add(k1.dVel[i].multiply(this.dt * 0.5)));
        const k2 = this.calculateDerivative(pos2, vel2);

        // k3
        const pos3 = positions.map((p, i) => p.add(k2.dPos[i].multiply(this.dt * 0.5)));
        const vel3 = velocities.map((v, i) => v.add(k2.dVel[i].multiply(this.dt * 0.5)));
        const k3 = this.calculateDerivative(pos3, vel3);

        // k4
        const pos4 = positions.map((p, i) => p.add(k3.dPos[i].multiply(this.dt)));
        const vel4 = velocities.map((v, i) => v.add(k3.dVel[i].multiply(this.dt)));
        const k4 = this.calculateDerivative(pos4, vel4);

        // Update positions and velocities
        for (let i = 0; i < this.bodies.length; i++) {
            const dPos = k1.dPos[i].add(k2.dPos[i].multiply(2))
                .add(k3.dPos[i].multiply(2)).add(k4.dPos[i]).multiply(this.dt / 6);
            const dVel = k1.dVel[i].add(k2.dVel[i].multiply(2))
                .add(k3.dVel[i].multiply(2)).add(k4.dVel[i]).multiply(this.dt / 6);

            this.bodies[i].position = this.bodies[i].position.add(dPos);
            this.bodies[i].velocity = this.bodies[i].velocity.add(dVel);
            
            // Clamp velocity to prevent overflow after RK4 step (CB-3 fix)
            this.bodies[i].velocity = this.clampVelocity(this.bodies[i].velocity);
        }

        // Validate state after integration
        if (!this.errorHandler.validateBodies(this.bodies)) {
            const errorInfo = this.errorHandler.handleError('InvalidState', 
                'Bodies contain NaN or Infinity values after RK4 step');
            
            if (errorInfo.shouldStop) {
                // Attempt recovery if possible
                if (errorInfo.lastValidState) {
                    this.restoreState(errorInfo.lastValidState);
                }
                return false; // Signal that step failed
            }
        }

        // Collision prevention
        this.preventCollisions();

        this.time += this.dt;
        this.steps++;
        
        return true; // Signal that step succeeded
    }

    preventCollisions() {
        if (!this.collisionsEnabled) return;
        
        const mergeDistance = 0.15;
        const bodies = this.bodies;
        let collisionFound = true;
        
        while (collisionFound) {
            collisionFound = false;
            
            for (let i = bodies.length - 1; i >= 0; i--) {
                const bi = bodies[i];
                for (let j = i - 1; j >= 0; j--) {
                    const bj = bodies[j];
                    const dx = bj.position.x - bi.position.x;
                    const dy = bj.position.y - bi.position.y;
                    const dz = bj.position.z - bi.position.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    
                    if (distance < mergeDistance) {
                        const collisionPoint = bi.position.add(
                            new Vector3D(dx, dy, dz).multiply(bi.mass / (bi.mass + bj.mass))
                        );
                        
                        if (this.onCollision) {
                            this.onCollision({
                                position: collisionPoint,
                                body1: bi,
                                body2: bj,
                                combinedMass: bi.mass + bj.mass
                            });
                        }
                        
                        this.mergeBodies(i, j);
                        collisionFound = true;
                        break;
                    }
                }
                if (collisionFound) break;
            }
        }
    }

    /**
     * Alternative collision handling: merge bodies
     * Conserves momentum and mass when bodies collide
     */
    mergeBodies(i, j) {
        const body1 = this.bodies[i];
        const body2 = this.bodies[j];
        
        // Calculate merged properties
        const totalMass = body1.mass + body2.mass;
        
        // Conservation of momentum
        const newVelocity = body1.velocity.multiply(body1.mass)
            .add(body2.velocity.multiply(body2.mass))
            .multiply(1 / totalMass);
        
        // Center of mass position
        const newPosition = body1.position.multiply(body1.mass)
            .add(body2.position.multiply(body2.mass))
            .multiply(1 / totalMass);
        
        // Notify visualizer to remove the body that will be deleted
        let removedIndex;
        
        // Keep the more massive body, remove the other
        if (body1.mass >= body2.mass) {
            body1.mass = totalMass;
            body1.velocity = newVelocity;
            body1.position = newPosition;
            body1.name = `${body1.name}+${body2.name}`;
            this.bodies.splice(j, 1);
            removedIndex = j;
        } else {
            body2.mass = totalMass;
            body2.velocity = newVelocity;
            body2.position = newPosition;
            body2.name = `${body1.name}+${body2.name}`;
            this.bodies.splice(i, 1);
            removedIndex = i;
        }
        
        // Call visualizer to remove the mesh
        if (this.onBodyRemoved) {
            this.onBodyRemoved(removedIndex);
        }
    }

    /**
     * Enable or disable collision prevention
     */
    setCollisionsEnabled(enabled) {
        this.collisionsEnabled = enabled;
    }

    /**
     * Set collision restitution coefficient
     * 0.0 = perfectly inelastic (bodies stick)
     * 1.0 = perfectly elastic (energy conserved)
     */
    setCollisionRestitution(restitution) {
        this.collisionRestitution = Math.max(0, Math.min(1, restitution));
    }

    step(nSteps = 1) {
        for (let i = 0; i < nSteps; i++) {
            const success = this.rk4Step();
            if (!success) {
                return false;
            }
        }
        
        // Record state every 5 steps
        if (++this.recordCounter >= 5) {
            this.recordState();
            this.recordCounter = 0;
        }
        
        // Checkpoint every 200 steps
        if (this.steps % 200 === 0) {
            this.errorHandler.saveCheckpoint({
                bodies: this.bodies.map(b => ({
                    position: { x: b.position.x, y: b.position.y, z: b.position.z },
                    velocity: { x: b.velocity.x, y: b.velocity.y, z: b.velocity.z },
                    mass: b.mass,
                    color: b.color,
                    name: b.name
                })),
                time: this.time,
                steps: this.steps
            });
        }
        
        return true;
    }

    calculateTotalEnergy() {
        let KE = 0;
        let PE = 0;

        // Kinetic energy
        for (const body of this.bodies) {
            const vSquared = body.velocity.dot(body.velocity);
            KE += 0.5 * body.mass * vSquared;
        }

        // Potential energy
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const rVec = this.bodies[j].position.subtract(this.bodies[i].position);
                const r = rVec.magnitude();
                if (r > 1e-10) {
                    PE -= this.G * this.bodies[i].mass * this.bodies[j].mass / r;
                }
            }
        }

        return KE + PE;
    }

    calculateMomentum() {
        let momentum = new Vector3D();
        for (const body of this.bodies) {
            momentum = momentum.add(body.velocity.multiply(body.mass));
        }
        return momentum;
    }

    calculateCenterOfMass() {
        let totalMass = 0;
        let com = new Vector3D();

        for (const body of this.bodies) {
            com = com.add(body.position.multiply(body.mass));
            totalMass += body.mass;
        }

        return com.multiply(1 / totalMass);
    }

    getMinDistance() {
        let minDist = Infinity;
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const dist = this.bodies[i].position.subtract(this.bodies[j].position).magnitude();
                minDist = Math.min(minDist, dist);
            }
        }
        return minDist;
    }

    getEnergyDrift() {
        if (this.initialEnergy === 0) return 0;
        const currentEnergy = this.calculateTotalEnergy();
        return Math.abs(currentEnergy - this.initialEnergy) / Math.abs(this.initialEnergy) * 100;
    }

    calculateEntropy() {
        if (this.bodies.length < 2) return 0;
        
        // Calculate center of mass
        const com = this.calculateCenterOfMass();
        
        // Calculate variance of distances from center of mass
        let sumDist2 = 0;
        for (const body of this.bodies) {
            const dist = body.position.subtract(com).magnitude();
            sumDist2 += dist * dist;
        }
        
        const variance = sumDist2 / this.bodies.length;
        
        // Return log of spread as entropy measure
        return variance > 0 ? Math.log(1 + variance * 10) : 0;
    }

    recordState() {
        this.history.time.push(this.time);
        this.history.positions.push(this.bodies.map(b => b.position.copy()));
        this.history.energies.push(this.calculateTotalEnergy());
    }

    exportData() {
        const builder = (typeof window !== 'undefined' &&
            window.SimulationExport &&
            typeof window.SimulationExport.createSimulationExport === 'function')
            ? window.SimulationExport.createSimulationExport
            : null;

        const currentEnergy = this.calculateTotalEnergy();
        const currentEntropy = this.calculateEntropy();

        const entities = this.bodies.map((body, idx) => ({
            id: body.name || `body-${idx + 1}`,
            name: body.name || `Body ${idx + 1}`,
            type: 'gravitational-body',
            color: body.color,
            mass: body.mass,
            state: {
                position: body.position.toArray(),
                velocity: body.velocity.toArray()
            }
        }));

        const positionHistory = this.history.positions.map(step =>
            step.map(vector => vector.toArray())
        );

        const entityHistory = entities.map((entity, idx) => ({
            id: entity.id,
            tracks: {
                position: positionHistory.map(step => step[idx] || [0, 0, 0])
            }
        }));

        const config = {
            simulation: {
                id: 'three-body',
                name: 'Three-Body Problem',
                type: 'n-body',
                dimension: 3
            },
            parameters: {
                G: this.G,
                dt: this.dt,
                collisionsEnabled: this.collisionsEnabled,
                collisionRestitution: this.collisionRestitution
            },
            state: {
                time: this.time,
                dt: this.dt,
                steps: this.steps,
                aggregates: {
                    energy: currentEnergy,
                    entropy: currentEntropy,
                    minDistance: this.getMinDistance()
                },
                entities
            },
            history: {
                time: [...this.history.time],
                aggregates: {
                    energy: [...this.history.energies]
                },
                entities: entityHistory
            },
            metadata: {
                engine: 'Web'
            },
            custom: {
                integrator: 'RK4',
                bodies: this.bodies.length
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
            const parameters = data.parameters || {};
            this.G = parameters.G ?? this.G;
            this.dt = parameters.dt ?? this.dt;
            this.collisionsEnabled = parameters.collisionsEnabled ?? this.collisionsEnabled;
            this.collisionRestitution = parameters.collisionRestitution ?? this.collisionRestitution;

            const entities = (data.state && data.state.entities) || [];
            const bodies = entities.map(entity => {
                const position = (entity.state && entity.state.position) || [0, 0, 0];
                const velocity = (entity.state && entity.state.velocity) || [0, 0, 0];
                return new Body(
                    new Vector3D(...position),
                    new Vector3D(...velocity),
                    entity.mass ?? 1,
                    entity.color ?? 0xffffff,
                    entity.name || entity.id
                );
            });

            if (bodies.length === 0) {
                throw new Error('No bodies found in exported data');
            }

            this.setInitialConditions(bodies);

            const history = data.history || {};
            const historyTime = history.time || [];
            const energyHistory = (history.aggregates && history.aggregates.energy) || [];
            const entityHistory = history.entities || [];

            const positions = [];
            if (entityHistory.length > 0) {
                const trackLength = entityHistory[0].tracks &&
                    entityHistory[0].tracks.position
                    ? entityHistory[0].tracks.position.length
                    : 0;
                for (let i = 0; i < trackLength; i++) {
                    const stepPositions = entityHistory.map(entry => {
                        const coords = entry.tracks &&
                            entry.tracks.position &&
                            entry.tracks.position[i]
                            ? entry.tracks.position[i]
                            : [0, 0, 0];
                        return new Vector3D(...coords);
                    });
                    positions.push(stepPositions);
                }
            }

            this.history = {
                time: [...historyTime],
                positions,
                energies: [...energyHistory]
            };

            this.time = data.state.time ?? (historyTime.length ? historyTime[historyTime.length - 1] : 0);
            this.steps = data.state.steps ?? this.steps;
            return;
        }

        // Legacy format support
        if (!data.positions || !data.masses || !data.velocities) {
            throw new Error('Invalid data format for import');
        }

        const lastIndex = data.positions.length - 1;
        const lastPositions = data.positions[lastIndex];

        this.G = data.G;
        this.dt = data.dt;
        
        const bodies = lastPositions.map((pos, i) => {
            return new Body(
                new Vector3D(...pos),
                new Vector3D(...data.velocities[i]),
                data.masses[i],
                data.colors[i],
                data.names[i]
            );
        });
        
        this.setInitialConditions(bodies);
        
        // Restore history
        this.history = {
            time: [...data.time],
            positions: data.positions.map(posArr => 
                posArr.map(p => new Vector3D(...p))
            ),
            energies: [...data.energy]
        };
        
        this.time = data.time[lastIndex];
        this.steps = data.metadata.total_steps;
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
            energy: this.calculateTotalEnergy(),
            entropy: this.calculateEntropy(),
            parameters: {
                G: this.G,
                dt: this.dt,
                numBodies: this.bodies.length,
                masses: this.bodies.map(b => b.mass),
                collisionsEnabled: this.collisionsEnabled
            },
            trajectory: this.getRecentTrajectory(100),
            visualizationMode: 'default',
            bodyCount: this.bodies.length,
            centerOfMass: this.calculateCenterOfMass().toArray(),
            momentum: this.calculateMomentum().toArray()
        };
    }

    /**
     * Get recent trajectory points for pattern recognition
     * @param {number} n - Number of recent points to return
     * @returns {Array} Array of trajectory snapshots
     */
    getRecentTrajectory(n = 100) {
        const startIdx = Math.max(0, this.history.positions.length - n);
        const recentPositions = this.history.positions.slice(startIdx);
        const recentTimes = this.history.time.slice(startIdx);
        const recentEnergies = this.history.energies.slice(startIdx);

        return recentPositions.map((positions, idx) => ({
            time: recentTimes[idx],
            positions: positions.map(p => p.toArray()),
            energy: recentEnergies[idx]
        }));
    }

    /**
     * Get current state vector for AI prediction input
     * Returns a flat array of all state variables
     */
    getCurrentState() {
        const stateVector = [];
        
        // Add time
        stateVector.push(this.time);
        
        // Add positions and velocities for each body
        for (const body of this.bodies) {
            stateVector.push(...body.position.toArray());
            stateVector.push(...body.velocity.toArray());
        }
        
        // Add derived quantities
        stateVector.push(this.calculateTotalEnergy());
        stateVector.push(this.calculateEntropy());
        
        return {
            vector: stateVector,
            labels: this.getStateLabels(),
            metadata: {
                time: this.time,
                numBodies: this.bodies.length,
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
        
        for (let i = 0; i < this.bodies.length; i++) {
            labels.push(`body${i}_x`, `body${i}_y`, `body${i}_z`);
            labels.push(`body${i}_vx`, `body${i}_vy`, `body${i}_vz`);
        }
        
        labels.push('energy', 'entropy');
        
        return labels;
    }
}

// Preset Configurations
function createFigure8Bodies() {
    return [
        new Body(
            new Vector3D(-0.97000436, 0.24208753, 0),
            new Vector3D(0.4662036850, 0.4323657300, 0),
            1.0,
            0x00d4ff,
            'Body 1'
        ),
        new Body(
            new Vector3D(0, 0, 0),
            new Vector3D(-0.93240737, -0.86473146, 0),
            1.0,
            0x8b5cf6,
            'Body 2'
        ),
        new Body(
            new Vector3D(0.97000436, -0.24208753, 0),
            new Vector3D(0.4662036850, 0.4323657300, 0),
            1.0,
            0xec4899,
            'Body 3'
        )
    ];
}

function createLagrangeBodies() {
    const R = 1.0;
    const omega = Math.sqrt(3.0 / (4.0 * R * R * R));
    const angles = [0, 2 * Math.PI / 3, 4 * Math.PI / 3];
    const colors = [0x00d4ff, 0x8b5cf6, 0xec4899];
    
    return angles.map((angle, i) => new Body(
        new Vector3D(R * Math.cos(angle), R * Math.sin(angle), 0),
        new Vector3D(-R * omega * Math.sin(angle), R * omega * Math.cos(angle), 0),
        1.0,
        colors[i],
        `Body ${i + 1}`
    ));
}

function getMinPairwiseDistance(bodies) {
    let minDistance = Infinity;
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const distance = bodies[i].position.subtract(bodies[j].position).magnitude();
            if (distance < minDistance) {
                minDistance = distance;
            }
        }
    }
    return minDistance;
}

function hasDangerousApproach(bodies) {
    const approachLimit = -0.15; // Radial speed threshold toward each other
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const relPos = bodies[j].position.subtract(bodies[i].position);
            const distance = relPos.magnitude();
            if (distance === 0) return true;
            
            const radial = relPos.multiply(1 / distance);
            const relVel = bodies[j].velocity.subtract(bodies[i].velocity);
            const radialSpeed = relVel.dot(radial);
            
            if (radialSpeed < approachLimit) {
                return true;
            }
        }
    }
    return false;
}

function previewChaoticConfiguration(bodies) {
    const previewSim = new ThreeBodySimulator(1.0, 0.0008);
    previewSim.collisionsEnabled = false;
    previewSim.errorHandler.onError(() => {});
    previewSim.setInitialConditions(bodies.map(b => b.copy()));
    
    const previewSteps = 600;
    for (let step = 0; step < previewSteps; step++) {
        if (!previewSim.rk4Step()) {
            return false;
        }
        if (getMinPairwiseDistance(previewSim.bodies) < 0.35) {
            return false;
        }
    }
    return true;
}

function createChaoticCandidateBodies() {
    const colors = [0x00d4ff, 0x8b5cf6, 0xec4899];
    const R = 1.15 + (Math.random() - 0.5) * 0.25;
    const omega = Math.sqrt(3.0 / (4.0 * R * R * R));
    
    const perturbAngle = 0.25 + Math.random() * 0.45;
    const baseAngles = [0, 2 * Math.PI / 3, 4 * Math.PI / 3];
    const angles = [
        baseAngles[0] + (Math.random() - 0.5) * 0.2,
        baseAngles[1] + perturbAngle,
        baseAngles[2] - perturbAngle * 0.65
    ];
    
    const radiusVariations = angles.map(() => 1.0 + (Math.random() - 0.5) * 0.25);
    const velocityPerturbations = angles.map(() => ({
        radial: (Math.random() - 0.5) * 0.12,
        tangential: (Math.random() - 0.5) * 0.12
    }));
    
    return angles.map((angle, index) => {
        const r = R * radiusVariations[index];
        const pos = new Vector3D(
            r * Math.cos(angle),
            r * Math.sin(angle),
            (Math.random() - 0.5) * 0.15
        );
        
        const baseSpeed = r * omega;
        const radialPerturb = velocityPerturbations[index].radial;
        const tangentialPerturb = velocityPerturbations[index].tangential;
        
        const vel = new Vector3D(
            -baseSpeed * Math.sin(angle) * (1 + tangentialPerturb) + radialPerturb * Math.cos(angle),
            baseSpeed * Math.cos(angle) * (1 + tangentialPerturb) + radialPerturb * Math.sin(angle),
            (Math.random() - 0.5) * 0.08
        );
        
        return new Body(pos, vel, 1.0, colors[index], `Body ${index + 1}`);
    });
}

function isChaoticConfigurationSafe(bodies) {
    if (getMinPairwiseDistance(bodies) < 0.85) {
        return false;
    }
    if (hasDangerousApproach(bodies)) {
        return false;
    }
    return previewChaoticConfiguration(bodies);
}

function createChaoticBodies() {
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = createChaoticCandidateBodies();
        if (isChaoticConfigurationSafe(candidate)) {
            return candidate;
        }
    }
    
    console.warn('MB-3: Unable to generate validated chaotic preset, falling back to Lagrange configuration');
    return createLagrangeBodies();
}

const PRESETS = {
    figure8: {
        name: 'Figure-8',
        bodies: createFigure8Bodies()
    },

    lagrange: {
        name: 'Lagrange Triangle',
        bodies: createLagrangeBodies()
    },

    chaotic: {
        name: 'Chaotic System',
        bodies: createChaoticBodies()
    },

    custom: {
        name: 'Custom',
        bodies: [
            new Body(
                new Vector3D(1, 0, 0),
                new Vector3D(0, 0.3, 0),
                1.0,
                0x00d4ff,
                'Body 1'
            ),
            new Body(
                new Vector3D(-0.5, 0.866, 0),
                new Vector3D(-0.26, -0.15, 0),
                1.0,
                0x8b5cf6,
                'Body 2'
            ),
            new Body(
                new Vector3D(-0.5, -0.866, 0),
                new Vector3D(-0.26, 0.15, 0),
                1.0,
                0xec4899,
                'Body 3'
            )
        ]
    }
};
