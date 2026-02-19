#!/./venv/bin/python3
"""
Malkus Waterwheel Data Collection Script (Pure Python)
Generates training samples by simulating the chaotic waterwheel system
"""

import os
import sys
import json
import numpy as np
from datetime import datetime

# Data directory
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
DATA_DIR = os.path.join(PROJECT_ROOT, 'ai_data', 'malkus-waterwheel')
os.makedirs(DATA_DIR, exist_ok=True)

print("=" * 70)
print("Malkus Waterwheel AI Training Data Collection (Python)")
print("=" * 70)
print(f"Target: 20,000 samples (100 epochs × ~200 samples per epoch)")
print(f"Data directory: {DATA_DIR}")
print()


class MalkusWheelSimulator:
    """Pure Python implementation of Malkus Waterwheel dynamics"""
    
    def __init__(self, num_buckets=20, Q=2.5, K=0.1, nu=1.0, dt=0.01):
        self.num_buckets = num_buckets
        self.Q = Q      # Inflow rate
        self.K = K      # Leak rate
        self.nu = nu    # Damping
        self.dt = dt
        self.radius = 1.0
        
        self.omega = 0.1
        self.theta = 0.0
        self.bucket_masses = np.zeros(num_buckets)
        self.time = 0
    
    def get_bucket_angle(self, i):
        """Get angle of bucket i"""
        return self.theta + (2 * np.pi * i) / self.num_buckets
    
    def calculate_torque(self):
        """Calculate total gravitational torque"""
        total_torque = 0.0
        for i in range(self.num_buckets):
            angle = self.get_bucket_angle(i)
            total_torque += self.bucket_masses[i] * np.sin(angle)
        return total_torque
    
    def derivatives(self):
        """Calculate state derivatives"""
        torque = self.calculate_torque()
        domega = torque - self.nu * self.omega
        dtheta = self.omega
        
        dmasses = np.zeros(self.num_buckets)
        for i in range(self.num_buckets):
            angle = self.get_bucket_angle(i)
            outflow = self.K * self.bucket_masses[i]
            
            # Water inflow near top of wheel
            inflow = 0.0
            threshold = np.abs(np.cos(2 * np.pi / self.num_buckets))
            
            if np.cos(angle) > threshold:
                x = np.arctan2(np.tan(angle), 1.0)
                f = self.Q / 2.0
                inflow = f * (np.cos(self.num_buckets * x / 2.0) + 1)
            
            dmasses[i] = inflow - outflow
        
        return domega, dtheta, dmasses
    
    def rk4_step(self):
        """Single RK4 integration step"""
        # k1
        domega1, dtheta1, dmasses1 = self.derivatives()
        
        # k2
        omega_temp = self.omega + 0.5 * self.dt * domega1
        theta_temp = self.theta + 0.5 * self.dt * dtheta1
        masses_temp = self.bucket_masses + 0.5 * self.dt * dmasses1
        
        self.omega = omega_temp
        self.theta = theta_temp
        self.bucket_masses = masses_temp
        domega2, dtheta2, dmasses2 = self.derivatives()
        
        # k3
        omega_temp = self.omega + 0.5 * self.dt * domega2
        theta_temp = self.theta + 0.5 * self.dt * dtheta2
        masses_temp = self.bucket_masses + 0.5 * self.dt * dmasses2
        
        self.omega = omega_temp
        self.theta = theta_temp
        self.bucket_masses = masses_temp
        domega3, dtheta3, dmasses3 = self.derivatives()
        
        # k4
        omega_temp = self.omega + self.dt * domega3
        theta_temp = self.theta + self.dt * dtheta3
        masses_temp = self.bucket_masses + self.dt * dmasses3
        
        self.omega = omega_temp
        self.theta = theta_temp
        self.bucket_masses = masses_temp
        domega4, dtheta4, dmasses4 = self.derivatives()
        
        # Combine
        self.omega = self.omega + (self.dt / 6.0) * (domega1 + 2*domega2 + 2*domega3 + domega4 - 3*self.derivatives()[0])
        self.theta = self.theta + (self.dt / 6.0) * (dtheta1 + 2*dtheta2 + 2*dtheta3 + dtheta4 - 3*self.derivatives()[1])
        self.bucket_masses = np.maximum(0, self.bucket_masses)
        
    def step_euler(self):
        """Single Euler integration step"""
        domega, dtheta, dmasses = self.derivatives()
        self.omega += self.dt * domega
        self.theta += self.dt * dtheta
        self.bucket_masses = np.maximum(0, self.bucket_masses + self.dt * dmasses)
        self.time += self.dt
    
    def reset(self, omega=0.1, theta=0.0):
        """Reset to initial conditions"""
        self.omega = omega
        self.theta = theta
        self.bucket_masses = np.zeros(self.num_buckets)
        self.time = 0


def generate_random_initial_conditions():
    """Generate random initial conditions"""
    omega = np.random.uniform(0.01, 0.3)
    theta = np.random.uniform(0, 2 * np.pi)
    
    Q = np.random.uniform(1.5, 3.5)
    K = np.random.uniform(0.05, 0.2)
    nu = np.random.uniform(0.5, 1.5)
    
    return {
        'omega': omega,
        'theta': theta,
        'Q': Q,
        'K': K,
        'nu': nu
    }


def simulate_trajectory(ic, num_steps=200):
    """Run a single simulation trajectory"""
    sim = MalkusWheelSimulator(Q=ic['Q'], K=ic['K'], nu=ic['nu'])
    sim.reset(ic['omega'], ic['theta'])
    
    trajectory = []
    for _ in range(num_steps):
        trajectory.append({
            'time': sim.time,
            'omega': float(sim.omega),
            'theta': float(sim.theta),
            'Q': ic['Q'],
            'K': ic['K'],
            'nu': ic['nu'],
            'bucket_mass_sum': float(np.sum(sim.bucket_masses))
        })
        
        sim.step_euler()
    
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
            if timestep < len(trajectory) - 1:
                next_point = trajectory[timestep + 1]
                
                # Current state
                features = [
                    point['omega'],
                    point['theta'],
                    point['bucket_mass_sum'],
                    point['Q'],
                    point['K'],
                    point['nu'],
                    point['time']
                ]
                
                # Next state (for prediction)
                labels = [next_point['omega'], next_point['theta']]
                
                all_samples.append({
                    'trajectory_id': traj_id,
                    'timestep': timestep,
                    'features': features,
                    'labels': labels,
                    'current_state': [point['omega'], point['theta'], point['bucket_mass_sum']],
                    'next_state': [next_point['omega'], next_point['theta'], next_point['bucket_mass_sum']]
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
    filename = f"malkus_dataset_{date_str}_{timestamp}.json"
    filepath = os.path.join(DATA_DIR, filename)
    
    dataset = {
        'metadata': {
            'generated': datetime.now().isoformat(),
            'simulator': 'malkus-waterwheel',
            'version': '1.0',
            'totalSamples': len(samples),
            'featureNames': ['omega', 'theta', 'bucket_mass_sum', 'Q', 'K', 'nu', 'time'],
            'labelNames': ['next_omega', 'next_theta']
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
        print("Ready for training with train_malkus.py")
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
