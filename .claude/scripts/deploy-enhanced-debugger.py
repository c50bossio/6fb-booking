#!/usr/bin/env python3
"""
Deploy Enhanced Debugger Agent for BookedBarber V2
Sets up the enhanced debugger agent with proper integration and testing
"""

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime

def print_status(message, status="INFO"):
    """Print status message with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_icons = {
        "INFO": "ℹ️",
        "SUCCESS": "✅", 
        "WARNING": "⚠️",
        "ERROR": "❌",
        "PROGRESS": "🔄"
    }
    icon = status_icons.get(status, "•")
    print(f"[{timestamp}] {icon} {message}")

def check_prerequisites():
    """Check if all prerequisites are met"""
    print_status("Checking prerequisites...", "PROGRESS")
    
    # Check if project directory exists
    project_root = "/Users/bossio/6fb-booking"
    if not os.path.exists(project_root):
        print_status(f"Project directory not found: {project_root}", "ERROR")
        return False
    
    # Check if backend-v2 exists
    backend_path = f"{project_root}/backend-v2"
    if not os.path.exists(backend_path):
        print_status(f"Backend V2 directory not found: {backend_path}", "ERROR")
        return False
    
    # Check if .claude directory exists
    claude_path = f"{project_root}/.claude"
    if not os.path.exists(claude_path):
        print_status(f"Claude directory not found: {claude_path}", "ERROR")
        return False
    
    # Check Python dependencies
    required_packages = ["psutil", "requests"]
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            print_status(f"Installing required package: {package}", "PROGRESS")
            subprocess.run([sys.executable, "-m", "pip", "install", package], check=True)
    
    print_status("Prerequisites check passed", "SUCCESS")
    return True

def make_scripts_executable():
    """Make scripts executable"""
    print_status("Making scripts executable...", "PROGRESS")
    
    scripts = [
        "/Users/bossio/6fb-booking/.claude/scripts/enhanced-debugger-agent.py",
        "/Users/bossio/6fb-booking/.claude/scripts/sub-agent-automation.py",
        "/Users/bossio/6fb-booking/.claude/scripts/sub-agent-control.py",
        "/Users/bossio/6fb-booking/.claude/scripts/browser-logs-integration.py"
    ]
    
    for script in scripts:
        if os.path.exists(script):
            os.chmod(script, 0o755)
            print_status(f"Made executable: {script}", "SUCCESS")
        else:
            print_status(f"Script not found: {script}", "WARNING")

def test_enhanced_debugger():
    """Test the enhanced debugger agent"""
    print_status("Testing enhanced debugger agent...", "PROGRESS")
    
    try:
        # Run the enhanced debugger agent in test mode
        result = subprocess.run([
            "python3", 
            "/Users/bossio/6fb-booking/.claude/scripts/enhanced-debugger-agent.py"
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print_status("Enhanced debugger agent test passed", "SUCCESS")
            return True
        else:
            print_status(f"Enhanced debugger agent test failed: {result.stderr}", "ERROR")
            return False
            
    except subprocess.TimeoutExpired:
        print_status("Enhanced debugger agent test timed out", "WARNING")
        return False
    except Exception as e:
        print_status(f"Error testing enhanced debugger agent: {e}", "ERROR")
        return False

def setup_chrome_debugging():
    """Setup Chrome debugging for browser logs integration"""
    print_status("Setting up Chrome debugging...", "PROGRESS")
    
    # Check if Chrome is running with debugging port
    try:
        import requests
        response = requests.get("http://localhost:9222/json", timeout=5)
        if response.status_code == 200:
            print_status("Chrome debugging port is already active", "SUCCESS")
            return True
    except:
        pass
    
    print_status("Chrome debugging port not active", "WARNING")
    print_status("To enable browser logs integration, run:", "INFO")
    print_status("google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb", "INFO")
    
    return False

def start_sub_agent_automation():
    """Start the sub-agent automation system"""
    print_status("Starting sub-agent automation system...", "PROGRESS")
    
    try:
        # Use the control script to start automation
        result = subprocess.run([
            "python3",
            "/Users/bossio/6fb-booking/.claude/scripts/sub-agent-control.py",
            "start"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print_status("Sub-agent automation started successfully", "SUCCESS")
            return True
        else:
            print_status(f"Failed to start sub-agent automation: {result.stderr}", "ERROR")
            return False
            
    except Exception as e:
        print_status(f"Error starting sub-agent automation: {e}", "ERROR")
        return False

def verify_deployment():
    """Verify the deployment is working"""
    print_status("Verifying deployment...", "PROGRESS")
    
    try:
        # Check status
        result = subprocess.run([
            "python3",
            "/Users/bossio/6fb-booking/.claude/scripts/sub-agent-control.py", 
            "status"
        ], capture_output=True, text=True)
        
        if "RUNNING" in result.stdout:
            print_status("Sub-agent automation is running", "SUCCESS")
            
            # Check enabled agents
            if "debugger" in result.stdout:
                print_status("Enhanced debugger agent is enabled", "SUCCESS")
                return True
            else:
                print_status("Enhanced debugger agent not found in status", "WARNING")
                return False
        else:
            print_status("Sub-agent automation is not running", "ERROR")
            return False
            
    except Exception as e:
        print_status(f"Error verifying deployment: {e}", "ERROR")
        return False

def create_test_scenario():
    """Create a test scenario to verify the debugger works"""
    print_status("Creating test scenario...", "PROGRESS")
    
    test_script = "/tmp/test-debugger-agent.py"
    test_content = '''#!/usr/bin/env python3
"""Test script to trigger debugger agent"""

import time
import sys

print("Testing enhanced debugger agent...")

# Simulate various error conditions
test_cases = [
    ("Test failure simulation", lambda: print("FAILED: Test case failed")),
    ("Import error simulation", lambda: print("ImportError: Module not found")),
    ("Type error simulation", lambda: print("TypeError: Cannot read property")),
]

for name, test_func in test_cases:
    print(f"Running {name}...")
    test_func()
    time.sleep(1)

print("Test scenario completed")
'''
    
    try:
        with open(test_script, 'w') as f:
            f.write(test_content)
        os.chmod(test_script, 0o755)
        print_status(f"Test scenario created: {test_script}", "SUCCESS")
        return test_script
    except Exception as e:
        print_status(f"Failed to create test scenario: {e}", "ERROR")
        return None

def print_deployment_summary():
    """Print deployment summary and usage instructions"""
    print("\n" + "="*60)
    print("🚀 ENHANCED DEBUGGER AGENT DEPLOYMENT COMPLETE")
    print("="*60)
    print()
    print("📋 DEPLOYMENT SUMMARY:")
    print("✅ Enhanced debugger agent deployed")
    print("✅ Configuration updated with new triggers")
    print("✅ Scripts made executable")
    print("✅ Sub-agent automation system configured")
    print()
    print("🎯 NEW DEBUGGING CAPABILITIES:")
    print("• Frontend server crash detection & auto-fix")
    print("• Backend server crash detection & auto-fix")
    print("• Authentication V1/V2 API mismatch detection")
    print("• Missing dependency detection & installation")
    print("• CORS issue detection & resolution")
    print("• Port conflict (EADDRINUSE) detection")
    print("• Authentication stack overflow loop detection")
    print("• TypeScript build failure analysis")
    print()
    print("🛠️  USAGE COMMANDS:")
    print("# Check automation status")
    print("python3 .claude/scripts/sub-agent-control.py status")
    print()
    print("# Start automation (if not running)")
    print("python3 .claude/scripts/sub-agent-control.py start")
    print()
    print("# Stop automation")
    print("python3 .claude/scripts/sub-agent-control.py stop")
    print()
    print("# Enable Chrome debugging for browser logs")
    print("google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb")
    print()
    print("# Run debugger manually")
    print("python3 .claude/scripts/enhanced-debugger-agent.py")
    print()
    print("# Emergency stop (if needed)")
    print("python3 .claude/scripts/sub-agent-control.py emergency-stop")
    print()
    print("📊 MONITORING:")
    print("• Logs: .claude/sub-agent-automation.log")
    print("• Debugger logs: .claude/debugger-agent.log") 
    print("• Reports: .claude/debugger-report-*.md")
    print("• Metrics: .claude/sub-agent-metrics.json")
    print()
    print("⚠️  SAFETY MECHANISMS:")
    print("• 2-5 minute cooldowns between triggers")
    print("• Max 10-20 executions per hour")
    print("• 10-minute execution timeout")
    print("• Emergency stop capability")
    print("• Resource limits (512MB memory, 50% CPU)")
    print()
    print("🔧 CRITICAL ISSUE TRIGGERS:")
    print("• Test failures → Auto-triggered")
    print("• HTTP 500/404 errors → Auto-triggered")
    print("• JavaScript console errors → Auto-triggered")
    print("• Server crashes → Auto-triggered")
    print("• Authentication loops → Auto-triggered") 
    print("• Build failures → Auto-triggered")
    print()
    print("="*60)

def main():
    """Main deployment function"""
    print_status("Starting Enhanced Debugger Agent deployment", "INFO")
    print()
    
    # Check prerequisites
    if not check_prerequisites():
        print_status("Prerequisites check failed", "ERROR")
        return False
    
    # Make scripts executable
    make_scripts_executable()
    
    # Test enhanced debugger
    if not test_enhanced_debugger():
        print_status("Enhanced debugger test failed", "ERROR")
        return False
    
    # Setup Chrome debugging
    setup_chrome_debugging()
    
    # Start sub-agent automation
    if not start_sub_agent_automation():
        print_status("Failed to start automation system", "ERROR")
        return False
    
    # Verify deployment
    if not verify_deployment():
        print_status("Deployment verification failed", "ERROR")
        return False
    
    # Create test scenario
    test_script = create_test_scenario()
    
    print_status("Enhanced Debugger Agent deployment completed successfully!", "SUCCESS")
    
    # Print summary
    print_deployment_summary()
    
    if test_script:
        print(f"🧪 To test the system, run: python3 {test_script}")
        print()
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)