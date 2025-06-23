"""
Query Optimization Service for Database Performance Monitoring
"""

import time
import logging
import functools
from typing import Any, Callable, Dict, List, Optional
from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from contextlib import contextmanager
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class QueryPerformanceMonitor:
    """Monitor database query performance and identify optimization opportunities."""
    
    def __init__(self):
        self.slow_queries: List[Dict[str, Any]] = []
        self.query_stats: Dict[str, Dict[str, Any]] = {}
        self.n_plus_1_detector = NPlusOneDetector()
        self.slow_query_threshold = 1.0  # seconds
        
    def log_slow_query(self, duration: float, query: str, params: Any = None):
        """Log queries that exceed the slow query threshold."""
        if duration >= self.slow_query_threshold:
            slow_query = {
                'timestamp': datetime.utcnow().isoformat(),
                'duration': duration,
                'query': query,
                'params': str(params) if params else None,
                'severity': 'high' if duration > 5.0 else 'medium'
            }
            self.slow_queries.append(slow_query)
            logger.warning(f"Slow query detected: {duration:.3f}s - {query[:100]}...")
            
    def update_query_stats(self, query_hash: str, duration: float):
        """Update running statistics for query patterns."""
        if query_hash not in self.query_stats:
            self.query_stats[query_hash] = {
                'count': 0,
                'total_time': 0.0,
                'min_time': float('inf'),
                'max_time': 0.0,
                'avg_time': 0.0
            }
            
        stats = self.query_stats[query_hash]
        stats['count'] += 1
        stats['total_time'] += duration
        stats['min_time'] = min(stats['min_time'], duration)
        stats['max_time'] = max(stats['max_time'], duration)
        stats['avg_time'] = stats['total_time'] / stats['count']
        
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate a performance report with optimization recommendations."""
        total_queries = sum(stats['count'] for stats in self.query_stats.values())
        slow_query_count = len(self.slow_queries)
        
        # Find most frequent queries
        top_queries = sorted(
            self.query_stats.items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )[:10]
        
        # Find slowest average queries
        slowest_queries = sorted(
            self.query_stats.items(),
            key=lambda x: x[1]['avg_time'],
            reverse=True
        )[:10]
        
        recommendations = self._generate_recommendations()
        
        return {
            'summary': {
                'total_queries': total_queries,
                'slow_queries': slow_query_count,
                'average_query_time': sum(s['avg_time'] for s in self.query_stats.values()) / len(self.query_stats) if self.query_stats else 0,
                'n_plus_1_issues': len(self.n_plus_1_detector.detected_issues)
            },
            'top_frequent_queries': [
                {
                    'hash': hash_val,
                    'count': stats['count'],
                    'avg_time': stats['avg_time'],
                    'total_time': stats['total_time']
                }
                for hash_val, stats in top_queries
            ],
            'slowest_queries': [
                {
                    'hash': hash_val,
                    'avg_time': stats['avg_time'],
                    'max_time': stats['max_time'],
                    'count': stats['count']
                }
                for hash_val, stats in slowest_queries
            ],
            'recent_slow_queries': self.slow_queries[-20:],  # Last 20 slow queries
            'n_plus_1_issues': self.n_plus_1_detector.get_issues(),
            'recommendations': recommendations
        }
        
    def _generate_recommendations(self) -> List[Dict[str, str]]:
        """Generate optimization recommendations based on collected data."""
        recommendations = []
        
        # Check for excessive query counts
        if any(stats['count'] > 100 for stats in self.query_stats.values()):
            recommendations.append({
                'type': 'high_frequency',
                'title': 'High Frequency Queries Detected',
                'description': 'Some queries are being executed very frequently. Consider caching or query optimization.',
                'action': 'Review top frequent queries and implement caching where appropriate.'
            })
            
        # Check for slow queries
        if len(self.slow_queries) > 10:
            recommendations.append({
                'type': 'slow_queries',
                'title': 'Multiple Slow Queries Detected',
                'description': f'Found {len(self.slow_queries)} queries exceeding {self.slow_query_threshold}s threshold.',
                'action': 'Add database indexes, optimize WHERE clauses, or implement eager loading.'
            })
            
        # Check for N+1 issues
        if self.n_plus_1_detector.detected_issues:
            recommendations.append({
                'type': 'n_plus_1',
                'title': 'N+1 Query Problems Detected',
                'description': f'Found {len(self.n_plus_1_detector.detected_issues)} potential N+1 query issues.',
                'action': 'Implement eager loading with joinedload() or selectinload() in SQLAlchemy queries.'
            })
            
        return recommendations


class NPlusOneDetector:
    """Detect N+1 query patterns in database operations."""
    
    def __init__(self):
        self.query_patterns: List[str] = []
        self.detected_issues: List[Dict[str, Any]] = []
        self.pattern_window = 50  # Look at last 50 queries
        
    def analyze_query(self, query: str):
        """Analyze a query for N+1 patterns."""
        self.query_patterns.append(query)
        
        # Keep only recent queries
        if len(self.query_patterns) > self.pattern_window:
            self.query_patterns = self.query_patterns[-self.pattern_window:]
            
        # Look for N+1 patterns
        self._detect_n_plus_1_pattern()
        
    def _detect_n_plus_1_pattern(self):
        """Detect if recent queries show N+1 pattern."""
        if len(self.query_patterns) < 10:
            return
            
        # Look for SELECT queries followed by multiple similar SELECT queries
        recent_queries = self.query_patterns[-10:]
        
        # Simple pattern detection: multiple similar queries in sequence
        similar_count = 1
        base_query = self._normalize_query(recent_queries[0])
        
        for query in recent_queries[1:]:
            normalized = self._normalize_query(query)
            if self._queries_similar(base_query, normalized):
                similar_count += 1
            else:
                break
                
        # If we found 3+ similar queries in a row, it might be N+1
        if similar_count >= 3:
            issue = {
                'timestamp': datetime.utcnow().isoformat(),
                'pattern': base_query,
                'count': similar_count,
                'severity': 'high' if similar_count > 5 else 'medium'
            }
            self.detected_issues.append(issue)
            logger.warning(f"Potential N+1 query detected: {similar_count} similar queries")
            
    def _normalize_query(self, query: str) -> str:
        """Normalize query by removing specific values."""
        # Remove specific IDs and values to identify patterns
        import re
        normalized = re.sub(r'\b\d+\b', '?', query)  # Replace numbers with ?
        normalized = re.sub(r"'[^']*'", '?', normalized)  # Replace string literals
        normalized = re.sub(r'\s+', ' ', normalized)  # Normalize whitespace
        return normalized.strip()
        
    def _queries_similar(self, query1: str, query2: str) -> bool:
        """Check if two normalized queries are similar."""
        return query1 == query2
        
    def get_issues(self) -> List[Dict[str, Any]]:
        """Get detected N+1 issues."""
        return self.detected_issues[-20:]  # Return last 20 issues


# Global monitor instance
query_monitor = QueryPerformanceMonitor()


@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log query start time."""
    context._query_start_time = time.time()


