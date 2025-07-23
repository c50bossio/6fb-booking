"""
Performance analyzer for BookedBarber V2
Identifies query bottlenecks and recommends optimizations
"""

import asyncio
import time
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from models import Appointment, User, BarberProfile, Payment
import logging

logger = logging.getLogger(__name__)

class PerformanceAnalyzer:
    """Analyzes database performance and identifies bottlenecks"""
    
    def __init__(self, db: Session):
        self.db = db
        self.query_times = {}
        
    def time_query(self, query_name: str, query_func):
        """Time a database query and store results"""
        start_time = time.time()
        try:
            result = query_func()
            execution_time = (time.time() - start_time) * 1000  # Convert to ms
            self.query_times[query_name] = {
                'time_ms': execution_time,
                'success': True,
                'result_count': len(result) if hasattr(result, '__len__') else 1
            }
            return result
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            self.query_times[query_name] = {
                'time_ms': execution_time,
                'success': False,
                'error': str(e)
            }
            raise
    
    def analyze_availability_queries(self):
        """Analyze real-time availability query performance"""
        print("🔍 Analyzing Availability Query Performance...")
        
        # Test date for analysis
        test_date = datetime.now().date()
        start_of_day = datetime.combine(test_date, datetime.min.time())
        end_of_day = datetime.combine(test_date, datetime.max.time())
        
        # 1. Basic availability query (most common)
        def basic_availability():
            return self.db.query(Appointment).filter(
                Appointment.start_time >= start_of_day,
                Appointment.start_time <= end_of_day,
                Appointment.status.in_(['confirmed', 'checked_in'])
            ).all()
        
        self.time_query("basic_availability", basic_availability)
        
        # 2. Barber-specific availability
        def barber_availability():
            return self.db.query(Appointment).filter(
                Appointment.barber_id == 1,  # Test with barber ID 1
                Appointment.start_time >= start_of_day,
                Appointment.start_time <= end_of_day,
                Appointment.status.in_(['confirmed', 'checked_in'])
            ).all()
        
        self.time_query("barber_specific_availability", barber_availability)
        
        # 3. Active barbers query
        def active_barbers():
            return self.db.query(BarberProfile).filter(
                BarberProfile.is_active == True
            ).all()
        
        self.time_query("active_barbers", active_barbers)
        
        # 4. User appointment history (for rebooking)
        def user_history():
            return self.db.query(Appointment).filter(
                Appointment.user_id == 1,  # Test with user ID 1
                Appointment.start_time >= datetime.now() - timedelta(days=90),
                Appointment.status.in_(['completed', 'confirmed'])
            ).order_by(Appointment.start_time.desc()).limit(5).all()
        
        self.time_query("user_appointment_history", user_history)
        
        # 5. Complex availability with joins
        def complex_availability():
            return self.db.query(
                Appointment, BarberProfile, User
            ).join(
                BarberProfile, Appointment.barber_id == BarberProfile.user_id
            ).join(
                User, BarberProfile.user_id == User.id
            ).filter(
                Appointment.start_time >= start_of_day,
                Appointment.start_time <= end_of_day,
                BarberProfile.is_active == True
            ).all()
        
        self.time_query("complex_availability_with_joins", complex_availability)
    
    def analyze_booking_queries(self):
        """Analyze booking-related query performance"""
        print("📅 Analyzing Booking Query Performance...")
        
        # 1. Conflict detection query
        def conflict_detection():
            test_start = datetime.now()
            test_end = test_start + timedelta(minutes=30)
            return self.db.query(Appointment).filter(
                Appointment.barber_id == 1,
                Appointment.status.in_(['confirmed', 'checked_in']),
                Appointment.start_time < test_end,
                (Appointment.start_time + timedelta(minutes=Appointment.duration_minutes)) > test_start
            ).all()
        
        self.time_query("conflict_detection", conflict_detection)
        
        # 2. Popular time slots analysis
        def popular_slots():
            return self.db.execute(text("""
                SELECT EXTRACT(hour FROM start_time) as hour, COUNT(*) as count
                FROM appointments 
                WHERE start_time >= NOW() - INTERVAL '30 days'
                AND status IN ('completed', 'confirmed')
                GROUP BY EXTRACT(hour FROM start_time)
                ORDER BY count DESC
                LIMIT 5
            """)).fetchall()
        
        self.time_query("popular_time_slots", popular_slots)
        
        # 3. Recent bookings for user
        def recent_user_bookings():
            return self.db.query(Appointment).filter(
                Appointment.user_id == 1,
                Appointment.created_at >= datetime.now() - timedelta(days=30)
            ).order_by(Appointment.created_at.desc()).all()
        
        self.time_query("recent_user_bookings", recent_user_bookings)
    
    def analyze_auth_queries(self):
        """Analyze authentication query performance"""
        print("🔐 Analyzing Authentication Query Performance...")
        
        # 1. Email lookup (most common auth query)
        def email_lookup():
            return self.db.query(User).filter(
                User.email == "test@example.com",
                User.is_active == True
            ).first()
        
        self.time_query("email_lookup", email_lookup)
        
        # 2. Role-based queries
        def role_based_query():
            return self.db.query(User).filter(
                User.unified_role == "barber",
                User.is_active == True
            ).all()
        
        self.time_query("role_based_query", role_based_query)
        
        # 3. Active users count
        def active_users_count():
            return self.db.query(User).filter(User.is_active == True).count()
        
        self.time_query("active_users_count", active_users_count)
    
    def analyze_payment_queries(self):
        """Analyze payment query performance"""
        print("💰 Analyzing Payment Query Performance...")
        
        # 1. Recent payments
        def recent_payments():
            return self.db.query(Payment).filter(
                Payment.created_at >= datetime.now() - timedelta(days=30)
            ).order_by(Payment.created_at.desc()).all()
        
        self.time_query("recent_payments", recent_payments)
        
        # 2. Successful payments for barber
        def barber_earnings():
            return self.db.query(Payment).filter(
                Payment.barber_id == 1,
                Payment.status == 'succeeded',
                Payment.created_at >= datetime.now() - timedelta(days=30)
            ).all()
        
        self.time_query("barber_earnings", barber_earnings)
    
    def generate_performance_report(self):
        """Generate comprehensive performance report"""
        print("\n" + "="*60)
        print("📊 PERFORMANCE ANALYSIS REPORT")
        print("="*60)
        
        # Sort queries by execution time
        sorted_queries = sorted(
            self.query_times.items(), 
            key=lambda x: x[1].get('time_ms', 0), 
            reverse=True
        )
        
        print(f"\n🔍 Query Performance Analysis ({len(sorted_queries)} queries tested)")
        print("-" * 60)
        
        slow_queries = []
        for query_name, stats in sorted_queries:
            time_ms = stats.get('time_ms', 0)
            success = stats.get('success', False)
            result_count = stats.get('result_count', 0)
            
            status = "✅" if success else "❌"
            
            if time_ms > 100:  # Slow query threshold
                slow_queries.append((query_name, time_ms))
                status += " 🐌"
            elif time_ms > 50:
                status += " ⚠️"
            
            print(f"{status} {query_name:<35} {time_ms:>6.1f}ms ({result_count} results)")
        
        # Performance summary
        total_queries = len([q for q in self.query_times.values() if q.get('success')])
        avg_time = sum(q.get('time_ms', 0) for q in self.query_times.values() if q.get('success')) / max(total_queries, 1)
        
        print(f"\n📈 Performance Summary")
        print("-" * 60)
        print(f"Total Queries Analyzed: {total_queries}")
        print(f"Average Query Time: {avg_time:.1f}ms")
        print(f"Slow Queries (>100ms): {len(slow_queries)}")
        
        # Recommendations
        print(f"\n💡 Optimization Recommendations")
        print("-" * 60)
        
        if slow_queries:
            print("🚨 Slow Queries Detected:")
            for query_name, time_ms in slow_queries:
                print(f"   • {query_name}: {time_ms:.1f}ms")
                self._get_optimization_suggestion(query_name)
        else:
            print("✅ All queries performing well (< 100ms)")
        
        # Index recommendations
        print(f"\n🔍 Recommended Database Indexes")
        print("-" * 60)
        
        index_recommendations = [
            "CREATE INDEX idx_appointments_availability ON appointments(barber_id, start_time, status)",
            "CREATE INDEX idx_appointments_date_status ON appointments(DATE(start_time), status)",
            "CREATE INDEX idx_users_email_active ON users(email, is_active)",
            "CREATE INDEX idx_barber_profiles_active ON barber_profiles(is_active)",
            "CREATE INDEX idx_payments_barber_status ON payments(barber_id, status, created_at)"
        ]
        
        for index in index_recommendations:
            print(f"   {index}")
        
        return {
            'total_queries': total_queries,
            'average_time_ms': avg_time,
            'slow_queries': slow_queries,
            'query_times': self.query_times
        }
    
    def _get_optimization_suggestion(self, query_name: str):
        """Get specific optimization suggestions for slow queries"""
        suggestions = {
            'basic_availability': "Add composite index on (start_time, status)",
            'barber_specific_availability': "Add composite index on (barber_id, start_time, status)",
            'complex_availability_with_joins': "Consider denormalizing or using separate queries",
            'conflict_detection': "Add index on (barber_id, start_time, duration_minutes)",
            'popular_time_slots': "Consider caching this analytics query",
            'email_lookup': "Add composite index on (email, is_active)",
            'role_based_query': "Add composite index on (unified_role, is_active)",
            'barber_earnings': "Add composite index on (barber_id, status, created_at)"
        }
        
        suggestion = suggestions.get(query_name, "Review query structure and add appropriate indexes")
        print(f"     💡 Suggestion: {suggestion}")

async def run_performance_analysis():
    """Run comprehensive performance analysis"""
    db = next(get_db())
    
    try:
        analyzer = PerformanceAnalyzer(db)
        
        # Run all analyses
        analyzer.analyze_availability_queries()
        analyzer.analyze_booking_queries() 
        analyzer.analyze_auth_queries()
        analyzer.analyze_payment_queries()
        
        # Generate report
        report = analyzer.generate_performance_report()
        
        return report
        
    except Exception as e:
        logger.error(f"Performance analysis failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Run the analysis
    asyncio.run(run_performance_analysis())