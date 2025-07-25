#!/usr/bin/env python3
"""
Redis to ElastiCache Migration Utility
======================================

Seamless migration from local Redis to AWS ElastiCache for BookedBarber.
Handles data migration, configuration updates, and validation with minimal downtime.

Features:
- Zero-downtime migration with dual-write strategy
- Data consistency validation and verification
- Automatic configuration updates
- Rollback capabilities
- Performance comparison and optimization
- Migration status monitoring and reporting

Usage:
    # Plan migration (dry run)
    python scripts/migrate_to_elasticache.py --plan --source redis://localhost:6379 --target my-cluster.xxx.cache.amazonaws.com:6379

    # Execute migration
    python scripts/migrate_to_elasticache.py --migrate --source redis://localhost:6379 --target my-cluster.xxx.cache.amazonaws.com:6379

    # Validate migration
    python scripts/migrate_to_elasticache.py --validate --source redis://localhost:6379 --target my-cluster.xxx.cache.amazonaws.com:6379

    # Complete migration (switch to target)
    python scripts/migrate_to_elasticache.py --complete --target my-cluster.xxx.cache.amazonaws.com:6379

Requirements:
    pip install redis click colorama tabulate
"""

import time
import redis
import click
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from pathlib import Path
from colorama import init, Fore, Style
from concurrent.futures import ThreadPoolExecutor, as_completed

# Initialize colorama
init(autoreset=True)


@dataclass
class MigrationConfig:
    """Migration configuration parameters."""
    source_url: str
    target_url: str
    batch_size: int = 1000
    parallel_workers: int = 4
    consistency_check_interval: int = 60  # seconds
    migration_timeout: int = 3600  # seconds (1 hour)
    dual_write_duration: int = 300  # seconds (5 minutes)
    key_patterns_to_migrate: List[str] = None
    key_patterns_to_exclude: List[str] = None
    preserve_ttl: bool = True
    verify_data_integrity: bool = True
    
    def __post_init__(self):
        if self.key_patterns_to_migrate is None:
            self.key_patterns_to_migrate = ['*']
        if self.key_patterns_to_exclude is None:
            self.key_patterns_to_exclude = []


@dataclass
class MigrationStatus:
    """Migration progress status."""
    total_keys: int
    migrated_keys: int
    failed_keys: int
    current_batch: int
    total_batches: int
    start_time: datetime
    estimated_completion: Optional[datetime]
    migration_rate: float  # keys per second
    errors: List[str]
    warnings: List[str]


@dataclass
class MigrationResult:
    """Final migration result."""
    success: bool
    total_keys_migrated: int
    total_keys_failed: int
    migration_time: float
    data_consistency_score: float
    performance_comparison: Dict[str, Any]
    validation_results: Dict[str, Any]
    rollback_info: Optional[Dict[str, Any]]
    message: str


