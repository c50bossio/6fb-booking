#!/usr/bin/env python3
"""
Check ElastiCache Deployment Status
"""

import boto3
import click
import time
from colorama import init, Fore

init(autoreset=True)

@click.command()
@click.option('--wait', is_flag=True, help='Wait until cluster is available')
def main(wait):
    """Check ElastiCache cluster status."""
    
    try:
        elasticache = boto3.client('elasticache', region_name='us-east-1')
        cluster_id = 'bookedbarber-redis'
        
        while True:
            # Get cluster info
            response = elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            
            if not response['CacheClusters']:
                click.echo(f"{Fore.RED}❌ Cluster not found: {cluster_id}")
                return
            
            cluster = response['CacheClusters'][0]
            status = cluster['CacheClusterStatus']
            
            # Display status
            click.clear()
            click.echo(f"{Fore.CYAN}🔍 ElastiCache Cluster Status")
            click.echo("=" * 50)
            click.echo(f"Cluster ID: {cluster_id}")
            click.echo(f"Status: {status}")
            click.echo(f"Engine: {cluster['Engine']} {cluster.get('EngineVersion', '')}")
            click.echo(f"Node Type: {cluster['CacheNodeType']}")
            click.echo(f"Creation Time: {cluster.get('CacheClusterCreateTime', 'N/A')}")
            
            if status == 'available':
                # Get endpoint
                if cluster['CacheNodes']:
                    endpoint = cluster['CacheNodes'][0]['Endpoint']['Address']
                    port = cluster['CacheNodes'][0]['Endpoint']['Port']
                    
                    click.echo(f"\n{Fore.GREEN}✅ Cluster is ready!")
                    click.echo(f"\n{Fore.CYAN}Connection Details:")
                    click.echo(f"Endpoint: {endpoint}")
                    click.echo(f"Port: {port}")
                    click.echo(f"Redis URL: redis://{endpoint}:{port}/0")
                    
                    # Create environment configuration
                    env_content = f"""# AWS ElastiCache Configuration
REDIS_URL=redis://{endpoint}:{port}/0
REDIS_HOST={endpoint}
REDIS_PORT={port}
REDIS_SSL=false

# AWS Settings
AWS_ELASTICACHE_ENABLED=true
AWS_ELASTICACHE_CLUSTER_ID={cluster_id}
AWS_ELASTICACHE_PRIMARY_ENDPOINT={endpoint}
AWS_ELASTICACHE_PORT={port}
"""
                    
                    with open('.env.elasticache', 'w') as f:
                        f.write(env_content)
                    
                    click.echo(f"\n{Fore.GREEN}✅ Configuration saved to .env.elasticache")
                    click.echo(f"\nNext steps:")
                    click.echo(f"1. Copy settings from .env.elasticache to your .env file")
                    click.echo(f"2. Test connection: redis-cli -h {endpoint} -p {port} ping")
                    click.echo(f"3. Run migration: python scripts/migrate_to_elasticache.py")
                
                break
            elif status == 'failed':
                click.echo(f"\n{Fore.RED}❌ Cluster creation failed!")
                break
            else:
                click.echo(f"\n{Fore.YELLOW}⏳ Cluster is {status}...")
                
                if not wait:
                    click.echo("\nRun with --wait flag to monitor until ready")
                    break
                else:
                    click.echo("Checking again in 30 seconds...")
                    time.sleep(30)
        
    except Exception as e:
        click.echo(f"{Fore.RED}❌ Error: {e}")

if __name__ == '__main__':
    main()