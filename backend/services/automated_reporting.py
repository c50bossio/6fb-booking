"""
Automated Reporting Service
Generates and distributes automated reports for 6FB performance tracking
"""

import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import json

from models.appointment import Appointment
from models.client import Client
from models.barber import Barber
from config.database import get_db
from .sixfb_calculator import SixFBCalculator

logger = logging.getLogger(__name__)


class ReportType(Enum):
    """Types of automated reports"""

    DAILY_SUMMARY = "daily_summary"
    WEEKLY_PERFORMANCE = "weekly_performance"
    MONTHLY_OVERVIEW = "monthly_overview"
    SIXFB_SCORECARD = "sixfb_scorecard"
    CLIENT_RETENTION = "client_retention"
    REVENUE_ANALYSIS = "revenue_analysis"
    BOOKING_EFFICIENCY = "booking_efficiency"
    TREND_ANALYSIS = "trend_analysis"


class ReportFormat(Enum):
    """Report output formats"""

    EMAIL_HTML = "email_html"
    PDF = "pdf"
    CSV = "csv"
    JSON = "json"
    DASHBOARD = "dashboard"


class ReportFrequency(Enum):
    """Report generation frequency"""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


@dataclass
class ReportConfig:
    """Report configuration"""

    id: str
    name: str
    report_type: ReportType
    frequency: ReportFrequency
    format: ReportFormat
    recipients: List[str]  # Email addresses
    barber_specific: bool = True
    is_active: bool = True
    schedule_time: str = "09:00"  # Time to send (HH:MM)
    include_charts: bool = True
    include_recommendations: bool = True
    last_generated: Optional[datetime] = None


@dataclass
class ReportData:
    """Report data structure"""

    report_id: str
    report_type: ReportType
    period_start: date
    period_end: date
    barber_id: Optional[int]
    generated_at: datetime
    data: Dict[str, Any]
    insights: List[str]
    recommendations: List[str]


