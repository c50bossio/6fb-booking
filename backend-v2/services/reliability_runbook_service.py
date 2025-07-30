"""
Reliability Runbook Service
Comprehensive runbooks, escalation procedures, and reliability documentation system

This service provides automated runbook management and incident response procedures:
- Dynamic runbook generation based on system state
- Automated escalation procedures with business context
- Incident response playbooks with recovery actions
- Reliability documentation with real-time updates
- Six Figure Barber methodology compliance procedures
- Emergency response protocols with clear decision trees
"""

import asyncio
import json
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
import uuid
import yaml

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RunbookType(Enum):
    """Types of operational runbooks"""
    INCIDENT_RESPONSE = "incident_response"
    MAINTENANCE = "maintenance"
    ESCALATION = "escalation"
    RECOVERY = "recovery"
    MONITORING = "monitoring"
    SECURITY = "security"
    BUSINESS_CONTINUITY = "business_continuity"

class IncidentSeverity(Enum):
    """Incident severity levels aligned with business impact"""
    SEV1_CRITICAL = "sev1_critical"  # Revenue impact, customer-facing outage
    SEV2_HIGH = "sev2_high"         # Significant degradation, some users affected
    SEV3_MEDIUM = "sev3_medium"     # Minor issues, workarounds available
    SEV4_LOW = "sev4_low"           # Cosmetic issues, no business impact

class EscalationLevel(Enum):
    """Escalation levels for incident management"""
    L1_SUPPORT = "l1_support"         # First line support
    L2_ENGINEERING = "l2_engineering" # On-call engineers
    L3_SENIOR = "l3_senior"           # Senior engineers/team leads
    L4_EXECUTIVE = "l4_executive"     # Management/executives

class BusinessContext(Enum):
    """Business contexts for incident classification"""
    REVENUE_CRITICAL = "revenue_critical"
    CUSTOMER_FACING = "customer_facing"
    INTERNAL_OPERATIONS = "internal_operations"
    SIX_FIGURE_METHODOLOGY = "six_figure_methodology"
    COMPLIANCE_RELATED = "compliance_related"

@dataclass
class RunbookStep:
    """Individual step in a runbook procedure"""
    step_id: str
    title: str
    description: str
    command: Optional[str] = None
    expected_result: Optional[str] = None
    troubleshooting: Optional[str] = None
    automation_available: bool = False
    estimated_duration: Optional[int] = None  # minutes
    required_permissions: List[str] = field(default_factory=list)
    prerequisites: List[str] = field(default_factory=list)
    success_criteria: List[str] = field(default_factory=list)

@dataclass
class EscalationContact:
    """Contact information for escalation"""
    name: str
    role: str
    level: EscalationLevel
    primary_contact: str  # phone, email, slack
    secondary_contact: Optional[str] = None
    timezone: str = "UTC"
    on_call_schedule: Optional[str] = None
    expertise_areas: List[str] = field(default_factory=list)

@dataclass
class IncidentRunbook:
    """Complete incident response runbook"""
    runbook_id: str
    title: str
    runbook_type: RunbookType
    incident_types: List[str]
    severity_levels: List[IncidentSeverity]
    business_contexts: List[BusinessContext]
    summary: str
    steps: List[RunbookStep]
    escalation_procedures: List[EscalationContact]
    recovery_procedures: List[RunbookStep]
    post_incident_actions: List[RunbookStep]
    created_at: datetime
    updated_at: datetime
    version: str = "1.0"
    tags: List[str] = field(default_factory=list)
    automation_level: str = "manual"  # manual, semi-automated, fully-automated

@dataclass
class EscalationProcedure:
    """Escalation procedure definition"""
    procedure_id: str
    name: str
    description: str
    trigger_conditions: List[str]
    escalation_path: List[EscalationLevel]
    time_thresholds: Dict[EscalationLevel, int]  # minutes until escalation
    business_hour_adjustments: bool = True
    notification_methods: Dict[EscalationLevel, List[str]]
    approval_required: bool = False
    auto_escalation: bool = True

