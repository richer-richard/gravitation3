# Gravitation³ AI Training System

Complete training system for generating AI models with **weighted data support** - old data is preserved with lower weights when retraining.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `@tensorflow/tfjs-node` - TensorFlow.js for Node.js
- `chalk` - Colored terminal output
- `cli-progress` - Progress bars
- `commander` - CLI argument parsing

### 2. Generate Training Data

```bash
# Generate 1000 samples for three-body system
node scripts/generate_training_data.js --simulator three-body --samples 1000

# Generate for all simulators
node scripts/generate_training_data.js --all --samples 5000

# Use NPM scripts
npm run generate-data -- --simulator lorenz-attractor --samples 2000
```

### 3. Watch the Progress

You'll see:
```
🎯 Generating 1000 samples for three-body...

  Running three-body simulation...
  Progress: 100/1000 (10.0%) | Rate: 45.2 samples/s | ETA: 19.9s
  Progress: 200/1000 (20.0%) | Rate: 47.1 samples/s | ETA: 17.0s
  ...

✅ Generation complete!
   Success: 1000/1000 (100.0%)
   Failed: 0/1000
   Total time: 22.1s
   Average rate: 45.23 samples/s

💾 Saving dataset...
   ✅ Saved to: ai_data/three-body/dataset_1699456789.json
   File size: 2.45 MB

   📊 Label Distribution:
   chaotic              423 (42.3%) ████████████████████
   stable               312 (31.2%) ███████████████
   collision            165 (16.5%) ████████
   escape               100 (10.0%) █████
```

## 📦 Weighted Data System

### How It Works

When you retrain models, **old data is NOT deleted**. Instead:

1. **Old data gets lower weights** (e.g., 0.7x)
2. **New data gets higher weights** (1.0x)
3. **Training uses both** but prioritizes newer data

### Default Weight Strategy

```javascript
// From training_config.js
timeDecay: {
  baseWeight: 1.0,        // New data = full weight
  decayRate: 0.95,        // Old data decays 5% per month
  minWeight: 0.3,         // Old data never goes below 30%
  preserveRatio: 0.2      // Keep 20% at full weight
}
```

### Retraining Example

```bash
# First training (v1)
node scripts/generate_training_data.js -s three-body -n 5000
# Creates: ai_data/three-body/dataset_v1.json
# All data has weight = 1.0

# Second training (v2) - 6 months later
node scripts/generate_training_data.js -s three-body -n 5000 --merge
# Merges: v1 data (weight ~0.7) + v2 data (weight 1.0)
# Total: 10,000 samples with weighted contributions

# Third training (v3) - 6 months later
node scripts/generate_training_data.js -s three-body -n 5000 --merge
# Merges: v1 (~0.5) + v2 (~0.7) + v3 (1.0)
# Total: 15,000 samples, newer data more important
```

### Weight Distribution Output

When merging, you'll see:
```
📊 Weight Distribution Statistics:
   Min weight: 0.300
   Max weight: 1.000
   Mean weight: 0.767
   Median weight: 0.850

   Quartiles:
   Q1 (25%): 0.650
   Q2 (50%): 0.850
   Q3 (75%): 1.000

   Weight breakdown by version:
   v1: 5000 samples, avg weight 0.500
   v2: 5000 samples, avg weight 0.735
   v3: 5000 samples, avg weight 1.000
```

## 🎯 Available Simulators

1. **three-body** - N-body gravitational dynamics
2. **double-pendulum** - Chaotic mechanical system
3. **lorenz-attractor** - Classic chaotic attractor
4. **rossler-attractor** - 3D chaotic attractor
5. **hopalong-attractor** - 2D chaotic map
6. **double-gyre** - Fluid vortex dynamics
7. **lid-cavity** - Driven cavity flow
8. **malkus-waterwheel** - Rotational chaos
9. **turbulent-jet** - Turbulent fluid flow

## 🔧 CLI Options

