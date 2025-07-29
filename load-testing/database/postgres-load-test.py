#!/usr/bin/env python3
"""
PostgreSQL Database Load Testing for BookedBarber V2

Tests database performance under enterprise-scale load with focus on:
- Six Figure Barber analytics queries
- Appointment booking operations
- Client relationship data
- Real-time dashboard queries
"""

import asyncio
import asyncpg
import psycopg2
import time
import json
import logging
import os
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class DatabaseConfig:
    """Database configuration for load testing"""
    host: str = os.getenv('DB_HOST', 'localhost')
    port: int = int(os.getenv('DB_PORT', '5432'))
    database: str = os.getenv('DB_NAME', 'bookedbarber_v2')
    username: str = os.getenv('DB_USER', 'postgres')
    password: str = os.getenv('DB_PASSWORD', 'password')
    max_connections: int = int(os.getenv('DB_MAX_CONNECTIONS', '100'))
    test_duration_minutes: int = int(os.getenv('TEST_DURATION_MINUTES', '30'))
    concurrent_queries: int = int(os.getenv('CONCURRENT_QUERIES', '50'))

@dataclass
class QueryPerformanceMetric:
    """Individual query performance tracking"""
    query_type: str
    execution_time_ms: float
    rows_affected: int
    success: bool
    error_message: Optional[str]
    timestamp: datetime
    connection_id: int

@dataclass
class DatabaseLoadMetrics:
    """Overall database load metrics"""
    total_queries: int
    successful_queries: int
    failed_queries: int
    average_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    queries_per_second: float
    concurrent_connections: int
    total_duration_minutes: float
    query_breakdown: Dict[str, int]

