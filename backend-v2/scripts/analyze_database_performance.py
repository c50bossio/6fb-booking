#!/usr/bin/env python3
"""
Database Performance Analysis Script for BookedBarber V2
Analyzes PostgreSQL database for performance issues and missing indexes
"""

import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from tabulate import tabulate
from typing import List, Dict, Any

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings


class DatabaseAnalyzer:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'missing_indexes': [],
            'slow_queries': [],
            'table_stats': [],
            'connection_stats': {},
            'recommendations': []
        }
    
    def analyze_all(self):
        """Run all analysis checks"""
        print("🔍 Starting Database Performance Analysis...")
        print("=" * 60)
        
        self.check_connection_stats()
        self.analyze_table_sizes()
        self.find_missing_indexes()
        self.analyze_slow_queries()
        self.check_index_usage()
        self.generate_recommendations()
        
        self.print_report()
    
    def check_connection_stats(self):
        """Check current database connections"""
        query = """
        SELECT 
            state,
            COUNT(*) as count,
            MAX(backend_start) as oldest_connection
        FROM pg_stat_activity
        WHERE pid <> pg_backend_pid()
        GROUP BY state
        ORDER BY count DESC;
        """
        
        with self.engine.connect() as conn:
            result = conn.execute(text(query))
            stats = result.fetchall()
            
            total_connections = sum(row[1] for row in stats)
            self.results['connection_stats'] = {
                'total': total_connections,
                'by_state': {row[0] or 'unknown': row[1] for row in stats}
            }
            
            print(f"\n📊 Connection Statistics:")
            print(f"Total Connections: {total_connections}")
            for state, count, oldest in stats:
                print(f"  - {state or 'unknown'}: {count}")
    
    def analyze_table_sizes(self):
        """Analyze table sizes and row counts"""
        query = """
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
            n_live_tup as row_count,
            n_dead_tup as dead_rows,
            CASE WHEN n_live_tup > 0 
                THEN ROUND(100.0 * n_dead_tup / n_live_tup, 2) 
                ELSE 0 
            END as dead_percentage
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20;
        """
        
        with self.engine.connect() as conn:
            result = conn.execute(text(query))
            tables = result.fetchall()
            
            print(f"\n📏 Table Sizes:")
            headers = ['Table', 'Size', 'Rows', 'Dead Rows', 'Dead %']
            table_data = [[t[1], t[2], t[3], t[4], f"{t[5]}%"] for t in tables]
            print(tabulate(table_data, headers=headers, tablefmt='grid'))
            
            self.results['table_stats'] = [
                {
                    'table': t[1],
                    'size': t[2],
                    'rows': t[3],
                    'dead_rows': t[4],
                    'dead_percentage': t[5]
                } for t in tables
            ]
    
    def find_missing_indexes(self):
        """Find potentially missing indexes based on query patterns"""
        query = """
        SELECT 
            schemaname,
            tablename,
            attname,
            n_distinct,
            correlation
        FROM pg_stats
        WHERE schemaname = 'public'
            AND n_distinct > 10
            AND correlation < 0.1
            AND tablename IN (
                SELECT tablename 
                FROM pg_stat_user_tables 
                WHERE n_live_tup > 1000
            )
        ORDER BY n_distinct DESC
        LIMIT 20;
        """
        
        with self.engine.connect() as conn:
            result = conn.execute(text(query))
            columns = result.fetchall()
            
            if columns:
                print(f"\n⚠️  Columns that might benefit from indexes:")
                headers = ['Table', 'Column', 'Distinct Values', 'Correlation']
                table_data = [[c[1], c[2], c[3], f"{c[4]:.3f}"] for c in columns]
                print(tabulate(table_data, headers=headers, tablefmt='grid'))
                
                self.results['missing_indexes'] = [
                    {
                        'table': c[1],
                        'column': c[2],
                        'distinct_values': c[3],
                        'correlation': c[4]
                    } for c in columns
                ]
    
    def analyze_slow_queries(self):
        """Analyze slow queries (requires pg_stat_statements extension)"""
        try:
            query = """
            SELECT 
                query,
                calls,
                total_exec_time::numeric(10,2) as total_time_ms,
                mean_exec_time::numeric(10,2) as mean_time_ms,
                stddev_exec_time::numeric(10,2) as stddev_time_ms
            FROM pg_stat_statements
            WHERE query NOT LIKE '%pg_stat_statements%'
                AND mean_exec_time > 100
            ORDER BY mean_exec_time DESC
            LIMIT 10;
            """
            
            with self.engine.connect() as conn:
                result = conn.execute(text(query))
                queries = result.fetchall()
                
                if queries:
                    print(f"\n🐌 Slow Queries (>100ms average):")
                    for i, q in enumerate(queries, 1):
                        print(f"\n{i}. Query: {q[0][:100]}...")
                        print(f"   Calls: {q[1]}, Avg Time: {q[3]}ms, Total Time: {q[2]}ms")
                    
                    self.results['slow_queries'] = [
                        {
                            'query': q[0],
                            'calls': q[1],
                            'total_time': q[2],
                            'mean_time': q[3]
                        } for q in queries
                    ]
        except Exception as e:
            print(f"\n⚠️  Could not analyze slow queries (pg_stat_statements may not be enabled)")
    
    def check_index_usage(self):
        """Check for unused indexes"""
        query = """
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
            AND indexrelname NOT LIKE 'pg_toast_%'
        ORDER BY pg_relation_size(indexrelid) DESC;
        """
        
        with self.engine.connect() as conn:
            result = conn.execute(text(query))
            unused = result.fetchall()
            
            if unused:
                print(f"\n🗑️  Unused Indexes:")
                headers = ['Table', 'Index', 'Size', 'Scans']
                table_data = [[u[1], u[2], u[6], u[3]] for u in unused]
                print(tabulate(table_data, headers=headers, tablefmt='grid'))
    
    def generate_recommendations(self):
        """Generate performance recommendations based on analysis"""
        recommendations = []
        
        # Check connection count
        total_conn = self.results['connection_stats'].get('total', 0)
        if total_conn > 50:
            recommendations.append({
                'severity': 'HIGH',
                'issue': 'High connection count',
                'recommendation': f'Consider using connection pooling. Current: {total_conn} connections'
            })
        
        # Check for tables with high dead tuple percentage
        for table in self.results['table_stats']:
            if table['dead_percentage'] > 20:
                recommendations.append({
                    'severity': 'MEDIUM',
                    'issue': f"High dead tuples in {table['table']}",
                    'recommendation': f"Run VACUUM on {table['table']} (dead rows: {table['dead_percentage']}%)"
                })
        
        # Check for missing indexes
        if self.results['missing_indexes']:
            recommendations.append({
                'severity': 'HIGH',
                'issue': 'Potential missing indexes detected',
                'recommendation': 'Review columns with high cardinality and low correlation'
            })
        
        self.results['recommendations'] = recommendations
        
        if recommendations:
            print(f"\n💡 Recommendations:")
            for rec in recommendations:
                print(f"\n[{rec['severity']}] {rec['issue']}")
                print(f"   → {rec['recommendation']}")
    
    def print_report(self):
        """Print summary report"""
        print(f"\n{'=' * 60}")
        print(f"📋 Performance Analysis Summary")
        print(f"{'=' * 60}")
        print(f"Timestamp: {self.results['timestamp']}")
        print(f"Total Connections: {self.results['connection_stats'].get('total', 0)}")
        print(f"Tables Analyzed: {len(self.results['table_stats'])}")
        print(f"Slow Queries Found: {len(self.results['slow_queries'])}")
        print(f"Missing Index Candidates: {len(self.results['missing_indexes'])}")
        print(f"Recommendations: {len(self.results['recommendations'])}")
        
        # Save detailed report
        report_file = f"db_performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        import json
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        print(f"\n📄 Detailed report saved to: {report_file}")


def main():
    """Main entry point"""
    if 'sqlite' in settings.database_url:
        print("⚠️  This script is designed for PostgreSQL. SQLite detected.")
        print("   Switch to PostgreSQL for production performance analysis.")
        return
    
    analyzer = DatabaseAnalyzer(settings.database_url)
    analyzer.analyze_all()


if __name__ == "__main__":
    main()