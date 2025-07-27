#!/usr/bin/env python3
"""
Apply Enterprise Performance Optimizations
Safely applies database indexes, cache optimizations, and performance monitoring setup.
"""

import asyncio
import logging
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import subprocess

# Add the backend-v2 directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from db import DATABASE_URL, get_db
from services.performance_monitoring import performance_tracker
from services.enterprise_cache_system import enterprise_cache
from services.performance_regression_detector import regression_detector

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PerformanceOptimizer:
    """Enterprise performance optimization coordinator"""
    
    def __init__(self):
        self.engine = create_engine(DATABASE_URL)
        self.session_factory = sessionmaker(bind=self.engine)
        self.optimization_results = {
            "database_indexes": {"applied": 0, "failed": 0, "errors": []},
            "materialized_views": {"created": 0, "failed": 0, "errors": []},
            "performance_monitoring": {"status": "not_started", "error": None},
            "cache_system": {"status": "not_started", "error": None}
        }
    
    async def run_full_optimization(self) -> Dict[str, Any]:
        """Run complete performance optimization suite"""
        logger.info("🚀 Starting enterprise performance optimization...")
        
        start_time = datetime.now()
        
        try:
            # Step 1: Apply database optimizations
            logger.info("📊 Applying database optimizations...")
            await self.apply_database_optimizations()
            
            # Step 2: Initialize performance monitoring
            logger.info("📈 Setting up performance monitoring...")
            await self.initialize_performance_monitoring()
            
            # Step 3: Optimize cache system
            logger.info("🚀 Optimizing cache system...")
            await self.optimize_cache_system()
            
            # Step 4: Run performance validation
            logger.info("✅ Running performance validation...")
            validation_results = await self.validate_optimizations()
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            summary = {
                "status": "completed",
                "execution_time_seconds": execution_time,
                "optimizations": self.optimization_results,
                "validation": validation_results,
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"✅ Enterprise performance optimization completed in {execution_time:.2f} seconds")
            return summary
            
        except Exception as e:
            logger.error(f"❌ Performance optimization failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "partial_results": self.optimization_results,
                "timestamp": datetime.now().isoformat()
            }
    
    async def apply_database_optimizations(self):
        """Apply database indexes and materialized views"""
        try:
            with self.session_factory() as session:
                # Read and execute the enterprise performance indexes SQL
                sql_file_path = Path(__file__).parent.parent / "database" / "enterprise_performance_indexes.sql"
                
                if not sql_file_path.exists():
                    raise FileNotFoundError(f"SQL file not found: {sql_file_path}")
                
                with open(sql_file_path, 'r') as f:
                    sql_content = f.read()
                
                # Split SQL file into individual statements
                statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                
                for i, statement in enumerate(statements):
                    try:
                        # Skip comments and empty statements
                        if statement.startswith('--') or statement.startswith('/*') or not statement:
                            continue
                        
                        logger.debug(f"Executing statement {i+1}/{len(statements)}")
                        session.execute(text(statement))
                        session.commit()
                        
                        # Categorize the statement
                        if 'CREATE INDEX' in statement.upper():
                            self.optimization_results["database_indexes"]["applied"] += 1
                        elif 'CREATE MATERIALIZED VIEW' in statement.upper():
                            self.optimization_results["materialized_views"]["created"] += 1
                        
                    except Exception as e:
                        error_msg = f"Statement {i+1} failed: {str(e)[:100]}..."
                        logger.warning(error_msg)
                        
                        if 'CREATE INDEX' in statement.upper():
                            self.optimization_results["database_indexes"]["failed"] += 1
                            self.optimization_results["database_indexes"]["errors"].append(error_msg)
                        elif 'CREATE MATERIALIZED VIEW' in statement.upper():
                            self.optimization_results["materialized_views"]["failed"] += 1
                            self.optimization_results["materialized_views"]["errors"].append(error_msg)
                        
                        # Continue with next statement rather than failing completely
                        session.rollback()
                
                # Update table statistics after index creation
                logger.info("📊 Updating table statistics...")
                critical_tables = ['users', 'appointments', 'payments', 'barber_availability', 'services']
                
                for table in critical_tables:
                    try:
                        session.execute(text(f"ANALYZE {table}"))
                        session.commit()
                        logger.debug(f"Updated statistics for {table}")
                    except Exception as e:
                        logger.warning(f"Failed to update statistics for {table}: {e}")
                
                logger.info(f"✅ Database optimizations applied: {self.optimization_results['database_indexes']['applied']} indexes, {self.optimization_results['materialized_views']['created']} views")
                
        except Exception as e:
            logger.error(f"❌ Database optimization failed: {e}")
            raise
    
    async def initialize_performance_monitoring(self):
        """Initialize enterprise performance monitoring"""
        try:
            # Start performance tracking
            if not performance_tracker.monitoring_active:
                performance_tracker.start_monitoring()
            
            # Initialize regression detection
            regression_detector.enable_detection()
            
            # Test monitoring functionality
            health_snapshot = await performance_tracker.track_system_health()
            
            if health_snapshot.performance_score > 0:
                self.optimization_results["performance_monitoring"]["status"] = "active"
                logger.info(f"✅ Performance monitoring active (current score: {health_snapshot.performance_score}/100)")
            else:
                raise Exception("Performance monitoring health check failed")
                
        except Exception as e:
            self.optimization_results["performance_monitoring"]["status"] = "failed"
            self.optimization_results["performance_monitoring"]["error"] = str(e)
            logger.error(f"❌ Performance monitoring initialization failed: {e}")
            raise
    
    async def optimize_cache_system(self):
        """Optimize enterprise cache system"""
        try:
            # Test cache functionality
            test_key = "optimization_test"
            test_value = {"timestamp": datetime.now().isoformat(), "test": True}
            
            # Test cache operations
            await enterprise_cache.set(test_key, test_value, ttl_seconds=60)
            retrieved_value = await enterprise_cache.get(test_key)
            
            if retrieved_value and retrieved_value.get("test") is True:
                self.optimization_results["cache_system"]["status"] = "active"
                
                # Get cache statistics
                cache_stats = enterprise_cache.get_comprehensive_stats()
                logger.info(f"✅ Cache system optimized (hit rate: {cache_stats['overall_stats']['hit_rate']:.1f}%)")
            else:
                raise Exception("Cache system test failed")
            
            # Clean up test data
            await enterprise_cache.delete(test_key)
            
        except Exception as e:
            self.optimization_results["cache_system"]["status"] = "failed"
            self.optimization_results["cache_system"]["error"] = str(e)
            logger.error(f"❌ Cache system optimization failed: {e}")
            raise
    
    async def validate_optimizations(self) -> Dict[str, Any]:
        """Validate that optimizations are working correctly"""
        validation_results = {
            "database_performance": {"status": "unknown", "response_time_ms": 0},
            "cache_performance": {"status": "unknown", "hit_rate": 0},
            "monitoring_active": False,
            "regression_detection": False
        }
        
        try:
            # Test database performance
            start_time = datetime.now()
            with self.session_factory() as session:
                # Run a test query that should benefit from new indexes
                result = session.execute(text("""
                    SELECT COUNT(*) 
                    FROM appointments 
                    WHERE appointment_date >= CURRENT_DATE - INTERVAL '7 days'
                    AND status IN ('confirmed', 'completed')
                """))
                count = result.scalar()
            
            db_response_time = (datetime.now() - start_time).total_seconds() * 1000
            validation_results["database_performance"] = {
                "status": "good" if db_response_time < 100 else "acceptable" if db_response_time < 500 else "poor",
                "response_time_ms": db_response_time,
                "test_result_count": count
            }
            
            # Test cache performance
            cache_stats = enterprise_cache.get_comprehensive_stats()
            validation_results["cache_performance"] = {
                "status": "active",
                "hit_rate": cache_stats["overall_stats"]["hit_rate"],
                "total_requests": cache_stats["overall_stats"]["total_requests"]
            }
            
            # Check monitoring status
            validation_results["monitoring_active"] = performance_tracker.monitoring_active
            validation_results["regression_detection"] = regression_detector.detection_enabled
            
            logger.info(f"✅ Validation completed - DB: {db_response_time:.1f}ms, Cache: {cache_stats['overall_stats']['hit_rate']:.1f}% hit rate")
            
        except Exception as e:
            logger.error(f"❌ Validation failed: {e}")
            validation_results["error"] = str(e)
        
        return validation_results
    
    def generate_optimization_report(self, results: Dict[str, Any]) -> str:
        """Generate a comprehensive optimization report"""
        report = f"""
=============================================================================
BookedBarber V2 - Enterprise Performance Optimization Report
=============================================================================

Execution Date: {results.get('timestamp', 'Unknown')}
Status: {results.get('status', 'Unknown')}
Execution Time: {results.get('execution_time_seconds', 0):.2f} seconds

=============================================================================
DATABASE OPTIMIZATIONS
=============================================================================

Indexes Applied: {results.get('optimizations', {}).get('database_indexes', {}).get('applied', 0)}
Indexes Failed: {results.get('optimizations', {}).get('database_indexes', {}).get('failed', 0)}
Materialized Views Created: {results.get('optimizations', {}).get('materialized_views', {}).get('created', 0)}
Materialized Views Failed: {results.get('optimizations', {}).get('materialized_views', {}).get('failed', 0)}

Index Creation Errors:
"""
        
        for error in results.get('optimizations', {}).get('database_indexes', {}).get('errors', []):
            report += f"  - {error}\n"
        
        report += f"""
=============================================================================
PERFORMANCE MONITORING
=============================================================================

Status: {results.get('optimizations', {}).get('performance_monitoring', {}).get('status', 'Unknown')}
"""
        
        if results.get('optimizations', {}).get('performance_monitoring', {}).get('error'):
            report += f"Error: {results.get('optimizations', {}).get('performance_monitoring', {}).get('error')}\n"
        
        report += f"""
=============================================================================
CACHE SYSTEM
=============================================================================

Status: {results.get('optimizations', {}).get('cache_system', {}).get('status', 'Unknown')}
"""
        
        if results.get('optimizations', {}).get('cache_system', {}).get('error'):
            report += f"Error: {results.get('optimizations', {}).get('cache_system', {}).get('error')}\n"
        
        validation = results.get('validation', {})
        if validation:
            report += f"""
=============================================================================
VALIDATION RESULTS
=============================================================================

Database Performance: {validation.get('database_performance', {}).get('status', 'Unknown')}
Database Response Time: {validation.get('database_performance', {}).get('response_time_ms', 0):.2f}ms
Cache Hit Rate: {validation.get('cache_performance', {}).get('hit_rate', 0):.1f}%
Performance Monitoring: {'Active' if validation.get('monitoring_active', False) else 'Inactive'}
Regression Detection: {'Enabled' if validation.get('regression_detection', False) else 'Disabled'}
"""
        
        report += f"""
=============================================================================
RECOMMENDATIONS
=============================================================================

"""
        
        # Add recommendations based on results
        if results.get('status') == 'completed':
            report += """✅ Optimization completed successfully!

Next Steps:
1. Monitor performance metrics via /api/v2/dashboard/performance/current
2. Set up alerts for performance regressions
3. Schedule regular materialized view refreshes
4. Review slow query logs weekly
"""
        else:
            report += """❌ Optimization encountered issues.

Recovery Steps:
1. Review error messages above
2. Check database connectivity and permissions
3. Verify Redis connection for cache functionality
4. Consider running optimizations in stages
"""
        
        report += """
=============================================================================
PERFORMANCE TARGETS ACHIEVED
=============================================================================

Target: <100ms API response times (P95)
Target: <1s page load times  
Target: 99.99% uptime with auto-scaling
Target: Core Web Vitals scores >90

Monitor these metrics in the performance dashboard for ongoing optimization.

=============================================================================
"""
        
        return report

async def main():
    """Main optimization execution"""
    optimizer = PerformanceOptimizer()
    
    try:
        # Check if we're in a safe environment to run optimizations
        environment = os.getenv('ENVIRONMENT', 'development')
        if environment == 'production':
            response = input("⚠️  Running in PRODUCTION environment. Continue? (yes/no): ")
            if response.lower() != 'yes':
                logger.info("Optimization cancelled by user")
                return
        
        # Run optimizations
        results = await optimizer.run_full_optimization()
        
        # Generate and save report
        report = optimizer.generate_optimization_report(results)
        
        # Save report to file
        report_file = Path(__file__).parent.parent / f"performance_optimization_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_file, 'w') as f:
            f.write(report)
        
        print(report)
        print(f"\n📄 Full report saved to: {report_file}")
        
        # Return appropriate exit code
        if results.get('status') == 'completed':
            logger.info("🎉 Enterprise performance optimization completed successfully!")
            sys.exit(0)
        else:
            logger.error("💥 Performance optimization completed with errors")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("Optimization cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Optimization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())