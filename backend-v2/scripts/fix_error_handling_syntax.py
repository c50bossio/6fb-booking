#!/usr/bin/env python3
"""
Fix syntax errors introduced by the error handling script.
"""

import re
from pathlib import Path

# Files to fix
FILES_TO_FIX = [
    "routers/commissions.py",
    "routers/billing.py", 
    "routers/privacy.py",
    "routers/payments.py",
    "routers/analytics.py",
    "routers/integrations.py",
    "routers/agents.py",
    "routers/organizations.py",
    "routers/webhooks.py"
]

def fix_syntax_errors(content):
    """Fix common syntax errors in the content."""
    
    # Fix duplicate logger lines
    content = re.sub(
        r'(logger\.error\(f"[^"]+", exc_info=True\)\n\s*){2,}',
        r'\1',
        content
    )
    
    # Fix trailing parenthesis after raise statements
    content = re.sub(
        r'(raise (?:AppError|ValidationError|AuthenticationError|AuthorizationError|NotFoundError|ConflictError|PaymentError|IntegrationError)\([^)]+\))\s*\)',
        r'\1',
        content
    )
    
    # Fix import placement (move to top of file)
    import_line = 'from utils.error_handling import AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, PaymentError, IntegrationError, safe_endpoint'
    
    # Remove duplicated imports
    content = content.replace(import_line + '\n' + import_line, import_line)
    
    # Move imports that are in the middle of functions
    if 'def ' in content and import_line in content:
        # Find if import is inside a function
        lines = content.split('\n')
        new_lines = []
        inside_function = False
        import_found = False
        
        for i, line in enumerate(lines):
            if line.strip().startswith('def '):
                inside_function = True
            elif not line.startswith(' ') and not line.startswith('\t') and line.strip():
                inside_function = False
            
            if import_line in line and inside_function:
                # Skip this line, we'll add it at the top
                import_found = True
                continue
            
            new_lines.append(line)
        
        if import_found:
            # Add import at the top after other imports
            for i, line in enumerate(new_lines):
                if line.strip() and not line.strip().startswith(('from ', 'import ', '#')):
                    new_lines.insert(i, import_line)
                    break
            
            content = '\n'.join(new_lines)
    
    # Fix HTTPException with "An error occurred" to use proper message
    content = re.sub(
        r'raise HTTPException\(\s*status_code=status\.HTTP_404_NOT_FOUND,\s*detail="An error occurred"\s*\)',
        'raise NotFoundError()',
        content
    )
    
    content = re.sub(
        r'raise HTTPException\(\s*status_code=status\.HTTP_400_BAD_REQUEST,\s*detail="An error occurred"\s*\)',
        'raise ValidationError("Request validation failed")',
        content
    )
    
    # Fix logger placement
    if 'logger = logging.getLogger(__name__)' in content:
        lines = content.split('\n')
        logger_line = 'logger = logging.getLogger(__name__)'
        
        # Remove duplicate logger lines
        lines = [line for i, line in enumerate(lines) 
                if not (line.strip() == logger_line and 
                       i > 0 and lines[i-1].strip() == logger_line)]
        
        content = '\n'.join(lines)
    
    # Fix import order - make sure logging is imported before logger is used
    if 'logger = logging.getLogger' in content and 'import logging' in content:
        lines = content.split('\n')
        new_lines = []
        logging_import_added = False
        logger_line_found = False
        
        for line in lines:
            if 'import logging' in line and not logging_import_added:
                new_lines.append(line)
                logging_import_added = True
            elif 'logger = logging.getLogger' in line and not logger_line_found:
                if not logging_import_added:
                    new_lines.append('import logging')
                    logging_import_added = True
                new_lines.append(line)
                logger_line_found = True
            elif 'import logging' not in line and 'logger = logging.getLogger' not in line:
                new_lines.append(line)
        
        content = '\n'.join(new_lines)
    
    return content

def process_file(filepath):
    """Process a single file to fix syntax errors."""
    print(f"Fixing {filepath}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        content = fix_syntax_errors(content)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed {filepath}")
            return True
        else:
            print(f"⏭️  No fixes needed for {filepath}")
            return False
            
    except Exception as e:
        print(f"❌ Error fixing {filepath}: {e}")
        return False

def main():
    """Main function."""
    print("🔧 Fixing syntax errors in router files...\n")
    
    base_dir = Path(__file__).parent.parent
    fixed_count = 0
    
    for filename in FILES_TO_FIX:
        filepath = base_dir / filename
        if filepath.exists():
            if process_file(filepath):
                fixed_count += 1
        else:
            print(f"⚠️  File not found: {filename}")
    
    print(f"\n✅ Fixed {fixed_count} files")

if __name__ == "__main__":
    main()