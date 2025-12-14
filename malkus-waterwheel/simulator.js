/**
 * Malkus Waterwheel Simulator
 * A mechanical system that exhibits Lorenz-like chaotic behavior
 * 
 * The waterwheel consists of buckets arranged around a wheel that can rotate.
 * Water drips into the top bucket at a constant rate, and buckets have holes
 * that allow water to leak out. The system exhibits chaotic rotation patterns.
 * 
 * Equations (analogous to Lorenz attractor):
 * dω/dt = Σ(m_i * r_i * sin(θ_i)) - ν*ω
 * dm_i/dt = Q*δ_i,0 - K*m_i
 * dθ_i/dt = ω
 * 
 * where:
 * ω = angular velocity of wheel
 * m_i = mass of water in bucket i
 * θ_i = angle of bucket i
 * Q = water inflow rate
 * K = leak rate
 * ν = damping coefficient
 * r_i = radius from center
 */

class MalkusWheelSimulator {
    constructor(numBuckets = 20, Q = 2.5, K = 0.1, nu = 1.0, dt = 0.01) {
        this.numBuckets = numBuckets;
        this.Q = Q;           // Inflow rate
        this.K = K;           // Leak rate
        this.nu = nu;         // Damping
        this.dt = dt;
        this.radius = 1.0;    // Wheel radius
        
        // State variables
        this.omega = 0.1;     // Angular velocity
        this.theta = 0;       // Current angle of wheel
        this.bucketMasses = new Array(numBuckets).fill(0);
        
        // History for visualization
        this.omegaHistory = [];
        this.thetaHistory = [];
        this.maxHistoryLength = 2000;
        
        this.time = 0;
        this.isPaused = true;
    }

    /**
     * Get the angle of bucket i relative to the wheel's current orientation
     */
    getBucketAngle(i) {
        return this.theta + (2 * Math.PI * i) / this.numBuckets;
    }

    /**
     * Calculate torque from all buckets
     */
    calculateTorque() {
        let totalTorque = 0;
        for (let i = 0; i < this.numBuckets; i++) {
            const angle = this.getBucketAngle(i);
            // Torque = m * g * r * sin(θ) (gravitational torque)
            // We normalize by setting g*r = 1
            totalTorque += this.bucketMasses[i] * Math.sin(angle);
        }
        return totalTorque;
    }


    /**
     * RK4 integration step
     */
    rk4Step() {
        const state = {
            omega: this.omega,
            theta: this.theta,
            masses: [...this.bucketMasses]
        };

        // k1
        const k1 = this.derivatives(state);
        
        // k2
        const state2 = {
            omega: state.omega + 0.5 * this.dt * k1.domega,
            theta: state.theta + 0.5 * this.dt * k1.dtheta,
            masses: state.masses.map((m, i) => m + 0.5 * this.dt * k1.dmasses[i])
        };
        const k2 = this.derivatives(state2);
        
        // k3
        const state3 = {
            omega: state.omega + 0.5 * this.dt * k2.domega,
            theta: state.theta + 0.5 * this.dt * k2.dtheta,
            masses: state.masses.map((m, i) => m + 0.5 * this.dt * k2.dmasses[i])
        };
        const k3 = this.derivatives(state3);
        
        // k4
        const state4 = {
            omega: state.omega + this.dt * k3.domega,
            theta: state.theta + this.dt * k3.dtheta,
            masses: state.masses.map((m, i) => m + this.dt * k3.dmasses[i])
        };
        const k4 = this.derivatives(state4);
        
        // Combine
        this.omega = state.omega + (this.dt / 6) * (k1.domega + 2*k2.domega + 2*k3.domega + k4.domega);
        this.theta = state.theta + (this.dt / 6) * (k1.dtheta + 2*k2.dtheta + 2*k3.dtheta + k4.dtheta);
        
        for (let i = 0; i < this.numBuckets; i++) {
            this.bucketMasses[i] = state.masses[i] + 
                (this.dt / 6) * (k1.dmasses[i] + 2*k2.dmasses[i] + 2*k3.dmasses[i] + k4.dmasses[i]);
            // Ensure non-negative masses
            this.bucketMasses[i] = Math.max(0, this.bucketMasses[i]);
        }
    }

