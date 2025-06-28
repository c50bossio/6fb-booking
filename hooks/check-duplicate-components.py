#!/usr/bin/env python3
"""
Pre-commit hook to check for duplicate component implementations.
Prevents multiple implementations of the same component from being committed.
"""

import os
import sys
import re
from pathlib import Path
from collections import defaultdict


# Known component patterns to check for duplicates
COMPONENT_PATTERNS = {
    "Calendar": r"(Calendar|CalendarView|CalendarComponent|CalendarWidget)",
    "Auth": r"(AuthForm|LoginForm|SignupForm|AuthComponent)",
    "Dashboard": r"(Dashboard|DashboardView|DashboardComponent)",
    "Booking": r"(Booking|BookingForm|BookingComponent|BookingModal)",
    "Payment": r"(Payment|PaymentForm|PaymentComponent|PaymentStep)",
    "Analytics": r"(Analytics|AnalyticsView|AnalyticsComponent)",
    "Settings": r"(Settings|SettingsView|SettingsComponent)",
}


def find_component_files(root_dir):
    """Find all component files in the frontend directory."""
    component_files = defaultdict(list)
    frontend_dir = root_dir / "frontend" / "src"

    if not frontend_dir.exists():
        return component_files

    # Search for component files
    for file_path in frontend_dir.rglob("*.tsx"):
        # Skip test files
        if "test" in file_path.name.lower() or "__tests__" in str(file_path):
            continue

        content = file_path.read_text(encoding="utf-8", errors="ignore")

        # Check for component definitions
        for component_type, pattern in COMPONENT_PATTERNS.items():
            # Look for React component definitions
            component_regex = rf"(export\s+(?:default\s+)?(?:function|const|class)\s+{pattern}|const\s+{pattern}\s*=)"
            if re.search(component_regex, content, re.IGNORECASE):
                component_files[component_type].append(
                    str(file_path.relative_to(root_dir))
                )

    return component_files


def main():
    """Check for duplicate component implementations."""
    root_dir = Path(os.getcwd())
    component_files = find_component_files(root_dir)

    errors = []
    for component_type, files in component_files.items():
        if len(files) > 1:
            errors.append((component_type, files))

    if errors:
        print("\n❌ ERROR: Duplicate component implementations detected!")
        print("\nMultiple implementations of the same component can cause:")
        print("  - Import confusion and errors")
        print("  - Maintenance difficulties")
        print("  - Inconsistent behavior across the application")
        print("\nDuplicate components found:")

        for component_type, files in errors:
            print(f"\n{component_type} Component ({len(files)} implementations):")
            for file_path in files:
                print(f"  - {file_path}")

        print("\nTo fix this:")
        print("1. Choose the best implementation and remove the others")
        print("2. Consolidate features from multiple implementations if needed")
        print("3. Update all imports to use the single implementation")
        print(
            "4. Consider creating variations as props rather than separate components"
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
