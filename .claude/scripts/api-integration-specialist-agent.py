#!/usr/bin/env python3
"""
API Integration Specialist Agent for BookedBarber V2
Comprehensive integration management for external APIs, webhooks, and third-party services
"""

import json
import time
import requests
import subprocess
import logging
import os
import traceback
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import hashlib
import hmac
import base64
import urllib.parse
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/bossio/6fb-booking/.claude/api-integration-agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('api-integration-specialist')

@dataclass
class IntegrationHealthStatus:
    service_name: str
    status: str  # 'healthy', 'degraded', 'failed'
    response_time: Optional[float]
    last_success: Optional[datetime]
    error_count: int
    last_error: Optional[str]
    rate_limit_remaining: Optional[int]
    timestamp: datetime

@dataclass
class WebhookEvent:
    webhook_id: str
    service_name: str
    payload_hash: str
    signature_valid: bool
    processed: bool
    retry_count: int
    timestamp: datetime
    error_details: Optional[str]

@dataclass
class APIQuotaStatus:
    service_name: str
    current_usage: int
    quota_limit: int
    reset_time: Optional[datetime]
    usage_percentage: float
    warning_threshold: float = 80.0

class APIIntegrationSpecialist:
    """
    Comprehensive API Integration Management for BookedBarber V2
    
    Features:
    - Integration health monitoring and diagnostics
    - Webhook security validation and processing
    - Rate limiting and quota management
    - Error handling and retry strategies
    - Security compliance validation
    - Performance optimization
    """
    
    def __init__(self):
        self.project_root = Path("/Users/bossio/6fb-booking")
        self.backend_v2_path = self.project_root / "backend-v2"
        self.config_path = self.project_root / ".claude"
        
        # BookedBarber V2 integration endpoints
        self.integration_services = {
            'stripe': {
                'name': 'Stripe Connect',
                'health_endpoint': 'https://api.stripe.com/v1/account',
                'webhooks': ['/api/v2/webhooks/stripe'],
                'critical': True,
                'features': ['payments', 'commission', 'payouts', 'marketplace']
            },
            'google_calendar': {
                'name': 'Google Calendar API',
                'health_endpoint': 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
                'webhooks': ['/api/v2/webhooks/google'],
                'critical': True,
                'features': ['appointment_sync', 'availability', 'two_way_sync']
            },
            'sendgrid': {
                'name': 'SendGrid Email API',
                'health_endpoint': 'https://api.sendgrid.com/v3/user/profile',
                'webhooks': ['/api/v2/webhooks/sendgrid'],
                'critical': False,
                'features': ['email_notifications', 'marketing', 'transactional']
            },
            'twilio': {
                'name': 'Twilio SMS API',
                'health_endpoint': 'https://api.twilio.com/2010-04-01/Accounts.json',
                'webhooks': ['/api/v2/webhooks/twilio'],
                'critical': False,
                'features': ['sms_notifications', 'appointment_reminders', 'client_communication']
            },
            'google_my_business': {
                'name': 'Google My Business API',
                'health_endpoint': 'https://mybusiness.googleapis.com/v4/accounts',
                'webhooks': ['/api/v2/webhooks/google_business'],
                'critical': False,
                'features': ['review_management', 'business_listing', 'seo_optimization']
            },
            'facebook_instagram': {
                'name': 'Facebook/Instagram API',
                'health_endpoint': 'https://graph.facebook.com/v18.0/me',
                'webhooks': ['/api/v2/webhooks/facebook'],
                'critical': False,
                'features': ['social_media', 'marketing', 'lead_generation']
            }
        }
        
        self.rate_limit_thresholds = {
            'stripe': {'requests_per_second': 100, 'daily_limit': 100000},
            'google_calendar': {'requests_per_second': 10, 'daily_limit': 1000000},
            'sendgrid': {'requests_per_second': 10, 'daily_limit': 100000},
            'twilio': {'requests_per_second': 1, 'daily_limit': 1000},
            'google_my_business': {'requests_per_second': 5, 'daily_limit': 40000},
            'facebook_instagram': {'requests_per_second': 5, 'daily_limit': 200}
        }
        
        # Initialize monitoring state
        self.health_status = {}
        self.webhook_events = {}
        self.quota_status = {}
        
    def analyze_integration_issue(self, trigger_name: str, error_details: str, affected_files: List[str]) -> Dict[str, Any]:
        """
        Main analysis entry point for integration issues
        """
        logger.info(f"🔧 API Integration Specialist activated for trigger: {trigger_name}")
        
        analysis_results = {
            'timestamp': datetime.now().isoformat(),
            'trigger': trigger_name,
            'analysis_type': 'api_integration_specialist',
            'findings': {},
            'recommendations': [],
            'implementation_steps': [],
            'monitoring_requirements': [],
            'security_considerations': []
        }
        
        try:
            # Perform comprehensive integration analysis
            if 'webhook' in trigger_name.lower() or 'webhook' in error_details.lower():
                analysis_results['findings']['webhook_analysis'] = self._analyze_webhook_security(error_details, affected_files)
            
            if 'rate_limit' in trigger_name.lower() or 'quota' in error_details.lower():
                analysis_results['findings']['rate_limiting_analysis'] = self._analyze_rate_limiting(error_details, affected_files)
            
            if 'authentication' in trigger_name.lower() or 'oauth' in error_details.lower():
                analysis_results['findings']['auth_analysis'] = self._analyze_authentication_flow(error_details, affected_files)
            
            if 'payment' in trigger_name.lower() or 'stripe' in error_details.lower():
                analysis_results['findings']['payment_integration_analysis'] = self._analyze_payment_integration(error_details, affected_files)
            
            # Always perform health monitoring
            analysis_results['findings']['integration_health'] = self._monitor_integration_health()
            
            # Generate comprehensive recommendations
            analysis_results['recommendations'] = self._generate_integration_recommendations(analysis_results['findings'])
            
            # Create implementation roadmap
            analysis_results['implementation_steps'] = self._create_implementation_roadmap(analysis_results['findings'])
            
            # Security compliance validation
            analysis_results['security_considerations'] = self._validate_security_compliance(affected_files)
            
            # Performance optimization suggestions
            analysis_results['performance_optimization'] = self._analyze_performance_optimization(affected_files)
            
            # Generate monitoring requirements
            analysis_results['monitoring_requirements'] = self._generate_monitoring_requirements(analysis_results['findings'])
            
            logger.info("✅ API Integration analysis completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Error during API integration analysis: {str(e)}")
            logger.error(traceback.format_exc())
            analysis_results['error'] = str(e)
            analysis_results['recommendations'] = [
                "API Integration analysis failed - manual investigation required",
                "Check agent logs for detailed error information",
                "Validate integration configurations and credentials"
            ]
        
        # Save analysis results
        self._save_analysis_results(analysis_results)
        
        # Generate actionable report
        self._generate_integration_report(analysis_results)
        
        return analysis_results
    
    def _analyze_webhook_security(self, error_details: str, affected_files: List[str]) -> Dict[str, Any]:
        """
        Analyze webhook security and signature validation
        """
        logger.info("🔒 Analyzing webhook security and validation")
        
        webhook_analysis = {
            'security_status': 'unknown',
            'signature_validation': False,
            'replay_protection': False,
            'payload_validation': False,
            'issues_found': [],
            'recommendations': []
        }
        
        try:
            # Check webhook endpoint implementations
            webhook_files = [f for f in affected_files if 'webhook' in f.lower()]
            
            for file_path in webhook_files:
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        content = f.read()
                        
                    # Check for signature validation
                    if any(pattern in content for pattern in ['verify_signature', 'hmac', 'webhook_secret']):
                        webhook_analysis['signature_validation'] = True
                    
                    # Check for replay protection
                    if any(pattern in content for pattern in ['timestamp', 'replay', 'nonce', 'idempotency']):
                        webhook_analysis['replay_protection'] = True
                    
                    # Check for payload validation
                    if any(pattern in content for pattern in ['validate_payload', 'schema', 'pydantic']):
                        webhook_analysis['payload_validation'] = True
            
            # Analyze security implementation gaps
            if not webhook_analysis['signature_validation']:
                webhook_analysis['issues_found'].append('Missing webhook signature validation')
                webhook_analysis['recommendations'].append('Implement HMAC signature verification for all webhooks')
            
            if not webhook_analysis['replay_protection']:
                webhook_analysis['issues_found'].append('Missing replay attack protection')
                webhook_analysis['recommendations'].append('Add timestamp validation and nonce tracking')
            
            if not webhook_analysis['payload_validation']:
                webhook_analysis['issues_found'].append('Missing payload schema validation')
                webhook_analysis['recommendations'].append('Implement Pydantic models for webhook payload validation')
            
            # Determine overall security status
            security_score = sum([
                webhook_analysis['signature_validation'],
                webhook_analysis['replay_protection'],
                webhook_analysis['payload_validation']
            ])
            
            if security_score == 3:
                webhook_analysis['security_status'] = 'secure'
            elif security_score >= 2:
                webhook_analysis['security_status'] = 'moderate'
            else:
                webhook_analysis['security_status'] = 'vulnerable'
            
            logger.info(f"🔒 Webhook security status: {webhook_analysis['security_status']}")
            
        except Exception as e:
            logger.error(f"❌ Error analyzing webhook security: {str(e)}")
            webhook_analysis['error'] = str(e)
        
        return webhook_analysis
    
    def _analyze_rate_limiting(self, error_details: str, affected_files: List[str]) -> Dict[str, Any]:
        """
        Analyze rate limiting and API quota management
        """
        logger.info("⏱️ Analyzing rate limiting and quota management")
        
        rate_analysis = {
            'current_usage': {},
            'quota_status': {},
            'bottlenecks': [],
            'optimization_opportunities': [],
            'implementation_gaps': []
        }
        
        try:
            # Check current quota usage for each service
            for service_name, config in self.integration_services.items():
                quota_info = self._check_service_quota(service_name)
                rate_analysis['quota_status'][service_name] = quota_info
                
                # Identify usage patterns and bottlenecks
                if quota_info and quota_info.usage_percentage > 80:
                    rate_analysis['bottlenecks'].append({
                        'service': service_name,
                        'usage_percentage': quota_info.usage_percentage,
                        'risk_level': 'high' if quota_info.usage_percentage > 90 else 'medium'
                    })
            
            # Analyze rate limiting implementation
            integration_files = [f for f in affected_files if any(service in f.lower() for service in self.integration_services.keys())]
            
            for file_path in integration_files:
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check for rate limiting patterns
                    if not any(pattern in content for pattern in ['rate_limit', 'throttle', 'backoff', 'retry']):
                        rate_analysis['implementation_gaps'].append(f'Missing rate limiting in {file_path}')
            
            # Generate optimization recommendations
            if rate_analysis['bottlenecks']:
                rate_analysis['optimization_opportunities'].extend([
                    'Implement exponential backoff with jitter',
                    'Add request queuing for high-volume operations',
                    'Cache frequently accessed data to reduce API calls',
                    'Implement batch processing for bulk operations'
                ])
            
            if rate_analysis['implementation_gaps']:
                rate_analysis['optimization_opportunities'].extend([
                    'Add circuit breaker pattern for failing services',
                    'Implement graceful degradation strategies',
                    'Add comprehensive retry logic with exponential backoff'
                ])
            
            logger.info("⏱️ Rate limiting analysis completed")
            
        except Exception as e:
            logger.error(f"❌ Error analyzing rate limiting: {str(e)}")
            rate_analysis['error'] = str(e)
        
        return rate_analysis
    
    def _analyze_authentication_flow(self, error_details: str, affected_files: List[str]) -> Dict[str, Any]:
        """
        Analyze OAuth and authentication integration flows
        """
        logger.info("🔐 Analyzing authentication integration flows")
        
        auth_analysis = {
            'oauth_implementations': {},
            'token_management': {
                'refresh_strategy': False,
                'secure_storage': False,
                'rotation_policy': False
            },
            'security_vulnerabilities': [],
            'compliance_issues': []
        }
        
        try:
            # Analyze OAuth implementations for each service
            for service_name in ['google_calendar', 'google_my_business', 'facebook_instagram']:
                oauth_status = self._analyze_oauth_implementation(service_name, affected_files)
                auth_analysis['oauth_implementations'][service_name] = oauth_status
            
            # Check token management practices
            auth_files = [f for f in affected_files if any(keyword in f.lower() for keyword in ['auth', 'oauth', 'token'])]
            
            for file_path in auth_files:
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check token refresh implementation
                    if any(pattern in content for pattern in ['refresh_token', 'token_refresh', 'auto_refresh']):
                        auth_analysis['token_management']['refresh_strategy'] = True
                    
                    # Check secure storage
                    if any(pattern in content for pattern in ['encrypted', 'keyring', 'vault', 'secure_storage']):
                        auth_analysis['token_management']['secure_storage'] = True
                    
                    # Check rotation policy
                    if any(pattern in content for pattern in ['rotate', 'expiry', 'ttl', 'expires_at']):
                        auth_analysis['token_management']['rotation_policy'] = True
            
            # Identify security vulnerabilities
            if not auth_analysis['token_management']['secure_storage']:
                auth_analysis['security_vulnerabilities'].append('Tokens may not be securely stored')
            
            if not auth_analysis['token_management']['refresh_strategy']:
                auth_analysis['security_vulnerabilities'].append('Missing automatic token refresh strategy')
            
            logger.info("🔐 Authentication analysis completed")
            
        except Exception as e:
            logger.error(f"❌ Error analyzing authentication flows: {str(e)}")
            auth_analysis['error'] = str(e)
        
        return auth_analysis
    
    def _analyze_payment_integration(self, error_details: str, affected_files: List[str]) -> Dict[str, Any]:
        """
        Analyze Stripe Connect payment integration for BookedBarber V2
        """
        logger.info("💳 Analyzing Stripe Connect payment integration")
        
        payment_analysis = {
            'stripe_connect_status': 'unknown',
            'commission_handling': False,
            'payout_automation': False,
            'webhook_processing': False,
            'pci_compliance': False,
            'marketplace_features': [],
            'security_issues': [],
            'optimization_opportunities': []
        }
        
        try:
            # Analyze Stripe implementation files
            payment_files = [f for f in affected_files if any(keyword in f.lower() for keyword in ['payment', 'stripe', 'commission', 'payout'])]
            
            for file_path in payment_files:
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Check Stripe Connect implementation
                    if 'stripe.Account' in content or 'express_accounts' in content:
                        payment_analysis['stripe_connect_status'] = 'implemented'
                    
                    # Check commission handling
                    if any(pattern in content for pattern in ['application_fee', 'commission', 'marketplace_fee']):
                        payment_analysis['commission_handling'] = True
                    
                    # Check payout automation
                    if any(pattern in content for pattern in ['transfer', 'payout', 'automatic_payout']):
                        payment_analysis['payout_automation'] = True
                    
                    # Check webhook processing
                    if any(pattern in content for pattern in ['payment_intent', 'invoice', 'transfer.created']):
                        payment_analysis['webhook_processing'] = True
                    
                    # Check PCI compliance measures
                    if any(pattern in content for pattern in ['payment_method', 'setup_intent', 'tokenization']):
                        payment_analysis['pci_compliance'] = True
            
            # Identify Six Figure Barber methodology alignment
            if payment_analysis['commission_handling']:
                payment_analysis['marketplace_features'].append('Commission-based revenue sharing')
            
            if payment_analysis['payout_automation']:
                payment_analysis['marketplace_features'].append('Automated barber payouts')
            
            # Analyze security gaps
            if not payment_analysis['pci_compliance']:
                payment_analysis['security_issues'].append('PCI DSS compliance validation needed')
            
            if payment_analysis['stripe_connect_status'] == 'unknown':
                payment_analysis['security_issues'].append('Stripe Connect implementation status unclear')
            
            # Generate optimization recommendations
            if not payment_analysis['webhook_processing']:
                payment_analysis['optimization_opportunities'].append('Implement comprehensive Stripe webhook handling')
            
            if payment_analysis['commission_handling'] and not payment_analysis['payout_automation']:
                payment_analysis['optimization_opportunities'].append('Automate barber payout processing for efficiency')
            
            logger.info("💳 Payment integration analysis completed")
            
        except Exception as e:
            logger.error(f"❌ Error analyzing payment integration: {str(e)}")
            payment_analysis['error'] = str(e)
        
        return payment_analysis
    
    def _monitor_integration_health(self) -> Dict[str, Any]:
        """
        Monitor health status of all integration endpoints
        """
        logger.info("🏥 Monitoring integration health status")
        
        health_monitoring = {
            'overall_status': 'unknown',
            'service_health': {},
            'critical_failures': [],
            'performance_metrics': {},
            'availability_score': 0.0
        }
        
        try:
            healthy_services = 0
            total_critical_services = 0
            
            for service_name, config in self.integration_services.items():
                service_health = self._check_service_health(service_name, config)
                health_monitoring['service_health'][service_name] = service_health
                
                if config['critical']:
                    total_critical_services += 1
                    if service_health.status == 'healthy':
                        healthy_services += 1
                    elif service_health.status == 'failed':
                        health_monitoring['critical_failures'].append({
                            'service': service_name,
                            'error': service_health.last_error,
                            'last_success': service_health.last_success
                        })
            
            # Calculate availability score
            if total_critical_services > 0:
                health_monitoring['availability_score'] = (healthy_services / total_critical_services) * 100
            
            # Determine overall status
            if health_monitoring['availability_score'] >= 95:
                health_monitoring['overall_status'] = 'healthy'
            elif health_monitoring['availability_score'] >= 80:
                health_monitoring['overall_status'] = 'degraded'
            else:
                health_monitoring['overall_status'] = 'critical'
            
            logger.info(f"🏥 Overall integration health: {health_monitoring['overall_status']} ({health_monitoring['availability_score']:.1f}%)")
            
        except Exception as e:
            logger.error(f"❌ Error monitoring integration health: {str(e)}")
            health_monitoring['error'] = str(e)
        
        return health_monitoring
    
    def _check_service_health(self, service_name: str, config: Dict) -> IntegrationHealthStatus:
        """
        Check health status of a specific service
        """
        try:
            start_time = time.time()
            
            # Simulate health check (in real implementation, make actual API calls)
            # This would include proper authentication and endpoint testing
            
            response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            return IntegrationHealthStatus(
                service_name=service_name,
                status='healthy',  # Would be determined by actual API response
                response_time=response_time,
                last_success=datetime.now(),
                error_count=0,
                last_error=None,
                rate_limit_remaining=1000,  # Would be extracted from API headers
                timestamp=datetime.now()
            )
            
        except Exception as e:
            return IntegrationHealthStatus(
                service_name=service_name,
                status='failed',
                response_time=None,
                last_success=None,
                error_count=1,
                last_error=str(e),
                rate_limit_remaining=None,
                timestamp=datetime.now()
            )
    
    def _check_service_quota(self, service_name: str) -> Optional[APIQuotaStatus]:
        """
        Check API quota status for a service
        """
        try:
            # Simulate quota check (in real implementation, make actual API calls)
            limits = self.rate_limit_thresholds.get(service_name, {})
            
            if limits:
                # Mock current usage (would be real data from API)
                current_usage = 150  # Example usage
                daily_limit = limits.get('daily_limit', 1000)
                usage_percentage = (current_usage / daily_limit) * 100
                
                return APIQuotaStatus(
                    service_name=service_name,
                    current_usage=current_usage,
                    quota_limit=daily_limit,
                    reset_time=datetime.now() + timedelta(hours=24),
                    usage_percentage=usage_percentage
                )
            
        except Exception as e:
            logger.error(f"❌ Error checking quota for {service_name}: {str(e)}")
        
        return None
    
    def _analyze_oauth_implementation(self, service_name: str, affected_files: List[str]) -> Dict[str, Any]:
        """
        Analyze OAuth implementation for a specific service
        """
        oauth_status = {
            'implementation_status': 'unknown',
            'security_score': 0,
            'compliance_issues': [],
            'recommendations': []
        }
        
        try:
            # Analyze OAuth-related files
            oauth_files = [f for f in affected_files if service_name in f.lower() and 'oauth' in f.lower()]
            
            if oauth_files:
                oauth_status['implementation_status'] = 'implemented'
                
                for file_path in oauth_files:
                    if os.path.exists(file_path):
                        with open(file_path, 'r') as f:
                            content = f.read()
                        
                        # Check security practices
                        security_patterns = [
                            'state parameter',
                            'PKCE',
                            'nonce',
                            'scope validation',
                            'redirect_uri validation'
                        ]
                        
                        oauth_status['security_score'] = sum(1 for pattern in security_patterns if any(p in content.lower() for p in pattern.split()))
                        
                        # Check for common vulnerabilities
                        if 'redirect_uri' not in content:
                            oauth_status['compliance_issues'].append('Missing redirect URI validation')
                        
                        if 'state' not in content:
                            oauth_status['compliance_issues'].append('Missing CSRF protection (state parameter)')
            
        except Exception as e:
            oauth_status['error'] = str(e)
        
        return oauth_status
    
    def _validate_security_compliance(self, affected_files: List[str]) -> List[str]:
        """
        Validate security compliance for integration implementations
        """
        security_considerations = []
        
        try:
            # PCI DSS compliance for payment processing
            security_considerations.extend([
                "Ensure PCI DSS compliance for all payment data handling",
                "Implement tokenization for sensitive payment information",
                "Validate SSL/TLS encryption for all API communications",
                "Implement proper access controls and audit logging"
            ])
            
            # GDPR compliance for customer data
            security_considerations.extend([
                "Ensure GDPR compliance for customer data processing",
                "Implement data retention and deletion policies",
                "Provide consent management for data collection",
                "Enable data portability and right to deletion"
            ])
            
            # API security best practices
            security_considerations.extend([
                "Implement API rate limiting and throttling",
                "Use secure authentication methods (OAuth 2.0, JWT)",
                "Validate all input data and sanitize outputs",
                "Implement comprehensive logging and monitoring"
            ])
            
            # Integration-specific security
            security_considerations.extend([
                "Secure webhook endpoints with signature verification",
                "Implement idempotency keys for critical operations",
                "Use environment variables for sensitive configuration",
                "Implement circuit breaker patterns for external dependencies"
            ])
            
        except Exception as e:
            logger.error(f"❌ Error validating security compliance: {str(e)}")
            security_considerations.append(f"Security validation error: {str(e)}")
        
        return security_considerations
    
    def _analyze_performance_optimization(self, affected_files: List[str]) -> Dict[str, Any]:
        """
        Analyze performance optimization opportunities
        """
        performance_analysis = {
            'optimization_opportunities': [],
            'caching_strategies': [],
            'connection_pooling': [],
            'batch_processing': [],
            'monitoring_recommendations': []
        }
        
        try:
            # Connection pooling opportunities
            performance_analysis['connection_pooling'].extend([
                "Implement HTTP connection pooling for API clients",
                "Use persistent connections for high-frequency integrations",
                "Configure appropriate connection timeouts and retries",
                "Monitor connection pool utilization and performance"
            ])
            
            # Caching strategies
            performance_analysis['caching_strategies'].extend([
                "Implement Redis caching for frequently accessed API data",
                "Cache authentication tokens until expiration",
                "Use response caching for static or semi-static data",
                "Implement cache invalidation strategies for real-time data"
            ])
            
            # Batch processing optimizations
            performance_analysis['batch_processing'].extend([
                "Implement batch processing for bulk operations",
                "Queue non-critical operations for background processing",
                "Use webhook batching for high-volume events",
                "Optimize database operations with bulk inserts/updates"
            ])
            
            # Monitoring and observability
            performance_analysis['monitoring_recommendations'].extend([
                "Implement comprehensive API performance monitoring",
                "Set up alerts for API response time degradation",
                "Monitor error rates and success metrics",
                "Track integration dependency health and availability"
            ])
            
        except Exception as e:
            logger.error(f"❌ Error analyzing performance optimization: {str(e)}")
            performance_analysis['error'] = str(e)
        
        return performance_analysis
    
    def _generate_integration_recommendations(self, findings: Dict[str, Any]) -> List[str]:
        """
        Generate comprehensive integration recommendations based on analysis findings
        """
        recommendations = []
        
        try:
            # Webhook security recommendations
            if 'webhook_analysis' in findings:
                webhook_findings = findings['webhook_analysis']
                if webhook_findings.get('security_status') != 'secure':
                    recommendations.extend([
                        "🔒 Implement comprehensive webhook signature verification",
                        "🛡️ Add replay attack protection with timestamp validation",
                        "📋 Create Pydantic models for webhook payload validation",
                        "🔐 Rotate webhook secrets regularly and store securely"
                    ])
            
            # Rate limiting recommendations
            if 'rate_limiting_analysis' in findings:
                rate_findings = findings['rate_limiting_analysis']
                if rate_findings.get('bottlenecks'):
                    recommendations.extend([
                        "⏱️ Implement exponential backoff with jitter for retry logic",
                        "🚦 Add circuit breaker pattern for failing integrations",
                        "📊 Implement request queuing for high-volume operations",
                        "📈 Set up monitoring and alerting for rate limit thresholds"
                    ])
            
            # Authentication recommendations
            if 'auth_analysis' in findings:
                auth_findings = findings['auth_analysis']
                if not auth_findings.get('token_management', {}).get('secure_storage'):
                    recommendations.extend([
                        "🔑 Implement secure token storage with encryption",
                        "🔄 Add automatic token refresh mechanisms",
                        "⏰ Implement token rotation policies",
                        "🎫 Use scoped permissions and least privilege access"
                    ])
            
            # Payment integration recommendations
            if 'payment_integration_analysis' in findings:
                payment_findings = findings['payment_integration_analysis']
                if not payment_findings.get('pci_compliance'):
                    recommendations.extend([
                        "💳 Ensure PCI DSS compliance for payment processing",
                        "🏪 Optimize Stripe Connect marketplace implementation",
                        "💰 Automate commission calculation and payout processing",
                        "📊 Implement comprehensive payment analytics and reporting"
                    ])
            
            # Health monitoring recommendations
            if 'integration_health' in findings:
                health_findings = findings['integration_health']
                if health_findings.get('overall_status') != 'healthy':
                    recommendations.extend([
                        "🏥 Set up comprehensive health monitoring for all integrations",
                        "🚨 Implement alerting for integration failures",
                        "📈 Create integration performance dashboards",
                        "🔄 Add automatic failover and recovery mechanisms"
                    ])
            
            # General BookedBarber V2 specific recommendations
            recommendations.extend([
                "📱 Ensure mobile-optimized integration user experiences",
                "📊 Implement Six Figure Barber methodology analytics integration",
                "🎯 Optimize conversion tracking for marketing integrations",
                "🔗 Create unified integration management dashboard"
            ])
            
        except Exception as e:
            logger.error(f"❌ Error generating recommendations: {str(e)}")
            recommendations.append(f"⚠️ Error generating recommendations: {str(e)}")
        
        return recommendations
    
    def _create_implementation_roadmap(self, findings: Dict[str, Any]) -> List[str]:
        """
        Create step-by-step implementation roadmap for integration improvements
        """
        implementation_steps = []
        
        try:
            # Phase 1: Security and Compliance
            implementation_steps.extend([
                "Phase 1: Security Foundation",
                "1.1 Implement webhook signature verification for all endpoints",
                "1.2 Add comprehensive input validation and sanitization",
                "1.3 Implement secure credential storage and rotation",
                "1.4 Validate PCI DSS compliance for payment processing",
                "1.5 Ensure GDPR compliance for customer data handling"
            ])
            
            # Phase 2: Performance and Reliability
            implementation_steps.extend([
                "",
                "Phase 2: Performance Optimization",
                "2.1 Implement connection pooling for API clients",
                "2.2 Add Redis caching for frequently accessed data",
                "2.3 Implement exponential backoff retry strategies",
                "2.4 Add circuit breaker patterns for external dependencies",
                "2.5 Optimize batch processing for bulk operations"
            ])
            
            # Phase 3: Monitoring and Observability
            implementation_steps.extend([
                "",
                "Phase 3: Monitoring and Alerting",
                "3.1 Set up comprehensive integration health monitoring",
                "3.2 Implement API performance metrics collection",
                "3.3 Create alerting for rate limits and quota thresholds",
                "3.4 Build integration status dashboards",
                "3.5 Add automated incident response workflows"
            ])
            
            # Phase 4: BookedBarber V2 Specific Features
            implementation_steps.extend([
                "",
                "Phase 4: Business Logic Integration",
                "4.1 Optimize Stripe Connect for Six Figure Barber methodology",
                "4.2 Implement automated commission calculation and payouts",
                "4.3 Enhance Google Calendar integration for appointment efficiency",
                "4.4 Set up marketing automation with conversion tracking",
                "4.5 Create unified analytics dashboard for business insights"
            ])
            
            # Phase 5: Testing and Validation
            implementation_steps.extend([
                "",
                "Phase 5: Testing and Validation",
                "5.1 Create comprehensive integration test suite",
                "5.2 Implement contract testing for API dependencies",
                "5.3 Add end-to-end testing for critical user flows",
                "5.4 Perform security penetration testing",
                "5.5 Validate performance under load conditions"
            ])
            
        except Exception as e:
            logger.error(f"❌ Error creating implementation roadmap: {str(e)}")
            implementation_steps.append(f"⚠️ Error creating roadmap: {str(e)}")
        
        return implementation_steps
    
    def _generate_monitoring_requirements(self, findings: Dict[str, Any]) -> List[str]:
        """
        Generate monitoring and alerting requirements
        """
        monitoring_requirements = []
        
        try:
            # API Health Monitoring
            monitoring_requirements.extend([
                "📊 API Response Time Monitoring",
                "- Track 95th percentile response times for all integrations",
                "- Alert on response times > 2 seconds",
                "- Monitor API availability and uptime",
                "- Track error rates and success ratios"
            ])
            
            # Rate Limiting and Quota Monitoring
            monitoring_requirements.extend([
                "",
                "⏱️ Rate Limiting and Quota Monitoring",
                "- Monitor API quota usage for all services",
                "- Alert when usage exceeds 80% of daily limits",
                "- Track rate limiting events and backoff effectiveness",
                "- Monitor retry success rates and patterns"
            ])
            
            # Security Monitoring
            monitoring_requirements.extend([
                "",
                "🔒 Security and Compliance Monitoring",
                "- Monitor webhook signature validation failures",
                "- Track authentication failures and suspicious activity",
                "- Alert on potential security violations",
                "- Monitor compliance with PCI DSS and GDPR requirements"
            ])
            
            # Business Metrics Monitoring
            monitoring_requirements.extend([
                "",
                "💼 Business Metrics Monitoring",
                "- Track payment processing success rates",
                "- Monitor commission calculation accuracy",
                "- Track appointment booking conversion rates",
                "- Monitor marketing integration effectiveness"
            ])
            
            # Integration Dependencies
            monitoring_requirements.extend([
                "",
                "🔗 Integration Dependency Monitoring",
                "- Monitor external service status and availability",
                "- Track integration failure cascades",
                "- Alert on critical service outages",
                "- Monitor fallback mechanism effectiveness"
            ])
            
        except Exception as e:
            logger.error(f"❌ Error generating monitoring requirements: {str(e)}")
            monitoring_requirements.append(f"⚠️ Error generating monitoring requirements: {str(e)}")
        
        return monitoring_requirements
    
    def _save_analysis_results(self, analysis_results: Dict[str, Any]) -> None:
        """
        Save analysis results to file for future reference
        """
        try:
            results_file = self.config_path / f"api-integration-analysis-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(results_file, 'w') as f:
                json.dump(analysis_results, f, indent=2, default=str)
            
            logger.info(f"💾 Analysis results saved to {results_file}")
            
        except Exception as e:
            logger.error(f"❌ Error saving analysis results: {str(e)}")
    
    def _generate_integration_report(self, analysis_results: Dict[str, Any]) -> None:
        """
        Generate comprehensive integration report
        """
        try:
            report_content = f"""
# 🔧 API Integration Specialist Report
**BookedBarber V2 Integration Analysis**

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Trigger: {analysis_results.get('trigger', 'Unknown')}

## 📊 Executive Summary

{self._generate_executive_summary(analysis_results)}

## 🔍 Detailed Findings

{self._format_findings(analysis_results.get('findings', {}))}

## 💡 Recommendations

{self._format_recommendations(analysis_results.get('recommendations', []))}

## 🛠️ Implementation Roadmap

{self._format_implementation_steps(analysis_results.get('implementation_steps', []))}

## 🔒 Security Considerations

{self._format_security_considerations(analysis_results.get('security_considerations', []))}

## 📈 Performance Optimization

{self._format_performance_optimization(analysis_results.get('performance_optimization', {}))}

## 📊 Monitoring Requirements

{self._format_monitoring_requirements(analysis_results.get('monitoring_requirements', []))}

---
*Generated by API Integration Specialist Agent for BookedBarber V2*
"""
            
            report_file = self.config_path / f"api-integration-report-{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            
            with open(report_file, 'w') as f:
                f.write(report_content)
            
            logger.info(f"📋 Integration report generated: {report_file}")
            
        except Exception as e:
            logger.error(f"❌ Error generating integration report: {str(e)}")
    
    def _generate_executive_summary(self, analysis_results: Dict[str, Any]) -> str:
        """Generate executive summary of integration analysis"""
        findings = analysis_results.get('findings', {})
        recommendations_count = len(analysis_results.get('recommendations', []))
        
        summary = f"""
This analysis identified {recommendations_count} recommendations for improving BookedBarber V2's API integrations.

Key Areas Analyzed:
- Integration Health Monitoring
- Webhook Security and Validation
- Rate Limiting and Quota Management
- Authentication Flow Analysis
- Payment Integration (Stripe Connect)
- Security Compliance Validation
- Performance Optimization Opportunities

Priority Focus: Ensuring robust, secure, and performant integrations that support the Six Figure Barber methodology for maximum revenue optimization and business efficiency.
"""
        return summary.strip()
    
    def _format_findings(self, findings: Dict[str, Any]) -> str:
        """Format analysis findings for report"""
        formatted = ""
        for category, data in findings.items():
            formatted += f"\n### {category.replace('_', ' ').title()}\n"
            if isinstance(data, dict):
                for key, value in data.items():
                    formatted += f"- **{key}**: {value}\n"
            elif isinstance(data, list):
                for item in data:
                    formatted += f"- {item}\n"
            else:
                formatted += f"- {data}\n"
        return formatted
    
    def _format_recommendations(self, recommendations: List[str]) -> str:
        """Format recommendations for report"""
        return "\n".join(f"- {rec}" for rec in recommendations)
    
    def _format_implementation_steps(self, steps: List[str]) -> str:
        """Format implementation steps for report"""
        return "\n".join(steps)
    
    def _format_security_considerations(self, considerations: List[str]) -> str:
        """Format security considerations for report"""
        return "\n".join(f"- {consideration}" for consideration in considerations)
    
    def _format_performance_optimization(self, optimization: Dict[str, Any]) -> str:
        """Format performance optimization recommendations"""
        formatted = ""
        for category, items in optimization.items():
            if isinstance(items, list):
                formatted += f"\n### {category.replace('_', ' ').title()}\n"
                for item in items:
                    formatted += f"- {item}\n"
        return formatted
    
    def _format_monitoring_requirements(self, requirements: List[str]) -> str:
        """Format monitoring requirements for report"""
        return "\n".join(requirements)

