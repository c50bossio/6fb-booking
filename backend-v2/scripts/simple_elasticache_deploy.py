#!/usr/bin/env python3
"""
Simplified ElastiCache Deployment for BookedBarber
"""

import boto3
import time
import click
import json
from colorama import init, Fore

init(autoreset=True)

@click.command()
def main():
    """Deploy ElastiCache with minimal configuration."""
    
    try:
        click.echo(f"{Fore.CYAN}🚀 Simplified ElastiCache Deployment")
        click.echo("=" * 50)
        
        # Initialize clients
        elasticache = boto3.client('elasticache', region_name='us-east-1')
        ec2 = boto3.client('ec2', region_name='us-east-1')
        
        # Test connection
        click.echo(f"{Fore.BLUE}Testing AWS connection...")
        try:
            identity = boto3.client('sts').get_caller_identity()
            click.echo(f"{Fore.GREEN}✅ Connected to AWS account: {identity['Account']}")
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Connection error: {e}")
            return
        
        # Get default VPC subnets
        click.echo(f"{Fore.BLUE}Getting VPC information...")
        try:
            # Get default VPC
            vpcs = ec2.describe_vpcs(Filters=[{'Name': 'is-default', 'Values': ['true']}])
            if not vpcs['Vpcs']:
                click.echo(f"{Fore.RED}❌ No default VPC found")
                return
            
            vpc_id = vpcs['Vpcs'][0]['VpcId']
            
            # Get subnets
            subnets = ec2.describe_subnets(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
            )
            subnet_ids = [s['SubnetId'] for s in subnets['Subnets'][:2]]  # Use first 2 subnets
            
            click.echo(f"{Fore.GREEN}✅ Found VPC: {vpc_id}")
            click.echo(f"{Fore.GREEN}✅ Found subnets: {', '.join(subnet_ids)}")
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ VPC error: {e}")
            return
        
        # Create subnet group
        subnet_group_name = 'bookedbarber-subnet-group'
        click.echo(f"{Fore.BLUE}Creating subnet group...")
        try:
            elasticache.create_cache_subnet_group(
                CacheSubnetGroupName=subnet_group_name,
                CacheSubnetGroupDescription='BookedBarber Redis subnet group',
                SubnetIds=subnet_ids
            )
            click.echo(f"{Fore.GREEN}✅ Created subnet group: {subnet_group_name}")
        except elasticache.exceptions.CacheSubnetGroupAlreadyExistsFault:
            click.echo(f"{Fore.YELLOW}⚠️ Subnet group already exists")
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Subnet group error: {e}")
            return
        
        # Create Redis cluster
        cluster_id = 'bookedbarber-redis'
        click.echo(f"{Fore.BLUE}Creating Redis cluster...")
        try:
            response = elasticache.create_cache_cluster(
                CacheClusterId=cluster_id,
                Engine='redis',
                CacheNodeType='cache.t3.micro',  # Free tier eligible
                NumCacheNodes=1,
                CacheSubnetGroupName=subnet_group_name,
                Port=6379,
                PreferredMaintenanceWindow='sun:05:00-sun:06:00',
                Tags=[
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Environment', 'Value': 'production'}
                ]
            )
            click.echo(f"{Fore.GREEN}✅ Creating cluster: {cluster_id}")
            
            # Wait for cluster to be available
            click.echo(f"{Fore.BLUE}⏳ Waiting for cluster to become available (this may take 5-10 minutes)...")
            
            while True:
                time.sleep(30)
                clusters = elasticache.describe_cache_clusters(
                    CacheClusterId=cluster_id,
                    ShowCacheNodeInfo=True
                )
                
                cluster = clusters['CacheClusters'][0]
                status = cluster['CacheClusterStatus']
                
                click.echo(f"   Status: {status}")
                
                if status == 'available':
                    break
                elif status == 'failed':
                    click.echo(f"{Fore.RED}❌ Cluster creation failed")
                    return
            
            # Get endpoint
            endpoint = cluster['CacheNodes'][0]['Endpoint']['Address']
            port = cluster['CacheNodes'][0]['Endpoint']['Port']
            
            click.echo(f"\n{Fore.GREEN}🎉 ElastiCache cluster deployed successfully!")
            click.echo(f"\n{Fore.CYAN}Connection Details:")
            click.echo(f"Endpoint: {endpoint}")
            click.echo(f"Port: {port}")
            click.echo(f"Redis URL: redis://{endpoint}:{port}")
            
            # Save configuration
            config = {
                'cluster_id': cluster_id,
                'endpoint': endpoint,
                'port': port,
                'redis_url': f'redis://{endpoint}:{port}',
                'region': 'us-east-1'
            }
            
            with open('elasticache_config.json', 'w') as f:
                json.dump(config, f, indent=2)
            
            click.echo(f"\n{Fore.GREEN}✅ Configuration saved to elasticache_config.json")
            
        except elasticache.exceptions.CacheClusterAlreadyExistsFault:
            click.echo(f"{Fore.YELLOW}⚠️ Cluster already exists")
            
            # Get existing cluster details
            clusters = elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            cluster = clusters['CacheClusters'][0]
            
            if cluster['CacheClusterStatus'] == 'available':
                endpoint = cluster['CacheNodes'][0]['Endpoint']['Address']
                port = cluster['CacheNodes'][0]['Endpoint']['Port']
                
                click.echo(f"\n{Fore.CYAN}Existing cluster details:")
                click.echo(f"Endpoint: {endpoint}")
                click.echo(f"Port: {port}")
                click.echo(f"Redis URL: redis://{endpoint}:{port}")
                
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Cluster creation error: {e}")
            return
        
    except Exception as e:
        click.echo(f"{Fore.RED}❌ Deployment failed: {e}")

if __name__ == '__main__':
    main()