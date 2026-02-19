"""
AI Model API Server for Gravitation³
Serves predictions from trained Three-Body and Double Pendulum models
"""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import numpy as np
import logging
from pathlib import Path

# Custom Transformer Block Layer
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

    def build(self, input_shape):
        # MultiHeadAttention.build expects both query and value shapes.
        self.att.build(input_shape, input_shape)
        self.ffn.build(input_shape)
        self.layernorm1.build(input_shape)
        self.layernorm2.build(input_shape)
        super().build(input_shape)

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

# Custom R² Metric
def r2_metric(y_true, y_pred):
    """Custom R² metric for Keras"""
    SS_res = tf.reduce_sum(tf.square(y_true - y_pred))
    SS_tot = tf.reduce_sum(tf.square(y_true - tf.reduce_mean(y_true)))
    return 1 - SS_res / (SS_tot + keras.backend.epsilon())

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for browser requests

# Resolve paths relative to this file for robust launches
API_DIR = Path(__file__).parent.resolve()
PROJECT_DIR = API_DIR.parent
AI_MODELS_DIR = PROJECT_DIR / "ai_models"

# Global model storage
models = {
    'three_body': None,
    'double_pendulum': None,
    'lorenz_attractor': None
    ,
    'rossler_attractor': None,
    'double_gyre': None,
    'malkus_waterwheel': None
}

def load_models():
    """Load AI models on startup"""
    # Define custom objects for model loading
    custom_objects = {
        'TransformerBlock': TransformerBlock,
        'r2_metric': r2_metric
    }
    
    model_specs = [
        ('three_body', AI_MODELS_DIR / 'three-body' / 'three_body_final_20251111_071642.keras', "Three-Body"),
        ('double_pendulum', AI_MODELS_DIR / 'double-pendulum' / 'double_pendulum_predictor_best_20251112_162121.keras', "Double Pendulum"),
        ('lorenz_attractor', AI_MODELS_DIR / 'lorenz-attractor' / 'lorenz_final_20251123_000431.keras', "Lorenz Attractor"),
        ('rossler_attractor', AI_MODELS_DIR / 'rossler-attractor' / 'rossler_final_20251123_114133.keras', "Rössler Attractor"),
        ('double_gyre', AI_MODELS_DIR / 'double-gyre' / 'double_gyre_final_20251123_190033.keras', "Double Gyre"),
        ('malkus_waterwheel', AI_MODELS_DIR / 'malkus-waterwheel' / 'malkus_final_20251123_194848.keras', "Malkus Waterwheel"),
    ]

    for key, path, label in model_specs:
        try:
            if not path.exists():
                logger.warning(f"⏭ {label} model file not found: {path}")
                models[key] = None
                continue

            logger.info(f"Loading {label} model from {path} ...")
            models[key] = tf.keras.models.load_model(
                str(path),
                custom_objects=custom_objects,
                compile=False,
                safe_mode=False
            )
            logger.info(f"✓ {label} model loaded successfully (input={models[key].input_shape}, output={models[key].output_shape})")
        except Exception as e:
            logger.error(f"✗ Failed to load {label} model: {e}")
            models[key] = None


@app.route('/api/status', methods=['GET'])
def api_status():
    """Compatibility status endpoint for browser helpers."""
    return jsonify({
        'ready': True,
        'models': {k: v is not None for k, v in models.items()}
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'models': {
            'three_body': models['three_body'] is not None,
            'double_pendulum': models['double_pendulum'] is not None,
            'lorenz_attractor': models['lorenz_attractor'] is not None,
            'rossler_attractor': models['rossler_attractor'] is not None,
            'double_gyre': models['double_gyre'] is not None,
            'malkus_waterwheel': models['malkus_waterwheel'] is not None
        }
    })

