#!/usr/bin/env python3
"""
AWS Environment Detection and Configuration Script
================================================

This script automatically detects AWS environment and configures Redis settings
for optimal ElastiCache integration.

Features:
- Detects if running in AWS environment
- Discovers ElastiCache clusters automatically
- Configures Redis connection parameters
- Validates connectivity and performance
- Generates optimized configuration

Usage:
    python scripts/detect_aws_environment.py --auto-configure --test-connection

Requirements:
    pip install boto3 requests redis click colorama
"""

import boto3
import requests
import redis
import click
import json
import os
import time
from typing import Dict, List, Optional, Tuple
from colorama import init, Fore, Style
from urllib.parse import urlparse
import socket

# Initialize colorama
init(autoreset=True)

class AWSEnvironmentDetector:
    """Detects and configures AWS environment for BookedBarber V2."""
    
    def __init__(self, region: Optional[str] = None):
        """Initialize AWS environment detector."""
        self.region = region
        self.session = None
        self.is_aws_environment = False
        self.instance_metadata = {}
        self.elasticache_clusters = []
        
        # Detect AWS environment
        self._detect_aws_environment()
        
        if self.is_aws_environment or region:
            self._initialize_aws_clients()
    
    def _detect_aws_environment(self) -> bool:
        """Detect if running in AWS environment."""
        try:
            # Try to access EC2 metadata service
            click.echo(f"{Fore.BLUE}🔍 Detecting AWS environment...")
            
            response = requests.get(
                'http://169.254.169.254/latest/meta-data/instance-id',
                timeout=3
            )
            
            if response.status_code == 200:
                self.is_aws_environment = True
                instance_id = response.text
                
                # Get additional metadata
                try:
                    region_response = requests.get(
                        'http://169.254.169.254/latest/meta-data/placement/region',
                        timeout=3
                    )
                    if region_response.status_code == 200:
                        self.region = region_response.text
                    
                    az_response = requests.get(
                        'http://169.254.169.254/latest/meta-data/placement/availability-zone',
                        timeout=3
                    )
                    if az_response.status_code == 200:
                        availability_zone = az_response.text
                    
                    instance_type_response = requests.get(
                        'http://169.254.169.254/latest/meta-data/instance-type',
                        timeout=3
                    )
                    if instance_type_response.status_code == 200:
                        instance_type = instance_type_response.text
                    
                    self.instance_metadata = {
                        'instance_id': instance_id,
                        'region': self.region,
                        'availability_zone': availability_zone,
                        'instance_type': instance_type
                    }
                    
                    click.echo(f"{Fore.GREEN}✅ Running in AWS environment")
                    click.echo(f"{Fore.GREEN}   Instance ID: {instance_id}")
                    click.echo(f"{Fore.GREEN}   Region: {self.region}")
                    click.echo(f"{Fore.GREEN}   AZ: {availability_zone}")
                    click.echo(f"{Fore.GREEN}   Instance Type: {instance_type}")
                    
                    return True
                    
                except Exception as e:
                    click.echo(f"{Fore.YELLOW}⚠️  Could not get complete metadata: {e}")
                    self.instance_metadata = {'instance_id': instance_id}
                    return True
            
        except requests.exceptions.RequestException:
            pass
        except Exception as e:
            click.echo(f"{Fore.YELLOW}⚠️  Error detecting AWS environment: {e}")
        
        # Check for environment variables that indicate AWS
        aws_indicators = [
            'AWS_REGION',
            'AWS_DEFAULT_REGION', 
            'AWS_EXECUTION_ENV',
            'AWS_LAMBDA_FUNCTION_NAME',
            'ECS_CONTAINER_METADATA_URI'
        ]
        
        for indicator in aws_indicators:
            if os.getenv(indicator):
                self.is_aws_environment = True
                self.region = os.getenv('AWS_REGION') or os.getenv('AWS_DEFAULT_REGION')
                click.echo(f"{Fore.GREEN}✅ AWS environment detected via environment variables")
                if self.region:
                    click.echo(f"{Fore.GREEN}   Region: {self.region}")
                return True
        
        click.echo(f"{Fore.BLUE}ℹ️  Not running in AWS environment")
        return False
    
    def _initialize_aws_clients(self) -> None:
        """Initialize AWS clients."""
        try:
            self.session = boto3.Session(region_name=self.region)
            self.elasticache = self.session.client('elasticache')
            self.ec2 = self.session.client('ec2')
            
            # Test credentials
            sts = self.session.client('sts')
            identity = sts.get_caller_identity()
            self.account_id = identity['Account']
            
            click.echo(f"{Fore.GREEN}✅ AWS credentials configured for account: {self.account_id}")
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error initializing AWS clients: {e}")
            raise
    
    def discover_elasticache_clusters(self, project_filter: str = 'BookedBarber') -> List[Dict]:
        """Discover ElastiCache clusters for the project."""
        if not self.session:
            click.echo(f"{Fore.YELLOW}⚠️  AWS session not available for cluster discovery")
            return []
        
        try:
            click.echo(f"{Fore.BLUE}🔍 Discovering ElastiCache clusters...")
            
            # Get all cache clusters
            response = self.elasticache.describe_cache_clusters(ShowCacheNodeInfo=True)
            clusters = response['CacheClusters']
            
            # Filter clusters by project tags
            project_clusters = []
            
            for cluster in clusters:
                cluster_id = cluster['CacheClusterId']
                
                # Get tags for cluster
                try:
                    tags_response = self.elasticache.list_tags_for_resource(
                        ResourceName=f"arn:aws:elasticache:{self.region}:{self.account_id}:cluster:{cluster_id}"
                    )
                    
                    tags = {tag['Key']: tag['Value'] for tag in tags_response.get('TagList', [])}
                    
                    # Check if cluster belongs to our project
                    if (project_filter.lower() in cluster_id.lower() or 
                        tags.get('Project', '').lower() == project_filter.lower()):
                        
                        cluster_info = {
                            'cluster_id': cluster_id,
                            'status': cluster['CacheClusterStatus'],
                            'node_type': cluster['CacheNodeType'],
                            'engine': cluster['Engine'],
                            'engine_version': cluster['EngineVersion'],
                            'tags': tags
                        }
                        
                        # Get endpoint information
                        if cluster['CacheNodes']:
                            node = cluster['CacheNodes'][0]
                            if 'Endpoint' in node:
                                cluster_info['endpoint'] = node['Endpoint']['Address']
                                cluster_info['port'] = node['Endpoint']['Port']
                        
                        # Check encryption
                        cluster_info['transit_encryption'] = cluster.get('TransitEncryptionEnabled', False)
                        cluster_info['at_rest_encryption'] = cluster.get('AtRestEncryptionEnabled', False)
                        
                        project_clusters.append(cluster_info)
                        
                        status_color = Fore.GREEN if cluster['CacheClusterStatus'] == 'available' else Fore.YELLOW
                        click.echo(f"{status_color}   Found cluster: {cluster_id} ({cluster['CacheClusterStatus']})")
                
                except Exception as e:
                    click.echo(f"{Fore.YELLOW}⚠️  Could not get tags for cluster {cluster_id}: {e}")
            
            self.elasticache_clusters = project_clusters
            
            if project_clusters:
                click.echo(f"{Fore.GREEN}✅ Found {len(project_clusters)} ElastiCache cluster(s)")
            else:
                click.echo(f"{Fore.BLUE}ℹ️  No ElastiCache clusters found for project: {project_filter}")
            
            return project_clusters
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error discovering ElastiCache clusters: {e}")
            return []
    
    def test_redis_connectivity(self, cluster_info: Dict, auth_token: Optional[str] = None) -> Dict:
        """Test Redis connectivity to a cluster."""
        if 'endpoint' not in cluster_info:
            return {'success': False, 'error': 'No endpoint information available'}
        
        endpoint = cluster_info['endpoint']
        port = cluster_info.get('port', 6379)
        
        click.echo(f"{Fore.BLUE}🔌 Testing connectivity to {endpoint}:{port}...")
        
        try:
            # Test basic network connectivity
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((endpoint, port))
            sock.close()
            
            if result != 0:
                return {'success': False, 'error': f'Cannot connect to {endpoint}:{port}'}
            
            # Test Redis connection
            redis_config = {
                'host': endpoint,
                'port': port,
                'socket_timeout': 5,
                'socket_connect_timeout': 5,
                'decode_responses': True
            }
            
            # Add SSL if transit encryption is enabled
            if cluster_info.get('transit_encryption', False):
                redis_config.update({
                    'ssl': True,
                    'ssl_cert_reqs': 'required'
                })
            
            # Add auth token if provided
            if auth_token:
                redis_config['password'] = auth_token
            
            # Create Redis client
            r = redis.Redis(**redis_config)
            
            # Test ping
            start_time = time.time()
            ping_result = r.ping()
            ping_time = (time.time() - start_time) * 1000
            
            if not ping_result:
                return {'success': False, 'error': 'Redis PING failed'}
            
            # Test basic operations
            test_key = 'aws_detector_test'
            test_value = 'test_value_12345'
            
            # Set operation
            start_time = time.time()
            r.set(test_key, test_value, ex=60)  # Expire in 60 seconds
            set_time = (time.time() - start_time) * 1000
            
            # Get operation
            start_time = time.time()
            retrieved_value = r.get(test_key)
            get_time = (time.time() - start_time) * 1000
            
            if retrieved_value != test_value:
                return {'success': False, 'error': 'Redis GET/SET test failed'}
            
            # Clean up test key
            r.delete(test_key)
            
            # Get Redis info
            info = r.info()
            
            return {
                'success': True,
                'ping_time_ms': round(ping_time, 2),
                'set_time_ms': round(set_time, 2),
                'get_time_ms': round(get_time, 2),
                'redis_version': info.get('redis_version', 'unknown'),
                'used_memory': info.get('used_memory_human', 'unknown'),
                'connected_clients': info.get('connected_clients', 0),
                'hit_rate': self._calculate_hit_rate(info)
            }
            
        except redis.exceptions.AuthenticationError:
            return {'success': False, 'error': 'Redis authentication failed - check AUTH token'}
        except redis.exceptions.ConnectionError as e:
            return {'success': False, 'error': f'Redis connection error: {e}'}
        except Exception as e:
            return {'success': False, 'error': f'Redis test failed: {e}'}
    
    def _calculate_hit_rate(self, info: Dict) -> float:
        """Calculate Redis hit rate from info."""
        hits = info.get('keyspace_hits', 0)
        misses = info.get('keyspace_misses', 0)
        total = hits + misses
        
        if total == 0:
            return 0.0
        
        return round((hits / total) * 100, 2)
    
    def generate_optimized_config(self, cluster_info: Dict, auth_token: Optional[str] = None) -> Dict:
        """Generate optimized Redis configuration for the cluster."""
        config = {}
        
        if 'endpoint' not in cluster_info:
            return config
        
        endpoint = cluster_info['endpoint']
        port = cluster_info.get('port', 6379)
        
        # Basic connection settings
        if cluster_info.get('transit_encryption', False):
            scheme = 'rediss'
            config['REDIS_SSL'] = 'true'
            config['REDIS_SSL_CERT_REQS'] = 'required'
        else:
            scheme = 'redis'
            config['REDIS_SSL'] = 'false'
        
        # Generate Redis URL
        if auth_token:
            config['REDIS_URL'] = f"{scheme}://:{auth_token}@{endpoint}:{port}/0"
            config['REDIS_PASSWORD'] = auth_token
        else:
            config['REDIS_URL'] = f"{scheme}://{endpoint}:{port}/0"
        
        # AWS ElastiCache specific settings
        config['AWS_ELASTICACHE_ENABLED'] = 'true'
        config['AWS_ELASTICACHE_CLUSTER_ID'] = cluster_info['cluster_id']
        config['AWS_ELASTICACHE_PRIMARY_ENDPOINT'] = endpoint
        config['AWS_ELASTICACHE_PORT'] = str(port)
        
        if auth_token:
            config['AWS_ELASTICACHE_AUTH_TOKEN'] = auth_token
        
        # Optimization based on instance type
        node_type = cluster_info.get('node_type', '')
        
        if 'nano' in node_type or 'micro' in node_type:
            # Small instances
            config['REDIS_MAX_CONNECTIONS'] = '20'
            config['REDIS_CONNECTION_TIMEOUT'] = '30'
        elif 'small' in node_type:
            # Medium instances
            config['REDIS_MAX_CONNECTIONS'] = '50'
            config['REDIS_CONNECTION_TIMEOUT'] = '20'
        elif 'medium' in node_type or 'large' in node_type:
            # Larger instances
            config['REDIS_MAX_CONNECTIONS'] = '100'
            config['REDIS_CONNECTION_TIMEOUT'] = '15'
        else:
            # Default settings
            config['REDIS_MAX_CONNECTIONS'] = '50'
            config['REDIS_CONNECTION_TIMEOUT'] = '20'
        
        # Performance optimization
        config['REDIS_SOCKET_KEEPALIVE'] = 'true'
        config['REDIS_RETRY_ON_TIMEOUT'] = 'true'
        config['REDIS_HEALTH_CHECK_INTERVAL'] = '30'
        config['REDIS_DECODE_RESPONSES'] = 'true'
        
        # Cache configuration
        config['CACHE_ENABLED'] = 'true'
        config['CACHE_TTL_DEFAULT'] = '300'
        config['CACHE_TTL_BOOKINGS'] = '60'
        config['CACHE_TTL_ANALYTICS'] = '1800'
        config['CACHE_KEY_PREFIX'] = '6fb:'
        
        # Rate limiting
        config['RATE_LIMIT_ENABLED'] = 'true'
        config['RATE_LIMIT_PER_MINUTE'] = '100'
        config['RATE_LIMIT_PER_HOUR'] = '2000'
        config['RATE_LIMIT_PER_DAY'] = '20000'
        
        return config
    
    def save_configuration(self, config: Dict, filename: str = '.env.aws.detected') -> str:
        """Save configuration to file."""
        try:
            config_lines = [
                "# AWS ElastiCache Configuration",
                "# Auto-generated by AWS Environment Detector",
                f"# Generated: {click.get_current_context().meta.get('timestamp', 'Unknown')}",
                ""
            ]
            
            for key, value in config.items():
                config_lines.append(f"{key}={value}")
            
            with open(filename, 'w') as f:
                f.write('\n'.join(config_lines))
            
            click.echo(f"{Fore.GREEN}✅ Configuration saved to: {filename}")
            return filename
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error saving configuration: {e}")
            raise


