#!/usr/bin/env python3
"""
Pre-commit hook to check for database files.
Database files should never be committed to the repository.
"""

import os
import sys
from pathlib import Path


# Database file extensions to block
DATABASE_EXTENSIONS = {
    ".db",
    ".sqlite",
    ".sqlite3",
    ".db3",
    ".s3db",
    ".sl3",
    ".mdb",
    ".accdb",
    ".dbf",
}

# Database file name patterns
DATABASE_PATTERNS = [
    "database.db",
    "app.db",
    "test.db",
    "dev.db",
    "prod.db",
    "staging.db",
]


def main():
    """Check for database files."""
    errors = []

    # Get all files passed by pre-commit
    files = sys.argv[1:] if len(sys.argv) > 1 else []

    for file_path in files:
        path = Path(file_path)

        # Check file extension
        if path.suffix.lower() in DATABASE_EXTENSIONS:
            errors.append(file_path)
            continue

        # Check file name patterns
        if path.name.lower() in DATABASE_PATTERNS:
            errors.append(file_path)
            continue

        # Check for SQLite write-ahead log files
        if path.name.endswith(("-wal", "-shm")):
            errors.append(file_path)

    if errors:
        print("\n❌ ERROR: Database files detected!")
        print("\nDatabase files should NEVER be committed because they:")
        print("  - Contain sensitive data")
        print("  - Cause merge conflicts")
        print("  - Bloat the repository size")
        print("  - May contain production data")

        print("\nDatabase files found:")
        for error in errors:
            print(f"  - {error}")

        print("\nTo fix this:")
        print("1. Remove these files from staging: git reset HEAD <file>")
        print("2. Add them to .gitignore if not already there")
        print("3. Use migrations for database schema changes")
        print("4. Use seed scripts for test data")
        print("\nIf you need to share database structure:")
        print("  - Use SQL schema dumps instead")
        print("  - Create migration files")
        print("  - Document the database setup process")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
