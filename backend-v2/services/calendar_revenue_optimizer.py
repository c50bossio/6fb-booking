"""
Calendar Revenue Optimizer Service
Provides AI-powered revenue optimization for the Six Figure Barber calendar system.
"""

from datetime import datetime, date
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
import statistics
import logging

logger = logging.getLogger(__name__)

class ServiceTier(Enum):
    PLATINUM = "platinum"  # $120+
    GOLD = "gold"          # $85-119
    SILVER = "silver"      # $45-84
    BRONZE = "bronze"      # $0-44

class ClientTier(Enum):
    PLATINUM = "platinum"
    GOLD = "gold"
    SILVER = "silver"
    BRONZE = "bronze"

@dataclass
class RevenueTimeBlock:
    """Optimized time block for maximum revenue potential"""
    start_hour: int
    end_hour: int
    optimal_service_price: float
    expected_revenue: float
    confidence_score: float
    reasoning: str
    suggested_services: List[str]

@dataclass
class UpsellOpportunity:
    """Identified upselling opportunity"""
    appointment_id: int
    client_name: str
    current_service: str
    current_price: float
    suggested_service: str
    suggested_price: float
    revenue_increase: float
    probability: float
    reasoning: str
    six_fb_principle: str

@dataclass
class PeakHourAnalysis:
    """Analysis of peak performance hours"""
    hour: int
    average_revenue: float
    appointment_count: int
    average_ticket: float
    utilization_rate: float
    optimization_potential: float

@dataclass
class RevenueOptimizationSuggestion:
    """AI-powered revenue optimization suggestion"""
    type: str  # 'pricing', 'scheduling', 'service_mix', 'client_tier'
    title: str
    description: str
    expected_impact: float
    confidence: float
    implementation_difficulty: str  # 'easy', 'medium', 'hard'
    six_fb_methodology: str
    action_items: List[str]

