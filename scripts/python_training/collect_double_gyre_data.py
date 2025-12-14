#!/./venv/bin/python3
"""
Double Gyre Flow Data Collection Script (Pure Python)
Generates 20,000 training samples by simulating oceanic circulation patterns
"""

import os
import sys
import json
import numpy as np
from datetime import datetime

# Data directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
DATA_DIR = os.path.join(PROJECT_ROOT, 'ai_data', 'double-gyre')
os.makedirs(DATA_DIR, exist_ok=True)

print("=" * 70)
print("Double Gyre Flow AI Training Data Collection (Python)")
print("=" * 70)
print(f"Target: 3,000 samples (100 epochs × ~30 seconds per epoch)")
print(f"Data directory: {DATA_DIR}")
print()


class DoubleGyreSimulator:
    """Pure Python implementation of Double Gyre flow"""
    
    def __init__(self, A=0.1, epsilon=0.25, omega=0.5, dt=0.02):
        self.A = A
        self.epsilon = epsilon
        self.omega = omega
        self.dt = dt
        
        # Domain: [0, 2] x [0, 1]
        self.domainWidth = 2.0
        self.domainHeight = 1.0
        
        self.time = 0
        self.state = np.array([0.5, 0.5])  # [x, y]
    
    def get_time_functions(self, t):
        """Get time-dependent functions a(t) and b(t)"""
        sin_omega_t = np.sin(self.omega * t)
        a = self.epsilon * sin_omega_t
        b = 1.0 - 2.0 * self.epsilon * sin_omega_t
        return a, b
    
    def calculate_f(self, x, t):
        """Calculate f(x,t) and its derivative df/dx"""
        a, b = self.get_time_functions(t)
        f = a * x * x + b * x
        dfdx = 2.0 * a * x + b
        return f, dfdx
    
    def get_velocity(self, x, y, t):
        """Calculate velocity field at point (x, y, t)"""
        f, dfdx = self.calculate_f(x, t)
        
        pi_f = np.pi * f
        pi_y = np.pi * y
        
        u = -np.pi * self.A * np.sin(pi_f) * np.cos(pi_y)
        v = np.pi * self.A * np.cos(pi_f) * np.sin(pi_y) * dfdx
        
        return u, v
    
    def reset(self, x, y):
        """Reset particle to new position"""
        self.state = np.array([x, y])
        self.time = 0
    
    def step_euler(self):
        """Single Euler integration step"""
        x, y = self.state
        u, v = self.get_velocity(x, y, self.time)
        
        new_x = x + self.dt * u
        new_y = y + self.dt * v
        
        # Boundary wrapping
        if new_x < 0:
            new_x += self.domainWidth
        elif new_x > self.domainWidth:
            new_x -= self.domainWidth
        
        # Boundary reflection for y
        if new_y < 0:
            new_y = -new_y
        elif new_y > self.domainHeight:
            new_y = 2.0 * self.domainHeight - new_y
        
        self.state = np.array([new_x, new_y])
        self.time += self.dt


def generate_random_initial_conditions():
    """Generate random initial conditions"""
    x = np.random.random() * 2.0
    y = np.random.random() * 1.0
    
    # Vary parameters slightly
    A = 0.1 + (np.random.random() - 0.5) * 0.05
    epsilon = 0.25 + (np.random.random() - 0.5) * 0.1
    omega = 0.5 + (np.random.random() - 0.5) * 0.3
    
    return {
        'x': x, 'y': y,
        'A': A, 'epsilon': epsilon, 'omega': omega
    }


def simulate_trajectory(ic, num_steps=200):
    """Run a single simulation trajectory"""
    sim = DoubleGyreSimulator(A=ic['A'], epsilon=ic['epsilon'], omega=ic['omega'])
    sim.reset(ic['x'], ic['y'])
    
    trajectory = []
    for _ in range(num_steps):
        x, y = sim.state
        
        trajectory.append({
            'time': sim.time,
            'x': x, 'y': y,
            'A': ic['A'],
            'epsilon': ic['epsilon'],
            'omega': ic['omega']
        })
        
        sim.step_euler()
    
    return trajectory


def collect_data(num_trajectories=1000, samples_per_trajectory=200):
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
                point['x'], point['y'],
                point['A'], point['epsilon'], point['omega'],
                point['time']
            ]
            
            # Next state (for prediction)
            next_point = trajectory[min(timestep + 1, len(trajectory) - 1)]
            labels = [next_point['x'], next_point['y']]
            
            all_samples.append({
                'trajectory_id': traj_id,
                'timestep': timestep,
                'features': features,
                'labels': labels,
                'current_state': [point['x'], point['y']],
                'next_state': [next_point['x'], next_point['y']]
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
    filename = f"double_gyre_dataset_{date_str}_{timestamp}.json"
    filepath = os.path.join(DATA_DIR, filename)
    
    dataset = {
        'metadata': {
            'generated': datetime.now().isoformat(),
            'simulator': 'double-gyre',
            'version': '1.0',
            'totalSamples': len(samples),
            'featureNames': ['x', 'y', 'A', 'epsilon', 'omega', 'time'],
            'labelNames': ['next_x', 'next_y']
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
        # Generate dataset: 100 trajectories × 200 steps = 20,000 samples (~6-8 MB)
        # Targets: 5-10MB data, 30 seconds per epoch, 100 epochs total
        samples = collect_data(num_trajectories=100, samples_per_trajectory=200)
        filepath = save_dataset(samples)
        
        print("\n" + "="*70)
        print("Data collection completed successfully!")
        print(f"Dataset: {filepath}")
        print("Ready for training with train_double_gyre.py")
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
