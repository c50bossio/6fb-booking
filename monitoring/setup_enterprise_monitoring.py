"""
Enterprise Monitoring Setup Script for BookedBarber V2
====================================================

Complete setup and configuration script for the enterprise monitoring stack.
Handles environment setup, dependencies, and initial configuration.
"""

import os
import sys
import asyncio
import logging
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional
import tempfile

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MonitoringSetup:
    """Enterprise monitoring setup and configuration"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.monitoring_root = Path(__file__).parent
        self.config_file = self.monitoring_root / "monitoring_config.json"
        
        # Default configuration
        self.default_config = {
            "environment": os.getenv("ENVIRONMENT", "production"),
            "service_name": "bookedbarber-v2",
            "sentry": {
                "enabled": True,
                "dsn": os.getenv("SENTRY_DSN"),
                "sample_rate": 0.05,
                "traces_sample_rate": 0.01,
                "profiles_sample_rate": 0.005,
                "environment": os.getenv("ENVIRONMENT", "production"),
                "release": os.getenv("SENTRY_RELEASE", "bookedbarber-v2.3.0")
            },
            "datadog": {
                "enabled": True,
                "api_key": os.getenv("DD_API_KEY"),
                "app_key": os.getenv("DD_APP_KEY"),
                "service": "bookedbarber-api",
                "env": os.getenv("ENVIRONMENT", "production"),
                "version": "2.3.0",
                "trace_sample_rate": 0.1,
                "profiling_enabled": True,
                "logs_injection": True
            },
            "elasticsearch": {
                "enabled": True,
                "hosts": os.getenv("ELASTICSEARCH_HOSTS", "localhost:9200").split(","),
                "username": os.getenv("ELASTICSEARCH_USERNAME"),
                "password": os.getenv("ELASTICSEARCH_PASSWORD"),
                "cloud_id": os.getenv("ELASTICSEARCH_CLOUD_ID"),
                "api_key": os.getenv("ELASTICSEARCH_API_KEY"),
                "index_prefix": "bookedbarber-v2",
                "retention_days": 30
            },
            "redis": {
                "enabled": True,
                "url": os.getenv("REDIS_URL", "redis://localhost:6379"),
                "db": 0,
                "password": os.getenv("REDIS_PASSWORD")
            },
            "alerting": {
                "email": {
                    "enabled": True,
                    "smtp_host": os.getenv("SMTP_HOST", "smtp.sendgrid.net"),
                    "smtp_port": int(os.getenv("SMTP_PORT", "587")),
                    "username": os.getenv("SMTP_USERNAME"),
                    "password": os.getenv("SMTP_PASSWORD"),
                    "from_email": os.getenv("ALERT_FROM_EMAIL", "alerts@bookedbarber.com"),
                    "to_emails": os.getenv("ALERT_TO_EMAILS", "").split(",")
                },
                "slack": {
                    "enabled": True,
                    "webhook_url": os.getenv("SLACK_WEBHOOK_URL"),
                    "channel": os.getenv("SLACK_ALERT_CHANNEL", "#alerts"),
                    "username": "BookedBarber Alerts"
                },
                "pagerduty": {
                    "enabled": False,
                    "service_key": os.getenv("PAGERDUTY_SERVICE_KEY")
                },
                "sms": {
                    "enabled": False,
                    "account_sid": os.getenv("TWILIO_ACCOUNT_SID"),
                    "auth_token": os.getenv("TWILIO_AUTH_TOKEN"),
                    "from_number": os.getenv("TWILIO_PHONE_NUMBER"),
                    "to_numbers": os.getenv("ALERT_SMS_NUMBERS", "").split(",")
                }
            },
            "uptime_monitoring": {
                "enabled": True,
                "check_interval": 60,
                "timeout": 10,
                "endpoints": [
                    {
                        "name": "api_health",
                        "url": "https://api.bookedbarber.com/health",
                        "type": "https",
                        "critical": True
                    },
                    {
                        "name": "frontend_home",
                        "url": "https://bookedbarber.com",
                        "type": "https",
                        "critical": True
                    }
                ]
            },
            "business_metrics": {
                "enabled": True,
                "collection_interval": 300,
                "sla_tracking": True,
                "thresholds": {
                    "booking_success_rate": 95.0,
                    "payment_success_rate": 98.0,
                    "api_response_time": 2000,
                    "error_rate": 5.0
                }
            },
            "health_checks": {
                "enabled": True,
                "frequency": 60,
                "timeout": 30,
                "endpoints": [
                    "/health",
                    "/api/v1/health",
                    "/ready"
                ]
            }
        }
    
    def check_dependencies(self) -> Dict[str, bool]:
        """Check if required dependencies are available"""
        logger.info("Checking monitoring dependencies...")
        
        dependencies = {}
        
        # Python packages
        python_packages = [
            "sentry-sdk",
            "ddtrace",
            "elasticsearch",
            "redis",
            "aiohttp",
            "psutil",
            "numpy",
            "structlog"
        ]
        
        for package in python_packages:
            try:
                __import__(package.replace("-", "_"))
                dependencies[package] = True
                logger.info(f"✓ {package} is available")
            except ImportError:
                dependencies[package] = False
                logger.warning(f"✗ {package} is missing")
        
        # External services
        external_services = {
            "redis": self._check_redis_connection(),
            "elasticsearch": self._check_elasticsearch_connection()
        }
        
        for service, available in external_services.items():
            dependencies[service] = available
            status = "✓" if available else "✗"
            logger.info(f"{status} {service} connection")
        
        return dependencies
    
    def _check_redis_connection(self) -> bool:
        """Check Redis connection"""
        try:
            import redis
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            client = redis.from_url(redis_url)
            client.ping()
            return True
        except Exception as e:
            logger.debug(f"Redis connection failed: {e}")
            return False
    
    def _check_elasticsearch_connection(self) -> bool:
        """Check Elasticsearch connection"""
        try:
            from elasticsearch import Elasticsearch
            
            # Try different connection methods
            es_hosts = os.getenv("ELASTICSEARCH_HOSTS", "localhost:9200").split(",")
            es_cloud_id = os.getenv("ELASTICSEARCH_CLOUD_ID")
            es_api_key = os.getenv("ELASTICSEARCH_API_KEY")
            es_username = os.getenv("ELASTICSEARCH_USERNAME")
            es_password = os.getenv("ELASTICSEARCH_PASSWORD")
            
            if es_cloud_id and es_api_key:
                es = Elasticsearch(cloud_id=es_cloud_id, api_key=es_api_key)
            elif es_username and es_password:
                es = Elasticsearch(hosts=es_hosts, http_auth=(es_username, es_password))
            else:
                es = Elasticsearch(hosts=es_hosts)
            
            es.ping()
            return True
        except Exception as e:
            logger.debug(f"Elasticsearch connection failed: {e}")
            return False
    
    def install_missing_dependencies(self, dependencies: Dict[str, bool]) -> bool:
        """Install missing Python dependencies"""
        missing_packages = [pkg for pkg, available in dependencies.items() if not available and pkg not in ["redis", "elasticsearch"]]
        
        if not missing_packages:
            logger.info("All Python dependencies are available")
            return True
        
        logger.info(f"Installing missing packages: {missing_packages}")
        
        try:
            # Create requirements for missing packages
            requirements = []
            package_map = {
                "sentry-sdk": "sentry-sdk[fastapi]",
                "ddtrace": "ddtrace",
                "elasticsearch": "elasticsearch[async]",
                "redis": "redis[hiredis]",
                "aiohttp": "aiohttp",
                "psutil": "psutil",
                "numpy": "numpy",
                "structlog": "structlog"
            }
            
            for package in missing_packages:
                if package in package_map:
                    requirements.append(package_map[package])
            
            # Install packages
            if requirements:
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install"
                ] + requirements)
                
                logger.info("✓ Missing packages installed successfully")
                return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install packages: {e}")
            return False
        
        return True
    
    def create_monitoring_config(self) -> Dict[str, Any]:
        """Create monitoring configuration file"""
        logger.info("Creating monitoring configuration...")
        
        config = self.default_config.copy()
        
        # Update with environment-specific values
        env = os.getenv("ENVIRONMENT", "production")
        
        if env == "development":
            # Development-specific settings
            config["sentry"]["sample_rate"] = 1.0
            config["sentry"]["traces_sample_rate"] = 1.0
            config["datadog"]["trace_sample_rate"] = 1.0
            config["elasticsearch"]["retention_days"] = 7
            config["business_metrics"]["collection_interval"] = 60
        elif env == "staging":
            # Staging-specific settings
            config["sentry"]["sample_rate"] = 0.5
            config["sentry"]["traces_sample_rate"] = 0.1
            config["datadog"]["trace_sample_rate"] = 0.5
            config["elasticsearch"]["retention_days"] = 14
        
        # Save configuration
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        logger.info(f"✓ Configuration saved to {self.config_file}")
        return config
    
    def setup_environment_variables(self, config: Dict[str, Any]):
        """Setup environment variables for monitoring"""
        logger.info("Setting up environment variables...")
        
        env_vars = {
            # Sentry
            "SENTRY_DSN": config["sentry"]["dsn"],
            "SENTRY_ENVIRONMENT": config["sentry"]["environment"],
            "SENTRY_RELEASE": config["sentry"]["release"],
            
            # DataDog
            "DD_API_KEY": config["datadog"]["api_key"],
            "DD_APP_KEY": config["datadog"]["app_key"],
            "DD_SERVICE": config["datadog"]["service"],
            "DD_ENV": config["datadog"]["env"],
            "DD_VERSION": config["datadog"]["version"],
            "DD_TRACE_SAMPLE_RATE": str(config["datadog"]["trace_sample_rate"]),
            
            # Elasticsearch
            "ELASTICSEARCH_HOSTS": ",".join(config["elasticsearch"]["hosts"]),
            "ELK_INDEX_PREFIX": config["elasticsearch"]["index_prefix"],
            
            # Redis
            "REDIS_URL": config["redis"]["url"],
            
            # General
            "ENVIRONMENT": config["environment"],
            "SERVICE_NAME": config["service_name"]
        }
        
        # Create .env file for development
        env_file = self.project_root / ".env.monitoring"
        with open(env_file, 'w') as f:
            f.write("# BookedBarber V2 Monitoring Environment Variables\n")
            f.write("# Generated by monitoring setup script\n\n")
            
            for key, value in env_vars.items():
                if value:  # Only write non-empty values
                    f.write(f"{key}={value}\n")
        
        logger.info(f"✓ Environment variables saved to {env_file}")
        
        # Create shell script for easy sourcing
        shell_script = self.project_root / "setup_monitoring_env.sh"
        with open(shell_script, 'w') as f:
            f.write("#!/bin/bash\n")
            f.write("# BookedBarber V2 Monitoring Environment Setup\n")
            f.write("# Source this file to set up monitoring environment variables\n\n")
            
            for key, value in env_vars.items():
                if value:
                    f.write(f'export {key}="{value}"\n')
            
            f.write('\necho "Monitoring environment variables loaded"\n')
        
        # Make script executable
        os.chmod(shell_script, 0o755)
        logger.info(f"✓ Shell script created: {shell_script}")
    
    def create_monitoring_dashboard_config(self):
        """Create dashboard configuration files"""
        logger.info("Creating dashboard configurations...")
        
        # Grafana dashboard configuration
        grafana_config = {
            "dashboard": {
                "id": None,
                "title": "BookedBarber V2 - Production Monitoring",
                "tags": ["bookedbarber", "production", "monitoring"],
                "timezone": "UTC",
                "panels": [
                    {
                        "title": "System Health Overview",
                        "type": "stat",
                        "targets": [
                            {
                                "query": "system.health.overall_status",
                                "refId": "A"
                            }
                        ]
                    },
                    {
                        "title": "API Response Time",
                        "type": "graph",
                        "targets": [
                            {
                                "query": "trace.fastapi.request.duration",
                                "refId": "A"
                            }
                        ]
                    },
                    {
                        "title": "Error Rate",
                        "type": "graph",
                        "targets": [
                            {
                                "query": "bookedbarber-api.error_rate",
                                "refId": "A"
                            }
                        ]
                    },
                    {
                        "title": "Business Metrics",
                        "type": "table",
                        "targets": [
                            {
                                "query": "bookedbarber-api.bookings.*",
                                "refId": "A"
                            }
                        ]
                    }
                ],
                "time": {
                    "from": "now-24h",
                    "to": "now"
                },
                "refresh": "30s"
            }
        }
        
        grafana_file = self.monitoring_root / "grafana" / "dashboards" / "bookedbarber-overview.json"
        grafana_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(grafana_file, 'w') as f:
            json.dump(grafana_config, f, indent=2)
        
        logger.info(f"✓ Grafana dashboard config created: {grafana_file}")
        
        # Kibana dashboard configuration
        kibana_config = {
            "version": "8.0.0",
            "objects": [
                {
                    "id": "bookedbarber-logs-overview",
                    "type": "dashboard",
                    "attributes": {
                        "title": "BookedBarber V2 - Logs Overview",
                        "panelsJSON": json.dumps([
                            {
                                "title": "Log Volume",
                                "type": "histogram",
                                "gridData": {"x": 0, "y": 0, "w": 24, "h": 15}
                            },
                            {
                                "title": "Error Logs",
                                "type": "data_table",
                                "gridData": {"x": 24, "y": 0, "w": 24, "h": 15}
                            }
                        ])
                    }
                }
            ]
        }
        
        kibana_file = self.monitoring_root / "kibana" / "dashboards" / "bookedbarber-logs.json"
        kibana_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(kibana_file, 'w') as f:
            json.dump(kibana_config, f, indent=2)
        
        logger.info(f"✓ Kibana dashboard config created: {kibana_file}")
    
    def create_docker_compose_monitoring(self):
        """Create Docker Compose configuration for monitoring stack"""
        logger.info("Creating Docker Compose monitoring configuration...")
        
        docker_compose = {
            "version": "3.8",
            "services": {
                "elasticsearch": {
                    "image": "docker.elastic.co/elasticsearch/elasticsearch:8.10.0",
                    "container_name": "bookedbarber-elasticsearch",
                    "environment": [
                        "discovery.type=single-node",
                        "ES_JAVA_OPTS=-Xms1g -Xmx1g",
                        "xpack.security.enabled=false"
                    ],
                    "ports": ["9200:9200"],
                    "volumes": ["elasticsearch_data:/usr/share/elasticsearch/data"],
                    "networks": ["monitoring"]
                },
                "kibana": {
                    "image": "docker.elastic.co/kibana/kibana:8.10.0",
                    "container_name": "bookedbarber-kibana",
                    "ports": ["5601:5601"],
                    "environment": [
                        "ELASTICSEARCH_HOSTS=http://elasticsearch:9200"
                    ],
                    "depends_on": ["elasticsearch"],
                    "networks": ["monitoring"]
                },
                "redis": {
                    "image": "redis:7-alpine",
                    "container_name": "bookedbarber-redis",
                    "ports": ["6379:6379"],
                    "volumes": ["redis_data:/data"],
                    "networks": ["monitoring"]
                },
                "grafana": {
                    "image": "grafana/grafana:10.0.0",
                    "container_name": "bookedbarber-grafana",
                    "ports": ["3001:3000"],
                    "environment": [
                        "GF_SECURITY_ADMIN_PASSWORD=admin123"
                    ],
                    "volumes": [
                        "grafana_data:/var/lib/grafana",
                        "./grafana/dashboards:/etc/grafana/provisioning/dashboards"
                    ],
                    "networks": ["monitoring"]
                },
                "prometheus": {
                    "image": "prom/prometheus:v2.45.0",
                    "container_name": "bookedbarber-prometheus",
                    "ports": ["9090:9090"],
                    "volumes": [
                        "./prometheus.yml:/etc/prometheus/prometheus.yml",
                        "prometheus_data:/prometheus"
                    ],
                    "command": [
                        "--config.file=/etc/prometheus/prometheus.yml",
                        "--storage.tsdb.path=/prometheus",
                        "--web.console.libraries=/etc/prometheus/console_libraries",
                        "--web.console.templates=/etc/prometheus/consoles",
                        "--storage.tsdb.retention.time=200h",
                        "--web.enable-lifecycle"
                    ],
                    "networks": ["monitoring"]
                }
            },
            "networks": {
                "monitoring": {
                    "driver": "bridge"
                }
            },
            "volumes": {
                "elasticsearch_data": None,
                "redis_data": None,
                "grafana_data": None,
                "prometheus_data": None
            }
        }
        
        compose_file = self.monitoring_root / "docker-compose.monitoring.yml"
        
        # Convert to YAML format
        import yaml
        with open(compose_file, 'w') as f:
            yaml.dump(docker_compose, f, default_flow_style=False, indent=2)
        
        logger.info(f"✓ Docker Compose monitoring config created: {compose_file}")
    
    def create_startup_scripts(self):
        """Create startup scripts for monitoring"""
        logger.info("Creating startup scripts...")
        
        # Python startup script
        startup_script = self.monitoring_root / "start_monitoring.py"
        with open(startup_script, 'w') as f:
            f.write('''#!/usr/bin/env python3
"""
BookedBarber V2 Monitoring Startup Script
=======================================

