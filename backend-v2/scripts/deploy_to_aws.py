#!/usr/bin/env python3
"""
AWS ElastiCache Deployment Orchestration Script
==============================================

One-command deployment and management for BookedBarber's Redis infrastructure on AWS.
Handles the complete deployment lifecycle from cluster creation to health verification.

Features:
- Complete AWS ElastiCache cluster deployment
- Security group configuration and validation
- Environment configuration management
- Health checks and verification
- Rollback capabilities
- Cost estimation and monitoring setup
- Integration with existing BookedBarber infrastructure

Usage:
    # Deploy new cluster
    python scripts/deploy_to_aws.py --deploy --cluster-id bookedbarber-redis

    # Update existing cluster
    python scripts/deploy_to_aws.py --update --cluster-id bookedbarber-redis

    # Health check and validation
    python scripts/deploy_to_aws.py --validate --cluster-id bookedbarber-redis

    # Rollback deployment
    python scripts/deploy_to_aws.py --rollback --cluster-id bookedbarber-redis

Requirements:
    pip install boto3 click colorama tabulate
    AWS credentials configured (aws configure or IAM role)
"""

import sys
import json
import time
import boto3
import click
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from pathlib import Path
from colorama import init, Fore, Style
from botocore.exceptions import ClientError, NoCredentialsError