@app.route('/api/three-body/predict', methods=['POST'])
def predict_three_body():
    """Predict next states for three-body system"""
    try:
        if models['three_body'] is None:
            return jsonify({'error': 'Model not loaded'}), 503
        
        # Get input data
        data = request.get_json(silent=True) or {}
        positions = data.get('positions', [])
        velocities = data.get('velocities', [])
        
        # Prepare input (18 values: x,y,z,vx,vy,vz for 3 bodies)
        input_data = []
        for i in range(min(3, len(positions))):
            pos = positions[i]
            vel = velocities[i]
            input_data.extend([
                pos.get('x', 0),
                pos.get('y', 0),
                pos.get('z', 0),
                vel.get('vx', 0),
                vel.get('vy', 0),
                vel.get('vz', 0)
            ])
        
        # Pad if needed
        while len(input_data) < 18:
            input_data.append(0)
        
        model = models['three_body']

        seq_len = int(model.input_shape[1] or 50)
        feature_dim = int(model.input_shape[2] or 18)

        # Build a sequence input (seq_len, feature_dim)
        provided_sequence = data.get('sequence')
        if isinstance(provided_sequence, list) and provided_sequence:
            seq = np.array(provided_sequence, dtype=np.float32)
            if seq.ndim != 2 or seq.shape[1] != feature_dim:
                return jsonify({'error': f'Invalid sequence shape; expected (*, {feature_dim})'}), 400
            if seq.shape[0] >= seq_len:
                seq = seq[-seq_len:]
            else:
                # Left-pad by repeating first row
                pad = np.repeat(seq[:1], seq_len - seq.shape[0], axis=0)
                seq = np.concatenate([pad, seq], axis=0)
        else:
            state = np.array(input_data[:feature_dim], dtype=np.float32)
            seq = np.tile(state, (seq_len, 1))

        input_tensor = np.expand_dims(seq, axis=0)  # (1, seq_len, feature_dim)
        prediction = model.predict(input_tensor, verbose=0)
        
        return jsonify({
            'prediction': prediction.tolist()[0],
            'shape': prediction.shape
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/double-pendulum/predict', methods=['POST'])
def predict_double_pendulum():
    """Predict next states for double pendulum"""
    try:
        if models['double_pendulum'] is None:
            return jsonify({'error': 'Model not loaded'}), 503
        
        # Get input data
        data = request.get_json(silent=True) or {}
        theta1 = data.get('theta1', 0)
        theta2 = data.get('theta2', 0)
        omega1 = data.get('omega1', 0)
        omega2 = data.get('omega2', 0)
        l1 = data.get('l1', 1)
        l2 = data.get('l2', 1)
        m1 = data.get('m1', 1)
        m2 = data.get('m2', 1)
        
        # Prepare input
        input_data = np.array([[theta1, theta2, omega1, omega2, l1, l2, m1, m2]], 
                              dtype=np.float32)
        
        # Make prediction
        prediction = models['double_pendulum'].predict(input_data, verbose=0)
        
        return jsonify({
            'prediction': prediction.tolist()[0],
            'shape': prediction.shape
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/lorenz/predict', methods=['POST'])
def predict_lorenz():
    """Predict next states for Lorenz attractor"""
    try:
        if models['lorenz_attractor'] is None:
            return jsonify({'error': 'Model not loaded'}), 503
        
        # Get input data
        data = request.get_json(silent=True) or {}
        x = data.get('x', 0)
        y = data.get('y', 0)
        z = data.get('z', 0)
        sigma = data.get('sigma', 10)
        rho = data.get('rho', 28)
        beta = data.get('beta', 8/3)
        t = data.get('time', 0)
        
        model = models['lorenz_attractor']
        seq_len = int(model.input_shape[1] or 50)
        feature_dim = int(model.input_shape[2] or 7)

        # Prepare input as a single feature vector
        state = np.array([x, y, z, sigma, rho, beta, t], dtype=np.float32)
        state = state[:feature_dim]
        sequence = np.tile(state, (seq_len, 1))
        input_data = np.expand_dims(sequence, axis=0)  # (1, seq_len, feature_dim)

        prediction = model.predict(input_data, verbose=0)
        
        return jsonify({
            'prediction': prediction.tolist()[0],
            'shape': prediction.shape
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/rossler/predict', methods=['POST'])
def predict_rossler():
    """Predict next states for Rössler attractor"""
    try:
        if models['rossler_attractor'] is None:
            return jsonify({'error': 'Model not loaded'}), 503

        data = request.get_json(silent=True) or {}
        x = data.get('x', 0)
        y = data.get('y', 0)
        z = data.get('z', 0)
        a = data.get('a', 0.2)
        b = data.get('b', 0.2)
        c = data.get('c', 5.7)
        t = data.get('time', 0)

        model = models['rossler_attractor']
        seq_len = int(model.input_shape[1] or 50)
        feature_dim = int(model.input_shape[2] or 7)

        state = np.array([x, y, z, a, b, c, t], dtype=np.float32)
        state = state[:feature_dim]
        sequence = np.tile(state, (seq_len, 1))
        input_data = np.expand_dims(sequence, axis=0)

        prediction = model.predict(input_data, verbose=0)

        return jsonify({
            'prediction': prediction.tolist()[0],
            'shape': prediction.shape
        })

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/double-gyre/predict', methods=['POST'])
def predict_double_gyre():
    """Predict next states for Double Gyre flow (single particle)."""
    try:
        if models['double_gyre'] is None:
            return jsonify({'error': 'Model not loaded'}), 503

        data = request.get_json(silent=True) or {}
        x = data.get('x', 0)
        y = data.get('y', 0)
        A = data.get('A', 0.1)
        epsilon = data.get('epsilon', 0.25)
        omega = data.get('omega', 0.5)
        t = data.get('time', 0)

        model = models['double_gyre']
        seq_len = int(model.input_shape[1] or 50)
        feature_dim = int(model.input_shape[2] or 6)

        state = np.array([x, y, A, epsilon, omega, t], dtype=np.float32)
        state = state[:feature_dim]
        sequence = np.tile(state, (seq_len, 1))
        input_data = np.expand_dims(sequence, axis=0)

        prediction = model.predict(input_data, verbose=0)

        return jsonify({
            'prediction': prediction.tolist()[0],
            'shape': prediction.shape
        })

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/malkus-waterwheel/predict', methods=['POST'])
def predict_malkus_waterwheel():
    """Predict next states for the Malkus waterwheel (omega/theta)."""
    try:
        if models['malkus_waterwheel'] is None:
            return jsonify({'error': 'Model not loaded'}), 503

        data = request.get_json(silent=True) or {}
        omega = data.get('omega', data.get('angularVelocity', 0))
        theta = data.get('theta', 0)

        bucket_mass_sum = data.get('bucket_mass_sum')
        if bucket_mass_sum is None:
            masses = data.get('bucketMasses') or data.get('bucket_masses') or data.get('masses')
            if isinstance(masses, list):
                try:
                    bucket_mass_sum = float(sum(float(m) for m in masses))
                except Exception:
                    bucket_mass_sum = 0
            else:
                bucket_mass_sum = 0

        Q = data.get('Q', data.get('inflow', 2.5))
        K = data.get('K', data.get('leakRate', 0.1))
        nu = data.get('nu', data.get('damping', 1.0))
        t = data.get('time', 0)

        model = models['malkus_waterwheel']
        seq_len = int(model.input_shape[1] or 30)
        feature_dim = int(model.input_shape[2] or 7)

        state = np.array([omega, theta, bucket_mass_sum, Q, K, nu, t], dtype=np.float32)
        state = state[:feature_dim]
        sequence = np.tile(state, (seq_len, 1))
        input_data = np.expand_dims(sequence, axis=0)

        prediction = model.predict(input_data, verbose=0)

        return jsonify({
            'prediction': prediction.tolist()[0],
            'shape': prediction.shape
        })

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/info', methods=['GET'])
def models_info():
    """Get information about loaded models"""
    info = {}
    
    if models['three_body']:
        model = models['three_body']
        info['three_body'] = {
            'loaded': True,
            'input_shape': str(model.input_shape),
            'output_shape': str(model.output_shape),
            'parameters': model.count_params()
        }
    else:
        info['three_body'] = {'loaded': False}
    
    if models['double_pendulum']:
        model = models['double_pendulum']
        info['double_pendulum'] = {
            'loaded': True,
            'input_shape': str(model.input_shape),
            'output_shape': str(model.output_shape),
            'parameters': model.count_params()
        }
    else:
        info['double_pendulum'] = {'loaded': False}

    if models['lorenz_attractor']:
        model = models['lorenz_attractor']
        info['lorenz_attractor'] = {
            'loaded': True,
            'input_shape': str(model.input_shape),
            'output_shape': str(model.output_shape),
            'parameters': model.count_params()
        }
    else:
        info['lorenz_attractor'] = {'loaded': False}

    if models['rossler_attractor']:
        model = models['rossler_attractor']
        info['rossler_attractor'] = {
            'loaded': True,
            'input_shape': str(model.input_shape),
            'output_shape': str(model.output_shape),
            'parameters': model.count_params()
        }
    else:
        info['rossler_attractor'] = {'loaded': False}

    if models['double_gyre']:
        model = models['double_gyre']
        info['double_gyre'] = {
            'loaded': True,
            'input_shape': str(model.input_shape),
            'output_shape': str(model.output_shape),
            'parameters': model.count_params()
        }
    else:
        info['double_gyre'] = {'loaded': False}

    if models['malkus_waterwheel']:
        model = models['malkus_waterwheel']
        info['malkus_waterwheel'] = {
            'loaded': True,
            'input_shape': str(model.input_shape),
            'output_shape': str(model.output_shape),
            'parameters': model.count_params()
        }
    else:
        info['malkus_waterwheel'] = {'loaded': False}
    
    return jsonify(info)

if __name__ == '__main__':
    logger.info("="*50)
    logger.info("Gravitation³ AI Model Server")
    logger.info("="*50)
    
    # Load models
    load_models()
    
    logger.info("\nServer starting...")
    logger.info("API Endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  GET  /api/status - Compatibility status")
    logger.info("  GET  /api/models/info - Model information")
    logger.info("  POST /api/three-body/predict - Three-body predictions")
    logger.info("  POST /api/double-pendulum/predict - Double pendulum predictions")
    logger.info("  POST /api/lorenz/predict - Lorenz attractor predictions")
    logger.info("  POST /api/rossler/predict - Rössler attractor predictions")
    logger.info("  POST /api/double-gyre/predict - Double gyre predictions")
    logger.info("  POST /api/malkus-waterwheel/predict - Malkus waterwheel predictions")
    logger.info("\nListening on http://localhost:5003")
    logger.info("="*50 + "\n")
    
    # Run server (port 5003 to avoid conflict with macOS AirPlay on 5000)
    # API-1 fix: Disable debug mode for production, only enable in development
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=5003, debug=debug_mode, use_reloader=False)