    /**
     * Calculate derivatives for current state
     */
    derivatives(state) {
        const torque = this.calculateTorqueFromState(state);
        const domega = torque - this.nu * state.omega;
        const dtheta = state.omega;
        
        // Water distribution - matches reference implementation
        const dmasses = state.masses.map((m, i) => {
            const angle = state.theta + (2 * Math.PI * i) / this.numBuckets;
            const outflow = this.K * m;
            
            // Water inflow logic from reference implementation
            // Water flows into buckets near the top (similar to spigot in reference)
            let inflow = 0;
            const threshold = Math.abs(Math.cos(2 * Math.PI / this.numBuckets));
            
            if (Math.cos(angle) > threshold) {
                // Distribute water smoothly to buckets near top
                const x = Math.atan2(Math.tan(angle), 1);
                const f = this.Q / 2;
                inflow = f * (Math.cos(this.numBuckets * x / 2) + 1);
            }
            
            return inflow - outflow;
        });
        
        return { domega, dtheta, dmasses };
    }

    /**
     * Calculate torque from a given state
     */
    calculateTorqueFromState(state) {
        let totalTorque = 0;
        for (let i = 0; i < this.numBuckets; i++) {
            const angle = state.theta + (2 * Math.PI * i) / this.numBuckets;
            totalTorque += state.masses[i] * Math.sin(angle);
        }
        return totalTorque;
    }


    /**
     * Update simulation
     */
    step(steps = 1) {
        if (this.isPaused) return;
        
        for (let s = 0; s < steps; s++) {
            // Store history
            this.omegaHistory.push(this.omega);
            if (this.omegaHistory.length > this.maxHistoryLength) {
                this.omegaHistory.shift();
            }
            
            this.thetaHistory.push(this.theta);
            if (this.thetaHistory.length > this.maxHistoryLength) {
                this.thetaHistory.shift();
            }
            
            // Integrate
            this.rk4Step();
            
            this.time += this.dt;
        }
    }

    /**
     * Reset simulation
     */
    reset(initialOmega = 0.1, initialTheta = 0) {
        this.omega = initialOmega;
        this.theta = initialTheta;
        this.bucketMasses.fill(0);
        this.omegaHistory = [];
        this.thetaHistory = [];
        this.time = 0;
    }

    /**
     * Set initial conditions
     */
    setInitialConditions(omega, theta) {
        this.reset(omega, theta);
    }

    /**
     * Set parameters
     */
    setParameters(Q, K, nu) {
        this.Q = Q;
        this.K = K;
        this.nu = nu;
    }

    /**
     * Set number of buckets
     */
    setNumBuckets(n) {
        this.numBuckets = n;
        this.bucketMasses = new Array(n).fill(0);
    }

    /**
     * Play/Pause controls
     */
    play() {
        this.isPaused = false;
    }

    pause() {
        this.isPaused = true;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
    }
}

// Presets
const MALKUS_PRESETS = {
    chaotic: {
        name: 'Chaotic Motion',
        Q: 2.5,
        K: 0.1,
        nu: 1.0,
        numBuckets: 20
    },
    periodic: {
        name: 'Periodic Oscillation',
        Q: 1.5,
        K: 0.15,
        nu: 1.5,
        numBuckets: 20
    },
    steady: {
        name: 'Steady Rotation',
        Q: 4.0,
        K: 0.05,
        nu: 0.5,
        numBuckets: 20
    },
    reversals: {
        name: 'Direction Reversals',
        Q: 2.0,
        K: 0.12,
        nu: 1.2,
        numBuckets: 20
    }
};
