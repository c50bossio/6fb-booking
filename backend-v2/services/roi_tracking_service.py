"""
ROI Tracking Service for 6FB Booking V2
Comprehensive ROI measurement and tracking system for AI-recommended strategies.

This service provides:
- Real-time ROI calculation and monitoring
- Strategy performance tracking
- Business impact measurement
- Long-term value analysis
- ROI prediction and forecasting
"""

import json
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, text
from enum import Enum
from dataclasses import dataclass

from models import User, Appointment, Client, Payment
from models.ai_memory_models import StrategyOutcome, BusinessPattern
from services.ai_memory_service import AIMemoryService

logger = logging.getLogger(__name__)


class ROIMetricType(Enum):
    """Types of ROI metrics to track"""
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    CLIENT_SATISFACTION = "client_satisfaction"
    EFFICIENCY = "efficiency"
    GROWTH = "growth"


class ROITimeframe(Enum):
    """Timeframes for ROI measurement"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


@dataclass
class BaselineMetrics:
    """Baseline metrics captured before strategy implementation"""
    revenue: float
    appointments: int
    clients: int
    avg_transaction_value: float
    client_retention_rate: float
    appointment_completion_rate: float
    utilization_rate: float
    captured_at: datetime
    
    def to_dict(self) -> Dict:
        return {
            'revenue': self.revenue,
            'appointments': self.appointments,
            'clients': self.clients,
            'avg_transaction_value': self.avg_transaction_value,
            'client_retention_rate': self.client_retention_rate,
            'appointment_completion_rate': self.appointment_completion_rate,
            'utilization_rate': self.utilization_rate,
            'captured_at': self.captured_at.isoformat()
        }


@dataclass
class ROICalculation:
    """ROI calculation result"""
    strategy_id: str
    metric_type: ROIMetricType
    baseline_value: float
    current_value: float
    absolute_improvement: float
    percentage_improvement: float
    roi_percentage: float
    confidence_level: float
    calculated_at: datetime
    
    def to_dict(self) -> Dict:
        return {
            'strategy_id': self.strategy_id,
            'metric_type': self.metric_type.value,
            'baseline_value': self.baseline_value,
            'current_value': self.current_value,
            'absolute_improvement': self.absolute_improvement,
            'percentage_improvement': self.percentage_improvement,
            'roi_percentage': self.roi_percentage,
            'confidence_level': self.confidence_level,
            'calculated_at': self.calculated_at.isoformat()
        }


class MetricsCollector:
    """Collects business metrics for ROI calculation"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def collect_current_metrics(self, user_id: str, period_days: int = 30) -> BaselineMetrics:
        """Collect current business metrics"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Revenue metrics
            revenue_query = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.user_id == user_id,
                    Payment.created_at >= start_date,
                    Payment.status == "completed"
                )
            )
            total_revenue = float(revenue_query.scalar() or 0)
            
            # Appointment metrics
            appointments_query = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date,
                    Appointment.status.in_(["confirmed", "completed", "cancelled", "no_show"])
                )
            )
            appointments = appointments_query.all()
            total_appointments = len(appointments)
            completed_appointments = len([a for a in appointments if a.status == "completed"])
            
            # Client metrics
            unique_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date,
                    Appointment.status.in_(["confirmed", "completed"])
                )
            ).scalar() or 0
            
            # Calculate derived metrics
            avg_transaction_value = total_revenue / total_appointments if total_appointments > 0 else 0
            completion_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0
            
            # Client retention (simplified - clients with more than 1 appointment in period)
            repeat_clients = self.db.query(func.count(func.distinct(Appointment.client_id))).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date,
                    Appointment.status.in_(["confirmed", "completed"])
                )
            ).having(func.count(Appointment.id) > 1).scalar() or 0
            
            retention_rate = (repeat_clients / unique_clients * 100) if unique_clients > 0 else 0
            
            # Utilization rate (simplified calculation)
            working_days = period_days * (5/7)  # Assume 5 working days per week  
            working_hours_per_day = 8
            theoretical_max_appointments = working_days * working_hours_per_day * 1.5  # 1.5 appointments per hour
            utilization_rate = (total_appointments / theoretical_max_appointments * 100) if theoretical_max_appointments > 0 else 0
            
            return BaselineMetrics(
                revenue=total_revenue,
                appointments=total_appointments,
                clients=unique_clients,
                avg_transaction_value=avg_transaction_value,
                client_retention_rate=retention_rate,
                appointment_completion_rate=completion_rate,
                utilization_rate=utilization_rate,
                captured_at=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error collecting current metrics: {str(e)}")
            return BaselineMetrics(0, 0, 0, 0, 0, 0, 0, datetime.now())
    
    def collect_historical_metrics(self, user_id: str, target_date: datetime, 
                                 period_days: int = 30) -> BaselineMetrics:
        """Collect historical metrics for a specific date period"""
        try:
            end_date = target_date
            start_date = end_date - timedelta(days=period_days)
            
            # Similar logic to collect_current_metrics but for historical period
            revenue_query = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.user_id == user_id,
                    Payment.created_at >= start_date,
                    Payment.created_at <= end_date,
                    Payment.status == "completed"
                )
            )
            total_revenue = float(revenue_query.scalar() or 0)
            
            appointments_query = self.db.query(Appointment).filter(
                and_(
                    Appointment.barber_id == user_id,
                    Appointment.start_time >= start_date,
                    Appointment.start_time <= end_date,
                    Appointment.status.in_(["confirmed", "completed", "cancelled", "no_show"])
                )
            )
            appointments = appointments_query.all()
            total_appointments = len(appointments)
            completed_appointments = len([a for a in appointments if a.status == "completed"])
            
            unique_clients = len(set(a.client_id for a in appointments if a.client_id))
            
            avg_transaction_value = total_revenue / total_appointments if total_appointments > 0 else 0
            completion_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0
            
            # Simplified retention calculation for historical data
            client_appointment_counts = {}
            for appointment in appointments:
                if appointment.client_id:
                    client_appointment_counts[appointment.client_id] = client_appointment_counts.get(appointment.client_id, 0) + 1
            
            repeat_clients = len([c for c, count in client_appointment_counts.items() if count > 1])
            retention_rate = (repeat_clients / unique_clients * 100) if unique_clients > 0 else 0
            
            working_days = period_days * (5/7)
            working_hours_per_day = 8
            theoretical_max_appointments = working_days * working_hours_per_day * 1.5
            utilization_rate = (total_appointments / theoretical_max_appointments * 100) if theoretical_max_appointments > 0 else 0
            
            return BaselineMetrics(
                revenue=total_revenue,
                appointments=total_appointments,
                clients=unique_clients,
                avg_transaction_value=avg_transaction_value,
                client_retention_rate=retention_rate,
                appointment_completion_rate=completion_rate,
                utilization_rate=utilization_rate,
                captured_at=target_date
            )
            
        except Exception as e:
            logger.error(f"Error collecting historical metrics: {str(e)}")
            return BaselineMetrics(0, 0, 0, 0, 0, 0, 0, target_date)


class ROICalculator:
    """Calculates ROI for various strategy types"""
    
    def __init__(self):
        self.calculation_methods = {
            'pricing_optimization': self._calculate_pricing_roi,
            'client_retention': self._calculate_retention_roi,
            'operational_efficiency': self._calculate_efficiency_roi,
            'revenue_growth': self._calculate_revenue_roi,
            'service_enhancement': self._calculate_service_roi
        }
    
    def calculate_strategy_roi(self, strategy_type: str, baseline: BaselineMetrics, 
                             current: BaselineMetrics, investment_cost: float = 0) -> List[ROICalculation]:
        """Calculate ROI for a specific strategy type"""
        try:
            calculation_method = self.calculation_methods.get(strategy_type, self._calculate_generic_roi)
            return calculation_method(baseline, current, investment_cost)
            
        except Exception as e:
            logger.error(f"Error calculating strategy ROI: {str(e)}")
            return []
    
    def _calculate_pricing_roi(self, baseline: BaselineMetrics, current: BaselineMetrics, 
                             investment_cost: float) -> List[ROICalculation]:
        """Calculate ROI for pricing optimization strategies"""
        calculations = []
        
        # Revenue ROI
        revenue_improvement = current.revenue - baseline.revenue
        revenue_roi = ((revenue_improvement - investment_cost) / max(investment_cost, 1)) * 100
        
        calculations.append(ROICalculation(
            strategy_id="pricing_strategy",
            metric_type=ROIMetricType.FINANCIAL,
            baseline_value=baseline.revenue,
            current_value=current.revenue,
            absolute_improvement=revenue_improvement,
            percentage_improvement=(revenue_improvement / max(baseline.revenue, 1)) * 100,
            roi_percentage=revenue_roi,
            confidence_level=0.9,  # High confidence for financial metrics
            calculated_at=datetime.now()
        ))
        
        # Average transaction value ROI
        atv_improvement = current.avg_transaction_value - baseline.avg_transaction_value
        atv_roi = (atv_improvement / max(baseline.avg_transaction_value, 1)) * 100
        
        calculations.append(ROICalculation(
            strategy_id="pricing_strategy",
            metric_type=ROIMetricType.OPERATIONAL,
            baseline_value=baseline.avg_transaction_value,
            current_value=current.avg_transaction_value,
            absolute_improvement=atv_improvement,
            percentage_improvement=atv_roi,
            roi_percentage=atv_roi,
            confidence_level=0.8,
            calculated_at=datetime.now()
        ))
        
        return calculations
    
    def _calculate_retention_roi(self, baseline: BaselineMetrics, current: BaselineMetrics, 
                               investment_cost: float) -> List[ROICalculation]:
        """Calculate ROI for client retention strategies"""
        calculations = []
        
        # Client retention rate ROI
        retention_improvement = current.client_retention_rate - baseline.client_retention_rate
        
        # Estimate financial impact of retention improvement
        # Assume each 1% retention improvement equals 2% revenue improvement (industry avg)
        estimated_revenue_impact = retention_improvement * 0.02 * baseline.revenue
        retention_financial_roi = ((estimated_revenue_impact - investment_cost) / max(investment_cost, 1)) * 100
        
        calculations.append(ROICalculation(
            strategy_id="retention_strategy",
            metric_type=ROIMetricType.CLIENT_SATISFACTION,
            baseline_value=baseline.client_retention_rate,
            current_value=current.client_retention_rate,
            absolute_improvement=retention_improvement,
            percentage_improvement=(retention_improvement / max(baseline.client_retention_rate, 1)) * 100,
            roi_percentage=retention_financial_roi,
            confidence_level=0.7,  # Medium confidence due to estimation
            calculated_at=datetime.now()
        ))
        
        # Client count growth
        client_growth = current.clients - baseline.clients
        client_growth_percentage = (client_growth / max(baseline.clients, 1)) * 100
        
        calculations.append(ROICalculation(
            strategy_id="retention_strategy",
            metric_type=ROIMetricType.GROWTH,
            baseline_value=baseline.clients,
            current_value=current.clients,
            absolute_improvement=client_growth,
            percentage_improvement=client_growth_percentage,
            roi_percentage=client_growth_percentage * 1.5,  # Multiplier for growth value
            confidence_level=0.8,
            calculated_at=datetime.now()
        ))
        
        return calculations
    
    def _calculate_efficiency_roi(self, baseline: BaselineMetrics, current: BaselineMetrics, 
                                investment_cost: float) -> List[ROICalculation]:
        """Calculate ROI for operational efficiency strategies"""
        calculations = []
        
        # Utilization rate improvement
        utilization_improvement = current.utilization_rate - baseline.utilization_rate
        
        # Estimate revenue impact of improved utilization
        estimated_additional_appointments = (utilization_improvement / 100) * 40  # Assume 40 potential weekly appointments
        estimated_revenue_increase = estimated_additional_appointments * baseline.avg_transaction_value * 4  # 4 weeks
        efficiency_roi = ((estimated_revenue_increase - investment_cost) / max(investment_cost, 1)) * 100
        
        calculations.append(ROICalculation(
            strategy_id="efficiency_strategy",
            metric_type=ROIMetricType.EFFICIENCY,
            baseline_value=baseline.utilization_rate,
            current_value=current.utilization_rate,
            absolute_improvement=utilization_improvement,
            percentage_improvement=(utilization_improvement / max(baseline.utilization_rate, 1)) * 100,
            roi_percentage=efficiency_roi,
            confidence_level=0.6,  # Lower confidence due to estimation
            calculated_at=datetime.now()
        ))
        
        # Appointment completion rate improvement
        completion_improvement = current.appointment_completion_rate - baseline.appointment_completion_rate
        
        calculations.append(ROICalculation(
            strategy_id="efficiency_strategy",
            metric_type=ROIMetricType.OPERATIONAL,
            baseline_value=baseline.appointment_completion_rate,
            current_value=current.appointment_completion_rate,
            absolute_improvement=completion_improvement,
            percentage_improvement=(completion_improvement / max(baseline.appointment_completion_rate, 1)) * 100,
            roi_percentage=completion_improvement * 2,  # 2x multiplier for completion rate value
            confidence_level=0.8,
            calculated_at=datetime.now()
        ))
        
        return calculations
    
    def _calculate_revenue_roi(self, baseline: BaselineMetrics, current: BaselineMetrics, 
                             investment_cost: float) -> List[ROICalculation]:
        """Calculate ROI for revenue growth strategies"""
        calculations = []
        
        # Direct revenue ROI
        revenue_improvement = current.revenue - baseline.revenue
        revenue_roi = ((revenue_improvement - investment_cost) / max(investment_cost, 1)) * 100
        
        calculations.append(ROICalculation(
            strategy_id="revenue_strategy",
            metric_type=ROIMetricType.FINANCIAL,
            baseline_value=baseline.revenue,
            current_value=current.revenue,
            absolute_improvement=revenue_improvement,
            percentage_improvement=(revenue_improvement / max(baseline.revenue, 1)) * 100,
            roi_percentage=revenue_roi,
            confidence_level=0.9,
            calculated_at=datetime.now()
        ))
        
        # Appointments growth ROI
        appointment_growth = current.appointments - baseline.appointments
        appointment_growth_percentage = (appointment_growth / max(baseline.appointments, 1)) * 100
        
        calculations.append(ROICalculation(
            strategy_id="revenue_strategy",
            metric_type=ROIMetricType.GROWTH,
            baseline_value=baseline.appointments,
            current_value=current.appointments,
            absolute_improvement=appointment_growth,
            percentage_improvement=appointment_growth_percentage,
            roi_percentage=appointment_growth_percentage * 1.2,  # Growth multiplier
            confidence_level=0.8,
            calculated_at=datetime.now()
        ))
        
        return calculations
    
    def _calculate_service_roi(self, baseline: BaselineMetrics, current: BaselineMetrics, 
                             investment_cost: float) -> List[ROICalculation]:
        """Calculate ROI for service enhancement strategies"""
        calculations = []
        
        # Service quality impact on revenue
        revenue_improvement = current.revenue - baseline.revenue
        service_roi = ((revenue_improvement - investment_cost) / max(investment_cost, 1)) * 100
        
        calculations.append(ROICalculation(
            strategy_id="service_strategy",
            metric_type=ROIMetricType.CLIENT_SATISFACTION,
            baseline_value=baseline.avg_transaction_value,
            current_value=current.avg_transaction_value,
            absolute_improvement=current.avg_transaction_value - baseline.avg_transaction_value,
            percentage_improvement=((current.avg_transaction_value - baseline.avg_transaction_value) / max(baseline.avg_transaction_value, 1)) * 100,
            roi_percentage=service_roi,
            confidence_level=0.7,
            calculated_at=datetime.now()
        ))
        
        return calculations
    
    def _calculate_generic_roi(self, baseline: BaselineMetrics, current: BaselineMetrics, 
                             investment_cost: float) -> List[ROICalculation]:
        """Calculate generic ROI for unspecified strategy types"""
        revenue_improvement = current.revenue - baseline.revenue
        generic_roi = ((revenue_improvement - investment_cost) / max(investment_cost, 1)) * 100
        
        return [ROICalculation(
            strategy_id="generic_strategy",
            metric_type=ROIMetricType.FINANCIAL,
            baseline_value=baseline.revenue,
            current_value=current.revenue,
            absolute_improvement=revenue_improvement,
            percentage_improvement=(revenue_improvement / max(baseline.revenue, 1)) * 100,
            roi_percentage=generic_roi,
            confidence_level=0.5,
            calculated_at=datetime.now()
        )]


class ROITrackingService:
    """Main ROI tracking service"""
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.metrics_collector = MetricsCollector(db)
        self.roi_calculator = ROICalculator()
        self.memory_service = AIMemoryService(db)
        
        # Track ongoing ROI calculations
        self.active_tracking: Dict[str, Dict] = {}
    
    async def capture_baseline_metrics(self, user_id: str, strategy_id: str) -> bool:
        """Capture baseline metrics before strategy implementation"""
        try:
            self.logger.info(f"Capturing baseline metrics for strategy {strategy_id}")
            
            # Collect current metrics as baseline
            baseline_metrics = self.metrics_collector.collect_current_metrics(user_id)
            
            # Store in strategy outcome record
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
                    strategy_title="ROI Tracked Strategy",
                    implementation_status='baseline_captured',
                    baseline_metrics=baseline_metrics.to_dict()
                )
                self.db.add(strategy_outcome)
            else:
                strategy_outcome.baseline_metrics = baseline_metrics.to_dict()
            
            self.db.commit()
            
            # Store in memory for learning
            await self.memory_service.store_conversation_memory(
                user_id=user_id,
                conversation=f"Baseline metrics captured for strategy {strategy_id}",
                context={
                    'strategy_id': strategy_id,
                    'baseline_metrics': baseline_metrics.to_dict(),
                    'action': 'baseline_capture'
                },
                importance=1.5
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error capturing baseline metrics: {str(e)}")
            return False
    
    async def calculate_current_roi(self, user_id: str, strategy_id: str, 
                                  investment_cost: float = 0) -> Dict:
        """Calculate current ROI for a strategy"""
        try:
            # Get strategy outcome record
            strategy_outcome = self.db.query(StrategyOutcome).filter(
                and_(
                    StrategyOutcome.user_id == user_id,
                    StrategyOutcome.strategy_id == strategy_id
                )
            ).first()
            
            if not strategy_outcome or not strategy_outcome.baseline_metrics:
                return {'error': 'No baseline metrics found for strategy'}
            
            # Reconstruct baseline metrics
            baseline_data = strategy_outcome.baseline_metrics
            baseline_metrics = BaselineMetrics(
                revenue=baseline_data.get('revenue', 0),
                appointments=baseline_data.get('appointments', 0),
                clients=baseline_data.get('clients', 0),
                avg_transaction_value=baseline_data.get('avg_transaction_value', 0),
                client_retention_rate=baseline_data.get('client_retention_rate', 0),
                appointment_completion_rate=baseline_data.get('appointment_completion_rate', 0),
                utilization_rate=baseline_data.get('utilization_rate', 0),
                captured_at=datetime.fromisoformat(baseline_data.get('captured_at', datetime.now().isoformat()))
            )
            
            # Collect current metrics
            current_metrics = self.metrics_collector.collect_current_metrics(user_id)
            
            # Calculate ROI based on strategy type
            strategy_type = strategy_outcome.strategy_type or 'generic'
            roi_calculations = self.roi_calculator.calculate_strategy_roi(
                strategy_type, baseline_metrics, current_metrics, investment_cost
            )
            
            # Update strategy outcome with current ROI
            if roi_calculations:
                primary_roi = roi_calculations[0]  # Use first calculation as primary
                strategy_outcome.roi_percentage = primary_roi.roi_percentage
                strategy_outcome.outcome_metrics = current_metrics.to_dict()
                self.db.commit()
            
            # Prepare response
            result = {
                'strategy_id': strategy_id,
                'baseline_date': baseline_metrics.captured_at.isoformat(),
                'current_date': current_metrics.captured_at.isoformat(),
                'roi_calculations': [calc.to_dict() for calc in roi_calculations],
                'overall_roi': roi_calculations[0].roi_percentage if roi_calculations else 0,
                'investment_cost': investment_cost,
                'time_elapsed_days': (current_metrics.captured_at - baseline_metrics.captured_at).days
            }
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error calculating current ROI: {str(e)}")
            return {'error': str(e)}
    
    async def track_roi_over_time(self, user_id: str, strategy_id: str, 
                                timeframe: ROITimeframe = ROITimeframe.WEEKLY) -> Dict:
        """Track ROI changes over time"""
        try:
            # Get strategy outcome
            strategy_outcome = self.db.query(StrategyOutcome).filter(
                and_(
                    StrategyOutcome.user_id == user_id,
                    StrategyOutcome.strategy_id == strategy_id
                )
            ).first()
            
            if not strategy_outcome or not strategy_outcome.baseline_metrics:
                return {'error': 'No baseline metrics found'}
            
            baseline_data = strategy_outcome.baseline_metrics
            baseline_date = datetime.fromisoformat(baseline_data.get('captured_at', datetime.now().isoformat()))
            
            # Generate time series data
            time_series = []
            current_date = datetime.now()
            
            # Determine time intervals
            if timeframe == ROITimeframe.DAILY:
                interval = timedelta(days=1)
                max_points = min(30, (current_date - baseline_date).days)
            elif timeframe == ROITimeframe.WEEKLY:
                interval = timedelta(weeks=1)
                max_points = min(12, int((current_date - baseline_date).days / 7))
            else:  # Monthly
                interval = timedelta(days=30)
                max_points = min(6, int((current_date - baseline_date).days / 30))
            
            # Collect historical data points
            for i in range(max_points):
                measurement_date = baseline_date + (interval * (i + 1))
                if measurement_date <= current_date:
                    historical_metrics = self.metrics_collector.collect_historical_metrics(
                        user_id, measurement_date
                    )
                    
                    baseline_metrics = BaselineMetrics(
                        revenue=baseline_data.get('revenue', 0),
                        appointments=baseline_data.get('appointments', 0),
                        clients=baseline_data.get('clients', 0),
                        avg_transaction_value=baseline_data.get('avg_transaction_value', 0),
                        client_retention_rate=baseline_data.get('client_retention_rate', 0),
                        appointment_completion_rate=baseline_data.get('appointment_completion_rate', 0),
                        utilization_rate=baseline_data.get('utilization_rate', 0),
                        captured_at=baseline_date
                    )
                    
                    roi_calculations = self.roi_calculator.calculate_strategy_roi(
                        strategy_outcome.strategy_type or 'generic',
                        baseline_metrics,
                        historical_metrics,
                        0  # No investment cost for historical calculation
                    )
                    
                    time_series.append({
                        'date': measurement_date.isoformat(),
                        'roi_percentage': roi_calculations[0].roi_percentage if roi_calculations else 0,
                        'revenue': historical_metrics.revenue,
                        'appointments': historical_metrics.appointments,
                        'clients': historical_metrics.clients
                    })
            
            return {
                'strategy_id': strategy_id,
                'timeframe': timeframe.value,
                'baseline_date': baseline_date.isoformat(),
                'time_series': time_series,
                'trend_analysis': self._analyze_roi_trend(time_series)
            }
            
        except Exception as e:
            self.logger.error(f"Error tracking ROI over time: {str(e)}")
            return {'error': str(e)}
    
    async def generate_roi_report(self, user_id: str, strategy_ids: List[str] = None, 
                                period_days: int = 90) -> Dict:
        """Generate comprehensive ROI report"""
        try:
            # Get all strategy outcomes for user
            query = self.db.query(StrategyOutcome).filter(StrategyOutcome.user_id == user_id)
            if strategy_ids:
                query = query.filter(StrategyOutcome.strategy_id.in_(strategy_ids))
            
            strategy_outcomes = query.all()
            
            if not strategy_outcomes:
                return {'error': 'No strategies found for ROI reporting'}
            
            # Collect current metrics
            current_metrics = self.metrics_collector.collect_current_metrics(user_id, period_days)
            
            # Generate report for each strategy
            strategy_reports = []
            total_roi = 0
            total_investment = 0
            
            for strategy_outcome in strategy_outcomes:
                if strategy_outcome.baseline_metrics:
                    roi_result = await self.calculate_current_roi(
                        user_id, strategy_outcome.strategy_id, 0
                    )
                    
                    if 'error' not in roi_result:
                        strategy_reports.append({
                            'strategy_id': strategy_outcome.strategy_id,
                            'strategy_title': strategy_outcome.strategy_title,
                            'strategy_type': strategy_outcome.strategy_type,
                            'implementation_status': strategy_outcome.implementation_status,
                            'roi_percentage': roi_result.get('overall_roi', 0),
                            'implementation_date': strategy_outcome.implementation_date.isoformat() if strategy_outcome.implementation_date else None,
                            'time_active_days': roi_result.get('time_elapsed_days', 0)
                        })
                        
                        total_roi += roi_result.get('overall_roi', 0)
            
            # Calculate aggregate metrics
            avg_roi = total_roi / len(strategy_reports) if strategy_reports else 0
            
            # Identify best and worst performing strategies
            best_strategy = max(strategy_reports, key=lambda x: x['roi_percentage']) if strategy_reports else None
            worst_strategy = min(strategy_reports, key=lambda x: x['roi_percentage']) if strategy_reports else None
            
            return {
                'user_id': user_id,
                'report_generated_at': datetime.now().isoformat(),
                'period_days': period_days,
                'total_strategies': len(strategy_reports),
                'average_roi': avg_roi,
                'total_roi': total_roi,
                'best_performing_strategy': best_strategy,
                'worst_performing_strategy': worst_strategy,
                'strategy_details': strategy_reports,
                'current_business_metrics': current_metrics.to_dict(),
                'summary': self._generate_roi_summary(strategy_reports, avg_roi)
            }
            
        except Exception as e:
            self.logger.error(f"Error generating ROI report: {str(e)}")
            return {'error': str(e)}
    
    async def predict_future_roi(self, user_id: str, strategy_id: str, 
                               projection_weeks: int = 12) -> Dict:
        """Predict future ROI based on current trends"""
        try:
            # Get current ROI tracking data
            roi_tracking = await self.track_roi_over_time(user_id, strategy_id, ROITimeframe.WEEKLY)
            
            if 'error' in roi_tracking:
                return roi_tracking
            
            time_series = roi_tracking.get('time_series', [])
            if len(time_series) < 3:
                return {'error': 'Insufficient data for ROI prediction'}
            
            # Simple linear regression for trend prediction
            roi_values = [point['roi_percentage'] for point in time_series]
            x_values = list(range(len(roi_values)))
            
            # Calculate linear trend
            n = len(roi_values)
            sum_x = sum(x_values)
            sum_y = sum(roi_values)
            sum_xy = sum(x * y for x, y in zip(x_values, roi_values))
            sum_x2 = sum(x * x for x in x_values)
            
            # Linear regression: y = mx + b
            m = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x) if (n * sum_x2 - sum_x * sum_x) != 0 else 0
            b = (sum_y - m * sum_x) / n
            
            # Generate predictions
            predictions = []
            last_week = len(time_series)
            
            for week in range(1, projection_weeks + 1):
                predicted_roi = m * (last_week + week) + b
                predictions.append({
                    'week': last_week + week,
                    'predicted_roi': predicted_roi,
                    'confidence': max(0.1, 0.9 - (week * 0.05))  # Decreasing confidence over time
                })
            
            return {
                'strategy_id': strategy_id,
                'current_roi': roi_values[-1] if roi_values else 0,
                'trend_slope': m,
                'projection_weeks': projection_weeks,
                'predictions': predictions,
                'trend_direction': 'increasing' if m > 0.5 else 'decreasing' if m < -0.5 else 'stable',
                'confidence_level': 0.7 if len(time_series) > 6 else 0.5
            }
            
        except Exception as e:
            self.logger.error(f"Error predicting future ROI: {str(e)}")
            return {'error': str(e)}
    
    # Additional methods for integration with AI Orchestrator
    
    async def get_roi_insights(self, user_id: str) -> Dict:
        """Get ROI insights for AI dashboard integration"""
        try:
            # Get all strategy outcomes for user
            strategy_outcomes = self.db.query(StrategyOutcome).filter(
                StrategyOutcome.user_id == user_id
            ).all()
            
            if not strategy_outcomes:
                return {'message': 'No ROI tracking data available'}
            
            # Calculate summary insights
            total_strategies = len(strategy_outcomes)
            completed_strategies = len([s for s in strategy_outcomes if s.completion_date])
            active_strategies = len([s for s in strategy_outcomes if s.implementation_status == 'active'])
            
            # Calculate average ROI
            roi_values = [s.roi_percentage for s in strategy_outcomes if s.roi_percentage is not None]
            avg_roi = sum(roi_values) / len(roi_values) if roi_values else 0
            
            # Find best performing strategy
            best_strategy = max(strategy_outcomes, key=lambda s: s.roi_percentage or 0) if strategy_outcomes else None
            
            return {
                'total_strategies_tracked': total_strategies,
                'active_strategies': active_strategies,
                'completed_strategies': completed_strategies,
                'average_roi': avg_roi,
                'best_performing_strategy': {
                    'title': best_strategy.strategy_title,
                    'roi': best_strategy.roi_percentage,
                    'type': best_strategy.strategy_type
                } if best_strategy and best_strategy.roi_percentage else None,
                'roi_trend': 'positive' if avg_roi > 0 else 'neutral'
            }
            
        except Exception as e:
            self.logger.error(f"Error getting ROI insights: {str(e)}")
            return {}
    
    async def track_strategy_implementation(self, user_id: str, strategy: Dict) -> str:
        """Track new strategy implementation"""
        try:
            strategy_id = str(uuid4())
            
            # Create strategy outcome record
            strategy_outcome = StrategyOutcome(
                user_id=user_id,
                strategy_id=strategy_id,
                strategy_title=strategy.get('title', 'AI Generated Strategy'),
                strategy_description=strategy.get('description', ''),
                strategy_type=strategy.get('type', 'general'),
                implementation_status='active',
                implementation_date=datetime.now()
            )
            
            self.db.add(strategy_outcome)
            self.db.commit()
            
            # Capture baseline metrics
            await self.capture_baseline_metrics(user_id, strategy_id)
            
            return strategy_id
            
        except Exception as e:
            self.logger.error(f"Error tracking strategy implementation: {str(e)}")
            return ""
    
    async def calculate_strategy_roi(self, user_id: str, strategy_id: str) -> Optional['StrategyOutcome']:
        """Calculate and return strategy ROI"""
        try:
            strategy_outcome = self.db.query(StrategyOutcome).filter(
                and_(
                    StrategyOutcome.user_id == user_id,
                    StrategyOutcome.strategy_id == strategy_id
                )
            ).first()
            
            if strategy_outcome and strategy_outcome.baseline_metrics:
                roi_result = await self.calculate_current_roi(user_id, strategy_id)
                
                if 'error' not in roi_result:
                    strategy_outcome.roi_percentage = roi_result.get('overall_roi', 0)
                    self.db.commit()
            
            return strategy_outcome
            
        except Exception as e:
            self.logger.error(f"Error calculating strategy ROI: {str(e)}")
            return None
    
    # Private helper methods
    
    def _analyze_roi_trend(self, time_series: List[Dict]) -> Dict:
        """Analyze ROI trend from time series data"""
        if len(time_series) < 2:
            return {'trend': 'insufficient_data'}
        
        roi_values = [point['roi_percentage'] for point in time_series]
        
        # Calculate overall trend
        first_half = roi_values[:len(roi_values)//2]
        second_half = roi_values[len(roi_values)//2:]
        
        first_avg = sum(first_half) / len(first_half) if first_half else 0
        second_avg = sum(second_half) / len(second_half) if second_half else 0
        
        if second_avg > first_avg + 5:
            trend = 'improving'
        elif second_avg < first_avg - 5:
            trend = 'declining'
        else:
            trend = 'stable'
        
        # Calculate volatility
        if len(roi_values) > 1:
            mean_roi = sum(roi_values) / len(roi_values)
            variance = sum((x - mean_roi) ** 2 for x in roi_values) / len(roi_values)
            volatility = variance ** 0.5
        else:
            volatility = 0
        
        return {
            'trend': trend,
            'trend_strength': abs(second_avg - first_avg),
            'volatility': volatility,
            'current_roi': roi_values[-1],
            'peak_roi': max(roi_values),
            'min_roi': min(roi_values)
        }
    
    def _generate_roi_summary(self, strategy_reports: List[Dict], avg_roi: float) -> str:
        """Generate summary text for ROI report"""
        if not strategy_reports:
            return "No strategy ROI data available."
        
        positive_strategies = len([s for s in strategy_reports if s['roi_percentage'] > 0])
        total_strategies = len(strategy_reports)
        
        summary = f"Portfolio Performance: {positive_strategies}/{total_strategies} strategies showing positive ROI. "
        summary += f"Average ROI: {avg_roi:.1f}%. "
        
        if avg_roi > 20:
            summary += "Excellent overall performance with strong returns."
        elif avg_roi > 10:
            summary += "Good performance with solid returns across strategies."
        elif avg_roi > 0:
            summary += "Positive performance with room for optimization."
        else:
            summary += "Performance below expectations - strategy review recommended."
        
        return summary