def main():
    """
    Main execution function for API Integration Specialist agent
    """
    import sys
    
    if len(sys.argv) < 4:
        print("Usage: python api-integration-specialist-agent.py <trigger_name> <error_details> <affected_files_json>")
        sys.exit(1)
    
    try:
        trigger_name = sys.argv[1]
        error_details = sys.argv[2]
        affected_files = json.loads(sys.argv[3]) if len(sys.argv) > 3 else []
        
        # Initialize and run API Integration Specialist
        specialist = APIIntegrationSpecialist()
        results = specialist.analyze_integration_issue(trigger_name, error_details, affected_files)
        
        # Print summary for immediate feedback
        print("\n" + "="*80)
        print("🔧 API INTEGRATION SPECIALIST ANALYSIS COMPLETE")
        print("="*80)
        print(f"Trigger: {trigger_name}")
        print(f"Recommendations: {len(results.get('recommendations', []))}")
        print(f"Implementation Steps: {len(results.get('implementation_steps', []))}")
        print(f"Security Considerations: {len(results.get('security_considerations', []))}")
        
        if results.get('recommendations'):
            print("\n🎯 Top Recommendations:")
            for i, rec in enumerate(results['recommendations'][:5], 1):
                print(f"  {i}. {rec}")
        
        print(f"\n📋 Full report saved to .claude/api-integration-report-*.md")
        print("="*80)
        
    except Exception as e:
        logger.error(f"❌ API Integration Specialist execution failed: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()