@event.listens_for(Engine, "after_cursor_execute")  
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log query completion and analyze performance."""
    if hasattr(context, '_query_start_time'):
        duration = time.time() - context._query_start_time
        
        # Log slow queries
        query_monitor.log_slow_query(duration, statement, parameters)
        
        # Update query statistics
        query_hash = hash(statement)
        query_monitor.update_query_stats(str(query_hash), duration)
        
        # Analyze for N+1 patterns
        query_monitor.n_plus_1_detector.analyze_query(statement)


def query_performance_decorator(threshold: float = 1.0):
    """Decorator to monitor individual function query performance."""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                if duration > threshold:
                    logger.warning(
                        f"Slow function detected: {func.__name__} took {duration:.3f}s"
                    )
                    
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    f"Function {func.__name__} failed after {duration:.3f}s: {e}"
                )
                raise
        return wrapper
    return decorator


@contextmanager
def query_performance_context(operation_name: str):
    """Context manager for monitoring query performance in code blocks."""
    start_time = time.time()
    logger.info(f"Starting operation: {operation_name}")
    
    try:
        yield
        duration = time.time() - start_time
        logger.info(f"Completed operation: {operation_name} in {duration:.3f}s")
        
        if duration > 2.0:  # Log operations taking more than 2 seconds
            logger.warning(f"Slow operation: {operation_name} took {duration:.3f}s")
            
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Operation {operation_name} failed after {duration:.3f}s: {e}")
        raise


class DatabaseOptimizer:
    """Provides database optimization utilities and analysis."""
    
    @staticmethod
    def analyze_table_stats(db: Session, table_name: str) -> Dict[str, Any]:
        """Analyze table statistics for optimization opportunities."""
        try:
            # Get table size
            size_query = text(f"""
                SELECT 
                    COUNT(*) as row_count,
                    pg_size_pretty(pg_total_relation_size('{table_name}')) as table_size
                FROM {table_name}
            """)
            size_result = db.execute(size_query).fetchone()
            
            # Get index usage
            index_query = text(f"""
                SELECT 
                    indexname,
                    idx_scan as index_scans,
                    idx_tup_read as tuples_read
                FROM pg_stat_user_indexes 
                WHERE relname = '{table_name}'
            """)
            index_results = db.execute(index_query).fetchall()
            
            return {
                'table_name': table_name,
                'row_count': size_result.row_count if size_result else 0,
                'table_size': size_result.table_size if size_result else 'Unknown',
                'indexes': [
                    {
                        'name': idx.indexname,
                        'scans': idx.index_scans,
                        'tuples_read': idx.tuples_read
                    }
                    for idx in index_results
                ]
            }
        except Exception as e:
            logger.error(f"Error analyzing table {table_name}: {e}")
            return {'table_name': table_name, 'error': str(e)}
    
    @staticmethod
    def suggest_indexes(db: Session) -> List[Dict[str, str]]:
        """Suggest missing indexes based on query patterns."""
        suggestions = []
        
        # Common index suggestions based on 6FB booking patterns
        common_suggestions = [
            {
                'table': 'appointments',
                'columns': ['barber_id', 'appointment_date'],
                'reason': 'Frequently queried together for barber schedules'
            },
            {
                'table': 'appointments', 
                'columns': ['client_id', 'status'],
                'reason': 'Client appointment history queries'
            },
            {
                'table': 'clients',
                'columns': ['barber_id', 'customer_type'],
                'reason': 'Client filtering and analytics'
            },
            {
                'table': 'appointments',
                'columns': ['appointment_date', 'status'],
                'reason': 'Daily appointment queries'
            }
        ]
        
        # Check if indexes exist
        for suggestion in common_suggestions:
            try:
                # Check if composite index exists (simplified check)
                index_check = text(f"""
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = '{suggestion['table']}'
                    AND indexdef LIKE '%{suggestion['columns'][0]}%'
                    AND indexdef LIKE '%{suggestion['columns'][1]}%'
                """)
                result = db.execute(index_check).fetchone()
                
                if not result:
                    suggestions.append({
                        'table': suggestion['table'],
                        'index_name': f"idx_{suggestion['table']}_{'_'.join(suggestion['columns'])}",
                        'columns': suggestion['columns'],
                        'reason': suggestion['reason'],
                        'sql': f"CREATE INDEX idx_{suggestion['table']}_{'_'.join(suggestion['columns'])} ON {suggestion['table']} ({', '.join(suggestion['columns'])})"
                    })
                    
            except Exception as e:
                logger.error(f"Error checking index for {suggestion['table']}: {e}")
                
        return suggestions


def get_query_performance_report() -> Dict[str, Any]:
    """Get current query performance report."""
    return query_monitor.get_performance_report()


def reset_query_monitoring():
    """Reset query monitoring statistics (useful for testing)."""
    global query_monitor
    query_monitor = QueryPerformanceMonitor()