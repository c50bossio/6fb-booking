#!/usr/bin/env python3
"""
CloudWatch Alerts Configuration for ElastiCache Redis
===================================================

This script sets up comprehensive CloudWatch monitoring and alerting for 
BookedBarber's ElastiCache Redis clusters.

Features:
- Creates CloudWatch alarms for critical Redis metrics
- Sets up SNS topics for notifications
- Configures email and SMS alerts
- Provides performance monitoring recommendations
- Creates custom dashboards

Usage:
    python monitoring/cloudwatch_alerts.py --cluster-id bookedbarber-redis --email ops@bookedbarber.com

Requirements:
    pip install boto3 click colorama
"""

import boto3
import click
import json
import time
from typing import Dict, List, Optional
from colorama import init, Fore, Style

# Initialize colorama
init(autoreset=True)

class CloudWatchAlertsManager:
    """Manages CloudWatch alerts and monitoring for ElastiCache."""
    
    def __init__(self, region: str = 'us-east-1'):
        """Initialize CloudWatch and SNS clients."""
        try:
            self.region = region
            self.session = boto3.Session()
            self.cloudwatch = self.session.client('cloudwatch', region_name=region)
            self.sns = self.session.client('sns', region_name=region)
            self.elasticache = self.session.client('elasticache', region_name=region)
            
            # Verify credentials
            sts = self.session.client('sts')
            identity = sts.get_caller_identity()
            self.account_id = identity['Account']
            
            click.echo(f"{Fore.GREEN}✅ CloudWatch setup initialized for account: {self.account_id}")
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error initializing CloudWatch: {e}")
            raise
    
    def create_sns_topic(self, topic_name: str, email: Optional[str] = None, 
                        phone: Optional[str] = None) -> str:
        """Create SNS topic for alerts."""
        try:
            # Check if topic already exists
            topics = self.sns.list_topics()
            for topic in topics['Topics']:
                if topic_name in topic['TopicArn']:
                    topic_arn = topic['TopicArn']
                    click.echo(f"{Fore.GREEN}✅ SNS topic already exists: {topic_name}")
                    break
            else:
                # Create new topic
                response = self.sns.create_topic(
                    Name=topic_name,
                    Tags=[
                        {'Key': 'Project', 'Value': 'BookedBarber'},
                        {'Key': 'Environment', 'Value': 'production'},
                        {'Key': 'Purpose', 'Value': 'Redis-Alerts'}
                    ]
                )
                topic_arn = response['TopicArn']
                click.echo(f"{Fore.GREEN}✅ Created SNS topic: {topic_name}")
            
            # Subscribe email if provided
            if email:
                try:
                    self.sns.subscribe(
                        TopicArn=topic_arn,
                        Protocol='email',
                        Endpoint=email
                    )
                    click.echo(f"{Fore.GREEN}✅ Email subscription added: {email}")
                    click.echo(f"{Fore.YELLOW}📧 Please check email and confirm subscription!")
                except Exception as e:
                    click.echo(f"{Fore.YELLOW}⚠️  Could not add email subscription: {e}")
            
            # Subscribe SMS if provided
            if phone:
                try:
                    self.sns.subscribe(
                        TopicArn=topic_arn,
                        Protocol='sms',
                        Endpoint=phone
                    )
                    click.echo(f"{Fore.GREEN}✅ SMS subscription added: {phone}")
                except Exception as e:
                    click.echo(f"{Fore.YELLOW}⚠️  Could not add SMS subscription: {e}")
            
            return topic_arn
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating SNS topic: {e}")
            raise
    
    def create_alarm(self, alarm_config: Dict) -> bool:
        """Create CloudWatch alarm."""
        try:
            self.cloudwatch.put_metric_alarm(**alarm_config)
            click.echo(f"{Fore.GREEN}✅ Created alarm: {alarm_config['AlarmName']}")
            return True
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating alarm {alarm_config['AlarmName']}: {e}")
            return False
    
    def get_redis_alarm_configs(self, cluster_id: str, topic_arn: str) -> List[Dict]:
        """Get Redis alarm configurations."""
        
        alarm_configs = [
            # High CPU Usage
            {
                'AlarmName': f'{cluster_id}-high-cpu',
                'ComparisonOperator': 'GreaterThanThreshold',
                'EvaluationPeriods': 2,
                'MetricName': 'CPUUtilization',
                'Namespace': 'AWS/ElastiCache',
                'Period': 300,
                'Statistic': 'Average',
                'Threshold': 70.0,
                'ActionsEnabled': True,
                'AlarmActions': [topic_arn],
                'AlarmDescription': f'High CPU usage on Redis cluster {cluster_id}',
                'Dimensions': [
                    {
                        'Name': 'CacheClusterId',
                        'Value': cluster_id
                    }
                ],
                'Unit': 'Percent',
                'TreatMissingData': 'notBreaching',
                'Tags': [
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Environment', 'Value': 'production'},
                    {'Key': 'AlertType', 'Value': 'Performance'}
                ]
            },
            
            # High Memory Usage
            {
                'AlarmName': f'{cluster_id}-high-memory',
                'ComparisonOperator': 'GreaterThanThreshold',
                'EvaluationPeriods': 2,
                'MetricName': 'DatabaseMemoryUsagePercentage',
                'Namespace': 'AWS/ElastiCache',
                'Period': 300,
                'Statistic': 'Average',
                'Threshold': 80.0,
                'ActionsEnabled': True,
                'AlarmActions': [topic_arn],
                'AlarmDescription': f'High memory usage on Redis cluster {cluster_id}',
                'Dimensions': [
                    {
                        'Name': 'CacheClusterId',
                        'Value': cluster_id
                    }
                ],
                'Unit': 'Percent',
                'TreatMissingData': 'notBreaching',
                'Tags': [
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Environment', 'Value': 'production'},
                    {'Key': 'AlertType', 'Value': 'Performance'}
                ]
            },
            
            # Low Cache Hit Rate
            {
                'AlarmName': f'{cluster_id}-low-hit-rate',
                'ComparisonOperator': 'LessThanThreshold',
                'EvaluationPeriods': 3,
                'MetricName': 'CacheHitRate',
                'Namespace': 'AWS/ElastiCache',
                'Period': 300,
                'Statistic': 'Average',
                'Threshold': 85.0,
                'ActionsEnabled': True,
                'AlarmActions': [topic_arn],
                'AlarmDescription': f'Low cache hit rate on Redis cluster {cluster_id}',
                'Dimensions': [
                    {
                        'Name': 'CacheClusterId',
                        'Value': cluster_id
                    }
                ],
                'Unit': 'Percent',
                'TreatMissingData': 'notBreaching',
                'Tags': [
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Environment', 'Value': 'production'},
                    {'Key': 'AlertType', 'Value': 'Performance'}
                ]
            },
            
            # High Connection Count
            {
                'AlarmName': f'{cluster_id}-high-connections',
                'ComparisonOperator': 'GreaterThanThreshold',
                'EvaluationPeriods': 2,
                'MetricName': 'CurrConnections',
                'Namespace': 'AWS/ElastiCache',
                'Period': 300,
                'Statistic': 'Average',
                'Threshold': 45.0,
                'ActionsEnabled': True,
                'AlarmActions': [topic_arn],
                'AlarmDescription': f'High connection count on Redis cluster {cluster_id}',
                'Dimensions': [
                    {
                        'Name': 'CacheClusterId',
                        'Value': cluster_id
                    }
                ],
                'Unit': 'Count',
                'TreatMissingData': 'notBreaching',
                'Tags': [
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Environment', 'Value': 'production'},
                    {'Key': 'AlertType', 'Value': 'Capacity'}
                ]
            },
            
            # High Evictions
            {
                'AlarmName': f'{cluster_id}-high-evictions',
                'ComparisonOperator': 'GreaterThanThreshold',
                'EvaluationPeriods': 2,
                'MetricName': 'Evictions',
                'Namespace': 'AWS/ElastiCache',
                'Period': 300,
                'Statistic': 'Sum',
                'Threshold': 100.0,
                'ActionsEnabled': True,
                'AlarmActions': [topic_arn],
                'AlarmDescription': f'High evictions on Redis cluster {cluster_id}',
                'Dimensions': [
                    {
                        'Name': 'CacheClusterId',
                        'Value': cluster_id
                    }
                ],
                'Unit': 'Count',
                'TreatMissingData': 'notBreaching',
                'Tags': [
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Environment', 'Value': 'production'},
                    {'Key': 'AlertType', 'Value': 'Memory'}
                ]
            },
            
            # High Network Traffic
            {
                'AlarmName': f'{cluster_id}-high-network-in',
                'ComparisonOperator': 'GreaterThanThreshold',
                'EvaluationPeriods': 2,
                'MetricName': 'NetworkBytesIn',
                'Namespace': 'AWS/ElastiCache',
                'Period': 300,
                'Statistic': 'Average',
                'Threshold': 10000000.0,  # 10MB
                'ActionsEnabled': True,
                'AlarmActions': [topic_arn],
                'AlarmDescription': f'High network input on Redis cluster {cluster_id}',
                'Dimensions': [
                    {
                        'Name': 'CacheClusterId',
                        'Value': cluster_id
                    }
                ],
                'Unit': 'Bytes',
                'TreatMissingData': 'notBreaching',
                'Tags': [
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Environment', 'Value': 'production'},
                    {'Key': 'AlertType', 'Value': 'Network'}
                ]
            },
            
            # High Network Output
            {
                'AlarmName': f'{cluster_id}-high-network-out',
                'ComparisonOperator': 'GreaterThanThreshold',
                'EvaluationPeriods': 2,
                'MetricName': 'NetworkBytesOut',
                'Namespace': 'AWS/ElastiCache',
                'Period': 300,
                'Statistic': 'Average',
                'Threshold': 10000000.0,  # 10MB
                'ActionsEnabled': True,
                'AlarmActions': [topic_arn],
                'AlarmDescription': f'High network output on Redis cluster {cluster_id}',
                'Dimensions': [
                    {
                        'Name': 'CacheClusterId',
                        'Value': cluster_id
                    }
                ],
                'Unit': 'Bytes',
                'TreatMissingData': 'notBreaching',
                'Tags': [
                    {'Key': 'Project', 'Value': 'BookedBarber'},
                    {'Key': 'Environment', 'Value': 'production'},
                    {'Key': 'AlertType', 'Value': 'Network'}
                ]
            }
        ]
        
        return alarm_configs
    
    def create_dashboard(self, cluster_id: str, dashboard_name: Optional[str] = None) -> bool:
        """Create CloudWatch dashboard."""
        if not dashboard_name:
            dashboard_name = f"BookedBarber-Redis-{cluster_id}"
        
        try:
            # Read dashboard template
            dashboard_file = 'monitoring/cloudwatch_redis_dashboard.json'
            
            try:
                with open(dashboard_file, 'r') as f:
                    dashboard_body = f.read()
                
                # Replace cluster ID in dashboard
                dashboard_body = dashboard_body.replace('bookedbarber-redis-prod', cluster_id)
                
                # Validate JSON
                json.loads(dashboard_body)
                
            except FileNotFoundError:
                # Create basic dashboard if template not found
                dashboard_body = json.dumps({
                    "widgets": [
                        {
                            "type": "metric",
                            "properties": {
                                "metrics": [
                                    ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", cluster_id],
                                    [".", "DatabaseMemoryUsagePercentage", ".", "."],
                                    [".", "CacheHits", ".", "."],
                                    [".", "CacheMisses", ".", "."],
                                    [".", "CurrConnections", ".", "."]
                                ],
                                "period": 300,
                                "stat": "Average",
                                "region": self.region,
                                "title": f"Redis Metrics - {cluster_id}"
                            }
                        }
                    ]
                })
            
            # Create dashboard
            self.cloudwatch.put_dashboard(
                DashboardName=dashboard_name,
                DashboardBody=dashboard_body
            )
            
            click.echo(f"{Fore.GREEN}✅ Created CloudWatch dashboard: {dashboard_name}")
            dashboard_url = f"https://console.aws.amazon.com/cloudwatch/home?region={self.region}#dashboards:name={dashboard_name}"
            click.echo(f"{Fore.BLUE}🔗 Dashboard URL: {dashboard_url}")
            
            return True
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error creating dashboard: {e}")
            return False
    
    def validate_cluster_exists(self, cluster_id: str) -> bool:
        """Validate that the ElastiCache cluster exists."""
        try:
            response = self.elasticache.describe_cache_clusters(
                CacheClusterId=cluster_id
            )
            
            if response['CacheClusters']:
                cluster = response['CacheClusters'][0]
                status = cluster['CacheClusterStatus']
                
                if status == 'available':
                    click.echo(f"{Fore.GREEN}✅ Cluster {cluster_id} is available")
                    return True
                else:
                    click.echo(f"{Fore.YELLOW}⚠️  Cluster {cluster_id} status: {status}")
                    return False
            else:
                click.echo(f"{Fore.RED}❌ Cluster {cluster_id} not found")
                return False
                
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error validating cluster: {e}")
            return False
    
    def setup_complete_monitoring(self, cluster_id: str, email: Optional[str] = None,
                                 phone: Optional[str] = None, 
                                 custom_thresholds: Optional[Dict] = None) -> bool:
        """Set up complete monitoring for Redis cluster."""
        
        click.echo(f"{Fore.CYAN}{Style.BRIGHT}📊 Setting up CloudWatch monitoring for {cluster_id}")
        click.echo(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        
        # Validate cluster exists
        if not self.validate_cluster_exists(cluster_id):
            return False
        
        # Create SNS topic
        topic_name = f"bookedbarber-redis-alerts-{cluster_id}"
        topic_arn = self.create_sns_topic(topic_name, email, phone)
        
        # Get alarm configurations
        alarm_configs = self.get_redis_alarm_configs(cluster_id, topic_arn)
        
        # Apply custom thresholds if provided
        if custom_thresholds:
            for alarm_config in alarm_configs:
                alarm_name = alarm_config['AlarmName']
                for custom_name, custom_threshold in custom_thresholds.items():
                    if custom_name in alarm_name:
                        alarm_config['Threshold'] = custom_threshold
                        click.echo(f"{Fore.BLUE}ℹ️  Applied custom threshold for {alarm_name}: {custom_threshold}")
        
        # Create alarms
        success_count = 0
        for alarm_config in alarm_configs:
            if self.create_alarm(alarm_config):
                success_count += 1
        
        click.echo(f"{Fore.GREEN}✅ Created {success_count}/{len(alarm_configs)} alarms")
        
        # Create dashboard
        dashboard_success = self.create_dashboard(cluster_id)
        
        # Summary
        if success_count == len(alarm_configs) and dashboard_success:
            click.echo(f"\n{Fore.GREEN}🎉 CloudWatch monitoring setup complete!")
            click.echo(f"{Fore.GREEN}   SNS Topic: {topic_arn}")
            click.echo(f"{Fore.GREEN}   Alarms: {success_count} created")
            click.echo(f"{Fore.GREEN}   Dashboard: Created")
            
            if email:
                click.echo(f"\n{Fore.YELLOW}📧 IMPORTANT: Check your email ({email}) and confirm the SNS subscription!")
            
            return True
        else:
            click.echo(f"\n{Fore.YELLOW}⚠️  Monitoring setup completed with some issues")
            return False
    
    def test_alert(self, cluster_id: str) -> bool:
        """Test alert system by creating a test alarm."""
        try:
            test_alarm_name = f"{cluster_id}-test-alert"
            
            # Create a test alarm that will trigger
            test_alarm_config = {
                'AlarmName': test_alarm_name,
                'ComparisonOperator': 'GreaterThanThreshold',
                'EvaluationPeriods': 1,
                'MetricName': 'CPUUtilization',
                'Namespace': 'AWS/ElastiCache',
                'Period': 60,
                'Statistic': 'Average',
                'Threshold': 0.1,  # Very low threshold to trigger immediately
                'ActionsEnabled': True,
                'AlarmDescription': f'Test alarm for Redis cluster {cluster_id}',
                'Dimensions': [
                    {
                        'Name': 'CacheClusterId',
                        'Value': cluster_id
                    }
                ],
                'Unit': 'Percent',
                'TreatMissingData': 'breaching'
            }
            
            # Create test alarm
            self.create_alarm(test_alarm_config)
            
            click.echo(f"{Fore.BLUE}⏳ Test alarm created. Waiting for alert...")
            time.sleep(30)
            
            # Check alarm state
            response = self.cloudwatch.describe_alarms(
                AlarmNames=[test_alarm_name]
            )
            
            if response['MetricAlarms']:
                alarm = response['MetricAlarms'][0]
                state = alarm['StateValue']
                click.echo(f"{Fore.BLUE}🔔 Test alarm state: {state}")
                
                # Clean up test alarm
                self.cloudwatch.delete_alarms(AlarmNames=[test_alarm_name])
                click.echo(f"{Fore.GREEN}✅ Test alarm cleaned up")
                
                return state == 'ALARM'
            
            return False
            
        except Exception as e:
            click.echo(f"{Fore.RED}❌ Error testing alerts: {e}")
            return False


@click.command()
@click.option('--cluster-id', required=True, help='ElastiCache cluster ID')
@click.option('--email', help='Email address for alerts')
@click.option('--phone', help='Phone number for SMS alerts (format: +1234567890)')
@click.option('--region', default='us-east-1', help='AWS region')
@click.option('--test-alerts', is_flag=True, help='Test alert system')
@click.option('--custom-cpu-threshold', type=float, help='Custom CPU threshold (default: 70%)')
@click.option('--custom-memory-threshold', type=float, help='Custom memory threshold (default: 80%)')
@click.option('--custom-hit-rate-threshold', type=float, help='Custom hit rate threshold (default: 85%)')
def main(cluster_id: str, email: str, phone: str, region: str, test_alerts: bool,
         custom_cpu_threshold: float, custom_memory_threshold: float, 
         custom_hit_rate_threshold: float):
    """Set up CloudWatch monitoring and alerts for ElastiCache Redis cluster."""
    
    try:
        # Initialize alerts manager
        manager = CloudWatchAlertsManager(region=region)
        
        # Build custom thresholds
        custom_thresholds = {}
        if custom_cpu_threshold:
            custom_thresholds['cpu'] = custom_cpu_threshold
        if custom_memory_threshold:
            custom_thresholds['memory'] = custom_memory_threshold
        if custom_hit_rate_threshold:
            custom_thresholds['hit-rate'] = custom_hit_rate_threshold
        
        # Set up monitoring
        success = manager.setup_complete_monitoring(
            cluster_id=cluster_id,
            email=email,
            phone=phone,
            custom_thresholds=custom_thresholds if custom_thresholds else None
        )
        
        if success:
            # Test alerts if requested
            if test_alerts:
                click.echo(f"\n{Fore.BLUE}🧪 Testing alert system...")
                test_success = manager.test_alert(cluster_id)
                
                if test_success:
                    click.echo(f"{Fore.GREEN}✅ Alert system test passed!")
                else:
                    click.echo(f"{Fore.YELLOW}⚠️  Alert system test inconclusive")
            
            # Display next steps
            click.echo(f"\n{Fore.BLUE}Next Steps:")
            click.echo("1. Confirm email subscription if provided")
            click.echo("2. Check CloudWatch dashboard for metrics")
            click.echo("3. Monitor alerts for 24-48 hours to tune thresholds")
            click.echo("4. Set up additional custom metrics as needed")
            
            # Display alarm summary
            click.echo(f"\n{Fore.CYAN}📋 Monitoring Summary:")
            click.echo(f"   CPU Threshold: {custom_cpu_threshold or 70}%")
            click.echo(f"   Memory Threshold: {custom_memory_threshold or 80}%")
            click.echo(f"   Hit Rate Threshold: {custom_hit_rate_threshold or 85}%")
            click.echo(f"   Connection Threshold: 45 connections")
            click.echo(f"   Eviction Threshold: 100 evictions/period")
            
        else:
            click.echo(f"\n{Fore.RED}❌ Monitoring setup failed")
    
    except KeyboardInterrupt:
        click.echo(f"\n{Fore.YELLOW}⚠️  Setup interrupted by user")
    except Exception as e:
        click.echo(f"\n{Fore.RED}❌ Setup failed: {e}")


if __name__ == '__main__':
    main()