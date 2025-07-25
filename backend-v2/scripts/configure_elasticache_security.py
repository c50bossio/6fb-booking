#!/usr/bin/env python3
"""
ElastiCache Security Configuration Script
========================================

This script configures security groups and network access for AWS ElastiCache Redis cluster.
It ensures proper isolation and least-privilege access for production deployments.

Features:
- Creates dedicated security groups for ElastiCache
- Configures API server security group access
- Sets up VPC networking rules
- Validates security configuration
- Provides security recommendations

Usage:
    python scripts/configure_elasticache_security.py --cluster-id bookedbarber-redis --api-sg-id sg-12345678

Requirements:
    pip install boto3 click colorama
"""

import boto3
import click
import sys
from typing import Dict, Optional
from colorama import init, Fore, Style
import ipaddress

# Initialize colorama
init(autoreset=True)

class ElastiCacheSecurityManager:
    """Manages security configuration for ElastiCache clusters."""
    
    def __init__(self, region: str = 'us-east-1'):
        """Initialize AWS clients."""
        try:
            self.region = region
            self.session = boto3.Session()
            self.ec2 = self.session.client('ec2', region_name=region)
            self.elasticache = self.session.client('elasticache', region_name=region)
            
            # Verify credentials
            sts = self.session.client('sts')
            account = sts.get_caller_identity()
            self.account_id = account['Account']
            
            click.echo(f"{Fore.GREEN}✅ AWS credentials verified for account: {self.account_id}")
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ AWS credentials error: {e}")
            sys.exit(1)
    
    def get_vpc_from_cluster(self, cluster_id: str) -> Optional[Dict]:
        """Get VPC information from ElastiCache cluster."""
        try:
            # Get cluster information
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id,
                ShowCacheNodeInfo=True
            )
            
            if not response['CacheClusters']:
                click.echo(f"{Fore.RED}❌ Cluster {cluster_id} not found")
                return None
            
            cluster = response['CacheClusters'][0]
            
            # Get subnet group to find VPC
            if 'CacheSubnetGroupName' in cluster:
                subnet_group_name = cluster['CacheSubnetGroupName']
                subnet_response = self.elasticache.describe_cache_subnet_groups(
                    CacheSubnetGroupName=subnet_group_name
                )
                
                if subnet_response['CacheSubnetGroups']:
                    subnet_group = subnet_response['CacheSubnetGroups'][0]
                    if subnet_group['Subnets']:
                        subnet_id = subnet_group['Subnets'][0]['SubnetIdentifier']
                        
                        # Get VPC from subnet
                        subnet_response = self.ec2.describe_subnets(SubnetIds=[subnet_id])
                        if subnet_response['Subnets']:
                            vpc_id = subnet_response['Subnets'][0]['VpcId']
                            
                            # Get VPC details
                            vpc_response = self.ec2.describe_vpcs(VpcIds=[vpc_id])
                            if vpc_response['Vpcs']:
                                return vpc_response['Vpcs'][0]
            
            return None
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error getting VPC from cluster: {e}")
            return None
    
    def get_existing_security_group(self, group_name: str, vpc_id: str) -> Optional[Dict]:
        """Get existing security group by name and VPC."""
        try:
            response = self.ec2.describe_security_groups(
                Filters=[
                    {'Name': 'group-name', 'Values': [group_name]},
                    {'Name': 'vpc-id', 'Values': [vpc_id]}
                ]
            )
            
            if response['SecurityGroups']:
                return response['SecurityGroups'][0]
            
            return None
            
        except Exception as e:
            click.echo(f"{Fore.YELLOW}⚠️  Error checking security group: {e}")
            return None
    
    def create_elasticache_security_group(self, cluster_id: str, vpc_id: str, vpc_cidr: str) -> str:
        """Create security group for ElastiCache cluster."""
        sg_name = f"{cluster_id}-elasticache-sg"
        sg_description = f"Security group for {cluster_id} ElastiCache cluster"
        
        # Check if security group already exists
        existing_sg = self.get_existing_security_group(sg_name, vpc_id)
        if existing_sg:
            click.echo(f"{Fore.GREEN}✅ ElastiCache security group already exists: {existing_sg['GroupId']}")
            return existing_sg['GroupId']
        
        try:
            # Create security group
            response = self.ec2.create_security_group(
                GroupName=sg_name,
                Description=sg_description,
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': [
                            {'Key': 'Name', 'Value': sg_name},
                            {'Key': 'Project', 'Value': 'BookedBarber'},
                            {'Key': 'Environment', 'Value': 'production'},
                            {'Key': 'Purpose', 'Value': 'ElastiCache-Redis'},
                            {'Key': 'ManagedBy', 'Value': 'elasticache-security-script'}
                        ]
                    }
                ]
            )
            
            sg_id = response['GroupId']
            click.echo(f"{Fore.GREEN}✅ Created ElastiCache security group: {sg_id}")
            
            # Add inbound rule for Redis (restricted to VPC CIDR)
            self.ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 6379,
                        'ToPort': 6379,
                        'IpRanges': [
                            {
                                'CidrIp': vpc_cidr,
                                'Description': 'Redis access from VPC'
                            }
                        ]
                    }
                ]
            )
            
            click.echo(f"{Fore.GREEN}✅ Added Redis port rule (6379) for VPC CIDR: {vpc_cidr}")
            
            return sg_id
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating ElastiCache security group: {e}")
            raise
    
    def configure_api_security_group(self, api_sg_id: str, elasticache_sg_id: str) -> bool:
        """Configure API server security group to access ElastiCache."""
        try:
            # Get current rules to avoid duplicates
            response = self.ec2.describe_security_groups(GroupIds=[api_sg_id])
            if not response['SecurityGroups']:
                click.echo(f"{Fore.RED}❌ API security group not found: {api_sg_id}")
                return False
            
            api_sg = response['SecurityGroups'][0]
            
            # Check if rule already exists
            for rule in api_sg.get('IpPermissions', []):
                if rule.get('IpProtocol') == 'tcp' and rule.get('FromPort') == 6379:
                    for group in rule.get('UserIdGroupPairs', []):
                        if group.get('GroupId') == elasticache_sg_id:
                            click.echo(f"{Fore.GREEN}✅ API security group already has ElastiCache access rule")
                            return True
            
            # Add outbound rule to API security group
            self.ec2.authorize_security_group_egress(
                GroupId=api_sg_id,
                IpPermissions=[
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 6379,
                        'ToPort': 6379,
                        'UserIdGroupPairs': [
                            {
                                'GroupId': elasticache_sg_id,
                                'Description': 'Redis access to ElastiCache'
                            }
                        ]
                    }
                ]
            )
            
            click.echo(f"{Fore.GREEN}✅ Added outbound rule to API security group for ElastiCache access")
            
            # Add corresponding inbound rule to ElastiCache security group
            self.ec2.authorize_security_group_ingress(
                GroupId=elasticache_sg_id,
                IpPermissions=[
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 6379,
                        'ToPort': 6379,
                        'UserIdGroupPairs': [
                            {
                                'GroupId': api_sg_id,
                                'Description': 'Redis access from API servers'
                            }
                        ]
                    }
                ]
            )
            
            click.echo(f"{Fore.GREEN}✅ Added inbound rule to ElastiCache security group from API servers")
            
            return True
            
        except Exception as e:
            if 'already exists' in str(e).lower():
                click.echo(f"{Fore.GREEN}✅ Security group rules already exist")
                return True
            else:
                click.echo(f"{Fore.RED}❌ Error configuring API security group: {e}")
                return False
    
    def add_management_access(self, elasticache_sg_id: str, management_cidr: str) -> bool:
        """Add management access to ElastiCache security group."""
        try:
            # Validate CIDR
            try:
                ipaddress.ip_network(management_cidr, strict=False)
            except ValueError:
                click.echo(f"{Fore.RED}❌ Invalid CIDR format: {management_cidr}")
                return False
            
            # Add inbound rule for management access
            self.ec2.authorize_security_group_ingress(
                GroupId=elasticache_sg_id,
                IpPermissions=[
                    {
                        'IpProtocol': 'tcp',
                        'FromPort': 6379,
                        'ToPort': 6379,
                        'IpRanges': [
                            {
                                'CidrIp': management_cidr,
                                'Description': 'Management access to Redis'
                            }
                        ]
                    }
                ]
            )
            
            click.echo(f"{Fore.GREEN}✅ Added management access rule for CIDR: {management_cidr}")
            return True
            
        except Exception as e:
            if 'already exists' in str(e).lower():
                click.echo(f"{Fore.GREEN}✅ Management access rule already exists")
                return True
            else:
                click.echo(f"{Fore.RED}❌ Error adding management access: {e}")
                return False
    
    def validate_security_configuration(self, elasticache_sg_id: str, api_sg_id: Optional[str] = None) -> Dict:
        """Validate security configuration and provide recommendations."""
        validation_results = {
            'status': 'unknown',
            'issues': [],
            'recommendations': [],
            'security_score': 0
        }
        
        try:
            # Get ElastiCache security group details
            response = self.ec2.describe_security_groups(GroupIds=[elasticache_sg_id])
            if not response['SecurityGroups']:
                validation_results['issues'].append("ElastiCache security group not found")
                return validation_results
            
            elasticache_sg = response['SecurityGroups'][0]
            score = 0
            max_score = 100
            
            # Check inbound rules
            inbound_rules = elasticache_sg.get('IpPermissions', [])
            redis_rules = [rule for rule in inbound_rules if rule.get('FromPort') == 6379]
            
            if not redis_rules:
                validation_results['issues'].append("No Redis port (6379) rules found")
            else:
                score += 20
            
            # Check for overly permissive rules
            for rule in redis_rules:
                for ip_range in rule.get('IpRanges', []):
                    cidr = ip_range.get('CidrIp', '')
                    if cidr == '0.0.0.0/0':
                        validation_results['issues'].append("⚠️  CRITICAL: Redis port open to internet (0.0.0.0/0)")
                        score -= 50
                    elif cidr.endswith('/0'):
                        validation_results['issues'].append(f"⚠️  WARNING: Very broad CIDR range: {cidr}")
                        score -= 10
                    else:
                        score += 20
            
            # Check for security group references (preferred over IP ranges)
            sg_references = 0
            for rule in redis_rules:
                sg_references += len(rule.get('UserIdGroupPairs', []))
            
            if sg_references > 0:
                score += 30
                validation_results['recommendations'].append("✅ Good: Using security group references for access control")
            else:
                validation_results['recommendations'].append("💡 Consider using security group references instead of IP ranges")
            
            # Check encryption (from cluster config)
            try:
                cluster_response = self.elasticache.describe_cache_clusters(
                    ShowCacheNodeInfo=True
                )
                for cluster in cluster_response['CacheClusters']:
                    if any(sg['SecurityGroupId'] == elasticache_sg_id for sg in cluster.get('SecurityGroups', [])):
                        if cluster.get('TransitEncryptionEnabled'):
                            score += 15
                            validation_results['recommendations'].append("✅ Good: Transit encryption enabled")
                        else:
                            validation_results['issues'].append("⚠️  WARNING: Transit encryption not enabled")
                        
                        if cluster.get('AtRestEncryptionEnabled'):
                            score += 15
                            validation_results['recommendations'].append("✅ Good: At-rest encryption enabled")
                        else:
                            validation_results['issues'].append("⚠️  WARNING: At-rest encryption not enabled")
                        break
            except Exception:
                pass
            
            # Overall assessment
            validation_results['security_score'] = max(0, min(100, score))
            
            if validation_results['security_score'] >= 80:
                validation_results['status'] = 'excellent'
            elif validation_results['security_score'] >= 60:
                validation_results['status'] = 'good'
            elif validation_results['security_score'] >= 40:
                validation_results['status'] = 'needs_improvement'
            else:
                validation_results['status'] = 'critical_issues'
            
            # Add general recommendations
            if not validation_results['issues']:
                validation_results['recommendations'].append("✅ No critical security issues found")
            
            validation_results['recommendations'].extend([
                "💡 Regularly review and audit security group rules",
                "💡 Use VPC Flow Logs to monitor network traffic",
                "💡 Consider using AWS Config for compliance monitoring",
                "💡 Set up CloudWatch alerts for unusual network patterns"
            ])
            
            return validation_results
            
        except Exception as e:
            validation_results['issues'].append(f"Error during validation: {e}")
            return validation_results
    
    def generate_security_report(self, elasticache_sg_id: str, api_sg_id: Optional[str] = None) -> str:
        """Generate comprehensive security report."""
        report = []
        report.append("ElastiCache Security Configuration Report")
        report.append("="*50)
        report.append(f"Generated: {click.get_current_context().meta.get('timestamp', 'Unknown')}")
        report.append(f"ElastiCache Security Group: {elasticache_sg_id}")
        if api_sg_id:
            report.append(f"API Security Group: {api_sg_id}")
        report.append("")
        
        # Get validation results
        validation = self.validate_security_configuration(elasticache_sg_id, api_sg_id)
        
        report.append(f"Security Score: {validation['security_score']}/100 ({validation['status'].upper()})")
        report.append("")
        
        if validation['issues']:
            report.append("🚨 SECURITY ISSUES:")
            for issue in validation['issues']:
                report.append(f"  - {issue}")
            report.append("")
        
        if validation['recommendations']:
            report.append("💡 RECOMMENDATIONS:")
            for rec in validation['recommendations']:
                report.append(f"  - {rec}")
            report.append("")
        
        # Get detailed security group information
        try:
            response = self.ec2.describe_security_groups(GroupIds=[elasticache_sg_id])
            if response['SecurityGroups']:
                sg = response['SecurityGroups'][0]
                
                report.append("📋 SECURITY GROUP DETAILS:")
                report.append(f"  Group ID: {sg['GroupId']}")
                report.append(f"  Group Name: {sg['GroupName']}")
                report.append(f"  VPC ID: {sg['VpcId']}")
                report.append(f"  Description: {sg['Description']}")
                report.append("")
                
                report.append("🔒 INBOUND RULES:")
                if sg.get('IpPermissions'):
                    for rule in sg['IpPermissions']:
                        protocol = rule.get('IpProtocol', 'unknown')
                        from_port = rule.get('FromPort', 'N/A')
                        to_port = rule.get('ToPort', 'N/A')
                        
                        for ip_range in rule.get('IpRanges', []):
                            cidr = ip_range.get('CidrIp', 'unknown')
                            desc = ip_range.get('Description', 'No description')
                            report.append(f"  - {protocol}:{from_port}-{to_port} from {cidr} ({desc})")
                        
                        for sg_ref in rule.get('UserIdGroupPairs', []):
                            ref_sg_id = sg_ref.get('GroupId', 'unknown')
                            desc = sg_ref.get('Description', 'No description')
                            report.append(f"  - {protocol}:{from_port}-{to_port} from {ref_sg_id} ({desc})")
                else:
                    report.append("  - No inbound rules")
                
                report.append("")
        
        except Exception as e:
            report.append(f"Error getting security group details: {e}")
        
        return "\n".join(report)


