#!/usr/bin/env python3

import re
import os
from pathlib import Path

# List of routers included in main.py (in order of inclusion)
ACTIVE_ROUTERS = [
    'health', 'auth', 'auth_simple', 'mfa', 'bookings', 'appointments', 'payments',
    'clients', 'users', 'timezones', 'calendar', 'google_calendar', 'services',
    'barbers', 'barber_availability', 'recurring_appointments', 'webhooks',
    'analytics', 'dashboard', 'booking_rules', 'notifications', 'imports',
    'sms_conversations', 'sms_webhooks', 'webhook_management', 'enterprise',
    'marketing', 'short_urls', 'notification_preferences', 'test_data', 'reviews',
    'integrations', 'api_keys', 'commissions', 'billing', 'invitations',
    'organizations', 'trial_monitoring', 'privacy', 'ai_analytics', 'agents',
    'tracking', 'customer_pixels', 'public_booking'
]

# Some routers are commented out in main.py
DISABLED_ROUTERS = ['email_analytics', 'locations', 'cache', 'products', 'shopify_webhooks']

def extract_endpoints(file_path):
    """Extract all endpoint definitions from a router file"""
    endpoints = []
    
    if not os.path.exists(file_path):
        return endpoints
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Pattern to match endpoint decorators
    pattern = r'@(?:router|public_router)\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\'].*?\)\s*(?:async\s+)?def\s+(\w+)'
    
    matches = re.finditer(pattern, content, re.MULTILINE | re.DOTALL)
    
    for match in matches:
        method = match.group(1).upper()
        path = match.group(2)
        function_name = match.group(3)
        endpoints.append({
            'method': method,
            'path': path,
            'function': function_name
        })
    
    return endpoints

def main():
    """Analyze all API endpoints in BookedBarber V2"""
    routers_dir = Path(__file__).parent / 'routers'
    
    print("# BookedBarber V2 API Endpoints Analysis\n")
    print(f"Generated from active routers in main.py\n")
    print("=" * 80 + "\n")
    
    total_endpoints = 0
    endpoint_summary = {}
    
    for router_name in ACTIVE_ROUTERS:
        file_path = routers_dir / f"{router_name}.py"
        endpoints = extract_endpoints(file_path)
        
        if endpoints:
            # Determine prefix based on main.py
            if router_name == 'health':
                prefix = ''
            elif router_name == 'short_urls':
                prefix = '/s'
            elif router_name in ['notification_preferences', 'integrations', 'invitations', 'privacy', 'tracking', 'customer_pixels', 'public_booking']:
                # These routers include their own /api/v2 prefix
                prefix = ''
            else:
                prefix = '/api/v2'
            
            # Get router prefix from file
            router_prefix = ''
            if file_path.exists():
                with open(file_path, 'r') as f:
                    content = f.read()
                    router_match = re.search(r'router\s*=\s*APIRouter\s*\([^)]*prefix\s*=\s*["\']([^"\']+)["\']', content)
                    if router_match:
                        router_prefix = router_match.group(1)
            
            print(f"## {router_name.replace('_', ' ').title()} Router")
            print(f"**File**: `routers/{router_name}.py`")
            print(f"**Base Path**: `{prefix}{router_prefix}`")
            print(f"**Endpoints**: {len(endpoints)}\n")
            
            # Group by method
            methods = {}
            for ep in endpoints:
                method = ep['method']
                if method not in methods:
                    methods[method] = []
                full_path = f"{prefix}{router_prefix}{ep['path']}"
                methods[method].append((full_path, ep['function']))
            
            # Print endpoints grouped by method
            for method in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                if method in methods:
                    print(f"### {method} Endpoints:")
                    for path, func in sorted(methods[method]):
                        print(f"- `{method} {path}` → `{func}()`")
                    print()
            
            total_endpoints += len(endpoints)
            endpoint_summary[router_name] = len(endpoints)
            print("-" * 40 + "\n")
    
    # Print summary
    print("\n## Summary Statistics\n")
    print(f"- **Total Active Routers**: {len([r for r in ACTIVE_ROUTERS if endpoint_summary.get(r, 0) > 0])}")
    print(f"- **Total Endpoints**: {total_endpoints}")
    print(f"- **Disabled Routers**: {', '.join(DISABLED_ROUTERS)}")
    
    print("\n## Endpoints by Router:\n")
    for router, count in sorted(endpoint_summary.items(), key=lambda x: x[1], reverse=True):
        if count > 0:
            print(f"- {router}: {count} endpoints")
    
    print("\n## Missing/Problematic Routers:\n")
    for router in ACTIVE_ROUTERS:
        if router not in endpoint_summary or endpoint_summary[router] == 0:
            file_path = routers_dir / f"{router}.py"
            if not file_path.exists():
                print(f"- {router}: FILE NOT FOUND")
            else:
                print(f"- {router}: No endpoints found (check implementation)")

if __name__ == "__main__":
    main()