#!/./venv/bin/python3
"""
Double Pendulum Data Collection Script (Pure Python)
Generates 20,000 training samples by simulating double pendulum dynamics
"""

import os
import sys
import json
import numpy as np
from datetime import datetime

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, PROJECT_ROOT)

# Data directory
DATA_DIR = os.path.join(PROJECT_ROOT, 'ai_data', 'double-pendulum')
os.makedirs(DATA_DIR, exist_ok=True)

print("=" * 70)
print("Double Pendulum AI Training Data Collection (Python)")
print("=" * 70)
print(f"Target: 20,000 samples")
print(f"Data directory: {DATA_DIR}")
print()


class DoublePendulumSimulator:
    """Pure Python implementation of double pendulum physics"""
    
    def __init__(self, l1=1.0, l2=1.0, m1=1.0, m2=1.0, g=9.81, dt=0.01):
        self.l1 = l1
        self.l2 = l2
        self.m1 = m1
        self.m2 = m2
        self.g = g
        self.dt = dt
        self.time = 0
        self.state = np.array([0.0, 0.0, 0.0, 0.0])  # [theta1, omega1, theta2, omega2]
    
    def derivatives(self, state):
        """Calculate derivatives for double pendulum equations of motion"""
        theta1, omega1, theta2, omega2 = state
        
        delta = theta2 - theta1
        den1 = (self.m1 + self.m2) * self.l1 - self.m2 * self.l1 * np.cos(delta) * np.cos(delta)
        den2 = (self.l2 / self.l1) * den1
        
        dtheta1 = omega1
        dtheta2 = omega2
        
        domega1 = (
            self.m2 * self.l1 * omega1 * omega1 * np.sin(delta) * np.cos(delta) +
            self.m2 * self.g * np.sin(theta2) * np.cos(delta) +
            self.m2 * self.l2 * omega2 * omega2 * np.sin(delta) -
            (self.m1 + self.m2) * self.g * np.sin(theta1)
        ) / den1
        
        domega2 = (
            -self.m2 * self.l2 * omega2 * omega2 * np.sin(delta) * np.cos(delta) +
            (self.m1 + self.m2) * self.g * np.sin(theta1) * np.cos(delta) -
            (self.m1 + self.m2) * self.l1 * omega1 * omega1 * np.sin(delta) -
            (self.m1 + self.m2) * self.g * np.sin(theta2)
        ) / den2
        
        return np.array([dtheta1, domega1, dtheta2, domega2])
    
    def step_rk4(self):
        """Runge-Kutta 4th order integration step"""
        k1 = self.derivatives(self.state)
        k2 = self.derivatives(self.state + self.dt / 2 * k1)
        k3 = self.derivatives(self.state + self.dt / 2 * k2)
        k4 = self.derivatives(self.state + self.dt * k3)
        
        self.state = self.state + (self.dt / 6) * (k1 + 2*k2 + 2*k3 + k4)
        self.time += self.dt
    
    def get_positions(self):
        """Get Cartesian positions of both bobs"""
        theta1, _, theta2, _ = self.state
        
        x1 = self.l1 * np.sin(theta1)
        y1 = -self.l1 * np.cos(theta1)
        
        x2 = x1 + self.l2 * np.sin(theta2)
        y2 = y1 - self.l2 * np.cos(theta2)
        
        return x1, y1, x2, y2
    
    def get_energy(self):
        """Calculate total mechanical energy"""
        theta1, omega1, theta2, omega2 = self.state
        x1, y1, x2, y2 = self.get_positions()
        
        # Kinetic energy
        v1x = self.l1 * omega1 * np.cos(theta1)
        v1y = self.l1 * omega1 * np.sin(theta1)
        v2x = v1x + self.l2 * omega2 * np.cos(theta2)
        v2y = v1y + self.l2 * omega2 * np.sin(theta2)
        
        ke = 0.5 * self.m1 * (v1x**2 + v1y**2) + 0.5 * self.m2 * (v2x**2 + v2y**2)
        
        # Potential energy
        pe = self.m1 * self.g * y1 + self.m2 * self.g * y2
        
        return ke + pe