```bash
Options:
  -s, --simulator <type>   Simulator type (default: "three-body")
  -n, --samples <number>   Number of samples (default: "1000")
  -o, --output <path>      Output file path
  -a, --append            Append to existing dataset
  -m, --merge             Merge with existing datasets (RECOMMENDED)
  -v, --verbose           Verbose output
  --all                   Generate for all simulators
  -V, --version           Output version
  -h, --help              Display help
```

## 📊 Dataset Format

Generated datasets are saved as JSON:

```json
{
  "simulatorType": "three-body",
  "version": "v2",
  "createdAt": "2025-11-08T13:00:00.000Z",
  "config": {
    "sampleSize": 5000,
    "labels": ["stable", "chaotic", "collision", "escape"],
    "features": 33
  },
  "weighting": {
    "enabled": true,
    "strategy": "time_decay"
  },
  "samples": [
    {
      "features": [1.2, 0.8, 1.5, ...],  // 33D feature vector
      "label": "chaotic",
      "metadata": {
        "simulatorType": "three-body",
        "createdAt": "2025-11-08T13:00:01.234Z",
        "version": "v2",
        "initialConditions": { /* ... */ },
        "parameters": { /* ... */ }
      }
    },
    // ... 4999 more samples
  ],
  "datasetInfo": {
    "totalSamples": 15000,
    "versions": 3,
    "oldestData": "2025-05-08T13:00:00.000Z",
    "newestData": "2025-11-08T13:00:00.000Z"
  }
}
```

## 🧪 Next Steps

After generating training data:

1. **Train classifiers:**
   ```bash
   npm run train -- --simulator three-body --epochs 50
   ```

2. **Train trajectory predictors:**
   ```bash
   npm run train-predictor -- --simulator three-body --epochs 30
   ```

3. **Optimize for browser:**
   ```bash
   npm run optimize
   ```

4. **Deploy to web:**
   ```bash
   cp models/three-body/* web/ai_models/three-body/
   ```

## 🔬 Testing

```bash
# Test data generation
npm test

# Generate small test dataset
node scripts/generate_training_data.js -s three-body -n 100 -v
```

## 💡 Tips

**For Development:**
- Use small sample sizes (100-1000) for testing
- Use `--verbose` to see detailed output
- Check label distribution - should be balanced

**For Production:**
- Generate 5000-10000 samples per simulator
- Use `--merge` when retraining (preserves old data)
- Monitor weight statistics to ensure old data isn't overweighted

**Memory Management:**
- Large datasets (>10MB) may need chunking
- Consider generating data in batches
- Use streaming if memory is limited

## 📝 Configuration

Edit `scripts/config/training_config.js` to customize:

- Sample sizes per simulator
- Weight decay rates
- Feature extraction methods
- Training hyperparameters
- Label definitions

## 🐛 Troubleshooting

**"Command not found":**
```bash
# Make script executable
chmod +x scripts/generate_training_data.js

# Or use node directly
node scripts/generate_training_data.js
```

**"Module not found":**
```bash
# Install dependencies
npm install
```

**Low generation rate (<10 samples/s):**
- This is normal for complex simulators
- Consider reducing trajectory length
- Use faster hardware if available

**Imbalanced labels:**
- Some imbalance is expected (chaos is rare!)
- Consider data augmentation
- Adjust labeling thresholds in `utils/labeling.js`

## 📚 Documentation

- [AI Implementation Guide](../AI_IMPLEMENTATION_GUIDE.md) - Complete architecture
- [Training Guide](../docs/TRAINING_GUIDE.md) - Detailed training instructions
- [Feature Extraction](./utils/feature_extraction.js) - How features are computed
- [Auto Labeling](./utils/labeling.js) - How labels are assigned

## 🤝 Contributing

To add a new simulator:

1. Add config to `training_config.js`
2. Add feature extractor to `feature_extraction.js`
3. Add labeler to `labeling.js`
4. Add IC generator to `generate_training_data.js`
5. Test with small sample size

## 📄 License

MIT License - See LICENSE file for details

---

**Ready to train?** Run:
```bash
node scripts/generate_training_data.js --simulator three-body --samples 5000
```

The training data will be generated with full progress tracking, and old data will be automatically weighted when you retrain in the future! 🚀
