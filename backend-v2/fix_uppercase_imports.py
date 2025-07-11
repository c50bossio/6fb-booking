#!/usr/bin/env python3
"""Fix uppercase component imports to lowercase."""

import os
import re
import sys

# Component mappings from uppercase to lowercase
COMPONENT_MAPPINGS = {
    'Badge': 'badge',
    'Button': 'button',
    'Card': 'card',
    'Input': 'input',
    'Label': 'label',
    'Select': 'select',
    'Switch': 'switch',
    'Tabs': 'tabs',
    'Dialog': 'dialog',
}

def fix_imports_in_file(filepath):
    """Fix uppercase imports in a single file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes_made = []
    
    for uppercase, lowercase in COMPONENT_MAPPINGS.items():
        # Pattern to match imports
        pattern = rf"from\s+['\"]@/components/ui/{uppercase}['\"]"
        replacement = f"from '@/components/ui/{lowercase}'"
        
        # Check if pattern exists
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            changes_made.append(f"{uppercase} → {lowercase}")
    
    # Write back if changes were made
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes_made
    
    return []

def process_directory(directory):
    """Process all TypeScript/JavaScript files in directory."""
    total_files = 0
    modified_files = 0
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and .next directories
        if 'node_modules' in root or '.next' in root:
            continue
            
        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                filepath = os.path.join(root, file)
                total_files += 1
                
                changes = fix_imports_in_file(filepath)
                if changes:
                    modified_files += 1
                    print(f"✓ {filepath}")
                    for change in changes:
                        print(f"  - {change}")
    
    print(f"\nProcessed {total_files} files, modified {modified_files} files")

if __name__ == "__main__":
    # Process frontend-v2 directory
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend-v2')
    
    if not os.path.exists(frontend_dir):
        print(f"Error: Directory {frontend_dir} not found")
        sys.exit(1)
    
    print("Fixing uppercase component imports...")
    print("=" * 50)
    
    process_directory(frontend_dir)
    
    print("\nDone! Run 'npm run build' to verify all imports are fixed.")