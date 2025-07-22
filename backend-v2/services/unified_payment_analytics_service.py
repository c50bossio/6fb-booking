"""
Unified Payment Analytics Service
Provides comprehensive analytics across both centralized and decentralized payment flows
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func, desc, case

from models import User, Appointment, Payment
from models.hybrid_payment import (
    PaymentProcessorConnection, ExternalTransaction, PlatformCollection,
    PaymentMode, ExternalPaymentProcessor, CollectionType, CollectionStatus
)
from services.payment_gateways.gateway_factory import GatewayFactory
from config import settings

logger = logging.getLogger(__name__)


class AnalyticsPeriod(str, Enum):
    """Analytics time periods"""
    LAST_7_DAYS = "7_days"
    LAST_30_DAYS = "30_days"
    LAST_90_DAYS = "90_days"
    LAST_6_MONTHS = "6_months"
    LAST_YEAR = "1_year"
    ALL_TIME = "all_time"


class PaymentAnalyticsMetric(str, Enum):
    """Types of payment analytics metrics"""
    REVENUE = "revenue"
    TRANSACTIONS = "transactions"
    SUCCESS_RATE = "success_rate"
    COMMISSION = "commission"
    NET_EARNINGS = "net_earnings"
    AVERAGE_TRANSACTION = "average_transaction"


class UnifiedPaymentAnalyticsService:
    """
    Service for generating comprehensive analytics across all payment flows.
    
    Combines data from:
    - Centralized payments (BookedBarber platform)
    - Decentralized payments (external processors)
    - Commission collections
    - Six Figure Barber methodology metrics
    """
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.gateway_factory = GatewayFactory()
    
    def get_unified_analytics(
        self,
        barber_id: int,
        period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS,
        include_projections: bool = True
    ) -> Dict[str, Any]:
        """
        Generate comprehensive analytics for a barber across all payment modes.
        
        Args:
            barber_id: ID of the barber
            period: Time period for analytics
            include_projections: Whether to include Six Figure Barber projections
            
        Returns:
            Dict containing unified analytics data
        """
        
        try:
            logger.info(f"Generating unified analytics for barber {barber_id}, period: {period.value}")
            
            # Get date range for the period
            start_date, end_date = self._get_date_range(period)
            
            # Get centralized payment analytics
            centralized_analytics = self._get_centralized_analytics(barber_id, start_date, end_date)
            
            # Get decentralized payment analytics
            decentralized_analytics = self._get_decentralized_analytics(barber_id, start_date, end_date)
            
            # Get commission analytics
            commission_analytics = self._get_commission_analytics(barber_id, start_date, end_date)
            
            # Calculate combined metrics
            combined_metrics = self._calculate_combined_metrics(
                centralized_analytics, decentralized_analytics, commission_analytics
            )
            
            # Get trend analysis
            trend_analysis = self._get_trend_analysis(barber_id, period)
            
            # Get mode comparison
            mode_comparison = self._get_payment_mode_comparison(
                centralized_analytics, decentralized_analytics
            )
            
            # Six Figure Barber insights
            six_figure_insights = None
            if include_projections:
                six_figure_insights = self._get_six_figure_insights(
                    barber_id, combined_metrics, period
                )
            
            # Compile unified response
            unified_analytics = {
                'period': period.value,
                'date_range': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'centralized_payments': centralized_analytics,
                'decentralized_payments': decentralized_analytics,
                'commission_data': commission_analytics,
                'combined_metrics': combined_metrics,
                'trend_analysis': trend_analysis,
                'mode_comparison': mode_comparison,
                'six_figure_insights': six_figure_insights,
                'recommendations': self._generate_recommendations(
                    combined_metrics, mode_comparison, six_figure_insights
                ),
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Successfully generated unified analytics for barber {barber_id}")
            return unified_analytics
            
        except Exception as e:
            logger.error(f"Failed to generate unified analytics for barber {barber_id}: {str(e)}")
            raise
    
    def get_real_time_dashboard_data(self, barber_id: int) -> Dict[str, Any]:
        """
        Get real-time dashboard data for immediate display.
        
        Args:
            barber_id: ID of the barber
            
        Returns:
            Dict containing real-time metrics
        """
        
        try:
            # Get today's date range
            today = datetime.now(timezone.utc).date()
            start_of_today = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
            end_of_today = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
            
            # Get current month data
            start_of_month = start_of_today.replace(day=1)
            
            # Real-time metrics
            today_metrics = self._get_period_metrics(barber_id, start_of_today, end_of_today)
            month_metrics = self._get_period_metrics(barber_id, start_of_month, end_of_today)
            
            # Outstanding commission
            outstanding_commission = self._get_outstanding_commission(barber_id)
            
            # Next collection info
            next_collection = self._get_next_collection_info(barber_id)
            
            # Recent transactions
            recent_transactions = self._get_recent_transactions(barber_id, limit=10)
            
            return {
                'today': today_metrics,
                'month_to_date': month_metrics,
                'outstanding_commission': outstanding_commission,
                'next_collection': next_collection,
                'recent_transactions': recent_transactions,
                'last_updated': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get real-time dashboard data for barber {barber_id}: {str(e)}")
            raise
    
    def get_revenue_optimization_insights(self, barber_id: int) -> Dict[str, Any]:
        """
        Generate revenue optimization insights based on payment mode performance.
        
        Args:
            barber_id: ID of the barber
            
        Returns:
            Dict containing optimization insights
        """
        
        try:
            # Get 90-day analytics for optimization analysis
            analytics = self.get_unified_analytics(
                barber_id, 
                AnalyticsPeriod.LAST_90_DAYS, 
                include_projections=True
            )
            
            # Calculate optimization opportunities
            current_mode = self._get_current_payment_mode(barber_id)
            optimal_mode = self._calculate_optimal_mode(analytics)
            
            # Calculate potential revenue increase
            potential_increase = self._calculate_potential_revenue_increase(analytics, optimal_mode)
            
            # Generate specific recommendations
            recommendations = self._generate_optimization_recommendations(
                current_mode, optimal_mode, analytics, potential_increase
            )
            
            # Calculate ROI for switching modes
            switching_roi = self._calculate_switching_roi(analytics, current_mode, optimal_mode)
            
            return {
                'current_mode': current_mode,
                'optimal_mode': optimal_mode,
                'potential_monthly_increase': potential_increase,
                'switching_roi': switching_roi,
                'recommendations': recommendations,
                'analysis_period': '90_days',
                'confidence_score': self._calculate_confidence_score(analytics),
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate optimization insights for barber {barber_id}: {str(e)}")
            raise
    
    # Private helper methods
    
    def _get_date_range(self, period: AnalyticsPeriod) -> Tuple[datetime, datetime]:
        """Get start and end dates for the specified period."""
        
        end_date = datetime.now(timezone.utc)
        
        if period == AnalyticsPeriod.LAST_7_DAYS:
            start_date = end_date - timedelta(days=7)
        elif period == AnalyticsPeriod.LAST_30_DAYS:
            start_date = end_date - timedelta(days=30)
        elif period == AnalyticsPeriod.LAST_90_DAYS:
            start_date = end_date - timedelta(days=90)
        elif period == AnalyticsPeriod.LAST_6_MONTHS:
            start_date = end_date - timedelta(days=180)
        elif period == AnalyticsPeriod.LAST_YEAR:
            start_date = end_date - timedelta(days=365)
        else:  # ALL_TIME
            start_date = datetime(2020, 1, 1, tzinfo=timezone.utc)
        
        return start_date, end_date
    
    def _get_centralized_analytics(
        self, 
        barber_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get analytics for centralized payments (platform payments)."""
        
        # Query centralized payments
        query = self.db.execute(
            select(
                func.count(Payment.id).label('total_transactions'),
                func.coalesce(func.sum(Payment.amount), 0).label('total_volume'),
                func.avg(Payment.amount).label('average_transaction'),
                func.count(case((Payment.status == 'completed', 1))).label('successful_transactions')
            ).select_from(Payment)
            .join(Appointment, Payment.appointment_id == Appointment.id)
            .where(
                and_(
                    Appointment.barber_id == barber_id,
                    Payment.created_at >= start_date,
                    Payment.created_at <= end_date
                )
            )
        )
        
        result = query.first()
        
        if result and result.total_transactions > 0:
            success_rate = (result.successful_transactions / result.total_transactions) * 100
            commission_paid = float(result.total_volume) * 0.15  # 15% platform commission
            net_earnings = float(result.total_volume) - commission_paid
        else:
            success_rate = 0.0
            commission_paid = 0.0
            net_earnings = 0.0
        
        return {
            'total_transactions': result.total_transactions if result else 0,
            'total_volume': float(result.total_volume) if result else 0.0,
            'average_transaction': float(result.average_transaction) if result and result.average_transaction else 0.0,
            'success_rate': success_rate,
            'commission_paid': commission_paid,
            'net_earnings': net_earnings
        }
    
    def _get_decentralized_analytics(
        self, 
        barber_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get analytics for decentralized payments (external processors)."""
        
        # Query external transactions
        query = self.db.execute(
            select(
                func.count(ExternalTransaction.id).label('total_transactions'),
                func.coalesce(func.sum(ExternalTransaction.amount), 0).label('total_volume'),
                func.avg(ExternalTransaction.amount).label('average_transaction'),
                func.count(case((ExternalTransaction.status.in_(['succeeded', 'completed']), 1))).label('successful_transactions'),
                func.coalesce(func.sum(ExternalTransaction.commission_amount), 0).label('total_commission')
            ).select_from(ExternalTransaction)
            .join(PaymentProcessorConnection, ExternalTransaction.connection_id == PaymentProcessorConnection.id)
            .where(
                and_(
                    PaymentProcessorConnection.barber_id == barber_id,
                    ExternalTransaction.processed_at >= start_date,
                    ExternalTransaction.processed_at <= end_date
                )
            )
        )
        
        result = query.first()
        
        if result and result.total_transactions > 0:
            success_rate = (result.successful_transactions / result.total_transactions) * 100
            commission_owed = float(result.total_commission)
            net_earnings = float(result.total_volume) - commission_owed
        else:
            success_rate = 0.0
            commission_owed = 0.0
            net_earnings = 0.0
        
        return {
            'total_transactions': result.total_transactions if result else 0,
            'total_volume': float(result.total_volume) if result else 0.0,
            'average_transaction': float(result.average_transaction) if result and result.average_transaction else 0.0,
            'success_rate': success_rate,
            'commission_owed': commission_owed,
            'net_earnings': net_earnings
        }
    
    def _get_commission_analytics(
        self, 
        barber_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get analytics for commission collections."""
        
        # Query platform collections
        query = self.db.execute(
            select(
                func.count(PlatformCollection.id).label('total_collections'),
                func.coalesce(func.sum(PlatformCollection.amount), 0).label('total_collected'),
                func.count(case((PlatformCollection.status == CollectionStatus.COLLECTED, 1))).label('successful_collections'),
                func.coalesce(func.sum(case((PlatformCollection.status == CollectionStatus.COLLECTED, PlatformCollection.amount), else_=0)), 0).label('amount_collected')
            ).select_from(PlatformCollection)
            .where(
                and_(
                    PlatformCollection.barber_id == barber_id,
                    PlatformCollection.created_at >= start_date,
                    PlatformCollection.created_at <= end_date
                )
            )
        )
        
        result = query.first()
        
        if result and result.total_collections > 0:
            collection_success_rate = (result.successful_collections / result.total_collections) * 100
        else:
            collection_success_rate = 0.0
        
        return {
            'total_collections': result.total_collections if result else 0,
            'total_amount': float(result.total_collected) if result else 0.0,
            'amount_collected': float(result.amount_collected) if result else 0.0,
            'success_rate': collection_success_rate,
            'outstanding_amount': float(result.total_collected) - float(result.amount_collected) if result else 0.0
        }
    
    def _calculate_combined_metrics(
        self, 
        centralized: Dict[str, Any], 
        decentralized: Dict[str, Any], 
        commission: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate combined metrics across all payment flows."""
        
        total_transactions = centralized['total_transactions'] + decentralized['total_transactions']
        total_volume = centralized['total_volume'] + decentralized['total_volume']
        total_net_earnings = centralized['net_earnings'] + decentralized['net_earnings']
        
        # Calculate weighted success rate
        if total_transactions > 0:
            weighted_success_rate = (
                (centralized['success_rate'] * centralized['total_transactions']) +
                (decentralized['success_rate'] * decentralized['total_transactions'])
            ) / total_transactions
            average_transaction = total_volume / total_transactions
        else:
            weighted_success_rate = 0.0
            average_transaction = 0.0
        
        return {
            'total_transactions': total_transactions,
            'total_volume': total_volume,
            'total_net_earnings': total_net_earnings,
            'weighted_success_rate': weighted_success_rate,
            'average_transaction': average_transaction,
            'total_commission_activity': commission['total_amount'],
            'commission_collection_rate': commission['success_rate']
        }
    
    def _get_trend_analysis(self, barber_id: int, period: AnalyticsPeriod) -> Dict[str, Any]:
        """Get trend analysis comparing current period to previous period."""
        
        # Get current period data
        current_start, current_end = self._get_date_range(period)
        current_metrics = self._get_period_metrics(barber_id, current_start, current_end)
        
        # Get previous period data
        period_duration = current_end - current_start
        previous_start = current_start - period_duration
        previous_end = current_start
        previous_metrics = self._get_period_metrics(barber_id, previous_start, previous_end)
        
        # Calculate trends
        trends = {}
        for metric in ['total_volume', 'total_transactions', 'net_earnings']:
            current_value = current_metrics.get(metric, 0)
            previous_value = previous_metrics.get(metric, 0)
            
            if previous_value > 0:
                trend_percentage = ((current_value - previous_value) / previous_value) * 100
            else:
                trend_percentage = 100.0 if current_value > 0 else 0.0
            
            trends[f'{metric}_trend'] = trend_percentage
        
        return trends
    
    def _get_payment_mode_comparison(
        self, 
        centralized: Dict[str, Any], 
        decentralized: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compare performance between payment modes."""
        
        # Calculate efficiency metrics
        centralized_efficiency = centralized['net_earnings'] / max(centralized['total_volume'], 1)
        decentralized_efficiency = decentralized['net_earnings'] / max(decentralized['total_volume'], 1)
        
        # Determine optimal mode based on volume and efficiency
        if centralized['total_volume'] + decentralized['total_volume'] == 0:
            optimal_mode = 'centralized'  # Default for new users
        elif decentralized_efficiency > centralized_efficiency:
            optimal_mode = 'decentralized'
        else:
            optimal_mode = 'centralized'
        
        return {
            'centralized_efficiency': centralized_efficiency,
            'decentralized_efficiency': decentralized_efficiency,
            'optimal_mode': optimal_mode,
            'volume_distribution': {
                'centralized_percentage': (centralized['total_volume'] / max(centralized['total_volume'] + decentralized['total_volume'], 1)) * 100,
                'decentralized_percentage': (decentralized['total_volume'] / max(centralized['total_volume'] + decentralized['total_volume'], 1)) * 100
            }
        }
    
    def _get_six_figure_insights(
        self, 
        barber_id: int, 
        combined_metrics: Dict[str, Any], 
        period: AnalyticsPeriod
    ) -> Dict[str, Any]:
        """Generate Six Figure Barber methodology insights."""
        
        # Six Figure Barber target: $100,000 annual revenue
        target_annual_revenue = 100000.0
        target_monthly_revenue = target_annual_revenue / 12
        
        # Get current monthly rate based on period
        if period == AnalyticsPeriod.LAST_30_DAYS:
            current_monthly_revenue = combined_metrics['total_net_earnings']
        elif period == AnalyticsPeriod.LAST_90_DAYS:
            current_monthly_revenue = combined_metrics['total_net_earnings'] / 3
        else:
            # Estimate based on 30-day average
            current_monthly_revenue = combined_metrics['total_net_earnings'] * (30 / self._get_period_days(period))
        
        # Calculate progress
        progress_percentage = min((current_monthly_revenue / target_monthly_revenue) * 100, 100)
        projected_annual = current_monthly_revenue * 12
        
        # Generate recommendations
        recommendations = []
        if progress_percentage < 50:
            recommendations.append("Focus on increasing service prices and client retention")
            recommendations.append("Consider adding premium services to increase average transaction value")
        elif progress_percentage < 80:
            recommendations.append("Optimize your payment mode to maximize earnings")
            recommendations.append("Focus on consistent monthly growth")
        else:
            recommendations.append("You're on track! Maintain consistency and consider expansion")
        
        return {
            'target_annual_revenue': target_annual_revenue,
            'target_monthly_revenue': target_monthly_revenue,
            'current_monthly_revenue': current_monthly_revenue,
            'progress_percentage': progress_percentage,
            'projected_annual': projected_annual,
            'recommendations': recommendations,
            'months_to_goal': max(1, (target_annual_revenue - projected_annual) / max(current_monthly_revenue, 1)) if projected_annual < target_annual_revenue else 0
        }
    
    def _generate_recommendations(
        self, 
        combined_metrics: Dict[str, Any], 
        mode_comparison: Dict[str, Any], 
        six_figure_insights: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Generate actionable recommendations based on analytics."""
        
        recommendations = []
        
        # Payment mode recommendations
        if mode_comparison['optimal_mode'] != self._get_current_payment_mode_from_comparison(mode_comparison):
            recommendations.append(f"Consider switching to {mode_comparison['optimal_mode']} payment mode for better earnings")
        
        # Transaction volume recommendations
        if combined_metrics['total_transactions'] < 10:
            recommendations.append("Focus on increasing your booking volume to build consistent revenue")
        
        # Average transaction recommendations
        if combined_metrics['average_transaction'] < 50:
            recommendations.append("Consider raising your service prices to align with Six Figure Barber methodology")
        
        # Success rate recommendations
        if combined_metrics['weighted_success_rate'] < 95:
            recommendations.append("Review payment processing issues to improve success rate")
        
        # Six Figure Barber specific recommendations
        if six_figure_insights and six_figure_insights['progress_percentage'] < 75:
            recommendations.extend(six_figure_insights['recommendations'])
        
        return recommendations[:5]  # Limit to top 5 recommendations
    
    def _get_period_metrics(
        self, 
        barber_id: int, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get basic metrics for a specific period."""
        
        centralized = self._get_centralized_analytics(barber_id, start_date, end_date)
        decentralized = self._get_decentralized_analytics(barber_id, start_date, end_date)
        commission = self._get_commission_analytics(barber_id, start_date, end_date)
        
        return self._calculate_combined_metrics(centralized, decentralized, commission)
    
    def _get_outstanding_commission(self, barber_id: int) -> Dict[str, Any]:
        """Get outstanding commission information."""
        
        # Query unpaid commission from external transactions
        query = self.db.execute(
            select(
                func.coalesce(func.sum(ExternalTransaction.commission_amount), 0).label('total_commission')
            ).select_from(ExternalTransaction)
            .join(PaymentProcessorConnection, ExternalTransaction.connection_id == PaymentProcessorConnection.id)
            .where(
                and_(
                    PaymentProcessorConnection.barber_id == barber_id,
                    ExternalTransaction.commission_collected == False,
                    ExternalTransaction.status.in_(['succeeded', 'completed'])
                )
            )
        )
        
        result = query.first()
        outstanding_amount = float(result.total_commission) if result else 0.0
        
        return {
            'amount': outstanding_amount,
            'eligible_for_collection': outstanding_amount >= 50.0,  # $50 minimum threshold
            'threshold': 50.0
        }
    
    def _get_next_collection_info(self, barber_id: int) -> Optional[Dict[str, Any]]:
        """Get information about the next scheduled collection."""
        
        # Query next pending collection
        query = self.db.execute(
            select(PlatformCollection)
            .where(
                and_(
                    PlatformCollection.barber_id == barber_id,
                    PlatformCollection.status.in_([CollectionStatus.PENDING, CollectionStatus.SCHEDULED])
                )
            )
            .order_by(PlatformCollection.scheduled_date.asc())
            .limit(1)
        )
        
        collection = query.scalar_one_or_none()
        
        if collection:
            return {
                'id': collection.id,
                'amount': float(collection.amount),
                'scheduled_date': collection.scheduled_date.isoformat(),
                'type': collection.collection_type.value,
                'description': collection.description
            }
        
        return None
    
    def _get_recent_transactions(self, barber_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent transactions across all payment modes."""
        
        transactions = []
        
        # Get recent centralized payments
        centralized_query = self.db.execute(
            select(Payment, Appointment)
            .join(Appointment, Payment.appointment_id == Appointment.id)
            .where(Appointment.barber_id == barber_id)
            .order_by(Payment.created_at.desc())
            .limit(limit // 2)
        )
        
        for payment, appointment in centralized_query:
            transactions.append({
                'id': f'central_{payment.id}',
                'type': 'centralized',
                'amount': float(payment.amount),
                'status': payment.status,
                'created_at': payment.created_at.isoformat(),
                'description': f'Appointment payment - {appointment.service_name if hasattr(appointment, "service_name") else "Service"}'
            })
        
        # Get recent external transactions
        external_query = self.db.execute(
            select(ExternalTransaction, PaymentProcessorConnection)
            .join(PaymentProcessorConnection, ExternalTransaction.connection_id == PaymentProcessorConnection.id)
            .where(PaymentProcessorConnection.barber_id == barber_id)
            .order_by(ExternalTransaction.processed_at.desc())
            .limit(limit // 2)
        )
        
        for transaction, connection in external_query:
            transactions.append({
                'id': f'external_{transaction.id}',
                'type': 'decentralized',
                'processor': connection.processor_type.value,
                'amount': float(transaction.amount),
                'status': transaction.status,
                'created_at': transaction.processed_at.isoformat(),
                'description': f'{connection.processor_type.value.title()} payment'
            })
        
        # Sort by date and return limited results
        transactions.sort(key=lambda x: x['created_at'], reverse=True)
        return transactions[:limit]
    
    def _get_current_payment_mode(self, barber_id: int) -> str:
        """Get the current payment mode for a barber."""
        
        user = self.db.execute(
            select(User).where(User.id == barber_id)
        ).scalar_one_or_none()
        
        if user and hasattr(user, 'payment_mode') and user.payment_mode:
            return user.payment_mode.value
        
        return PaymentMode.CENTRALIZED.value
    
    def _calculate_optimal_mode(self, analytics: Dict[str, Any]) -> str:
        """Calculate the optimal payment mode based on analytics data."""
        
        return analytics['mode_comparison']['optimal_mode']
    
    def _calculate_potential_revenue_increase(
        self, 
        analytics: Dict[str, Any], 
        optimal_mode: str
    ) -> float:
        """Calculate potential revenue increase by switching to optimal mode."""
        
        # Simplified calculation - in reality this would be more complex
        current_efficiency = analytics['mode_comparison']['centralized_efficiency']
        optimal_efficiency = analytics['mode_comparison']['decentralized_efficiency'] if optimal_mode == 'decentralized' else current_efficiency
        
        current_revenue = analytics['combined_metrics']['total_net_earnings']
        potential_increase = current_revenue * (optimal_efficiency - current_efficiency)
        
        return max(0, potential_increase)
    
    def _generate_optimization_recommendations(
        self, 
        current_mode: str, 
        optimal_mode: str, 
        analytics: Dict[str, Any], 
        potential_increase: float
    ) -> List[str]:
        """Generate specific optimization recommendations."""
        
        recommendations = []
        
        if current_mode != optimal_mode:
            recommendations.append(f"Switch from {current_mode} to {optimal_mode} payment mode")
            
        if potential_increase > 100:
            recommendations.append(f"Potential monthly increase of ${potential_increase:.2f}")
            
        return recommendations
    
    def _calculate_switching_roi(
        self, 
        analytics: Dict[str, Any], 
        current_mode: str, 
        optimal_mode: str
    ) -> Dict[str, Any]:
        """Calculate ROI for switching payment modes."""
        
        # Simplified ROI calculation
        switching_cost = 0.0  # Assume no switching cost for now
        monthly_benefit = self._calculate_potential_revenue_increase(analytics, optimal_mode)
        
        if monthly_benefit > 0:
            payback_months = switching_cost / monthly_benefit if monthly_benefit > 0 else 0
            annual_roi = (monthly_benefit * 12 - switching_cost) / max(switching_cost, 1) * 100
        else:
            payback_months = float('inf')
            annual_roi = 0.0
        
        return {
            'switching_cost': switching_cost,
            'monthly_benefit': monthly_benefit,
            'payback_months': payback_months,
            'annual_roi_percentage': annual_roi
        }
    
    def _calculate_confidence_score(self, analytics: Dict[str, Any]) -> float:
        """Calculate confidence score for recommendations."""
        
        # Base confidence on transaction volume and consistency
        total_transactions = analytics['combined_metrics']['total_transactions']
        
        if total_transactions >= 100:
            return 0.95
        elif total_transactions >= 50:
            return 0.85
        elif total_transactions >= 20:
            return 0.75
        else:
            return 0.60
    
    def _get_period_days(self, period: AnalyticsPeriod) -> int:
        """Get number of days in the period."""
        
        period_days = {
            AnalyticsPeriod.LAST_7_DAYS: 7,
            AnalyticsPeriod.LAST_30_DAYS: 30,
            AnalyticsPeriod.LAST_90_DAYS: 90,
            AnalyticsPeriod.LAST_6_MONTHS: 180,
            AnalyticsPeriod.LAST_YEAR: 365,
            AnalyticsPeriod.ALL_TIME: 365 * 10  # Estimate
        }
        
        return period_days.get(period, 30)
    
    def _get_current_payment_mode_from_comparison(self, mode_comparison: Dict[str, Any]) -> str:
        """Infer current mode from comparison data."""
        
        # This is a simplified inference - in practice we'd query the user's actual mode
        centralized_pct = mode_comparison['volume_distribution']['centralized_percentage']
        
        if centralized_pct > 80:
            return 'centralized'
        elif centralized_pct < 20:
            return 'decentralized'
        else:
            return 'hybrid'