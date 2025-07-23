"""
Service Profitability Analysis Service - Six Figure Barber Methodology

This service implements comprehensive service profitability analytics aligned with
Six Figure Barber principles to help barbers optimize their service offerings:

- Service revenue and profit margin analysis
- Premium service adoption tracking
- Upselling opportunity identification
- Service bundling recommendations
- Pricing optimization insights
- Time efficiency per service analysis
- Client satisfaction correlation with profitability
"""

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, extract, case
import logging
from decimal import Decimal, ROUND_HALF_UP
import statistics
from dataclasses import dataclass

from models import Appointment, Payment, Service, User, Client
from schemas import DateRange

logger = logging.getLogger(__name__)

@dataclass
class ServiceMetrics:
    """Comprehensive metrics for a specific service"""
    service_name: str
    category: str
    total_revenue: float
    total_bookings: int
    average_price: float
    median_price: float
    price_range: Tuple[float, float]  # (min, max)
    completion_rate: float
    no_show_rate: float
    cancellation_rate: float
    average_duration_minutes: int
    revenue_per_hour: float
    client_satisfaction_score: float
    repeat_booking_rate: float
    premium_service: bool
    profit_margin_estimate: float
    six_figure_score: float  # Composite score (0-100)
    growth_trend: str  # 'increasing', 'stable', 'declining'
    recommendations: List[str]

@dataclass
class ServiceBundleAnalysis:
    """Analysis of service combinations and bundling opportunities"""
    bundle_services: List[str]
    frequency: int
    total_revenue: float
    average_bundle_value: float
    bundle_discount_opportunity: float
    client_satisfaction: float
    recommended_bundle_price: float
    bundle_score: float  # Profitability score (0-100)

@dataclass
class ServiceProfitabilityAnalysis:
    """Complete service profitability analysis for a barber"""
    total_services: int
    total_revenue: float
    analysis_period_days: int
    service_metrics: List[ServiceMetrics]
    category_breakdown: Dict[str, Dict[str, float]]
    premium_services: Dict[str, Any]
    bundling_opportunities: List[ServiceBundleAnalysis]
    pricing_recommendations: Dict[str, Any]
    six_figure_insights: Dict[str, Any]
    performance_benchmarks: Dict[str, float]

