#!/usr/bin/env python3
"""
Script to update database imports to use the enhanced database module
This ensures Render compatibility while maintaining local development support
"""

import os
import re
from pathlib import Path
import shutil
from datetime import datetime


def backup_file(file_path):
    """Create a backup of the file"""
    backup_path = f"{file_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    return backup_path


def update_imports_in_file(file_path, dry_run=False):
    """Update database imports in a single file"""

    # Patterns to replace
    replacements = [
        # Direct imports from config.database
        (
            r"from config\.database import (.+)",
            r"from config.database_enhanced import \1",
        ),
        # Import the whole module
        (r"import config\.database\b", r"import config.database_enhanced as database"),
        # From database import
        (r"from \.database import (.+)", r"from .database_enhanced import \1"),
    ]

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content
        modified = False

        for pattern, replacement in replacements:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                content = new_content
                modified = True

        if modified:
            if not dry_run:
                # Create backup
                backup_path = backup_file(file_path)
                print(f"  📁 Backed up to: {backup_path}")

                # Write updated content
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)

                print(f"  ✅ Updated: {file_path}")
            else:
                print(f"  🔍 Would update: {file_path}")

            return True
        else:
            return False

    except Exception as e:
        print(f"  ❌ Error processing {file_path}: {e}")
        return False


def find_python_files(directory, exclude_dirs=None):
    """Find all Python files in the directory"""
    if exclude_dirs is None:
        exclude_dirs = {"venv", "__pycache__", ".git", "migrations", "alembic"}

    python_files = []

    for root, dirs, files in os.walk(directory):
        # Remove excluded directories from search
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        for file in files:
            if file.endswith(".py") and file != "database_enhanced.py":
                python_files.append(os.path.join(root, file))

    return python_files


def create_database_wrapper():
    """Create a wrapper that automatically uses the enhanced module"""
    wrapper_content = '''"""
Database module wrapper - automatically uses enhanced module for Render
This file ensures backward compatibility while adding Render support
"""

# Import everything from the enhanced module
from .database_enhanced import *

# This allows existing code to continue using 'from config.database import ...'
# while getting the enhanced functionality
'''

    wrapper_path = Path(__file__).parent.parent / "config" / "database_wrapper.py"

    with open(wrapper_path, "w") as f:
        f.write(wrapper_content)

    print(f"✅ Created database wrapper at: {wrapper_path}")


def main():
    """Main function to update database imports"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Update database imports for Render compatibility"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without making changes",
    )
    parser.add_argument(
        "--create-wrapper",
        action="store_true",
        help="Create a wrapper module instead of updating imports",
    )
    parser.add_argument(
        "--directory",
        default=".",
        help="Directory to search for Python files (default: current directory)",
    )

    args = parser.parse_args()

    print("🔧 6FB Booking - Database Import Updater")
    print("=" * 50)

    if args.create_wrapper:
        # Alternative approach: create a wrapper
        create_database_wrapper()
        print("\n💡 Next steps:")
        print("1. Rename config/database.py to config/database_original.py")
        print("2. Rename config/database_wrapper.py to config/database.py")
        print("3. No other code changes needed!")
        return

    # Find all Python files
    backend_dir = Path(args.directory).resolve()
    print(f"Searching for Python files in: {backend_dir}")

    python_files = find_python_files(backend_dir)
    print(f"Found {len(python_files)} Python files")

    if args.dry_run:
        print("\n🔍 DRY RUN MODE - No files will be modified")

    print("\nProcessing files...")
    updated_count = 0

    for file_path in python_files:
        if update_imports_in_file(file_path, dry_run=args.dry_run):
            updated_count += 1

    print("\n" + "=" * 50)
    print(
        f"Summary: {updated_count} files {'would be' if args.dry_run else 'were'} updated"
    )

    if not args.dry_run and updated_count > 0:
        print("\n⚠️  Important: Test your application after these changes!")
        print("💡 To revert changes, use the backup files created")


if __name__ == "__main__":
    main()
