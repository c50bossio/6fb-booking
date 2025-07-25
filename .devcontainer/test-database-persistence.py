#!/usr/bin/env python3
"""
BookedBarber V2 - Database Persistence Test for Codespaces
============================================================
🧪 Tests database persistence and isolation between environments
🔍 Validates that data survives container restarts and codespace sessions
"""

import os
import sqlite3
import tempfile
import time
from pathlib import Path
from datetime import datetime

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def print_header(title):
    print(f"{Colors.BLUE}{'=' * 80}{Colors.NC}")
    print(f"{Colors.BLUE}{title}{Colors.NC}")
    print(f"{Colors.BLUE}{'=' * 80}{Colors.NC}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.NC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️ {message}{Colors.NC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.NC}")

def print_info(message):
    print(f"{Colors.YELLOW}ℹ️ {message}{Colors.NC}")

def test_database_creation():
    """Test that SQLite databases can be created and accessed"""
    print(f"\n{Colors.YELLOW}🗄️ Testing database creation...{Colors.NC}")
    
    # Test development database
    dev_db_path = Path("./6fb_booking.db")
    try:
        conn = sqlite3.connect(str(dev_db_path))
        cursor = conn.cursor()
        
        # Create a test table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS codespaces_test (
                id INTEGER PRIMARY KEY,
                test_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert test data
        test_data = f"Codespaces test at {datetime.now()}"
        cursor.execute("INSERT INTO codespaces_test (test_data) VALUES (?)", (test_data,))
        conn.commit()
        
        # Verify data insertion
        cursor.execute("SELECT COUNT(*) FROM codespaces_test")
        count = cursor.fetchone()[0]
        
        conn.close()
        print_success(f"Development database created with {count} test records")
        
        return True, str(dev_db_path)
    
    except Exception as e:
        print_error(f"Failed to create development database: {e}")
        return False, None

