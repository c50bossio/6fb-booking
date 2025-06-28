#!/usr/bin/env python3
"""
Pre-commit hook to check for test files in the root directory.
Test files should be in appropriate test directories, not in the project root.
"""

import os
import sys
from pathlib import Path


def main():
    """Check for test files in root directory."""
    errors = []
    root_dir = Path(os.getcwd())

    # Get all files passed by pre-commit
    files = sys.argv[1:] if len(sys.argv) > 1 else []

    for file_path in files:
        path = Path(file_path)

        # Skip if not in root directory
        if len(path.parts) > 1:
            continue

        # Check if it's a test file
        if any(pattern in path.name.lower() for pattern in ["test", "spec"]):
            # Check file extensions
            if path.suffix in [".py", ".js", ".ts", ".jsx", ".tsx"]:
                errors.append(file_path)

    if errors:
        print("\n❌ ERROR: Test files detected in root directory!")
        print("\nTest files should be placed in appropriate directories:")
        print("  - Python tests: backend/tests/")
        print(
            "  - JavaScript/TypeScript tests: frontend/src/__tests__/ or frontend/tests/"
        )
        print("\nFiles that need to be moved:")
        for error in errors:
            print(f"  - {error}")
        print("\nTo fix this:")
        print("1. Move the test files to the appropriate test directories")
        print("2. Update any import paths if necessary")
        print("3. Stage the moved files and commit again")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
