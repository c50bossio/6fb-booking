#!/usr/bin/env python3
"""
Apply secure error handling to all routers to prevent internal detail exposure.
This script updates routers to use the centralized error handling system.
"""

import re
from pathlib import Path

# Path to routers directory
ROUTERS_DIR = Path(__file__).parent.parent / "routers"

# Pattern to find HTTPException with direct error messages
HTTPEXCEPTION_PATTERN = re.compile(
    r'raise\s+HTTPException\s*\(\s*status_code\s*=\s*([^,]+),\s*detail\s*=\s*f?"([^"]+)"',
    re.MULTILINE | re.DOTALL
)

# Pattern to find exception strings exposed in error messages
EXCEPTION_STR_PATTERN = re.compile(
    r'detail\s*=\s*f?"[^"]*{str\(e\)}[^"]*"',
    re.MULTILINE
)

# Pattern to find direct exception exposure
DIRECT_EXCEPTION_PATTERN = re.compile(
    r'detail\s*=\s*str\(e\)',
    re.MULTILINE
)

# Files to process (high-risk endpoints)
HIGH_RISK_FILES = [
    "privacy.py",
    "billing.py", 
    "commissions.py",
    "payments.py",
    "analytics.py",
    "integrations.py",
    "agents.py",
    "organizations.py",
    "webhooks.py"
]

def update_router_imports(content):
    """Add error handling imports to router file."""
    # Check if already imported
    if "from utils.error_handling import" in content:
        return content
    
    # Find the last import line
    import_lines = []
    for line in content.split('\n'):
        if line.strip().startswith('from ') or line.strip().startswith('import '):
            import_lines.append(line)
    
    if import_lines:
        last_import_idx = content.rfind(import_lines[-1])
        insert_pos = content.find('\n', last_import_idx) + 1
        
        new_import = "from utils.error_handling import AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, PaymentError, IntegrationError, safe_endpoint\n"
        
        return content[:insert_pos] + new_import + content[insert_pos:]
    
    return content

def replace_error_exposures(content):
    """Replace direct error exposures with safe alternatives."""
    replacements = []
    
    # Find all HTTPExceptions that expose error details
    for match in HTTPEXCEPTION_PATTERN.finditer(content):
        status_code = match.group(1).strip()
        detail = match.group(2)
        
        # Check if detail contains sensitive info
        if "{str(e)}" in detail or "str(e)" in detail:
            # Map status codes to appropriate error types
            if "400" in status_code:
                new_error = f'raise ValidationError("Request validation failed")'
            elif "401" in status_code:
                new_error = f'raise AuthenticationError()'
            elif "403" in status_code:
                new_error = f'raise AuthorizationError()'
            elif "404" in status_code:
                new_error = f'raise NotFoundError()'
            elif "409" in status_code:
                new_error = f'raise ConflictError("Resource conflict")'
            elif "402" in status_code:
                new_error = f'raise PaymentError()'
            elif "503" in status_code:
                new_error = f'raise IntegrationError("External service")'
            else:
                new_error = f'raise AppError("An error occurred", status_code={status_code})'
            
            replacements.append((match.group(0), new_error))
    
    # Apply replacements
    for old, new in replacements:
        content = content.replace(old, new)
    
    # Replace direct str(e) exposures
    content = re.sub(
        r'detail\s*=\s*f?"[^"]*{str\(e\)}[^"]*"',
        'detail="An error occurred"',
        content
    )
    
    content = re.sub(
        r'detail\s*=\s*str\(e\)',
        'detail="An error occurred"',
        content
    )
    
    return content

def add_logging_for_errors(content):
    """Add proper logging before raising errors."""
    # Find exception blocks without logging
    exception_blocks = re.findall(
        r'except\s+(\w+)\s+as\s+e:\s*\n([^}]+?)(?=except|finally|else|\n\S|\Z)',
        content,
        re.MULTILINE | re.DOTALL
    )
    
    for exception_type, block in exception_blocks:
        if 'logger.' not in block and 'raise' in block:
            # Add logging before the raise
            indentation = '        '  # Assume standard indentation
            log_line = f'{indentation}logger.error(f"{exception_type} in {{__name__}}: {{e}}", exc_info=True)\n'
            
            # Find where to insert
            raise_match = re.search(r'(\s*)raise', block)
            if raise_match:
                indent = raise_match.group(1)
                new_block = block.replace(
                    f'{indent}raise',
                    f'{indent}logger.error(f"{exception_type} in {{__name__}}: {{e}}", exc_info=True)\n{indent}raise'
                )
                content = content.replace(block, new_block)
    
    return content

def process_file(filepath):
    """Process a single router file."""
    print(f"Processing {filepath.name}...")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Update imports
        content = update_router_imports(content)
        
        # Replace error exposures
        content = replace_error_exposures(content)
        
        # Add logging
        content = add_logging_for_errors(content)
        
        # Check if logger is imported
        if 'logger.error' in content and 'import logging' not in content:
            # Add logging import
            if 'from ' in content:
                first_from = content.find('from ')
                content = content[:first_from] + 'import logging\n' + content[first_from:]
            else:
                content = 'import logging\n' + content
            
            # Add logger initialization
            if 'logger = logging.getLogger' not in content:
                # Find after imports
                lines = content.split('\n')
                import_end = 0
                for i, line in enumerate(lines):
                    if line.strip() and not line.strip().startswith(('from ', 'import ', '#')):
                        import_end = i
                        break
                
                lines.insert(import_end, '\nlogger = logging.getLogger(__name__)\n')
                content = '\n'.join(lines)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated {filepath.name}")
            return True
        else:
            print(f"⏭️  No changes needed for {filepath.name}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {filepath.name}: {e}")
        return False

def main():
    """Main function to process all router files."""
    print("🔒 Applying secure error handling to routers...\n")
    
    updated_count = 0
    
    # Process high-risk files
    for filename in HIGH_RISK_FILES:
        filepath = ROUTERS_DIR / filename
        if filepath.exists():
            if process_file(filepath):
                updated_count += 1
        else:
            print(f"⚠️  File not found: {filename}")
    
    print(f"\n✅ Updated {updated_count} files with secure error handling")
    
    # Create a summary report
    report_path = Path(__file__).parent / "error_handling_report.txt"
    with open(report_path, 'w') as f:
        f.write("Error Handling Application Report\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"Files processed: {len(HIGH_RISK_FILES)}\n")
        f.write(f"Files updated: {updated_count}\n\n")
        f.write("Files processed:\n")
        for filename in HIGH_RISK_FILES:
            f.write(f"  - {filename}\n")
    
    print(f"📄 Report saved to: {report_path}")

if __name__ == "__main__":
    main()