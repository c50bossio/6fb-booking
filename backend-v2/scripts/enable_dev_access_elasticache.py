#!/usr/bin/env python3
"""
Enable Development Access to ElastiCache
WARNING: This is for development only! Do not use in production.
"""

import boto3
import click
import requests
from colorama import init, Fore

init(autoreset=True)

@click.command()
@click.option('--remove', is_flag=True, help='Remove access instead of adding')
def main(remove):
    """Enable/disable development access to ElastiCache."""
    
    try:
        ec2 = boto3.client('ec2', region_name='us-east-1')
        
        click.echo(f"{Fore.CYAN}🔧 ElastiCache Development Access Configuration")
        click.echo("=" * 50)
        
        # Get current IP
        click.echo(f"{Fore.BLUE}Getting your current IP...")
        response = requests.get('https://api.ipify.org?format=json', timeout=5)
        current_ip = response.json()['ip']
        click.echo(f"Your IP: {current_ip}")
        
        # Get default security group
        click.echo(f"\n{Fore.BLUE}Finding security group...")
        vpcs = ec2.describe_vpcs(Filters=[{'Name': 'is-default', 'Values': ['true']}])
        if not vpcs['Vpcs']:
            click.echo(f"{Fore.RED}❌ No default VPC found")
            return
        
        vpc_id = vpcs['Vpcs'][0]['VpcId']
        sgs = ec2.describe_security_groups(
            Filters=[
                {'Name': 'vpc-id', 'Values': [vpc_id]},
                {'Name': 'group-name', 'Values': ['default']}
            ]
        )
        
        if not sgs['SecurityGroups']:
            click.echo(f"{Fore.RED}❌ No default security group found")
            return
        
        sg_id = sgs['SecurityGroups'][0]['GroupId']
        click.echo(f"Security Group: {sg_id}")
        
        if remove:
            # Remove the rule
            click.echo(f"\n{Fore.YELLOW}Removing access for {current_ip}...")
            try:
                ec2.revoke_security_group_ingress(
                    GroupId=sg_id,
                    IpPermissions=[{
                        'IpProtocol': 'tcp',
                        'FromPort': 6379,
                        'ToPort': 6379,
                        'IpRanges': [{'CidrIp': f'{current_ip}/32', 'Description': 'BookedBarber Dev Access'}]
                    }]
                )
                click.echo(f"{Fore.GREEN}✅ Access removed successfully")
            except Exception as e:
                if 'does not exist' in str(e):
                    click.echo(f"{Fore.YELLOW}⚠️ Rule doesn't exist")
                else:
                    click.echo(f"{Fore.RED}❌ Error removing rule: {e}")
        else:
            # Add the rule
            click.echo(f"\n{Fore.BLUE}Adding Redis access for {current_ip}...")
            try:
                ec2.authorize_security_group_ingress(
                    GroupId=sg_id,
                    IpPermissions=[{
                        'IpProtocol': 'tcp',
                        'FromPort': 6379,
                        'ToPort': 6379,
                        'IpRanges': [{'CidrIp': f'{current_ip}/32', 'Description': 'BookedBarber Dev Access'}]
                    }]
                )
                click.echo(f"{Fore.GREEN}✅ Access enabled successfully!")
                
                click.echo(f"\n{Fore.YELLOW}⚠️ IMPORTANT SECURITY NOTES:")
                click.echo("1. This is for DEVELOPMENT ONLY")
                click.echo("2. Your IP now has direct access to ElastiCache")
                click.echo("3. Remove this access when done:")
                click.echo(f"   python scripts/enable_dev_access_elasticache.py --remove")
                click.echo("4. For production, use VPC-based access only")
                
            except Exception as e:
                if 'already exists' in str(e):
                    click.echo(f"{Fore.YELLOW}⚠️ Rule already exists")
                else:
                    click.echo(f"{Fore.RED}❌ Error adding rule: {e}")
        
        # Show current rules
        click.echo(f"\n{Fore.BLUE}Current Redis access rules:")
        sgs = ec2.describe_security_groups(GroupIds=[sg_id])
        sg = sgs['SecurityGroups'][0]
        
        redis_rules = []
        for rule in sg['IpPermissions']:
            if rule.get('FromPort') == 6379:
                for ip_range in rule.get('IpRanges', []):
                    redis_rules.append(f"- {ip_range['CidrIp']} ({ip_range.get('Description', 'No description')})")
        
        if redis_rules:
            for rule in redis_rules:
                click.echo(rule)
        else:
            click.echo("No Redis-specific rules found")
            
    except Exception as e:
        click.echo(f"{Fore.RED}❌ Error: {e}")

if __name__ == '__main__':
    main()