# Initialize colorama
init(autoreset=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class DeploymentConfig:
    """AWS deployment configuration."""
    cluster_id: str
    node_type: str = "cache.t3.micro"
    engine_version: str = "7.0"
    parameter_group: str = "default.redis7"
    subnet_group: str = "bookedbarber-redis-subnet"
    security_groups: List[str] = None
    vpc_id: str = None
    region: str = "us-east-1"
    az_mode: str = "single-az"  # single-az or cross-az
    port: int = 6379
    maintenance_window: str = "sun:05:00-sun:06:00"
    snapshot_retention: int = 5
    snapshot_window: str = "03:00-05:00"
    auth_token_enabled: bool = True
    encryption_at_rest: bool = True
    encryption_in_transit: bool = True
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if self.security_groups is None:
            self.security_groups = []
        if self.tags is None:
            self.tags = {
                "Project": "BookedBarber",
                "Environment": "production",
                "Component": "redis-cache"
            }


@dataclass
class DeploymentResult:
    """Deployment operation result."""
    success: bool
    cluster_id: str
    endpoint: Optional[str]
    port: int
    status: str
    message: str
    cost_estimate: float
    deployment_time: float
    validation_results: Dict[str, Any]
    rollback_info: Optional[Dict[str, Any]] = None


class AWSElastiCacheDeployer:
    """AWS ElastiCache deployment orchestrator."""
    
    def __init__(self, region: str = "us-east-1"):
        """Initialize AWS ElastiCache deployer."""
        self.region = region
        self.session = boto3.Session()
        
        # Initialize AWS clients
        try:
            self.elasticache = self.session.client('elasticache', region_name=region)
            self.ec2 = self.session.client('ec2', region_name=region)
            self.cloudwatch = self.session.client('cloudwatch', region_name=region)
            self.sts = self.session.client('sts', region_name=region)
            
            # Verify credentials
            self.account_id = self.sts.get_caller_identity()['Account']
            click.echo(f"{Fore.GREEN}✅ AWS credentials verified for account: {self.account_id}")
            
        except NoCredentialsError:
            click.echo(f"{Fore.RED}❌ AWS credentials not configured")
            raise
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error initializing AWS clients: {e}")
            raise
        
        # Cost estimates (USD per hour)
        self.cost_estimates = {
            "cache.t3.micro": 0.017,
            "cache.t3.small": 0.034,
            "cache.t3.medium": 0.068,
            "cache.t4g.micro": 0.016,
            "cache.t4g.small": 0.032,
            "cache.t4g.medium": 0.064,
            "cache.r6g.large": 0.126,
            "cache.r6g.xlarge": 0.252
        }
    
    def validate_deployment_prerequisites(self, config: DeploymentConfig) -> Tuple[bool, List[str]]:
        """Validate prerequisites for deployment."""
        click.echo(f"{Fore.BLUE}🔍 Validating deployment prerequisites...")
        
        issues = []
        
        try:
            # Check if cluster already exists
            try:
                response = self.elasticache.describe_cache_clusters(
                    CacheClusterId=config.cluster_id
                )
                if response['CacheClusters']:
                    issues.append(f"Cluster {config.cluster_id} already exists")
            except ClientError as e:
                if e.response['Error']['Code'] != 'CacheClusterNotFound':
                    issues.append(f"Error checking cluster existence: {e}")
            
            # Validate VPC and subnets
            if config.vpc_id:
                try:
                    self.ec2.describe_vpcs(VpcIds=[config.vpc_id])
                except ClientError:
                    issues.append(f"VPC {config.vpc_id} not found")
            
            # Check subnet group
            try:
                self.elasticache.describe_cache_subnet_groups(
                    CacheSubnetGroupName=config.subnet_group
                )
            except ClientError:
                issues.append(f"Subnet group {config.subnet_group} not found")
            
            # Validate security groups
            if config.security_groups:
                try:
                    response = self.ec2.describe_security_groups(
                        GroupIds=config.security_groups
                    )
                    if len(response['SecurityGroups']) != len(config.security_groups):
                        issues.append("One or more security groups not found")
                except ClientError:
                    issues.append("Error validating security groups")
            
            # Check region availability
            try:
                self.elasticache.describe_cache_clusters()
            except ClientError as e:
                issues.append(f"ElastiCache not available in region {self.region}: {e}")
            
            # Validate instance type
            if config.node_type not in self.cost_estimates:
                issues.append(f"Node type {config.node_type} not in cost estimates - may not be available")
            
        except Exception as e:
            issues.append(f"Validation error: {e}")
        
        return len(issues) == 0, issues
    
    def create_security_group(self, config: DeploymentConfig) -> str:
        """Create dedicated security group for Redis cluster."""
        click.echo(f"{Fore.BLUE}🔒 Creating security group for Redis cluster...")
        
        try:
            # Get VPC ID if not provided
            vpc_id = config.vpc_id
            if not vpc_id:
                response = self.ec2.describe_vpcs(
                    Filters=[{'Name': 'is-default', 'Values': ['true']}]
                )
                if response['Vpcs']:
                    vpc_id = response['Vpcs'][0]['VpcId']
                else:
                    raise Exception("No default VPC found and no VPC ID provided")
            
            # Create security group
            sg_name = f"{config.cluster_id}-redis-sg"
            response = self.ec2.create_security_group(
                GroupName=sg_name,
                Description=f"Security group for {config.cluster_id} Redis cluster",
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': [
                            {'Key': 'Name', 'Value': sg_name},
                            {'Key': 'Project', 'Value': 'BookedBarber'},
                            {'Key': 'Component', 'Value': 'redis-cache'}
                        ]
                    }
                ]
            )
            
            sg_id = response['GroupId']
            
            # Add inbound rule for Redis port
            self.ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': config.port,
                        'ToPort': config.port,
                        'IpRanges': [
                            {
                                'CidrIp': '10.0.0.0/8',
                                'Description': 'Private network access to Redis'
                            }
                        ]
                    }
                ]
            )
            
            click.echo(f"{Fore.GREEN}✅ Created security group: {sg_id}")
            return sg_id
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating security group: {e}")
            raise
    
    def create_subnet_group(self, config: DeploymentConfig) -> None:
        """Create subnet group if it doesn't exist."""
        click.echo(f"{Fore.BLUE}📡 Checking subnet group: {config.subnet_group}")
        
        try:
            # Check if subnet group exists
            self.elasticache.describe_cache_subnet_groups(
                CacheSubnetGroupName=config.subnet_group
            )
            click.echo(f"{Fore.GREEN}✅ Subnet group {config.subnet_group} already exists")
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'CacheSubnetGroupNotFoundFault':
                # Create subnet group
                click.echo(f"{Fore.BLUE}📡 Creating subnet group: {config.subnet_group}")
                
                # Get default VPC subnets
                vpc_id = config.vpc_id
                if not vpc_id:
                    response = self.ec2.describe_vpcs(
                        Filters=[{'Name': 'is-default', 'Values': ['true']}]
                    )
                    if response['Vpcs']:
                        vpc_id = response['Vpcs'][0]['VpcId']
                
                # Get subnets in different AZs
                response = self.ec2.describe_subnets(
                    Filters=[
                        {'Name': 'vpc-id', 'Values': [vpc_id]},
                        {'Name': 'state', 'Values': ['available']}
                    ]
                )
                
                if len(response['Subnets']) < 1:
                    raise Exception("Need at least 1 subnet for subnet group")
                
                subnet_ids = [subnet['SubnetId'] for subnet in response['Subnets'][:3]]
                
                self.elasticache.create_cache_subnet_group(
                    CacheSubnetGroupName=config.subnet_group,
                    CacheSubnetGroupDescription=f"Subnet group for {config.cluster_id}",
                    SubnetIds=subnet_ids,
                    Tags=[
                        {'Key': 'Project', 'Value': 'BookedBarber'},
                        {'Key': 'Component', 'Value': 'redis-cache'}
                    ]
                )
                
                click.echo(f"{Fore.GREEN}✅ Created subnet group with {len(subnet_ids)} subnets")
            else:
                raise
    
    def deploy_elasticache_cluster(self, config: DeploymentConfig) -> DeploymentResult:
        """Deploy ElastiCache Redis cluster."""
        start_time = time.time()
        
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🚀 Deploying ElastiCache cluster: {config.cluster_id}")
        click.echo(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        
        try:
            # Validate prerequisites
            valid, issues = self.validate_deployment_prerequisites(config)
            if not valid:
                return DeploymentResult(
                    success=False,
                    cluster_id=config.cluster_id,
                    endpoint=None,
                    port=config.port,
                    status="validation_failed",
                    message=f"Validation failed: {'; '.join(issues)}",
                    cost_estimate=0,
                    deployment_time=0,
                    validation_results={"issues": issues}
                )
            
            # Create security group if needed
            if not config.security_groups:
                sg_id = self.create_security_group(config)
                config.security_groups = [sg_id]
            
            # Create subnet group if needed
            self.create_subnet_group(config)
            
            # Generate auth token if enabled
            auth_token = None
            if config.auth_token_enabled:
                import secrets
                auth_token = secrets.token_urlsafe(32)[:128]  # Max 128 chars
            
            # Prepare cluster parameters
            cluster_params = {
                'CacheClusterId': config.cluster_id,
                'Engine': 'redis',
                'EngineVersion': config.engine_version,
                'CacheNodeType': config.node_type,
                'SecurityGroupIds': config.security_groups,
                'CacheSubnetGroupName': config.subnet_group,
                'Port': config.port,
                'CacheParameterGroupName': config.parameter_group,
                'PreferredMaintenanceWindow': config.maintenance_window,
                'SnapshotRetentionLimit': config.snapshot_retention,
                'SnapshotWindow': config.snapshot_window,
                'Tags': [
                    {'Key': k, 'Value': v} for k, v in config.tags.items()
                ]
            }
            
            # Add auth token if enabled
            if auth_token:
                cluster_params['AuthToken'] = auth_token
            
            # Add encryption settings
            if config.encryption_at_rest:
                cluster_params['AtRestEncryptionEnabled'] = True
            
            if config.encryption_in_transit:
                cluster_params['TransitEncryptionEnabled'] = True
            
            # Create cluster
            click.echo(f"{Fore.BLUE}🏗️ Creating Redis cluster...")
            response = self.elasticache.create_cache_cluster(**cluster_params)
            
            cluster_id = response['CacheCluster']['CacheClusterId']
            
            # Wait for cluster to be available
            click.echo(f"{Fore.BLUE}⏳ Waiting for cluster to become available...")
            
            waiter = self.elasticache.get_waiter('cache_cluster_available')
            waiter.wait(
                CacheClusterId=cluster_id,
                WaiterConfig={
                    'Delay': 30,
                    'MaxAttempts': 40  # Wait up to 20 minutes
                }
            )
            
            # Get cluster details
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            
            cluster = response['CacheClusters'][0]
            endpoint = cluster['RedisConfiguration']['PrimaryEndpoint']['Address'] if 'RedisConfiguration' in cluster else cluster['CacheNodes'][0]['Endpoint']['Address']
            
            # Calculate cost estimate
            cost_per_hour = self.cost_estimates.get(config.node_type, 0.05)
            monthly_cost = cost_per_hour * 24 * 30
            
            # Save configuration
            self._save_deployment_config(config, endpoint, auth_token)
            
            # Run validation tests
            validation_results = self._validate_deployment(endpoint, config.port, auth_token)
            
            deployment_time = time.time() - start_time
            
            result = DeploymentResult(
                success=True,
                cluster_id=cluster_id,
                endpoint=endpoint,
                port=config.port,
                status=cluster['CacheClusterStatus'],
                message=f"Successfully deployed cluster {cluster_id}",
                cost_estimate=monthly_cost,
                deployment_time=deployment_time,
                validation_results=validation_results
            )
            
            click.echo(f"{Fore.GREEN}🎉 Deployment completed successfully!")
            click.echo(f"{Fore.GREEN}✅ Cluster ID: {cluster_id}")
            click.echo(f"{Fore.GREEN}✅ Endpoint: {endpoint}:{config.port}")
            click.echo(f"{Fore.GREEN}✅ Estimated monthly cost: ${monthly_cost:.2f}")
            
            return result
            
        except Exception as e:
            deployment_time = time.time() - start_time
            
            click.echo(f"{Fore.RED}❌ Deployment failed: {e}")
            
            return DeploymentResult(
                success=False,
                cluster_id=config.cluster_id,
                endpoint=None,
                port=config.port,
                status="failed",
                message=str(e),
                cost_estimate=0,
                deployment_time=deployment_time,
                validation_results={}
            )
    
    def _save_deployment_config(self, config: DeploymentConfig, endpoint: str, auth_token: Optional[str]) -> None:
        """Save deployment configuration for BookedBarber integration."""
        try:
            # Create AWS-specific environment configuration
            aws_env_content = f"""# AWS ElastiCache Configuration - Generated {datetime.now().isoformat()}
# DO NOT COMMIT THIS FILE - Contains sensitive information

# Redis Configuration
REDIS_URL=redis://{endpoint}:{config.port}
REDIS_HOST={endpoint}
REDIS_PORT={config.port}
REDIS_PASSWORD={auth_token or ''}

# AWS ElastiCache Specific
AWS_ELASTICACHE_ENABLED=true
AWS_ELASTICACHE_CLUSTER_ID={config.cluster_id}
AWS_ELASTICACHE_PRIMARY_ENDPOINT={endpoint}
AWS_ELASTICACHE_PORT={config.port}
AWS_ELASTICACHE_AUTH_TOKEN_ENABLED={str(config.auth_token_enabled).lower()}
AWS_ELASTICACHE_ENCRYPTION_AT_REST={str(config.encryption_at_rest).lower()}
AWS_ELASTICACHE_ENCRYPTION_IN_TRANSIT={str(config.encryption_in_transit).lower()}

# CloudWatch Monitoring
CLOUDWATCH_ENABLED=true
CLOUDWATCH_NAMESPACE=BookedBarber/Redis
AWS_REGION={config.region}

# Redis Connection Optimization
REDIS_MAX_CONNECTIONS=50
REDIS_CONNECTION_TIMEOUT=5
REDIS_SOCKET_KEEPALIVE=true
REDIS_SOCKET_KEEPALIVE_OPTIONS=1,3,5
REDIS_HEALTH_CHECK_INTERVAL=30
REDIS_RETRY_ON_TIMEOUT=true
REDIS_RETRY_DELAY_BASE=0.1
REDIS_RETRY_DELAY_MAX=1.0
"""
            
            # Save to backend-v2 directory
            backend_dir = Path(__file__).parent.parent
            env_file = backend_dir / ".env.aws.production"
            
            with open(env_file, 'w') as f:
                f.write(aws_env_content)
            
            click.echo(f"{Fore.GREEN}✅ Configuration saved to: {env_file}")
            
            # Create deployment summary
            summary = {
                "deployment_timestamp": datetime.now().isoformat(),
                "cluster_id": config.cluster_id,
                "endpoint": endpoint,
                "port": config.port,
                "region": config.region,
                "node_type": config.node_type,
                "engine_version": config.engine_version,
                "security_groups": config.security_groups,
                "auth_token_enabled": config.auth_token_enabled,
                "encryption_at_rest": config.encryption_at_rest,
                "encryption_in_transit": config.encryption_in_transit
            }
            
            summary_file = backend_dir / f"deployment_summary_{config.cluster_id}.json"
            with open(summary_file, 'w') as f:
                json.dump(summary, f, indent=2)
            
            click.echo(f"{Fore.GREEN}✅ Deployment summary saved to: {summary_file}")
            
        except Exception as e:
            click.echo(f"{Fore.YELLOW}⚠️ Error saving configuration: {e}")
    
    def _validate_deployment(self, endpoint: str, port: int, auth_token: Optional[str]) -> Dict[str, Any]:
        """Validate deployment by testing connectivity."""
        validation_results = {
            "connectivity_test": False,
            "authentication_test": False,
            "performance_test": False,
            "error_messages": []
        }
        
        try:
            import redis
            
            # Create Redis client
            if auth_token:
                redis_client = redis.Redis(
                    host=endpoint,
                    port=port,
                    password=auth_token,
                    decode_responses=True,
                    socket_connect_timeout=10
                )
            else:
                redis_client = redis.Redis(
                    host=endpoint,
                    port=port,
                    decode_responses=True,
                    socket_connect_timeout=10
                )
            
            # Test connectivity
            redis_client.ping()
            validation_results["connectivity_test"] = True
            
            # Test authentication
            redis_client.set("deployment_test", "success")
            result = redis_client.get("deployment_test")
            if result == "success":
                validation_results["authentication_test"] = True
            redis_client.delete("deployment_test")
            
            # Basic performance test
            start_time = time.time()
            for i in range(10):
                redis_client.set(f"perf_test_{i}", f"value_{i}")
            for i in range(10):
                redis_client.get(f"perf_test_{i}")
            for i in range(10):
                redis_client.delete(f"perf_test_{i}")
            
            performance_time = (time.time() - start_time) * 1000  # ms
            if performance_time < 100:  # Less than 100ms for 30 operations
                validation_results["performance_test"] = True
            
            validation_results["performance_time_ms"] = performance_time
            
        except Exception as e:
            validation_results["error_messages"].append(str(e))
        
        return validation_results
    
    def update_cluster(self, cluster_id: str, config: DeploymentConfig) -> DeploymentResult:
        """Update existing ElastiCache cluster."""
        click.echo(f"{Fore.BLUE}🔄 Updating cluster: {cluster_id}")
        
        try:
            # Get current cluster details
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            
            cluster = response['CacheClusters'][0]
            
            # Prepare update parameters
            update_params = {
                'CacheClusterId': cluster_id,
                'ApplyImmediately': False  # Apply during maintenance window
            }
            
            # Update node type if different
            if cluster['CacheNodeType'] != config.node_type:
                update_params['CacheNodeType'] = config.node_type
                click.echo(f"{Fore.BLUE}📊 Updating node type: {cluster['CacheNodeType']} -> {config.node_type}")
            
            # Update engine version if different
            if cluster['EngineVersion'] != config.engine_version:
                update_params['EngineVersion'] = config.engine_version
                click.echo(f"{Fore.BLUE}🔧 Updating engine version: {cluster['EngineVersion']} -> {config.engine_version}")
            
            # Update security groups if different
            current_sgs = [sg['SecurityGroupId'] for sg in cluster['SecurityGroups']]
            if set(current_sgs) != set(config.security_groups):
                update_params['SecurityGroupIds'] = config.security_groups
                click.echo(f"{Fore.BLUE}🔒 Updating security groups")
            
            # Apply updates if any
            if len(update_params) > 1:  # More than just CacheClusterId
                self.elasticache.modify_cache_cluster(**update_params)
                
                # Wait for modification to complete
                click.echo(f"{Fore.BLUE}⏳ Waiting for modifications to complete...")
                waiter = self.elasticache.get_waiter('cache_cluster_available')
                waiter.wait(CacheClusterId=cluster_id)
                
                click.echo(f"{Fore.GREEN}✅ Cluster updated successfully")
            else:
                click.echo(f"{Fore.GREEN}✅ No updates needed")
            
            # Get updated cluster details
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            
            cluster = response['CacheClusters'][0]
            endpoint = cluster['RedisConfiguration']['PrimaryEndpoint']['Address'] if 'RedisConfiguration' in cluster else cluster['CacheNodes'][0]['Endpoint']['Address']
            
            return DeploymentResult(
                success=True,
                cluster_id=cluster_id,
                endpoint=endpoint,
                port=cluster['Port'],
                status=cluster['CacheClusterStatus'],
                message="Cluster updated successfully",
                cost_estimate=self.cost_estimates.get(config.node_type, 0.05) * 24 * 30,
                deployment_time=0,
                validation_results={}
            )
            
        except Exception as e:
            return DeploymentResult(
                success=False,
                cluster_id=cluster_id,
                endpoint=None,
                port=config.port,
                status="update_failed",
                message=str(e),
                cost_estimate=0,
                deployment_time=0,
                validation_results={}
            )
    
    def validate_cluster(self, cluster_id: str) -> DeploymentResult:
        """Validate existing cluster health and performance."""
        click.echo(f"{Fore.BLUE}🔍 Validating cluster: {cluster_id}")
        
        try:
            # Get cluster details
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            
            cluster = response['CacheClusters'][0]
            endpoint = cluster['RedisConfiguration']['PrimaryEndpoint']['Address'] if 'RedisConfiguration' in cluster else cluster['CacheNodes'][0]['Endpoint']['Address']
            
            # Run comprehensive validation
            validation_results = {
                "cluster_status": cluster['CacheClusterStatus'],
                "engine_version": cluster['EngineVersion'],
                "node_type": cluster['CacheNodeType'],
                "availability_zone": cluster.get('PreferredAvailabilityZone', 'Unknown'),
                "creation_time": cluster['CacheClusterCreateTime'].isoformat() if 'CacheClusterCreateTime' in cluster else None
            }
            
            # Test connectivity and performance
            connectivity_results = self._validate_deployment(endpoint, cluster['Port'], None)
            validation_results.update(connectivity_results)
            
            # Get CloudWatch metrics if available
            try:
                end_time = datetime.utcnow()
                start_time = end_time - timedelta(hours=1)
                
                metrics_response = self.cloudwatch.get_metric_statistics(
                    Namespace='AWS/ElastiCache',
                    MetricName='CacheHitRate',
                    Dimensions=[
                        {
                            'Name': 'CacheClusterId',
                            'Value': cluster_id
                        }
                    ],
                    StartTime=start_time,
                    EndTime=end_time,
                    Period=300,
                    Statistics=['Average']
                )
                
                if metrics_response['Datapoints']:
                    hit_rate = metrics_response['Datapoints'][-1]['Average']
                    validation_results["cache_hit_rate"] = hit_rate
                
            except Exception as e:
                validation_results["cloudwatch_error"] = str(e)
            
            success = (
                cluster['CacheClusterStatus'] == 'available' and
                validation_results.get('connectivity_test', False) and
                validation_results.get('authentication_test', False)
            )
            
            return DeploymentResult(
                success=success,
                cluster_id=cluster_id,
                endpoint=endpoint,
                port=cluster['Port'],
                status=cluster['CacheClusterStatus'],
                message="Validation completed" if success else "Validation failed",
                cost_estimate=self.cost_estimates.get(cluster['CacheNodeType'], 0.05) * 24 * 30,
                deployment_time=0,
                validation_results=validation_results
            )
            
        except Exception as e:
            return DeploymentResult(
                success=False,
                cluster_id=cluster_id,
                endpoint=None,
                port=6379,
                status="validation_error",
                message=str(e),
                cost_estimate=0,
                deployment_time=0,
                validation_results={}
            )
    
    def rollback_deployment(self, cluster_id: str) -> DeploymentResult:
        """Rollback deployment by deleting cluster and resources."""
        click.echo(f"{Fore.YELLOW}⚠️ Rolling back deployment: {cluster_id}")
        
        try:
            # Get cluster details first
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            
            cluster = response['CacheClusters'][0]
            
            # Delete cluster
            click.echo(f"{Fore.BLUE}🗑️ Deleting cluster...")
            self.elasticache.delete_cache_cluster(
                CacheClusterId=cluster_id,
                FinalSnapshotIdentifier=f"{cluster_id}-final-snapshot-{int(time.time())}"
            )
            
            # Wait for deletion
            click.echo(f"{Fore.BLUE}⏳ Waiting for cluster deletion...")
            waiter = self.elasticache.get_waiter('cache_cluster_deleted')
            waiter.wait(CacheClusterId=cluster_id)
            
            # Clean up security groups if they were created by us
            security_groups = cluster.get('SecurityGroups', [])
            for sg in security_groups:
                sg_id = sg['SecurityGroupId']
                try:
                    # Check if this is our created security group
                    response = self.ec2.describe_security_groups(GroupIds=[sg_id])
                    sg_info = response['SecurityGroups'][0]
                    
                    if sg_info['GroupName'].endswith('-redis-sg'):
                        click.echo(f"{Fore.BLUE}🗑️ Deleting security group: {sg_id}")
                        self.ec2.delete_security_group(GroupId=sg_id)
                
                except Exception as e:
                    click.echo(f"{Fore.YELLOW}⚠️ Could not delete security group {sg_id}: {e}")
            
            # Remove configuration files
            backend_dir = Path(__file__).parent.parent
            
            env_file = backend_dir / ".env.aws.production"
            if env_file.exists():
                env_file.unlink()
                click.echo(f"{Fore.GREEN}✅ Removed configuration file")
            
            summary_file = backend_dir / f"deployment_summary_{cluster_id}.json"
            if summary_file.exists():
                summary_file.unlink()
                click.echo(f"{Fore.GREEN}✅ Removed deployment summary")
            
            click.echo(f"{Fore.GREEN}✅ Rollback completed successfully")
            
            return DeploymentResult(
                success=True,
                cluster_id=cluster_id,
                endpoint=None,
                port=6379,
                status="deleted",
                message="Rollback completed successfully",
                cost_estimate=0,
                deployment_time=0,
                validation_results={},
                rollback_info={"deleted_at": datetime.now().isoformat()}
            )
            
        except Exception as e:
            return DeploymentResult(
                success=False,
                cluster_id=cluster_id,
                endpoint=None,
                port=6379,
                status="rollback_failed",
                message=str(e),
                cost_estimate=0,
                deployment_time=0,
                validation_results={}
            )


@click.command()
@click.option('--deploy', is_flag=True, help='Deploy new ElastiCache cluster')
@click.option('--update', is_flag=True, help='Update existing cluster')
@click.option('--validate', is_flag=True, help='Validate existing cluster')
@click.option('--rollback', is_flag=True, help='Rollback deployment')
@click.option('--cluster-id', required=True, help='ElastiCache cluster ID')
@click.option('--node-type', default='cache.t3.micro', help='Cache node type')
@click.option('--engine-version', default='7.0', help='Redis engine version')
@click.option('--region', default='us-east-1', help='AWS region')
@click.option('--vpc-id', help='VPC ID (optional)')
@click.option('--security-groups', help='Comma-separated security group IDs')
@click.option('--auth-token/--no-auth-token', default=True, help='Enable/disable auth token')
@click.option('--encryption/--no-encryption', default=True, help='Enable/disable encryption')
@click.option('--dry-run', is_flag=True, help='Show what would be done without executing')
def main(deploy: bool, update: bool, validate: bool, rollback: bool,
         cluster_id: str, node_type: str, engine_version: str, region: str,
         vpc_id: str, security_groups: str, auth_token: bool, encryption: bool,
         dry_run: bool):
    """Deploy and manage BookedBarber Redis infrastructure on AWS ElastiCache."""
    
    try:
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🚀 AWS ElastiCache Deployment Tool")
        click.echo(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        
        # Parse security groups
        sg_list = []
        if security_groups:
            sg_list = [sg.strip() for sg in security_groups.split(',')]
        
        # Create deployment configuration
        config = DeploymentConfig(
            cluster_id=cluster_id,
            node_type=node_type,
            engine_version=engine_version,
            region=region,
            vpc_id=vpc_id,
            security_groups=sg_list,
            auth_token_enabled=auth_token,
            encryption_at_rest=encryption,
            encryption_in_transit=encryption
        )
        
        if dry_run:
            click.echo(f"{Fore.YELLOW}🔍 DRY RUN MODE - No actual changes will be made")
            click.echo(f"\nConfiguration:")
            click.echo(f"  Cluster ID: {config.cluster_id}")
            click.echo(f"  Node Type: {config.node_type}")
            click.echo(f"  Engine Version: {config.engine_version}")
            click.echo(f"  Region: {config.region}")
            click.echo(f"  Auth Token: {config.auth_token_enabled}")
            click.echo(f"  Encryption: {config.encryption_at_rest}")
            return
        
        # Initialize deployer
        deployer = AWSElastiCacheDeployer(region=region)
        
        # Execute requested operation
        if deploy:
            result = deployer.deploy_elasticache_cluster(config)
        elif update:
            result = deployer.update_cluster(cluster_id, config)
        elif validate:
            result = deployer.validate_cluster(cluster_id)
        elif rollback:
            result = deployer.rollback_deployment(cluster_id)
        else:
            click.echo(f"{Fore.RED}❌ Please specify operation: --deploy, --update, --validate, or --rollback")
            return
        
        # Display results
        click.echo(f"\n{Fore.CYAN}📊 Operation Results:")
        click.echo("-" * 40)
        
        status_color = Fore.GREEN if result.success else Fore.RED
        click.echo(f"Success: {status_color}{result.success}")
        click.echo(f"Status: {result.status}")
        click.echo(f"Message: {result.message}")
        
        if result.endpoint:
            click.echo(f"Endpoint: {result.endpoint}:{result.port}")
        
        if result.cost_estimate > 0:
            click.echo(f"Estimated monthly cost: ${result.cost_estimate:.2f}")
        
        if result.deployment_time > 0:
            click.echo(f"Deployment time: {result.deployment_time:.1f} seconds")
        
        # Display validation results
        if result.validation_results:
            click.echo(f"\n{Fore.CYAN}🔍 Validation Results:")
            for key, value in result.validation_results.items():
                if isinstance(value, bool):
                    color = Fore.GREEN if value else Fore.RED
                    status = "✅ PASS" if value else "❌ FAIL"
                    click.echo(f"  {key}: {color}{status}")
                else:
                    click.echo(f"  {key}: {value}")
        
        # Exit with appropriate code
        sys.exit(0 if result.success else 1)
        
    except KeyboardInterrupt:
        click.echo(f"\n{Fore.YELLOW}⚠️ Operation interrupted by user")
        sys.exit(1)
    except Exception as e:
        click.echo(f"\n{Fore.RED}❌ Operation failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()