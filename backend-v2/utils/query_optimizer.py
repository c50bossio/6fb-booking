"""
Query Optimization Utilities

This module provides utilities for optimizing database queries,
identifying slow queries, and suggesting improvements.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
import logging
import time
from functools import wraps

logger = logging.getLogger(__name__)


class QueryOptimizer:
    """Database query optimization utilities"""
    
    @staticmethod
    def analyze_query_plan(db: Session, query: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Analyze query execution plan (PostgreSQL specific)
        
        Args:
            db: Database session
            query: SQL query to analyze
            params: Query parameters
            
        Returns:
            Dictionary containing query plan analysis
        """
        try:
            # Use EXPLAIN ANALYZE for detailed execution statistics
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
            
            result = db.execute(text(explain_query), params or {})
            plan_data = result.scalar()
            
            # Extract key metrics from the plan
            if plan_data and isinstance(plan_data, list) and len(plan_data) > 0:
                plan = plan_data[0]
                
                return {
                    "execution_time_ms": plan.get("Execution Time", 0),
                    "planning_time_ms": plan.get("Planning Time", 0),
                    "total_time_ms": plan.get("Execution Time", 0) + plan.get("Planning Time", 0),
                    "rows_returned": plan.get("Plan", {}).get("Actual Rows", 0),
                    "plan": plan
                }
            
            return {"error": "Unable to parse query plan"}
            
        except Exception as e:
            logger.error(f"Error analyzing query plan: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def get_missing_indexes_suggestions(db: Session) -> List[Dict[str, Any]]:
        """
        Get suggestions for missing indexes (PostgreSQL specific)
        
        Returns:
            List of suggested indexes
        """
        try:
            # Query to find tables with sequential scans that might benefit from indexes
            query = text("""
                SELECT 
                    schemaname,
                    tablename,
                    seq_scan,
                    seq_tup_read,
                    idx_scan,
                    idx_tup_fetch,
                    CASE 
                        WHEN seq_scan + idx_scan > 0 
                        THEN ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
                        ELSE 0
                    END as index_usage_percent
                FROM pg_stat_user_tables
                WHERE seq_scan > 100  -- Only consider tables with significant sequential scans
                    AND seq_tup_read > 10000  -- And significant data reads
                ORDER BY seq_tup_read DESC
                LIMIT 20
            """)
            
            results = db.execute(query).fetchall()
            
            suggestions = []
            for row in results:
                if row.index_usage_percent < 50:  # Low index usage
                    suggestions.append({
                        "table": f"{row.schemaname}.{row.tablename}",
                        "sequential_scans": row.seq_scan,
                        "sequential_reads": row.seq_tup_read,
                        "index_scans": row.idx_scan,
                        "index_usage_percent": row.index_usage_percent,
                        "recommendation": "Consider adding indexes to frequently queried columns"
                    })
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error getting index suggestions: {e}")
            return []
    
    @staticmethod
    def get_slow_queries(db: Session, min_duration_ms: int = 1000) -> List[Dict[str, Any]]:
        """
        Get slow queries from PostgreSQL statistics
        
        Args:
            db: Database session
            min_duration_ms: Minimum query duration to consider slow
            
        Returns:
            List of slow queries
        """
        try:
            query = text("""
                SELECT 
                    query,
                    calls,
                    mean_exec_time as mean_time_ms,
                    max_exec_time as max_time_ms,
                    total_exec_time as total_time_ms,
                    stddev_exec_time as stddev_time_ms
                FROM pg_stat_statements
                WHERE mean_exec_time > :min_duration
                ORDER BY mean_exec_time DESC
                LIMIT 20
            """)
            
            results = db.execute(query, {"min_duration": min_duration_ms}).fetchall()
            
            slow_queries = []
            for row in results:
                slow_queries.append({
                    "query": row.query[:200] + "..." if len(row.query) > 200 else row.query,
                    "calls": row.calls,
                    "mean_time_ms": round(row.mean_time_ms, 2),
                    "max_time_ms": round(row.max_time_ms, 2),
                    "total_time_ms": round(row.total_time_ms, 2),
                    "stddev_time_ms": round(row.stddev_time_ms, 2)
                })
            
            return slow_queries
            
        except Exception as e:
            logger.error(f"Error getting slow queries: {e}")
            # pg_stat_statements might not be enabled
            return []
    
    @staticmethod
    def get_table_statistics(db: Session, table_name: str) -> Dict[str, Any]:
        """
        Get detailed statistics for a specific table
        
        Args:
            db: Database session
            table_name: Name of the table
            
        Returns:
            Dictionary containing table statistics
        """
        try:
            # Get table size and row count
            size_query = text("""
                SELECT 
                    pg_size_pretty(pg_total_relation_size(:table)) as total_size,
                    pg_size_pretty(pg_relation_size(:table)) as table_size,
                    pg_size_pretty(pg_indexes_size(:table)) as indexes_size,
                    (SELECT COUNT(*) FROM :table) as row_count
            """)
            
            # Get index information
            index_query = text("""
                SELECT 
                    indexname,
                    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size,
                    idx_scan as scans,
                    idx_tup_read as tuples_read,
                    idx_tup_fetch as tuples_fetched
                FROM pg_stat_user_indexes
                WHERE tablename = :table
                ORDER BY idx_scan DESC
            """)
            
            # Note: Direct table name substitution in COUNT query won't work with parameters
            # This is a limitation - in production, use dynamic SQL carefully
            
            stats = {
                "table_name": table_name,
                "indexes": []
            }
            
            # Get index stats
            index_results = db.execute(index_query, {"table": table_name}).fetchall()
            for idx in index_results:
                stats["indexes"].append({
                    "name": idx.indexname,
                    "size": idx.index_size,
                    "scans": idx.scans,
                    "tuples_read": idx.tuples_read,
                    "tuples_fetched": idx.tuples_fetched
                })
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting table statistics: {e}")
            return {"error": str(e)}


def measure_query_time(func):
    """
    Decorator to measure query execution time
    
    Usage:
        @measure_query_time
        def get_user_data(db: Session, user_id: int):
            return db.query(User).filter(User.id == user_id).first()
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        if execution_time > 100:  # Log slow queries (> 100ms)
            logger.warning(
                f"Slow query detected: {func.__name__} took {execution_time:.2f}ms"
            )
        else:
            logger.debug(
                f"Query {func.__name__} executed in {execution_time:.2f}ms"
            )
        
        return result
    
    return wrapper


class QueryBuilder:
    """
    Helper class for building optimized queries
    """
    
    @staticmethod
    def build_pagination_query(
        base_query: str,
        order_by: str,
        limit: int = 50,
        offset: int = 0
    ) -> str:
        """
        Build a paginated query with proper ordering
        
        Args:
            base_query: Base SQL query
            order_by: Column to order by
            limit: Number of results per page
            offset: Number of results to skip
            
        Returns:
            Paginated SQL query
        """
        return f"""
        {base_query}
        ORDER BY {order_by}
        LIMIT {limit}
        OFFSET {offset}
        """
    
    @staticmethod
    def build_date_range_condition(
        column: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> str:
        """
        Build optimized date range condition
        
        Args:
            column: Date column name
            start_date: Start date (inclusive)
            end_date: End date (inclusive)
            
        Returns:
            SQL WHERE clause for date range
        """
        conditions = []
        
        if start_date:
            conditions.append(f"{column} >= :start_date")
        
        if end_date:
            conditions.append(f"{column} <= :end_date")
        
        return " AND ".join(conditions) if conditions else "1=1"