Starts the complete monitoring stack for production use.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add monitoring directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from enterprise_monitoring_orchestrator import main

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    print("Starting BookedBarber V2 Enterprise Monitoring...")
    asyncio.run(main())
''')
        
        os.chmod(startup_script, 0o755)
        logger.info(f"✓ Python startup script created: {startup_script}")
        
        # Shell startup script
        shell_startup = self.monitoring_root / "start_monitoring.sh"
        with open(shell_startup, 'w') as f:
            f.write('''#!/bin/bash
# BookedBarber V2 Monitoring Startup Script

set -e

echo "Starting BookedBarber V2 Enterprise Monitoring..."

# Load environment variables
if [ -f "../setup_monitoring_env.sh" ]; then
    source ../setup_monitoring_env.sh
fi

# Start Docker services if requested
if [ "$1" = "--docker" ]; then
    echo "Starting Docker monitoring services..."
    docker-compose -f docker-compose.monitoring.yml up -d
    echo "Waiting for services to be ready..."
    sleep 30
fi

# Start Python monitoring orchestrator
echo "Starting monitoring orchestrator..."
python3 start_monitoring.py

echo "Monitoring stack started successfully!"
''')
        
        os.chmod(shell_startup, 0o755)
        logger.info(f"✓ Shell startup script created: {shell_startup}")
        
        # Systemd service file
        systemd_service = self.monitoring_root / "bookedbarber-monitoring.service"
        with open(systemd_service, 'w') as f:
            f.write(f'''[Unit]
