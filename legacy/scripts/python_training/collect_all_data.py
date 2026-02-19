#!/./venv/bin/python3
"""
Master Data Collection Script
Runs all data collection scripts to generate training data for all simulations
"""

import os
import sys
import subprocess
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Data collection scripts (only for simulations that don't have data yet)
COLLECTION_SCRIPTS = [
    'collect_lorenz_data.py',
    'collect_rossler_data.py',
]

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80 + "\n")

def run_collection_script(script_name):
    """Run a single data collection script"""
    script_path = os.path.join(SCRIPT_DIR, script_name)
    
    if not os.path.exists(script_path):
        print(f"⚠️  Warning: Script not found: {script_name}")
        return False
    
    print_header(f"Running {script_name}")
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            check=True,
            capture_output=False
        )
        print(f"✅ {script_name} completed successfully!\n")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {script_name} failed with error code {e.returncode}\n")
        return False
    except Exception as e:
        print(f"❌ {script_name} failed: {str(e)}\n")
        return False

def main():
    """Main execution"""
    print_header("Gravitation³ Data Collection Suite")
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Collecting data for {len(COLLECTION_SCRIPTS)} simulations...")
    
    successful = 0
    failed = 0
    
    for script_name in COLLECTION_SCRIPTS:
        if run_collection_script(script_name):
            successful += 1
        else:
            failed += 1
    
    # Print summary
    print_header("Data Collection Summary")
    print(f"Total Scripts: {len(COLLECTION_SCRIPTS)}")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    print(f"\nEnd Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if failed == 0:
        print("\n🎉 All data collected successfully!")
        print("Ready to train models with train_all_simulations.py")
    
    print("\n" + "=" * 80)
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
