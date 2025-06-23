#!/usr/bin/env python3
"""
Uptime monitoring script for 6FB Booking Platform
Monitors both frontend and backend services
"""

import requests
import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/6fb-monitoring/uptime.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Service endpoints to monitor
SERVICES = {
    'backend': {
        'url': 'https://sixfb-backend.onrender.com/health',
        'timeout': 30,
        'expected_status': 200,
        'check_interval': 300,  # 5 minutes
        'alert_threshold': 3,    # Alert after 3 consecutive failures
    },
    'backend_api': {
        'url': 'https://sixfb-backend.onrender.com/api/v1/services',
        'timeout': 10,
        'expected_status': 200,
        'check_interval': 300,
    },
    'frontend': {
        'url': os.getenv('FRONTEND_URL', 'https://6fb-booking.vercel.app'),
        'timeout': 30,
        'expected_status': 200,
        'check_interval': 300,
    },
    'database': {
        'url': 'https://sixfb-backend.onrender.com/api/v1/health/db',
        'timeout': 10,
        'expected_status': 200,
        'check_interval': 600,  # 10 minutes
    }
}

# Alert configuration
ALERT_CONFIG = {
    'email': {
        'enabled': os.getenv('ENABLE_EMAIL_ALERTS', 'true').lower() == 'true',
        'smtp_host': os.getenv('SMTP_HOST', 'smtp.sendgrid.net'),
        'smtp_port': int(os.getenv('SMTP_PORT', '587')),
        'smtp_user': os.getenv('SMTP_USER', 'apikey'),
        'smtp_pass': os.getenv('SENDGRID_API_KEY', ''),
        'from_email': os.getenv('ALERT_FROM_EMAIL', 'monitoring@6fb-booking.com'),
        'to_emails': os.getenv('ALERT_TO_EMAILS', '').split(','),
    },
    'webhook': {
        'enabled': os.getenv('ENABLE_WEBHOOK_ALERTS', 'false').lower() == 'true',
        'url': os.getenv('ALERT_WEBHOOK_URL', ''),
    }
}

