#!/usr/bin/env node

/**
 * Double Pendulum Data Collection Script
 * Collects training data by running the double pendulum simulator with various initial conditions
 * Target: 20,000 samples for AI training
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Setup DOM environment for running browser-based simulator
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.console = console;

// Load the simulator
const simulatorPath = path.join(__dirname, '../double-pendulum/simulator.js');
const simulatorCode = fs.readFileSync(simulatorPath, 'utf8');
eval(simulatorCode);

const DATA_DIR = path.join(__dirname, '../ai_data/double-pendulum');
const SAMPLES_PER_TRAJECTORY = 200;  // Number of timesteps per trajectory
const TIMESTEP = 0.01;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log('='.repeat(70));
console.log('Double Pendulum AI Training Data Collection');
console.log('='.repeat(70));
console.log(`Target: 20,000 samples`);
console.log(`Data directory: ${DATA_DIR}`);
console.log('');

/**
 * Generate random initial conditions for double pendulum
 */
function generateRandomIC() {
    // Vary angles from -π to π
    const theta1 = (Math.random() - 0.5) * 2 * Math.PI;
    const theta2 = (Math.random() - 0.5) * 2 * Math.PI;
    
    // Vary angular velocities from -5 to 5 rad/s
    const omega1 = (Math.random() - 0.5) * 10;
    const omega2 = (Math.random() - 0.5) * 10;
    
    // Vary physical parameters slightly
    const l1 = 0.8 + Math.random() * 0.4;  // 0.8 to 1.2
    const l2 = 0.8 + Math.random() * 0.4;  // 0.8 to 1.2
    const m1 = 0.5 + Math.random() * 1.0;  // 0.5 to 1.5
    const m2 = 0.5 + Math.random() * 1.0;  // 0.5 to 1.5
    
    return { theta1, omega1, theta2, omega2, l1, l2, m1, m2 };
}

/**
 * Classify pendulum behavior based on motion characteristics
 */
function classifyBehavior(trajectory, energy_drift) {
    // Calculate motion statistics
    let totalAngleChange1 = 0;
    let totalAngleChange2 = 0;
    let periodicScore = 0;
    
    for (let i = 1; i < trajectory.length; i++) {
        const angleChange1 = Math.abs(trajectory[i].theta1 - trajectory[i-1].theta1);
        const angleChange2 = Math.abs(trajectory[i].theta2 - trajectory[i-1].theta2);
        
        totalAngleChange1 += angleChange1;
        totalAngleChange2 += angleChange2;
    }
    
    const avgAngleChange1 = totalAngleChange1 / trajectory.length;
    const avgAngleChange2 = totalAngleChange2 / trajectory.length;
    
    // Check for periodic motion (looking for repeating patterns)
    const omega1_values = trajectory.map(s => s.omega1);
    const omega2_values = trajectory.map(s => s.omega2);
    
    // Simple autocorrelation check for periodicity
    const mid = Math.floor(trajectory.length / 2);
    let correlation = 0;
    for (let i = 0; i < mid; i++) {
        const diff1 = Math.abs(omega1_values[i] - omega1_values[i + mid]);
        const diff2 = Math.abs(omega2_values[i] - omega2_values[i + mid]);
        correlation += (diff1 + diff2);
    }
    correlation /= mid;
    
    // Classification logic
    if (correlation < 1.0 && avgAngleChange1 < 0.5 && avgAngleChange2 < 0.5) {
        return 'periodic';
    } else if (totalAngleChange1 > 20 || totalAngleChange2 > 20) {
        // High degree of chaotic motion
        return 'chaotic';
    } else if (correlation < 2.0) {
        // Shows some periodicity but not pure periodic
        return 'resonant';
    } else {
        return 'chaotic';
    }
}

/**
 * Calculate Lyapunov exponent approximation (measure of chaos)
 */
function calculateLyapunovApproximation(trajectory) {
    let sum = 0;
    let count = 0;
    
    for (let i = 10; i < trajectory.length; i++) {
        const d1 = Math.abs(trajectory[i].theta1 - trajectory[i-10].theta1);
        const d2 = Math.abs(trajectory[i].theta2 - trajectory[i-10].theta2);
        const distance = Math.sqrt(d1*d1 + d2*d2);
        
        if (distance > 1e-10) {
            sum += Math.log(distance);
            count++;
        }
    }
    
    return count > 0 ? sum / count : 0;
}

/**
 * Run a single simulation trajectory
 */
