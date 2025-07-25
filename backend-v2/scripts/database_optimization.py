#!/usr/bin/env python3
"""
Database Optimization Script for BookedBarber V2
================================================================

This script provides comprehensive database optimization tools including:
1. Connection pooling configuration
2. Query analysis and monitoring
3. Performance metrics collection
4. Slow query detection and reporting
5. Index usage analysis
6. Production recommendations

Usage:
    python scripts/database_optimization.py --check-performance
    python scripts/database_optimization.py --analyze-queries
    python scripts/database_optimization.py --monitor --duration 300
    python scripts/database_optimization.py --recommend-production
"""

import os
import sys
import time
import json
import argparse
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, StaticPool
from sqlalchemy.engine import Engine
import psutil


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('database_optimization.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class QueryPerformanceMetrics:
    """Container for query performance data."""
    query_text: str
    execution_time: float
    rows_examined: int
    rows_returned: int
    timestamp: datetime
    slow_query: bool = False


@dataclass
class DatabaseHealthMetrics:
    """Container for overall database health metrics."""
    connection_count: int
    active_connections: int
    idle_connections: int
    slow_queries_count: int
    average_query_time: float
    peak_memory_usage: float
    cache_hit_ratio: Optional[float] = None
    index_usage_stats: Dict[str, Any] = None


class DatabaseOptimizer:
    """Main class for database optimization operations."""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv('DATABASE_URL', 'sqlite:///./test.db')
        self.is_postgresql = self.database_url.startswith('postgresql')
        self.query_metrics: List[QueryPerformanceMetrics] = []
        self.setup_engine()
        
    def setup_engine(self):
        """Configure optimized database engine with connection pooling."""
        if self.is_postgresql:
            # PostgreSQL optimized settings
            engine_kwargs = {
                'poolclass': QueuePool,
                'pool_size': 20,              # Base connections
                'max_overflow': 30,           # Additional connections under load
                'pool_timeout': 30,           # Timeout waiting for connection
                'pool_recycle': 3600,         # Recycle connections every hour
                'pool_pre_ping': True,        # Verify connections before use
                'echo': False,                # Set to True for query logging
                'connect_args': {
                    'connect_timeout': 10,
                    'application_name': 'BookedBarber_Optimizer',
                    'options': '-c statement_timeout=30000'  # 30 second query timeout
                }
            }
        else:
            # SQLite optimized settings
            engine_kwargs = {
                'poolclass': StaticPool,
                'pool_timeout': 20,
                'pool_recycle': 3600,
                'connect_args': {
                    'check_same_thread': False,
                    'timeout': 20
                }
            }
        
        self.engine = create_engine(self.database_url, **engine_kwargs)
        self.Session = sessionmaker(bind=self.engine)
        
        # Setup query monitoring
        self.setup_query_monitoring()
        
        logger.info(f"Database engine configured for {self.database_url[:50]}...")
        
    def setup_query_monitoring(self):
        """Setup SQLAlchemy event listeners for query monitoring."""
        
        @event.listens_for(Engine, "before_cursor_execute")
        def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
            
        @event.listens_for(Engine, "after_cursor_execute")
        def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total_time = time.time() - context._query_start_time
            
            # Log slow queries (> 1 second)
            if total_time > 1.0:
                logger.warning(f"Slow query detected: {total_time:.3f}s - {statement[:100]}...")
                
                # Store metrics
                self.query_metrics.append(QueryPerformanceMetrics(
                    query_text=statement[:500],  # Truncate long queries
                    execution_time=total_time,
                    rows_examined=cursor.rowcount if cursor.rowcount != -1 else 0,
                    rows_returned=cursor.rowcount if cursor.rowcount != -1 else 0,
                    timestamp=datetime.now(),
                    slow_query=True
                ))
                
    def check_database_performance(self) -> DatabaseHealthMetrics:
        """Analyze current database performance and return metrics."""
        logger.info("Analyzing database performance...")
        
        with self.Session() as session:
            try:
                # Basic connection metrics
                connection_info = self._get_connection_info(session)
                
                # Query performance analysis
                slow_queries = len([m for m in self.query_metrics if m.slow_query])
                avg_query_time = sum(m.execution_time for m in self.query_metrics) / len(self.query_metrics) if self.query_metrics else 0
                
                # Memory usage
                process = psutil.Process()
                memory_usage = process.memory_info().rss / 1024 / 1024  # MB
                
                # PostgreSQL specific metrics
                cache_hit_ratio = None
                index_stats = None
                if self.is_postgresql:
                    cache_hit_ratio = self._get_cache_hit_ratio(session)
                    index_stats = self._get_index_usage_stats(session)
                
                metrics = DatabaseHealthMetrics(
                    connection_count=connection_info.get('total_connections', 0),
                    active_connections=connection_info.get('active_connections', 0),
                    idle_connections=connection_info.get('idle_connections', 0),
                    slow_queries_count=slow_queries,
                    average_query_time=avg_query_time,
                    peak_memory_usage=memory_usage,
                    cache_hit_ratio=cache_hit_ratio,
                    index_usage_stats=index_stats
                )
                
                self._log_performance_metrics(metrics)
                return metrics
                
            except Exception as e:
                logger.error(f"Error analyzing database performance: {e}")
                raise
                
    def _get_connection_info(self, session: Session) -> Dict[str, int]:
        """Get database connection information."""
        if self.is_postgresql:
            try:
                result = session.execute(text("""
                    SELECT 
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """)).fetchone()
                
                return {
                    'total_connections': result.total_connections,
                    'active_connections': result.active_connections,
                    'idle_connections': result.idle_connections
                }
            except Exception as e:
                logger.warning(f"Could not get PostgreSQL connection info: {e}")
                return {'total_connections': 1, 'active_connections': 1, 'idle_connections': 0}
        else:
            # SQLite doesn't have connection pooling in the same way
            return {'total_connections': 1, 'active_connections': 1, 'idle_connections': 0}
            
    def _get_cache_hit_ratio(self, session: Session) -> Optional[float]:
        """Get PostgreSQL cache hit ratio."""
        if not self.is_postgresql:
            return None
            
        try:
            result = session.execute(text("""
                SELECT 
                    round(
                        sum(blks_hit) * 100.0 / sum(blks_hit + blks_read), 2
                    ) as cache_hit_ratio
                FROM pg_stat_database
                WHERE datname = current_database()
            """)).fetchone()
            
            return result.cache_hit_ratio if result else None
        except Exception as e:
            logger.warning(f"Could not get cache hit ratio: {e}")
            return None
            
    def _get_index_usage_stats(self, session: Session) -> Optional[Dict[str, Any]]:
        """Get index usage statistics for PostgreSQL."""
        if not self.is_postgresql:
            return None
            
        try:
            # Get table and index stats
            results = session.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch,
                    idx_scan
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public'
                ORDER BY idx_scan DESC
            """)).fetchall()
            
            index_stats = []
            for row in results:
                index_stats.append({
                    'table': row.tablename,
                    'index': row.indexname,
                    'scans': row.idx_scan,
                    'tuples_read': row.idx_tup_read,
                    'tuples_fetched': row.idx_tup_fetch
                })
                
            return {'indexes': index_stats}
        except Exception as e:
            logger.warning(f"Could not get index usage stats: {e}")
            return None
            
    def analyze_appointment_queries(self):
        """Analyze specific appointment-related query patterns."""
        logger.info("Analyzing appointment query patterns...")
        
        with self.Session() as session:
            test_queries = [
                # 1. Slot availability check (most common)
                {
                    'name': 'Slot Availability Check',
                    'query': text("""
                        SELECT * FROM appointments 
                        WHERE start_time >= :start_date 
                        AND start_time < :end_date 
                        AND status != 'cancelled'
                    """),
                    'params': {
                        'start_date': datetime.now(),
                        'end_date': datetime.now() + timedelta(days=1)
                    }
                },
                
                # 2. Barber availability
                {
                    'name': 'Barber Availability',
                    'query': text("""
                        SELECT * FROM appointments 
                        WHERE barber_id = :barber_id 
                        AND start_time >= :start_date 
                        AND start_time <= :end_date 
                        AND status != 'cancelled'
                    """),
                    'params': {
                        'barber_id': 1,
                        'start_date': datetime.now(),
                        'end_date': datetime.now() + timedelta(days=1)
                    }
                },
                
                # 3. User appointment listing
                {
                    'name': 'User Appointments',
                    'query': text("""
                        SELECT a.*, u.name as user_name, u.email 
                        FROM appointments a 
                        JOIN users u ON a.user_id = u.id 
                        WHERE a.user_id = :user_id 
                        ORDER BY a.start_time DESC 
                        LIMIT 10
                    """),
                    'params': {'user_id': 1}
                },
                
                # 4. Admin dashboard query
                {
                    'name': 'Admin Dashboard',
                    'query': text("""
                        SELECT COUNT(*) as total_appointments,
                               COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
                               COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
                        FROM appointments 
                        WHERE start_time >= :start_date 
                        AND start_time < :end_date
                    """),
                    'params': {
                        'start_date': datetime.now() - timedelta(days=30),
                        'end_date': datetime.now()
                    }
                }
            ]
            
            results = []
            for test in test_queries:
                start_time = time.time()
                try:
                    if self.is_postgresql:
                        # Use EXPLAIN ANALYZE for PostgreSQL
                        explain_result = session.execute(
                            text(f"EXPLAIN ANALYZE {test['query']}"),
                            test['params']
                        ).fetchall()
                        explain_output = [str(row[0]) for row in explain_result]
                    else:
                        # Use EXPLAIN QUERY PLAN for SQLite
                        explain_result = session.execute(
                            text(f"EXPLAIN QUERY PLAN {test['query']}"),
                            test['params']
                        ).fetchall()
                        explain_output = [f"{row[0]}-{row[1]}-{row[2]}-{row[3]}" for row in explain_result]
                    
                    execution_time = time.time() - start_time
                    
                    results.append({
                        'query_name': test['name'],
                        'execution_time': execution_time,
                        'explain_plan': explain_output
                    })
                    
                except Exception as e:
                    logger.error(f"Error analyzing query '{test['name']}': {e}")
                    
            self._log_query_analysis(results)
            return results
            
    def monitor_real_time(self, duration_seconds: int = 300):
        """Monitor database performance in real-time."""
        logger.info(f"Starting real-time monitoring for {duration_seconds} seconds...")
        
        start_time = time.time()
        metrics_history = []
        
        while time.time() - start_time < duration_seconds:
            try:
                metrics = self.check_database_performance()
                metrics_history.append({
                    'timestamp': datetime.now().isoformat(),
                    'metrics': asdict(metrics)
                })
                
                # Log current status
                logger.info(f"Connections: {metrics.active_connections}/{metrics.connection_count}, "
                          f"Slow queries: {metrics.slow_queries_count}, "
                          f"Avg query time: {metrics.average_query_time:.3f}s")
                
                time.sleep(10)  # Monitor every 10 seconds
                
            except KeyboardInterrupt:
                logger.info("Monitoring interrupted by user")
                break
            except Exception as e:
                logger.error(f"Error during monitoring: {e}")
                
        # Save monitoring results
        output_file = f"monitoring_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(metrics_history, f, indent=2)
            
        logger.info(f"Monitoring results saved to {output_file}")
        return metrics_history
        
    def generate_production_recommendations(self) -> Dict[str, Any]:
        """Generate production database setup recommendations."""
        logger.info("Generating production recommendations...")
        
        recommendations = {
            'connection_pooling': {
                'postgresql': {
                    'pool_size': 20,
                    'max_overflow': 50,
                    'pool_timeout': 30,
                    'pool_recycle': 3600,
                    'pool_pre_ping': True,
                    'description': 'Optimized for 1000+ concurrent users'
                },
                'connection_string_parameters': {
                    'connect_timeout': 10,
                    'statement_timeout': 30000,
                    'idle_in_transaction_session_timeout': 60000
                }
            },
            'postgresql_configuration': {
                'shared_buffers': '256MB',  # 25% of RAM for dedicated server
                'effective_cache_size': '768MB',  # 75% of RAM
                'maintenance_work_mem': '64MB',
                'work_mem': '4MB',
                'max_connections': 200,
                'checkpoint_completion_target': 0.9,
                'wal_buffers': '16MB',
                'default_statistics_target': 100,
                'random_page_cost': 1.1,  # For SSD storage
                'effective_io_concurrency': 200  # For SSD storage
            },
            'indexes_to_monitor': [
                'idx_appointments_barber_start_time_status',
                'idx_appointments_user_start_time_status',
                'idx_appointments_start_time_status',
                'idx_payments_appointment_status'
            ],
            'monitoring_queries': {
                'slow_queries': """
                    SELECT query, mean_time, calls, total_time
                    FROM pg_stat_statements 
                    WHERE mean_time > 1000 
                    ORDER BY mean_time DESC 
                    LIMIT 10;
                """,
                'index_usage': """
                    SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
                    FROM pg_stat_user_indexes 
                    WHERE schemaname = 'public'
                    ORDER BY idx_scan ASC
                    LIMIT 10;
                """,
                'table_sizes': """
                    SELECT schemaname, tablename, 
                           pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                    FROM pg_tables 
                    WHERE schemaname = 'public'
                    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
                """
            },
            'backup_strategy': {
                'frequency': 'Daily full backup, hourly WAL archiving',
                'retention': '30 days for daily, 7 days for hourly',
                'verification': 'Weekly restore test to separate environment'
            },
            'scaling_thresholds': {
                'cpu_usage': '> 70% sustained for 5 minutes',
                'memory_usage': '> 80% sustained for 5 minutes',
                'connection_usage': '> 80% of max_connections',
                'slow_query_rate': '> 10 queries/minute over 1 second',
                'cache_hit_ratio': '< 95%'
            }
        }
        
        # Save recommendations
        output_file = f"production_recommendations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(recommendations, f, indent=2)
            
        logger.info(f"Production recommendations saved to {output_file}")
        return recommendations
        
    def _log_performance_metrics(self, metrics: DatabaseHealthMetrics):
        """Log performance metrics in a structured format."""
        logger.info("=== DATABASE PERFORMANCE METRICS ===")
        logger.info(f"Total Connections: {metrics.connection_count}")
        logger.info(f"Active Connections: {metrics.active_connections}")
        logger.info(f"Idle Connections: {metrics.idle_connections}")
        logger.info(f"Slow Queries: {metrics.slow_queries_count}")
        logger.info(f"Average Query Time: {metrics.average_query_time:.3f}s")
        logger.info(f"Memory Usage: {metrics.peak_memory_usage:.1f}MB")
        
        if metrics.cache_hit_ratio:
            logger.info(f"Cache Hit Ratio: {metrics.cache_hit_ratio}%")
            
        if metrics.index_usage_stats:
            logger.info("Top 5 Most Used Indexes:")
            for idx in metrics.index_usage_stats['indexes'][:5]:
                logger.info(f"  {idx['table']}.{idx['index']}: {idx['scans']} scans")
                
    def _log_query_analysis(self, results: List[Dict[str, Any]]):
        """Log query analysis results."""
        logger.info("=== QUERY ANALYSIS RESULTS ===")
        for result in results:
            logger.info(f"\nQuery: {result['query_name']}")
            logger.info(f"Execution Time: {result['execution_time']:.3f}s")
            logger.info("Execution Plan:")
            for line in result['explain_plan']:
                logger.info(f"  {line}")


def main():
    """Main CLI interface for database optimization."""
    parser = argparse.ArgumentParser(description='Database Optimization Tool for BookedBarber V2')
    parser.add_argument('--check-performance', action='store_true',
                       help='Check current database performance')
    parser.add_argument('--analyze-queries', action='store_true',
                       help='Analyze appointment query patterns')
    parser.add_argument('--monitor', action='store_true',
                       help='Monitor database performance in real-time')
    parser.add_argument('--duration', type=int, default=300,
                       help='Duration for monitoring in seconds (default: 300)')
    parser.add_argument('--recommend-production', action='store_true',
                       help='Generate production setup recommendations')
    parser.add_argument('--database-url', type=str,
                       help='Database URL (defaults to environment variable)')
    
    args = parser.parse_args()
    
    if not any([args.check_performance, args.analyze_queries, args.monitor, args.recommend_production]):
        parser.print_help()
        return
        
    optimizer = DatabaseOptimizer(args.database_url)
    
    try:
        if args.check_performance:
            metrics = optimizer.check_database_performance()
            print(f"\nPerformance check completed. See logs for details.")
            
        if args.analyze_queries:
            results = optimizer.analyze_appointment_queries()
            print(f"\nQuery analysis completed. Analyzed {len(results)} queries.")
            
        if args.monitor:
            metrics_history = optimizer.monitor_real_time(args.duration)
            print(f"\nMonitoring completed. Collected {len(metrics_history)} data points.")
            
        if args.recommend_production:
            recommendations = optimizer.generate_production_recommendations()
            print(f"\nProduction recommendations generated. See output file for details.")
            
    except Exception as e:
        logger.error(f"Error running database optimization: {e}")
        return 1
        
    return 0


if __name__ == '__main__':
    sys.exit(main())