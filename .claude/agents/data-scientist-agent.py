#!/usr/bin/env python3
"""
BookedBarber V2 Data Scientist Agent
Specialized agent for data analysis, SQL optimization, business intelligence, and Six Figure Barber methodology analytics
"""

import json
import logging
import sqlite3
import psycopg2
import pandas as pd
import numpy as np
import sys
import os
import time
import requests
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import re
import statistics
from collections import defaultdict, Counter
import warnings
warnings.filterwarnings('ignore')

# Add the parent directory to Python path for imports
sys.path.append(str(Path(__file__).parent.parent))

@dataclass
class AnalysisResult:
    """Structure for analysis results"""
    query: str
    result: Any
    insights: List[str]
    recommendations: List[str]
    metrics: Dict[str, float]
    execution_time: float
    confidence_score: float

@dataclass
class SQLOptimization:
    """Structure for SQL optimization recommendations"""
    original_query: str
    optimized_query: str
    performance_improvement: float
    index_recommendations: List[str]
    explanation: str

class SixFigureBarberAnalytics:
    """Analytics focused on Six Figure Barber methodology principles"""
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.revenue_metrics = {}
        self.client_metrics = {}
        self.efficiency_metrics = {}
        self.growth_metrics = {}
        self.scalability_metrics = {}
    
    def analyze_revenue_optimization(self) -> Dict[str, Any]:
        """Analyze revenue optimization metrics aligned with Six Figure Barber methodology"""
        try:
            # Average revenue per barber
            revenue_query = """
            SELECT 
                b.id as barber_id,
                b.name,
                COUNT(a.id) as total_appointments,
                SUM(s.price) as total_revenue,
                AVG(s.price) as avg_service_price,
                COUNT(DISTINCT a.client_id) as unique_clients,
                SUM(s.price) / COUNT(DISTINCT a.client_id) as client_lifetime_value
            FROM barbers b
            LEFT JOIN appointments a ON b.id = a.barber_id 
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY b.id, b.name
            ORDER BY total_revenue DESC
            """
            
            df = pd.read_sql(revenue_query, self.db)
            
            metrics = {
                'avg_revenue_per_barber': df['total_revenue'].mean(),
                'top_performer_revenue': df['total_revenue'].max(),
                'revenue_variance': df['total_revenue'].var(),
                'avg_client_ltv': df['client_lifetime_value'].mean(),
                'price_optimization_potential': self._calculate_price_optimization(df)
            }
            
            insights = [
                f"Top performing barber generates ${metrics['top_performer_revenue']:.2f} monthly",
                f"Average client lifetime value: ${metrics['avg_client_ltv']:.2f}",
                f"Revenue variance indicates {metrics['price_optimization_potential']:.1f}% optimization potential"
            ]
            
            return {
                'metrics': metrics,
                'insights': insights,
                'data': df.to_dict('records')
            }
            
        except Exception as e:
            logging.error(f"Revenue analysis error: {e}")
            return {'error': str(e)}
    
    def analyze_client_value_creation(self) -> Dict[str, Any]:
        """Analyze client satisfaction, retention, and value creation"""
        try:
            client_analysis_query = """
            SELECT 
                c.id as client_id,
                COUNT(a.id) as total_appointments,
                AVG(a.rating) as avg_rating,
                MAX(a.created_at) as last_appointment,
                MIN(a.created_at) as first_appointment,
                EXTRACT(DAYS FROM (MAX(a.created_at) - MIN(a.created_at))) as client_lifespan_days,
                SUM(s.price) as total_spent,
                COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancellations,
                COUNT(CASE WHEN a.rating >= 4 THEN 1 END) as high_satisfaction_appointments
            FROM clients c
            JOIN appointments a ON c.id = a.client_id
            JOIN services s ON a.service_id = s.id
            WHERE a.created_at >= NOW() - INTERVAL '90 days'
            GROUP BY c.id
            HAVING COUNT(a.id) > 1
            """
            
            df = pd.read_sql(client_analysis_query, self.db)
            
            # Calculate retention and satisfaction metrics
            df['retention_rate'] = 1 - (df['cancellations'] / df['total_appointments'])
            df['satisfaction_rate'] = df['high_satisfaction_appointments'] / df['total_appointments']
            df['avg_spend_per_visit'] = df['total_spent'] / df['total_appointments']
            
            metrics = {
                'avg_retention_rate': df['retention_rate'].mean(),
                'avg_satisfaction_rate': df['satisfaction_rate'].mean(),
                'high_value_clients_pct': len(df[df['total_spent'] > df['total_spent'].quantile(0.8)]) / len(df) * 100,
                'client_lifespan_avg': df['client_lifespan_days'].mean(),
                'repeat_client_rate': len(df[df['total_appointments'] > 3]) / len(df) * 100
            }
            
            insights = [
                f"Client retention rate: {metrics['avg_retention_rate']:.1%}",
                f"Average satisfaction rating: {metrics['avg_satisfaction_rate']:.1%}",
                f"{metrics['high_value_clients_pct']:.1f}% of clients are high-value contributors",
                f"Average client lifespan: {metrics['client_lifespan_avg']:.0f} days"
            ]
            
            return {
                'metrics': metrics,
                'insights': insights,
                'recommendations': self._generate_client_value_recommendations(metrics)
            }
            
        except Exception as e:
            logging.error(f"Client value analysis error: {e}")
            return {'error': str(e)}
    
    def analyze_business_efficiency(self) -> Dict[str, Any]:
        """Analyze operational efficiency and time utilization"""
        try:
            efficiency_query = """
            SELECT 
                b.id as barber_id,
                b.name,
                COUNT(a.id) as appointments_count,
                SUM(s.duration_minutes) as total_service_minutes,
                AVG(s.duration_minutes) as avg_service_duration,
                COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as no_shows,
                COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancellations,
                COUNT(CASE WHEN a.created_at = a.scheduled_date THEN 1 END) as same_day_bookings
            FROM barbers b
            JOIN appointments a ON b.id = a.barber_id
            JOIN services s ON a.service_id = s.id
            WHERE a.scheduled_date >= NOW() - INTERVAL '30 days'
            GROUP BY b.id, b.name
            """
            
            df = pd.read_sql(efficiency_query, self.db)
            
            # Calculate efficiency metrics
            df['utilization_rate'] = df['total_service_minutes'] / (30 * 8 * 60)  # 30 days, 8 hours/day
            df['no_show_rate'] = df['no_shows'] / df['appointments_count']
            df['cancellation_rate'] = df['cancellations'] / df['appointments_count']
            df['booking_efficiency'] = 1 - (df['no_show_rate'] + df['cancellation_rate'])
            
            metrics = {
                'avg_utilization_rate': df['utilization_rate'].mean(),
                'avg_no_show_rate': df['no_show_rate'].mean(),
                'avg_cancellation_rate': df['cancellation_rate'].mean(),
                'avg_booking_efficiency': df['booking_efficiency'].mean(),
                'time_optimization_potential': self._calculate_time_optimization(df)
            }
            
            insights = [
                f"Average barber utilization: {metrics['avg_utilization_rate']:.1%}",
                f"No-show rate: {metrics['avg_no_show_rate']:.1%}",
                f"Booking efficiency: {metrics['avg_booking_efficiency']:.1%}",
                f"Time optimization potential: {metrics['time_optimization_potential']:.1f}%"
            ]
            
            return {
                'metrics': metrics,
                'insights': insights,
                'recommendations': self._generate_efficiency_recommendations(metrics)
            }
            
        except Exception as e:
            logging.error(f"Efficiency analysis error: {e}")
            return {'error': str(e)}
    
    def _calculate_price_optimization(self, df: pd.DataFrame) -> float:
        """Calculate potential for price optimization"""
        if df.empty:
            return 0.0
        
        price_variance = df['avg_service_price'].var()
        price_mean = df['avg_service_price'].mean()
        
        # Higher variance suggests optimization opportunity
        return min((price_variance / price_mean) * 100, 50.0) if price_mean > 0 else 0.0
    
    def _calculate_time_optimization(self, df: pd.DataFrame) -> float:
        """Calculate potential for time optimization"""
        if df.empty:
            return 0.0
        
        # Calculate optimization based on underutilization and booking inefficiencies
        avg_utilization = df['utilization_rate'].mean()
        avg_efficiency = df['booking_efficiency'].mean()
        
        # Potential improvement from reaching 85% utilization and 95% efficiency
        utilization_gap = max(0, 0.85 - avg_utilization) * 100
        efficiency_gap = max(0, 0.95 - avg_efficiency) * 100
        
        return (utilization_gap + efficiency_gap) / 2
    
    def _generate_client_value_recommendations(self, metrics: Dict) -> List[str]:
        """Generate recommendations for improving client value"""
        recommendations = []
        
        if metrics['avg_retention_rate'] < 0.8:
            recommendations.append("Implement client retention program with loyalty rewards")
        
        if metrics['avg_satisfaction_rate'] < 0.9:
            recommendations.append("Focus on service quality improvement and barber training")
        
        if metrics['client_lifespan_avg'] < 180:
            recommendations.append("Develop long-term client relationship strategies")
        
        if metrics['repeat_client_rate'] < 70:
            recommendations.append("Create incentives for repeat bookings and referrals")
        
        return recommendations
    
    def _generate_efficiency_recommendations(self, metrics: Dict) -> List[str]:
        """Generate recommendations for improving operational efficiency"""
        recommendations = []
        
        if metrics['avg_utilization_rate'] < 0.7:
            recommendations.append("Optimize scheduling to increase barber utilization")
        
        if metrics['avg_no_show_rate'] > 0.1:
            recommendations.append("Implement no-show prevention strategies and policies")
        
        if metrics['avg_cancellation_rate'] > 0.15:
            recommendations.append("Review cancellation policies and communication")
        
        if metrics['time_optimization_potential'] > 20:
            recommendations.append("Consider time blocking and advanced scheduling optimization")
        
        return recommendations