def generate_random_initial_conditions():
    """Generate random initial conditions for double pendulum"""
    theta1 = (np.random.random() - 0.5) * 2 * np.pi
    theta2 = (np.random.random() - 0.5) * 2 * np.pi
    omega1 = (np.random.random() - 0.5) * 10
    omega2 = (np.random.random() - 0.5) * 10
    
    l1 = 0.8 + np.random.random() * 0.4
    l2 = 0.8 + np.random.random() * 0.4
    m1 = 0.5 + np.random.random() * 1.0
    m2 = 0.5 + np.random.random() * 1.0
    
    return {
        'theta1': theta1,
        'omega1': omega1,
        'theta2': theta2,
        'omega2': omega2,
        'l1': l1,
        'l2': l2,
        'm1': m1,
        'm2': m2
    }


def calculate_lyapunov_approximation(trajectory):
    """Calculate Lyapunov exponent approximation (measure of chaos)"""
    if len(trajectory) < 20:
        return 0.0
    
    sum_log = 0.0
    count = 0
    
    for i in range(10, len(trajectory)):
        d1 = abs(trajectory[i]['theta1'] - trajectory[i-10]['theta1'])
        d2 = abs(trajectory[i]['theta2'] - trajectory[i-10]['theta2'])
        distance = np.sqrt(d1**2 + d2**2)
        
        if distance > 1e-10:
            sum_log += np.log(distance)
            count += 1
    
    return sum_log / count if count > 0 else 0.0


def classify_behavior(trajectory, energy_drift):
    """Classify pendulum behavior based on motion characteristics"""
    if len(trajectory) < 10:
        return 'chaotic'
    
    # Calculate motion statistics
    theta1_changes = [abs(trajectory[i]['theta1'] - trajectory[i-1]['theta1']) 
                     for i in range(1, len(trajectory))]
    theta2_changes = [abs(trajectory[i]['theta2'] - trajectory[i-1]['theta2']) 
                     for i in range(1, len(trajectory))]
    
    avg_theta1_change = np.mean(theta1_changes)
    avg_theta2_change = np.mean(theta2_changes)
    total_theta1_change = sum(theta1_changes)
    total_theta2_change = sum(theta2_changes)
    
    # Calculate standard deviations
    std_theta1 = np.std(theta1_changes)
    std_theta2 = np.std(theta2_changes)
    
    # Check for periodic motion (autocorrelation)
    mid = len(trajectory) // 2
    omega1_values = [t['omega1'] for t in trajectory]
    omega2_values = [t['omega2'] for t in trajectory]
    
    correlation = 0.0
    for i in range(mid):
        diff1 = abs(omega1_values[i] - omega1_values[i + mid])
        diff2 = abs(omega2_values[i] - omega2_values[i + mid])
        correlation += (diff1 + diff2)
    correlation /= mid
    
    # Improved classification logic
    # Periodic: low variability, good autocorrelation
    if correlation < 3.0 and std_theta1 < 0.3 and std_theta2 < 0.3:
        return 'periodic'
    # Resonant: moderate variability, some periodicity
    elif correlation < 5.0 and (std_theta1 < 0.5 or std_theta2 < 0.5):
        return 'resonant'
    # Chaotic: high variability, poor autocorrelation  
    else:
        return 'chaotic'


def simulate_trajectory(ic, num_steps=200):
    """Run a single simulation trajectory"""
    sim = DoublePendulumSimulator(
        l1=ic['l1'], l2=ic['l2'], 
        m1=ic['m1'], m2=ic['m2']
    )
    
    sim.state = np.array([ic['theta1'], ic['omega1'], ic['theta2'], ic['omega2']])
    initial_energy = sim.get_energy()
    
    trajectory = []
    for _ in range(num_steps):
        sim.step_rk4()
        
        x1, y1, x2, y2 = sim.get_positions()
        energy = sim.get_energy()
        
        trajectory.append({
            'time': sim.time,
            'theta1': sim.state[0],
            'omega1': sim.state[1],
            'theta2': sim.state[2],
            'omega2': sim.state[3],
            'x1': x1,
            'y1': y1,
            'x2': x2,
            'y2': y2,
            'energy': energy
        })
    
    final_energy = sim.get_energy()
    energy_drift = abs((final_energy - initial_energy) / initial_energy) if initial_energy != 0 else 0
    
    lyapunov = calculate_lyapunov_approximation(trajectory)
    label = classify_behavior(trajectory, energy_drift)
    
    return {
        'trajectory': trajectory,
        'initial_energy': initial_energy,
        'final_energy': final_energy,
        'energy_drift': energy_drift,
        'lyapunov': lyapunov,
        'label': label
    }


