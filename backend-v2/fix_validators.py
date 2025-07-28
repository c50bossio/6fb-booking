#!/usr/bin/env python3
"""
Script to fix Pydantic v1 validators to v2 field_validators
"""
import os
import re
import sys
from pathlib import Path

def fix_file(file_path):
    """Fix validators in a single file"""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Remove old validator assignments
        # Pattern: _validate_field = validator('field', allow_reuse=True)(function_name)
        validator_pattern = r'_validate_\w+ = validator\([^)]+\)\([^)]+\)\n'
        content = re.sub(validator_pattern, '', content)
        
        # Remove redundant empty lines
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        # Replace orm_mode with from_attributes in ConfigDict
        content = re.sub(r'orm_mode\s*=\s*True', 'from_attributes=True', content)
        
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"Fixed: {file_path}")
            return True
        else:
            print(f"No changes needed: {file_path}")
            return False
            
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Fix all schema files"""
    base_dir = Path(".")
    files_to_fix = []
    
    # Find all Python files in schemas_new and related directories
    for pattern in ["schemas_new/*.py", "schemas.py", "routers/*.py"]:
        files_to_fix.extend(base_dir.glob(pattern))
    
    fixed_count = 0
    for file_path in files_to_fix:
        if fix_file(file_path):
            fixed_count += 1
    
    print(f"\nFixed {fixed_count} files")

if __name__ == "__main__":
    main()