#!/usr/bin/env python3
"""
Pre-commit hook to check for excessive file count in a single commit.
Large commits are harder to review and more likely to introduce bugs.
"""

import os
import sys
import subprocess
from pathlib import Path


# Maximum number of files allowed in a single commit
MAX_FILES = 20

# File extensions to exclude from count (generated files, etc.)
EXCLUDED_EXTENSIONS = {".lock", ".log", ".map", ".min.js", ".min.css"}

# Directories to exclude from count
EXCLUDED_DIRS = {"node_modules", "venv", ".next", "build", "dist", "__pycache__"}


def get_staged_files():
    """Get list of staged files for commit."""
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip().split("\n") if result.stdout.strip() else []
    except subprocess.CalledProcessError:
        return []


def filter_files(files):
    """Filter out excluded files."""
    filtered = []
    for file_path in files:
        path = Path(file_path)

        # Skip if in excluded directory
        if any(excluded_dir in path.parts for excluded_dir in EXCLUDED_DIRS):
            continue

        # Skip if has excluded extension
        if path.suffix in EXCLUDED_EXTENSIONS:
            continue

        filtered.append(file_path)

    return filtered


def main():
    """Check for excessive file count."""
    # Get all files passed by pre-commit or from git staging
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    else:
        files = get_staged_files()

    # Filter out excluded files
    relevant_files = filter_files(files)

    if len(relevant_files) > MAX_FILES:
        print(f"\n❌ ERROR: Too many files in commit! ({len(relevant_files)} files)")
        print(f"\nMaximum allowed: {MAX_FILES} files")
        print("\nLarge commits are:")
        print("  - Harder to review properly")
        print("  - More likely to introduce bugs")
        print("  - Difficult to revert if needed")
        print("  - Challenging to understand the changes")

        print(f"\nYou're trying to commit {len(relevant_files)} files:")
        for i, file_path in enumerate(relevant_files[:10]):
            print(f"  {i+1}. {file_path}")
        if len(relevant_files) > 10:
            print(f"  ... and {len(relevant_files) - 10} more files")

        print("\nTo fix this:")
        print("1. Split your changes into smaller, logical commits")
        print("2. Use 'git reset HEAD <file>' to unstage some files")
        print("3. Commit related changes together")
        print("4. Create separate commits for:")
        print("   - Feature implementation")
        print("   - Tests")
        print("   - Documentation")
        print("   - Refactoring")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