class AutomatedReportingService:
    """Service for generating and distributing automated reports"""

    def __init__(self, db: Session):
        self.db = db
        self.calculator = SixFBCalculator(db)
        self.report_configs = self._load_default_configs()

    def _load_default_configs(self) -> Dict[str, ReportConfig]:
        """Load default report configurations"""
        return {
            "daily_summary": ReportConfig(
                id="daily_summary",
                name="Daily Performance Summary",
                report_type=ReportType.DAILY_SUMMARY,
                frequency=ReportFrequency.DAILY,
                format=ReportFormat.EMAIL_HTML,
                recipients=["barber@example.com"],
                schedule_time="19:00",  # End of day
            ),
            "weekly_scorecard": ReportConfig(
                id="weekly_scorecard",
                name="Weekly 6FB Scorecard",
                report_type=ReportType.SIXFB_SCORECARD,
                frequency=ReportFrequency.WEEKLY,
                format=ReportFormat.EMAIL_HTML,
                recipients=["barber@example.com", "manager@example.com"],
                schedule_time="09:00",  # Monday morning
            ),
            "monthly_performance": ReportConfig(
                id="monthly_performance",
                name="Monthly Performance Review",
                report_type=ReportType.MONTHLY_OVERVIEW,
                frequency=ReportFrequency.MONTHLY,
                format=ReportFormat.PDF,
                recipients=["barber@example.com", "manager@example.com"],
                schedule_time="09:00",  # First of month
                include_charts=True,
                include_recommendations=True,
            ),
            "client_retention_monthly": ReportConfig(
                id="client_retention_monthly",
                name="Monthly Client Retention Report",
                report_type=ReportType.CLIENT_RETENTION,
                frequency=ReportFrequency.MONTHLY,
                format=ReportFormat.EMAIL_HTML,
                recipients=["manager@example.com"],
                schedule_time="10:00",
            ),
            "revenue_analysis_weekly": ReportConfig(
                id="revenue_analysis_weekly",
                name="Weekly Revenue Analysis",
                report_type=ReportType.REVENUE_ANALYSIS,
                frequency=ReportFrequency.WEEKLY,
                format=ReportFormat.EMAIL_HTML,
                recipients=["barber@example.com", "manager@example.com"],
                schedule_time="09:30",
            ),
        }

    async def generate_scheduled_reports(self):
        """Generate and send all scheduled reports"""
        logger.info("Generating scheduled reports")

        try:
            current_time = datetime.now().time()
            current_date = date.today()

            for config in self.report_configs.values():
                if not config.is_active:
                    continue

                # Check if it's time to generate this report
                if self._should_generate_report(config, current_date, current_time):
                    await self._generate_and_send_report(config)

            logger.info("Scheduled report generation completed")

        except Exception as e:
            logger.error(f"Error in scheduled report generation: {e}")

    def _should_generate_report(
        self, config: ReportConfig, current_date: date, current_time
    ) -> bool:
        """Check if report should be generated now"""
        # Parse schedule time
        try:
            schedule_hour, schedule_minute = map(int, config.schedule_time.split(":"))
            schedule_time = current_time.replace(
                hour=schedule_hour, minute=schedule_minute, second=0, microsecond=0
            )
        except:
            return False

        # Check if current time matches schedule (within 1 hour window)
        time_diff = abs(
            (current_time.hour * 60 + current_time.minute)
            - (schedule_time.hour * 60 + schedule_time.minute)
        )
        if time_diff > 60:  # More than 1 hour difference
            return False

        # Check frequency
        if config.frequency == ReportFrequency.DAILY:
            return True

        elif config.frequency == ReportFrequency.WEEKLY:
            return current_date.weekday() == 0  # Monday

        elif config.frequency == ReportFrequency.MONTHLY:
            return current_date.day == 1  # First of month

        elif config.frequency == ReportFrequency.QUARTERLY:
            return current_date.month in [1, 4, 7, 10] and current_date.day == 1

        return False

    async def _generate_and_send_report(self, config: ReportConfig):
        """Generate and send individual report"""
        logger.info(f"Generating report: {config.name}")

        try:
            if config.barber_specific:
                # Generate for each barber
                barbers = self.db.query(Barber).all()
                for barber in barbers:
                    report_data = await self._generate_report_data(config, barber.id)
                    await self._send_report(config, report_data, barber)
            else:
                # Generate business-wide report
                report_data = await self._generate_report_data(config, None)
                await self._send_report(config, report_data, None)

            # Update last generated time
            config.last_generated = datetime.utcnow()

        except Exception as e:
            logger.error(f"Error generating report {config.name}: {e}")

    async def _generate_report_data(
        self, config: ReportConfig, barber_id: Optional[int]
    ) -> ReportData:
        """Generate report data based on config"""
        period_start, period_end = self._get_report_period(config.frequency)

        if config.report_type == ReportType.DAILY_SUMMARY:
            data = await self._generate_daily_summary(barber_id, period_start)

        elif config.report_type == ReportType.WEEKLY_PERFORMANCE:
            data = await self._generate_weekly_performance(
                barber_id, period_start, period_end
            )

        elif config.report_type == ReportType.MONTHLY_OVERVIEW:
            data = await self._generate_monthly_overview(
                barber_id, period_start, period_end
            )

        elif config.report_type == ReportType.SIXFB_SCORECARD:
            data = await self._generate_sixfb_scorecard(
                barber_id, period_start, period_end
            )

        elif config.report_type == ReportType.CLIENT_RETENTION:
            data = await self._generate_client_retention_report(
                barber_id, period_start, period_end
            )

        elif config.report_type == ReportType.REVENUE_ANALYSIS:
            data = await self._generate_revenue_analysis(
                barber_id, period_start, period_end
            )

        else:
            data = {"message": "Report type not implemented"}

        # Generate insights and recommendations
        insights = self._generate_insights(data, config.report_type)
        recommendations = (
            self._generate_recommendations(data, config.report_type)
            if config.include_recommendations
            else []
        )

        return ReportData(
            report_id=f"{config.id}_{int(datetime.utcnow().timestamp())}",
            report_type=config.report_type,
            period_start=period_start,
            period_end=period_end,
            barber_id=barber_id,
            generated_at=datetime.utcnow(),
            data=data,
            insights=insights,
            recommendations=recommendations,
        )

    def _get_report_period(self, frequency: ReportFrequency) -> tuple[date, date]:
        """Get report period dates based on frequency"""
        today = date.today()

        if frequency == ReportFrequency.DAILY:
            return today, today

        elif frequency == ReportFrequency.WEEKLY:
            # Last complete week (Monday to Sunday)
            days_since_monday = today.weekday()
            week_start = today - timedelta(days=days_since_monday + 7)
            week_end = week_start + timedelta(days=6)
            return week_start, week_end

        elif frequency == ReportFrequency.MONTHLY:
            # Last complete month
            if today.month == 1:
                last_month = today.replace(year=today.year - 1, month=12, day=1)
            else:
                last_month = today.replace(month=today.month - 1, day=1)

            # Last day of previous month
            this_month_first = today.replace(day=1)
            last_month_end = this_month_first - timedelta(days=1)

            return last_month, last_month_end

        else:
            return today, today

    async def _generate_daily_summary(
        self, barber_id: Optional[int], report_date: date
    ) -> Dict[str, Any]:
        """Generate daily summary report"""
        query = self.db.query(Appointment).filter(
            Appointment.appointment_date == report_date
        )

        if barber_id:
            query = query.filter(Appointment.barber_id == barber_id)

        appointments = query.all()

        total_appointments = len(appointments)
        completed_appointments = len(
            [a for a in appointments if a.status == "completed"]
        )
        total_revenue = sum(
            a.service_revenue + a.tip_amount + a.product_revenue
            for a in appointments
            if a.status == "completed"
        )
        average_ticket = (
            total_revenue / completed_appointments if completed_appointments > 0 else 0
        )

        new_clients = len([a for a in appointments if a.customer_type == "new"])
        returning_clients = len(
            [a for a in appointments if a.customer_type == "returning"]
        )

        return {
            "date": report_date.isoformat(),
            "appointments": {
                "total": total_appointments,
                "completed": completed_appointments,
                "completion_rate": (
                    (completed_appointments / total_appointments * 100)
                    if total_appointments > 0
                    else 0
                ),
            },
            "revenue": {
                "total": total_revenue,
                "average_ticket": average_ticket,
                "target_achievement": (total_revenue / 300)
                * 100,  # Assuming $300 daily target
            },
            "clients": {
                "new": new_clients,
                "returning": returning_clients,
                "retention_rate": (
                    (returning_clients / (new_clients + returning_clients) * 100)
                    if (new_clients + returning_clients) > 0
                    else 0
                ),
            },
        }

    async def _generate_weekly_performance(
        self, barber_id: Optional[int], start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Generate weekly performance report"""
        # Use existing calculator
        if barber_id:
            weekly_metrics = await self.calculator.get_weekly_metrics(
                barber_id, start_date, end_date
            )
            sixfb_score = self.calculator.calculate_sixfb_score(barber_id, "weekly")
        else:
            # Aggregate all barbers
            weekly_metrics = await self._get_business_weekly_metrics(
                start_date, end_date
            )
            sixfb_score = await self._get_business_sixfb_score()

        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "sixfb_score": sixfb_score,
            "metrics": weekly_metrics,
            "performance_grade": self._calculate_performance_grade(
                sixfb_score.get("overall_score", 0)
            ),
        }

    async def _generate_monthly_overview(
        self, barber_id: Optional[int], start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Generate monthly overview report"""
        query = self.db.query(Appointment).filter(
            and_(
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
            )
        )

        if barber_id:
            query = query.filter(Appointment.barber_id == barber_id)

        appointments = query.all()
        completed = [a for a in appointments if a.status == "completed"]

        # Monthly metrics
        total_revenue = sum(
            a.service_revenue + a.tip_amount + a.product_revenue for a in completed
        )
        total_appointments = len(completed)
        average_ticket = (
            total_revenue / total_appointments if total_appointments > 0 else 0
        )

        # Client analysis
        unique_clients = len(set(a.client_id for a in completed if a.client_id))
        new_clients = len([a for a in completed if a.customer_type == "new"])

        # Weekly breakdown
        weekly_breakdown = []
        current_week_start = start_date
        while current_week_start <= end_date:
            week_end = min(current_week_start + timedelta(days=6), end_date)
            week_appointments = [
                a
                for a in completed
                if current_week_start <= a.appointment_date <= week_end
            ]
            week_revenue = sum(
                a.service_revenue + a.tip_amount + a.product_revenue
                for a in week_appointments
            )

            weekly_breakdown.append(
                {
                    "week_start": current_week_start.isoformat(),
                    "appointments": len(week_appointments),
                    "revenue": week_revenue,
                }
            )

            current_week_start += timedelta(days=7)

        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "summary": {
                "total_revenue": total_revenue,
                "total_appointments": total_appointments,
                "average_ticket": average_ticket,
                "unique_clients": unique_clients,
                "new_clients": new_clients,
                "client_retention_rate": (
                    ((unique_clients - new_clients) / unique_clients * 100)
                    if unique_clients > 0
                    else 0
                ),
            },
            "weekly_breakdown": weekly_breakdown,
        }

    async def _generate_sixfb_scorecard(
        self, barber_id: Optional[int], start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Generate 6FB scorecard report"""
        if barber_id:
            current_score = self.calculator.calculate_sixfb_score(barber_id, "weekly")
            # Get previous period for comparison
            prev_start = start_date - timedelta(days=7)
            prev_end = start_date - timedelta(days=1)
            previous_score = self.calculator.calculate_sixfb_score(
                barber_id, "weekly", prev_start, prev_end
            )
        else:
            current_score = await self._get_business_sixfb_score()
            previous_score = await self._get_business_sixfb_score(
                start_date - timedelta(days=7)
            )

        # Calculate trends
        score_change = current_score.get("overall_score", 0) - previous_score.get(
            "overall_score", 0
        )

        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "current_score": current_score,
            "previous_score": previous_score,
            "score_change": score_change,
            "trend": (
                "improving"
                if score_change > 0
                else "declining" if score_change < 0 else "stable"
            ),
            "performance_grade": self._calculate_performance_grade(
                current_score.get("overall_score", 0)
            ),
        }

    async def _generate_client_retention_report(
        self, barber_id: Optional[int], start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Generate client retention report"""
        # Client visit patterns
        query = self.db.query(Client)
        if barber_id:
            query = query.join(Appointment).filter(Appointment.barber_id == barber_id)

        clients = query.all()

        # Categorize clients
        active_clients = [
            c for c in clients if c.last_visit_date and c.last_visit_date >= start_date
        ]
        at_risk_clients = [
            c
            for c in clients
            if c.last_visit_date and (date.today() - c.last_visit_date).days > 45
        ]
        lost_clients = [
            c
            for c in clients
            if c.last_visit_date and (date.today() - c.last_visit_date).days > 90
        ]

        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "client_segments": {
                "active": len(active_clients),
                "at_risk": len(at_risk_clients),
                "lost": len(lost_clients),
                "total": len(clients),
            },
            "retention_metrics": {
                "retention_rate": (
                    (len(active_clients) / len(clients) * 100) if clients else 0
                ),
                "churn_rate": (
                    (len(lost_clients) / len(clients) * 100) if clients else 0
                ),
            },
        }

    async def _generate_revenue_analysis(
        self, barber_id: Optional[int], start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Generate revenue analysis report"""
        query = self.db.query(Appointment).filter(
            and_(
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
                Appointment.status == "completed",
            )
        )

        if barber_id:
            query = query.filter(Appointment.barber_id == barber_id)

        appointments = query.all()

        # Revenue breakdown
        service_revenue = sum(a.service_revenue for a in appointments)
        tip_revenue = sum(a.tip_amount for a in appointments)
        product_revenue = sum(a.product_revenue for a in appointments)
        total_revenue = service_revenue + tip_revenue + product_revenue

        # Daily breakdown
        daily_revenue = {}
        for appointment in appointments:
            date_str = appointment.appointment_date.isoformat()
            if date_str not in daily_revenue:
                daily_revenue[date_str] = 0
            daily_revenue[date_str] += (
                appointment.service_revenue
                + appointment.tip_amount
                + appointment.product_revenue
            )

        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "revenue_breakdown": {
                "service": service_revenue,
                "tips": tip_revenue,
                "products": product_revenue,
                "total": total_revenue,
            },
            "daily_revenue": daily_revenue,
            "average_daily": total_revenue / ((end_date - start_date).days + 1),
            "revenue_per_appointment": (
                total_revenue / len(appointments) if appointments else 0
            ),
        }

    def _generate_insights(
        self, data: Dict[str, Any], report_type: ReportType
    ) -> List[str]:
        """Generate insights based on report data"""
        insights = []

        if report_type == ReportType.DAILY_SUMMARY:
            completion_rate = data.get("appointments", {}).get("completion_rate", 0)
            if completion_rate < 85:
                insights.append(
                    f"Appointment completion rate is {completion_rate:.1f}% - consider reviewing no-show policies"
                )

            revenue = data.get("revenue", {}).get("total", 0)
            if revenue < 250:
                insights.append(
                    "Daily revenue below target - focus on upselling and premium services"
                )

        elif report_type == ReportType.SIXFB_SCORECARD:
            score = data.get("current_score", {}).get("overall_score", 0)
            trend = data.get("trend", "stable")

            if score >= 90:
                insights.append(
                    "Excellent 6FB performance! You're in the top tier of barbers."
                )
            elif score >= 80:
                insights.append("Strong 6FB performance with room for optimization.")
            elif score < 70:
                insights.append(
                    "6FB score needs attention - focus on the lowest-performing components."
                )

            if trend == "improving":
                insights.append(
                    "Your 6FB score is trending upward - keep up the great work!"
                )
            elif trend == "declining":
                insights.append(
                    "6FB score is declining - review recent changes and client feedback."
                )

        return insights

    def _generate_recommendations(
        self, data: Dict[str, Any], report_type: ReportType
    ) -> List[str]:
        """Generate recommendations based on report data"""
        recommendations = []

        if report_type == ReportType.DAILY_SUMMARY:
            revenue = data.get("revenue", {}).get("total", 0)
            appointments = data.get("appointments", {}).get("completed", 0)

            if revenue < 250:
                recommendations.append(
                    "Increase average ticket by offering premium services and products"
                )
                recommendations.append("Focus on upselling during consultations")

            if appointments < 8:
                recommendations.append("Optimize booking schedule to reduce gaps")
                recommendations.append("Implement waitlist for last-minute bookings")

        elif report_type == ReportType.CLIENT_RETENTION:
            retention_rate = data.get("retention_metrics", {}).get("retention_rate", 0)
            at_risk = data.get("client_segments", {}).get("at_risk", 0)

            if retention_rate < 70:
                recommendations.append(
                    "Implement automated follow-up campaigns for inactive clients"
                )
                recommendations.append("Gather feedback from departing clients")

            if at_risk > 10:
                recommendations.append(
                    "Create reactivation campaign for at-risk clients"
                )
                recommendations.append(
                    "Offer special promotions to re-engage inactive clients"
                )

        return recommendations

    async def _send_report(
        self, config: ReportConfig, report_data: ReportData, barber: Optional[Barber]
    ):
        """Send report to recipients"""
        logger.info(
            f"Sending report {config.name} to {len(config.recipients)} recipients"
        )

        try:
            if config.format == ReportFormat.EMAIL_HTML:
                await self._send_email_report(config, report_data, barber)
            elif config.format == ReportFormat.PDF:
                await self._send_pdf_report(config, report_data, barber)
            # Add other formats as needed

        except Exception as e:
            logger.error(f"Error sending report {config.name}: {e}")

    async def _send_email_report(
        self, config: ReportConfig, report_data: ReportData, barber: Optional[Barber]
    ):
        """Send report via email"""
        subject = f"{config.name}"
        if barber:
            subject += f" - {barber.name}"

        # Generate HTML content
        html_content = self._generate_html_report(report_data, config)

        # In production, send via email service
        logger.info(f"Email report sent: {subject}")

    async def _send_pdf_report(
        self, config: ReportConfig, report_data: ReportData, barber: Optional[Barber]
    ):
        """Send report as PDF"""
        # In production, generate PDF and send via email
        logger.info(f"PDF report generated and sent: {config.name}")

    def _generate_html_report(
        self, report_data: ReportData, config: ReportConfig
    ) -> str:
        """Generate HTML content for email report"""
        # In production, use proper HTML templating
        html = f"""
        <html>
        <body>
            <h1>{config.name}</h1>
            <p>Report Period: {report_data.period_start} to {report_data.period_end}</p>
            <div>
                <h2>Key Metrics</h2>
                <pre>{json.dumps(report_data.data, indent=2)}</pre>
            </div>
            <div>
                <h2>Insights</h2>
                <ul>
                    {''.join(f'<li>{insight}</li>' for insight in report_data.insights)}
                </ul>
            </div>
            <div>
                <h2>Recommendations</h2>
                <ul>
                    {''.join(f'<li>{rec}</li>' for rec in report_data.recommendations)}
                </ul>
            </div>
        </body>
        </html>
        """
        return html

    # Helper methods
    async def _get_business_weekly_metrics(
        self, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Get business-wide weekly metrics"""
        # Aggregate all barber metrics
        barbers = self.db.query(Barber).all()

        total_revenue = 0
        total_appointments = 0

        for barber in barbers:
            barber_metrics = await self.calculator.get_weekly_metrics(
                barber.id, start_date, end_date
            )
            total_revenue += barber_metrics.get("total_revenue", 0)
            total_appointments += barber_metrics.get("total_appointments", 0)

        return {
            "total_revenue": total_revenue,
            "total_appointments": total_appointments,
            "average_ticket": (
                total_revenue / total_appointments if total_appointments > 0 else 0
            ),
            "active_barbers": len(barbers),
        }

    async def _get_business_sixfb_score(
        self, reference_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get business-wide 6FB score"""
        barbers = self.db.query(Barber).all()

        if not barbers:
            return {"overall_score": 0}

        total_score = 0
        for barber in barbers:
            barber_score = self.calculator.calculate_sixfb_score(barber.id, "weekly")
            total_score += barber_score.get("overall_score", 0)

        return {
            "overall_score": total_score / len(barbers),
            "barber_count": len(barbers),
        }

    def _calculate_performance_grade(self, score: float) -> str:
        """Calculate performance grade from score"""
        if score >= 95:
            return "A+"
        elif score >= 90:
            return "A"
        elif score >= 85:
            return "B+"
        elif score >= 80:
            return "B"
        elif score >= 75:
            return "C+"
        elif score >= 70:
            return "C"
        elif score >= 65:
            return "D+"
        elif score >= 60:
            return "D"
        else:
            return "F"

    # Management methods
    def get_report_configs(self) -> List[ReportConfig]:
        """Get all report configurations"""
        return list(self.report_configs.values())

    def add_report_config(self, config: ReportConfig):
        """Add new report configuration"""
        self.report_configs[config.id] = config
        logger.info(f"Added report config: {config.name}")

    def update_report_config(self, config_id: str, updates: Dict[str, Any]):
        """Update report configuration"""
        if config_id in self.report_configs:
            config = self.report_configs[config_id]
            for key, value in updates.items():
                if hasattr(config, key):
                    setattr(config, key, value)
            logger.info(f"Updated report config: {config_id}")

    async def generate_on_demand_report(
        self, report_type: ReportType, barber_id: Optional[int] = None
    ) -> ReportData:
        """Generate report on demand"""
        # Create temporary config
        temp_config = ReportConfig(
            id="on_demand",
            name=f"On-Demand {report_type.value}",
            report_type=report_type,
            frequency=ReportFrequency.DAILY,  # Not used for on-demand
            format=ReportFormat.JSON,
            recipients=[],
            barber_specific=barber_id is not None,
        )

        return await self._generate_report_data(temp_config, barber_id)


# Convenience function
async def generate_automated_reports():
    """Generate automated reports - for scheduled tasks"""
    db = next(get_db())
    try:
        service = AutomatedReportingService(db)
        await service.generate_scheduled_reports()
    finally:
        db.close()
