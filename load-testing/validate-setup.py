#!/usr/bin/env python3
"""
Quick validation script for BookedBarber V2 load testing setup
"""

import requests
import json
import os
from datetime import datetime

def validate_api_connectivity():
    """Validate API connectivity and basic endpoints"""
    base_url = os.getenv('BASE_URL', 'http://localhost:8000')
    
    print(f"🔍 Validating API connectivity to {base_url}")
    
    try:
        # Test health endpoint
        health_response = requests.get(f"{base_url}/health", timeout=10)
        print(f"✅ Health check: {health_response.status_code} - {health_response.json()}")
        
        # Test API docs
        docs_response = requests.get(f"{base_url}/docs", timeout=10)
        print(f"✅ API docs: {docs_response.status_code}")
        
        # Test Six Figure Barber health endpoint
        sfb_health_response = requests.get(f"{base_url}/api/v2/six-figure-barber/health", timeout=10)
        if sfb_health_response.status_code == 200:
            sfb_data = sfb_health_response.json()
            print(f"✅ Six Figure Barber API: {sfb_health_response.status_code}")
            print(f"   Features: {len(sfb_data.get('features', []))} available")
            print(f"   Principles: {', '.join(sfb_data.get('principles_supported', []))}")
        else:
            print(f"⚠️ Six Figure Barber API: {sfb_health_response.status_code}")
        
        return True
        
    except Exception as e:
        print(f"❌ API validation failed: {e}")
        return False

def check_dependencies():
    """Check if required dependencies are available"""
    print("🔍 Checking dependencies...")
    
    dependencies = {
        'requests': 'requests'
    }
    
    # Optional dependencies for reporting
    optional_dependencies = {
        'pandas': 'pandas', 
        'matplotlib': 'matplotlib',
        'seaborn': 'seaborn'
    }
    
    missing = []
    for name, module in dependencies.items():
        try:
            __import__(module)
            print(f"✅ {name}: Available")
        except ImportError:
            print(f"❌ {name}: Missing")
            missing.append(name)
    
    # Check optional dependencies
    for name, module in optional_dependencies.items():
        try:
            __import__(module)
            print(f"✅ {name}: Available (optional)")
        except Exception as e:
            print(f"⚠️ {name}: Not available (optional) - {type(e).__name__}")
    
    if missing:
        print(f"\n💡 Install missing dependencies: pip install {' '.join(missing)}")
        return False
    
    return True

def create_test_results_directory():
    """Create results directory for test outputs"""
    results_dir = "results"
    os.makedirs(results_dir, exist_ok=True)
    print(f"✅ Results directory created: {results_dir}")
    
    # Create a sample test result file for validation
    sample_result = {
        "timestamp": datetime.now().isoformat(),
        "test_type": "validation",
        "status": "setup_complete",
        "api_connectivity": True
    }
    
    with open(f"{results_dir}/validation_test.json", "w") as f:
        json.dump(sample_result, f, indent=2)
    
    print(f"✅ Sample result file created")

def main():
    """Main validation function"""
    print("🚀 BookedBarber V2 Load Testing Setup Validation")
    print("=" * 50)
    
    # Check API connectivity
    api_ok = validate_api_connectivity()
    
    print("\n" + "=" * 50)
    
    # Check dependencies
    deps_ok = check_dependencies()
    
    print("\n" + "=" * 50)
    
    # Create results directory
    create_test_results_directory()
    
    print("\n" + "=" * 50)
    
    if api_ok and deps_ok:
        print("✅ Setup validation completed successfully!")
        print("🚀 Ready to run load tests")
        print("\nNext steps:")
        print("  1. Run basic test: ./run-comprehensive-tests.sh --quick")
        print("  2. Run full enterprise test: ./run-comprehensive-tests.sh")
        return 0
    else:
        print("❌ Setup validation failed")
        print("🔧 Please fix the issues above before running load tests")
        return 1

if __name__ == "__main__":
    exit(main())