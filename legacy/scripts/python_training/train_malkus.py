#!/usr/bin/env python3
"""
Malkus Waterwheel AI Training Script
Trains a Hybrid LSTM-Transformer model to predict mechanical chaos
Target: R² ≥ 0.95
"""

import os
import sys
import json
import numpy as np
from datetime import datetime
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

# Ensure unbuffered output for real-time progress
os.environ['PYTHONUNBUFFERED'] = '1'
sys.stdout.flush()
sys.stderr.flush()

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, PROJECT_ROOT)

# Directories
DATA_DIR = os.path.join(PROJECT_ROOT, 'ai_data', 'malkus-waterwheel')
MODEL_DIR = os.path.join(PROJECT_ROOT, 'ai_models', 'malkus-waterwheel')
CHECKPOINT_DIR = os.path.join(MODEL_DIR, 'checkpoints')
LOGS_DIR = os.path.join(MODEL_DIR, 'logs')
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

print("=" * 70)
print("Malkus Waterwheel AI Training (LSTM-Transformer Hybrid)")
print("=" * 70)
print(f"TensorFlow version: {tf.__version__}")
print(f"Data directory: {DATA_DIR}")
print(f"Model directory: {MODEL_DIR}")
print(f"Checkpoint directory: {CHECKPOINT_DIR}")
print()


class TransformerBlock(layers.Layer):
    """Transformer block with multi-head attention"""
    def __init__(self, embed_dim, num_heads, ff_dim, dropout_rate=0.1, **kwargs):
        super(TransformerBlock, self).__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.ff_dim = ff_dim
        self.dropout_rate = dropout_rate
        
        self.att = layers.MultiHeadAttention(num_heads=num_heads, key_dim=embed_dim)
        self.ffn = keras.Sequential([
            layers.Dense(ff_dim, activation="relu"),
            layers.Dense(embed_dim),
        ])
        self.layernorm1 = layers.LayerNormalization(epsilon=1e-6)
        self.layernorm2 = layers.LayerNormalization(epsilon=1e-6)
        self.dropout1 = layers.Dropout(dropout_rate)
        self.dropout2 = layers.Dropout(dropout_rate)

    def call(self, inputs, training=False):
        attn_output = self.att(inputs, inputs)
        attn_output = self.dropout1(attn_output, training=training)
        out1 = self.layernorm1(inputs + attn_output)
        ffn_output = self.ffn(out1)
        ffn_output = self.dropout2(ffn_output, training=training)
        return self.layernorm2(out1 + ffn_output)
    
    def get_config(self):
        config = super().get_config()
        config.update({
            "embed_dim": self.embed_dim,
            "num_heads": self.num_heads,
            "ff_dim": self.ff_dim,
            "dropout_rate": self.dropout_rate,
        })
        return config
    
    @classmethod
    def from_config(cls, config):
        return cls(**config)


def r2_metric(y_true, y_pred):
    """Custom R² metric for Keras"""
    SS_res = tf.reduce_sum(tf.square(y_true - y_pred))
    SS_tot = tf.reduce_sum(tf.square(y_true - tf.reduce_mean(y_true)))
    return 1 - SS_res / (SS_tot + tf.keras.backend.epsilon())


def load_training_data():
    """Load training data from malkus-waterwheel data directory"""
    print("Loading training data...")
    
    data_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    
    if not data_files:
        print(f"ERROR: No training data found in {DATA_DIR}")
        print("Please generate training data first using: python3 scripts/python_training/collect_malkus_data.py")
        sys.exit(1)
    
    print(f"Found {len(data_files)} data file(s)")
    
    all_datasets = []
    all_metadata = []
    
    for filename in sorted(data_files):
        filepath = os.path.join(DATA_DIR, filename)
        print(f"  Loading: {filename}")
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        all_datasets.append(data)
        all_metadata.append(data.get('metadata', {}))
    
    return all_datasets, all_metadata


