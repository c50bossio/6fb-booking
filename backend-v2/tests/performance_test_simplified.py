#!/usr/bin/env python3
"""
Simplified Performance Testing Suite - Focus on measurable metrics
"""

import time
import psutil
import json
import statistics
from datetime import datetime
import requests
from typing import Dict, List
import os

class SystemPerformanceAnalyzer:
    """Analyze system performance without requiring backend"""
    
    def __init__(self):
        self.metrics = {
            'cpu_usage': [],
            'memory_usage': [],
            'disk_io': [],
            'timestamps': []
        }
        
    def collect_system_metrics(self, duration: int = 30) -> Dict:
        """Collect system metrics for specified duration"""
        print(f"📊 Collecting system metrics for {duration} seconds...")
        
        start_time = time.time()
        while time.time() - start_time < duration:
            try:
                # CPU metrics
                cpu_percent = psutil.cpu_percent(interval=1)
                
                # Memory metrics
                memory = psutil.virtual_memory()
                
                # Disk I/O metrics
                disk_io = psutil.disk_io_counters()
                
                self.metrics['cpu_usage'].append(cpu_percent)
                self.metrics['memory_usage'].append(memory.percent)
                self.metrics['disk_io'].append({
                    'read_bytes': disk_io.read_bytes if disk_io else 0,
                    'write_bytes': disk_io.write_bytes if disk_io else 0
                })
                self.metrics['timestamps'].append(datetime.now())
                
            except Exception as e:
                print(f"Metrics collection error: {e}")
                
        return self._analyze_system_metrics()
        
    def _analyze_system_metrics(self) -> Dict:
        """Analyze collected system metrics"""
        if not self.metrics['cpu_usage']:
            return {'error': 'No metrics collected'}
            
        return {
            'cpu_stats': {
                'average': statistics.mean(self.metrics['cpu_usage']),
                'max': max(self.metrics['cpu_usage']),
                'min': min(self.metrics['cpu_usage']),
                'p95': self._percentile(self.metrics['cpu_usage'], 95)
            },
            'memory_stats': {
                'average': statistics.mean(self.metrics['memory_usage']),
                'max': max(self.metrics['memory_usage']),
                'min': min(self.metrics['memory_usage']),
                'p95': self._percentile(self.metrics['memory_usage'], 95)
            },
            'disk_io_stats': {
                'total_samples': len(self.metrics['disk_io']),
                'read_bytes_total': sum(d['read_bytes'] for d in self.metrics['disk_io']),
                'write_bytes_total': sum(d['write_bytes'] for d in self.metrics['disk_io'])
            },
            'collection_duration': len(self.metrics['timestamps']),
            'sample_rate': len(self.metrics['timestamps']) / max(1, (self.metrics['timestamps'][-1] - self.metrics['timestamps'][0]).total_seconds()) if len(self.metrics['timestamps']) > 1 else 0
        }
        
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]

