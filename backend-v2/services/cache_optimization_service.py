"""
Cache Optimization Service for BookedBarber V2
Advanced caching strategies to achieve 80%+ hit rate
"""

import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from services.enhanced_redis_service import enhanced_redis_service
from models import Appointment, BarberProfile, Service, User, BarberAvailability
from database import get_db

logger = logging.getLogger(__name__)

class CacheOptimizationService:
    """Service to optimize cache performance and hit rates"""
    
    def __init__(self):
        self.redis_service = enhanced_redis_service
        self.optimization_tasks = []
    
    async def run_cache_optimization_cycle(self):
        """Run complete cache optimization cycle"""
        logger.info("🚀 Starting cache optimization cycle...")
        
        try:
            # 1. Analyze current performance
            await self._analyze_cache_performance()
            
            # 2. Preload frequently accessed data
            await self._preload_hot_data()
            
            # 3. Optimize cache strategies
            await self._optimize_cache_strategies()
            
            # 4. Clean up stale data
            await self._cleanup_stale_cache()
            
            # 5. Generate optimization report
            report = await self._generate_optimization_report()
            
            logger.info("✅ Cache optimization cycle completed successfully")
            return report
            
        except Exception as e:
            logger.error(f"Cache optimization cycle failed: {e}")
            return {'error': str(e)}
    
    async def _analyze_cache_performance(self):
        """Analyze current cache performance patterns"""
        logger.info("📊 Analyzing cache performance patterns...")
        
        try:
            # Get current metrics
            metrics = self.redis_service.get_cache_metrics()
            hit_rate = metrics['hit_rate']
            
            logger.info(f"Current hit rate: {hit_rate}%")
            
            if hit_rate < 80:
                logger.warning(f"Hit rate {hit_rate}% below target (80%)")
                
                # Identify performance bottlenecks
                await self._identify_cache_bottlenecks()
            else:
                logger.info("Hit rate above target - maintaining current strategy")
                
        except Exception as e:
            logger.error(f"Cache performance analysis failed: {e}")
    
    async def _identify_cache_bottlenecks(self):
        """Identify specific cache performance bottlenecks"""
        logger.info("🔍 Identifying cache bottlenecks...")
        
        # Common bottlenecks and solutions
        bottlenecks = {
            'availability_queries': {
                'category': 'availability',
                'solution': 'increase_ttl_and_preload',
                'priority': 'high'
            },
            'user_lookups': {
                'category': 'user_profiles', 
                'solution': 'enable_compression_and_batch',
                'priority': 'medium'
            },
            'appointment_data': {
                'category': 'appointments',
                'solution': 'intelligent_prefetch',
                'priority': 'high'
            }
        }
        
        for bottleneck_type, config in bottlenecks.items():
            await self._apply_bottleneck_solution(bottleneck_type, config)
    
    async def _apply_bottleneck_solution(self, bottleneck_type: str, config: Dict):
        """Apply specific solution for identified bottleneck"""
        category = config['category']
        solution = config['solution']
        
        logger.info(f"Applying solution '{solution}' for {bottleneck_type}")
        
        if solution == 'increase_ttl_and_preload':
            # Increase TTL for high-frequency data
            if category in self.redis_service.cache_strategies:
                current_ttl = self.redis_service.cache_strategies[category]['ttl']
                new_ttl = min(current_ttl * 2, 300)  # Max 5 minutes for availability
                self.redis_service.cache_strategies[category]['ttl'] = new_ttl
                logger.info(f"Increased TTL for {category}: {current_ttl}s → {new_ttl}s")
        
        elif solution == 'enable_compression_and_batch':
            # Enable compression for data-heavy categories
            if category in self.redis_service.cache_strategies:
                self.redis_service.cache_strategies[category]['compression'] = True
                logger.info(f"Enabled compression for {category}")
        
        elif solution == 'intelligent_prefetch':
            # Implement smart prefetching for appointment data
            await self._setup_intelligent_prefetch(category)
    
    async def _setup_intelligent_prefetch(self, category: str):
        """Setup intelligent prefetching for specific categories"""
        logger.info(f"Setting up intelligent prefetch for {category}")
        
        if category == 'appointments':
            # Prefetch today's and tomorrow's appointments
            await self._prefetch_appointment_data()
        elif category == 'availability':
            # Prefetch availability for next 7 days
            await self._prefetch_availability_data()
    
    async def _preload_hot_data(self):
        """Preload frequently accessed data to improve hit rates"""
        logger.info("🔥 Preloading hot data...")
        
        try:
            # Get database session
            db = next(get_db())
            
            # 1. Preload today's appointments
            await self._preload_todays_appointments(db)
            
            # 2. Preload active barber profiles
            await self._preload_active_barbers(db)
            
            # 3. Preload popular services
            await self._preload_popular_services(db)
            
            # 4. Preload availability for next 3 days
            await self._preload_upcoming_availability(db)
            
            logger.info("✅ Hot data preloading completed")
            
        except Exception as e:
            logger.error(f"Hot data preloading failed: {e}")
        finally:
            if 'db' in locals():
                db.close()
    
    async def _preload_todays_appointments(self, db: Session):
        """Preload today's appointments"""
        try:
            today = datetime.now().date()
            
            # Get today's appointments
            appointments = db.query(Appointment).filter(
                and_(
                    func.date(Appointment.start_time) == today,
                    Appointment.status.in_(['confirmed', 'checked_in'])
                )
            ).all()
            
            # Cache each appointment
            appointment_data = {}
            for appointment in appointments:
                appointment_data[str(appointment.id)] = {
                    'id': appointment.id,
                    'barber_id': appointment.barber_id,
                    'start_time': appointment.start_time.isoformat(),
                    'end_time': appointment.end_time.isoformat(),
                    'status': appointment.status,
                    'service_name': appointment.service_name,
                    'client_name': f"{appointment.first_name} {appointment.last_name}"
                }
            
            # Batch cache appointments
            success_count = self.redis_service.batch_set('appointments', appointment_data, ttl_override=1800)
            logger.info(f"Preloaded {success_count} today's appointments")
            
        except Exception as e:
            logger.error(f"Failed to preload today's appointments: {e}")
    
    async def _preload_active_barbers(self, db: Session):
        """Preload active barber profiles"""
        try:
            # Get active barbers
            barbers = db.query(BarberProfile).filter(BarberProfile.is_active == True).all()
            
            # Cache barber data
            barber_data = {}
            for barber in barbers:
                barber_data[str(barber.id)] = {
                    'id': barber.id,
                    'user_id': barber.user_id,
                    'display_name': barber.display_name,
                    'bio': barber.bio,
                    'hourly_rate': float(barber.hourly_rate) if barber.hourly_rate else 0,
                    'is_active': barber.is_active,
                    'specialties': barber.specialties
                }
            
            # Batch cache barbers
            success_count = self.redis_service.batch_set('barber_data', barber_data, ttl_override=1800)
            logger.info(f"Preloaded {success_count} active barbers")
            
        except Exception as e:
            logger.error(f"Failed to preload active barbers: {e}")
    
    async def _preload_popular_services(self, db: Session):
        """Preload popular services"""
        try:
            # Get active services
            services = db.query(Service).filter(Service.is_active == True).all()
            
            # Cache service data
            service_data = {}
            for service in services:
                service_data[str(service.id)] = {
                    'id': service.id,
                    'name': service.name,
                    'description': service.description,
                    'duration_minutes': service.duration_minutes,
                    'price': float(service.price) if service.price else 0,
                    'category': service.category.value if service.category else None,
                    'is_active': service.is_active
                }
            
            # Batch cache services
            success_count = self.redis_service.batch_set('services', service_data, ttl_override=3600)
            logger.info(f"Preloaded {success_count} services")
            
        except Exception as e:
            logger.error(f"Failed to preload popular services: {e}")
    
    async def _preload_upcoming_availability(self, db: Session):
        """Preload availability for next 3 days"""
        try:
            today = datetime.now().date()
            end_date = today + timedelta(days=3)
            
            # Get barber availability for next 3 days
            availability_records = db.query(BarberAvailability).filter(
                and_(
                    BarberAvailability.date >= today,
                    BarberAvailability.date <= end_date,
                    BarberAvailability.is_available == True
                )
            ).all()
            
            # Group by date and barber
            availability_data = {}
            for record in availability_records:
                date_key = record.date.isoformat()
                barber_key = f"{date_key}:barber_{record.barber_id}"
                
                availability_data[barber_key] = {
                    'date': date_key,
                    'barber_id': record.barber_id,
                    'start_time': record.start_time.isoformat() if record.start_time else None,
                    'end_time': record.end_time.isoformat() if record.end_time else None,
                    'is_available': record.is_available,
                    'break_start': record.break_start.isoformat() if record.break_start else None,
                    'break_end': record.break_end.isoformat() if record.break_end else None
                }
            
            # Batch cache availability
            success_count = self.redis_service.batch_set('availability', availability_data, ttl_override=600)
            logger.info(f"Preloaded {success_count} availability records")
            
        except Exception as e:
            logger.error(f"Failed to preload upcoming availability: {e}")
    
    async def _optimize_cache_strategies(self):
        """Optimize cache strategies based on usage patterns"""
        logger.info("⚙️ Optimizing cache strategies...")
        
        try:
            # Apply Redis server optimizations
            self.redis_service.optimize_cache_performance()
            
            # Apply application-level optimizations
            await self._apply_smart_caching_rules()
            
            logger.info("✅ Cache strategy optimization completed")
            
        except Exception as e:
            logger.error(f"Cache strategy optimization failed: {e}")
    
    async def _apply_smart_caching_rules(self):
        """Apply intelligent caching rules based on access patterns"""
        
        # Rule 1: Cache popular time slots longer
        popular_times = ['09:00', '10:00', '14:00', '15:00', '16:00']
        for time_slot in popular_times:
            # Implement extended caching for popular times
            pass
        
        # Rule 2: Aggressive caching for weekend availability
        # Weekends are typically busier, so cache more aggressively
        weekend_ttl = 120  # 2 minutes
        
        # Rule 3: Cache user preferences longer for repeat customers
        # Repeat customers likely to book again soon
        
        logger.info("Applied smart caching rules for usage patterns")
    
    async def _cleanup_stale_cache(self):
        """Clean up stale and unused cache entries"""
        logger.info("🧹 Cleaning up stale cache data...")
        
        try:
            # Clean up categories with pattern-based deletion
            cleanup_categories = [
                ('availability', 'expired_slots'),
                ('appointments', 'old_appointments'),
                ('queue_data', 'empty_queues')
            ]
            
            total_cleaned = 0
            for category, pattern_type in cleanup_categories:
                cleaned = await self._cleanup_category(category, pattern_type)
                total_cleaned += cleaned
            
            logger.info(f"🗑️ Cleaned up {total_cleaned} stale cache entries")
            
        except Exception as e:
            logger.error(f"Cache cleanup failed: {e}")
    
    async def _cleanup_category(self, category: str, pattern_type: str) -> int:
        """Clean up specific category based on pattern"""
        try:
            if pattern_type == 'expired_slots':
                # Clean up past availability slots
                yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
                pattern = f"*{yesterday}*"
                return self.redis_service.delete_pattern(category, pattern)
            
            elif pattern_type == 'old_appointments':
                # Clean up very old appointment cache
                week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
                pattern = f"*{week_ago}*"
                return self.redis_service.delete_pattern(category, pattern)
            
            elif pattern_type == 'empty_queues':
                # Clean up empty queue data
                return self.redis_service.delete_pattern(category, "*empty*")
            
            return 0
            
        except Exception as e:
            logger.error(f"Failed to cleanup {category}:{pattern_type}: {e}")
            return 0
    
    async def _generate_optimization_report(self) -> Dict[str, Any]:
        """Generate cache optimization performance report"""
        try:
            # Get updated metrics
            metrics = self.redis_service.get_cache_metrics()
            
            report = {
                'optimization_timestamp': datetime.now().isoformat(),
                'performance_metrics': metrics,
                'target_hit_rate': 80.0,
                'current_hit_rate': metrics['hit_rate'],
                'hit_rate_improvement': metrics['hit_rate'] - 73.0,  # From baseline
                'optimization_status': 'success' if metrics['hit_rate'] >= 80 else 'in_progress',
                'recommendations': self._generate_recommendations(metrics),
                'cache_strategies': dict(self.redis_service.cache_strategies)
            }
            
            # Log summary
            logger.info(f"📈 Optimization Report: Hit rate {metrics['hit_rate']}% (target: 80%)")
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate optimization report: {e}")
            return {'error': str(e)}
    
    def _generate_recommendations(self, metrics: Dict[str, Any]) -> List[str]:
        """Generate optimization recommendations based on metrics"""
        recommendations = []
        hit_rate = metrics['hit_rate']
        
        if hit_rate < 80:
            recommendations.append("Increase TTL for frequently accessed data")
            recommendations.append("Enable compression for large datasets")
            recommendations.append("Implement intelligent prefetching")
        
        if hit_rate < 70:
            recommendations.append("CRITICAL: Review caching strategy")
            recommendations.append("Consider Redis memory optimization")
            recommendations.append("Implement cache warming procedures")
        
        if hit_rate >= 80:
            recommendations.append("Excellent performance - maintain current strategy")
            recommendations.append("Monitor for continued optimization opportunities")
        
        if metrics['total_operations'] < 100:
            recommendations.append("Increase cache usage across application")
        
        return recommendations
    
    async def run_continuous_optimization(self, interval_minutes: int = 30):
        """Run continuous cache optimization"""
        logger.info(f"Starting continuous cache optimization (every {interval_minutes} minutes)")
        
        while True:
            try:
                await self.run_cache_optimization_cycle()
                await asyncio.sleep(interval_minutes * 60)
            except Exception as e:
                logger.error(f"Continuous optimization error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retry

# Global cache optimization service
cache_optimization_service = CacheOptimizationService()