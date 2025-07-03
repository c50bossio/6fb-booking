"""
AI Benchmarking Service for Cross-User Performance Comparisons.

Provides industry benchmarking, percentile rankings, and competitive intelligence
using privacy-compliant aggregated data from across the BookedBarber platform.
"""

import logging
import numpy as np
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime, timedelta, date
from dataclasses import dataclass
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc

from models import (
    User, Appointment, Payment, Service, PerformanceBenchmark, CrossUserMetric,
    BenchmarkCategory, BusinessSegment, AIInsightCache, InsightType
)
from services.privacy_anonymization_service import PrivacyAnonymizationService
from services.analytics_service import AnalyticsService as EnhancedAnalyticsService
from utils.sanitization import sanitize_input

logger = logging.getLogger(__name__)


@dataclass
class BenchmarkResult:
    """Container for benchmark comparison results"""
    user_value: float
    percentile_rank: int  # 1-100
    industry_median: float
    industry_mean: float
    sample_size: int
    benchmark_category: str
    metric_name: str
    comparison_text: str
    improvement_potential: Optional[float] = None
    top_quartile_threshold: Optional[float] = None


@dataclass
class IndustryInsight:
    """Container for industry-level insights"""
    insight_type: str
    title: str
    description: str
    data_points: Dict[str, Any]
    confidence_score: float
    actionable_recommendations: List[str]


