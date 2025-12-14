#!/./venv/bin/python3
"""
Double Pendulum System AI Training Script
Trains a Hybrid LSTM-Transformer model to predict double pendulum dynamics
Target: R² ≥ 0.95 for trajectory prediction
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
from sklearn.metrics import r2_score, classification_report, confusion_matrix

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, PROJECT_ROOT)

# Directories
DATA_DIR = os.path.join(PROJECT_ROOT, 'ai_data', 'double-pendulum')
MODEL_DIR = os.path.join(PROJECT_ROOT, 'ai_models', 'double-pendulum')
CHECKPOINT_DIR = os.path.join(MODEL_DIR, 'checkpoints')
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(CHECKPOINT_DIR, exist_ok=True)

print("=" * 70)
print("Double Pendulum System AI Training (LSTM-Transformer Hybrid)")
print("=" * 70)
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
    """Load all training data from the double-pendulum data directory"""
    print("Loading training data...")
    
    data_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    
    if not data_files:
        print(f"ERROR: No training data found in {DATA_DIR}")
        print("Please generate training data first using collect_double_pendulum_data.js")
        sys.exit(1)
    
    print(f"Found {len(data_files)} data file(s)")
    
    all_samples = []
    all_metadata = []
    
    for filename in data_files:
        filepath = os.path.join(DATA_DIR, filename)
        print(f"  Loading: {filename}")
        
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        if 'samples' in data:
            all_samples.extend(data['samples'])
        
        all_metadata.append(data.get('metadata', {}))
    
    print(f"  Total samples loaded: {len(all_samples)}")
    
    return all_samples, all_metadata


def prepare_classification_data(samples):
    """
    Prepare data for behavior classification (periodic, chaotic, resonant)
    
    Args:
        samples: List of sample dictionaries with features and labels
    
    Returns:
        X: Feature array [samples, features]
        y: Label array (categorical) [samples, num_classes]
        label_names: List of label names
    """
    print("\nPreparing classification data...")
    
    X = []
    y = []
    label_names = ['periodic', 'chaotic', 'resonant']
    label_to_idx = {label: idx for idx, label in enumerate(label_names)}
    
    for sample in samples:
        X.append(sample['features'])
        label_idx = label_to_idx[sample['label']]
        y.append(label_idx)
    
    X = np.array(X)
    y = keras.utils.to_categorical(y, num_classes=len(label_names))
    
    print(f"  Features shape: {X.shape}")
    print(f"  Labels shape: {y.shape}")
    print(f"  Number of classes: {len(label_names)}")
    
    # Print label distribution
    label_counts = {}
    for sample in samples:
        label = sample['label']
        label_counts[label] = label_counts.get(label, 0) + 1
    
    print("\n  Label distribution:")
    for label in label_names:
        count = label_counts.get(label, 0)
        percent = (count / len(samples)) * 100
        print(f"    {label}: {count} ({percent:.1f}%)")
    
    return X, y, label_names


def prepare_sequences(samples, sequence_length=50, prediction_horizon=10):
    """
    Prepare input/output sequences for trajectory prediction
    
    Args:
        samples: List of sample dictionaries
        sequence_length: Number of timesteps to use as input
        prediction_horizon: Number of timesteps to predict ahead
    
    Returns:
        X: Input sequences [samples, sequence_length, features]
        y: Target sequences [samples, prediction_horizon, features]
    """
    print(f"\nPreparing sequences (seq_len={sequence_length}, horizon={prediction_horizon})...")
    
    # Group samples by trajectory_id
    trajectory_groups = {}
    for sample in samples:
        traj_id = sample['trajectory_id']
        if traj_id not in trajectory_groups:
            trajectory_groups[traj_id] = []
        trajectory_groups[traj_id].append(sample)
    
    X_list = []
    y_list = []
    
    for traj_id, traj_samples in trajectory_groups.items():
        # Sort by timestep
        traj_samples.sort(key=lambda s: s['timestep'])
        
        # Extract features
        features_array = np.array([s['features'] for s in traj_samples])
        num_timesteps = len(features_array)
        
        # Create sequences
        for i in range(num_timesteps - sequence_length - prediction_horizon):
            X_seq = features_array[i:i + sequence_length]
            y_seq = features_array[i + sequence_length:i + sequence_length + prediction_horizon]
            
            X_list.append(X_seq)
            y_list.append(y_seq)
    
    X = np.array(X_list)
    y = np.array(y_list)
    
    print(f"  Created {len(X)} sequence pairs")
    print(f"  Input shape: {X.shape}")
    print(f"  Output shape: {y.shape}")
    
    return X, y


def build_classifier_model(input_shape, num_classes):
    """
    Build a classifier for pendulum behavior (periodic, chaotic, resonant)
    """
    print("\nBuilding classifier model...")
    
    inputs = keras.Input(shape=input_shape)
    
    # Dense layers with dropout
    x = layers.Dense(96, activation='relu')(inputs)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(48, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(24, activation='relu')(x)
    
    # Output layer
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = keras.Model(inputs=inputs, outputs=outputs)
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    print("Classifier architecture:")
    model.summary()
    
    return model


def build_trajectory_predictor(input_shape, output_shape):
    """
    Build Hybrid LSTM-Transformer model for trajectory prediction
    """
    print("\nBuilding trajectory predictor model...")
    
    inputs = keras.Input(shape=input_shape)
    
    # LSTM layers for temporal feature extraction
    x = layers.LSTM(96, return_sequences=True)(inputs)
    x = layers.Dropout(0.2)(x)
    x = layers.LSTM(96, return_sequences=True)(x)
    x = layers.Dropout(0.2)(x)
    
    # Transformer blocks for attention-based refinement
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
    
    print("Trajectory predictor architecture:")
    model.summary()
    
    return model


def train_classifier(model, X_train, y_train, X_val, y_val, label_names, epochs=50):
    """Train the behavior classifier"""
    print(f"\nTraining classifier for {epochs} epochs...")
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(MODEL_DIR, f'double_pendulum_classifier_best_{timestamp}.keras'),
            monitor='val_accuracy',
            mode='max',
            save_best_only=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        ),
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.TensorBoard(
            log_dir=os.path.join(MODEL_DIR, 'logs', 'classifier', timestamp)
        )
    ]
    
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=32,
        callbacks=callbacks,
        verbose=1
    )
    
    # Evaluate classifier
    print("\nEvaluating classifier...")
    y_pred = model.predict(X_val, verbose=0)
    y_pred_classes = np.argmax(y_pred, axis=1)
    y_true_classes = np.argmax(y_val, axis=1)
    
    print("\nClassification Report:")
    # Get unique classes present in the data
    unique_classes = np.unique(np.concatenate([y_true_classes, y_pred_classes]))
    present_labels = [label_names[i] for i in unique_classes]
    print(classification_report(y_true_classes, y_pred_classes, 
                                target_names=present_labels,
                                labels=unique_classes))
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_true_classes, y_pred_classes)
    print(cm)
    
    return history, model


def train_trajectory_predictor(model, X_train, y_train, X_val, y_val, epochs=100, initial_epoch=0):
    """Train the trajectory predictor"""
    print(f"\nTraining trajectory predictor from epoch {initial_epoch} to {epochs}...")
    print(f"Target: R² ≥ 0.95 on validation set")
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(CHECKPOINT_DIR, f'double_pendulum_predictor_epoch_{{epoch:04d}}_{timestamp}.keras'),
            save_freq='epoch',
            verbose=1,
            save_best_only=False
        ),
        keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(MODEL_DIR, f'double_pendulum_predictor_best_{timestamp}.keras'),
            monitor='val_r2_metric',
            mode='max',
            save_best_only=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=10,
            min_lr=1e-7,
            verbose=1
        ),
        keras.callbacks.TensorBoard(
            log_dir=os.path.join(MODEL_DIR, 'logs', 'predictor', timestamp),
            histogram_freq=1
        ),
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


def evaluate_predictor(model, X_val, y_val):
    """Evaluate trajectory predictor performance"""
    print("\nEvaluating trajectory predictor...")
    
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
        print("  → Consider training for more epochs")
    
    return r2_overall


def find_latest_checkpoint(prefix):
    """Find the latest checkpoint file"""
    checkpoint_files = [f for f in os.listdir(CHECKPOINT_DIR) 
                       if f.startswith(prefix) and f.endswith('.keras')]
    if not checkpoint_files:
        return None, 0
    
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


def save_training_results(history, metadata, model_type, final_metric):
    """Save training results to JSON"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_path = os.path.join(MODEL_DIR, f'{model_type}_training_results_{timestamp}.json')
    
    results = {
        'model_type': model_type,
        'timestamp': timestamp,
        'history': {k: [float(x) for x in v] for k, v in history.history.items()},
        'final_metric': float(final_metric),
        'metadata': metadata
    }
    
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✓ Training results saved: {results_path}")


