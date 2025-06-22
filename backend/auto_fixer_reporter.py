#!/usr/bin/env python3
"""
Weekly Report Generator for Auto-Fixer System
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
import matplotlib.pyplot as plt
import io
import aiohttp
import asyncio
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from enhanced_auto_fixer import FixHistory, ErrorPattern, Base


class AutoFixerReporter:
    """Generate and send weekly reports"""

    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL", "sqlite:///./auto_fixer.db")
        self.engine = create_engine(self.db_url)
        self.Session = sessionmaker(bind=self.engine)

        self.email_config = {
            "smtp_host": os.getenv("SMTP_HOST"),
            "smtp_port": int(os.getenv("SMTP_PORT", 587)),
            "smtp_username": os.getenv("SMTP_USERNAME"),
            "smtp_password": os.getenv("SMTP_PASSWORD"),
            "from_email": os.getenv("EMAIL_FROM_ADDRESS"),
            "report_recipients": [
                "team-lead@6fbmentorship.com",
                "cto@6fbmentorship.com",
            ],
        }

    def generate_weekly_stats(self) -> Dict:
        """Generate statistics for the past week"""
        session = self.Session()

        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        # Get fixes from past week
        week_fixes = (
            session.query(FixHistory)
            .filter(
                FixHistory.timestamp >= start_date, FixHistory.timestamp <= end_date
            )
            .all()
        )

        # Calculate statistics
        total_fixes = len(week_fixes)
        successful_fixes = len([f for f in week_fixes if f.success])
        failed_fixes = total_fixes - successful_fixes
        success_rate = (successful_fixes / total_fixes * 100) if total_fixes > 0 else 0

        # Group by error type
        error_type_stats = {}
        for fix in week_fixes:
            if fix.error_type not in error_type_stats:
                error_type_stats[fix.error_type] = {
                    "count": 0,
                    "success": 0,
                    "avg_time": 0,
                    "times": [],
                }

            error_type_stats[fix.error_type]["count"] += 1
            if fix.success:
                error_type_stats[fix.error_type]["success"] += 1
            error_type_stats[fix.error_type]["times"].append(fix.fix_time_seconds)

        # Calculate averages
        for error_type, stats in error_type_stats.items():
            stats["success_rate"] = (
                (stats["success"] / stats["count"] * 100) if stats["count"] > 0 else 0
            )
            stats["avg_time"] = (
                sum(stats["times"]) / len(stats["times"]) if stats["times"] else 0
            )
            del stats["times"]  # Remove raw times from final stats

        # Get pattern learning stats
        patterns = session.query(ErrorPattern).all()
        high_confidence_patterns = [p for p in patterns if p.confidence_score > 80]
        low_confidence_patterns = [p for p in patterns if p.confidence_score < 30]

        # Calculate time saved (rough estimate)
        time_saved_hours = (
            sum(f.fix_time_seconds for f in week_fixes if f.success) / 3600
        )
        cost_saved = time_saved_hours * 150  # Assuming $150/hour developer cost

        session.close()

        return {
            "period": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
            },
            "summary": {
                "total_fixes": total_fixes,
                "successful_fixes": successful_fixes,
                "failed_fixes": failed_fixes,
                "success_rate": success_rate,
                "time_saved_hours": round(time_saved_hours, 1),
                "cost_saved_usd": round(cost_saved, 2),
            },
            "error_types": error_type_stats,
            "patterns": {
                "total": len(patterns),
                "high_confidence": len(high_confidence_patterns),
                "low_confidence": len(low_confidence_patterns),
                "disabled": len([p for p in patterns if not p.auto_fixable]),
            },
            "top_errors": sorted(
                error_type_stats.items(), key=lambda x: x[1]["count"], reverse=True
            )[:5],
        }

    def generate_charts(self, stats: Dict) -> Dict[str, bytes]:
        """Generate charts for the report"""
        charts = {}

        # Success rate pie chart
        plt.figure(figsize=(8, 6))
        labels = ["Successful", "Failed"]
        sizes = [stats["summary"]["successful_fixes"], stats["summary"]["failed_fixes"]]
        colors = ["#4CAF50", "#f44336"]

        if sum(sizes) > 0:
            plt.pie(
                sizes, labels=labels, colors=colors, autopct="%1.1f%%", startangle=90
            )
            plt.title("Fix Success Rate - Past Week")

            buf = io.BytesIO()
            plt.savefig(buf, format="png", bbox_inches="tight")
            buf.seek(0)
            charts["success_pie"] = buf.read()
            plt.close()

        # Error types bar chart
        if stats["error_types"]:
            plt.figure(figsize=(10, 6))
            error_types = list(stats["error_types"].keys())
            counts = [stats["error_types"][et]["count"] for et in error_types]

            plt.bar(error_types, counts, color="#2196F3")
            plt.xlabel("Error Type")
            plt.ylabel("Count")
            plt.title("Fixes by Error Type - Past Week")
            plt.xticks(rotation=45, ha="right")

            buf = io.BytesIO()
            plt.savefig(buf, format="png", bbox_inches="tight")
            buf.seek(0)
            charts["error_types_bar"] = buf.read()
            plt.close()

        return charts

    def format_html_report(self, stats: Dict, charts: Dict[str, bytes]) -> str:
        """Format statistics as HTML email"""
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 800px; margin: 0 auto; padding: 20px; }}
                h1 {{ color: #2196F3; border-bottom: 2px solid #2196F3; padding-bottom: 10px; }}
                h2 {{ color: #555; margin-top: 30px; }}
                .summary {{ background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .stat {{ display: inline-block; margin: 10px 20px 10px 0; }}
                .stat-value {{ font-size: 24px; font-weight: bold; color: #2196F3; }}
                .stat-label {{ color: #666; font-size: 14px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background: #f5f5f5; font-weight: bold; }}
                .success {{ color: #4CAF50; }}
                .error {{ color: #f44336; }}
                .highlight {{ background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }}
                .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 Auto-Fixer Weekly Report</h1>
                <p><strong>Period:</strong> {stats['period']['start']} to {stats['period']['end']}</p>

                <div class="summary">
                    <h2>Executive Summary</h2>
                    <div class="stat">
                        <div class="stat-value">{stats['summary']['total_fixes']}</div>
                        <div class="stat-label">Total Fixes Applied</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">{stats['summary']['success_rate']:.1f}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">{stats['summary']['time_saved_hours']}h</div>
                        <div class="stat-label">Developer Time Saved</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${stats['summary']['cost_saved_usd']:,.2f}</div>
                        <div class="stat-label">Estimated Cost Savings</div>
                    </div>
                </div>

                <h2>Fix Distribution</h2>
                <img src="cid:success_pie" alt="Success Rate Chart" style="max-width: 100%; height: auto;">

                <h2>Top Error Types</h2>
                <table>
                    <tr>
                        <th>Error Type</th>
                        <th>Count</th>
                        <th>Success Rate</th>
                        <th>Avg Fix Time</th>
                    </tr>
        """

        for error_type, data in stats["top_errors"]:
            html += f"""
                    <tr>
                        <td>{error_type}</td>
                        <td>{data['count']}</td>
                        <td class="{'success' if data['success_rate'] > 70 else 'error'}">{data['success_rate']:.1f}%</td>
                        <td>{data['avg_time']:.1f}s</td>
                    </tr>
            """

        html += f"""
                </table>

                <h2>Error Types Breakdown</h2>
                <img src="cid:error_types_bar" alt="Error Types Chart" style="max-width: 100%; height: auto;">

                <h2>Pattern Learning Progress</h2>
                <table>
                    <tr>
                        <td>Total Patterns Learned</td>
                        <td><strong>{stats['patterns']['total']}</strong></td>
                    </tr>
                    <tr>
                        <td>High Confidence Patterns (>80%)</td>
                        <td class="success"><strong>{stats['patterns']['high_confidence']}</strong></td>
                    </tr>
                    <tr>
                        <td>Low Confidence Patterns (<30%)</td>
                        <td class="error"><strong>{stats['patterns']['low_confidence']}</strong></td>
                    </tr>
                    <tr>
                        <td>Disabled Patterns</td>
                        <td>{stats['patterns']['disabled']}</td>
                    </tr>
                </table>
        """

        # Add recommendations if needed
        if stats["summary"]["success_rate"] < 70:
            html += """
                <div class="highlight">
                    <strong>⚠️ Recommendation:</strong> Success rate is below 70%. Consider reviewing failed fixes and adjusting confidence thresholds.
                </div>
            """

        if stats["patterns"]["low_confidence"] > stats["patterns"]["high_confidence"]:
            html += """
                <div class="highlight">
                    <strong>⚠️ Recommendation:</strong> Many patterns have low confidence. Manual review of these patterns may improve auto-fix reliability.
                </div>
            """

        html += """
                <div class="footer">
                    <p>This report was automatically generated by the Enhanced Auto-Fixer System v2.0</p>
                    <p>For questions or to adjust settings, please contact the development team.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return html

    async def send_report(self):
        """Generate and send the weekly report"""
        try:
            # Generate statistics
            stats = self.generate_weekly_stats()

            if stats["summary"]["total_fixes"] == 0:
                print("No fixes to report for this week")
                return

            # Generate charts
            charts = self.generate_charts(stats)

            # Create email
            msg = MIMEMultipart("related")
            msg["From"] = self.email_config["from_email"]
            msg["To"] = ", ".join(self.email_config["report_recipients"])
            msg["Subject"] = (
                f"Auto-Fixer Weekly Report - {stats['summary']['success_rate']:.1f}% Success Rate"
            )

            # Attach HTML
            html_content = self.format_html_report(stats, charts)
            msg.attach(MIMEText(html_content, "html"))

            # Attach charts
            for chart_name, chart_data in charts.items():
                img = MIMEImage(chart_data)
                img.add_header("Content-ID", f"<{chart_name}>")
                msg.attach(img)

            # Send email
            with smtplib.SMTP(
                self.email_config["smtp_host"], self.email_config["smtp_port"]
            ) as server:
                server.starttls()
                server.login(
                    self.email_config["smtp_username"],
                    self.email_config["smtp_password"],
                )
                server.send_message(msg)

            print(
                f"✅ Weekly report sent to {len(self.email_config['report_recipients'])} recipients"
            )

        except Exception as e:
            print(f"❌ Failed to send weekly report: {e}")


async def main():
    """Run the reporter"""
    reporter = AutoFixerReporter()
    await reporter.send_report()


if __name__ == "__main__":
    asyncio.run(main())
