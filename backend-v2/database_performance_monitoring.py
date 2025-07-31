#!/usr/bin/env python3
"""
Database Performance Monitoring and Validation Script
6FB-Booking Platform - Backend V2

This script provides comprehensive database performance monitoring including:
- Query performance analysis
- Index usage statistics  
- Connection pool monitoring
- Slow query detection
- Performance regression testing
- Optimization validation

Usage:
    python database_performance_monitoring.py [command]
    
Commands:
    monitor     - Run continuous performance monitoring
    validate    - Validate recent optimizations
    benchmark   - Run performance benchmark tests
    slow-queries - Analyze slow queries
    index-usage - Check index usage statistics
    all         - Run all monitoring tasks
"""

import time
import json
import logging
import asyncio
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from contextlib import contextmanager

import click
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

# Import models and config
from db import get_db, engine
from models import User, Appointment, Payment, Client, Service
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class QueryPerformanceMetric:
    """Performance metric for a database query"""
    query_name: str
    avg_time_ms: float
    min_time_ms: float
    max_time_ms: float
    p95_time_ms: float
    p99_time_ms: float
    iterations: int
    error_count: int
    timestamp: datetime

@dataclass
class IndexUsageStats:
    """Index usage statistics"""
    schema_name: str
    table_name: str
    index_name: str
    scans: int
    tuples_read: int
    tuples_fetched: int
    size_mb: float
    usage_ratio: float

