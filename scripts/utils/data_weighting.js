// Data Weighting Utilities
// Implements weighted training to preserve old data with lower weights

const fs = require('fs');
const path = require('path');

class DataWeightManager {
  constructor(config) {
    this.config = config.dataWeighting;
    this.strategy = config.dataWeighting.strategy;
  }
  
  /**
   * Calculate weight for a data sample based on its metadata
   * @param {Object} sample - Data sample with metadata (timestamp, version, etc.)
   * @returns {number} Weight value between minWeight and 1.0
   */
  calculateWeight(sample) {
    if (!this.config.enabled) {
      return 1.0; // All samples equal weight if disabled
    }
    
    switch (this.strategy) {
      case 'time_decay':
        return this.timeDecayWeight(sample);
      case 'version_based':
        return this.versionBasedWeight(sample);
      case 'manual':
        return sample.weight || 1.0;
      default:
        return 1.0;
    }
  }
  
  /**
   * Time-based decay: Older data gets progressively lower weight
   * Formula: weight = baseWeight * (decayRate ^ ageInMonths)
   */
  timeDecayWeight(sample) {
    const { baseWeight, decayRate, minWeight } = this.config.timeDecay;
    
    if (!sample.metadata || !sample.metadata.createdAt) {
      // No timestamp = treat as current
      return baseWeight;
    }
    
    const createdDate = new Date(sample.metadata.createdAt);
    const now = new Date();
    const ageInMonths = (now - createdDate) / (1000 * 60 * 60 * 24 * 30);
    
    // Calculate decayed weight
    let weight = baseWeight * Math.pow(decayRate, ageInMonths);
    
    // Apply minimum weight floor
    weight = Math.max(weight, minWeight);
    
    return weight;
  }
  
  /**
   * Version-based weighting: Each data version has a predefined weight
   */
  versionBasedWeight(sample) {
    const version = sample.metadata?.version || 'v1';
    return this.config.versionWeights[version] || 1.0;
  }
  
  /**
   * Apply weights to a dataset for training
   * @param {Array} dataset - Array of training samples
   * @returns {Object} { samples, weights } for weighted training
   */
  applyWeights(dataset) {
    const weights = dataset.map(sample => this.calculateWeight(sample));
    
    // Normalize weights so they sum to dataset.length
    // This maintains the effective dataset size
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const normalizedWeights = weights.map(w => w / avgWeight);
    
    return {
      samples: dataset,
      weights: normalizedWeights,
      stats: this.calculateWeightStats(normalizedWeights, dataset)
    };
  }
  
  /**
   * Calculate statistics about weight distribution
   */
  calculateWeightStats(weights, dataset) {
    const sortedWeights = [...weights].sort((a, b) => a - b);
    
    return {
      min: sortedWeights[0],
      max: sortedWeights[sortedWeights.length - 1],
      mean: weights.reduce((a, b) => a + b, 0) / weights.length,
      median: sortedWeights[Math.floor(sortedWeights.length / 2)],
      
      // Weight distribution by quartile
      quartiles: {
        q1: sortedWeights[Math.floor(weights.length * 0.25)],
        q2: sortedWeights[Math.floor(weights.length * 0.50)],
        q3: sortedWeights[Math.floor(weights.length * 0.75)]
      },
      
      // Version/age breakdown
      breakdown: this.getWeightBreakdown(dataset, weights)
    };
  }
  
  /**
   * Get breakdown of weights by version or age
   */
  getWeightBreakdown(dataset, weights) {
    const breakdown = {};
    
    dataset.forEach((sample, i) => {
      const key = sample.metadata?.version || 'unknown';
      if (!breakdown[key]) {
        breakdown[key] = { count: 0, totalWeight: 0, avgWeight: 0 };
      }
      breakdown[key].count++;
      breakdown[key].totalWeight += weights[i];
    });
    
    // Calculate average weights
    Object.keys(breakdown).forEach(key => {
      breakdown[key].avgWeight = breakdown[key].totalWeight / breakdown[key].count;
    });
    
    return breakdown;
  }
  
  /**
   * Merge multiple datasets with proper weighting
   * @param {Array} datasets - Array of { data, version, createdAt } objects
   * @returns {Array} Merged dataset with weight metadata
   */
  mergeDatasets(datasets) {
    const merged = [];
    
    datasets.forEach(dataset => {
      const { data, version, createdAt } = dataset;
      
      data.forEach(sample => {
        // Add metadata if not present
        if (!sample.metadata) {
          sample.metadata = {};
        }
        
        // Preserve original metadata but add version/timestamp
        sample.metadata.version = sample.metadata.version || version;
        sample.metadata.createdAt = sample.metadata.createdAt || createdAt;
        
        merged.push(sample);
      });
    });
    
    return merged;
  }
  