class FrontendPerformanceAnalyzer:
    """Analyze frontend performance"""
    
    def __init__(self, frontend_url: str = "http://localhost:3000"):
        self.frontend_url = frontend_url
        
    def analyze_frontend_performance(self) -> Dict:
        """Comprehensive frontend performance analysis"""
        print("🎨 Analyzing frontend performance...")
        
        results = {}
        
        # 1. Basic connectivity test
        connectivity_result = self._test_connectivity()
        results['connectivity'] = connectivity_result
        
        # 2. Load time analysis
        load_time_result = self._analyze_load_times()
        results['load_times'] = load_time_result
        
        # 3. Content analysis
        content_result = self._analyze_content()
        results['content'] = content_result
        
        # 4. Performance under load
        load_result = self._test_under_load()
        results['load_performance'] = load_result
        
        return results
        
    def _test_connectivity(self) -> Dict:
        """Test frontend connectivity"""
        try:
            response = requests.get(self.frontend_url, timeout=10)
            return {
                'accessible': True,
                'status_code': response.status_code,
                'response_headers': dict(response.headers),
                'content_length': len(response.content)
            }
        except Exception as e:
            return {
                'accessible': False,
                'error': str(e)
            }
            
    def _analyze_load_times(self, iterations: int = 10) -> Dict:
        """Analyze page load times"""
        load_times = []
        
        for i in range(iterations):
            try:
                start_time = time.time()
                response = requests.get(self.frontend_url, timeout=30)
                load_time = time.time() - start_time
                
                if response.status_code == 200:
                    load_times.append(load_time)
                    
            except Exception as e:
                print(f"Load time test {i+1} failed: {e}")
                
        if not load_times:
            return {'error': 'No successful load time measurements'}
            
        return {
            'measurements': len(load_times),
            'avg_load_time': statistics.mean(load_times),
            'min_load_time': min(load_times),
            'max_load_time': max(load_times),
            'p95_load_time': self._percentile(load_times, 95),
            'p99_load_time': self._percentile(load_times, 99),
            'performance_grade': self._calculate_load_time_grade(statistics.mean(load_times))
        }
        
    def _analyze_content(self) -> Dict:
        """Analyze content characteristics"""
        try:
            response = requests.get(self.frontend_url, timeout=10)
            content = response.text
            
            # Analyze content structure
            html_size = len(content.encode('utf-8'))
            
            # Count different elements
            script_count = content.count('<script')
            style_count = content.count('<style') + content.count('<link')
            img_count = content.count('<img')
            
            return {
                'html_size': html_size,
                'content_length': len(content),
                'script_tags': script_count,
                'style_tags': style_count,
                'image_tags': img_count,
                'compression_ratio': html_size / len(content) if content else 0,
                'optimization_score': self._calculate_content_score(html_size, script_count, style_count)
            }
            
        except Exception as e:
            return {'error': str(e)}
            
    def _test_under_load(self, concurrent_requests: int = 20) -> Dict:
        """Test frontend under concurrent load"""
        print(f"🔄 Testing frontend with {concurrent_requests} concurrent requests...")
        
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        def make_request():
            try:
                start_time = time.time()
                response = requests.get(self.frontend_url, timeout=10)
                return {
                    'success': response.status_code == 200,
                    'response_time': time.time() - start_time,
                    'status_code': response.status_code,
                    'content_length': len(response.content)
                }
            except Exception as e:
                return {
                    'success': False,
                    'response_time': 0,
                    'error': str(e)
                }
                
        results = []
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            futures = [executor.submit(make_request) for _ in range(concurrent_requests)]
            
            for future in as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    results.append({
                        'success': False,
                        'response_time': 0,
                        'error': str(e)
                    })
                    
        successful_requests = [r for r in results if r['success']]
        
        if not successful_requests:
            return {'error': 'No successful requests under load'}
            
        response_times = [r['response_time'] for r in successful_requests]
        
        return {
            'total_requests': len(results),
            'successful_requests': len(successful_requests),
            'success_rate': len(successful_requests) / len(results) * 100,
            'avg_response_time': statistics.mean(response_times),
            'max_response_time': max(response_times),
            'p95_response_time': self._percentile(response_times, 95),
            'concurrent_capacity_score': self._calculate_concurrent_score(len(successful_requests), len(results))
        }
        
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
        
    def _calculate_load_time_grade(self, avg_load_time: float) -> str:
        """Calculate performance grade based on load time"""
        if avg_load_time < 0.5:
            return "A"
        elif avg_load_time < 1.0:
            return "B"
        elif avg_load_time < 2.0:
            return "C"
        elif avg_load_time < 3.0:
            return "D"
        else:
            return "F"
            
    def _calculate_content_score(self, html_size: int, script_count: int, style_count: int) -> int:
        """Calculate content optimization score"""
        score = 100
        
        # Penalize large HTML size
        if html_size > 100000:  # 100KB
            score -= 20
        elif html_size > 50000:  # 50KB
            score -= 10
            
        # Penalize too many scripts
        if script_count > 10:
            score -= 15
        elif script_count > 5:
            score -= 5
            
        # Penalize too many styles
        if style_count > 5:
            score -= 10
            
        return max(0, score)
        
    def _calculate_concurrent_score(self, successful: int, total: int) -> int:
        """Calculate concurrent capacity score"""
        success_rate = successful / total * 100
        
        if success_rate >= 95:
            return 100
        elif success_rate >= 90:
            return 80
        elif success_rate >= 80:
            return 60
        elif success_rate >= 70:
            return 40
        else:
            return 20