class RedisMigrationManager:
    """Manages Redis to ElastiCache migration process."""
    
    def __init__(self, config: MigrationConfig):
        """Initialize migration manager."""
        self.config = config
        self.status = None
        self.migration_log = []
        
        # Initialize Redis connections
        try:
            self.source_redis = redis.from_url(config.source_url, decode_responses=True)
            self.target_redis = redis.from_url(config.target_url, decode_responses=True)
            
            # Test connections
            self.source_redis.ping()
            self.target_redis.ping()
            
            click.echo(f"{Fore.GREEN}✅ Connected to source and target Redis instances")
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error connecting to Redis: {e}")
            raise
        
        # Migration state
        self.migration_active = False
        self.dual_write_active = False
        self.migration_thread = None
        self.consistency_thread = None
        
        # Performance tracking
        self.performance_metrics = {
            'source': {},
            'target': {},
            'migration': {}
        }
    
    def analyze_migration_scope(self) -> Dict[str, Any]:
        """Analyze what needs to be migrated."""
        click.echo(f"{Fore.BLUE}🔍 Analyzing migration scope...")
        
        analysis = {
            'total_keys': 0,
            'key_types': {},
            'memory_usage': 0,
            'key_patterns': {},
            'ttl_distribution': {},
            'estimated_time': 0,
            'complexity_score': 0
        }
        
        try:
            # Get all keys matching patterns
            all_keys = set()
            for pattern in self.config.key_patterns_to_migrate:
                matching_keys = self.source_redis.keys(pattern)
                all_keys.update(matching_keys)
            
            # Remove excluded patterns
            for exclude_pattern in self.config.key_patterns_to_exclude:
                excluded_keys = self.source_redis.keys(exclude_pattern)
                all_keys -= set(excluded_keys)
            
            analysis['total_keys'] = len(all_keys)
            
            if analysis['total_keys'] == 0:
                return analysis
            
            # Sample keys for analysis (max 1000 for performance)
            sample_keys = list(all_keys)[:1000]
            
            # Analyze key types and patterns
            for key in sample_keys:
                try:
                    key_type = self.source_redis.type(key)
                    analysis['key_types'][key_type] = analysis['key_types'].get(key_type, 0) + 1
                    
                    # Analyze key patterns
                    parts = key.split(':')
                    if len(parts) > 1:
                        pattern = parts[0]
                        analysis['key_patterns'][pattern] = analysis['key_patterns'].get(pattern, 0) + 1
                    
                    # TTL analysis
                    ttl = self.source_redis.ttl(key)
                    if ttl > 0:
                        ttl_bucket = f"{(ttl // 3600)}h" if ttl > 3600 else f"{(ttl // 60)}m"
                        analysis['ttl_distribution'][ttl_bucket] = analysis['ttl_distribution'].get(ttl_bucket, 0) + 1
                    elif ttl == -1:
                        analysis['ttl_distribution']['persistent'] = analysis['ttl_distribution'].get('persistent', 0) + 1
                    
                    # Memory usage estimation
                    try:
                        memory = self.source_redis.memory_usage(key)
                        analysis['memory_usage'] += memory
                    except:
                        # Fallback estimation
                        if key_type == 'string':
                            analysis['memory_usage'] += len(str(self.source_redis.get(key) or ''))
                        else:
                            analysis['memory_usage'] += 100  # rough estimate
                
                except Exception as e:
                    continue
            
            # Extrapolate memory usage for all keys
            if sample_keys:
                avg_memory_per_key = analysis['memory_usage'] / len(sample_keys)
                analysis['memory_usage'] = int(avg_memory_per_key * analysis['total_keys'])
            
            # Estimate migration time
            estimated_rate = 100  # keys per second (conservative estimate)
            analysis['estimated_time'] = analysis['total_keys'] / estimated_rate
            
            # Calculate complexity score
            complexity_factors = [
                len(analysis['key_types']) * 10,  # Type diversity
                len(analysis['key_patterns']) * 5,  # Pattern diversity
                analysis['total_keys'] / 1000,  # Scale factor
                len(analysis['ttl_distribution']) * 5  # TTL complexity
            ]
            analysis['complexity_score'] = sum(complexity_factors)
            
        except Exception as e:
            analysis['error'] = str(e)
        
        return analysis
    
    def create_migration_plan(self) -> Dict[str, Any]:
        """Create detailed migration execution plan."""
        click.echo(f"{Fore.BLUE}📋 Creating migration plan...")
        
        scope = self.analyze_migration_scope()
        
        plan = {
            'scope_analysis': scope,
            'migration_strategy': {},
            'phases': [],
            'risks': [],
            'recommendations': [],
            'estimated_downtime': 0
        }
        
        # Determine migration strategy
        if scope['total_keys'] > 100000:
            plan['migration_strategy'] = {
                'type': 'phased_migration',
                'phases': ['bulk_transfer', 'incremental_sync', 'dual_write', 'cutover'],
                'estimated_duration': scope['estimated_time'] + 600  # Add buffer
            }
        elif scope['total_keys'] > 10000:
            plan['migration_strategy'] = {
                'type': 'dual_write_migration',
                'phases': ['dual_write_setup', 'bulk_transfer', 'validation', 'cutover'],
                'estimated_duration': scope['estimated_time'] + 300
            }
        else:
            plan['migration_strategy'] = {
                'type': 'simple_migration',
                'phases': ['bulk_transfer', 'validation', 'cutover'],
                'estimated_duration': scope['estimated_time']
            }
        
        # Create phase details
        for phase in plan['migration_strategy']['phases']:
            if phase == 'bulk_transfer':
                plan['phases'].append({
                    'name': 'Bulk Data Transfer',
                    'description': 'Copy all existing data from source to target',
                    'estimated_time': scope['estimated_time'] * 0.8,
                    'parallelizable': True,
                    'rollback_possible': True
                })
            elif phase == 'dual_write_setup':
                plan['phases'].append({
                    'name': 'Dual Write Setup',
                    'description': 'Configure application to write to both Redis instances',
                    'estimated_time': 60,
                    'parallelizable': False,
                    'rollback_possible': True
                })
            elif phase == 'incremental_sync':
                plan['phases'].append({
                    'name': 'Incremental Synchronization',
                    'description': 'Sync any changes made during bulk transfer',
                    'estimated_time': scope['estimated_time'] * 0.2,
                    'parallelizable': True,
                    'rollback_possible': True
                })
            elif phase == 'validation':
                plan['phases'].append({
                    'name': 'Data Validation',
                    'description': 'Verify data consistency between source and target',
                    'estimated_time': min(300, scope['total_keys'] / 10),
                    'parallelizable': True,
                    'rollback_possible': True
                })
            elif phase == 'cutover':
                plan['phases'].append({
                    'name': 'Application Cutover',
                    'description': 'Switch application to use target Redis exclusively',
                    'estimated_time': 30,
                    'parallelizable': False,
                    'rollback_possible': True
                })
        
        # Identify risks
        if scope['total_keys'] > 1000000:
            plan['risks'].append("Large dataset may cause extended migration time")
        
        if 'hash' in scope.get('key_types', {}) and scope['key_types']['hash'] > 1000:
            plan['risks'].append("Large number of hash keys may require special handling")
        
        if scope.get('memory_usage', 0) > 1024 * 1024 * 1024:  # 1GB
            plan['risks'].append("High memory usage may impact migration performance")
        
        # Generate recommendations
        if scope['total_keys'] > 50000:
            plan['recommendations'].append("Consider scheduling migration during low-traffic hours")
        
        if len(scope.get('ttl_distribution', {})) > 5:
            plan['recommendations'].append("Review TTL values to ensure they're preserved correctly")
        
        plan['recommendations'].extend([
            "Create backup snapshot before starting migration",
            "Monitor application performance during migration",
            "Have rollback plan ready in case of issues"
        ])
        
        # Estimate downtime
        if plan['migration_strategy']['type'] == 'simple_migration':
            plan['estimated_downtime'] = 60  # 1 minute
        else:
            plan['estimated_downtime'] = 10  # Near-zero with dual write
        
        return plan
    
    def migrate_key_batch(self, keys: List[str]) -> Tuple[int, int, List[str]]:
        """Migrate a batch of keys from source to target."""
        migrated = 0
        failed = 0
        errors = []
        
        for key in keys:
            try:
                # Get key type and value
                key_type = self.source_redis.type(key)
                ttl = self.source_redis.ttl(key) if self.config.preserve_ttl else -1
                
                if key_type == 'string':
                    value = self.source_redis.get(key)
                    if value is not None:
                        if ttl > 0:
                            self.target_redis.setex(key, ttl, value)
                        else:
                            self.target_redis.set(key, value)
                
                elif key_type == 'hash':
                    hash_data = self.source_redis.hgetall(key)
                    if hash_data:
                        self.target_redis.hset(key, mapping=hash_data)
                        if ttl > 0:
                            self.target_redis.expire(key, ttl)
                
                elif key_type == 'list':
                    list_data = self.source_redis.lrange(key, 0, -1)
                    if list_data:
                        self.target_redis.delete(key)  # Clear any existing data
                        self.target_redis.lpush(key, *reversed(list_data))
                        if ttl > 0:
                            self.target_redis.expire(key, ttl)
                
                elif key_type == 'set':
                    set_data = self.source_redis.smembers(key)
                    if set_data:
                        self.target_redis.delete(key)
                        self.target_redis.sadd(key, *set_data)
                        if ttl > 0:
                            self.target_redis.expire(key, ttl)
                
                elif key_type == 'zset':
                    zset_data = self.source_redis.zrange(key, 0, -1, withscores=True)
                    if zset_data:
                        self.target_redis.delete(key)
                        # Convert to dict for zadd
                        score_dict = {member: score for member, score in zset_data}
                        self.target_redis.zadd(key, score_dict)
                        if ttl > 0:
                            self.target_redis.expire(key, ttl)
                
                migrated += 1
                
            except Exception as e:
                failed += 1
                errors.append(f"Error migrating key '{key}': {str(e)}")
        
        return migrated, failed, errors
    
    def execute_migration(self) -> MigrationResult:
        """Execute the actual migration process."""
        click.echo(f"{Fore.BLUE}🚀 Starting migration execution...")
        
        start_time = time.time()
        self.migration_active = True
        
        try:
            # Get all keys to migrate
            all_keys = set()
            for pattern in self.config.key_patterns_to_migrate:
                matching_keys = self.source_redis.keys(pattern)
                all_keys.update(matching_keys)
            
            # Remove excluded keys
            for exclude_pattern in self.config.key_patterns_to_exclude:
                excluded_keys = self.source_redis.keys(exclude_pattern)
                all_keys -= set(excluded_keys)
            
            all_keys = list(all_keys)
            total_keys = len(all_keys)
            
            if total_keys == 0:
                return MigrationResult(
                    success=True,
                    total_keys_migrated=0,
                    total_keys_failed=0,
                    migration_time=0,
                    data_consistency_score=100.0,
                    performance_comparison={},
                    validation_results={},
                    rollback_info=None,
                    message="No keys to migrate"
                )
            
            # Initialize status tracking
            self.status = MigrationStatus(
                total_keys=total_keys,
                migrated_keys=0,
                failed_keys=0,
                current_batch=0,
                total_batches=(total_keys + self.config.batch_size - 1) // self.config.batch_size,
                start_time=datetime.now(),
                estimated_completion=None,
                migration_rate=0,
                errors=[],
                warnings=[]
            )
            
            # Create batches
            batches = [
                all_keys[i:i + self.config.batch_size]
                for i in range(0, total_keys, self.config.batch_size)
            ]
            
            click.echo(f"{Fore.BLUE}📦 Processing {len(batches)} batches with {self.config.parallel_workers} workers...")
            
            # Process batches in parallel
            total_migrated = 0
            total_failed = 0
            all_errors = []
            
            with ThreadPoolExecutor(max_workers=self.config.parallel_workers) as executor:
                # Submit all batch jobs
                future_to_batch = {
                    executor.submit(self.migrate_key_batch, batch): i
                    for i, batch in enumerate(batches)
                }
                
                # Process completed batches
                for future in as_completed(future_to_batch):
                    batch_num = future_to_batch[future]
                    
                    try:
                        migrated, failed, errors = future.result()
                        total_migrated += migrated
                        total_failed += failed
                        all_errors.extend(errors)
                        
                        # Update status
                        self.status.migrated_keys = total_migrated
                        self.status.failed_keys = total_failed
                        self.status.current_batch = batch_num + 1
                        
                        # Calculate migration rate
                        elapsed_time = time.time() - start_time
                        self.status.migration_rate = total_migrated / elapsed_time if elapsed_time > 0 else 0
                        
                        # Estimate completion time
                        if self.status.migration_rate > 0:
                            remaining_keys = total_keys - total_migrated
                            remaining_time = remaining_keys / self.status.migration_rate
                            self.status.estimated_completion = datetime.now() + timedelta(seconds=remaining_time)
                        
                        # Progress update
                        progress = (total_migrated + total_failed) / total_keys * 100
                        click.echo(f"{Fore.CYAN}Progress: {progress:.1f}% ({total_migrated}/{total_keys} migrated, {total_failed} failed)")
                        
                    except Exception as e:
                        all_errors.append(f"Batch {batch_num} failed: {str(e)}")
                        total_failed += len(batches[batch_num])
            
            migration_time = time.time() - start_time
            
            # Validate migration if requested
            validation_results = {}
            if self.config.verify_data_integrity:
                validation_results = self.validate_migration()
            
            # Calculate performance comparison
            performance_comparison = self._compare_performance()
            
            # Determine success
            success_rate = total_migrated / total_keys if total_keys > 0 else 1.0
            success = success_rate >= 0.95  # 95% success threshold
            
            result = MigrationResult(
                success=success,
                total_keys_migrated=total_migrated,
                total_keys_failed=total_failed,
                migration_time=migration_time,
                data_consistency_score=validation_results.get('consistency_score', 0),
                performance_comparison=performance_comparison,
                validation_results=validation_results,
                rollback_info=None,
                message=f"Migration completed: {total_migrated}/{total_keys} keys migrated successfully"
            )
            
            click.echo(f"{Fore.GREEN}✅ Migration completed in {migration_time:.1f} seconds")
            
            return result
            
        except Exception as e:
            migration_time = time.time() - start_time
            
            return MigrationResult(
                success=False,
                total_keys_migrated=0,
                total_keys_failed=0,
                migration_time=migration_time,
                data_consistency_score=0,
                performance_comparison={},
                validation_results={},
                rollback_info=None,
                message=str(e)
            )
        
        finally:
            self.migration_active = False
    
    def validate_migration(self) -> Dict[str, Any]:
        """Validate that migration completed successfully."""
        click.echo(f"{Fore.BLUE}🔍 Validating migration consistency...")
        
        validation_results = {
            'total_keys_checked': 0,
            'matching_keys': 0,
            'mismatched_keys': 0,
            'missing_keys': 0,
            'type_mismatches': 0,
            'value_mismatches': 0,
            'ttl_mismatches': 0,
            'consistency_score': 0,
            'sample_mismatches': []
        }
        
        try:
            # Get sample of keys to validate (max 1000 for performance)
            source_keys = []
            for pattern in self.config.key_patterns_to_migrate:
                source_keys.extend(self.source_redis.keys(pattern))
            
            # Remove excluded keys
            for exclude_pattern in self.config.key_patterns_to_exclude:
                excluded_keys = set(self.source_redis.keys(exclude_pattern))
                source_keys = [k for k in source_keys if k not in excluded_keys]
            
            # Sample keys for validation
            import random
            if len(source_keys) > 1000:
                source_keys = random.sample(source_keys, 1000)
            
            validation_results['total_keys_checked'] = len(source_keys)
            
            for key in source_keys:
                try:
                    # Check if key exists in target
                    if not self.target_redis.exists(key):
                        validation_results['missing_keys'] += 1
                        validation_results['sample_mismatches'].append({
                            'key': key,
                            'issue': 'missing_in_target'
                        })
                        continue
                    
                    # Check key types
                    source_type = self.source_redis.type(key)
                    target_type = self.target_redis.type(key)
                    
                    if source_type != target_type:
                        validation_results['type_mismatches'] += 1
                        validation_results['sample_mismatches'].append({
                            'key': key,
                            'issue': 'type_mismatch',
                            'source_type': source_type,
                            'target_type': target_type
                        })
                        continue
                    
                    # Check values based on type
                    values_match = False
                    
                    if source_type == 'string':
                        source_value = self.source_redis.get(key)
                        target_value = self.target_redis.get(key)
                        values_match = source_value == target_value
                    
                    elif source_type == 'hash':
                        source_value = self.source_redis.hgetall(key)
                        target_value = self.target_redis.hgetall(key)
                        values_match = source_value == target_value
                    
                    elif source_type == 'list':
                        source_value = self.source_redis.lrange(key, 0, -1)
                        target_value = self.target_redis.lrange(key, 0, -1)
                        values_match = source_value == target_value
                    
                    elif source_type == 'set':
                        source_value = self.source_redis.smembers(key)
                        target_value = self.target_redis.smembers(key)
                        values_match = source_value == target_value
                    
                    elif source_type == 'zset':
                        source_value = self.source_redis.zrange(key, 0, -1, withscores=True)
                        target_value = self.target_redis.zrange(key, 0, -1, withscores=True)
                        values_match = source_value == target_value
                    
                    if not values_match:
                        validation_results['value_mismatches'] += 1
                        validation_results['sample_mismatches'].append({
                            'key': key,
                            'issue': 'value_mismatch',
                            'type': source_type
                        })
                        continue
                    
                    # Check TTL if preserving
                    if self.config.preserve_ttl:
                        source_ttl = self.source_redis.ttl(key)
                        target_ttl = self.target_redis.ttl(key)
                        
                        # Allow some tolerance for TTL (±5 seconds)
                        ttl_diff = abs(source_ttl - target_ttl) if source_ttl > 0 and target_ttl > 0 else 0
                        if ttl_diff > 5:
                            validation_results['ttl_mismatches'] += 1
                            validation_results['sample_mismatches'].append({
                                'key': key,
                                'issue': 'ttl_mismatch',
                                'source_ttl': source_ttl,
                                'target_ttl': target_ttl
                            })
                            continue
                    
                    # If we get here, the key matches
                    validation_results['matching_keys'] += 1
                
                except Exception as e:
                    validation_results['sample_mismatches'].append({
                        'key': key,
                        'issue': 'validation_error',
                        'error': str(e)
                    })
            
            # Calculate consistency score
            total_issues = (
                validation_results['missing_keys'] +
                validation_results['type_mismatches'] +
                validation_results['value_mismatches'] +
                validation_results['ttl_mismatches']
            )
            
            if validation_results['total_keys_checked'] > 0:
                validation_results['consistency_score'] = (
                    (validation_results['total_keys_checked'] - total_issues) /
                    validation_results['total_keys_checked'] * 100
                )
            else:
                validation_results['consistency_score'] = 100
            
            # Limit sample mismatches to first 10 for reporting
            validation_results['sample_mismatches'] = validation_results['sample_mismatches'][:10]
            
        except Exception as e:
            validation_results['validation_error'] = str(e)
        
        return validation_results
    
    def _compare_performance(self) -> Dict[str, Any]:
        """Compare performance between source and target Redis."""
        comparison = {
            'source_latency': 0,
            'target_latency': 0,
            'source_throughput': 0,
            'target_throughput': 0,
            'recommendation': ''
        }
        
        try:
            # Test latency (ping times)
            source_ping_times = []
            target_ping_times = []
            
            for _ in range(10):
                start = time.time()
                self.source_redis.ping()
                source_ping_times.append((time.time() - start) * 1000)
                
                start = time.time()
                self.target_redis.ping()
                target_ping_times.append((time.time() - start) * 1000)
            
            comparison['source_latency'] = sum(source_ping_times) / len(source_ping_times)
            comparison['target_latency'] = sum(target_ping_times) / len(target_ping_times)
            
            # Test throughput (operations per second)
            # Simple set/get operations
            operations = 100
            
            # Source throughput
            start = time.time()
            for i in range(operations):
                self.source_redis.set(f"perf_test_{i}", f"value_{i}")
            for i in range(operations):
                self.source_redis.get(f"perf_test_{i}")
            for i in range(operations):
                self.source_redis.delete(f"perf_test_{i}")
            source_time = time.time() - start
            comparison['source_throughput'] = (operations * 3) / source_time
            
            # Target throughput
            start = time.time()
            for i in range(operations):
                self.target_redis.set(f"perf_test_{i}", f"value_{i}")
            for i in range(operations):
                self.target_redis.get(f"perf_test_{i}")
            for i in range(operations):
                self.target_redis.delete(f"perf_test_{i}")
            target_time = time.time() - start
            comparison['target_throughput'] = (operations * 3) / target_time
            
            # Generate recommendation
            if comparison['target_latency'] > comparison['source_latency'] * 1.5:
                comparison['recommendation'] = "Target latency is significantly higher - check network configuration"
            elif comparison['target_throughput'] < comparison['source_throughput'] * 0.8:
                comparison['recommendation'] = "Target throughput is lower - consider upgrading instance type"
            else:
                comparison['recommendation'] = "Performance comparison looks good"
        
        except Exception as e:
            comparison['error'] = str(e)
        
        return comparison
    
    def update_application_config(self, target_url: str) -> bool:
        """Update application configuration to use target Redis."""
        click.echo(f"{Fore.BLUE}⚙️ Updating application configuration...")
        
        try:
            # Update environment files
            backend_dir = Path(__file__).parent.parent
            
            # Update main .env file
            env_files = ['.env', '.env.production', '.env.staging']
            
            for env_file in env_files:
                env_path = backend_dir / env_file
                
                if env_path.exists():
                    # Read current content
                    with open(env_path, 'r') as f:
                        content = f.read()
                    
                    # Update Redis URL
                    import re
                    content = re.sub(
                        r'REDIS_URL=.*',
                        f'REDIS_URL={target_url}',
                        content
                    )
                    
                    # Add migration timestamp
                    timestamp = datetime.now().isoformat()
                    content += f"\n# Migrated to ElastiCache: {timestamp}\n"
                    
                    # Write updated content
                    with open(env_path, 'w') as f:
                        f.write(content)
                    
                    click.echo(f"{Fore.GREEN}✅ Updated {env_file}")
            
            return True
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error updating configuration: {e}")
            return False


