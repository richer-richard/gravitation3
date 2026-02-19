"""
Training script for Malkus Waterwheel AI Model
Trains a neural network to predict chaotic rotational dynamics
"""

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from datetime import datetime
import glob

# Configuration
DATA_DIR = "../../ai_data/malkus-waterwheel"
MODEL_DIR = "../../ai_models/malkus-waterwheel"
BATCH_SIZE = 32
EPOCHS = 100
VALIDATION_SPLIT = 0.2
LEARNING_RATE = 0.001

def load_data():
    """Load and preprocess Malkus waterwheel simulation data"""
    print("Loading Malkus waterwheel data...")
    
    data_files = glob.glob(os.path.join(DATA_DIR, "*.json"))
    if not data_files:
        raise FileNotFoundError(f"No data files found in {DATA_DIR}")
    
    all_data = []
    for file in data_files:
        with open(file, 'r') as f:
            data = json.load(f)
            all_data.extend(data.get('samples', []))
    
    print(f"Loaded {len(all_data)} samples from {len(data_files)} files")
    
    # Extract features and labels
    X = []
    y = []
    
    for sample in all_data:
        # Features: angular velocity, bucket states, system parameters
        buckets = sample.get('buckets', [])
        
        # Extract bucket masses and positions (limit to 16 buckets)
        bucket_masses = [b.get('mass', 0) for b in buckets[:16]]
        bucket_angles = [b.get('angle', 0) for b in buckets[:16]]
        
        # Pad if necessary
        while len(bucket_masses) < 16:
            bucket_masses.append(0)
            bucket_angles.append(0)
        
        features = bucket_masses + bucket_angles + [
            sample.get('angularVelocity', 0),
            sample.get('inflow', 0.1),
            sample.get('leakRate', 0.1),
            sample.get('damping', 0.01),
            sample.get('time', 0)
        ]
        
        # Label: predict future angular velocity and rotation direction
        label = [
            sample.get('futureAngularVelocity', sample.get('angularVelocity', 0)),
            sample.get('rotationStability', 0.5),  # 0=chaotic, 1=stable
            sample.get('directionChange', 0)  # Will it reverse direction?
        ]
        
        X.append(features)
        y.append(label)
    
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    
    # Normalize features
    X_mean = np.mean(X, axis=0)
    X_std = np.std(X, axis=0) + 1e-8
    X = (X - X_mean) / X_std
    
    print(f"Feature shape: {X.shape}")
    print(f"Label shape: {y.shape}")
    
    return X, y, X_mean, X_std

def create_model(input_dim, output_dim):
    """Create the neural network model"""
    model = keras.Sequential([
        keras.layers.Dense(128, activation='relu', input_shape=(input_dim,)),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(256, activation='relu'),
        keras.layers.Dropout(0.3),
        keras.layers.Dense(128, activation='relu'),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(64, activation='relu'),
        keras.layers.Dense(output_dim)
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='mse',
        metrics=['mae']
    )
    
    return model

def train_model():
    """Train the Malkus waterwheel prediction model"""
    # Create directories
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Load data
    X, y, X_mean, X_std = load_data()
    
    # Create model
    model = create_model(X.shape[1], y.shape[1])
    model.summary()
    
    # Callbacks
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7
        ),
        keras.callbacks.ModelCheckpoint(
            os.path.join(MODEL_DIR, f'malkus_waterwheel_best_{timestamp}.keras'),
            monitor='val_loss',
            save_best_only=True
        )
    ]
    
    # Train
    print("\nTraining model...")
    history = model.fit(
        X, y,
        batch_size=BATCH_SIZE,
        epochs=EPOCHS,
        validation_split=VALIDATION_SPLIT,
        callbacks=callbacks,
        verbose=1
    )
    
    # Save final model
    model_path = os.path.join(MODEL_DIR, f'malkus_waterwheel_final_{timestamp}.keras')
    model.save(model_path)
    print(f"\nModel saved to {model_path}")
    
    # Save training history
    history_path = os.path.join(MODEL_DIR, f'malkus_waterwheel_final_{timestamp}_history.json')
    with open(history_path, 'w') as f:
        json.dump({k: [float(v) for v in vals] for k, vals in history.history.items()}, f, indent=2)
    print(f"Training history saved to {history_path}")
    
    # Save normalization parameters
    norm_params = {
        'X_mean': X_mean.tolist(),
        'X_std': X_std.tolist()
    }
    norm_path = os.path.join(MODEL_DIR, f'malkus_waterwheel_normalization_{timestamp}.json')
    with open(norm_path, 'w') as f:
        json.dump(norm_params, f, indent=2)
    print(f"Normalization parameters saved to {norm_path}")
    
    return model, history

if __name__ == "__main__":
    print("=" * 60)
    print("Malkus Waterwheel AI Model Training")
    print("=" * 60)
    
    model, history = train_model()
    
    print("\n" + "=" * 60)
    print("Training completed successfully!")
    print("=" * 60)
