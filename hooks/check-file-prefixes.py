#!/usr/bin/env python3
"""
Pre-commit hook to check for disallowed file prefixes.
Prevents files with temporary or experimental prefixes from being committed.
"""

import os
import sys
from pathlib import Path


# Disallowed prefixes (case-insensitive)
DISALLOWED_PREFIXES = [
    "test-",
    "demo-",
    "enhanced-",
    "simple-",
    "temporary-",
    "temp-",
    "tmp-",
    "experiment-",
    "exp-",
    "backup-",
    "old-",
    "new-",
    "fixed-",
    "broken-",
    "wip-",
    "draft-",
]


def main():
    """Check for files with disallowed prefixes."""
    errors = []

    # Get all files passed by pre-commit
    files = sys.argv[1:] if len(sys.argv) > 1 else []

    for file_path in files:
        path = Path(file_path)
        filename = path.name.lower()

        # Check against disallowed prefixes
        for prefix in DISALLOWED_PREFIXES:
            if filename.startswith(prefix):
                errors.append((file_path, prefix))
                break

    if errors:
        print("\n❌ ERROR: Files with disallowed prefixes detected!")
        print(
            "\nFiles with temporary or experimental prefixes should not be committed."
        )
        print("These prefixes indicate work-in-progress or temporary files.\n")
        print("Disallowed prefixes:", ", ".join(DISALLOWED_PREFIXES))
        print("\nFiles that need to be renamed or removed:")
        for file_path, prefix in errors:
            print(f"  - {file_path} (prefix: '{prefix}')")
        print("\nTo fix this:")
        print("1. Rename the files with proper, descriptive names")
        print("2. Or move them to a temporary location outside the repository")
        print("3. Stage the renamed files and commit again")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