  /**
   * Load and merge existing datasets with new data
   * @param {string} dataDir - Directory containing datasets
   * @param {Array} newData - New data to add
   * @returns {Object} { mergedData, weightedData }
   */
  loadAndMergeWithNewData(dataDir, newData) {
    const datasets = [];
    
    // Load existing datasets
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
      
      files.forEach(file => {
        const filePath = path.join(dataDir, file);
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        datasets.push({
          data: fileData.samples || fileData,
          version: fileData.version || this.extractVersionFromFilename(file),
          createdAt: fileData.createdAt || this.getFileCreationTime(filePath)
        });
      });
    }
    
    // Add new data as latest version
    if (newData && newData.length > 0) {
      datasets.push({
        data: newData,
        version: this.getNextVersion(datasets),
        createdAt: new Date().toISOString()
      });
    }
    
    // Merge all datasets
    const mergedData = this.mergeDatasets(datasets);
    
    // Apply weights
    const weightedData = this.applyWeights(mergedData);
    
    return {
      mergedData,
      weightedData,
      datasetInfo: {
        totalSamples: mergedData.length,
        versions: datasets.length,
        oldestData: this.getOldestDate(datasets),
        newestData: new Date().toISOString()
      }
    };
  }
  
  /**
   * Helper: Extract version from filename (e.g., "dataset_v2.json" -> "v2")
   */
  extractVersionFromFilename(filename) {
    const match = filename.match(/v(\d+)/);
    return match ? `v${match[1]}` : 'v1';
  }
  
  /**
   * Helper: Get file creation time
   */
  getFileCreationTime(filePath) {
    const stats = fs.statSync(filePath);
    return stats.birthtime.toISOString();
  }
  
  /**
   * Helper: Determine next version number
   */
  getNextVersion(existingDatasets) {
    const versions = existingDatasets.map(d => {
      const match = d.version.match(/v(\d+)/);
      return match ? parseInt(match[1]) : 1;
    });
    
    const maxVersion = versions.length > 0 ? Math.max(...versions) : 0;
    return `v${maxVersion + 1}`;
  }
  
  /**
   * Helper: Get oldest data timestamp
   */
  getOldestDate(datasets) {
    const dates = datasets
      .map(d => new Date(d.createdAt))
      .filter(d => !isNaN(d.getTime()));
    
    return dates.length > 0 
      ? new Date(Math.min(...dates)).toISOString()
      : new Date().toISOString();
  }
  
  /**
   * Save weighted dataset with metadata
   */
  saveWeightedDataset(dataPath, weightedData, metadata = {}) {
    const output = {
      version: metadata.version || 'v1',
      createdAt: new Date().toISOString(),
      weighting: {
        enabled: this.config.enabled,
        strategy: this.strategy,
        stats: weightedData.stats
      },
      samples: weightedData.samples,
      weights: weightedData.weights,
      metadata: metadata
    };
    
    // Ensure directory exists
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(dataPath, JSON.stringify(output, null, 2));
    
    return {
      path: dataPath,
      samples: weightedData.samples.length,
      weightStats: weightedData.stats
    };
  }
  
  /**
   * Print weight statistics for debugging
   */
  printWeightStats(stats) {
    console.log('\n📊 Weight Distribution Statistics:');
    console.log(`   Min weight: ${stats.min.toFixed(3)}`);
    console.log(`   Max weight: ${stats.max.toFixed(3)}`);
    console.log(`   Mean weight: ${stats.mean.toFixed(3)}`);
    console.log(`   Median weight: ${stats.median.toFixed(3)}`);
    
    console.log('\n   Quartiles:');
    console.log(`   Q1 (25%): ${stats.quartiles.q1.toFixed(3)}`);
    console.log(`   Q2 (50%): ${stats.quartiles.q2.toFixed(3)}`);
    console.log(`   Q3 (75%): ${stats.quartiles.q3.toFixed(3)}`);
    
    if (stats.breakdown) {
      console.log('\n   Weight breakdown by version:');
      Object.keys(stats.breakdown).forEach(version => {
        const info = stats.breakdown[version];
        console.log(`   ${version}: ${info.count} samples, avg weight ${info.avgWeight.toFixed(3)}`);
      });
    }
  }
}

module.exports = DataWeightManager;
