#!/usr/bin/env python3
"""
Database Monitoring Dashboard for BookedBarber V2
=================================================

Real-time monitoring dashboard for database performance metrics.
Provides live updates on connection pools, query performance, and system health.

Usage:
    python scripts/database_monitoring_dashboard.py
    python scripts/database_monitoring_dashboard.py --interval 5
    python scripts/database_monitoring_dashboard.py --alert-thresholds
"""

import os
import sys
import time
import json
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import signal

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database_production import DatabaseHealthChecker, create_optimized_engine
from scripts.database_optimization import DatabaseOptimizer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AlertThresholds:
    """Alert thresholds for database monitoring."""
    max_connection_usage_percent: float = 80.0
    max_slow_queries_per_minute: int = 10
    min_cache_hit_ratio: float = 95.0
    max_average_query_time: float = 1.0
    max_memory_usage_mb: float = 1000.0


class DatabaseMonitoringDashboard:
    """Real-time database monitoring dashboard."""
    
    def __init__(self, update_interval: int = 10, alert_thresholds: Optional[AlertThresholds] = None):
        self.update_interval = update_interval
        self.alert_thresholds = alert_thresholds or AlertThresholds()
        self.running = False
        self.metrics_history: List[Dict[str, Any]] = []
        self.alerts_history: List[Dict[str, Any]] = []
        
        # Setup database connections
        self.engine = create_optimized_engine(os.getenv('ENVIRONMENT', 'development'))
        self.health_checker = DatabaseHealthChecker(self.engine)
        self.optimizer = DatabaseOptimizer(str(self.engine.url))
        
    def start_monitoring(self):
        """Start the monitoring dashboard."""
        self.running = True
        logger.info("Starting database monitoring dashboard...")
        logger.info(f"Update interval: {self.update_interval} seconds")
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        try:
            while self.running:
                self._update_dashboard()
                time.sleep(self.update_interval)
        except KeyboardInterrupt:
            pass
        finally:
            self._shutdown()
            
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
        
    def _update_dashboard(self):
        """Update dashboard with latest metrics."""
        try:
            # Collect metrics
            current_time = datetime.now()
            
            # Database health metrics
            health_status = self.health_checker.check_connection_health()
            db_stats = self.health_checker.get_database_stats()
            
            # Performance metrics
            perf_metrics = self.optimizer.check_database_performance()
            
            # Combine metrics
            combined_metrics = {
                'timestamp': current_time.isoformat(),
                'health_status': health_status,
                'database_stats': db_stats,
                'performance_metrics': {
                    'connection_count': perf_metrics.connection_count,
                    'active_connections': perf_metrics.active_connections,
                    'idle_connections': perf_metrics.idle_connections,
                    'slow_queries_count': perf_metrics.slow_queries_count,
                    'average_query_time': perf_metrics.average_query_time,
                    'peak_memory_usage': perf_metrics.peak_memory_usage,
                    'cache_hit_ratio': perf_metrics.cache_hit_ratio
                }
            }
            
            # Store metrics
            self.metrics_history.append(combined_metrics)
            
            # Keep only last 100 entries to prevent memory growth
            if len(self.metrics_history) > 100:
                self.metrics_history = self.metrics_history[-100:]
                
            # Check for alerts
            alerts = self._check_alerts(combined_metrics)
            if alerts:
                self.alerts_history.extend(alerts)
                
            # Display dashboard
            self._display_dashboard(combined_metrics, alerts)
            
        except Exception as e:
            logger.error(f"Error updating dashboard: {e}")
            
    def _check_alerts(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check metrics against alert thresholds."""
        alerts = []
        current_time = datetime.now()
        
        perf = metrics['performance_metrics']
        health = metrics['health_status']
        
        # Connection usage alert
        if health.get('pool_status'):
            pool = health['pool_status']
            total_capacity = pool.get('pool_size', 0) + pool.get('overflow', 0)
            if total_capacity > 0:
                usage_percent = (pool.get('checked_out', 0) / total_capacity) * 100
                if usage_percent > self.alert_thresholds.max_connection_usage_percent:
                    alerts.append({
                        'timestamp': current_time.isoformat(),
                        'level': 'WARNING',
                        'type': 'high_connection_usage',
                        'message': f"Connection pool usage at {usage_percent:.1f}%",
                        'value': usage_percent,
                        'threshold': self.alert_thresholds.max_connection_usage_percent
                    })
        
        # Slow queries alert
        slow_queries = perf.get('slow_queries_count', 0)
        if slow_queries > self.alert_thresholds.max_slow_queries_per_minute:
            alerts.append({
                'timestamp': current_time.isoformat(),
                'level': 'WARNING',
                'type': 'high_slow_queries',
                'message': f"High number of slow queries: {slow_queries}",
                'value': slow_queries,
                'threshold': self.alert_thresholds.max_slow_queries_per_minute
            })
            
        # Cache hit ratio alert (PostgreSQL only)
        cache_hit_ratio = perf.get('cache_hit_ratio')
        if cache_hit_ratio and cache_hit_ratio < self.alert_thresholds.min_cache_hit_ratio:
            alerts.append({
                'timestamp': current_time.isoformat(),
                'level': 'WARNING',
                'type': 'low_cache_hit_ratio',
                'message': f"Low cache hit ratio: {cache_hit_ratio:.1f}%",
                'value': cache_hit_ratio,
                'threshold': self.alert_thresholds.min_cache_hit_ratio
            })
            
        # Average query time alert
        avg_query_time = perf.get('average_query_time', 0)
        if avg_query_time > self.alert_thresholds.max_average_query_time:
            alerts.append({
                'timestamp': current_time.isoformat(),
                'level': 'WARNING',
                'type': 'high_average_query_time',
                'message': f"High average query time: {avg_query_time:.3f}s",
                'value': avg_query_time,
                'threshold': self.alert_thresholds.max_average_query_time
            })
            
        # Memory usage alert
        memory_usage = perf.get('peak_memory_usage', 0)
        if memory_usage > self.alert_thresholds.max_memory_usage_mb:
            alerts.append({
                'timestamp': current_time.isoformat(),
                'level': 'WARNING',
                'type': 'high_memory_usage',
                'message': f"High memory usage: {memory_usage:.1f}MB",
                'value': memory_usage,
                'threshold': self.alert_thresholds.max_memory_usage_mb
            })
            
        return alerts
        
    def _display_dashboard(self, metrics: Dict[str, Any], alerts: List[Dict[str, Any]]):
        """Display the monitoring dashboard."""
        # Clear screen (cross-platform)
        os.system('cls' if os.name == 'nt' else 'clear')
        
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        print("=" * 80)
        print(f"BookedBarber V2 - Database Monitoring Dashboard")
        print(f"Last Updated: {current_time}")
        print("=" * 80)
        
        # Health Status
        health = metrics['health_status']
        status_color = "🟢" if health['status'] == 'healthy' else "🔴"
        print(f"\n{status_color} Database Health: {health['status'].upper()}")
        
        # Connection Pool Status
        if health.get('pool_status'):
            pool = health['pool_status']
            print(f"\n📊 Connection Pool Status:")
            print(f"   Pool Size: {pool.get('pool_size', 'N/A')}")
            print(f"   Checked Out: {pool.get('checked_out', 0)}")
            print(f"   Checked In: {pool.get('checked_in', 0)}")
            print(f"   Overflow: {pool.get('overflow', 0)}")
            print(f"   Invalid: {pool.get('invalid', 0)}")
            
        # Performance Metrics
        perf = metrics['performance_metrics']
        print(f"\n⚡ Performance Metrics:")
        print(f"   Active Connections: {perf.get('active_connections', 0)}")
        print(f"   Slow Queries: {perf.get('slow_queries_count', 0)}")
        print(f"   Avg Query Time: {perf.get('average_query_time', 0):.3f}s")
        print(f"   Memory Usage: {perf.get('peak_memory_usage', 0):.1f}MB")
        
        cache_hit_ratio = perf.get('cache_hit_ratio')
        if cache_hit_ratio:
            print(f"   Cache Hit Ratio: {cache_hit_ratio:.1f}%")
            
        # Database Statistics (PostgreSQL only)
        db_stats = metrics.get('database_stats')
        if db_stats:
            print(f"\n💾 Database Statistics:")
            print(f"   Database Size: {db_stats.get('database_size', 'N/A')}")
            print(f"   Total Connections: {db_stats.get('total_connections', 0)}")
            print(f"   Active Connections: {db_stats.get('active_connections', 0)}")
            print(f"   Idle Connections: {db_stats.get('idle_connections', 0)}")
            
        # Recent Alerts
        if alerts:
            print(f"\n🚨 Current Alerts:")
            for alert in alerts[-5:]:  # Show last 5 alerts
                level_icon = "⚠️" if alert['level'] == 'WARNING' else "🚨"
                print(f"   {level_icon} {alert['message']}")
                
        # Historical Trends (last 10 minutes)
        recent_metrics = [m for m in self.metrics_history 
                         if datetime.fromisoformat(m['timestamp']) > datetime.now() - timedelta(minutes=10)]
        
        if len(recent_metrics) >= 2:
            print(f"\n📈 Trends (Last 10 min):")
            
            # Connection trend
            conn_values = [m['performance_metrics'].get('active_connections', 0) for m in recent_metrics]
            conn_trend = "↗️" if conn_values[-1] > conn_values[0] else "↘️" if conn_values[-1] < conn_values[0] else "➡️"
            print(f"   Connections: {conn_trend} {conn_values[0]} → {conn_values[-1]}")
            
            # Query time trend
            query_values = [m['performance_metrics'].get('average_query_time', 0) for m in recent_metrics]
            query_trend = "↗️" if query_values[-1] > query_values[0] else "↘️" if query_values[-1] < query_values[0] else "➡️"
            print(f"   Avg Query Time: {query_trend} {query_values[0]:.3f}s → {query_values[-1]:.3f}s")
            
        print(f"\n⏱️  Next update in {self.update_interval} seconds... (Press Ctrl+C to stop)")
        
    def _shutdown(self):
        """Graceful shutdown."""
        logger.info("Shutting down monitoring dashboard...")
        
        # Save metrics history
        if self.metrics_history:
            output_file = f"monitoring_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(output_file, 'w') as f:
                json.dump({
                    'session_start': self.metrics_history[0]['timestamp'] if self.metrics_history else None,
                    'session_end': datetime.now().isoformat(),
                    'total_metrics': len(self.metrics_history),
                    'total_alerts': len(self.alerts_history),
                    'metrics_history': self.metrics_history,
                    'alerts_history': self.alerts_history
                }, f, indent=2)
            logger.info(f"Monitoring session data saved to {output_file}")
            
        # Close database connections
        if hasattr(self, 'engine'):
            self.engine.dispose()
            
    def export_metrics_csv(self, filename: Optional[str] = None):
        """Export metrics history to CSV format."""
        import csv
        
        if not filename:
            filename = f"metrics_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
        with open(filename, 'w', newline='') as csvfile:
            if not self.metrics_history:
                return
                
            # Get fieldnames from first metric
            sample_metric = self.metrics_history[0]
            fieldnames = ['timestamp']
            
            # Flatten performance metrics
            for key in sample_metric['performance_metrics'].keys():
                fieldnames.append(f"perf_{key}")
                
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for metric in self.metrics_history:
                row = {'timestamp': metric['timestamp']}
                for key, value in metric['performance_metrics'].items():
                    row[f"perf_{key}"] = value
                writer.writerow(row)
                
        logger.info(f"Metrics exported to {filename}")


def main():
    """Main CLI interface for the monitoring dashboard."""
    parser = argparse.ArgumentParser(description='Database Monitoring Dashboard for BookedBarber V2')
    parser.add_argument('--interval', type=int, default=10,
                       help='Update interval in seconds (default: 10)')
    parser.add_argument('--alert-thresholds', action='store_true',
                       help='Show current alert thresholds and exit')
    parser.add_argument('--connection-threshold', type=float, default=80.0,
                       help='Connection usage alert threshold (default: 80%%)')
    parser.add_argument('--slow-query-threshold', type=int, default=10,
                       help='Slow queries per minute threshold (default: 10)')
    parser.add_argument('--cache-threshold', type=float, default=95.0,
                       help='Minimum cache hit ratio threshold (default: 95%%)')
    parser.add_argument('--memory-threshold', type=float, default=1000.0,
                       help='Memory usage threshold in MB (default: 1000)')
    
    args = parser.parse_args()
    
    # Setup alert thresholds
    alert_thresholds = AlertThresholds(
        max_connection_usage_percent=args.connection_threshold,
        max_slow_queries_per_minute=args.slow_query_threshold,
        min_cache_hit_ratio=args.cache_threshold,
        max_memory_usage_mb=args.memory_threshold
    )
    
    if args.alert_thresholds:
        print("Current Alert Thresholds:")
        print(f"  Connection Usage: {alert_thresholds.max_connection_usage_percent}%")
        print(f"  Slow Queries/min: {alert_thresholds.max_slow_queries_per_minute}")
        print(f"  Cache Hit Ratio: {alert_thresholds.min_cache_hit_ratio}%")
        print(f"  Average Query Time: {alert_thresholds.max_average_query_time}s")
        print(f"  Memory Usage: {alert_thresholds.max_memory_usage_mb}MB")
        return 0
        
    # Start monitoring
    dashboard = DatabaseMonitoringDashboard(args.interval, alert_thresholds)
    
    try:
        dashboard.start_monitoring()
    except Exception as e:
        logger.error(f"Error running monitoring dashboard: {e}")
        return 1
        
    return 0


if __name__ == '__main__':
    sys.exit(main())