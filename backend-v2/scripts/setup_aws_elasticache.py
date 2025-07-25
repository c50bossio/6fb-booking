#!/usr/bin/env python3
"""
AWS ElastiCache Setup Script for BookedBarber V2
===============================================

This script automates the creation and configuration of AWS ElastiCache Redis cluster
for production deployment of the BookedBarber platform.

Features:
- Creates ElastiCache Redis cluster with optimal settings
- Configures security groups and networking
- Sets up parameter groups for performance optimization
- Configures backup and maintenance windows
- Outputs connection details for environment configuration

Usage:
    python scripts/setup_aws_elasticache.py --cluster-id bookedbarber-redis --instance-type cache.t4g.small
    
Requirements:
    pip install boto3 click colorama
"""

import boto3
import click
import time
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from colorama import init, Fore, Style

# Initialize colorama for cross-platform colored output
init(autoreset=True)

class ElastiCacheManager:
    """Manages AWS ElastiCache Redis cluster creation and configuration."""
    
    def __init__(self, region: str = 'us-east-1'):
        """Initialize AWS clients."""
        try:
            self.region = region
            self.session = boto3.Session()
            self.elasticache = self.session.client('elasticache', region_name=region)
            self.ec2 = self.session.client('ec2', region_name=region)
            self.iam = self.session.client('iam', region_name=region)
            
            # Test AWS credentials
            sts = self.session.client('sts')
            account = sts.get_caller_identity()
            self.account_id = account['Account']
            
            click.echo(f"{Fore.GREEN}✅ AWS credentials verified for account: {self.account_id}")
            click.echo(f"{Fore.BLUE}🌍 Using region: {region}")
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ AWS credentials error: {e}")
            click.echo(f"{Fore.YELLOW}💡 Please configure AWS credentials using 'aws configure' or environment variables")
            sys.exit(1)
    
    def check_existing_cluster(self, cluster_id: str) -> Optional[Dict]:
        """Check if ElastiCache cluster already exists."""
        try:
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            if response['CacheClusters']:
                return response['CacheClusters'][0]
        except self.elasticache.exceptions.CacheClusterNotFoundFault:
            return None
        except Exception as e:
            click.echo(f"{Fore.YELLOW}⚠️  Error checking existing cluster: {e}")
            return None
    
    def get_default_vpc(self) -> Optional[Dict]:
        """Get default VPC for the region."""
        try:
            response = self.ec2.describe_vpcs(
                Filters=[{'Name': 'is-default', 'Values': ['true']}]
            )
            if response['Vpcs']:
                return response['Vpcs'][0]
            
            # If no default VPC, get the first available VPC
            response = self.ec2.describe_vpcs()
            if response['Vpcs']:
                return response['Vpcs'][0]
            
            return None
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error getting VPC: {e}")
            return None
    
    def get_vpc_subnets(self, vpc_id: str) -> List[Dict]:
        """Get subnets for VPC."""
        try:
            response = self.ec2.describe_subnets(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            return response['Subnets']
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error getting subnets: {e}")
            return []
    
    def create_cache_subnet_group(self, cluster_id: str, vpc_id: str, subnets: List[Dict]) -> str:
        """Create cache subnet group for ElastiCache."""
        subnet_group_name = f"{cluster_id}-subnet-group"
        
        try:
            # Check if subnet group already exists
            self.elasticache.describe_cache_subnet_groups(
                CacheSubnetGroupName=subnet_group_name
            )
            click.echo(f"{Fore.GREEN}✅ Cache subnet group already exists: {subnet_group_name}")
            return subnet_group_name
        except self.elasticache.exceptions.CacheSubnetGroupNotFoundFault:
            pass
        
        # Use at least 2 subnets in different AZs for high availability
        subnet_ids = [subnet['SubnetId'] for subnet in subnets[:3]]  # Use first 3 subnets
        
        try:
            self.elasticache.create_cache_subnet_group(
                CacheSubnetGroupName=subnet_group_name,
                CacheSubnetGroupDescription=f"Subnet group for {cluster_id} ElastiCache cluster",
                SubnetIds=subnet_ids
            )
            click.echo(f"{Fore.GREEN}✅ Created cache subnet group: {subnet_group_name}")
            return subnet_group_name
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating subnet group: {e}")
            raise
    
    def create_security_group(self, cluster_id: str, vpc_id: str) -> str:
        """Create security group for ElastiCache."""
        sg_name = f"{cluster_id}-elasticache-sg"
        
        try:
            # Check if security group already exists
            response = self.ec2.describe_security_groups(
                Filters=[
                    {'Name': 'group-name', 'Values': [sg_name]},
                    {'Name': 'vpc-id', 'Values': [vpc_id]}
                ]
            )
            if response['SecurityGroups']:
                sg_id = response['SecurityGroups'][0]['GroupId']
                click.echo(f"{Fore.GREEN}✅ Security group already exists: {sg_id}")
                return sg_id
        except Exception as e:
            click.echo(f"{Fore.YELLOW}⚠️  Error checking security group: {e}")
        
        try:
            # Create security group
            response = self.ec2.create_security_group(
                GroupName=sg_name,
                Description=f"Security group for {cluster_id} ElastiCache cluster",
                VpcId=vpc_id
            )
            sg_id = response['GroupId']
            
            # Add Redis port rule (restricted to VPC CIDR)
            vpc_response = self.ec2.describe_vpcs(VpcIds=[vpc_id])
            vpc_cidr = vpc_response['Vpcs'][0]['CidrBlock']
            
            self.ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 6379,
                        'ToPort': 6379,
                        'IpRanges': [{'CidrIp': vpc_cidr, 'Description': 'Redis access from VPC'}]
                    }
                ]
            )
            
            click.echo(f"{Fore.GREEN}✅ Created security group: {sg_id}")
            return sg_id
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating security group: {e}")
            raise
    
    def create_parameter_group(self, cluster_id: str) -> str:
        """Create parameter group with optimized Redis settings."""
        param_group_name = f"{cluster_id}-params"
        
        try:
            # Check if parameter group already exists
            self.elasticache.describe_cache_parameter_groups(
                CacheParameterGroupName=param_group_name
            )
            click.echo(f"{Fore.GREEN}✅ Parameter group already exists: {param_group_name}")
            return param_group_name
        except self.elasticache.exceptions.CacheParameterGroupNotFoundFault:
            pass
        
        try:
            # Create parameter group
            self.elasticache.create_cache_parameter_group(
                CacheParameterGroupName=param_group_name,
                CacheParameterGroupFamily='redis7.x',
                Description=f"Optimized Redis parameters for {cluster_id}"
            )
            
            # Apply optimized parameters
            parameters = [
                {'ParameterName': 'maxmemory-policy', 'ParameterValue': 'allkeys-lru'},
                {'ParameterName': 'notify-keyspace-events', 'ParameterValue': 'Ex'},
                {'ParameterName': 'timeout', 'ParameterValue': '300'},
                {'ParameterName': 'tcp-keepalive', 'ParameterValue': '60'},
            ]
            
            self.elasticache.modify_cache_parameter_group(
                CacheParameterGroupName=param_group_name,
                ParameterNameValues=parameters
            )
            
            click.echo(f"{Fore.GREEN}✅ Created optimized parameter group: {param_group_name}")
            return param_group_name
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating parameter group: {e}")
            raise
    
    def create_elasticache_cluster(
        self,
        cluster_id: str,
        instance_type: str = 'cache.t4g.small',
        auth_token: Optional[str] = None,
        subnet_group_name: str = None,
        security_group_ids: List[str] = None
    ) -> Dict:
        """Create ElastiCache Redis cluster."""
        
        try:
            # Generate random auth token if not provided
            if not auth_token:
                import secrets
                import string
                auth_token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
                click.echo(f"{Fore.YELLOW}🔑 Generated AUTH token: {auth_token}")
                click.echo(f"{Fore.YELLOW}💾 Please save this token - you'll need it for configuration!")
            
            # Create parameter group
            param_group = self.create_parameter_group(cluster_id)
            
            # Create cluster
            cluster_config = {
                'CacheClusterId': cluster_id,
                'CacheNodeType': instance_type,
                'Engine': 'redis',
                'EngineVersion': '7.0',
                'NumCacheNodes': 1,
                'CacheParameterGroupName': param_group,
                'Port': 6379,
                'TransitEncryptionEnabled': True,
                'AtRestEncryptionEnabled': True,
                'AuthToken': auth_token,
                'PreferredMaintenanceWindow': 'sun:05:00-sun:07:00',
                'NotificationTopicArn': None,
                'SnapshotRetentionLimit': 7,
                'SnapshotWindow': '03:00-05:00',
                'Tags': [
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Environment', 'Value': 'production'},
                    {'Key': 'ManagedBy', 'Value': 'elasticache-setup-script'},
                    {'Key': 'CreatedAt', 'Value': datetime.now().isoformat()}
                ]
            }
            
            if subnet_group_name:
                cluster_config['CacheSubnetGroupName'] = subnet_group_name
            
            if security_group_ids:
                cluster_config['SecurityGroupIds'] = security_group_ids
            
            click.echo(f"{Fore.BLUE}🚀 Creating ElastiCache cluster: {cluster_id}")
            click.echo(f"{Fore.BLUE}📋 Instance type: {instance_type}")
            click.echo(f"{Fore.BLUE}🔐 Encryption: Transit + At-Rest enabled")
            click.echo(f"{Fore.BLUE}🔑 AUTH token: Enabled")
            
            response = self.elasticache.create_cache_cluster(**cluster_config)
            cluster = response['CacheCluster']
            
            click.echo(f"{Fore.GREEN}✅ ElastiCache cluster creation initiated")
            return {'cluster': cluster, 'auth_token': auth_token}
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating ElastiCache cluster: {e}")
            raise
    
    def wait_for_cluster_available(self, cluster_id: str, timeout: int = 900) -> Dict:
        """Wait for cluster to become available."""
        click.echo(f"{Fore.BLUE}⏳ Waiting for cluster to become available (timeout: {timeout}s)...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = self.elasticache.describe_cache_clusters(
                    CacheClusterId=cluster_id,
                    ShowCacheNodeInfo=True
                )
                cluster = response['CacheClusters'][0]
                status = cluster['CacheClusterStatus']
                
                if status == 'available':
                    click.echo(f"{Fore.GREEN}✅ Cluster is now available!")
                    return cluster
                elif status in ['failed', 'incompatible-parameters', 'incompatible-network']:
                    click.echo(f"{Fore.RED}❌ Cluster creation failed with status: {status}")
                    raise Exception(f"Cluster creation failed: {status}")
                else:
                    elapsed = int(time.time() - start_time)
                    click.echo(f"{Fore.YELLOW}⏳ Status: {status} (elapsed: {elapsed}s)")
                    time.sleep(30)
            except Exception as e:
                click.echo(f"{Fore.RED}❌ Error checking cluster status: {e}")
                raise
        
        raise Exception(f"Cluster did not become available within {timeout} seconds")
    
    def get_cluster_endpoint(self, cluster: Dict) -> Tuple[str, int]:
        """Get cluster endpoint information."""
        if cluster['CacheNodes']:
            node = cluster['CacheNodes'][0]
            endpoint = node['Endpoint']
            return endpoint['Address'], endpoint['Port']
        raise Exception("No cache nodes found")
    
    def setup_complete_cluster(
        self,
        cluster_id: str,
        instance_type: str = 'cache.t4g.small',
        auth_token: Optional[str] = None
    ) -> Dict:
        """Complete ElastiCache cluster setup process."""
        
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🎯 Starting ElastiCache setup for BookedBarber V2")
        click.echo(f"{Fore.CYAN}{'='*60}")
        
        # Check if cluster already exists
        existing_cluster = self.check_existing_cluster(cluster_id)
        if existing_cluster:
            click.echo(f"{Fore.YELLOW}⚠️  Cluster {cluster_id} already exists")
            click.echo(f"{Fore.YELLOW}📊 Status: {existing_cluster['CacheClusterStatus']}")
            
            if existing_cluster['CacheClusterStatus'] == 'available':
                host, port = self.get_cluster_endpoint(existing_cluster)
                return {
                    'cluster_id': cluster_id,
                    'endpoint': host,
                    'port': port,
                    'status': 'existing',
                    'auth_token': 'existing_token_not_displayed'
                }
            else:
                click.echo(f"{Fore.BLUE}⏳ Waiting for existing cluster to become available...")
                cluster = self.wait_for_cluster_available(cluster_id)
                host, port = self.get_cluster_endpoint(cluster)
                return {
                    'cluster_id': cluster_id,
                    'endpoint': host,
                    'port': port,
                    'status': 'existing',
                    'auth_token': 'existing_token_not_displayed'
                }
        
        # Get VPC and networking info
        click.echo(f"{Fore.BLUE}🌐 Setting up networking...")
        vpc = self.get_default_vpc()
        if not vpc:
            raise Exception("No VPC found. Please create a VPC first.")
        
        vpc_id = vpc['VpcId']
        click.echo(f"{Fore.GREEN}✅ Using VPC: {vpc_id}")
        
        # Get subnets
        subnets = self.get_vpc_subnets(vpc_id)
        if len(subnets) < 2:
            click.echo(f"{Fore.YELLOW}⚠️  Only {len(subnets)} subnet(s) found. Recommended: 2+ for high availability")
        
        # Create networking components
        subnet_group_name = self.create_cache_subnet_group(cluster_id, vpc_id, subnets)
        security_group_id = self.create_security_group(cluster_id, vpc_id)
        
        # Create cluster
        result = self.create_elasticache_cluster(
            cluster_id=cluster_id,
            instance_type=instance_type,
            auth_token=auth_token,
            subnet_group_name=subnet_group_name,
            security_group_ids=[security_group_id]
        )
        
        # Wait for cluster to become available
        cluster = self.wait_for_cluster_available(cluster_id)
        host, port = self.get_cluster_endpoint(cluster)
        
        return {
            'cluster_id': cluster_id,
            'endpoint': host,
            'port': port,
            'status': 'created',
            'auth_token': result['auth_token'],
            'security_group_id': security_group_id,
            'subnet_group_name': subnet_group_name,
            'vpc_id': vpc_id
        }


