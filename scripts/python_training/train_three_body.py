#!/./venv/bin/python3
"""
Three-Body System AI Training Script
Trains a Hybrid LSTM-Transformer model to predict three-body dynamics
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
from sklearn.metrics import r2_score

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, PROJECT_ROOT)

# Directories
DATA_DIR = os.path.join(PROJECT_ROOT, 'ai_data', 'three-body')
MODEL_DIR = os.path.join(PROJECT_ROOT, 'ai_models', 'three-body')
CHECKPOINT_DIR = os.path.join(MODEL_DIR, 'checkpoints')
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

print("=" * 60)
print("Three-Body System AI Training (LSTM-Transformer Hybrid)")
print("=" * 60)
print(f"TensorFlow version: {tf.__version__}")
print(f"Keras version: {keras.__version__}")
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
    """Load all training data from the three-body data directory"""
    print("Loading training data...")
    
    data_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    
    if not data_files:
        print(f"ERROR: No training data found in {DATA_DIR}")
        print("Please generate training data first using the three-body simulator")
        sys.exit(1)
    
    print(f"Found {len(data_files)} data file(s)")
    
    all_trajectories = []
    all_metadata = []
    
    for filename in data_files:
        filepath = os.path.join(DATA_DIR, filename)
        print(f"  Loading: {filename}")
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        all_trajectories.append(data)
        all_metadata.append(data.get('metadata', {}))
    
    return all_trajectories, all_metadata


def prepare_sequences(trajectories, sequence_length=50, prediction_horizon=10):
    """
    Prepare input/output sequences for training
    
    Args:
        trajectories: List of trajectory data (expects 'samples' format)
        sequence_length: Number of timesteps to use as input
        prediction_horizon: Number of timesteps to predict ahead
    
    Returns:
        X: Input sequences [samples, sequence_length, features]
        y: Target sequences [samples, prediction_horizon, features]
    """
    print(f"\nPreparing sequences (seq_len={sequence_length}, horizon={prediction_horizon})...")
    
    X_list = []
    y_list = []
    
    for traj_data in trajectories:
        # Handle new dataset format with 'samples'
        if 'samples' in traj_data:
            samples = traj_data['samples']
            
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
                    
                    X_list.append(X_seq)
                    y_list.append(y_seq)
        
        # Handle old format with 'positions' (for backward compatibility)
        elif 'positions' in traj_data:
            positions = np.array(traj_data['positions'])  # [timesteps, bodies, 3]
            num_timesteps = len(positions)
            
            # Flatten positions: [timesteps, bodies * 3]
            positions_flat = positions.reshape(num_timesteps, -1)
            
            # Create sequences
            for i in range(num_timesteps - sequence_length - prediction_horizon):
                X_seq = positions_flat[i:i + sequence_length]
                y_seq = positions_flat[i + sequence_length:i + sequence_length + prediction_horizon]
                
                X_list.append(X_seq)
                y_list.append(y_seq)
    
    X = np.array(X_list)
    y = np.array(y_list)
    
    print(f"  Created {len(X)} sequence pairs")
    print(f"  Input shape: {X.shape}")
    print(f"  Output shape: {y.shape}")
    
    return X, y


def build_hybrid_model(input_shape, output_shape):
    """
    Build Hybrid LSTM-Transformer model for trajectory prediction
    Combines temporal LSTM layers with Transformer attention
    """
    print("\nBuilding Hybrid LSTM-Transformer model...")
    
    inputs = keras.Input(shape=input_shape)
    
    # LSTM layers for temporal feature extraction
    x = layers.LSTM(128, return_sequences=True)(inputs)
    x = layers.Dropout(0.2)(x)
    x = layers.LSTM(128, return_sequences=True)(x)
    x = layers.Dropout(0.2)(x)
    
    # Transformer blocks for attention-based feature refinement
    x = TransformerBlock(embed_dim=128, num_heads=8, ff_dim=256, dropout_rate=0.1)(x)
    x = TransformerBlock(embed_dim=128, num_heads=8, ff_dim=256, dropout_rate=0.1)(x)
    
    # Global average pooling to reduce sequence dimension
    x = layers.GlobalAveragePooling1D()(x)
    
    # Dense layers for prediction
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(256, activation='relu')(x)
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
    
    print("Model architecture:")
    model.summary()
    
    return model


def find_latest_checkpoint():
    """Find the latest checkpoint file to resume training"""
    checkpoint_files = [f for f in os.listdir(CHECKPOINT_DIR) if f.startswith('three_body_epoch_') and f.endswith('.keras')]
    if not checkpoint_files:
        return None, 0
    
    # Extract epoch numbers and find the latest
    epochs = []
    for f in checkpoint_files:
        try:
            epoch_num = int(f.split('epoch_')[1].split('_')[0])
            epochs.append((epoch_num, f))
        except:
            continue
    
    if epochs:
        epochs.sort(reverse=True)
        latest_epoch, latest_file = epochs[0]
        return os.path.join(CHECKPOINT_DIR, latest_file), latest_epoch
    
    return None, 0


def train_model(model, X_train, y_train, X_val, y_val, epochs=100, initial_epoch=0):
    """
    Train the model with checkpointing
    
    Args:
        model: Keras model
        X_train, y_train: Training data
        X_val, y_val: Validation data
        epochs: Total number of epochs to train
        initial_epoch: Starting epoch (for resuming training)
    """
    print(f"\nTraining from epoch {initial_epoch} to {epochs}...")
    print(f"Target: R² ≥ 0.95 on validation set")
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    callbacks = [
        # Save checkpoint after every epoch
        keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(CHECKPOINT_DIR, f'three_body_epoch_{{epoch:04d}}_{timestamp}.keras'),
            save_freq='epoch',
            verbose=1,
            save_best_only=False  # Save all epochs for full recovery
        ),
        
        # Save best model based on validation R²
        keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(MODEL_DIR, f'three_body_best_{timestamp}.keras'),
            monitor='val_r2_metric',
            mode='max',
            save_best_only=True,
            verbose=1
        ),
        
        # Reduce learning rate when plateauing
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=10,
            min_lr=1e-7,
            verbose=1
        ),
        
        # TensorBoard logging
        keras.callbacks.TensorBoard(
            log_dir=os.path.join(MODEL_DIR, 'logs', timestamp),
            histogram_freq=1
        ),
        
        # Custom callback to print R² after each epoch
        keras.callbacks.LambdaCallback(
            on_epoch_end=lambda epoch, logs: print(
                f"\n  → Epoch {epoch + 1}: "
                f"Train R² = {logs.get('r2_metric', 0):.4f}, "
                f"Val R² = {logs.get('val_r2_metric', 0):.4f}"
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
        verbose=1
    )
    
    return history


def evaluate_final_performance(model, X_val, y_val):
    """Evaluate final model performance and calculate R²"""
    print("\nEvaluating final model performance...")
    
    y_pred = model.predict(X_val, verbose=0)
    
    # Calculate R² for overall prediction
    y_val_flat = y_val.reshape(-1)
    y_pred_flat = y_pred.reshape(-1)
    r2_overall = r2_score(y_val_flat, y_pred_flat)
    
    print(f"  Final Validation R² = {r2_overall:.4f}")
    
    if r2_overall >= 0.95:
        print("  ✓ Target R² ≥ 0.95 ACHIEVED!")
    else:
        print(f"  ⚠ Target R² ≥ 0.95 not reached (current: {r2_overall:.4f})")
        print("  → Consider training for more epochs or adjusting hyperparameters")
    
    return r2_overall


def save_final_model(model, history, metadata, r2_score):
    """Save the final trained model"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_name = f'three_body_final_{timestamp}'
    model_path = os.path.join(MODEL_DIR, model_name)
    
    print(f"\nSaving final model to {model_path}...")
    
    # Save Keras model
    model.save(f"{model_path}.keras")
    
    # Save training history
    history_path = f"{model_path}_history.json"
    history_dict = {
        'loss': [float(x) for x in history.history['loss']],
        'val_loss': [float(x) for x in history.history['val_loss']],
        'mae': [float(x) for x in history.history['mae']],
        'val_mae': [float(x) for x in history.history['val_mae']],
        'r2_metric': [float(x) for x in history.history['r2_metric']],
        'val_r2_metric': [float(x) for x in history.history['val_r2_metric']],
        'final_r2_score': float(r2_score),
        'metadata': metadata
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
        trajectories, metadata = load_training_data()
        
        # Prepare sequences
        X, y = prepare_sequences(trajectories, sequence_length=50, prediction_horizon=10)
        
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        print(f"\nData split:")
        print(f"  Training samples: {len(X_train)}")
        print(f"  Validation samples: {len(X_val)}")
        
        # Check for existing checkpoint to resume training
        checkpoint_path, initial_epoch = find_latest_checkpoint()
        
        input_shape = (X.shape[1], X.shape[2])
        output_shape = (y.shape[1], y.shape[2])
        
        if checkpoint_path:
            print(f"\n✓ Found checkpoint: {checkpoint_path}")
            print(f"  Resuming from epoch {initial_epoch}")
            model = keras.models.load_model(
                checkpoint_path,
                custom_objects={'TransformerBlock': TransformerBlock, 'r2_metric': r2_metric}
            )
        else:
            print("\nNo checkpoint found. Building new model...")
            model = build_hybrid_model(input_shape, output_shape)
            initial_epoch = 0
        
        # Train model (default 100 epochs, can be increased)
        history = train_model(
            model, X_train, y_train, X_val, y_val,
            epochs=100,
            initial_epoch=initial_epoch
        )
        
        # Evaluate final performance
        final_r2 = evaluate_final_performance(model, X_val, y_val)
        
        # Save final model
        model_path = save_final_model(model, history, {
            'training_files': len(trajectories),
            'total_samples': len(X),
            'input_shape': input_shape,
            'output_shape': output_shape,
            'architecture': 'LSTM-Transformer Hybrid',
            'metadata': metadata
        }, final_r2)
        
        print("\n" + "=" * 60)
        print("Training completed successfully!")
        print(f"Model saved to: {model_path}")
        print(f"Checkpoints saved to: {CHECKPOINT_DIR}")
        print(f"Final R² Score: {final_r2:.4f}")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n\n⚠ Training interrupted by user")
        print("✓ Checkpoints have been saved - you can resume training later")
        sys.exit(0)
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