class DatabasePerformanceAnalyzer:
    """Analyze database performance without requiring API"""
    
    def __init__(self, db_path: str = "bookings.db"):
        self.db_path = db_path
        
    def analyze_database_file(self) -> Dict:
        """Analyze database file characteristics"""
        print("📊 Analyzing database file performance...")
        
        try:
            import sqlite3
            
            # Check if database exists
            if not os.path.exists(self.db_path):
                return {
                    'exists': False,
                    'error': f'Database file not found at {self.db_path}'
                }
                
            # Get file size
            file_size = os.path.getsize(self.db_path)
            
            # Test basic connectivity
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Test basic queries
            start_time = time.time()
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
            table_count = cursor.fetchone()[0]
            basic_query_time = time.time() - start_time
            
            # Get table information
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            # Test query performance on each table
            table_stats = {}
            for table in tables:
                try:
                    start_time = time.time()
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    query_time = time.time() - start_time
                    
                    table_stats[table] = {
                        'row_count': count,
                        'query_time': query_time
                    }
                except Exception as e:
                    table_stats[table] = {
                        'error': str(e)
                    }
                    
            conn.close()
            
            return {
                'exists': True,
                'file_size': file_size,
                'table_count': table_count,
                'tables': tables,
                'table_stats': table_stats,
                'basic_query_time': basic_query_time,
                'performance_score': self._calculate_db_score(file_size, basic_query_time, table_count)
            }
            
        except Exception as e:
            return {
                'exists': False,
                'error': str(e)
            }
            
    def _calculate_db_score(self, file_size: int, query_time: float, table_count: int) -> int:
        """Calculate database performance score"""
        score = 100
        
        # Penalize slow queries
        if query_time > 0.1:
            score -= 30
        elif query_time > 0.05:
            score -= 15
            
        # Penalize very large databases (for development)
        if file_size > 100 * 1024 * 1024:  # 100MB
            score -= 20
            
        return max(0, score)

class ProcessAnalyzer:
    """Analyze running processes and resource usage"""
    
    def analyze_running_processes(self) -> Dict:
        """Analyze processes related to the application"""
        print("🔍 Analyzing running processes...")
        
        try:
            # Find Python processes
            python_processes = []
            node_processes = []
            
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'cmdline']):
                try:
                    if proc.info['name'] and 'python' in proc.info['name'].lower():
                        python_processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'cpu_percent': proc.info['cpu_percent'],
                            'memory_percent': proc.info['memory_percent'],
                            'cmdline': ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                        })
                    elif proc.info['name'] and 'node' in proc.info['name'].lower():
                        node_processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name'],
                            'cpu_percent': proc.info['cpu_percent'],
                            'memory_percent': proc.info['memory_percent'],
                            'cmdline': ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
                    
            return {
                'python_processes': python_processes,
                'node_processes': node_processes,
                'total_python_processes': len(python_processes),
                'total_node_processes': len(node_processes),
                'system_load': os.getloadavg() if hasattr(os, 'getloadavg') else 'N/A'
            }
            
        except Exception as e:
            return {'error': str(e)}