class PostgreSQLLoadTester:
    """PostgreSQL database load testing orchestrator"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.query_metrics: List[QueryPerformanceMetric] = []
        self.connection_pool = None
        self.test_start_time = None
        
    async def run_database_load_test(self) -> Dict[str, Any]:
        """Execute comprehensive database load test"""
        logger.info("🗄️ Starting PostgreSQL Database Load Test")
        
        self.test_start_time = datetime.now()
        
        try:
            # Initialize connection pool
            await self._initialize_connection_pool()
            
            # Prepare test data
            await self._prepare_test_data()
            
            # Run concurrent load tests
            await self._run_concurrent_load_tests()
            
            # Generate performance report
            return await self._generate_database_report()
            
        finally:
            if self.connection_pool:
                await self.connection_pool.close()
    
    async def _initialize_connection_pool(self):
        """Initialize asyncpg connection pool"""
        logger.info(f"🔗 Initializing connection pool with {self.config.max_connections} connections")
        
        connection_string = f"postgresql://{self.config.username}:{self.config.password}@{self.config.host}:{self.config.port}/{self.config.database}"
        
        self.connection_pool = await asyncpg.create_pool(
            connection_string,
            min_size=10,
            max_size=self.config.max_connections,
            command_timeout=30
        )
        
        logger.info("✅ Database connection pool initialized")
    
    async def _prepare_test_data(self):
        """Prepare test data for load testing"""
        logger.info("📊 Preparing test data...")
        
        async with self.connection_pool.acquire() as conn:
            # Ensure we have enough test users
            user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
            if user_count < 100:
                logger.info("Creating additional test users...")
                for i in range(100 - user_count):
                    await conn.execute("""
                        INSERT INTO users (email, password_hash, first_name, last_name, created_at)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (email) DO NOTHING
                    """, f"dbtest{i}@bookedbarber.com", "hashedpassword", f"Test{i}", "User", datetime.now())
            
            # Ensure we have test clients
            client_count = await conn.fetchval("SELECT COUNT(*) FROM clients")
            if client_count < 500:
                logger.info("Creating additional test clients...")
                user_ids = await conn.fetch("SELECT id FROM users LIMIT 100")
                for i, user_row in enumerate(user_ids):
                    for j in range(5):  # 5 clients per user
                        await conn.execute("""
                            INSERT INTO clients (user_id, first_name, last_name, email, phone, created_at)
                            VALUES ($1, $2, $3, $4, $5, $6)
                            ON CONFLICT (email) DO NOTHING
                        """, user_row['id'], f"Client{i}_{j}", "TestClient", 
                        f"client{i}_{j}@test.com", f"555010{i:04d}", datetime.now())
            
            # Ensure we have test appointments
            appointment_count = await conn.fetchval("SELECT COUNT(*) FROM appointments")
            if appointment_count < 1000:
                logger.info("Creating additional test appointments...")
                clients = await conn.fetch("SELECT id, user_id FROM clients LIMIT 500")
                for client in clients:
                    for i in range(2):  # 2 appointments per client
                        appointment_time = datetime.now() + timedelta(days=i+1, hours=i*2)
                        await conn.execute("""
                            INSERT INTO appointments (user_id, client_id, appointment_datetime, 
                                                   duration, status, created_at)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        """, client['user_id'], client['id'], appointment_time, 
                        60, 'scheduled', datetime.now())
        
        logger.info("✅ Test data preparation completed")
    
    async def _run_concurrent_load_tests(self):
        """Run concurrent database load tests"""
        logger.info(f"🚀 Starting concurrent load tests with {self.config.concurrent_queries} concurrent queries")
        
        test_end_time = datetime.now() + timedelta(minutes=self.config.test_duration_minutes)
        
        # Define test query scenarios
        test_scenarios = [
            ('six_fb_dashboard_query', self._six_figure_barber_dashboard_query, 0.3),
            ('revenue_analytics_query', self._revenue_analytics_query, 0.2),
            ('client_crm_query', self._client_crm_query, 0.2),
            ('appointment_booking_insert', self._appointment_booking_insert, 0.15),
            ('client_value_calculation', self._client_value_calculation_query, 0.1),
            ('service_excellence_tracking', self._service_excellence_tracking_insert, 0.05)
        ]
        
        # Start concurrent workers
        tasks = []
        for i in range(self.config.concurrent_queries):
            task = asyncio.create_task(
                self._query_worker(i, test_scenarios, test_end_time)
            )
            tasks.append(task)
        
        # Wait for all workers to complete
        await asyncio.gather(*tasks)
        
        logger.info("✅ Concurrent load tests completed")
    
    async def _query_worker(self, worker_id: int, scenarios: List, end_time: datetime):
        """Individual query worker"""
        import random
        
        while datetime.now() < end_time:
            # Select random scenario based on weights
            scenario_name, scenario_func, weight = random.choices(
                scenarios, 
                weights=[s[2] for s in scenarios]
            )[0]
            
            start_time = time.time()
            success = True
            error_message = None
            rows_affected = 0
            
            try:
                async with self.connection_pool.acquire() as conn:
                    rows_affected = await scenario_func(conn)
                    
            except Exception as e:
                success = False
                error_message = str(e)
                logger.debug(f"Query error in worker {worker_id}: {e}")
            
            execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Record metric
            metric = QueryPerformanceMetric(
                query_type=scenario_name,
                execution_time_ms=execution_time,
                rows_affected=rows_affected,
                success=success,
                error_message=error_message,
                timestamp=datetime.now(),
                connection_id=worker_id
            )
            
            self.query_metrics.append(metric)
            
            # Small delay to prevent overwhelming
            await asyncio.sleep(0.1 + random.random() * 0.5)
    
    async def _six_figure_barber_dashboard_query(self, conn) -> int:
        """Simulate Six Figure Barber dashboard query"""
        result = await conn.fetch("""
            WITH user_stats AS (
                SELECT 
                    u.id as user_id,
                    COUNT(DISTINCT c.id) as client_count,
                    COUNT(DISTINCT a.id) as appointment_count,
                    COALESCE(SUM(p.amount), 0) as total_revenue,
                    AVG(a.duration) as avg_appointment_duration
                FROM users u
                LEFT JOIN clients c ON u.id = c.user_id
                LEFT JOIN appointments a ON u.id = a.user_id 
                    AND a.appointment_datetime >= NOW() - INTERVAL '30 days'
                LEFT JOIN payments p ON a.id = p.appointment_id 
                    AND p.status = 'completed'
                WHERE u.id <= 100
                GROUP BY u.id
            ),
            revenue_metrics AS (
                SELECT 
                    user_id,
                    total_revenue,
                    client_count,
                    appointment_count,
                    CASE 
                        WHEN total_revenue >= 8333 THEN 'ON_TRACK'  -- $100k annual pace
                        WHEN total_revenue >= 6250 THEN 'BEHIND'    -- $75k annual pace
                        ELSE 'CRITICAL'
                    END as revenue_status,
                    CASE
                        WHEN client_count >= 50 THEN 'EXCELLENT'
                        WHEN client_count >= 30 THEN 'GOOD'
                        WHEN client_count >= 15 THEN 'DEVELOPING'
                        ELSE 'NEEDS_ATTENTION'
                    END as client_portfolio_status
                FROM user_stats
            )
            SELECT 
                rm.*,
                us.avg_appointment_duration,
                ROUND((rm.total_revenue / NULLIF(rm.appointment_count, 0))::numeric, 2) as avg_ticket_value
            FROM revenue_metrics rm
            JOIN user_stats us ON rm.user_id = us.user_id
            ORDER BY rm.total_revenue DESC
            LIMIT 50
        """)
        return len(result)
    
    async def _revenue_analytics_query(self, conn) -> int:
        """Simulate revenue analytics query"""
        result = await conn.fetch("""
            WITH daily_revenue AS (
                SELECT 
                    p.user_id,
                    DATE(p.created_at) as revenue_date,
                    SUM(p.amount) as daily_total,
                    COUNT(p.id) as transaction_count,
                    AVG(p.amount) as avg_transaction_value
                FROM payments p
                WHERE p.status = 'completed'
                    AND p.created_at >= NOW() - INTERVAL '90 days'
                    AND p.user_id <= 100
                GROUP BY p.user_id, DATE(p.created_at)
            ),
            revenue_trends AS (
                SELECT 
                    user_id,
                    revenue_date,
                    daily_total,
                    transaction_count,
                    avg_transaction_value,
                    LAG(daily_total) OVER (PARTITION BY user_id ORDER BY revenue_date) as prev_day_total,
                    AVG(daily_total) OVER (
                        PARTITION BY user_id 
                        ORDER BY revenue_date 
                        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                    ) as seven_day_avg
                FROM daily_revenue
            )
            SELECT 
                user_id,
                SUM(daily_total) as total_revenue_90d,
                AVG(daily_total) as avg_daily_revenue,
                MAX(daily_total) as best_day_revenue,
                COUNT(DISTINCT revenue_date) as active_days,
                STDDEV(daily_total) as revenue_volatility,
                CASE 
                    WHEN AVG(daily_total) >= 274 THEN 'SIX_FIGURE_PACE'  -- $100k annual
                    WHEN AVG(daily_total) >= 205 THEN 'STRONG_PERFORMANCE'  -- $75k annual
                    ELSE 'IMPROVEMENT_NEEDED'
                END as performance_category
            FROM revenue_trends
            WHERE daily_total IS NOT NULL
            GROUP BY user_id
            HAVING COUNT(DISTINCT revenue_date) >= 10
            ORDER BY total_revenue_90d DESC
        """)
        return len(result)
    
    async def _client_crm_query(self, conn) -> int:
        """Simulate client CRM query"""
        result = await conn.fetch("""
            WITH client_metrics AS (
                SELECT 
                    c.id as client_id,
                    c.user_id,
                    c.first_name,
                    c.last_name,
                    c.email,
                    COUNT(a.id) as total_appointments,
                    COALESCE(SUM(p.amount), 0) as lifetime_value,
                    MAX(a.appointment_datetime) as last_appointment,
                    MIN(a.appointment_datetime) as first_appointment,
                    AVG(EXTRACT(EPOCH FROM (a.appointment_datetime - LAG(a.appointment_datetime) 
                        OVER (PARTITION BY c.id ORDER BY a.appointment_datetime)))) / 86400 as avg_days_between_visits
                FROM clients c
                LEFT JOIN appointments a ON c.id = a.client_id
                LEFT JOIN payments p ON a.id = p.appointment_id AND p.status = 'completed'
                WHERE c.user_id <= 50
                GROUP BY c.id, c.user_id, c.first_name, c.last_name, c.email
            ),
            client_tiers AS (
                SELECT 
                    *,
                    CASE 
                        WHEN lifetime_value >= 2000 AND total_appointments >= 20 THEN 'PREMIUM_VIP'
                        WHEN lifetime_value >= 1000 AND total_appointments >= 10 THEN 'CORE_REGULAR'
                        WHEN lifetime_value >= 500 AND total_appointments >= 5 THEN 'DEVELOPING'
                        WHEN total_appointments > 0 THEN 'NEW_CLIENT'
                        ELSE 'PROSPECT'
                    END as value_tier,
                    CASE 
                        WHEN last_appointment < NOW() - INTERVAL '90 days' THEN 'AT_RISK'
                        WHEN last_appointment < NOW() - INTERVAL '60 days' THEN 'DECLINING'
                        WHEN avg_days_between_visits <= 30 THEN 'HIGHLY_ENGAGED'
                        WHEN avg_days_between_visits <= 45 THEN 'REGULARLY_ENGAGED'
                        ELSE 'MODERATELY_ENGAGED'
                    END as engagement_status
                FROM client_metrics
            )
            SELECT 
                user_id,
                value_tier,
                engagement_status,
                COUNT(*) as client_count,
                AVG(lifetime_value) as avg_lifetime_value,
                AVG(total_appointments) as avg_appointments,
                AVG(avg_days_between_visits) as avg_visit_frequency
            FROM client_tiers
            WHERE total_appointments > 0
            GROUP BY user_id, value_tier, engagement_status
            ORDER BY user_id, avg_lifetime_value DESC
        """)
        return len(result)
    
    async def _appointment_booking_insert(self, conn) -> int:
        """Simulate appointment booking insertion"""
        # Get random user and client
        user_client = await conn.fetchrow("""
            SELECT u.id as user_id, c.id as client_id
            FROM users u
            JOIN clients c ON u.id = c.user_id
            WHERE u.id <= 100
            ORDER BY RANDOM()
            LIMIT 1
        """)
        
        if user_client:
            # Insert new appointment
            appointment_time = datetime.now() + timedelta(days=1, hours=8 + (hash(str(time.time())) % 8))
            
            await conn.execute("""
                INSERT INTO appointments (user_id, client_id, appointment_datetime, duration, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, user_client['user_id'], user_client['client_id'], appointment_time, 60, 'scheduled', datetime.now())
            
            return 1
        return 0
    
    async def _client_value_calculation_query(self, conn) -> int:
        """Simulate complex client value calculation"""
        result = await conn.fetch("""
            WITH client_behavior AS (
                SELECT 
                    c.id as client_id,
                    c.user_id,
                    COUNT(a.id) as visit_count,
                    COALESCE(SUM(p.amount), 0) as total_spent,
                    COALESCE(AVG(p.amount), 0) as avg_ticket,
                    MAX(a.appointment_datetime) as last_visit,
                    MIN(a.appointment_datetime) as first_visit,
                    EXTRACT(DAYS FROM (MAX(a.appointment_datetime) - MIN(a.appointment_datetime))) as customer_lifespan_days,
                    COUNT(DISTINCT EXTRACT(MONTH FROM a.appointment_datetime)) as active_months
                FROM clients c
                LEFT JOIN appointments a ON c.id = a.client_id
                LEFT JOIN payments p ON a.id = p.appointment_id AND p.status = 'completed'
                WHERE c.user_id <= 50
                GROUP BY c.id, c.user_id
                HAVING COUNT(a.id) > 0
            ),
            value_scores AS (
                SELECT 
                    *,
                    -- Recency Score (0-100)
                    GREATEST(0, 100 - EXTRACT(DAYS FROM (NOW() - last_visit)) * 2) as recency_score,
                    -- Frequency Score (0-100)
                    LEAST(100, visit_count * 10) as frequency_score,
                    -- Monetary Score (0-100)
                    LEAST(100, total_spent / 20) as monetary_score,
                    -- Loyalty Score
                    CASE 
                        WHEN customer_lifespan_days > 0 
                        THEN LEAST(100, (visit_count::float / (customer_lifespan_days / 30.0)) * 50)
                        ELSE 0 
                    END as loyalty_score
                FROM client_behavior
            )
            SELECT 
                client_id,
                user_id,
                visit_count,
                total_spent,
                avg_ticket,
                recency_score,
                frequency_score,
                monetary_score,
                loyalty_score,
                (recency_score + frequency_score + monetary_score + loyalty_score) / 4 as overall_value_score,
                CASE 
                    WHEN (recency_score + frequency_score + monetary_score + loyalty_score) / 4 >= 80 THEN 'HIGH_VALUE'
                    WHEN (recency_score + frequency_score + monetary_score + loyalty_score) / 4 >= 60 THEN 'MEDIUM_VALUE'
                    WHEN (recency_score + frequency_score + monetary_score + loyalty_score) / 4 >= 40 THEN 'DEVELOPING_VALUE'
                    ELSE 'LOW_VALUE'
                END as value_segment
            FROM value_scores
            ORDER BY overall_value_score DESC
        """)
        return len(result)
    
    async def _service_excellence_tracking_insert(self, conn) -> int:
        """Simulate service excellence tracking insertion"""
        # This would insert into six_figure_barber tables if they exist
        # For now, we'll simulate with a simple operation
        result = await conn.fetchval("""
            SELECT COUNT(*) FROM appointments 
            WHERE appointment_datetime >= NOW() - INTERVAL '7 days'
            AND user_id <= 20
        """)
        return result or 0
    
    async def _generate_database_report(self) -> Dict[str, Any]:
        """Generate comprehensive database performance report"""
        logger.info("📋 Generating database performance report")
        
        if not self.query_metrics:
            logger.warning("No query metrics collected")
            return {}
        
        # Convert metrics to DataFrame for analysis
        metrics_df = pd.DataFrame([asdict(m) for m in self.query_metrics])
        
        # Calculate performance statistics
        successful_metrics = metrics_df[metrics_df['success'] == True]
        response_times = successful_metrics['execution_time_ms'].tolist()
        
        total_duration = (datetime.now() - self.test_start_time).total_seconds() / 60
        
        performance_stats = {
            'test_duration_minutes': total_duration,
            'total_queries': len(self.query_metrics),
            'successful_queries': len(successful_metrics),
            'failed_queries': len(metrics_df[metrics_df['success'] == False]),
            'success_rate_percent': (len(successful_metrics) / len(self.query_metrics)) * 100,
            'queries_per_second': len(self.query_metrics) / (total_duration * 60),
            
            'response_time_stats': {
                'average_ms': statistics.mean(response_times) if response_times else 0,
                'median_ms': statistics.median(response_times) if response_times else 0,
                'p95_ms': self._percentile(response_times, 95) if response_times else 0,
                'p99_ms': self._percentile(response_times, 99) if response_times else 0,
                'min_ms': min(response_times) if response_times else 0,
                'max_ms': max(response_times) if response_times else 0
            },
            
            'query_breakdown': dict(metrics_df['query_type'].value_counts()),
            'concurrent_connections': self.config.concurrent_queries
        }
        
        # Query type analysis
        query_analysis = {}
        for query_type in metrics_df['query_type'].unique():
            type_metrics = metrics_df[metrics_df['query_type'] == query_type]
            type_successful = type_metrics[type_metrics['success'] == True]
            type_response_times = type_successful['execution_time_ms'].tolist()
            
            query_analysis[query_type] = {
                'total_queries': len(type_metrics),
                'success_rate': (len(type_successful) / len(type_metrics)) * 100,
                'avg_response_time_ms': statistics.mean(type_response_times) if type_response_times else 0,
                'p95_response_time_ms': self._percentile(type_response_times, 95) if type_response_times else 0
            }
        
        # Performance assessment
        assessment = self._assess_database_performance(performance_stats)
        
        # Error analysis
        error_analysis = self._analyze_database_errors(metrics_df)
        
        report = {
            'test_summary': {
                'start_time': self.test_start_time.isoformat(),
                'end_time': datetime.now().isoformat(),
                'configuration': asdict(self.config)
            },
            'performance_statistics': performance_stats,
            'query_type_analysis': query_analysis,
            'error_analysis': error_analysis,
            'performance_assessment': assessment,
            'recommendations': self._generate_database_recommendations(performance_stats, query_analysis, error_analysis)
        }
        
        # Save report
        await self._save_database_report(report)
        
        # Generate visualizations
        await self._generate_database_visualizations(metrics_df)
        
        return report
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data"""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    def _assess_database_performance(self, stats: Dict[str, Any]) -> Dict[str, str]:
        """Assess database performance against enterprise criteria"""
        assessment = {}
        
        # Response Time Assessment
        avg_response = stats['response_time_stats']['average_ms']
        if avg_response < 100:
            assessment['response_time'] = 'EXCELLENT - Database queries very fast'
        elif avg_response < 500:
            assessment['response_time'] = 'GOOD - Database performance acceptable'
        elif avg_response < 1000:
            assessment['response_time'] = 'CAUTION - Database queries getting slow'
        else:
            assessment['response_time'] = 'CRITICAL - Database performance unacceptable'
        
        # Throughput Assessment
        qps = stats['queries_per_second']
        if qps > 100:
            assessment['throughput'] = 'EXCELLENT - High query throughput'
        elif qps > 50:
            assessment['throughput'] = 'GOOD - Adequate query throughput'
        elif qps > 20:
            assessment['throughput'] = 'CAUTION - Lower query throughput'
        else:
            assessment['throughput'] = 'CRITICAL - Very low query throughput'
        
        # Reliability Assessment
        success_rate = stats['success_rate_percent']
        if success_rate > 99.5:
            assessment['reliability'] = 'EXCELLENT - Very high reliability'
        elif success_rate > 99:
            assessment['reliability'] = 'GOOD - High reliability'
        elif success_rate > 95:
            assessment['reliability'] = 'CAUTION - Some query failures'
        else:
            assessment['reliability'] = 'CRITICAL - High failure rate'
        
        return assessment
    
    def _analyze_database_errors(self, metrics_df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze database errors"""
        failed_metrics = metrics_df[metrics_df['success'] == False]
        
        if len(failed_metrics) == 0:
            return {'total_errors': 0, 'error_types': {}, 'error_rate_by_query': {}}
        
        error_types = failed_metrics['error_message'].value_counts().to_dict()
        error_rate_by_query = {}
        
        for query_type in metrics_df['query_type'].unique():
            type_metrics = metrics_df[metrics_df['query_type'] == query_type]
            type_errors = len(type_metrics[type_metrics['success'] == False])
            error_rate_by_query[query_type] = (type_errors / len(type_metrics)) * 100
        
        return {
            'total_errors': len(failed_metrics),
            'error_types': error_types,
            'error_rate_by_query': error_rate_by_query
        }
    
    def _generate_database_recommendations(self, performance_stats: Dict, query_analysis: Dict, error_analysis: Dict) -> List[str]:
        """Generate database optimization recommendations"""
        recommendations = []
        
        # Response time recommendations
        if performance_stats['response_time_stats']['average_ms'] > 500:
            recommendations.append("🐌 SLOW QUERIES: Add database indexes for frequently queried columns")
            recommendations.append("📊 QUERY OPTIMIZATION: Review and optimize complex Six Figure Barber analytics queries")
        
        if performance_stats['response_time_stats']['p95_ms'] > 2000:
            recommendations.append("⚡ HIGH LATENCY: Implement query result caching for dashboard queries")
        
        # Throughput recommendations
        if performance_stats['queries_per_second'] < 50:
            recommendations.append("🚀 LOW THROUGHPUT: Consider connection pooling optimization")
            recommendations.append("🔧 HARDWARE: Evaluate database server CPU and memory resources")
        
        # Query-specific recommendations
        for query_type, analysis in query_analysis.items():
            if analysis['avg_response_time_ms'] > 1000:
                recommendations.append(f"📈 OPTIMIZE {query_type.upper()}: Query taking {analysis['avg_response_time_ms']:.0f}ms on average")
        
        # Error recommendations
        if error_analysis['total_errors'] > 0:
            recommendations.append(f"🚨 ERROR HANDLING: Fix {error_analysis['total_errors']} database errors")
            
            for query_type, error_rate in error_analysis['error_rate_by_query'].items():
                if error_rate > 5:
                    recommendations.append(f"❌ {query_type.upper()}: {error_rate:.1f}% error rate needs investigation")
        
        # Six Figure Barber specific recommendations
        if 'six_fb_dashboard_query' in query_analysis:
            dashboard_perf = query_analysis['six_fb_dashboard_query']
            if dashboard_perf['avg_response_time_ms'] > 800:
                recommendations.append("📊 SIX FIGURE BARBER: Dashboard queries need optimization for real-time UX")
        
        return recommendations
    
    async def _save_database_report(self, report: Dict[str, Any]):
        """Save database performance report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"database_load_test_report_{timestamp}.json"
        filepath = f"results/{filename}"
        
        os.makedirs("results", exist_ok=True)
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"📄 Database report saved to {filepath}")
    
    async def _generate_database_visualizations(self, metrics_df: pd.DataFrame):
        """Generate database performance visualizations"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Set up plotting style
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
        # Create subplots
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle('BookedBarber V2 Database Load Test Results', fontsize=16)
        
        # Response time distribution
        successful_metrics = metrics_df[metrics_df['success'] == True]
        axes[0, 0].hist(successful_metrics['execution_time_ms'], bins=50, alpha=0.7, color='skyblue')
        axes[0, 0].set_title('Query Response Time Distribution')
        axes[0, 0].set_xlabel('Response Time (ms)')
        axes[0, 0].set_ylabel('Frequency')
        axes[0, 0].axvline(successful_metrics['execution_time_ms'].mean(), color='red', linestyle='--', label='Average')
        axes[0, 0].legend()
        
        # Query type performance
        query_performance = successful_metrics.groupby('query_type')['execution_time_ms'].mean().sort_values()
        query_performance.plot(kind='barh', ax=axes[0, 1], color='lightgreen')
        axes[0, 1].set_title('Average Response Time by Query Type')
        axes[0, 1].set_xlabel('Average Response Time (ms)')
        
        # Query volume over time
        metrics_df['minute'] = metrics_df['timestamp'].dt.floor('T')
        queries_per_minute = metrics_df.groupby('minute').size()
        queries_per_minute.plot(ax=axes[1, 0], color='orange', linewidth=2)
        axes[1, 0].set_title('Queries Per Minute Over Time')
        axes[1, 0].set_ylabel('Queries/Minute')
        axes[1, 0].tick_params(axis='x', rotation=45)
        
        # Success rate by query type
        success_rates = metrics_df.groupby('query_type')['success'].mean() * 100
        success_rates.plot(kind='bar', ax=axes[1, 1], color='lightcoral')
        axes[1, 1].set_title('Success Rate by Query Type')
        axes[1, 1].set_ylabel('Success Rate (%)')
        axes[1, 1].tick_params(axis='x', rotation=45)
        axes[1, 1].axhline(y=99, color='green', linestyle='--', alpha=0.7, label='Target (99%)')
        axes[1, 1].legend()
        
        plt.tight_layout()
        plt.savefig(f'results/database_performance_{timestamp}.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"📊 Database visualizations saved to results/database_performance_{timestamp}.png")

async def main():
    """Main execution function"""
    config = DatabaseConfig()
    tester = PostgreSQLLoadTester(config)
    
    print("🗄️ BookedBarber V2 PostgreSQL Database Load Test")
    print(f"📊 Target: {config.concurrent_queries} concurrent queries for {config.test_duration_minutes} minutes")
    print(f"🎯 Testing: {config.host}:{config.port}/{config.database}")
    
    try:
        report = await tester.run_database_load_test()
        
        print("\n✅ Database Load Test Complete!")
        print(f"📈 Total Queries: {report.get('performance_statistics', {}).get('total_queries', 'Unknown')}")
        print(f"📉 Success Rate: {report.get('performance_statistics', {}).get('success_rate_percent', 'Unknown'):.2f}%")
        print(f"⚡ Avg Response Time: {report.get('performance_statistics', {}).get('response_time_stats', {}).get('average_ms', 'Unknown'):.1f}ms")
        print(f"🚀 Queries/Second: {report.get('performance_statistics', {}).get('queries_per_second', 'Unknown'):.1f}")
        
        assessment = report.get('performance_assessment', {})
        print(f"\n📋 Performance Assessment:")
        for component, status in assessment.items():
            print(f"  {component}: {status}")
        
        recommendations = report.get('recommendations', [])
        if recommendations:
            print(f"\n💡 Recommendations:")
            for rec in recommendations:
                print(f"  • {rec}")
        
    except Exception as e:
        print(f"❌ Database load test failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(asyncio.run(main()))