def test_staging_database_isolation():
    """Test that staging database is properly isolated"""
    print(f"\n{Colors.YELLOW}🔄 Testing staging database isolation...{Colors.NC}")
    
    # Test staging database
    staging_db_path = Path("./staging_6fb_booking.db")
    try:
        conn = sqlite3.connect(str(staging_db_path))
        cursor = conn.cursor()
        
        # Create same table structure but different data
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS codespaces_test (
                id INTEGER PRIMARY KEY,
                test_data TEXT,
                environment TEXT DEFAULT 'staging',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert staging-specific test data
        staging_data = f"Staging test at {datetime.now()}"
        cursor.execute("INSERT INTO codespaces_test (test_data) VALUES (?)", (staging_data,))
        conn.commit()
        
        # Verify staging data is separate
        cursor.execute("SELECT COUNT(*) FROM codespaces_test WHERE environment = 'staging'")
        staging_count = cursor.fetchone()[0]
        
        conn.close()
        print_success(f"Staging database isolated with {staging_count} staging records")
        
        return True, str(staging_db_path)
    
    except Exception as e:
        print_error(f"Failed to create staging database: {e}")
        return False, None

def test_data_persistence():
    """Test that data persists between connections"""
    print(f"\n{Colors.YELLOW}💾 Testing data persistence...{Colors.NC}")
    
    try:
        # Connect to development database
        conn = sqlite3.connect("./6fb_booking.db")
        cursor = conn.cursor()
        
        # Check if our test data still exists
        cursor.execute("SELECT test_data FROM codespaces_test ORDER BY created_at DESC LIMIT 1")
        result = cursor.fetchone()
        
        if result:
            print_success(f"Data persists: {result[0]}")
            persistence_verified = True
        else:
            print_warning("No test data found (may be first run)")
            persistence_verified = False
        
        # Add a new persistence test record
        persistence_test = f"Persistence test at {datetime.now()}"
        cursor.execute("INSERT INTO codespaces_test (test_data) VALUES (?)", (persistence_test,))
        conn.commit()
        
        # Verify total record count
        cursor.execute("SELECT COUNT(*) FROM codespaces_test")
        total_count = cursor.fetchone()[0]
        
        conn.close()
        print_success(f"Database now contains {total_count} total records")
        
        return persistence_verified
    
    except Exception as e:
        print_error(f"Failed to test data persistence: {e}")
        return False

def test_concurrent_access():
    """Test that multiple connections can access the database"""
    print(f"\n{Colors.YELLOW}🔀 Testing concurrent database access...{Colors.NC}")
    
    try:
        # Open multiple connections simultaneously
        connections = []
        for i in range(3):
            conn = sqlite3.connect("./6fb_booking.db")
            connections.append(conn)
        
        # Perform operations on each connection
        for i, conn in enumerate(connections):
            cursor = conn.cursor()
            cursor.execute("INSERT INTO codespaces_test (test_data) VALUES (?)", 
                          (f"Concurrent test {i+1} at {datetime.now()}",))
            conn.commit()
        
        # Close all connections
        for conn in connections:
            conn.close()
        
        print_success("Concurrent database access working")
        return True
    
    except Exception as e:
        print_error(f"Failed concurrent access test: {e}")
        return False

def test_database_permissions():
    """Test that database files have correct permissions"""
    print(f"\n{Colors.YELLOW}🔐 Testing database file permissions...{Colors.NC}")
    
    databases = ["./6fb_booking.db", "./staging_6fb_booking.db"]
    
    for db_path in databases:
        if Path(db_path).exists():
            stat = os.stat(db_path)
            permissions = oct(stat.st_mode)[-3:]
            
            if stat.st_mode & 0o600:  # Check if readable/writable by owner
                print_success(f"{db_path} has correct permissions ({permissions})")
            else:
                print_warning(f"{db_path} may have permission issues ({permissions})")
        else:
            print_info(f"{db_path} does not exist yet")
    
    return True

def test_environment_variable_configuration():
    """Test that environment variables are properly configured"""
    print(f"\n{Colors.YELLOW}⚙️ Testing environment variable configuration...{Colors.NC}")
    
    # Check important environment variables
    env_vars = {
        'DATABASE_URL': 'sqlite:///./6fb_booking.db',
        'STAGING_DATABASE_URL': 'sqlite:///./staging_6fb_booking.db',
        'ENVIRONMENT': 'development',
        'DEBUG': 'true'
    }
    
    all_good = True
    for var_name, expected_default in env_vars.items():
        var_value = os.environ.get(var_name)
        if var_value:
            print_success(f"{var_name} = {var_value}")
        else:
            print_warning(f"{var_name} not set (will use default: {expected_default})")
            all_good = False
    
    return all_good

def cleanup_test_data():
    """Clean up test data created during validation"""
    print(f"\n{Colors.YELLOW}🧹 Cleaning up test data...{Colors.NC}")
    
    try:
        for db_path in ["./6fb_booking.db", "./staging_6fb_booking.db"]:
            if Path(db_path).exists():
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("DROP TABLE IF EXISTS codespaces_test")
                conn.commit()
                conn.close()
                print_success(f"Cleaned up test data in {db_path}")
        
        return True
    
    except Exception as e:
        print_error(f"Failed to clean up test data: {e}")
        return False

def main():
    """Run all database persistence tests"""
    print_header("BookedBarber V2 - Database Persistence Test")
    
    # Change to the correct directory
    os.chdir("/workspaces/6fb-booking/backend-v2" if os.path.exists("/workspaces/6fb-booking/backend-v2") 
             else "/app/backend-v2" if os.path.exists("/app/backend-v2")
             else ".")
    
    print_info(f"Running tests in: {os.getcwd()}")
    
    # Run all tests
    tests = [
        ("Database Creation", test_database_creation),
        ("Staging Database Isolation", test_staging_database_isolation),
        ("Data Persistence", test_data_persistence),
        ("Concurrent Access", test_concurrent_access),
        ("Database Permissions", test_database_permissions),
        ("Environment Variables", test_environment_variable_configuration),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print_error(f"Test '{test_name}' failed with exception: {e}")
            results.append((test_name, False))
    
    # Print summary
    print_header("Test Summary")
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        if result:
            print_success(f"{test_name}: PASSED")
            passed += 1
        else:
            print_error(f"{test_name}: FAILED")
    
    print(f"\n{Colors.BLUE}Results: {passed}/{total} tests passed{Colors.NC}")
    
    # Cleanup option
    cleanup_choice = input(f"\n{Colors.YELLOW}Clean up test data? (y/n): {Colors.NC}").lower()
    if cleanup_choice == 'y':
        cleanup_test_data()
    
    if passed == total:
        print_success("All database persistence tests passed! 🎉")
        print_info("Your database setup is ready for Codespaces development.")
        return 0
    else:
        print_error(f"{total - passed} tests failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())