class CalendarRevenueOptimizer:
    """
    AI-powered calendar revenue optimization engine following Six Figure Barber methodology.
    Analyzes booking patterns, service mix, and client behavior to maximize revenue potential.
    """
    
    # Six Figure Barber service pricing tiers
    SERVICE_TIERS = {
        ServiceTier.PLATINUM: {"min_price": 120, "target_commission": 0.65},
        ServiceTier.GOLD: {"min_price": 85, "target_commission": 0.60},
        ServiceTier.SILVER: {"min_price": 45, "target_commission": 0.50},
        ServiceTier.BRONZE: {"min_price": 0, "target_commission": 0.40}
    }
    
    # Peak hour patterns based on Six Figure Barber methodology
    PEAK_HOURS = {
        "platinum_hours": [8, 9, 10, 17, 18, 19],  # Morning and evening professional clients
        "gold_hours": [11, 12, 13, 16, 20],        # Lunch and after-work
        "silver_hours": [14, 15, 21],              # Afternoon slots
        "bronze_hours": [7, 22]                    # Early morning and late evening
    }

    def __init__(self):
        self.six_figure_target = 100000
        self.daily_target = self.six_figure_target / 365
        self.weekly_target = self.six_figure_target / 52
        self.monthly_target = self.six_figure_target / 12

    def optimize_time_blocks(self, barber_id: int, target_date: date, 
                           historical_appointments: List[Dict], 
                           available_services: List[Dict]) -> List[RevenueTimeBlock]:
        """
        Analyze and optimize time blocks for maximum revenue potential.
        
        Args:
            barber_id: ID of the barber
            target_date: Date to optimize for
            historical_appointments: Past appointment data for analysis
            available_services: Services offered with pricing
            
        Returns:
            List of optimized time blocks with revenue recommendations
        """
        try:
            # Analyze historical patterns
            hourly_performance = self._analyze_hourly_performance(historical_appointments)
            service_performance = self._analyze_service_performance(historical_appointments, available_services)
            
            optimized_blocks = []
            
            # Optimize each hour of the day (8 AM to 8 PM typical working hours)
            for hour in range(8, 21):
                block = self._optimize_hour_block(
                    hour, 
                    hourly_performance.get(hour, {}),
                    service_performance,
                    available_services
                )
                if block:
                    optimized_blocks.append(block)
            
            # Sort by expected revenue (highest first)
            optimized_blocks.sort(key=lambda x: x.expected_revenue, reverse=True)
            
            logger.info(f"Generated {len(optimized_blocks)} optimized time blocks for barber {barber_id}")
            return optimized_blocks
            
        except Exception as e:
            logger.error(f"Error optimizing time blocks: {str(e)}")
            return []

    def identify_upsell_opportunities(self, upcoming_appointments: List[Dict]) -> List[UpsellOpportunity]:
        """
        Identify upselling opportunities based on Six Figure Barber methodology.
        
        Args:
            upcoming_appointments: List of upcoming appointments
            
        Returns:
            List of upselling opportunities with Six Figure Barber principles
        """
        opportunities = []
        
        try:
            for appointment in upcoming_appointments:
                current_price = appointment.get('service_price', 0)
                service_name = appointment.get('service_name', '').lower()
                client_tier = ClientTier(appointment.get('client_tier', 'bronze'))
                
                # Premium haircut upgrade opportunity
                if 'haircut' in service_name and current_price < 85:
                    opportunities.append(UpsellOpportunity(
                        appointment_id=appointment['id'],
                        client_name=appointment['client_name'],
                        current_service=appointment['service_name'],
                        current_price=current_price,
                        suggested_service='Premium Haircut & Styling',
                        suggested_price=85,
                        revenue_increase=85 - current_price,
                        probability=0.7 if client_tier in [ClientTier.GOLD, ClientTier.PLATINUM] else 0.4,
                        reasoning=f"Client tier: {client_tier.value}. Premium upgrade aligns with Six Figure Barber value positioning.",
                        six_fb_principle="Price based on value, not time. Premium services attract quality clients who appreciate expertise."
                    ))
                
                # Beard service add-on
                if 'haircut' in service_name and 'beard' not in service_name:
                    opportunities.append(UpsellOpportunity(
                        appointment_id=appointment['id'],
                        client_name=appointment['client_name'],
                        current_service=appointment['service_name'],
                        current_price=current_price,
                        suggested_service=appointment['service_name'] + ' + Beard Trim & Styling',
                        suggested_price=current_price + 30,
                        revenue_increase=30,
                        probability=0.8,
                        reasoning="Natural service combination with high conversion rate. Minimal additional time investment.",
                        six_fb_principle="Every client interaction is an opportunity to increase lifetime value through value-added services."
                    ))
                
                # VIP treatment for premium clients
                if client_tier in [ClientTier.GOLD, ClientTier.PLATINUM] and current_price >= 60:
                    opportunities.append(UpsellOpportunity(
                        appointment_id=appointment['id'],
                        client_name=appointment['client_name'],
                        current_service=appointment['service_name'],
                        current_price=current_price,
                        suggested_service=appointment['service_name'] + ' + Hot Towel & Scalp Treatment',
                        suggested_price=current_price + 45,
                        revenue_increase=45,
                        probability=0.9,
                        reasoning=f"VIP client ({client_tier.value}) highly values premium experiences and luxury treatments.",
                        six_fb_principle="Focus on retention over acquisition. Loyal VIP clients drive sustainable six-figure success."
                    ))
            
            # Sort by revenue potential and probability
            opportunities.sort(key=lambda x: x.revenue_increase * x.probability, reverse=True)
            
            logger.info(f"Identified {len(opportunities)} upselling opportunities")
            return opportunities[:10]  # Return top 10 opportunities
            
        except Exception as e:
            logger.error(f"Error identifying upsell opportunities: {str(e)}")
            return []

    def analyze_peak_hours(self, appointments: List[Dict]) -> List[PeakHourAnalysis]:
        """
        Analyze peak performance hours for revenue optimization.
        
        Args:
            appointments: Historical appointment data
            
        Returns:
            List of peak hour analysis with optimization insights
        """
        try:
            hourly_data = {}
            
            # Group appointments by hour
            for appointment in appointments:
                start_time = datetime.fromisoformat(appointment['start_time'].replace('Z', '+00:00'))
                hour = start_time.hour
                price = appointment.get('service_price', 0)
                
                if hour not in hourly_data:
                    hourly_data[hour] = {'revenue': [], 'count': 0}
                
                hourly_data[hour]['revenue'].append(price)
                hourly_data[hour]['count'] += 1
            
            peak_analysis = []
            
            for hour, data in hourly_data.items():
                if data['count'] > 0:
                    avg_revenue = sum(data['revenue'])
                    avg_ticket = avg_revenue / data['count']
                    
                    # Calculate optimization potential based on Six Figure Barber peak hours
                    optimization_potential = 0
                    if hour in self.PEAK_HOURS['platinum_hours']:
                        optimization_potential = avg_ticket * 0.15  # 15% premium pricing potential
                    elif hour in self.PEAK_HOURS['gold_hours']:
                        optimization_potential = avg_ticket * 0.10  # 10% premium pricing potential
                    elif hour in self.PEAK_HOURS['silver_hours']:
                        optimization_potential = avg_ticket * 0.05  # 5% optimization potential
                    
                    peak_analysis.append(PeakHourAnalysis(
                        hour=hour,
                        average_revenue=avg_revenue,
                        appointment_count=data['count'],
                        average_ticket=avg_ticket,
                        utilization_rate=min(data['count'] / 30, 1.0),  # Assume 30 working days
                        optimization_potential=optimization_potential
                    ))
            
            # Sort by revenue potential
            peak_analysis.sort(key=lambda x: x.average_revenue, reverse=True)
            
            logger.info(f"Analyzed {len(peak_analysis)} peak hours")
            return peak_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing peak hours: {str(e)}")
            return []

    def generate_optimization_suggestions(self, barber_id: int, 
                                        current_performance: Dict,
                                        target_income: float = 100000) -> List[RevenueOptimizationSuggestion]:
        """
        Generate AI-powered optimization suggestions based on Six Figure Barber methodology.
        
        Args:
            barber_id: ID of the barber
            current_performance: Current performance metrics
            target_income: Annual income target
            
        Returns:
            List of optimization suggestions
        """
        suggestions = []
        
        try:
            monthly_revenue = current_performance.get('monthly_revenue', 0)
            avg_ticket = current_performance.get('average_ticket', 0)
            utilization_rate = current_performance.get('utilization_rate', 0)
            client_count = current_performance.get('total_clients', 0)
            
            monthly_target = target_income / 12
            revenue_gap = monthly_target - monthly_revenue
            
            # Pricing optimization
            if avg_ticket < 75:
                price_increase_needed = (revenue_gap / client_count) if client_count > 0 else 0
                suggestions.append(RevenueOptimizationSuggestion(
                    type='pricing',
                    title='Premium Pricing Strategy',
                    description=f'Increase average ticket from ${avg_ticket:.0f} to ${avg_ticket + price_increase_needed:.0f}',
                    expected_impact=price_increase_needed * client_count,
                    confidence=0.8,
                    implementation_difficulty='medium',
                    six_fb_methodology='Value-based pricing reflects your expertise and attracts quality clients who appreciate your craft.',
                    action_items=[
                        'Introduce premium service tiers',
                        'Add value-added services to existing bookings',
                        'Position services based on results, not time',
                        'Communicate value proposition clearly to clients'
                    ]
                ))
            
            # Utilization optimization
            if utilization_rate < 0.8:
                suggestions.append(RevenueOptimizationSuggestion(
                    type='scheduling',
                    title='Time Block Optimization',
                    description=f'Increase utilization from {utilization_rate*100:.1f}% to 80%+',
                    expected_impact=(0.8 - utilization_rate) * monthly_revenue,
                    confidence=0.7,
                    implementation_difficulty='easy',
                    six_fb_methodology='Your calendar is your revenue engine - optimize every time slot for maximum impact.',
                    action_items=[
                        'Block premium hours for high-value services',
                        'Implement strategic booking windows',
                        'Optimize service duration for better flow',
                        'Use waiting lists to fill cancellations'
                    ]
                ))
            
            # Service mix optimization
            if monthly_revenue < monthly_target * 0.8:
                suggestions.append(RevenueOptimizationSuggestion(
                    type='service_mix',
                    title='High-Value Service Focus',
                    description='Shift service mix toward premium offerings',
                    expected_impact=monthly_target - monthly_revenue,
                    confidence=0.9,
                    implementation_difficulty='medium',
                    six_fb_methodology='Focus on high-value services that showcase your expertise and command premium prices.',
                    action_items=[
                        'Develop signature premium services',
                        'Train in advanced techniques',
                        'Create service bundles for higher value',
                        'Market expertise-based services'
                    ]
                ))
            
            # Client tier development
            suggestions.append(RevenueOptimizationSuggestion(
                type='client_tier',
                title='VIP Client Development',
                description='Focus on developing and retaining high-value clients',
                expected_impact=monthly_revenue * 0.25,
                confidence=0.85,
                implementation_difficulty='hard',
                six_fb_methodology='Client relationships are your most valuable asset - they generate referrals and repeat business.',
                action_items=[
                    'Implement client tier rewards program',
                    'Provide exclusive services for VIP clients',
                    'Create personalized client experiences',
                    'Build long-term relationship strategies'
                ]
            ))
            
            # Sort by expected impact
            suggestions.sort(key=lambda x: x.expected_impact, reverse=True)
            
            logger.info(f"Generated {len(suggestions)} optimization suggestions for barber {barber_id}")
            return suggestions[:5]  # Return top 5 suggestions
            
        except Exception as e:
            logger.error(f"Error generating optimization suggestions: {str(e)}")
            return []

    def _analyze_hourly_performance(self, appointments: List[Dict]) -> Dict[int, Dict]:
        """Analyze performance by hour of day"""
        hourly_data = {}
        
        for appointment in appointments:
            try:
                start_time = datetime.fromisoformat(appointment['start_time'].replace('Z', '+00:00'))
                hour = start_time.hour
                price = appointment.get('service_price', 0)
                
                if hour not in hourly_data:
                    hourly_data[hour] = {
                        'total_revenue': 0,
                        'appointment_count': 0,
                        'prices': []
                    }
                
                hourly_data[hour]['total_revenue'] += price
                hourly_data[hour]['appointment_count'] += 1
                hourly_data[hour]['prices'].append(price)
                
            except Exception as e:
                logger.warning(f"Error processing appointment for hourly analysis: {str(e)}")
                continue
        
        # Calculate averages and statistics
        for hour, data in hourly_data.items():
            if data['appointment_count'] > 0:
                data['average_ticket'] = data['total_revenue'] / data['appointment_count']
                data['median_price'] = statistics.median(data['prices'])
                data['price_std'] = statistics.stdev(data['prices']) if len(data['prices']) > 1 else 0
        
        return hourly_data

    def _analyze_service_performance(self, appointments: List[Dict], 
                                   available_services: List[Dict]) -> Dict[str, Dict]:
        """Analyze performance by service type"""
        service_data = {}
        
        for appointment in appointments:
            service_name = appointment.get('service_name', 'Unknown')
            price = appointment.get('service_price', 0)
            
            if service_name not in service_data:
                service_data[service_name] = {
                    'total_revenue': 0,
                    'booking_count': 0,
                    'prices': [],
                    'conversion_rate': 0
                }
            
            service_data[service_name]['total_revenue'] += price
            service_data[service_name]['booking_count'] += 1
            service_data[service_name]['prices'].append(price)
        
        # Calculate performance metrics
        for service, data in service_data.items():
            if data['booking_count'] > 0:
                data['average_price'] = data['total_revenue'] / data['booking_count']
                data['revenue_per_booking'] = data['total_revenue'] / data['booking_count']
        
        return service_data

    def _optimize_hour_block(self, hour: int, historical_data: Dict, 
                           service_performance: Dict, available_services: List[Dict]) -> Optional[RevenueTimeBlock]:
        """Optimize a specific hour block for revenue"""
        try:
            # Determine optimal service tier for this hour
            if hour in self.PEAK_HOURS['platinum_hours']:
                target_tier = ServiceTier.PLATINUM
                confidence = 0.9
            elif hour in self.PEAK_HOURS['gold_hours']:
                target_tier = ServiceTier.GOLD
                confidence = 0.8
            elif hour in self.PEAK_HOURS['silver_hours']:
                target_tier = ServiceTier.SILVER
                confidence = 0.7
            else:
                target_tier = ServiceTier.BRONZE
                confidence = 0.6
            
            # Calculate optimal pricing
            tier_config = self.SERVICE_TIERS[target_tier]
            optimal_price = max(tier_config['min_price'], historical_data.get('average_ticket', 50))
            
            # Expected revenue calculation
            historical_count = historical_data.get('appointment_count', 1)
            expected_revenue = optimal_price * min(historical_count, 2)  # Max 2 appointments per hour
            
            # Generate suggestions
            suggested_services = self._get_services_for_tier(target_tier, available_services)
            
            # Create reasoning
            period = "morning" if hour < 12 else "afternoon" if hour < 17 else "evening"
            reasoning = f"Prime {period} slot for {target_tier.value} services. Historical average: ${historical_data.get('average_ticket', 50):.0f}"
            
            return RevenueTimeBlock(
                start_hour=hour,
                end_hour=hour + 1,
                optimal_service_price=optimal_price,
                expected_revenue=expected_revenue,
                confidence_score=confidence,
                reasoning=reasoning,
                suggested_services=suggested_services
            )
            
        except Exception as e:
            logger.warning(f"Error optimizing hour block {hour}: {str(e)}")
            return None

    def _get_services_for_tier(self, tier: ServiceTier, available_services: List[Dict]) -> List[str]:
        """Get recommended services for a specific tier"""
        tier_config = self.SERVICE_TIERS[tier]
        min_price = tier_config['min_price']
        
        suitable_services = []
        for service in available_services:
            if service.get('price', 0) >= min_price:
                suitable_services.append(service['name'])
        
        # Default suggestions if no services match
        if not suitable_services:
            if tier == ServiceTier.PLATINUM:
                suitable_services = ['Executive Styling Package', 'Premium Cut & Style']
            elif tier == ServiceTier.GOLD:
                suitable_services = ['Premium Haircut', 'Cut & Beard Styling']
            elif tier == ServiceTier.SILVER:
                suitable_services = ['Professional Cut', 'Beard Trim']
            else:
                suitable_services = ['Basic Cut', 'Quick Trim']
        
        return suitable_services[:3]  # Return top 3 suggestions