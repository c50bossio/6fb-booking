#!/usr/bin/env python3
"""
Frontend-Backend Integration Analysis Tool for BookedBarber V2

This script analyzes the integration between the Next.js frontend and FastAPI backend
to identify connection gaps, unused endpoints, and potential integration issues.
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List
from collections import defaultdict

def find_frontend_api_calls() -> Dict[str, List[str]]:
    """Extract all API calls from frontend code"""
    frontend_path = Path("/Users/bossio/6fb-booking/backend-v2/frontend-v2")
    api_calls = defaultdict(list)
    
    # Patterns to match API calls
    patterns = [
        r'fetchAPI\([\'"]([^\'"]+)[\'"]',
        r'fetch\([\'"][^\'"]*(/api/[^\'"]+)[\'"]',
        r'axios\.[get|post|put|delete|patch]+\([\'"]([^\'"]*\/api\/[^\'"]+)[\'"]',
        r'api\.[get|post|put|delete|patch]+\([\'"]([^\'"]+)[\'"]'
    ]
    
    # File extensions to search
    extensions = ['.ts', '.tsx', '.js', '.jsx']
    
    for ext in extensions:
        try:
            # Use find command to get all files with the extension
            result = subprocess.run(
                ['find', str(frontend_path), '-name', f'*{ext}', '-type', 'f'],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                files = result.stdout.strip().split('\n')
                
                for file_path in files:
                    if file_path and os.path.exists(file_path):
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                
                            # Find all API calls
                            for pattern in patterns:
                                matches = re.findall(pattern, content)
                                for match in matches:
                                    if match.startswith('/api/'):
                                        api_calls[match].append(file_path)
                                        
                        except (UnicodeDecodeError, PermissionError, IsADirectoryError):
                            continue
                            
        except subprocess.TimeoutExpired:
            print(f"Timeout while searching {ext} files")
            continue
        except Exception as e:
            print(f"Error searching {ext} files: {e}")
            continue
            
    return dict(api_calls)

def find_backend_endpoints() -> Dict[str, List[str]]:
    """Extract all endpoint definitions from backend routers"""
    backend_path = Path("/Users/bossio/6fb-booking/backend-v2")
    endpoints = defaultdict(list)
    
    # Patterns to match router endpoints
    patterns = [
        r'@router\.(get|post|put|delete|patch)\([\'"]([^\'"]+)[\'"]',
        r'app\.(get|post|put|delete|patch)\([\'"]([^\'"]+)[\'"]'
    ]
    
    routers_path = backend_path / "routers"
    if routers_path.exists():
        for py_file in routers_path.glob("*.py"):
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find router prefix
                prefix_match = re.search(r'router = APIRouter\(prefix=[\'"]([^\'"]+)[\'"]', content)
                prefix = prefix_match.group(1) if prefix_match else ""
                
                # Find all endpoints
                for pattern in patterns:
                    matches = re.findall(pattern, content)
                    for method, endpoint in matches:
                        full_endpoint = f"/api/v1{prefix}{endpoint}" if prefix else f"/api/v1{endpoint}"
                        endpoints[full_endpoint].append(str(py_file))
                        
            except (UnicodeDecodeError, PermissionError):
                continue
    
    # Also check main.py for directly defined endpoints
    main_py = backend_path / "main.py"
    if main_py.exists():
        try:
            with open(main_py, 'r', encoding='utf-8') as f:
                content = f.read()
            
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for method, endpoint in matches:
                    endpoints[endpoint].append(str(main_py))
                    
        except (UnicodeDecodeError, PermissionError):
            pass
    
    return dict(endpoints)

def analyze_data_models() -> Dict[str, any]:
    """Analyze TypeScript interfaces vs Python schemas"""
    frontend_path = Path("/Users/bossio/6fb-booking/backend-v2/frontend-v2")
    backend_path = Path("/Users/bossio/6fb-booking/backend-v2")
    
    analysis = {
        "frontend_types": [],
        "backend_schemas": [],
        "potential_mismatches": []
    }
    
    # Find TypeScript interfaces
    types_dir = frontend_path / "types"
    if types_dir.exists():
        for ts_file in types_dir.glob("*.ts"):
            try:
                with open(ts_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Find interface definitions
                interfaces = re.findall(r'export interface (\w+)', content)
                analysis["frontend_types"].extend(interfaces)
                
            except (UnicodeDecodeError, PermissionError):
                continue
    
    # Find Python schemas
    schemas_file = backend_path / "schemas.py"
    if schemas_file.exists():
        try:
            with open(schemas_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find Pydantic model definitions
            models = re.findall(r'class (\w+)\(.*BaseModel.*\):', content)
            analysis["backend_schemas"].extend(models)
            
        except (UnicodeDecodeError, PermissionError):
            pass
    
    return analysis

def check_authentication_integration() -> Dict[str, any]:
    """Check authentication flow integration"""
    frontend_path = Path("/Users/bossio/6fb-booking/backend-v2/frontend-v2")
    
    auth_analysis = {
        "login_components": [],
        "protected_routes": [],
        "auth_api_calls": [],
        "token_handling": []
    }
    
    # Find login/auth components
    auth_files = ['login', 'register', 'auth', 'protected']
    
    for root, dirs, files in os.walk(frontend_path):
        for file in files:
            if any(auth_term in file.lower() for auth_term in auth_files):
                if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                    auth_analysis["login_components"].append(os.path.join(root, file))
    
    # Check for auth API calls in lib/api.ts
    api_file = frontend_path / "lib" / "api.ts"
    if api_file.exists():
        try:
            with open(api_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find auth-related functions
            auth_functions = re.findall(r'export async function (login|logout|register|refresh|auth\w*)\(', content)
            auth_analysis["auth_api_calls"] = [func[0] for func in auth_functions]
            
            # Check for token handling
            if 'localStorage.getItem(' in content:
                auth_analysis["token_handling"].append("localStorage token storage")
            if 'Authorization' in content:
                auth_analysis["token_handling"].append("Authorization header usage")
                
        except (UnicodeDecodeError, PermissionError):
            pass
    
    return auth_analysis

def generate_integration_report() -> Dict[str, any]:
    """Generate comprehensive integration analysis report"""
    print("🔍 Analyzing frontend-backend integration...")
    
    # Collect all data
    frontend_calls = find_frontend_api_calls()
    backend_endpoints = find_backend_endpoints()
    data_models = analyze_data_models()
    auth_integration = check_authentication_integration()
    
    # Find mismatches
    frontend_endpoints = set(frontend_calls.keys())
    backend_endpoints_set = set(backend_endpoints.keys())
    
    missing_backend = frontend_endpoints - backend_endpoints_set
    unused_backend = backend_endpoints_set - frontend_endpoints
    
    # Generate report
    report = {
        "summary": {
            "frontend_api_calls": len(frontend_endpoints),
            "backend_endpoints": len(backend_endpoints_set),
            "connected_endpoints": len(frontend_endpoints & backend_endpoints_set),
            "missing_backend_endpoints": len(missing_backend),
            "unused_backend_endpoints": len(unused_backend)
        },
        "frontend_api_calls": {
            "total": len(frontend_calls),
            "endpoints": list(frontend_calls.keys())
        },
        "backend_endpoints": {
            "total": len(backend_endpoints),
            "endpoints": list(backend_endpoints.keys())
        },
        "integration_gaps": {
            "missing_backend_endpoints": list(missing_backend),
            "unused_backend_endpoints": list(unused_backend)
        },
        "data_models": data_models,
        "authentication": auth_integration,
        "recommendations": []
    }
    
    # Generate recommendations
    if missing_backend:
        report["recommendations"].append({
            "priority": "HIGH",
            "category": "Missing Endpoints",
            "description": f"Frontend calls {len(missing_backend)} endpoints that don't exist in backend",
            "action": "Implement missing backend endpoints or update frontend calls"
        })
    
    if unused_backend:
        report["recommendations"].append({
            "priority": "MEDIUM", 
            "category": "Unused Endpoints",
            "description": f"Backend has {len(unused_backend)} endpoints not used by frontend",
            "action": "Consider removing unused endpoints or implementing frontend usage"
        })
    
    if len(data_models["frontend_types"]) == 0:
        report["recommendations"].append({
            "priority": "MEDIUM",
            "category": "Type Safety",
            "description": "No TypeScript interfaces found in types directory",
            "action": "Add TypeScript interfaces for better type safety"
        })
    
    return report

def main():
    """Main analysis function"""
    try:
        report = generate_integration_report()
        
        # Save report
        output_file = "/Users/bossio/6fb-booking/backend-v2/frontend-v2/integration_analysis_report.json"
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"✅ Integration analysis complete! Report saved to {output_file}")
        
        # Print summary
        print("\n📊 INTEGRATION ANALYSIS SUMMARY")
        print("=" * 50)
        print(f"Frontend API Calls: {report['summary']['frontend_api_calls']}")
        print(f"Backend Endpoints: {report['summary']['backend_endpoints']}")
        print(f"Connected: {report['summary']['connected_endpoints']}")
        print(f"Missing Backend: {report['summary']['missing_backend_endpoints']}")
        print(f"Unused Backend: {report['summary']['unused_backend_endpoints']}")
        
        if report['recommendations']:
            print(f"\n⚠️  RECOMMENDATIONS ({len(report['recommendations'])})")
            for i, rec in enumerate(report['recommendations'], 1):
                print(f"{i}. [{rec['priority']}] {rec['category']}: {rec['description']}")
        
        return report
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        return None

if __name__ == "__main__":
    main()