class ServiceProfitabilityService:
    """
    Six Figure Barber Service Profitability Analysis Service
    
    Provides comprehensive service performance analytics and optimization
    recommendations aligned with Six Figure Barber methodology.
    """
    
    # Six Figure Barber service categories and targets
    PREMIUM_PRICE_THRESHOLDS = {
        'haircut': 60.0,
        'beard': 40.0,
        'haircut_beard': 80.0,
        'styling': 50.0,
        'wash': 25.0,
        'treatment': 75.0,
        'consultation': 100.0,
        'package': 120.0,
        'addon': 20.0
    }
    
    # Six Figure methodology service time targets (minutes)
    OPTIMAL_SERVICE_TIMES = {
        'haircut': 45,
        'beard': 30,
        'haircut_beard': 60,
        'styling': 35,
        'wash': 15,
        'treatment': 90,
        'consultation': 30,
        'package': 120,
        'addon': 15
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def analyze_service_profitability(self, barber_id: int, analysis_period_days: int = 90) -> ServiceProfitabilityAnalysis:
        """
        Analyze comprehensive service profitability for a barber
        
        Args:
            barber_id: ID of the barber to analyze
            analysis_period_days: Days of history to analyze
            
        Returns:
            ServiceProfitabilityAnalysis with comprehensive insights
        """
        try:
            # Get date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=analysis_period_days)
            
            # Get appointments for analysis period
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == barber_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date,
                    Appointment.status.in_(['completed', 'confirmed', 'cancelled', 'no_show'])
                )
            ).all()
            
            if not appointments:
                return self._create_empty_analysis(barber_id, analysis_period_days)
            
            # Get payments for revenue calculation
            payments = self.db.query(Payment).filter(
                and_(
                    Payment.barber_id == barber_id,
                    Payment.created_at >= start_date,
                    Payment.created_at <= end_date,
                    Payment.status == 'completed'
                )
            ).all()
            
            # Analyze each service
            service_metrics = self._analyze_individual_services(appointments, payments)
            
            # Analyze service categories
            category_breakdown = self._analyze_service_categories(service_metrics)
            
            # Analyze premium services
            premium_services = self._analyze_premium_services(service_metrics)
            
            # Identify bundling opportunities
            bundling_opportunities = self._identify_bundling_opportunities(appointments, payments)
            
            # Generate pricing recommendations
            pricing_recommendations = self._generate_pricing_recommendations(service_metrics)
            
            # Generate Six Figure insights
            six_figure_insights = self._generate_six_figure_insights(service_metrics, category_breakdown)
            
            # Calculate performance benchmarks
            performance_benchmarks = self._calculate_performance_benchmarks(service_metrics)
            
            # Calculate totals
            total_revenue = sum(m.total_revenue for m in service_metrics)
            total_services = len(service_metrics)
            
            return ServiceProfitabilityAnalysis(
                total_services=total_services,
                total_revenue=total_revenue,
                analysis_period_days=analysis_period_days,
                service_metrics=service_metrics,
                category_breakdown=category_breakdown,
                premium_services=premium_services,
                bundling_opportunities=bundling_opportunities,
                pricing_recommendations=pricing_recommendations,
                six_figure_insights=six_figure_insights,
                performance_benchmarks=performance_benchmarks
            )
            
        except Exception as e:
            logger.error(f"Error analyzing service profitability for barber {barber_id}: {e}")
            return self._create_empty_analysis(barber_id, analysis_period_days)
    
    def _analyze_individual_services(self, appointments: List[Appointment], payments: List[Payment]) -> List[ServiceMetrics]:
        """Analyze metrics for each individual service"""
        
        # Group appointments by service
        service_groups = {}
        for appointment in appointments:
            service_name = appointment.service_name or 'Unknown Service'
            if service_name not in service_groups:
                service_groups[service_name] = []
            service_groups[service_name].append(appointment)
        
        # Group payments by service (via appointment)
        payment_by_appointment = {p.appointment_id: p for p in payments if p.appointment_id}
        
        service_metrics = []
        
        for service_name, service_appointments in service_groups.items():
            # Calculate basic metrics
            total_bookings = len(service_appointments)
            completed_appointments = [a for a in service_appointments if a.status == 'completed']
            cancelled_appointments = [a for a in service_appointments if a.status == 'cancelled']
            no_show_appointments = [a for a in service_appointments if a.status == 'no_show']
            
            # Calculate rates
            completion_rate = len(completed_appointments) / total_bookings if total_bookings > 0 else 0
            cancellation_rate = len(cancelled_appointments) / total_bookings if total_bookings > 0 else 0
            no_show_rate = len(no_show_appointments) / total_bookings if total_bookings > 0 else 0
            
            # Calculate revenue metrics
            service_payments = [payment_by_appointment[a.id] for a in service_appointments if a.id in payment_by_appointment]
            total_revenue = sum(float(p.amount) for p in service_payments)
            
            prices = [float(p.amount) for p in service_payments]
            average_price = statistics.mean(prices) if prices else 0
            median_price = statistics.median(prices) if prices else 0
            price_range = (min(prices), max(prices)) if prices else (0, 0)
            
            # Calculate duration metrics
            durations = [a.duration_minutes for a in service_appointments if a.duration_minutes]
            average_duration = statistics.mean(durations) if durations else 45  # Default 45 min
            
            # Calculate revenue per hour
            revenue_per_hour = (average_price / average_duration * 60) if average_duration > 0 else 0
            
            # Determine service category
            category = self._categorize_service(service_name)
            
            # Check if premium service
            premium_threshold = self.PREMIUM_PRICE_THRESHOLDS.get(category, 50.0)
            premium_service = average_price >= premium_threshold
            
            # Estimate profit margin (simplified - actual costs would need to be tracked)
            profit_margin_estimate = self._estimate_profit_margin(category, average_price)
            
            # Calculate Six Figure score
            six_figure_score = self._calculate_six_figure_service_score(
                category, average_price, revenue_per_hour, completion_rate, premium_service
            )
            
            # Analyze growth trend (simplified - would need historical data)
            growth_trend = self._analyze_service_growth_trend(service_appointments)
            
            # Generate recommendations
            recommendations = self._generate_service_recommendations(
                service_name, category, average_price, revenue_per_hour, completion_rate, premium_service
            )
            
            # Client satisfaction and repeat rate (simplified - would need feedback data)
            client_satisfaction_score = max(0.7, completion_rate)  # Proxy using completion rate
            repeat_booking_rate = self._calculate_repeat_booking_rate(service_appointments)
            
            service_metrics.append(ServiceMetrics(
                service_name=service_name,
                category=category,
                total_revenue=total_revenue,
                total_bookings=total_bookings,
                average_price=average_price,
                median_price=median_price,
                price_range=price_range,
                completion_rate=completion_rate,
                no_show_rate=no_show_rate,
                cancellation_rate=cancellation_rate,
                average_duration_minutes=int(average_duration),
                revenue_per_hour=revenue_per_hour,
                client_satisfaction_score=client_satisfaction_score,
                repeat_booking_rate=repeat_booking_rate,
                premium_service=premium_service,
                profit_margin_estimate=profit_margin_estimate,
                six_figure_score=six_figure_score,
                growth_trend=growth_trend,
                recommendations=recommendations
            ))
        
        return sorted(service_metrics, key=lambda x: x.total_revenue, reverse=True)
    
    def _analyze_service_categories(self, service_metrics: List[ServiceMetrics]) -> Dict[str, Dict[str, float]]:
        """Analyze performance by service category"""
        
        categories = {}
        
        for metric in service_metrics:
            category = metric.category
            if category not in categories:
                categories[category] = {
                    'total_revenue': 0,
                    'total_bookings': 0,
                    'average_price': 0,
                    'completion_rate': 0,
                    'premium_percentage': 0,
                    'six_figure_score': 0
                }
            
            categories[category]['total_revenue'] += metric.total_revenue
            categories[category]['total_bookings'] += metric.total_bookings
        
        # Calculate category averages
        for category, data in categories.items():
            category_services = [m for m in service_metrics if m.category == category]
            if category_services:
                data['average_price'] = statistics.mean([m.average_price for m in category_services])
                data['completion_rate'] = statistics.mean([m.completion_rate for m in category_services])
                data['premium_percentage'] = len([m for m in category_services if m.premium_service]) / len(category_services) * 100
                data['six_figure_score'] = statistics.mean([m.six_figure_score for m in category_services])
        
        return categories
    
    def _analyze_premium_services(self, service_metrics: List[ServiceMetrics]) -> Dict[str, Any]:
        """Analyze premium service performance"""
        
        premium_services = [m for m in service_metrics if m.premium_service]
        standard_services = [m for m in service_metrics if not m.premium_service]
        
        total_premium_revenue = sum(m.total_revenue for m in premium_services)
        total_standard_revenue = sum(m.total_revenue for m in standard_services)
        total_revenue = total_premium_revenue + total_standard_revenue
        
        premium_percentage = (total_premium_revenue / total_revenue * 100) if total_revenue > 0 else 0
        
        # Average metrics
        premium_avg_price = statistics.mean([m.average_price for m in premium_services]) if premium_services else 0
        standard_avg_price = statistics.mean([m.average_price for m in standard_services]) if standard_services else 0
        
        # Identify upgrade opportunities
        upgrade_opportunities = []
        for service in standard_services:
            if service.six_figure_score > 70:  # High performing standard service
                category_threshold = self.PREMIUM_PRICE_THRESHOLDS.get(service.category, 50.0)
                price_gap = category_threshold - service.average_price
                if price_gap > 0:
                    upgrade_opportunities.append({
                        'service_name': service.service_name,
                        'current_price': service.average_price,
                        'premium_threshold': category_threshold,
                        'price_increase_needed': price_gap,
                        'potential_revenue_increase': price_gap * service.total_bookings
                    })
        
        return {
            'premium_service_count': len(premium_services),
            'standard_service_count': len(standard_services),
            'premium_revenue_percentage': premium_percentage,
            'premium_average_price': premium_avg_price,
            'standard_average_price': standard_avg_price,
            'price_premium_ratio': premium_avg_price / standard_avg_price if standard_avg_price > 0 else 0,
            'upgrade_opportunities': upgrade_opportunities,
            'premium_services': [
                {
                    'name': m.service_name,
                    'revenue': m.total_revenue,
                    'bookings': m.total_bookings,
                    'avg_price': m.average_price,
                    'six_figure_score': m.six_figure_score
                } for m in premium_services
            ]
        }
    
    def _identify_bundling_opportunities(self, appointments: List[Appointment], payments: List[Payment]) -> List[ServiceBundleAnalysis]:
        """Identify service bundling opportunities"""
        
        # Group appointments by client and date to find same-day bookings
        client_date_services = {}
        
        for appointment in appointments:
            if appointment.status == 'completed' and appointment.client_id:
                date_key = appointment.start_time.date()
                client_key = f"{appointment.client_id}_{date_key}"
                
                if client_key not in client_date_services:
                    client_date_services[client_key] = []
                client_date_services[client_key].append(appointment)
        
        # Find service combinations (bundles)
        service_combinations = {}
        payment_by_appointment = {p.appointment_id: p for p in payments if p.appointment_id}
        
        for appointments_group in client_date_services.values():
            if len(appointments_group) > 1:  # Multiple services in same day
                service_names = sorted([a.service_name for a in appointments_group])
                combo_key = " + ".join(service_names)
                
                if combo_key not in service_combinations:
                    service_combinations[combo_key] = {
                        'appointments_groups': [],
                        'total_revenue': 0,
                        'frequency': 0
                    }
                
                service_combinations[combo_key]['appointments_groups'].append(appointments_group)
                service_combinations[combo_key]['frequency'] += 1
                
                # Calculate revenue for this combo
                combo_revenue = sum(
                    float(payment_by_appointment[a.id].amount) 
                    for a in appointments_group 
                    if a.id in payment_by_appointment
                )
                service_combinations[combo_key]['total_revenue'] += combo_revenue
        
        # Analyze bundling opportunities
        bundling_opportunities = []
        
        for combo_key, combo_data in service_combinations.items():
            if combo_data['frequency'] >= 3:  # At least 3 occurrences to be significant
                services = combo_key.split(" + ")
                frequency = combo_data['frequency']
                total_revenue = combo_data['total_revenue']
                average_bundle_value = total_revenue / frequency
                
                # Estimate bundle discount opportunity (10-15% discount while maintaining margin)
                bundle_discount_opportunity = average_bundle_value * 0.125  # 12.5% average
                recommended_bundle_price = average_bundle_value - bundle_discount_opportunity
                
                # Calculate bundle score based on frequency and revenue
                bundle_score = min(100, (frequency * 10) + (average_bundle_value / 10))
                
                bundling_opportunities.append(ServiceBundleAnalysis(
                    bundle_services=services,
                    frequency=frequency,
                    total_revenue=total_revenue,
                    average_bundle_value=average_bundle_value,
                    bundle_discount_opportunity=bundle_discount_opportunity,
                    client_satisfaction=0.85,  # Estimated - bundled services often have higher satisfaction
                    recommended_bundle_price=recommended_bundle_price,
                    bundle_score=bundle_score
                ))
        
        return sorted(bundling_opportunities, key=lambda x: x.bundle_score, reverse=True)
    
    def _generate_pricing_recommendations(self, service_metrics: List[ServiceMetrics]) -> Dict[str, Any]:
        """Generate pricing optimization recommendations"""
        
        recommendations = {
            'underpriced_services': [],
            'overpriced_services': [],
            'price_increase_opportunities': [],
            'premium_conversion_targets': []
        }
        
        for service in service_metrics:
            category_benchmark = self.PREMIUM_PRICE_THRESHOLDS.get(service.category, 50.0)
            
            # Check for underpricing
            if service.average_price < category_benchmark * 0.8 and service.completion_rate > 0.85:
                price_increase = category_benchmark * 0.9 - service.average_price
                potential_revenue = price_increase * service.total_bookings
                
                recommendations['underpriced_services'].append({
                    'service_name': service.service_name,
                    'current_price': service.average_price,
                    'recommended_price': category_benchmark * 0.9,
                    'price_increase': price_increase,
                    'potential_additional_revenue': potential_revenue,
                    'confidence': 'high' if service.completion_rate > 0.9 else 'medium'
                })
            
            # Check for overpricing (low completion rate + high price)
            if service.average_price > category_benchmark * 1.2 and service.completion_rate < 0.7:
                recommendations['overpriced_services'].append({
                    'service_name': service.service_name,
                    'current_price': service.average_price,
                    'completion_rate': service.completion_rate,
                    'suggested_action': 'Review pricing or improve service value proposition'
                })
            
            # Premium conversion opportunities
            if not service.premium_service and service.six_figure_score > 75:
                recommendations['premium_conversion_targets'].append({
                    'service_name': service.service_name,
                    'current_price': service.average_price,
                    'premium_threshold': category_benchmark,
                    'six_figure_score': service.six_figure_score,
                    'conversion_strategy': 'Add premium elements or package with complementary services'
                })
        
        return recommendations
    
    def _generate_six_figure_insights(self, service_metrics: List[ServiceMetrics], category_breakdown: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
        """Generate Six Figure Barber methodology insights"""
        
        total_revenue = sum(m.total_revenue for m in service_metrics)
        premium_services = [m for m in service_metrics if m.premium_service]
        premium_revenue = sum(m.total_revenue for m in premium_services)
        
        # Six Figure service mix analysis
        optimal_premium_percentage = 60  # 6FB target: 60% of revenue from premium services
        current_premium_percentage = (premium_revenue / total_revenue * 100) if total_revenue > 0 else 0
        
        # Calculate revenue optimization potential
        revenue_optimization_score = 0
        for service in service_metrics:
            revenue_optimization_score += service.six_figure_score * (service.total_revenue / total_revenue)
        
        # Service efficiency analysis
        high_efficiency_services = [m for m in service_metrics if m.revenue_per_hour > 80]
        low_efficiency_services = [m for m in service_metrics if m.revenue_per_hour < 40]
        
        return {
            'six_figure_alignment_score': revenue_optimization_score,
            'premium_service_percentage': current_premium_percentage,
            'premium_target_gap': optimal_premium_percentage - current_premium_percentage,
            'revenue_per_hour_analysis': {
                'average_rph': statistics.mean([m.revenue_per_hour for m in service_metrics]) if service_metrics else 0,
                'high_efficiency_services': len(high_efficiency_services),
                'low_efficiency_services': len(low_efficiency_services)
            },
            'service_mix_recommendations': self._generate_service_mix_recommendations(service_metrics),
            'six_figure_action_items': self._generate_six_figure_action_items(service_metrics, current_premium_percentage)
        }
    
    def _calculate_performance_benchmarks(self, service_metrics: List[ServiceMetrics]) -> Dict[str, float]:
        """Calculate performance benchmarks for comparison"""
        
        if not service_metrics:
            return {}
        
        return {
            'average_service_price': statistics.mean([m.average_price for m in service_metrics]),
            'median_service_price': statistics.median([m.average_price for m in service_metrics]),
            'average_completion_rate': statistics.mean([m.completion_rate for m in service_metrics]),
            'average_revenue_per_hour': statistics.mean([m.revenue_per_hour for m in service_metrics]),
            'premium_service_percentage': len([m for m in service_metrics if m.premium_service]) / len(service_metrics) * 100,
            'top_quartile_revenue_threshold': sorted([m.total_revenue for m in service_metrics], reverse=True)[len(service_metrics)//4] if len(service_metrics) >= 4 else 0,
            'six_figure_score_average': statistics.mean([m.six_figure_score for m in service_metrics])
        }
    
    # Helper methods for calculations
    
    def _categorize_service(self, service_name: str) -> str:
        """Categorize service based on name"""
        service_lower = service_name.lower()
        
        if 'cut' in service_lower and 'beard' in service_lower:
            return 'haircut_beard'
        elif 'cut' in service_lower or 'hair' in service_lower:
            return 'haircut'
        elif 'beard' in service_lower or 'mustache' in service_lower:
            return 'beard'
        elif 'style' in service_lower or 'styling' in service_lower:
            return 'styling'
        elif 'wash' in service_lower or 'shampoo' in service_lower:
            return 'wash'
        elif 'treatment' in service_lower or 'therapy' in service_lower:
            return 'treatment'
        elif 'consultation' in service_lower or 'consult' in service_lower:
            return 'consultation'
        elif 'package' in service_lower or 'bundle' in service_lower:
            return 'package'
        else:
            return 'addon'
    
    def _estimate_profit_margin(self, category: str, price: float) -> float:
        """Estimate profit margin based on service category and price"""
        # Simplified profit margin estimation (would need actual cost tracking)
        base_margins = {
            'haircut': 0.75,
            'beard': 0.80,
            'haircut_beard': 0.77,
            'styling': 0.70,
            'wash': 0.60,
            'treatment': 0.65,
            'consultation': 0.90,
            'package': 0.75,
            'addon': 0.85
        }
        
        base_margin = base_margins.get(category, 0.70)
        
        # Higher prices typically have better margins
        if price > 100:
            return min(0.95, base_margin + 0.10)
        elif price > 60:
            return min(0.90, base_margin + 0.05)
        else:
            return base_margin
    
    def _calculate_six_figure_service_score(self, category: str, price: float, revenue_per_hour: float, completion_rate: float, premium_service: bool) -> float:
        """Calculate Six Figure methodology score for a service"""
        score = 0
        
        # Price factor (40 points)
        category_target = self.PREMIUM_PRICE_THRESHOLDS.get(category, 50.0)
        price_score = min(40, (price / category_target) * 40)
        score += price_score
        
        # Revenue per hour factor (30 points)
        rph_score = min(30, (revenue_per_hour / 100) * 30)
        score += rph_score
        
        # Completion rate factor (20 points)
        completion_score = completion_rate * 20
        score += completion_score
        
        # Premium service bonus (10 points)
        if premium_service:
            score += 10
        
        return min(100, score)
    
    def _analyze_service_growth_trend(self, appointments: List[Appointment]) -> str:
        """Analyze growth trend for a service (simplified)"""
        if len(appointments) < 6:
            return 'stable'
        
        # Simple trend analysis based on booking frequency over time
        appointments.sort(key=lambda x: x.start_time)
        midpoint = len(appointments) // 2
        
        first_half = appointments[:midpoint]
        second_half = appointments[midpoint:]
        
        first_half_days = (first_half[-1].start_time - first_half[0].start_time).days or 1
        second_half_days = (second_half[-1].start_time - second_half[0].start_time).days or 1
        
        first_rate = len(first_half) / first_half_days
        second_rate = len(second_half) / second_half_days
        
        if second_rate > first_rate * 1.2:
            return 'increasing'
        elif second_rate < first_rate * 0.8:
            return 'declining'
        else:
            return 'stable'
    
    def _calculate_repeat_booking_rate(self, appointments: List[Appointment]) -> float:
        """Calculate repeat booking rate for a service"""
        client_bookings = {}
        
        for appointment in appointments:
            if appointment.client_id and appointment.status == 'completed':
                client_id = appointment.client_id
                client_bookings[client_id] = client_bookings.get(client_id, 0) + 1
        
        if not client_bookings:
            return 0.0
        
        repeat_clients = len([count for count in client_bookings.values() if count > 1])
        total_clients = len(client_bookings)
        
        return repeat_clients / total_clients if total_clients > 0 else 0.0
    
    def _generate_service_recommendations(self, service_name: str, category: str, price: float, revenue_per_hour: float, completion_rate: float, premium_service: bool) -> List[str]:
        """Generate specific recommendations for a service"""
        recommendations = []
        
        category_target = self.PREMIUM_PRICE_THRESHOLDS.get(category, 50.0)
        
        if price < category_target * 0.8:
            recommendations.append(f"Consider increasing price by ${category_target * 0.9 - price:.0f} to reach premium tier")
        
        if revenue_per_hour < 60:
            recommendations.append("Optimize service efficiency to increase revenue per hour")
        
        if completion_rate < 0.8:
            recommendations.append("Investigate high cancellation/no-show rate and implement retention strategies")
        
        if not premium_service and completion_rate > 0.85:
            recommendations.append("Strong performance indicates potential for premium positioning")
        
        if completion_rate > 0.9 and price > category_target:
            recommendations.append("Excellent performance - consider expanding this service offering")
        
        return recommendations[:3]  # Limit to top 3 recommendations
    
    def _generate_service_mix_recommendations(self, service_metrics: List[ServiceMetrics]) -> List[str]:
        """Generate service mix recommendations"""
        recommendations = []
        
        premium_services = [m for m in service_metrics if m.premium_service]
        total_revenue = sum(m.total_revenue for m in service_metrics)
        premium_revenue = sum(m.total_revenue for m in premium_services)
        premium_percentage = (premium_revenue / total_revenue * 100) if total_revenue > 0 else 0
        
        if premium_percentage < 40:
            recommendations.append("Increase premium service offerings to reach 60% revenue target")
        
        low_performers = [m for m in service_metrics if m.six_figure_score < 50]
        if low_performers:
            recommendations.append(f"Review or eliminate {len(low_performers)} underperforming services")
        
        high_performers = [m for m in service_metrics if m.six_figure_score > 80]
        if high_performers:
            recommendations.append(f"Expand marketing for {len(high_performers)} top-performing services")
        
        return recommendations
    
    def _generate_six_figure_action_items(self, service_metrics: List[ServiceMetrics], premium_percentage: float) -> List[str]:
        """Generate Six Figure methodology action items"""
        action_items = []
        
        if premium_percentage < 50:
            action_items.append("Develop premium service packages to increase high-value revenue")
        
        avg_revenue_per_hour = statistics.mean([m.revenue_per_hour for m in service_metrics]) if service_metrics else 0
        if avg_revenue_per_hour < 80:
            action_items.append("Focus on time efficiency and pricing optimization")
        
        low_completion_services = [m for m in service_metrics if m.completion_rate < 0.8]
        if low_completion_services:
            action_items.append("Implement client retention strategies for underperforming services")
        
        return action_items
    
    def _create_empty_analysis(self, barber_id: int, analysis_period_days: int) -> ServiceProfitabilityAnalysis:
        """Create empty analysis when no data available"""
        return ServiceProfitabilityAnalysis(
            total_services=0,
            total_revenue=0.0,
            analysis_period_days=analysis_period_days,
            service_metrics=[],
            category_breakdown={},
            premium_services={
                'premium_service_count': 0,
                'standard_service_count': 0,
                'premium_revenue_percentage': 0,
                'upgrade_opportunities': []
            },
            bundling_opportunities=[],
            pricing_recommendations={
                'underpriced_services': [],
                'overpriced_services': [],
                'price_increase_opportunities': [],
                'premium_conversion_targets': []
            },
            six_figure_insights={
                'six_figure_alignment_score': 0,
                'premium_service_percentage': 0,
                'service_mix_recommendations': ["Start offering services to build analytics"],
                'six_figure_action_items': ["Begin tracking service performance data"]
            },
            performance_benchmarks={}
        )