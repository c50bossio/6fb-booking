"""
Query Optimization Service for 6FB-Booking Platform
Addresses N+1 Query Patterns and Implements Efficient Data Loading
Target: Eliminate N+1 queries and improve query performance by 70%
"""

from typing import List, Dict, Any, Optional, Set, Tuple
from sqlalchemy.orm import Session, joinedload, selectinload, contains_eager
from sqlalchemy import text, func, and_, or_, distinct
from datetime import datetime, date, timedelta
import logging
import time
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum

import models

logger = logging.getLogger(__name__)

class QueryOptimizationLevel(Enum):
    """Query optimization levels"""
    BASIC = "basic"
    ADVANCED = "advanced"
    AGGRESSIVE = "aggressive"

@dataclass
class QueryPerformanceMetrics:
    """Query performance tracking"""
    query_type: str
    execution_time: float
    rows_returned: int
    queries_executed: int
    n_plus_one_detected: bool
    optimization_applied: str

class OptimizedQueryService:
    """Service for optimized database queries with N+1 prevention"""
    
    def __init__(self, db: Session, optimization_level: QueryOptimizationLevel = QueryOptimizationLevel.ADVANCED):
        self.db = db
        self.optimization_level = optimization_level
        self.query_metrics: List[QueryPerformanceMetrics] = []
        
    @contextmanager
    def query_performance_tracking(self, query_type: str):
        """Context manager for tracking query performance"""
        start_time = time.time()
        initial_query_count = self._get_query_count()
        
        try:
            yield
        finally:
            end_time = time.time()
            final_query_count = self._get_query_count()
            execution_time = end_time - start_time
            queries_executed = final_query_count - initial_query_count
            
            # Detect potential N+1 queries
            n_plus_one_detected = queries_executed > 3  # Simple heuristic
            
            metrics = QueryPerformanceMetrics(
                query_type=query_type,
                execution_time=execution_time,
                rows_returned=0,  # Would need to track separately
                queries_executed=queries_executed,
                n_plus_one_detected=n_plus_one_detected,
                optimization_applied=self.optimization_level.value
            )
            
            self.query_metrics.append(metrics)
            
            if n_plus_one_detected:
                logger.warning(f"Potential N+1 query detected in {query_type}: {queries_executed} queries in {execution_time:.3f}s")
    
    def _get_query_count(self) -> int:
        """Get current query count (simplified implementation)"""
        # In production, this would integrate with SQLAlchemy query tracking
        return len(self.db.get_bind().pool.checked_in())
    
    # =====================================================
    # OPTIMIZED USER & AUTHENTICATION QUERIES
    # =====================================================
    
    def get_user_with_relationships(self, user_id: int) -> Optional[models.User]:
        """Get user with all related data in single query - prevents N+1"""
        with self.query_performance_tracking("get_user_with_relationships"):
            return (
                self.db.query(models.User)
                .options(
                    joinedload(models.User.client_profile),
                    joinedload(models.User.appointments),
                    joinedload(models.User.services),
                    joinedload(models.User.barber_availability)
                )
                .filter(models.User.id == user_id, models.User.is_active == True)
                .first()
            )
    
    def get_active_users_by_role(self, role: str, location_id: Optional[int] = None) -> List[models.User]:
        """Get users by role with optimized loading"""
        with self.query_performance_tracking("get_active_users_by_role"):
            query = (
                self.db.query(models.User)
                .options(joinedload(models.User.client_profile))
                .filter(
                    models.User.unified_role == role,
                    models.User.is_active == True
                )
            )
            
            if location_id:
                query = query.filter(models.User.location_id == location_id)
                
            return query.all()
    
    def authenticate_user_optimized(self, email: str) -> Optional[models.User]:
        """Optimized user authentication with minimal queries"""
        with self.query_performance_tracking("authenticate_user_optimized"):
            return (
                self.db.query(models.User)
                .filter(
                    models.User.email == email,
                    models.User.is_active == True
                )
                .first()
            )
    
    # =====================================================
    # OPTIMIZED APPOINTMENT QUERIES (Core Business Logic)
    # =====================================================
    
    def get_appointments_with_details(
        self, 
        filters: Dict[str, Any],
        date_range: Optional[Tuple[date, date]] = None,
        limit: int = 50
    ) -> List[models.Appointment]:
        """Get appointments with all related data - prevents multiple queries"""
        with self.query_performance_tracking("get_appointments_with_details"):
            query = (
                self.db.query(models.Appointment)
                .options(
                    joinedload(models.Appointment.barber),
                    joinedload(models.Appointment.client),
                    joinedload(models.Appointment.service),
                    joinedload(models.Appointment.payments),
                    joinedload(models.Appointment.notifications)
                )
                .filter(models.Appointment.status != 'cancelled')
            )
            
            # Apply filters efficiently
            if 'barber_id' in filters:
                query = query.filter(models.Appointment.barber_id == filters['barber_id'])
            
            if 'client_id' in filters:
                query = query.filter(models.Appointment.client_id == filters['client_id'])
                
            if 'status' in filters:
                query = query.filter(models.Appointment.status == filters['status'])
                
            if 'location_id' in filters:
                query = query.join(models.User, models.Appointment.barber_id == models.User.id)
                query = query.filter(models.User.location_id == filters['location_id'])
            
            if date_range:
                start_date, end_date = date_range
                query = query.filter(
                    func.date(models.Appointment.start_time) >= start_date,
                    func.date(models.Appointment.start_time) <= end_date
                )
            
            return query.order_by(models.Appointment.start_time.desc()).limit(limit).all()
    
    def check_availability_optimized(
        self, 
        barber_id: int, 
        start_time: datetime, 
        end_time: datetime
    ) -> bool:
        """Optimized availability check with single query"""
        with self.query_performance_tracking("check_availability_optimized"):
            conflicting_appointments = (
                self.db.query(models.Appointment.id)
                .filter(
                    models.Appointment.barber_id == barber_id,
                    models.Appointment.status.in_(['confirmed', 'in_progress']),
                    or_(
                        and_(
                            models.Appointment.start_time <= start_time,
                            models.Appointment.end_time > start_time
                        ),
                        and_(
                            models.Appointment.start_time < end_time,
                            models.Appointment.end_time >= end_time
                        ),
                        and_(
                            models.Appointment.start_time >= start_time,
                            models.Appointment.end_time <= end_time
                        )
                    )
                )
                .first()
            )
            
            return conflicting_appointments is None
    
    def get_barber_schedule_optimized(
        self, 
        barber_id: int, 
        date_range: Tuple[date, date]
    ) -> Dict[str, Any]:
        """Get complete barber schedule with single query set"""
        with self.query_performance_tracking("get_barber_schedule_optimized"):
            start_date, end_date = date_range
            
            # Single query for appointments in range
            appointments = (
                self.db.query(models.Appointment)
                .options(
                    joinedload(models.Appointment.client),
                    joinedload(models.Appointment.service)
                )
                .filter(
                    models.Appointment.barber_id == barber_id,
                    func.date(models.Appointment.start_time) >= start_date,
                    func.date(models.Appointment.start_time) <= end_date,
                    models.Appointment.status != 'cancelled'
                )
                .order_by(models.Appointment.start_time)
                .all()
            )
            
            # Single query for availability rules
            availability = (
                self.db.query(models.BarberAvailability)
                .filter(
                    models.BarberAvailability.barber_id == barber_id,
                    models.BarberAvailability.date >= start_date,
                    models.BarberAvailability.date <= end_date
                )
                .all()
            )
            
            # Single query for time off
            time_off = (
                self.db.query(models.BarberTimeOff)
                .filter(
                    models.BarberTimeOff.barber_id == barber_id,
                    models.BarberTimeOff.start_date <= end_date,
                    models.BarberTimeOff.end_date >= start_date,
                    models.BarberTimeOff.is_approved == True
                )
                .all()
            )
            
            return {
                'appointments': appointments,
                'availability': availability,
                'time_off': time_off,
                'barber_id': barber_id,
                'date_range': date_range
            }
    
    # =====================================================
    # OPTIMIZED PAYMENT & FINANCIAL QUERIES
    # =====================================================
    
    def get_revenue_analytics_optimized(
        self, 
        location_id: Optional[int] = None,
        date_range: Optional[Tuple[date, date]] = None,
        barber_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Optimized revenue analytics with minimal queries"""
        with self.query_performance_tracking("get_revenue_analytics_optimized"):
            # Single aggregated query instead of multiple queries
            query = (
                self.db.query(
                    func.date_trunc('day', models.Payment.created_at).label('date'),
                    func.count(models.Payment.id).label('transaction_count'),
                    func.sum(models.Payment.amount).label('total_revenue'),
                    func.avg(models.Payment.amount).label('avg_transaction'),
                    models.Payment.service_id,
                    models.User.location_id,
                    models.Payment.user_id.label('barber_id')
                )
                .join(models.User, models.Payment.user_id == models.User.id)
                .filter(models.Payment.status == 'completed')
                .group_by(
                    func.date_trunc('day', models.Payment.created_at),
                    models.Payment.service_id,
                    models.User.location_id,
                    models.Payment.user_id
                )
            )
            
            if location_id:
                query = query.filter(models.User.location_id == location_id)
                
            if barber_id:
                query = query.filter(models.Payment.user_id == barber_id)
                
            if date_range:
                start_date, end_date = date_range
                query = query.filter(
                    func.date(models.Payment.created_at) >= start_date,
                    func.date(models.Payment.created_at) <= end_date
                )
            
            results = query.order_by(text('date DESC')).all()
            
            # Process results into structured format
            analytics = {
                'daily_revenue': [],
                'total_revenue': 0,
                'total_transactions': 0,
                'average_transaction': 0,
                'date_range': date_range
            }
            
            for row in results:
                analytics['daily_revenue'].append({
                    'date': row.date,
                    'revenue': float(row.total_revenue or 0),
                    'transactions': row.transaction_count,
                    'average': float(row.avg_transaction or 0),
                    'service_id': row.service_id,
                    'barber_id': row.barber_id
                })
                
                analytics['total_revenue'] += float(row.total_revenue or 0)
                analytics['total_transactions'] += row.transaction_count
            
            if analytics['total_transactions'] > 0:
                analytics['average_transaction'] = analytics['total_revenue'] / analytics['total_transactions']
            
            return analytics
    
    def get_payment_with_appointment_details(self, payment_id: int) -> Optional[models.Payment]:
        """Get payment with all related appointment details in single query"""
        with self.query_performance_tracking("get_payment_with_appointment_details"):
            return (
                self.db.query(models.Payment)
                .options(
                    joinedload(models.Payment.appointment).joinedload(models.Appointment.barber),
                    joinedload(models.Payment.appointment).joinedload(models.Appointment.client),
                    joinedload(models.Payment.appointment).joinedload(models.Appointment.service),
                    joinedload(models.Payment.user),
                    joinedload(models.Payment.refunds)
                )
                .filter(models.Payment.id == payment_id)
                .first()
            )
    
    # =====================================================
    # OPTIMIZED CLIENT & CUSTOMER QUERIES
    # =====================================================
    
    def get_client_history_optimized(
        self, 
        client_id: int, 
        limit: int = 20,
        include_cancelled: bool = False
    ) -> Dict[str, Any]:
        """Get complete client history with single query set"""
        with self.query_performance_tracking("get_client_history_optimized"):
            # Client basic info
            client = (
                self.db.query(models.Client)
                .options(joinedload(models.Client.loyalty_profile))
                .filter(models.Client.id == client_id)
                .first()
            )
            
            if not client:
                return {}
            
            # Appointment history with all related data
            appointment_query = (
                self.db.query(models.Appointment)
                .options(
                    joinedload(models.Appointment.barber),
                    joinedload(models.Appointment.service),
                    joinedload(models.Appointment.payments),
                    joinedload(models.Appointment.reviews)
                )
                .filter(models.Appointment.client_id == client_id)
                .order_by(models.Appointment.start_time.desc())
            )
            
            if not include_cancelled:
                appointment_query = appointment_query.filter(models.Appointment.status != 'cancelled')
            
            appointments = appointment_query.limit(limit).all()
            
            # Calculate aggregated stats in single query
            stats = (
                self.db.query(
                    func.count(models.Appointment.id).label('total_appointments'),
                    func.sum(models.Appointment.total_amount).label('total_spent'),
                    func.avg(models.Appointment.total_amount).label('avg_spent'),
                    func.min(models.Appointment.start_time).label('first_appointment'),
                    func.max(models.Appointment.start_time).label('last_appointment'),
                    func.count(distinct(models.Appointment.barber_id)).label('unique_barbers')
                )
                .filter(
                    models.Appointment.client_id == client_id,
                    models.Appointment.status == 'completed'
                )
                .first()
            )
            
            return {
                'client': client,
                'appointments': appointments,
                'stats': {
                    'total_appointments': stats.total_appointments or 0,
                    'total_spent': float(stats.total_spent or 0),
                    'average_spent': float(stats.avg_spent or 0),
                    'first_appointment': stats.first_appointment,
                    'last_appointment': stats.last_appointment,
                    'unique_barbers': stats.unique_barbers or 0
                }
            }
    
    # =====================================================
    # OPTIMIZED SEARCH & FILTERING QUERIES
    # =====================================================
    
    def search_appointments_optimized(
        self, 
        search_params: Dict[str, Any],
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Optimized appointment search with pagination"""
        with self.query_performance_tracking("search_appointments_optimized"):
            query = (
                self.db.query(models.Appointment)
                .options(
                    joinedload(models.Appointment.barber),
                    joinedload(models.Appointment.client),
                    joinedload(models.Appointment.service)
                )
            )
            
            # Apply search filters
            if 'status' in search_params:
                query = query.filter(models.Appointment.status == search_params['status'])
            
            if 'barber_id' in search_params:
                query = query.filter(models.Appointment.barber_id == search_params['barber_id'])
            
            if 'client_email' in search_params:
                query = query.join(models.Client, models.Appointment.client_id == models.Client.id)
                query = query.filter(models.Client.email.ilike(f"%{search_params['client_email']}%"))
            
            if 'service_name' in search_params:
                query = query.filter(models.Appointment.service_name.ilike(f"%{search_params['service_name']}%"))
            
            if 'date_from' in search_params:
                query = query.filter(func.date(models.Appointment.start_time) >= search_params['date_from'])
            
            if 'date_to' in search_params:
                query = query.filter(func.date(models.Appointment.start_time) <= search_params['date_to'])
            
            # Get total count for pagination
            total_count = query.count()
            
            # Apply pagination
            offset = (page - 1) * page_size
            appointments = query.offset(offset).limit(page_size).all()
            
            return {
                'appointments': appointments,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_count': total_count,
                    'total_pages': (total_count + page_size - 1) // page_size
                }
            }
    
    # =====================================================
    # AI DASHBOARD OPTIMIZATION QUERIES
    # =====================================================
    
    def get_ai_dashboard_data_optimized(self, location_id: Optional[int] = None) -> Dict[str, Any]:
        """Get all AI dashboard data in minimal queries"""
        with self.query_performance_tracking("get_ai_dashboard_data_optimized"):
            # Single query for business metrics
            today = date.today()
            last_30_days = today - timedelta(days=30)
            
            # Comprehensive metrics query
            metrics = (
                self.db.query(
                    func.count(distinct(models.Appointment.id)).label('total_appointments'),
                    func.count(distinct(models.Appointment.client_id)).label('unique_clients'),
                    func.count(distinct(models.Appointment.barber_id)).label('active_barbers'),
                    func.sum(models.Appointment.total_amount).label('total_revenue'),
                    func.avg(models.Appointment.total_amount).label('avg_booking_value'),
                    func.count(distinct(func.date(models.Appointment.start_time))).label('booking_days')
                )
                .join(models.User, models.Appointment.barber_id == models.User.id)
                .filter(
                    models.Appointment.status == 'completed',
                    func.date(models.Appointment.start_time) >= last_30_days
                )
            )
            
            if location_id:
                metrics = metrics.filter(models.User.location_id == location_id)
            
            business_metrics = metrics.first()
            
            # Recent activity query
            recent_appointments = (
                self.db.query(models.Appointment)
                .options(
                    joinedload(models.Appointment.barber),
                    joinedload(models.Appointment.client),
                    joinedload(models.Appointment.service)
                )
                .join(models.User, models.Appointment.barber_id == models.User.id)
                .filter(models.Appointment.status != 'cancelled')
                .order_by(models.Appointment.start_time.desc())
            )
            
            if location_id:
                recent_appointments = recent_appointments.filter(models.User.location_id == location_id)
            
            recent_appointments = recent_appointments.limit(10).all()
            
            # Top performing barbers
            top_barbers = (
                self.db.query(
                    models.User.id,
                    models.User.first_name,
                    models.User.last_name,
                    func.count(models.Appointment.id).label('appointment_count'),
                    func.sum(models.Appointment.total_amount).label('revenue'),
                    func.avg(models.Appointment.total_amount).label('avg_booking')
                )
                .join(models.Appointment, models.User.id == models.Appointment.barber_id)
                .filter(
                    models.Appointment.status == 'completed',
                    func.date(models.Appointment.start_time) >= last_30_days,
                    models.User.unified_role == 'BARBER'
                )
                .group_by(models.User.id, models.User.first_name, models.User.last_name)
                .order_by(text('revenue DESC'))
                .limit(5)
                .all()
            )
            
            return {
                'business_metrics': {
                    'total_appointments': business_metrics.total_appointments or 0,
                    'unique_clients': business_metrics.unique_clients or 0,
                    'active_barbers': business_metrics.active_barbers or 0,
                    'total_revenue': float(business_metrics.total_revenue or 0),
                    'avg_booking_value': float(business_metrics.avg_booking_value or 0),
                    'booking_days': business_metrics.booking_days or 0
                },
                'recent_appointments': recent_appointments,
                'top_barbers': [
                    {
                        'id': barber.id,
                        'name': f"{barber.first_name} {barber.last_name}",
                        'appointments': barber.appointment_count,
                        'revenue': float(barber.revenue or 0),
                        'avg_booking': float(barber.avg_booking or 0)
                    }
                    for barber in top_barbers
                ],
                'date_range': {
                    'from': last_30_days,
                    'to': today
                }
            }
    
    # =====================================================
    # PERFORMANCE REPORTING
    # =====================================================
    
    def get_query_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive query performance report"""
        if not self.query_metrics:
            return {'message': 'No query metrics available'}
        
        total_queries = len(self.query_metrics)
        total_execution_time = sum(m.execution_time for m in self.query_metrics)
        n_plus_one_count = sum(1 for m in self.query_metrics if m.n_plus_one_detected)
        
        # Group by query type
        by_type = {}
        for metric in self.query_metrics:
            if metric.query_type not in by_type:
                by_type[metric.query_type] = []
            by_type[metric.query_type].append(metric)
        
        type_stats = {}
        for query_type, metrics in by_type.items():
            type_stats[query_type] = {
                'count': len(metrics),
                'avg_execution_time': sum(m.execution_time for m in metrics) / len(metrics),
                'total_execution_time': sum(m.execution_time for m in metrics),
                'n_plus_one_detected': sum(1 for m in metrics if m.n_plus_one_detected),
                'avg_queries_per_operation': sum(m.queries_executed for m in metrics) / len(metrics)
            }
        
        return {
            'summary': {
                'total_operations': total_queries,
                'total_execution_time': total_execution_time,
                'avg_execution_time': total_execution_time / total_queries if total_queries > 0 else 0,
                'n_plus_one_detected': n_plus_one_count,
                'optimization_level': self.optimization_level.value
            },
            'by_query_type': type_stats,
            'performance_issues': [
                {
                    'query_type': m.query_type,
                    'execution_time': m.execution_time,
                    'queries_executed': m.queries_executed,
                    'issue': 'Potential N+1 query pattern'
                }
                for m in self.query_metrics if m.n_plus_one_detected
            ]
        }
    
    def clear_metrics(self):
        """Clear query performance metrics"""
        self.query_metrics.clear()

# =====================================================
# CONVENIENCE FUNCTIONS
# =====================================================

def create_optimized_query_service(db: Session, optimization_level: str = "advanced") -> OptimizedQueryService:
    """Factory function to create optimized query service"""
    level = QueryOptimizationLevel(optimization_level)
    return OptimizedQueryService(db, level)

def get_db_performance_health_check(db: Session) -> Dict[str, Any]:
    """Comprehensive database performance health check"""
    try:
        # Test basic connectivity
        start_time = time.time()
        db.execute(text("SELECT 1"))
        basic_query_time = time.time() - start_time
        
        # Test complex query performance
        start_time = time.time()
        appointment_count = db.query(func.count(models.Appointment.id)).scalar()
        complex_query_time = time.time() - start_time
        
        # Check connection pool status if available
        connection_info = {}
        try:
            pool = db.get_bind().pool
            connection_info = {
                'pool_size': pool.size(),
                'checked_in': pool.checkedin(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'invalid': pool.invalid()
            }
        except Exception:
            connection_info = {'status': 'Pool info not available'}
        
        return {
            'healthy': True,
            'basic_query_time': basic_query_time,
            'complex_query_time': complex_query_time,
            'appointment_count': appointment_count,
            'connection_pool': connection_info,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'healthy': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }