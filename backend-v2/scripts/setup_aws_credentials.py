#!/usr/bin/env python3
"""
AWS Credentials Setup Helper for BookedBarber ElastiCache Deployment
===================================================================

This script helps set up AWS credentials and verify access to required services.
It guides users through the credential setup process and tests permissions.

Usage:
    python scripts/setup_aws_credentials.py --interactive
    python scripts/setup_aws_credentials.py --test-credentials
"""

import os
import sys
import json
import boto3
import click
from pathlib import Path
from colorama import init, Fore, Style
from botocore.exceptions import ClientError, NoCredentialsError, ProfileNotFound

# Initialize colorama
init(autoreset=True)


class AWSCredentialSetup:
    """Helps users set up AWS credentials for ElastiCache deployment."""
    
    def __init__(self):
        """Initialize AWS credential helper."""
        self.required_services = [
            'elasticache',
            'ec2', 
            'cloudwatch',
            'iam'
        ]
        self.session = None
        
    def check_aws_cli_installed(self) -> bool:
        """Check if AWS CLI is installed."""
        try:
            import subprocess
            result = subprocess.run(['aws', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                click.echo(f"{Fore.GREEN}✅ AWS CLI is installed: {result.stdout.strip()}")
                return True
            else:
                click.echo(f"{Fore.RED}❌ AWS CLI not found")
                return False
        except FileNotFoundError:
            click.echo(f"{Fore.RED}❌ AWS CLI not installed")
            return False
    
    def install_aws_cli_instructions(self):
        """Provide instructions for installing AWS CLI."""
        click.echo(f"\n{Fore.CYAN}📥 Installing AWS CLI:")
        click.echo("1. Install via pip:")
        click.echo(f"   {Fore.YELLOW}pip install awscli")
        click.echo("\n2. Or download from AWS:")
        click.echo("   https://aws.amazon.com/cli/")
        click.echo("\n3. After installation, run:")
        click.echo(f"   {Fore.YELLOW}aws configure")
    
    def get_aws_credentials_info(self):
        """Provide information about getting AWS credentials."""
        click.echo(f"\n{Fore.CYAN}🔑 Getting AWS Credentials:")
        click.echo("1. Sign in to AWS Console: https://console.aws.amazon.com")
        click.echo("2. Go to IAM → Users → Your Username → Security Credentials")
        click.echo("3. Click 'Create access key'")
        click.echo("4. Download the credentials CSV file")
        click.echo("5. Note your:")
        click.echo("   • Access Key ID")
        click.echo("   • Secret Access Key")
        click.echo("   • Default region (e.g., us-east-1)")
    
    def configure_aws_credentials_interactive(self):
        """Interactive AWS credentials configuration."""
        click.echo(f"\n{Fore.CYAN}⚙️ Configuring AWS Credentials")
        click.echo("Please enter your AWS credentials:")
        
        access_key = click.prompt("AWS Access Key ID", type=str)
        secret_key = click.prompt("AWS Secret Access Key", type=str, hide_input=True)
        region = click.prompt("Default region", default="us-east-1", type=str)
        output_format = click.prompt("Default output format", default="json", type=str)
        
        # Save credentials to AWS credentials file
        aws_dir = Path.home() / '.aws'
        aws_dir.mkdir(exist_ok=True)
        
        credentials_file = aws_dir / 'credentials'
        config_file = aws_dir / 'config'
        
        # Write credentials
        credentials_content = f"""[default]
aws_access_key_id = {access_key}
aws_secret_access_key = {secret_key}
"""
        
        with open(credentials_file, 'w') as f:
            f.write(credentials_content)
        
        # Write config
        config_content = f"""[default]
region = {region}
output = {output_format}
"""
        
        with open(config_file, 'w') as f:
            f.write(config_content)
        
        # Set file permissions
        credentials_file.chmod(0o600)
        config_file.chmod(0o600)
        
        click.echo(f"{Fore.GREEN}✅ AWS credentials configured successfully!")
        
        return True
    
    def test_aws_credentials(self) -> dict:
        """Test AWS credentials and service access."""
        click.echo(f"\n{Fore.BLUE}🔍 Testing AWS credentials and permissions...")
        
        test_results = {
            'credentials_valid': False,
            'account_info': {},
            'service_permissions': {},
            'region_info': {},
            'cost_estimate': {}
        }
        
        try:
            # Test basic credentials
            self.session = boto3.Session()
            sts = self.session.client('sts')
            
            try:
                identity = sts.get_caller_identity()
                test_results['credentials_valid'] = True
                test_results['account_info'] = {
                    'account_id': identity.get('Account', 'Unknown'),
                    'user_arn': identity.get('Arn', 'Unknown'),
                    'user_id': identity.get('UserId', 'Unknown')
                }
                
                click.echo(f"{Fore.GREEN}✅ AWS credentials are valid")
                click.echo(f"   Account ID: {identity['Account']}")
                click.echo(f"   User: {identity['Arn'].split('/')[-1] if '/' in identity['Arn'] else 'Unknown'}")
                
            except Exception as e:
                click.echo(f"{Fore.RED}❌ Invalid AWS credentials: {e}")
                return test_results
            
            # Test region access
            try:
                ec2 = self.session.client('ec2')
                regions = ec2.describe_regions()
                current_region = self.session.region_name or 'us-east-1'
                
                test_results['region_info'] = {
                    'current_region': current_region,
                    'available_regions': [r['RegionName'] for r in regions['Regions'][:10]]
                }
                
                click.echo(f"{Fore.GREEN}✅ Current region: {current_region}")
                
            except Exception as e:
                click.echo(f"{Fore.YELLOW}⚠️ Could not verify region access: {e}")
            
            # Test service permissions
            for service in self.required_services:
                try:
                    if service == 'elasticache':
                        client = self.session.client('elasticache')
                        client.describe_cache_clusters()
                        test_results['service_permissions'][service] = True
                        click.echo(f"{Fore.GREEN}✅ ElastiCache access: Available")
                        
                    elif service == 'ec2':
                        client = self.session.client('ec2')
                        client.describe_vpcs()
                        test_results['service_permissions'][service] = True
                        click.echo(f"{Fore.GREEN}✅ EC2 access: Available")
                        
                    elif service == 'cloudwatch':
                        client = self.session.client('cloudwatch')
                        client.list_metrics(MaxRecords=1)
                        test_results['service_permissions'][service] = True
                        click.echo(f"{Fore.GREEN}✅ CloudWatch access: Available")
                        
                    elif service == 'iam':
                        client = self.session.client('iam')
                        client.get_user()
                        test_results['service_permissions'][service] = True
                        click.echo(f"{Fore.GREEN}✅ IAM access: Available")
                        
                except ClientError as e:
                    error_code = e.response['Error']['Code']
                    if error_code == 'AccessDenied':
                        test_results['service_permissions'][service] = False
                        click.echo(f"{Fore.YELLOW}⚠️ {service.upper()} access: Limited permissions")
                    else:
                        test_results['service_permissions'][service] = True
                        click.echo(f"{Fore.GREEN}✅ {service.upper()} access: Available")
                        
                except Exception as e:
                    test_results['service_permissions'][service] = False
                    click.echo(f"{Fore.RED}❌ {service.upper()} access: Failed ({str(e)[:50]}...)")
            
            # Get cost estimates
            try:
                pricing = self.session.client('pricing', region_name='us-east-1')
                
                # ElastiCache pricing information
                test_results['cost_estimate'] = {
                    'cache_t4g_micro': '$13/month',
                    'cache_t4g_small': '$26/month', 
                    'cache_r6g_large': '$90/month',
                    'note': 'Approximate costs for us-east-1 region'
                }
                
                click.echo(f"\n{Fore.CYAN}💰 Estimated Monthly Costs:")
                click.echo(f"   Starter (t4g.micro):  ~$13/month")
                click.echo(f"   Recommended (t4g.small): ~$26/month")
                click.echo(f"   Growth (r6g.large): ~$90/month")
                
            except Exception:
                # Pricing API is not available in all regions
                test_results['cost_estimate'] = {
                    'note': 'Cost estimates not available in this region'
                }
            
        except NoCredentialsError:
            click.echo(f"{Fore.RED}❌ No AWS credentials found")
            click.echo("Please run with --configure to set up credentials")
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error testing AWS access: {e}")
        
        return test_results
    
    def check_vpc_and_networking(self) -> dict:
        """Check VPC and networking setup."""
        click.echo(f"\n{Fore.BLUE}🌐 Checking VPC and networking...")
        
        network_info = {
            'default_vpc': None,
            'vpcs': [],
            'subnets': [],
            'availability_zones': []
        }
        
        try:
            ec2 = self.session.client('ec2')
            
            # Get VPCs
            vpcs_response = ec2.describe_vpcs()
            for vpc in vpcs_response['Vpcs']:
                vpc_info = {
                    'vpc_id': vpc['VpcId'],
                    'cidr': vpc['CidrBlock'],
                    'is_default': vpc.get('IsDefault', False),
                    'state': vpc['State']
                }
                network_info['vpcs'].append(vpc_info)
                
                if vpc.get('IsDefault', False):
                    network_info['default_vpc'] = vpc_info
                    click.echo(f"{Fore.GREEN}✅ Default VPC found: {vpc['VpcId']} ({vpc['CidrBlock']})")
            
            # Get availability zones
            azs_response = ec2.describe_availability_zones()
            network_info['availability_zones'] = [
                az['ZoneName'] for az in azs_response['AvailabilityZones'] 
                if az['State'] == 'available'
            ]
            
            click.echo(f"{Fore.GREEN}✅ Available AZs: {', '.join(network_info['availability_zones'][:3])}")
            
            # Get subnets for default VPC
            if network_info['default_vpc']:
                subnets_response = ec2.describe_subnets(
                    Filters=[
                        {'Name': 'vpc-id', 'Values': [network_info['default_vpc']['vpc_id']]}
                    ]
                )
                
                for subnet in subnets_response['Subnets']:
                    subnet_info = {
                        'subnet_id': subnet['SubnetId'],
                        'availability_zone': subnet['AvailabilityZone'],
                        'cidr': subnet['CidrBlock'],
                        'available_ips': subnet['AvailableIpAddressCount']
                    }
                    network_info['subnets'].append(subnet_info)
                
                click.echo(f"{Fore.GREEN}✅ Found {len(network_info['subnets'])} subnets in default VPC")
            
        except Exception as e:
            click.echo(f"{Fore.YELLOW}⚠️ Could not check networking: {e}")
        
        return network_info
    
    def generate_deployment_summary(self, test_results: dict, network_info: dict):
        """Generate a deployment readiness summary."""
        click.echo(f"\n{Fore.CYAN}{Style.BRIGHT}📋 AWS Deployment Readiness Summary")
        click.echo("=" * 50)
        
        # Credentials status
        if test_results['credentials_valid']:
            click.echo(f"{Fore.GREEN}✅ AWS Credentials: Valid")
        else:
            click.echo(f"{Fore.RED}❌ AWS Credentials: Invalid or missing")
            return False
        
        # Service permissions
        required_services_available = all(
            test_results['service_permissions'].get(service, False) 
            for service in ['elasticache', 'ec2']
        )
        
        if required_services_available:
            click.echo(f"{Fore.GREEN}✅ Required Services: All accessible")
        else:
            click.echo(f"{Fore.YELLOW}⚠️ Required Services: Some limitations detected")
        
        # Networking
        if network_info.get('default_vpc'):
            click.echo(f"{Fore.GREEN}✅ Networking: Default VPC available")
        else:
            click.echo(f"{Fore.YELLOW}⚠️ Networking: No default VPC found")
        
        # Overall readiness
        ready_for_deployment = (
            test_results['credentials_valid'] and
            test_results['service_permissions'].get('elasticache', False) and
            test_results['service_permissions'].get('ec2', False) and
            network_info.get('default_vpc') is not None
        )
        
        if ready_for_deployment:
            click.echo(f"\n{Fore.GREEN}{Style.BRIGHT}🚀 Ready for ElastiCache deployment!")
            click.echo("\nNext steps:")
            click.echo("1. Run the deployment script:")
            click.echo(f"   {Fore.YELLOW}python scripts/deploy_to_aws.py --deploy --cluster-id bookedbarber-redis")
            return True
        else:
            click.echo(f"\n{Fore.YELLOW}{Style.BRIGHT}⚠️ Setup needs attention before deployment")
            
            if not test_results['credentials_valid']:
                click.echo("• Configure AWS credentials")
            if not test_results['service_permissions'].get('elasticache', False):
                click.echo("• Verify ElastiCache service access")
            if not network_info.get('default_vpc'):
                click.echo("• Set up VPC networking")
            
            return False


@click.command()
@click.option('--interactive', is_flag=True, help='Interactive credential setup')
@click.option('--test-credentials', is_flag=True, help='Test existing credentials')
@click.option('--install-instructions', is_flag=True, help='Show AWS CLI installation instructions')
@click.option('--check-networking', is_flag=True, help='Check VPC and networking setup')
@click.option('--full-check', is_flag=True, help='Run complete readiness check')
def main(interactive: bool, test_credentials: bool, install_instructions: bool, 
         check_networking: bool, full_check: bool):
    """Set up and verify AWS credentials for ElastiCache deployment."""
    
    try:
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🔧 AWS Credentials Setup for BookedBarber")
        click.echo(f"{Fore.CYAN}{'='*50}{Style.RESET_ALL}")
        
        setup = AWSCredentialSetup()
        
        if install_instructions:
            # Check if AWS CLI is installed
            if not setup.check_aws_cli_installed():
                setup.install_aws_cli_instructions()
                setup.get_aws_credentials_info()
            return
        
        if interactive:
            # Interactive setup
            if not setup.check_aws_cli_installed():
                setup.install_aws_cli_instructions()
                click.echo(f"\n{Fore.YELLOW}Please install AWS CLI first, then run this command again.")
                return
            
            setup.get_aws_credentials_info()
            
            if click.confirm('\nDo you have your AWS credentials ready?'):
                setup.configure_aws_credentials_interactive()
                
                # Test the newly configured credentials
                test_results = setup.test_aws_credentials()
                if test_results['credentials_valid']:
                    network_info = setup.check_vpc_and_networking()
                    setup.generate_deployment_summary(test_results, network_info)
            
            return
        
        if test_credentials or full_check:
            # Test existing credentials
            if not setup.check_aws_cli_installed():
                click.echo(f"{Fore.YELLOW}AWS CLI not installed. Run with --install-instructions")
                return
            
            test_results = setup.test_aws_credentials()
            
            if check_networking or full_check:
                network_info = setup.check_vpc_and_networking()
            else:
                network_info = {}
            
            if full_check:
                setup.generate_deployment_summary(test_results, network_info)
            
            return
        
        # Default: show help
        click.echo("Use one of the following options:")
        click.echo(f"  {Fore.YELLOW}--install-instructions  {Fore.WHITE}Show AWS CLI installation guide")
        click.echo(f"  {Fore.YELLOW}--interactive           {Fore.WHITE}Set up credentials interactively")
        click.echo(f"  {Fore.YELLOW}--test-credentials      {Fore.WHITE}Test existing credentials")
        click.echo(f"  {Fore.YELLOW}--full-check           {Fore.WHITE}Complete readiness check")
        
    except KeyboardInterrupt:
        click.echo(f"\n{Fore.YELLOW}Setup interrupted by user")
    except Exception as e:
        click.echo(f"\n{Fore.RED}Setup failed: {e}")


if __name__ == '__main__':
    main()