@click.command()
@click.option('--region', help='AWS region (auto-detected if running in AWS)')
@click.option('--cluster-id', help='Specific cluster ID to configure')
@click.option('--auth-token', help='Redis AUTH token for testing')
@click.option('--project-filter', default='BookedBarber', help='Filter clusters by project name')
@click.option('--auto-configure', is_flag=True, help='Automatically configure based on detected clusters')
@click.option('--test-connection', is_flag=True, help='Test Redis connectivity')
@click.option('--output-file', default='.env.aws.detected', help='Output configuration file')
def main(region: str, cluster_id: str, auth_token: str, project_filter: str, 
         auto_configure: bool, test_connection: bool, output_file: str):
    """Detect AWS environment and configure Redis settings for ElastiCache."""
    
    # Add timestamp to context
    ctx = click.get_current_context()
    ctx.meta['timestamp'] = click.get_current_context().params
    
    try:
        # Initialize detector
        detector = AWSEnvironmentDetector(region=region)
        
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🌍 AWS Environment Detection for BookedBarber V2")
        click.echo(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        
        # Display environment information
        if detector.is_aws_environment:
            click.echo(f"{Fore.GREEN}✅ AWS Environment: Detected")
            if detector.instance_metadata:
                for key, value in detector.instance_metadata.items():
                    click.echo(f"{Fore.GREEN}   {key.replace('_', ' ').title()}: {value}")
        else:
            click.echo(f"{Fore.BLUE}ℹ️  AWS Environment: Not detected (using manual configuration)")
        
        # Discover clusters
        clusters = detector.discover_elasticache_clusters(project_filter)
        
        if not clusters:
            click.echo(f"{Fore.YELLOW}⚠️  No ElastiCache clusters found")
            
            if not detector.is_aws_environment:
                click.echo(f"{Fore.BLUE}💡 To create a cluster, run: python scripts/setup_aws_elasticache.py")
            
            return
        
        # Select cluster to work with
        target_cluster = None
        
        if cluster_id:
            # Use specified cluster
            for cluster in clusters:
                if cluster['cluster_id'] == cluster_id:
                    target_cluster = cluster
                    break
            
            if not target_cluster:
                click.echo(f"{Fore.RED}❌ Cluster not found: {cluster_id}")
                return
        else:
            # Use first available cluster
            available_clusters = [c for c in clusters if c['status'] == 'available']
            if available_clusters:
                target_cluster = available_clusters[0]
                click.echo(f"{Fore.BLUE}ℹ️  Using cluster: {target_cluster['cluster_id']}")
            else:
                click.echo(f"{Fore.YELLOW}⚠️  No available clusters found")
                return
        
        # Test connection if requested
        if test_connection:
            click.echo(f"\n{Fore.BLUE}🧪 Testing Redis connectivity...")
            test_result = detector.test_redis_connectivity(target_cluster, auth_token)
            
            if test_result['success']:
                click.echo(f"{Fore.GREEN}✅ Redis connectivity test passed!")
                click.echo(f"{Fore.GREEN}   Ping time: {test_result['ping_time_ms']}ms")
                click.echo(f"{Fore.GREEN}   Set time: {test_result['set_time_ms']}ms")
                click.echo(f"{Fore.GREEN}   Get time: {test_result['get_time_ms']}ms")
                click.echo(f"{Fore.GREEN}   Redis version: {test_result['redis_version']}")
                click.echo(f"{Fore.GREEN}   Memory usage: {test_result['used_memory']}")
                click.echo(f"{Fore.GREEN}   Connected clients: {test_result['connected_clients']}")
                click.echo(f"{Fore.GREEN}   Hit rate: {test_result['hit_rate']}%")
            else:
                click.echo(f"{Fore.RED}❌ Redis connectivity test failed: {test_result['error']}")
                
                if 'authentication' in test_result['error'].lower():
                    click.echo(f"{Fore.YELLOW}💡 Try providing the AUTH token with --auth-token option")
                elif 'connect' in test_result['error'].lower():
                    click.echo(f"{Fore.YELLOW}💡 Check security groups and network configuration")
                
                return
        
        # Generate configuration if requested
        if auto_configure:
            click.echo(f"\n{Fore.BLUE}⚙️  Generating optimized configuration...")
            config = detector.generate_optimized_config(target_cluster, auth_token)
            
            if config:
                detector.save_configuration(config, output_file)
                
                click.echo(f"\n{Fore.GREEN}🎉 Configuration generated successfully!")
                click.echo(f"{Fore.BLUE}Next steps:")
                click.echo(f"1. Review the configuration in {output_file}")
                click.echo(f"2. Copy relevant settings to your .env.production file")
                click.echo(f"3. Update your application deployment with new Redis settings")
                click.echo(f"4. Restart your application to use ElastiCache")
            else:
                click.echo(f"{Fore.YELLOW}⚠️  Could not generate configuration")
        
        # Display cluster summary
        click.echo(f"\n{Fore.CYAN}📋 Cluster Summary:")
        for cluster in clusters:
            status_color = Fore.GREEN if cluster['status'] == 'available' else Fore.YELLOW
            encryption_status = "🔒" if cluster.get('transit_encryption') else "🔓"
            
            click.echo(f"{status_color}   {cluster['cluster_id']} ({cluster['status']}) {encryption_status}")
            click.echo(f"      Type: {cluster['node_type']} | Engine: {cluster['engine']} {cluster['engine_version']}")
            if 'endpoint' in cluster:
                click.echo(f"      Endpoint: {cluster['endpoint']}:{cluster.get('port', 6379)}")
    
    except KeyboardInterrupt:
        click.echo(f"\n{Fore.YELLOW}⚠️  Detection interrupted by user")
    except Exception as e:
        click.echo(f"\n{Fore.RED}❌ Detection failed: {e}")


if __name__ == '__main__':
    main()