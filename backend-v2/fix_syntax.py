#!/usr/bin/env python3
"""
Fix common Pydantic ConfigDict syntax errors
"""
import os
import re
from pathlib import Path

def fix_configdict_syntax(file_path):
    """Fix ConfigDict syntax in a file"""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Fix missing commas in ConfigDict
        content = re.sub(
            r'model_config = ConfigDict\(\s*(\w+)\s*=\s*([^,\n\)]+)\s*(\w+)\s*=',
            r'model_config = ConfigDict(\n        \1=\2,\n        \3=',
            content
        )
        
        # Fix unterminated ConfigDict
        content = re.sub(
            r'model_config = ConfigDict\([^)]*$',
            lambda m: m.group(0) + '\n    )',
            content,
            flags=re.MULTILINE
        )
        
        # Fix extra closing parentheses
        content = re.sub(
            r'    model_config = ConfigDict\(from_attributes=True\)\s*\)',
            r'    model_config = ConfigDict(from_attributes=True)',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"Fixed: {file_path}")
            return True
        return False
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Fix ConfigDict syntax in all Python files"""
    files_fixed = 0
    
    # Target specific problematic files
    problem_files = [
        "config/redis_config.py",
        "config/cdn_config.py", 
        "schemas_new/core.py",
        "schemas_new/basic.py",
        "schemas_new/agent.py"
    ]
    
    for file_path in problem_files:
        if os.path.exists(file_path) and fix_configdict_syntax(file_path):
            files_fixed += 1
    
    print(f"Fixed {files_fixed} files")

if __name__ == "__main__":
    main()