@click.command()
@click.option('--cluster-id', required=True, help='ElastiCache cluster ID')
@click.option('--api-sg-id', help='API server security group ID')
@click.option('--management-cidr', help='CIDR block for management access (e.g., 10.0.1.0/24)')
@click.option('--region', default='us-east-1', help='AWS region')
@click.option('--validate-only', is_flag=True, help='Only validate existing configuration')
@click.option('--report-file', help='Save security report to file')
def main(cluster_id: str, api_sg_id: str, management_cidr: str, region: str, validate_only: bool, report_file: str):
    """Configure security groups and network access for ElastiCache Redis cluster."""
    
    # Add timestamp to context for reporting
    ctx = click.get_current_context()
    ctx.meta['timestamp'] = click.DateTime().convert(click.get_current_context().params, None, None)
    
    try:
        # Initialize security manager
        manager = ElastiCacheSecurityManager(region=region)
        
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}🔒 ElastiCache Security Configuration")
        click.echo(f"{Fore.CYAN}{'='*50}{Style.RESET_ALL}")
        
        # Get VPC information from cluster
        vpc = manager.get_vpc_from_cluster(cluster_id)
        if not vpc:
            click.echo(f"{Fore.RED}❌ Could not determine VPC for cluster: {cluster_id}")
            sys.exit(1)
        
        vpc_id = vpc['VpcId']
        vpc_cidr = vpc['CidrBlock']
        
        click.echo(f"{Fore.GREEN}✅ Cluster VPC: {vpc_id} ({vpc_cidr})")
        
        if validate_only:
            # Validation only mode
            click.echo(f"{Fore.BLUE}🔍 Validating existing security configuration...")
            
            # Find ElastiCache security group
            elasticache_sg_name = f"{cluster_id}-elasticache-sg"
            elasticache_sg = manager.get_existing_security_group(elasticache_sg_name, vpc_id)
            
            if not elasticache_sg:
                click.echo(f"{Fore.RED}❌ ElastiCache security group not found: {elasticache_sg_name}")
                sys.exit(1)
            
            elasticache_sg_id = elasticache_sg['GroupId']
            validation = manager.validate_security_configuration(elasticache_sg_id, api_sg_id)
            
            # Display validation results
            status_colors = {
                'excellent': Fore.GREEN,
                'good': Fore.CYAN,
                'needs_improvement': Fore.YELLOW,
                'critical_issues': Fore.RED
            }
            
            color = status_colors.get(validation['status'], Fore.WHITE)
            click.echo(f"{color}📊 Security Score: {validation['security_score']}/100 ({validation['status'].upper()})")
            
            if validation['issues']:
                click.echo(f"\n{Fore.RED}🚨 Issues Found:")
                for issue in validation['issues']:
                    click.echo(f"  {issue}")
            
            if validation['recommendations']:
                click.echo(f"\n{Fore.BLUE}💡 Recommendations:")
                for rec in validation['recommendations']:
                    click.echo(f"  {rec}")
        
        else:
            # Full configuration mode
            click.echo(f"{Fore.BLUE}🛠️  Configuring security groups...")
            
            # Create or get ElastiCache security group
            elasticache_sg_id = manager.create_elasticache_security_group(cluster_id, vpc_id, vpc_cidr)
            
            # Configure API server access
            if api_sg_id:
                click.echo(f"{Fore.BLUE}🔗 Configuring API server access...")
                if manager.configure_api_security_group(api_sg_id, elasticache_sg_id):
                    click.echo(f"{Fore.GREEN}✅ API server access configured")
                else:
                    click.echo(f"{Fore.YELLOW}⚠️  API server access configuration had issues")
            
            # Add management access
            if management_cidr:
                click.echo(f"{Fore.BLUE}👤 Adding management access...")
                if manager.add_management_access(elasticache_sg_id, management_cidr):
                    click.echo(f"{Fore.GREEN}✅ Management access configured")
                else:
                    click.echo(f"{Fore.YELLOW}⚠️  Management access configuration had issues")
            
            # Validate final configuration
            validation = manager.validate_security_configuration(elasticache_sg_id, api_sg_id)
            
            status_colors = {
                'excellent': Fore.GREEN,
                'good': Fore.CYAN,
                'needs_improvement': Fore.YELLOW,
                'critical_issues': Fore.RED
            }
            
            color = status_colors.get(validation['status'], Fore.WHITE)
            click.echo(f"\n{color}📊 Final Security Score: {validation['security_score']}/100 ({validation['status'].upper()})")
            
            click.echo(f"\n{Fore.GREEN}🎉 Security configuration complete!")
            click.echo(f"{Fore.GREEN}ElastiCache Security Group: {elasticache_sg_id}")
        
        # Generate and save report
        if report_file:
            # Find ElastiCache security group ID for report
            if validate_only:
                elasticache_sg_name = f"{cluster_id}-elasticache-sg"
                elasticache_sg = manager.get_existing_security_group(elasticache_sg_name, vpc_id)
                elasticache_sg_id = elasticache_sg['GroupId'] if elasticache_sg else 'unknown'
            
            report = manager.generate_security_report(elasticache_sg_id, api_sg_id)
            
            with open(report_file, 'w') as f:
                f.write(report)
            
            click.echo(f"{Fore.GREEN}📄 Security report saved to: {report_file}")
        
        # Display next steps
        click.echo(f"\n{Fore.BLUE}Next Steps:")
        click.echo("1. Update your application security group to allow outbound access to ElastiCache")
        click.echo("2. Test Redis connectivity from your application servers")
        click.echo("3. Monitor network traffic using VPC Flow Logs")
        click.echo("4. Set up CloudWatch alerts for security events")
        
    except KeyboardInterrupt:
        click.echo(f"\n{Fore.YELLOW}⚠️  Configuration interrupted by user")
        sys.exit(1)
    except Exception as e:
        click.echo(f"\n{Fore.RED}❌ Configuration failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()