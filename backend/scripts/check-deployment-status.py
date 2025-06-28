#!/usr/bin/env python3
"""
Simple script to check if Render deployment is using the latest code
"""

import requests
import json
from datetime import datetime


def check_deployment_status():
    """Check the deployment status and health"""
    try:
        # Check health endpoint
        health_response = requests.get(
            "https://sixfb-backend.onrender.com/health", timeout=10
        )
        health_data = health_response.json()

        print("=== Render Deployment Status ===")
        print(f"Status: {health_data.get('status', 'unknown')}")
        print(f"Version: {health_data.get('version', 'unknown')}")
        print(f"Database: {health_data.get('database', 'unknown')}")
        print(f"Backend Timestamp: {health_data.get('timestamp', 'unknown')}")
        print(f"Check Time: {datetime.now().isoformat()}")

        # Check root endpoint
        root_response = requests.get("https://sixfb-backend.onrender.com/", timeout=10)
        root_data = root_response.json()

        print(f"API Message: {root_data.get('message', 'unknown')}")

        # Try to check a specific endpoint that might show deployment info
        try:
            docs_response = requests.get(
                "https://sixfb-backend.onrender.com/docs", timeout=10
            )
            print(
                f"Docs Endpoint: {'✓ Available' if docs_response.status_code == 200 else '✗ Not Available'}"
            )
        except:
            print("Docs Endpoint: ✗ Error checking")

        print("=== End Status Check ===")

        return health_data.get("status") == "healthy"

    except Exception as e:
        print(f"Error checking deployment status: {str(e)}")
        return False


if __name__ == "__main__":
    is_healthy = check_deployment_status()
    exit(0 if is_healthy else 1)
