#!/usr/bin/env python3
"""
Script to install PostgreSQL drivers with fallback options
Handles various installation scenarios and system dependencies
"""

import subprocess
import sys
import platform
import os
from typing import List, Tuple, Optional


def run_command(cmd: List[str], check: bool = True) -> Tuple[int, str, str]:
    """Run a command and return exit code, stdout, and stderr"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=check)
        return result.returncode, result.stdout, result.stderr
    except subprocess.CalledProcessError as e:
        return e.returncode, e.stdout, e.stderr
    except Exception as e:
        return -1, "", str(e)


def check_system_dependencies():
    """Check for system-level PostgreSQL dependencies"""
    system = platform.system().lower()

    print(f"Detected system: {system}")

    if system == "linux":
        # Check for PostgreSQL development packages
        distro_commands = {
            "debian": ["apt-get", "install", "-y", "libpq-dev", "python3-dev"],
            "ubuntu": ["apt-get", "install", "-y", "libpq-dev", "python3-dev"],
            "centos": ["yum", "install", "-y", "postgresql-devel", "python3-devel"],
            "fedora": ["dnf", "install", "-y", "postgresql-devel", "python3-devel"],
            "alpine": [
                "apk",
                "add",
                "--no-cache",
                "postgresql-dev",
                "python3-dev",
                "gcc",
                "musl-dev",
            ],
        }

        # Try to detect distribution
        if os.path.exists("/etc/os-release"):
            with open("/etc/os-release") as f:
                content = f.read().lower()
                for distro, cmd in distro_commands.items():
                    if distro in content:
                        print(f"Detected {distro}, installing system dependencies...")
                        print(f"Run: sudo {' '.join(cmd)}")
                        return

        print("Note: You may need to install PostgreSQL development packages:")
        print("  - Debian/Ubuntu: sudo apt-get install libpq-dev python3-dev")
        print("  - CentOS/RHEL: sudo yum install postgresql-devel python3-devel")
        print("  - Alpine: sudo apk add postgresql-dev python3-dev gcc musl-dev")

    elif system == "darwin":
        print("On macOS, you may need to install PostgreSQL:")
        print("  - Using Homebrew: brew install postgresql")
        print("  - Or download from: https://www.postgresql.org/download/macosx/")

    elif system == "windows":
        print("On Windows, ensure PostgreSQL is installed and pg_config is in PATH")
        print("Download from: https://www.postgresql.org/download/windows/")


def install_driver(
    driver_name: str, pip_package: str, fallback_args: Optional[List[str]] = None
) -> bool:
    """Install a specific PostgreSQL driver"""
    print(f"\nAttempting to install {driver_name}...")

    # First attempt: standard installation
    cmd = [sys.executable, "-m", "pip", "install", pip_package]
    returncode, stdout, stderr = run_command(cmd, check=False)

    if returncode == 0:
        print(f"✓ Successfully installed {driver_name}")
        return True

    print(f"Standard installation failed. Error: {stderr}")

    # Second attempt: with --no-binary flag (builds from source)
    if fallback_args:
        print(f"Trying alternative installation method...")
        cmd = [sys.executable, "-m", "pip", "install"] + fallback_args + [pip_package]
        returncode, stdout, stderr = run_command(cmd, check=False)

        if returncode == 0:
            print(f"✓ Successfully installed {driver_name} (from source)")
            return True

        print(f"Alternative installation also failed. Error: {stderr}")

    return False


def install_postgres_drivers():
    """Install PostgreSQL drivers with multiple fallback options"""
    print("=== PostgreSQL Driver Installation ===")

    # Check Python version
    python_version = sys.version_info
    print(
        f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}"
    )

    # Check system dependencies
    check_system_dependencies()

    # List of drivers to install
    drivers = [
        {
            "name": "psycopg2-binary",
            "package": "psycopg2-binary",
            "description": "Precompiled psycopg2 (recommended for quick setup)",
            "fallback_args": None,
        },
        {
            "name": "psycopg2",
            "package": "psycopg2",
            "description": "Standard psycopg2 (requires PostgreSQL development files)",
            "fallback_args": ["--no-binary", "psycopg2"],
        },
        {
            "name": "pg8000",
            "package": "pg8000",
            "description": "Pure Python PostgreSQL driver (no C dependencies)",
            "fallback_args": None,
        },
        {
            "name": "asyncpg",
            "package": "asyncpg",
            "description": "High-performance async PostgreSQL driver",
            "fallback_args": ["--no-binary", "asyncpg"],
        },
    ]

    installed = []
    failed = []

    for driver in drivers:
        print(f"\n--- {driver['name']} ---")
        print(f"Description: {driver['description']}")

        if install_driver(
            driver["name"], driver["package"], driver.get("fallback_args")
        ):
            installed.append(driver["name"])
        else:
            failed.append(driver["name"])

    # Summary
    print("\n=== Installation Summary ===")

    if installed:
        print("\n✓ Successfully installed:")
        for name in installed:
            print(f"  - {name}")

    if failed:
        print("\n✗ Failed to install:")
        for name in failed:
            print(f"  - {name}")

    # Recommendations
    print("\n=== Recommendations ===")

    if "psycopg2-binary" in installed or "psycopg2" in installed:
        print("✓ Primary PostgreSQL driver (psycopg2) is available")
    elif "pg8000" in installed:
        print("✓ Fallback PostgreSQL driver (pg8000) is available")
        print("  Note: pg8000 is slower but works without C dependencies")
    else:
        print("⚠ No PostgreSQL drivers could be installed!")
        print("\nTroubleshooting steps:")
        print("1. Install system dependencies (see above)")
        print("2. Try installing in a fresh virtual environment")
        print("3. For Render deployment, use pg8000 as it has no C dependencies")

    if "asyncpg" in installed:
        print("✓ Async PostgreSQL support is available")

    # Test imports
    print("\n=== Testing Imports ===")
    test_imports()


def test_imports():
    """Test if drivers can be imported"""
    drivers_to_test = [
        ("psycopg2", "psycopg2"),
        ("pg8000", "pg8000"),
        ("asyncpg", "asyncpg"),
    ]

    for name, module in drivers_to_test:
        try:
            __import__(module)
            print(f"✓ {name} can be imported")
        except ImportError as e:
            print(f"✗ {name} import failed: {e}")


def generate_requirements_render():
    """Generate requirements.txt optimized for Render deployment"""
    print("\n=== Generating Render-optimized requirements ===")

    render_requirements = """# PostgreSQL drivers for Render
# pg8000 is recommended as it's pure Python and doesn't require system dependencies
pg8000>=1.30.0

# Optional: If you need better performance and can handle C dependencies
# psycopg2-binary>=2.9.0

# Async support (optional)
# asyncpg>=0.29.0

# SQLAlchemy with async support
sqlalchemy>=2.0.0
sqlalchemy[asyncio]>=2.0.0

# Alembic for migrations
alembic>=1.13.0
"""

    with open("requirements-postgres-render.txt", "w") as f:
        f.write(render_requirements)

    print("Created requirements-postgres-render.txt")
    print("\nFor Render deployment, add to your requirements.txt:")
    print("pg8000>=1.30.0  # Pure Python PostgreSQL driver")


if __name__ == "__main__":
    install_postgres_drivers()
    generate_requirements_render()
