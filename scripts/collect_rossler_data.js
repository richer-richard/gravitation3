#!/usr/bin/env node

/**
 * Rössler Attractor Data Collection Script
 * Generates training datasets for AI modeling of chaotic dynamics
 * 
 * This script simulates the Rössler attractor with various initial conditions
 * and parameter sets to create a diverse training dataset for neural networks.
 */

const fs = require('fs');
const path = require('path');

// Import simulator (inline version to avoid file dependencies)
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
        this.a = a;
        this.b = b;
        this.c = c;
        this.dt = dt;
        this.time = 0;
        this.steps = 0;
        this.trajectories = [];
    }

    setInitialConditions(trajectories) {
        this.trajectories = trajectories.map(t => ({...t, trail: []}));
        this.time = 0;
        this.steps = 0;
    }

    rosslerDerivatives(state) {
        return {
            x: -state.y - state.z,
            y: state.x + this.a * state.y,
            z: this.b + state.z * (state.x - this.c)
        };
    }

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
}

class RosslerDataCollector {
    constructor(options = {}) {
        this.outputDir = options.outputDir || path.join(__dirname, '../ai_data/rossler-attractor');
        this.numTrajectories = options.numTrajectories || 100;
        this.samplesPerTrajectory = options.samplesPerTrajectory || 5000;
        this.sampleInterval = options.sampleInterval || 10; // Sample every N steps
        this.verbose = options.verbose || false;
    }

    /**
     * Generate random initial conditions with various parameter sets
     */
    generateInitialConditions() {
        // Parameter ranges for exploration
        const paramSets = [
            // Classic chaotic Rössler
            { a: 0.2, b: 0.2, c: 5.7, name: 'classic' },
            // Variations for different dynamics
            { a: 0.1, b: 0.1, c: 4, name: 'chaotic_alt' },
            { a: 0.3, b: 0.3, c: 3, name: 'periodic' },
            { a: 0.2, b: 0.2, c: 9, name: 'funnel' },
            { a: 0.15, b: 0.2, c: 10, name: 'extended' },
            { a: 0.25, b: 0.3, c: 4.5, name: 'intermediate' }
        ];

        const conditions = [];

        for (let i = 0; i < this.numTrajectories; i++) {
            // Randomly select parameter set
            const params = paramSets[Math.floor(Math.random() * paramSets.length)];
            
            // Generate random initial position
            const x = (Math.random() - 0.5) * 20; // Range: [-10, 10]
            const y = (Math.random() - 0.5) * 20; // Range: [-10, 10]
            const z = Math.random() * 20;        // Range: [0, 20]

            conditions.push({
                initialState: { x, y, z },
                parameters: params,
                trajectoryId: i
            });
        }

        return conditions;
    }

    /**
     * Extract features from trajectory for ML training
     */
    extractFeatures(state, derivatives, time, params) {
        return [
            // Current state
            state.x,
            state.y,
            state.z,
            
            // Derivatives (velocity)
            derivatives.x,
            derivatives.y,
            derivatives.z,
            
            // Parameters
            params.a,
            params.b,
            params.c,
            
            // Derived features
            Math.sqrt(state.x ** 2 + state.y ** 2 + state.z ** 2), // Distance from origin
            Math.sqrt(derivatives.x ** 2 + derivatives.y ** 2 + derivatives.z ** 2), // Speed
            state.x * state.y, // Interaction term
            state.z * (state.x - params.c), // Nonlinear coupling term
            
            // Time
            time
        ];
    }