def prepare_sequences(datasets, sequence_length=30, prediction_horizon=10):
    """
    Prepare input/output sequences for training
    
    Args:
        datasets: List of dataset files
        sequence_length: Number of timesteps to use as input
        prediction_horizon: Number of timesteps to predict ahead
    
    Returns:
        X: Input sequences [samples, sequence_length, features]
        y: Target sequences [samples, prediction_horizon, output_features]
    """
    print(f"\nPreparing sequences (seq_len={sequence_length}, horizon={prediction_horizon})...")
    
    X_list = []
    y_list = []
    
    for dataset in datasets:
        if 'samples' not in dataset:
            print(f"  WARNING: Dataset missing 'samples' field, skipping...")
            continue
        
        samples = dataset['samples']
        
        # Group samples by trajectory_id
        trajectory_groups = {}
        for sample in samples:
            traj_id = sample['trajectory_id']
            if traj_id not in trajectory_groups:
                trajectory_groups[traj_id] = []
            trajectory_groups[traj_id].append(sample['features'])
        
        # Process each trajectory group
        for traj_id, features_list in trajectory_groups.items():
            features_array = np.array(features_list)  # [timesteps, features]
            num_timesteps = len(features_array)
            
            # Create sequences
            for i in range(num_timesteps - sequence_length - prediction_horizon):
                X_seq = features_array[i:i + sequence_length]
                y_seq = features_array[i + sequence_length:i + sequence_length + prediction_horizon]
                
                # Target is omega and theta (first 2 features)
                y_seq_state = y_seq[:, :2]
                
                X_list.append(X_seq)
                y_list.append(y_seq_state)
    
    X = np.array(X_list)
    y = np.array(y_list)
    
    print(f"  Created {len(X)} sequence pairs")
    print(f"  Input shape: {X.shape}")
    print(f"  Output shape: {y.shape}")
    
    return X, y


def build_hybrid_model(input_shape, output_shape):
    """
    Build Hybrid LSTM-Transformer model for trajectory prediction
    """
    print("\nBuilding Hybrid LSTM-Transformer model...")
    
    inputs = keras.Input(shape=input_shape)
    
    # LSTM layers for temporal feature extraction
    x = layers.LSTM(96, return_sequences=True)(inputs)
    x = layers.Dropout(0.2)(x)
    x = layers.LSTM(96, return_sequences=True)(x)
    x = layers.Dropout(0.2)(x)
    
    # Transformer blocks for attention-based feature refinement
    x = TransformerBlock(embed_dim=96, num_heads=6, ff_dim=192, dropout_rate=0.1)(x)
    x = TransformerBlock(embed_dim=96, num_heads=6, ff_dim=192, dropout_rate=0.1)(x)
    
    # Global average pooling
    x = layers.GlobalAveragePooling1D()(x)
    
    # Dense layers for prediction
    x = layers.Dense(192, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(192, activation='relu')(x)
    x = layers.Dropout(0.1)(x)
    
    # Output layer
    x = layers.Dense(output_shape[0] * output_shape[1])(x)
    outputs = layers.Reshape(output_shape)(x)
    
    model = keras.Model(inputs=inputs, outputs=outputs)
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',
        metrics=['mae', r2_metric]
    )
    
    print("Model built successfully")
    print(f"Input shape: {input_shape}")
    print(f"Output shape: {output_shape}")
    
    return model


def train_model(model, X_train, y_train, X_val, y_val, epochs=100, initial_epoch=0):
    """Train the model with checkpointing and callbacks"""
    print(f"\nTraining from epoch {initial_epoch} to {epochs}...")
    print(f"Target: R² ≥ 0.95 on validation set")
    print(f"Training samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(CHECKPOINT_DIR, f'malkus_epoch_{{epoch:04d}}_{timestamp}.keras'),
            save_freq='epoch',
            verbose=0,
            save_best_only=False
        ),
        
        keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(MODEL_DIR, f'malkus_best_{timestamp}.keras'),
            monitor='val_r2_metric',
            mode='max',
            save_best_only=True,
            verbose=0
        ),
        
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=10,
            min_lr=1e-7,
            verbose=1
        ),
        
        keras.callbacks.TensorBoard(
            log_dir=os.path.join(LOGS_DIR, timestamp),
            histogram_freq=1
        ),
        
        keras.callbacks.LambdaCallback(
            on_epoch_end=lambda epoch, logs: print(
                f"Epoch {epoch + initial_epoch + 1}/{epochs}: "
                f"Train R²={logs.get('r2_metric', 0):.4f} | "
                f"Val R²={logs.get('val_r2_metric', 0):.4f}"
            )
        )
    ]
    
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        initial_epoch=initial_epoch,
        batch_size=32,
        callbacks=callbacks,
        verbose=0
    )
    
    return history


