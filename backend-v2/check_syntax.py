#!/usr/bin/env python3
"""
Check for syntax errors in Python files
"""
import os
import ast
import sys
from pathlib import Path

def check_syntax(file_path):
    """Check if a Python file has valid syntax"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        ast.parse(source, filename=str(file_path))
        return True, None
    except SyntaxError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Error reading file: {e}"

def main():
    """Check all Python files for syntax errors"""
    base_dir = Path(".")
    python_files = list(base_dir.glob("**/*.py"))
    python_files = [f for f in python_files if not any(part.startswith('.') for part in f.parts) and 'venv' not in str(f)]
    
    errors = []
    for file_path in python_files:
        is_valid, error = check_syntax(file_path)
        if not is_valid:
            errors.append((str(file_path), error))
    
    if errors:
        print(f"Found {len(errors)} syntax errors:")
        for file_path, error in errors:
            print(f"  {file_path}: {error}")
        return 1
    else:
        print(f"All {len(python_files)} Python files have valid syntax!")
        return 0

if __name__ == "__main__":
    sys.exit(main())