class DatabasePerformanceMonitor:
    """Comprehensive database performance monitoring"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.metrics_history: List[QueryPerformanceMetric] = []
        self.baseline_metrics: Dict[str, float] = {}
        
    def benchmark_query(self, query_func: Callable, query_name: str, iterations: int = 10) -> QueryPerformanceMetric:
        """Benchmark a query function with detailed statistics"""
        
        times = []
        errors = 0
        
        logger.info(f"🔍 Benchmarking query: {query_name} ({iterations} iterations)")
        
        for i in range(iterations):
            try:
                start_time = time.perf_counter()
                result = query_func()
                end_time = time.perf_counter()
                
                execution_time_ms = (end_time - start_time) * 1000
                times.append(execution_time_ms)
                
                if i == 0:
                    logger.debug(f"   Sample result type: {type(result)}")
                    
            except Exception as e:
                errors += 1
                logger.error(f"   Query error in iteration {i+1}: {e}")
        
        if not times:
            logger.error(f"❌ All iterations failed for query: {query_name}")
            return QueryPerformanceMetric(
                query_name=query_name,
                avg_time_ms=0,
                min_time_ms=0,
                max_time_ms=0,
                p95_time_ms=0,
                p99_time_ms=0,
                iterations=iterations,
                error_count=errors,
                timestamp=datetime.now()
            )
        
        # Calculate statistics
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        p95_time = statistics.quantiles(times, n=20)[18] if len(times) >= 20 else max_time
        p99_time = statistics.quantiles(times, n=100)[98] if len(times) >= 100 else max_time
        
        metric = QueryPerformanceMetric(
            query_name=query_name,
            avg_time_ms=avg_time,
            min_time_ms=min_time,
            max_time_ms=max_time,
            p95_time_ms=p95_time,
            p99_time_ms=p99_time,
            iterations=len(times),
            error_count=errors,
            timestamp=datetime.now()
        )
        
        # Log results
        if avg_time < 50:
            status = "✅ EXCELLENT"
        elif avg_time < 100:
            status = "🟢 GOOD"
        elif avg_time < 200:
            status = "🟡 ACCEPTABLE"
        else:
            status = "🔴 NEEDS OPTIMIZATION"
            
        logger.info(f"   {status} - Avg: {avg_time:.1f}ms, P95: {p95_time:.1f}ms, Errors: {errors}")
        
        self.metrics_history.append(metric)
        return metric
    
    def test_analytics_queries(self) -> List[QueryPerformanceMetric]:
        """Test analytics query performance"""
        
        results = []
        logger.info("📊 Testing Analytics Query Performance")
        
        # Test 1: Revenue analytics query (optimized)
        def revenue_analytics_optimized():
            return self.db.execute(text("""
                SELECT 
                    DATE(created_at) as revenue_date,
                    SUM(amount) as daily_revenue,
                    COUNT(*) as daily_transactions,
                    AVG(amount) as daily_avg
                FROM payments 
                WHERE status = 'completed'
                AND created_at >= :start_date 
                AND created_at <= :end_date
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at)
                LIMIT 30
            """), {
                'start_date': datetime.now() - timedelta(days=30),
                'end_date': datetime.now()
            }).fetchall()
        
        results.append(self.benchmark_query(revenue_analytics_optimized, "revenue_analytics_optimized"))
        
        # Test 2: Traditional revenue query (for comparison)
        def revenue_analytics_traditional():
            return self.db.query(
                func.sum(Payment.amount).label('total_revenue'),
                func.count(Payment.id).label('transaction_count'),
                func.avg(Payment.amount).label('average_transaction')
            ).filter(
                Payment.status == 'completed',
                Payment.created_at >= datetime.now() - timedelta(days=30)
            ).all()
        
        results.append(self.benchmark_query(revenue_analytics_traditional, "revenue_analytics_traditional"))
        
        # Test 3: User dashboard data
        def dashboard_data_query():
            return self.db.query(User).filter(
                User.is_active == True,
                User.unified_role.in_(['BARBER', 'SHOP_OWNER'])
            ).limit(50).all()
        
        results.append(self.benchmark_query(dashboard_data_query, "dashboard_user_query"))
        
        return results
    
    def test_booking_queries(self) -> List[QueryPerformanceMetric]:
        """Test booking-related query performance"""
        
        results = []
        logger.info("📅 Testing Booking Query Performance")
        
        # Test 1: Conflict detection (optimized)
        def conflict_detection_optimized():
            start_time = datetime.now() + timedelta(hours=1)
            end_time = start_time + timedelta(minutes=30)
            
            return self.db.execute(text("""
                SELECT EXISTS(
                    SELECT 1 FROM appointments 
                    WHERE barber_id = :barber_id 
                    AND status IN ('confirmed', 'pending')
                    AND (start_time, start_time + INTERVAL '1 hour') OVERLAPS (:check_start, :check_end)
                ) as has_conflict
            """), {
                'barber_id': 1,
                'check_start': start_time,
                'check_end': end_time
            }).fetchone()
        
        results.append(self.benchmark_query(conflict_detection_optimized, "conflict_detection_optimized"))
        
        # Test 2: Daily schedule loading
        def daily_schedule_query():
            today = datetime.now().date()
            return self.db.execute(text("""
                SELECT 
                    a.id,
                    a.start_time,
                    a.end_time,
                    a.status,
                    a.service_name,
                    c.name as client_name
                FROM appointments a
                LEFT JOIN clients c ON a.client_id = c.id
                WHERE a.barber_id = :barber_id 
                AND DATE(a.start_time) = :target_date
                ORDER BY a.start_time
            """), {
                'barber_id': 1,
                'target_date': today
            }).fetchall()
        
        results.append(self.benchmark_query(daily_schedule_query, "daily_schedule_optimized"))
        
        # Test 3: Available slots calculation
        def available_slots_query():
            today = datetime.now().date()
            return self.db.execute(text("""
                SELECT COUNT(*) as booked_slots
                FROM appointments 
                WHERE barber_id = :barber_id 
                AND DATE(start_time) = :target_date
                AND status IN ('confirmed', 'pending')
            """), {
                'barber_id': 1,
                'target_date': today
            }).fetchone()
        
        results.append(self.benchmark_query(available_slots_query, "available_slots_query"))
        
        return results
    
    def test_n_plus_one_scenarios(self) -> List[QueryPerformanceMetric]:
        """Test for N+1 query issues"""
        
        results = []
        logger.info("🔍 Testing N+1 Query Scenarios")
        
        # Test 1: N+1 problem (bad)
        def appointments_with_n_plus_one():
            appointments = self.db.query(Appointment).limit(10).all()
            clients = []
            for appointment in appointments:
                if appointment.client:  # This causes N+1 queries
                    clients.append(appointment.client.name)
            return len(clients)
        
        results.append(self.benchmark_query(appointments_with_n_plus_one, "appointments_n_plus_one_BAD", iterations=5))
        
        # Test 2: Optimized with eager loading (good)
        def appointments_with_eager_loading():
            from sqlalchemy.orm import joinedload
            appointments = self.db.query(Appointment).options(
                joinedload(Appointment.client)
            ).limit(10).all()
            clients = []
            for appointment in appointments:
                if appointment.client:
                    clients.append(appointment.client.name)
            return len(clients)
        
        results.append(self.benchmark_query(appointments_with_eager_loading, "appointments_eager_loading_GOOD", iterations=5))
        
        return results
    
    def analyze_slow_queries(self) -> Dict[str, Any]:
        """Analyze slow queries (PostgreSQL specific)"""
        
        logger.info("🐌 Analyzing Slow Queries")
        
        try:
            # Check if pg_stat_statements extension is available
            extension_check = self.db.execute(text("""
                SELECT EXISTS(
                    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
                ) as has_extension
            """)).fetchone()
            
            if not extension_check.has_extension:
                logger.warning("pg_stat_statements extension not available")
                return {"error": "pg_stat_statements extension not available"}
            
            # Get slow queries
            slow_queries = self.db.execute(text("""
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    (total_time/calls) as avg_time_ms,
                    rows,
                    100.0 * (total_time / (SELECT SUM(total_time) FROM pg_stat_statements)) as pct_total_time
                FROM pg_stat_statements 
                WHERE calls > 10  -- Only queries called more than 10 times
                ORDER BY mean_time DESC
                LIMIT 20
            """)).fetchall()
            
            slow_query_data = []
            for row in slow_queries:
                slow_query_data.append({
                    'query': row.query[:200] + '...' if len(row.query) > 200 else row.query,
                    'calls': row.calls,
                    'avg_time_ms': float(row.avg_time_ms),
                    'total_time': float(row.total_time),
                    'pct_total_time': float(row.pct_total_time),
                    'rows': row.rows
                })
            
            logger.info(f"Found {len(slow_query_data)} slow queries")
            return {
                'slow_queries': slow_query_data,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.warning(f"Could not analyze slow queries (likely SQLite): {e}")
            return {"error": str(e)}
    
    def check_index_usage(self) -> List[IndexUsageStats]:
        """Check index usage statistics"""
        
        logger.info("📈 Checking Index Usage Statistics")
        
        try:
            # PostgreSQL index usage stats
            index_stats = self.db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan,
                    idx_tup_read,
                    idx_tup_fetch,
                    pg_size_pretty(pg_relation_size(indexrelid)) as size
                FROM pg_stat_user_indexes 
                ORDER BY idx_scan ASC
                LIMIT 50
            """)).fetchall()
            
            stats = []
            for row in index_stats:
                # Parse size (remove 'MB', 'KB', etc.)
                size_str = row.size.replace(' MB', '').replace(' KB', '').replace(' bytes', '')
                try:
                    if 'MB' in row.size:
                        size_mb = float(size_str)
                    elif 'KB' in row.size:
                        size_mb = float(size_str) / 1024
                    else:
                        size_mb = float(size_str) / (1024 * 1024)
                except:
                    size_mb = 0.0
                
                usage_ratio = row.idx_tup_read / max(row.idx_scan, 1) if row.idx_scan > 0 else 0
                
                stats.append(IndexUsageStats(
                    schema_name=row.schemaname,
                    table_name=row.tablename,
                    index_name=row.indexname,
                    scans=row.idx_scan,
                    tuples_read=row.idx_tup_read,
                    tuples_fetched=row.idx_tup_fetch,
                    size_mb=size_mb,
                    usage_ratio=usage_ratio
                ))
            
            # Report unused indexes
            unused_indexes = [s for s in stats if s.scans < 100]
            if unused_indexes:
                logger.warning(f"Found {len(unused_indexes)} potentially unused indexes")
                for idx in unused_indexes[:10]:  # Show top 10
                    logger.warning(f"  - {idx.table_name}.{idx.index_name}: {idx.scans} scans, {idx.size_mb:.1f}MB")
            
            return stats
            
        except Exception as e:
            logger.warning(f"Could not check index usage (likely SQLite): {e}")
            return []
    
    def monitor_connection_pool(self) -> Dict[str, Any]:
        """Monitor database connection pool statistics"""
        
        logger.info("🔗 Monitoring Connection Pool")
        
        try:
            pool = engine.pool
            if isinstance(pool, QueuePool):
                pool_stats = {
                    'pool_size': pool.size(),
                    'checked_in': pool.checkedin(),
                    'checked_out': pool.checkedout(),
                    'overflow': pool.overflow(),
                    'invalid': pool.invalid(),
                    'utilization_pct': (pool.checkedout() / (pool.size() + pool.overflow())) * 100
                }
                
                # Log warnings for high utilization
                if pool_stats['utilization_pct'] > 80:
                    logger.warning(f"⚠️ High connection pool utilization: {pool_stats['utilization_pct']:.1f}%")
                elif pool_stats['utilization_pct'] > 60:
                    logger.info(f"Connection pool utilization: {pool_stats['utilization_pct']:.1f}%")
                else:
                    logger.info(f"✅ Connection pool utilization: {pool_stats['utilization_pct']:.1f}%")
                
                return pool_stats
            else:
                return {"error": "No QueuePool available"}
                
        except Exception as e:
            logger.error(f"Could not monitor connection pool: {e}")
            return {"error": str(e)}
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        
        logger.info("📋 Generating Performance Report")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'database_type': 'postgresql' if 'postgresql' in str(engine.url) else 'sqlite',
            'query_benchmarks': {},
            'slow_queries': {},
            'index_usage': [],
            'connection_pool': {},
            'recommendations': []
        }
        
        # Run all benchmarks
        analytics_results = self.test_analytics_queries()
        booking_results = self.test_booking_queries()
        n_plus_one_results = self.test_n_plus_one_scenarios()
        
        # Compile benchmark results
        all_results = analytics_results + booking_results + n_plus_one_results
        for result in all_results:
            report['query_benchmarks'][result.query_name] = {
                'avg_time_ms': result.avg_time_ms,
                'p95_time_ms': result.p95_time_ms,
                'p99_time_ms': result.p99_time_ms,
                'error_count': result.error_count,
                'iterations': result.iterations,
                'status': 'excellent' if result.avg_time_ms < 50 else
                         'good' if result.avg_time_ms < 100 else
                         'acceptable' if result.avg_time_ms < 200 else 'needs_optimization'
            }
        
        # Add slow query analysis
        report['slow_queries'] = self.analyze_slow_queries()
        
        # Add index usage stats
        index_stats = self.check_index_usage()
        report['index_usage'] = [
            {
                'table': stat.table_name,
                'index': stat.index_name,
                'scans': stat.scans,
                'size_mb': stat.size_mb,
                'usage_ratio': stat.usage_ratio
            }
            for stat in index_stats
        ]
        
        # Add connection pool stats
        report['connection_pool'] = self.monitor_connection_pool()
        
        # Generate recommendations
        recommendations = []
        
        # Check for slow queries
        slow_benchmarks = [r for r in all_results if r.avg_time_ms > 200]
        if slow_benchmarks:
            recommendations.append({
                'type': 'performance',
                'priority': 'high',
                'description': f"Found {len(slow_benchmarks)} slow queries averaging >200ms",
                'queries': [r.query_name for r in slow_benchmarks]
            })
        
        # Check for unused indexes
        unused_indexes = [s for s in index_stats if s.scans < 100 and s.size_mb > 1]
        if unused_indexes:
            recommendations.append({
                'type': 'storage',
                'priority': 'medium',
                'description': f"Found {len(unused_indexes)} potentially unused indexes consuming storage",
                'indexes': [f"{s.table_name}.{s.index_name}" for s in unused_indexes[:5]]
            })
        
        # Check connection pool utilization
        pool_stats = report['connection_pool']
        if isinstance(pool_stats, dict) and pool_stats.get('utilization_pct', 0) > 80:
            recommendations.append({
                'type': 'connection_pool',
                'priority': 'high',
                'description': f"High connection pool utilization: {pool_stats['utilization_pct']:.1f}%",
                'suggestion': "Consider increasing pool size or optimizing query patterns"
            })
        
        report['recommendations'] = recommendations
        
        return report


