#!/usr/bin/env python3
"""
Quick script to seed POS test data
Run this from the backend directory: python seed_pos_test_data.py
"""

import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scripts.seed_pos_data import POSDataSeeder

if __name__ == "__main__":
    print("Starting POS test data seeding...")
    print("-" * 60)

    try:
        seeder = POSDataSeeder()
        seeder.seed_all()
        print("\n✅ POS test data seeded successfully!")
    except Exception as e:
        print(f"\n❌ Error seeding POS data: {e}")
        import traceback

        traceback.print_exc()