class ComprehensivePerformanceAnalyzer:
    """Main analyzer that orchestrates all performance tests"""
    
    def __init__(self):
        self.system_analyzer = SystemPerformanceAnalyzer()
        self.frontend_analyzer = FrontendPerformanceAnalyzer()
        self.database_analyzer = DatabasePerformanceAnalyzer()
        self.process_analyzer = ProcessAnalyzer()
        
    def run_comprehensive_analysis(self) -> Dict:
        """Run all performance analyses"""
        print("🚀 Starting Comprehensive Performance Analysis...")
        print("=" * 70)
        
        results = {
            'test_timestamp': datetime.now().isoformat(),
            'analyses': {}
        }
        
        # 1. System Performance Analysis
        print("\n1. SYSTEM PERFORMANCE ANALYSIS")
        print("-" * 40)
        system_results = self.system_analyzer.collect_system_metrics(duration=10)
        results['analyses']['system_performance'] = system_results
        
        if 'error' not in system_results:
            print(f"✓ CPU Average: {system_results['cpu_stats']['average']:.1f}%")
            print(f"✓ Memory Average: {system_results['memory_stats']['average']:.1f}%")
            print(f"✓ Sample Rate: {system_results['sample_rate']:.1f} samples/sec")
        
        # 2. Frontend Performance Analysis
        print("\n2. FRONTEND PERFORMANCE ANALYSIS")
        print("-" * 40)
        frontend_results = self.frontend_analyzer.analyze_frontend_performance()
        results['analyses']['frontend_performance'] = frontend_results
        
        if frontend_results['connectivity']['accessible']:
            print(f"✓ Frontend accessible")
            if 'error' not in frontend_results['load_times']:
                print(f"✓ Average load time: {frontend_results['load_times']['avg_load_time']:.3f}s")
                print(f"✓ Performance grade: {frontend_results['load_times']['performance_grade']}")
        else:
            print(f"✗ Frontend not accessible")
            
        # 3. Database Performance Analysis
        print("\n3. DATABASE PERFORMANCE ANALYSIS")
        print("-" * 40)
        database_results = self.database_analyzer.analyze_database_file()
        results['analyses']['database_performance'] = database_results
        
        if database_results['exists']:
            print(f"✓ Database accessible")
            print(f"✓ File size: {database_results['file_size']:,} bytes")
            print(f"✓ Table count: {database_results['table_count']}")
            print(f"✓ Performance score: {database_results['performance_score']}/100")
        else:
            print(f"✗ Database not accessible")
            
        # 4. Process Analysis
        print("\n4. PROCESS ANALYSIS")
        print("-" * 40)
        process_results = self.process_analyzer.analyze_running_processes()
        results['analyses']['process_analysis'] = process_results
        
        if 'error' not in process_results:
            print(f"✓ Python processes: {process_results['total_python_processes']}")
            print(f"✓ Node processes: {process_results['total_node_processes']}")
            
        # 5. Generate Overall Assessment
        print("\n5. OVERALL ASSESSMENT")
        print("-" * 40)
        assessment = self._generate_assessment(results['analyses'])
        results['assessment'] = assessment
        
        print(f"✓ Overall Performance Score: {assessment['overall_score']}/100")
        print(f"✓ Production Readiness: {assessment['production_readiness']}")
        print(f"✓ Critical Issues: {len(assessment['critical_issues'])}")
        
        return results
        
    def _generate_assessment(self, analyses: Dict) -> Dict:
        """Generate overall assessment from all analyses"""
        scores = []
        critical_issues = []
        recommendations = []
        
        # Frontend assessment
        frontend = analyses.get('frontend_performance', {})
        if frontend.get('connectivity', {}).get('accessible', False):
            if 'error' not in frontend.get('load_times', {}):
                load_time = frontend['load_times']['avg_load_time']
                if load_time < 1.0:
                    scores.append(90)
                elif load_time < 2.0:
                    scores.append(75)
                else:
                    scores.append(50)
                    recommendations.append("Optimize frontend load times")
            else:
                scores.append(30)
                critical_issues.append("Frontend load time measurement failed")
        else:
            scores.append(0)
            critical_issues.append("Frontend not accessible")
            
        # Database assessment
        database = analyses.get('database_performance', {})
        if database.get('exists', False):
            scores.append(database.get('performance_score', 50))
        else:
            scores.append(0)
            critical_issues.append("Database not accessible")
            
        # System assessment
        system = analyses.get('system_performance', {})
        if 'error' not in system:
            cpu_avg = system['cpu_stats']['average']
            memory_avg = system['memory_stats']['average']
            
            if cpu_avg < 50 and memory_avg < 70:
                scores.append(90)
            elif cpu_avg < 80 and memory_avg < 85:
                scores.append(70)
            else:
                scores.append(40)
                recommendations.append("System resources under stress")
        else:
            scores.append(50)
            
        # Calculate overall score
        overall_score = statistics.mean(scores) if scores else 0
        
        # Production readiness assessment
        if overall_score >= 80 and len(critical_issues) == 0:
            production_readiness = "Ready for staging"
        elif overall_score >= 60 and len(critical_issues) <= 1:
            production_readiness = "Needs optimization"
        else:
            production_readiness = "Not ready for production"
            
        # Standard recommendations
        recommendations.extend([
            "Implement comprehensive monitoring",
            "Add load testing for production capacity",
            "Configure proper error handling and logging",
            "Set up database connection pooling",
            "Implement caching strategies"
        ])
        
        return {
            'overall_score': round(overall_score, 1),
            'production_readiness': production_readiness,
            'critical_issues': critical_issues,
            'recommendations': recommendations,
            'component_scores': {
                'frontend': scores[0] if len(scores) > 0 else 0,
                'database': scores[1] if len(scores) > 1 else 0,
                'system': scores[2] if len(scores) > 2 else 0
            }
        }

def main():
    """Main execution function"""
    print("BookedBarber V2 - Performance Analysis Suite")
    print("=" * 50)
    
    analyzer = ComprehensivePerformanceAnalyzer()
    
    try:
        # Run comprehensive analysis
        results = analyzer.run_comprehensive_analysis()
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"performance_analysis_report_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
            
        print(f"\n📊 PERFORMANCE ANALYSIS COMPLETE")
        print("=" * 50)
        print(f"Report saved to: {report_file}")
        
        # Display summary
        assessment = results['assessment']
        print(f"\n🎯 EXECUTIVE SUMMARY")
        print(f"Overall Score: {assessment['overall_score']}/100")
        print(f"Production Readiness: {assessment['production_readiness']}")
        
        if assessment['critical_issues']:
            print(f"\n🚨 CRITICAL ISSUES")
            for issue in assessment['critical_issues']:
                print(f"• {issue}")
                
        print(f"\n📈 TOP RECOMMENDATIONS")
        for i, rec in enumerate(assessment['recommendations'][:5], 1):
            print(f"{i}. {rec}")
            
        print(f"\n📄 Full report available in: {report_file}")
        
        return results
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    main()