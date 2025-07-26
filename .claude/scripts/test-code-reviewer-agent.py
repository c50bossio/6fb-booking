#!/usr/bin/env python3
"""
Test Script for BookedBarber V2 Code Reviewer Agent

This script tests the code reviewer agent with various scenarios to ensure
it properly detects issues and generates appropriate reports.

Author: Claude Code
Version: 1.0.0
Last Updated: 2025-07-26
"""

import json
import tempfile
import os
import sys
from pathlib import Path
import subprocess

def create_test_python_file_with_issues():
    """Create a test Python file with various code quality issues"""
    # Create in project directory for testing
    test_dir = Path("/Users/bossio/6fb-booking/backend-v2")
    test_file = test_dir / "test_code_review_python.py"
    
    test_content = '''
import os
import requests
import stripe

# Hardcoded secret (should be flagged)
STRIPE_SECRET_KEY = "sk_test_123456789abcdef"
API_KEY = "hardcoded_api_key_123"

# Missing type hints and docstrings
def process_payment(amount, currency):
    # SQL injection vulnerability
    query = "SELECT * FROM payments WHERE amount = " + str(amount)
    
    # Inefficient string concatenation
    message = ""
    for i in range(100):
        message += f"Processing payment {i}"
    
    # Missing error handling
    response = requests.post("https://api.stripe.com/charges", 
                           data={"amount": amount, "currency": currency})
    
    # Unsafe eval usage
    result = eval(response.text)
    
    return result

class BookingService:
    def __init__(self):
        # No type annotations
        self.bookings = []
        
    def create_booking(self, client_data, barber_id, appointment_time):
        # Missing Six Figure Barber methodology alignment
        # No revenue optimization logic
        # No commission calculation
        # No client value enhancement features
        
        booking = {
            "client": client_data,
            "barber": barber_id,
            "time": appointment_time
        }
        
        # Inefficient database operation (N+1 query pattern)
        all_bookings = self.get_all_bookings()
        for booking in all_bookings:
            print(f"Checking conflict with {booking['id']}")
        
        self.bookings.append(booking)
        return booking
    
    def get_all_bookings(self):
        # This would cause N+1 queries in real implementation
        return Booking.query.all()

# High complexity function (should be flagged)
def complex_commission_calculation(booking_data, barber_tier, client_history, 
                                 service_type, location_premium, time_slot, 
                                 seasonal_factor, loyalty_discount):
    result = 0
    
    if barber_tier == "premium":
        if client_history["visits"] > 10:
            if service_type == "haircut":
                if location_premium:
                    if time_slot == "peak":
                        if seasonal_factor > 1.2:
                            if loyalty_discount > 0:
                                result = booking_data["amount"] * 0.85
                            else:
                                result = booking_data["amount"] * 0.80
                        else:
                            result = booking_data["amount"] * 0.75
                    else:
                        result = booking_data["amount"] * 0.70
                else:
                    result = booking_data["amount"] * 0.65
            else:
                result = booking_data["amount"] * 0.60
        else:
            result = booking_data["amount"] * 0.50
    else:
        result = booking_data["amount"] * 0.40
    
    return result
'''
    
    with open(test_file, 'w') as f:
        f.write(test_content)
    
    return str(test_file)

def create_test_typescript_file_with_issues():
    """Create a test TypeScript file with various code quality issues"""
    # Create in project directory for testing
    test_dir = Path("/Users/bossio/6fb-booking/backend-v2/frontend-v2")
    test_file = test_dir / "test_code_review_typescript.tsx"
    
    test_content = '''
import React, { useState, useEffect } from 'react';
import lodash from 'lodash'; // Inefficient import
import { User } from './types';

// Missing type annotations (using any)
const BookingComponent = ({ userDetails }: { userDetails: any }) => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Inline function in JSX (performance issue)
    const handleBookingClick = (booking) => {
        // Missing type annotations
        console.log('Booking clicked:', booking);
    };
    
    // Expensive operation without memoization
    const filteredBookings = bookings.filter(booking => 
        booking.status === 'active'
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Missing error handling for async operations
    useEffect(() => {
        fetch('/api/v1/bookings') // Using deprecated V1 API
            .then(response => response.json())
            .then(data => setBookings(data));
    }, []);
    
    // Potential XSS vulnerability
    const renderDescription = (description: string) => {
        return <div dangerouslySetInnerHTML={{ __html: description }} />;
    };
    
    // Storing sensitive data in localStorage
    const saveUserToken = (token: string) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_password', userDetails.password);
    };
    
    return (
        <div>
            <h1>Bookings Dashboard</h1>
            
            {/* Missing alt attribute */}
            <img src="/logo.png" />
            
            {/* Missing key prop in map */}
            {filteredBookings.map(booking => (
                <div onClick={() => handleBookingClick(booking)}>
                    {booking.clientName} - {booking.serviceName}
                </div>
            ))}
            
            {/* Missing label for form input */}
            <input type="text" placeholder="Search bookings..." />
            
            <button onClick={() => {
                // Inline complex logic (should be extracted)
                const result = lodash.filter(bookings, b => 
                    b.status === 'pending' && 
                    new Date(b.date) > new Date() &&
                    b.barber.tier === 'premium'
                );
                setBookings(result);
            }}>
                Filter Premium Bookings
            </button>
        </div>
    );
};

// Function missing type annotations
function calculateRevenue(bookings, commissionRate) {
    // Missing Six Figure Barber methodology
    // No revenue optimization logic
    // No client value calculation
    
    let total = 0;
    for (const booking of bookings) {
        total += booking.amount;
    }
    return total * commissionRate;
}

export default BookingComponent;
'''
    
    with open(test_file, 'w') as f:
        f.write(test_content)
    
    return str(test_file)

