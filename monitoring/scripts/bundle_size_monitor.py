#!/usr/bin/env python3
"""
Bundle Size Monitor for 6FB Booking Platform
Monitors frontend bundle sizes to ensure optimizations persist
"""

import json
import logging
import os
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import re
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("/Users/bossio/6fb-booking/logs/bundle_monitor.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


@dataclass
class BundleMetrics:
    name: str
    size_bytes: int
    size_kb: float
    gzipped_size_bytes: int
    gzipped_size_kb: float
    timestamp: str


@dataclass
class BundleComparison:
    name: str
    current_size: int
    baseline_size: int
    size_change_bytes: int
    size_change_percent: float
    status: str  # 'improved', 'stable', 'warning', 'critical'


class BundleSizeMonitor:
    def __init__(self):
        self.base_dir = Path("/Users/bossio/6fb-booking")
        self.frontend_dir = self.base_dir / "frontend"
        self.monitoring_dir = self.base_dir / "monitoring"
        self.logs_dir = self.base_dir / "logs"
        self.bundle_data_dir = self.monitoring_dir / "bundle_data"

        # Create directories
        for dir_path in [self.monitoring_dir, self.logs_dir, self.bundle_data_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

        # Bundle size thresholds (in KB)
        self.thresholds = {
            "warning_increase": 20,  # 20% increase triggers warning
            "critical_increase": 50,  # 50% increase triggers critical alert
            "max_main_bundle": 300,  # 300KB max for main bundle
            "max_vendor_bundle": 1000,  # 1MB max for vendor bundle
            "max_total_js": 1500,  # 1.5MB max for all JS
        }

        self.baseline_metrics = self._load_baseline_metrics()
        self.optimization_targets = {
            "main": {"target": 200, "description": "Main application bundle"},
            "vendor": {"target": 800, "description": "Third-party dependencies"},
            "chunks": {"target": 100, "description": "Code-split chunks"},
        }

    def _load_baseline_metrics(self) -> Dict:
        """Load baseline bundle metrics"""
        baseline_file = self.bundle_data_dir / "baseline_bundle_metrics.json"
        if baseline_file.exists():
            try:
                with open(baseline_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load baseline metrics: {e}")

        # Default baseline - should be updated after first optimization
        return {
            "bundles": {
                "main": 250000,  # 250KB
                "vendor": 900000,  # 900KB
                "polyfills": 50000,  # 50KB
            },
            "total_js": 1200000,  # 1.2MB
            "timestamp": datetime.utcnow().isoformat(),
        }

    def save_baseline_metrics(self, metrics: Dict):
        """Save current metrics as baseline"""
        baseline_file = self.bundle_data_dir / "baseline_bundle_metrics.json"
        with open(baseline_file, "w") as f:
            json.dump(metrics, f, indent=2)
        logger.info(f"Baseline metrics saved to {baseline_file}")

    async def build_and_analyze(self) -> Dict:
        """Build frontend and analyze bundle sizes"""
        logger.info("Building frontend for bundle analysis...")

        try:
            # Clean previous build
            build_dir = self.frontend_dir / ".next"
            if build_dir.exists():
                subprocess.run(["rm", "-rf", str(build_dir)], check=True)

            # Build with bundle analysis
            env = os.environ.copy()
            env["ANALYZE"] = "true"

            build_result = subprocess.run(
                ["npm", "run", "build"],
                cwd=str(self.frontend_dir),
                capture_output=True,
                text=True,
                timeout=300,  # 5 minutes timeout
                env=env,
            )

            if build_result.returncode != 0:
                logger.error(f"Build failed: {build_result.stderr}")
                return {"error": "Build failed", "stderr": build_result.stderr}

            # Parse build output for bundle information
            bundle_info = self._parse_build_output(build_result.stdout)

            # Get detailed file sizes
            file_sizes = self._analyze_build_files()

            return {
                "timestamp": datetime.utcnow().isoformat(),
                "build_success": True,
                "bundle_info": bundle_info,
                "file_sizes": file_sizes,
                "total_js_size": sum(
                    f["size"] for f in file_sizes if f["name"].endswith(".js")
                ),
                "total_css_size": sum(
                    f["size"] for f in file_sizes if f["name"].endswith(".css")
                ),
            }

        except subprocess.TimeoutExpired:
            logger.error("Build timed out after 5 minutes")
            return {"error": "Build timeout"}
        except Exception as e:
            logger.error(f"Build and analysis failed: {e}")
            return {"error": str(e)}

    def _parse_build_output(self, build_output: str) -> Dict:
        """Parse Next.js build output for bundle information"""
        bundle_info = {"pages": {}, "static_files": {}, "chunks": {}}

        lines = build_output.split("\n")
        parsing_section = None

        for line in lines:
            line = line.strip()

            # Detect sections
            if "Page" in line and "Size" in line:
                parsing_section = "pages"
                continue
            elif "Static files" in line:
                parsing_section = "static"
                continue
            elif line.startswith("┌") or line.startswith("├") or line.startswith("└"):
                continue

            # Parse bundle information
            if parsing_section and line:
                # Extract size information using regex
                size_match = re.search(r"(\d+(?:\.\d+)?)\s*(B|kB|MB)", line)
                if size_match:
                    size_value = float(size_match.group(1))
                    size_unit = size_match.group(2)

                    # Convert to bytes
                    if size_unit == "kB":
                        size_bytes = int(size_value * 1024)
                    elif size_unit == "MB":
                        size_bytes = int(size_value * 1024 * 1024)
                    else:
                        size_bytes = int(size_value)

                    # Extract filename/path
                    if parsing_section == "pages":
                        path_match = re.search(r"[○●λ]\s+([^\s]+)", line)
                        if path_match:
                            bundle_info["pages"][path_match.group(1)] = size_bytes
                    elif parsing_section == "static":
                        # Parse static file info
                        if ".js" in line or ".css" in line:
                            file_match = re.search(r"([^\s]+\.(js|css))", line)
                            if file_match:
                                bundle_info["static_files"][
                                    file_match.group(1)
                                ] = size_bytes

        return bundle_info

    def _analyze_build_files(self) -> List[Dict]:
        """Analyze actual build files in .next directory"""
        build_dir = self.frontend_dir / ".next"
        static_dir = build_dir / "static"

        file_sizes = []

        if not static_dir.exists():
            logger.warning("Static build directory not found")
            return file_sizes

        # Analyze JavaScript bundles
        js_dirs = [
            static_dir / "chunks",
            static_dir / "chunks" / "pages",
        ]

        for js_dir in js_dirs:
            if js_dir.exists():
                for js_file in js_dir.glob("*.js"):
                    size = js_file.stat().st_size
                    file_sizes.append(
                        {
                            "name": js_file.name,
                            "path": str(js_file.relative_to(static_dir)),
                            "size": size,
                            "size_kb": size / 1024,
                            "type": "javascript",
                        }
                    )

        # Analyze CSS files
        css_dir = static_dir / "css"
        if css_dir.exists():
            for css_file in css_dir.glob("*.css"):
                size = css_file.stat().st_size
                file_sizes.append(
                    {
                        "name": css_file.name,
                        "path": str(css_file.relative_to(static_dir)),
                        "size": size,
                        "size_kb": size / 1024,
                        "type": "css",
                    }
                )

        # Sort by size descending
        file_sizes.sort(key=lambda x: x["size"], reverse=True)

        return file_sizes

    def compare_with_baseline(self, current_metrics: Dict) -> Dict:
        """Compare current metrics with baseline"""
        comparison = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": "stable",
            "comparisons": [],
            "recommendations": [],
            "alerts": [],
        }

        if not current_metrics.get("build_success"):
            comparison["overall_status"] = "error"
            comparison["alerts"].append(
                {
                    "type": "build_error",
                    "message": f"Build failed: {current_metrics.get('error', 'Unknown error')}",
                }
            )
            return comparison

        current_total_js = current_metrics.get("total_js_size", 0)
        baseline_total_js = self.baseline_metrics.get("total_js", 0)

        # Compare total JS size
        if baseline_total_js > 0:
            js_change_percent = (
                (current_total_js - baseline_total_js) / baseline_total_js
            ) * 100

            js_status = "stable"
            if js_change_percent > self.thresholds["critical_increase"]:
                js_status = "critical"
                comparison["overall_status"] = "critical"
            elif js_change_percent > self.thresholds["warning_increase"]:
                js_status = "warning"
                if comparison["overall_status"] == "stable":
                    comparison["overall_status"] = "warning"
            elif js_change_percent < -10:  # 10% reduction is improvement
                js_status = "improved"

            comparison["comparisons"].append(
                {
                    "name": "total_js",
                    "current_size": current_total_js,
                    "baseline_size": baseline_total_js,
                    "change_bytes": current_total_js - baseline_total_js,
                    "change_percent": js_change_percent,
                    "status": js_status,
                }
            )

            if js_status == "critical":
                comparison["alerts"].append(
                    {
                        "type": "bundle_size_critical",
                        "message": f"Total JS bundle size increased by {js_change_percent:.1f}% ({(current_total_js - baseline_total_js) / 1024:.0f}KB)",
                    }
                )
            elif js_status == "warning":
                comparison["alerts"].append(
                    {
                        "type": "bundle_size_warning",
                        "message": f"Total JS bundle size increased by {js_change_percent:.1f}% ({(current_total_js - baseline_total_js) / 1024:.0f}KB)",
                    }
                )

        # Compare individual bundles
        baseline_bundles = self.baseline_metrics.get("bundles", {})
        current_files = current_metrics.get("file_sizes", [])

        # Group current files by type
        current_bundles = {}
        for file_info in current_files:
            if file_info["type"] == "javascript":
                # Categorize JS files
                name = file_info["name"]
                if "vendor" in name or "node_modules" in name:
                    bundle_type = "vendor"
                elif "main" in name or "app" in name:
                    bundle_type = "main"
                elif "polyfill" in name:
                    bundle_type = "polyfills"
                else:
                    bundle_type = "chunks"

                if bundle_type not in current_bundles:
                    current_bundles[bundle_type] = 0
                current_bundles[bundle_type] += file_info["size"]

        # Compare each bundle type
        for bundle_type, baseline_size in baseline_bundles.items():
            current_size = current_bundles.get(bundle_type, 0)

            if baseline_size > 0:
                change_percent = ((current_size - baseline_size) / baseline_size) * 100

                status = "stable"
                if change_percent > self.thresholds["critical_increase"]:
                    status = "critical"
                elif change_percent > self.thresholds["warning_increase"]:
                    status = "warning"
                elif change_percent < -10:
                    status = "improved"

                comparison["comparisons"].append(
                    {
                        "name": bundle_type,
                        "current_size": current_size,
                        "baseline_size": baseline_size,
                        "change_bytes": current_size - baseline_size,
                        "change_percent": change_percent,
                        "status": status,
                    }
                )

        # Generate recommendations
        if current_total_js > self.thresholds["max_total_js"] * 1024:
            comparison["recommendations"].append(
                f"Total JS size ({current_total_js / 1024:.0f}KB) exceeds recommended maximum ({self.thresholds['max_total_js']}KB). Consider code splitting and tree shaking."
            )

        # Check for large individual files
        large_files = [f for f in current_files if f["size"] > 200 * 1024]  # > 200KB
        if large_files:
            comparison["recommendations"].append(
                f"Found {len(large_files)} large files (>200KB). Consider splitting: {', '.join([f['name'] for f in large_files[:3]])}"
            )

        return comparison

    def save_metrics(self, metrics: Dict, comparison: Dict):
        """Save bundle metrics and comparison results"""
        timestamp = metrics.get("timestamp", datetime.utcnow().isoformat()).replace(
            ":", "-"
        )

        # Save detailed metrics
        metrics_file = self.bundle_data_dir / f"bundle_metrics_{timestamp}.json"
        with open(metrics_file, "w") as f:
            json.dump(metrics, f, indent=2)

        # Save comparison results
        comparison_file = self.bundle_data_dir / f"bundle_comparison_{timestamp}.json"
        with open(comparison_file, "w") as f:
            json.dump(comparison, f, indent=2)

        # Update rolling data
        rolling_file = self.bundle_data_dir / "rolling_bundle_data.json"
        rolling_data = {"metrics": [], "comparisons": []}

        if rolling_file.exists():
            try:
                with open(rolling_file, "r") as f:
                    rolling_data = json.load(f)
            except:
                pass

        # Add new data
        rolling_data["metrics"].append(metrics)
        rolling_data["comparisons"].append(comparison)

        # Keep only last 30 days
        cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
        rolling_data["metrics"] = [
            m for m in rolling_data["metrics"] if m.get("timestamp", "") > cutoff
        ]
        rolling_data["comparisons"] = [
            c for c in rolling_data["comparisons"] if c.get("timestamp", "") > cutoff
        ]

        with open(rolling_file, "w") as f:
            json.dump(rolling_data, f, indent=2)

        logger.info(f"Bundle metrics saved to {metrics_file}")

    def generate_optimization_report(self, metrics: Dict, comparison: Dict) -> str:
        """Generate bundle optimization report"""
        report = f"""
# Bundle Size Monitoring Report
Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

## Current Bundle Status: {comparison['overall_status'].upper()}

"""

        if not metrics.get("build_success"):
            report += (
                f"❌ **Build Failed**: {metrics.get('error', 'Unknown error')}\n\n"
            )
            return report

        # Current sizes
        total_js_kb = metrics.get("total_js_size", 0) / 1024
        total_css_kb = metrics.get("total_css_size", 0) / 1024

        report += f"""
## Current Bundle Sizes
- **Total JavaScript**: {total_js_kb:.1f}KB
- **Total CSS**: {total_css_kb:.1f}KB
- **Combined**: {(total_js_kb + total_css_kb):.1f}KB

"""

        # Comparisons with baseline
        if comparison["comparisons"]:
            report += "## Changes from Baseline\n\n"
            for comp in comparison["comparisons"]:
                status_emoji = {
                    "improved": "🟢",
                    "stable": "🔵",
                    "warning": "🟡",
                    "critical": "🔴",
                }.get(comp["status"], "⚪")

                change_kb = comp["change_bytes"] / 1024
                report += f"- {status_emoji} **{comp['name']}**: {comp['current_size'] / 1024:.1f}KB "
                report += f"({change_kb:+.1f}KB, {comp['change_percent']:+.1f}%)\n"

            report += "\n"

        # Alerts
        if comparison["alerts"]:
            report += "## 🚨 Alerts\n\n"
            for alert in comparison["alerts"]:
                report += f"- **{alert['type']}**: {alert['message']}\n"
            report += "\n"

        # Top 10 largest files
        if metrics.get("file_sizes"):
            report += "## Largest Bundle Files\n\n"
            for i, file_info in enumerate(metrics["file_sizes"][:10], 1):
                report += f"{i}. **{file_info['name']}** - {file_info['size_kb']:.1f}KB ({file_info['type']})\n"
            report += "\n"

        # Recommendations
        if comparison["recommendations"]:
            report += "## 💡 Optimization Recommendations\n\n"
            for rec in comparison["recommendations"]:
                report += f"- {rec}\n"
            report += "\n"

        # Optimization targets
        report += "## 🎯 Optimization Targets\n\n"
        for target_name, target_info in self.optimization_targets.items():
            report += f"- **{target_name}**: Target ≤{target_info['target']}KB - {target_info['description']}\n"

        return report

    async def run_bundle_analysis(self) -> Dict:
        """Run complete bundle size analysis"""
        logger.info("Starting bundle size analysis...")

        try:
            # Build and analyze
            metrics = await self.build_and_analyze()

            # Compare with baseline
            comparison = self.compare_with_baseline(metrics)

            # Save results
            self.save_metrics(metrics, comparison)

            # Generate report
            report = self.generate_optimization_report(metrics, comparison)

            # Save report
            report_file = self.bundle_data_dir / "latest_bundle_report.md"
            with open(report_file, "w") as f:
                f.write(report)

            # Log summary
            logger.info(
                f"Bundle analysis complete - Status: {comparison['overall_status']}"
            )

            if metrics.get("build_success"):
                total_js_kb = metrics.get("total_js_size", 0) / 1024
                logger.info(f"Total JS bundle size: {total_js_kb:.1f}KB")

                if comparison["alerts"]:
                    logger.warning(
                        f"Found {len(comparison['alerts'])} bundle size alerts"
                    )
                    for alert in comparison["alerts"]:
                        logger.warning(f"- {alert['message']}")

            return {
                "metrics": metrics,
                "comparison": comparison,
                "report": report,
                "report_file": str(report_file),
            }

        except Exception as e:
            logger.error(f"Bundle analysis failed: {e}")
            raise


async def main():
    """Main bundle monitoring function"""
    monitor = BundleSizeMonitor()

    try:
        results = await monitor.run_bundle_analysis()

        # Print report
        print(results["report"])

        # Exit with appropriate code
        comparison = results["comparison"]
        if comparison["overall_status"] == "critical":
            exit(1)
        elif comparison["overall_status"] == "warning":
            exit(2)
        else:
            exit(0)

    except Exception as e:
        logger.error(f"Bundle monitoring failed: {e}")
        exit(3)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
