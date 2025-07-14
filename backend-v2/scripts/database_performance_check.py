#!/usr/bin/env python3
"""
Database Performance Analysis for 10K+ Users
Analyzes current database configuration and provides optimization recommendations.
"""

import os
import sys
import time
import logging
from datetime import datetime
from typing import Dict, List, Any

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import engine, get_db
from config import settings

logger = logging.getLogger(__name__)

class DatabasePerformanceAnalyzer:
    def __init__(self):
        self.engine = engine
        self.is_sqlite = "sqlite" in str(engine.url)
        self.is_postgresql = "postgresql" in str(engine.url)
        
    def analyze_current_config(self) -> Dict[str, Any]:
        """Analyze current database configuration"""
        config = {
            "database_type": "sqlite" if self.is_sqlite else "postgresql",
            "database_url": str(self.engine.url).replace(str(self.engine.url).split('@')[0].split('//')[-1] + '@', '***@') if '@' in str(self.engine.url) else str(self.engine.url),
            "pool_class": str(type(self.engine.pool).__name__),
            "pool_size": getattr(self.engine.pool, 'size', lambda: 'N/A')(),
            "max_overflow": getattr(self.engine.pool, '_max_overflow', 'N/A'),
            "pool_timeout": getattr(self.engine.pool, '_timeout', 'N/A'),
            "pool_recycle": getattr(self.engine.pool, '_recycle', 'N/A'),
        }
        
        return config
    
    def check_performance_metrics(self) -> Dict[str, Any]:
        """Check basic performance metrics"""
        metrics = {
            "connection_test": False,
            "query_time_ms": None,
            "table_count": 0,
            "record_counts": {},
            "connection_pool_status": {}
        }
        
        try:
            # Test basic connectivity and query performance
            start_time = time.time()
            with get_db() as db:
                result = db.execute(text("SELECT 1")).scalar()
                metrics["connection_test"] = result == 1
                metrics["query_time_ms"] = round((time.time() - start_time) * 1000, 2)
                
                # Get table information
                if self.is_postgresql:
                    tables_result = db.execute(text("""
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    """))
                    tables = [row[0] for row in tables_result.fetchall()]
                else:
                    tables_result = db.execute(text("""
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name NOT LIKE 'sqlite_%'
                    """))
                    tables = [row[0] for row in tables_result.fetchall()]
                
                metrics["table_count"] = len(tables)
                
                # Get record counts for main tables
                important_tables = ['users', 'appointments', 'payments', 'clients']
                for table in important_tables:
                    if table in tables:
                        try:
                            count_result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                            metrics["record_counts"][table] = count_result.scalar()
                        except Exception as e:
                            metrics["record_counts"][table] = f"Error: {e}"
                
        except Exception as e:
            logger.error(f"Performance check failed: {e}")
            metrics["error"] = str(e)
        
        # Pool status
        if hasattr(self.engine.pool, 'size'):
            metrics["connection_pool_status"] = {
                "pool_size": self.engine.pool.size(),
                "checked_out": getattr(self.engine.pool, 'checkedout', lambda: 'N/A')(),
                "overflow": getattr(self.engine.pool, 'overflow', lambda: 'N/A')(),
            }
        
        return metrics
    
    def get_10k_user_recommendations(self) -> Dict[str, Any]:
        """Get recommendations for handling 10,000+ users"""
        recommendations = {
            "database_optimizations": [],
            "connection_pool_settings": {},
            "index_recommendations": [],
            "caching_strategy": [],
            "monitoring_requirements": [],
            "infrastructure_needs": []
        }
        
        # Database optimizations
        if self.is_sqlite:
            recommendations["database_optimizations"].extend([
                "🚨 CRITICAL: Migrate from SQLite to PostgreSQL for production",
                "SQLite is not suitable for 10,000+ concurrent users",
                "PostgreSQL provides better concurrent write performance",
                "Built-in connection pooling and replication support"
            ])
        else:
            recommendations["database_optimizations"].extend([
                "✅ PostgreSQL is production-ready for 10K+ users",
                "Consider read replicas for heavy read workloads",
                "Implement database sharding if >100K users",
                "Use pgBouncer for connection pooling"
            ])
        
        # Connection pool settings for 10K users
        recommendations["connection_pool_settings"] = {
            "production_pool_size": "50-100",
            "max_overflow": "100-200", 
            "pool_timeout": "30 seconds",
            "pool_recycle": "3600 seconds (1 hour)",
            "connection_lifetime": "Recycle connections regularly",
            "health_checks": "Enable pool pre-ping"
        }
        
        # Index recommendations
        recommendations["index_recommendations"].extend([
            "CREATE INDEX idx_users_email ON users(email)",
            "CREATE INDEX idx_appointments_datetime ON appointments(appointment_datetime)",
            "CREATE INDEX idx_appointments_user_id ON appointments(user_id)",
            "CREATE INDEX idx_payments_created_at ON payments(created_at)",
            "CREATE INDEX idx_payments_status ON payments(status)",
            "CREATE INDEX idx_clients_user_id ON clients(user_id)",
            "CREATE UNIQUE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id)",
            "CREATE INDEX idx_appointments_status ON appointments(status)"
        ])
        
        # Caching strategy
        recommendations["caching_strategy"].extend([
            "Redis cluster for session management",
            "Cache frequently accessed user profiles",
            "Cache appointment availability calculations", 
            "Implement query result caching",
            "Use CDN for static assets",
            "Database query result caching"
        ])
        
        # Monitoring requirements
        recommendations["monitoring_requirements"].extend([
            "Database connection pool monitoring",
            "Slow query logging and analysis",
            "Connection timeout monitoring",
            "Database resource utilization tracking",
            "Query performance metrics",
            "Connection leak detection"
        ])
        
        # Infrastructure needs
        recommendations["infrastructure_needs"].extend([
            "Database: Minimum 4 vCPUs, 16GB RAM",
            "Application servers: Load balancer + 3+ instances",
            "Redis cluster: 3 nodes for high availability",
            "Database backup strategy: Daily automated backups",
            "Monitoring: Prometheus + Grafana setup",
            "CDN: CloudFlare or AWS CloudFront"
        ])
        
        return recommendations
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance analysis report"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "analysis_type": "10K+ User Readiness Assessment",
            "current_config": self.analyze_current_config(),
            "performance_metrics": self.check_performance_metrics(),
            "recommendations": self.get_10k_user_recommendations(),
            "readiness_score": self.calculate_readiness_score()
        }
        
        return report
    
    def calculate_readiness_score(self) -> Dict[str, Any]:
        """Calculate production readiness score for 10K+ users"""
        score = 0
        max_score = 100
        issues = []
        
        # Database type (40 points)
        if self.is_postgresql:
            score += 40
        elif self.is_sqlite:
            issues.append("Using SQLite instead of PostgreSQL (-40 points)")
        
        # Connection pooling (20 points)
        if hasattr(self.engine.pool, 'size') and self.engine.pool.size() > 0:
            score += 20
        else:
            issues.append("Connection pooling not properly configured (-20 points)")
        
        # Environment configuration (20 points)
        if settings.environment in ['production', 'staging']:
            score += 20
        else:
            issues.append("Not in production/staging environment (-20 points)")
        
        # Pool settings (20 points)
        pool_size = getattr(self.engine.pool, 'size', lambda: 0)()
        if pool_size >= 20:
            score += 20
        elif pool_size >= 10:
            score += 10
            issues.append("Pool size could be larger for 10K+ users (-10 points)")
        else:
            issues.append("Pool size too small for 10K+ users (-20 points)")
        
        # Determine readiness level
        if score >= 80:
            readiness = "Production Ready"
        elif score >= 60:
            readiness = "Needs Minor Improvements"
        elif score >= 40:
            readiness = "Needs Major Improvements"
        else:
            readiness = "Not Production Ready"
        
        return {
            "score": score,
            "max_score": max_score,
            "percentage": round(score / max_score * 100, 1),
            "readiness_level": readiness,
            "issues": issues
        }

