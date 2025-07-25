#!/usr/bin/env python3
"""
Focused Frontend-Backend Integration Analysis for BookedBarber V2

This script provides a detailed analysis of critical integration gaps and issues.
"""

import os
import re
import json
from pathlib import Path
from typing import Dict

def check_critical_endpoints() -> Dict[str, any]:
    """Check for critical missing endpoints that could break functionality"""
    
    # Load the previous analysis
    report_path = "/Users/bossio/6fb-booking/backend-v2/frontend-v2/integration_analysis_report.json"
    
    with open(report_path, 'r') as f:
        data = json.load(f)
    
    missing_endpoints = data['integration_gaps']['missing_backend_endpoints']
    
    # Categorize missing endpoints by criticality
    critical_missing = []
    important_missing = []
    optional_missing = []
    
    # Critical endpoints - core functionality
    critical_patterns = [
        '/api/v1/auth/',
        '/api/v1/appointments/',
        '/api/v1/payments/',
        '/api/v1/bookings',
        '/api/v1/users'
    ]
    
    # Important endpoints - significant features
    important_patterns = [
        '/api/v1/notifications/',
        '/api/v1/clients/',
        '/api/v1/services/',
        '/api/v1/barbers/',
        '/api/calendar/'
    ]
    
    for endpoint in missing_endpoints:
        is_critical = any(pattern in endpoint for pattern in critical_patterns)
        is_important = any(pattern in endpoint for pattern in important_patterns)
        
        if is_critical:
            critical_missing.append(endpoint)
        elif is_important:
            important_missing.append(endpoint)
        else:
            optional_missing.append(endpoint)
    
    return {
        'critical': critical_missing,
        'important': important_missing,
        'optional': optional_missing,
        'total_missing': len(missing_endpoints)
    }

def analyze_authentication_flow() -> Dict[str, any]:
    """Analyze authentication integration in detail"""
    frontend_path = Path("/Users/bossio/6fb-booking/backend-v2/frontend-v2")
    
    auth_analysis = {
        'auth_pages': [],
        'protected_routes': [],
        'auth_hooks': [],
        'auth_middleware': [],
        'token_management': [],
        'issues': []
    }
    
    # Find actual auth pages (exclude node_modules)
    auth_pages = [
        'app/login/page.tsx',
        'app/register/page.tsx', 
        'app/forgot-password/page.tsx',
        'app/reset-password/page.tsx'
    ]
    
    for page in auth_pages:
        page_path = frontend_path / page
        if page_path.exists():
            auth_analysis['auth_pages'].append(str(page_path))
    
    # Check for middleware
    middleware_path = frontend_path / "middleware.ts"
    if middleware_path.exists():
        try:
            with open(middleware_path, 'r') as f:
                content = f.read()
                if 'auth' in content.lower() or 'protected' in content.lower():
                    auth_analysis['auth_middleware'].append(str(middleware_path))
        except:
            pass
    
    # Check for protected route component
    protected_route_path = frontend_path / "components" / "ProtectedRoute.tsx"
    if protected_route_path.exists():
        auth_analysis['protected_routes'].append(str(protected_route_path))
    
    # Check API client for auth implementation
    api_client_path = frontend_path / "lib" / "api.ts"
    if api_client_path.exists():
        try:
            with open(api_client_path, 'r') as f:
                content = f.read()
                
                # Check for token management
                if 'localStorage.getItem(\'token\')' in content:
                    auth_analysis['token_management'].append('localStorage token storage')
                if 'localStorage.setItem(\'token\'' in content:
                    auth_analysis['token_management'].append('localStorage token setting')
                if 'Authorization' in content:
                    auth_analysis['token_management'].append('Authorization header usage')
                if 'refresh' in content.lower() and 'token' in content.lower():
                    auth_analysis['token_management'].append('Token refresh mechanism')
                    
                # Check for auth API calls
                auth_functions = re.findall(r'export async function (login|logout|register|refreshToken|getProfile|changePassword|forgotPassword|resetPassword)\(', content)
                auth_analysis['auth_hooks'] = [func for func in auth_functions]
                
        except:
            auth_analysis['issues'].append('Could not read API client file')
    
    # Identify potential issues
    if not auth_analysis['auth_pages']:
        auth_analysis['issues'].append('No authentication pages found')
    if not auth_analysis['protected_routes']:
        auth_analysis['issues'].append('No protected route component found')
    if not auth_analysis['token_management']:
        auth_analysis['issues'].append('No token management found')
    if len(auth_analysis['auth_hooks']) < 4:
        auth_analysis['issues'].append('Missing core auth functions (login, logout, register, refresh)')
    
    return auth_analysis

def check_data_models_consistency() -> Dict[str, any]:
    """Check consistency between frontend types and backend schemas"""
    frontend_path = Path("/Users/bossio/6fb-booking/backend-v2/frontend-v2")
    backend_path = Path("/Users/bossio/6fb-booking/backend-v2")
    
    consistency_check = {
        'frontend_interfaces': [],
        'backend_schemas': [],
        'potential_mismatches': [],
        'missing_types': []
    }
    
    # Check frontend types
    types_dir = frontend_path / "types"
    if types_dir.exists():
        for ts_file in types_dir.glob("*.ts"):
            try:
                with open(ts_file, 'r') as f:
                    content = f.read()
                    interfaces = re.findall(r'export interface (\w+)', content)
                    consistency_check['frontend_interfaces'].extend(interfaces)
            except:
                continue
    
    # Check lib/api.ts for inline interfaces
    api_file = frontend_path / "lib" / "api.ts"
    if api_file.exists():
        try:
            with open(api_file, 'r') as f:
                content = f.read()
                interfaces = re.findall(r'export interface (\w+)', content)
                consistency_check['frontend_interfaces'].extend(interfaces)
        except:
            pass
    
    # Check backend schemas
    schemas_file = backend_path / "schemas.py"
    if schemas_file.exists():
        try:
            with open(schemas_file, 'r') as f:
                content = f.read()
                schemas = re.findall(r'class (\w+)\(.*BaseModel.*\):', content)
                consistency_check['backend_schemas'].extend(schemas)
        except:
            pass
    
    # Check for common model names that should exist in both
    common_models = ['User', 'Appointment', 'Booking', 'Client', 'Service', 'Payment']
    
    for model in common_models:
        frontend_has = any(model in interface for interface in consistency_check['frontend_interfaces'])
        backend_has = any(model in schema for schema in consistency_check['backend_schemas'])
        
        if not frontend_has and backend_has:
            consistency_check['missing_types'].append(f'Frontend missing {model} interface')
        elif frontend_has and not backend_has:
            consistency_check['missing_types'].append(f'Backend missing {model} schema')
    
    return consistency_check

