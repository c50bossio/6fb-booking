#!/usr/bin/env python3
"""
Fix all relative imports in API files
"""
import os
import re

def fix_imports_in_file(filepath):
    """Fix imports in a single file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace relative imports with absolute imports
    replacements = [
        (r'from \.\.\.config', 'from config'),
        (r'from \.\.\.models', 'from models'),
        (r'from \.\.\.services', 'from services'),
        (r'from \.\.config', 'from config'),
        (r'from \.\.models', 'from models'),
        (r'from \.\.services', 'from services'),
    ]
    
    changed = False
    for pattern, replacement in replacements:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            changed = True
            content = new_content
    
    if changed:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed imports in {filepath}")
    
    return changed

def main():
    """Fix imports in all API and service files"""
    directories = ['api/v1', 'services']
    fixed_count = 0
    
    for directory in directories:
        if os.path.exists(directory):
            print(f"\nProcessing {directory}...")
            for filename in os.listdir(directory):
                if filename.endswith('.py') and filename != '__init__.py':
                    filepath = os.path.join(directory, filename)
                    if fix_imports_in_file(filepath):
                        fixed_count += 1
    
    print(f"\nTotal: Fixed imports in {fixed_count} files")

if __name__ == '__main__':
    main()