    /**
     * Run simulation and collect data
     */
    async collectData() {
        console.log('=' .repeat(60));
        console.log('Rössler Attractor Data Collection');
        console.log('=' .repeat(60));
        console.log(`Output directory: ${this.outputDir}`);
        console.log(`Trajectories: ${this.numTrajectories}`);
        console.log(`Samples per trajectory: ${this.samplesPerTrajectory}`);
        console.log('');

        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        const conditions = this.generateInitialConditions();
        const allSamples = [];
        
        const startTime = Date.now();
        let totalSamples = 0;

        // Collect data for each trajectory
        for (let i = 0; i < conditions.length; i++) {
            const cond = conditions[i];
            
            if (this.verbose || (i + 1) % 10 === 0) {
                const progress = ((i + 1) / conditions.length * 100).toFixed(1);
                const elapsed = (Date.now() - startTime) / 1000;
                const rate = (i + 1) / elapsed;
                const eta = (conditions.length - i - 1) / rate;
                
                console.log(`  Progress: ${i + 1}/${conditions.length} (${progress}%) | ` +
                           `Rate: ${rate.toFixed(2)} traj/s | ETA: ${this.formatTime(eta)}`);
            }

            // Create simulator with specific parameters
            const simulator = new RosslerSimulator(
                cond.parameters.a,
                cond.parameters.b,
                cond.parameters.c,
                0.01 // dt
            );

            // Set initial conditions
            simulator.setInitialConditions([
                new Trajectory(cond.initialState.x, cond.initialState.y, cond.initialState.z, 0, 'traj')
            ]);

            // Run transient to reach attractor (1000 steps)
            simulator.step(1000);

            // Collect samples
            const trajectorySamples = [];
            for (let j = 0; j < this.samplesPerTrajectory; j++) {
                simulator.step(this.sampleInterval);
                
                const state = simulator.trajectories[0].state;
                const derivatives = simulator.rosslerDerivatives(state);
                const features = this.extractFeatures(state, derivatives, simulator.time, cond.parameters);
                
                trajectorySamples.push({
                    trajectory_id: cond.trajectoryId,
                    timestep: j,
                    time: simulator.time,
                    state: { x: state.x, y: state.y, z: state.z },
                    derivatives: { dx: derivatives.x, dy: derivatives.y, dz: derivatives.z },
                    features: features,
                    parameters: cond.parameters
                });
            }

            allSamples.push(...trajectorySamples);
            totalSamples += trajectorySamples.length;
        }

        const totalTime = (Date.now() - startTime) / 1000;
        
        console.log('');
        console.log('✅ Data collection complete!');
        console.log(`   Total trajectories: ${conditions.length}`);
        console.log(`   Total samples: ${totalSamples}`);
        console.log(`   Total time: ${this.formatTime(totalTime)}`);
        console.log(`   Rate: ${(totalSamples / totalTime).toFixed(2)} samples/s`);

        return {
            samples: allSamples,
            metadata: {
                numTrajectories: conditions.length,
                samplesPerTrajectory: this.samplesPerTrajectory,
                totalSamples: totalSamples,
                sampleInterval: this.sampleInterval,
                featureCount: allSamples[0].features.length,
                collectionTime: totalTime,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Save collected data to file
     */
    saveData(data) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                         Date.now().toString().slice(-8);
        const filename = `rossler_dataset_${timestamp}.json`;
        const filepath = path.join(this.outputDir, filename);

        const output = {
            type: 'rossler-attractor',
            version: '1.0',
            ...data
        };

        fs.writeFileSync(filepath, JSON.stringify(output, null, 2));

        const fileSize = fs.statSync(filepath).size;
        console.log('');
        console.log('💾 Dataset saved!');
        console.log(`   File: ${filename}`);
        console.log(`   Path: ${filepath}`);
        console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        return filepath;
    }

    /**
     * Format time in human-readable format
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds.toFixed(1)}s`;
        } else if (seconds < 3600) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}m ${secs}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${mins}m`;
        }
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    const options = {
        numTrajectories: 100,
        samplesPerTrajectory: 5000,
        sampleInterval: 10,
        verbose: false
    };

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--trajectories' || args[i] === '-t') {
            options.numTrajectories = parseInt(args[++i]);
        } else if (args[i] === '--samples' || args[i] === '-s') {
            options.samplesPerTrajectory = parseInt(args[++i]);
        } else if (args[i] === '--interval' || args[i] === '-i') {
            options.sampleInterval = parseInt(args[++i]);
        } else if (args[i] === '--verbose' || args[i] === '-v') {
            options.verbose = true;
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log('Rössler Attractor Data Collection');
            console.log('');
            console.log('Usage: node collect_rossler_data.js [options]');
            console.log('');
            console.log('Options:');
            console.log('  -t, --trajectories <n>  Number of trajectories (default: 100)');
            console.log('  -s, --samples <n>       Samples per trajectory (default: 5000)');
            console.log('  -i, --interval <n>      Sample every N steps (default: 10)');
            console.log('  -v, --verbose           Verbose output');
            console.log('  -h, --help              Show this help');
            console.log('');
            process.exit(0);
        }
    }

    const collector = new RosslerDataCollector(options);
    
    try {
        const data = await collector.collectData();
        collector.saveData(data);
        
        console.log('');
        console.log('=' .repeat(60));
        console.log('✅ Rössler data collection completed successfully!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.error('');
        console.error('❌ Error during data collection:');
        console.error(error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { RosslerDataCollector };
