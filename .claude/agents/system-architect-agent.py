#!/usr/bin/env python3
"""
System Architect Agent for BookedBarber V2

Expert architectural guidance agent that provides comprehensive system design,
ensures clean architecture principles, and aligns with Six Figure Barber methodology.

Triggers:
- Major feature additions requiring system design
- Cross-system integration requirements
- Scalability challenges and bottlenecks
- System refactoring and modernization needs
- Architecture compliance violations
- Performance optimization requiring architectural changes
- New microservice or module additions

Architecture Focus Areas:
- Clean architecture principles for maintainable code
- Microservices design for enterprise scalability
- API design patterns and best practices
- Database architecture for high-performance booking systems
- Real-time system design for live booking updates
- Integration architecture for external services
- Security architecture for sensitive barbershop data
"""

import os
import sys
import json
import time
import logging
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import re
from dataclasses import dataclass, asdict
from enum import Enum

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

class ArchitecturalEvent(Enum):
    """Types of architectural events that trigger analysis"""
    MAJOR_FEATURE_ADDITION = "major_feature_addition"
    CROSS_SYSTEM_INTEGRATION = "cross_system_integration"
    SCALABILITY_CHALLENGE = "scalability_challenge"
    SYSTEM_REFACTORING = "system_refactoring"
    ARCHITECTURE_COMPLIANCE = "architecture_compliance"
    PERFORMANCE_OPTIMIZATION = "performance_optimization"
    MICROSERVICE_ADDITION = "microservice_addition"
    DATABASE_SCHEMA_CHANGE = "database_schema_change"
    API_DESIGN_REVIEW = "api_design_review"
    SECURITY_ARCHITECTURE_REVIEW = "security_architecture_review"

@dataclass
class ArchitecturalAnalysis:
    """Structure for architectural analysis results"""
    event_type: ArchitecturalEvent
    analysis_summary: str
    system_components: List[str]
    affected_services: List[str]
    architectural_patterns: List[str]
    recommendations: List[str]
    diagrams_generated: List[str]
    implementation_guidance: str
    compliance_status: str
    performance_impact: str
    security_considerations: str
    six_figure_barber_alignment: str
    timestamp: str

