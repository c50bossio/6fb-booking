#!/usr/bin/env python3
"""
Complete database setup script
Initializes database and loads seed data
"""
import subprocess
import sys
import os

def run_script(script_name):
    """Run a Python script and check for errors"""
    print(f"\n{'='*50}")
    print(f"Running {script_name}...")
    print('='*50)
    
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    result = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error running {script_name}:")
        print(result.stderr)
        return False
    
    print(result.stdout)
    return True

def main():
    print("6FB Booking Platform - Database Setup")
    print("=====================================")
    
    # Initialize database
    if not run_script("init_db.py"):
        print("\nDatabase initialization failed!")
        sys.exit(1)
    
    # Seed data
    if not run_script("seed_data.py"):
        print("\nData seeding failed!")
        sys.exit(1)
    
    print("\n" + "="*50)
    print("DATABASE SETUP COMPLETED SUCCESSFULLY!")
    print("="*50)
    print("\nYou can now start the backend server with:")
    print("  cd backend")
    print("  python main.py")
    print("\nAnd the frontend with:")
    print("  cd frontend")
    print("  npm run dev")

if __name__ == "__main__":
    main()