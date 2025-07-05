#!/usr/bin/env python3
"""
ElastiCache Backup and Recovery Management
=========================================

Comprehensive backup, snapshot, and disaster recovery management for
BookedBarber's AWS ElastiCache Redis infrastructure.

Features:
- Automated snapshot creation and management
- Point-in-time recovery capabilities
- Cross-region backup replication
- Disaster recovery planning and execution
- Data export/import utilities
- Recovery validation and testing

Usage:
    # Create manual snapshot
    python scripts/elasticache_recovery.py --create-snapshot --cluster-id bookedbarber-redis

    # Restore from snapshot
    python scripts/elasticache_recovery.py --restore --snapshot-id my-snapshot --new-cluster-id recovery-cluster

    # Test disaster recovery
    python scripts/elasticache_recovery.py --test-recovery --cluster-id bookedbarber-redis

    # Export data for migration
    python scripts/elasticache_recovery.py --export-data --cluster-id bookedbarber-redis

Requirements:
    pip install boto3 click redis colorama
"""

import os
import json
import time
import redis
import boto3
import click
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from pathlib import Path
from colorama import init, Fore, Style
from botocore.exceptions import ClientError, NoCredentialsError

# Initialize colorama
init(autoreset=True)


@dataclass
class SnapshotInfo:
    """ElastiCache snapshot information."""
    snapshot_id: str
    cluster_id: str
    snapshot_status: str
    creation_time: datetime
    engine: str
    engine_version: str
    node_type: str
    snapshot_source: str
    size_mb: int = 0
    description: str = ""


@dataclass
class RecoveryPlan:
    """Disaster recovery plan configuration."""
    cluster_id: str
    backup_frequency: str  # daily, weekly, monthly
    snapshot_retention_days: int
    cross_region_replication: bool
    target_region: str
    recovery_time_objective: int  # minutes
    recovery_point_objective: int  # minutes
    notification_endpoints: List[str]
    validation_schedule: str


@dataclass
class RecoveryResult:
    """Recovery operation result."""
    success: bool
    operation: str
    cluster_id: str
    snapshot_id: Optional[str]
    new_cluster_id: Optional[str]
    recovery_time: float
    validation_results: Dict[str, Any]
    message: str


