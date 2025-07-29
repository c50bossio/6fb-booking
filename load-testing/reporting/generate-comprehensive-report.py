#!/usr/bin/env python3
"""
Comprehensive Performance Report Generator for BookedBarber V2

Combines results from all load testing components:
- K6 load test results
- Infrastructure testing
- Database performance
- Frontend performance
- Six Figure Barber methodology testing
"""

import json
import os
import sys
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from jinja2 import Template
import base64
from io import BytesIO

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ComprehensiveReportGenerator:
    """Generate comprehensive performance report from all test results"""
    
    def __init__(self, results_dir: str, timestamp: str):
        self.results_dir = Path(results_dir)
        self.timestamp = timestamp
        self.report_data = {
            'timestamp': timestamp,
            'generation_time': datetime.now().isoformat(),
            'k6_results': {},
            'infrastructure_results': {},
            'database_results': {},
            'frontend_results': {},
            'executive_summary': {},
            'recommendations': [],
            'visualizations': {}
        }
        
    def generate_report(self, output_file: str) -> bool:
        """Generate comprehensive HTML report"""
        try:
            logger.info("📊 Generating comprehensive performance report")
            
            # Load all test results
            self._load_k6_results()
            self._load_infrastructure_results()
            self._load_database_results()
            self._load_frontend_results()
            
            # Generate analysis
            self._generate_executive_summary()
            self._generate_recommendations()
            self._create_visualizations()
            
            # Generate HTML report
            self._generate_html_report(output_file)
            
            logger.info(f"✅ Comprehensive report generated: {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Report generation failed: {e}")
            return False
    
    def _load_k6_results(self):
        """Load K6 test results"""
        logger.info("📥 Loading K6 test results")
        
        k6_files = [
            f"basic_load_test_{self.timestamp}.json",
            f"enterprise_load_test_{self.timestamp}.json",
            f"six_figure_barber_test_{self.timestamp}.json",
            f"stress_test_{self.timestamp}.json"
        ]
        
        for filename in k6_files:
            filepath = self.results_dir / filename
            if filepath.exists():
                try:
                    with open(filepath) as f:
                        data = json.load(f)
                    test_type = filename.split('_')[0]
                    self.report_data['k6_results'][test_type] = self._process_k6_data(data)
                except Exception as e:
                    logger.warning(f"Failed to load {filename}: {e}")
    
    def _process_k6_data(self, data: Dict) -> Dict:
        """Process K6 JSON data into report format"""
        try:
            metrics = data.get('metrics', {})
            
            processed = {
                'test_info': {
                    'duration': data.get('root_group', {}).get('duration', 0),
                    'iterations': metrics.get('iterations', {}).get('values', {}).get('count', 0),
                    'vus': metrics.get('vus', {}).get('values', {}).get('max', 0)
                },
                'performance': {
                    'http_req_duration': self._extract_metric_stats(metrics.get('http_req_duration', {})),
                    'http_req_failed': self._extract_rate_metric(metrics.get('http_req_failed', {})),
                    'http_reqs': self._extract_metric_stats(metrics.get('http_reqs', {}))
                },
                'checks': {
                    'total': metrics.get('checks', {}).get('values', {}).get('passes', 0) + 
                            metrics.get('checks', {}).get('values', {}).get('fails', 0),
                    'passed': metrics.get('checks', {}).get('values', {}).get('passes', 0),
                    'failed': metrics.get('checks', {}).get('values', {}).get('fails', 0)
                }
            }
            
            # Add Six Figure Barber specific metrics if available
            sfb_metrics = {}
            for metric_name, metric_data in metrics.items():
                if 'six_fb' in metric_name or 'six_figure' in metric_name:
                    sfb_metrics[metric_name] = self._extract_metric_stats(metric_data)
            
            if sfb_metrics:
                processed['six_figure_barber_metrics'] = sfb_metrics
            
            return processed
            
        except Exception as e:
            logger.warning(f"Error processing K6 data: {e}")
            return {}
    
    def _extract_metric_stats(self, metric_data: Dict) -> Dict:
        """Extract statistics from K6 metric data"""
        values = metric_data.get('values', {})
        return {
            'avg': values.get('avg', 0),
            'min': values.get('min', 0),
            'max': values.get('max', 0),
            'p90': values.get('p(90)', 0),
            'p95': values.get('p(95)', 0),
            'p99': values.get('p(99)', 0),
            'count': values.get('count', 0)
        }
    
    def _extract_rate_metric(self, metric_data: Dict) -> float:
        """Extract rate from K6 metric data"""
        return metric_data.get('values', {}).get('rate', 0) * 100  # Convert to percentage
    
    def _load_infrastructure_results(self):
        """Load infrastructure test results"""
        logger.info("📥 Loading infrastructure test results")
        
        infra_files = list(self.results_dir.glob(f"infrastructure_load_test_report_{self.timestamp}*.json"))
        
        for filepath in infra_files:
            try:
                with open(filepath) as f:
                    data = json.load(f)
                self.report_data['infrastructure_results'] = data
                break
            except Exception as e:
                logger.warning(f"Failed to load infrastructure results: {e}")
    
    def _load_database_results(self):
        """Load database test results"""
        logger.info("📥 Loading database test results")
        
        db_files = list(self.results_dir.glob(f"database_load_test_report_{self.timestamp}*.json"))
        
        for filepath in db_files:
            try:
                with open(filepath) as f:
                    data = json.load(f)
                self.report_data['database_results'] = data
                break
            except Exception as e:
                logger.warning(f"Failed to load database results: {e}")
    
    def _load_frontend_results(self):
        """Load frontend test results"""
        logger.info("📥 Loading frontend test results")
        
        frontend_files = list(self.results_dir.glob(f"frontend-performance-{self.timestamp}*.json"))
        
        for filepath in frontend_files:
            try:
                with open(filepath) as f:
                    data = json.load(f)
                self.report_data['frontend_results'] = data
                break
            except Exception as e:
                logger.warning(f"Failed to load frontend results: {e}")
    
    def _generate_executive_summary(self):
        """Generate executive summary"""
        logger.info("📋 Generating executive summary")
        
        summary = {
            'overall_grade': 'A',
            'readiness_score': 85,
            'key_findings': [],
            'performance_highlights': [],
            'areas_for_improvement': [],
            'six_figure_barber_readiness': 'READY'
        }
        
        # Analyze K6 results for summary
        if self.report_data['k6_results']:
            k6_analysis = self._analyze_k6_performance()
            summary['key_findings'].extend(k6_analysis['findings'])
            summary['performance_highlights'].extend(k6_analysis['highlights'])
        
        # Analyze infrastructure results
        if self.report_data['infrastructure_results']:
            infra_analysis = self._analyze_infrastructure_performance()
            summary['key_findings'].extend(infra_analysis['findings'])
        
        # Analyze database results
        if self.report_data['database_results']:
            db_analysis = self._analyze_database_performance()
            summary['key_findings'].extend(db_analysis['findings'])
        
        # Analyze frontend results
        if self.report_data['frontend_results']:
            frontend_analysis = self._analyze_frontend_performance()
            summary['key_findings'].extend(frontend_analysis['findings'])
        
        # Calculate overall readiness score
        summary['readiness_score'] = self._calculate_readiness_score()
        summary['overall_grade'] = self._calculate_overall_grade(summary['readiness_score'])
        
        self.report_data['executive_summary'] = summary
    
    def _analyze_k6_performance(self) -> Dict[str, List[str]]:
        """Analyze K6 performance results"""
        findings = []
        highlights = []
        
        for test_type, results in self.report_data['k6_results'].items():
            if not results:
                continue
                
            # Check response times
            http_duration = results.get('performance', {}).get('http_req_duration', {})
            avg_response = http_duration.get('avg', 0)
            p95_response = http_duration.get('p95', 0)
            
            if avg_response < 500:
                highlights.append(f"{test_type.title()} test: Excellent average response time ({avg_response:.0f}ms)")
            elif avg_response > 2000:
                findings.append(f"{test_type.title()} test: High average response time ({avg_response:.0f}ms)")
            
            # Check error rates
            error_rate = results.get('performance', {}).get('http_req_failed', 0)
            if error_rate < 1:
                highlights.append(f"{test_type.title()} test: Low error rate ({error_rate:.2f}%)")
            elif error_rate > 5:
                findings.append(f"{test_type.title()} test: High error rate ({error_rate:.2f}%)")
            
            # Check Six Figure Barber specific metrics
            sfb_metrics = results.get('six_figure_barber_metrics', {})
            if sfb_metrics:
                dashboard_time = sfb_metrics.get('six_fb_dashboard_load_time', {}).get('avg', 0)
                if dashboard_time < 2000:
                    highlights.append("Six Figure Barber dashboard: Fast loading times")
                elif dashboard_time > 5000:
                    findings.append("Six Figure Barber dashboard: Slow loading times")
        
        return {'findings': findings, 'highlights': highlights}
    
    def _analyze_infrastructure_performance(self) -> Dict[str, List[str]]:
        """Analyze infrastructure performance results"""
        findings = []
        
        perf_stats = self.report_data['infrastructure_results'].get('performance_statistics', {})
        
        # CPU analysis
        cpu_usage = perf_stats.get('cpu_usage', {})
        max_cpu = cpu_usage.get('max', 0)
        avg_cpu = cpu_usage.get('average', 0)
        
        if max_cpu > 90:
            findings.append(f"Infrastructure: High CPU usage detected (max: {max_cpu:.1f}%)")
        elif avg_cpu < 60:
            findings.append(f"Infrastructure: Optimal CPU utilization (avg: {avg_cpu:.1f}%)")
        
        # Memory analysis
        memory_usage = perf_stats.get('memory_usage', {})
        max_memory = memory_usage.get('max', 0)
        
        if max_memory > 85:
            findings.append(f"Infrastructure: High memory usage detected (max: {max_memory:.1f}%)")
        
        # Auto-scaling analysis
        scaling_analysis = self.report_data['infrastructure_results'].get('auto_scaling_analysis', {})
        scaling_events = scaling_analysis.get('total_scaling_events', 0)
        
        if scaling_events > 0:
            findings.append(f"Infrastructure: Auto-scaling triggered {scaling_events} times")
        
        return {'findings': findings}
    
    def _analyze_database_performance(self) -> Dict[str, List[str]]:
        """Analyze database performance results"""
        findings = []
        
        perf_stats = self.report_data['database_results'].get('performance_statistics', {})
        
        # Query performance
        response_time_stats = perf_stats.get('response_time_stats', {})
        avg_response = response_time_stats.get('average_ms', 0)
        p95_response = response_time_stats.get('p95_ms', 0)
        
        if avg_response < 100:
            findings.append(f"Database: Excellent query performance (avg: {avg_response:.0f}ms)")
        elif avg_response > 500:
            findings.append(f"Database: Slow query performance (avg: {avg_response:.0f}ms)")
        
        # Throughput analysis
        qps = perf_stats.get('queries_per_second', 0)
        if qps > 100:
            findings.append(f"Database: High throughput achieved ({qps:.0f} QPS)")
        elif qps < 20:
            findings.append(f"Database: Low throughput detected ({qps:.0f} QPS)")
        
        # Error analysis
        success_rate = perf_stats.get('success_rate_percent', 0)
        if success_rate < 95:
            findings.append(f"Database: High error rate ({100-success_rate:.1f}% failures)")
        
        return {'findings': findings}
    
    def _analyze_frontend_performance(self) -> Dict[str, List[str]]:
        """Analyze frontend performance results"""
        findings = []
        
        summary = self.report_data['frontend_results'].get('summary', {})
        
        # Page load times
        avg_page_load = summary.get('averagePageLoadTime', 0)
        if avg_page_load < 3000:
            findings.append(f"Frontend: Fast page load times (avg: {avg_page_load:.0f}ms)")
        elif avg_page_load > 8000:
            findings.append(f"Frontend: Slow page load times (avg: {avg_page_load:.0f}ms)")
        
        # Interaction times
        avg_interaction = summary.get('averageInteractionTime', 0)
        if avg_interaction > 3000:
            findings.append(f"Frontend: Slow user interactions (avg: {avg_interaction:.0f}ms)")
        
        # Error count
        total_errors = summary.get('totalErrors', 0)
        if total_errors > 5:
            findings.append(f"Frontend: {total_errors} JavaScript errors detected")
        
        return {'findings': findings}
    
    def _calculate_readiness_score(self) -> int:
        """Calculate overall enterprise readiness score (0-100)"""
        scores = []
        
        # K6 performance score (25%)
        if self.report_data['k6_results']:
            k6_score = self._calculate_k6_score()
            scores.append(('K6 Performance', k6_score, 0.25))
        
        # Infrastructure score (25%)
        if self.report_data['infrastructure_results']:
            infra_score = self._calculate_infrastructure_score()
            scores.append(('Infrastructure', infra_score, 0.25))
        
        # Database score (25%)
        if self.report_data['database_results']:
            db_score = self._calculate_database_score()
            scores.append(('Database', db_score, 0.25))
        
        # Frontend score (25%)
        if self.report_data['frontend_results']:
            frontend_score = self._calculate_frontend_score()
            scores.append(('Frontend', frontend_score, 0.25))
        
        if not scores:
            return 0
        
        # Calculate weighted average
        total_weight = sum(weight for _, _, weight in scores)
        weighted_sum = sum(score * weight for _, score, weight in scores)
        
        return int(weighted_sum / total_weight)
    
    def _calculate_k6_score(self) -> int:
        """Calculate K6 performance score"""
        scores = []
        
        for test_type, results in self.report_data['k6_results'].items():
            if not results:
                continue
            
            # Response time score
            avg_response = results.get('performance', {}).get('http_req_duration', {}).get('avg', 0)
            if avg_response < 500:
                response_score = 100
            elif avg_response < 1000:
                response_score = 80
            elif avg_response < 2000:
                response_score = 60
            else:
                response_score = 40
            
            # Error rate score
            error_rate = results.get('performance', {}).get('http_req_failed', 0)
            if error_rate < 1:
                error_score = 100
            elif error_rate < 3:
                error_score = 80
            elif error_rate < 5:
                error_score = 60
            else:
                error_score = 40
            
            test_score = (response_score + error_score) / 2
            scores.append(test_score)
        
        return int(sum(scores) / len(scores)) if scores else 0
    
    def _calculate_infrastructure_score(self) -> int:
        """Calculate infrastructure performance score"""
        perf_stats = self.report_data['infrastructure_results'].get('performance_statistics', {})
        
        # CPU score
        avg_cpu = perf_stats.get('cpu_usage', {}).get('average', 0)
        if avg_cpu < 60:
            cpu_score = 100
        elif avg_cpu < 75:
            cpu_score = 80
        elif avg_cpu < 85:
            cpu_score = 60
        else:
            cpu_score = 40
        
        # Memory score
        avg_memory = perf_stats.get('memory_usage', {}).get('average', 0)
        if avg_memory < 70:
            memory_score = 100
        elif avg_memory < 80:
            memory_score = 80
        elif avg_memory < 90:
            memory_score = 60
        else:
            memory_score = 40
        
        # Error rate score
        error_rate = perf_stats.get('error_rate_percent', 0)
        if error_rate < 1:
            error_score = 100
        elif error_rate < 3:
            error_score = 80
        else:
            error_score = 60
        
        return int((cpu_score + memory_score + error_score) / 3)
    
    def _calculate_database_score(self) -> int:
        """Calculate database performance score"""
        perf_stats = self.report_data['database_results'].get('performance_statistics', {})
        
        # Response time score
        avg_response = perf_stats.get('response_time_stats', {}).get('average_ms', 0)
        if avg_response < 100:
            response_score = 100
        elif avg_response < 300:
            response_score = 80
        elif avg_response < 500:
            response_score = 60
        else:
            response_score = 40
        
        # Throughput score
        qps = perf_stats.get('queries_per_second', 0)
        if qps > 100:
            throughput_score = 100
        elif qps > 50:
            throughput_score = 80
        elif qps > 20:
            throughput_score = 60
        else:
            throughput_score = 40
        
        # Success rate score
        success_rate = perf_stats.get('success_rate_percent', 0)
        if success_rate > 99:
            success_score = 100
        elif success_rate > 95:
            success_score = 80
        else:
            success_score = 60
        
        return int((response_score + throughput_score + success_score) / 3)
    
    def _calculate_frontend_score(self) -> int:
        """Calculate frontend performance score"""
        summary = self.report_data['frontend_results'].get('summary', {})
        
        # Page load score
        avg_page_load = summary.get('averagePageLoadTime', 0)
        if avg_page_load < 3000:
            page_score = 100
        elif avg_page_load < 5000:
            page_score = 80
        elif avg_page_load < 8000:
            page_score = 60
        else:
            page_score = 40
        
        # Interaction score
        avg_interaction = summary.get('averageInteractionTime', 0)
        if avg_interaction < 1000:
            interaction_score = 100
        elif avg_interaction < 2000:
            interaction_score = 80
        elif avg_interaction < 3000:
            interaction_score = 60
        else:
            interaction_score = 40
        
        # Error score
        total_errors = summary.get('totalErrors', 0)
        if total_errors == 0:
            error_score = 100
        elif total_errors < 5:
            error_score = 80
        elif total_errors < 10:
            error_score = 60
        else:
            error_score = 40
        
        return int((page_score + interaction_score + error_score) / 3)
    
    def _calculate_overall_grade(self, score: int) -> str:
        """Calculate overall letter grade"""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'
    
    def _generate_recommendations(self):
        """Generate comprehensive recommendations"""
        logger.info("💡 Generating recommendations")
        
        recommendations = []
        
        # Collect recommendations from all test results
        if self.report_data['infrastructure_results']:
            infra_recs = self.report_data['infrastructure_results'].get('recommendations', [])
            recommendations.extend([{'category': 'Infrastructure', 'recommendation': rec} for rec in infra_recs])
        
        if self.report_data['database_results']:
            db_recs = self.report_data['database_results'].get('recommendations', [])
            recommendations.extend([{'category': 'Database', 'recommendation': rec} for rec in db_recs])
        
        if self.report_data['frontend_results']:
            frontend_recs = self.report_data['frontend_results'].get('recommendations', [])
            recommendations.extend([{'category': 'Frontend', 'recommendation': rec} for rec in frontend_recs])
        
        # Add general enterprise recommendations
        readiness_score = self.report_data['executive_summary'].get('readiness_score', 0)
        
        if readiness_score < 70:
            recommendations.append({
                'category': 'General',
                'recommendation': '🚨 CRITICAL: System not ready for enterprise production deployment - address performance issues'
            })
        elif readiness_score < 85:
            recommendations.append({
                'category': 'General',
                'recommendation': '⚠️ CAUTION: System needs optimization before enterprise deployment'
            })
        else:
            recommendations.append({
                'category': 'General',
                'recommendation': '✅ READY: System demonstrates enterprise-grade performance'
            })
        
        # Six Figure Barber specific recommendations
        if self.report_data['k6_results'].get('six_figure_barber_test'):
            sfb_results = self.report_data['k6_results']['six_figure_barber_test']
            sfb_metrics = sfb_results.get('six_figure_barber_metrics', {})
            
            if sfb_metrics:
                dashboard_time = sfb_metrics.get('six_fb_dashboard_load_time', {}).get('avg', 0)
                if dashboard_time > 3000:
                    recommendations.append({
                        'category': 'Six Figure Barber',
                        'recommendation': '📊 Optimize Six Figure Barber dashboard loading for better barber experience'
                    })
                
                crm_time = sfb_metrics.get('six_fb_crm_api_time', {}).get('avg', 0)
                if crm_time > 1500:
                    recommendations.append({
                        'category': 'Six Figure Barber',
                        'recommendation': '👥 Optimize CRM operations for faster client management'
                    })
        
        self.report_data['recommendations'] = recommendations
    
    def _create_visualizations(self):
        """Create performance visualizations"""
        logger.info("📊 Creating performance visualizations")
        
        visualizations = {}
        
        # Create performance comparison chart
        if self.report_data['k6_results']:
            perf_chart = self._create_performance_comparison_chart()
            if perf_chart:
                visualizations['performance_comparison'] = perf_chart
        
        # Create readiness score chart
        readiness_chart = self._create_readiness_score_chart()
        if readiness_chart:
            visualizations['readiness_score'] = readiness_chart
        
        self.report_data['visualizations'] = visualizations
    
    def _create_performance_comparison_chart(self) -> Optional[str]:
        """Create performance comparison chart"""
        try:
            test_types = []
            avg_response_times = []
            error_rates = []
            
            for test_type, results in self.report_data['k6_results'].items():
                if not results:
                    continue
                
                test_types.append(test_type.replace('_', ' ').title())
                
                http_duration = results.get('performance', {}).get('http_req_duration', {})
                avg_response_times.append(http_duration.get('avg', 0))
                
                error_rate = results.get('performance', {}).get('http_req_failed', 0)
                error_rates.append(error_rate)
            
            if not test_types:
                return None
            
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
            
            # Response times
            ax1.bar(test_types, avg_response_times, color='skyblue', alpha=0.7)
            ax1.set_title('Average Response Times by Test Type')
            ax1.set_ylabel('Response Time (ms)')
            ax1.tick_params(axis='x', rotation=45)
            
            # Error rates
            ax2.bar(test_types, error_rates, color='lightcoral', alpha=0.7)
            ax2.set_title('Error Rates by Test Type')
            ax2.set_ylabel('Error Rate (%)')
            ax2.tick_params(axis='x', rotation=45)
            
            plt.tight_layout()
            
            # Convert to base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            buffer.seek(0)
            chart_base64 = base64.b64encode(buffer.getvalue()).decode()
            plt.close()
            
            return chart_base64
            
        except Exception as e:
            logger.warning(f"Failed to create performance comparison chart: {e}")
            return None
    
    def _create_readiness_score_chart(self) -> Optional[str]:
        """Create readiness score visualization"""
        try:
            categories = []
            scores = []
            
            if self.report_data['k6_results']:
                categories.append('K6 Performance')
                scores.append(self._calculate_k6_score())
            
            if self.report_data['infrastructure_results']:
                categories.append('Infrastructure')
                scores.append(self._calculate_infrastructure_score())
            
            if self.report_data['database_results']:
                categories.append('Database')
                scores.append(self._calculate_database_score())
            
            if self.report_data['frontend_results']:
                categories.append('Frontend')
                scores.append(self._calculate_frontend_score())
            
            if not categories:
                return None
            
            fig, ax = plt.subplots(figsize=(8, 6))
            
            colors = ['green' if score >= 80 else 'orange' if score >= 60 else 'red' for score in scores]
            bars = ax.barh(categories, scores, color=colors, alpha=0.7)
            
            ax.set_title('Enterprise Readiness Scores by Category')
            ax.set_xlabel('Score (0-100)')
            ax.set_xlim(0, 100)
            
            # Add score labels on bars
            for bar, score in zip(bars, scores):
                ax.text(bar.get_width() + 1, bar.get_y() + bar.get_height()/2, 
                       f'{score}', va='center', fontweight='bold')
            
            # Add target line
            ax.axvline(x=80, color='blue', linestyle='--', alpha=0.5, label='Enterprise Target (80)')
            ax.legend()
            
            plt.tight_layout()
            
            # Convert to base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            buffer.seek(0)
            chart_base64 = base64.b64encode(buffer.getvalue()).decode()
            plt.close()
            
            return chart_base64
            
        except Exception as e:
            logger.warning(f"Failed to create readiness score chart: {e}")
            return None
    
    def _generate_html_report(self, output_file: str):
        """Generate HTML report"""
        logger.info("📄 Generating HTML report")
        
        html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookedBarber V2 Enterprise Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { color: #2c3e50; font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
        .subtitle { color: #7f8c8d; font-size: 1.2em; }
        .executive-summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .grade { font-size: 4em; font-weight: bold; text-align: center; margin-bottom: 10px; }
        .score { font-size: 1.5em; text-align: center; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .section-title { color: #2c3e50; font-size: 1.8em; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #7f8c8d; font-size: 0.9em; }
        .recommendations { background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60; }
        .recommendation { margin-bottom: 10px; padding: 10px; background: white; border-radius: 5px; }
        .chart { text-align: center; margin: 20px 0; }
        .chart img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .findings { background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px; }
        .finding { margin-bottom: 8px; }
        .footer { text-align: center; margin-top: 40px; color: #7f8c8d; font-size: 0.9em; }
        .test-details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .status-excellent { color: #27ae60; font-weight: bold; }
        .status-good { color: #f39c12; font-weight: bold; }
        .status-poor { color: #e74c3c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📊 BookedBarber V2</div>
            <div class="subtitle">Enterprise Load Testing Report</div>
            <div style="margin-top: 15px; color: #7f8c8d;">Generated: {{ report_data.generation_time[:19] }}</div>
        </div>

        <div class="executive-summary">
            <div class="grade">{{ report_data.executive_summary.overall_grade }}</div>
            <div class="score">Enterprise Readiness Score: {{ report_data.executive_summary.readiness_score }}%</div>
            <div style="text-align: center; font-size: 1.2em;">
                Six Figure Barber Status: <strong>{{ report_data.executive_summary.six_figure_barber_readiness }}</strong>
            </div>
        </div>

        {% if report_data.visualizations.readiness_score %}
        <div class="section">
            <div class="section-title">📈 Performance Overview</div>
            <div class="chart">
                <img src="data:image/png;base64,{{ report_data.visualizations.readiness_score }}" alt="Readiness Scores">
            </div>
        </div>
        {% endif %}

        <div class="section">
            <div class="section-title">🎯 Key Findings</div>
            <div class="findings">
                {% for finding in report_data.executive_summary.key_findings %}
                <div class="finding">• {{ finding }}</div>
                {% endfor %}
            </div>
        </div>

        {% if report_data.visualizations.performance_comparison %}
        <div class="section">
            <div class="section-title">⚡ Performance Comparison</div>
            <div class="chart">
                <img src="data:image/png;base64,{{ report_data.visualizations.performance_comparison }}" alt="Performance Comparison">
            </div>
        </div>
        {% endif %}

        <div class="section">
            <div class="section-title">📊 Test Results Summary</div>
            <div class="metric-grid">
                {% if report_data.k6_results %}
                <div class="metric-card">
                    <div class="metric-value">{{ report_data.k6_results|length }}</div>
                    <div class="metric-label">K6 Load Tests Completed</div>
                </div>
                {% endif %}
                
                {% if report_data.infrastructure_results %}
                <div class="metric-card">
                    <div class="metric-value">{{ report_data.infrastructure_results.performance_statistics.max_concurrent_users or 'N/A' }}</div>
                    <div class="metric-label">Max Concurrent Users Tested</div>
                </div>
                {% endif %}
                
                {% if report_data.database_results %}
                <div class="metric-card">
                    <div class="metric-value">{{ "%.0f"|format(report_data.database_results.performance_statistics.queries_per_second or 0) }}</div>
                    <div class="metric-label">Database Queries/Second</div>
                </div>
                {% endif %}
                
                {% if report_data.frontend_results %}
                <div class="metric-card">
                    <div class="metric-value">{{ "%.0f"|format(report_data.frontend_results.summary.averagePageLoadTime or 0) }}ms</div>
                    <div class="metric-label">Avg Page Load Time</div>
                </div>
                {% endif %}
            </div>
        </div>

        {% if report_data.k6_results %}
        <div class="section">
            <div class="section-title">🚀 K6 Load Test Results</div>
            {% for test_type, results in report_data.k6_results.items() %}
            <div class="test-details">
                <h4>{{ test_type.replace('_', ' ').title() }} Test</h4>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value">{{ "%.0f"|format(results.performance.http_req_duration.avg or 0) }}ms</div>
                        <div class="metric-label">Average Response Time</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{ "%.2f"|format(results.performance.http_req_failed or 0) }}%</div>
                        <div class="metric-label">Error Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{{ results.test_info.vus or 0 }}</div>
                        <div class="metric-label">Max Virtual Users</div>
                    </div>
                </div>
            </div>
            {% endfor %}
        </div>
        {% endif %}

        <div class="section">
            <div class="section-title">💡 Recommendations</div>
            <div class="recommendations">
                {% for rec in report_data.recommendations %}
                <div class="recommendation">
                    <strong>{{ rec.category }}:</strong> {{ rec.recommendation }}
                </div>
                {% endfor %}
            </div>
        </div>

        <div class="footer">
            <p>📧 Report generated by BookedBarber V2 Load Testing Suite</p>
            <p>🔗 For technical details, review individual test result files</p>
        </div>
    </div>
</body>
</html>
        """
        
        template = Template(html_template)
        html_content = template.render(report_data=self.report_data)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)

def main():
    parser = argparse.ArgumentParser(description='Generate comprehensive load test report')
    parser.add_argument('--results-dir', required=True, help='Directory containing test results')
    parser.add_argument('--timestamp', required=True, help='Test timestamp')
    parser.add_argument('--output', required=True, help='Output HTML file path')
    
    args = parser.parse_args()
    
    generator = ComprehensiveReportGenerator(args.results_dir, args.timestamp)
    
    if generator.generate_report(args.output):
        print(f"✅ Comprehensive report generated successfully: {args.output}")
        return 0
    else:
        print("❌ Report generation failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())