class ServiceMonitor:
    def __init__(self):
        self.service_status = {}
        self.failure_counts = {}
        self.last_check = {}
        self.metrics_file = Path('/var/log/6fb-monitoring/metrics.json')
        self.load_state()
    
    def load_state(self):
        """Load previous state from file"""
        if self.metrics_file.exists():
            try:
                with open(self.metrics_file, 'r') as f:
                    data = json.load(f)
                    self.service_status = data.get('status', {})
                    self.failure_counts = data.get('failures', {})
                    self.last_check = {
                        k: datetime.fromisoformat(v) 
                        for k, v in data.get('last_check', {}).items()
                    }
            except Exception as e:
                logger.error(f"Failed to load state: {e}")
    
    def save_state(self):
        """Save current state to file"""
        try:
            self.metrics_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.metrics_file, 'w') as f:
                json.dump({
                    'status': self.service_status,
                    'failures': self.failure_counts,
                    'last_check': {
                        k: v.isoformat() for k, v in self.last_check.items()
                    },
                    'updated_at': datetime.utcnow().isoformat()
                }, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
    
    def check_service(self, name: str, config: Dict) -> Dict:
        """Check a single service health"""
        start_time = time.time()
        result = {
            'name': name,
            'url': config['url'],
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'unknown',
            'response_time': None,
            'status_code': None,
            'error': None
        }
        
        try:
            response = requests.get(
                config['url'],
                timeout=config['timeout'],
                headers={'User-Agent': '6FB-Monitoring/1.0'}
            )
            
            result['response_time'] = round((time.time() - start_time) * 1000, 2)
            result['status_code'] = response.status_code
            
            if response.status_code == config.get('expected_status', 200):
                result['status'] = 'healthy'
                self.failure_counts[name] = 0
                
                # Check response body if it's a health endpoint
                if 'health' in config['url']:
                    try:
                        health_data = response.json()
                        result['details'] = health_data
                    except:
                        pass
            else:
                result['status'] = 'unhealthy'
                self.failure_counts[name] = self.failure_counts.get(name, 0) + 1
                
        except requests.exceptions.Timeout:
            result['status'] = 'timeout'
            result['error'] = 'Request timed out'
            self.failure_counts[name] = self.failure_counts.get(name, 0) + 1
            
        except requests.exceptions.ConnectionError:
            result['status'] = 'unreachable'
            result['error'] = 'Connection failed'
            self.failure_counts[name] = self.failure_counts.get(name, 0) + 1
            
        except Exception as e:
            result['status'] = 'error'
            result['error'] = str(e)
            self.failure_counts[name] = self.failure_counts.get(name, 0) + 1
        
        # Update status
        self.service_status[name] = result
        self.last_check[name] = datetime.utcnow()
        
        # Check if we need to send alerts
        if self.failure_counts.get(name, 0) >= config.get('alert_threshold', 3):
            self.send_alert(name, result)
        
        return result
    
    def send_alert(self, service_name: str, check_result: Dict):
        """Send alerts for service failures"""
        logger.warning(f"Sending alert for {service_name}: {check_result['status']}")
        
        # Email alert
        if ALERT_CONFIG['email']['enabled'] and ALERT_CONFIG['email']['smtp_pass']:
            self.send_email_alert(service_name, check_result)
        
        # Webhook alert
        if ALERT_CONFIG['webhook']['enabled'] and ALERT_CONFIG['webhook']['url']:
            self.send_webhook_alert(service_name, check_result)
    
    def send_email_alert(self, service_name: str, check_result: Dict):
        """Send email alert"""
        try:
            msg = MIMEMultipart()
            msg['Subject'] = f'[6FB Monitoring] {service_name} is {check_result["status"]}'
            msg['From'] = ALERT_CONFIG['email']['from_email']
            msg['To'] = ', '.join(ALERT_CONFIG['email']['to_emails'])
            
            body = f"""
            Service Alert: {service_name}
            
            Status: {check_result['status']}
            URL: {check_result['url']}
            Error: {check_result.get('error', 'N/A')}
            Response Time: {check_result.get('response_time', 'N/A')}ms
            Timestamp: {check_result['timestamp']}
            Consecutive Failures: {self.failure_counts.get(service_name, 0)}
            
            Please check the service immediately.
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(ALERT_CONFIG['email']['smtp_host'], 
                             ALERT_CONFIG['email']['smtp_port']) as server:
                server.starttls()
                server.login(ALERT_CONFIG['email']['smtp_user'], 
                           ALERT_CONFIG['email']['smtp_pass'])
                server.send_message(msg)
                
            logger.info(f"Email alert sent for {service_name}")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
    
    def send_webhook_alert(self, service_name: str, check_result: Dict):
        """Send webhook alert"""
        try:
            payload = {
                'service': service_name,
                'status': check_result['status'],
                'url': check_result['url'],
                'error': check_result.get('error'),
                'response_time': check_result.get('response_time'),
                'timestamp': check_result['timestamp'],
                'consecutive_failures': self.failure_counts.get(service_name, 0)
            }
            
            response = requests.post(
                ALERT_CONFIG['webhook']['url'],
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Webhook alert sent for {service_name}")
            else:
                logger.error(f"Webhook alert failed: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")
    
    def should_check_service(self, name: str, config: Dict) -> bool:
        """Check if service is due for checking"""
        if name not in self.last_check:
            return True
        
        interval = config.get('check_interval', 300)
        next_check = self.last_check[name] + timedelta(seconds=interval)
        return datetime.utcnow() >= next_check
    
    def run_checks(self):
        """Run all service checks"""
        results = []
        
        for name, config in SERVICES.items():
            if self.should_check_service(name, config):
                logger.info(f"Checking {name}...")
                result = self.check_service(name, config)
                results.append(result)
                logger.info(f"{name}: {result['status']} "
                          f"({result.get('response_time', 'N/A')}ms)")
        
        self.save_state()
        return results
    
    def get_summary(self) -> Dict:
        """Get monitoring summary"""
        healthy = sum(1 for s in self.service_status.values() 
                     if s.get('status') == 'healthy')
        total = len(self.service_status)
        
        return {
            'healthy_services': healthy,
            'total_services': total,
            'uptime_percentage': (healthy / total * 100) if total > 0 else 0,
            'services': self.service_status,
            'last_update': datetime.utcnow().isoformat()
        }

def main():
    """Main monitoring loop"""
    monitor = ServiceMonitor()
    
    logger.info("Starting 6FB uptime monitoring...")
    
    while True:
        try:
            monitor.run_checks()
            
            # Log summary every hour
            if datetime.utcnow().minute == 0:
                summary = monitor.get_summary()
                logger.info(f"Monitoring Summary: {summary['healthy_services']}/{summary['total_services']} "
                          f"services healthy ({summary['uptime_percentage']:.1f}%)")
            
            # Sleep for 1 minute
            time.sleep(60)
            
        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")
            break
        except Exception as e:
            logger.error(f"Monitoring error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()