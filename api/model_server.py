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

# Global model storage
models = {
    'three_body': None,
    'double_pendulum': None,
    'lorenz_attractor': None
}

def load_models():
    """Load AI models on startup"""
    # Define custom objects for model loading
    custom_objects = {
        'TransformerBlock': TransformerBlock,
        'r2_metric': r2_metric
    }
    
    try:
        logger.info("Loading Three-Body model...")
        models['three_body'] = tf.keras.models.load_model(
            '../ai_models/three-body/three_body_final_20251111_071642.keras',
            custom_objects=custom_objects,
            compile=False,
            safe_mode=False
        )
        logger.info("✓ Three-Body model loaded successfully")
    except Exception as e:
        logger.error(f"✗ Failed to load Three-Body model: {e}")
    
    try:
        logger.info("Loading Double Pendulum model...")
        models['double_pendulum'] = tf.keras.models.load_model(
            '../ai_models/double-pendulum/double_pendulum_predictor_best_20251112_162121.keras',
            custom_objects=custom_objects,
            compile=False,
            safe_mode=False
        )
        logger.info("✓ Double Pendulum model loaded successfully")
    except Exception as e:
        logger.error(f"✗ Failed to load Double Pendulum model: {e}")
    
    try:
        logger.info("Loading Lorenz Attractor model...")
        models['lorenz_attractor'] = tf.keras.models.load_model(
            '../ai_models/lorenz-attractor/lorenz_final_20251123_000431.keras',
            custom_objects=custom_objects,
            compile=False,
            safe_mode=False
        )
        logger.info("✓ Lorenz Attractor model loaded successfully")
    except Exception as e:
        logger.error(f"✗ Failed to load Lorenz Attractor model: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'models': {
            'three_body': models['three_body'] is not None,
            'double_pendulum': models['double_pendulum'] is not None,
            'lorenz_attractor': models['lorenz_attractor'] is not None
        }
    })

@app.route('/api/three-body/predict', methods=['POST'])
def predict_three_body():
    """Predict next states for three-body system"""
    try:
        if models['three_body'] is None:
            return jsonify({'error': 'Model not loaded'}), 503
        
        # Get input data
        data = request.json
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
        
        # Make prediction
        input_tensor = np.array([input_data], dtype=np.float32)
        prediction = models['three_body'].predict(input_tensor, verbose=0)
        
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
        data = request.json
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
        data = request.json
        x = data.get('x', 0)
        y = data.get('y', 0)
        z = data.get('z', 0)
        sigma = data.get('sigma', 10)
        rho = data.get('rho', 28)
        beta = data.get('beta', 8/3)
        
        # Prepare input as a single state
        state = np.array([x, y, z, sigma, rho, beta], dtype=np.float32)
        
        # The Lorenz model expects 3D input: (batch, sequence_length=50, features=6)
        # Create a sequence by repeating the state 50 times
        sequence = np.tile(state, (50, 1))  # Shape: (50, 6)
        input_data = np.expand_dims(sequence, axis=0)  # Shape: (1, 50, 6)
        
        # Make prediction
        prediction = models['lorenz_attractor'].predict(input_data, verbose=0)
        
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
    logger.info("  GET  /api/models/info - Model information")
    logger.info("  POST /api/three-body/predict - Three-body predictions")
    logger.info("  POST /api/double-pendulum/predict - Double pendulum predictions")
    logger.info("\nListening on http://localhost:5003")
    logger.info("="*50 + "\n")
    
    # Run server (port 5003 to avoid conflict with macOS AirPlay on 5000)
    # API-1 fix: Disable debug mode for production, only enable in development
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=5003, debug=debug_mode, use_reloader=False)
