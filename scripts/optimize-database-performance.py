#!/usr/bin/env python3
"""
BookedBarber V2 - Database Performance Optimization Script
Implements comprehensive database optimization for production scale
Last updated: 2025-07-23
"""

import os
import sys
import time
import json
import logging
import psycopg2
import psycopg2.extras
from datetime import datetime
from typing import Dict, List, Optional
import yaml

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Colors for output
COLORS = {
    'red': '\033[0;31m',
    'green': '\033[0;32m',
    'yellow': '\033[1;33m',
    'blue': '\033[0;34m',
    'purple': '\033[0;35m',
    'cyan': '\033[0;36m',
    'reset': '\033[0m'
}

def log(message: str, color: str = 'blue') -> None:
    """Enhanced logging with colors"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"{COLORS[color]}[{timestamp}] {message}{COLORS['reset']}")
    logger.info(message)

def success(message: str) -> None:
    """Log success message"""
    log(f"✅ {message}", 'green')

def warning(message: str) -> None:
    """Log warning message"""
    log(f"⚠️  {message}", 'yellow')

def error(message: str) -> None:
    """Log error message"""
    log(f"❌ {message}", 'red')

class DatabaseOptimizer:
    """Database performance optimization manager"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.connection = None
        self.optimization_config = self._load_optimization_config()
    
    def _load_optimization_config(self) -> Dict:
        """Load optimization configuration"""
        config_path = "/Users/bossio/6fb-booking/6fb-infrastructure-polish/database/production-database-optimization.yaml"
        
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            warning(f"Configuration file not found: {config_path}")
            return {}
    
    def connect(self) -> None:
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(self.database_url)
            self.connection.autocommit = True
            success("Connected to database")
        except Exception as e:
            error(f"Failed to connect to database: {e}")
            sys.exit(1)
    
    def disconnect(self) -> None:
        """Close database connection"""
        if self.connection:
            self.connection.close()
            success("Disconnected from database")
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> Optional[List]:
        """Execute query and return results"""
        try:
            with self.connection.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                cursor.execute(query, params)
                try:
                    return cursor.fetchall()
                except psycopg2.ProgrammingError:
                    # Query doesn't return results (DDL statements)
                    return None
        except Exception as e:
            error(f"Query execution failed: {e}")
            return None
    
    def analyze_current_performance(self) -> Dict:
        """Analyze current database performance"""
        log("🔍 Analyzing current database performance...")
        
        performance_metrics = {}
        
        # Connection metrics
        query = "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'"
        result = self.execute_query(query)
        performance_metrics['active_connections'] = result[0]['active_connections'] if result else 0
        
        # Cache hit ratio
        query = """
        SELECT 
            round(
                sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0), 2
            ) as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
        """
        result = self.execute_query(query)
        performance_metrics['cache_hit_ratio'] = float(result[0]['cache_hit_ratio']) if result and result[0]['cache_hit_ratio'] else 0
        
        # Database size
        query = "SELECT pg_size_pretty(pg_database_size(current_database())) as database_size"
        result = self.execute_query(query)
        performance_metrics['database_size'] = result[0]['database_size'] if result else "Unknown"
        
        # Slow queries (if pg_stat_statements is enabled)
        query = """
        SELECT 
            count(*) as slow_query_count,
            avg(mean_exec_time) as avg_execution_time
        FROM pg_stat_statements 
        WHERE mean_exec_time > 1000
        """
        try:
            result = self.execute_query(query)
            if result:
                performance_metrics['slow_queries'] = result[0]['slow_query_count']
                performance_metrics['avg_execution_time'] = round(result[0]['avg_execution_time'], 2) if result[0]['avg_execution_time'] else 0
        except:
            performance_metrics['slow_queries'] = "pg_stat_statements not available"
        
        # Lock waits
        query = "SELECT count(*) as lock_waits FROM pg_stat_activity WHERE wait_event_type = 'Lock'"
        result = self.execute_query(query)
        performance_metrics['lock_waits'] = result[0]['lock_waits'] if result else 0
        
        # Table sizes
        query = """
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
        """
        result = self.execute_query(query)
        performance_metrics['largest_tables'] = [dict(row) for row in result] if result else []
        
        success("Performance analysis completed")
        return performance_metrics
    
    def create_performance_indexes(self) -> None:
        """Create optimized indexes for BookedBarber V2"""
        log("📊 Creating performance-optimized indexes...")
        
        indexes = self.optimization_config.get('indexes', {}).get('performance_indexes', [])
        
        for index in indexes:
            try:
                table = index['table']
                columns = index['columns']
                index_type = index.get('type', 'btree')
                name = index['name']
                
                # Check if index already exists
                check_query = """
                SELECT indexname FROM pg_indexes 
                WHERE tablename = %s AND indexname = %s
                """
                existing = self.execute_query(check_query, (table, name))
                
                if existing:
                    log(f"Index {name} already exists, skipping")
                    continue
                
                # Create index
                if index_type == 'unique':
                    create_query = f"CREATE UNIQUE INDEX CONCURRENTLY {name} ON {table} ({', '.join(columns)})"
                else:
                    create_query = f"CREATE INDEX CONCURRENTLY {name} ON {table} USING {index_type} ({', '.join(columns)})"
                
                log(f"Creating index: {name}")
                self.execute_query(create_query)
                success(f"Created index: {name}")
                
            except Exception as e:
                error(f"Failed to create index {name}: {e}")
        
        # Create partial indexes
        partial_indexes = self.optimization_config.get('indexes', {}).get('partial_indexes', [])
        
        for index in partial_indexes:
            try:
                table = index['table']
                columns = index['columns']
                condition = index['condition']
                name = index['name']
                
                # Check if index already exists
                check_query = """
                SELECT indexname FROM pg_indexes 
                WHERE tablename = %s AND indexname = %s
                """
                existing = self.execute_query(check_query, (table, name))
                
                if existing:
                    log(f"Partial index {name} already exists, skipping")
                    continue
                
                # Create partial index
                create_query = f"CREATE INDEX CONCURRENTLY {name} ON {table} ({', '.join(columns)}) WHERE {condition}"
                
                log(f"Creating partial index: {name}")
                self.execute_query(create_query)
                success(f"Created partial index: {name}")
                
            except Exception as e:
                error(f"Failed to create partial index {name}: {e}")
        
        success("Index creation completed")
    
    def optimize_postgresql_config(self) -> None:
        """Apply PostgreSQL configuration optimizations"""
        log("⚙️  Optimizing PostgreSQL configuration...")
        
        config = self.optimization_config.get('database_config', {}).get('postgresql_config', {})
        
        optimizations = [
            # Memory settings
            ("shared_buffers", config.get('shared_buffers', '4GB')),
            ("effective_cache_size", config.get('effective_cache_size', '12GB')),
            ("work_mem", config.get('work_mem', '32MB')),
            ("maintenance_work_mem", config.get('maintenance_work_mem', '1GB')),
            
            # Checkpoint settings
            ("checkpoint_completion_target", config.get('checkpoint_completion_target', 0.9)),
            ("checkpoint_timeout", config.get('checkpoint_timeout', '15min')),
            ("max_wal_size", config.get('max_wal_size', '4GB')),
            ("min_wal_size", config.get('min_wal_size', '1GB')),
            
            # Query planner settings
            ("random_page_cost", config.get('random_page_cost', 1.1)),
            ("effective_io_concurrency", config.get('effective_io_concurrency', 200)),
            
            # Logging settings
            ("log_min_duration_statement", config.get('log_min_duration_statement', 1000)),
            ("log_checkpoints", config.get('log_checkpoints', 'on')),
            ("log_lock_waits", config.get('log_lock_waits', 'on')),
            
            # Auto-vacuum settings
            ("autovacuum_naptime", config.get('autovacuum_naptime', '30s')),
            ("autovacuum_max_workers", config.get('autovacuum_max_workers', 4)),
        ]
        
        for setting, value in optimizations:
            try:
                # Check current value
                check_query = f"SELECT setting FROM pg_settings WHERE name = '{setting}'"
                current = self.execute_query(check_query)
                current_value = current[0]['setting'] if current else 'unknown'
                
                # Apply new setting
                alter_query = f"ALTER SYSTEM SET {setting} = '{value}'"
                self.execute_query(alter_query)
                
                log(f"Set {setting}: {current_value} → {value}")
                
            except Exception as e:
                warning(f"Failed to set {setting}: {e}")
        
        # Reload configuration
        try:
            self.execute_query("SELECT pg_reload_conf()")
            success("PostgreSQL configuration reloaded")
        except Exception as e:
            error(f"Failed to reload configuration: {e}")
        
        success("PostgreSQL configuration optimization completed")
    
    def analyze_and_vacuum_tables(self) -> None:
        """Analyze and vacuum tables for optimal performance"""
        log("🧹 Running ANALYZE and VACUUM on tables...")
        
        # Get list of all tables
        query = """
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
        """
        tables = self.execute_query(query)
        
        if not tables:
            warning("No tables found to optimize")
            return
        
        for table in tables:
            table_name = f"{table['schemaname']}.{table['tablename']}"
            
            try:
                # ANALYZE table
                log(f"Analyzing table: {table['tablename']}")
                self.execute_query(f"ANALYZE {table_name}")
                
                # VACUUM table (non-blocking)
                log(f"Vacuuming table: {table['tablename']}")
                self.execute_query(f"VACUUM {table_name}")
                
                success(f"Optimized table: {table['tablename']}")
                
            except Exception as e:
                error(f"Failed to optimize table {table['tablename']}: {e}")
        
        success("Table analysis and vacuum completed")
    
    def setup_monitoring_queries(self) -> None:
        """Set up monitoring queries and views"""
        log("📈 Setting up database monitoring...")
        
        # Create monitoring view for performance metrics
        monitoring_view = """
        CREATE OR REPLACE VIEW performance_metrics AS
        SELECT 
            'active_connections'::text as metric,
            count(*)::text as value,
            NOW() as timestamp
        FROM pg_stat_activity WHERE state = 'active'
        
        UNION ALL
        
        SELECT 
            'cache_hit_ratio'::text as metric,
            round(
                sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0), 2
            )::text as value,
            NOW() as timestamp
        FROM pg_stat_database
        WHERE datname = current_database()
        
        UNION ALL
        
        SELECT 
            'database_size_mb'::text as metric,
            round(pg_database_size(current_database())::numeric / 1024 / 1024, 2)::text as value,
            NOW() as timestamp
        
        UNION ALL
        
        SELECT 
            'lock_waits'::text as metric,
            count(*)::text as value,
            NOW() as timestamp
        FROM pg_stat_activity WHERE wait_event_type = 'Lock'
        """
        
        try:
            self.execute_query(monitoring_view)
            success("Created performance monitoring view")
        except Exception as e:
            error(f"Failed to create monitoring view: {e}")
        
        # Create function to get top slow queries
        slow_queries_function = """
        CREATE OR REPLACE FUNCTION get_slow_queries(limit_count INTEGER DEFAULT 10)
        RETURNS TABLE(
            query_text TEXT,
            calls BIGINT,
            total_time DOUBLE PRECISION,
            mean_time DOUBLE PRECISION,
            rows_per_call DOUBLE PRECISION
        ) AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                query,
                calls,
                total_exec_time,
                mean_exec_time,
                rows / NULLIF(calls, 0) as rows_per_call
            FROM pg_stat_statements
            WHERE mean_exec_time > 100  -- Only queries taking more than 100ms
            ORDER BY mean_exec_time DESC
            LIMIT limit_count;
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'pg_stat_statements extension not available';
                RETURN;
        END;
        $$ LANGUAGE plpgsql;
        """
        
        try:
            self.execute_query(slow_queries_function)
            success("Created slow queries monitoring function")
        except Exception as e:
            warning(f"Failed to create slow queries function: {e}")
        
        success("Database monitoring setup completed")
    
    def create_backup_and_maintenance_procedures(self) -> None:
        """Create stored procedures for backup and maintenance"""
        log("🔧 Creating maintenance procedures...")
        
        # Create maintenance procedure
        maintenance_procedure = """
        CREATE OR REPLACE FUNCTION run_maintenance()
        RETURNS TEXT AS $$
        DECLARE
            result TEXT := '';
            table_name TEXT;
        BEGIN
            -- Update statistics
            ANALYZE;
            result := result || 'Statistics updated. ';
            
            -- Vacuum critical tables
            FOR table_name IN 
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename IN ('appointments', 'payments', 'users', 'user_sessions')
            LOOP
                EXECUTE 'VACUUM ANALYZE ' || table_name;
                result := result || 'Vacuumed ' || table_name || '. ';
            END LOOP;
            
            -- Clean up old sessions
            DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '7 days';
            GET DIAGNOSTICS table_name = ROW_COUNT;
            result := result || 'Cleaned ' || table_name || ' old sessions. ';
            
            result := result || 'Maintenance completed at ' || NOW();
            RETURN result;
        END;
        $$ LANGUAGE plpgsql;
        """
        
        try:
            self.execute_query(maintenance_procedure)
            success("Created maintenance procedure")
        except Exception as e:
            error(f"Failed to create maintenance procedure: {e}")
        
        # Create performance report function
        performance_report = """
        CREATE OR REPLACE FUNCTION generate_performance_report()
        RETURNS TABLE(
            metric TEXT,
            current_value TEXT,
            status TEXT,
            recommendation TEXT
        ) AS $$
        BEGIN
            -- Cache hit ratio check
            RETURN QUERY
            SELECT 
                'Cache Hit Ratio'::TEXT,
                round(
                    sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0), 2
                )::TEXT || '%',
                CASE 
                    WHEN round(sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0), 2) >= 95 
                    THEN 'Good'::TEXT
                    WHEN round(sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0), 2) >= 90 
                    THEN 'Fair'::TEXT
                    ELSE 'Poor'::TEXT
                END,
                CASE 
                    WHEN round(sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0), 2) < 95 
                    THEN 'Consider increasing shared_buffers or optimizing queries'::TEXT
                    ELSE 'No action needed'::TEXT
                END
            FROM pg_stat_database
            WHERE datname = current_database();
            
            -- Connection count check
            RETURN QUERY
            SELECT 
                'Active Connections'::TEXT,
                count(*)::TEXT,
                CASE 
                    WHEN count(*) < 50 THEN 'Good'::TEXT
                    WHEN count(*) < 100 THEN 'Fair'::TEXT
                    ELSE 'High'::TEXT
                END,
                CASE 
                    WHEN count(*) >= 100 THEN 'Consider connection pooling optimization'::TEXT
                    ELSE 'Connection usage is healthy'::TEXT
                END
            FROM pg_stat_activity WHERE state = 'active';
            
            -- Database size check
            RETURN QUERY
            SELECT 
                'Database Size'::TEXT,
                pg_size_pretty(pg_database_size(current_database())),
                CASE 
                    WHEN pg_database_size(current_database()) > 50 * 1024 * 1024 * 1024 THEN 'Large'::TEXT
                    WHEN pg_database_size(current_database()) > 10 * 1024 * 1024 * 1024 THEN 'Medium'::TEXT
                    ELSE 'Small'::TEXT
                END,
                'Monitor growth and consider archiving old data if needed'::TEXT;
        END;
        $$ LANGUAGE plpgsql;
        """
        
        try:
            self.execute_query(performance_report)
            success("Created performance report function")
        except Exception as e:
            error(f"Failed to create performance report function: {e}")
        
        success("Maintenance procedures created")
    
    def test_optimization_results(self) -> Dict:
        """Test and validate optimization results"""
        log("🧪 Testing optimization results...")
        
        # Re-analyze performance after optimizations
        post_optimization_metrics = self.analyze_current_performance()
        
        # Run performance report
        try:
            report_query = "SELECT * FROM generate_performance_report()"
            report = self.execute_query(report_query)
            
            if report:
                log("📊 Performance Report:")
                for row in report:
                    status_color = 'green' if row['status'] == 'Good' else 'yellow' if row['status'] == 'Fair' else 'red'
                    log(f"  {row['metric']}: {row['current_value']} ({row['status']})", status_color)
                    if row['recommendation'] != 'No action needed':
                        log(f"    💡 {row['recommendation']}", 'cyan')
        
        except Exception as e:
            warning(f"Could not generate performance report: {e}")
        
        # Test query performance with a sample query
        try:
            test_query_start = time.time()
            self.execute_query("SELECT count(*) FROM pg_stat_activity")
            test_query_time = (time.time() - test_query_start) * 1000
            
            log(f"Sample query execution time: {test_query_time:.2f}ms")
            
        except Exception as e:
            warning(f"Could not test query performance: {e}")
        
        success("Optimization testing completed")
        return post_optimization_metrics
    
    def run_full_optimization(self) -> None:
        """Run complete database optimization process"""
        log("🚀 Starting comprehensive database optimization...")
        
        # Pre-optimization analysis
        log("Phase 1: Pre-optimization Analysis")
        pre_metrics = self.analyze_current_performance()
        
        log("📊 Current Performance Metrics:")
        for metric, value in pre_metrics.items():
            if metric != 'largest_tables':
                log(f"  {metric}: {value}")
        
        # Create performance indexes
        log("\nPhase 2: Index Optimization")
        self.create_performance_indexes()
        
        # Optimize PostgreSQL configuration
        log("\nPhase 3: Configuration Optimization")
        self.optimize_postgresql_config()
        
        # Analyze and vacuum tables
        log("\nPhase 4: Table Optimization")
        self.analyze_and_vacuum_tables()
        
        # Set up monitoring
        log("\nPhase 5: Monitoring Setup")
        self.setup_monitoring_queries()
        
        # Create maintenance procedures
        log("\nPhase 6: Maintenance Setup")
        self.create_backup_and_maintenance_procedures()
        
        # Test results
        log("\nPhase 7: Validation and Testing")
        post_metrics = self.test_optimization_results()
        
        # Summary
        log("\n🎉 Database Optimization Summary:")
        success("✅ Performance indexes created")
        success("✅ PostgreSQL configuration optimized")
        success("✅ Tables analyzed and vacuumed")
        success("✅ Monitoring views and functions created")
        success("✅ Maintenance procedures established")
        
        # Performance comparison
        if 'cache_hit_ratio' in pre_metrics and 'cache_hit_ratio' in post_metrics:
            cache_improvement = post_metrics['cache_hit_ratio'] - pre_metrics['cache_hit_ratio']
            if cache_improvement > 0:
                success(f"✅ Cache hit ratio improved by {cache_improvement:.2f}%")
        
        success("🎊 Complete database optimization finished successfully!")

def main():
    """Main function"""
    print(f"""{COLORS['blue']}
🗄️  BookedBarber V2 Database Performance Optimization
==================================================={COLORS['reset']}""")
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        error("DATABASE_URL environment variable not set")
        sys.exit(1)
    
    # Initialize optimizer
    optimizer = DatabaseOptimizer(database_url)
    
    try:
        # Connect to database
        optimizer.connect()
        
        # Run optimization
        optimizer.run_full_optimization()
        
    except KeyboardInterrupt:
        warning("Optimization interrupted by user")
    except Exception as e:
        error(f"Optimization failed: {e}")
        sys.exit(1)
    finally:
        # Clean up
        optimizer.disconnect()
    
    log("💡 Next Steps:")
    print("1. Monitor database performance metrics regularly")
    print("2. Run maintenance procedures weekly: SELECT run_maintenance();")
    print("3. Generate performance reports monthly: SELECT * FROM generate_performance_report();")
    print("4. Review and adjust configuration based on usage patterns")
    print("5. Set up automated monitoring alerts")
    print("")
    print("📚 Configuration: See database/production-database-optimization.yaml")

if __name__ == "__main__":
    main()