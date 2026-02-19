#!/usr/bin/env node

/**
 * AI Training Manager - Interactive Training System
 * 
 * Features:
 * - Interactive menu for choosing operations
 * - Data collection in 10K batches (20K total per model)
 * - Training in 10K batches
 * - Separate weighting for generated vs user data
 * - User output collection system
 * - 9 separate models (one per simulator)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { TrainingDataGenerator, SimulatorRunner } = require('./generate_training_data');
const { ClassifierTrainer } = require('./train_classifier');
const config = require('./config/training_config');

// ANSI color codes for better UI
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

class AITrainingManager {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.simulators = [
      'three-body',
      'double-pendulum',
      'lorenz-attractor',
      'rossler-attractor',
      'hopalong-attractor',
      'double-gyre',
      'lid-cavity',
      'malkus-waterwheel',
      'turbulent-jet'
    ];
    
    this.batchSize = 10000; // 10K per batch
    this.totalSamplesPerModel = 20000; // 20K total
    
    // User data configuration
    this.userDataConfig = {
      generatedWeight: 1.0,   // Full weight for generated data
      userWeight: 1.5,        // Higher weight for user data (50% more important)
      userDataPath: 'ai_data/user_outputs'
    };
    
    this.ensureDirectories();
  }
  
  /**
   * Ensure all necessary directories exist
   */
  ensureDirectories() {
    const dirs = [
      'ai_data',
      'ai_data/user_outputs',
      'models',
      'training_logs'
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Create user output collection files for each simulator if they don't exist
    this.simulators.forEach(sim => {
      const userOutputPath = path.join(this.userDataConfig.userDataPath, `${sim}_user_outputs.json`);
      if (!fs.existsSync(userOutputPath)) {
        fs.writeFileSync(userOutputPath, JSON.stringify({
          simulator: sim,
          createdAt: new Date().toISOString(),
          userOutputs: [],
          metadata: {
            description: 'User interaction outputs for training',
            dataSource: 'user',
            weight: this.userDataConfig.userWeight
          }
        }, null, 2));
      }
    });
  }
  
  /**
   * Ask user a question and get response
   */
  question(query) {
    return new Promise(resolve => this.rl.question(query, resolve));
  }
  
  /**
   * Clear console
   */
  clear() {
    console.clear();
  }
  
  /**
   * Print header
   */
  printHeader() {
    this.clear();
    console.log(`${colors.cyan}${colors.bright}`);
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          Gravitation³ AI Training Manager v2.0                ║');
    console.log('║    Interactive Data Collection & Model Training System        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(colors.reset);
  }
  
  /**
   * Main menu
   */
  async showMainMenu() {
    this.printHeader();
    
    console.log(`${colors.green}Main Menu:${colors.reset}\n`);
    console.log('  1. 📊 Collect Training Data (10K batches)');
    console.log('  2. 🧠 Train Models (10K batch training)');
    console.log('  3. 📝 View Data Collection Status');
    console.log('  4. 🎯 View Training Status');
    console.log('  5. 👤 Manage User Output Data');
    console.log('  6. ⚙️  Configuration & Settings');
    console.log('  7. 🚪 Exit\n');
    
    const choice = await this.question(`${colors.yellow}Enter your choice (1-7): ${colors.reset}`);
    
    switch (choice.trim()) {
      case '1':
        await this.collectDataMenu();
        break;
      case '2':
        await this.trainModelsMenu();
        break;
      case '3':
        await this.viewDataStatus();
        break;
      case '4':
        await this.viewTrainingStatus();
        break;
      case '5':
        await this.manageUserDataMenu();
        break;
      case '6':
        await this.configurationMenu();
        break;
      case '7':
        console.log(`\n${colors.green}Thank you for using AI Training Manager!${colors.reset}\n`);
        this.rl.close();
        return;
      default:
        console.log(`${colors.red}Invalid choice. Please try again.${colors.reset}`);
        await this.question('Press Enter to continue...');
    }
    
    // Return to main menu
    await this.showMainMenu();
  }
  
  /**
   * Data collection menu
   */
  async collectDataMenu() {
    this.printHeader();
    
    console.log(`${colors.green}Data Collection Menu${colors.reset}\n`);
    console.log('Select simulator to collect data for:\n');
    
    this.simulators.forEach((sim, index) => {
      const status = this.getDataCollectionStatus(sim);
      const statusColor = status.percentage >= 100 ? colors.green : colors.yellow;
      console.log(`  ${index + 1}. ${sim.padEnd(25)} ${statusColor}[${status.collected}/${status.target}]${colors.reset}`);
    });
    
    console.log(`  ${this.simulators.length + 1}. Collect All (batch mode)`);
    console.log(`  0. Back to Main Menu\n`);
    
    const choice = await this.question(`${colors.yellow}Enter choice: ${colors.reset}`);
    const index = parseInt(choice) - 1;
    
    if (choice === '0') {
      return;
    } else if (index === this.simulators.length) {
      await this.collectAllData();
    } else if (index >= 0 && index < this.simulators.length) {
      await this.collectDataForSimulator(this.simulators[index]);
    } else {
      console.log(`${colors.red}Invalid choice.${colors.reset}`);
      await this.question('Press Enter to continue...');
    }
  }
  
  /**
   * Get data collection status for a simulator
   */
  getDataCollectionStatus(simulator) {
    const dataDir = path.join('ai_data', simulator);
    let collected = 0;
    
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      files.forEach(file => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
          collected += (data.samples || data).length;
        } catch (e) {
          // Skip invalid files
        }
      });
    }
    
    return {
      collected,
      target: this.totalSamplesPerModel,
      percentage: (collected / this.totalSamplesPerModel * 100).toFixed(1),
      remaining: Math.max(0, this.totalSamplesPerModel - collected)
    };
  }
  
  /**
   * Collect data for a specific simulator
   */
  async collectDataForSimulator(simulator) {
    this.printHeader();
    
    const status = this.getDataCollectionStatus(simulator);
    
    console.log(`${colors.cyan}Collecting data for: ${simulator}${colors.reset}\n`);
    console.log(`Current status: ${status.collected}/${status.target} samples (${status.percentage}%)`);
    console.log(`Remaining: ${status.remaining} samples\n`);
    
    if (status.remaining <= 0) {
      console.log(`${colors.green}✅ Data collection complete for this simulator!${colors.reset}\n`);
      const overwrite = await this.question('Collect additional data anyway? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        return;
      }
    }
    
    // Ask how many batches
    const batchesNeeded = Math.ceil(status.remaining / this.batchSize);
    console.log(`Suggested batches: ${batchesNeeded} (${this.batchSize} samples each)\n`);
    
    const batchInput = await this.question(`How many batches to collect (1-${Math.max(1, batchesNeeded)}): `);
    const numBatches = parseInt(batchInput) || 1;
    
    console.log(`\n${colors.green}Starting data collection...${colors.reset}\n`);
    
    // Collect data in batches
    for (let batch = 1; batch <= numBatches; batch++) {
      console.log(`${colors.cyan}===== Batch ${batch}/${numBatches} =====${colors.reset}\n`);
      
      const generator = new TrainingDataGenerator(simulator, { verbose: false });
      const samples = await generator.generate(this.batchSize);
      
      // Add data source metadata (this is generated data)
      samples.forEach(sample => {
        if (!sample.metadata) sample.metadata = {};
        sample.metadata.dataSource = 'generated';
        sample.metadata.weight = this.userDataConfig.generatedWeight;
        sample.metadata.batchNumber = batch;
      });
      
      // Save batch
      const outputPath = path.join(
        'ai_data',
        simulator,
        `generated_batch_${batch}_${Date.now()}.json`
      );
      
      await generator.saveDataset(samples, outputPath, { merge: false });
      
      console.log(`${colors.green}✅ Batch ${batch} saved!${colors.reset}\n`);
    }
    
    console.log(`${colors.green}${colors.bright}Data collection complete!${colors.reset}\n`);
    await this.question('Press Enter to continue...');
  }
  
  /**
   * Collect data for all simulators
   */
  async collectAllData() {
    this.printHeader();
    
    console.log(`${colors.cyan}Collecting data for ALL simulators${colors.reset}\n`);
    console.log('This will collect 1 batch (10K samples) for each simulator that needs data.\n');
    
    const confirm = await this.question('Continue? (y/n): ');
    if (confirm.toLowerCase() !== 'y') return;
    
    for (const simulator of this.simulators) {
      const status = this.getDataCollectionStatus(simulator);
      
      if (status.remaining > 0) {
        console.log(`\n${colors.cyan}Processing: ${simulator}${colors.reset}`);
        console.log(`Remaining: ${status.remaining} samples\n`);
        
        const generator = new TrainingDataGenerator(simulator, { verbose: false });
        const samples = await generator.generate(this.batchSize);
        
        samples.forEach(sample => {
          if (!sample.metadata) sample.metadata = {};
          sample.metadata.dataSource = 'generated';
          sample.metadata.weight = this.userDataConfig.generatedWeight;
        });
        
        const outputPath = path.join(
          'ai_data',
          simulator,
          `generated_batch_${Date.now()}.json`
        );
        
        await generator.saveDataset(samples, outputPath, { merge: false });
        console.log(`${colors.green}✅ Complete!${colors.reset}`);
      } else {
        console.log(`\n${colors.green}${simulator}: Already complete (${status.collected} samples)${colors.reset}`);
      }
    }
    
    console.log(`\n${colors.green}${colors.bright}All data collection complete!${colors.reset}\n`);
    await this.question('Press Enter to continue...');
  }
  
  /**
   * Training menu
   */
  async trainModelsMenu() {
    this.printHeader();
    
    console.log(`${colors.green}Model Training Menu${colors.reset}\n`);
    console.log('Select simulator to train:\n');
    
    this.simulators.forEach((sim, index) => {
      const dataStatus = this.getDataCollectionStatus(sim);
      const trainStatus = this.getTrainingStatus(sim);
      
      const dataColor = dataStatus.percentage >= 100 ? colors.green : colors.red;
      const trainColor = trainStatus.exists ? colors.green : colors.yellow;
      
      console.log(`  ${index + 1}. ${sim.padEnd(25)} ` +
        `Data: ${dataColor}${dataStatus.percentage}%${colors.reset} | ` +
        `Model: ${trainColor}${trainStatus.exists ? 'Trained' : 'Not trained'}${colors.reset}`);
    });
    
    console.log(`  ${this.simulators.length + 1}. Train All (batch mode)`);
    console.log(`  0. Back to Main Menu\n`);
    
    const choice = await this.question(`${colors.yellow}Enter choice: ${colors.reset}`);
    const index = parseInt(choice) - 1;
    
    if (choice === '0') {
      return;
    } else if (index === this.simulators.length) {
      await this.trainAllModels();
    } else if (index >= 0 && index < this.simulators.length) {
      await this.trainModelForSimulator(this.simulators[index]);
    } else {
      console.log(`${colors.red}Invalid choice.${colors.reset}`);
      await this.question('Press Enter to continue...');
    }
  }
  
  /**
   * Get training status for a simulator
   */
  getTrainingStatus(simulator) {
    const modelPath = path.join('models', simulator, 'classifier', 'model.json');
    const metadataPath = path.join('models', simulator, 'classifier', 'metadata.json');
    
    const exists = fs.existsSync(modelPath);
    let metadata = null;
    
    if (exists && fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (e) {
        // Ignore
      }
    }
    
    return {
      exists,
      metadata,
      trainedAt: metadata?.trainedAt,
      accuracy: metadata?.bestValAccuracy
    };
  }
  
  /**
   * Train model for specific simulator with weighted data
   */
  async trainModelForSimulator(simulator) {
    this.printHeader();
    
    console.log(`${colors.cyan}Training model for: ${simulator}${colors.reset}\n`);
    
    // Check data availability
    const dataStatus = this.getDataCollectionStatus(simulator);
    
    if (dataStatus.collected < 1000) {
      console.log(`${colors.red}❌ Insufficient data! Need at least 1000 samples.${colors.reset}`);
      console.log(`Currently have: ${dataStatus.collected} samples\n`);
      await this.question('Press Enter to continue...');
      return;
    }
    
    console.log(`Available data: ${dataStatus.collected} samples\n`);
    
    // Load and merge all data with proper weighting
    console.log(`${colors.yellow}Loading and merging datasets with weights...${colors.reset}\n`);
    const weightedData = await this.loadAndWeightData(simulator);
    
    console.log(`${colors.green}Data loaded:${colors.reset}`);
    console.log(`  Total samples: ${weightedData.samples.length}`);
    console.log(`  Generated data: ${weightedData.stats.generated} samples (weight: ${this.userDataConfig.generatedWeight})`);
    console.log(`  User data: ${weightedData.stats.user} samples (weight: ${this.userDataConfig.userWeight})`);
    console.log(`  Effective weight ratio: ${weightedData.stats.effectiveRatio.toFixed(2)}x more importance to user data\n`);
    
    // Ask for training batches
    const batchInput = await this.question(`Train in batches? (1=all at once, 2=two 10K batches): `);
    const numBatches = parseInt(batchInput) || 1;
    
    if (numBatches === 1) {
      // Train on all data at once
      await this.trainWithData(simulator, weightedData);
    } else {
      // Train in batches
      const samplesPerBatch = Math.floor(weightedData.samples.length / numBatches);
      
      for (let batch = 1; batch <= numBatches; batch++) {
        console.log(`\n${colors.cyan}===== Training Batch ${batch}/${numBatches} =====${colors.reset}\n`);
        
        const startIdx = (batch - 1) * samplesPerBatch;
        const endIdx = batch === numBatches ? weightedData.samples.length : batch * samplesPerBatch;
        
        const batchData = {
          samples: weightedData.samples.slice(startIdx, endIdx),
          weights: weightedData.weights.slice(startIdx, endIdx),
          stats: weightedData.stats
        };
        
        console.log(`Batch size: ${batchData.samples.length} samples\n`);
        
        await this.trainWithData(simulator, batchData, batch > 1); // Continue training after first batch
        
        console.log(`${colors.green}✅ Batch ${batch} training complete!${colors.reset}\n`);
      }
    }
    
    console.log(`${colors.green}${colors.bright}Model training complete!${colors.reset}\n`);
    await this.question('Press Enter to continue...');
  }
  
  /**
   * Load and weight data from all sources
   */
  async loadAndWeightData(simulator) {
    const samples = [];
    const weights = [];
    let generatedCount = 0;
    let userCount = 0;
    
    // Load generated data
    const dataDir = path.join('ai_data', simulator);
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
          const fileSamples = data.samples || data;
          
          fileSamples.forEach(sample => {
            samples.push(sample);
            
            // Determine weight based on data source
            const source = sample.metadata?.dataSource || 'generated';
            const weight = source === 'user' ? this.userDataConfig.userWeight : this.userDataConfig.generatedWeight;
            weights.push(weight);
            
            if (source === 'user') {
              userCount++;
            } else {
              generatedCount++;
            }
          });
        } catch (e) {
          console.warn(`Warning: Could not load ${file}`);
        }
      }
    }
    
    // Load user output data
    const userOutputPath = path.join(this.userDataConfig.userDataPath, `${simulator}_user_outputs.json`);
    if (fs.existsSync(userOutputPath)) {
      try {
        const userData = JSON.parse(fs.readFileSync(userOutputPath, 'utf8'));
        if (userData.userOutputs && userData.userOutputs.length > 0) {
          userData.userOutputs.forEach(sample => {
            if (!sample.metadata) sample.metadata = {};
            sample.metadata.dataSource = 'user';
            samples.push(sample);
            weights.push(this.userDataConfig.userWeight);
            userCount++;
          });
        }
      } catch (e) {
        console.warn(`Warning: Could not load user output data`);
      }
    }
    
    // Calculate effective ratio
    const totalGeneratedWeight = generatedCount * this.userDataConfig.generatedWeight;
    const totalUserWeight = userCount * this.userDataConfig.userWeight;
    const effectiveRatio = userCount > 0 ? (totalUserWeight / Math.max(1, totalGeneratedWeight)) : 0;
    
    return {
      samples,
      weights,
      stats: {
        generated: generatedCount,
        user: userCount,
        total: samples.length,
        effectiveRatio
      }
    };
  }
  
  /**
   * Train model with weighted data
   */
  async trainWithData(simulator, weightedData, continueTraining = false) {
    // Create temporary dataset file
    const tempDataPath = path.join('ai_data', simulator, `temp_training_data_${Date.now()}.json`);
    
    fs.writeFileSync(tempDataPath, JSON.stringify({
      simulator,
      samples: weightedData.samples,
      createdAt: new Date().toISOString(),
      weighting: {
        enabled: true,
        weights: weightedData.weights,
        stats: weightedData.stats
      }
    }, null, 2));
    
    try {
      // Create trainer
      const trainer = new ClassifierTrainer(simulator);
      
      // Load data with weights
      const loadedData = trainer.loadData(tempDataPath);
      
      // Prepare dataset
      const dataset = trainer.prepareDataset(
        loadedData,
        trainer.config.training.validationSplit
      );
      
      // Build or load model
      let model;
      if (continueTraining) {
        // Load existing model
        const modelPath = path.join('models', simulator, 'classifier', 'model.json');
        if (fs.existsSync(modelPath)) {
          const tf = require('@tensorflow/tfjs-node');
          model = await tf.loadLayersModel(`file://${path.dirname(modelPath)}/model.json`);
          console.log(`${colors.green}Continuing training from existing model...${colors.reset}\n`);
        } else {
          model = trainer.buildModel(dataset.trainX.shape[1], trainer.config.labels.length);
        }
      } else {
        model = trainer.buildModel(dataset.trainX.shape[1], trainer.config.labels.length);
      }
      
      // Train
      const { bestValAcc } = await trainer.train(model, dataset);
      
      // Evaluate
      await trainer.evaluate(model, dataset);
      
      // Save model
      const outputPath = path.join('models', simulator, 'classifier', 'model.json');
      await trainer.saveModel(model, dataset.normalization, {
        bestValAccuracy: bestValAcc,
        dataPath: tempDataPath,
        numSamples: weightedData.samples.length,
        weightingStats: weightedData.stats
      }, outputPath);
      
      // Clean up
      dataset.trainX.dispose();
      dataset.trainY.dispose();
      dataset.valX.dispose();
      dataset.valY.dispose();
      if (dataset.trainWeights) dataset.trainWeights.dispose();
      dataset.normalization.mean.dispose();
      dataset.normalization.std.dispose();
      
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempDataPath)) {
        fs.unlinkSync(tempDataPath);
      }
    }
  }
  
  /**
   * Train all models in sequence
   */
  async trainAllModels() {
    this.printHeader();
    
    console.log(`${colors.cyan}Training ALL models${colors.reset}\n`);
    console.log('This will train models for all simulators with sufficient data.\n');
    
    const confirm = await this.question('Continue? (y/n): ');
    if (confirm.toLowerCase() !== 'y') return;
    
    for (const simulator of this.simulators) {
      const dataStatus = this.getDataCollectionStatus(simulator);
      
      if (dataStatus.collected >= 1000) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`${colors.cyan}Training: ${simulator}${colors.reset}`);
        console.log('='.repeat(70));
        
        const weightedData = await this.loadAndWeightData(simulator);
        await this.trainWithData(simulator, weightedData);
        
        console.log(`${colors.green}✅ ${simulator} complete!${colors.reset}`);
      } else {
        console.log(`\n${colors.yellow}⚠️  Skipping ${simulator}: Insufficient data (${dataStatus.collected} samples)${colors.reset}`);
      }
    }
    
    console.log(`\n${colors.green}${colors.bright}All model training complete!${colors.reset}\n`);
    await this.question('Press Enter to continue...');
  }
  
  /**
   * View data collection status
   */
  async viewDataStatus() {
    this.printHeader();
    
    console.log(`${colors.green}Data Collection Status${colors.reset}\n`);
    console.log(`${'Simulator'.padEnd(25)} ${'Collected'.padEnd(12)} ${'Progress'.padEnd(12)} ${'Remaining'}`);
    console.log('='.repeat(70));
    
    this.simulators.forEach(sim => {
      const status = this.getDataCollectionStatus(sim);
      const progressBar = this.createProgressBar(status.percentage);
      const statusColor = status.percentage >= 100 ? colors.green : colors.yellow;
      
      console.log(
        `${sim.padEnd(25)} ` +
        `${statusColor}${status.collected}/${status.target}${colors.reset}`.padEnd(20) +
        `${progressBar.padEnd(20)} ` +
        `${statusColor}${status.remaining}${colors.reset}`
      );
    });
    
    console.log('\n');
    await this.question('Press Enter to continue...');
  }
  
  /**
   * View training status
   */
  async viewTrainingStatus() {
    this.printHeader();
    
    console.log(`${colors.green}Model Training Status${colors.reset}\n`);
    console.log(`${'Simulator'.padEnd(25)} ${'Status'.padEnd(15)} ${'Accuracy'.padEnd(12)} ${'Trained'}`);
    console.log('='.repeat(70));
    
    this.simulators.forEach(sim => {
      const status = this.getTrainingStatus(sim);
      const statusText = status.exists ? 'Trained' : 'Not trained';
      const statusColor = status.exists ? colors.green : colors.red;
      const accuracy = status.accuracy ? `${(status.accuracy * 100).toFixed(2)}%` : 'N/A';
      const trainedAt = status.trainedAt ? new Date(status.trainedAt).toLocaleDateString() : 'N/A';
      
      console.log(
        `${sim.padEnd(25)} ` +
        `${statusColor}${statusText.padEnd(15)}${colors.reset} ` +
        `${accuracy.padEnd(12)} ` +
        `${trainedAt}`
      );
    });
    
    console.log('\n');
    await this.question('Press Enter to continue...');
  }
  
  /**
   * User data management menu
   */
  async manageUserDataMenu() {
    this.printHeader();
    
    console.log(`${colors.green}User Output Data Management${colors.reset}\n`);
    console.log('User data is collected from actual simulator usage and has higher weight in training.\n');
    
    console.log('Options:\n');
    console.log('  1. View user data status');
    console.log('  2. View user data collection files');
    console.log('  3. Set user data weight multiplier');
    console.log('  4. Export user data summary');
    console.log('  0. Back to Main Menu\n');
    
    const choice = await this.question(`${colors.yellow}Enter choice: ${colors.reset}`);
    
    switch (choice.trim()) {
      case '1':
        await this.viewUserDataStatus();
        break;
      case '2':
        await this.viewUserDataFiles();
        break;
      case '3':
        await this.setUserDataWeight();
        break;
      case '4':
        await this.exportUserDataSummary();
        break;
      case '0':
        return;
      default:
        console.log(`${colors.red}Invalid choice.${colors.reset}`);
    }
    
    await this.question('Press Enter to continue...');
  }
  
  /**
   * View user data status
   */
  async viewUserDataStatus() {
    console.log(`\n${colors.cyan}User Output Data Status${colors.reset}\n`);
    console.log(`Current weight multiplier: ${colors.green}${this.userDataConfig.userWeight}x${colors.reset} (vs ${this.userDataConfig.generatedWeight}x for generated)\n`);
    console.log(`${'Simulator'.padEnd(25)} ${'User Outputs'.padEnd(15)} ${'Status'}`);
    console.log('='.repeat(60));
    
    this.simulators.forEach(sim => {
      const userOutputPath = path.join(this.userDataConfig.userDataPath, `${sim}_user_outputs.json`);
      let count = 0;
      
      if (fs.existsSync(userOutputPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(userOutputPath, 'utf8'));
          count = data.userOutputs?.length || 0;
        } catch (e) {
          // Ignore
        }
      }
      
      const statusColor = count > 0 ? colors.green : colors.yellow;
      console.log(`${sim.padEnd(25)} ${statusColor}${count.toString().padEnd(15)}${colors.reset} ${count > 0 ? '✓' : '○'}`);
    });
  }
  
  /**
   * View user data collection files
   */
  async viewUserDataFiles() {
    console.log(`\n${colors.cyan}User Data Collection Files${colors.reset}\n`);
    console.log('These files collect user outputs from simulator usage:\n');
    
    this.simulators.forEach(sim => {
      const filePath = path.join(this.userDataConfig.userDataPath, `${sim}_user_outputs.json`);
      console.log(`  ${sim}: ${filePath}`);
    });
    
    console.log(`\n${colors.yellow}To add user data, manually edit these JSON files or integrate data collection in the simulators.${colors.reset}`);
  }
  
  /**
   * Set user data weight multiplier
   */
  async setUserDataWeight() {
    console.log(`\n${colors.cyan}Set User Data Weight Multiplier${colors.reset}\n`);
    console.log(`Current weights:`);
    console.log(`  Generated data: ${this.userDataConfig.generatedWeight}x`);
    console.log(`  User data: ${this.userDataConfig.userWeight}x\n`);
    console.log(`User data weight determines how much more important user outputs are compared to generated data.`);
    console.log(`Example: 1.5x means user data is 50% more important in training.\n`);
    
    const newWeight = await this.question(`Enter new user data weight multiplier (e.g., 1.5): `);
    const weight = parseFloat(newWeight);
    
    if (isNaN(weight) || weight < 0.1 || weight > 10) {
      console.log(`${colors.red}Invalid weight. Must be between 0.1 and 10.${colors.reset}`);
      return;
    }
    
    this.userDataConfig.userWeight = weight;
    console.log(`${colors.green}✅ User data weight set to ${weight}x${colors.reset}`);
  }
  
  /**
   * Export user data summary
   */
  async exportUserDataSummary() {
    console.log(`\n${colors.cyan}Exporting User Data Summary${colors.reset}\n`);
    
    const summary = {
      exportedAt: new Date().toISOString(),
      configuration: this.userDataConfig,
      simulators: {}
    };
    
    this.simulators.forEach(sim => {
      const userOutputPath = path.join(this.userDataConfig.userDataPath, `${sim}_user_outputs.json`);
      
      if (fs.existsSync(userOutputPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(userOutputPath, 'utf8'));
          summary.simulators[sim] = {
            outputCount: data.userOutputs?.length || 0,
            filePath: userOutputPath,
            createdAt: data.createdAt
          };
        } catch (e) {
          summary.simulators[sim] = {
            outputCount: 0,
            error: 'Could not read file'
          };
        }
      } else {
        summary.simulators[sim] = {
          outputCount: 0,
          status: 'File not found'
        };
      }
    });
    
    const outputPath = path.join('training_logs', `user_data_summary_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    
    console.log(`${colors.green}✅ Summary exported to: ${outputPath}${colors.reset}`);
  }
  
  /**
   * Configuration menu
   */
  async configurationMenu() {
    this.printHeader();
    
    console.log(`${colors.green}Configuration & Settings${colors.reset}\n`);
    console.log('Current Configuration:\n');
    console.log(`  Batch size: ${colors.cyan}${this.batchSize}${colors.reset} samples`);
    console.log(`  Target samples per model: ${colors.cyan}${this.totalSamplesPerModel}${colors.reset}`);
    console.log(`  Generated data weight: ${colors.cyan}${this.userDataConfig.generatedWeight}x${colors.reset}`);
    console.log(`  User data weight: ${colors.cyan}${this.userDataConfig.userWeight}x${colors.reset}\n`);
    
    console.log('Options:\n');
    console.log('  1. Change batch size');
    console.log('  2. Change target samples per model');
    console.log('  3. Reset all data');
    console.log('  4. Reset all models');
    console.log('  0. Back to Main Menu\n');
    
    const choice = await this.question(`${colors.yellow}Enter choice: ${colors.reset}`);
    
    switch (choice.trim()) {
      case '1':
        await this.changeBatchSize();
        break;
      case '2':
        await this.changeTargetSamples();
        break;
      case '3':
        await this.resetAllData();
        break;
      case '4':
        await this.resetAllModels();
        break;
      case '0':
        return;
      default:
        console.log(`${colors.red}Invalid choice.${colors.reset}`);
    }
    
    await this.question('Press Enter to continue...');
  }
  
  /**
   * Change batch size
   */
  async changeBatchSize() {
    console.log(`\n${colors.cyan}Change Batch Size${colors.reset}\n`);
    console.log(`Current batch size: ${this.batchSize}\n`);
    
    const newSize = await this.question('Enter new batch size (1000-50000): ');
    const size = parseInt(newSize);
    
    if (isNaN(size) || size < 1000 || size > 50000) {
      console.log(`${colors.red}Invalid size. Must be between 1000 and 50000.${colors.reset}`);
      return;
    }
    
    this.batchSize = size;
    console.log(`${colors.green}✅ Batch size set to ${size}${colors.reset}`);
  }
  
  /**
   * Change target samples per model
   */
  async changeTargetSamples() {
    console.log(`\n${colors.cyan}Change Target Samples Per Model${colors.reset}\n`);
    console.log(`Current target: ${this.totalSamplesPerModel}\n`);
    
    const newTarget = await this.question('Enter new target (5000-100000): ');
    const target = parseInt(newTarget);
    
    if (isNaN(target) || target < 5000 || target > 100000) {
      console.log(`${colors.red}Invalid target. Must be between 5000 and 100000.${colors.reset}`);
      return;
    }
    
    this.totalSamplesPerModel = target;
    console.log(`${colors.green}✅ Target set to ${target} samples per model${colors.reset}`);
  }
  
  /**
   * Reset all data
   */
  async resetAllData() {
    console.log(`\n${colors.red}${colors.bright}WARNING: Reset All Data${colors.reset}\n`);
    console.log('This will DELETE all collected training data!\n');
    
    const confirm = await this.question('Type "DELETE" to confirm: ');
    
    if (confirm !== 'DELETE') {
      console.log('Cancelled.');
      return;
    }
    
    this.simulators.forEach(sim => {
      const dataDir = path.join('ai_data', sim);
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true });
        console.log(`${colors.yellow}Deleted: ${dataDir}${colors.reset}`);
      }
    });
    
    console.log(`\n${colors.green}All data reset. Directories will be recreated as needed.${colors.reset}`);
  }
  
  /**
   * Reset all models
   */
  async resetAllModels() {
    console.log(`\n${colors.red}${colors.bright}WARNING: Reset All Models${colors.reset}\n`);
    console.log('This will DELETE all trained models!\n');
    
    const confirm = await this.question('Type "DELETE" to confirm: ');
    
    if (confirm !== 'DELETE') {
      console.log('Cancelled.');
      return;
    }
    
    this.simulators.forEach(sim => {
      const modelDir = path.join('models', sim);
      if (fs.existsSync(modelDir)) {
        fs.rmSync(modelDir, { recursive: true });
        console.log(`${colors.yellow}Deleted: ${modelDir}${colors.reset}`);
      }
    });
    
    console.log(`\n${colors.green}All models reset.${colors.reset}`);
  }
  
  /**
   * Create a simple progress bar
   */
  createProgressBar(percentage) {
    const width = 20;
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }
  
  /**
   * Start the application
   */
  async start() {
    try {
      await this.showMainMenu();
    } catch (error) {
      console.error(`\n${colors.red}Error: ${error.message}${colors.reset}\n`);
      this.rl.close();
    }
  }
}

// Main entry point
if (require.main === module) {
  const manager = new AITrainingManager();
  manager.start().catch(error => {
    console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}\n`);
    process.exit(1);
  });
}

module.exports = { AITrainingManager };
