"""
Smart Scheduling Recommendations
AI-powered scheduling optimization for maximum revenue and efficiency
"""

import asyncio
import logging
from datetime import datetime, timedelta, date, time
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import statistics

from models.appointment import Appointment
from models.client import Client
from models.barber import Barber
from config.database import get_db

logger = logging.getLogger(__name__)


class RecommendationType(Enum):
    """Types of scheduling recommendations"""

    OPTIMAL_TIMES = "optimal_times"
    GAP_FILLING = "gap_filling"
    REVENUE_OPTIMIZATION = "revenue_optimization"
    CLIENT_PREFERENCE = "client_preference"
    WORKLOAD_BALANCING = "workload_balancing"
    SEASONAL_ADJUSTMENT = "seasonal_adjustment"


class TimeSlotType(Enum):
    """Types of time slots"""

    PEAK = "peak"
    STANDARD = "standard"
    OFF_PEAK = "off_peak"
    DEAD_TIME = "dead_time"


@dataclass
class TimeSlot:
    """Time slot definition"""

    start_time: time
    end_time: time
    day_of_week: int  # 0=Monday, 6=Sunday
    slot_type: TimeSlotType
    demand_score: float  # 0-100
    revenue_potential: float
    booking_probability: float


@dataclass
class SchedulingRecommendation:
    """Scheduling recommendation"""

    recommendation_id: str
    recommendation_type: RecommendationType
    title: str
    description: str
    suggested_time: datetime
    client_id: Optional[int]
    expected_revenue: float
    confidence_score: float  # 0-100
    reasoning: List[str]
    action_required: str


