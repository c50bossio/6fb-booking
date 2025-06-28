#!/usr/bin/env python3
"""
Pre-commit hook to prevent direct commits to protected branches.
Forces developers to use feature branches and pull requests.
"""

import sys
import subprocess
import argparse


def get_current_branch():
    """Get the current git branch name."""
    try:
        result = subprocess.run(
            ["git", "symbolic-ref", "HEAD"], capture_output=True, text=True, check=True
        )
        # Extract branch name from refs/heads/branch-name
        return result.stdout.strip().split("/")[-1]
    except subprocess.CalledProcessError:
        # Not on a branch (detached HEAD state)
        return None


def main():
    """Prevent commits to protected branches."""
    parser = argparse.ArgumentParser(
        description="Prevent commits to protected branches"
    )
    parser.add_argument(
        "--branch", action="append", default=[], help="Branch names to protect"
    )
    parser.add_argument("filenames", nargs="*", help="Filenames (ignored)")

    args = parser.parse_args()

    # Default protected branches if none specified
    protected_branches = args.branch if args.branch else ["main", "master"]

    current_branch = get_current_branch()

    if current_branch in protected_branches:
        print(
            f"\n❌ ERROR: Direct commits to '{current_branch}' branch are not allowed!"
        )
        print("\nProtected branches should only be updated through pull requests.")
        print("This ensures:")
        print("  - Code review before merging")
        print("  - CI/CD tests pass before integration")
        print("  - Proper tracking of changes")
        print("  - Clean commit history")

        print("\nTo fix this:")
        print("1. Create a feature branch:")
        print(f"   git checkout -b feature/your-feature-name")
        print("2. Commit your changes to the feature branch")
        print("3. Push the feature branch:")
        print("   git push origin feature/your-feature-name")
        print("4. Create a pull request on GitHub/GitLab")

        print("\nIf you really need to commit directly (NOT RECOMMENDED):")
        print("  - Use --no-verify flag: git commit --no-verify")
        print("  - But please reconsider and use a feature branch instead!")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
