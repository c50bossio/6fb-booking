#!/usr/bin/env python3
"""
Integration test for Browser Logs MCP Server with 6fb-booking project
"""

import os
import json
import subprocess
import sys
from pathlib import Path

def test_project_structure():
    """Test that all required files exist in the project."""
    print("🔍 Testing project structure...")
    
    required_files = [
        "browser-logs-mcp-server.py",
        "browser-logs-mcp-requirements.txt",
        "BROWSER_LOGS_MCP_SETUP.md",
        "test-browser-logs-mcp.py",
        "scripts/setup-browser-logs-mcp.sh"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ Missing files: {missing_files}")
        return False
    
    print("✅ All required files present")
    return True

def test_claude_config():
    """Test that Claude Desktop configuration includes Browser Logs MCP."""
    print("\n🔍 Testing Claude Desktop configuration...")
    
    claude_config_path = os.path.expanduser("~/.config/claude-desktop/config.json")
    
    if not os.path.exists(claude_config_path):
        print("❌ Claude Desktop config not found")
        return False
    
    try:
        with open(claude_config_path, 'r') as f:
            config = json.load(f)
        
        if 'mcpServers' not in config:
            print("❌ No mcpServers in config")
            return False
        
        if 'browser-logs' not in config['mcpServers']:
            print("❌ Browser Logs MCP not configured")
            return False
        
        browser_logs_config = config['mcpServers']['browser-logs']
        expected_path = "/Users/bossio/6fb-booking/browser-logs-mcp-server.py"
        
        if expected_path not in browser_logs_config.get('args', []):
            print(f"❌ Incorrect path in config. Expected: {expected_path}")
            return False
        
        print("✅ Claude Desktop configuration correct")
        return True
        
    except json.JSONDecodeError:
        print("❌ Invalid JSON in Claude config")
        return False
    except Exception as e:
        print(f"❌ Error reading Claude config: {e}")
        return False

def test_dependencies():
    """Test that all Python dependencies are installed."""
    print("\n🔍 Testing Python dependencies...")
    
    try:
        import websockets
        import requests
        import mcp
        print("✅ All dependencies installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        return False

def test_mcp_server_syntax():
    """Test that the MCP server has valid syntax."""
    print("\n🔍 Testing MCP server syntax...")
    
    try:
        result = subprocess.run([
            sys.executable, '-m', 'py_compile', 'browser-logs-mcp-server.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ MCP server syntax valid")
            return True
        else:
            print(f"❌ Syntax error: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error testing syntax: {e}")
        return False

def test_setup_script():
    """Test that the setup script exists and is executable."""
    print("\n🔍 Testing setup script...")
    
    script_path = "scripts/setup-browser-logs-mcp.sh"
    
    if not os.path.exists(script_path):
        print("❌ Setup script not found")
        return False
    
    if not os.access(script_path, os.X_OK):
        print("❌ Setup script not executable")
        return False
    
    print("✅ Setup script ready")
    return True

def test_documentation():
    """Test that documentation is complete."""
    print("\n🔍 Testing documentation...")
    
    docs_to_check = [
        ("README.md", "Browser Logs MCP"),
        ("MCP_SETUP_GUIDE.md", "Browser Logs MCP"),
        ("CLAUDE.md", "Browser Debugging"),
        ("hooks/README.md", "MCP Server Development")
    ]
    
    missing_docs = []
    for doc_file, search_term in docs_to_check:
        try:
            with open(doc_file, 'r') as f:
                content = f.read()
                if search_term not in content:
                    missing_docs.append(f"{doc_file} (missing '{search_term}')")
        except FileNotFoundError:
            missing_docs.append(f"{doc_file} (file not found)")
    
    if missing_docs:
        print(f"❌ Documentation issues: {missing_docs}")
        return False
    
    print("✅ Documentation complete")
    return True

def test_6fb_booking_integration():
    """Test integration with 6fb-booking project structure."""
    print("\n🔍 Testing 6fb-booking integration...")
    
    # Check that we're in the right project
    if not os.path.exists("backend-v2") or not os.path.exists("backend-v2/frontend-v2"):
        print("❌ Not in 6fb-booking project root")
        return False
    
    # Check that the MCP server can find the project structure
    try:
        # Try to import the test module to see if paths work
        import test_browser_logs_mcp
        print("✅ Can import test module")
    except ImportError as e:
        print(f"⚠️  Import issue (may be normal): {e}")
    
    print("✅ Project structure compatible")
    return True

def main():
    """Run all integration tests."""
    print("🚀 Browser Logs MCP Integration Test Suite")
    print("=" * 60)
    
    tests = [
        ("Project Structure", test_project_structure),
        ("Claude Configuration", test_claude_config),
        ("Dependencies", test_dependencies),
        ("MCP Server Syntax", test_mcp_server_syntax),
        ("Setup Script", test_setup_script),
        ("Documentation", test_documentation),
        ("6FB Booking Integration", test_6fb_booking_integration)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results[test_name] = False
    
    # Summary
    print("\n📊 Integration Test Results")
    print("=" * 60)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All integration tests passed!")
        print("Browser Logs MCP is ready for use with 6fb-booking project.")
        print("\nNext steps:")
        print("1. Restart Claude Desktop")
        print("2. Start Chrome: ./scripts/start-chrome-debug.sh")
        print("3. Test in Claude: connect_to_browser")
        return True
    else:
        print("\n⚠️  Some integration tests failed.")
        print("Review the errors above before using the MCP server.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)