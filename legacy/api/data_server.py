#!/./venv/bin/python3
"""
Gravitation³ Data Collection Server
Receives and stores real-time simulation data for AI analysis
"""

import os
import json
import time
from datetime import datetime
from collections import deque
from flask import Flask, request, jsonify
from flask_cors import CORS
from threading import Lock

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": False
    }
})

# Store data for each simulation (last 10 seconds)
# Key: simulation_id, Value: deque of data points with timestamps
simulation_data = {}
data_lock = Lock()

# Configuration
MAX_AGE_SECONDS = 10  # Keep last 10 seconds of data
MAX_DATA_POINTS = 1000  # Maximum data points to store per simulation


class SimulationDataStore:
    """Thread-safe data store for simulation data"""
    
    def __init__(self, simulation_id):
        self.simulation_id = simulation_id
        self.data_points = deque(maxlen=MAX_DATA_POINTS)
        self.last_update = time.time()
        self.metadata = {}
    
    def add_data_point(self, data):
        """Add a new data point with timestamp"""
        timestamp = time.time()
        
        # Clean old data (older than 10 seconds)
        self.clean_old_data(timestamp)
        
        # Add new data point
        self.data_points.append({
            'timestamp': timestamp,
            'data': data
        })
        
        self.last_update = timestamp
    
    def clean_old_data(self, current_time):
        """Remove data points older than MAX_AGE_SECONDS"""
        cutoff_time = current_time - MAX_AGE_SECONDS
        
        # Remove old items from the front of the deque
        while self.data_points and self.data_points[0]['timestamp'] < cutoff_time:
            self.data_points.popleft()
    
    def get_recent_data(self, seconds=None):
        """Get data from the last N seconds (default: all available)"""
        current_time = time.time()
        self.clean_old_data(current_time)
        
        if seconds is None:
            return list(self.data_points)
        
        cutoff_time = current_time - seconds
        return [dp for dp in self.data_points if dp['timestamp'] >= cutoff_time]
    
    def get_latest(self):
        """Get the most recent data point"""
        if not self.data_points:
            return None
        return self.data_points[-1]
    
    def get_summary(self):
        """Get summary statistics"""
        if not self.data_points:
            return {
                'available': False,
                'message': 'No data available'
            }
        
        data_list = list(self.data_points)
        latest = data_list[-1]['data']
        oldest = data_list[0]['data']
        
        return {
            'available': True,
            'simulation_id': self.simulation_id,
            'data_points': len(data_list),
            'time_span': data_list[-1]['timestamp'] - data_list[0]['timestamp'],
            'last_update': self.last_update,
            'latest_state': latest,
            'metadata': self.metadata
        }


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'simulations_active': len(simulation_data),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/data/submit', methods=['POST', 'OPTIONS'])
def submit_data():
    """
    Receive simulation data from clients
    Expected format:
    {
        "simulation_id": "lorenz-attractor-123",
        "simulation_name": "Lorenz Attractor",
        "data": {
            "time": 123.45,
            "bodies": [...],
            "energy": 1.23,
            ...
        }
    }
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        payload = request.json
        
        if not payload:
            return jsonify({'error': 'No data provided'}), 400
        
        simulation_id = payload.get('simulation_id')
        simulation_name = payload.get('simulation_name', 'Unknown')
        data = payload.get('data')
        
        if not simulation_id or not data:
            return jsonify({'error': 'Missing simulation_id or data'}), 400
        
        with data_lock:
            # Create store if it doesn't exist
            if simulation_id not in simulation_data:
                simulation_data[simulation_id] = SimulationDataStore(simulation_id)
                simulation_data[simulation_id].metadata = {
                    'name': simulation_name,
                    'created': time.time()
                }
            
            # Add data point
            simulation_data[simulation_id].add_data_point(data)
        
        return jsonify({
            'status': 'success',
            'simulation_id': simulation_id,
            'data_points_stored': len(simulation_data[simulation_id].data_points)
        })
    
    except Exception as e:
        print(f"Error submitting data: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/data/get/<simulation_id>', methods=['GET'])
def get_data(simulation_id):
    """
    Get data for a specific simulation
    Query params:
    - seconds: Number of seconds of data to retrieve (default: all)
    - format: 'full' or 'summary' (default: full)
    """
    with data_lock:
        if simulation_id not in simulation_data:
            return jsonify({
                'error': 'Simulation not found',
                'simulation_id': simulation_id,
                'available_simulations': list(simulation_data.keys())
            }), 404
        
        store = simulation_data[simulation_id]
        format_type = request.args.get('format', 'full')
        seconds = request.args.get('seconds', type=int)
        
        if format_type == 'summary':
            return jsonify(store.get_summary())
        
        # Get data points
        data_points = store.get_recent_data(seconds)
        
        return jsonify({
            'simulation_id': simulation_id,
            'simulation_name': store.metadata.get('name', 'Unknown'),
            'data_points': len(data_points),
            'time_span': data_points[-1]['timestamp'] - data_points[0]['timestamp'] if data_points else 0,
            'data': [dp['data'] for dp in data_points],
            'timestamps': [dp['timestamp'] for dp in data_points]
        })


@app.route('/api/data/latest/<simulation_id>', methods=['GET'])
def get_latest(simulation_id):
    """Get the most recent data point for a simulation"""
    with data_lock:
        if simulation_id not in simulation_data:
            return jsonify({'error': 'Simulation not found'}), 404
        
        store = simulation_data[simulation_id]
        latest = store.get_latest()
        
        if not latest:
            return jsonify({'error': 'No data available'}), 404
        
        return jsonify({
            'simulation_id': simulation_id,
            'simulation_name': store.metadata.get('name', 'Unknown'),
            'timestamp': latest['timestamp'],
            'age_seconds': time.time() - latest['timestamp'],
            'data': latest['data']
        })


@app.route('/api/data/list', methods=['GET'])
def list_simulations():
    """List all active simulations"""
    with data_lock:
        simulations = []
        current_time = time.time()
        
        for sim_id, store in simulation_data.items():
            age = current_time - store.last_update
            simulations.append({
                'simulation_id': sim_id,
                'simulation_name': store.metadata.get('name', 'Unknown'),
                'data_points': len(store.data_points),
                'last_update': store.last_update,
                'age_seconds': age,
                'active': age < 5  # Consider active if updated in last 5 seconds
            })
        
        return jsonify({
            'simulations': simulations,
            'count': len(simulations)
        })


@app.route('/api/data/clear/<simulation_id>', methods=['POST'])
def clear_data(simulation_id):
    """Clear data for a specific simulation"""
    with data_lock:
        if simulation_id in simulation_data:
            del simulation_data[simulation_id]
            return jsonify({'status': 'success', 'message': 'Data cleared'})
        else:
            return jsonify({'error': 'Simulation not found'}), 404


@app.route('/api/data/clear_all', methods=['POST'])
def clear_all_data():
    """Clear all simulation data"""
    with data_lock:
        count = len(simulation_data)
        simulation_data.clear()
        return jsonify({
            'status': 'success',
            'message': f'Cleared data for {count} simulations'
        })


if __name__ == '__main__':
    host = os.getenv('DATA_SERVER_HOST', 'localhost')
    port = int(os.getenv('DATA_SERVER_PORT', '5002'))
    
    print(f"\n{'='*60}")
    print(f"Gravitation³ Data Collection Server")
    print(f"{'='*60}")
    print(f"Server: http://{host}:{port}")
    print(f"Storing last {MAX_AGE_SECONDS} seconds of data")
    print(f"Max data points per simulation: {MAX_DATA_POINTS}")
    print(f"{'='*60}\n")
    
    app.run(host=host, port=port, debug=False, threaded=True)