class AIBenchmarkingService:
    """
    Service for AI-powered industry benchmarking and competitive intelligence.
    
    Features:
    - Real-time percentile rankings across industry metrics
    - Intelligent performance comparisons by business segment
    - Automated insights and recommendations
    - Competitive intelligence without exposing individual data
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.privacy_service = PrivacyAnonymizationService(db)
        self.analytics_service = EnhancedAnalyticsService(db)
        
    def get_user_business_segment(self, user_id: int) -> BusinessSegment:
        """Determine user's business segment for appropriate benchmarking"""
        
        # Get recent appointment data to determine business size
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        appointment_count = self.db.query(func.count(Appointment.id)).filter(
            Appointment.user_id == user_id,
            Appointment.start_time >= thirty_days_ago,
            Appointment.status.in_(["confirmed", "completed"])
        ).scalar() or 0
        
        # Classify business segment based on monthly appointment volume
        if appointment_count < 20:
            return BusinessSegment.SOLO_BARBER
        elif appointment_count < 80:
            return BusinessSegment.SMALL_SHOP
        elif appointment_count < 200:
            return BusinessSegment.MEDIUM_SHOP
        else:
            return BusinessSegment.LARGE_SHOP
    
    def calculate_percentile_rank(self, 
                                user_value: float, 
                                benchmark: PerformanceBenchmark) -> int:
        """Calculate user's percentile rank compared to industry"""
        
        # Use linear interpolation between known percentiles
        percentiles = [
            (10, benchmark.percentile_10),
            (25, benchmark.percentile_25),
            (50, benchmark.percentile_50),
            (75, benchmark.percentile_75),
            (90, benchmark.percentile_90)
        ]
        
        # Handle edge cases
        if user_value <= benchmark.percentile_10:
            return max(1, int(10 * user_value / benchmark.percentile_10))
        elif user_value >= benchmark.percentile_90:
            return min(100, 90 + int(10 * (user_value - benchmark.percentile_90) / 
                                   (benchmark.percentile_90 - benchmark.percentile_75)))
        
        # Interpolate between percentiles
        for i in range(len(percentiles) - 1):
            lower_pct, lower_val = percentiles[i]
            upper_pct, upper_val = percentiles[i + 1]
            
            if lower_val <= user_value <= upper_val:
                if upper_val == lower_val:
                    return lower_pct
                
                interpolated = lower_pct + (upper_pct - lower_pct) * \
                             (user_value - lower_val) / (upper_val - lower_val)
                return int(interpolated)
        
        return 50  # Default to median if interpolation fails
    
    def get_revenue_benchmark(self, user_id: int, date_range: Optional[Tuple[date, date]] = None) -> BenchmarkResult:
        """Get revenue benchmark comparison for user"""
        
        # Default to current month if no date range provided
        if not date_range:
            now = datetime.now()
            start_date = now.replace(day=1).date()
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=1).date() - timedelta(days=1)
            else:
                end_date = now.replace(month=now.month + 1, day=1).date() - timedelta(days=1)
            date_range = (start_date, end_date)
        
        start_date, end_date = date_range
        segment = self.get_user_business_segment(user_id)
        
        # Get user's revenue for the period
        user_revenue = self.db.query(func.sum(Payment.amount)).filter(
            Payment.user_id == user_id,
            Payment.created_at >= start_date,
            Payment.created_at <= end_date,
            Payment.status == "completed"
        ).scalar() or 0.0
        
        # Get industry benchmark
        benchmark = self.db.query(PerformanceBenchmark).filter(
            PerformanceBenchmark.category == BenchmarkCategory.REVENUE.value,
            PerformanceBenchmark.metric_name == "monthly_revenue",
            PerformanceBenchmark.business_segment == segment.value,
            PerformanceBenchmark.year == start_date.year,
            PerformanceBenchmark.month == start_date.month
        ).first()
        
        if not benchmark:
            # Fallback to most recent benchmark
            benchmark = self.db.query(PerformanceBenchmark).filter(
                PerformanceBenchmark.category == BenchmarkCategory.REVENUE.value,
                PerformanceBenchmark.metric_name == "monthly_revenue",
                PerformanceBenchmark.business_segment == segment.value
            ).order_by(desc(PerformanceBenchmark.year), desc(PerformanceBenchmark.month)).first()
        
        if not benchmark:
            raise ValueError(f"No revenue benchmark available for segment {segment.value}")
        
        # Calculate percentile rank
        percentile = self.calculate_percentile_rank(user_revenue, benchmark)
        
        # Generate comparison text
        comparison_text = self._generate_revenue_comparison_text(
            user_revenue, percentile, benchmark, segment
        )
        
        # Calculate improvement potential
        improvement_potential = None
        if percentile < 75:
            improvement_potential = benchmark.percentile_75 - user_revenue
        
        return BenchmarkResult(
            user_value=user_revenue,
            percentile_rank=percentile,
            industry_median=benchmark.percentile_50,
            industry_mean=benchmark.mean_value,
            sample_size=benchmark.sample_size,
            benchmark_category="revenue",
            metric_name="monthly_revenue",
            comparison_text=comparison_text,
            improvement_potential=improvement_potential,
            top_quartile_threshold=benchmark.percentile_75
        )
    
    def get_appointment_volume_benchmark(self, user_id: int, date_range: Optional[Tuple[date, date]] = None) -> BenchmarkResult:
        """Get appointment volume benchmark comparison for user"""
        
        if not date_range:
            now = datetime.now()
            start_date = now.replace(day=1).date()
            if now.month == 12:
                end_date = now.replace(year=now.year + 1, month=1, day=1).date() - timedelta(days=1)
            else:
                end_date = now.replace(month=now.month + 1, day=1).date() - timedelta(days=1)
            date_range = (start_date, end_date)
        
        start_date, end_date = date_range
        segment = self.get_user_business_segment(user_id)
        
        # Get user's appointment count
        user_appointments = self.db.query(func.count(Appointment.id)).filter(
            Appointment.user_id == user_id,
            Appointment.start_time >= start_date,
            Appointment.start_time <= end_date,
            Appointment.status.in_(["confirmed", "completed"])
        ).scalar() or 0
        
        # Get industry benchmark
        benchmark = self.db.query(PerformanceBenchmark).filter(
            PerformanceBenchmark.category == BenchmarkCategory.APPOINTMENTS.value,
            PerformanceBenchmark.metric_name == "monthly_appointments",
            PerformanceBenchmark.business_segment == segment.value,
            PerformanceBenchmark.year == start_date.year,
            PerformanceBenchmark.month == start_date.month
        ).first()
        
        if not benchmark:
            benchmark = self.db.query(PerformanceBenchmark).filter(
                PerformanceBenchmark.category == BenchmarkCategory.APPOINTMENTS.value,
                PerformanceBenchmark.metric_name == "monthly_appointments",
                PerformanceBenchmark.business_segment == segment.value
            ).order_by(desc(PerformanceBenchmark.year), desc(PerformanceBenchmark.month)).first()
        
        if not benchmark:
            raise ValueError(f"No appointment benchmark available for segment {segment.value}")
        
        percentile = self.calculate_percentile_rank(user_appointments, benchmark)
        
        comparison_text = self._generate_appointment_comparison_text(
            user_appointments, percentile, benchmark, segment
        )
        
        improvement_potential = None
        if percentile < 75:
            improvement_potential = benchmark.percentile_75 - user_appointments
        
        return BenchmarkResult(
            user_value=user_appointments,
            percentile_rank=percentile,
            industry_median=benchmark.percentile_50,
            industry_mean=benchmark.mean_value,
            sample_size=benchmark.sample_size,
            benchmark_category="appointments",
            metric_name="monthly_appointments",
            comparison_text=comparison_text,
            improvement_potential=improvement_potential,
            top_quartile_threshold=benchmark.percentile_75
        )
    
    def get_efficiency_benchmark(self, user_id: int) -> BenchmarkResult:
        """Get efficiency benchmark (revenue per appointment) for user"""
        
        # Calculate user's revenue per appointment over last 30 days
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        total_revenue = self.db.query(func.sum(Payment.amount)).filter(
            Payment.user_id == user_id,
            Payment.created_at >= thirty_days_ago,
            Payment.status == "completed"
        ).scalar() or 0.0
        
        appointment_count = self.db.query(func.count(Appointment.id)).filter(
            Appointment.user_id == user_id,
            Appointment.start_time >= thirty_days_ago,
            Appointment.status.in_(["confirmed", "completed"])
        ).scalar() or 0
        
        if appointment_count == 0:
            raise ValueError("No appointments found for efficiency calculation")
        
        user_efficiency = total_revenue / appointment_count
        segment = self.get_user_business_segment(user_id)
        
        # Get efficiency benchmark (using revenue benchmark as proxy)
        current_month = datetime.now()
        benchmark = self.db.query(PerformanceBenchmark).filter(
            PerformanceBenchmark.category == BenchmarkCategory.EFFICIENCY.value,
            PerformanceBenchmark.metric_name == "revenue_per_appointment",
            PerformanceBenchmark.business_segment == segment.value
        ).order_by(desc(PerformanceBenchmark.year), desc(PerformanceBenchmark.month)).first()
        
        if not benchmark:
            # Calculate efficiency from revenue and appointment benchmarks
            revenue_benchmark = self.db.query(PerformanceBenchmark).filter(
                PerformanceBenchmark.category == BenchmarkCategory.REVENUE.value,
                PerformanceBenchmark.business_segment == segment.value
            ).order_by(desc(PerformanceBenchmark.year), desc(PerformanceBenchmark.month)).first()
            
            appointment_benchmark = self.db.query(PerformanceBenchmark).filter(
                PerformanceBenchmark.category == BenchmarkCategory.APPOINTMENTS.value,
                PerformanceBenchmark.business_segment == segment.value
            ).order_by(desc(PerformanceBenchmark.year), desc(PerformanceBenchmark.month)).first()
            
            if not revenue_benchmark or not appointment_benchmark:
                raise ValueError("No efficiency benchmark data available")
            
            # Create synthetic efficiency benchmark
            benchmark = PerformanceBenchmark(
                percentile_10=revenue_benchmark.percentile_10 / appointment_benchmark.percentile_90,
                percentile_25=revenue_benchmark.percentile_25 / appointment_benchmark.percentile_75,
                percentile_50=revenue_benchmark.percentile_50 / appointment_benchmark.percentile_50,
                percentile_75=revenue_benchmark.percentile_75 / appointment_benchmark.percentile_25,
                percentile_90=revenue_benchmark.percentile_90 / appointment_benchmark.percentile_10,
                mean_value=revenue_benchmark.mean_value / appointment_benchmark.mean_value,
                sample_size=min(revenue_benchmark.sample_size, appointment_benchmark.sample_size)
            )
        
        percentile = self.calculate_percentile_rank(user_efficiency, benchmark)
        
        comparison_text = self._generate_efficiency_comparison_text(
            user_efficiency, percentile, benchmark, segment
        )
        
        return BenchmarkResult(
            user_value=user_efficiency,
            percentile_rank=percentile,
            industry_median=benchmark.percentile_50,
            industry_mean=benchmark.mean_value,
            sample_size=benchmark.sample_size,
            benchmark_category="efficiency",
            metric_name="revenue_per_appointment",
            comparison_text=comparison_text,
            improvement_potential=benchmark.percentile_75 - user_efficiency if percentile < 75 else None,
            top_quartile_threshold=benchmark.percentile_75
        )
    
    def generate_comprehensive_benchmark_report(self, user_id: int) -> Dict[str, Any]:
        """Generate comprehensive benchmarking report for user"""
        
        report = {
            "user_id": user_id,
            "generated_at": datetime.now().isoformat(),
            "business_segment": self.get_user_business_segment(user_id).value,
            "benchmarks": {},
            "overall_performance_score": 0,
            "top_insights": [],
            "recommendations": []
        }
        
        try:
            # Revenue benchmark
            revenue_benchmark = self.get_revenue_benchmark(user_id)
            report["benchmarks"]["revenue"] = revenue_benchmark.__dict__
            
            # Appointment volume benchmark
            appointment_benchmark = self.get_appointment_volume_benchmark(user_id)
            report["benchmarks"]["appointments"] = appointment_benchmark.__dict__
            
            # Efficiency benchmark
            efficiency_benchmark = self.get_efficiency_benchmark(user_id)
            report["benchmarks"]["efficiency"] = efficiency_benchmark.__dict__
            
            # Calculate overall performance score (weighted average of percentiles)
            weights = {"revenue": 0.4, "appointments": 0.3, "efficiency": 0.3}
            overall_score = (
                revenue_benchmark.percentile_rank * weights["revenue"] +
                appointment_benchmark.percentile_rank * weights["appointments"] +
                efficiency_benchmark.percentile_rank * weights["efficiency"]
            )
            report["overall_performance_score"] = int(overall_score)
            
            # Generate insights and recommendations
            insights = self._generate_performance_insights(
                revenue_benchmark, appointment_benchmark, efficiency_benchmark
            )
            report["top_insights"] = insights
            
            recommendations = self._generate_improvement_recommendations(
                revenue_benchmark, appointment_benchmark, efficiency_benchmark
            )
            report["recommendations"] = recommendations
            
        except Exception as e:
            logger.error(f"Error generating benchmark report for user {user_id}: {e}")
            report["error"] = str(e)
        
        return report
    
    def _generate_revenue_comparison_text(self, 
                                        user_revenue: float, 
                                        percentile: int, 
                                        benchmark: PerformanceBenchmark,
                                        segment: BusinessSegment) -> str:
        """Generate human-readable revenue comparison text"""
        
        if percentile >= 90:
            return f"Exceptional performance! Your revenue of ${user_revenue:,.0f} is in the top 10% of {segment.value.replace('_', ' ')} businesses."
        elif percentile >= 75:
            return f"Strong performance! Your revenue of ${user_revenue:,.0f} is in the top 25% of {segment.value.replace('_', ' ')} businesses."
        elif percentile >= 50:
            return f"Above average performance. Your revenue of ${user_revenue:,.0f} is above the industry median of ${benchmark.percentile_50:,.0f}."
        elif percentile >= 25:
            return f"Below average performance. Your revenue of ${user_revenue:,.0f} is below the industry median of ${benchmark.percentile_50:,.0f}."
        else:
            return f"Revenue improvement opportunity. Your revenue of ${user_revenue:,.0f} is in the bottom 25% of {segment.value.replace('_', ' ')} businesses."
    
    def _generate_appointment_comparison_text(self, 
                                           user_appointments: int, 
                                           percentile: int,
                                           benchmark: PerformanceBenchmark,
                                           segment: BusinessSegment) -> str:
        """Generate human-readable appointment volume comparison text"""
        
        if percentile >= 90:
            return f"Excellent appointment volume! Your {user_appointments} appointments are in the top 10% of {segment.value.replace('_', ' ')} businesses."
        elif percentile >= 75:
            return f"Strong appointment volume! Your {user_appointments} appointments are in the top 25% of {segment.value.replace('_', ' ')} businesses."
        elif percentile >= 50:
            return f"Above average appointment volume. Your {user_appointments} appointments exceed the industry median of {benchmark.percentile_50:.0f}."
        elif percentile >= 25:
            return f"Below average appointment volume. Your {user_appointments} appointments are below the industry median of {benchmark.percentile_50:.0f}."
        else:
            return f"Appointment volume improvement needed. Your {user_appointments} appointments are in the bottom 25% of {segment.value.replace('_', ' ')} businesses."
    
    def _generate_efficiency_comparison_text(self, 
                                          user_efficiency: float,
                                          percentile: int,
                                          benchmark: PerformanceBenchmark,
                                          segment: BusinessSegment) -> str:
        """Generate human-readable efficiency comparison text"""
        
        if percentile >= 90:
            return f"Outstanding efficiency! Your revenue per appointment of ${user_efficiency:.0f} is in the top 10% of {segment.value.replace('_', ' ')} businesses."
        elif percentile >= 75:
            return f"High efficiency! Your revenue per appointment of ${user_efficiency:.0f} is in the top 25% of {segment.value.replace('_', ' ')} businesses."
        elif percentile >= 50:
            return f"Above average efficiency. Your revenue per appointment of ${user_efficiency:.0f} exceeds the industry median of ${benchmark.percentile_50:.0f}."
        elif percentile >= 25:
            return f"Below average efficiency. Your revenue per appointment of ${user_efficiency:.0f} is below the industry median of ${benchmark.percentile_50:.0f}."
        else:
            return f"Efficiency improvement opportunity. Your revenue per appointment of ${user_efficiency:.0f} is in the bottom 25% of {segment.value.replace('_', ' ')} businesses."
    
    def _generate_performance_insights(self, 
                                     revenue_benchmark: BenchmarkResult,
                                     appointment_benchmark: BenchmarkResult,
                                     efficiency_benchmark: BenchmarkResult) -> List[str]:
        """Generate key performance insights from benchmarks"""
        
        insights = []
        
        # Revenue insights
        if revenue_benchmark.percentile_rank >= 75:
            insights.append(f"🎯 Strong revenue performance - you're outperforming 75% of similar businesses")
        elif revenue_benchmark.improvement_potential and revenue_benchmark.improvement_potential > 1000:
            insights.append(f"💡 Revenue growth opportunity: ${revenue_benchmark.improvement_potential:,.0f} potential monthly increase to reach top quartile")
        
        # Efficiency insights
        if efficiency_benchmark.percentile_rank >= 80:
            insights.append("⚡ Excellent efficiency - your revenue per appointment is in the top 20%")
        elif efficiency_benchmark.percentile_rank < 50:
            insights.append("📈 Consider premium services or pricing optimization to improve efficiency")
        
        # Volume vs Efficiency insight
        if appointment_benchmark.percentile_rank > 70 and efficiency_benchmark.percentile_rank < 30:
            insights.append("🔄 High volume, low efficiency - focus on premium services to increase revenue per appointment")
        elif appointment_benchmark.percentile_rank < 30 and efficiency_benchmark.percentile_rank > 70:
            insights.append("📊 High efficiency, low volume - consider marketing to increase appointment bookings")
        
        return insights[:3]  # Return top 3 insights
    
    def _generate_improvement_recommendations(self, 
                                            revenue_benchmark: BenchmarkResult,
                                            appointment_benchmark: BenchmarkResult,
                                            efficiency_benchmark: BenchmarkResult) -> List[str]:
        """Generate specific improvement recommendations"""
        
        recommendations = []
        
        # Revenue recommendations
        if revenue_benchmark.percentile_rank < 50:
            if efficiency_benchmark.percentile_rank < 50:
                recommendations.append("Consider increasing service prices or offering premium packages")
            if appointment_benchmark.percentile_rank < 50:
                recommendations.append("Focus on marketing and client acquisition to increase booking volume")
        
        # Efficiency recommendations
        if efficiency_benchmark.percentile_rank < 50:
            recommendations.append("Add high-value services like beard trimming, styling, or hair treatments")
            recommendations.append("Implement package deals to increase average transaction value")
        
        # Volume recommendations
        if appointment_benchmark.percentile_rank < 50:
            recommendations.append("Optimize your online presence and booking system to capture more clients")
            recommendations.append("Consider extended hours or weekend availability")
        
        return recommendations[:4]  # Return top 4 recommendations