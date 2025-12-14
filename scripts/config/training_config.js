// Training Configuration for Gravitation³ AI Models
// Supports weighted training data (newer data = higher weight)

module.exports = {
  // Data weighting strategy
  dataWeighting: {
    enabled: true,
    strategy: 'time_decay', // Options: 'time_decay', 'version_based', 'manual'
    
    // Time decay: Older data gets progressively lower weight
    timeDecay: {
      baseWeight: 1.0,        // Weight for newest data
      decayRate: 0.95,        // Weight = baseWeight * (decayRate ^ dataAgeInMonths)
      minWeight: 0.3,         // Minimum weight (even very old data contributes)
      preserveRatio: 0.2      // Keep at least 20% of data at full weight
    },
    
    // Version-based: Data from each version gets specific weight
    versionWeights: {
      'v1': 0.7,  // Original training data
      'v2': 0.85, // First retrain
      'v3': 1.0   // Latest retrain (current)
    },
    
    // Apply weights during training
    applyDuringTraining: true,
    
    // Save weight metadata with datasets
    saveWeightMetadata: true
  },
  
  // Training hyperparameters per simulator
  classifiers: {
    'three-body': {
      architecture: {
        layers: [128, 64, 32],
        dropout: [0.3, 0.2, 0.0],
        activation: 'relu',
        outputActivation: 'softmax'
      },
      training: {
        epochs: 50,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        earlyStopping: {
          enabled: true,
          patience: 10,
          minDelta: 0.001
        }
      },
      labels: ['stable', 'chaotic', 'collision', 'escape'],
      sampleSize: 10000
    },
    
    'double-pendulum': {
      architecture: {
        layers: [96, 48, 24],
        dropout: [0.3, 0.2, 0.0],
        activation: 'relu',
        outputActivation: 'softmax'
      },
      training: {
        epochs: 45,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        earlyStopping: {
          enabled: true,
          patience: 8,
          minDelta: 0.001
        }
      },
      labels: ['periodic', 'chaotic', 'resonant'],
      sampleSize: 8000
    },
    
    'lorenz-attractor': {
      architecture: {
        layers: [96, 48, 24],
        dropout: [0.25, 0.15, 0.0],
        activation: 'relu',
        outputActivation: 'softmax'
      },
      training: {
        epochs: 40,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        earlyStopping: {
          enabled: true,
          patience: 8,
          minDelta: 0.001
        }
      },
      labels: ['transient', 'attractor', 'divergent'],
      sampleSize: 8000
    },
    
    'rossler-attractor': {
      architecture: {
        layers: [96, 48, 24],
        dropout: [0.25, 0.15, 0.0],
        activation: 'relu',
        outputActivation: 'softmax'
      },
      training: {
        epochs: 40,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        earlyStopping: {
          enabled: true,
          patience: 8,
          minDelta: 0.001
        }
      },
      labels: ['limit_cycle', 'strange_attractor', 'wandering'],
      sampleSize: 8000
    },
    
    'hopalong-attractor': {
      architecture: {
        layers: [80, 40, 20],
        dropout: [0.25, 0.15, 0.0],
        activation: 'relu',
        outputActivation: 'softmax'
      },
      training: {
        epochs: 35,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        earlyStopping: {
          enabled: true,
          patience: 7,
          minDelta: 0.001
        }
      },
      labels: ['regular', 'chaotic', 'bounded', 'unbounded'],
      sampleSize: 6000
    },
    
    'double-gyre': {
      architecture: {
        layers: [96, 48, 24],
        dropout: [0.3, 0.2, 0.0],
        activation: 'relu',
        outputActivation: 'softmax'
      },
      training: {
        epochs: 40,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        earlyStopping: {
          enabled: true,
          patience: 8,
          minDelta: 0.001
        }
      },
      labels: ['laminar', 'transitional', 'turbulent'],
      sampleSize: 6000
    },
    
    'lid-cavity': {
      architecture: {
        layers: [80, 40, 20],
        dropout: [0.3, 0.2, 0.0],
        activation: 'relu',
        outputActivation: 'softmax'
      },
      training: {
        epochs: 35,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        earlyStopping: {
          enabled: true,
          patience: 7,
          minDelta: 0.001
        }
      },
      labels: ['steady', 'oscillatory', 'turbulent'],
      sampleSize: 5000
    },
    
    'malkus-waterwheel': {
      architecture: {
        layers: [80, 40, 20],
        dropout: [0.3, 0.2, 0.0],
        activation: 'relu',
        outputActivation: 'softmax'
      },
      training: {
        epochs: 40,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        earlyStopping: {
          enabled: true,
          patience: 8,
          minDelta: 0.001
        }
      },
      labels: ['continuous', 'periodic', 'chaotic', 'stopped'],
      sampleSize: 6000
    },
    
    'turbulent-jet': {
      architecture: {
        layers: [96, 48, 24],
        dropout: [0.3, 0.2, 0.0],
        activation: 'relu',
        outputActivation: 'softmax'
      },
      training: {
        epochs: 40,
        batchSize: 32,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        earlyStopping: {
          enabled: true,
          patience: 8,
          minDelta: 0.001
        }
      },
      labels: ['laminar', 'transitional', 'fully_turbulent'],
      sampleSize: 5000
    }
  },
  
  // Trajectory predictor configurations
  predictors: {
    default: {
      architecture: {
        lstmUnits: [64, 32],
        denseUnits: [32],
        dropout: 0.2,
        activation: 'tanh'
      },
      training: {
        epochs: 30,
        batchSize: 16,
        learningRate: 0.001,
        optimizer: 'adam',
        validationSplit: 0.2,
        sequenceLength: 50,
        horizonLength: 50
      }
    }
  },
  
  // Resource paths
  paths: {
    data: 'ai_data',
    models: 'models',
    deployedModels: 'web/ai_models',
    logs: 'training_logs'
  },
  
  // Training options
  options: {
    useGPU: false,  // Set to true if GPU available
    verbose: true,
    saveCheckpoints: true,
    checkpointInterval: 10, // Save every N epochs
    tensorboardLogging: false,
    dataAugmentation: false
  }
};