def generate_environment_config(cluster_info: Dict) -> str:
    """Generate environment configuration for the cluster."""
    config = f"""
# AWS ElastiCache Configuration
# ===============================
# Generated on: {datetime.now().isoformat()}
# Cluster ID: {cluster_info['cluster_id']}
# Status: {cluster_info['status']}

# Basic Redis Configuration
REDIS_URL=rediss://:{cluster_info['auth_token']}@{cluster_info['endpoint']}:{cluster_info['port']}/0
REDIS_PASSWORD={cluster_info['auth_token']}
REDIS_SSL=true

# AWS ElastiCache Settings
AWS_ELASTICACHE_ENABLED=true
AWS_ELASTICACHE_CLUSTER_ID={cluster_info['cluster_id']}
AWS_ELASTICACHE_PRIMARY_ENDPOINT={cluster_info['endpoint']}
AWS_ELASTICACHE_PORT={cluster_info['port']}
AWS_ELASTICACHE_AUTH_TOKEN={cluster_info['auth_token']}

# Connection Pool Optimization
REDIS_MAX_CONNECTIONS=100
REDIS_CONNECTION_TIMEOUT=30
REDIS_SOCKET_TIMEOUT=10
REDIS_SOCKET_KEEPALIVE=true
"""
    
    if cluster_info.get('security_group_id'):
        config += f"""
# AWS Network Configuration
AWS_ELASTICACHE_SECURITY_GROUP_ID={cluster_info['security_group_id']}
AWS_ELASTICACHE_SUBNET_GROUP={cluster_info['subnet_group_name']}
AWS_VPC_ID={cluster_info['vpc_id']}
"""
    
    return config.strip()


