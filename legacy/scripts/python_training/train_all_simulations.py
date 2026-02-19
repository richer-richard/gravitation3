"""
Master Training Script for All Gravitation³ Simulations
Trains AI models for all simulations in the project
"""

import os
import sys
import subprocess
from datetime import datetime

# Define all simulation training scripts
TRAINING_SCRIPTS = {
    'double_pendulum': 'train_double_pendulum.py',
    'three_body': 'train_three_body.py',
    'lorenz_attractor': 'train_lorenz.py',
    'rossler_attractor': 'train_rossler.py',
    'double_gyre': 'train_double_gyre.py',
    'lid_cavity': 'train_lid_cavity.py',
    'turbulent_jet': 'train_turbulent_jet.py',
    'malkus_waterwheel': 'train_malkus_waterwheel.py',
    'hopalong_attractor': 'train_hopalong.py'
}

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80 + "\n")

def run_training_script(name, script_path):
    """Run a single training script"""
    print_header(f"Training {name.replace('_', ' ').title()} Model")
    
    if not os.path.exists(script_path):
        print(f"⚠️  Warning: Script not found: {script_path}")
        return False
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            check=True,
            capture_output=False
        )
        print(f"✅ {name} training completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {name} training failed with error code {e.returncode}")
        return False
    except Exception as e:
        print(f"❌ {name} training failed: {str(e)}")
        return False

def main():
    """Main training orchestrator"""
    print_header("Gravitation³ AI Training Suite")
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Get script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Track results
    results = {}
    successful = 0
    failed = 0
    skipped = 0
    
    # Run each training script
    for name, script_name in TRAINING_SCRIPTS.items():
        script_path = os.path.join(script_dir, script_name)
        
        if not os.path.exists(script_path):
            print(f"\n⏭️  Skipping {name}: Training script not yet created")
            results[name] = 'skipped'
            skipped += 1
            continue
        
        success = run_training_script(name, script_path)
        if success:
            results[name] = 'success'
            successful += 1
        else:
            results[name] = 'failed'
            failed += 1
    
    # Print summary
    print_header("Training Summary")
    print(f"Total Simulations: {len(TRAINING_SCRIPTS)}")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"⏭️  Skipped: {skipped}")
    print(f"\nEnd Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Print detailed results
    print("\nDetailed Results:")
    print("-" * 80)
    for name, status in results.items():
        emoji = {'success': '✅', 'failed': '❌', 'skipped': '⏭️ '}[status]
        print(f"{emoji} {name.replace('_', ' ').title()}: {status.upper()}")
    
    print("\n" + "=" * 80)
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