def main():
    """Main function"""
    print("🚀 BookedBarber V2 - Database Performance Analysis for 10K+ Users")
    print("=" * 70)
    
    analyzer = DatabasePerformanceAnalyzer()
    
    try:
        # Generate comprehensive report
        report = analyzer.generate_performance_report()
        
        # Print current configuration
        print("\n📊 Current Database Configuration:")
        config = report["current_config"]
        for key, value in config.items():
            print(f"   {key}: {value}")
        
        # Print performance metrics
        print("\n⚡ Performance Metrics:")
        metrics = report["performance_metrics"]
        if metrics["connection_test"]:
            print(f"   ✅ Database Connection: OK ({metrics['query_time_ms']}ms)")
        else:
            print(f"   ❌ Database Connection: FAILED")
        
        print(f"   📊 Tables: {metrics['table_count']}")
        print("   📈 Record Counts:")
        for table, count in metrics["record_counts"].items():
            print(f"      {table}: {count}")
        
        # Print readiness score
        print("\n🎯 Production Readiness Score:")
        readiness = report["readiness_score"]
        print(f"   Score: {readiness['score']}/{readiness['max_score']} ({readiness['percentage']}%)")
        print(f"   Level: {readiness['readiness_level']}")
        
        if readiness["issues"]:
            print("\n   Issues to Address:")
            for issue in readiness["issues"]:
                print(f"   • {issue}")
        
        # Print recommendations
        print("\n💡 Recommendations for 10K+ Users:")
        recommendations = report["recommendations"]
        
        print("\n   🔧 Database Optimizations:")
        for rec in recommendations["database_optimizations"]:
            print(f"   • {rec}")
        
        print("\n   🏊 Connection Pool Settings:")
        for key, value in recommendations["connection_pool_settings"].items():
            print(f"   • {key}: {value}")
        
        print("\n   📇 Index Recommendations:")
        for index in recommendations["index_recommendations"][:5]:  # Show first 5
            print(f"   • {index}")
        if len(recommendations["index_recommendations"]) > 5:
            print(f"   ... and {len(recommendations['index_recommendations']) - 5} more")
        
        print("\n   🚀 Infrastructure Needs:")
        for need in recommendations["infrastructure_needs"]:
            print(f"   • {need}")
        
        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"database_performance_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            import json
            json.dump(report, f, indent=2)
        
        print(f"\n📝 Full report saved to: {filename}")
        
        # Final recommendation
        if readiness["percentage"] >= 80:
            print("\n✅ Your database is ready for 10K+ users!")
        else:
            print(f"\n⚠️  Your database needs improvements before handling 10K+ users.")
            print("   Focus on the issues listed above.")
        
    except Exception as e:
        print(f"\n❌ Error during analysis: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())