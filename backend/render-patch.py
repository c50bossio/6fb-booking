#!/usr/bin/env python3
"""
QUICK PATCH SCRIPT FOR RENDER DEPLOYMENT
Run this in Render Shell to fix import issues
"""

import subprocess
import sys
import os


def run_command(cmd):
    """Run command and print output"""
    print(f"\n>>> Running: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print(f"Errors: {result.stderr}")
        return result.returncode == 0
    except Exception as e:
        print(f"Failed: {e}")
        return False


def main():
    print("🚀 6FB Booking Render Quick Fix Script")
    print("=" * 50)

    # Fix 1: Install missing dependencies
    print("\n1. Installing potentially missing dependencies...")
    run_command("pip install --upgrade pip")
    run_command(
        "pip install uvicorn[standard] fastapi sqlalchemy alembic psycopg2-binary python-jose[cryptography] passlib[bcrypt]"
    )

    # Fix 2: Create __init__.py files if missing
    print("\n2. Creating missing __init__.py files...")
    dirs_to_fix = [
        "api",
        "api/v1",
        "api/v1/endpoints",
        "models",
        "services",
        "utils",
        "middleware",
        "config",
    ]
    for dir_path in dirs_to_fix:
        init_file = os.path.join(dir_path, "__init__.py")
        if not os.path.exists(init_file):
            os.makedirs(dir_path, exist_ok=True)
            with open(init_file, "w") as f:
                f.write("")
            print(f"Created: {init_file}")

    # Fix 3: Check and fix Python path
    print("\n3. Fixing Python path...")
    os.environ["PYTHONPATH"] = "/app:" + os.environ.get("PYTHONPATH", "")
    print(f"PYTHONPATH set to: {os.environ['PYTHONPATH']}")

    # Fix 4: Try to import main module
    print("\n4. Testing imports...")
    try:
        import main

        print("✅ Main module imported successfully!")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Attempting to fix...")

        # Create a minimal main.py if it's corrupted
        minimal_main = """
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="6FB Booking API - Emergency Mode")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "running", "mode": "emergency", "message": "Backend is up!"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "mode": "emergency"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
"""

        # Backup original and create emergency version
        if os.path.exists("main.py"):
            run_command("cp main.py main.py.backup")

        with open("main_emergency.py", "w") as f:
            f.write(minimal_main)
        print("Created emergency main file: main_emergency.py")

    # Fix 5: Database connection test
    print("\n5. Testing database connection...")
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        print(f"Database URL found: {db_url[:20]}...")
        # Convert postgres:// to postgresql:// if needed
        if db_url.startswith("postgres://"):
            os.environ["DATABASE_URL"] = db_url.replace(
                "postgres://", "postgresql://", 1
            )
            print("Fixed database URL format")
    else:
        print("⚠️  No DATABASE_URL found!")

    # Fix 6: Start server with multiple fallbacks
    print("\n6. Attempting to start server...")
    print("\nTry these commands in order:")
    print("1. python main.py")
    print("2. uvicorn main:app --host 0.0.0.0 --port $PORT")
    print("3. python main_emergency.py")
    print(
        "4. gunicorn main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT"
    )

    print("\n✅ Patch script completed!")
    print("=" * 50)


if __name__ == "__main__":
    main()