class SystemArchitectAgent:
    """
    Comprehensive system architecture agent for BookedBarber V2
    """
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.log_file = self.project_root / ".claude" / "system-architect-agent.log"
        self.metrics_file = self.project_root / ".claude" / "system-architect-metrics.json"
        self.config_file = self.project_root / ".claude" / "system-architect-config.json"
        self.documentation_dir = self.project_root / ".claude" / "architecture-docs"
        self.diagrams_dir = self.project_root / ".claude" / "architecture-diagrams"
        
        # Create directories
        self.documentation_dir.mkdir(exist_ok=True)
        self.diagrams_dir.mkdir(exist_ok=True)
        
        self.setup_logging()
        self.load_config()
        
        # Architecture patterns and templates
        self.architectural_patterns = {
            "clean_architecture": self._analyze_clean_architecture,
            "microservices": self._analyze_microservices,
            "api_design": self._analyze_api_design,
            "database_design": self._analyze_database_design,
            "integration_patterns": self._analyze_integration_patterns,
            "security_architecture": self._analyze_security_architecture,
            "performance_architecture": self._analyze_performance_architecture
        }
        
        # BookedBarber V2 specific components
        self.bookedbarber_components = {
            "booking_engine": "Real-time booking and availability management",
            "payment_processing": "Stripe Connect integration and commission handling",
            "user_management": "Multi-role authentication and authorization",
            "calendar_integration": "Google Calendar sync and management",
            "notification_system": "Email, SMS, and push notification handling",
            "analytics_engine": "Revenue tracking and business intelligence",
            "franchise_management": "Multi-location enterprise support",
            "marketing_integrations": "Google My Business and review management"
        }
    
    def setup_logging(self):
        """Setup comprehensive logging for architectural analysis"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger("SystemArchitectAgent")
    
    def load_config(self):
        """Load agent configuration"""
        default_config = {
            "enabled": True,
            "triggers": {
                "file_change_threshold": 10,  # Number of files changed to trigger
                "new_api_endpoints": True,
                "database_migrations": True,
                "new_service_files": True,
                "integration_changes": True,
                "performance_issues": True
            },
            "analysis_depth": "comprehensive",
            "generate_diagrams": True,
            "six_figure_barber_focus": True,
            "safety_limits": {
                "max_executions_per_hour": 3,
                "cooldown_minutes": 30,
                "max_execution_time_minutes": 20,
                "memory_limit_gb": 1.0,
                "cpu_limit_percent": 60
            }
        }
        
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                self.config = {**default_config, **json.load(f)}
        else:
            self.config = default_config
            self.save_config()
    
    def save_config(self):
        """Save current configuration"""
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def should_trigger(self, event_data: Dict[str, Any]) -> Tuple[bool, Optional[ArchitecturalEvent]]:
        """
        Determine if architectural analysis should be triggered
        """
        if not self.config["enabled"]:
            return False, None
        
        # Check safety limits
        if not self._check_safety_limits():
            self.logger.warning("Safety limits exceeded, skipping architectural analysis")
            return False, None
        
        # Analyze the event data to determine trigger type
        event_type = self._classify_architectural_event(event_data)
        
        if event_type:
            self.logger.info(f"Architectural event detected: {event_type.value}")
            return True, event_type
        
        return False, None
    
    def _classify_architectural_event(self, event_data: Dict[str, Any]) -> Optional[ArchitecturalEvent]:
        """
        Classify the type of architectural event based on data
        """
        changed_files = event_data.get("changed_files", [])
        new_files = event_data.get("new_files", [])
        error_patterns = event_data.get("error_patterns", [])
        performance_metrics = event_data.get("performance_metrics", {})
        
        # Major feature addition detection
        if len(new_files) >= self.config["triggers"]["file_change_threshold"]:
            if any("service" in f or "api" in f for f in new_files):
                return ArchitecturalEvent.MAJOR_FEATURE_ADDITION
        
        # API design review
        if any("api" in f or "router" in f or "endpoint" in f for f in changed_files + new_files):
            return ArchitecturalEvent.API_DESIGN_REVIEW
        
        # Database schema changes
        if any("migration" in f or "model" in f or "schema" in f for f in changed_files + new_files):
            return ArchitecturalEvent.DATABASE_SCHEMA_CHANGE
        
        # Integration changes
        if any("integration" in f or "webhook" in f or "external" in f for f in changed_files + new_files):
            return ArchitecturalEvent.CROSS_SYSTEM_INTEGRATION
        
        # Performance optimization
        if performance_metrics.get("response_time_ms", 0) > 1000:
            return ArchitecturalEvent.PERFORMANCE_OPTIMIZATION
        
        # Security architecture review
        if any("auth" in f or "security" in f or "middleware" in f for f in changed_files + new_files):
            return ArchitecturalEvent.SECURITY_ARCHITECTURE_REVIEW
        
        # System refactoring
        if len(changed_files) >= self.config["triggers"]["file_change_threshold"]:
            return ArchitecturalEvent.SYSTEM_REFACTORING
        
        return None
    
    def _check_safety_limits(self) -> bool:
        """
        Check if execution is within safety limits
        """
        try:
            # Check recent executions
            if self.metrics_file.exists():
                with open(self.metrics_file, 'r') as f:
                    metrics = json.load(f)
                
                recent_executions = metrics.get("recent_executions", [])
                now = datetime.now()
                hour_ago = now - timedelta(hours=1)
                
                # Count executions in the last hour
                recent_count = sum(1 for exec_time in recent_executions 
                                 if datetime.fromisoformat(exec_time) > hour_ago)
                
                if recent_count >= self.config["safety_limits"]["max_executions_per_hour"]:
                    return False
                
                # Check cooldown period
                if recent_executions:
                    last_execution = datetime.fromisoformat(recent_executions[-1])
                    cooldown_period = timedelta(minutes=self.config["safety_limits"]["cooldown_minutes"])
                    if now - last_execution < cooldown_period:
                        return False
            
            return True
        except Exception as e:
            self.logger.error(f"Error checking safety limits: {e}")
            return False
    
    def analyze_architecture(self, event_type: ArchitecturalEvent, event_data: Dict[str, Any]) -> ArchitecturalAnalysis:
        """
        Perform comprehensive architectural analysis
        """
        self.logger.info(f"Starting architectural analysis for {event_type.value}")
        
        # Gather system information
        system_components = self._analyze_system_components()
        affected_services = self._identify_affected_services(event_data)
        architectural_patterns = self._analyze_architectural_patterns()
        
        # Generate specific analysis based on event type
        analysis_summary = self._generate_analysis_summary(event_type, event_data)
        recommendations = self._generate_recommendations(event_type, event_data)
        implementation_guidance = self._generate_implementation_guidance(event_type, event_data)
        
        # Architecture compliance and alignment checks
        compliance_status = self._check_architecture_compliance()
        six_figure_barber_alignment = self._check_six_figure_barber_alignment(event_type, event_data)
        
        # Performance and security analysis
        performance_impact = self._analyze_performance_impact(event_type, event_data)
        security_considerations = self._analyze_security_considerations(event_type, event_data)
        
        # Generate diagrams if enabled
        diagrams_generated = []
        if self.config["generate_diagrams"]:
            diagrams_generated = self._generate_architecture_diagrams(event_type, event_data)
        
        analysis = ArchitecturalAnalysis(
            event_type=event_type,
            analysis_summary=analysis_summary,
            system_components=system_components,
            affected_services=affected_services,
            architectural_patterns=architectural_patterns,
            recommendations=recommendations,
            diagrams_generated=diagrams_generated,
            implementation_guidance=implementation_guidance,
            compliance_status=compliance_status,
            performance_impact=performance_impact,
            security_considerations=security_considerations,
            six_figure_barber_alignment=six_figure_barber_alignment,
            timestamp=datetime.now().isoformat()
        )
        
        # Save analysis and update metrics
        self._save_analysis(analysis)
        self._update_metrics(event_type)
        
        return analysis
    
    def _analyze_system_components(self) -> List[str]:
        """
        Analyze current system components
        """
        components = []
        
        # Scan backend components
        backend_dir = self.project_root / "backend-v2"
        if backend_dir.exists():
            for component_dir in ["api", "services", "models", "routers", "middleware"]:
                component_path = backend_dir / component_dir
                if component_path.exists():
                    files = list(component_path.rglob("*.py"))
                    if files:
                        components.append(f"Backend {component_dir} ({len(files)} modules)")
        
        # Scan frontend components
        frontend_dir = self.project_root / "backend-v2" / "frontend-v2"
        if frontend_dir.exists():
            for component_dir in ["app", "components", "lib", "hooks"]:
                component_path = frontend_dir / component_dir
                if component_path.exists():
                    files = list(component_path.rglob("*.ts*"))
                    if files:
                        components.append(f"Frontend {component_dir} ({len(files)} modules)")
        
        # Add BookedBarber specific components
        for component, description in self.bookedbarber_components.items():
            if self._component_exists(component):
                components.append(f"BookedBarber {component}: {description}")
        
        return components
    
    def _component_exists(self, component: str) -> bool:
        """
        Check if a BookedBarber component exists in the codebase
        """
        search_patterns = {
            "booking_engine": ["booking", "appointment", "availability"],
            "payment_processing": ["payment", "stripe", "commission"],
            "user_management": ["user", "auth", "role"],
            "calendar_integration": ["calendar", "google"],
            "notification_system": ["notification", "email", "sms"],
            "analytics_engine": ["analytics", "metrics", "reporting"],
            "franchise_management": ["franchise", "enterprise", "multi"],
            "marketing_integrations": ["marketing", "google_my_business", "review"]
        }
        
        patterns = search_patterns.get(component, [component])
        
        # Search in backend and frontend
        for pattern in patterns:
            backend_files = list(self.project_root.glob(f"backend-v2/**/*{pattern}*.py"))
            frontend_files = list(self.project_root.glob(f"backend-v2/frontend-v2/**/*{pattern}*.ts*"))
            
            if backend_files or frontend_files:
                return True
        
        return False
    
    def _identify_affected_services(self, event_data: Dict[str, Any]) -> List[str]:
        """
        Identify services affected by the architectural event
        """
        affected_services = []
        changed_files = event_data.get("changed_files", []) + event_data.get("new_files", [])
        
        service_mapping = {
            "auth": "Authentication Service",
            "booking": "Booking Engine Service",
            "payment": "Payment Processing Service",
            "user": "User Management Service",
            "calendar": "Calendar Integration Service",
            "notification": "Notification Service",
            "analytics": "Analytics Engine Service",
            "franchise": "Franchise Management Service",
            "marketing": "Marketing Integration Service"
        }
        
        for file_path in changed_files:
            for service_key, service_name in service_mapping.items():
                if service_key in file_path.lower():
                    if service_name not in affected_services:
                        affected_services.append(service_name)
        
        return affected_services
    
    def _analyze_architectural_patterns(self) -> List[str]:
        """
        Analyze current architectural patterns in use
        """
        patterns = []
        
        for pattern_name, analyzer in self.architectural_patterns.items():
            if analyzer():
                patterns.append(pattern_name)
        
        return patterns
    
    def _analyze_clean_architecture(self) -> bool:
        """Check for clean architecture implementation"""
        backend_dir = self.project_root / "backend-v2"
        
        # Check for layered structure
        required_layers = ["api", "services", "models", "middleware"]
        return all((backend_dir / layer).exists() for layer in required_layers)
    
    def _analyze_microservices(self) -> bool:
        """Check for microservices patterns"""
        services_dir = self.project_root / "backend-v2" / "services"
        if not services_dir.exists():
            return False
        
        service_files = list(services_dir.glob("*.py"))
        return len(service_files) >= 3  # At least 3 separate services
    
    def _analyze_api_design(self) -> bool:
        """Check for proper API design patterns"""
        api_dir = self.project_root / "backend-v2" / "api"
        if not api_dir.exists():
            return False
        
        # Check for versioned APIs
        v1_exists = (api_dir / "v1").exists()
        v2_exists = (api_dir / "v2").exists()
        
        return v1_exists or v2_exists
    
    def _analyze_database_design(self) -> bool:
        """Check for proper database design patterns"""
        models_dir = self.project_root / "backend-v2" / "models"
        if not models_dir.exists():
            return False
        
        model_files = list(models_dir.glob("*.py"))
        return len(model_files) >= 5  # Multiple database models
    
    def _analyze_integration_patterns(self) -> bool:
        """Check for integration patterns"""
        # Look for external service integrations
        integration_patterns = ["stripe", "google", "sendgrid", "twilio", "webhook"]
        
        for pattern in integration_patterns:
            if list(self.project_root.glob(f"**/*{pattern}*.py")):
                return True
        
        return False
    
    def _analyze_security_architecture(self) -> bool:
        """Check for security architecture patterns"""
        security_files = list(self.project_root.glob("**/auth*.py")) + \
                        list(self.project_root.glob("**/security*.py")) + \
                        list(self.project_root.glob("**/middleware*.py"))
        
        return len(security_files) >= 2
    
    def _analyze_performance_architecture(self) -> bool:
        """Check for performance architecture patterns"""
        # Look for caching, database optimization, etc.
        performance_patterns = ["cache", "redis", "index", "pool"]
        
        for pattern in performance_patterns:
            if list(self.project_root.glob(f"**/*{pattern}*.py")):
                return True
        
        return False
    
    def _generate_analysis_summary(self, event_type: ArchitecturalEvent, event_data: Dict[str, Any]) -> str:
        """
        Generate comprehensive analysis summary
        """
        summaries = {
            ArchitecturalEvent.MAJOR_FEATURE_ADDITION: self._analyze_major_feature_addition,
            ArchitecturalEvent.API_DESIGN_REVIEW: self._analyze_api_design_review,
            ArchitecturalEvent.DATABASE_SCHEMA_CHANGE: self._analyze_database_schema_change,
            ArchitecturalEvent.CROSS_SYSTEM_INTEGRATION: self._analyze_cross_system_integration,
            ArchitecturalEvent.PERFORMANCE_OPTIMIZATION: self._analyze_performance_optimization,
            ArchitecturalEvent.SECURITY_ARCHITECTURE_REVIEW: self._analyze_security_architecture_review,
            ArchitecturalEvent.SYSTEM_REFACTORING: self._analyze_system_refactoring
        }
        
        analyzer = summaries.get(event_type, lambda x: "General architectural analysis")
        return analyzer(event_data)
    
    def _analyze_major_feature_addition(self, event_data: Dict[str, Any]) -> str:
        """Analyze major feature addition"""
        new_files = event_data.get("new_files", [])
        return f"""
        Major Feature Addition Analysis:
        - {len(new_files)} new files detected
        - Requires integration with existing BookedBarber components
        - Must align with Six Figure Barber methodology
        - Consider impact on booking engine performance
        - Ensure proper role-based access control
        - Validate Stripe Connect integration compatibility
        """
    
    def _analyze_api_design_review(self, event_data: Dict[str, Any]) -> str:
        """Analyze API design"""
        return """
        API Design Review Analysis:
        - Ensure RESTful design principles
        - Implement proper API versioning (v2 preferred)
        - Add comprehensive error handling
        - Include request/response validation
        - Implement rate limiting for security
        - Ensure mobile app compatibility
        - Add proper documentation with OpenAPI
        """
    
    def _analyze_database_schema_change(self, event_data: Dict[str, Any]) -> str:
        """Analyze database schema changes"""
        return """
        Database Schema Change Analysis:
        - Review migration scripts for data integrity
        - Ensure backward compatibility during deployment
        - Optimize indexes for booking query performance
        - Consider partitioning for large franchise datasets
        - Implement proper foreign key constraints
        - Add audit trails for Six Figure Barber compliance
        - Test migration rollback procedures
        """
    
    def _analyze_cross_system_integration(self, event_data: Dict[str, Any]) -> str:
        """Analyze cross-system integration"""
        return """
        Cross-System Integration Analysis:
        - Review external API integration patterns
        - Implement proper error handling and retries
        - Add webhook signature verification
        - Consider rate limiting from external services
        - Implement circuit breaker patterns
        - Add comprehensive logging and monitoring
        - Ensure data consistency across systems
        """
    
    def _analyze_performance_optimization(self, event_data: Dict[str, Any]) -> str:
        """Analyze performance optimization needs"""
        return """
        Performance Optimization Analysis:
        - Identify database query optimization opportunities
        - Implement Redis caching for frequent queries
        - Add database connection pooling
        - Consider read replicas for analytics queries
        - Optimize real-time booking availability checks
        - Implement lazy loading for large datasets
        - Add performance monitoring and alerting
        """
    
    def _analyze_security_architecture_review(self, event_data: Dict[str, Any]) -> str:
        """Analyze security architecture"""
        return """
        Security Architecture Review Analysis:
        - Review authentication and authorization flows
        - Ensure JWT token security best practices
        - Implement role-based access control (RBAC)
        - Add input validation and sanitization
        - Review Stripe Connect security implementation
        - Implement audit logging for sensitive operations
        - Add rate limiting and DDoS protection
        """
    
    def _analyze_system_refactoring(self, event_data: Dict[str, Any]) -> str:
        """Analyze system refactoring needs"""
        return """
        System Refactoring Analysis:
        - Maintain clean architecture principles
        - Ensure proper separation of concerns
        - Refactor toward microservices where appropriate
        - Improve code testability and maintainability
        - Reduce technical debt systematically
        - Maintain Six Figure Barber business logic integrity
        - Ensure backward compatibility during refactoring
        """
    
    def _generate_recommendations(self, event_type: ArchitecturalEvent, event_data: Dict[str, Any]) -> List[str]:
        """
        Generate specific architectural recommendations
        """
        base_recommendations = [
            "Follow clean architecture principles with clear layer separation",
            "Implement comprehensive error handling and logging",
            "Add unit and integration tests for all new functionality",
            "Ensure proper API documentation with OpenAPI/Swagger",
            "Implement proper security measures including authentication and authorization",
            "Add performance monitoring and alerting",
            "Follow Six Figure Barber methodology alignment requirements"
        ]
        
        event_specific = {
            ArchitecturalEvent.MAJOR_FEATURE_ADDITION: [
                "Design feature as a separate service module",
                "Implement proper database migrations",
                "Add feature flags for gradual rollout",
                "Ensure integration with existing booking engine"
            ],
            ArchitecturalEvent.API_DESIGN_REVIEW: [
                "Use API versioning (prefer v2)",
                "Implement request/response validation",
                "Add rate limiting and throttling",
                "Ensure mobile-friendly response formats"
            ],
            ArchitecturalEvent.DATABASE_SCHEMA_CHANGE: [
                "Create reversible migrations",
                "Add proper indexes for query optimization",
                "Implement data archival strategies",
                "Consider read replicas for analytics"
            ],
            ArchitecturalEvent.PERFORMANCE_OPTIMIZATION: [
                "Implement Redis caching layer",
                "Optimize database queries with proper indexes",
                "Add database connection pooling",
                "Implement lazy loading for large datasets"
            ]
        }
        
        specific_recommendations = event_specific.get(event_type, [])
        return base_recommendations + specific_recommendations
    
    def _generate_implementation_guidance(self, event_type: ArchitecturalEvent, event_data: Dict[str, Any]) -> str:
        """
        Generate specific implementation guidance
        """
        guidance_templates = {
            ArchitecturalEvent.MAJOR_FEATURE_ADDITION: """
            Implementation Guidance for Major Feature Addition:
            
            1. Architecture Planning:
               - Design service boundaries and responsibilities
               - Plan database schema and relationships
               - Design API endpoints with proper versioning
               - Plan integration points with existing services
            
            2. Implementation Phases:
               - Phase 1: Core business logic and database layer
               - Phase 2: API layer with proper validation
               - Phase 3: Frontend integration and testing
               - Phase 4: Integration testing and performance optimization
            
            3. Six Figure Barber Alignment:
               - Ensure feature supports revenue optimization
               - Maintain focus on client value creation
               - Support business efficiency improvements
               - Enable professional growth tracking
            
            4. Testing Strategy:
               - Unit tests for business logic (80%+ coverage)
               - Integration tests for API endpoints
               - E2E tests for critical user flows
               - Performance tests for scalability validation
            """,
            
            ArchitecturalEvent.API_DESIGN_REVIEW: """
            Implementation Guidance for API Design:
            
            1. Design Principles:
               - RESTful resource-based design
               - Consistent naming conventions
               - Proper HTTP status codes
               - Comprehensive error responses
            
            2. Security Implementation:
               - JWT token validation
               - Role-based access control
               - Input validation and sanitization
               - Rate limiting implementation
            
            3. Documentation:
               - OpenAPI/Swagger specifications
               - Example requests and responses
               - Error code documentation
               - Authentication flow diagrams
            
            4. Mobile Optimization:
               - Lightweight response payloads
               - Efficient pagination
               - Proper caching headers
               - Offline capability support
            """,
            
            ArchitecturalEvent.DATABASE_SCHEMA_CHANGE: """
            Implementation Guidance for Database Changes:
            
            1. Migration Strategy:
               - Create reversible migration scripts
               - Test migrations on staging data
               - Plan for zero-downtime deployment
               - Implement data validation checks
            
            2. Performance Optimization:
               - Add appropriate indexes
               - Consider query execution plans
               - Implement connection pooling
               - Plan for data archival
            
            3. Data Integrity:
               - Implement proper foreign key constraints
               - Add data validation rules
               - Create audit trails
               - Plan backup and recovery procedures
            
            4. Scalability Considerations:
               - Consider table partitioning
               - Plan for read replicas
               - Implement proper sharding strategies
               - Monitor query performance
            """
        }
        
        return guidance_templates.get(event_type, "General implementation guidance: Follow clean architecture principles and ensure proper testing coverage.")
    
    def _check_architecture_compliance(self) -> str:
        """
        Check compliance with architectural standards
        """
        compliance_issues = []
        
        # Check clean architecture compliance
        backend_dir = self.project_root / "backend-v2"
        if not backend_dir.exists():
            compliance_issues.append("Backend V2 directory structure missing")
        
        required_directories = ["api", "services", "models", "middleware"]
        for directory in required_directories:
            if not (backend_dir / directory).exists():
                compliance_issues.append(f"Missing {directory} layer in clean architecture")
        
        # Check API versioning
        api_dir = backend_dir / "api"
        if api_dir.exists():
            if not (api_dir / "v2").exists():
                compliance_issues.append("Missing API v2 versioning")
        
        # Check testing structure
        if not (backend_dir / "tests").exists():
            compliance_issues.append("Missing test directory structure")
        
        if compliance_issues:
            return f"Compliance Issues Found: {'; '.join(compliance_issues)}"
        else:
            return "Architecture compliance validated successfully"
    
    def _check_six_figure_barber_alignment(self, event_type: ArchitecturalEvent, event_data: Dict[str, Any]) -> str:
        """
        Check alignment with Six Figure Barber methodology
        """
        alignment_criteria = {
            "revenue_optimization": self._check_revenue_optimization,
            "client_value_creation": self._check_client_value_creation,
            "business_efficiency": self._check_business_efficiency,
            "professional_growth": self._check_professional_growth,
            "scalability": self._check_scalability_support
        }
        
        alignment_status = {}
        for criteria, checker in alignment_criteria.items():
            alignment_status[criteria] = checker(event_data)
        
        aligned_criteria = [criteria for criteria, status in alignment_status.items() if status]
        
        if len(aligned_criteria) >= 3:
            return f"Strong Six Figure Barber alignment: {', '.join(aligned_criteria)}"
        elif len(aligned_criteria) >= 1:
            return f"Partial Six Figure Barber alignment: {', '.join(aligned_criteria)}"
        else:
            return "Limited Six Figure Barber alignment - consider methodology integration"
    
    def _check_revenue_optimization(self, event_data: Dict[str, Any]) -> bool:
        """Check if changes support revenue optimization"""
        revenue_keywords = ["commission", "payment", "pricing", "booking", "analytics", "revenue"]
        changed_files = event_data.get("changed_files", []) + event_data.get("new_files", [])
        
        return any(keyword in ' '.join(changed_files).lower() for keyword in revenue_keywords)
    
    def _check_client_value_creation(self, event_data: Dict[str, Any]) -> bool:
        """Check if changes support client value creation"""
        client_keywords = ["booking", "appointment", "calendar", "notification", "user", "client"]
        changed_files = event_data.get("changed_files", []) + event_data.get("new_files", [])
        
        return any(keyword in ' '.join(changed_files).lower() for keyword in client_keywords)
    
    def _check_business_efficiency(self, event_data: Dict[str, Any]) -> bool:
        """Check if changes support business efficiency"""
        efficiency_keywords = ["automation", "integration", "workflow", "scheduling", "optimization"]
        changed_files = event_data.get("changed_files", []) + event_data.get("new_files", [])
        
        return any(keyword in ' '.join(changed_files).lower() for keyword in efficiency_keywords)
    
    def _check_professional_growth(self, event_data: Dict[str, Any]) -> bool:
        """Check if changes support professional growth"""
        growth_keywords = ["analytics", "reporting", "metrics", "dashboard", "insight"]
        changed_files = event_data.get("changed_files", []) + event_data.get("new_files", [])
        
        return any(keyword in ' '.join(changed_files).lower() for keyword in growth_keywords)
    
    def _check_scalability_support(self, event_data: Dict[str, Any]) -> bool:
        """Check if changes support scalability"""
        scalability_keywords = ["franchise", "enterprise", "multi", "scale", "performance"]
        changed_files = event_data.get("changed_files", []) + event_data.get("new_files", [])
        
        return any(keyword in ' '.join(changed_files).lower() for keyword in scalability_keywords)
    
    def _analyze_performance_impact(self, event_type: ArchitecturalEvent, event_data: Dict[str, Any]) -> str:
        """
        Analyze performance impact of architectural changes
        """
        performance_considerations = {
            ArchitecturalEvent.MAJOR_FEATURE_ADDITION: "Monitor new feature performance impact on existing booking engine",
            ArchitecturalEvent.API_DESIGN_REVIEW: "Ensure API response times remain under 200ms for booking operations",
            ArchitecturalEvent.DATABASE_SCHEMA_CHANGE: "Test migration performance and query optimization",
            ArchitecturalEvent.CROSS_SYSTEM_INTEGRATION: "Monitor external API latency and implement timeouts",
            ArchitecturalEvent.PERFORMANCE_OPTIMIZATION: "Expected performance improvements in identified bottlenecks",
            ArchitecturalEvent.SECURITY_ARCHITECTURE_REVIEW: "Security measures may add 10-50ms latency",
            ArchitecturalEvent.SYSTEM_REFACTORING: "Maintain or improve current performance benchmarks"
        }
        
        base_impact = performance_considerations.get(event_type, "General performance monitoring required")
        
        # Add specific performance recommendations
        recommendations = [
            "Implement performance monitoring for new components",
            "Add database query optimization where needed",
            "Consider Redis caching for frequently accessed data",
            "Monitor real-time booking engine performance",
            "Test under load conditions similar to production"
        ]
        
        return f"{base_impact}\n\nRecommendations:\n" + "\n".join(f"- {rec}" for rec in recommendations)
    
    def _analyze_security_considerations(self, event_type: ArchitecturalEvent, event_data: Dict[str, Any]) -> str:
        """
        Analyze security considerations for architectural changes
        """
        security_requirements = {
            ArchitecturalEvent.MAJOR_FEATURE_ADDITION: [
                "Implement proper authentication and authorization",
                "Add input validation and sanitization",
                "Ensure secure data handling for barbershop information",
                "Add audit logging for business operations"
            ],
            ArchitecturalEvent.API_DESIGN_REVIEW: [
                "Implement JWT token validation",
                "Add rate limiting to prevent abuse",
                "Ensure proper CORS configuration",
                "Add request/response validation"
            ],
            ArchitecturalEvent.DATABASE_SCHEMA_CHANGE: [
                "Encrypt sensitive customer data",
                "Implement proper access controls",
                "Add audit trails for data changes",
                "Ensure GDPR compliance for personal data"
            ],
            ArchitecturalEvent.CROSS_SYSTEM_INTEGRATION: [
                "Verify webhook signatures",
                "Implement secure API key management",
                "Add proper error handling without data leakage",
                "Monitor for security anomalies"
            ]
        }
        
        specific_requirements = security_requirements.get(event_type, [
            "Follow general security best practices",
            "Implement proper authentication and authorization",
            "Add comprehensive audit logging"
        ])
        
        return "Security Considerations:\n" + "\n".join(f"- {req}" for req in specific_requirements)
    
    def _generate_architecture_diagrams(self, event_type: ArchitecturalEvent, event_data: Dict[str, Any]) -> List[str]:
        """
        Generate architecture diagrams based on event type
        """
        diagrams = []
        
        # Generate system overview diagram
        system_diagram = self._generate_system_overview_diagram()
        if system_diagram:
            diagrams.append(system_diagram)
        
        # Generate event-specific diagrams
        if event_type == ArchitecturalEvent.API_DESIGN_REVIEW:
            api_diagram = self._generate_api_architecture_diagram()
            if api_diagram:
                diagrams.append(api_diagram)
        
        elif event_type == ArchitecturalEvent.DATABASE_SCHEMA_CHANGE:
            db_diagram = self._generate_database_diagram()
            if db_diagram:
                diagrams.append(db_diagram)
        
        elif event_type == ArchitecturalEvent.CROSS_SYSTEM_INTEGRATION:
            integration_diagram = self._generate_integration_diagram()
            if integration_diagram:
                diagrams.append(integration_diagram)
        
        return diagrams
    
    def _generate_system_overview_diagram(self) -> Optional[str]:
        """Generate system overview architecture diagram"""
        diagram_content = """
        # BookedBarber V2 System Architecture Overview
        
        ```mermaid
        graph TB
            subgraph "Frontend Layer"
                WEB[Web Application<br/>Next.js 14]
                MOBILE[Mobile App<br/>React Native]
            end
            
            subgraph "API Gateway"
                GATEWAY[API Gateway<br/>FastAPI]
                AUTH[Authentication<br/>JWT/OAuth]
            end
            
            subgraph "Business Logic Layer"
                BOOKING[Booking Engine]
                PAYMENT[Payment Processing<br/>Stripe Connect]
                USER[User Management]
                CALENDAR[Calendar Integration]
                NOTIFICATION[Notification Service]
                ANALYTICS[Analytics Engine]
            end
            
            subgraph "Data Layer"
                DB[(PostgreSQL<br/>Primary Database)]
                CACHE[(Redis<br/>Caching Layer)]
                FILES[File Storage<br/>S3/Local]
            end
            
            subgraph "External Integrations"
                STRIPE[Stripe Connect]
                GOOGLE[Google Calendar]
                SENDGRID[SendGrid Email]
                TWILIO[Twilio SMS]
                GMB[Google My Business]
            end
            
            WEB --> GATEWAY
            MOBILE --> GATEWAY
            GATEWAY --> AUTH
            AUTH --> BOOKING
            AUTH --> PAYMENT
            AUTH --> USER
            AUTH --> CALENDAR
            AUTH --> NOTIFICATION
            AUTH --> ANALYTICS
            
            BOOKING --> DB
            PAYMENT --> DB
            USER --> DB
            CALENDAR --> DB
            NOTIFICATION --> DB
            ANALYTICS --> DB
            
            BOOKING --> CACHE
            USER --> CACHE
            ANALYTICS --> CACHE
            
            PAYMENT --> STRIPE
            CALENDAR --> GOOGLE
            NOTIFICATION --> SENDGRID
            NOTIFICATION --> TWILIO
            ANALYTICS --> GMB
            
            BOOKING --> FILES
            USER --> FILES
        ```
        """
        
        diagram_file = self.diagrams_dir / "system_overview.md"
        with open(diagram_file, 'w') as f:
            f.write(diagram_content)
        
        return str(diagram_file)
    
    def _generate_api_architecture_diagram(self) -> Optional[str]:
        """Generate API architecture diagram"""
        diagram_content = """
        # BookedBarber V2 API Architecture
        
        ```mermaid
        graph TB
            subgraph "API v2 Architecture"
                CLIENT[Client Applications]
                
                subgraph "API Gateway Layer"
                    GATEWAY[FastAPI Gateway]
                    MIDDLEWARE[Middleware Stack]
                    RATE_LIMIT[Rate Limiting]
                end
                
                subgraph "Authentication"
                    AUTH_SERVICE[Auth Service]
                    JWT[JWT Validation]
                    RBAC[Role-Based Access]
                end
                
                subgraph "Business Services"
                    BOOKING_API[Booking API v2]
                    PAYMENT_API[Payment API v2]
                    USER_API[User API v2]
                    CALENDAR_API[Calendar API v2]
                    ANALYTICS_API[Analytics API v2]
                end
                
                subgraph "Data Access"
                    MODELS[SQLAlchemy Models]
                    DB_POOL[Connection Pool]
                    CACHE_LAYER[Redis Cache]
                end
            end
            
            CLIENT --> GATEWAY
            GATEWAY --> MIDDLEWARE
            MIDDLEWARE --> RATE_LIMIT
            RATE_LIMIT --> AUTH_SERVICE
            AUTH_SERVICE --> JWT
            JWT --> RBAC
            
            RBAC --> BOOKING_API
            RBAC --> PAYMENT_API
            RBAC --> USER_API
            RBAC --> CALENDAR_API
            RBAC --> ANALYTICS_API
            
            BOOKING_API --> MODELS
            PAYMENT_API --> MODELS
            USER_API --> MODELS
            CALENDAR_API --> MODELS
            ANALYTICS_API --> MODELS
            
            MODELS --> DB_POOL
            MODELS --> CACHE_LAYER
        ```
        """
        
        diagram_file = self.diagrams_dir / "api_architecture.md"
        with open(diagram_file, 'w') as f:
            f.write(diagram_content)
        
        return str(diagram_file)
    
    def _generate_database_diagram(self) -> Optional[str]:
        """Generate database architecture diagram"""
        diagram_content = """
        # BookedBarber V2 Database Architecture
        
        ```mermaid
        erDiagram
            USERS {
                id uuid PK
                email string
                role enum
                created_at timestamp
                updated_at timestamp
            }
            
            BARBERSHOPS {
                id uuid PK
                name string
                owner_id uuid FK
                address text
                phone string
                created_at timestamp
            }
            
            BARBERS {
                id uuid PK
                user_id uuid FK
                barbershop_id uuid FK
                commission_rate decimal
                is_active boolean
            }
            
            SERVICES {
                id uuid PK
                barbershop_id uuid FK
                name string
                duration_minutes integer
                price decimal
            }
            
            APPOINTMENTS {
                id uuid PK
                client_id uuid FK
                barber_id uuid FK
                service_id uuid FK
                start_time timestamp
                end_time timestamp
                status enum
                total_amount decimal
            }
            
            PAYMENTS {
                id uuid PK
                appointment_id uuid FK
                stripe_payment_id string
                amount decimal
                commission_amount decimal
                status enum
                processed_at timestamp
            }
            
            USERS ||--o{ BARBERSHOPS : owns
            USERS ||--o{ BARBERS : "is barber"
            USERS ||--o{ APPOINTMENTS : "books as client"
            BARBERSHOPS ||--o{ BARBERS : employs
            BARBERSHOPS ||--o{ SERVICES : offers
            BARBERS ||--o{ APPOINTMENTS : provides
            SERVICES ||--o{ APPOINTMENTS : "booked for"
            APPOINTMENTS ||--|| PAYMENTS : "paid via"
        ```
        """
        
        diagram_file = self.diagrams_dir / "database_architecture.md"
        with open(diagram_file, 'w') as f:
            f.write(diagram_content)
        
        return str(diagram_file)
    
    def _generate_integration_diagram(self) -> Optional[str]:
        """Generate integration architecture diagram"""
        diagram_content = """
        # BookedBarber V2 Integration Architecture
        
        ```mermaid
        graph TB
            subgraph "BookedBarber Core"
                CORE[BookedBarber API]
                WEBHOOK[Webhook Handler]
                QUEUE[Message Queue]
            end
            
            subgraph "Payment Integration"
                STRIPE[Stripe Connect]
                PAYMENT_WEBHOOK[Payment Webhooks]
            end
            
            subgraph "Calendar Integration"
                GOOGLE_CAL[Google Calendar API]
                CAL_SYNC[Calendar Sync Service]
            end
            
            subgraph "Communication"
                SENDGRID[SendGrid Email]
                TWILIO[Twilio SMS]
                PUSH[Push Notifications]
            end
            
            subgraph "Marketing"
                GMB[Google My Business]
                REVIEW[Review Management]
            end
            
            subgraph "Analytics"
                GA[Google Analytics]
                FACEBOOK[Facebook Pixel]
                CUSTOM[Custom Analytics]
            end
            
            CORE --> STRIPE
            STRIPE --> PAYMENT_WEBHOOK
            PAYMENT_WEBHOOK --> WEBHOOK
            WEBHOOK --> QUEUE
            
            CORE --> GOOGLE_CAL
            CAL_SYNC --> GOOGLE_CAL
            
            CORE --> SENDGRID
            CORE --> TWILIO
            CORE --> PUSH
            
            CORE --> GMB
            REVIEW --> GMB
            
            CORE --> GA
            CORE --> FACEBOOK
            CORE --> CUSTOM
            
            QUEUE --> CORE
        ```
        """
        
        diagram_file = self.diagrams_dir / "integration_architecture.md"
        with open(diagram_file, 'w') as f:
            f.write(diagram_content)
        
        return str(diagram_file)
    
    def _save_analysis(self, analysis: ArchitecturalAnalysis):
        """
        Save architectural analysis to documentation
        """
        analysis_file = self.documentation_dir / f"analysis_{analysis.timestamp.replace(':', '-')}.json"
        
        with open(analysis_file, 'w') as f:
            json.dump(asdict(analysis), f, indent=2, default=str)
        
        # Also create a human-readable report
        report_file = self.documentation_dir / f"report_{analysis.timestamp.replace(':', '-')}.md"
        
        report_content = f"""
        # Architectural Analysis Report
        
        **Event Type**: {analysis.event_type.value}
        **Timestamp**: {analysis.timestamp}
        
        ## Analysis Summary
        {analysis.analysis_summary}
        
        ## System Components
        {chr(10).join(f"- {component}" for component in analysis.system_components)}
        
        ## Affected Services
        {chr(10).join(f"- {service}" for service in analysis.affected_services)}
        
        ## Architectural Patterns
        {chr(10).join(f"- {pattern}" for pattern in analysis.architectural_patterns)}
        
        ## Recommendations
        {chr(10).join(f"- {rec}" for rec in analysis.recommendations)}
        
        ## Implementation Guidance
        {analysis.implementation_guidance}
        
        ## Compliance Status
        {analysis.compliance_status}
        
        ## Performance Impact
        {analysis.performance_impact}
        
        ## Security Considerations
        {analysis.security_considerations}
        
        ## Six Figure Barber Alignment
        {analysis.six_figure_barber_alignment}
        
        ## Generated Diagrams
        {chr(10).join(f"- {diagram}" for diagram in analysis.diagrams_generated)}
        """
        
        with open(report_file, 'w') as f:
            f.write(report_content)
        
        self.logger.info(f"Architectural analysis saved to {analysis_file} and {report_file}")
    
    def _update_metrics(self, event_type: ArchitecturalEvent):
        """
        Update agent execution metrics
        """
        try:
            if self.metrics_file.exists():
                with open(self.metrics_file, 'r') as f:
                    metrics = json.load(f)
            else:
                metrics = {
                    "total_executions": 0,
                    "success_rate": 100.0,
                    "executions_by_event": {},
                    "recent_executions": [],
                    "average_execution_time": 0.0,
                    "last_updated": None
                }
            
            # Update metrics
            metrics["total_executions"] += 1
            event_key = event_type.value
            metrics["executions_by_event"][event_key] = metrics["executions_by_event"].get(event_key, 0) + 1
            
            # Add to recent executions
            now = datetime.now().isoformat()
            metrics["recent_executions"].append(now)
            
            # Keep only last 10 executions
            metrics["recent_executions"] = metrics["recent_executions"][-10:]
            
            metrics["last_updated"] = now
            
            with open(self.metrics_file, 'w') as f:
                json.dump(metrics, f, indent=2)
        
        except Exception as e:
            self.logger.error(f"Error updating metrics: {e}")

def main():
    """
    Main execution function for system architect agent
    """
    if len(sys.argv) < 2:
        print("Usage: python system-architect-agent.py <event_data_json>")
        sys.exit(1)
    
    try:
        # Parse event data from command line argument
        event_data = json.loads(sys.argv[1])
        
        # Initialize agent
        agent = SystemArchitectAgent()
        
        # Check if analysis should be triggered
        should_trigger, event_type = agent.should_trigger(event_data)
        
        if should_trigger:
            print(f"🏗️  System Architect Agent: Analyzing {event_type.value}")
            
            # Perform architectural analysis
            analysis = agent.analyze_architecture(event_type, event_data)
            
            # Output analysis summary
            print(f"✅ Architectural analysis completed")
            print(f"📊 Components analyzed: {len(analysis.system_components)}")
            print(f"🔧 Services affected: {len(analysis.affected_services)}")
            print(f"📋 Recommendations: {len(analysis.recommendations)}")
            print(f"📈 Six Figure Barber alignment: {analysis.six_figure_barber_alignment}")
            
            if analysis.diagrams_generated:
                print(f"📊 Diagrams generated: {len(analysis.diagrams_generated)}")
            
            print(f"📝 Analysis documentation saved")
        else:
            print("ℹ️  System Architect Agent: No architectural analysis triggered")
    
    except Exception as e:
        print(f"❌ System Architect Agent error: {e}")
        logging.error(f"System Architect Agent execution failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()