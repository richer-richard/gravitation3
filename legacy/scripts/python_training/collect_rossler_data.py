#!/./venv/bin/python3
"""
Rössler Attractor Data Collection Script (Pure Python)
Generates 20,000 training samples by simulating Rössler system dynamics
"""

import os
import sys
import json
import numpy as np
from datetime import datetime

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
DATA_DIR = os.path.join(PROJECT_ROOT, 'ai_data', 'rossler-attractor')
os.makedirs(DATA_DIR, exist_ok=True)

print("=" * 70)
print("Rössler Attractor AI Training Data Collection (Python)")
print("=" * 70)
print(f"Target: 20,000 samples")
print(f"Data directory: {DATA_DIR}")
print()


class RosslerSimulator:
    """Pure Python implementation of Rössler attractor"""
    
    def __init__(self, a=0.2, b=0.2, c=5.7, dt=0.01):
        self.a = a
        self.b = b
        self.c = c
        self.dt = dt
        self.time = 0
        self.state = np.array([0.1, 0.0, 0.0])
    
    def derivatives(self, state):
        """Calculate Rössler system derivatives"""
        x, y, z = state
        dx = -y - z
        dy = x + self.a * y
        dz = self.b + z * (x - self.c)
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
    """Generate random initial conditions - stable on Rossler attractor"""
    # Rossler attractor standard parameters (fixed for stability)
    a = 0.2
    b = 0.2
    c = 5.7
    
    # Initial conditions near the attractor (smaller range)
    x = (np.random.random() - 0.5) * 3
    y = (np.random.random() - 0.5) * 3
    z = 0.1 + np.random.random() * 0.5  # z should be slightly positive
    
    return {'x': x, 'y': y, 'z': z, 'a': a, 'b': b, 'c': c}


def simulate_trajectory(ic, num_steps=200):
    """Run a single simulation trajectory"""
    sim = RosslerSimulator(a=ic['a'], b=ic['b'], c=ic['c'])
    sim.state = np.array([ic['x'], ic['y'], ic['z']])
    
    trajectory = []
    for _ in range(num_steps):
        sim.step_rk4()
        x, y, z = sim.state
        trajectory.append({
            'time': sim.time, 'x': x, 'y': y, 'z': z,
            'a': ic['a'], 'b': ic['b'], 'c': ic['c']
        })
    return trajectory


def collect_data(num_trajectories=100, samples_per_trajectory=200):
    """Collect training data"""
    print(f"Collecting {num_trajectories} trajectories × {samples_per_trajectory} timesteps\n")
    
    all_samples = []
    for traj_id in range(num_trajectories):
        if (traj_id + 1) % 10 == 0 or traj_id == 0:
            print(f"  Progress: {traj_id + 1}/{num_trajectories} ({(traj_id+1)/num_trajectories*100:.1f}%)")
        
        ic = generate_random_initial_conditions()
        trajectory = simulate_trajectory(ic, samples_per_trajectory)
        
        for timestep, point in enumerate(trajectory):
            next_point = trajectory[min(timestep + 1, len(trajectory) - 1)]
            all_samples.append({
                'trajectory_id': traj_id,
                'timestep': timestep,
                'features': [point['x'], point['y'], point['z'], 
                           point['a'], point['b'], point['c'], point['time']],
                'labels': [next_point['x'], next_point['y'], next_point['z']],
                'current_state': [point['x'], point['y'], point['z']],
                'next_state': [next_point['x'], next_point['y'], next_point['z']]
            })
    
    print(f"\n{'='*70}\nCollection Complete!\nTotal samples: {len(all_samples)}\n{'='*70}")
    return all_samples


def save_dataset(samples):
    """Save dataset to JSON file"""
    timestamp = int(datetime.now().timestamp())
    date_str = datetime.now().strftime('%Y-%m-%d')
    filename = f"rossler_dataset_{date_str}_{timestamp}.json"
    filepath = os.path.join(DATA_DIR, filename)
    
    dataset = {
        'metadata': {
            'generated': datetime.now().isoformat(),
            'simulator': 'rossler-attractor',
            'totalSamples': len(samples),
            'featureNames': ['x', 'y', 'z', 'a', 'b', 'c', 'time']
        },
        'samples': samples
    }
    
    with open(filepath, 'w') as f:
        json.dump(dataset, f)
    
    file_size = os.path.getsize(filepath)
    print(f"\nSaving: {filename} ({file_size / 1024 / 1024:.2f} MB)\n✓ Dataset saved!")
    return filepath


def main():
    try:
        samples = collect_data(num_trajectories=100, samples_per_trajectory=200)
        filepath = save_dataset(samples)
        print("\n" + "="*70 + f"\nData collection completed!\nDataset: {filepath}\n" + "="*70)
    except KeyboardInterrupt:
        print("\n⚠ Interrupted")
        sys.exit(0)


if __name__ == '__main__':
    main()
