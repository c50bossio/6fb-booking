#!/usr/bin/env python3
"""
Pre-commit hook to check if new features are being added without duplication checks
"""

import sys
import re
from pathlib import Path


def check_new_features(files):
    """Check if new features are being added without proper checks"""
    issues = []
    
    patterns = {
        'models': r'class\s+(\w+)\s*\([^)]*Base[^)]*\)',
        'endpoints': r'@\w+\.(get|post|put|delete|patch)\s*\(["\']([^"\']+)',
        'components': r'export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)',
    }
    
    for file_path in files:
        if not Path(file_path).exists():
            continue
            
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Check for new models
            if file_path.endswith('.py'):
                for match in re.finditer(patterns['models'], content):
                    model_name = match.group(1)
                    if model_name not in ['Base', 'Model']:
                        issues.append(f"New model '{model_name}' in {file_path} - ensure it's checked for duplicates")
                
                for match in re.finditer(patterns['endpoints'], content):
                    endpoint = f"{match.group(1).upper()} {match.group(2)}"
                    issues.append(f"New endpoint '{endpoint}' in {file_path} - ensure it's checked for duplicates")
            
            # Check for new components
            elif file_path.endswith(('.tsx', '.ts')):
                for match in re.finditer(patterns['components'], content):
                    component = match.group(1)
                    issues.append(f"New component '{component}' in {file_path} - ensure it's checked for duplicates")
        
        except Exception as e:
            print(f"Error checking {file_path}: {e}")
    
    if issues:
        print("\n⚠️  Potential new features detected:")
        for issue in issues:
            print(f"  - {issue}")
        print("\n💡 Remember to:")
        print("  1. Run: python backend-v2/utils/duplication_detector.py")
        print("  2. Check: python backend-v2/utils/registry_manager.py check <feature_name>")
        print("  3. Register after migration: python backend-v2/utils/registry_manager.py add <name> <type> <location> <description>")
        return 1
    
    return 0


if __name__ == "__main__":
    files = sys.argv[1:]
    sys.exit(check_new_features(files))