@click.command()
@click.option('--cluster-id', required=True, help='ElastiCache cluster ID')
@click.option('--instance-type', default='cache.t4g.small', help='ElastiCache instance type')
@click.option('--region', default='us-east-1', help='AWS region')
@click.option('--auth-token', help='Redis AUTH token (auto-generated if not provided)')
@click.option('--output-file', default='.env.elasticache', help='Output file for environment variables')
@click.option('--wait/--no-wait', default=True, help='Wait for cluster to become available')
def main(cluster_id: str, instance_type: str, region: str, auth_token: str, output_file: str, wait: bool):
    """Create and configure AWS ElastiCache Redis cluster for BookedBarber V2."""
    
    try:
        # Initialize ElastiCache manager
        manager = ElastiCacheManager(region=region)
        
        # Setup cluster
        cluster_info = manager.setup_complete_cluster(
            cluster_id=cluster_id,
            instance_type=instance_type,
            auth_token=auth_token
        )
        
        # Generate configuration
        config = generate_environment_config(cluster_info)
        
        # Save to file
        with open(output_file, 'w') as f:
            f.write(config)
        
        # Display results
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}")
        click.echo("🎉 ElastiCache Setup Complete!")
        click.echo("="*50)
        click.echo(f"{Style.RESET_ALL}")
        
        click.echo(f"{Fore.GREEN}✅ Cluster ID: {cluster_info['cluster_id']}")
        click.echo(f"{Fore.GREEN}✅ Endpoint: {cluster_info['endpoint']}:{cluster_info['port']}")
        click.echo(f"{Fore.GREEN}✅ Status: {cluster_info['status']}")
        click.echo(f"{Fore.GREEN}✅ Environment config saved to: {output_file}")
        
        if cluster_info['status'] == 'created':
            click.echo(f"{Fore.YELLOW}🔑 AUTH Token: {cluster_info['auth_token']}")
            click.echo(f"{Fore.YELLOW}💾 IMPORTANT: Save the AUTH token securely!")
        
        click.echo(f"{Fore.BLUE}")
        click.echo("Next Steps:")
        click.echo("1. Add the configuration to your .env.production file")
        click.echo("2. Update your application security groups to allow Redis access")
        click.echo("3. Test the connection using scripts/test_elasticache_connection.py")
        click.echo("4. Deploy your application with the new Redis configuration")
        click.echo(f"{Style.RESET_ALL}")
        
        # Show cost estimate
        cost_estimates = {
            'cache.t4g.nano': '$15/month',
            'cache.t4g.micro': '$20/month', 
            'cache.t4g.small': '$30/month',
            'cache.t4g.medium': '$60/month',
            'cache.t4g.large': '$120/month',
            'cache.r6g.large': '$120/month',
            'cache.r6g.xlarge': '$240/month'
        }
        
        estimated_cost = cost_estimates.get(instance_type, 'N/A')
        click.echo(f"{Fore.CYAN}💰 Estimated monthly cost: {estimated_cost}")
        
    except KeyboardInterrupt:
        click.echo(f"\n{Fore.YELLOW}⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        click.echo(f"\n{Fore.RED}❌ Setup failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()