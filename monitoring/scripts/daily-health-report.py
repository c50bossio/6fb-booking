#!/usr/bin/env python3
"""
Daily health report generator for 6FB Booking Platform
Generates comprehensive daily reports on system health and performance
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import statistics
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from io import BytesIO
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class DailyHealthReport:
    def __init__(self):
        self.metrics_dir = Path("/var/log/6fb-monitoring/metrics")
        self.errors_dir = Path("/var/log/6fb-monitoring/errors")
        self.reports_dir = Path("/var/log/6fb-monitoring/reports")
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def generate_report(self, date: datetime = None) -> Dict:
        """Generate daily health report"""
        if date is None:
            date = datetime.utcnow().date()

        logger.info(f"Generating health report for {date}")

        report = {
            "date": date.isoformat(),
            "generated_at": datetime.utcnow().isoformat(),
            "executive_summary": {},
            "uptime_metrics": self.calculate_uptime_metrics(date),
            "performance_metrics": self.calculate_performance_metrics(date),
            "error_summary": self.calculate_error_summary(date),
            "deployment_summary": self.get_deployment_summary(date),
            "recommendations": [],
        }

        # Generate executive summary
        report["executive_summary"] = self.generate_executive_summary(report)

        # Generate recommendations
        report["recommendations"] = self.generate_recommendations(report)

        return report

    def calculate_uptime_metrics(self, date: datetime.date) -> Dict:
        """Calculate uptime metrics for the day"""
        uptime_data = {
            "overall_uptime": 0,
            "service_uptime": {},
            "total_downtime_minutes": 0,
            "incidents": [],
        }

        # Load uptime logs
        try:
            metrics_file = self.metrics_dir.parent / "metrics.json"
            if metrics_file.exists():
                with open(metrics_file, "r") as f:
                    data = json.load(f)

                # Calculate per-service uptime
                for service, status in data.get("status", {}).items():
                    # Simple calculation based on failure count
                    failures = data.get("failures", {}).get(service, 0)
                    if failures == 0:
                        uptime = 100.0
                    else:
                        # Assume each failure represents 5 minutes of downtime
                        downtime_minutes = failures * 5
                        uptime = max(
                            0, 100 - (downtime_minutes / 1440 * 100)
                        )  # 1440 minutes in a day

                    uptime_data["service_uptime"][service] = {
                        "uptime_percentage": round(uptime, 2),
                        "downtime_minutes": failures * 5,
                        "failure_count": failures,
                    }

                    uptime_data["total_downtime_minutes"] += failures * 5

                # Calculate overall uptime
                if uptime_data["service_uptime"]:
                    uptime_values = [
                        s["uptime_percentage"]
                        for s in uptime_data["service_uptime"].values()
                    ]
                    uptime_data["overall_uptime"] = round(
                        statistics.mean(uptime_values), 2
                    )

        except Exception as e:
            logger.error(f"Failed to calculate uptime metrics: {e}")

        return uptime_data

    def calculate_performance_metrics(self, date: datetime.date) -> Dict:
        """Calculate performance metrics for the day"""
        performance_data = {
            "api_performance": {
                "average_response_time": 0,
                "p95_response_time": 0,
                "slowest_endpoints": [],
                "sla_compliance": 0,
            },
            "frontend_performance": {
                "average_load_time": 0,
                "p95_load_time": 0,
                "slowest_pages": [],
                "sla_compliance": 0,
            },
        }

        try:
            # Load performance metrics
            rolling_file = self.metrics_dir / "rolling_performance.json"
            if rolling_file.exists():
                with open(rolling_file, "r") as f:
                    data = json.load(f)

                # Process API metrics
                api_times = []
                endpoint_times = {}

                for result in data.get("api", []):
                    if result.get("statistics", {}).get("mean"):
                        mean_time = result["statistics"]["mean"]
                        api_times.append(mean_time)

                        endpoint = result.get("endpoint", "unknown")
                        if endpoint not in endpoint_times:
                            endpoint_times[endpoint] = []
                        endpoint_times[endpoint].append(mean_time)

                if api_times:
                    performance_data["api_performance"]["average_response_time"] = (
                        round(statistics.mean(api_times), 2)
                    )
                    performance_data["api_performance"]["p95_response_time"] = (
                        round(statistics.quantiles(api_times, n=20)[18], 2)
                        if len(api_times) > 1
                        else api_times[0]
                    )

                    # Find slowest endpoints
                    slowest = sorted(
                        [
                            (ep, statistics.mean(times))
                            for ep, times in endpoint_times.items()
                        ],
                        key=lambda x: x[1],
                        reverse=True,
                    )[:3]

                    performance_data["api_performance"]["slowest_endpoints"] = [
                        {"endpoint": ep, "avg_time": round(time, 2)}
                        for ep, time in slowest
                    ]

                    # Calculate SLA compliance (assuming 1000ms SLA)
                    within_sla = sum(1 for t in api_times if t <= 1000)
                    performance_data["api_performance"]["sla_compliance"] = round(
                        within_sla / len(api_times) * 100, 2
                    )

                # Process frontend metrics
                frontend_times = []
                page_times = {}

                for result in data.get("frontend", []):
                    if result.get("statistics", {}).get("mean"):
                        mean_time = result["statistics"]["mean"]
                        frontend_times.append(mean_time)

                        page = result.get("page", "unknown")
                        if page not in page_times:
                            page_times[page] = []
                        page_times[page].append(mean_time)

                if frontend_times:
                    performance_data["frontend_performance"]["average_load_time"] = (
                        round(statistics.mean(frontend_times), 2)
                    )
                    performance_data["frontend_performance"]["p95_load_time"] = (
                        round(statistics.quantiles(frontend_times, n=20)[18], 2)
                        if len(frontend_times) > 1
                        else frontend_times[0]
                    )

                    # Find slowest pages
                    slowest = sorted(
                        [
                            (page, statistics.mean(times))
                            for page, times in page_times.items()
                        ],
                        key=lambda x: x[1],
                        reverse=True,
                    )[:3]

                    performance_data["frontend_performance"]["slowest_pages"] = [
                        {"page": page, "avg_time": round(time, 2)}
                        for page, time in slowest
                    ]

                    # Calculate SLA compliance (assuming 3000ms SLA)
                    within_sla = sum(1 for t in frontend_times if t <= 3000)
                    performance_data["frontend_performance"]["sla_compliance"] = round(
                        within_sla / len(frontend_times) * 100, 2
                    )

        except Exception as e:
            logger.error(f"Failed to calculate performance metrics: {e}")

        return performance_data

    def calculate_error_summary(self, date: datetime.date) -> Dict:
        """Calculate error summary for the day"""
        error_summary = {
            "total_errors": 0,
            "critical_errors": 0,
            "errors_by_service": {},
            "errors_by_type": {},
            "top_errors": [],
        }

        try:
            # Load rolling errors
            rolling_file = self.errors_dir / "rolling_errors.json"
            if rolling_file.exists():
                with open(rolling_file, "r") as f:
                    data = json.load(f)

                # Count errors by service and type
                service_counts = {}
                type_counts = {}
                error_list = []

                for error in data.get("errors", []):
                    count = error.get("count", 1)
                    error_summary["total_errors"] += count

                    if error.get("level") == "CRITICAL":
                        error_summary["critical_errors"] += count

                    service = error.get("service", "unknown")
                    service_counts[service] = service_counts.get(service, 0) + count

                    error_type = error.get("error_type", "unknown")
                    type_counts[error_type] = type_counts.get(error_type, 0) + count

                    error_list.append(
                        {
                            "message": error.get("message", ""),
                            "count": count,
                            "service": service,
                            "type": error_type,
                        }
                    )

                error_summary["errors_by_service"] = service_counts
                error_summary["errors_by_type"] = type_counts

                # Get top errors
                error_summary["top_errors"] = sorted(
                    error_list, key=lambda x: x["count"], reverse=True
                )[:5]

        except Exception as e:
            logger.error(f"Failed to calculate error summary: {e}")

        return error_summary

    def get_deployment_summary(self, date: datetime.date) -> Dict:
        """Get deployment summary for the day"""
        deployment_summary = {
            "total_deployments": 0,
            "successful_deployments": 0,
            "failed_deployments": 0,
            "deployments_by_service": {},
        }

        try:
            deployment_file = Path("/var/log/6fb-monitoring/deployment_state.json")
            if deployment_file.exists():
                with open(deployment_file, "r") as f:
                    data = json.load(f)

                start_of_day = datetime.combine(date, datetime.min.time())
                end_of_day = start_of_day + timedelta(days=1)

                for deployment in data.get("history", []):
                    detected_at = datetime.fromisoformat(
                        deployment.get("detected_at", "")
                    )

                    if start_of_day <= detected_at < end_of_day:
                        deployment_summary["total_deployments"] += 1

                        service = deployment.get("service", "unknown")
                        if service not in deployment_summary["deployments_by_service"]:
                            deployment_summary["deployments_by_service"][service] = {
                                "total": 0,
                                "successful": 0,
                                "failed": 0,
                            }

                        deployment_summary["deployments_by_service"][service][
                            "total"
                        ] += 1

                        if deployment.get("health_check_passed", True):
                            deployment_summary["successful_deployments"] += 1
                            deployment_summary["deployments_by_service"][service][
                                "successful"
                            ] += 1
                        else:
                            deployment_summary["failed_deployments"] += 1
                            deployment_summary["deployments_by_service"][service][
                                "failed"
                            ] += 1

        except Exception as e:
            logger.error(f"Failed to get deployment summary: {e}")

        return deployment_summary

    def generate_executive_summary(self, report: Dict) -> Dict:
        """Generate executive summary"""
        uptime = report["uptime_metrics"]["overall_uptime"]
        total_errors = report["error_summary"]["total_errors"]
        critical_errors = report["error_summary"]["critical_errors"]
        api_sla = report["performance_metrics"]["api_performance"]["sla_compliance"]
        frontend_sla = report["performance_metrics"]["frontend_performance"][
            "sla_compliance"
        ]

        # Determine overall health
        if (
            uptime >= 99.9
            and critical_errors == 0
            and api_sla >= 95
            and frontend_sla >= 95
        ):
            health_status = "Excellent"
            health_color = "green"
        elif (
            uptime >= 99
            and critical_errors <= 5
            and api_sla >= 90
            and frontend_sla >= 90
        ):
            health_status = "Good"
            health_color = "lightgreen"
        elif uptime >= 95 and critical_errors <= 10:
            health_status = "Fair"
            health_color = "yellow"
        else:
            health_status = "Poor"
            health_color = "red"

        return {
            "health_status": health_status,
            "health_color": health_color,
            "key_metrics": {
                "uptime": f"{uptime}%",
                "total_errors": total_errors,
                "critical_errors": critical_errors,
                "api_sla_compliance": f"{api_sla}%",
                "frontend_sla_compliance": f"{frontend_sla}%",
                "deployments": report["deployment_summary"]["total_deployments"],
            },
        }

    def generate_recommendations(self, report: Dict) -> List[Dict]:
        """Generate recommendations based on report data"""
        recommendations = []

        # Check uptime
        uptime = report["uptime_metrics"]["overall_uptime"]
        if uptime < 99.9:
            recommendations.append(
                {
                    "priority": "high",
                    "category": "reliability",
                    "recommendation": f"Uptime is below 99.9% target ({uptime}%). Investigate service failures and implement redundancy.",
                    "affected_services": [
                        service
                        for service, data in report["uptime_metrics"][
                            "service_uptime"
                        ].items()
                        if data["uptime_percentage"] < 99.9
                    ],
                }
            )

        # Check performance
        api_p95 = report["performance_metrics"]["api_performance"]["p95_response_time"]
        if api_p95 > 1000:
            recommendations.append(
                {
                    "priority": "medium",
                    "category": "performance",
                    "recommendation": f"API P95 response time ({api_p95}ms) exceeds 1000ms target. Optimize slow endpoints.",
                    "affected_endpoints": report["performance_metrics"][
                        "api_performance"
                    ]["slowest_endpoints"],
                }
            )

        # Check errors
        if report["error_summary"]["critical_errors"] > 0:
            recommendations.append(
                {
                    "priority": "high",
                    "category": "stability",
                    "recommendation": f"Critical errors detected ({report['error_summary']['critical_errors']}). Immediate investigation required.",
                    "top_errors": report["error_summary"]["top_errors"][:3],
                }
            )

        # Check deployments
        failed_deployments = report["deployment_summary"]["failed_deployments"]
        if failed_deployments > 0:
            recommendations.append(
                {
                    "priority": "high",
                    "category": "deployment",
                    "recommendation": f"Deployment failures detected ({failed_deployments}). Review deployment process and health checks.",
                    "affected_services": [
                        service
                        for service, data in report["deployment_summary"][
                            "deployments_by_service"
                        ].items()
                        if data["failed"] > 0
                    ],
                }
            )

        return recommendations

    def generate_charts(self, report: Dict) -> Dict[str, BytesIO]:
        """Generate charts for the report"""
        charts = {}

        # Uptime chart
        fig, ax = plt.subplots(figsize=(10, 6))
        services = list(report["uptime_metrics"]["service_uptime"].keys())
        uptimes = [
            data["uptime_percentage"]
            for data in report["uptime_metrics"]["service_uptime"].values()
        ]

        bars = ax.bar(services, uptimes)
        for bar, uptime in zip(bars, uptimes):
            color = "green" if uptime >= 99.9 else "yellow" if uptime >= 99 else "red"
            bar.set_color(color)

        ax.set_ylabel("Uptime %")
        ax.set_title("Service Uptime")
        ax.set_ylim(90, 100)

        uptime_chart = BytesIO()
        plt.savefig(uptime_chart, format="png", bbox_inches="tight")
        uptime_chart.seek(0)
        charts["uptime"] = uptime_chart
        plt.close()

        # Error distribution chart
        if report["error_summary"]["errors_by_type"]:
            fig, ax = plt.subplots(figsize=(10, 6))
            error_types = list(report["error_summary"]["errors_by_type"].keys())
            error_counts = list(report["error_summary"]["errors_by_type"].values())

            ax.pie(error_counts, labels=error_types, autopct="%1.1f%%")
            ax.set_title("Error Distribution by Type")

            error_chart = BytesIO()
            plt.savefig(error_chart, format="png", bbox_inches="tight")
            error_chart.seek(0)
            charts["errors"] = error_chart
            plt.close()

        return charts

    def format_html_report(self, report: Dict, charts: Dict[str, BytesIO]) -> str:
        """Format report as HTML"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>6FB Platform Daily Health Report - {report['date']}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                h1, h2, h3 {{ color: #333; }}
                .executive-summary {{
                    background: #f5f5f5;
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 30px;
                }}
                .health-status {{
                    font-size: 24px;
                    font-weight: bold;
                    color: {report['executive_summary']['health_color']};
                }}
                .metric-grid {{
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin: 20px 0;
                }}
                .metric-box {{
                    background: white;
                    border: 1px solid #ddd;
                    padding: 15px;
                    border-radius: 5px;
                    text-align: center;
                }}
                .metric-value {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #2563eb;
                }}
                .metric-label {{
                    color: #666;
                    font-size: 14px;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }}
                th, td {{
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }}
                th {{
                    background-color: #f5f5f5;
                }}
                .recommendation {{
                    background: #fff3cd;
                    border: 1px solid #ffeeba;
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 5px;
                }}
                .high-priority {{
                    border-color: #f5c6cb;
                    background: #f8d7da;
                }}
            </style>
        </head>
        <body>
            <h1>6FB Platform Daily Health Report</h1>
            <p>Date: {report['date']} | Generated: {report['generated_at']}</p>

            <div class="executive-summary">
                <h2>Executive Summary</h2>
                <p class="health-status">Overall Health: {report['executive_summary']['health_status']}</p>

                <div class="metric-grid">
        """

        # Add key metrics
        for label, value in report["executive_summary"]["key_metrics"].items():
            html += f"""
                    <div class="metric-box">
                        <div class="metric-value">{value}</div>
                        <div class="metric-label">{label.replace('_', ' ').title()}</div>
                    </div>
            """

        html += """
                </div>
            </div>

            <h2>Service Uptime</h2>
            <table>
                <tr>
                    <th>Service</th>
                    <th>Uptime %</th>
                    <th>Downtime (minutes)</th>
                    <th>Failures</th>
                </tr>
        """

        # Add uptime data
        for service, data in report["uptime_metrics"]["service_uptime"].items():
            html += f"""
                <tr>
                    <td>{service}</td>
                    <td>{data['uptime_percentage']}%</td>
                    <td>{data['downtime_minutes']}</td>
                    <td>{data['failure_count']}</td>
                </tr>
            """

        html += """
            </table>

            <h2>Performance Metrics</h2>
            <h3>API Performance</h3>
            <p>Average Response Time: {api_avg}ms | P95: {api_p95}ms | SLA Compliance: {api_sla}%</p>

            <h3>Frontend Performance</h3>
            <p>Average Load Time: {fe_avg}ms | P95: {fe_p95}ms | SLA Compliance: {fe_sla}%</p>
        """.format(
            api_avg=report["performance_metrics"]["api_performance"][
                "average_response_time"
            ],
            api_p95=report["performance_metrics"]["api_performance"][
                "p95_response_time"
            ],
            api_sla=report["performance_metrics"]["api_performance"]["sla_compliance"],
            fe_avg=report["performance_metrics"]["frontend_performance"][
                "average_load_time"
            ],
            fe_p95=report["performance_metrics"]["frontend_performance"][
                "p95_load_time"
            ],
            fe_sla=report["performance_metrics"]["frontend_performance"][
                "sla_compliance"
            ],
        )

        # Add recommendations
        if report["recommendations"]:
            html += "<h2>Recommendations</h2>"
            for rec in report["recommendations"]:
                priority_class = "high-priority" if rec["priority"] == "high" else ""
                html += f"""
                    <div class="recommendation {priority_class}">
                        <strong>{rec['category'].title()} - {rec['priority'].title()} Priority:</strong><br>
                        {rec['recommendation']}
                    </div>
                """

        html += """
        </body>
        </html>
        """

        return html

    def send_report(self, report: Dict, recipients: List[str]):
        """Send report via email"""
        try:
            # Generate charts
            charts = self.generate_charts(report)

            # Create email
            msg = MIMEMultipart()
            msg["Subject"] = f"6FB Platform Daily Health Report - {report['date']}"
            msg["From"] = os.getenv("REPORT_FROM_EMAIL", "reports@6fb-booking.com")
            msg["To"] = ", ".join(recipients)

            # Add HTML body
            html_report = self.format_html_report(report, charts)
            msg.attach(MIMEText(html_report, "html"))

            # Add JSON attachment
            json_attachment = MIMEBase("application", "json")
            json_attachment.set_payload(json.dumps(report, indent=2))
            encoders.encode_base64(json_attachment)
            json_attachment.add_header(
                "Content-Disposition",
                f'attachment; filename="health_report_{report["date"]}.json"',
            )
            msg.attach(json_attachment)

            # Send email
            with smtplib.SMTP(
                os.getenv("SMTP_HOST", "smtp.sendgrid.net"),
                int(os.getenv("SMTP_PORT", "587")),
            ) as server:
                server.starttls()
                server.login(
                    os.getenv("SMTP_USER", "apikey"), os.getenv("SENDGRID_API_KEY", "")
                )
                server.send_message(msg)

            logger.info(f"Report sent to {len(recipients)} recipients")

        except Exception as e:
            logger.error(f"Failed to send report: {e}")

    def save_report(self, report: Dict):
        """Save report to file"""
        filename = f"health_report_{report['date']}.json"
        filepath = self.reports_dir / filename

        with open(filepath, "w") as f:
            json.dump(report, f, indent=2)

        logger.info(f"Report saved to {filepath}")


def main():
    """Generate and send daily health report"""
    report_generator = DailyHealthReport()

    # Generate report for yesterday (since we want complete data)
    yesterday = datetime.utcnow().date() - timedelta(days=1)
    report = report_generator.generate_report(yesterday)

    # Save report
    report_generator.save_report(report)

    # Send report if recipients configured
    recipients = os.getenv("HEALTH_REPORT_RECIPIENTS", "").split(",")
    recipients = [r.strip() for r in recipients if r.strip()]

    if recipients:
        report_generator.send_report(report, recipients)
    else:
        logger.info("No recipients configured, report saved locally only")

    # Print summary
    print(f"\nHealth Report Summary for {report['date']}")
    print(f"Overall Health: {report['executive_summary']['health_status']}")
    print(f"Uptime: {report['executive_summary']['key_metrics']['uptime']}")
    print(f"Total Errors: {report['executive_summary']['key_metrics']['total_errors']}")
    print(f"Recommendations: {len(report['recommendations'])}")


if __name__ == "__main__":
    main()
