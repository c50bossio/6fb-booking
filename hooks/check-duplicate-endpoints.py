#!/usr/bin/env python3
"""
Pre-commit hook to check for duplicate API endpoints.
Prevents multiple endpoints serving the same purpose.
"""

import os
import sys
import re
from pathlib import Path
from collections import defaultdict


def extract_endpoints(file_path):
    """Extract API endpoint definitions from a Python file."""
    endpoints = []

    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")

        # FastAPI route patterns
        patterns = [
            # @app.get("/path")
            r'@(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*["\']([^"\']+)["\']',
            # router.get("/path", ...)
            r'(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*["\']([^"\']+)["\']',
            # APIRouter(prefix="/path")
            r'APIRouter\s*\(\s*prefix\s*=\s*["\']([^"\']+)["\']',
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                if len(match.groups()) == 2:
                    method, path = match.groups()
                    endpoints.append((method.upper(), path))
                else:
                    # For APIRouter prefix
                    endpoints.append(("PREFIX", match.group(1)))

    except Exception:
        pass

    return endpoints


def normalize_path(path):
    """Normalize API path for comparison."""
    # Remove trailing slashes
    path = path.rstrip("/")

    # Replace path parameters with placeholders
    # {id} -> {param}
    path = re.sub(r"\{[^}]+\}", "{param}", path)
    # :id -> {param}
    path = re.sub(r":[a-zA-Z_]\w*", "{param}", path)

    return path.lower()


def find_duplicate_endpoints(root_dir):
    """Find all API endpoints and check for duplicates."""
    endpoint_map = defaultdict(list)

    # Check backend API files
    backend_dir = root_dir / "backend"
    if backend_dir.exists():
        for file_path in backend_dir.rglob("*.py"):
            if "test" in file_path.name.lower() or "__pycache__" in str(file_path):
                continue

            endpoints = extract_endpoints(file_path)
            for method, path in endpoints:
                if method != "PREFIX":
                    normalized = normalize_path(path)
                    endpoint_map[(method, normalized)].append(
                        {
                            "file": str(file_path.relative_to(root_dir)),
                            "original_path": path,
                        }
                    )

    # Find duplicates
    duplicates = {}
    for (method, path), locations in endpoint_map.items():
        if len(locations) > 1:
            duplicates[(method, path)] = locations

    return duplicates


def check_similar_endpoints(endpoint_map):
    """Check for endpoints that are suspiciously similar."""
    similar = []
    endpoints = list(endpoint_map.keys())

    for i, (method1, path1) in enumerate(endpoints):
        for method2, path2 in endpoints[i + 1 :]:
            if method1 == method2:
                # Check if paths are very similar
                if path1.replace("_", "-") == path2.replace("_", "-"):
                    similar.append(
                        {
                            "endpoints": [(method1, path1), (method2, path2)],
                            "files": endpoint_map[(method1, path1)]
                            + endpoint_map[(method2, path2)],
                        }
                    )

    return similar


def main():
    """Check for duplicate API endpoints."""
    root_dir = Path(os.getcwd())
    duplicates = find_duplicate_endpoints(root_dir)

    if duplicates:
        print("\n❌ ERROR: Duplicate API endpoints detected!")
        print("\nHaving duplicate endpoints causes:")
        print("  - Routing conflicts and unpredictable behavior")
        print("  - Confusion about which endpoint to use")
        print("  - Maintenance difficulties")
        print("  - Potential security issues")

        for (method, path), locations in duplicates.items():
            print(f"\n{method} {path} is defined in multiple places:")
            for loc in locations:
                print(f"  - {loc['file']} (path: {loc['original_path']})")

        print("\nTo fix this:")
        print("1. Choose one endpoint implementation and remove the others")
        print("2. If they serve different purposes, use different paths")
        print("3. Consider using path parameters instead of multiple similar endpoints")
        print("4. Update API documentation and client code")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