class DatabaseOptimizer:
    """SQL query optimization and database performance analysis"""
    
    def __init__(self, db_connection, db_type='postgresql'):
        self.db = db_connection
        self.db_type = db_type
        
    def analyze_query_performance(self, query: str) -> SQLOptimization:
        """Analyze and optimize SQL query performance"""
        start_time = time.time()
        
        try:
            # Execute EXPLAIN for query analysis
            if self.db_type == 'postgresql':
                explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
            else:
                explain_query = f"EXPLAIN QUERY PLAN {query}"
            
            cursor = self.db.cursor()
            cursor.execute(explain_query)
            plan = cursor.fetchall()
            
            execution_time = time.time() - start_time
            
            # Analyze plan and generate optimization
            optimization = self._optimize_query(query, plan, execution_time)
            
            return optimization
            
        except Exception as e:
            logging.error(f"Query analysis error: {e}")
            return SQLOptimization(
                original_query=query,
                optimized_query=query,
                performance_improvement=0.0,
                index_recommendations=[],
                explanation=f"Analysis failed: {str(e)}"
            )
    
    def _optimize_query(self, query: str, plan: Any, execution_time: float) -> SQLOptimization:
        """Generate query optimization recommendations"""
        
        # Basic optimization patterns
        optimized_query = self._apply_basic_optimizations(query)
        index_recommendations = self._suggest_indexes(query, plan)
        
        # Estimate performance improvement
        improvement = self._estimate_improvement(query, optimized_query, plan)
        
        explanation = self._generate_optimization_explanation(query, optimized_query, index_recommendations)
        
        return SQLOptimization(
            original_query=query,
            optimized_query=optimized_query,
            performance_improvement=improvement,
            index_recommendations=index_recommendations,
            explanation=explanation
        )
    
    def _apply_basic_optimizations(self, query: str) -> str:
        """Apply basic SQL optimization patterns"""
        optimized = query
        
        # Add common optimizations
        patterns = [
            # Use EXISTS instead of IN for subqueries
            (r'WHERE\s+(\w+)\s+IN\s*\(SELECT', r'WHERE EXISTS (SELECT 1 FROM'),
            # Use specific columns instead of SELECT *
            (r'SELECT\s+\*\s+FROM', 'SELECT specific_columns FROM'),
            # Add LIMIT for potentially large result sets
        ]
        
        for pattern, replacement in patterns:
            optimized = re.sub(pattern, replacement, optimized, flags=re.IGNORECASE)
        
        return optimized
    
    def _suggest_indexes(self, query: str, plan: Any) -> List[str]:
        """Suggest database indexes based on query patterns"""
        indexes = []
        
        # Extract table and column patterns from query
        where_matches = re.findall(r'WHERE\s+(\w+)\.(\w+)', query, re.IGNORECASE)
        join_matches = re.findall(r'JOIN\s+(\w+)\s+\w+\s+ON\s+\w+\.(\w+)\s*=\s*\w+\.(\w+)', query, re.IGNORECASE)
        order_matches = re.findall(r'ORDER\s+BY\s+(\w+)\.(\w+)', query, re.IGNORECASE)
        
        # Generate index suggestions
        for table, column in where_matches:
            indexes.append(f"CREATE INDEX idx_{table}_{column} ON {table}({column});")
        
        for table, col1, col2 in join_matches:
            indexes.append(f"CREATE INDEX idx_{table}_{col1}_{col2} ON {table}({col1}, {col2});")
        
        for table, column in order_matches:
            indexes.append(f"CREATE INDEX idx_{table}_{column}_sort ON {table}({column});")
        
        return list(set(indexes))  # Remove duplicates
    
    def _estimate_improvement(self, original: str, optimized: str, plan: Any) -> float:
        """Estimate performance improvement percentage"""
        
        # Basic heuristic based on query complexity reduction
        original_complexity = len(re.findall(r'JOIN|WHERE|GROUP BY|ORDER BY', original, re.IGNORECASE))
        optimized_complexity = len(re.findall(r'JOIN|WHERE|GROUP BY|ORDER BY', optimized, re.IGNORECASE))
        
        if original_complexity > 0:
            complexity_reduction = max(0, (original_complexity - optimized_complexity) / original_complexity)
            return complexity_reduction * 30  # Estimate up to 30% improvement
        
        return 5.0  # Default 5% improvement estimate
    
    def _generate_optimization_explanation(self, original: str, optimized: str, indexes: List[str]) -> str:
        """Generate human-readable explanation of optimizations"""
        
        explanation = "Query Optimization Analysis:\n\n"
        
        if original != optimized:
            explanation += "✓ Query structure optimizations applied\n"
        
        if indexes:
            explanation += f"✓ {len(indexes)} index recommendations generated\n"
        
        explanation += "\nRecommendations:\n"
        explanation += "- Consider adding suggested indexes for better performance\n"
        explanation += "- Monitor query execution plans after changes\n"
        explanation += "- Use connection pooling for database connections\n"
        
        return explanation