Description=BookedBarber V2 Enterprise Monitoring
After=network.target
Wants=network.target

[Service]
Type=simple
User=app
Group=app
WorkingDirectory={self.monitoring_root}
Environment=PYTHONPATH={self.monitoring_root}
EnvironmentFile={self.project_root}/.env.monitoring
ExecStart=/usr/bin/python3 {startup_script}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bookedbarber-monitoring

[Install]
WantedBy=multi-user.target
''')
        
        logger.info(f"✓ Systemd service file created: {systemd_service}")
    
    def create_health_check_script(self):
        """Create health check script for monitoring"""
        health_check_script = self.monitoring_root / "health_check.py"
        
        with open(health_check_script, 'w') as f:
            f.write('''#!/usr/bin/env python3
"""
BookedBarber V2 Monitoring Health Check
====================================

Simple health check script for monitoring systems.
"""

import asyncio
import json
import sys
from pathlib import Path

# Add monitoring directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

async def check_monitoring_health():
    """Check health of monitoring systems"""
    try:
        from enterprise_monitoring_orchestrator import monitoring_orchestrator
        
        if not monitoring_orchestrator.initialized:
            print("ERROR: Monitoring orchestrator not initialized")
            return False
        
        health = monitoring_orchestrator.health_summary
        
        print(f"Overall Status: {health.status.value}")
        print(f"Active Alerts: {health.alerts_active}")
        print(f"Open Incidents: {health.incidents_open}")
        print(f"Uptime: {health.uptime_percentage:.2f}%")
        print(f"Error Rate: {health.error_rate:.2f}%")
        print(f"Response Time P95: {health.response_time_p95:.2f}ms")
        
        if health.status.value in ['healthy', 'degraded']:
            print("✓ Monitoring systems are operational")
            return True
        else:
            print("✗ Monitoring systems have issues")
            return False
            
    except Exception as e:
        print(f"ERROR: Health check failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(check_monitoring_health())
    sys.exit(0 if success else 1)
''')
        
        os.chmod(health_check_script, 0o755)
        logger.info(f"✓ Health check script created: {health_check_script}")
    
    def generate_documentation(self):
        """Generate monitoring documentation"""
        logger.info("Generating monitoring documentation...")
        
        docs_dir = self.monitoring_root / "docs"
        docs_dir.mkdir(exist_ok=True)
        
        # Main README
        readme_content = '''# BookedBarber V2 Enterprise Monitoring

## Overview

This directory contains the complete enterprise monitoring stack for BookedBarber V2, designed to handle 10,000+ concurrent users with comprehensive observability.

## Components

### Core Monitoring Systems
- **Sentry**: Error tracking and performance monitoring
- **DataDog APM**: Application Performance Monitoring
- **ELK Stack**: Log aggregation and analysis (Elasticsearch, Logstash, Kibana)
- **Redis**: Metrics storage and caching
- **Uptime Monitoring**: Endpoint availability tracking
- **Business Metrics**: KPI and business intelligence tracking
- **Alerting System**: Multi-channel alerting (Email, Slack, PagerDuty, SMS)

### Monitoring Orchestrator
The `enterprise_monitoring_orchestrator.py` coordinates all monitoring systems and provides:
- Centralized health monitoring
- Incident management
- Performance tracking
- CI/CD integration
- Graceful shutdown handling

## Quick Start

1. **Install Dependencies**:
   ```bash
   python setup_enterprise_monitoring.py --install-deps
   ```

2. **Configure Environment**:
   ```bash
   source ../setup_monitoring_env.sh
   ```

3. **Start Monitoring Stack**:
   ```bash
   ./start_monitoring.sh
   ```

4. **Check Health**:
   ```bash
   python health_check.py
   ```

## Configuration

All monitoring configuration is stored in `monitoring_config.json`. Key settings:

- **Sentry**: Error tracking and performance monitoring
- **DataDog**: APM and custom metrics
- **Elasticsearch**: Log storage and search
- **Alerting**: Multi-channel notification settings
- **Uptime**: Endpoint monitoring configuration

## Production Deployment

### Docker Deployment
```bash
# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Start monitoring orchestrator
./start_monitoring.sh
```

### Systemd Service
```bash
# Install service
sudo cp bookedbarber-monitoring.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable bookedbarber-monitoring
sudo systemctl start bookedbarber-monitoring
```

## Dashboards

- **Grafana**: http://localhost:3001 (admin/admin123)
- **Kibana**: http://localhost:5601
- **Prometheus**: http://localhost:9090

## Alerting

The system supports multiple alerting channels:

- **Email**: SMTP-based email alerts
- **Slack**: Webhook-based Slack notifications
- **PagerDuty**: Critical incident escalation
- **SMS**: Twilio-based SMS alerts

## Health Checks

Monitoring includes comprehensive health checks for:
- Database connectivity
- Redis cache performance
- External service dependencies
- API endpoint availability
- SSL certificate expiry
- Business metric thresholds

## Business Metrics

Tracked KPIs include:
- Booking success rates
- Payment processing metrics
- User engagement statistics
- Revenue tracking
- System performance metrics
- SLA compliance monitoring

## Troubleshooting

Common issues and solutions:

1. **Elasticsearch Connection Failed**:
   - Check `ELASTICSEARCH_HOSTS` environment variable
   - Verify Elasticsearch is running
   - Check network connectivity

2. **Redis Connection Failed**:
   - Verify `REDIS_URL` environment variable
   - Check Redis service status
   - Confirm authentication credentials

3. **Sentry Not Receiving Events**:
   - Verify `SENTRY_DSN` is set correctly
   - Check sample rates in configuration
   - Confirm network connectivity to Sentry

4. **DataDog Metrics Missing**:
   - Verify `DD_API_KEY` and `DD_APP_KEY`
   - Check DataDog agent configuration
   - Confirm service tags are correct

## Performance Considerations

For 10,000+ concurrent users:
- Elasticsearch: 3+ nodes with proper sharding
- Redis: Cluster mode for high availability
- Sentry: Appropriate sample rates (5% errors, 1% performance)
- DataDog: Optimized trace sampling (10%)
- Log retention: 30 days default, configurable

## Security

- All sensitive credentials use environment variables
- TLS encryption for external connections
- Rate limiting on alert channels
- Data retention policies enforce compliance
- PII filtering in logs and error reports

## Maintenance

Regular maintenance tasks:
- Log cleanup (automated)
- Index optimization (scheduled)
- Alert channel testing (weekly)
- Performance threshold review (monthly)
- Dependency updates (quarterly)

## Support

For monitoring system issues:
1. Check system logs: `journalctl -u bookedbarber-monitoring`
2. Run health check: `python health_check.py`
3. Review alert history in dashboards
4. Contact DevOps team for escalation
'''
        
        readme_file = docs_dir / "README.md"
        with open(readme_file, 'w') as f:
            f.write(readme_content)
        
        logger.info(f"✓ Documentation created: {readme_file}")
    
    async def run_setup(self, install_deps: bool = False, create_docker: bool = True):
        """Run complete monitoring setup"""
        logger.info("Starting BookedBarber V2 Enterprise Monitoring Setup...")
        
        try:
            # Check dependencies
            dependencies = self.check_dependencies()
            
            # Install missing dependencies if requested
            if install_deps:
                self.install_missing_dependencies(dependencies)
            
            # Create configuration
            config = self.create_monitoring_config()
            
            # Setup environment
            self.setup_environment_variables(config)
            
            # Create dashboard configs
            self.create_monitoring_dashboard_config()
            
            # Create Docker compose if requested
            if create_docker:
                self.create_docker_compose_monitoring()
            
            # Create startup scripts
            self.create_startup_scripts()
            
            # Create health check script
            self.create_health_check_script()
            
            # Generate documentation
            self.generate_documentation()
            
            logger.info("✅ Enterprise monitoring setup completed successfully!")
            logger.info("")
            logger.info("Next steps:")
            logger.info("1. Review and update monitoring_config.json")
            logger.info("2. Set required environment variables")
            logger.info("3. Start monitoring: ./start_monitoring.sh")
            logger.info("4. Check health: python health_check.py")
            
            return True
            
        except Exception as e:
            logger.error(f"Setup failed: {e}")
            return False


async def main():
    """Main setup function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="BookedBarber V2 Enterprise Monitoring Setup")
    parser.add_argument("--install-deps", action="store_true", help="Install missing Python dependencies")
    parser.add_argument("--no-docker", action="store_true", help="Skip Docker Compose creation")
    parser.add_argument("--config-only", action="store_true", help="Only create configuration files")
    
    args = parser.parse_args()
    
    setup = MonitoringSetup()
    
    if args.config_only:
        config = setup.create_monitoring_config()
        setup.setup_environment_variables(config)
        logger.info("Configuration files created successfully")
    else:
        success = await setup.run_setup(
            install_deps=args.install_deps,
            create_docker=not args.no_docker
        )
        
        if not success:
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())