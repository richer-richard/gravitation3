#!/usr/bin/env node

// Classifier Training Script
// Trains neural network classifiers for physics simulators with weighted data support

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const config = require('./config/training_config');
const DataWeightManager = require('./utils/data_weighting');

class ClassifierTrainer {
  constructor(simulatorType, options = {}) {
    this.simulatorType = simulatorType;
    this.options = options;
    this.config = config.classifiers[simulatorType];
    this.weightManager = new DataWeightManager(config);
    
    if (!this.config) {
      throw new Error(`No configuration found for simulator: ${simulatorType}`);
    }
  }
  
  /**
   * Load training data with weights
   */
  loadData(dataPath) {
    console.log(`\n📂 Loading training data from ${dataPath}...`);
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found: ${dataPath}`);
    }
    
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const samples = rawData.samples || rawData;
    
    console.log(`   ✅ Loaded ${samples.length} samples`);
    
    // Apply weights if enabled
    let weightedData = { samples, weights: null };
    
    if (config.dataWeighting.enabled && rawData.weighting) {
      console.log(`   ⚖️  Applying weighted training...`);
      weightedData = this.weightManager.applyWeights(samples);
      this.weightManager.printWeightStats(weightedData.stats);
    }
    
    return weightedData;
  }
  
  /**
   * Prepare data for training
   */
  prepareDataset(weightedData, validationSplit = 0.2) {
    console.log(`\n🔧 Preparing dataset...`);
    
    const samples = weightedData.samples;
    const weights = weightedData.weights;
    
    // Extract features and labels
    const features = samples.map(s => s.features);
    const labels = samples.map(s => s.label);
    
    // Convert labels to indices
    const labelToIndex = {};
    this.config.labels.forEach((label, i) => {
      labelToIndex[label] = i;
    });
    
    const labelIndices = labels.map(label => labelToIndex[label]);
    
    // Create tensors
    const featureTensor = tf.tensor2d(features);
    const labelTensor = tf.tensor1d(labelIndices, 'int32');
    
    // One-hot encode labels
    const oneHotLabels = tf.oneHot(labelTensor, this.config.labels.length);
    
    // Normalize features
    const { normalized, mean, std } = this.normalizeFeatures(featureTensor);
    
    // Split into train/validation
    const numSamples = features.length;
    const numValidation = Math.floor(numSamples * validationSplit);
    const numTrain = numSamples - numValidation;
    
    // Shuffle indices
    const indices = tf.util.createShuffledIndices(numSamples);
    
    const trainIndices = indices.slice(0, numTrain);
    const valIndices = indices.slice(numTrain);
    
    // Create datasets
    const trainX = tf.gather(normalized, trainIndices);
    const trainY = tf.gather(oneHotLabels, trainIndices);
    
    const valX = tf.gather(normalized, valIndices);
    const valY = tf.gather(oneHotLabels, valIndices);
    
    // Apply sample weights if available
    let trainWeights = null;
    if (weights) {
      const weightTensor = tf.tensor1d(weights);
      trainWeights = tf.gather(weightTensor, trainIndices);
      weightTensor.dispose();
    }
    
    console.log(`   Training samples: ${numTrain}`);
    console.log(`   Validation samples: ${numValidation}`);
    console.log(`   Feature dimensions: ${features[0].length}`);
    console.log(`   Number of classes: ${this.config.labels.length}`);
    
    // Clean up
    featureTensor.dispose();
    labelTensor.dispose();
    
    return {
      trainX,
      trainY,
      valX,
      valY,
      trainWeights,
      normalization: { mean, std },
      labelToIndex,
      indexToLabel: this.config.labels
    };
  }
  
  /**
   * Normalize features (standardization)
   */
  normalizeFeatures(featureTensor) {
    const mean = featureTensor.mean(0);
    const std = tf.moments(featureTensor, 0).variance.sqrt();
    
    // Prevent division by zero
    const stdSafe = std.add(1e-7);
    
    const normalized = featureTensor.sub(mean).div(stdSafe);
    
    return { normalized, mean, std: stdSafe };
  }
  
  /**
   * Build neural network model
   */
  buildModel(inputShape, numClasses) {
    console.log(`\n🏗️  Building model architecture...`);
    
    const layers = [];
    
    // Input layer
    layers.push(tf.layers.dense({
      units: this.config.architecture.layers[0],
      activation: this.config.architecture.activation,
      inputShape: [inputShape],
      kernelInitializer: 'heNormal',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
    }));
    
    // Dropout
    if (this.config.architecture.dropout[0] > 0) {
      layers.push(tf.layers.dropout({
        rate: this.config.architecture.dropout[0]
      }));
    }
    
    // Hidden layers
    for (let i = 1; i < this.config.architecture.layers.length; i++) {
      layers.push(tf.layers.dense({
        units: this.config.architecture.layers[i],
        activation: this.config.architecture.activation,
        kernelInitializer: 'heNormal',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
      }));
      
      if (this.config.architecture.dropout[i] > 0) {
        layers.push(tf.layers.dropout({
          rate: this.config.architecture.dropout[i]
        }));
      }
    }
    
    // Output layer
    layers.push(tf.layers.dense({
      units: numClasses,
      activation: this.config.architecture.outputActivation,
      kernelInitializer: 'glorotNormal'
    }));
    
    // Create model
    const model = tf.sequential({ layers });
    
    // Compile model
    const optimizer = this.config.training.optimizer === 'adam'
      ? tf.train.adam(this.config.training.learningRate)
      : tf.train.sgd(this.config.training.learningRate);
    
    model.compile({
      optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    // Print model summary
    model.summary();
    
    return model;
  }
  
  /**
   * Train the model
   */
  async train(model, dataset) {
    console.log(`\n🚀 Starting training...`);
    console.log(`   Epochs: ${this.config.training.epochs}`);
    console.log(`   Batch size: ${this.config.training.batchSize}`);
    console.log(`   Learning rate: ${this.config.training.learningRate}`);
    
    const { trainX, trainY, valX, valY, trainWeights } = dataset;
    
    // Callbacks
    const callbacks = [];
    
    // Early stopping
    if (this.config.training.earlyStopping.enabled) {
      callbacks.push(tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience: this.config.training.earlyStopping.patience,
        minDelta: this.config.training.earlyStopping.minDelta,
        restoreBestWeights: true
      }));
    }
    
    // Progress callback
    let bestValAcc = 0;
    callbacks.push({
      onEpochEnd: async (epoch, logs) => {
        const progress = ((epoch + 1) / this.config.training.epochs * 100).toFixed(1);
        
        console.log(
          `   Epoch ${(epoch + 1).toString().padStart(3)}/${this.config.training.epochs} ` +
          `[${progress.padStart(5)}%] | ` +
          `loss: ${logs.loss.toFixed(4)} | ` +
          `acc: ${(logs.acc * 100).toFixed(2)}% | ` +
          `val_loss: ${logs.val_loss.toFixed(4)} | ` +
          `val_acc: ${(logs.val_acc * 100).toFixed(2)}%`
        );
        
        if (logs.val_acc > bestValAcc) {
          bestValAcc = logs.val_acc;
        }
        
        // Save checkpoint
        if (config.options.saveCheckpoints && 
            (epoch + 1) % config.options.checkpointInterval === 0) {
          await this.saveCheckpoint(model, dataset.normalization, epoch + 1);
        }
      }
    });
    
    // Training configuration
    const trainConfig = {
      epochs: this.config.training.epochs,
      batchSize: this.config.training.batchSize,
      validationData: [valX, valY],
      callbacks,
      shuffle: true,
      verbose: 0
    };
    
    // Add sample weights if available
    if (trainWeights) {
      trainConfig.sampleWeight = trainWeights;
      console.log(`   ⚖️  Using weighted samples for training`);
    }
    
    const startTime = Date.now();
    
    // Train
    const history = await model.fit(trainX, trainY, trainConfig);
    
    const trainTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Training complete!`);
    console.log(`   Total time: ${trainTime}s`);
    console.log(`   Best validation accuracy: ${(bestValAcc * 100).toFixed(2)}%`);
    