class StatisticalAnalyzer:
    """Statistical analysis and A/B testing capabilities"""
    
    def __init__(self, db_connection):
        self.db = db_connection
    
    def analyze_conversion_funnel(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Analyze booking conversion funnel"""
        try:
            funnel_query = """
            SELECT 
                'page_visit' as stage,
                COUNT(DISTINCT session_id) as users,
                1 as step_order
            FROM analytics_events 
            WHERE event_type = 'page_view' 
                AND page_path LIKE '%/book%'
                AND created_at BETWEEN %s AND %s
            
            UNION ALL
            
            SELECT 
                'service_selection' as stage,
                COUNT(DISTINCT session_id) as users,
                2 as step_order
            FROM analytics_events 
            WHERE event_type = 'service_selected'
                AND created_at BETWEEN %s AND %s
            
            UNION ALL
            
            SELECT 
                'appointment_booking' as stage,
                COUNT(DISTINCT client_id) as users,
                3 as step_order
            FROM appointments 
            WHERE created_at BETWEEN %s AND %s
            
            ORDER BY step_order
            """
            
            df = pd.read_sql(funnel_query, self.db, params=[start_date, end_date] * 3)
            
            # Calculate conversion rates
            if len(df) > 1:
                df['conversion_rate'] = df['users'] / df['users'].iloc[0]
                df['step_conversion'] = df['users'] / df['users'].shift(1)
            
            # Calculate funnel metrics
            total_visitors = df['users'].iloc[0] if len(df) > 0 else 0
            final_conversions = df['users'].iloc[-1] if len(df) > 0 else 0
            overall_conversion = final_conversions / total_visitors if total_visitors > 0 else 0
            
            insights = [
                f"Total funnel visitors: {total_visitors:,}",
                f"Final conversions: {final_conversions:,}",
                f"Overall conversion rate: {overall_conversion:.2%}",
            ]
            
            # Identify bottlenecks
            if len(df) > 1:
                bottleneck_stage = df.loc[df['step_conversion'].idxmin(), 'stage']
                insights.append(f"Biggest conversion bottleneck: {bottleneck_stage}")
            
            return {
                'funnel_data': df.to_dict('records'),
                'metrics': {
                    'total_visitors': total_visitors,
                    'final_conversions': final_conversions,
                    'overall_conversion_rate': overall_conversion
                },
                'insights': insights
            }
            
        except Exception as e:
            logging.error(f"Funnel analysis error: {e}")
            return {'error': str(e)}
    
    def perform_ab_test_analysis(self, test_name: str, metric: str) -> Dict[str, Any]:
        """Perform A/B test statistical analysis"""
        try:
            ab_test_query = """
            SELECT 
                variant,
                COUNT(*) as sample_size,
                AVG(CASE WHEN %s IS NOT NULL THEN %s ELSE 0 END) as conversion_rate,
                STDDEV(CASE WHEN %s IS NOT NULL THEN %s ELSE 0 END) as std_dev
            FROM ab_test_results 
            WHERE test_name = %s
            GROUP BY variant
            """
            
            df = pd.read_sql(ab_test_query, self.db, params=[metric, metric, metric, metric, test_name])
            
            if len(df) < 2:
                return {'error': 'Insufficient data for A/B test analysis'}
            
            # Calculate statistical significance
            control = df[df['variant'] == 'control'].iloc[0]
            treatment = df[df['variant'] == 'treatment'].iloc[0]
            
            # Z-test for proportions
            p1, n1 = control['conversion_rate'], control['sample_size']
            p2, n2 = treatment['conversion_rate'], treatment['sample_size']
            
            pooled_p = (p1 * n1 + p2 * n2) / (n1 + n2)
            se = np.sqrt(pooled_p * (1 - pooled_p) * (1/n1 + 1/n2))
            
            z_score = (p2 - p1) / se if se > 0 else 0
            p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
            
            # Effect size and confidence interval
            effect_size = (p2 - p1) / p1 if p1 > 0 else 0
            margin_of_error = 1.96 * se  # 95% confidence interval
            
            results = {
                'control_conversion': p1,
                'treatment_conversion': p2,
                'effect_size': effect_size,
                'z_score': z_score,
                'p_value': p_value,
                'is_significant': p_value < 0.05,
                'confidence_interval': [p2 - margin_of_error, p2 + margin_of_error],
                'sample_sizes': {'control': n1, 'treatment': n2}
            }
            
            insights = [
                f"Control conversion rate: {p1:.3%}",
                f"Treatment conversion rate: {p2:.3%}",
                f"Effect size: {effect_size:.1%}",
                f"Statistical significance: {'Yes' if results['is_significant'] else 'No'} (p={p_value:.4f})"
            ]
            
            return {
                'results': results,
                'insights': insights,
                'recommendation': self._generate_ab_test_recommendation(results)
            }
            
        except Exception as e:
            logging.error(f"A/B test analysis error: {e}")
            return {'error': str(e)}
    
    def _generate_ab_test_recommendation(self, results: Dict) -> str:
        """Generate recommendation based on A/B test results"""
        
        if not results['is_significant']:
            return "Results are not statistically significant. Continue testing or increase sample size."
        
        if results['effect_size'] > 0.05:  # 5% improvement
            return f"Treatment shows significant improvement ({results['effect_size']:.1%}). Recommend implementing."
        elif results['effect_size'] < -0.05:
            return f"Treatment shows significant decline ({results['effect_size']:.1%}). Recommend reverting."
        else:
            return "Effect size is minimal. Consider testing more substantial changes."

class DataScientistAgent:
    """Main Data Scientist Agent for BookedBarber V2"""
    
    def __init__(self):
        self.logger = self._setup_logging()
        self.db_connection = None
        self.six_figure_analytics = None
        self.db_optimizer = None
        self.statistical_analyzer = None
        
        # Performance tracking
        self.execution_count = 0
        self.total_execution_time = 0
        self.success_count = 0
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        log_path = "/Users/bossio/6fb-booking/.claude/data-scientist-agent.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_path, mode='a'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        return logging.getLogger(__name__)
    
    def connect_to_database(self) -> bool:
        """Establish database connection"""
        try:
            # Try PostgreSQL first (production)
            try:
                self.db_connection = psycopg2.connect(
                    host=os.getenv('DATABASE_HOST', 'localhost'),
                    port=os.getenv('DATABASE_PORT', '5432'),
                    database=os.getenv('DATABASE_NAME', 'bookedbarber'),
                    user=os.getenv('DATABASE_USER', 'postgres'),
                    password=os.getenv('DATABASE_PASSWORD', '')
                )
                self.db_type = 'postgresql'
                self.logger.info("Connected to PostgreSQL database")
                
            except (psycopg2.Error, Exception):
                # Fallback to SQLite (development)
                db_path = "/Users/bossio/6fb-booking/backend-v2/bookedbarber.db"
                self.db_connection = sqlite3.connect(db_path)
                self.db_type = 'sqlite'
                self.logger.info("Connected to SQLite database")
            
            # Initialize analysis modules
            self.six_figure_analytics = SixFigureBarberAnalytics(self.db_connection)
            self.db_optimizer = DatabaseOptimizer(self.db_connection, self.db_type)
            self.statistical_analyzer = StatisticalAnalyzer(self.db_connection)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            return False
    
    def analyze_database_performance(self) -> Dict[str, Any]:
        """Comprehensive database performance analysis"""
        start_time = time.time()
        
        try:
            performance_metrics = {}
            
            # Query performance analysis
            slow_queries = self._identify_slow_queries()
            performance_metrics['slow_queries'] = slow_queries
            
            # Index analysis
            missing_indexes = self._analyze_missing_indexes()
            performance_metrics['missing_indexes'] = missing_indexes
            
            # Connection and resource analysis
            resource_usage = self._analyze_database_resources()
            performance_metrics['resource_usage'] = resource_usage
            
            # Generate recommendations
            recommendations = self._generate_db_performance_recommendations(performance_metrics)
            
            execution_time = time.time() - start_time
            
            return {
                'performance_metrics': performance_metrics,
                'recommendations': recommendations,
                'execution_time': execution_time,
                'status': 'success'
            }
            
        except Exception as e:
            self.logger.error(f"Database performance analysis failed: {e}")
            return {'error': str(e), 'status': 'failed'}
    
    def analyze_six_figure_barber_metrics(self) -> Dict[str, Any]:
        """Comprehensive Six Figure Barber methodology analysis"""
        start_time = time.time()
        
        try:
            analysis_results = {}
            
            # Revenue optimization analysis
            revenue_analysis = self.six_figure_analytics.analyze_revenue_optimization()
            analysis_results['revenue_optimization'] = revenue_analysis
            
            # Client value creation analysis
            client_analysis = self.six_figure_analytics.analyze_client_value_creation()
            analysis_results['client_value_creation'] = client_analysis
            
            # Business efficiency analysis
            efficiency_analysis = self.six_figure_analytics.analyze_business_efficiency()
            analysis_results['business_efficiency'] = efficiency_analysis
            
            # Generate comprehensive insights
            comprehensive_insights = self._generate_comprehensive_insights(analysis_results)
            
            execution_time = time.time() - start_time
            
            return {
                'analysis_results': analysis_results,
                'comprehensive_insights': comprehensive_insights,
                'execution_time': execution_time,
                'status': 'success'
            }
            
        except Exception as e:
            self.logger.error(f"Six Figure Barber analysis failed: {e}")
            return {'error': str(e), 'status': 'failed'}
    
    def perform_statistical_analysis(self, analysis_type: str, **kwargs) -> Dict[str, Any]:
        """Perform various statistical analyses"""
        start_time = time.time()
        
        try:
            if analysis_type == 'conversion_funnel':
                result = self.statistical_analyzer.analyze_conversion_funnel(
                    kwargs.get('start_date'),
                    kwargs.get('end_date')
                )
            elif analysis_type == 'ab_test':
                result = self.statistical_analyzer.perform_ab_test_analysis(
                    kwargs.get('test_name'),
                    kwargs.get('metric')
                )
            else:
                return {'error': f'Unknown analysis type: {analysis_type}'}
            
            execution_time = time.time() - start_time
            result['execution_time'] = execution_time
            result['status'] = 'success'
            
            return result
            
        except Exception as e:
            self.logger.error(f"Statistical analysis failed: {e}")
            return {'error': str(e), 'status': 'failed'}
    
    def optimize_sql_query(self, query: str) -> Dict[str, Any]:
        """Optimize SQL query performance"""
        start_time = time.time()
        
        try:
            optimization = self.db_optimizer.analyze_query_performance(query)
            
            execution_time = time.time() - start_time
            
            return {
                'optimization': optimization.__dict__,
                'execution_time': execution_time,
                'status': 'success'
            }
            
        except Exception as e:
            self.logger.error(f"SQL optimization failed: {e}")
            return {'error': str(e), 'status': 'failed'}
    
    def _identify_slow_queries(self) -> List[Dict]:
        """Identify slow-performing queries"""
        try:
            if self.db_type == 'postgresql':
                slow_query_sql = """
                SELECT query, mean_time, calls, total_time
                FROM pg_stat_statements 
                WHERE mean_time > 100
                ORDER BY mean_time DESC
                LIMIT 10
                """
            else:
                # For SQLite, we'll analyze query patterns
                return [{'note': 'SQLite slow query analysis requires query logging setup'}]
            
            cursor = self.db_connection.cursor()
            cursor.execute(slow_query_sql)
            results = cursor.fetchall()
            
            slow_queries = []
            for row in results:
                slow_queries.append({
                    'query': row[0][:200] + '...' if len(row[0]) > 200 else row[0],
                    'mean_time': row[1],
                    'calls': row[2],
                    'total_time': row[3]
                })
            
            return slow_queries
            
        except Exception as e:
            self.logger.error(f"Slow query identification failed: {e}")
            return []
    
    def _analyze_missing_indexes(self) -> List[str]:
        """Analyze and suggest missing database indexes"""
        try:
            # Common query patterns that benefit from indexes
            index_suggestions = [
                "CREATE INDEX idx_appointments_barber_date ON appointments(barber_id, scheduled_date);",
                "CREATE INDEX idx_appointments_client_status ON appointments(client_id, status);",
                "CREATE INDEX idx_appointments_created_at ON appointments(created_at);",
                "CREATE INDEX idx_payments_status_created ON payments(status, created_at);",
                "CREATE INDEX idx_services_barber_active ON services(barber_id, is_active);",
                "CREATE INDEX idx_barbers_shop_status ON barbers(shop_id, status);",
                "CREATE INDEX idx_clients_email ON clients(email);",
                "CREATE INDEX idx_analytics_events_session ON analytics_events(session_id, created_at);"
            ]
            
            return index_suggestions
            
        except Exception as e:
            self.logger.error(f"Index analysis failed: {e}")
            return []
    
    def _analyze_database_resources(self) -> Dict[str, Any]:
        """Analyze database resource usage"""
        try:
            if self.db_type == 'postgresql':
                resource_query = """
                SELECT 
                    count(*) as active_connections,
                    (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
                FROM pg_stat_activity 
                WHERE state = 'active'
                """
                
                cursor = self.db_connection.cursor()
                cursor.execute(resource_query)
                result = cursor.fetchone()
                
                return {
                    'active_connections': result[0],
                    'max_connections': result[1],
                    'connection_utilization': result[0] / int(result[1]) * 100
                }
            else:
                return {
                    'note': 'SQLite resource analysis limited',
                    'connection_utilization': 'N/A'
                }
                
        except Exception as e:
            self.logger.error(f"Resource analysis failed: {e}")
            return {}
    
    def _generate_db_performance_recommendations(self, metrics: Dict) -> List[str]:
        """Generate database performance recommendations"""
        recommendations = []
        
        if 'slow_queries' in metrics and metrics['slow_queries']:
            recommendations.append("Optimize identified slow queries with proper indexing")
        
        if 'missing_indexes' in metrics and metrics['missing_indexes']:
            recommendations.append(f"Implement {len(metrics['missing_indexes'])} suggested indexes")
        
        if 'resource_usage' in metrics:
            usage = metrics['resource_usage']
            if isinstance(usage.get('connection_utilization'), (int, float)) and usage['connection_utilization'] > 80:
                recommendations.append("Consider connection pooling - high connection utilization detected")
        
        recommendations.extend([
            "Implement query result caching for frequently accessed data",
            "Consider read replicas for analytics queries",
            "Set up query performance monitoring",
            "Regular database maintenance and statistics updates"
        ])
        
        return recommendations
    
    def _generate_comprehensive_insights(self, results: Dict) -> Dict[str, Any]:
        """Generate comprehensive business insights"""
        insights = {
            'key_findings': [],
            'action_items': [],
            'growth_opportunities': [],
            'risk_factors': []
        }
        
        # Extract key findings from all analyses
        for analysis_type, analysis_data in results.items():
            if 'insights' in analysis_data:
                insights['key_findings'].extend(analysis_data['insights'])
            
            if 'recommendations' in analysis_data:
                insights['action_items'].extend(analysis_data['recommendations'])
        
        # Generate growth opportunities
        insights['growth_opportunities'] = [
            "Implement dynamic pricing based on demand patterns",
            "Develop client loyalty programs for high-value customers",
            "Optimize scheduling for peak revenue hours",
            "Create upselling opportunities through service bundling"
        ]
        
        # Identify risk factors
        insights['risk_factors'] = [
            "Monitor client churn rates and implement retention strategies",
            "Track barber performance variance and provide targeted training",
            "Analyze seasonal booking patterns for resource planning",
            "Implement real-time monitoring for system performance"
        ]
        
        return insights
    
    def execute_triggered_analysis(self, trigger_type: str, context: Dict) -> Dict[str, Any]:
        """Execute analysis based on trigger type"""
        self.execution_count += 1
        start_time = time.time()
        
        try:
            self.logger.info(f"Data Scientist Agent triggered: {trigger_type}")
            
            if not self.connect_to_database():
                return {'error': 'Database connection failed', 'status': 'failed'}
            
            # Route to appropriate analysis based on trigger
            if trigger_type in ['database_performance', 'slow_queries', 'query_optimization']:
                result = self.analyze_database_performance()
            
            elif trigger_type in ['analytics_failure', 'dashboard_error', 'metrics_inconsistency']:
                result = self.analyze_six_figure_barber_metrics()
            
            elif trigger_type in ['ab_testing', 'conversion_analysis', 'statistical_analysis']:
                analysis_type = context.get('analysis_type', 'conversion_funnel')
                result = self.perform_statistical_analysis(analysis_type, **context)
            
            elif trigger_type == 'sql_optimization':
                query = context.get('query', '')
                result = self.optimize_sql_query(query)
            
            else:
                # Default comprehensive analysis
                result = self.analyze_six_figure_barber_metrics()
            
            execution_time = time.time() - start_time
            self.total_execution_time += execution_time
            
            if result.get('status') == 'success':
                self.success_count += 1
            
            # Log execution metrics
            self.logger.info(f"Analysis completed in {execution_time:.2f}s - Success: {result.get('status') == 'success'}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Triggered analysis failed: {e}")
            return {'error': str(e), 'status': 'failed'}
        
        finally:
            if self.db_connection:
                self.db_connection.close()
    
    def get_agent_metrics(self) -> Dict[str, Any]:
        """Get agent performance metrics"""
        return {
            'execution_count': self.execution_count,
            'success_rate': self.success_count / self.execution_count if self.execution_count > 0 else 0,
            'avg_execution_time': self.total_execution_time / self.execution_count if self.execution_count > 0 else 0,
            'total_execution_time': self.total_execution_time
        }

def main():
    """Main execution function for the Data Scientist Agent"""
    import argparse
    
    parser = argparse.ArgumentParser(description='BookedBarber V2 Data Scientist Agent')
    parser.add_argument('--trigger', type=str, required=True, help='Trigger type for analysis')
    parser.add_argument('--context', type=str, default='{}', help='JSON context for the analysis')
    
    args = parser.parse_args()
    
    try:
        context = json.loads(args.context)
    except json.JSONDecodeError:
        context = {}
    
    agent = DataScientistAgent()
    result = agent.execute_triggered_analysis(args.trigger, context)
    
    print(json.dumps(result, indent=2, default=str))
    
    return 0 if result.get('status') == 'success' else 1

if __name__ == '__main__':
    sys.exit(main())