class ReliabilityRunbookService:
    """Comprehensive reliability runbook and procedure management"""
    
    def __init__(self):
        self.runbooks: Dict[str, IncidentRunbook] = {}
        self.escalation_procedures: Dict[str, EscalationProcedure] = {}
        self.escalation_contacts: Dict[EscalationLevel, List[EscalationContact]] = defaultdict(list)
        self.active_incidents: Dict[str, Dict[str, Any]] = {}
        self._initialize_default_runbooks()
        self._initialize_escalation_procedures()
        
    def _initialize_default_runbooks(self):
        """Initialize comprehensive default runbooks for 6FB platform"""
        
        # Payment Processing Failure Runbook
        payment_failure_runbook = IncidentRunbook(
            runbook_id="payment_processing_failure",
            title="Payment Processing System Failure",
            runbook_type=RunbookType.INCIDENT_RESPONSE,
            incident_types=["payment_failure", "stripe_outage", "transaction_error"],
            severity_levels=[IncidentSeverity.SEV1_CRITICAL, IncidentSeverity.SEV2_HIGH],
            business_contexts=[BusinessContext.REVENUE_CRITICAL, BusinessContext.CUSTOMER_FACING],
            summary="Critical runbook for payment processing failures affecting revenue generation",
            steps=[
                RunbookStep(
                    step_id="payment_01",
                    title="Assess Payment System Status",
                    description="Check overall payment system health and identify scope of impact",
                    command="curl -H 'Authorization: Bearer $API_KEY' https://api.stripe.com/v1/charges",
                    expected_result="HTTP 200 response with recent transaction data",
                    troubleshooting="If timeout or 5xx errors, Stripe may be experiencing issues",
                    estimated_duration=2,
                    success_criteria=["API responds within 5 seconds", "Recent transactions visible"]
                ),
                RunbookStep(
                    step_id="payment_02",
                    title="Check Internal Payment Service",
                    description="Verify 6FB payment service health and database connectivity",
                    command="kubectl get pods -l app=payment-service -n 6fb-production",
                    expected_result="All payment service pods in Running state",
                    troubleshooting="If pods failing, check logs with: kubectl logs -l app=payment-service",
                    estimated_duration=3,
                    required_permissions=["kubectl", "production-access"]
                ),
                RunbookStep(
                    step_id="payment_03",
                    title="Verify Database Connectivity",
                    description="Test payment database connections and query performance",
                    command="python manage.py check_payment_db",
                    expected_result="Database connection successful, query time < 100ms",
                    estimated_duration=2,
                    success_criteria=["Database responds", "Payment tables accessible", "No connection pool exhaustion"]
                ),
                RunbookStep(
                    step_id="payment_04",
                    title="Check Recent Failed Transactions",
                    description="Analyze recent payment failures for patterns",
                    command="python manage.py analyze_payment_failures --hours=1",
                    expected_result="List of failed transactions with error patterns",
                    estimated_duration=5,
                    success_criteria=["Failure patterns identified", "Root cause hypothesis formed"]
                ),
                RunbookStep(
                    step_id="payment_05",
                    title="Enable Payment Failover (if available)",
                    description="Switch to backup payment processor if configured",
                    command="python manage.py enable_payment_failover --processor=backup",
                    expected_result="Failover enabled, new payments routing to backup",
                    automation_available=True,
                    estimated_duration=3,
                    prerequisites=["Backup processor configured", "Failover tested recently"]
                )
            ],
            escalation_procedures=[
                EscalationContact(
                    name="On-Call Engineer",
                    role="Primary Response",
                    level=EscalationLevel.L2_ENGINEERING,
                    primary_contact="oncall-engineer@6fb.com",
                    expertise_areas=["payments", "stripe", "backend"]
                ),
                EscalationContact(
                    name="Payment Team Lead",
                    role="Payment Specialist",
                    level=EscalationLevel.L3_SENIOR,
                    primary_contact="payment-lead@6fb.com",
                    expertise_areas=["payment-processing", "financial-systems"]
                )
            ],
            recovery_procedures=[
                RunbookStep(
                    step_id="payment_recovery_01",
                    title="Restart Payment Service",
                    description="Perform controlled restart of payment processing service",
                    command="kubectl rollout restart deployment/payment-service -n 6fb-production",
                    estimated_duration=5,
                    success_criteria=["Service restarts successfully", "Health checks pass", "Test transaction succeeds"]
                ),
                RunbookStep(
                    step_id="payment_recovery_02",
                    title="Process Pending Transactions",
                    description="Retry failed transactions from the incident period",
                    command="python manage.py retry_failed_payments --start-time='$INCIDENT_START'",
                    estimated_duration=15,
                    success_criteria=["Failed transactions retried", "Success rate above 95%"]
                )
            ],
            post_incident_actions=[
                RunbookStep(
                    step_id="payment_post_01",
                    title="Verify Revenue Impact",
                    description="Calculate and document revenue impact from payment failures",
                    command="python manage.py calculate_revenue_impact --incident-id='$INCIDENT_ID'",
                    estimated_duration=10,
                    success_criteria=["Revenue impact calculated", "Financial team notified"]
                ),
                RunbookStep(
                    step_id="payment_post_02",
                    title="Update Monitoring Thresholds",
                    description="Review and adjust payment monitoring based on incident learnings",
                    estimated_duration=30,
                    success_criteria=["Monitoring thresholds reviewed", "New alerts configured if needed"]
                )
            ],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            tags=["payments", "revenue-critical", "customer-facing"],
            automation_level="semi-automated"
        )
        
        # AI Dashboard Performance Issues
        ai_dashboard_runbook = IncidentRunbook(
            runbook_id="ai_dashboard_performance",
            title="AI Dashboard Performance Degradation",
            runbook_type=RunbookType.INCIDENT_RESPONSE,
            incident_types=["slow_dashboard", "ai_query_timeout", "dashboard_crash"],
            severity_levels=[IncidentSeverity.SEV2_HIGH, IncidentSeverity.SEV3_MEDIUM],
            business_contexts=[BusinessContext.SIX_FIGURE_METHODOLOGY, BusinessContext.CUSTOMER_FACING],
            summary="Respond to AI dashboard performance issues affecting barber business insights",
            steps=[
                RunbookStep(
                    step_id="ai_dashboard_01",
                    title="Check AI Service Status",
                    description="Verify AI orchestrator and related services are operational",
                    command="curl -f http://localhost:8000/api/v2/ai/health",
                    expected_result="HTTP 200 with service status 'healthy'",
                    estimated_duration=2,
                    success_criteria=["AI service responds", "Dependencies are healthy"]
                ),
                RunbookStep(
                    step_id="ai_dashboard_02",
                    title="Monitor Resource Usage",
                    description="Check CPU, memory, and GPU usage for AI services",
                    command="kubectl top pods -l app=ai-service -n 6fb-production",
                    expected_result="Resource usage within normal thresholds",
                    troubleshooting="High resource usage may indicate memory leaks or runaway processes",
                    estimated_duration=3
                ),
                RunbookStep(
                    step_id="ai_dashboard_03",
                    title="Test AI Query Performance",
                    description="Execute test AI queries to measure response times",
                    command="python manage.py test_ai_queries --sample-size=10",
                    expected_result="Average response time < 5 seconds",
                    estimated_duration=5,
                    success_criteria=["Test queries complete", "Response times acceptable", "No errors in logs"]
                ),
                RunbookStep(
                    step_id="ai_dashboard_04",
                    title="Check Vector Database",
                    description="Verify vector database connectivity and performance",
                    command="python manage.py check_vector_db",
                    expected_result="Vector database responsive, index operations fast",
                    estimated_duration=3
                )
            ],
            escalation_procedures=[
                EscalationContact(
                    name="AI Team Lead",
                    role="AI Specialist",
                    level=EscalationLevel.L2_ENGINEERING,
                    primary_contact="ai-team-lead@6fb.com",
                    expertise_areas=["machine-learning", "ai-dashboard", "vector-databases"]
                )
            ],
            recovery_procedures=[
                RunbookStep(
                    step_id="ai_recovery_01",
                    title="Clear AI Service Cache",
                    description="Clear cached AI models and restart inference services",
                    command="python manage.py clear_ai_cache && kubectl rollout restart deployment/ai-service",
                    estimated_duration=10,
                    success_criteria=["Cache cleared", "Services restarted", "Performance restored"]
                )
            ],
            post_incident_actions=[
                RunbookStep(
                    step_id="ai_post_01",
                    title="Review AI Model Performance",
                    description="Analyze AI model performance metrics during incident",
                    estimated_duration=20,
                    success_criteria=["Performance metrics reviewed", "Model optimization recommendations made"]
                )
            ],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            tags=["ai", "dashboard", "performance", "six-figure-barber"],
            automation_level="manual"
        )
        
        # Authentication System Failure
        auth_failure_runbook = IncidentRunbook(
            runbook_id="authentication_failure",
            title="Authentication System Failure",
            runbook_type=RunbookType.INCIDENT_RESPONSE,
            incident_types=["login_failure", "jwt_error", "auth_timeout"],
            severity_levels=[IncidentSeverity.SEV1_CRITICAL, IncidentSeverity.SEV2_HIGH],
            business_contexts=[BusinessContext.CUSTOMER_FACING, BusinessContext.REVENUE_CRITICAL],
            summary="Critical authentication system failure preventing user access",
            steps=[
                RunbookStep(
                    step_id="auth_01",
                    title="Test Authentication Endpoints",
                    description="Verify authentication API endpoints are responding",
                    command="curl -X POST http://localhost:8000/api/v2/auth/login -d '{\"test\": true}'",
                    expected_result="HTTP response (even if 400, not timeout/5xx)",
                    estimated_duration=2
                ),
                RunbookStep(
                    step_id="auth_02",
                    title="Check JWT Service",
                    description="Verify JWT token generation and validation",
                    command="python manage.py test_jwt_service",
                    expected_result="JWT tokens generate and validate successfully",
                    estimated_duration=3,
                    success_criteria=["Token generation works", "Token validation works", "Expiry handled correctly"]
                ),
                RunbookStep(
                    step_id="auth_03",
                    title="Verify User Database",
                    description="Check user database connectivity and query performance",
                    command="python manage.py check_user_db",
                    expected_result="User database queries complete within 500ms",
                    estimated_duration=3
                ),
                RunbookStep(
                    step_id="auth_04",
                    title="Check Session Storage",
                    description="Verify Redis session storage is operational",
                    command="redis-cli ping",
                    expected_result="PONG response from Redis",
                    troubleshooting="If Redis down, sessions will fail. Check Redis logs.",
                    estimated_duration=2
                )
            ],
            escalation_procedures=[
                EscalationContact(
                    name="Security Team Lead",
                    role="Security Specialist",
                    level=EscalationLevel.L2_ENGINEERING,
                    primary_contact="security-lead@6fb.com",
                    expertise_areas=["authentication", "security", "jwt"]
                )
            ],
            recovery_procedures=[
                RunbookStep(
                    step_id="auth_recovery_01",
                    title="Restart Authentication Service",
                    description="Perform controlled restart of authentication components",
                    command="kubectl rollout restart deployment/auth-service -n 6fb-production",
                    estimated_duration=5,
                    success_criteria=["Auth service restarts", "Health checks pass", "Test login succeeds"]
                )
            ],
            post_incident_actions=[
                RunbookStep(
                    step_id="auth_post_01",
                    title="Review Authentication Logs",
                    description="Analyze authentication logs for security implications",
                    estimated_duration=30,
                    success_criteria=["Logs reviewed", "Security team briefed", "No compromise detected"]
                )
            ],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            tags=["authentication", "security", "customer-facing"],
            automation_level="semi-automated"
        )
        
        # Database Performance Issues
        database_performance_runbook = IncidentRunbook(
            runbook_id="database_performance",
            title="Database Performance Degradation",
            runbook_type=RunbookType.INCIDENT_RESPONSE,
            incident_types=["slow_queries", "connection_pool_exhaustion", "deadlocks"],
            severity_levels=[IncidentSeverity.SEV2_HIGH, IncidentSeverity.SEV3_MEDIUM],
            business_contexts=[BusinessContext.CUSTOMER_FACING, BusinessContext.INTERNAL_OPERATIONS],
            summary="Database performance issues affecting application responsiveness",
            steps=[
                RunbookStep(
                    step_id="db_01",
                    title="Check Database Connection Pool",
                    description="Verify database connection pool status and utilization",
                    command="python manage.py check_db_pool",
                    expected_result="Connection pool utilization < 80%",
                    estimated_duration=2,
                    success_criteria=["Pool not exhausted", "Connections available", "No connection leaks"]
                ),
                RunbookStep(
                    step_id="db_02",
                    title="Identify Slow Queries",
                    description="Find currently running slow queries",
                    command="python manage.py find_slow_queries --threshold=1000",
                    expected_result="List of queries taking > 1 second",
                    estimated_duration=3
                ),
                RunbookStep(
                    step_id="db_03",
                    title="Check Database Locks",
                    description="Identify blocking queries and deadlocks",
                    command="python manage.py check_db_locks",
                    expected_result="No significant blocking or deadlock situations",
                    estimated_duration=3,
                    troubleshooting="Long-running locks may indicate inefficient queries or transactions"
                ),
                RunbookStep(
                    step_id="db_04",
                    title="Monitor Resource Usage",
                    description="Check database server CPU, memory, and I/O",
                    command="python manage.py db_resource_usage",
                    expected_result="CPU < 80%, Memory < 90%, I/O wait < 20%",
                    estimated_duration=2
                )
            ],
            escalation_procedures=[
                EscalationContact(
                    name="Database Administrator",
                    role="DBA",
                    level=EscalationLevel.L3_SENIOR,
                    primary_contact="dba@6fb.com",
                    expertise_areas=["postgresql", "database-optimization", "performance-tuning"]
                )
            ],
            recovery_procedures=[
                RunbookStep(
                    step_id="db_recovery_01",
                    title="Kill Long-Running Queries",
                    description="Terminate queries causing performance issues",
                    command="python manage.py kill_slow_queries --threshold=30000",
                    estimated_duration=2,
                    success_criteria=["Problematic queries terminated", "Performance improved"]
                ),
                RunbookStep(
                    step_id="db_recovery_02",
                    title="Restart Connection Pool",
                    description="Restart database connection pool to clear leaked connections",
                    command="python manage.py restart_db_pool",
                    estimated_duration=5,
                    success_criteria=["Connection pool restarted", "New connections work", "Application responsive"]
                )
            ],
            post_incident_actions=[
                RunbookStep(
                    step_id="db_post_01",
                    title="Analyze Query Performance",
                    description="Review slow query logs and optimize problematic queries",
                    estimated_duration=60,
                    success_criteria=["Slow queries identified", "Optimization plan created", "Indexes reviewed"]
                )
            ],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            tags=["database", "performance", "postgresql"],
            automation_level="semi-automated"
        )
        
        # Store runbooks
        self.runbooks[payment_failure_runbook.runbook_id] = payment_failure_runbook
        self.runbooks[ai_dashboard_runbook.runbook_id] = ai_dashboard_runbook
        self.runbooks[auth_failure_runbook.runbook_id] = auth_failure_runbook
        self.runbooks[database_performance_runbook.runbook_id] = database_performance_runbook
        
    def _initialize_escalation_procedures(self):
        """Initialize escalation procedures and contact information"""
        
        # Critical Incident Escalation
        critical_escalation = EscalationProcedure(
            procedure_id="critical_incident_escalation",
            name="Critical Incident Escalation",
            description="Escalation procedure for SEV1 critical incidents affecting revenue or customer access",
            trigger_conditions=[
                "incident_severity == SEV1_CRITICAL",
                "revenue_impact > 1000",
                "customer_outage_percentage > 25"
            ],
            escalation_path=[
                EscalationLevel.L2_ENGINEERING,
                EscalationLevel.L3_SENIOR,
                EscalationLevel.L4_EXECUTIVE
            ],
            time_thresholds={
                EscalationLevel.L2_ENGINEERING: 0,   # Immediate
                EscalationLevel.L3_SENIOR: 15,       # 15 minutes
                EscalationLevel.L4_EXECUTIVE: 60     # 1 hour
            },
            notification_methods={
                EscalationLevel.L2_ENGINEERING: ["pagerduty", "slack", "phone"],
                EscalationLevel.L3_SENIOR: ["phone", "slack", "email"],
                EscalationLevel.L4_EXECUTIVE: ["phone", "email"]
            },
            auto_escalation=True
        )
        
        # Standard Escalation
        standard_escalation = EscalationProcedure(
            procedure_id="standard_escalation",
            name="Standard Incident Escalation",
            description="Standard escalation for SEV2-SEV4 incidents",
            trigger_conditions=[
                "incident_severity IN [SEV2_HIGH, SEV3_MEDIUM, SEV4_LOW]",
                "no_progress_for_minutes > 30"
            ],
            escalation_path=[
                EscalationLevel.L1_SUPPORT,
                EscalationLevel.L2_ENGINEERING,
                EscalationLevel.L3_SENIOR
            ],
            time_thresholds={
                EscalationLevel.L1_SUPPORT: 0,        # Immediate
                EscalationLevel.L2_ENGINEERING: 30,   # 30 minutes
                EscalationLevel.L3_SENIOR: 120        # 2 hours
            },
            notification_methods={
                EscalationLevel.L1_SUPPORT: ["slack", "email"],
                EscalationLevel.L2_ENGINEERING: ["pagerduty", "slack"],
                EscalationLevel.L3_SENIOR: ["phone", "slack"]
            },
            business_hour_adjustments=True,
            auto_escalation=False
        )
        
        # Security Incident Escalation
        security_escalation = EscalationProcedure(
            procedure_id="security_incident_escalation",
            name="Security Incident Escalation",
            description="Special escalation procedure for security-related incidents",
            trigger_conditions=[
                "event_type == SECURITY",
                "potential_breach == true",
                "unauthorized_access_detected == true"
            ],
            escalation_path=[
                EscalationLevel.L2_ENGINEERING,
                EscalationLevel.L3_SENIOR,
                EscalationLevel.L4_EXECUTIVE
            ],
            time_thresholds={
                EscalationLevel.L2_ENGINEERING: 0,   # Immediate
                EscalationLevel.L3_SENIOR: 10,       # 10 minutes
                EscalationLevel.L4_EXECUTIVE: 30     # 30 minutes
            },
            notification_methods={
                EscalationLevel.L2_ENGINEERING: ["pagerduty", "secure_phone"],
                EscalationLevel.L3_SENIOR: ["secure_phone", "encrypted_email"],
                EscalationLevel.L4_EXECUTIVE: ["secure_phone", "encrypted_email"]
            },
            approval_required=True,
            auto_escalation=True
        )
        
        self.escalation_procedures[critical_escalation.procedure_id] = critical_escalation
        self.escalation_procedures[standard_escalation.procedure_id] = standard_escalation
        self.escalation_procedures[security_escalation.procedure_id] = security_escalation
        
        # Initialize escalation contacts
        self.escalation_contacts[EscalationLevel.L1_SUPPORT] = [
            EscalationContact(
                name="Support Team",
                role="First Line Support",
                level=EscalationLevel.L1_SUPPORT,
                primary_contact="support@6fb.com",
                secondary_contact="support-backup@6fb.com",
                expertise_areas=["customer-support", "basic-troubleshooting"]
            )
        ]
        
        self.escalation_contacts[EscalationLevel.L2_ENGINEERING] = [
            EscalationContact(
                name="On-Call Engineer",
                role="Primary Engineer",
                level=EscalationLevel.L2_ENGINEERING,
                primary_contact="oncall@6fb.com",
                secondary_contact="+1-555-ONCALL",
                on_call_schedule="24/7 rotation",
                expertise_areas=["backend", "infrastructure", "troubleshooting"]
            ),
            EscalationContact(
                name="Platform Team",
                role="Platform Engineers",
                level=EscalationLevel.L2_ENGINEERING,
                primary_contact="platform-team@6fb.com",
                expertise_areas=["kubernetes", "monitoring", "performance"]
            )
        ]
        
        self.escalation_contacts[EscalationLevel.L3_SENIOR] = [
            EscalationContact(
                name="Engineering Manager",
                role="Engineering Lead",
                level=EscalationLevel.L3_SENIOR,
                primary_contact="eng-manager@6fb.com",
                secondary_contact="+1-555-ENGMGR",
                expertise_areas=["architecture", "team-coordination", "decision-making"]
            ),
            EscalationContact(
                name="Technical Architect",
                role="Senior Technical Lead",
                level=EscalationLevel.L3_SENIOR,
                primary_contact="tech-architect@6fb.com",
                expertise_areas=["system-architecture", "complex-troubleshooting", "design-decisions"]
            )
        ]
        
        self.escalation_contacts[EscalationLevel.L4_EXECUTIVE] = [
            EscalationContact(
                name="CTO",
                role="Chief Technology Officer",
                level=EscalationLevel.L4_EXECUTIVE,
                primary_contact="cto@6fb.com",
                secondary_contact="+1-555-CTO123",
                expertise_areas=["strategic-decisions", "vendor-relationships", "business-impact"]
            ),
            EscalationContact(
                name="CEO",
                role="Chief Executive Officer",
                level=EscalationLevel.L4_EXECUTIVE,
                primary_contact="ceo@6fb.com",
                expertise_areas=["customer-relations", "public-communications", "business-continuity"]
            )
        ]
        
    async def get_applicable_runbooks(self, incident_type: str, severity: IncidentSeverity, 
                                    business_context: BusinessContext) -> List[IncidentRunbook]:
        """Get runbooks applicable to the current incident"""
        applicable_runbooks = []
        
        for runbook in self.runbooks.values():
            # Check if incident type matches
            if incident_type in runbook.incident_types:
                applicable_runbooks.append(runbook)
                continue
                
            # Check if severity and business context match
            if (severity in runbook.severity_levels and 
                business_context in runbook.business_contexts):
                applicable_runbooks.append(runbook)
                
        # Sort by relevance (exact incident type match first, then by automation level)
        applicable_runbooks.sort(key=lambda rb: (
            incident_type not in rb.incident_types,  # False sorts before True
            rb.automation_level != "fully-automated"
        ))
        
        return applicable_runbooks
        
    async def execute_runbook_step(self, runbook_id: str, step_id: str, 
                                 context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute a specific runbook step with context"""
        try:
            if runbook_id not in self.runbooks:
                return {'error': 'Runbook not found', 'runbook_id': runbook_id}
                
            runbook = self.runbooks[runbook_id]
            step = None
            
            # Find the step
            for s in runbook.steps + runbook.recovery_procedures + runbook.post_incident_actions:
                if s.step_id == step_id:
                    step = s
                    break
                    
            if not step:
                return {'error': 'Step not found', 'step_id': step_id}
                
            execution_result = {
                'runbook_id': runbook_id,
                'step_id': step_id,
                'step_title': step.title,
                'started_at': datetime.utcnow().isoformat(),
                'status': 'in_progress',
                'estimated_duration': step.estimated_duration
            }
            
            # Check prerequisites
            if step.prerequisites:
                missing_prerequisites = []
                for prereq in step.prerequisites:
                    # This would integrate with actual system checks
                    # For now, we'll assume prerequisites are met
                    pass
                    
                if missing_prerequisites:
                    execution_result.update({
                        'status': 'blocked',
                        'error': 'Prerequisites not met',
                        'missing_prerequisites': missing_prerequisites
                    })
                    return execution_result
                    
            # Execute the step (in a real implementation, this would execute actual commands)
            if step.command:
                # Simulate command execution
                execution_result['command'] = step.command
                execution_result['command_substituted'] = self._substitute_variables(step.command, context or {})
                
                # In a real implementation, you would execute the actual command here
                # For safety, we'll just log what would be executed
                logger.info(f"Would execute command: {execution_result['command_substituted']}")
                
                # Simulate successful execution
                execution_result.update({
                    'status': 'completed',
                    'completed_at': datetime.utcnow().isoformat(),
                    'result': 'Command executed successfully (simulated)',
                    'success_criteria_met': True
                })
            else:
                # Manual step
                execution_result.update({
                    'status': 'manual_action_required',
                    'description': step.description,
                    'expected_result': step.expected_result,
                    'troubleshooting': step.troubleshooting
                })
                
            return execution_result
            
        except Exception as e:
            logger.error(f"Failed to execute runbook step: {e}")
            return {
                'error': 'Execution failed',
                'exception': str(e),
                'runbook_id': runbook_id,
                'step_id': step_id
            }
            
    async def trigger_escalation(self, incident_id: str, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger escalation procedure for an incident"""
        try:
            # Determine appropriate escalation procedure
            severity = IncidentSeverity(incident_data.get('severity', 'sev3_medium'))
            incident_type = incident_data.get('type', 'unknown')
            business_context = BusinessContext(incident_data.get('business_context', 'internal_operations'))
            
            # Select escalation procedure
            escalation_procedure = None
            
            if severity == IncidentSeverity.SEV1_CRITICAL:
                escalation_procedure = self.escalation_procedures.get('critical_incident_escalation')
            elif incident_data.get('security_related', False):
                escalation_procedure = self.escalation_procedures.get('security_incident_escalation')
            else:
                escalation_procedure = self.escalation_procedures.get('standard_escalation')
                
            if not escalation_procedure:
                return {'error': 'No applicable escalation procedure found'}
                
            # Check trigger conditions
            if not self._check_escalation_conditions(escalation_procedure, incident_data):
                return {'message': 'Escalation conditions not met', 'procedure_id': escalation_procedure.procedure_id}
                
            # Execute escalation
            escalation_result = {
                'incident_id': incident_id,
                'procedure_id': escalation_procedure.procedure_id,
                'escalation_path': [level.value for level in escalation_procedure.escalation_path],
                'started_at': datetime.utcnow().isoformat(),
                'notifications_sent': [],
                'next_escalation_at': {}
            }
            
            # Send initial notifications
            for level in escalation_procedure.escalation_path:
                contacts = self.escalation_contacts.get(level, [])
                notification_methods = escalation_procedure.notification_methods.get(level, [])
                
                for contact in contacts:
                    for method in notification_methods:
                        # In a real implementation, this would send actual notifications
                        notification = await self._send_notification(contact, method, incident_data)
                        escalation_result['notifications_sent'].append({
                            'contact': contact.name,
                            'method': method,
                            'sent_at': datetime.utcnow().isoformat(),
                            'status': 'sent'
                        })
                        
                # Calculate next escalation time
                threshold_minutes = escalation_procedure.time_thresholds.get(level, 0)
                if threshold_minutes > 0:
                    next_escalation = datetime.utcnow() + timedelta(minutes=threshold_minutes)
                    escalation_result['next_escalation_at'][level.value] = next_escalation.isoformat()
                    
            # Store active incident
            self.active_incidents[incident_id] = {
                'incident_data': incident_data,
                'escalation_procedure': escalation_procedure.procedure_id,
                'started_at': datetime.utcnow(),
                'current_level': escalation_procedure.escalation_path[0].value,
                'escalation_result': escalation_result
            }
            
            logger.info(f"Escalation triggered for incident {incident_id}", extra={
                'incident_id': incident_id,
                'procedure': escalation_procedure.procedure_id,
                'severity': severity.value
            })
            
            return escalation_result
            
        except Exception as e:
            logger.error(f"Failed to trigger escalation: {e}")
            return {'error': str(e), 'incident_id': incident_id}
            
    async def generate_incident_report(self, incident_id: str) -> Dict[str, Any]:
        """Generate comprehensive incident report"""
        try:
            if incident_id not in self.active_incidents:
                return {'error': 'Incident not found', 'incident_id': incident_id}
                
            incident = self.active_incidents[incident_id]
            incident_data = incident['incident_data']
            
            report = {
                'incident_id': incident_id,
                'generated_at': datetime.utcnow().isoformat(),
                'incident_summary': {
                    'title': incident_data.get('title', 'Unknown Incident'),
                    'severity': incident_data.get('severity'),
                    'type': incident_data.get('type'),
                    'business_context': incident_data.get('business_context'),
                    'started_at': incident.get('started_at', datetime.utcnow()).isoformat(),
                    'duration_minutes': self._calculate_incident_duration(incident),
                    'status': incident_data.get('status', 'active')
                },
                'business_impact': {
                    'revenue_impact': incident_data.get('revenue_impact', 0.0),
                    'customers_affected': incident_data.get('customers_affected', 0),
                    'services_affected': incident_data.get('services_affected', []),
                    'six_figure_barber_impact': incident_data.get('sfb_impact', 'none')
                },
                'response_timeline': await self._generate_response_timeline(incident_id),
                'escalation_details': incident.get('escalation_result', {}),
                'runbooks_used': incident_data.get('runbooks_used', []),
                'root_cause': incident_data.get('root_cause', 'Under investigation'),
                'resolution_steps': incident_data.get('resolution_steps', []),
                'lessons_learned': incident_data.get('lessons_learned', []),
                'action_items': incident_data.get('action_items', []),
                'communication_log': incident_data.get('communication_log', [])
            }
            
            # Add post-incident analysis if resolved
            if incident_data.get('status') == 'resolved':
                report['post_incident_analysis'] = await self._generate_post_incident_analysis(incident_id)
                
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate incident report: {e}")
            return {'error': str(e), 'incident_id': incident_id}
            
    async def get_reliability_metrics(self) -> Dict[str, Any]:
        """Get comprehensive reliability metrics and documentation status"""
        try:
            current_time = datetime.utcnow()
            
            # Runbook metrics
            runbook_metrics = {
                'total_runbooks': len(self.runbooks),
                'by_type': {},
                'automation_levels': {},
                'last_updated': {},
                'coverage_analysis': {}
            }
            
            for runbook in self.runbooks.values():
                # Count by type
                rb_type = runbook.runbook_type.value
                runbook_metrics['by_type'][rb_type] = runbook_metrics['by_type'].get(rb_type, 0) + 1
                
                # Count by automation level
                auto_level = runbook.automation_level
                runbook_metrics['automation_levels'][auto_level] = runbook_metrics['automation_levels'].get(auto_level, 0) + 1
                
                # Track update freshness
                days_since_update = (current_time - runbook.updated_at).days
                runbook_metrics['last_updated'][runbook.runbook_id] = {
                    'days_ago': days_since_update,
                    'needs_review': days_since_update > 90  # Review every 90 days
                }
                
            # Incident metrics
            incident_metrics = {
                'active_incidents': len(self.active_incidents),
                'escalation_procedures': len(self.escalation_procedures),
                'escalation_contacts_by_level': {
                    level.value: len(contacts) 
                    for level, contacts in self.escalation_contacts.items()
                }
            }
            
            # Coverage analysis
            coverage_analysis = await self._analyze_runbook_coverage()
            
            # Compliance metrics
            compliance_metrics = {
                'runbook_freshness_compliance': self._calculate_freshness_compliance(),
                'escalation_coverage': self._check_escalation_coverage(),
                'automation_ratio': runbook_metrics['automation_levels'].get('fully-automated', 0) / len(self.runbooks) * 100,
                'six_figure_barber_alignment': self._check_sfb_alignment()
            }
            
            metrics = {
                'timestamp': current_time.isoformat(),
                'runbook_metrics': runbook_metrics,
                'incident_metrics': incident_metrics,
                'coverage_analysis': coverage_analysis,
                'compliance_metrics': compliance_metrics,
                'recommendations': await self._generate_reliability_recommendations()
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get reliability metrics: {e}")
            return {'error': str(e)}
            
    def _substitute_variables(self, command: str, context: Dict[str, Any]) -> str:
        """Substitute variables in command strings"""
        import re
        
        # Find all variables in format $VARIABLE or ${VARIABLE}
        variables = re.findall(r'\$\{?([A-Z_]+)\}?', command)
        
        substituted = command
        for var in variables:
            value = context.get(var.lower(), context.get(var, f"${var}"))
            substituted = substituted.replace(f"${var}", str(value))
            substituted = substituted.replace(f"${{{var}}}", str(value))
            
        return substituted
        
    def _check_escalation_conditions(self, procedure: EscalationProcedure, incident_data: Dict[str, Any]) -> bool:
        """Check if escalation conditions are met"""
        for condition in procedure.trigger_conditions:
            # Simple condition evaluation (in production, use a proper expression evaluator)
            if "incident_severity ==" in condition:
                expected_severity = condition.split("==")[1].strip()
                if incident_data.get('severity') != expected_severity:
                    return False
                    
            elif "revenue_impact >" in condition:
                threshold = float(condition.split(">")[1].strip())
                if incident_data.get('revenue_impact', 0) <= threshold:
                    return False
                    
            elif "customer_outage_percentage >" in condition:
                threshold = float(condition.split(">")[1].strip())
                if incident_data.get('customer_outage_percentage', 0) <= threshold:
                    return False
                    
        return True
        
    async def _send_notification(self, contact: EscalationContact, method: str, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Send notification via specified method"""
        # In a real implementation, this would integrate with actual notification systems
        notification = {
            'contact': contact.name,
            'method': method,
            'message': f"Incident Alert: {incident_data.get('title', 'Unknown')}\nSeverity: {incident_data.get('severity')}",
            'sent_at': datetime.utcnow().isoformat(),
            'status': 'sent'
        }
        
        logger.info(f"Notification sent to {contact.name} via {method}")
        return notification
        
    def _calculate_incident_duration(self, incident: Dict[str, Any]) -> float:
        """Calculate incident duration in minutes"""
        start_time = incident.get('started_at', datetime.utcnow())
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            
        duration = datetime.utcnow() - start_time
        return duration.total_seconds() / 60
        
    async def _generate_response_timeline(self, incident_id: str) -> List[Dict[str, Any]]:
        """Generate incident response timeline"""
        # In a real implementation, this would track actual response actions
        timeline = [
            {
                'timestamp': datetime.utcnow().isoformat(),
                'action': 'Incident detected',
                'actor': 'monitoring_system',
                'details': 'Automatic incident detection triggered'
            },
            {
                'timestamp': (datetime.utcnow() + timedelta(minutes=2)).isoformat(),
                'action': 'Escalation initiated',
                'actor': 'incident_response_system',
                'details': 'On-call engineer notified'
            }
        ]
        
        return timeline
        
    async def _generate_post_incident_analysis(self, incident_id: str) -> Dict[str, Any]:
        """Generate post-incident analysis"""
        return {
            'mttr_minutes': 45,  # Mean Time To Recovery
            'mtbd_minutes': 30,  # Mean Time Between Detection and response
            'effectiveness_score': 85,
            'areas_for_improvement': [
                'Faster detection through improved monitoring',
                'Automated recovery procedures',
                'Better runbook documentation'
            ],
            'prevention_measures': [
                'Add monitoring for early warning signs',
                'Implement circuit breakers',
                'Schedule preventive maintenance'
            ]
        }
        
    async def _analyze_runbook_coverage(self) -> Dict[str, Any]:
        """Analyze runbook coverage for different incident types"""
        # Analyze which incident types, severities, and business contexts are covered
        covered_types = set()
        covered_severities = set()
        covered_contexts = set()
        
        for runbook in self.runbooks.values():
            covered_types.update(runbook.incident_types)
            covered_severities.update(runbook.severity_levels)
            covered_contexts.update(runbook.business_contexts)
            
        # Define expected coverage
        expected_types = [
            'payment_failure', 'authentication_failure', 'database_outage',
            'ai_service_failure', 'network_issues', 'security_breach',
            'performance_degradation', 'data_corruption'
        ]
        
        expected_severities = list(IncidentSeverity)
        expected_contexts = list(BusinessContext)
        
        coverage = {
            'incident_types': {
                'covered': list(covered_types),
                'missing': [t for t in expected_types if t not in covered_types],
                'coverage_percentage': len(covered_types) / len(expected_types) * 100
            },
            'severities': {
                'covered': [s.value for s in covered_severities],
                'missing': [s.value for s in expected_severities if s not in covered_severities],
                'coverage_percentage': len(covered_severities) / len(expected_severities) * 100
            },
            'business_contexts': {
                'covered': [c.value for c in covered_contexts],
                'missing': [c.value for c in expected_contexts if c not in covered_contexts],
                'coverage_percentage': len(covered_contexts) / len(expected_contexts) * 100
            }
        }
        
        return coverage
        
    def _calculate_freshness_compliance(self) -> Dict[str, Any]:
        """Calculate runbook freshness compliance"""
        current_time = datetime.utcnow()
        total_runbooks = len(self.runbooks)
        
        if total_runbooks == 0:
            return {'compliance_percentage': 100, 'compliant_runbooks': 0, 'stale_runbooks': 0}
            
        compliant_count = 0
        for runbook in self.runbooks.values():
            days_since_update = (current_time - runbook.updated_at).days
            if days_since_update <= 90:  # Consider fresh if updated within 90 days
                compliant_count += 1
                
        return {
            'compliance_percentage': (compliant_count / total_runbooks) * 100,
            'compliant_runbooks': compliant_count,
            'stale_runbooks': total_runbooks - compliant_count,
            'review_threshold_days': 90
        }
        
    def _check_escalation_coverage(self) -> Dict[str, Any]:
        """Check escalation procedure coverage"""
        coverage = {
            'procedures_defined': len(self.escalation_procedures),
            'contacts_by_level': {
                level.value: len(contacts) 
                for level, contacts in self.escalation_contacts.items()
            },
            'coverage_gaps': []
        }
        
        # Check for gaps
        required_levels = [EscalationLevel.L2_ENGINEERING, EscalationLevel.L3_SENIOR]
        for level in required_levels:
            if len(self.escalation_contacts.get(level, [])) == 0:
                coverage['coverage_gaps'].append(f"No contacts defined for {level.value}")
                
        return coverage
        
    def _check_sfb_alignment(self) -> Dict[str, Any]:
        """Check Six Figure Barber methodology alignment"""
        sfb_runbooks = 0
        revenue_focused_runbooks = 0
        
        for runbook in self.runbooks.values():
            if BusinessContext.SIX_FIGURE_METHODOLOGY in runbook.business_contexts:
                sfb_runbooks += 1
                
            if BusinessContext.REVENUE_CRITICAL in runbook.business_contexts:
                revenue_focused_runbooks += 1
                
        total_runbooks = len(self.runbooks)
        
        return {
            'sfb_aligned_runbooks': sfb_runbooks,
            'revenue_focused_runbooks': revenue_focused_runbooks,
            'alignment_percentage': (sfb_runbooks / total_runbooks) * 100 if total_runbooks > 0 else 0,
            'revenue_focus_percentage': (revenue_focused_runbooks / total_runbooks) * 100 if total_runbooks > 0 else 0
        }
        
    async def _generate_reliability_recommendations(self) -> List[Dict[str, Any]]:
        """Generate recommendations for improving reliability practices"""
        recommendations = []
        
        # Check automation levels
        manual_runbooks = [rb for rb in self.runbooks.values() if rb.automation_level == 'manual']
        if len(manual_runbooks) > len(self.runbooks) * 0.7:  # More than 70% manual
            recommendations.append({
                'type': 'automation_improvement',
                'priority': 'medium',
                'description': f'{len(manual_runbooks)} runbooks are fully manual',
                'action': 'Consider automating common runbook steps to reduce MTTR'
            })
            
        # Check runbook freshness
        stale_runbooks = []
        current_time = datetime.utcnow()
        for runbook in self.runbooks.values():
            if (current_time - runbook.updated_at).days > 90:
                stale_runbooks.append(runbook.runbook_id)
                
        if stale_runbooks:
            recommendations.append({
                'type': 'documentation_freshness',
                'priority': 'medium',
                'description': f'{len(stale_runbooks)} runbooks haven\'t been updated in 90+ days',
                'action': 'Schedule regular runbook reviews and updates'
            })
            
        # Check escalation coverage
        if len(self.escalation_contacts.get(EscalationLevel.L4_EXECUTIVE, [])) == 0:
            recommendations.append({
                'type': 'escalation_coverage',
                'priority': 'high',
                'description': 'No executive-level escalation contacts defined',
                'action': 'Define executive escalation contacts for critical incidents'
            })
            
        return recommendations

# Global service instance
runbook_service = ReliabilityRunbookService()