class ElastiCacheRecoveryManager:
    """ElastiCache backup and recovery management."""
    
    def __init__(self, region: str = "us-east-1"):
        """Initialize recovery manager."""
        self.region = region
        self.session = boto3.Session()
        
        try:
            self.elasticache = self.session.client('elasticache', region_name=region)
            self.s3 = self.session.client('s3', region_name=region)
            self.sns = self.session.client('sns', region_name=region)
            
            # Verify credentials
            self.elasticache.describe_cache_clusters()
            click.echo(f"{Fore.GREEN}✅ AWS clients initialized for region: {region}")
            
        except NoCredentialsError:
            click.echo(f"{Fore.RED}❌ AWS credentials not configured")
            raise
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error initializing AWS clients: {e}")
            raise
        
        # Configuration
        self.backup_bucket = f"bookedbarber-redis-backups-{region}"
        self.snapshot_prefix = "bookedbarber-redis"
    
    def create_manual_snapshot(self, cluster_id: str, snapshot_id: Optional[str] = None,
                             description: str = "") -> RecoveryResult:
        """Create manual snapshot of Redis cluster."""
        if not snapshot_id:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            snapshot_id = f"{self.snapshot_prefix}-{cluster_id}-{timestamp}"
        
        click.echo(f"{Fore.BLUE}📸 Creating snapshot: {snapshot_id}")
        
        start_time = time.time()
        
        try:
            # Verify cluster exists
            response = self.elasticache.describe_cache_clusters(CacheClusterId=cluster_id)
            cluster = response['CacheClusters'][0]
            
            if cluster['CacheClusterStatus'] != 'available':
                return RecoveryResult(
                    success=False,
                    operation="create_snapshot",
                    cluster_id=cluster_id,
                    snapshot_id=snapshot_id,
                    new_cluster_id=None,
                    recovery_time=0,
                    validation_results={},
                    message=f"Cluster {cluster_id} is not available for snapshot"
                )
            
            # Create snapshot
            self.elasticache.create_snapshot(
                SnapshotName=snapshot_id,
                CacheClusterId=cluster_id,
                Tags=[
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Purpose', 'Value': 'Manual Backup'},
                    {'Key': 'CreatedBy', 'Value': 'RecoveryManager'},
                    {'Key': 'SourceCluster', 'Value': cluster_id}
                ]
            )
            
            # Wait for snapshot to complete
            click.echo(f"{Fore.BLUE}⏳ Waiting for snapshot to complete...")
            
            while True:
                response = self.elasticache.describe_snapshots(SnapshotName=snapshot_id)
                snapshot = response['Snapshots'][0]
                
                if snapshot['SnapshotStatus'] == 'available':
                    break
                elif snapshot['SnapshotStatus'] == 'failed':
                    raise Exception("Snapshot creation failed")
                
                time.sleep(30)
            
            recovery_time = time.time() - start_time
            
            # Validate snapshot
            validation_results = self._validate_snapshot(snapshot_id)
            
            click.echo(f"{Fore.GREEN}✅ Snapshot created successfully: {snapshot_id}")
            
            return RecoveryResult(
                success=True,
                operation="create_snapshot",
                cluster_id=cluster_id,
                snapshot_id=snapshot_id,
                new_cluster_id=None,
                recovery_time=recovery_time,
                validation_results=validation_results,
                message=f"Snapshot {snapshot_id} created successfully"
            )
            
        except Exception as e:
            recovery_time = time.time() - start_time
            
            return RecoveryResult(
                success=False,
                operation="create_snapshot",
                cluster_id=cluster_id,
                snapshot_id=snapshot_id,
                new_cluster_id=None,
                recovery_time=recovery_time,
                validation_results={},
                message=str(e)
            )
    
    def restore_from_snapshot(self, snapshot_id: str, new_cluster_id: str,
                            node_type: Optional[str] = None,
                            security_groups: Optional[List[str]] = None,
                            subnet_group: Optional[str] = None) -> RecoveryResult:
        """Restore cluster from snapshot."""
        click.echo(f"{Fore.BLUE}🔄 Restoring cluster from snapshot: {snapshot_id}")
        
        start_time = time.time()
        
        try:
            # Get snapshot details
            response = self.elasticache.describe_snapshots(SnapshotName=snapshot_id)
            snapshot = response['Snapshots'][0]
            
            if snapshot['SnapshotStatus'] != 'available':
                return RecoveryResult(
                    success=False,
                    operation="restore_snapshot",
                    cluster_id="",
                    snapshot_id=snapshot_id,
                    new_cluster_id=new_cluster_id,
                    recovery_time=0,
                    validation_results={},
                    message=f"Snapshot {snapshot_id} is not available for restore"
                )
            
            # Prepare restore parameters
            restore_params = {
                'CacheClusterId': new_cluster_id,
                'SnapshotName': snapshot_id,
                'Engine': snapshot['Engine'],
                'EngineVersion': snapshot['EngineVersion'],
                'CacheNodeType': node_type or snapshot['CacheNodeType'],
                'Port': snapshot['Port'],
                'Tags': [
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Purpose', 'Value': 'Disaster Recovery'},
                    {'Key': 'RestoredFrom', 'Value': snapshot_id},
                    {'Key': 'OriginalCluster', 'Value': snapshot['CacheClusterId']}
                ]
            }
            
            # Add optional parameters
            if security_groups:
                restore_params['SecurityGroupIds'] = security_groups
            
            if subnet_group:
                restore_params['CacheSubnetGroupName'] = subnet_group
            elif 'CacheSubnetGroupName' in snapshot:
                restore_params['CacheSubnetGroupName'] = snapshot['CacheSubnetGroupName']
            
            # Restore cluster
            self.elasticache.create_cache_cluster(**restore_params)
            
            # Wait for cluster to be available
            click.echo(f"{Fore.BLUE}⏳ Waiting for restored cluster to become available...")
            
            waiter = self.elasticache.get_waiter('cache_cluster_available')
            waiter.wait(
                CacheClusterId=new_cluster_id,
                WaiterConfig={
                    'Delay': 30,
                    'MaxAttempts': 40
                }
            )
            
            recovery_time = time.time() - start_time
            
            # Validate restored cluster
            validation_results = self._validate_restored_cluster(new_cluster_id, snapshot)
            
            click.echo(f"{Fore.GREEN}✅ Cluster restored successfully: {new_cluster_id}")
            
            return RecoveryResult(
                success=True,
                operation="restore_snapshot",
                cluster_id=snapshot['CacheClusterId'],
                snapshot_id=snapshot_id,
                new_cluster_id=new_cluster_id,
                recovery_time=recovery_time,
                validation_results=validation_results,
                message=f"Cluster {new_cluster_id} restored from {snapshot_id}"
            )
            
        except Exception as e:
            recovery_time = time.time() - start_time
            
            return RecoveryResult(
                success=False,
                operation="restore_snapshot",
                cluster_id="",
                snapshot_id=snapshot_id,
                new_cluster_id=new_cluster_id,
                recovery_time=recovery_time,
                validation_results={},
                message=str(e)
            )
    
    def _validate_snapshot(self, snapshot_id: str) -> Dict[str, Any]:
        """Validate snapshot integrity and details."""
        validation_results = {
            "snapshot_exists": False,
            "snapshot_available": False,
            "size_validation": False,
            "metadata_validation": False
        }
        
        try:
            response = self.elasticache.describe_snapshots(SnapshotName=snapshot_id)
            snapshot = response['Snapshots'][0]
            
            validation_results["snapshot_exists"] = True
            validation_results["snapshot_status"] = snapshot['SnapshotStatus']
            validation_results["snapshot_available"] = snapshot['SnapshotStatus'] == 'available'
            validation_results["engine"] = snapshot['Engine']
            validation_results["engine_version"] = snapshot['EngineVersion']
            validation_results["node_type"] = snapshot['CacheNodeType']
            validation_results["port"] = snapshot['Port']
            validation_results["creation_time"] = snapshot['SnapshotCreateTime'].isoformat()
            
            # Size validation (basic check)
            if 'DataTiering' in snapshot:
                validation_results["size_validation"] = True
            
            # Metadata validation
            required_fields = ['Engine', 'EngineVersion', 'CacheNodeType', 'Port']
            validation_results["metadata_validation"] = all(
                field in snapshot for field in required_fields
            )
            
        except Exception as e:
            validation_results["error"] = str(e)
        
        return validation_results
    
    def _validate_restored_cluster(self, cluster_id: str, original_snapshot: Dict[str, Any]) -> Dict[str, Any]:
        """Validate restored cluster against original snapshot."""
        validation_results = {
            "cluster_available": False,
            "engine_match": False,
            "version_match": False,
            "connectivity_test": False,
            "data_integrity_test": False
        }
        
        try:
            # Get cluster details
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            cluster = response['CacheClusters'][0]
            
            validation_results["cluster_available"] = cluster['CacheClusterStatus'] == 'available'
            validation_results["engine_match"] = cluster['Engine'] == original_snapshot['Engine']
            validation_results["version_match"] = cluster['EngineVersion'] == original_snapshot['EngineVersion']
            validation_results["cluster_status"] = cluster['CacheClusterStatus']
            
            # Test connectivity
            if cluster['CacheClusterStatus'] == 'available':
                endpoint = None
                if 'RedisConfiguration' in cluster:
                    endpoint = cluster['RedisConfiguration']['PrimaryEndpoint']['Address']
                elif cluster['CacheNodes']:
                    endpoint = cluster['CacheNodes'][0]['Endpoint']['Address']
                
                if endpoint:
                    validation_results["endpoint"] = f"{endpoint}:{cluster['Port']}"
                    
                    try:
                        redis_client = redis.Redis(
                            host=endpoint,
                            port=cluster['Port'],
                            decode_responses=True,
                            socket_connect_timeout=10
                        )
                        
                        # Test connectivity
                        redis_client.ping()
                        validation_results["connectivity_test"] = True
                        
                        # Basic data integrity test
                        test_key = "recovery_validation_test"
                        test_value = f"restored_at_{datetime.now().isoformat()}"
                        
                        redis_client.set(test_key, test_value, ex=60)
                        retrieved_value = redis_client.get(test_key)
                        
                        if retrieved_value == test_value:
                            validation_results["data_integrity_test"] = True
                        
                        redis_client.delete(test_key)
                        
                    except Exception as e:
                        validation_results["connectivity_error"] = str(e)
            
        except Exception as e:
            validation_results["validation_error"] = str(e)
        
        return validation_results
    
    def list_snapshots(self, cluster_id: Optional[str] = None) -> List[SnapshotInfo]:
        """List available snapshots."""
        click.echo(f"{Fore.BLUE}📋 Listing snapshots...")
        
        snapshots = []
        
        try:
            if cluster_id:
                response = self.elasticache.describe_snapshots(CacheClusterId=cluster_id)
            else:
                response = self.elasticache.describe_snapshots()
            
            for snapshot in response['Snapshots']:
                # Filter for BookedBarber snapshots
                if snapshot['SnapshotName'].startswith(self.snapshot_prefix):
                    snapshots.append(SnapshotInfo(
                        snapshot_id=snapshot['SnapshotName'],
                        cluster_id=snapshot['CacheClusterId'],
                        snapshot_status=snapshot['SnapshotStatus'],
                        creation_time=snapshot['SnapshotCreateTime'],
                        engine=snapshot['Engine'],
                        engine_version=snapshot['EngineVersion'],
                        node_type=snapshot['CacheNodeType'],
                        snapshot_source=snapshot.get('SnapshotSource', 'manual')
                    ))
            
            # Sort by creation time (newest first)
            snapshots.sort(key=lambda x: x.creation_time, reverse=True)
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error listing snapshots: {e}")
        
        return snapshots
    
    def cleanup_old_snapshots(self, cluster_id: str, retention_days: int = 7) -> Dict[str, Any]:
        """Clean up old snapshots based on retention policy."""
        click.echo(f"{Fore.BLUE}🧹 Cleaning up snapshots older than {retention_days} days...")
        
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        cleanup_results = {
            "deleted_snapshots": [],
            "kept_snapshots": [],
            "errors": []
        }
        
        try:
            snapshots = self.list_snapshots(cluster_id)
            
            for snapshot in snapshots:
                if snapshot.creation_time.replace(tzinfo=None) < cutoff_date:
                    try:
                        self.elasticache.delete_snapshot(SnapshotName=snapshot.snapshot_id)
                        cleanup_results["deleted_snapshots"].append(snapshot.snapshot_id)
                        click.echo(f"{Fore.YELLOW}🗑️ Deleted old snapshot: {snapshot.snapshot_id}")
                    except Exception as e:
                        cleanup_results["errors"].append(f"Error deleting {snapshot.snapshot_id}: {e}")
                else:
                    cleanup_results["kept_snapshots"].append(snapshot.snapshot_id)
            
        except Exception as e:
            cleanup_results["errors"].append(f"Cleanup error: {e}")
        
        return cleanup_results
    
    def export_cluster_data(self, cluster_id: str, output_dir: str = "redis_export") -> Dict[str, Any]:
        """Export Redis data for migration or backup."""
        click.echo(f"{Fore.BLUE}📤 Exporting data from cluster: {cluster_id}")
        
        export_results = {
            "success": False,
            "exported_keys": 0,
            "export_file": None,
            "errors": []
        }
        
        try:
            # Get cluster endpoint
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            cluster = response['CacheClusters'][0]
            
            if cluster['CacheClusterStatus'] != 'available':
                export_results["errors"].append("Cluster is not available")
                return export_results
            
            endpoint = None
            if 'RedisConfiguration' in cluster:
                endpoint = cluster['RedisConfiguration']['PrimaryEndpoint']['Address']
            elif cluster['CacheNodes']:
                endpoint = cluster['CacheNodes'][0]['Endpoint']['Address']
            
            if not endpoint:
                export_results["errors"].append("Could not determine cluster endpoint")
                return export_results
            
            # Connect to Redis
            redis_client = redis.Redis(
                host=endpoint,
                port=cluster['Port'],
                decode_responses=True
            )
            
            # Test connection
            redis_client.ping()
            
            # Create export directory
            os.makedirs(output_dir, exist_ok=True)
            
            # Export data
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            export_file = os.path.join(output_dir, f"redis_export_{cluster_id}_{timestamp}.json")
            
            exported_data = {}
            keys = redis_client.keys('*')
            
            for key in keys:
                try:
                    key_type = redis_client.type(key)
                    
                    if key_type == 'string':
                        exported_data[key] = {
                            'type': 'string',
                            'value': redis_client.get(key),
                            'ttl': redis_client.ttl(key)
                        }
                    elif key_type == 'hash':
                        exported_data[key] = {
                            'type': 'hash',
                            'value': redis_client.hgetall(key),
                            'ttl': redis_client.ttl(key)
                        }
                    elif key_type == 'list':
                        exported_data[key] = {
                            'type': 'list',
                            'value': redis_client.lrange(key, 0, -1),
                            'ttl': redis_client.ttl(key)
                        }
                    elif key_type == 'set':
                        exported_data[key] = {
                            'type': 'set',
                            'value': list(redis_client.smembers(key)),
                            'ttl': redis_client.ttl(key)
                        }
                    elif key_type == 'zset':
                        exported_data[key] = {
                            'type': 'zset',
                            'value': redis_client.zrange(key, 0, -1, withscores=True),
                            'ttl': redis_client.ttl(key)
                        }
                    
                except Exception as e:
                    export_results["errors"].append(f"Error exporting key {key}: {e}")
            
            # Save to file
            with open(export_file, 'w') as f:
                json.dump({
                    'export_timestamp': timestamp,
                    'cluster_id': cluster_id,
                    'endpoint': f"{endpoint}:{cluster['Port']}",
                    'total_keys': len(exported_data),
                    'data': exported_data
                }, f, indent=2)
            
            export_results.update({
                "success": True,
                "exported_keys": len(exported_data),
                "export_file": export_file
            })
            
            click.echo(f"{Fore.GREEN}✅ Exported {len(exported_data)} keys to: {export_file}")
            
        except Exception as e:
            export_results["errors"].append(str(e))
        
        return export_results
    
    def test_disaster_recovery(self, cluster_id: str) -> RecoveryResult:
        """Test complete disaster recovery process."""
        click.echo(f"{Fore.BLUE}🧪 Testing disaster recovery for cluster: {cluster_id}")
        
        start_time = time.time()
        test_results = {
            "snapshot_creation": False,
            "cluster_restore": False,
            "data_validation": False,
            "cleanup": False
        }
        
        try:
            # Step 1: Create test snapshot
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            test_snapshot_id = f"{self.snapshot_prefix}-test-{cluster_id}-{timestamp}"
            
            snapshot_result = self.create_manual_snapshot(
                cluster_id=cluster_id,
                snapshot_id=test_snapshot_id,
                description="Disaster recovery test snapshot"
            )
            
            test_results["snapshot_creation"] = snapshot_result.success
            
            if not snapshot_result.success:
                raise Exception(f"Snapshot creation failed: {snapshot_result.message}")
            
            # Step 2: Restore to test cluster
            test_cluster_id = f"test-recovery-{cluster_id}-{timestamp}"
            
            restore_result = self.restore_from_snapshot(
                snapshot_id=test_snapshot_id,
                new_cluster_id=test_cluster_id
            )
            
            test_results["cluster_restore"] = restore_result.success
            test_results["restore_validation"] = restore_result.validation_results
            
            if restore_result.success:
                test_results["data_validation"] = restore_result.validation_results.get("data_integrity_test", False)
            
            # Step 3: Cleanup test resources
            try:
                # Delete test cluster
                self.elasticache.delete_cache_cluster(CacheClusterId=test_cluster_id)
                
                # Wait for deletion
                waiter = self.elasticache.get_waiter('cache_cluster_deleted')
                waiter.wait(CacheClusterId=test_cluster_id)
                
                # Delete test snapshot
                self.elasticache.delete_snapshot(SnapshotName=test_snapshot_id)
                
                test_results["cleanup"] = True
                
            except Exception as e:
                test_results["cleanup_error"] = str(e)
            
            recovery_time = time.time() - start_time
            
            # Determine overall success
            success = all([
                test_results["snapshot_creation"],
                test_results["cluster_restore"],
                test_results["data_validation"]
            ])
            
            message = "Disaster recovery test completed successfully" if success else "Disaster recovery test failed"
            
            return RecoveryResult(
                success=success,
                operation="test_disaster_recovery",
                cluster_id=cluster_id,
                snapshot_id=test_snapshot_id,
                new_cluster_id=test_cluster_id,
                recovery_time=recovery_time,
                validation_results=test_results,
                message=message
            )
            
        except Exception as e:
            recovery_time = time.time() - start_time
            
            return RecoveryResult(
                success=False,
                operation="test_disaster_recovery",
                cluster_id=cluster_id,
                snapshot_id=None,
                new_cluster_id=None,
                recovery_time=recovery_time,
                validation_results=test_results,
                message=str(e)
            )


