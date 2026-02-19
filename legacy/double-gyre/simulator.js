/**
 * Double-Gyre Flow Simulator
 * Models oceanic circulation with two counter-rotating gyres
 * 
 * Velocity Field:
 * u(x,y,t) = -π A sin(π f(x,t)) cos(π y)
 * v(x,y,t) = π A cos(π f(x,t)) sin(π y) df/dx
 * 
 * where:
 * f(x,t) = a(t) x² + b(t) x
 * a(t) = ε sin(ω t)
 * b(t) = 1 - 2ε sin(ω t)
 */

class DoubleGyreSimulator {
    constructor(A = 0.1, epsilon = 0.25, omega = 0.5, dt = 0.02) {
        this.A = A;
        this.epsilon = epsilon;
        this.omega = omega;
        this.dt = dt;
        
        // Domain: [0, 2] x [0, 1]
        this.domainWidth = 2;
        this.domainHeight = 1;
        
        // Particles
        this.particles = [];
        this.time = 0;
        this.isPaused = true;
        
        // Cache precomputed values
        this.lastTime = -999;
        this.cachedA = null;
        this.cachedB = null;
        
        // Flow field cache - reduced resolution
        this.flowFieldResolution = 20;
        this.flowField = null;
        this.flowFieldUpdateCounter = 0;
    }

    /**
     * Get cached or compute time-dependent functions
     */
    getTimeFunctions(t) {
        if (t !== this.lastTime) {
            const sinOmegaT = Math.sin(this.omega * t);
            this.cachedA = this.epsilon * sinOmegaT;
            this.cachedB = 1 - 2 * this.epsilon * sinOmegaT;
            this.lastTime = t;
        }
        return { a: this.cachedA, b: this.cachedB };
    }

    /**
     * Calculate f(x,t) and its derivative
     */
    calculateF(x, t) {
        const { a, b } = this.getTimeFunctions(t);
        const ax2 = a * x * x;
        const bx = b * x;
        return {
            f: ax2 + bx,
            dfdx: 2 * a * x + b
        };
    }

    /**
     * Fast velocity calculation
     */
    getVelocity(x, y, t) {
        const { f, dfdx } = this.calculateF(x, t);
        const piF = Math.PI * f;
        const piY = Math.PI * y;
        
        const sinPiF = Math.sin(piF);
        const cosPiF = Math.cos(piF);
        const cosPiY = Math.cos(piY);
        const sinPiY = Math.sin(piY);
        
        return {
            u: -Math.PI * this.A * sinPiF * cosPiY,
            v: Math.PI * this.A * cosPiF * sinPiY * dfdx
        };
    }

    /**
     * Add a particle at position (x, y)
     */
    addParticle(x, y, color = null) {
        const particle = {
            x: x,
            y: y,
            trail: [],
            color: color || this.getColorFromPosition(x, y),
            active: true
        };
        this.particles.push(particle);
        return particle;
    }

    /**
     * Seed particles in a grid pattern
     */
    seedParticles(numParticles) {
        this.particles = [];
        const cols = Math.ceil(Math.sqrt(numParticles * 2));
        const rows = Math.ceil(numParticles / cols);
        
        for (let i = 0; i < numParticles; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            // Add small random offset for more natural distribution
            const x = (col + 0.5 + (Math.random() - 0.5) * 0.3) * this.domainWidth / cols;
            const y = (row + 0.5 + (Math.random() - 0.5) * 0.3) * this.domainHeight / rows;
            
            this.addParticle(x, y);
        }
    }

    /**
     * Get color based on position (for visual diversity)
     */
    getColorFromPosition(x, y) {
        const hue = (x / this.domainWidth * 180 + y / this.domainHeight * 60) % 360;
        return this.hslToRgb(hue, 0.7, 0.6);
    }

    /**
     * Convert HSL to RGB hex
     */
    hslToRgb(h, s, l) {
        h /= 360;
        const a = s * Math.min(l, 1 - l);
        const f = (n, k = (n + h * 12) % 12) => 
            l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        const r = Math.round(255 * f(0));
        const g = Math.round(255 * f(8));
        const b = Math.round(255 * f(4));
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Fast Euler integration step for particle
     */
    eulerStep(particle) {
        const v = this.getVelocity(particle.x, particle.y, this.time);
        return {
            x: particle.x + this.dt * v.u,
            y: particle.y + this.dt * v.v
        };
    }

    /**
     * Update particle positions
     */
    step(steps = 1) {
        if (this.isPaused) return;
        
        for (let s = 0; s < steps; s++) {
            const particles = this.particles;
            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                
                // Update position using Euler
                const newPos = this.eulerStep(particle);
                particle.x = newPos.x;
                particle.y = newPos.y;
                
                // Fast boundary wrapping
                if (particle.x < 0) particle.x += this.domainWidth;
                else if (particle.x > this.domainWidth) particle.x -= this.domainWidth;
                
                if (particle.y < 0) particle.y = -particle.y;
                else if (particle.y > this.domainHeight) particle.y = 2 * this.domainHeight - particle.y;
            }
            
            this.time += this.dt;
        }
        
        // Lazy flow field update
        if (++this.flowFieldUpdateCounter >= 20) {
            this.updateFlowField();
            this.flowFieldUpdateCounter = 0;
        }
    }

    /**
     * Update flow field for visualization
     */
    updateFlowField() {
        const res = this.flowFieldResolution;
        this.flowField = [];
        const invRes = 1.0 / res;
        
        for (let i = 0; i <= res; i++) {
            const x = i * invRes * this.domainWidth;
            for (let j = 0; j <= res; j++) {
                const y = j * invRes * this.domainHeight;
                const vel = this.getVelocity(x, y, this.time);
                
                this.flowField.push({
                    x: x,
                    y: y,
                    u: vel.u,
                    v: vel.v
                });
            }
        }
    }

    /**
     * Reset simulation
     */
    reset() {
        this.time = 0;
        this.flowFieldUpdateCounter = 0;
        this.updateFlowField();
    }

    /**
     * Clear all particles
     */
    clearParticles() {
        this.particles = [];
    }

    /**
     * Set parameters
     */
    setParameters(A, epsilon, omega) {
        this.A = A;
        this.epsilon = epsilon;
        this.omega = omega;
        this.updateFlowField();
    }

    /**
     * Play/Pause
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

// Preset configurations
const DOUBLEGYRE_PRESETS = {
    standard: {
        name: 'Standard Double-Gyre',
        A: 0.1,
        epsilon: 0.25,
        omega: 0.5,
        particles: 500
    },
    divergence: {
        name: 'Divergent Flow',
        A: 0.15,
        epsilon: 0.1,
        omega: 1.0,
        particles: 600
    },
    convergence: {
        name: 'Convergent Flow',
        A: 0.08,
        epsilon: 0.4,
        omega: 0.3,
        particles: 700
    },
    chaos: {
        name: 'Chaotic Mixing',
        A: 0.12,
        epsilon: 0.35,
        omega: 1.5,
        particles: 800
    }
};