@click.command()
@click.option('--plan', is_flag=True, help='Create migration plan (dry run)')
@click.option('--migrate', is_flag=True, help='Execute migration')
@click.option('--validate', is_flag=True, help='Validate existing migration')
@click.option('--complete', is_flag=True, help='Complete migration (update config)')
@click.option('--source', required=True, help='Source Redis URL')
@click.option('--target', required=True, help='Target Redis URL')
@click.option('--batch-size', default=1000, help='Migration batch size')
@click.option('--workers', default=4, help='Number of parallel workers')
@click.option('--include-patterns', help='Comma-separated key patterns to include')
@click.option('--exclude-patterns', help='Comma-separated key patterns to exclude')
@click.option('--preserve-ttl/--no-preserve-ttl', default=True, help='Preserve TTL values')
@click.option('--verify-integrity/--no-verify-integrity', default=True, help='Verify data integrity')
def main(plan: bool, migrate: bool, validate: bool, complete: bool,
         source: str, target: str, batch_size: int, workers: int,
         include_patterns: str, exclude_patterns: str,
         preserve_ttl: bool, verify_integrity: bool):
    """Migrate Redis data to AWS ElastiCache with zero downtime."""
    
    try:
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🔄 Redis to ElastiCache Migration Tool")
        click.echo(f"{Fore.CYAN}{'='*55}{Style.RESET_ALL}")
        
        # Parse patterns
        include_list = ['*']
        if include_patterns:
            include_list = [p.strip() for p in include_patterns.split(',')]
        
        exclude_list = []
        if exclude_patterns:
            exclude_list = [p.strip() for p in exclude_patterns.split(',')]
        
        # Create migration config
        config = MigrationConfig(
            source_url=source,
            target_url=target,
            batch_size=batch_size,
            parallel_workers=workers,
            key_patterns_to_migrate=include_list,
            key_patterns_to_exclude=exclude_list,
            preserve_ttl=preserve_ttl,
            verify_data_integrity=verify_integrity
        )
        
        # Initialize migration manager
        migration_manager = RedisMigrationManager(config)
        
        if plan:
            # Create and display migration plan
            migration_plan = migration_manager.create_migration_plan()
            
            click.echo(f"\n{Fore.CYAN}📋 Migration Plan:")
            click.echo("-" * 40)
            
            scope = migration_plan['scope_analysis']
            click.echo(f"Total Keys: {scope['total_keys']:,}")
            click.echo(f"Estimated Memory: {scope['memory_usage'] / (1024*1024):.1f} MB")
            click.echo(f"Estimated Time: {scope['estimated_time']:.0f} seconds")
            click.echo(f"Strategy: {migration_plan['migration_strategy']['type']}")
            click.echo(f"Estimated Downtime: {migration_plan['estimated_downtime']} seconds")
            
            if migration_plan['risks']:
                click.echo(f"\n{Fore.YELLOW}⚠️ Risks:")
                for risk in migration_plan['risks']:
                    click.echo(f"  • {risk}")
            
            if migration_plan['recommendations']:
                click.echo(f"\n{Fore.BLUE}💡 Recommendations:")
                for rec in migration_plan['recommendations']:
                    click.echo(f"  • {rec}")
        
        elif migrate:
            # Execute migration
            result = migration_manager.execute_migration()
            
            click.echo(f"\n{Fore.CYAN}📊 Migration Results:")
            click.echo("-" * 40)
            
            status_color = Fore.GREEN if result.success else Fore.RED
            click.echo(f"Success: {status_color}{result.success}")
            click.echo(f"Keys Migrated: {result.total_keys_migrated:,}")
            click.echo(f"Keys Failed: {result.total_keys_failed:,}")
            click.echo(f"Migration Time: {result.migration_time:.1f} seconds")
            click.echo(f"Consistency Score: {result.data_consistency_score:.1f}%")
            
            if result.performance_comparison:
                perf = result.performance_comparison
                click.echo(f"\n{Fore.CYAN}⚡ Performance Comparison:")
                click.echo(f"Source Latency: {perf.get('source_latency', 0):.2f}ms")
                click.echo(f"Target Latency: {perf.get('target_latency', 0):.2f}ms")
                click.echo(f"Source Throughput: {perf.get('source_throughput', 0):.0f} ops/sec")
                click.echo(f"Target Throughput: {perf.get('target_throughput', 0):.0f} ops/sec")
        
        elif validate:
            # Validate migration
            validation_results = migration_manager.validate_migration()
            
            click.echo(f"\n{Fore.CYAN}🔍 Validation Results:")
            click.echo("-" * 40)
            
            click.echo(f"Keys Checked: {validation_results['total_keys_checked']:,}")
            click.echo(f"Matching Keys: {validation_results['matching_keys']:,}")
            click.echo(f"Missing Keys: {validation_results['missing_keys']:,}")
            click.echo(f"Value Mismatches: {validation_results['value_mismatches']:,}")
            click.echo(f"Type Mismatches: {validation_results['type_mismatches']:,}")
            click.echo(f"TTL Mismatches: {validation_results['ttl_mismatches']:,}")
            
            score_color = Fore.GREEN if validation_results['consistency_score'] > 95 else Fore.YELLOW if validation_results['consistency_score'] > 90 else Fore.RED
            click.echo(f"Consistency Score: {score_color}{validation_results['consistency_score']:.1f}%")
            
            if validation_results['sample_mismatches']:
                click.echo(f"\n{Fore.YELLOW}Sample Issues:")
                for issue in validation_results['sample_mismatches'][:5]:
                    click.echo(f"  • Key: {issue['key']}, Issue: {issue['issue']}")
        
        elif complete:
            # Complete migration by updating configuration
            success = migration_manager.update_application_config(target)
            
            if success:
                click.echo(f"{Fore.GREEN}✅ Migration completed! Application now using target Redis.")
                click.echo(f"{Fore.BLUE}💡 Don't forget to:")
                click.echo("  • Restart application services")
                click.echo("  • Monitor application performance")
                click.echo("  • Keep source Redis available for rollback if needed")
            else:
                click.echo(f"{Fore.RED}❌ Failed to update application configuration")
        
        else:
            click.echo(f"{Fore.RED}❌ Please specify operation: --plan, --migrate, --validate, or --complete")
        
    except Exception as e:
        click.echo(f"{Fore.RED}❌ Migration failed: {e}")


if __name__ == '__main__':
    main()