def evaluate_final_performance(model, X_val, y_val):
    """Evaluate final model performance"""
    print("\nEvaluating final model performance...")
    
    y_pred = model.predict(X_val, verbose=0)
    
    y_val_flat = y_val.reshape(-1)
    y_pred_flat = y_pred.reshape(-1)
    
    r2 = r2_score(y_val_flat, y_pred_flat)
    mse = mean_squared_error(y_val_flat, y_pred_flat)
    mae = mean_absolute_error(y_val_flat, y_pred_flat)
    rmse = np.sqrt(mse)
    
    print(f"  Final R² = {r2:.4f}")
    print(f"  MSE = {mse:.6f}")
    print(f"  RMSE = {rmse:.6f}")
    print(f"  MAE = {mae:.6f}")
    
    if r2 >= 0.95:
        print("  ✓ Target R² ≥ 0.95 ACHIEVED!")
    else:
        print(f"  ⚠ Target not reached (need {0.95 - r2:.4f} more)")
    
    return r2


def save_final_model(model, history, r2_score):
    """Save the final trained model"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_name = f'malkus_final_{timestamp}'
    model_path = os.path.join(MODEL_DIR, model_name)
    
    print(f"\nSaving final model to {model_path}...")
    
    model.save(f"{model_path}.keras")
    
    history_path = f"{model_path}_history.json"
    history_dict = {
        'loss': [float(x) for x in history.history['loss']],
        'val_loss': [float(x) for x in history.history['val_loss']],
        'mae': [float(x) for x in history.history['mae']],
        'val_mae': [float(x) for x in history.history['val_mae']],
        'r2_metric': [float(x) for x in history.history['r2_metric']],
        'val_r2_metric': [float(x) for x in history.history['val_r2_metric']],
        'final_r2_score': float(r2_score),
        'system': 'Malkus Waterwheel',
        'architecture': 'LSTM-Transformer Hybrid'
    }
    
    with open(history_path, 'w') as f:
        json.dump(history_dict, f, indent=2)
    
    print(f"✓ Model saved: {model_name}.keras")
    print(f"✓ History saved: {model_name}_history.json")
    print(f"✓ Final R² Score: {r2_score:.4f}")
    
    return model_path


def main():
    """Main training pipeline"""
    try:
        # Load data
        datasets, metadata = load_training_data()
        
        # Prepare sequences
        X, y = prepare_sequences(datasets, sequence_length=30, prediction_horizon=10)
        
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        print(f"\nData split:")
        print(f"  Training: {len(X_train)} sequences")
        print(f"  Validation: {len(X_val)} sequences")
        
        # Build model
        input_shape = (X.shape[1], X.shape[2])
        output_shape = (y.shape[1], y.shape[2])
        model = build_hybrid_model(input_shape, output_shape)
        
        # Train
        history = train_model(model, X_train, y_train, X_val, y_val, epochs=100)
        
        # Evaluate
        final_r2 = evaluate_final_performance(model, X_val, y_val)
        
        # Save
        model_path = save_final_model(model, history, final_r2)
        
        print("\n" + "=" * 70)
        print("Training completed successfully!")
        print(f"Model: {model_path}")
        print(f"Final R²: {final_r2:.4f}")
        print("=" * 70)
        
    except KeyboardInterrupt:
        print("\n\n⚠ Training interrupted by user")
        print("✓ Checkpoints saved - you can resume later")
        sys.exit(0)
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
