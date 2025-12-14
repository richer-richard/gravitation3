#!/usr/bin/env node

// Training Data Generation Script
// Generates labeled datasets for all simulators with weighted data support

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const config = require('./config/training_config');
const FeatureExtractor = require('./utils/feature_extraction');
const AutoLabeler = require('./utils/labeling');
const DataWeightManager = require('./utils/data_weighting');

// Simulator mock classes (to be replaced with actual simulator imports)
class SimulatorRunner {
  constructor(simulatorType) {
    this.type = simulatorType;
  }
  
  /**
   * Run a simulation with given initial conditions
   * Returns trajectory and outcome data
   */
  async run(initialConditions, parameters) {
    console.log(`  Running ${this.type} simulation...`);
    
    // This is a mock - replace with actual simulator execution
    // In real implementation, this would load the actual simulator.js file
    // and run it with the given conditions
    
    return {
      initialConditions,
      parameters,
      trajectory: this.generateMockTrajectory(initialConditions, parameters),
      success: true
    };
  }
  
  /**
   * Generate random initial conditions for this simulator
   */
  generateRandomIC() {
    const generators = {
      'three-body': this.generateThreeBodyIC.bind(this),
      'double-pendulum': this.generateDoublePendulumIC.bind(this),
      'lorenz-attractor': this.generateLorenzIC.bind(this),
      'rossler-attractor': this.generateRosslerIC.bind(this),
      'hopalong-attractor': this.generateHopalongIC.bind(this),
      'double-gyre': this.generateDoubleGyreIC.bind(this),
      'lid-cavity': this.generateLidCavityIC.bind(this),
      'malkus-waterwheel': this.generateMalkusIC.bind(this),
      'turbulent-jet': this.generateTurbulentJetIC.bind(this)
    };
    
    return generators[this.type]();
  }
  
  // Initial condition generators for each simulator
  generateThreeBodyIC() {
    return {
      masses: [
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5
      ],
      positions: [
        [Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 2 - 1],
        [Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 2 - 1],
        [Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 2 - 1]
      ],
      velocities: [
        [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 0.4 - 0.2],
        [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 0.4 - 0.2],
        [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 0.4 - 0.2]
      ]
    };
  }
  
  generateDoublePendulumIC() {
    return {
      theta1: Math.random() * Math.PI - Math.PI / 2,
      theta2: Math.random() * Math.PI - Math.PI / 2,
      omega1: Math.random() * 2 - 1,
      omega2: Math.random() * 2 - 1
    };
  }
  
  generateLorenzIC() {
    return {
      x: Math.random() * 20 - 10,
      y: Math.random() * 20 - 10,
      z: Math.random() * 40
    };
  }
  
  generateRosslerIC() {
    return {
      x: Math.random() * 10 - 5,
      y: Math.random() * 10 - 5,
      z: Math.random() * 10
    };
  }
  
  generateHopalongIC() {
    return {
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1
    };
  }
  
  generateDoubleGyreIC() {
    return {
      particles: Array(100).fill(0).map(() => ({
        x: Math.random() * 2,
        y: Math.random()
      }))
    };
  }
  
  generateLidCavityIC() {
    return {
      gridSize: 64,
      initialVelocity: [[0, 0]]
    };
  }
  
  generateMalkusIC() {
    return {
      angularVelocity: Math.random() * 2 - 1,
      bucketFill: Array(8).fill(0).map(() => Math.random())
    };
  }
  
  generateTurbulentJetIC() {
    return {
      jetProfile: 'laminar',
      perturbation: Math.random() * 0.1
    };
  }
  
  // Mock trajectory generation (replace with actual simulation)
  generateMockTrajectory(ic, params) {
    const steps = 100;
    const trajectory = [];
    
    for (let i = 0; i < steps; i++) {
      // Generate mock trajectory points
      // In real implementation, this would be actual simulation output
      trajectory.push({
        t: i * 0.01,
        x: Math.sin(i * 0.1) * Math.random(),
        y: Math.cos(i * 0.1) * Math.random(),
        z: Math.random()
      });
    }
    
    return trajectory;
  }
  
