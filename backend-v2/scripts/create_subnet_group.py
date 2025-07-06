#!/usr/bin/env python3
"""
Create ElastiCache Subnet Group for BookedBarber
"""

import boto3
import click
from colorama import init, Fore

init(autoreset=True)

@click.command()
@click.option('--region', default='us-east-1', help='AWS region')
def main(region):
    """Create subnet group for ElastiCache."""
    
    try:
        # Initialize AWS clients
        ec2 = boto3.client('ec2', region_name=region)
        elasticache = boto3.client('elasticache', region_name=region)
        
        click.echo(f"{Fore.BLUE}Creating ElastiCache subnet group...")
        
        # Get default VPC
        vpcs = ec2.describe_vpcs(Filters=[{'Name': 'is-default', 'Values': ['true']}])
        if not vpcs['Vpcs']:
            click.echo(f"{Fore.RED}No default VPC found!")
            return
        
        vpc_id = vpcs['Vpcs'][0]['VpcId']
        click.echo(f"{Fore.GREEN}✅ Using VPC: {vpc_id}")
        
        # Get subnets in different AZs
        subnets = ec2.describe_subnets(
            Filters=[
                {'Name': 'vpc-id', 'Values': [vpc_id]},
                {'Name': 'state', 'Values': ['available']}
            ]
        )
        
        subnet_ids = [subnet['SubnetId'] for subnet in subnets['Subnets']]
        click.echo(f"{Fore.GREEN}✅ Found {len(subnet_ids)} subnets")
        
        # Create subnet group
        try:
            elasticache.create_cache_subnet_group(
                CacheSubnetGroupName='bookedbarber-redis-subnet',
                CacheSubnetGroupDescription='Subnet group for BookedBarber Redis',
                SubnetIds=subnet_ids,
                Tags=[
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Component', 'Value': 'redis-cache'}
                ]
            )
            click.echo(f"{Fore.GREEN}✅ Created subnet group: bookedbarber-redis-subnet")
        except elasticache.exceptions.CacheSubnetGroupAlreadyExistsFault:
            click.echo(f"{Fore.YELLOW}⚠️ Subnet group already exists")
        
    except Exception as e:
        click.echo(f"{Fore.RED}❌ Error: {e}")

if __name__ == '__main__':
    main()