"""
Production Error Management Service
Automated error escalation, recovery workflows, and incident management
for production environment reliability and business continuity
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import json
import os

from services.enhanced_sentry_monitoring import enhanced_sentry, AlertSeverity, BusinessImpact
from services.error_monitoring_service import error_monitoring_service
from services.performance_monitoring_service import performance_monitor


logger = logging.getLogger(__name__)


class IncidentStatus(Enum):
    """Incident status levels"""
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"


class EscalationLevel(Enum):
    """Error escalation levels"""
    L1_AUTOMATIC = "l1_automatic"
    L2_DEVELOPMENT = "l2_development"
    L3_OPERATIONS = "l3_operations"
    L4_EXECUTIVE = "l4_executive"


@dataclass
class ErrorIncident:
    """Error incident tracking"""
    id: str
    title: str
    description: str
    status: IncidentStatus
    severity: AlertSeverity
    business_impact: BusinessImpact
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    escalation_level: EscalationLevel = EscalationLevel.L1_AUTOMATIC
    affected_users: int = 0
    revenue_impact: float = 0.0
    related_errors: List[str] = None
    recovery_actions: List[Dict[str, Any]] = None
    assignee: Optional[str] = None
    
    def __post_init__(self):
        if self.related_errors is None:
            self.related_errors = []
        if self.recovery_actions is None:
            self.recovery_actions = []


@dataclass
class RecoveryAction:
    """Automated recovery action configuration"""
    name: str
    description: str
    condition: str  # Python expression to evaluate
    action_type: str  # 'restart', 'scale', 'failover', 'notify', 'custom'
    parameters: Dict[str, Any]
    max_attempts: int = 3
    cooldown_minutes: int = 30
    success_criteria: Optional[str] = None
    rollback_action: Optional[str] = None


@dataclass
class EscalationRule:
    """Error escalation rule configuration"""
    name: str
    condition: str  # Python expression
    escalation_level: EscalationLevel
    delay_minutes: int
    notification_channels: List[str]
    business_impact_threshold: BusinessImpact
    enabled: bool = True


class ProductionErrorManagement:
    """Comprehensive production error management system"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Incident tracking
        self.active_incidents = {}
        self.incident_history = deque(maxlen=1000)
        self.incident_counter = 0
        
        # Recovery automation
        self.recovery_actions = self._create_default_recovery_actions()
        self.recovery_history = deque(maxlen=500)
        
        # Escalation management
        self.escalation_rules = self._create_default_escalation_rules()
        self.escalation_history = deque(maxlen=500)
        
        # Monitoring and alerting
        self.alert_suppressions = {}
        self.maintenance_windows = []
        
        # Background tasks
        self._background_task = None
        self._stop_background = False
        
        # Start background monitoring
        self._start_background_monitoring()
    
    def _create_default_recovery_actions(self) -> List[RecoveryAction]:
        """Create default automated recovery actions"""
        return [
            RecoveryAction(
                name="Database Connection Recovery",
                description="Attempt to recover database connection pool",
                condition="'database' in error_category and 'connection' in error_message.lower()",
                action_type="restart",
                parameters={"service": "database_pool", "graceful": True},
                max_attempts=3,
                cooldown_minutes=5,
                success_criteria="database_health_check_success"
            ),
            RecoveryAction(
                name="Redis Connection Recovery",
                description="Restart Redis connection and clear problematic cache",
                condition="'redis' in error_category or 'cache' in error_message.lower()",
                action_type="restart",
                parameters={"service": "redis_client", "clear_cache": True},
                max_attempts=2,
                cooldown_minutes=10,
                success_criteria="redis_health_check_success"
            ),
            RecoveryAction(
                name="Payment Service Circuit Breaker Reset",
                description="Reset circuit breaker for payment services after cooling period",
                condition="'payment' in error_category and circuit_breaker_open",
                action_type="custom",
                parameters={"action": "reset_circuit_breaker", "service": "payment"},
                max_attempts=1,
                cooldown_minutes=30,
                success_criteria="payment_service_responsive"
            ),
            RecoveryAction(
                name="High Memory Usage Cleanup",
                description="Trigger garbage collection and cache cleanup",
                condition="memory_usage > 85 and error_rate > 5",
                action_type="custom",
                parameters={"action": "memory_cleanup", "aggressive": True},
                max_attempts=2,
                cooldown_minutes=15,
                success_criteria="memory_usage < 70"
            ),
            RecoveryAction(
                name="API Rate Limit Recovery",
                description="Implement backoff strategy for rate-limited APIs",
                condition="http_status == 429 or 'rate limit' in error_message.lower()",
                action_type="custom",
                parameters={"action": "implement_backoff", "duration_minutes": 15},
                max_attempts=1,
                cooldown_minutes=60,
                success_criteria="api_requests_successful"
            )
        ]
    
    def _create_default_escalation_rules(self) -> List[EscalationRule]:
        """Create default escalation rules"""
        return [
            EscalationRule(
                name="Revenue Blocking Immediate Escalation",
                condition="business_impact == 'revenue_blocking'",
                escalation_level=EscalationLevel.L3_OPERATIONS,
                delay_minutes=0,
                notification_channels=['slack', 'phone', 'email'],
                business_impact_threshold=BusinessImpact.REVENUE_BLOCKING
            ),
            EscalationRule(
                name="Critical Error Escalation",
                condition="severity == 'critical' and incident_duration > 15",
                escalation_level=EscalationLevel.L2_DEVELOPMENT,
                delay_minutes=15,
                notification_channels=['slack', 'email'],
                business_impact_threshold=BusinessImpact.MAJOR
            ),
            EscalationRule(
                name="High Error Rate Escalation",
                condition="error_rate > 10 and incident_duration > 30",
                escalation_level=EscalationLevel.L2_DEVELOPMENT,
                delay_minutes=30,
                notification_channels=['slack', 'email'],
                business_impact_threshold=BusinessImpact.MAJOR
            ),
            EscalationRule(
                name="Extended Incident Escalation",
                condition="incident_duration > 120 and business_impact in ['major', 'revenue_blocking']",
                escalation_level=EscalationLevel.L4_EXECUTIVE,
                delay_minutes=120,
                notification_channels=['slack', 'phone', 'email'],
                business_impact_threshold=BusinessImpact.MAJOR
            ),
            EscalationRule(
                name="User Impact Escalation",
                condition="affected_users > 100 and incident_duration > 45",
                escalation_level=EscalationLevel.L3_OPERATIONS,
                delay_minutes=45,
                notification_channels=['slack', 'email'],
                business_impact_threshold=BusinessImpact.MAJOR
            )
        ]
    
    async def process_error_event(self, error_data: Dict[str, Any]) -> Optional[str]:
        """Process incoming error event and determine appropriate response"""
        
        try:
            # Extract error information
            error_category = error_data.get('category', 'unknown')
            error_message = error_data.get('message', '')
            severity = AlertSeverity(error_data.get('severity', 'medium'))
            business_impact = BusinessImpact(error_data.get('business_impact', 'minor'))
            
            # Check if this is part of an existing incident
            incident_id = await self._find_or_create_incident(error_data, severity, business_impact)
            
            # Attempt automated recovery
            recovery_attempted = await self._attempt_automated_recovery(error_data, incident_id)
            
            # Check escalation rules
            await self._check_escalation_rules(incident_id)
            
            # Update incident metrics
            await self._update_incident_metrics(incident_id, error_data)
            
            return incident_id
            
        except Exception as e:
            self.logger.error(f"Error processing error event: {e}")
            return None
    
    async def _find_or_create_incident(self, error_data: Dict[str, Any], 
                                     severity: AlertSeverity, 
                                     business_impact: BusinessImpact) -> str:
        """Find existing incident or create new one"""
        
        # Generate incident fingerprint for grouping
        fingerprint = self._generate_incident_fingerprint(error_data)
        
        # Look for existing incident with same fingerprint
        for incident_id, incident in self.active_incidents.items():
            if fingerprint in incident.related_errors:
                # Update existing incident
                incident.updated_at = datetime.utcnow()
                if severity.value == 'critical' and incident.severity != AlertSeverity.CRITICAL:
                    incident.severity = severity
                if business_impact.value == 'revenue_blocking':
                    incident.business_impact = business_impact
                return incident_id
        
        # Create new incident
        incident_id = f"INC-{self.incident_counter:06d}"
        self.incident_counter += 1
        
        incident = ErrorIncident(
            id=incident_id,
            title=self._generate_incident_title(error_data),
            description=self._generate_incident_description(error_data),
            status=IncidentStatus.OPEN,
            severity=severity,
            business_impact=business_impact,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            related_errors=[fingerprint]
        )
        
        self.active_incidents[incident_id] = incident
        
        # Log incident creation
        self.logger.warning(f"New incident created: {incident_id} - {incident.title}")
        
        # Report to monitoring
        await enhanced_sentry.capture_business_event(
            "incident_created",
            f"New incident: {incident.title}",
            {
                "incident_id": incident_id,
                "severity": severity.value,
                "business_impact": business_impact.value
            }
        )
        
        return incident_id
    
    async def _attempt_automated_recovery(self, error_data: Dict[str, Any], incident_id: str) -> bool:
        """Attempt automated recovery based on error patterns"""
        
        recovery_attempted = False
        
        for action in self.recovery_actions:
            if self._should_attempt_recovery(action, error_data, incident_id):
                try:
                    self.logger.info(f"Attempting recovery action: {action.name}")
                    
                    # Record recovery attempt
                    recovery_record = {
                        'incident_id': incident_id,
                        'action_name': action.name,
                        'timestamp': datetime.utcnow(),
                        'parameters': action.parameters,
                        'status': 'attempting'
                    }
                    
                    # Execute recovery action
                    success = await self._execute_recovery_action(action, error_data)
                    
                    recovery_record['status'] = 'success' if success else 'failed'
                    recovery_record['completed_at'] = datetime.utcnow()
                    
                    self.recovery_history.append(recovery_record)
                    
                    # Update incident with recovery action
                    if incident_id in self.active_incidents:
                        self.active_incidents[incident_id].recovery_actions.append(recovery_record)
                    
                    if success:
                        self.logger.info(f"Recovery action succeeded: {action.name}")
                        recovery_attempted = True
                        
                        # Check if incident should be resolved
                        if await self._verify_recovery_success(action, error_data):
                            await self._resolve_incident(incident_id, f"Automated recovery: {action.name}")
                        
                        break  # Don't try other actions if one succeeds
                    else:
                        self.logger.warning(f"Recovery action failed: {action.name}")
                        
                except Exception as e:
                    self.logger.error(f"Recovery action error ({action.name}): {e}")
        
        return recovery_attempted
    
    async def _execute_recovery_action(self, action: RecoveryAction, error_data: Dict[str, Any]) -> bool:
        """Execute specific recovery action"""
        
        try:
            if action.action_type == "restart":
                return await self._execute_restart_action(action.parameters)
            elif action.action_type == "scale":
                return await self._execute_scale_action(action.parameters)
            elif action.action_type == "failover":
                return await self._execute_failover_action(action.parameters)
            elif action.action_type == "notify":
                return await self._execute_notify_action(action.parameters)
            elif action.action_type == "custom":
                return await self._execute_custom_action(action.parameters)
            else:
                self.logger.warning(f"Unknown recovery action type: {action.action_type}")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to execute recovery action {action.name}: {e}")
            return False
    
    async def _execute_restart_action(self, parameters: Dict[str, Any]) -> bool:
        """Execute restart recovery action"""
        service = parameters.get('service')
        graceful = parameters.get('graceful', True)
        
        self.logger.info(f"Executing restart for service: {service} (graceful: {graceful})")
        
        # Implementation would depend on the specific service architecture
        # For now, simulate restart
        await asyncio.sleep(2)  # Simulate restart time
        return True
    
    async def _execute_scale_action(self, parameters: Dict[str, Any]) -> bool:
        """Execute scaling recovery action"""
        service = parameters.get('service')
        scale_factor = parameters.get('scale_factor', 1.5)
        
        self.logger.info(f"Executing scale for service: {service} (factor: {scale_factor})")
        
        # Implementation would integrate with container orchestration
        await asyncio.sleep(1)
        return True
    
    async def _execute_failover_action(self, parameters: Dict[str, Any]) -> bool:
        """Execute failover recovery action"""
        primary_service = parameters.get('primary_service')
        backup_service = parameters.get('backup_service')
        
        self.logger.info(f"Executing failover from {primary_service} to {backup_service}")
        
        # Implementation would handle service failover
        await asyncio.sleep(1)
        return True
    
    async def _execute_notify_action(self, parameters: Dict[str, Any]) -> bool:
        """Execute notification action"""
        channels = parameters.get('channels', ['email'])
        message = parameters.get('message', 'Automated recovery notification')
        
        self.logger.info(f"Sending notifications to: {channels}")
        
        # Implementation would send actual notifications
        return True
    
    async def _execute_custom_action(self, parameters: Dict[str, Any]) -> bool:
        """Execute custom recovery action"""
        action_name = parameters.get('action')
        
        if action_name == "reset_circuit_breaker":
            # Reset circuit breaker for specified service
            service = parameters.get('service')
            self.logger.info(f"Resetting circuit breaker for {service}")
            return True
            
        elif action_name == "memory_cleanup":
            # Trigger memory cleanup
            aggressive = parameters.get('aggressive', False)
            self.logger.info(f"Triggering memory cleanup (aggressive: {aggressive})")
            return True
            
        elif action_name == "implement_backoff":
            # Implement backoff strategy
            duration = parameters.get('duration_minutes', 15)
            self.logger.info(f"Implementing backoff strategy for {duration} minutes")
            return True
        
        return False
    
    async def _check_escalation_rules(self, incident_id: str):
        """Check if incident should be escalated"""
        
        if incident_id not in self.active_incidents:
            return
        
        incident = self.active_incidents[incident_id]
        incident_duration = (datetime.utcnow() - incident.created_at).total_seconds() / 60
        
        # Get current system metrics for rule evaluation
        error_rate = await self._get_current_error_rate()
        affected_users = incident.affected_users
        
        for rule in self.escalation_rules:
            if not rule.enabled:
                continue
            
            # Check if enough time has passed for this rule
            if incident_duration < rule.delay_minutes:
                continue
            
            # Check if already escalated to this level or higher
            if incident.escalation_level.value >= rule.escalation_level.value:
                continue
            
            # Check if business impact meets threshold
            if incident.business_impact.value < rule.business_impact_threshold.value:
                continue
            
            # Evaluate escalation condition
            if self._evaluate_escalation_condition(rule.condition, incident, incident_duration, error_rate, affected_users):
                await self._escalate_incident(incident_id, rule)
    
    def _evaluate_escalation_condition(self, condition: str, incident: ErrorIncident, 
                                     incident_duration: float, error_rate: float, 
                                     affected_users: int) -> bool:
        """Evaluate escalation condition expression"""
        
        # Create evaluation context
        context = {
            'severity': incident.severity.value,
            'business_impact': incident.business_impact.value,
            'incident_duration': incident_duration,
            'error_rate': error_rate,
            'affected_users': affected_users,
            'status': incident.status.value
        }
        
        try:
            return eval(condition, {"__builtins__": {}}, context)
        except Exception as e:
            self.logger.error(f"Failed to evaluate escalation condition: {condition}, error: {e}")
            return False
    
    async def _escalate_incident(self, incident_id: str, rule: EscalationRule):
        """Escalate incident according to rule"""
        
        incident = self.active_incidents[incident_id]
        incident.escalation_level = rule.escalation_level
        incident.updated_at = datetime.utcnow()
        
        # Record escalation
        escalation_record = {
            'incident_id': incident_id,
            'rule_name': rule.name,
            'escalation_level': rule.escalation_level.value,
            'timestamp': datetime.utcnow(),
            'notification_channels': rule.notification_channels
        }
        
        self.escalation_history.append(escalation_record)
        
        # Log escalation
        self.logger.critical(f"Incident escalated: {incident_id} to {rule.escalation_level.value}")
        
        # Send notifications
        await self._send_escalation_notifications(incident, rule)
        
        # Report to monitoring
        await enhanced_sentry.capture_business_event(
            "incident_escalated",
            f"Incident {incident_id} escalated to {rule.escalation_level.value}",
            {
                "incident_id": incident_id,
                "escalation_level": rule.escalation_level.value,
                "rule_name": rule.name
            }
        )
    
    async def _send_escalation_notifications(self, incident: ErrorIncident, rule: EscalationRule):
        """Send escalation notifications through configured channels"""
        
        notification_data = {
            'incident_id': incident.id,
            'title': incident.title,
            'severity': incident.severity.value,
            'business_impact': incident.business_impact.value,
            'escalation_level': rule.escalation_level.value,
            'duration_minutes': (datetime.utcnow() - incident.created_at).total_seconds() / 60,
            'affected_users': incident.affected_users,
            'revenue_impact': incident.revenue_impact
        }
        
        for channel in rule.notification_channels:
            try:
                if channel == 'slack':
                    await self._send_slack_escalation(notification_data)
                elif channel == 'email':
                    await self._send_email_escalation(notification_data)
                elif channel == 'phone':
                    await self._send_phone_escalation(notification_data)
                elif channel == 'webhook':
                    await self._send_webhook_escalation(notification_data)
            except Exception as e:
                self.logger.error(f"Failed to send escalation notification via {channel}: {e}")
    
    async def _resolve_incident(self, incident_id: str, resolution_reason: str):
        """Resolve an incident"""
        
        if incident_id not in self.active_incidents:
            return
        
        incident = self.active_incidents[incident_id]
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_at = datetime.utcnow()
        incident.updated_at = datetime.utcnow()
        
        # Move to history
        self.incident_history.append(asdict(incident))
        del self.active_incidents[incident_id]
        
        # Log resolution
        self.logger.info(f"Incident resolved: {incident_id} - {resolution_reason}")
        
        # Report to monitoring
        await enhanced_sentry.capture_business_event(
            "incident_resolved",
            f"Incident {incident_id} resolved: {resolution_reason}",
            {
                "incident_id": incident_id,
                "resolution_reason": resolution_reason,
                "duration_minutes": (incident.resolved_at - incident.created_at).total_seconds() / 60
            }
        )
    
    async def _update_incident_metrics(self, incident_id: str, error_data: Dict[str, Any]):
        """Update incident metrics with new error data"""
        
        if incident_id not in self.active_incidents:
            return
        
        incident = self.active_incidents[incident_id]
        
        # Update affected users (if available)
        if 'user_id' in error_data and error_data['user_id']:
            # This would track unique users affected
            incident.affected_users += 1
        
        # Update revenue impact (if available)
        if 'revenue_impact' in error_data:
            incident.revenue_impact += error_data.get('revenue_impact', 0)
        
        incident.updated_at = datetime.utcnow()
    
    def _should_attempt_recovery(self, action: RecoveryAction, error_data: Dict[str, Any], incident_id: str) -> bool:
        """Check if recovery action should be attempted"""
        
        # Check cooldown period
        recent_attempts = [
            r for r in self.recovery_history
            if r['action_name'] == action.name and
               (datetime.utcnow() - r['timestamp']).total_seconds() < action.cooldown_minutes * 60
        ]
        
        if len(recent_attempts) >= action.max_attempts:
            return False
        
        # Evaluate condition
        return self._evaluate_recovery_condition(action.condition, error_data)
    
    def _evaluate_recovery_condition(self, condition: str, error_data: Dict[str, Any]) -> bool:
        """Evaluate recovery condition"""
        
        context = {
            'error_category': error_data.get('category', ''),
            'error_message': error_data.get('message', ''),
            'http_status': error_data.get('status_code', 0),
            'circuit_breaker_open': False,  # Would check actual circuit breaker state
            'memory_usage': 0,  # Would get from system metrics
            'error_rate': 0  # Would get current error rate
        }
        
        try:
            return eval(condition, {"__builtins__": {}}, context)
        except Exception as e:
            self.logger.error(f"Failed to evaluate recovery condition: {condition}, error: {e}")
            return False
    
    async def _verify_recovery_success(self, action: RecoveryAction, error_data: Dict[str, Any]) -> bool:
        """Verify if recovery action was successful"""
        
        if not action.success_criteria:
            return False
        
        # Wait a moment for recovery to take effect
        await asyncio.sleep(5)
        
        # Check success criteria
        # This would integrate with actual health checks
        return True  # Placeholder
    
    def _generate_incident_fingerprint(self, error_data: Dict[str, Any]) -> str:
        """Generate unique fingerprint for incident grouping"""
        components = [
            error_data.get('category', 'unknown'),
            error_data.get('endpoint', 'unknown'),
            str(error_data.get('status_code', 0))
        ]
        return '-'.join(components).lower()
    
    def _generate_incident_title(self, error_data: Dict[str, Any]) -> str:
        """Generate incident title"""
        category = error_data.get('category', 'System')
        endpoint = error_data.get('endpoint', 'Unknown')
        return f"{category.title()} Error on {endpoint}"
    
    def _generate_incident_description(self, error_data: Dict[str, Any]) -> str:
        """Generate incident description"""
        message = error_data.get('message', 'Unknown error')
        endpoint = error_data.get('endpoint', 'unknown')
        status = error_data.get('status_code', 'unknown')
        return f"Error on {endpoint} (Status: {status}): {message}"
    
    async def _get_current_error_rate(self) -> float:
        """Get current system error rate"""
        # This would integrate with actual metrics
        return 0.0
    
    def _start_background_monitoring(self):
        """Start background monitoring tasks"""
        if self._background_task is None:
            self._background_task = asyncio.create_task(self._background_monitor())
    
    async def _background_monitor(self):
        """Background monitoring loop"""
        while not self._stop_background:
            try:
                # Check for stale incidents
                await self._check_stale_incidents()
                
                # Clean up old history
                self._cleanup_old_data()
                
                # Verify system health
                await self._verify_system_health()
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Background monitoring error: {e}")
                await asyncio.sleep(300)  # Wait longer on error
    
    async def _check_stale_incidents(self):
        """Check for incidents that may have resolved automatically"""
        stale_threshold = timedelta(hours=1)
        current_time = datetime.utcnow()
        
        for incident_id, incident in list(self.active_incidents.items()):
            if current_time - incident.updated_at > stale_threshold:
                # Check if incident should auto-resolve
                if await self._should_auto_resolve_incident(incident):
                    await self._resolve_incident(incident_id, "Auto-resolved: no recent activity")
    
    async def _should_auto_resolve_incident(self, incident: ErrorIncident) -> bool:
        """Check if incident should be automatically resolved"""
        # Simple logic - would be more sophisticated in practice
        return incident.status == IncidentStatus.OPEN and incident.severity in [AlertSeverity.LOW, AlertSeverity.MEDIUM]
    
    async def _verify_system_health(self):
        """Verify overall system health"""
        try:
            # Get system metrics
            performance_summary = await performance_monitor.get_system_performance_summary(60)
            error_summary = await error_monitoring_service.get_business_impact_summary()
            
            # Check for concerning trends
            if performance_summary.get('error_rate', {}).get('current_percent', 0) > 5:
                self.logger.warning("High system error rate detected")
            
            if performance_summary.get('cpu', {}).get('current_percent', 0) > 90:
                self.logger.warning("High CPU usage detected")
                
        except Exception as e:
            self.logger.error(f"System health check failed: {e}")
    
    def _cleanup_old_data(self):
        """Clean up old historical data"""
        # Keep history deques at reasonable sizes
        # They're already configured with maxlen, so this is just for logging
        self.logger.debug(f"History sizes - Incidents: {len(self.incident_history)}, "
                         f"Recovery: {len(self.recovery_history)}, "
                         f"Escalation: {len(self.escalation_history)}")
    
    # Placeholder notification methods (to be implemented based on infrastructure)
    async def _send_slack_escalation(self, data: Dict[str, Any]):
        """Send escalation to Slack"""
        pass
    
    async def _send_email_escalation(self, data: Dict[str, Any]):
        """Send escalation email"""
        pass
    
    async def _send_phone_escalation(self, data: Dict[str, Any]):
        """Send phone/SMS escalation"""
        pass
    
    async def _send_webhook_escalation(self, data: Dict[str, Any]):
        """Send webhook escalation"""
        pass
    
    async def stop_monitoring(self):
        """Stop background monitoring"""
        self._stop_background = True
        if self._background_task:
            self._background_task.cancel()
            try:
                await self._background_task
            except asyncio.CancelledError:
                pass
    
    # Public API methods
    async def get_active_incidents(self) -> List[Dict[str, Any]]:
        """Get all active incidents"""
        return [asdict(incident) for incident in self.active_incidents.values()]
    
    async def get_incident_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get incident history"""
        return list(self.incident_history)[-limit:]
    
    async def get_recovery_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recovery action history"""
        return list(self.recovery_history)[-limit:]
    
    async def manually_resolve_incident(self, incident_id: str, reason: str) -> bool:
        """Manually resolve an incident"""
        if incident_id in self.active_incidents:
            await self._resolve_incident(incident_id, f"Manual resolution: {reason}")
            return True
        return False
    
    async def update_incident_assignee(self, incident_id: str, assignee: str) -> bool:
        """Update incident assignee"""
        if incident_id in self.active_incidents:
            self.active_incidents[incident_id].assignee = assignee
            self.active_incidents[incident_id].updated_at = datetime.utcnow()
            return True
        return False


# Global instance
production_error_manager = ProductionErrorManagement()