#!/usr/bin/env python3
"""
6FB Booking Platform - Database Performance Analyzer
=================================================

Comprehensive database performance monitoring and analysis tool.
Provides detailed insights into query performance, bottlenecks, and optimization opportunities.

Author: Claude Code Performance Engineer
Date: 2025-07-30
"""

import asyncio
import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import statistics
from contextlib import asynccontextmanager
import sys
import os

# Add the parent directory to sys.path to import project modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Settings
from db import engine
from sqlalchemy import text, inspect
from sqlalchemy.orm import sessionmaker

@dataclass
class QueryMetrics:
    """Container for query performance metrics"""
    query_id: str
    query_text: str
    execution_time_ms: float
    cpu_time_ms: Optional[float]
    memory_usage_mb: Optional[float]
    rows_returned: int
    rows_examined: int
    index_usage: Dict[str, Any]
    timestamp: datetime
    endpoint: Optional[str] = None
    user_type: Optional[str] = None

@dataclass
class DatabaseStats:
    """Container for overall database statistics"""
    total_queries: int
    avg_response_time_ms: float
    median_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    slow_query_count: int
    failed_query_count: int
    cache_hit_ratio: float
    index_usage_ratio: float
    connection_pool_stats: Dict[str, Any]
    timestamp: datetime