def analyze_real_time_features() -> Dict[str, any]:
    """Analyze real-time features and WebSocket connections"""
    frontend_path = Path("/Users/bossio/6fb-booking/backend-v2/frontend-v2")
    
    realtime_analysis = {
        'websocket_usage': [],
        'sse_usage': [],
        'polling_mechanisms': [],
        'real_time_components': []
    }
    
    # Search for WebSocket usage
    try:
        for root, dirs, files in os.walk(frontend_path):
            # Skip node_modules
            if 'node_modules' in root:
                continue
                
            for file in files:
                if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r') as f:
                            content = f.read()
                            
                            if 'WebSocket' in content or 'websocket' in content:
                                realtime_analysis['websocket_usage'].append(file_path)
                            if 'EventSource' in content or 'server-sent' in content:
                                realtime_analysis['sse_usage'].append(file_path)
                            if 'setInterval' in content and ('fetch' in content or 'api' in content):
                                realtime_analysis['polling_mechanisms'].append(file_path)
                                
                    except:
                        continue
    except:
        pass
    
    return realtime_analysis

def generate_focused_report() -> Dict[str, any]:
    """Generate a focused integration analysis report"""
    
    print("🔍 Running focused integration analysis...")
    
    # Gather focused analysis data
    critical_endpoints = check_critical_endpoints()
    auth_flow = analyze_authentication_flow()
    data_consistency = check_data_models_consistency()
    realtime_features = analyze_real_time_features()
    
    report = {
        'timestamp': '2025-07-03',
        'critical_endpoint_analysis': critical_endpoints,
        'authentication_integration': auth_flow,
        'data_model_consistency': data_consistency,
        'real_time_features': realtime_features,
        'priority_recommendations': []
    }
    
    # Generate priority recommendations
    if critical_endpoints['critical']:
        report['priority_recommendations'].append({
            'priority': 'CRITICAL',
            'category': 'Missing Core Endpoints',
            'count': len(critical_endpoints['critical']),
            'description': f"Frontend calls {len(critical_endpoints['critical'])} critical endpoints that don't exist in backend",
            'impact': 'Core functionality broken - users cannot authenticate, book appointments, or make payments',
            'action': 'Implement missing endpoints immediately'
        })
    
    if auth_flow['issues']:
        report['priority_recommendations'].append({
            'priority': 'HIGH',
            'category': 'Authentication Issues',
            'count': len(auth_flow['issues']),
            'description': f"Authentication system has {len(auth_flow['issues'])} issues",
            'impact': 'User authentication and security compromised',
            'action': 'Fix authentication integration issues'
        })
    
    if data_consistency['missing_types']:
        report['priority_recommendations'].append({
            'priority': 'MEDIUM',
            'category': 'Type Safety Issues',
            'count': len(data_consistency['missing_types']),
            'description': f"Data model inconsistencies found: {len(data_consistency['missing_types'])} issues",
            'impact': 'Type safety compromised, potential runtime errors',
            'action': 'Align frontend interfaces with backend schemas'
        })
    
    if not realtime_features['websocket_usage'] and not realtime_features['sse_usage']:
        report['priority_recommendations'].append({
            'priority': 'LOW',
            'category': 'Real-time Features',
            'count': 0,
            'description': 'No real-time features detected',
            'impact': 'Users need to refresh for updates',
            'action': 'Consider implementing WebSocket or SSE for real-time updates'
        })
    
    return report

def main():
    """Main analysis function"""
    try:
        report = generate_focused_report()
        
        # Save focused report
        output_file = "/Users/bossio/6fb-booking/backend-v2/frontend-v2/integration_analysis_focused.json"
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"✅ Focused analysis complete! Report saved to {output_file}")
        
        # Print critical findings
        print("\n🚨 CRITICAL FINDINGS")
        print("=" * 50)
        
        critical = report['critical_endpoint_analysis']
        print(f"Critical missing endpoints: {len(critical['critical'])}")
        print(f"Important missing endpoints: {len(critical['important'])}")
        print(f"Total missing endpoints: {critical['total_missing']}")
        
        auth = report['authentication_integration']
        print(f"Auth pages found: {len(auth['auth_pages'])}")
        print(f"Auth issues: {len(auth['issues'])}")
        
        if report['priority_recommendations']:
            print(f"\n⚠️  PRIORITY RECOMMENDATIONS ({len(report['priority_recommendations'])})")
            for i, rec in enumerate(report['priority_recommendations'], 1):
                print(f"{i}. [{rec['priority']}] {rec['category']}: {rec['description']}")
                print(f"   Impact: {rec['impact']}")
                print(f"   Action: {rec['action']}")
                print()
        
        return report
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        return None

if __name__ == "__main__":
    main()