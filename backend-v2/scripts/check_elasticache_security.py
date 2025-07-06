#!/usr/bin/env python3
"""
Check ElastiCache Security Configuration
"""

import boto3
import click
from colorama import init, Fore
from tabulate import tabulate

init(autoreset=True)

@click.command()
def main():
    """Check ElastiCache security configuration."""
    
    try:
        # Initialize clients
        elasticache = boto3.client('elasticache', region_name='us-east-1')
        ec2 = boto3.client('ec2', region_name='us-east-1')
        
        click.echo(f"{Fore.CYAN}🔍 ElastiCache Security Configuration")
        click.echo("=" * 50)
        
        # Get cluster info
        cluster_id = 'bookedbarber-redis'
        response = elasticache.describe_cache_clusters(
            CacheClusterId=cluster_id,
            ShowCacheNodeInfo=True
        )
        
        if not response['CacheClusters']:
            click.echo(f"{Fore.RED}❌ Cluster not found")
            return
        
        cluster = response['CacheClusters'][0]
        
        # Display cluster info
        click.echo(f"\n{Fore.BLUE}Cluster Information:")
        click.echo(f"Cluster ID: {cluster_id}")
        click.echo(f"Status: {cluster['CacheClusterStatus']}")
        click.echo(f"Security Groups: {cluster.get('SecurityGroups', [])}")
        click.echo(f"Subnet Group: {cluster.get('CacheSubnetGroupName', 'N/A')}")
        
        # Get security group IDs
        sg_ids = []
        for sg in cluster.get('SecurityGroups', []):
            sg_ids.append(sg['SecurityGroupId'])
        
        if not sg_ids:
            # ElastiCache might use cache security groups or default VPC SG
            click.echo(f"\n{Fore.YELLOW}⚠️ No explicit security groups found")
            click.echo("ElastiCache might be using default VPC security group")
            
            # Get default VPC security group
            vpcs = ec2.describe_vpcs(Filters=[{'Name': 'is-default', 'Values': ['true']}])
            if vpcs['Vpcs']:
                vpc_id = vpcs['Vpcs'][0]['VpcId']
                sgs = ec2.describe_security_groups(
                    Filters=[
                        {'Name': 'vpc-id', 'Values': [vpc_id]},
                        {'Name': 'group-name', 'Values': ['default']}
                    ]
                )
                if sgs['SecurityGroups']:
                    sg_ids.append(sgs['SecurityGroups'][0]['GroupId'])
        
        # Display security group rules
        if sg_ids:
            click.echo(f"\n{Fore.BLUE}Security Group Rules:")
            
            for sg_id in sg_ids:
                sgs = ec2.describe_security_groups(GroupIds=[sg_id])
                sg = sgs['SecurityGroups'][0]
                
                click.echo(f"\nSecurity Group: {sg['GroupName']} ({sg_id})")
                click.echo(f"Description: {sg.get('Description', 'N/A')}")
                
                # Inbound rules
                click.echo(f"\n{Fore.GREEN}Inbound Rules:")
                inbound_data = []
                for rule in sg['IpPermissions']:
                    protocol = rule.get('IpProtocol', 'N/A')
                    from_port = rule.get('FromPort', 'N/A')
                    to_port = rule.get('ToPort', 'N/A')
                    
                    # Get sources
                    sources = []
                    for ip_range in rule.get('IpRanges', []):
                        sources.append(ip_range['CidrIp'])
                    for ip_range in rule.get('Ipv6Ranges', []):
                        sources.append(ip_range['CidrIpv6'])
                    for sg_ref in rule.get('UserIdGroupPairs', []):
                        sources.append(f"sg-{sg_ref['GroupId']}")
                    
                    for source in sources:
                        inbound_data.append([protocol, from_port, to_port, source])
                
                if inbound_data:
                    print(tabulate(inbound_data, headers=['Protocol', 'From Port', 'To Port', 'Source']))
                else:
                    click.echo("No inbound rules found")
        
        # Check current IP
        click.echo(f"\n{Fore.BLUE}Your Current IP:")
        try:
            import requests
            response = requests.get('https://api.ipify.org?format=json', timeout=5)
            current_ip = response.json()['ip']
            click.echo(f"Public IP: {current_ip}")
            
            # Check if current IP is allowed
            ip_allowed = False
            for sg_id in sg_ids:
                sgs = ec2.describe_security_groups(GroupIds=[sg_id])
                sg = sgs['SecurityGroups'][0]
                
                for rule in sg['IpPermissions']:
                    if rule.get('FromPort') == 6379 or rule.get('FromPort') is None:
                        for ip_range in rule.get('IpRanges', []):
                            if ip_range['CidrIp'] == '0.0.0.0/0' or current_ip in ip_range['CidrIp']:
                                ip_allowed = True
                                break
            
            if ip_allowed:
                click.echo(f"{Fore.GREEN}✅ Your IP appears to be allowed")
            else:
                click.echo(f"{Fore.YELLOW}⚠️ Your IP might not be allowed in security group")
                
        except Exception as e:
            click.echo(f"Could not determine current IP: {e}")
        
        # Recommendations
        click.echo(f"\n{Fore.CYAN}Recommendations:")
        click.echo("1. For development, temporarily add your IP to security group:")
        click.echo(f"   aws ec2 authorize-security-group-ingress --group-id <SG_ID> --protocol tcp --port 6379 --cidr <YOUR_IP>/32")
        click.echo("2. For production, access ElastiCache from within the same VPC")
        click.echo("3. Consider using AWS VPN or bastion host for secure access")
        
        # Network connectivity options
        click.echo(f"\n{Fore.CYAN}Network Connectivity Options:")
        click.echo("1. Direct Access (Development only):")
        click.echo("   - Add your IP to security group")
        click.echo("   - Not recommended for production")
        click.echo("\n2. VPC Access (Recommended):")
        click.echo("   - Deploy your application in the same VPC")
        click.echo("   - Use EC2, ECS, Lambda, or other AWS services")
        click.echo("\n3. VPN/Bastion Access:")
        click.echo("   - Set up AWS Client VPN")
        click.echo("   - Use SSH tunnel through bastion host")
        
    except Exception as e:
        click.echo(f"{Fore.RED}❌ Error: {e}")

if __name__ == '__main__':
    main()