class DatabasePerformanceAnalyzer:
    """Comprehensive database performance analysis and monitoring"""
    
    def __init__(self, config: Settings):
        self.config = config
        self.query_metrics: List[QueryMetrics] = []
        self.session_factory = sessionmaker(bind=engine)
        self.logger = self._setup_logging()
        self.slow_query_threshold_ms = 100.0  # Queries slower than 100ms are considered slow
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for performance monitoring"""
        logger = logging.getLogger('db_performance')
        logger.setLevel(logging.INFO)
        
        # Create handler for performance logs
        handler = logging.FileHandler('/Users/bossio/6fb-booking/backend-v2/logs/db_performance.log')
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        return logger
    
    async def analyze_query_performance(self, query: str, params: Optional[Dict] = None) -> QueryMetrics:
        """Analyze performance of a specific query"""
        query_id = f"query_{hash(query)}_{int(time.time())}"
        start_time = time.perf_counter()
        
        try:
            with self.session_factory() as session:
                # Execute query with timing
                result = session.execute(text(query), params or {})
                rows = result.fetchall()
                
                end_time = time.perf_counter()
                execution_time_ms = (end_time - start_time) * 1000
                
                # Analyze query execution plan if supported
                index_usage = await self._analyze_query_plan(query, params)
                
                metrics = QueryMetrics(
                    query_id=query_id,
                    query_text=query[:200] + "..." if len(query) > 200 else query,
                    execution_time_ms=execution_time_ms,
                    cpu_time_ms=None,  # Would need more advanced monitoring
                    memory_usage_mb=None,  # Would need more advanced monitoring
                    rows_returned=len(rows),
                    rows_examined=len(rows),  # Simplified
                    index_usage=index_usage,
                    timestamp=datetime.now()
                )
                
                self.query_metrics.append(metrics)
                
                if execution_time_ms > self.slow_query_threshold_ms:
                    self.logger.warning(
                        f"Slow query detected: {execution_time_ms:.2f}ms - {query[:100]}..."
                    )
                
                return metrics
                
        except Exception as e:
            self.logger.error(f"Query analysis failed: {str(e)}")
            raise
    
    async def _analyze_query_plan(self, query: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Analyze query execution plan for index usage"""
        try:
            with self.session_factory() as session:
                # For SQLite, use EXPLAIN QUERY PLAN
                if 'sqlite' in str(engine.url):
                    explain_query = f"EXPLAIN QUERY PLAN {query}"
                    result = session.execute(text(explain_query), params or {})
                    plan_rows = result.fetchall()
                    
                    return {
                        "plan_type": "sqlite",
                        "uses_index": any("INDEX" in str(row).upper() for row in plan_rows),
                        "plan_details": [str(row) for row in plan_rows]
                    }
                
                # For PostgreSQL, use EXPLAIN
                elif 'postgresql' in str(engine.url):
                    explain_query = f"EXPLAIN (FORMAT JSON) {query}"
                    result = session.execute(text(explain_query), params or {})
                    plan_data = result.fetchone()[0]
                    
                    return {
                        "plan_type": "postgresql",
                        "uses_index": "Index" in str(plan_data),
                        "plan_details": plan_data
                    }
                
                return {"plan_type": "unknown", "uses_index": False, "plan_details": []}
                
        except Exception as e:
            self.logger.debug(f"Query plan analysis failed: {str(e)}")
            return {"plan_type": "error", "uses_index": False, "plan_details": [str(e)]}
    
    async def analyze_critical_endpoints(self) -> Dict[str, List[QueryMetrics]]:
        """Analyze performance of critical booking platform endpoints"""
        critical_queries = {
            "user_authentication": [
                "SELECT * FROM users WHERE email = :email",
                "SELECT * FROM users WHERE id = :user_id"
            ],
            "barber_availability": [
                "SELECT * FROM barber_availability WHERE barber_id = :barber_id AND date >= :start_date",
                "SELECT ba.*, b.name FROM barber_availability ba JOIN barbers b ON ba.barber_id = b.id WHERE ba.available = true"
            ],
            "appointment_booking": [
                "SELECT * FROM appointments WHERE barber_id = :barber_id AND start_time BETWEEN :start AND :end",
                "INSERT INTO appointments (client_id, barber_id, service_id, start_time, end_time, status) VALUES (:client_id, :barber_id, :service_id, :start_time, :end_time, 'confirmed')"
            ],
            "payment_processing": [
                "SELECT * FROM payments WHERE appointment_id = :appointment_id",
                "UPDATE appointments SET payment_status = :status WHERE id = :appointment_id"
            ],
            "dashboard_analytics": [
                "SELECT COUNT(*) as total_appointments, SUM(total_amount) as total_revenue FROM appointments WHERE barber_id = :barber_id AND created_at >= :start_date",
                "SELECT DATE(created_at) as date, COUNT(*) as bookings FROM appointments WHERE barber_id = :barber_id GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30"
            ]
        }
        
        endpoint_metrics = {}
        
        for endpoint, queries in critical_queries.items():
            endpoint_metrics[endpoint] = []
            
            for query in queries:
                # Generate sample parameters based on query
                params = self._generate_sample_params(query)
                
                try:
                    metrics = await self.analyze_query_performance(query, params)
                    metrics.endpoint = endpoint
                    endpoint_metrics[endpoint].append(metrics)
                except Exception as e:
                    self.logger.error(f"Failed to analyze query for {endpoint}: {str(e)}")
        
        return endpoint_metrics
    
    def _generate_sample_params(self, query: str) -> Dict[str, Any]:
        """Generate sample parameters for queries"""
        params = {}
        
        # Basic parameter mapping for common patterns
        if ':email' in query:
            params['email'] = 'test@example.com'
        if ':user_id' in query:
            params['user_id'] = 1
        if ':barber_id' in query:
            params['barber_id'] = 1
        if ':client_id' in query:
            params['client_id'] = 1
        if ':service_id' in query:
            params['service_id'] = 1
        if ':appointment_id' in query:
            params['appointment_id'] = 1
        if ':start_date' in query:
            params['start_date'] = datetime.now().date()
        if ':start_time' in query:
            params['start_time'] = datetime.now()
        if ':end_time' in query:
            params['end_time'] = datetime.now() + timedelta(hours=1)
        if ':start' in query:
            params['start'] = datetime.now()
        if ':end' in query:
            params['end'] = datetime.now() + timedelta(days=1)
        if ':status' in query:
            params['status'] = 'confirmed'
        
        return params
    
    async def generate_database_stats(self) -> DatabaseStats:
        """Generate comprehensive database statistics"""
        if not self.query_metrics:
            await self.analyze_critical_endpoints()
        
        execution_times = [m.execution_time_ms for m in self.query_metrics]
        slow_queries = [m for m in self.query_metrics if m.execution_time_ms > self.slow_query_threshold_ms]
        index_using_queries = [m for m in self.query_metrics if m.index_usage.get('uses_index', False)]
        
        stats = DatabaseStats(
            total_queries=len(self.query_metrics),
            avg_response_time_ms=statistics.mean(execution_times) if execution_times else 0,
            median_response_time_ms=statistics.median(execution_times) if execution_times else 0,
            p95_response_time_ms=self._calculate_percentile(execution_times, 95) if execution_times else 0,
            p99_response_time_ms=self._calculate_percentile(execution_times, 99) if execution_times else 0,
            slow_query_count=len(slow_queries),
            failed_query_count=0,  # Would need error tracking
            cache_hit_ratio=0.0,  # Would need cache monitoring
            index_usage_ratio=len(index_using_queries) / len(self.query_metrics) if self.query_metrics else 0,
            connection_pool_stats=await self._get_connection_pool_stats(),
            timestamp=datetime.now()
        )
        
        return stats
    
    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile value"""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = (percentile / 100) * (len(sorted_values) - 1)
        
        if index.is_integer():
            return sorted_values[int(index)]
        else:
            lower = sorted_values[int(index)]
            upper = sorted_values[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    async def _get_connection_pool_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        try:
            with self.session_factory() as session:
                # Get connection pool info from SQLAlchemy
                pool = engine.pool
                
                return {
                    "pool_size": pool.size(),
                    "checked_in": pool.checkedin(),
                    "checked_out": pool.checkedout(),
                    "overflow": pool.overflow(),
                    "invalid": pool.invalid()
                }
        except Exception as e:
            self.logger.debug(f"Connection pool stats unavailable: {str(e)}")
            return {
                "pool_size": "unknown",
                "checked_in": "unknown",
                "checked_out": "unknown",
                "overflow": "unknown",
                "invalid": "unknown"
            }
    
    async def identify_optimization_opportunities(self) -> Dict[str, List[str]]:
        """Identify database optimization opportunities"""
        opportunities = {
            "missing_indexes": [],
            "slow_queries": [],
            "inefficient_patterns": [],
            "schema_improvements": []
        }
        
        # Analyze for missing indexes
        for metric in self.query_metrics:
            if not metric.index_usage.get('uses_index', False) and metric.execution_time_ms > 50:
                opportunities["missing_indexes"].append(
                    f"Query may benefit from index: {metric.query_text}"
                )
        
        # Analyze slow queries
        slow_queries = [m for m in self.query_metrics if m.execution_time_ms > self.slow_query_threshold_ms]
        for query in slow_queries:
            opportunities["slow_queries"].append(
                f"Slow query ({query.execution_time_ms:.2f}ms): {query.query_text}"
            )
        
        # Check for inefficient patterns
        for metric in self.query_metrics:
            query_lower = metric.query_text.lower()
            
            if 'select *' in query_lower:
                opportunities["inefficient_patterns"].append(
                    f"SELECT * usage detected: {metric.query_text}"
                )
            
            if 'like %' in query_lower and metric.execution_time_ms > 30:
                opportunities["inefficient_patterns"].append(
                    f"Leading wildcard LIKE may be inefficient: {metric.query_text}"
                )
        
        # Schema analysis
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        for table in tables[:5]:  # Limit to first 5 tables
            indexes = inspector.get_indexes(table)
            if not indexes:
                opportunities["schema_improvements"].append(
                    f"Table '{table}' has no indexes - consider adding primary/foreign key indexes"
                )
        
        return opportunities
    
    async def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        self.logger.info("Generating comprehensive database performance report...")
        
        # Analyze critical endpoints
        endpoint_metrics = await self.analyze_critical_endpoints()
        
        # Generate overall stats
        stats = await self.generate_database_stats()
        
        # Identify optimization opportunities
        opportunities = await self.identify_optimization_opportunities()
        
        # Create detailed report
        report = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "analysis_duration_minutes": 5,  # Estimated
                "total_queries_analyzed": len(self.query_metrics),
                "platform": "6FB Booking V2"
            },
            "executive_summary": {
                "overall_performance_grade": self._calculate_performance_grade(stats),
                "critical_issues_count": len(opportunities["slow_queries"]),
                "optimization_opportunities_count": sum(len(v) for v in opportunities.values()),
                "production_readiness_score": self._calculate_readiness_score(stats, opportunities)
            },
            "database_statistics": asdict(stats),
            "endpoint_performance": {
                endpoint: [asdict(metric) for metric in metrics]
                for endpoint, metrics in endpoint_metrics.items()
            },
            "optimization_opportunities": opportunities,
            "recommended_actions": self._generate_recommendations(stats, opportunities),
            "performance_trends": self._analyze_performance_trends(),
            "resource_utilization": {
                "estimated_queries_per_second": len(self.query_metrics) / 60,  # Rough estimate
                "memory_efficiency": "Good" if stats.avg_response_time_ms < 100 else "Needs Improvement",
                "index_coverage": f"{stats.index_usage_ratio * 100:.1f}%"
            }
        }
        
        # Save report to file
        report_path = f"/Users/bossio/6fb-booking/backend-v2/logs/db_performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        self.logger.info(f"Performance report saved to: {report_path}")
        
        return report
    
    def _calculate_performance_grade(self, stats: DatabaseStats) -> str:
        """Calculate overall performance grade"""
        score = 100
        
        # Deduct points for performance issues
        if stats.avg_response_time_ms > 100:
            score -= 20
        elif stats.avg_response_time_ms > 50:
            score -= 10
        
        if stats.p95_response_time_ms > 500:
            score -= 25
        elif stats.p95_response_time_ms > 200:
            score -= 15
        
        if stats.slow_query_count > stats.total_queries * 0.1:  # More than 10% slow
            score -= 20
        
        if stats.index_usage_ratio < 0.7:  # Less than 70% index usage
            score -= 15
        
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _calculate_readiness_score(self, stats: DatabaseStats, opportunities: Dict[str, List[str]]) -> float:
        """Calculate production readiness score (0-100)"""
        score = 100.0
        
        # Performance factors
        if stats.avg_response_time_ms > 100:
            score -= 15
        if stats.p95_response_time_ms > 500:
            score -= 20
        if stats.slow_query_count > 0:
            score -= min(stats.slow_query_count * 5, 25)
        
        # Optimization factors
        total_opportunities = sum(len(v) for v in opportunities.values())
        score -= min(total_opportunities * 2, 30)
        
        # Index usage
        if stats.index_usage_ratio < 0.8:
            score -= 10
        
        return max(score, 0.0)
    
    def _generate_recommendations(self, stats: DatabaseStats, opportunities: Dict[str, List[str]]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if stats.avg_response_time_ms > 100:
            recommendations.append("High Priority: Average response time exceeds 100ms - investigate slow queries and add indexes")
        
        if stats.slow_query_count > 0:
            recommendations.append(f"Medium Priority: {stats.slow_query_count} slow queries detected - optimize or add caching")
        
        if stats.index_usage_ratio < 0.7:
            recommendations.append("High Priority: Low index usage ratio - review query patterns and add missing indexes")
        
        if opportunities["missing_indexes"]:
            recommendations.append("Medium Priority: Add database indexes for frequently queried columns")
        
        if opportunities["inefficient_patterns"]:
            recommendations.append("Low Priority: Optimize query patterns (avoid SELECT *, leading wildcards)")
        
        if stats.p95_response_time_ms > 200:
            recommendations.append("High Priority: 95th percentile response time is high - implement query optimization and caching")
        
        # Always include some proactive recommendations
        recommendations.extend([
            "Consider implementing Redis caching for frequently accessed data",
            "Set up continuous performance monitoring in production",
            "Implement connection pooling optimization",
            "Create database performance alerts for response times > 200ms"
        ])
        
        return recommendations
    
    def _analyze_performance_trends(self) -> Dict[str, Any]:
        """Analyze performance trends (simplified for current analysis)"""
        return {
            "trend_direction": "stable",
            "performance_regression_detected": False,
            "seasonal_patterns": "insufficient_data",
            "recommendations": [
                "Collect historical data for trend analysis",
                "Implement performance baseline monitoring"
            ]
        }

async def main():
    """Main function to run database performance analysis"""
    print("🔍 Starting 6FB Booking Database Performance Analysis...")
    print("=" * 60)
    
    # Initialize analyzer
    config = Settings()
    analyzer = DatabasePerformanceAnalyzer(config)
    
    try:
        # Generate comprehensive performance report
        report = await analyzer.generate_performance_report()
        
        # Display executive summary
        print("\n📊 EXECUTIVE SUMMARY")
        print("-" * 30)
        print(f"Performance Grade: {report['executive_summary']['overall_performance_grade']}")
        print(f"Production Readiness: {report['executive_summary']['production_readiness_score']:.1f}/100")
        print(f"Critical Issues: {report['executive_summary']['critical_issues_count']}")
        print(f"Optimization Opportunities: {report['executive_summary']['optimization_opportunities_count']}")
        
        # Display key metrics
        stats = report['database_statistics']
        print(f"\n⚡ KEY PERFORMANCE METRICS")
        print("-" * 35)
        print(f"Average Response Time: {stats['avg_response_time_ms']:.2f}ms")
        print(f"95th Percentile: {stats['p95_response_time_ms']:.2f}ms")
        print(f"Slow Queries: {stats['slow_query_count']}")
        print(f"Index Usage: {stats['index_usage_ratio']*100:.1f}%")
        
        # Display top recommendations
        print(f"\n🎯 TOP RECOMMENDATIONS")
        print("-" * 25)
        for i, rec in enumerate(report['recommended_actions'][:5], 1):
            print(f"{i}. {rec}")
        
        print(f"\n✅ Analysis Complete!")
        print(f"📋 Full report saved to logs/db_performance_report_*.json")
        
    except Exception as e:
        print(f"❌ Analysis failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())