function runSimulation(ic, trajectoryId) {
    const simulator = new DoublePendulumSimulator();
    
    // Set parameters
    simulator.l1 = ic.l1;
    simulator.l2 = ic.l2;
    simulator.m1 = ic.m1;
    simulator.m2 = ic.m2;
    simulator.dt = TIMESTEP;
    
    // Set initial conditions
    simulator.pendulums[0].state = [ic.theta1, ic.omega1, ic.theta2, ic.omega2];
    simulator.pendulums[0].l1 = ic.l1;
    simulator.pendulums[0].l2 = ic.l2;
    simulator.pendulums[0].m1 = ic.m1;
    simulator.pendulums[0].m2 = ic.m2;
    
    const initialEnergy = simulator.calculateEnergyForPendulum(simulator.pendulums[0]);
    
    // Run simulation
    simulator.play();
    const trajectory = [];
    
    for (let i = 0; i < SAMPLES_PER_TRAJECTORY; i++) {
        simulator.step();
        
        const state = simulator.pendulums[0].state;
        const positions = simulator.getPositionsForPendulum(simulator.pendulums[0]);
        const energy = simulator.calculateEnergyForPendulum(simulator.pendulums[0]);
        
        trajectory.push({
            time: simulator.time,
            theta1: state[0],
            omega1: state[1],
            theta2: state[2],
            omega2: state[3],
            x1: positions.x1,
            y1: positions.y1,
            x2: positions.x2,
            y2: positions.y2,
            energy: energy
        });
    }
    
    const finalEnergy = simulator.calculateEnergyForPendulum(simulator.pendulums[0]);
    const energyDrift = Math.abs((finalEnergy - initialEnergy) / initialEnergy);
    
    // Classify behavior
    const label = classifyBehavior(trajectory, energyDrift);
    const lyapunov = calculateLyapunovApproximation(trajectory);
    
    return {
        trajectoryId,
        initialConditions: ic,
        initialEnergy,
        finalEnergy,
        energyDrift,
        label,
        lyapunov,
        trajectory
    };
}

/**
 * Extract features from trajectory for AI training
 */
function extractFeatures(data) {
    const { initialConditions, trajectory, initialEnergy, lyapunov } = data;
    const ic = initialConditions;
    
    // Initial state features
    const features = [
        ic.theta1, ic.omega1, ic.theta2, ic.omega2,  // Initial state
        ic.l1, ic.l2, ic.m1, ic.m2,                   // Physical parameters
        initialEnergy,                                 // Initial energy
        lyapunov                                       // Chaos measure
    ];
    
    // Statistical features from trajectory
    const theta1_values = trajectory.map(s => s.theta1);
    const theta2_values = trajectory.map(s => s.theta2);
    const omega1_values = trajectory.map(s => s.omega1);
    const omega2_values = trajectory.map(s => s.omega2);
    
    // Mean
    features.push(
        theta1_values.reduce((a,b) => a+b) / theta1_values.length,
        theta2_values.reduce((a,b) => a+b) / theta2_values.length,
        omega1_values.reduce((a,b) => a+b) / omega1_values.length,
        omega2_values.reduce((a,b) => a+b) / omega2_values.length
    );
    
    // Standard deviation
    const mean_theta1 = features[features.length - 4];
    const mean_theta2 = features[features.length - 3];
    const mean_omega1 = features[features.length - 2];
    const mean_omega2 = features[features.length - 1];
    
    features.push(
        Math.sqrt(theta1_values.reduce((a,b) => a + Math.pow(b - mean_theta1, 2), 0) / theta1_values.length),
        Math.sqrt(theta2_values.reduce((a,b) => a + Math.pow(b - mean_theta2, 2), 0) / theta2_values.length),
        Math.sqrt(omega1_values.reduce((a,b) => a + Math.pow(b - mean_omega1, 2), 0) / omega1_values.length),
        Math.sqrt(omega2_values.reduce((a,b) => a + Math.pow(b - mean_omega2, 2), 0) / omega2_values.length)
    );
    
    // Max absolute values
    features.push(
        Math.max(...theta1_values.map(Math.abs)),
        Math.max(...theta2_values.map(Math.abs)),
        Math.max(...omega1_values.map(Math.abs)),
        Math.max(...omega2_values.map(Math.abs))
    );
    
    return features;
}

/**
 * Main data collection function
 */
