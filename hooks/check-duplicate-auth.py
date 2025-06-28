#!/usr/bin/env python3
"""
Pre-commit hook to check for duplicate authentication implementations.
Ensures there's only one authentication system in use.
"""

import os
import sys
import re
from pathlib import Path
from collections import defaultdict


def find_auth_implementations(root_dir):
    """Find all authentication-related implementations."""
    auth_files = {"backend": defaultdict(list), "frontend": defaultdict(list)}

    # Backend auth patterns
    backend_patterns = {
        "auth_endpoints": r'@(app|router)\.(post|get)\s*\(\s*["\']/(login|signin|signup|register|auth)',
        "auth_services": r"class\s+\w*Auth\w*Service|def\s+\w*(authenticate|login|signup|register)",
        "jwt_implementations": r"(jwt|JWT|JsonWebToken|create_access_token|decode_token)",
        "session_auth": r"(session\[|Session\(|session_id|session_token)",
    }

    # Frontend auth patterns
    frontend_patterns = {
        "auth_components": r"(LoginForm|SignupForm|AuthForm|AuthProvider|useAuth)",
        "auth_contexts": r"(AuthContext|AuthProvider|createContext.*[Aa]uth)",
        "auth_hooks": r"(useAuth|useLogin|useSignup|useSession)",
        "auth_api_calls": r"(\/api\/auth|\/login|\/signup|\/register)",
    }

    # Check backend files
    backend_dir = root_dir / "backend"
    if backend_dir.exists():
        for file_path in backend_dir.rglob("*.py"):
            if "test" in file_path.name.lower() or "__pycache__" in str(file_path):
                continue

            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                for pattern_type, pattern in backend_patterns.items():
                    if re.search(pattern, content, re.IGNORECASE):
                        auth_files["backend"][pattern_type].append(
                            str(file_path.relative_to(root_dir))
                        )
            except Exception:
                continue

    # Check frontend files
    frontend_dir = root_dir / "frontend" / "src"
    if frontend_dir.exists():
        for file_path in frontend_dir.rglob("*.[jt]sx?"):
            if "test" in file_path.name.lower() or "node_modules" in str(file_path):
                continue

            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                for pattern_type, pattern in frontend_patterns.items():
                    if re.search(pattern, content, re.IGNORECASE):
                        auth_files["frontend"][pattern_type].append(
                            str(file_path.relative_to(root_dir))
                        )
            except Exception:
                continue

    return auth_files


def check_for_duplicates(auth_files):
    """Check if there are multiple auth implementations."""
    issues = []

    # Check backend
    if len(auth_files["backend"].get("auth_endpoints", [])) > 2:
        issues.append(
            (
                "Multiple authentication endpoints",
                auth_files["backend"]["auth_endpoints"],
            )
        )

    # Check if both JWT and session auth are used
    has_jwt = bool(auth_files["backend"].get("jwt_implementations", []))
    has_session = bool(auth_files["backend"].get("session_auth", []))
    if has_jwt and has_session:
        issues.append(
            (
                "Mixed authentication methods (JWT and Session)",
                auth_files["backend"]["jwt_implementations"]
                + auth_files["backend"]["session_auth"],
            )
        )

    # Check frontend
    if len(auth_files["frontend"].get("auth_components", [])) > 2:
        issues.append(
            (
                "Multiple authentication components",
                auth_files["frontend"]["auth_components"],
            )
        )

    if len(auth_files["frontend"].get("auth_contexts", [])) > 1:
        issues.append(
            (
                "Multiple authentication contexts",
                auth_files["frontend"]["auth_contexts"],
            )
        )

    return issues


def main():
    """Check for duplicate authentication implementations."""
    root_dir = Path(os.getcwd())
    auth_files = find_auth_implementations(root_dir)
    issues = check_for_duplicates(auth_files)

    if issues:
        print("\n❌ ERROR: Multiple authentication implementations detected!")
        print("\nHaving multiple auth systems can cause:")
        print("  - Security vulnerabilities")
        print("  - Inconsistent user experience")
        print("  - Session management conflicts")
        print("  - Maintenance nightmares")

        for issue_type, files in issues:
            print(f"\n{issue_type}:")
            for file_path in files[:5]:  # Show first 5 files
                print(f"  - {file_path}")
            if len(files) > 5:
                print(f"  ... and {len(files) - 5} more files")

        print("\nTo fix this:")
        print("1. Choose ONE authentication method (preferably JWT for this project)")
        print("2. Remove or consolidate duplicate implementations")
        print("3. Ensure all parts of the app use the same auth system")
        print("4. Update the authentication documentation")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
