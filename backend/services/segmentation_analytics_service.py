from typing import Dict, List, Optional, Tuple
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, case
from dataclasses import dataclass
import json
import logging
import numpy as np
from collections import defaultdict

from models import Appointment, Client, Barber
from utils.cache import cache_result, monitor_performance
from services.customer_segmentation_service import CustomerSegmentationService


@dataclass
class AnalyticsConfig:
    """Configuration for analytics calculations"""

    clv_prediction_months: int = 12  # Months to predict CLV
    frequency_analysis_period: int = 90  # Days for frequency analysis
    seasonality_threshold: float = 0.2  # Threshold for seasonal pattern detection
    cohort_analysis_months: int = 6  # Months for cohort analysis


class SegmentationAnalyticsService:
    """
    Advanced analytics service for customer segmentation
    Provides CLV, frequency analysis, spending patterns, and behavioral insights
    """

    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.config = AnalyticsConfig()
        self.segmentation_service = CustomerSegmentationService(db)

    @cache_result(ttl_seconds=3600, key_prefix="clv_analysis")
    @monitor_performance
    def calculate_customer_lifetime_value(self, barber_id: int) -> Dict:
        """
        Calculate comprehensive customer lifetime value metrics
        """
        # Get all clients with their appointment history
        clients_data = (
            self.db.query(
                Client.id,
                Client.first_name,
                Client.last_name,
                Client.total_visits,
                Client.total_spent,
                Client.first_visit_date,
                Client.last_visit_date,
                Client.visit_frequency_days,
                func.count(Appointment.id).label("completed_appointments"),
                func.avg(
                    Appointment.service_revenue
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("avg_transaction"),
            )
            .join(
                Appointment,
                and_(
                    Appointment.client_id == Client.id,
                    Appointment.status == "completed",
                ),
                isouter=True,
            )
            .filter(Client.barber_id == barber_id)
            .group_by(
                Client.id,
                Client.first_name,
                Client.last_name,
                Client.total_visits,
                Client.total_spent,
                Client.first_visit_date,
                Client.last_visit_date,
                Client.visit_frequency_days,
            )
            .all()
        )

        clv_analysis = {
            "historical_clv": [],
            "predicted_clv": [],
            "clv_segments": {},
            "summary_stats": {},
            "growth_projections": {},
        }

        historical_clvs = []
        predicted_clvs = []

        for client_data in clients_data:
            if (
                not client_data.first_visit_date
                or client_data.completed_appointments == 0
            ):
                continue

            # Historical CLV calculation
            historical_clv = float(client_data.total_spent or 0)

            # Predicted CLV calculation
            avg_transaction = float(client_data.avg_transaction or 0)
            visit_frequency = client_data.visit_frequency_days or 0

            if visit_frequency > 0:
                visits_per_year = 365 / visit_frequency
                predicted_annual_value = avg_transaction * visits_per_year

                # Apply retention probability (simplified model)
                months_active = self._calculate_months_active(
                    client_data.first_visit_date, client_data.last_visit_date
                )
                retention_probability = min(0.95, 0.5 + (months_active * 0.05))

                predicted_clv = predicted_annual_value * retention_probability
            else:
                predicted_clv = avg_transaction  # One-time customer

            historical_clvs.append(historical_clv)
            predicted_clvs.append(predicted_clv)

            clv_analysis["historical_clv"].append(
                {
                    "client_id": client_data.id,
                    "name": f"{client_data.first_name} {client_data.last_name}",
                    "historical_clv": round(historical_clv, 2),
                    "predicted_clv": round(predicted_clv, 2),
                    "total_visits": client_data.total_visits,
                    "avg_transaction": round(avg_transaction, 2),
                    "months_active": self._calculate_months_active(
                        client_data.first_visit_date, client_data.last_visit_date
                    ),
                }
            )

        # Calculate summary statistics
        if historical_clvs:
            clv_analysis["summary_stats"] = {
                "total_customers": len(historical_clvs),
                "avg_historical_clv": round(np.mean(historical_clvs), 2),
                "avg_predicted_clv": round(np.mean(predicted_clvs), 2),
                "median_historical_clv": round(np.median(historical_clvs), 2),
                "median_predicted_clv": round(np.median(predicted_clvs), 2),
                "total_historical_value": round(sum(historical_clvs), 2),
                "total_predicted_value": round(sum(predicted_clvs), 2),
                "clv_growth_potential": round(
                    sum(predicted_clvs) - sum(historical_clvs), 2
                ),
            }

            # CLV segments (quartiles)
            historical_quartiles = np.percentile(historical_clvs, [25, 50, 75])
            clv_analysis["clv_segments"] = {
                "high_value": len(
                    [clv for clv in historical_clvs if clv >= historical_quartiles[2]]
                ),
                "medium_value": len(
                    [
                        clv
                        for clv in historical_clvs
                        if historical_quartiles[0] <= clv < historical_quartiles[2]
                    ]
                ),
                "low_value": len(
                    [clv for clv in historical_clvs if clv < historical_quartiles[0]]
                ),
                "quartile_thresholds": {
                    "q1": round(historical_quartiles[0], 2),
                    "q2": round(historical_quartiles[1], 2),
                    "q3": round(historical_quartiles[2], 2),
                },
            }

        return clv_analysis

    @cache_result(ttl_seconds=1800, key_prefix="frequency_analysis")
    @monitor_performance
    def analyze_booking_frequency(self, barber_id: int) -> Dict:
        """
        Analyze customer booking frequency patterns
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=self.config.frequency_analysis_period)

        # Get appointment frequency data
        frequency_data = (
            self.db.query(
                Client.id,
                Client.first_name,
                Client.last_name,
                func.count(Appointment.id).label("appointments_count"),
                func.min(Appointment.appointment_date).label("first_appointment"),
                func.max(Appointment.appointment_date).label("last_appointment"),
            )
            .join(Appointment)
            .filter(
                and_(
                    Client.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.status == "completed",
                )
            )
            .group_by(Client.id, Client.first_name, Client.last_name)
            .all()
        )

        frequency_analysis = {
            "frequency_distribution": {},
            "customer_categories": {
                "very_frequent": [],  # Weekly
                "frequent": [],  # Bi-weekly
                "regular": [],  # Monthly
                "occasional": [],  # Quarterly
                "rare": [],  # Less than quarterly
            },
            "frequency_trends": {},
            "summary": {},
        }

        frequency_counts = []

        for client_data in frequency_data:
            days_active = (
                client_data.last_appointment - client_data.first_appointment
            ).days
            if days_active == 0:
                days_active = 1  # Avoid division by zero

            avg_days_between_visits = days_active / max(
                1, client_data.appointments_count - 1
            )
            frequency_counts.append(client_data.appointments_count)

            # Categorize based on average frequency
            customer_info = {
                "client_id": client_data.id,
                "name": f"{client_data.first_name} {client_data.last_name}",
                "appointments_count": client_data.appointments_count,
                "avg_days_between_visits": round(avg_days_between_visits, 1),
                "frequency_score": self._calculate_frequency_score(
                    avg_days_between_visits
                ),
            }

            if avg_days_between_visits <= 10:
                frequency_analysis["customer_categories"]["very_frequent"].append(
                    customer_info
                )
            elif avg_days_between_visits <= 21:
                frequency_analysis["customer_categories"]["frequent"].append(
                    customer_info
                )
            elif avg_days_between_visits <= 45:
                frequency_analysis["customer_categories"]["regular"].append(
                    customer_info
                )
            elif avg_days_between_visits <= 90:
                frequency_analysis["customer_categories"]["occasional"].append(
                    customer_info
                )
            else:
                frequency_analysis["customer_categories"]["rare"].append(customer_info)

        # Frequency distribution
        frequency_distribution = defaultdict(int)
        for count in frequency_counts:
            frequency_distribution[count] += 1

        frequency_analysis["frequency_distribution"] = dict(frequency_distribution)

        # Summary statistics
        if frequency_counts:
            frequency_analysis["summary"] = {
                "total_active_customers": len(frequency_counts),
                "avg_appointments_per_customer": round(np.mean(frequency_counts), 2),
                "median_appointments_per_customer": round(
                    np.median(frequency_counts), 2
                ),
                "frequency_categories": {
                    category: len(customers)
                    for category, customers in frequency_analysis[
                        "customer_categories"
                    ].items()
                },
            }

        return frequency_analysis

    @cache_result(ttl_seconds=3600, key_prefix="spending_analysis")
    @monitor_performance
    def analyze_spending_patterns(self, barber_id: int) -> Dict:
        """
        Analyze customer spending patterns and trends
        """
        # Monthly spending analysis for the last 12 months
        end_date = date.today()
        start_date = end_date - timedelta(days=365)

        monthly_spending = (
            self.db.query(
                func.date_trunc("month", Appointment.appointment_date).label("month"),
                func.count(Appointment.id).label("appointment_count"),
                func.sum(
                    Appointment.service_revenue
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("total_revenue"),
                func.avg(
                    Appointment.service_revenue
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("avg_ticket"),
                func.count(func.distinct(Appointment.client_id)).label(
                    "unique_customers"
                ),
            )
            .join(Client)
            .filter(
                and_(
                    Client.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.status == "completed",
                )
            )
            .group_by(func.date_trunc("month", Appointment.appointment_date))
            .order_by("month")
            .all()
        )

        # Customer spending distribution
        customer_spending = (
            self.db.query(
                Client.id,
                Client.first_name,
                Client.last_name,
                func.sum(
                    Appointment.service_revenue
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("total_spent"),
                func.count(Appointment.id).label("total_appointments"),
                func.avg(
                    Appointment.service_revenue
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("avg_spend_per_visit"),
            )
            .join(Appointment)
            .filter(
                and_(
                    Client.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.status == "completed",
                )
            )
            .group_by(Client.id, Client.first_name, Client.last_name)
            .order_by(desc("total_spent"))
            .all()
        )

        spending_analysis = {
            "monthly_trends": [],
            "customer_spending_distribution": [],
            "spending_segments": {},
            "service_spending_breakdown": {},
            "summary": {},
        }

        # Process monthly trends
        monthly_revenues = []
        for month_data in monthly_spending:
            month_info = {
                "month": month_data.month.strftime("%Y-%m"),
                "appointment_count": month_data.appointment_count,
                "total_revenue": round(float(month_data.total_revenue), 2),
                "avg_ticket": round(float(month_data.avg_ticket), 2),
                "unique_customers": month_data.unique_customers,
            }
            spending_analysis["monthly_trends"].append(month_info)
            monthly_revenues.append(float(month_data.total_revenue))

        # Process customer spending
        customer_spends = []
        for customer_data in customer_spending:
            customer_info = {
                "client_id": customer_data.id,
                "name": f"{customer_data.first_name} {customer_data.last_name}",
                "total_spent": round(float(customer_data.total_spent), 2),
                "total_appointments": customer_data.total_appointments,
                "avg_spend_per_visit": round(
                    float(customer_data.avg_spend_per_visit), 2
                ),
            }
            spending_analysis["customer_spending_distribution"].append(customer_info)
            customer_spends.append(float(customer_data.total_spent))

        # Spending segments (quartiles)
        if customer_spends:
            spending_quartiles = np.percentile(customer_spends, [25, 50, 75, 90])
            spending_analysis["spending_segments"] = {
                "top_10_percent": len(
                    [s for s in customer_spends if s >= spending_quartiles[3]]
                ),
                "high_spenders": len(
                    [
                        s
                        for s in customer_spends
                        if spending_quartiles[2] <= s < spending_quartiles[3]
                    ]
                ),
                "medium_spenders": len(
                    [
                        s
                        for s in customer_spends
                        if spending_quartiles[0] <= s < spending_quartiles[2]
                    ]
                ),
                "low_spenders": len(
                    [s for s in customer_spends if s < spending_quartiles[0]]
                ),
                "quartile_thresholds": {
                    "q1": round(spending_quartiles[0], 2),
                    "q2": round(spending_quartiles[1], 2),
                    "q3": round(spending_quartiles[2], 2),
                    "top_10": round(spending_quartiles[3], 2),
                },
            }

        # Summary statistics
        if monthly_revenues and customer_spends:
            spending_analysis["summary"] = {
                "total_revenue_12_months": round(sum(monthly_revenues), 2),
                "avg_monthly_revenue": round(np.mean(monthly_revenues), 2),
                "revenue_growth_rate": self._calculate_growth_rate(monthly_revenues),
                "total_customers": len(customer_spends),
                "avg_customer_spend": round(np.mean(customer_spends), 2),
                "median_customer_spend": round(np.median(customer_spends), 2),
                "revenue_concentration": self._calculate_revenue_concentration(
                    customer_spends
                ),
            }

        return spending_analysis

    @cache_result(ttl_seconds=3600, key_prefix="service_preferences")
    @monitor_performance
    def analyze_service_preferences(self, barber_id: int) -> Dict:
        """
        Analyze service preferences by customer segments
        """
        # Get service usage by segment
        service_data = (
            self.db.query(
                Appointment.service_name,
                Appointment.service_category,
                Client.customer_type,
                func.count(Appointment.id).label("service_count"),
                func.sum(Appointment.service_revenue).label("service_revenue"),
                func.avg(Appointment.service_revenue).label("avg_service_price"),
            )
            .join(Client)
            .filter(
                and_(
                    Client.barber_id == barber_id,
                    Appointment.status == "completed",
                    Appointment.service_name.isnot(None),
                )
            )
            .group_by(
                Appointment.service_name,
                Appointment.service_category,
                Client.customer_type,
            )
            .order_by(desc("service_count"))
            .all()
        )

        service_analysis = {
            "overall_preferences": {},
            "segment_preferences": {},
            "service_performance": {},
            "cross_sell_opportunities": {},
            "summary": {},
        }

        # Group data by service and segment
        service_totals = defaultdict(int)
        segment_services = defaultdict(lambda: defaultdict(int))
        service_revenues = defaultdict(float)

        for data in service_data:
            service_name = data.service_name or "Standard Service"
            segment = data.customer_type or "unknown"

            service_totals[service_name] += data.service_count
            segment_services[segment][service_name] += data.service_count
            service_revenues[service_name] += float(data.service_revenue or 0)

        # Overall service preferences
        total_services = sum(service_totals.values())
        service_analysis["overall_preferences"] = {
            service: {
                "count": count,
                "percentage": round(count / total_services * 100, 1),
                "revenue": round(service_revenues[service], 2),
            }
            for service, count in sorted(
                service_totals.items(), key=lambda x: x[1], reverse=True
            )
        }

        # Segment-specific preferences
        for segment, services in segment_services.items():
            segment_total = sum(services.values())
            service_analysis["segment_preferences"][segment] = {
                service: {
                    "count": count,
                    "percentage": round(count / segment_total * 100, 1),
                }
                for service, count in sorted(
                    services.items(), key=lambda x: x[1], reverse=True
                )
            }

        return service_analysis

    @cache_result(ttl_seconds=3600, key_prefix="seasonal_behavior")
    @monitor_performance
    def analyze_seasonal_behavior(self, barber_id: int) -> Dict:
        """
        Analyze seasonal booking behavior patterns
        """
        # Get 2 years of data for seasonal analysis
        end_date = date.today()
        start_date = end_date - timedelta(days=730)

        seasonal_data = (
            self.db.query(
                func.extract("month", Appointment.appointment_date).label("month"),
                func.extract("quarter", Appointment.appointment_date).label("quarter"),
                func.extract("dow", Appointment.appointment_date).label("day_of_week"),
                func.count(Appointment.id).label("appointment_count"),
                func.sum(
                    Appointment.service_revenue
                    + func.coalesce(Appointment.tip_amount, 0)
                    + func.coalesce(Appointment.product_revenue, 0)
                ).label("total_revenue"),
                func.count(func.distinct(Appointment.client_id)).label(
                    "unique_customers"
                ),
            )
            .join(Client)
            .filter(
                and_(
                    Client.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.status == "completed",
                )
            )
            .group_by("month", "quarter", "day_of_week")
            .all()
        )

        seasonal_analysis = {
            "monthly_patterns": {},
            "quarterly_patterns": {},
            "weekly_patterns": {},
            "seasonal_insights": [],
            "peak_periods": {},
            "summary": {},
        }

        # Process seasonal data
        monthly_stats = defaultdict(
            lambda: {"appointments": 0, "revenue": 0, "customers": set()}
        )
        quarterly_stats = defaultdict(
            lambda: {"appointments": 0, "revenue": 0, "customers": set()}
        )
        weekly_stats = defaultdict(
            lambda: {"appointments": 0, "revenue": 0, "customers": set()}
        )

        for data in seasonal_data:
            month = int(data.month)
            quarter = int(data.quarter)
            dow = int(data.day_of_week)

            monthly_stats[month]["appointments"] += data.appointment_count
            monthly_stats[month]["revenue"] += float(data.total_revenue or 0)

            quarterly_stats[quarter]["appointments"] += data.appointment_count
            quarterly_stats[quarter]["revenue"] += float(data.total_revenue or 0)

            weekly_stats[dow]["appointments"] += data.appointment_count
            weekly_stats[dow]["revenue"] += float(data.total_revenue or 0)

        # Convert to final format
        seasonal_analysis["monthly_patterns"] = {
            month: {
                "appointments": stats["appointments"],
                "revenue": round(stats["revenue"], 2),
                "month_name": self._get_month_name(month),
            }
            for month, stats in monthly_stats.items()
        }

        seasonal_analysis["quarterly_patterns"] = {
            quarter: {
                "appointments": stats["appointments"],
                "revenue": round(stats["revenue"], 2),
                "quarter_name": f"Q{quarter}",
            }
            for quarter, stats in quarterly_stats.items()
        }

        seasonal_analysis["weekly_patterns"] = {
            dow: {
                "appointments": stats["appointments"],
                "revenue": round(stats["revenue"], 2),
                "day_name": self._get_day_name(dow),
            }
            for dow, stats in weekly_stats.items()
        }

        # Generate insights
        seasonal_analysis["seasonal_insights"] = self._generate_seasonal_insights(
            monthly_stats, quarterly_stats, weekly_stats
        )

        return seasonal_analysis

    def _calculate_months_active(self, first_visit: date, last_visit: date) -> int:
        """Calculate months between first and last visit"""
        if not first_visit or not last_visit:
            return 1

        months = (last_visit.year - first_visit.year) * 12 + (
            last_visit.month - first_visit.month
        )
        return max(1, months)

    def _calculate_frequency_score(self, avg_days_between_visits: float) -> float:
        """Calculate frequency score (0-100)"""
        if avg_days_between_visits <= 7:
            return 100
        elif avg_days_between_visits <= 14:
            return 90
        elif avg_days_between_visits <= 30:
            return 75
        elif avg_days_between_visits <= 60:
            return 50
        elif avg_days_between_visits <= 90:
            return 25
        else:
            return 10

    def _calculate_growth_rate(self, values: List[float]) -> float:
        """Calculate growth rate from a series of values"""
        if len(values) < 2:
            return 0.0

        first_value = values[0]
        last_value = values[-1]

        if first_value == 0:
            return 0.0

        growth_rate = ((last_value - first_value) / first_value) * 100
        return round(growth_rate, 2)

    def _calculate_revenue_concentration(self, customer_spends: List[float]) -> Dict:
        """Calculate revenue concentration metrics"""
        total_revenue = sum(customer_spends)
        sorted_spends = sorted(customer_spends, reverse=True)

        # Top 10% and 20% concentration
        top_10_count = max(1, len(sorted_spends) // 10)
        top_20_count = max(1, len(sorted_spends) // 5)

        top_10_revenue = sum(sorted_spends[:top_10_count])
        top_20_revenue = sum(sorted_spends[:top_20_count])

        return {
            "top_10_percent_share": round(top_10_revenue / total_revenue * 100, 1),
            "top_20_percent_share": round(top_20_revenue / total_revenue * 100, 1),
            "gini_coefficient": self._calculate_gini_coefficient(customer_spends),
        }

    def _calculate_gini_coefficient(self, values: List[float]) -> float:
        """Calculate Gini coefficient for inequality measurement"""
        if not values or len(values) == 1:
            return 0.0

        values = sorted(values)
        n = len(values)
        index = np.arange(1, n + 1)

        gini = (2 * np.sum(index * values)) / (n * np.sum(values)) - (n + 1) / n
        return round(gini, 3)

    def _get_month_name(self, month: int) -> str:
        """Get month name from number"""
        months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ]
        return months[month - 1] if 1 <= month <= 12 else "Unknown"

    def _get_day_name(self, dow: int) -> str:
        """Get day name from day of week number"""
        days = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ]
        return days[dow] if 0 <= dow <= 6 else "Unknown"

    def _generate_seasonal_insights(
        self, monthly_stats, quarterly_stats, weekly_stats
    ) -> List[str]:
        """Generate insights from seasonal data"""
        insights = []

        # Find peak month
        if monthly_stats:
            peak_month = max(monthly_stats.items(), key=lambda x: x[1]["appointments"])
            insights.append(
                f"Peak booking month: {self._get_month_name(peak_month[0])} with {peak_month[1]['appointments']} appointments"
            )

        # Find peak quarter
        if quarterly_stats:
            peak_quarter = max(
                quarterly_stats.items(), key=lambda x: x[1]["appointments"]
            )
            insights.append(
                f"Peak booking quarter: Q{peak_quarter[0]} with {peak_quarter[1]['appointments']} appointments"
            )

        # Find peak day
        if weekly_stats:
            peak_day = max(weekly_stats.items(), key=lambda x: x[1]["appointments"])
            insights.append(
                f"Peak booking day: {self._get_day_name(peak_day[0])} with {peak_day[1]['appointments']} appointments"
            )

        return insights