# CLI Interface
@click.group()
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose logging')
def cli(verbose):
    """Database Performance Monitoring Tool"""
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)

@cli.command()
@click.option('--output', '-o', default='performance_report.json', help='Output file for report')
def monitor(output):
    """Run comprehensive performance monitoring"""
    click.echo("🔍 Starting Database Performance Monitor...")
    
    with next(get_db()) as db:
        monitor = DatabasePerformanceMonitor(db)
        report = monitor.generate_performance_report()
        
        # Save report
        with open(output, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        click.echo(f"✅ Performance report saved to: {output}")
        
        # Print summary
        click.echo("\n📊 Performance Summary:")
        for query_name, stats in report['query_benchmarks'].items():
            status_emoji = {
                'excellent': '✅',
                'good': '🟢', 
                'acceptable': '🟡',
                'needs_optimization': '🔴'
            }[stats['status']]
            
            click.echo(f"  {status_emoji} {query_name}: {stats['avg_time_ms']:.1f}ms avg")
        
        if report['recommendations']:
            click.echo(f"\n⚠️ {len(report['recommendations'])} recommendations found")
            for rec in report['recommendations']:
                click.echo(f"  - {rec['type'].upper()}: {rec['description']}")

@cli.command()
def validate():
    """Validate recent database optimizations"""
    click.echo("✅ Validating Database Optimizations...")
    
    with next(get_db()) as db:
        monitor = DatabasePerformanceMonitor(db)
        
        # Test critical queries
        results = (
            monitor.test_analytics_queries() + 
            monitor.test_booking_queries() + 
            monitor.test_n_plus_one_scenarios()
        )
        
        # Check if optimizations are working
        optimized_queries = [r for r in results if 'optimized' in r.query_name or 'GOOD' in r.query_name]
        traditional_queries = [r for r in results if 'traditional' in r.query_name or 'BAD' in r.query_name]
        
        if optimized_queries and traditional_queries:
            avg_optimized = statistics.mean([r.avg_time_ms for r in optimized_queries])
            avg_traditional = statistics.mean([r.avg_time_ms for r in traditional_queries])
            improvement = ((avg_traditional - avg_optimized) / avg_traditional) * 100
            
            click.echo(f"📈 Performance Improvement: {improvement:.1f}%")
            click.echo(f"   Optimized queries: {avg_optimized:.1f}ms average")
            click.echo(f"   Traditional queries: {avg_traditional:.1f}ms average")
        
        click.echo("✅ Validation complete!")

@cli.command()
@click.option('--iterations', '-i', default=10, help='Number of benchmark iterations')
def benchmark(iterations):
    """Run performance benchmark tests"""
    click.echo(f"🏃 Running Performance Benchmarks ({iterations} iterations)...")
    
    with next(get_db()) as db:
        monitor = DatabasePerformanceMonitor(db)
        
        all_results = []
        all_results.extend(monitor.test_analytics_queries())
        all_results.extend(monitor.test_booking_queries())
        
        # Create benchmark summary
        click.echo("\n📊 Benchmark Results:")
        click.echo("=" * 60)
        click.echo(f"{'Query Name':<30} {'Avg (ms)':<10} {'P95 (ms)':<10} {'Status':<10}")
        click.echo("=" * 60)
        
        for result in all_results:
            status = ('✅ EXCELLENT' if result.avg_time_ms < 50 else
                     '🟢 GOOD' if result.avg_time_ms < 100 else
                     '🟡 OK' if result.avg_time_ms < 200 else
                     '🔴 SLOW')
            
            click.echo(f"{result.query_name:<30} {result.avg_time_ms:<10.1f} {result.p95_time_ms:<10.1f} {status:<10}")

@cli.command()
def slow_queries():
    """Analyze slow queries"""
    click.echo("🐌 Analyzing Slow Queries...")
    
    with next(get_db()) as db:
        monitor = DatabasePerformanceMonitor(db)
        slow_query_data = monitor.analyze_slow_queries()
        
        if 'error' in slow_query_data:
            click.echo(f"❌ Error: {slow_query_data['error']}")
            return
        
        queries = slow_query_data.get('slow_queries', [])
        if not queries:
            click.echo("✅ No slow queries found!")
            return
        
        click.echo(f"Found {len(queries)} slow queries:")
        for i, query in enumerate(queries[:10], 1):
            click.echo(f"\n{i}. Average time: {query['avg_time_ms']:.1f}ms")
            click.echo(f"   Calls: {query['calls']}")
            click.echo(f"   Query: {query['query']}")

@cli.command()
def index_usage():
    """Check index usage statistics"""
    click.echo("📈 Checking Index Usage...")
    
    with next(get_db()) as db:
        monitor = DatabasePerformanceMonitor(db)
        stats = monitor.check_index_usage()
        
        if not stats:
            click.echo("❌ Could not retrieve index usage statistics")
            return
        
        # Show unused indexes
        unused = [s for s in stats if s.scans < 100]
        if unused:
            click.echo(f"\n⚠️ Found {len(unused)} potentially unused indexes:")
            for stat in unused[:10]:
                click.echo(f"  - {stat.table_name}.{stat.index_name}: {stat.scans} scans, {stat.size_mb:.1f}MB")
        
        # Show most used indexes
        most_used = sorted(stats, key=lambda x: x.scans, reverse=True)[:10]
        click.echo(f"\n✅ Top 10 most used indexes:")
        for stat in most_used:
            click.echo(f"  - {stat.table_name}.{stat.index_name}: {stat.scans:,} scans")

@cli.command()
def all():
    """Run all monitoring tasks"""
    click.echo("🚀 Running All Performance Monitoring Tasks...")
    
    # Run all commands
    from click.testing import CliRunner
    runner = CliRunner()
    
    click.echo("\n1. Performance Monitoring...")
    runner.invoke(monitor)
    
    click.echo("\n2. Validation...")
    runner.invoke(validate)
    
    click.echo("\n3. Benchmark...")
    runner.invoke(benchmark)
    
    click.echo("\n4. Slow Query Analysis...")
    runner.invoke(slow_queries)
    
    click.echo("\n5. Index Usage Analysis...")
    runner.invoke(index_usage)
    
    click.echo("\n✅ All monitoring tasks completed!")

if __name__ == '__main__':
    cli()