def main():
    """Main training pipeline"""
    try:
        # Load data
        samples, metadata = load_training_data()
        
        print("\n" + "=" * 70)
        print("STEP 1: Train Behavior Classifier")
        print("=" * 70)
        
        # Prepare classification data
        X_class, y_class, label_names = prepare_classification_data(samples)
        
        # Split data
        X_train_c, X_val_c, y_train_c, y_val_c = train_test_split(
            X_class, y_class, test_size=0.2, random_state=42, stratify=np.argmax(y_class, axis=1)
        )
        
        print(f"\nClassifier data split:")
        print(f"  Training samples: {len(X_train_c)}")
        print(f"  Validation samples: {len(X_val_c)}")
        
        # Build and train classifier
        classifier = build_classifier_model(X_class.shape[1:], len(label_names))
        history_c, classifier = train_classifier(
            classifier, X_train_c, y_train_c, X_val_c, y_val_c, 
            label_names, epochs=50
        )
        
        # Save classifier results
        final_accuracy = max(history_c.history['val_accuracy'])
        save_training_results(history_c, {
            'num_samples': len(samples),
            'labels': label_names,
            'metadata': metadata
        }, 'classifier', final_accuracy)
        
        print("\n" + "=" * 70)
        print("STEP 2: Train Trajectory Predictor")
        print("=" * 70)
        
        # Prepare sequence data
        X_seq, y_seq = prepare_sequences(samples, sequence_length=50, prediction_horizon=10)
        
        # Split data
        X_train_s, X_val_s, y_train_s, y_val_s = train_test_split(
            X_seq, y_seq, test_size=0.2, random_state=42
        )
        
        print(f"\nPredictor data split:")
        print(f"  Training samples: {len(X_train_s)}")
        print(f"  Validation samples: {len(X_val_s)}")
        
        # Check for checkpoint
        checkpoint_path, initial_epoch = find_latest_checkpoint('double_pendulum_predictor_epoch_')
        
        if checkpoint_path:
            print(f"\n✓ Found checkpoint: {checkpoint_path}")
            print(f"  Resuming from epoch {initial_epoch}")
            predictor = keras.models.load_model(
                checkpoint_path,
                custom_objects={'TransformerBlock': TransformerBlock, 'r2_metric': r2_metric}
            )
        else:
            print("\nNo checkpoint found. Building new predictor...")
            input_shape = (X_seq.shape[1], X_seq.shape[2])
            output_shape = (y_seq.shape[1], y_seq.shape[2])
            predictor = build_trajectory_predictor(input_shape, output_shape)
            initial_epoch = 0
        
        # Train predictor
        history_p = train_trajectory_predictor(
            predictor, X_train_s, y_train_s, X_val_s, y_val_s,
            epochs=100, initial_epoch=initial_epoch
        )
        
        # Evaluate predictor
        final_r2 = evaluate_predictor(predictor, X_val_s, y_val_s)
        
        # Save predictor results
        save_training_results(history_p, {
            'num_samples': len(samples),
            'sequence_length': 50,
            'prediction_horizon': 10,
            'metadata': metadata
        }, 'predictor', final_r2)
        
        print("\n" + "=" * 70)
        print("Training completed successfully!")
        print(f"Classifier accuracy: {final_accuracy:.4f}")
        print(f"Predictor R²: {final_r2:.4f}")
        print(f"Models saved to: {MODEL_DIR}")
        print("=" * 70)
        
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