class SmartSchedulingService:
    """Service for generating intelligent scheduling recommendations"""

    def __init__(self, db: Session):
        self.db = db
        self.historical_data = None
        self.client_patterns = None
        self.demand_patterns = None

    async def initialize_patterns(self):
        """Initialize scheduling patterns from historical data"""
        logger.info("Initializing scheduling patterns")

        try:
            # Analyze historical appointment data
            await self._analyze_historical_patterns()
            await self._analyze_client_preferences()
            await self._analyze_demand_patterns()

            logger.info("Scheduling patterns initialized")

        except Exception as e:
            logger.error(f"Error initializing patterns: {e}")

    async def _analyze_historical_patterns(self):
        """Analyze historical appointment patterns"""
        # Get last 90 days of appointments
        cutoff_date = date.today() - timedelta(days=90)

        appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.appointment_date >= cutoff_date,
                    Appointment.status.in_(["completed", "no_show"]),
                )
            )
            .all()
        )

        # Analyze patterns by day of week and time
        patterns = {}
        for appointment in appointments:
            day_of_week = appointment.appointment_date.weekday()
            hour = (
                appointment.appointment_time.hour
                if appointment.appointment_time
                else 12
            )

            key = f"{day_of_week}_{hour}"
            if key not in patterns:
                patterns[key] = {
                    "count": 0,
                    "total_revenue": 0,
                    "completion_rate": 0,
                    "avg_duration": 0,
                }

            patterns[key]["count"] += 1
            if appointment.status == "completed":
                patterns[key]["total_revenue"] += (
                    appointment.service_revenue
                    + appointment.tip_amount
                    + appointment.product_revenue
                )
                patterns[key]["completion_rate"] += 1

        # Calculate averages
        for pattern in patterns.values():
            if pattern["count"] > 0:
                pattern["avg_revenue"] = pattern["total_revenue"] / pattern["count"]
                pattern["completion_rate"] = (
                    pattern["completion_rate"] / pattern["count"] * 100
                )

        self.historical_data = patterns

    async def _analyze_client_preferences(self):
        """Analyze individual client booking preferences"""
        clients = self.db.query(Client).filter(Client.total_visits >= 2).all()

        client_patterns = {}
        for client in clients:
            appointments = (
                self.db.query(Appointment)
                .filter(
                    and_(
                        Appointment.client_id == client.id,
                        Appointment.status == "completed",
                    )
                )
                .all()
            )

            if len(appointments) >= 2:
                # Preferred days and times
                preferred_days = {}
                preferred_times = []

                for appointment in appointments:
                    day = appointment.appointment_date.weekday()
                    preferred_days[day] = preferred_days.get(day, 0) + 1

                    if appointment.appointment_time:
                        preferred_times.append(appointment.appointment_time.hour)

                # Calculate booking frequency
                if len(appointments) >= 2:
                    dates = sorted([a.appointment_date for a in appointments])
                    intervals = [
                        (dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)
                    ]
                    avg_interval = statistics.mean(intervals) if intervals else 30
                else:
                    avg_interval = 30

                client_patterns[client.id] = {
                    "preferred_days": preferred_days,
                    "preferred_hours": preferred_times,
                    "avg_booking_interval": avg_interval,
                    "total_visits": len(appointments),
                    "avg_spend": sum(
                        a.service_revenue + a.tip_amount + a.product_revenue
                        for a in appointments
                    )
                    / len(appointments),
                }

        self.client_patterns = client_patterns

    async def _analyze_demand_patterns(self):
        """Analyze demand patterns across different time periods"""
        # Analyze booking demand by hour and day
        cutoff_date = date.today() - timedelta(days=60)

        appointments = (
            self.db.query(Appointment)
            .filter(Appointment.appointment_date >= cutoff_date)
            .all()
        )

        demand_by_hour = {}
        demand_by_day = {}

        for appointment in appointments:
            hour = (
                appointment.appointment_time.hour
                if appointment.appointment_time
                else 12
            )
            day = appointment.appointment_date.weekday()

            demand_by_hour[hour] = demand_by_hour.get(hour, 0) + 1
            demand_by_day[day] = demand_by_day.get(day, 0) + 1

        # Calculate demand scores (0-100)
        max_hourly_demand = max(demand_by_hour.values()) if demand_by_hour else 1
        max_daily_demand = max(demand_by_day.values()) if demand_by_day else 1

        normalized_hourly = {
            h: (count / max_hourly_demand * 100) for h, count in demand_by_hour.items()
        }
        normalized_daily = {
            d: (count / max_daily_demand * 100) for d, count in demand_by_day.items()
        }

        self.demand_patterns = {"hourly": normalized_hourly, "daily": normalized_daily}

    async def generate_recommendations(
        self, barber_id: int, target_date: date = None
    ) -> List[SchedulingRecommendation]:
        """Generate scheduling recommendations for barber"""
        if not target_date:
            target_date = date.today() + timedelta(days=1)

        logger.info(
            f"Generating scheduling recommendations for barber {barber_id} on {target_date}"
        )

        try:
            # Initialize patterns if not done
            if not self.historical_data:
                await self.initialize_patterns()

            recommendations = []

            # Generate different types of recommendations
            recommendations.extend(
                await self._recommend_optimal_times(barber_id, target_date)
            )
            recommendations.extend(
                await self._recommend_gap_filling(barber_id, target_date)
            )
            recommendations.extend(
                await self._recommend_client_outreach(barber_id, target_date)
            )
            recommendations.extend(
                await self._recommend_revenue_optimization(barber_id, target_date)
            )

            # Sort by confidence score and expected revenue
            recommendations.sort(
                key=lambda x: (x.confidence_score, x.expected_revenue), reverse=True
            )

            return recommendations[:10]  # Return top 10 recommendations

        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return []

    async def _recommend_optimal_times(
        self, barber_id: int, target_date: date
    ) -> List[SchedulingRecommendation]:
        """Recommend optimal booking times based on historical data"""
        recommendations = []

        # Get current schedule for the day
        existing_appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date == target_date,
                    Appointment.status.in_(["scheduled", "confirmed"]),
                )
            )
            .all()
        )

        booked_hours = set()
        for appointment in existing_appointments:
            if appointment.appointment_time:
                booked_hours.add(appointment.appointment_time.hour)

        # Find optimal available time slots
        day_of_week = target_date.weekday()

        # Business hours (9 AM to 6 PM)
        for hour in range(9, 18):
            if hour not in booked_hours:
                # Check historical performance for this time slot
                pattern_key = f"{day_of_week}_{hour}"
                pattern = self.historical_data.get(pattern_key, {})

                avg_revenue = pattern.get("avg_revenue", 50.0)
                completion_rate = pattern.get("completion_rate", 85.0)

                # Calculate demand score
                demand_score = self.demand_patterns["hourly"].get(hour, 50.0)

                # Calculate confidence based on historical data
                confidence = min(95, (pattern.get("count", 0) * 5) + 50)

                if (
                    demand_score > 60 and avg_revenue > 40
                ):  # Only recommend good time slots
                    suggested_time = datetime.combine(target_date, time(hour, 0))

                    recommendations.append(
                        SchedulingRecommendation(
                            recommendation_id=f"optimal_time_{hour}_{target_date}",
                            recommendation_type=RecommendationType.OPTIMAL_TIMES,
                            title=f"High-Demand Time Slot Available",
                            description=f"Open appointment slot at {hour}:00 has high booking demand",
                            suggested_time=suggested_time,
                            client_id=None,
                            expected_revenue=avg_revenue,
                            confidence_score=confidence,
                            reasoning=[
                                f"Historical demand score: {demand_score:.1f}%",
                                f"Average revenue: ${avg_revenue:.2f}",
                                f"Completion rate: {completion_rate:.1f}%",
                            ],
                            action_required="Block time or promote availability",
                        )
                    )

        return recommendations

    async def _recommend_gap_filling(
        self, barber_id: int, target_date: date
    ) -> List[SchedulingRecommendation]:
        """Recommend ways to fill scheduling gaps"""
        recommendations = []

        # Get current schedule
        existing_appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date == target_date,
                    Appointment.status.in_(["scheduled", "confirmed"]),
                )
            )
            .order_by(Appointment.appointment_time)
            .all()
        )

        if len(existing_appointments) < 2:
            return recommendations

        # Find gaps between appointments
        for i in range(len(existing_appointments) - 1):
            current_apt = existing_appointments[i]
            next_apt = existing_appointments[i + 1]

            if current_apt.appointment_time and next_apt.appointment_time:
                # Calculate gap duration
                current_end = datetime.combine(
                    target_date, current_apt.appointment_time
                ) + timedelta(minutes=current_apt.service_duration or 60)

                next_start = datetime.combine(target_date, next_apt.appointment_time)
                gap_duration = (next_start - current_end).seconds // 60

                # If gap is 60+ minutes, recommend filling it
                if gap_duration >= 60:
                    gap_start_time = current_end

                    # Suggest appropriate service for the gap
                    if gap_duration >= 90:
                        service_suggestion = "Full service appointment"
                        expected_revenue = 70.0
                    else:
                        service_suggestion = "Quick touch-up or beard trim"
                        expected_revenue = 35.0

                    recommendations.append(
                        SchedulingRecommendation(
                            recommendation_id=f"gap_fill_{i}_{target_date}",
                            recommendation_type=RecommendationType.GAP_FILLING,
                            title=f"{gap_duration}-minute Gap Available",
                            description=f"Schedule gap from {gap_start_time.strftime('%H:%M')} can fit {service_suggestion.lower()}",
                            suggested_time=gap_start_time,
                            client_id=None,
                            expected_revenue=expected_revenue,
                            confidence_score=80.0,
                            reasoning=[
                                f"Gap duration: {gap_duration} minutes",
                                f"Suitable for: {service_suggestion}",
                                "Maximizes schedule efficiency",
                            ],
                            action_required="Offer walk-in or quick service",
                        )
                    )

        return recommendations

    async def _recommend_client_outreach(
        self, barber_id: int, target_date: date
    ) -> List[SchedulingRecommendation]:
        """Recommend specific clients to reach out to for booking"""
        recommendations = []

        if not self.client_patterns:
            return recommendations

        # Find clients due for their next appointment
        for client_id, pattern in self.client_patterns.items():
            client = self.db.query(Client).get(client_id)
            if not client or not client.last_visit_date:
                continue

            # Check if client is due for next appointment
            days_since_last = (target_date - client.last_visit_date).days
            avg_interval = pattern.get("avg_booking_interval", 30)

            # Client is due if it's been 80% of their average interval
            if days_since_last >= (avg_interval * 0.8):
                # Check if target date matches their preferences
                preferred_days = pattern.get("preferred_days", {})
                target_day_score = preferred_days.get(target_date.weekday(), 0)

                if target_day_score > 0:  # Client has booked on this day before
                    confidence = min(90, (target_day_score * 20) + 50)
                    expected_revenue = pattern.get("avg_spend", 60.0)

                    # Suggest optimal time based on client's history
                    preferred_hours = pattern.get("preferred_hours", [12])
                    optimal_hour = (
                        statistics.mode(preferred_hours) if preferred_hours else 12
                    )

                    suggested_time = datetime.combine(
                        target_date, time(optimal_hour, 0)
                    )

                    recommendations.append(
                        SchedulingRecommendation(
                            recommendation_id=f"client_outreach_{client_id}_{target_date}",
                            recommendation_type=RecommendationType.CLIENT_PREFERENCE,
                            title=f"Reach Out to {client.first_name or client.name}",
                            description=f"Client is due for appointment based on {avg_interval}-day pattern",
                            suggested_time=suggested_time,
                            client_id=client_id,
                            expected_revenue=expected_revenue,
                            confidence_score=confidence,
                            reasoning=[
                                f"Last visit: {days_since_last} days ago",
                                f"Average interval: {avg_interval} days",
                                f"Preferred day match: {target_day_score} bookings",
                                f"Average spend: ${expected_revenue:.2f}",
                            ],
                            action_required="Send booking reminder or call client",
                        )
                    )

        return recommendations

    async def _recommend_revenue_optimization(
        self, barber_id: int, target_date: date
    ) -> List[SchedulingRecommendation]:
        """Recommend revenue optimization strategies"""
        recommendations = []

        # Get current day's bookings
        existing_appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date == target_date,
                    Appointment.status.in_(["scheduled", "confirmed"]),
                )
            )
            .all()
        )

        current_revenue = sum(
            (a.service_revenue or 50.0) + (a.tip_amount or 0) + (a.product_revenue or 0)
            for a in existing_appointments
        )

        # Calculate potential revenue with optimization
        target_revenue = len(existing_appointments) * 75.0  # Target $75 per appointment

        if current_revenue < target_revenue:
            revenue_gap = target_revenue - current_revenue

            recommendations.append(
                SchedulingRecommendation(
                    recommendation_id=f"revenue_opt_{target_date}",
                    recommendation_type=RecommendationType.REVENUE_OPTIMIZATION,
                    title="Revenue Optimization Opportunity",
                    description=f"Potential to increase revenue by ${revenue_gap:.2f} with upselling",
                    suggested_time=datetime.combine(target_date, time(9, 0)),
                    client_id=None,
                    expected_revenue=revenue_gap,
                    confidence_score=75.0,
                    reasoning=[
                        f"Current projected revenue: ${current_revenue:.2f}",
                        f"Target revenue: ${target_revenue:.2f}",
                        "Focus on premium services and product sales",
                    ],
                    action_required="Implement upselling strategies",
                )
            )

        return recommendations

    async def get_schedule_optimization_analysis(
        self, barber_id: int, analysis_period_days: int = 7
    ) -> Dict[str, Any]:
        """Get comprehensive schedule optimization analysis"""
        start_date = date.today()
        end_date = start_date + timedelta(days=analysis_period_days)

        # Get existing appointments
        appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.appointment_date >= start_date,
                    Appointment.appointment_date <= end_date,
                )
            )
            .all()
        )

        # Analyze current schedule efficiency
        total_scheduled_hours = 0
        total_revenue = 0
        appointment_gaps = []

        daily_analysis = {}

        for day_offset in range(analysis_period_days):
            current_date = start_date + timedelta(days=day_offset)
            day_appointments = [
                a for a in appointments if a.appointment_date == current_date
            ]

            if day_appointments:
                day_appointments.sort(key=lambda x: x.appointment_time or time(12, 0))

                # Calculate metrics for this day
                day_revenue = sum(
                    (a.service_revenue or 50)
                    + (a.tip_amount or 0)
                    + (a.product_revenue or 0)
                    for a in day_appointments
                )

                day_hours = sum(a.service_duration or 60 for a in day_appointments) / 60

                # Find gaps
                gaps = []
                for i in range(len(day_appointments) - 1):
                    current_end = day_appointments[i].appointment_time or time(12, 0)
                    next_start = day_appointments[i + 1].appointment_time or time(13, 0)

                    # Calculate gap (simplified)
                    gap_minutes = (next_start.hour - current_end.hour - 1) * 60
                    if gap_minutes > 30:
                        gaps.append(gap_minutes)

                daily_analysis[current_date.isoformat()] = {
                    "appointments": len(day_appointments),
                    "revenue": day_revenue,
                    "scheduled_hours": day_hours,
                    "revenue_per_hour": day_revenue / day_hours if day_hours > 0 else 0,
                    "gaps": gaps,
                    "utilization": min(
                        100, (day_hours / 8) * 100
                    ),  # Assuming 8-hour workday
                }
            else:
                daily_analysis[current_date.isoformat()] = {
                    "appointments": 0,
                    "revenue": 0,
                    "scheduled_hours": 0,
                    "revenue_per_hour": 0,
                    "gaps": [],
                    "utilization": 0,
                }

        # Calculate overall metrics
        total_appointments = len(appointments)
        total_revenue = sum(daily_analysis[day]["revenue"] for day in daily_analysis)
        avg_utilization = statistics.mean(
            [daily_analysis[day]["utilization"] for day in daily_analysis]
        )

        # Generate optimization suggestions
        optimization_suggestions = []

        if avg_utilization < 70:
            optimization_suggestions.append(
                "Increase booking volume - schedule utilization is below 70%"
            )

        if total_revenue / analysis_period_days < 400:
            optimization_suggestions.append(
                "Focus on revenue optimization - daily average below target"
            )

        return {
            "analysis_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": analysis_period_days,
            },
            "current_metrics": {
                "total_appointments": total_appointments,
                "total_revenue": total_revenue,
                "avg_daily_revenue": total_revenue / analysis_period_days,
                "avg_utilization": avg_utilization,
                "avg_revenue_per_appointment": (
                    total_revenue / total_appointments if total_appointments > 0 else 0
                ),
            },
            "daily_breakdown": daily_analysis,
            "optimization_opportunities": optimization_suggestions,
            "potential_revenue_increase": self._calculate_potential_revenue_increase(
                daily_analysis
            ),
        }

    def _calculate_potential_revenue_increase(
        self, daily_analysis: Dict[str, Any]
    ) -> float:
        """Calculate potential revenue increase with optimization"""
        total_potential = 0

        for day_data in daily_analysis.values():
            current_revenue = day_data["revenue"]
            utilization = day_data["utilization"]

            # If utilization is below 80%, there's potential for more bookings
            if utilization < 80:
                potential_additional_revenue = (
                    (80 - utilization) / 100 * 400
                )  # $400 target daily
                total_potential += potential_additional_revenue

        return total_potential

    async def get_optimal_time_slots(
        self, barber_id: int, target_date: date
    ) -> List[TimeSlot]:
        """Get optimal time slots for a specific date"""
        if not self.demand_patterns:
            await self.initialize_patterns()

        day_of_week = target_date.weekday()
        time_slots = []

        # Business hours
        for hour in range(9, 18):
            demand_score = self.demand_patterns["hourly"].get(hour, 50.0)

            # Determine slot type based on demand
            if demand_score >= 80:
                slot_type = TimeSlotType.PEAK
                revenue_potential = 80.0
                booking_probability = 0.9
            elif demand_score >= 60:
                slot_type = TimeSlotType.STANDARD
                revenue_potential = 60.0
                booking_probability = 0.7
            elif demand_score >= 40:
                slot_type = TimeSlotType.OFF_PEAK
                revenue_potential = 45.0
                booking_probability = 0.5
            else:
                slot_type = TimeSlotType.DEAD_TIME
                revenue_potential = 30.0
                booking_probability = 0.3

            time_slots.append(
                TimeSlot(
                    start_time=time(hour, 0),
                    end_time=time(hour + 1, 0),
                    day_of_week=day_of_week,
                    slot_type=slot_type,
                    demand_score=demand_score,
                    revenue_potential=revenue_potential,
                    booking_probability=booking_probability,
                )
            )

        return time_slots


# Convenience function
async def generate_scheduling_recommendations(
    barber_id: int, target_date: date = None
) -> List[SchedulingRecommendation]:
    """Generate scheduling recommendations for API endpoints"""
    db = next(get_db())
    try:
        service = SmartSchedulingService(db)
        return await service.generate_recommendations(barber_id, target_date)
    finally:
        db.close()
