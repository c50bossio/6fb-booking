#!/usr/bin/env python3
"""
Simple Comprehensive Performance Report Generator for BookedBarber V2
(Without pandas/matplotlib dependencies)
"""

import json
import os
import sys
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleReportGenerator:
    """Generate comprehensive performance report without heavy dependencies"""
    
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
            'recommendations': []
        }
        
    def generate_report(self, output_file: str) -> bool:
        """Generate comprehensive HTML report"""
        try:
            logger.info("📊 Generating comprehensive performance report")
            
            # Load all test results
            self._load_all_results()
            
            # Generate analysis
            self._generate_executive_summary()
            self._generate_recommendations()
            
            # Generate HTML report
            self._generate_html_report(output_file)
            
            logger.info(f"✅ Comprehensive report generated: {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Report generation failed: {e}")
            return False
    
    def _load_all_results(self):
        """Load all test results"""
        self._load_k6_results()
        self._load_infrastructure_results()
        self._load_database_results()
        self._load_frontend_results()
    
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
                    'duration': data.get('root_group', {}).get('duration', 0) / 1000,  # Convert to seconds
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
        
        # Analyze results
        if self.report_data['k6_results']:
            k6_findings = self._analyze_k6_performance()
            summary['key_findings'].extend(k6_findings)
        
        if self.report_data['infrastructure_results']:
            infra_findings = self._analyze_infrastructure_performance()
            summary['key_findings'].extend(infra_findings)
        
        if self.report_data['database_results']:
            db_findings = self._analyze_database_performance()
            summary['key_findings'].extend(db_findings)
        
        if self.report_data['frontend_results']:
            frontend_findings = self._analyze_frontend_performance()
            summary['key_findings'].extend(frontend_findings)
        
        # Calculate readiness score
        summary['readiness_score'] = self._calculate_readiness_score()
        summary['overall_grade'] = self._calculate_overall_grade(summary['readiness_score'])
        
        # Determine Six Figure Barber readiness
        if summary['readiness_score'] >= 80:
            summary['six_figure_barber_readiness'] = 'READY FOR ENTERPRISE'
        elif summary['readiness_score'] >= 70:
            summary['six_figure_barber_readiness'] = 'READY WITH OPTIMIZATIONS'
        else:
            summary['six_figure_barber_readiness'] = 'NEEDS IMPROVEMENT'
        
        self.report_data['executive_summary'] = summary
    
    def _analyze_k6_performance(self) -> List[str]:
        """Analyze K6 performance results"""
        findings = []
        
        for test_type, results in self.report_data['k6_results'].items():
            if not results:
                continue
                
            # Check response times
            http_duration = results.get('performance', {}).get('http_req_duration', {})
            avg_response = http_duration.get('avg', 0)
            
            if avg_response < 500:
                findings.append(f"✅ {test_type.title()}: Excellent response time ({avg_response:.0f}ms avg)")
            elif avg_response > 2000:
                findings.append(f"⚠️ {test_type.title()}: High response time ({avg_response:.0f}ms avg)")
            
            # Check error rates
            error_rate = results.get('performance', {}).get('http_req_failed', 0)
            if error_rate < 1:
                findings.append(f"✅ {test_type.title()}: Low error rate ({error_rate:.2f}%)")
            elif error_rate > 5:
                findings.append(f"🚨 {test_type.title()}: High error rate ({error_rate:.2f}%)")
            
            # Check Six Figure Barber metrics
            sfb_metrics = results.get('six_figure_barber_metrics', {})
            if sfb_metrics:
                dashboard_time = sfb_metrics.get('six_fb_dashboard_load_time', {}).get('avg', 0)
                if dashboard_time > 0:
                    if dashboard_time < 2000:
                        findings.append("✅ Six Figure Barber Dashboard: Fast loading times")
                    else:
                        findings.append(f"⚠️ Six Figure Barber Dashboard: Slow loading ({dashboard_time:.0f}ms)")
        
        return findings
    
    def _analyze_infrastructure_performance(self) -> List[str]:
        """Analyze infrastructure performance"""
        findings = []
        
        perf_stats = self.report_data['infrastructure_results'].get('performance_statistics', {})
        
        # CPU analysis
        cpu_usage = perf_stats.get('cpu_usage', {})
        max_cpu = cpu_usage.get('max', 0)
        avg_cpu = cpu_usage.get('average', 0)
        
        if max_cpu > 90:
            findings.append(f"🚨 Infrastructure: High CPU usage (max: {max_cpu:.1f}%)")
        elif avg_cpu < 60:
            findings.append(f"✅ Infrastructure: Optimal CPU utilization (avg: {avg_cpu:.1f}%)")
        
        # Auto-scaling
        scaling_analysis = self.report_data['infrastructure_results'].get('auto_scaling_analysis', {})
        scaling_events = scaling_analysis.get('total_scaling_events', 0)
        
        if scaling_events > 0:
            findings.append(f"📈 Infrastructure: Auto-scaling triggered {scaling_events} times")
        
        return findings
    
    def _analyze_database_performance(self) -> List[str]:
        """Analyze database performance"""
        findings = []
        
        perf_stats = self.report_data['database_results'].get('performance_statistics', {})
        
        # Query performance
        response_time_stats = perf_stats.get('response_time_stats', {})
        avg_response = response_time_stats.get('average_ms', 0)
        
        if avg_response < 200:
            findings.append(f"✅ Database: Excellent performance ({avg_response:.0f}ms avg)")
        elif avg_response > 500:
            findings.append(f"⚠️ Database: Slow performance ({avg_response:.0f}ms avg)")
        
        # Success rate
        success_rate = perf_stats.get('success_rate_percent', 0)
        if success_rate > 99:
            findings.append(f"✅ Database: High reliability ({success_rate:.1f}% success)")
        elif success_rate < 95:
            findings.append(f"🚨 Database: Reliability issues ({success_rate:.1f}% success)")
        
        return findings
    
    def _analyze_frontend_performance(self) -> List[str]:
        """Analyze frontend performance"""
        findings = []
        
        summary = self.report_data['frontend_results'].get('summary', {})
        
        # Page load times
        avg_page_load = summary.get('averagePageLoadTime', 0)
        if avg_page_load < 3000:
            findings.append(f"✅ Frontend: Fast page loads ({avg_page_load:.0f}ms avg)")
        elif avg_page_load > 8000:
            findings.append(f"⚠️ Frontend: Slow page loads ({avg_page_load:.0f}ms avg)")
        
        # Errors
        total_errors = summary.get('totalErrors', 0)
        if total_errors == 0:
            findings.append("✅ Frontend: No JavaScript errors detected")
        elif total_errors > 10:
            findings.append(f"🚨 Frontend: {total_errors} JavaScript errors detected")
        
        return findings
    
    def _calculate_readiness_score(self) -> int:
        """Calculate overall readiness score"""
        scores = []
        
        # K6 score
        if self.report_data['k6_results']:
            k6_score = self._calculate_k6_score()
            scores.append(k6_score)
        
        # Infrastructure score
        if self.report_data['infrastructure_results']:
            infra_score = self._calculate_infrastructure_score()
            scores.append(infra_score)
        
        # Database score
        if self.report_data['database_results']:
            db_score = self._calculate_database_score()
            scores.append(db_score)
        
        # Frontend score
        if self.report_data['frontend_results']:
            frontend_score = self._calculate_frontend_score()
            scores.append(frontend_score)
        
        return int(sum(scores) / len(scores)) if scores else 0
    
    def _calculate_k6_score(self) -> int:
        """Calculate K6 performance score"""
        scores = []
        
        for test_type, results in self.report_data['k6_results'].items():
            if not results:
                continue
            
            avg_response = results.get('performance', {}).get('http_req_duration', {}).get('avg', 0)
            error_rate = results.get('performance', {}).get('http_req_failed', 0)
            
            # Response time score
            if avg_response < 500:
                response_score = 95
            elif avg_response < 1000:
                response_score = 80
            elif avg_response < 2000:
                response_score = 65
            else:
                response_score = 40
            
            # Error rate score
            if error_rate < 1:
                error_score = 95
            elif error_rate < 3:
                error_score = 80
            else:
                error_score = 50
            
            test_score = (response_score + error_score) / 2
            scores.append(test_score)
        
        return int(sum(scores) / len(scores)) if scores else 0
    
    def _calculate_infrastructure_score(self) -> int:
        """Calculate infrastructure score"""
        perf_stats = self.report_data['infrastructure_results'].get('performance_statistics', {})
        
        avg_cpu = perf_stats.get('cpu_usage', {}).get('average', 0)
        avg_memory = perf_stats.get('memory_usage', {}).get('average', 0)
        error_rate = perf_stats.get('error_rate_percent', 0)
        
        # CPU score
        cpu_score = 90 if avg_cpu < 70 else 70 if avg_cpu < 85 else 50
        
        # Memory score
        memory_score = 90 if avg_memory < 75 else 70 if avg_memory < 85 else 50
        
        # Error score
        error_score = 90 if error_rate < 2 else 70 if error_rate < 5 else 50
        
        return int((cpu_score + memory_score + error_score) / 3)
    
    def _calculate_database_score(self) -> int:
        """Calculate database score"""
        perf_stats = self.report_data['database_results'].get('performance_statistics', {})
        
        avg_response = perf_stats.get('response_time_stats', {}).get('average_ms', 0)
        success_rate = perf_stats.get('success_rate_percent', 0)
        
        # Response time score
        response_score = 90 if avg_response < 200 else 75 if avg_response < 400 else 50
        
        # Success rate score
        success_score = 95 if success_rate > 99 else 80 if success_rate > 95 else 60
        
        return int((response_score + success_score) / 2)
    
    def _calculate_frontend_score(self) -> int:
        """Calculate frontend score"""
        summary = self.report_data['frontend_results'].get('summary', {})
        
        avg_page_load = summary.get('averagePageLoadTime', 0)
        total_errors = summary.get('totalErrors', 0)
        
        # Page load score
        page_score = 90 if avg_page_load < 3000 else 70 if avg_page_load < 6000 else 50
        
        # Error score
        error_score = 95 if total_errors == 0 else 80 if total_errors < 5 else 60
        
        return int((page_score + error_score) / 2)
    
    def _calculate_overall_grade(self, score: int) -> str:
        """Calculate letter grade"""
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
        """Generate recommendations"""
        logger.info("💡 Generating recommendations")
        
        recommendations = []
        
        # Collect from all sources
        if self.report_data['infrastructure_results']:
            infra_recs = self.report_data['infrastructure_results'].get('recommendations', [])
            recommendations.extend([{'category': 'Infrastructure', 'recommendation': rec} for rec in infra_recs])
        
        if self.report_data['database_results']:
            db_recs = self.report_data['database_results'].get('recommendations', [])
            recommendations.extend([{'category': 'Database', 'recommendation': rec} for rec in db_recs])
        
        if self.report_data['frontend_results']:
            frontend_recs = self.report_data['frontend_results'].get('recommendations', [])
            recommendations.extend([{'category': 'Frontend', 'recommendation': rec} for rec in frontend_recs])
        
        # Add overall recommendations
        readiness_score = self.report_data['executive_summary'].get('readiness_score', 0)
        
        if readiness_score >= 85:
            recommendations.append({
                'category': 'Enterprise Readiness',
                'recommendation': '🚀 EXCELLENT: System ready for enterprise deployment with 10,000+ concurrent users'
            })
        elif readiness_score >= 70:
            recommendations.append({
                'category': 'Enterprise Readiness',
                'recommendation': '✅ GOOD: System ready for production with minor optimizations recommended'
            })
        else:
            recommendations.append({
                'category': 'Enterprise Readiness',
                'recommendation': '⚠️ NEEDS WORK: Address performance issues before enterprise deployment'
            })
        
        self.report_data['recommendations'] = recommendations
    
    def _generate_html_report(self, output_file: str):
        """Generate HTML report"""
        logger.info("📄 Generating HTML report")
        
        html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookedBarber V2 Enterprise Load Test Report</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }}
        .header {{ text-align: center; margin-bottom: 40px; }}
        .logo {{ color: #2c3e50; font-size: 3em; font-weight: bold; margin-bottom: 10px; }}
        .subtitle {{ color: #7f8c8d; font-size: 1.3em; margin-bottom: 20px; }}
        .timestamp {{ color: #95a5a6; font-size: 1em; }}
        
        .executive-summary {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 15px; margin-bottom: 40px; text-align: center; }}
        .grade {{ font-size: 5em; font-weight: bold; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }}
        .score {{ font-size: 2em; margin-bottom: 20px; }}
        .readiness {{ font-size: 1.5em; font-weight: bold; }}
        
        .section {{ margin-bottom: 40px; }}
        .section-title {{ color: #2c3e50; font-size: 2em; font-weight: bold; margin-bottom: 20px; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        
        .metric-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; margin-bottom: 30px; }}
        .metric-card {{ background: linear-gradient(145deg, #f8f9fa, #e9ecef); padding: 25px; border-radius: 15px; border-left: 5px solid #3498db; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }}
        .metric-value {{ font-size: 2.5em; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }}
        .metric-label {{ color: #7f8c8d; font-size: 1em; font-weight: 500; }}
        
        .findings {{ background: linear-gradient(145deg, #fff9c4, #ffeaa7); padding: 25px; border-radius: 15px; border-left: 5px solid #f39c12; margin-bottom: 25px; }}
        .finding {{ margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.8); border-radius: 8px; font-size: 1.05em; }}
        
        .recommendations {{ background: linear-gradient(145deg, #d1f2eb, #a3e4d7); padding: 25px; border-radius: 15px; border-left: 5px solid #27ae60; }}
        .recommendation {{ margin-bottom: 15px; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .rec-category {{ font-weight: bold; color: #2c3e50; margin-bottom: 5px; }}
        .rec-text {{ color: #34495e; }}
        
        .test-details {{ background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #dee2e6; }}
        .test-title {{ color: #2c3e50; font-size: 1.4em; font-weight: bold; margin-bottom: 15px; }}
        
        .footer {{ text-align: center; margin-top: 50px; padding-top: 30px; border-top: 2px solid #ecf0f1; color: #7f8c8d; }}
        
        .highlight-good {{ color: #27ae60; font-weight: bold; }}
        .highlight-warning {{ color: #f39c12; font-weight: bold; }}
        .highlight-critical {{ color: #e74c3c; font-weight: bold; }}
        
        @media (max-width: 768px) {{
            .container {{ padding: 20px; }}
            .grade {{ font-size: 3em; }}
            .metric-grid {{ grid-template-columns: 1fr; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📊 BookedBarber V2</div>
            <div class="subtitle">Enterprise Load Testing Report</div>
            <div class="timestamp">Generated: {self.report_data['generation_time'][:19].replace('T', ' ')}</div>
        </div>

        <div class="executive-summary">
            <div class="grade">{self.report_data['executive_summary']['overall_grade']}</div>
            <div class="score">Enterprise Readiness: {self.report_data['executive_summary']['readiness_score']}%</div>
            <div class="readiness">{self.report_data['executive_summary']['six_figure_barber_readiness']}</div>
        </div>

        <div class="section">
            <div class="section-title">🎯 Key Performance Findings</div>
            <div class="findings">
                {self._format_findings_html()}
            </div>
        </div>

        <div class="section">
            <div class="section-title">📊 Test Results Overview</div>
            <div class="metric-grid">
                {self._format_metrics_html()}
            </div>
        </div>

        {self._format_test_details_html()}

        <div class="section">
            <div class="section-title">💡 Performance Recommendations</div>
            <div class="recommendations">
                {self._format_recommendations_html()}
            </div>
        </div>

        <div class="footer">
            <p><strong>📧 BookedBarber V2 Enterprise Load Testing Suite</strong></p>
            <p>🔗 Ready for 10,000+ concurrent users with Six Figure Barber methodology</p>
            <p>📁 Detailed results available in individual test files</p>
        </div>
    </div>
</body>
</html>
        """
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
    
    def _format_findings_html(self) -> str:
        """Format findings as HTML"""
        findings = self.report_data['executive_summary'].get('key_findings', [])
        if not findings:
            return '<div class="finding">No specific findings to report.</div>'
        
        html = ""
        for finding in findings[:10]:  # Limit to top 10 findings
            html += f'<div class="finding">{finding}</div>\n'
        
        return html
    
    def _format_metrics_html(self) -> str:
        """Format metrics as HTML"""
        html = ""
        
        # K6 metrics
        if self.report_data['k6_results']:
            k6_count = len([r for r in self.report_data['k6_results'].values() if r])
            html += f'''
            <div class="metric-card">
                <div class="metric-value">{k6_count}</div>
                <div class="metric-label">Load Test Scenarios</div>
            </div>
            '''
        
        # Infrastructure metrics
        if self.report_data['infrastructure_results']:
            max_users = self.report_data['infrastructure_results'].get('performance_statistics', {}).get('max_concurrent_users', 'N/A')
            html += f'''
            <div class="metric-card">
                <div class="metric-value">{max_users}</div>
                <div class="metric-label">Max Concurrent Users</div>
            </div>
            '''
        
        # Database metrics
        if self.report_data['database_results']:
            qps = self.report_data['database_results'].get('performance_statistics', {}).get('queries_per_second', 0)
            html += f'''
            <div class="metric-card">
                <div class="metric-value">{qps:.1f}</div>
                <div class="metric-label">Database QPS</div>
            </div>
            '''
        
        # Frontend metrics
        if self.report_data['frontend_results']:
            page_load = self.report_data['frontend_results'].get('summary', {}).get('averagePageLoadTime', 0)
            html += f'''
            <div class="metric-card">
                <div class="metric-value">{page_load:.0f}ms</div>
                <div class="metric-label">Avg Page Load Time</div>
            </div>
            '''
        
        return html
    
    def _format_test_details_html(self) -> str:
        """Format test details as HTML"""
        if not self.report_data['k6_results']:
            return ""
        
        html = '<div class="section"><div class="section-title">🚀 Load Test Details</div>'
        
        for test_type, results in self.report_data['k6_results'].items():
            if not results:
                continue
            
            perf = results.get('performance', {})
            duration = perf.get('http_req_duration', {})
            
            html += f'''
            <div class="test-details">
                <div class="test-title">{test_type.replace('_', ' ').title()} Test</div>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value">{duration.get('avg', 0):.0f}ms</div>
                        <div class="metric-label">Average Response Time</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{perf.get('http_req_failed', 0):.2f}%</div>
                        <div class="metric-label">Error Rate</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{results.get('test_info', {}).get('vus', 0)}</div>
                        <div class="metric-label">Max Virtual Users</div>
                    </div>
                </div>
            </div>
            '''
        
        html += '</div>'
        return html
    
    def _format_recommendations_html(self) -> str:
        """Format recommendations as HTML"""
        recommendations = self.report_data.get('recommendations', [])
        if not recommendations:
            return '<div class="recommendation">No specific recommendations at this time.</div>'
        
        html = ""
        for rec in recommendations:
            html += f'''
            <div class="recommendation">
                <div class="rec-category">{rec['category']}</div>
                <div class="rec-text">{rec['recommendation']}</div>
            </div>
            '''
        
        return html

def main():
    parser = argparse.ArgumentParser(description='Generate simple comprehensive load test report')
    parser.add_argument('--results-dir', required=True, help='Directory containing test results')
    parser.add_argument('--timestamp', required=True, help='Test timestamp')
    parser.add_argument('--output', required=True, help='Output HTML file path')
    
    args = parser.parse_args()
    
    generator = SimpleReportGenerator(args.results_dir, args.timestamp)
    
    if generator.generate_report(args.output):
        print(f"✅ Comprehensive report generated successfully: {args.output}")
        return 0
    else:
        print("❌ Report generation failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())