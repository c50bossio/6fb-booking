"""
AI Strategy Engine for 6FB Booking V2
Generates and manages AI-powered business strategies with ROI prediction and tracking.

This service provides:
- Dynamic strategy generation based on business data
- ROI prediction using historical patterns
- Strategy success tracking and learning
- Adaptive strategy recommendations
- Performance-based strategy refinement
"""

import json
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from enum import Enum

from models import User, Appointment, Client, Payment
from models.ai_memory_models import StrategyOutcome, BusinessPattern
from services.vector_knowledge_service import VectorKnowledgeService
from services.ai_memory_service import AIMemoryService

logger = logging.getLogger(__name__)


class StrategyType(Enum):
    """Types of business strategies"""
    PRICING_OPTIMIZATION = "pricing_optimization"
    CLIENT_RETENTION = "client_retention"
    REVENUE_GROWTH = "revenue_growth"
    OPERATIONAL_EFFICIENCY = "operational_efficiency"
    SERVICE_ENHANCEMENT = "service_enhancement"
    MARKETING_EXPANSION = "marketing_expansion"
    SCHEDULING_OPTIMIZATION = "scheduling_optimization"
    BRAND_DEVELOPMENT = "brand_development"


class StrategyPriority(Enum):
    """Strategy implementation priority levels"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    CRITICAL = "critical"


class BusinessStrategy:
    """Represents a generated business strategy"""
    
    def __init__(self, strategy_type: StrategyType, title: str, description: str,
                 implementation_steps: List[str], expected_outcomes: Dict,
                 predicted_roi: float, priority: StrategyPriority = StrategyPriority.MEDIUM,
                 timeline_weeks: int = 4, required_resources: List[str] = None):
        self.id = str(uuid4())
        self.strategy_type = strategy_type
        self.title = title
        self.description = description
        self.implementation_steps = implementation_steps
        self.expected_outcomes = expected_outcomes
        self.predicted_roi = predicted_roi
        self.priority = priority
        self.timeline_weeks = timeline_weeks
        self.required_resources = required_resources or []
        self.created_at = datetime.now()
        self.confidence_score = 0.5  # Will be calculated based on data quality
        
    def to_dict(self) -> Dict:
        """Convert strategy to dictionary"""
        return {
            'id': self.id,
            'strategy_type': self.strategy_type.value,
            'title': self.title,
            'description': self.description,
            'implementation_steps': self.implementation_steps,
            'expected_outcomes': self.expected_outcomes,
            'predicted_roi': self.predicted_roi,
            'priority': self.priority.value,
            'timeline_weeks': self.timeline_weeks,
            'required_resources': self.required_resources,
            'confidence_score': self.confidence_score,
            'created_at': self.created_at.isoformat()
        }


class BusinessAnalyzer:
    """Analyzes business data to identify improvement opportunities"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def analyze_revenue_performance(self, user_id: str, period_days: int = 90) -> Dict:
        """Analyze revenue performance and identify opportunities"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Get revenue data
            payments = self.db.query(Payment).filter(
                and_(
                    Payment.user_id == user_id,
                    Payment.created_at >= start_date,
                    Payment.status == "completed"
                )
            ).all()
            
            if not payments:
                return {'total_revenue': 0, 'opportunities': []}
            
            # Calculate metrics
            total_revenue = sum(float(p.amount) for p in payments)
            avg_transaction = total_revenue / len(payments)
            
            # Get appointments for context
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date,
                    Appointment.status.in_(["confirmed", "completed"])
                )
            ).count()
            
            revenue_per_appointment = total_revenue / appointments if appointments > 0 else 0
            
            # Identify opportunities
            opportunities = []
            
            # Low average transaction opportunity
            if avg_transaction < 75:
                opportunities.append({
                    'type': 'pricing_optimization',
                    'severity': 'high' if avg_transaction < 50 else 'medium',
                    'description': f'Average transaction value (${avg_transaction:.2f}) is below industry standards',
                    'potential_impact': 'high'
                })
            
            # Revenue per appointment opportunity
            if revenue_per_appointment < 80:
                opportunities.append({
                    'type': 'service_upselling',
                    'severity': 'medium',
                    'description': f'Revenue per appointment (${revenue_per_appointment:.2f}) could be improved',
                    'potential_impact': 'medium'
                })
            
            return {
                'total_revenue': total_revenue,
                'avg_transaction': avg_transaction,
                'revenue_per_appointment': revenue_per_appointment,
                'payment_count': len(payments),
                'appointment_count': appointments,
                'opportunities': opportunities
            }
            
        except Exception as e:
            logger.error(f"Error analyzing revenue performance: {str(e)}")
            return {'total_revenue': 0, 'opportunities': []}
    
    def analyze_client_patterns(self, user_id: str, period_days: int = 180) -> Dict:
        """Analyze client behavior patterns"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Get client data with appointment counts
            client_data = self.db.query(
                Client,
                func.count(Appointment.id).label('appointment_count'),
                func.max(Appointment.start_time).label('last_appointment'),
                func.min(Appointment.start_time).label('first_appointment')
            ).join(
                Appointment, Client.id == Appointment.client_id
            ).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date
                )
            ).group_by(Client.id).all()
            
            if not client_data:
                return {'client_count': 0, 'opportunities': []}
            
            # Analyze patterns
            total_clients = len(client_data)
            repeat_clients = len([c for c in client_data if c[1] > 1])  # More than 1 appointment
            retention_rate = (repeat_clients / total_clients) * 100 if total_clients > 0 else 0
            
            # Calculate average time between appointments for repeat clients
            avg_appointment_frequency = 0
            if repeat_clients > 0:
                frequencies = []
                for client, count, last_apt, first_apt in client_data:
                    if count > 1 and last_apt and first_apt:
                        days_span = (last_apt - first_apt).days
                        if days_span > 0:
                            frequencies.append(days_span / (count - 1))
                
                if frequencies:
                    avg_appointment_frequency = sum(frequencies) / len(frequencies)
            
            # Identify opportunities
            opportunities = []
            
            # Low retention opportunity
            if retention_rate < 60:
                opportunities.append({
                    'type': 'client_retention',
                    'severity': 'high' if retention_rate < 40 else 'medium',
                    'description': f'Client retention rate ({retention_rate:.1f}%) is below target',
                    'potential_impact': 'high'
                })
            
            # Long appointment gaps
            if avg_appointment_frequency > 60:  # More than 2 months between appointments
                opportunities.append({
                    'type': 'appointment_frequency',
                    'severity': 'medium',
                    'description': f'Average time between appointments ({avg_appointment_frequency:.0f} days) is lengthy',
                    'potential_impact': 'medium'
                })
            
            return {
                'client_count': total_clients,
                'repeat_clients': repeat_clients,
                'retention_rate': retention_rate,
                'avg_appointment_frequency': avg_appointment_frequency,
                'opportunities': opportunities
            }
            
        except Exception as e:
            logger.error(f"Error analyzing client patterns: {str(e)}")
            return {'client_count': 0, 'opportunities': []}
    
    def analyze_operational_efficiency(self, user_id: str, period_days: int = 90) -> Dict:
        """Analyze operational efficiency metrics"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Get appointment data
            appointments = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date
                )
            ).all()
            
            if not appointments:
                return {'total_appointments': 0, 'opportunities': []}
            
            # Calculate metrics
            total_appointments = len(appointments)
            completed_appointments = len([a for a in appointments if a.status == "completed"])
            cancelled_appointments = len([a for a in appointments if a.status == "cancelled"])
            no_show_appointments = len([a for a in appointments if a.status == "no_show"])
            
            completion_rate = (completed_appointments / total_appointments) * 100 if total_appointments > 0 else 0
            cancellation_rate = (cancelled_appointments / total_appointments) * 100 if total_appointments > 0 else 0
            no_show_rate = (no_show_appointments / total_appointments) * 100 if total_appointments > 0 else 0
            
            # Analyze time utilization
            working_hours_per_day = 8  # Assumption
            total_working_days = period_days * (5/7)  # Assume 5 working days per week
            potential_appointments_per_hour = 1.5  # Assumption based on average service time
            theoretical_max_appointments = total_working_days * working_hours_per_day * potential_appointments_per_hour
            
            utilization_rate = (total_appointments / theoretical_max_appointments) * 100 if theoretical_max_appointments > 0 else 0
            
            # Identify opportunities
            opportunities = []
            
            # High cancellation rate
            if cancellation_rate > 15:
                opportunities.append({
                    'type': 'cancellation_reduction',
                    'severity': 'high' if cancellation_rate > 25 else 'medium',
                    'description': f'Cancellation rate ({cancellation_rate:.1f}%) is above acceptable levels',
                    'potential_impact': 'medium'
                })
            
            # High no-show rate
            if no_show_rate > 10:
                opportunities.append({
                    'type': 'no_show_reduction',
                    'severity': 'high' if no_show_rate > 20 else 'medium',
                    'description': f'No-show rate ({no_show_rate:.1f}%) impacts efficiency',
                    'potential_impact': 'medium'
                })
            
            # Low utilization
            if utilization_rate < 60:
                opportunities.append({
                    'type': 'capacity_optimization',
                    'severity': 'high' if utilization_rate < 40 else 'medium',
                    'description': f'Schedule utilization ({utilization_rate:.1f}%) has room for improvement',
                    'potential_impact': 'high'
                })
            
            return {
                'total_appointments': total_appointments,
                'completion_rate': completion_rate,
                'cancellation_rate': cancellation_rate,
                'no_show_rate': no_show_rate,
                'utilization_rate': utilization_rate,
                'opportunities': opportunities
            }
            
        except Exception as e:
            logger.error(f"Error analyzing operational efficiency: {str(e)}")
            return {'total_appointments': 0, 'opportunities': []}


class StrategyGenerator:
    """Generates specific business strategies based on analysis"""
    
    def __init__(self):
        self.strategy_templates = {
            StrategyType.PRICING_OPTIMIZATION: self._generate_pricing_strategy,
            StrategyType.CLIENT_RETENTION: self._generate_retention_strategy,
            StrategyType.REVENUE_GROWTH: self._generate_revenue_strategy,
            StrategyType.OPERATIONAL_EFFICIENCY: self._generate_efficiency_strategy,
            StrategyType.SERVICE_ENHANCEMENT: self._generate_service_strategy,
            StrategyType.SCHEDULING_OPTIMIZATION: self._generate_scheduling_strategy
        }
    
    def generate_strategy(self, strategy_type: StrategyType, business_data: Dict, 
                         opportunity_data: Dict) -> BusinessStrategy:
        """Generate a specific strategy based on type and data"""
        try:
            generator_func = self.strategy_templates.get(strategy_type)
            if generator_func:
                return generator_func(business_data, opportunity_data)
            else:
                return self._generate_generic_strategy(strategy_type, business_data, opportunity_data)
                
        except Exception as e:
            logger.error(f"Error generating strategy: {str(e)}")
            return self._generate_fallback_strategy(strategy_type)
    
    def _generate_pricing_strategy(self, business_data: Dict, opportunity_data: Dict) -> BusinessStrategy:
        """Generate pricing optimization strategy"""
        current_avg = business_data.get('avg_transaction', 0)
        target_increase = min(0.25, (100 - current_avg) / 100)  # Up to 25% increase
        predicted_roi = target_increase * 100  # Simple ROI calculation
        
        return BusinessStrategy(
            strategy_type=StrategyType.PRICING_OPTIMIZATION,
            title="Premium Service Pricing Strategy",
            description=f"Optimize pricing structure to increase average transaction value from ${current_avg:.2f} to ${current_avg * (1 + target_increase):.2f}",
            implementation_steps=[
                "Analyze competitor pricing in your area",
                "Review current service menu and identify premium opportunities", 
                "Implement tiered pricing with basic/premium options",
                "Add complementary services to increase per-visit value",
                "Test new pricing with select services for 2 weeks",
                "Gather client feedback and adjust accordingly",
                "Roll out optimized pricing across all services"
            ],
            expected_outcomes={
                'avg_transaction_increase': f"{target_increase * 100:.1f}%",
                'monthly_revenue_increase': f"${business_data.get('total_revenue', 0) * target_increase / 3:.0f}",
                'client_satisfaction': 'Maintained or improved through value perception'
            },
            predicted_roi=predicted_roi,
            priority=StrategyPriority.HIGH if current_avg < 50 else StrategyPriority.MEDIUM,
            timeline_weeks=6,
            required_resources=['Market research time', 'Pricing analysis', 'Menu redesign']
        )
    
    def _generate_retention_strategy(self, business_data: Dict, opportunity_data: Dict) -> BusinessStrategy:
        """Generate client retention strategy"""
        current_retention = opportunity_data.get('retention_rate', 0)
        target_improvement = min(20, 80 - current_retention)  # Target up to 80% retention
        predicted_roi = target_improvement * 2  # 2x ROI for retention improvements
        
        return BusinessStrategy(
            strategy_type=StrategyType.CLIENT_RETENTION,
            title="Client Loyalty & Retention Program",
            description=f"Improve client retention from {current_retention:.1f}% to {current_retention + target_improvement:.1f}% through loyalty initiatives",
            implementation_steps=[
                "Create client loyalty point system",
                "Implement appointment reminder system (SMS/Email)",
                "Develop personalized follow-up sequences",
                "Launch referral incentive program",
                "Create VIP client recognition program",
                "Establish regular client feedback collection",
                "Offer loyalty rewards and exclusive services"
            ],
            expected_outcomes={
                'retention_rate_increase': f"{target_improvement:.1f}%",
                'repeat_client_revenue': f"${business_data.get('total_revenue', 0) * (target_improvement / 100):.0f}",
                'referral_growth': '15-25% increase in referral bookings'
            },
            predicted_roi=predicted_roi,
            priority=StrategyPriority.HIGH if current_retention < 50 else StrategyPriority.MEDIUM,
            timeline_weeks=8,
            required_resources=['CRM system', 'Communication tools', 'Loyalty program setup']
        )
    
    def _generate_revenue_strategy(self, business_data: Dict, opportunity_data: Dict) -> BusinessStrategy:
        """Generate comprehensive revenue growth strategy"""
        current_revenue = business_data.get('total_revenue', 0)
        monthly_revenue = current_revenue / 3  # Assuming 3-month data
        target_growth = 0.2  # 20% growth target
        predicted_roi = target_growth * 80  # 80% efficiency factor
        
        return BusinessStrategy(
            strategy_type=StrategyType.REVENUE_GROWTH,
            title="Multi-Channel Revenue Growth Initiative",
            description=f"Increase monthly revenue from ${monthly_revenue:.0f} to ${monthly_revenue * (1 + target_growth):.0f} through diversified growth tactics",
            implementation_steps=[
                "Expand service offerings with high-margin add-ons",
                "Implement dynamic pricing for peak hours",
                "Launch group booking packages and events",
                "Develop retail product sales (grooming products)",
                "Create seasonal service promotions",
                "Establish corporate client relationships",
                "Optimize booking capacity and reduce gaps"
            ],
            expected_outcomes={
                'monthly_revenue_increase': f"${monthly_revenue * target_growth:.0f}",
                'service_diversification': '3-5 new revenue streams',
                'capacity_utilization': 'Improved by 15-20%'
            },
            predicted_roi=predicted_roi,
            priority=StrategyPriority.HIGH,
            timeline_weeks=10,
            required_resources=['Product inventory', 'Marketing budget', 'Staff training']
        )
    
    def _generate_efficiency_strategy(self, business_data: Dict, opportunity_data: Dict) -> BusinessStrategy:
        """Generate operational efficiency strategy"""
        utilization_rate = opportunity_data.get('utilization_rate', 0)
        target_improvement = min(25, 80 - utilization_rate)
        predicted_roi = target_improvement * 1.5  # 1.5x multiplier for efficiency gains
        
        return BusinessStrategy(
            strategy_type=StrategyType.OPERATIONAL_EFFICIENCY,
            title="Operational Excellence & Efficiency Program",
            description=f"Improve operational efficiency from {utilization_rate:.1f}% to {utilization_rate + target_improvement:.1f}% utilization",
            implementation_steps=[
                "Implement advanced booking system with buffer optimization",
                "Create standardized service time protocols",
                "Develop no-show and cancellation policies",
                "Establish appointment confirmation workflows",
                "Optimize daily schedule templates",
                "Implement wait-list management system",
                "Train staff on time management best practices"
            ],
            expected_outcomes={
                'utilization_improvement': f"{target_improvement:.1f}%",
                'additional_appointments_per_week': f"{target_improvement / 5:.0f}",
                'reduced_downtime': '30-40% reduction in schedule gaps'
            },
            predicted_roi=predicted_roi,
            priority=StrategyPriority.MEDIUM if utilization_rate > 50 else StrategyPriority.HIGH,
            timeline_weeks=6,
            required_resources=['Booking system upgrade', 'Staff training', 'Process documentation']
        )
    
    def _generate_service_strategy(self, business_data: Dict, opportunity_data: Dict) -> BusinessStrategy:
        """Generate service enhancement strategy"""
        return BusinessStrategy(
            strategy_type=StrategyType.SERVICE_ENHANCEMENT,
            title="Premium Service Experience Upgrade",
            description="Enhance service quality and customer experience to justify premium pricing and improve retention",
            implementation_steps=[
                "Conduct comprehensive client satisfaction survey",
                "Identify top 3 service enhancement opportunities",
                "Develop signature service experiences",
                "Implement quality control checklists",
                "Create ambiance and environment improvements",
                "Establish service excellence training program",
                "Launch client feedback and improvement system"
            ],
            expected_outcomes={
                'client_satisfaction_increase': '15-25%',
                'service_premium_capability': 'Ability to charge 10-20% premium',
                'brand_differentiation': 'Unique market positioning'
            },
            predicted_roi=20.0,
            priority=StrategyPriority.MEDIUM,
            timeline_weeks=8,
            required_resources=['Training materials', 'Environment upgrades', 'Feedback systems']
        )
    
    def _generate_scheduling_strategy(self, business_data: Dict, opportunity_data: Dict) -> BusinessStrategy:
        """Generate scheduling optimization strategy"""
        cancellation_rate = opportunity_data.get('cancellation_rate', 0)
        no_show_rate = opportunity_data.get('no_show_rate', 0)
        
        return BusinessStrategy(
            strategy_type=StrategyType.SCHEDULING_OPTIMIZATION,
            title="Smart Scheduling & Availability Optimization",
            description=f"Reduce cancellations ({cancellation_rate:.1f}%) and no-shows ({no_show_rate:.1f}%) while optimizing schedule efficiency",
            implementation_steps=[
                "Implement smart booking algorithms",
                "Create automated reminder systems",
                "Establish flexible rebooking policies",
                "Develop waitlist management system",
                "Set up real-time availability updates",
                "Create buffer time optimization",
                "Launch predictive scheduling based on patterns"
            ],
            expected_outcomes={
                'cancellation_reduction': f"{min(5, cancellation_rate / 2):.1f}%",
                'no_show_reduction': f"{min(3, no_show_rate / 2):.1f}%",
                'schedule_efficiency': 'Improved by 10-15%'
            },
            predicted_roi=15.0,
            priority=StrategyPriority.MEDIUM,
            timeline_weeks=5,
            required_resources=['Booking system features', 'Communication automation', 'Analytics tools']
        )
    
    def _generate_generic_strategy(self, strategy_type: StrategyType, business_data: Dict, 
                                 opportunity_data: Dict) -> BusinessStrategy:
        """Generate generic strategy for unhandled types"""
        return BusinessStrategy(
            strategy_type=strategy_type,
            title=f"{strategy_type.value.replace('_', ' ').title()} Strategy",
            description=f"Implement {strategy_type.value.replace('_', ' ')} improvements based on business analysis",
            implementation_steps=[
                "Analyze current state and opportunities",
                "Develop specific action plan",
                "Implement initial changes",
                "Monitor and measure results",
                "Optimize based on performance"
            ],
            expected_outcomes={'improvement': 'Measurable business improvement'},
            predicted_roi=10.0,
            priority=StrategyPriority.MEDIUM,
            timeline_weeks=6
        )
    
    def _generate_fallback_strategy(self, strategy_type: StrategyType) -> BusinessStrategy:
        """Generate fallback strategy when generation fails"""
        return BusinessStrategy(
            strategy_type=strategy_type,
            title="Business Improvement Initiative",
            description="General business improvement strategy based on available data",
            implementation_steps=[
                "Review current business performance",
                "Identify key improvement areas",
                "Develop action plan",
                "Implement changes systematically",
                "Track progress and results"
            ],
            expected_outcomes={'general_improvement': 'Overall business enhancement'},
            predicted_roi=5.0,
            priority=StrategyPriority.LOW,
            timeline_weeks=4
        )


class AIStrategyEngine:
    """Main AI Strategy Engine service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.business_analyzer = BusinessAnalyzer(db)
        self.strategy_generator = StrategyGenerator()
        self.vector_service = VectorKnowledgeService(db)
        self.memory_service = AIMemoryService(db)
    
    async def analyze_business_and_generate_strategies(self, user_id: str, max_strategies: int = 3) -> List[BusinessStrategy]:
        """Analyze business and generate prioritized strategies"""
        try:
            self.logger.info(f"Analyzing business and generating strategies for user {user_id}")
            
            # Perform business analysis
            revenue_analysis = self.business_analyzer.analyze_revenue_performance(user_id)
            client_analysis = self.business_analyzer.analyze_client_patterns(user_id)
            efficiency_analysis = self.business_analyzer.analyze_operational_efficiency(user_id)
            
            # Combine all opportunities
            all_opportunities = []
            all_opportunities.extend(revenue_analysis.get('opportunities', []))
            all_opportunities.extend(client_analysis.get('opportunities', []))
            all_opportunities.extend(efficiency_analysis.get('opportunities', []))
            
            # Prioritize opportunities by severity and impact
            high_priority_ops = [op for op in all_opportunities if op.get('severity') == 'high']
            medium_priority_ops = [op for op in all_opportunities if op.get('severity') == 'medium']
            
            # Generate strategies for highest priority opportunities
            strategies = []
            business_data = {
                **revenue_analysis,
                **client_analysis,
                **efficiency_analysis
            }
            
            # Map opportunity types to strategy types
            opportunity_to_strategy = {
                'pricing_optimization': StrategyType.PRICING_OPTIMIZATION,
                'client_retention': StrategyType.CLIENT_RETENTION,
                'capacity_optimization': StrategyType.OPERATIONAL_EFFICIENCY,
                'service_upselling': StrategyType.SERVICE_ENHANCEMENT,
                'cancellation_reduction': StrategyType.SCHEDULING_OPTIMIZATION,
                'no_show_reduction': StrategyType.SCHEDULING_OPTIMIZATION
            }
            
            # Generate strategies for high priority opportunities first
            strategy_types_used = set()
            
            for opportunity in high_priority_ops[:max_strategies]:
                strategy_type = opportunity_to_strategy.get(opportunity['type'])
                if strategy_type and strategy_type not in strategy_types_used:
                    strategy = self.strategy_generator.generate_strategy(
                        strategy_type, business_data, opportunity
                    )
                    strategy.confidence_score = self._calculate_confidence_score(business_data, opportunity)
                    strategies.append(strategy)
                    strategy_types_used.add(strategy_type)
            
            # Fill remaining slots with medium priority if needed
            remaining_slots = max_strategies - len(strategies)
            for opportunity in medium_priority_ops[:remaining_slots]:
                strategy_type = opportunity_to_strategy.get(opportunity['type'])
                if strategy_type and strategy_type not in strategy_types_used:
                    strategy = self.strategy_generator.generate_strategy(
                        strategy_type, business_data, opportunity
                    )
                    strategy.confidence_score = self._calculate_confidence_score(business_data, opportunity)
                    strategies.append(strategy)
                    strategy_types_used.add(strategy_type)
            
            # If still need more strategies, generate revenue growth strategy
            if len(strategies) < max_strategies and StrategyType.REVENUE_GROWTH not in strategy_types_used:
                revenue_strategy = self.strategy_generator.generate_strategy(
                    StrategyType.REVENUE_GROWTH, business_data, {}
                )
                revenue_strategy.confidence_score = self._calculate_confidence_score(business_data, {})
                strategies.append(revenue_strategy)
            
            # Sort by priority and confidence
            strategies.sort(key=lambda s: (
                {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}[s.priority.value],
                s.confidence_score
            ), reverse=True)
            
            self.logger.info(f"Generated {len(strategies)} strategies for user {user_id}")
            return strategies
            
        except Exception as e:
            self.logger.error(f"Error analyzing business and generating strategies: {str(e)}")
            return []
    
    async def predict_strategy_success(self, user_id: str, strategy: BusinessStrategy) -> Dict:
        """Predict likelihood of strategy success using historical data and AI memory"""
        try:
            # Get similar strategies from vector knowledge base
            similar_strategies = await self.vector_service.find_similar_strategies(
                user_id=user_id,
                proposed_strategy=strategy.to_dict()
            )
            
            # Get memory-based predictions
            memory_predictions = await self.memory_service.predict_strategy_success(
                user_id=user_id,
                proposed_strategy=strategy.to_dict()
            )
            
            # Calculate base success probability
            base_success_rate = 0.6  # Default baseline
            
            # Adjust based on similar strategies
            if similar_strategies:
                successful_similar = sum(1 for s in similar_strategies if s.get('success', False))
                similar_success_rate = successful_similar / len(similar_strategies)
                base_success_rate = (base_success_rate + similar_success_rate) / 2
            
            # Adjust based on memory predictions
            if memory_predictions.get('confidence', 0) > 0.3:
                memory_success_rate = memory_predictions.get('predicted_success_rate', 0.5)
                base_success_rate = (base_success_rate + memory_success_rate) / 2
            
            # Factor in strategy characteristics
            confidence_multiplier = strategy.confidence_score
            priority_multiplier = {'critical': 1.2, 'high': 1.1, 'medium': 1.0, 'low': 0.9}[strategy.priority.value]
            
            final_success_probability = min(0.95, base_success_rate * confidence_multiplier * priority_multiplier)
            
            # Generate implementation recommendations
            recommendations = self._generate_implementation_recommendations(
                strategy, similar_strategies, memory_predictions
            )
            
            return {
                'strategy_id': strategy.id,
                'predicted_success_probability': final_success_probability,
                'confidence_level': strategy.confidence_score,
                'similar_strategies_analyzed': len(similar_strategies),
                'recommendations': recommendations,
                'risk_factors': self._identify_risk_factors(strategy),
                'success_factors': self._identify_success_factors(strategy, similar_strategies)
            }
            
        except Exception as e:
            self.logger.error(f"Error predicting strategy success: {str(e)}")
            return {
                'strategy_id': strategy.id,
                'predicted_success_probability': 0.5,
                'confidence_level': 0.3,
                'error': str(e)
            }
    
    async def track_strategy_implementation(self, user_id: str, strategy_id: str, 
                                         implementation_data: Dict) -> Dict:
        """Track strategy implementation progress"""
        try:
            # Get or create strategy outcome record
            strategy_outcome = self.db.query(StrategyOutcome).filter(
                and_(
                    StrategyOutcome.user_id == user_id,
                    StrategyOutcome.strategy_id == strategy_id
                )
            ).first()
            
            if not strategy_outcome:
                # Create new strategy outcome record
                strategy_outcome = StrategyOutcome(
                    user_id=user_id,
                    strategy_id=strategy_id,
                    strategy_title=implementation_data.get('title', 'Unknown Strategy'),
                    strategy_description=implementation_data.get('description', ''),
                    strategy_type=implementation_data.get('type', 'general'),
                    implementation_status='active',
                    baseline_metrics=implementation_data.get('baseline_metrics', {})
                )
                self.db.add(strategy_outcome)
            
            # Update implementation status
            strategy_outcome.implementation_status = implementation_data.get('status', 'active')
            strategy_outcome.outcome_metrics = implementation_data.get('current_metrics', {})
            
            # Calculate current ROI if possible
            baseline_revenue = strategy_outcome.baseline_metrics.get('revenue', 0)
            current_revenue = implementation_data.get('current_metrics', {}).get('revenue', 0)
            
            if baseline_revenue > 0 and current_revenue > baseline_revenue:
                roi_percentage = ((current_revenue - baseline_revenue) / baseline_revenue) * 100
                strategy_outcome.roi_percentage = roi_percentage
            
            self.db.commit()
            
            # Update AI memory with implementation progress
            await self.memory_service.learn_from_interaction(user_id, {
                'query_type': 'strategy_implementation',
                'strategy_id': strategy_id,
                'implementation_data': implementation_data,
                'effectiveness': implementation_data.get('effectiveness', 0.5)
            })
            
            return {
                'strategy_id': strategy_id,
                'implementation_status': strategy_outcome.implementation_status,
                'current_roi': strategy_outcome.roi_percentage,
                'tracking_updated': True
            }
            
        except Exception as e:
            self.logger.error(f"Error tracking strategy implementation: {str(e)}")
            return {'error': str(e)}
    
    async def complete_strategy_and_learn(self, user_id: str, strategy_id: str, 
                                        final_outcome: Dict) -> bool:
        """Complete strategy and learn from outcomes"""
        try:
            # Update strategy outcome
            strategy_outcome = self.db.query(StrategyOutcome).filter(
                and_(
                    StrategyOutcome.user_id == user_id,
                    StrategyOutcome.strategy_id == strategy_id
                )
            ).first()
            
            if strategy_outcome:
                strategy_outcome.implementation_status = 'completed'
                strategy_outcome.completion_date = datetime.now()
                strategy_outcome.outcome_metrics = final_outcome.get('final_metrics', {})
                strategy_outcome.success_rating = final_outcome.get('success_rating', 0.5)
                strategy_outcome.roi_percentage = final_outcome.get('roi_percentage', 0)
                
                self.db.commit()
                
                # Learn from the outcome
                strategy_data = {
                    'id': strategy_id,
                    'title': strategy_outcome.strategy_title,
                    'type': strategy_outcome.strategy_type,
                    'description': strategy_outcome.strategy_description
                }
                
                await self.memory_service.store_strategy_outcome(
                    user_id=user_id,
                    strategy=strategy_data,
                    outcome=final_outcome
                )
                
                # Update vector knowledge base
                await self.vector_service.update_knowledge_from_strategy_outcome(
                    user_id=user_id,
                    strategy=strategy_data,
                    outcome=final_outcome
                )
                
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error completing strategy and learning: {str(e)}")
            return False
    
    # Private helper methods
    
    def _calculate_confidence_score(self, business_data: Dict, opportunity_data: Dict) -> float:
        """Calculate confidence score based on data quality and completeness"""
        score = 0.5  # Base score
        
        # Data completeness factor
        data_points = 0
        total_possible = 10
        
        if business_data.get('total_revenue', 0) > 0:
            data_points += 2
        if business_data.get('total_appointments', 0) > 0:
            data_points += 2
        if business_data.get('client_count', 0) > 0:
            data_points += 2
        if business_data.get('completion_rate', 0) > 0:
            data_points += 1
        if business_data.get('retention_rate', 0) > 0:
            data_points += 2
        if opportunity_data.get('severity'):
            data_points += 1
        
        data_completeness = data_points / total_possible
        score = 0.3 + (data_completeness * 0.7)  # Scale to 0.3-1.0
        
        return min(1.0, score)
    
    def _generate_implementation_recommendations(self, strategy: BusinessStrategy, 
                                               similar_strategies: List[Dict], 
                                               memory_predictions: Dict) -> List[str]:
        """Generate implementation recommendations"""
        recommendations = []
        
        # Base recommendations based on strategy type
        if strategy.strategy_type == StrategyType.PRICING_OPTIMIZATION:
            recommendations.extend([
                "Start with a small test group before full implementation",
                "Monitor client feedback closely during price changes",
                "Have data ready to justify price increases to clients"
            ])
        elif strategy.strategy_type == StrategyType.CLIENT_RETENTION:
            recommendations.extend([
                "Focus on your highest-value clients first",
                "Personalize retention efforts based on client preferences",
                "Track retention metrics weekly during implementation"
            ])
        
        # Add recommendations from similar successful strategies
        if similar_strategies:
            successful_strategies = [s for s in similar_strategies if s.get('success', False)]
            if successful_strategies:
                recommendations.append("Based on similar successful strategies, consider gradual implementation over 2-3 phases")
        
        # Add recommendations from memory predictions
        if memory_predictions.get('recommendations'):
            recommendations.extend(memory_predictions['recommendations'][:2])  # Top 2
        
        return recommendations[:5]  # Limit to 5 recommendations
    
    def _identify_risk_factors(self, strategy: BusinessStrategy) -> List[str]:
        """Identify potential risk factors for strategy"""
        risks = []
        
        if strategy.predicted_roi > 50:
            risks.append("High predicted ROI may indicate unrealistic expectations")
        
        if strategy.timeline_weeks < 4:
            risks.append("Short timeline may not allow for proper implementation")
        
        if len(strategy.required_resources) > 5:
            risks.append("High resource requirements may impact implementation")
        
        if strategy.confidence_score < 0.5:
            risks.append("Limited historical data reduces prediction confidence")
        
        return risks
    
    def _identify_success_factors(self, strategy: BusinessStrategy, 
                                similar_strategies: List[Dict]) -> List[str]:
        """Identify factors that contribute to success"""
        success_factors = []
        
        if strategy.confidence_score > 0.7:
            success_factors.append("Strong data foundation supports strategy viability")
        
        if similar_strategies:
            successful_count = sum(1 for s in similar_strategies if s.get('success', False))
            if successful_count / len(similar_strategies) > 0.6:
                success_factors.append("Historical success rate for similar strategies is favorable")
        
        if strategy.priority in [StrategyPriority.HIGH, StrategyPriority.CRITICAL]:
            success_factors.append("High priority indicates significant business impact potential")
        
        if strategy.timeline_weeks >= 6:
            success_factors.append("Adequate timeline allows for proper implementation and adjustment")
        
        return success_factors