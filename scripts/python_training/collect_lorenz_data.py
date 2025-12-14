#!/./venv/bin/python3
"""
Lorenz Attractor Data Collection Script (Pure Python)
Generates 20,000 training samples by simulating Lorenz system dynamics
"""

import os
import sys
import json
import numpy as np
from datetime import datetime

# Data directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
DATA_DIR = os.path.join(PROJECT_ROOT, 'ai_data', 'lorenz-attractor')
os.makedirs(DATA_DIR, exist_ok=True)

print("=" * 70)
print("Lorenz Attractor AI Training Data Collection (Python)")
print("=" * 70)
print(f"Target: 20,000 samples")
print(f"Data directory: {DATA_DIR}")
print()


class LorenzSimulator:
    """Pure Python implementation of Lorenz attractor"""
    
    def __init__(self, sigma=10.0, rho=28.0, beta=8.0/3.0, dt=0.01):
        self.sigma = sigma
        self.rho = rho
        self.beta = beta
        self.dt = dt
        self.time = 0
        self.state = np.array([0.1, 0.0, 0.0])  # [x, y, z]
    
    def derivatives(self, state):
        """Calculate Lorenz system derivatives"""
        x, y, z = state
        
        dx = self.sigma * (y - x)
        dy = x * (self.rho - z) - y
        dz = x * y - self.beta * z
        
        return np.array([dx, dy, dz])
    
    def step_rk4(self):
        """Runge-Kutta 4th order integration"""
        k1 = self.derivatives(self.state)
        k2 = self.derivatives(self.state + self.dt / 2 * k1)
        k3 = self.derivatives(self.state + self.dt / 2 * k2)
        k4 = self.derivatives(self.state + self.dt * k3)
        
        self.state = self.state + (self.dt / 6) * (k1 + 2*k2 + 2*k3 + k4)
        self.time += self.dt


def generate_random_initial_conditions():
    """Generate random initial conditions"""
    x = (np.random.random() - 0.5) * 20
    y = (np.random.random() - 0.5) * 30
    z = (np.random.random() - 0.5) * 40 + 20
    
    # Vary parameters slightly
    sigma = 10.0 + (np.random.random() - 0.5) * 2
    rho = 28.0 + (np.random.random() - 0.5) * 10
    beta = 8.0/3.0 + (np.random.random() - 0.5) * 0.5
    
    return {
        'x': x, 'y': y, 'z': z,
        'sigma': sigma, 'rho': rho, 'beta': beta
    }


def simulate_trajectory(ic, num_steps=200):
    """Run a single simulation trajectory"""
    sim = LorenzSimulator(sigma=ic['sigma'], rho=ic['rho'], beta=ic['beta'])
    sim.state = np.array([ic['x'], ic['y'], ic['z']])
    
    trajectory = []
    for _ in range(num_steps):
        sim.step_rk4()
        x, y, z = sim.state
        
        trajectory.append({
            'time': sim.time,
            'x': x, 'y': y, 'z': z,
            'sigma': ic['sigma'],
            'rho': ic['rho'],
            'beta': ic['beta']
        })
    
    return trajectory


def collect_data(num_trajectories=100, samples_per_trajectory=200):
    """Collect training data"""
    print(f"Collecting {num_trajectories} trajectories × {samples_per_trajectory} timesteps")
    print(f"Total samples: {num_trajectories * samples_per_trajectory}\n")
    
    all_samples = []
    
    for traj_id in range(num_trajectories):
        if (traj_id + 1) % 10 == 0 or traj_id == 0:
            print(f"  Progress: {traj_id + 1}/{num_trajectories} ({(traj_id+1)/num_trajectories*100:.1f}%)")
        
        ic = generate_random_initial_conditions()
        trajectory = simulate_trajectory(ic, samples_per_trajectory)
        
        for timestep, point in enumerate(trajectory):
            # Current state
            features = [
                point['x'], point['y'], point['z'],
                point['sigma'], point['rho'], point['beta'],
                point['time']
            ]
            
            # Next state (for prediction)
            next_point = trajectory[min(timestep + 1, len(trajectory) - 1)]
            labels = [next_point['x'], next_point['y'], next_point['z']]
            
            all_samples.append({
                'trajectory_id': traj_id,
                'timestep': timestep,
                'features': features,
                'labels': labels,
                'current_state': [point['x'], point['y'], point['z']],
                'next_state': [next_point['x'], next_point['y'], next_point['z']]
            })
    
    print(f"\n{'='*70}")
    print("Collection Complete!")
    print(f"Total samples: {len(all_samples)}")
    print('='*70)
    
    return all_samples


def save_dataset(samples):
    """Save dataset to JSON file"""
    timestamp = int(datetime.now().timestamp())
    date_str = datetime.now().strftime('%Y-%m-%d')
    filename = f"lorenz_dataset_{date_str}_{timestamp}.json"
    filepath = os.path.join(DATA_DIR, filename)
    
    dataset = {
        'metadata': {
            'generated': datetime.now().isoformat(),
            'simulator': 'lorenz-attractor',
            'version': '1.0',
            'totalSamples': len(samples),
            'featureNames': ['x', 'y', 'z', 'sigma', 'rho', 'beta', 'time'],
            'labelNames': ['next_x', 'next_y', 'next_z']
        },
        'samples': samples
    }
    
    print(f"\nSaving dataset to: {filename}")
    with open(filepath, 'w') as f:
        json.dump(dataset, f)
    
    file_size = os.path.getsize(filepath)
    print(f"File size: {file_size / 1024 / 1024:.2f} MB")
    print(f"✓ Dataset saved successfully!")
    
    return filepath


def main():
    """Main execution"""
    try:
        samples = collect_data(num_trajectories=100, samples_per_trajectory=200)
        filepath = save_dataset(samples)
        
        print("\n" + "="*70)
        print("Data collection completed successfully!")
        print(f"Dataset: {filepath}")
        print("Ready for training with train_lorenz.py")
        print("="*70)
        
    except KeyboardInterrupt:
        print("\n\n⚠ Collection interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
