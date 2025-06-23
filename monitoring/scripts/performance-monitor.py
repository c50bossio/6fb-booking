#!/usr/bin/env python3
"""
Performance monitoring script for 6FB Booking Platform
Tracks API response times and frontend load performance
"""

import requests
import json
import time
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
from pathlib import Path
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import psutil
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("/var/log/6fb-monitoring/performance.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# API endpoints to monitor
API_ENDPOINTS = [
    {
        "name": "health_check",
        "url": "https://sixfb-backend.onrender.com/health",
        "method": "GET",
        "expected_time": 200,  # ms
    },
    {
        "name": "services_list",
        "url": "https://sixfb-backend.onrender.com/api/v1/services",
        "method": "GET",
        "expected_time": 500,
    },
    {
        "name": "appointments_list",
        "url": "https://sixfb-backend.onrender.com/api/v1/appointments",
        "method": "GET",
        "headers": {"Authorization": "Bearer ${TOKEN}"},
        "expected_time": 1000,
    },
    {
        "name": "analytics_dashboard",
        "url": "https://sixfb-backend.onrender.com/api/v1/analytics/dashboard",
        "method": "GET",
        "headers": {"Authorization": "Bearer ${TOKEN}"},
        "expected_time": 2000,
    },
]

# Frontend pages to monitor
FRONTEND_PAGES = [
    {
        "name": "homepage",
        "url": "/",
        "expected_load_time": 3000,  # ms
    },
    {
        "name": "booking_page",
        "url": "/book",
        "expected_load_time": 2000,
    },
    {
        "name": "login_page",
        "url": "/login",
        "expected_load_time": 1500,
    },
    {
        "name": "dashboard",
        "url": "/dashboard",
        "expected_load_time": 2500,
    },
]


class PerformanceMonitor:
    def __init__(self):
        self.metrics_dir = Path("/var/log/6fb-monitoring/metrics")
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        self.api_metrics = []
        self.frontend_metrics = []
        self.auth_token = None

    def get_auth_token(self) -> Optional[str]:
        """Get authentication token for API requests"""
        if self.auth_token:
            return self.auth_token

        try:
            # Try to authenticate with monitoring credentials
            response = requests.post(
                "https://sixfb-backend.onrender.com/api/v1/auth/login",
                json={
                    "email": os.getenv("MONITORING_EMAIL", "monitoring@6fb.com"),
                    "password": os.getenv("MONITORING_PASSWORD", ""),
                },
                timeout=10,
            )

            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                return self.auth_token

        except Exception as e:
            logger.error(f"Failed to get auth token: {e}")

        return None

    async def measure_api_endpoint(
        self, session: aiohttp.ClientSession, endpoint: Dict
    ) -> Dict:
        """Measure API endpoint performance"""
        headers = endpoint.get("headers", {}).copy()

        # Replace token placeholder
        if "${TOKEN}" in str(headers):
            token = self.get_auth_token()
            if token:
                headers["Authorization"] = f"Bearer {token}"
            else:
                headers.pop("Authorization", None)

        measurements = []

        # Take multiple measurements
        for i in range(5):
            start_time = time.time()

            try:
                async with session.request(
                    endpoint["method"],
                    endpoint["url"],
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    await response.text()  # Ensure response is fully read
                    response_time = (time.time() - start_time) * 1000

                    measurements.append(
                        {
                            "response_time": response_time,
                            "status_code": response.status,
                            "success": 200 <= response.status < 300,
                        }
                    )

            except asyncio.TimeoutError:
                measurements.append(
                    {
                        "response_time": 30000,  # Timeout value
                        "status_code": 0,
                        "success": False,
                        "error": "Timeout",
                    }
                )
            except Exception as e:
                measurements.append(
                    {
                        "response_time": None,
                        "status_code": 0,
                        "success": False,
                        "error": str(e),
                    }
                )

            if i < 4:  # Don't sleep after last measurement
                await asyncio.sleep(1)

        # Calculate statistics
        successful_times = [
            m["response_time"]
            for m in measurements
            if m["success"] and m["response_time"]
        ]

        result = {
            "endpoint": endpoint["name"],
            "url": endpoint["url"],
            "timestamp": datetime.utcnow().isoformat(),
            "measurements": measurements,
            "statistics": {
                "min": min(successful_times) if successful_times else None,
                "max": max(successful_times) if successful_times else None,
                "mean": statistics.mean(successful_times) if successful_times else None,
                "median": (
                    statistics.median(successful_times) if successful_times else None
                ),
                "p95": (
                    statistics.quantiles(successful_times, n=20)[18]
                    if len(successful_times) > 1
                    else None
                ),
                "success_rate": sum(1 for m in measurements if m["success"])
                / len(measurements)
                * 100,
            },
            "expected_time": endpoint["expected_time"],
            "within_sla": (
                (statistics.mean(successful_times) <= endpoint["expected_time"])
                if successful_times
                else False
            ),
        }

        return result

    async def measure_frontend_performance(
        self, session: aiohttp.ClientSession, page: Dict
    ) -> Dict:
        """Measure frontend page load performance"""
        frontend_url = os.getenv("FRONTEND_URL", "https://6fb-booking.vercel.app")
        full_url = f"{frontend_url}{page['url']}"

        measurements = []

        for i in range(3):  # Fewer measurements for frontend
            start_time = time.time()

            try:
                # Measure initial HTML response
                async with session.get(
                    full_url, timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    html_content = await response.text()
                    html_load_time = (time.time() - start_time) * 1000

                    # Simple check for page completeness
                    is_complete = "</html>" in html_content.lower()

                    measurements.append(
                        {
                            "html_load_time": html_load_time,
                            "status_code": response.status,
                            "page_size": len(html_content),
                            "is_complete": is_complete,
                            "success": response.status == 200 and is_complete,
                        }
                    )

            except Exception as e:
                measurements.append(
                    {
                        "html_load_time": None,
                        "status_code": 0,
                        "success": False,
                        "error": str(e),
                    }
                )

            if i < 2:
                await asyncio.sleep(2)

        # Calculate statistics
        successful_times = [
            m["html_load_time"]
            for m in measurements
            if m["success"] and m["html_load_time"]
        ]

        result = {
            "page": page["name"],
            "url": full_url,
            "timestamp": datetime.utcnow().isoformat(),
            "measurements": measurements,
            "statistics": {
                "min": min(successful_times) if successful_times else None,
                "max": max(successful_times) if successful_times else None,
                "mean": statistics.mean(successful_times) if successful_times else None,
                "success_rate": sum(1 for m in measurements if m["success"])
                / len(measurements)
                * 100,
            },
            "expected_load_time": page["expected_load_time"],
            "within_sla": (
                (statistics.mean(successful_times) <= page["expected_load_time"])
                if successful_times
                else False
            ),
        }

        return result

    async def run_performance_tests(self):
        """Run all performance tests"""
        async with aiohttp.ClientSession() as session:
            # Test API endpoints
            api_tasks = [
                self.measure_api_endpoint(session, endpoint)
                for endpoint in API_ENDPOINTS
            ]
            api_results = await asyncio.gather(*api_tasks)

            # Test frontend pages
            frontend_tasks = [
                self.measure_frontend_performance(session, page)
                for page in FRONTEND_PAGES
            ]
            frontend_results = await asyncio.gather(*frontend_tasks)

            return {"api_results": api_results, "frontend_results": frontend_results}

    def save_metrics(self, metrics: Dict):
        """Save metrics to file"""
        timestamp = datetime.utcnow()

        # Save detailed metrics
        detailed_file = (
            self.metrics_dir / f"performance_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(detailed_file, "w") as f:
            json.dump(metrics, f, indent=2)

        # Update rolling metrics file
        rolling_file = self.metrics_dir / "rolling_performance.json"
        rolling_data = {"api": [], "frontend": []}

        if rolling_file.exists():
            try:
                with open(rolling_file, "r") as f:
                    rolling_data = json.load(f)
            except:
                pass

        # Add new metrics
        rolling_data["api"].extend(metrics["api_results"])
        rolling_data["frontend"].extend(metrics["frontend_results"])

        # Keep only last 24 hours
        cutoff = (timestamp - timedelta(hours=24)).isoformat()
        rolling_data["api"] = [
            m for m in rolling_data["api"] if m["timestamp"] > cutoff
        ]
        rolling_data["frontend"] = [
            m for m in rolling_data["frontend"] if m["timestamp"] > cutoff
        ]

        with open(rolling_file, "w") as f:
            json.dump(rolling_data, f, indent=2)

    def generate_summary(self, metrics: Dict) -> Dict:
        """Generate performance summary"""
        api_summary = {
            "total_endpoints": len(metrics["api_results"]),
            "within_sla": sum(1 for r in metrics["api_results"] if r["within_sla"]),
            "average_response_times": {},
            "slowest_endpoints": [],
        }

        for result in metrics["api_results"]:
            if result["statistics"]["mean"]:
                api_summary["average_response_times"][result["endpoint"]] = {
                    "mean": round(result["statistics"]["mean"], 2),
                    "p95": (
                        round(result["statistics"]["p95"], 2)
                        if result["statistics"]["p95"]
                        else None
                    ),
                    "within_sla": result["within_sla"],
                }

                if not result["within_sla"]:
                    api_summary["slowest_endpoints"].append(
                        {
                            "endpoint": result["endpoint"],
                            "mean_time": round(result["statistics"]["mean"], 2),
                            "expected_time": result["expected_time"],
                        }
                    )

        frontend_summary = {
            "total_pages": len(metrics["frontend_results"]),
            "within_sla": sum(
                1 for r in metrics["frontend_results"] if r["within_sla"]
            ),
            "average_load_times": {},
        }

        for result in metrics["frontend_results"]:
            if result["statistics"]["mean"]:
                frontend_summary["average_load_times"][result["page"]] = {
                    "mean": round(result["statistics"]["mean"], 2),
                    "within_sla": result["within_sla"],
                }

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "api_performance": api_summary,
            "frontend_performance": frontend_summary,
            "overall_health": {
                "api_sla_compliance": (
                    api_summary["within_sla"] / api_summary["total_endpoints"] * 100
                ),
                "frontend_sla_compliance": (
                    frontend_summary["within_sla"]
                    / frontend_summary["total_pages"]
                    * 100
                ),
            },
        }


async def main():
    """Main monitoring function"""
    monitor = PerformanceMonitor()

    logger.info("Starting performance monitoring...")

    while True:
        try:
            # Run performance tests
            metrics = await monitor.run_performance_tests()

            # Save metrics
            monitor.save_metrics(metrics)

            # Generate and log summary
            summary = monitor.generate_summary(metrics)
            logger.info(
                f"Performance Summary: API SLA {summary['overall_health']['api_sla_compliance']:.1f}%, "
                f"Frontend SLA {summary['overall_health']['frontend_sla_compliance']:.1f}%"
            )

            # Log any slow endpoints
            for slow in summary["api_performance"]["slowest_endpoints"]:
                logger.warning(
                    f"Slow endpoint: {slow['endpoint']} - "
                    f"{slow['mean_time']}ms (expected: {slow['expected_time']}ms)"
                )

            # Wait before next run (15 minutes)
            await asyncio.sleep(900)

        except KeyboardInterrupt:
            logger.info("Performance monitoring stopped by user")
            break
        except Exception as e:
            logger.error(f"Performance monitoring error: {e}")
            await asyncio.sleep(300)  # Wait 5 minutes on error


if __name__ == "__main__":
    asyncio.run(main())