    return { history, bestValAcc };
  }
  
  /**
   * Evaluate model
   */
  async evaluate(model, dataset) {
    console.log(`\n📊 Evaluating model...`);
    
    const { valX, valY } = dataset;
    
    const result = model.evaluate(valX, valY);
    const [loss, accuracy] = await Promise.all([
      result[0].data(),
      result[1].data()
    ]);
    
    console.log(`   Validation loss: ${loss[0].toFixed(4)}`);
    console.log(`   Validation accuracy: ${(accuracy[0] * 100).toFixed(2)}%`);
    
    // Confusion matrix
    const predictions = model.predict(valX);
    const predClasses = predictions.argMax(-1);
    const trueClasses = valY.argMax(-1);
    
    await this.printConfusionMatrix(
      await trueClasses.data(),
      await predClasses.data(),
      dataset.indexToLabel
    );
    
    // Clean up
    result[0].dispose();
    result[1].dispose();
    predictions.dispose();
    predClasses.dispose();
    trueClasses.dispose();
    
    return { loss: loss[0], accuracy: accuracy[0] };
  }
  
  /**
   * Print confusion matrix
   */
  async printConfusionMatrix(trueLabels, predLabels, labels) {
    const numClasses = labels.length;
    const matrix = Array(numClasses).fill(0).map(() => Array(numClasses).fill(0));
    
    for (let i = 0; i < trueLabels.length; i++) {
      matrix[trueLabels[i]][predLabels[i]]++;
    }
    
    console.log(`\n   Confusion Matrix:`);
    console.log(`   ${''.padEnd(20)} | ${labels.map(l => l.substring(0, 8).padEnd(8)).join(' | ')}`);
    console.log(`   ${'-'.repeat(20 + (labels.length * 11))}`);
    
    labels.forEach((label, i) => {
      const row = matrix[i].map(count => count.toString().padStart(8)).join(' | ');
      console.log(`   ${label.padEnd(20)} | ${row}`);
    });
  }
  
  /**
   * Save trained model
   */
  async saveModel(model, normalization, metadata, outputPath) {
    console.log(`\n💾 Saving model...`);
    
    // Ensure directory exists
    const modelDir = path.dirname(outputPath);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
    
    // Save model
    await model.save(`file://${outputPath}`);
    
    // Save normalization parameters
    const normPath = path.join(modelDir, 'normalization.json');
    fs.writeFileSync(normPath, JSON.stringify({
      mean: await normalization.mean.array(),
      std: await normalization.std.array()
    }, null, 2));
    
    // Save metadata
    const metaPath = path.join(modelDir, 'metadata.json');
    fs.writeFileSync(metaPath, JSON.stringify({
      ...metadata,
      simulatorType: this.simulatorType,
      labels: this.config.labels,
      trainedAt: new Date().toISOString(),
      tfVersion: tf.version.tfjs
    }, null, 2));
    
    // Save label mappings
    const labelsPath = path.join(modelDir, 'labels.json');
    fs.writeFileSync(labelsPath, JSON.stringify(this.config.labels, null, 2));
    
    console.log(`   ✅ Model saved to: ${outputPath}`);
    console.log(`   ✅ Normalization saved to: ${normPath}`);
    console.log(`   ✅ Metadata saved to: ${metaPath}`);
    
    // Get model size
    const modelFiles = fs.readdirSync(modelDir);
    let totalSize = 0;
    modelFiles.forEach(file => {
      const stat = fs.statSync(path.join(modelDir, file));
      totalSize += stat.size;
    });
    
    console.log(`   Model size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  }
  
  /**
   * Save checkpoint during training
   */
  async saveCheckpoint(model, normalization, epoch) {
    const checkpointDir = path.join(
      config.paths.models,
      this.simulatorType,
      'checkpoints',
      `epoch_${epoch}`
    );
    
    await this.saveModel(
      model,
      normalization,
      { checkpoint: true, epoch },
      path.join(checkpointDir, 'model.json')
    );
  }
}

// CLI Interface
async function main() {
  const program = new Command();
  
  program
    .name('train_classifier')
    .description('Train classifier models for Gravitation³ simulators')
    .version('1.0.0');
  
  program
    .option('-s, --simulator <type>', 'Simulator type', 'three-body')
    .option('-d, --data <path>', 'Training data path')
    .option('-o, --output <path>', 'Output model path')
    .option('-e, --epochs <number>', 'Number of epochs')
    .option('-b, --batch-size <number>', 'Batch size')
    .option('-l, --learning-rate <number>', 'Learning rate')
    .option('--all', 'Train all simulators', false)
    .option('--continue <path>', 'Continue training from checkpoint');
  
  program.parse(process.argv);
  const options = program.opts();
  
  // Validate simulator
  const validSimulators = Object.keys(config.classifiers);
  
  if (options.all) {
    console.log('🚀 Training classifiers for all simulators...\n');
    
    for (const simulator of validSimulators) {
      await trainSimulator(simulator, options);
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
    console.log('✅ All classifiers trained successfully!\n');
  } else {
    if (!validSimulators.includes(options.simulator)) {
      console.error(`❌ Error: Invalid simulator type '${options.simulator}'`);
      console.error(`   Valid types: ${validSimulators.join(', ')}\n`);
      process.exit(1);
    }
    
    await trainSimulator(options.simulator, options);
  }
}

async function trainSimulator(simulator, options) {
  console.log(`🎯 Training classifier for ${simulator}...\n`);
  
  // Determine data path
  const dataPath = options.data || findLatestDataset(simulator);
  
  if (!dataPath) {
    console.error(`❌ No training data found for ${simulator}`);
    console.error(`   Run: node scripts/generate_training_data.js --simulator ${simulator}\n`);
    return;
  }
  
  // Determine output path
  const outputPath = options.output || path.join(
    config.paths.models,
    simulator,
    'classifier',
    'model.json'
  );
  
  try {
    // Create trainer
    const trainer = new ClassifierTrainer(simulator, options);
    
    // Load data
    const weightedData = trainer.loadData(dataPath);
    
    // Prepare dataset
    const dataset = trainer.prepareDataset(
      weightedData,
      trainer.config.training.validationSplit
    );
    
    // Build model
    const model = trainer.buildModel(
      dataset.trainX.shape[1],
      trainer.config.labels.length
    );
    
    // Train model
    const { bestValAcc } = await trainer.train(model, dataset);
    
    // Evaluate model
    await trainer.evaluate(model, dataset);
    
    // Save model
    await trainer.saveModel(model, dataset.normalization, {
      bestValAccuracy: bestValAcc,
      dataPath,
      numSamples: weightedData.samples.length
    }, outputPath);
    
    // Clean up
    dataset.trainX.dispose();
    dataset.trainY.dispose();
    dataset.valX.dispose();
    dataset.valY.dispose();
    if (dataset.trainWeights) dataset.trainWeights.dispose();
    dataset.normalization.mean.dispose();
    dataset.normalization.std.dispose();
    
    console.log(`\n✅ ${simulator} classifier training complete!`);
    
  } catch (error) {
    console.error(`\n❌ Training failed for ${simulator}:`, error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    throw error;
  }
}

function findLatestDataset(simulator) {
  const dataDir = path.join(config.paths.data, simulator);
  
  if (!fs.existsSync(dataDir)) {
    return null;
  }
  
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(dataDir, f),
      time: fs.statSync(path.join(dataDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  return files.length > 0 ? files[0].path : null;
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

module.exports = { ClassifierTrainer };
