#!/usr/bin/env python3
"""
Error logging aggregation for 6FB Booking Platform
Collects errors from multiple sources and provides centralized logging
"""

import json
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import requests
import re
from collections import defaultdict
import asyncio
import aiohttp
from dataclasses import dataclass, asdict
import hashlib
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/6fb-monitoring/error-aggregator.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ErrorEvent:
    """Represents an error event"""
    timestamp: str
    service: str
    level: str  # ERROR, WARNING, CRITICAL
    message: str
    stack_trace: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    error_type: Optional[str] = None
    fingerprint: Optional[str] = None
    count: int = 1

class ErrorAggregator:
    def __init__(self):
        self.errors_dir = Path('/var/log/6fb-monitoring/errors')
        self.errors_dir.mkdir(parents=True, exist_ok=True)
        self.error_patterns = self.load_error_patterns()
        self.error_stats = defaultdict(lambda: defaultdict(int))
        self.unique_errors = {}
        
    def load_error_patterns(self) -> Dict[str, re.Pattern]:
        """Load common error patterns for classification"""
        return {
            'database_connection': re.compile(r'(connection|connect).*?(failed|error|refused)', re.I),
            'authentication': re.compile(r'(auth|authentication|unauthorized|401)', re.I),
            'rate_limit': re.compile(r'(rate.?limit|429|too.?many.?requests)', re.I),
            'timeout': re.compile(r'(timeout|timed?.?out)', re.I),
            'validation': re.compile(r'(validation|invalid|bad.?request|400)', re.I),
            'not_found': re.compile(r'(not.?found|404)', re.I),
            'internal_server': re.compile(r'(internal.?server|500)', re.I),
            'memory': re.compile(r'(memory|heap|out.?of.?memory)', re.I),
            'permission': re.compile(r'(permission|forbidden|403)', re.I),
            'network': re.compile(r'(network|connection.?reset|ECONNRESET)', re.I)
        }
    
    async def collect_backend_logs(self, session: aiohttp.ClientSession):
        """Collect errors from backend logs via API"""
        try:
            # Check if backend has a logs endpoint
            backend_url = 'https://sixfb-backend.onrender.com'
            
            # Try to get recent logs
            async with session.get(
                f'{backend_url}/api/v1/monitoring/logs',
                headers={'Authorization': f'Bearer {os.getenv("MONITORING_TOKEN", "")}'},
                params={'level': 'ERROR', 'limit': 100},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    logs = await response.json()
                    return self.parse_backend_logs(logs)
                elif response.status == 404:
                    # Endpoint doesn't exist, try alternative method
                    return await self.collect_backend_errors_alternative(session)
        except Exception as e:
            logger.error(f"Failed to collect backend logs: {e}")
        
        return []
    
    async def collect_backend_errors_alternative(self, session: aiohttp.ClientSession):
        """Alternative method to collect backend errors"""
        errors = []
        
        # Check health endpoint for error indicators
        try:
            async with session.get(
                'https://sixfb-backend.onrender.com/health',
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status != 200:
                    errors.append(ErrorEvent(
                        timestamp=datetime.utcnow().isoformat(),
                        service='backend',
                        level='ERROR',
                        message=f'Health check failed with status {response.status}',
                        error_type='health_check_failure'
                    ))
        except Exception as e:
            errors.append(ErrorEvent(
                timestamp=datetime.utcnow().isoformat(),
                service='backend',
                level='ERROR',
                message=f'Health check error: {str(e)}',
                error_type='health_check_error'
            ))
        
        return errors
    
    def parse_backend_logs(self, logs: List[Dict]) -> List[ErrorEvent]:
        """Parse backend log entries into ErrorEvent objects"""
        errors = []
        
        for log in logs:
            if log.get('level') in ['ERROR', 'CRITICAL', 'WARNING']:
                error = ErrorEvent(
                    timestamp=log.get('timestamp', datetime.utcnow().isoformat()),
                    service='backend',
                    level=log.get('level', 'ERROR'),
                    message=log.get('message', ''),
                    stack_trace=log.get('stack_trace'),
                    user_id=log.get('user_id'),
                    request_id=log.get('request_id'),
                    endpoint=log.get('endpoint'),
                    error_type=self.classify_error(log.get('message', ''))
                )
                error.fingerprint = self.generate_fingerprint(error)
                errors.append(error)
        
        return errors
    
    async def collect_frontend_errors(self, session: aiohttp.ClientSession):
        """Collect errors from frontend (client-side errors)"""
        errors = []
        
        # In a real implementation, you might:
        # 1. Query a client-side error tracking service (Sentry, LogRocket, etc.)
        # 2. Parse CDN logs for 4xx/5xx errors
        # 3. Check browser error reporting API
        
        # For now, we'll check if the frontend is accessible
        try:
            frontend_url = os.getenv('FRONTEND_URL', 'https://6fb-booking.vercel.app')
            async with session.get(
                frontend_url,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status >= 400:
                    errors.append(ErrorEvent(
                        timestamp=datetime.utcnow().isoformat(),
                        service='frontend',
                        level='ERROR',
                        message=f'Frontend returned status {response.status}',
                        error_type='frontend_error'
                    ))
        except Exception as e:
            errors.append(ErrorEvent(
                timestamp=datetime.utcnow().isoformat(),
                service='frontend',
                level='ERROR',
                message=f'Frontend check error: {str(e)}',
                error_type='frontend_availability'
            ))
        
        return errors
    
    async def collect_deployment_errors(self):
        """Collect errors from deployment logs"""
        errors = []
        
        # Check deployment state file for failures
        deployment_state = Path('/var/log/6fb-monitoring/deployment_state.json')
        if deployment_state.exists():
            try:
                with open(deployment_state, 'r') as f:
                    data = json.load(f)
                
                for deployment in data.get('history', [])[-10:]:  # Last 10 deployments
                    if not deployment.get('health_check_passed', True):
                        errors.append(ErrorEvent(
                            timestamp=deployment.get('detected_at', datetime.utcnow().isoformat()),
                            service=deployment.get('service', 'unknown'),
                            level='CRITICAL',
                            message=f"Deployment health check failed for {deployment.get('service')}",
                            error_type='deployment_failure'
                        ))
            except Exception as e:
                logger.error(f"Failed to read deployment state: {e}")
        
        return errors
    
    def classify_error(self, message: str) -> str:
        """Classify error based on message content"""
        message_lower = message.lower()
        
        for error_type, pattern in self.error_patterns.items():
            if pattern.search(message):
                return error_type
        
        return 'unknown'
    
    def generate_fingerprint(self, error: ErrorEvent) -> str:
        """Generate unique fingerprint for error deduplication"""
        # Create fingerprint based on service, error type, and normalized message
        normalized_message = re.sub(r'\d+', 'N', error.message)  # Replace numbers
        normalized_message = re.sub(r'[a-f0-9]{8,}', 'ID', normalized_message)  # Replace IDs
        
        fingerprint_data = f"{error.service}:{error.error_type}:{normalized_message}"
        return hashlib.md5(fingerprint_data.encode()).hexdigest()
    
    def aggregate_errors(self, errors: List[ErrorEvent]):
        """Aggregate similar errors"""
        for error in errors:
            fingerprint = error.fingerprint or self.generate_fingerprint(error)
            
            if fingerprint in self.unique_errors:
                # Increment count for existing error
                self.unique_errors[fingerprint].count += 1
                self.unique_errors[fingerprint].timestamp = error.timestamp  # Update to latest
            else:
                # New unique error
                self.unique_errors[fingerprint] = error
            
            # Update statistics
            self.error_stats[error.service][error.level] += 1
            self.error_stats[error.service][error.error_type] += 1
    
    def save_errors(self):
        """Save aggregated errors to file"""
        timestamp = datetime.utcnow()
        
        # Save detailed errors
        errors_file = self.errors_dir / f"errors_{timestamp.strftime('%Y%m%d_%H%M%S')}.json"
        with open(errors_file, 'w') as f:
            json.dump({
                'timestamp': timestamp.isoformat(),
                'errors': [asdict(e) for e in self.unique_errors.values()],
                'statistics': dict(self.error_stats),
                'total_errors': sum(e.count for e in self.unique_errors.values())
            }, f, indent=2)
        
        # Update rolling errors file
        self.update_rolling_errors()
    
    def update_rolling_errors(self):
        """Update rolling 24-hour error log"""
        rolling_file = self.errors_dir / 'rolling_errors.json'
        rolling_data = {'errors': [], 'last_updated': datetime.utcnow().isoformat()}
        
        # Load existing data
        if rolling_file.exists():
            try:
                with open(rolling_file, 'r') as f:
                    rolling_data = json.load(f)
            except:
                pass
        
        # Add new errors
        cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        
        # Keep errors from last 24 hours
        rolling_data['errors'] = [
            e for e in rolling_data.get('errors', [])
            if e.get('timestamp', '') > cutoff
        ]
        
        # Add new unique errors
        for error in self.unique_errors.values():
            rolling_data['errors'].append(asdict(error))
        
        # Calculate statistics
        error_counts = defaultdict(lambda: defaultdict(int))
        for error in rolling_data['errors']:
            error_counts[error['service']][error['level']] += error.get('count', 1)
            error_counts[error['service']][error.get('error_type', 'unknown')] += error.get('count', 1)
        
        rolling_data['statistics'] = dict(error_counts)
        rolling_data['last_updated'] = datetime.utcnow().isoformat()
        
        # Save updated data
        with open(rolling_file, 'w') as f:
            json.dump(rolling_data, f, indent=2)
    
    def generate_alert_summary(self) -> Optional[Dict]:
        """Generate alert summary for critical errors"""
        critical_errors = [
            e for e in self.unique_errors.values()
            if e.level == 'CRITICAL' or e.count > 10
        ]
        
        if not critical_errors:
            return None
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'critical_error_count': len(critical_errors),
            'top_errors': [
                {
                    'service': e.service,
                    'message': e.message,
                    'count': e.count,
                    'type': e.error_type
                }
                for e in sorted(critical_errors, key=lambda x: x.count, reverse=True)[:5]
            ],
            'affected_services': list(set(e.service for e in critical_errors))
        }
    
    async def run_collection_cycle(self):
        """Run one collection cycle"""
        logger.info("Starting error collection cycle")
        
        async with aiohttp.ClientSession() as session:
            # Collect from all sources
            tasks = [
                self.collect_backend_logs(session),
                self.collect_frontend_errors(session),
                self.collect_deployment_errors()
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            all_errors = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Collection task {i} failed: {result}")
                elif isinstance(result, list):
                    all_errors.extend(result)
            
            # Aggregate errors
            self.aggregate_errors(all_errors)
            
            # Save results
            self.save_errors()
            
            # Generate alerts if needed
            alert_summary = self.generate_alert_summary()
            if alert_summary:
                logger.warning(f"Critical errors detected: {alert_summary}")
                await self.send_critical_alerts(alert_summary)
            
            # Log summary
            total_errors = sum(e.count for e in self.unique_errors.values())
            logger.info(f"Collection cycle complete. Total errors: {total_errors}, "
                       f"Unique errors: {len(self.unique_errors)}")
    
    async def send_critical_alerts(self, alert_summary: Dict):
        """Send alerts for critical errors"""
        # Implementation would send to email/Slack/webhook
        # For now, just log
        logger.critical(f"ALERT: {alert_summary['critical_error_count']} critical errors detected")

async def main():
    """Main error aggregation loop"""
    aggregator = ErrorAggregator()
    
    logger.info("Starting error aggregation service...")
    
    while True:
        try:
            # Run collection cycle
            await aggregator.run_collection_cycle()
            
            # Reset for next cycle
            aggregator.unique_errors.clear()
            aggregator.error_stats.clear()
            
            # Wait 5 minutes before next collection
            await asyncio.sleep(300)
            
        except KeyboardInterrupt:
            logger.info("Error aggregation stopped by user")
            break
        except Exception as e:
            logger.error(f"Error aggregation cycle failed: {e}")
            await asyncio.sleep(60)  # Wait 1 minute on error

if __name__ == "__main__":
    asyncio.run(main())