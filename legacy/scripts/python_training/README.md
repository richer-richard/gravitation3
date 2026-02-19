# Python Training Scripts for Gravitation³

This directory contains Python-based machine learning training scripts for the Gravitation³ simulators.

## 📋 Overview

These scripts train LSTM (Long Short-Term Memory) neural networks to predict system dynamics for different simulators. The trained models are saved to the `ai_models/` directory (separate from training data).

## 🚀 Quick Start

### 1. Activate Virtual Environment

```bash
source venv/bin/activate
```

### 2. Generate Training Data

Use the simulator web interfaces to generate training data:

**Three-Body System:**
- Open `three-body/sim.html` in a browser
- Run simulations and export data (saves to `ai_data/three-body/`)

**Double-Pendulum System:**
- Open `double-pendulum/sim.html` in a browser
- Run simulations and export data (saves to `ai_data/double-pendulum/`)

### 3. Train Models

**Three-Body:**
```bash
./train_three_body.py
```

**Double-Pendulum:**
```bash
./train_double_pendulum.py
```

## 📦 Requirements

Core packages (installed in `venv/`):
- TensorFlow 2.20.0
- Keras 3.12.0
- NumPy 1.26.4
- Pandas 2.1.4
- Matplotlib 3.8.2
- Scikit-learn 1.3.2

## 📂 Directory Structure

```
Gravitation³/
├── venv/                           # Python virtual environment
├── ai_data/                        # Training data (input)
│   ├── three-body/
│   │   └── dataset_*.json
│   └── double-pendulum/
│       └── dataset_*.json
├── ai_models/                      # Trained models (output)
│   ├── three-body/
│   │   ├── three_body_lstm_*.keras
│   │   └── three_body_lstm_*_history.json
│   └── double-pendulum/
│       ├── double_pendulum_lstm_*.keras
│       └── double_pendulum_lstm_*_history.json
└── scripts/python_training/
    ├── train_three_body.py         # Three-body training script
    ├── train_double_pendulum.py    # Double-pendulum training script
    ├── requirements.txt            # Python dependencies
    └── README.md                   # This file
```

## 🎯 Training Details

### Model Architecture

Both training scripts use a similar LSTM architecture:

1. **Input Layer**: Time-series sequences (default: 50 timesteps)
2. **LSTM Layer 1**: 128 units, returns sequences
3. **Dropout**: 20% (prevents overfitting)
4. **LSTM Layer 2**: 64 units
5. **Dropout**: 20%
6. **Dense Layer**: 128 units (ReLU activation)
7. **Output Layer**: Prediction horizon (default: 10 timesteps)

### Training Configuration

- **Optimizer**: Adam (learning rate: 0.001)
- **Loss Function**: Mean Squared Error (MSE)
- **Metrics**: Mean Absolute Error (MAE)
- **Batch Size**: 32
- **Epochs**: 50 (with early stopping)
- **Validation Split**: 20%

### Callbacks

- **Early Stopping**: Stops training if validation loss doesn't improve for 10 epochs
- **ReduceLROnPlateau**: Reduces learning rate by 50% if validation loss plateaus for 5 epochs

## 📊 Output

Each training run generates:

1. **Model File** (`*.keras`): Keras model in native format
2. **History File** (`*_history.json`): Training metrics and metadata
   - Loss/Validation loss per epoch
   - MAE/Validation MAE per epoch
   - Training configuration
   - Dataset metadata

## 🔧 Customization

### Adjust Sequence Length

Edit the `prepare_sequences()` call in the training scripts:

```python
X, y = prepare_sequences(
    trajectories, 
    sequence_length=100,  # Increase for longer context
    prediction_horizon=20  # Increase to predict further ahead
)
```

### Modify Model Architecture

Edit the `build_model()` function to change layers, units, or activation functions.

### Train for More Epochs

Edit the `train_model()` call:

```python
history = train_model(
    model, X_train, y_train, X_val, y_val, 
    epochs=100  # Increase for more training
)
```

## 🐛 Troubleshooting

### No Training Data Found

**Error**: `ERROR: No training data found in ai_data/[simulator]`

**Solution**: Generate training data using the simulator's web interface first.

### Memory Issues

**Error**: `ResourceExhaustedError` or system running out of memory

**Solution**: Reduce batch size in `train_model()`:

```python
batch_size=16  # Reduced from 32
```

### Installation Issues

If packages fail to install, try:

```bash
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir
```

## 📝 Notes

- Training time varies based on dataset size and hardware
- Models are timestamped to prevent overwriting
- GPU acceleration is automatic if available (CUDA/Metal)
- The `venv/` directory contains an isolated Python environment

## 🎓 Next Steps

After training models:

1. Review training history JSON files to assess model performance
2. Test models with new simulation data
3. Integrate trained models into web interfaces for real-time predictions
4. Experiment with different architectures and hyperparameters

## 📚 Additional Resources

- [TensorFlow Documentation](https://www.tensorflow.org/api_docs)
- [Keras Guide](https://keras.io/guides/)
- [LSTM Networks](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)
- Project AI Documentation: `../../AI_IMPLEMENTATION_GUIDE.md`
