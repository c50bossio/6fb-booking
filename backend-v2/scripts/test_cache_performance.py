#!/usr/bin/env python3
"""
Cache Performance Testing Script
Test cache hit rate improvements for BookedBarber V2
"""

import asyncio
import logging
import random
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.enhanced_redis_service import enhanced_redis_service
from services.cache_optimization_service import cache_optimization_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CachePerformanceTester:
    """Test cache performance and optimization"""
    
    def __init__(self):
        self.redis_service = enhanced_redis_service
    
    async def run_comprehensive_test(self):
        """Run comprehensive cache performance test"""
        logger.info("🚀 Starting comprehensive cache performance test...")
        
        try:
            # Phase 1: Test basic cache operations
            await self._test_basic_operations()
            
            # Phase 2: Simulate realistic load
            await self._simulate_realistic_load()
            
            # Phase 3: Run optimization
            await self._run_optimization()
            
            # Phase 4: Test performance after optimization
            await self._test_optimized_performance()
            
            # Phase 5: Generate final report
            final_report = await self._generate_final_report()
            
            logger.info("✅ Comprehensive cache test completed successfully!")
            return final_report
            
        except Exception as e:
            logger.error(f"Cache test failed: {e}")
            return {'error': str(e)}
    
    async def _test_basic_operations(self):
        """Test basic cache operations"""
        logger.info("📝 Testing basic cache operations...")
        
        # Test data
        test_data = {
            'availability': {
                'barber_1_today': {
                    'barber_id': 1,
                    'date': '2025-07-22',
                    'slots': ['09:00', '10:00', '11:00', '14:00', '15:00']
                },
                'barber_2_today': {
                    'barber_id': 2,
                    'date': '2025-07-22',
                    'slots': ['09:30', '10:30', '11:30', '14:30', '15:30']
                }
            },
            'appointments': {
                'appt_123': {
                    'id': 123,
                    'barber_id': 1,
                    'start_time': '2025-07-22T10:00:00',
                    'service': 'Haircut',
                    'client': 'John Doe'
                },
                'appt_124': {
                    'id': 124,
                    'barber_id': 2,
                    'start_time': '2025-07-22T11:00:00',
                    'service': 'Beard Trim',
                    'client': 'Jane Smith'
                }
            },
            'services': {
                'service_1': {
                    'id': 1,
                    'name': 'Haircut',
                    'duration': 30,
                    'price': 35.00
                },
                'service_2': {
                    'id': 2,
                    'name': 'Beard Trim',
                    'duration': 15,
                    'price': 15.00
                }
            }
        }
        
        # Set test data
        total_sets = 0
        for category, items in test_data.items():
            for identifier, data in items.items():
                success = self.redis_service.set(category, identifier, data)
                if success:
                    total_sets += 1
        
        logger.info(f"✅ Set {total_sets} test items in cache")
        
        # Test gets
        total_gets = 0
        hits = 0
        for category, items in test_data.items():
            for identifier in items.keys():
                cached_data = self.redis_service.get(category, identifier)
                total_gets += 1
                if cached_data is not None:
                    hits += 1
        
        hit_rate = (hits / total_gets * 100) if total_gets > 0 else 0
        logger.info(f"✅ Basic operations test: {hits}/{total_gets} hits ({hit_rate:.1f}% hit rate)")
    
    async def _simulate_realistic_load(self):
        """Simulate realistic application load patterns"""
        logger.info("🔄 Simulating realistic load patterns...")
        
        # Simulate 100 random cache operations
        categories = ['availability', 'appointments', 'services', 'barber_data', 'user_profiles']
        
        for i in range(100):
            category = random.choice(categories)
            identifier = f"test_item_{random.randint(1, 20)}"
            
            # 70% chance of get, 30% chance of set
            if random.random() < 0.7:
                # Get operation
                self.redis_service.get(category, identifier)
            else:
                # Set operation
                test_data = {
                    'id': random.randint(1, 1000),
                    'timestamp': datetime.now().isoformat(),
                    'data': f"test_data_{i}"
                }
                self.redis_service.set(category, identifier, test_data)
        
        # Get current metrics
        metrics = self.redis_service.get_cache_metrics()
        logger.info(f"📊 After realistic load: {metrics['hit_rate']:.1f}% hit rate ({metrics['hits']} hits, {metrics['misses']} misses)")
    
    async def _run_optimization(self):
        """Run cache optimization"""
        logger.info("⚙️ Running cache optimization...")
        
        # Run optimization cycle
        optimization_result = await cache_optimization_service.run_cache_optimization_cycle()
        
        logger.info(f"✅ Optimization completed - Status: {optimization_result.get('optimization_status', 'unknown')}")
        
        return optimization_result
    
    async def _test_optimized_performance(self):
        """Test performance after optimization"""
        logger.info("🎯 Testing optimized performance...")
        
        # Simulate frequent access patterns (should hit cache more often)
        frequent_items = [
            ('availability', 'barber_1_today'),
            ('availability', 'barber_2_today'),
            ('appointments', 'appt_123'),
            ('services', 'service_1'),
            ('services', 'service_2')
        ]
        
        # Access these items multiple times
        for _ in range(10):
            for category, identifier in frequent_items:
                self.redis_service.get(category, identifier)
        
        # Access some new items (should be cache misses)
        for i in range(5):
            self.redis_service.get('user_profiles', f'user_{i}')
        
        # Get final metrics
        final_metrics = self.redis_service.get_cache_metrics()
        logger.info(f"📈 Final performance: {final_metrics['hit_rate']:.1f}% hit rate")
        
        return final_metrics
    
    async def _generate_final_report(self):
        """Generate final performance report"""
        metrics = self.redis_service.get_cache_metrics()
        
        report = {
            'test_timestamp': datetime.now().isoformat(),
            'final_hit_rate': metrics['hit_rate'],
            'target_hit_rate': 80.0,
            'performance_status': 'optimal' if metrics['hit_rate'] >= 80 else 'good' if metrics['hit_rate'] >= 70 else 'needs_improvement',
            'total_operations': metrics['total_operations'],
            'cache_hits': metrics['hits'],
            'cache_misses': metrics['misses'],
            'cache_sets': metrics['sets'],
            'redis_connected': metrics['redis_info'].get('connected', False),
            'strategies_count': len(self.redis_service.cache_strategies),
            'recommendations': self._generate_test_recommendations(metrics['hit_rate'])
        }
        
        # Print summary
        logger.info("📋 FINAL CACHE PERFORMANCE REPORT")
        logger.info("=" * 50)
        logger.info(f"Hit Rate: {report['final_hit_rate']:.1f}% (Target: {report['target_hit_rate']}%)")
        logger.info(f"Status: {report['performance_status'].upper()}")
        logger.info(f"Operations: {report['total_operations']} total")
        logger.info(f"Cache Strategies: {report['strategies_count']} configured")
        logger.info("=" * 50)
        
        if report['recommendations']:
            logger.info("Recommendations:")
            for rec in report['recommendations']:
                logger.info(f"  • {rec}")
        
        return report
    
    def _generate_test_recommendations(self, hit_rate: float) -> list:
        """Generate recommendations based on test results"""
        recommendations = []
        
        if hit_rate >= 80:
            recommendations.append("Excellent cache performance achieved! 🎉")
            recommendations.append("Cache optimization is working effectively")
        elif hit_rate >= 70:
            recommendations.append("Good cache performance - minor optimizations possible")
            recommendations.append("Consider increasing TTL for frequently accessed data")
        elif hit_rate >= 50:
            recommendations.append("Moderate performance - run optimization more frequently")
            recommendations.append("Implement proactive cache warming")
        else:
            recommendations.append("Low cache performance - review caching strategy")
            recommendations.append("Increase cache usage across application")
            recommendations.append("Consider Redis memory optimization")
        
        return recommendations

async def main():
    """Main test function"""
    print("🧪 BookedBarber V2 Cache Performance Test")
    print("=" * 50)
    
    tester = CachePerformanceTester()
    result = await tester.run_comprehensive_test()
    
    print("\n" + "=" * 50)
    print("🏁 Test Complete!")
    
    if 'error' not in result:
        hit_rate = result['final_hit_rate']
        if hit_rate >= 80:
            print(f"✅ SUCCESS: Achieved {hit_rate:.1f}% hit rate (target: 80%)")
        else:
            print(f"⚠️  IN PROGRESS: {hit_rate:.1f}% hit rate (target: 80%)")
    else:
        print(f"❌ ERROR: {result['error']}")

if __name__ == "__main__":
    asyncio.run(main())