  getDefaultParameters() {
    const defaults = {
      'three-body': { G: 1.0, dt: 0.001 },
      'double-pendulum': { m1: 1.0, m2: 1.0, l1: 1.0, l2: 1.0, g: 9.81 },
      'lorenz-attractor': { sigma: 10, rho: 28, beta: 8/3 },
      'rossler-attractor': { a: 0.2, b: 0.2, c: 5.7 },
      'hopalong-attractor': { a: 0.4, b: 1.0, c: 0.0 },
      'double-gyre': { amplitude: 0.1, frequency: 0.628, epsilon: 0.25 },
      'lid-cavity': { reynoldsNumber: 1000, lidVelocity: 1.0 },
      'malkus-waterwheel': { damping: 0.1, inflowRate: 1.0, numBuckets: 8, gravity: 9.81 },
      'turbulent-jet': { reynoldsNumber: 5000, jetVelocity: 10.0, jetWidth: 0.1 }
    };
    
    return defaults[this.type] || {};
  }
}

// Main data generation class
class TrainingDataGenerator {
  constructor(simulatorType, options = {}) {
    this.simulatorType = simulatorType;
    this.options = options;
    this.config = config;
    
    this.simulator = new SimulatorRunner(simulatorType);
    this.featureExtractor = new FeatureExtractor(simulatorType);
    this.labeler = new AutoLabeler(simulatorType, config);
    this.weightManager = new DataWeightManager(config);
    
    this.simulatorConfig = config.classifiers[simulatorType];
  }
  