def run_code_reviewer_test(test_files):
    """Run the code reviewer agent on test files"""
    # Create trigger data
    trigger_data = {
        "trigger_name": "test_code_review",
        "files_changed": test_files,
        "event_type": "PostToolUse",
        "timestamp": "2025-07-26T12:00:00Z"
    }
    
    # Run the code reviewer agent
    agent_script = "/Users/bossio/6fb-booking/.claude/scripts/code-reviewer-agent.py"
    
    try:
        result = subprocess.run([
            "python3", agent_script, json.dumps(trigger_data)
        ], capture_output=True, text=True, timeout=120)
        
        return {
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except subprocess.TimeoutExpired:
        return {
            "returncode": -1,
            "stdout": "",
            "stderr": "Code reviewer agent timed out"
        }

def validate_test_results(result):
    """Validate that the code reviewer detected expected issues"""
    expected_patterns = [
        ("Hardcoded Secret", ["hardcoded secret", "hardcoded key", "potential hardcoded"]),
        ("SQL Injection", ["sql injection", "potential sql injection"]),
        ("XSS Vulnerability", ["xss vulnerability", "xss risk", "dangerouslysetinnerhtml"]),
        ("V1 API Usage", ["v1 api", "deprecated v1", "/api/v1"]),
        ("Missing Type Annotations", ["missing type", "type annotations", "any type"]),
        ("Six Figure Barber", ["six figure", "business", "methodology", "alignment"]),
        ("High Function Complexity", ["complexity", "high function", "complex"]),
        ("Inefficient String Concatenation", ["string concatenation", "inefficient string"]),
        ("Missing Key Prop", ["missing key", "key prop"]),
        ("Sensitive Data in localStorage", ["localstorage", "sensitive data", "storing sensitive"])
    ]
    
    detected_issues = []
    missing_issues = []
    
    output = result.get("stdout", "").lower()
    
    # Also check the latest report file
    report_files = list(Path("/Users/bossio/6fb-booking/.claude/logs").glob("code_review_*.md"))
    if report_files:
        latest_report = max(report_files, key=lambda x: x.stat().st_mtime)
        try:
            with open(latest_report, 'r') as f:
                report_content = f.read().lower()
                output += " " + report_content
        except Exception:
            pass
    
    for issue_name, patterns in expected_patterns:
        detected = False
        for pattern in patterns:
            if pattern.lower() in output:
                detected = True
                break
        
        if detected:
            detected_issues.append(issue_name)
        else:
            missing_issues.append(issue_name)
    
    return {
        "detected_issues": detected_issues,
        "missing_issues": missing_issues,
        "detection_rate": len(detected_issues) / len(expected_patterns) * 100
    }

def main():
    """Main test function"""
    print("🔍 Testing BookedBarber V2 Code Reviewer Agent")
    print("=" * 50)
    
    # Create test files
    print("📝 Creating test files with various code quality issues...")
    python_test_file = create_test_python_file_with_issues()
    typescript_test_file = create_test_typescript_file_with_issues()
    
    # Convert to relative paths
    project_root = Path("/Users/bossio/6fb-booking")
    python_rel_path = str(Path(python_test_file).relative_to(project_root))
    typescript_rel_path = str(Path(typescript_test_file).relative_to(project_root))
    
    test_files = [python_rel_path, typescript_rel_path]
    
    print(f"✅ Created test files: {test_files}")
    
    # Run code reviewer
    print("\n🤖 Running code reviewer agent...")
    result = run_code_reviewer_test(test_files)
    
    print(f"📊 Agent execution completed with return code: {result['returncode']}")
    
    if result['stdout']:
        print("\n📋 Agent Output:")
        print("-" * 30)
        print(result['stdout'])
    
    if result['stderr']:
        print("\n⚠️ Agent Errors:")
        print("-" * 30)
        print(result['stderr'])
    
    # Validate results
    print("\n🔬 Validating detection accuracy...")
    validation = validate_test_results(result)
    
    print(f"\n📈 Detection Results:")
    print(f"   Detected Issues: {len(validation['detected_issues'])}")
    print(f"   Missing Issues: {len(validation['missing_issues'])}")
    print(f"   Detection Rate: {validation['detection_rate']:.1f}%")
    
    if validation['detected_issues']:
        print(f"\n✅ Successfully Detected:")
        for issue in validation['detected_issues']:
            print(f"   - {issue}")
    
    if validation['missing_issues']:
        print(f"\n❌ Failed to Detect:")
        for issue in validation['missing_issues']:
            print(f"   - {issue}")
    
    # Clean up test files
    try:
        Path(python_test_file).unlink()
        Path(typescript_test_file).unlink()
        print(f"\n🧹 Cleaned up test files")
    except Exception as e:
        print(f"\n⚠️ Failed to clean up test files: {e}")
    
    # Test assessment
    if validation['detection_rate'] >= 80:
        print(f"\n🎉 TEST PASSED: Code reviewer agent is working well!")
        return 0
    elif validation['detection_rate'] >= 60:
        print(f"\n⚠️ TEST PARTIAL: Code reviewer agent needs improvement")
        return 1
    else:
        print(f"\n❌ TEST FAILED: Code reviewer agent needs significant fixes")
        return 2

if __name__ == "__main__":
    sys.exit(main())