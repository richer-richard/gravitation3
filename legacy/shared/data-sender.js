/**
 * Gravitation³ Data Sender
 * Sends real-time simulation data to the data collection server
 */

class DataSender {
    constructor(config = {}) {
        const storedConfig = (() => {
            if (typeof window === 'undefined' || !window.localStorage) return {};
            try {
                const raw = window.localStorage.getItem('gravitation3_config');
                const parsed = raw ? JSON.parse(raw) : {};
                return parsed && typeof parsed === 'object' ? parsed : {};
            } catch {
                return {};
            }
        })();

        const runtimeConfig = {
            ...storedConfig,
            ...((typeof window !== 'undefined' && window.GRAVITATION3_CONFIG) ? window.GRAVITATION3_CONFIG : {})
        };
        const defaultEndpoint = runtimeConfig.dataEndpoint || 'http://localhost:5002/api/data/submit';

        this.config = {
            endpoint: defaultEndpoint,
            simulationId: null,
            simulationName: 'Simulation',
            sendInterval: 100, // Send data every 100ms
            enabled: true,
            ...config
        };
        
        this.dataSource = null;
        this.intervalId = null;
        this.lastSendTime = 0;
        this.sendCount = 0;
        this.errorCount = 0;

        this.consecutiveErrors = 0;
        this.backoffUntil = 0;
        this.maxBackoffMs = 5000;
    }
    
    /**
     * Configure the data sender
     */
    configure(options = {}) {
        Object.assign(this.config, options);
        
        // Generate simulation ID if not provided
        if (!this.config.simulationId) {
            this.config.simulationId = `${this.config.simulationName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        }
    }
    
    /**
     * Start sending data
     */
    start(dataSource) {
        if (!this.config.enabled) {
            console.log('📡 Data sender is disabled');
            return;
        }
        
        if (this.intervalId) {
            console.warn('📡 Data sender already running');
            return;
        }
        
        this.dataSource = dataSource;
        
        console.log('📡 Data sender started:', {
            simulationId: this.config.simulationId,
            simulationName: this.config.simulationName,
            endpoint: this.config.endpoint,
            interval: this.config.sendInterval + 'ms'
        });
        
        // Send initial data immediately
        this.sendData();
        
        // Start periodic sending
        this.intervalId = setInterval(() => {
            this.sendData();
        }, this.config.sendInterval);
    }
    
    /**
     * Stop sending data
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('📡 Data sender stopped. Total sent:', this.sendCount);
        }
    }
    
    /**
     * Send current simulation data
     */
    async sendData() {
        if (!this.dataSource) {
            console.warn('📡 No data source configured');
            return;
        }

        const now = Date.now();
        if (this.backoffUntil && now < this.backoffUntil) {
            return;
        }
        
        try {
            const data = this.extractData();
            
            const payload = {
                simulation_id: this.config.simulationId,
                simulation_name: this.config.simulationName,
                data: data
            };
            
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                this.sendCount++;
                this.lastSendTime = Date.now();
                this.consecutiveErrors = 0;
                this.backoffUntil = 0;
                
                // Log every 100 sends
                if (this.sendCount % 100 === 0) {
                    console.log(`📡 Sent ${this.sendCount} data points`);
                }
            } else {
                this.registerSendError(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.registerSendError(error?.message || 'Unknown error');
        }
    }

    registerSendError(message) {
        this.errorCount++;
        this.consecutiveErrors++;

        const exponent = Math.min(this.consecutiveErrors - 1, 6);
        const backoffMs = Math.min(250 * (2 ** exponent), this.maxBackoffMs);
        this.backoffUntil = Date.now() + backoffMs;

        if (this.errorCount === 1 || this.errorCount % 25 === 0) {
            console.error(`📡 Send error (${this.errorCount} total, backoff ${backoffMs}ms):`, message);
        }
    }
    
    /**
     * Extract data from the data source
     */
    extractData() {
        const data = {
            time: 0,
            energy: 0,
            entropy: 0,
            fps: 60,
            bodies: [],
            parameters: {},
            statistics: {},
            timestep: 0,
            steps: 0
        };
        
        if (!this.dataSource) return data;
        
        try {
            const source = this.dataSource;
            
            // Basic properties
            data.time = source.time ?? 0;
            data.steps = source.steps ?? 0;
            data.timestep = source.dt ?? 0;
            
            // Energy
            data.energy = typeof source.calculateTotalEnergy === 'function' 
                ? source.calculateTotalEnergy() 
                : (source.energy ?? 0);
            
            // Entropy
            data.entropy = typeof source.calculateEntropy === 'function'
                ? source.calculateEntropy()
                : (source.entropy ?? 0);
            
            // FPS
            data.fps = window.lastFPS ?? 60;
            
            // Bodies/trajectories
            if (source.bodies && Array.isArray(source.bodies)) {
                data.bodies = source.bodies.map((body, i) => this.extractBodyData(body, i));
            } else if (source.trajectories && Array.isArray(source.trajectories)) {
                data.bodies = source.trajectories.map((traj, i) => this.extractTrajectoryData(traj, i));
            }
            
            // Parameters
            if (source.G !== undefined) data.parameters.G = source.G;
            if (source.a !== undefined) data.parameters.a = source.a;
            if (source.b !== undefined) data.parameters.b = source.b;
            if (source.c !== undefined) data.parameters.c = source.c;
            if (source.sigma !== undefined) data.parameters.sigma = source.sigma;
            if (source.rho !== undefined) data.parameters.rho = source.rho;
            if (source.beta !== undefined) data.parameters.beta = source.beta;
            if (source.collisionsEnabled !== undefined) {
                data.parameters.collisionsEnabled = source.collisionsEnabled;
            }
            
            // Statistics
            if (typeof source.getMaxDistance === 'function') {
                data.statistics.maxDistance = source.getMaxDistance();
            }
            if (typeof source.getAverageVelocity === 'function') {
                data.statistics.avgVelocity = source.getAverageVelocity();
            }
            
        } catch (error) {
            console.error('Error extracting data:', error);
        }
        
        return data;
    }
    
    /**
     * Extract data from a body object (Three-Body simulation)
     */
    extractBodyData(body, index) {
        const getVector = (vec) => {
            if (!vec) return [0, 0, 0];
            if (Array.isArray(vec)) return vec;
            if (typeof vec.toArray === 'function') return vec.toArray();
            if (vec.x !== undefined) return [vec.x, vec.y ?? 0, vec.z ?? 0];
            return [0, 0, 0];
        };
        
        return {
            name: body.name ?? `Body ${index + 1}`,
            mass: body.mass ?? 1,
            position: getVector(body.position),
            velocity: getVector(body.velocity),
            color: body.color ?? 0xffffff
        };
    }
    
    /**
     * Extract data from a trajectory object (Attractor simulations)
     */
    extractTrajectoryData(traj, index) {
        const state = traj.state ?? {};
        
        return {
            name: traj.name ?? `Trajectory ${index + 1}`,
            mass: 1, // Trajectories don't have mass
            position: [state.x ?? 0, state.y ?? 0, state.z ?? 0],
            velocity: [0, 0, 0], // Attractors don't track velocity separately
            color: traj.color ?? 0xffffff
        };
    }
    
    /**
     * Get status information
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            running: this.intervalId !== null,
            simulationId: this.config.simulationId,
            simulationName: this.config.simulationName,
            sendCount: this.sendCount,
            errorCount: this.errorCount,
            lastSendTime: this.lastSendTime
        };
    }
}

// Create global instance
window.DataSender = DataSender;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataSender;
}
