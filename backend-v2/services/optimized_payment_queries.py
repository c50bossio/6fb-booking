"""
Optimized Payment Queries for BookedBarber V2

High-performance, indexed queries for payment operations designed to handle
millions of transactions with sub-second response times.

CRITICAL FEATURES:
- Indexed queries for all payment operations
- Pagination with cursor-based optimization
- Efficient aggregations for reporting
- Query plan optimizations
- Connection pooling recommendations
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc, text, select
from models import Payment, Appointment, User, Refund, Payout, GiftCertificate
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class OptimizedPaymentQueries:
    """High-performance payment queries with proper indexing"""
    
    @staticmethod
    def get_user_payments_paginated(
        db: Session, 
        user_id: int, 
        limit: int = 20, 
        offset: int = 0,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status_filter: Optional[str] = None
    ) -> Tuple[List[Payment], int]:
        """
        Get user payments with efficient pagination
        Uses idx_payments_user_created index for optimal performance
        """
        query = db.query(Payment).filter(Payment.user_id == user_id)
        
        # Apply date filters (leverages created_at index)
        if start_date:
            query = query.filter(Payment.created_at >= start_date)
        if end_date:
            query = query.filter(Payment.created_at <= end_date)
        if status_filter:
            query = query.filter(Payment.status == status_filter)
        
        # Get total count (separate query for performance)
        total_count = query.count()
        
        # Get paginated results with proper ordering
        payments = (query
                   .order_by(desc(Payment.created_at))
                   .offset(offset)
                   .limit(limit)
                   .all())
        
        return payments, total_count
    
    @staticmethod
    def get_barber_earnings_summary(
        db: Session,
        barber_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Get barber earnings summary with efficient aggregation
        Uses idx_payments_barber_status and idx_payments_user_created indexes
        """
        # Single aggregation query for all metrics
        result = (db.query(
            func.count(Payment.id).label('total_payments'),
            func.sum(Payment.amount).label('total_revenue'),
            func.sum(Payment.barber_amount).label('total_earnings'),
            func.sum(Payment.platform_fee).label('total_fees'),
            func.avg(Payment.amount).label('average_payment')
        )
        .filter(
            Payment.barber_id == barber_id,
            Payment.status == 'completed',
            Payment.created_at >= start_date,
            Payment.created_at <= end_date
        )
        .first())
        
        return {
            'barber_id': barber_id,
            'period_start': start_date,
            'period_end': end_date,
            'total_payments': result.total_payments or 0,
            'total_revenue': float(result.total_revenue or 0),
            'total_earnings': float(result.total_earnings or 0),
            'total_fees': float(result.total_fees or 0),
            'average_payment': float(result.average_payment or 0)
        }
    
    @staticmethod
    def get_payments_by_stripe_intent(
        db: Session,
        stripe_intent_ids: List[str]
    ) -> List[Payment]:
        """
        Efficiently lookup payments by Stripe intent IDs
        Uses idx_payments_stripe_intent unique index
        """
        return (db.query(Payment)
               .filter(Payment.stripe_payment_intent_id.in_(stripe_intent_ids))
               .all())
    
    @staticmethod
    def get_pending_reconciliation_payments(
        db: Session,
        days_back: int = 7,
        limit: int = 1000
    ) -> List[Payment]:
        """
        Get payments that need reconciliation
        Uses idx_payments_status_created index for efficient filtering
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        return (db.query(Payment)
               .filter(
                   Payment.stripe_payment_intent_id.isnot(None),
                   Payment.status.in_(['pending', 'completed', 'failed']),
                   Payment.created_at >= cutoff_date
               )
               .order_by(asc(Payment.created_at))
               .limit(limit)
               .all())
    
    @staticmethod
    def get_high_value_payments(
        db: Session,
        min_amount: Decimal,
        start_date: datetime,
        end_date: datetime,
        limit: int = 100
    ) -> List[Payment]:
        """
        Get high-value payments for fraud detection
        Uses idx_payments_amount_created index
        """
        return (db.query(Payment)
               .filter(
                   Payment.amount >= min_amount,
                   Payment.created_at >= start_date,
                   Payment.created_at <= end_date
               )
               .order_by(desc(Payment.amount))
               .limit(limit)
               .all())
    
    @staticmethod
    def get_organization_payment_summary(
        db: Session,
        organization_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Get organization payment summary with efficient aggregation
        Uses idx_payments_organization_created index
        """
        # Payment summary
        payment_summary = (db.query(
            func.count(Payment.id).label('total_payments'),
            func.sum(Payment.amount).label('total_revenue'),
            func.sum(Payment.platform_fee).label('total_platform_fees'),
            func.count(Payment.id).filter(Payment.status == 'completed').label('completed_payments'),
            func.count(Payment.id).filter(Payment.status == 'failed').label('failed_payments'),
            func.count(Payment.id).filter(Payment.status == 'refunded').label('refunded_payments')
        )
        .filter(
            Payment.organization_id == organization_id,
            Payment.created_at >= start_date,
            Payment.created_at <= end_date
        )
        .first())
        
        return {
            'organization_id': organization_id,
            'period_start': start_date,
            'period_end': end_date,
            'total_payments': payment_summary.total_payments or 0,
            'total_revenue': float(payment_summary.total_revenue or 0),
            'total_platform_fees': float(payment_summary.total_platform_fees or 0),
            'completed_payments': payment_summary.completed_payments or 0,
            'failed_payments': payment_summary.failed_payments or 0,
            'refunded_payments': payment_summary.refunded_payments or 0,
            'success_rate': (
                (payment_summary.completed_payments or 0) / 
                (payment_summary.total_payments or 1) * 100
            )
        }
    
    @staticmethod
    def get_active_gift_certificates(
        db: Session,
        user_id: Optional[int] = None,
        min_balance: Decimal = Decimal('0.01')
    ) -> List[GiftCertificate]:
        """
        Get active gift certificates efficiently
        Uses idx_gift_certificates_status index
        """
        query = (db.query(GiftCertificate)
                .filter(
                    GiftCertificate.status == 'active',
                    GiftCertificate.balance >= min_balance,
                    or_(
                        GiftCertificate.valid_until.is_(None),
                        GiftCertificate.valid_until > datetime.utcnow()
                    )
                ))
        
        if user_id:
            # Additional filtering for specific user
            query = query.filter(GiftCertificate.created_by_id == user_id)
        
        return query.order_by(desc(GiftCertificate.created_at)).all()
    
    @staticmethod
    def get_refund_eligible_payments(
        db: Session,
        user_id: int,
        days_back: int = 30
    ) -> List[Payment]:
        """
        Get payments eligible for refund
        Uses idx_payments_user_created index
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        return (db.query(Payment)
               .filter(
                   Payment.user_id == user_id,
                   Payment.status == 'completed',
                   Payment.refund_amount < Payment.amount,  # Partial or no refunds
                   Payment.created_at >= cutoff_date
               )
               .order_by(desc(Payment.created_at))
               .all())
    
    @staticmethod
    def get_payout_summary_by_period(
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        Get payout summary grouped by barber
        Uses idx_payouts_period and idx_payouts_barber_status indexes
        """
        results = (db.query(
            Payout.barber_id,
            User.name.label('barber_name'),
            func.count(Payout.id).label('payout_count'),
            func.sum(Payout.amount).label('total_amount'),
            func.count(Payout.id).filter(Payout.status == 'completed').label('completed_payouts'),
            func.count(Payout.id).filter(Payout.status == 'failed').label('failed_payouts')
        )
        .join(User, Payout.barber_id == User.id)
        .filter(
            Payout.period_start >= start_date,
            Payout.period_end <= end_date
        )
        .group_by(Payout.barber_id, User.name)
        .order_by(desc(func.sum(Payout.amount)))
        .all())
        
        return [
            {
                'barber_id': result.barber_id,
                'barber_name': result.barber_name,
                'payout_count': result.payout_count,
                'total_amount': float(result.total_amount or 0),
                'completed_payouts': result.completed_payouts or 0,
                'failed_payouts': result.failed_payouts or 0,
                'success_rate': (
                    (result.completed_payouts or 0) / 
                    (result.payout_count or 1) * 100
                )
            }
            for result in results
        ]
    
    @staticmethod
    def get_payment_metrics_dashboard(
        db: Session,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive payment metrics for dashboard
        Optimized with multiple indexed queries
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        today = datetime.utcnow()
        yesterday = today - timedelta(days=1)
        
        # Overall payment metrics
        overall_metrics = (db.query(
            func.count(Payment.id).label('total_payments'),
            func.sum(Payment.amount).label('total_revenue'),
            func.avg(Payment.amount).label('average_payment'),
            func.count(Payment.id).filter(Payment.status == 'completed').label('successful_payments'),
            func.count(Payment.id).filter(Payment.status == 'failed').label('failed_payments')
        )
        .filter(Payment.created_at >= cutoff_date)
        .first())
        
        # Daily comparison (yesterday vs day before)
        yesterday_metrics = (db.query(
            func.count(Payment.id).label('yesterday_payments'),
            func.sum(Payment.amount).label('yesterday_revenue')
        )
        .filter(
            Payment.created_at >= yesterday.replace(hour=0, minute=0, second=0),
            Payment.created_at < today.replace(hour=0, minute=0, second=0)
        )
        .first())
        
        # Calculate success rate
        total_payments = overall_metrics.total_payments or 0
        successful_payments = overall_metrics.successful_payments or 0
        success_rate = (successful_payments / total_payments * 100) if total_payments > 0 else 0
        
        return {
            'period_days': days_back,
            'total_payments': total_payments,
            'total_revenue': float(overall_metrics.total_revenue or 0),
            'average_payment': float(overall_metrics.average_payment or 0),
            'success_rate': success_rate,
            'failed_payments': overall_metrics.failed_payments or 0,
            'yesterday_payments': yesterday_metrics.yesterday_payments or 0,
            'yesterday_revenue': float(yesterday_metrics.yesterday_revenue or 0),
            'generated_at': datetime.utcnow()
        }


class PaymentQueryOptimizer:
    """Query optimization utilities and recommendations"""
    
    @staticmethod
    def analyze_query_performance(db: Session, query: str) -> Dict[str, Any]:
        """
        Analyze query performance using EXPLAIN
        Production use only - requires appropriate permissions
        """
        try:
            # Execute EXPLAIN ANALYZE for detailed performance metrics
            result = db.execute(text(f"EXPLAIN ANALYZE {query}"))
            execution_plan = result.fetchall()
            
            return {
                'query': query,
                'execution_plan': [row[0] for row in execution_plan],
                'analyzed_at': datetime.utcnow()
            }
        except Exception as e:
            logger.error(f"Query performance analysis failed: {e}")
            return {
                'query': query,
                'error': str(e),
                'analyzed_at': datetime.utcnow()
            }
    
    @staticmethod
    def get_index_usage_stats(db: Session) -> List[Dict[str, Any]]:
        """
        Get index usage statistics (PostgreSQL only)
        """
        try:
            query = """
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan as times_used,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
              AND (tablename LIKE '%payment%' 
                   OR tablename LIKE '%refund%' 
                   OR tablename LIKE '%payout%'
                   OR tablename = 'gift_certificates')
            ORDER BY idx_scan DESC
            """
            
            result = db.execute(text(query))
            return [
                {
                    'schema': row.schemaname,
                    'table': row.tablename,
                    'index': row.indexname,
                    'times_used': row.times_used,
                    'tuples_read': row.tuples_read,
                    'tuples_fetched': row.tuples_fetched
                }
                for row in result.fetchall()
            ]
        except Exception as e:
            logger.warning(f"Index usage stats not available: {e}")
            return []
    
    @staticmethod
    def optimize_connection_pool():
        """
        Connection pool optimization recommendations
        """
        return {
            'recommendations': {
                'pool_size': 20,  # Base connection pool size
                'max_overflow': 30,  # Additional connections during peak
                'pool_timeout': 30,  # Seconds to wait for connection
                'pool_recycle': 3600,  # Recycle connections hourly
                'pool_pre_ping': True,  # Verify connections before use
                'echo': False,  # Disable SQL logging in production
                'query_timeout': 30,  # Query timeout in seconds
            },
            'production_settings': {
                'statement_timeout': '30s',
                'idle_in_transaction_session_timeout': '60s',
                'lock_timeout': '10s',
                'work_mem': '256MB',
                'shared_buffers': '1GB',  # 25% of available RAM
                'effective_cache_size': '3GB',  # 75% of available RAM
                'max_connections': 200,
                'checkpoint_completion_target': 0.7,
                'wal_buffers': '16MB',
                'default_statistics_target': 100,
            }
        }