async function collectData(numTrajectories) {
    console.log(`Starting data collection: ${numTrajectories} trajectories\n`);
    
    const samples = [];
    const startTime = Date.now();
    const labelCounts = { periodic: 0, chaotic: 0, resonant: 0 };
    
    for (let i = 0; i < numTrajectories; i++) {
        if ((i + 1) % 10 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = (i + 1) / elapsed;
            const remaining = (numTrajectories - i - 1) / rate;
            const eta = formatTime(remaining);
            
            process.stdout.write(
                `\rProgress: ${i + 1}/${numTrajectories} (${((i+1)/numTrajectories*100).toFixed(1)}%) | ` +
                `Rate: ${rate.toFixed(1)} traj/s | ETA: ${eta} | ` +
                `P: ${labelCounts.periodic} C: ${labelCounts.chaotic} R: ${labelCounts.resonant}   `
            );
        }
        
        try {
            const ic = generateRandomIC();
            const result = runSimulation(ic, i);
            
            // Create samples from each timestep in the trajectory
            for (let t = 0; t < result.trajectory.length; t++) {
                const point = result.trajectory[t];
                const features = [
                    point.theta1, point.omega1, point.theta2, point.omega2,
                    ic.l1, ic.l2, ic.m1, ic.m2,
                    point.energy,
                    result.lyapunov,
                    point.x1, point.y1, point.x2, point.y2
                ];
                
                samples.push({
                    trajectory_id: i,
                    timestep: t,
                    time: point.time,
                    features: features,
                    label: result.label,
                    metadata: {
                        initialConditions: result.initialConditions,
                        energyDrift: result.energyDrift,
                        lyapunov: result.lyapunov
                    }
                });
            }
            
            labelCounts[result.label]++;
            
        } catch (error) {
            console.error(`\nError in trajectory ${i}:`, error.message);
        }
    }
    
    console.log('\n');
    const totalTime = (Date.now() - startTime) / 1000;
    
    console.log(`\n${'='.repeat(70)}`);
    console.log('Collection Complete!');
    console.log(`Total trajectories: ${numTrajectories}`);
    console.log(`Total samples: ${samples.length}`);
    console.log(`Time elapsed: ${formatTime(totalTime)}`);
    console.log(`Average rate: ${(numTrajectories / totalTime).toFixed(2)} trajectories/s`);
    console.log(`\nLabel distribution:`);
    console.log(`  Periodic: ${labelCounts.periodic} (${(labelCounts.periodic/numTrajectories*100).toFixed(1)}%)`);
    console.log(`  Chaotic: ${labelCounts.chaotic} (${(labelCounts.chaotic/numTrajectories*100).toFixed(1)}%)`);
    console.log(`  Resonant: ${labelCounts.resonant} (${(labelCounts.resonant/numTrajectories*100).toFixed(1)}%)`);
    console.log(`${'='.repeat(70)}\n`);
    
    return samples;
}

/**
 * Save dataset to file
 */
function saveDataset(samples) {
    const timestamp = Date.now();
    const filename = `dataset_${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}_${timestamp}.json`;
    const filepath = path.join(DATA_DIR, filename);
    
    const dataset = {
        metadata: {
            generated: new Date().toISOString(),
            simulator: 'double-pendulum',
            version: '1.0',
            totalSamples: samples.length,
            totalTrajectories: Math.max(...samples.map(s => s.trajectory_id)) + 1,
            samplesPerTrajectory: SAMPLES_PER_TRAJECTORY,
            timestep: TIMESTEP,
            featureNames: [
                'theta1', 'omega1', 'theta2', 'omega2',
                'l1', 'l2', 'm1', 'm2',
                'energy', 'lyapunov',
                'x1', 'y1', 'x2', 'y2'
            ],
            labels: ['periodic', 'chaotic', 'resonant']
        },
        samples: samples
    };
    
    console.log(`Saving dataset to: ${filename}`);
    fs.writeFileSync(filepath, JSON.stringify(dataset, null, 2));
    
    const fileSize = fs.statSync(filepath).size;
    console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✓ Dataset saved successfully!\n`);
    
    return filepath;
}

/**
 * Format time in human-readable format
 */
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds.toFixed(0)}s`;
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

/**
 * Main execution
 */
async function main() {
    try {
        // To get 20k samples with 200 samples per trajectory, we need 100 trajectories
        const numTrajectories = Math.ceil(20000 / SAMPLES_PER_TRAJECTORY);
        
        console.log(`Collecting ${numTrajectories} trajectories × ${SAMPLES_PER_TRAJECTORY} timesteps = ~${numTrajectories * SAMPLES_PER_TRAJECTORY} samples\n`);
        
        const samples = await collectData(numTrajectories);
        const filepath = saveDataset(samples);
        
        console.log('='.repeat(70));
        console.log('Data collection completed successfully!');
        console.log(`Dataset saved to: ${filepath}`);
        console.log(`Ready for training with train_double_pendulum.py`);
        console.log('='.repeat(70));
        
    } catch (error) {
        console.error('\nFatal error:', error);
        process.exit(1);
    }
}

// Check if jsdom is installed
try {
    require('jsdom');
} catch (error) {
    console.error('Error: jsdom is not installed.');
    console.error('Please install it with: npm install jsdom');
    process.exit(1);
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { collectData, saveDataset };
