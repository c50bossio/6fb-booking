#!/usr/bin/env python3
"""
Redis Performance Analysis Script
================================

Comprehensive performance analysis and optimization recommendations for
BookedBarber's Redis infrastructure.

Features:
- Performance benchmarking
- Key pattern analysis
- TTL optimization recommendations
- Memory usage analysis
- Connection pool optimization
- AWS ElastiCache specific insights

Usage:
    python scripts/analyze_redis_performance.py --cluster-id bookedbarber-redis --detailed

Requirements:
    pip install redis click colorama tabulate matplotlib seaborn pandas
"""

import redis
import click
import time
import statistics
from typing import Dict, List, Optional, Any
from datetime import datetime
from collections import defaultdict, Counter
from colorama import init, Fore, Style
from tabulate import tabulate

# Optional imports for advanced analysis
try:
    import matplotlib.pyplot as plt
    ADVANCED_ANALYSIS = True
except ImportError:
    ADVANCED_ANALYSIS = False
    click.echo(f"{Fore.YELLOW}⚠️  Advanced analysis disabled. Install pandas, matplotlib, seaborn for charts.")

# Initialize colorama
init(autoreset=True)

class RedisPerformanceAnalyzer:
    """Comprehensive Redis performance analyzer."""
    
    def __init__(self, redis_url: str, password: Optional[str] = None):
        """Initialize Redis performance analyzer."""
        try:
            # Parse Redis URL
            if redis_url.startswith('redis://') or redis_url.startswith('rediss://'):
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
            else:
                self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
            
            if password:
                self.redis_client.auth(password)
            
            # Test connection
            self.redis_client.ping()
            click.echo(f"{Fore.GREEN}✅ Connected to Redis: {redis_url}")
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error connecting to Redis: {e}")
            raise
        
        # Analysis configuration
        self.sample_size = 1000  # Number of keys to sample for analysis
        self.benchmark_iterations = 100
        self.key_patterns = {}
        self.memory_analysis = {}
        self.performance_metrics = {}
    
    def get_redis_info(self) -> Dict[str, Any]:
        """Get comprehensive Redis instance information."""
        try:
            info = self.redis_client.info()
            
            # Calculate derived metrics
            used_memory = info.get('used_memory', 0)
            max_memory = info.get('maxmemory', 0)
            memory_usage_percent = (used_memory / max_memory * 100) if max_memory > 0 else 0
            
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            hit_rate = (hits / (hits + misses) * 100) if (hits + misses) > 0 else 0
            
            # Extract key metrics
            metrics = {
                'redis_version': info.get('redis_version', 'unknown'),
                'uptime_seconds': info.get('uptime_in_seconds', 0),
                'connected_clients': info.get('connected_clients', 0),
                'used_memory': used_memory,
                'used_memory_human': info.get('used_memory_human', '0B'),
                'max_memory': max_memory,
                'memory_usage_percent': memory_usage_percent,
                'total_commands_processed': info.get('total_commands_processed', 0),
                'instantaneous_ops_per_sec': info.get('instantaneous_ops_per_sec', 0),
                'keyspace_hits': hits,
                'keyspace_misses': misses,
                'hit_rate_percent': hit_rate,
                'evicted_keys': info.get('evicted_keys', 0),
                'expired_keys': info.get('expired_keys', 0),
                'total_connections_received': info.get('total_connections_received', 0),
                'rejected_connections': info.get('rejected_connections', 0),
                'maxclients': info.get('maxclients', 0)
            }
            
            # Get database info
            db_info = {}
            for key, value in info.items():
                if key.startswith('db'):
                    db_info[key] = value
            
            metrics['databases'] = db_info
            
            return metrics
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error getting Redis info: {e}")
            return {}
    
    def analyze_key_patterns(self, sample_size: Optional[int] = None) -> Dict[str, Any]:
        """Analyze key patterns and naming conventions."""
        sample_size = sample_size or self.sample_size
        
        click.echo(f"{Fore.BLUE}🔍 Analyzing key patterns (sample: {sample_size})...")
        
        try:
            # Get sample of keys
            all_keys = self.redis_client.keys('*')
            
            if len(all_keys) > sample_size:
                # Sample randomly
                import random
                sampled_keys = random.sample(all_keys, sample_size)
            else:
                sampled_keys = all_keys
            
            # Analyze patterns
            pattern_counts = Counter()
            prefix_counts = Counter()
            type_counts = Counter()
            ttl_analysis = {'with_ttl': 0, 'without_ttl': 0, 'ttl_distribution': []}
            memory_by_type = defaultdict(int)
            key_sizes = []
            
            for key in sampled_keys:
                try:
                    # Analyze key structure
                    parts = key.split(':')
                    if len(parts) > 1:
                        prefix = parts[0]
                        prefix_counts[prefix] += 1
                        
                        # Pattern detection
                        if len(parts) == 2:
                            pattern = f"{prefix}:*"
                        elif len(parts) == 3:
                            pattern = f"{prefix}:{parts[1]}:*"
                        else:
                            pattern = f"{prefix}:...:{parts[-1]}"
                        
                        pattern_counts[pattern] += 1
                    
                    # Get key type and memory usage
                    key_type = self.redis_client.type(key)
                    type_counts[key_type] += 1
                    
                    # Memory usage (approximation)
                    try:
                        memory_usage = self.redis_client.memory_usage(key)
                        memory_by_type[key_type] += memory_usage
                        key_sizes.append(memory_usage)
                    except:
                        # Memory usage command not available
                        pass
                    
                    # TTL analysis
                    ttl = self.redis_client.ttl(key)
                    if ttl > 0:
                        ttl_analysis['with_ttl'] += 1
                        ttl_analysis['ttl_distribution'].append(ttl)
                    elif ttl == -1:
                        ttl_analysis['without_ttl'] += 1
                
                except Exception as e:
                    continue
            
            # Calculate statistics
            total_keys = len(sampled_keys)
            ttl_stats = {}
            if ttl_analysis['ttl_distribution']:
                ttl_values = ttl_analysis['ttl_distribution']
                ttl_stats = {
                    'avg_ttl': statistics.mean(ttl_values),
                    'median_ttl': statistics.median(ttl_values),
                    'min_ttl': min(ttl_values),
                    'max_ttl': max(ttl_values)
                }
            
            memory_stats = {}
            if key_sizes:
                memory_stats = {
                    'avg_key_size': statistics.mean(key_sizes),
                    'median_key_size': statistics.median(key_sizes),
                    'total_sampled_memory': sum(key_sizes)
                }
            
            analysis = {
                'total_keys_analyzed': total_keys,
                'total_keys_in_db': len(all_keys),
                'most_common_patterns': pattern_counts.most_common(10),
                'most_common_prefixes': prefix_counts.most_common(10),
                'key_types': dict(type_counts),
                'memory_by_type': dict(memory_by_type),
                'ttl_analysis': {
                    'keys_with_ttl': ttl_analysis['with_ttl'],
                    'keys_without_ttl': ttl_analysis['without_ttl'],
                    'ttl_percentage': (ttl_analysis['with_ttl'] / total_keys * 100) if total_keys > 0 else 0,
                    'ttl_stats': ttl_stats
                },
                'memory_stats': memory_stats
            }
            
            self.key_patterns = analysis
            return analysis
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error analyzing key patterns: {e}")
            return {}
    
    def benchmark_performance(self, iterations: Optional[int] = None) -> Dict[str, Any]:
        """Benchmark Redis performance."""
        iterations = iterations or self.benchmark_iterations
        
        click.echo(f"{Fore.BLUE}⚡ Benchmarking Redis performance ({iterations} iterations)...")
        
        benchmarks = {}
        
        try:
            # PING benchmark
            ping_times = []
            for _ in range(iterations):
                start = time.time()
                self.redis_client.ping()
                ping_times.append((time.time() - start) * 1000)
            
            benchmarks['ping'] = {
                'avg_ms': statistics.mean(ping_times),
                'min_ms': min(ping_times),
                'max_ms': max(ping_times),
                'p95_ms': self._percentile(ping_times, 95),
                'p99_ms': self._percentile(ping_times, 99)
            }
            
            # SET benchmark
            set_times = []
            for i in range(iterations):
                key = f"benchmark:set:{i}"
                value = f"test_value_{i}"
                
                start = time.time()
                self.redis_client.set(key, value)
                set_times.append((time.time() - start) * 1000)
            
            benchmarks['set'] = {
                'avg_ms': statistics.mean(set_times),
                'min_ms': min(set_times),
                'max_ms': max(set_times),
                'p95_ms': self._percentile(set_times, 95),
                'p99_ms': self._percentile(set_times, 99),
                'ops_per_sec': 1000 / statistics.mean(set_times)
            }
            
            # GET benchmark
            get_times = []
            for i in range(iterations):
                key = f"benchmark:set:{i}"
                
                start = time.time()
                self.redis_client.get(key)
                get_times.append((time.time() - start) * 1000)
            
            benchmarks['get'] = {
                'avg_ms': statistics.mean(get_times),
                'min_ms': min(get_times),
                'max_ms': max(get_times),
                'p95_ms': self._percentile(get_times, 95),
                'p99_ms': self._percentile(get_times, 99),
                'ops_per_sec': 1000 / statistics.mean(get_times)
            }
            
            # Cleanup benchmark keys
            for i in range(iterations):
                self.redis_client.delete(f"benchmark:set:{i}")
            
            # Pipeline benchmark
            pipeline_times = []
            for _ in range(10):  # Fewer iterations for pipeline
                pipe = self.redis_client.pipeline()
                
                start = time.time()
                for i in range(100):
                    pipe.set(f"benchmark:pipeline:{i}", f"value_{i}")
                pipe.execute()
                pipeline_times.append((time.time() - start) * 1000)
                
                # Cleanup
                for i in range(100):
                    self.redis_client.delete(f"benchmark:pipeline:{i}")
            
            benchmarks['pipeline_100_sets'] = {
                'avg_ms': statistics.mean(pipeline_times),
                'min_ms': min(pipeline_times),
                'max_ms': max(pipeline_times),
                'ops_per_sec': 100000 / statistics.mean(pipeline_times)  # 100 ops per pipeline
            }
            
            self.performance_metrics = benchmarks
            return benchmarks
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error during benchmarking: {e}")
            return {}
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data."""
        sorted_data = sorted(data)
        index = int((percentile / 100.0) * len(sorted_data))
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def analyze_memory_usage(self) -> Dict[str, Any]:
        """Analyze memory usage patterns."""
        click.echo(f"{Fore.BLUE}💾 Analyzing memory usage...")
        
        try:
            info = self.redis_client.info('memory')
            
            analysis = {
                'total_memory': {
                    'used_memory': info.get('used_memory', 0),
                    'used_memory_human': info.get('used_memory_human', '0B'),
                    'used_memory_rss': info.get('used_memory_rss', 0),
                    'used_memory_peak': info.get('used_memory_peak', 0),
                    'used_memory_peak_human': info.get('used_memory_peak_human', '0B')
                },
                'fragmentation': {
                    'mem_fragmentation_ratio': info.get('mem_fragmentation_ratio', 0),
                    'mem_fragmentation_bytes': info.get('mem_fragmentation_bytes', 0)
                },
                'allocation': {
                    'allocator_allocated': info.get('allocator_allocated', 0),
                    'allocator_active': info.get('allocator_active', 0),
                    'allocator_resident': info.get('allocator_resident', 0)
                }
            }
            
            # Memory efficiency score
            fragmentation_ratio = analysis['fragmentation']['mem_fragmentation_ratio']
            if fragmentation_ratio < 1.5:
                efficiency_score = 100
            elif fragmentation_ratio < 2.0:
                efficiency_score = 80
            elif fragmentation_ratio < 3.0:
                efficiency_score = 60
            else:
                efficiency_score = 40
            
            analysis['efficiency_score'] = efficiency_score
            
            self.memory_analysis = analysis
            return analysis
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error analyzing memory usage: {e}")
            return {}
    
    def generate_optimization_recommendations(self) -> List[Dict[str, Any]]:
        """Generate optimization recommendations based on analysis."""
        recommendations = []
        
        # Get current info
        redis_info = self.get_redis_info()
        
        # Memory recommendations
        if redis_info.get('memory_usage_percent', 0) > 80:
            recommendations.append({
                'category': 'Memory',
                'priority': 'High',
                'issue': f"High memory usage: {redis_info['memory_usage_percent']:.1f}%",
                'recommendation': 'Increase instance memory or implement data eviction policies',
                'impact': 'Prevents memory exhaustion and improves performance'
            })
        
        # Hit rate recommendations
        hit_rate = redis_info.get('hit_rate_percent', 0)
        if hit_rate < 85:
            recommendations.append({
                'category': 'Performance',
                'priority': 'Medium' if hit_rate > 70 else 'High',
                'issue': f"Low cache hit rate: {hit_rate:.1f}%",
                'recommendation': 'Review caching strategies and TTL values',
                'impact': 'Improves application response times and reduces database load'
            })
        
        # Key pattern recommendations
        if self.key_patterns:
            ttl_percentage = self.key_patterns.get('ttl_analysis', {}).get('ttl_percentage', 0)
            if ttl_percentage < 50:
                recommendations.append({
                    'category': 'Memory Management',
                    'priority': 'Medium',
                    'issue': f"Only {ttl_percentage:.1f}% of keys have TTL",
                    'recommendation': 'Implement TTL for more keys to prevent memory leaks',
                    'impact': 'Prevents unbounded memory growth'
                })
        
        # Performance recommendations
        if self.performance_metrics:
            avg_get_time = self.performance_metrics.get('get', {}).get('avg_ms', 0)
            if avg_get_time > 5:
                recommendations.append({
                    'category': 'Performance',
                    'priority': 'Medium',
                    'issue': f"Slow GET operations: {avg_get_time:.2f}ms average",
                    'recommendation': 'Check network latency and instance sizing',
                    'impact': 'Improves application response times'
                })
        
        # Connection recommendations
        connected_clients = redis_info.get('connected_clients', 0)
        max_clients = redis_info.get('maxclients', 0)
        if max_clients > 0 and connected_clients / max_clients > 0.8:
            recommendations.append({
                'category': 'Connections',
                'priority': 'High',
                'issue': f"High connection usage: {connected_clients}/{max_clients}",
                'recommendation': 'Optimize connection pooling or increase maxclients',
                'impact': 'Prevents connection exhaustion'
            })
        
        # Memory fragmentation recommendations
        if self.memory_analysis:
            fragmentation_ratio = self.memory_analysis.get('fragmentation', {}).get('mem_fragmentation_ratio', 0)
            if fragmentation_ratio > 2.0:
                recommendations.append({
                    'category': 'Memory',
                    'priority': 'Medium',
                    'issue': f"High memory fragmentation: {fragmentation_ratio:.2f}",
                    'recommendation': 'Consider restarting Redis or implementing memory defragmentation',
                    'impact': 'Improves memory efficiency'
                })
        
        return recommendations
    
    def create_performance_report(self, output_file: Optional[str] = None) -> str:
        """Create comprehensive performance report."""
        report_lines = []
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        report_lines.extend([
            "Redis Performance Analysis Report",
            "=" * 50,
            f"Generated: {timestamp}",
            ""
        ])
        
        # Redis Info Summary
        redis_info = self.get_redis_info()
        if redis_info:
            report_lines.extend([
                "📊 REDIS INSTANCE SUMMARY",
                "-" * 30,
                f"Redis Version: {redis_info['redis_version']}",
                f"Uptime: {redis_info['uptime_seconds']} seconds",
                f"Connected Clients: {redis_info['connected_clients']}",
                f"Memory Usage: {redis_info['used_memory_human']} ({redis_info['memory_usage_percent']:.1f}%)",
                f"Hit Rate: {redis_info['hit_rate_percent']:.1f}%",
                f"Operations/sec: {redis_info['instantaneous_ops_per_sec']}",
                ""
            ])
        
        # Performance Benchmarks
        if self.performance_metrics:
            report_lines.extend([
                "⚡ PERFORMANCE BENCHMARKS",
                "-" * 30
            ])
            
            for operation, metrics in self.performance_metrics.items():
                report_lines.append(f"{operation.upper()}:")
                report_lines.append(f"  Average: {metrics['avg_ms']:.2f}ms")
                report_lines.append(f"  95th percentile: {metrics.get('p95_ms', 'N/A')}")
                if 'ops_per_sec' in metrics:
                    report_lines.append(f"  Ops/sec: {metrics['ops_per_sec']:.0f}")
                report_lines.append("")
        
        # Key Pattern Analysis
        if self.key_patterns:
            report_lines.extend([
                "🔍 KEY PATTERN ANALYSIS",
                "-" * 30,
                f"Total Keys Analyzed: {self.key_patterns['total_keys_analyzed']}",
                f"Keys with TTL: {self.key_patterns['ttl_analysis']['ttl_percentage']:.1f}%",
                ""
            ])
            
            if self.key_patterns['most_common_patterns']:
                report_lines.append("Most Common Patterns:")
                for pattern, count in self.key_patterns['most_common_patterns'][:5]:
                    report_lines.append(f"  {pattern}: {count}")
                report_lines.append("")
        
        # Optimization Recommendations
        recommendations = self.generate_optimization_recommendations()
        if recommendations:
            report_lines.extend([
                "💡 OPTIMIZATION RECOMMENDATIONS",
                "-" * 30
            ])
            
            for i, rec in enumerate(recommendations, 1):
                report_lines.extend([
                    f"{i}. {rec['category']} - {rec['priority']} Priority",
                    f"   Issue: {rec['issue']}",
                    f"   Recommendation: {rec['recommendation']}",
                    f"   Impact: {rec['impact']}",
                    ""
                ])
        
        report_content = "\n".join(report_lines)
        
        # Save to file if requested
        if output_file:
            try:
                with open(output_file, 'w') as f:
                    f.write(report_content)
                click.echo(f"{Fore.GREEN}✅ Report saved to: {output_file}")
            except Exception as e:
                click.echo(f"{Fore.RED}❌ Error saving report: {e}")
        
        return report_content
    
    def create_visualizations(self, output_dir: str = "redis_analysis") -> None:
        """Create performance visualizations (requires matplotlib)."""
        if not ADVANCED_ANALYSIS:
            click.echo(f"{Fore.YELLOW}⚠️  Visualization requires pandas, matplotlib, seaborn")
            return
        
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            # Performance benchmark chart
            if self.performance_metrics:
                operations = list(self.performance_metrics.keys())
                avg_times = [self.performance_metrics[op]['avg_ms'] for op in operations]
                
                plt.figure(figsize=(10, 6))
                plt.bar(operations, avg_times)
                plt.title('Redis Operation Performance')
                plt.xlabel('Operation')
                plt.ylabel('Average Time (ms)')
                plt.xticks(rotation=45)
                plt.tight_layout()
                plt.savefig(f"{output_dir}/performance_benchmark.png")
                plt.close()
            
            # Key type distribution
            if self.key_patterns and 'key_types' in self.key_patterns:
                key_types = self.key_patterns['key_types']
                
                plt.figure(figsize=(8, 8))
                plt.pie(key_types.values(), labels=key_types.keys(), autopct='%1.1f%%')
                plt.title('Key Type Distribution')
                plt.savefig(f"{output_dir}/key_type_distribution.png")
                plt.close()
            
            click.echo(f"{Fore.GREEN}✅ Visualizations saved to: {output_dir}/")
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating visualizations: {e}")


@click.command()
@click.option('--redis-url', required=True, help='Redis connection URL')
@click.option('--password', help='Redis password (if required)')
@click.option('--cluster-id', help='ElastiCache cluster ID for context')
@click.option('--sample-size', default=1000, help='Number of keys to sample for analysis')
@click.option('--benchmark-iterations', default=100, help='Number of benchmark iterations')
@click.option('--detailed', is_flag=True, help='Run detailed analysis (slower)')
@click.option('--output-report', help='Save report to file')
@click.option('--create-charts', is_flag=True, help='Create performance charts')
@click.option('--chart-dir', default='redis_analysis', help='Directory for charts')
def main(redis_url: str, password: str, cluster_id: str, sample_size: int,
         benchmark_iterations: int, detailed: bool, output_report: str,
         create_charts: bool, chart_dir: str):
    """Analyze Redis performance and generate optimization recommendations."""
    
    try:
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🔍 Redis Performance Analysis")
        click.echo(f"{Fore.CYAN}{'='*50}{Style.RESET_ALL}")
        
        # Initialize analyzer
        analyzer = RedisPerformanceAnalyzer(redis_url, password)
        
        if cluster_id:
            click.echo(f"{Fore.BLUE}📋 Analyzing cluster: {cluster_id}")
        
        # Get basic Redis info
        click.echo(f"\n{Fore.BLUE}📊 Collecting Redis information...")
        redis_info = analyzer.get_redis_info()
        
        if redis_info:
            click.echo(f"{Fore.GREEN}✅ Redis Version: {redis_info['redis_version']}")
            click.echo(f"{Fore.GREEN}✅ Memory Usage: {redis_info['used_memory_human']} ({redis_info['memory_usage_percent']:.1f}%)")
            click.echo(f"{Fore.GREEN}✅ Hit Rate: {redis_info['hit_rate_percent']:.1f}%")
            click.echo(f"{Fore.GREEN}✅ Connected Clients: {redis_info['connected_clients']}")
        
        # Run performance benchmarks
        click.echo(f"\n{Fore.BLUE}⚡ Running performance benchmarks...")
        benchmarks = analyzer.benchmark_performance(benchmark_iterations)
        
        if benchmarks:
            # Display benchmark results
            benchmark_table = []
            for operation, metrics in benchmarks.items():
                row = [
                    operation.upper(),
                    f"{metrics['avg_ms']:.2f}ms",
                    f"{metrics.get('p95_ms', 'N/A'):.2f}ms" if isinstance(metrics.get('p95_ms'), (int, float)) else 'N/A',
                    f"{metrics.get('ops_per_sec', 'N/A'):.0f}" if isinstance(metrics.get('ops_per_sec'), (int, float)) else 'N/A'
                ]
                benchmark_table.append(row)
            
            click.echo(f"\n{Fore.CYAN}Performance Benchmark Results:")
            click.echo(tabulate(
                benchmark_table,
                headers=['Operation', 'Avg Time', 'P95 Time', 'Ops/Sec'],
                tablefmt='grid'
            ))
        
        # Detailed analysis
        if detailed:
            click.echo(f"\n{Fore.BLUE}🔍 Running detailed key pattern analysis...")
            key_analysis = analyzer.analyze_key_patterns(sample_size)
            
            if key_analysis:
                click.echo(f"{Fore.GREEN}✅ Analyzed {key_analysis['total_keys_analyzed']} keys")
                click.echo(f"   Keys with TTL: {key_analysis['ttl_analysis']['ttl_percentage']:.1f}%")
                
                if key_analysis['most_common_patterns']:
                    click.echo(f"\n{Fore.CYAN}Most Common Key Patterns:")
                    for pattern, count in key_analysis['most_common_patterns'][:5]:
                        click.echo(f"  {pattern}: {count}")
            
            click.echo(f"\n{Fore.BLUE}💾 Analyzing memory usage...")
            memory_analysis = analyzer.analyze_memory_usage()
            
            if memory_analysis:
                fragmentation = memory_analysis.get('fragmentation', {}).get('mem_fragmentation_ratio', 0)
                efficiency = memory_analysis.get('efficiency_score', 0)
                
                color = Fore.GREEN if efficiency > 80 else Fore.YELLOW if efficiency > 60 else Fore.RED
                click.echo(f"{color}Memory Efficiency Score: {efficiency}/100")
                click.echo(f"Fragmentation Ratio: {fragmentation:.2f}")
        
        # Generate recommendations
        click.echo(f"\n{Fore.BLUE}💡 Generating optimization recommendations...")
        recommendations = analyzer.generate_optimization_recommendations()
        
        if recommendations:
            click.echo(f"\n{Fore.CYAN}Optimization Recommendations:")
            for i, rec in enumerate(recommendations, 1):
                priority_color = Fore.RED if rec['priority'] == 'High' else Fore.YELLOW if rec['priority'] == 'Medium' else Fore.GREEN
                click.echo(f"{priority_color}{i}. {rec['category']} - {rec['priority']} Priority")
                click.echo(f"   {rec['issue']}")
                click.echo(f"   💡 {rec['recommendation']}")
                click.echo()
        else:
            click.echo(f"{Fore.GREEN}✅ No optimization recommendations - Redis is performing well!")
        
        # Create comprehensive report
        if output_report:
            click.echo(f"\n{Fore.BLUE}📄 Creating performance report...")
            analyzer.create_performance_report(output_report)
        
        # Create visualizations
        if create_charts:
            click.echo(f"\n{Fore.BLUE}📊 Creating performance charts...")
            analyzer.create_visualizations(chart_dir)
        
        # Summary
        click.echo(f"\n{Fore.GREEN}🎉 Analysis complete!")
        
        if redis_info:
            # Performance summary
            hit_rate = redis_info['hit_rate_percent']
            memory_usage = redis_info['memory_usage_percent']
            
            overall_score = 100
            if hit_rate < 85:
                overall_score -= (85 - hit_rate)
            if memory_usage > 80:
                overall_score -= (memory_usage - 80) * 2
            
            overall_score = max(0, overall_score)
            
            score_color = Fore.GREEN if overall_score > 80 else Fore.YELLOW if overall_score > 60 else Fore.RED
            click.echo(f"{score_color}Overall Performance Score: {overall_score:.0f}/100")
        
        if recommendations:
            click.echo(f"{Fore.BLUE}💡 Found {len(recommendations)} optimization opportunities")
        
    except KeyboardInterrupt:
        click.echo(f"\n{Fore.YELLOW}⚠️  Analysis interrupted by user")
    except Exception as e:
        click.echo(f"\n{Fore.RED}❌ Analysis failed: {e}")


if __name__ == '__main__':
    main()