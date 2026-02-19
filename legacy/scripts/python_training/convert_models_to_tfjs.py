"""
Convert Keras models to TensorFlow.js format for browser use
"""
import tensorflowjs as tfjs
import tensorflow as tf
import os

def convert_model(keras_path, output_dir):
    """Convert a Keras model to TensorFlow.js format"""
    try:
        print(f"Loading model from: {keras_path}")
        model = tf.keras.models.load_model(keras_path)
        
        print(f"Converting to TensorFlow.js format...")
        print(f"Output directory: {output_dir}")
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Convert to TensorFlow.js format
        tfjs.converters.save_keras_model(model, output_dir)
        
        print(f"✓ Successfully converted model to {output_dir}")
        print(f"  Files created: model.json + weight files")
        
    except Exception as e:
        print(f"✗ Error converting {keras_path}: {e}")

def main():
    # Convert Three-Body model
    print("\n=== Converting Three-Body Model ===")
    convert_model(
        '../../ai_models/three-body/three_body_final_20251111_071642.keras',
        '../../ai_models/three-body/tfjs_model'
    )
    
    # Convert Double Pendulum model
    print("\n=== Converting Double Pendulum Model ===")
    convert_model(
        '../../ai_models/double-pendulum/double_pendulum_predictor_best_20251112_162121.keras',
        '../../ai_models/double-pendulum/tfjs_model'
    )
    
    print("\n=== Conversion Complete ===")
    print("Models are now ready for browser use!")

if __name__ == '__main__':
    main()
