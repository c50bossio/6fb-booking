#\!/usr/bin/env python3
import re
import os

def extract_endpoints_from_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Extract router definition to get prefix
        router_match = re.search(r'router = APIRouter\([^)]*prefix="([^"]*)"', content)
        router_prefix = router_match.group(1) if router_match else ''
        
        # Extract endpoints
        endpoints = []
        endpoint_pattern = r'@router\.(get|post|put|delete|patch)\("([^"]*)"'
        matches = re.finditer(endpoint_pattern, content)
        
        for match in matches:
            method = match.group(1).upper()
            path = match.group(2)
            endpoints.append({
                'method': method,
                'path': path,
                'router_prefix': router_prefix
            })
        
        return endpoints
    except Exception as e:
        print(f'Error processing {filepath}: {e}')
        return []

# Main execution
router_files = []
for file in os.listdir('routers'):
    if file.endswith('.py') and file != '__init__.py':
        router_files.append(os.path.join('routers', file))

# Main router inclusion mapping from main.py
main_prefixes = {
    'health': '',
    'auth': '/api/v2',
    'auth_simple': '/api/v2', 
    'social_auth': '/api/v2',
    'mfa': '/api/v2',
    'bookings': '/api/v2',
    'appointments': '/api/v2',
    'payments': '/api/v2',
    'clients': '/api/v2',
    'users': '/api/v2',
    'timezones': '/api/v2',
    'calendar': '/api/v2',
    'google_calendar': '/api/v2',
    'services': '/api/v2',
    'pricing_validation': '/api/v2',
    'six_fb_compliance': '/api/v2',
    'barbers': '/api/v2',
    'barber_availability': '/api/v2',
    'recurring_appointments': '/api/v2',
    'webhooks': '/api/v2',
    'analytics': '/api/v2',
    'dashboard': '/api/v2',
    'booking_rules': '/api/v2',
    'notifications': '/api/v2',
    'imports': '/api/v2',
    'exports': '/api/v2',
    'sms_conversations': '/api/v2',
    'sms_webhooks': '/api/v2',
    'webhook_management': '/api/v2',
    'enterprise': '/api/v2',
    'marketing': '/api/v2',
    'marketing_analytics': '/api/v2',
    'short_urls': '/s',
    'notification_preferences': '',
    'test_data': '/api/v2',
    'reviews': '/api/v2',
    'locations': '/api/v2',
    'integrations': '',
    'api_keys': '/api/v2',
    'commissions': '/api/v2',
    'commission_rates': '/api/v2',
    'billing': '/api/v2',
    'invitations': '',
    'organizations': '/api/v2',
    'trial_monitoring': '/api/v2',
    'privacy': '',
    'ai_analytics': '/api/v2',
    'agents': '/api/v2',
    'tracking': '',
    'customer_pixels': '',
    'public_booking': '',
    'products': ''
}

all_endpoints = []
for filepath in sorted(router_files):
    endpoints = extract_endpoints_from_file(filepath)
    filename = os.path.basename(filepath).replace('.py', '')
    
    # Get main prefix for this router
    main_prefix = main_prefixes.get(filename, '')
    
    for endpoint in endpoints:
        router_prefix = endpoint['router_prefix']
        path = endpoint['path']
        
        # Build full path: main_prefix + router_prefix + path
        full_path = main_prefix + router_prefix + path
        
        all_endpoints.append({
            'method': endpoint['method'],
            'path': full_path,
            'file': filepath
        })

# Print all endpoints sorted by path
print("=== ALL API ENDPOINTS ===")
for endpoint in sorted(all_endpoints, key=lambda x: x['path']):
    print(f"{endpoint['method']} {endpoint['path']} (file: {endpoint['file']})")