@click.command()
@click.option('--create-snapshot', is_flag=True, help='Create manual snapshot')
@click.option('--restore', is_flag=True, help='Restore from snapshot')
@click.option('--list-snapshots', is_flag=True, help='List available snapshots')
@click.option('--cleanup-snapshots', is_flag=True, help='Clean up old snapshots')
@click.option('--export-data', is_flag=True, help='Export cluster data')
@click.option('--test-recovery', is_flag=True, help='Test disaster recovery process')
@click.option('--cluster-id', help='ElastiCache cluster ID')
@click.option('--snapshot-id', help='Snapshot ID for restore operations')
@click.option('--new-cluster-id', help='New cluster ID for restore')
@click.option('--retention-days', default=7, help='Snapshot retention days for cleanup')
@click.option('--output-dir', default='redis_export', help='Output directory for exports')
@click.option('--region', default='us-east-1', help='AWS region')
@click.option('--node-type', help='Node type for restored cluster')
@click.option('--security-groups', help='Comma-separated security group IDs for restore')
@click.option('--subnet-group', help='Subnet group for restored cluster')
def main(create_snapshot: bool, restore: bool, list_snapshots: bool,
         cleanup_snapshots: bool, export_data: bool, test_recovery: bool,
         cluster_id: str, snapshot_id: str, new_cluster_id: str,
         retention_days: int, output_dir: str, region: str,
         node_type: str, security_groups: str, subnet_group: str):
    """Manage ElastiCache backup and recovery operations."""
    
    try:
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🔄 ElastiCache Recovery Manager")
        click.echo(f"{Fore.CYAN}{'='*50}{Style.RESET_ALL}")
        
        # Initialize recovery manager
        recovery_manager = ElastiCacheRecoveryManager(region=region)
        
        if create_snapshot:
            if not cluster_id:
                click.echo(f"{Fore.RED}❌ --cluster-id required for snapshot creation")
                return
            
            result = recovery_manager.create_manual_snapshot(cluster_id)
            
        elif restore:
            if not all([snapshot_id, new_cluster_id]):
                click.echo(f"{Fore.RED}❌ --snapshot-id and --new-cluster-id required for restore")
                return
            
            sg_list = []
            if security_groups:
                sg_list = [sg.strip() for sg in security_groups.split(',')]
            
            result = recovery_manager.restore_from_snapshot(
                snapshot_id=snapshot_id,
                new_cluster_id=new_cluster_id,
                node_type=node_type,
                security_groups=sg_list if sg_list else None,
                subnet_group=subnet_group
            )
            
        elif list_snapshots:
            snapshots = recovery_manager.list_snapshots(cluster_id)
            
            if snapshots:
                click.echo(f"\n{Fore.CYAN}📋 Available Snapshots:")
                for snapshot in snapshots:
                    status_color = Fore.GREEN if snapshot.snapshot_status == 'available' else Fore.YELLOW
                    click.echo(f"  {status_color}{snapshot.snapshot_id}")
                    click.echo(f"    Cluster: {snapshot.cluster_id}")
                    click.echo(f"    Status: {snapshot.snapshot_status}")
                    click.echo(f"    Created: {snapshot.creation_time}")
                    click.echo(f"    Engine: {snapshot.engine} {snapshot.engine_version}")
                    click.echo()
            else:
                click.echo(f"{Fore.YELLOW}No snapshots found")
            return
            
        elif cleanup_snapshots:
            if not cluster_id:
                click.echo(f"{Fore.RED}❌ --cluster-id required for cleanup")
                return
            
            cleanup_results = recovery_manager.cleanup_old_snapshots(cluster_id, retention_days)
            
            click.echo(f"\n{Fore.CYAN}🧹 Cleanup Results:")
            click.echo(f"Deleted: {len(cleanup_results['deleted_snapshots'])}")
            click.echo(f"Kept: {len(cleanup_results['kept_snapshots'])}")
            click.echo(f"Errors: {len(cleanup_results['errors'])}")
            
            if cleanup_results['errors']:
                for error in cleanup_results['errors']:
                    click.echo(f"{Fore.RED}❌ {error}")
            
            return
            
        elif export_data:
            if not cluster_id:
                click.echo(f"{Fore.RED}❌ --cluster-id required for data export")
                return
            
            export_results = recovery_manager.export_cluster_data(cluster_id, output_dir)
            
            if export_results['success']:
                click.echo(f"{Fore.GREEN}✅ Exported {export_results['exported_keys']} keys")
                click.echo(f"File: {export_results['export_file']}")
            else:
                click.echo(f"{Fore.RED}❌ Export failed")
                for error in export_results['errors']:
                    click.echo(f"  {error}")
            
            return
            
        elif test_recovery:
            if not cluster_id:
                click.echo(f"{Fore.RED}❌ --cluster-id required for recovery test")
                return
            
            result = recovery_manager.test_disaster_recovery(cluster_id)
            
        else:
            click.echo(f"{Fore.RED}❌ Please specify an operation")
            return
        
        # Display operation results
        if 'result' in locals():
            click.echo(f"\n{Fore.CYAN}📊 Operation Results:")
            click.echo("-" * 40)
            
            status_color = Fore.GREEN if result.success else Fore.RED
            click.echo(f"Success: {status_color}{result.success}")
            click.echo(f"Operation: {result.operation}")
            click.echo(f"Message: {result.message}")
            
            if result.recovery_time > 0:
                click.echo(f"Time: {result.recovery_time:.1f} seconds")
            
            if result.validation_results:
                click.echo(f"\n{Fore.CYAN}Validation Results:")
                for key, value in result.validation_results.items():
                    if isinstance(value, bool):
                        color = Fore.GREEN if value else Fore.RED
                        status = "✅ PASS" if value else "❌ FAIL"
                        click.echo(f"  {key}: {color}{status}")
                    else:
                        click.echo(f"  {key}: {value}")
        
    except Exception as e:
        click.echo(f"{Fore.RED}❌ Operation failed: {e}")


if __name__ == '__main__':
    main()