  /**
   * Generate training dataset
   */
  async generate(numSamples) {
    console.log(`\n🎯 Generating ${numSamples} samples for ${this.simulatorType}...\n`);
    
    const samples = [];
    let successCount = 0;
    let failCount = 0;
    
    const startTime = Date.now();
    
    for (let i = 0; i < numSamples; i++) {
      // Progress indicator
      if ((i + 1) % 100 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (i + 1) / elapsed;
        const remaining = (numSamples - i - 1) / rate;
        
        console.log(`  Progress: ${i + 1}/${numSamples} (${((i+1)/numSamples*100).toFixed(1)}%) | ` +
                   `Rate: ${rate.toFixed(1)} samples/s | ` +
                   `ETA: ${this.formatTime(remaining)}`);
      }
      
      try {
        const sample = await this.generateSample();
        samples.push(sample);
        successCount++;
      } catch (error) {
        failCount++;
        if (this.options.verbose) {
          console.error(`  ⚠️  Sample ${i + 1} failed:`, error.message);
        }
      }
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    
    console.log(`\n✅ Generation complete!`);
    console.log(`   Success: ${successCount}/${numSamples} (${(successCount/numSamples*100).toFixed(1)}%)`);
    console.log(`   Failed: ${failCount}/${numSamples}`);
    console.log(`   Total time: ${this.formatTime(totalTime)}`);
    console.log(`   Average rate: ${(successCount / totalTime).toFixed(2)} samples/s\n`);
    
    return samples;
  }
  
  /**
   * Generate a single training sample
   */
  async generateSample() {
    // Generate random initial conditions
    const initialConditions = this.simulator.generateRandomIC();
    const parameters = this.simulator.getDefaultParameters();
    
    // Run simulation
    const result = await this.simulator.run(initialConditions, parameters);
    
    if (!result.success) {
      throw new Error('Simulation failed');
    }
    
    // Extract features
    const features = this.featureExtractor.extract({
      initialConditions: result.initialConditions,
      trajectory: result.trajectory,
      parameters: result.parameters
    });
    
    // Auto-label the outcome
    const label = this.labeler.label({
      initialConditions: result.initialConditions,
      trajectory: result.trajectory,
      parameters: result.parameters
    });
    
    // Create sample with metadata
    return {
      features,
      label,
      metadata: {
        simulatorType: this.simulatorType,
        createdAt: new Date().toISOString(),
        version: 'v1',
        initialConditions: result.initialConditions,
        parameters: result.parameters
      }
    };
  }
  
  /**
   * Save dataset with proper weighting integration
   */
  async saveDataset(samples, outputPath, options = {}) {
    console.log(`\n💾 Saving dataset...`);
    
    const { append, merge } = options;
    
    let finalSamples = samples;
    let datasetInfo = {
      totalSamples: samples.length,
      versions: 1,
      oldestData: new Date().toISOString(),
      newestData: new Date().toISOString()
    };
    
    // Handle merging with existing data
    if (merge || append) {
      const dataDir = path.dirname(outputPath);
      
      if (fs.existsSync(dataDir)) {
        console.log(`   Merging with existing datasets...`);
        
        const { mergedData, weightedData, datasetInfo: info } = 
          this.weightManager.loadAndMergeWithNewData(dataDir, samples);
        
        finalSamples = mergedData;
        datasetInfo = info;
        
        console.log(`   Merged ${info.versions} datasets`);
        console.log(`   Total samples: ${info.totalSamples}`);
        
        // Print weight statistics
        this.weightManager.printWeightStats(weightedData.stats);
      }
    }
    
    // Prepare output
    const output = {
      simulatorType: this.simulatorType,
      version: this.weightManager.getNextVersion([{ version: 'v1' }]),
      createdAt: new Date().toISOString(),
      config: {
        sampleSize: samples.length,
        labels: this.simulatorConfig.labels,
        features: this.featureExtractor.extract(samples[0]?.metadata || {}).length
      },
      weighting: {
        enabled: config.dataWeighting.enabled,
        strategy: config.dataWeighting.strategy
      },
      samples: finalSamples,
      datasetInfo
    };
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    const fileSize = fs.statSync(outputPath).size;
    console.log(`   ✅ Saved to: ${outputPath}`);
    console.log(`   File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Print label distribution
    this.printLabelDistribution(finalSamples);
    
    return output;
  }
  
  /**
   * Print label distribution statistics
   */
  printLabelDistribution(samples) {
    const distribution = {};
    
    samples.forEach(sample => {
      const label = sample.label;
      distribution[label] = (distribution[label] || 0) + 1;
    });
    
    console.log(`\n   📊 Label Distribution:`);
    Object.keys(distribution).sort().forEach(label => {
      const count = distribution[label];
      const percent = (count / samples.length * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(percent / 2));
      console.log(`   ${label.padEnd(20)} ${count.toString().padStart(5)} (${percent.padStart(5)}%) ${bar}`);
    });
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
  const program = new Command();
  
  program
    .name('generate_training_data')
    .description('Generate training datasets for Gravitation³ AI models')
    .version('1.0.0');
  
  program
    .option('-s, --simulator <type>', 'Simulator type (e.g., three-body)', 'three-body')
    .option('-n, --samples <number>', 'Number of samples to generate', '1000')
    .option('-o, --output <path>', 'Output file path')
    .option('-a, --append', 'Append to existing dataset', false)
    .option('-m, --merge', 'Merge with existing datasets', false)
    .option('-v, --verbose', 'Verbose output', false)
    .option('--all', 'Generate data for all simulators', false);
  
  program.parse(process.argv);
  const options = program.opts();
  
  // Validate simulator type
  const validSimulators = Object.keys(config.classifiers);
  
  if (options.all) {
    console.log('🚀 Generating training data for all simulators...\n');
    
    for (const simulator of validSimulators) {
      await generateForSimulator(simulator, options);
    }
    
    console.log('\n✅ All datasets generated successfully!\n');
  } else {
    if (!validSimulators.includes(options.simulator)) {
      console.error(`❌ Error: Invalid simulator type '${options.simulator}'`);
      console.error(`   Valid types: ${validSimulators.join(', ')}\n`);
      process.exit(1);
    }
    
    await generateForSimulator(options.simulator, options);
  }
}

async function generateForSimulator(simulator, options) {
  const numSamples = parseInt(options.samples);
  
  // Determine output path
  const outputPath = options.output || 
    path.join(config.paths.data, simulator, `dataset_${Date.now()}.json`);
  
  // Create generator
  const generator = new TrainingDataGenerator(simulator, {
    verbose: options.verbose
  });
  
  // Generate samples
  const samples = await generator.generate(numSamples);
  
  // Save dataset
  await generator.saveDataset(samples, outputPath, {
    append: options.append,
    merge: options.merge
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = { TrainingDataGenerator, SimulatorRunner };
