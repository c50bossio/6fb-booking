#!/usr/bin/env python3
"""Script to remove debug logging from production code."""

import re
import os
import sys

def clean_debug_logging(file_path):
    """Remove debug logging from a Python file."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Patterns to remove
    patterns_to_remove = [
        # Remove BOOKING_DEBUG log lines
        r'^\s*logger\.(info|debug)\(.*BOOKING_DEBUG.*\).*\n',
        # Remove step_start_time assignments
        r'^\s*step_start_time\s*=\s*time_module\.time\(\).*\n',
        # Remove function_start_time assignments
        r'^\s*function_start_time\s*=\s*time_module\.time\(\).*\n',
        # Remove timing measurement logs
        r'^\s*logger\.(info|debug)\(.*time_module\.time\(\)\s*-\s*.*\).*\n',
        # Remove DEBUG prefixed logs
        r'^\s*logger\.(info|debug)\(.*DEBUG:.*\).*\n',
        # Remove query timing logs
        r'^\s*.*_query_start\s*=\s*time_module\.time\(\).*\n',
        r'^\s*.*_start\s*=\s*time_module\.time\(\).*\n',
        # Remove unnecessary time module imports (if only used for debug)
        r'^\s*import time as time_module.*\n',
    ]
    
    for pattern in patterns_to_remove:
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    # Clean up multiple blank lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    # Only write if content changed
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        return True
    return False

def main():
    """Clean debug logging from specified files."""
    
    files_to_clean = [
        'services/booking_service.py',
        'routers/appointments.py',
        'routers/analytics.py',
        'services/analytics_service.py',
        'services/marketing_service.py',
        'services/integration_adapters.py',
        'services/agent_orchestration_service.py',
        'routers/commissions.py',
        'routers/billing.py',
        'routers/auth.py',
        'routers/privacy.py',
    ]
    
    base_dir = '/Users/bossio/6fb-booking/backend-v2'
    
    cleaned_count = 0
    for file_path in files_to_clean:
        full_path = os.path.join(base_dir, file_path)
        if os.path.exists(full_path):
            print(f"Cleaning {file_path}...")
            if clean_debug_logging(full_path):
                cleaned_count += 1
                print(f"  ✓ Cleaned debug logging from {file_path}")
            else:
                print(f"  - No debug logging found in {file_path}")
        else:
            print(f"  ⚠ File not found: {file_path}")
    
    print(f"\nCleaned {cleaned_count} files")

if __name__ == "__main__":
    main()