def collect_data(num_trajectories=100, samples_per_trajectory=200):
    """Collect training data"""
    print(f"Collecting {num_trajectories} trajectories × {samples_per_trajectory} timesteps")
    print(f"Total samples: {num_trajectories * samples_per_trajectory}\n")
    
    all_samples = []
    label_counts = {'periodic': 0, 'chaotic': 0, 'resonant': 0}
    
    for traj_id in range(num_trajectories):
        # Print progress
        if (traj_id + 1) % 10 == 0 or traj_id == 0:
            print(f"  Progress: {traj_id + 1}/{num_trajectories} ({(traj_id+1)/num_trajectories*100:.1f}%)")
        
        ic = generate_random_initial_conditions()
        result = simulate_trajectory(ic, samples_per_trajectory)
        
        label_counts[result['label']] += 1
        
        # Create samples from each timestep
        for timestep, point in enumerate(result['trajectory']):
            features = [
                point['theta1'], point['omega1'], point['theta2'], point['omega2'],
                ic['l1'], ic['l2'], ic['m1'], ic['m2'],
                point['energy'],
                result['lyapunov'],
                point['x1'], point['y1'], point['x2'], point['y2']
            ]
            
            all_samples.append({
                'trajectory_id': traj_id,
                'timestep': timestep,
                'time': point['time'],
                'features': features,
                'label': result['label'],
                'metadata': {
                    'initialConditions': ic,
                    'energyDrift': result['energy_drift'],
                    'lyapunov': result['lyapunov']
                }
            })
    
    print(f"\n{'='*70}")
    print("Collection Complete!")
    print(f"Total samples: {len(all_samples)}")
    print(f"\nLabel distribution:")
    for label, count in label_counts.items():
        percent = (count / num_trajectories) * 100
        print(f"  {label.capitalize()}: {count} ({percent:.1f}%)")
    print('='*70)
    
    return all_samples, label_counts


def save_dataset(samples):
    """Save dataset to JSON file"""
    timestamp = int(datetime.now().timestamp())
    date_str = datetime.now().strftime('%Y-%m-%d')
    filename = f"dataset_{date_str}_{timestamp}.json"
    filepath = os.path.join(DATA_DIR, filename)
    
    dataset = {
        'metadata': {
            'generated': datetime.now().isoformat(),
            'simulator': 'double-pendulum',
            'version': '1.0',
            'totalSamples': len(samples),
            'totalTrajectories': max(s['trajectory_id'] for s in samples) + 1,
            'samplesPerTrajectory': 200,
            'timestep': 0.01,
            'featureNames': [
                'theta1', 'omega1', 'theta2', 'omega2',
                'l1', 'l2', 'm1', 'm2',
                'energy', 'lyapunov',
                'x1', 'y1', 'x2', 'y2'
            ],
            'labels': ['periodic', 'chaotic', 'resonant']
        },
        'samples': samples
    }
    
    print(f"\nSaving dataset to: {filename}")
    with open(filepath, 'w') as f:
        json.dump(dataset, f, indent=2)
    
    file_size = os.path.getsize(filepath)
    print(f"File size: {file_size / 1024 / 1024:.2f} MB")
    print(f"✓ Dataset saved successfully!")
    
    return filepath


def main():
    """Main execution"""
    try:
        # Collect 100 trajectories × 200 timesteps = 20,000 samples
        samples, label_counts = collect_data(num_trajectories=100, samples_per_trajectory=200)
        
        # Save dataset
        filepath = save_dataset(samples)
        
        print("\n" + "="*70)
        print("Data collection completed successfully!")
        print(f"Dataset: {filepath}")
        print("Ready for training with train_double_pendulum.py")
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
