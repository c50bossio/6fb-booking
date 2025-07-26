#!/usr/bin/env python3
"""
Architectural Pattern Detection and Analysis System for BookedBarber V2

This module provides comprehensive architectural pattern detection, analysis,
and recommendations specifically tailored for the BookedBarber V2 platform
and Six Figure Barber methodology alignment.
"""

import os
import ast
import re
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass
from enum import Enum
import logging

class ArchitecturalPattern(Enum):
    """Architectural patterns specific to BookedBarber V2"""
    CLEAN_ARCHITECTURE = "clean_architecture"
    MICROSERVICES = "microservices"
    API_FIRST_DESIGN = "api_first_design"
    DOMAIN_DRIVEN_DESIGN = "domain_driven_design"
    EVENT_DRIVEN_ARCHITECTURE = "event_driven_architecture"
    CQRS_PATTERN = "cqrs_pattern"
    REPOSITORY_PATTERN = "repository_pattern"
    FACTORY_PATTERN = "factory_pattern"
    OBSERVER_PATTERN = "observer_pattern"
    STRATEGY_PATTERN = "strategy_pattern"
    HEXAGONAL_ARCHITECTURE = "hexagonal_architecture"
    LAYERED_ARCHITECTURE = "layered_architecture"

@dataclass
class PatternAnalysis:
    """Analysis result for an architectural pattern"""
    pattern: ArchitecturalPattern
    present: bool
    confidence: float  # 0.0 to 1.0
    evidence: List[str]
    violations: List[str]
    recommendations: List[str]
    six_figure_barber_alignment: str

@dataclass
class CodeMetrics:
    """Code quality and architectural metrics"""
    total_files: int
    total_lines: int
    complexity_score: float
    coupling_score: float
    cohesion_score: float
    test_coverage: float
    documentation_score: float

class ArchitecturalPatternAnalyzer:
    """
    Comprehensive architectural pattern analyzer for BookedBarber V2
    """
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.backend_dir = project_root / "backend-v2"
        self.frontend_dir = project_root / "backend-v2" / "frontend-v2"
        
        self.logger = logging.getLogger("ArchitecturalPatternAnalyzer")
        
        # Six Figure Barber business domains
        self.business_domains = {
            "booking": ["appointment", "booking", "schedule", "availability"],
            "payment": ["payment", "commission", "payout", "stripe", "billing"],
            "user_management": ["user", "auth", "role", "permission", "profile"],
            "barbershop": ["barbershop", "shop", "location", "franchise"],
            "service": ["service", "offering", "pricing", "duration"],
            "analytics": ["analytics", "report", "metric", "insight", "revenue"],
            "marketing": ["marketing", "review", "google_my_business", "seo"],
            "notification": ["notification", "email", "sms", "alert", "reminder"]
        }
    
    def analyze_all_patterns(self) -> Dict[ArchitecturalPattern, PatternAnalysis]:
        """
        Analyze all architectural patterns in the codebase
        """
        self.logger.info("Starting comprehensive architectural pattern analysis")
        
        analyses = {}
        
        # Analyze each pattern
        for pattern in ArchitecturalPattern:
            analysis = self._analyze_pattern(pattern)
            analyses[pattern] = analysis
            
            self.logger.info(f"Pattern {pattern.value}: {'✅' if analysis.present else '❌'} "
                           f"(confidence: {analysis.confidence:.2f})")
        
        return analyses
    
    def _analyze_pattern(self, pattern: ArchitecturalPattern) -> PatternAnalysis:
        """
        Analyze a specific architectural pattern
        """
        analyzers = {
            ArchitecturalPattern.CLEAN_ARCHITECTURE: self._analyze_clean_architecture,
            ArchitecturalPattern.MICROSERVICES: self._analyze_microservices,
            ArchitecturalPattern.API_FIRST_DESIGN: self._analyze_api_first_design,
            ArchitecturalPattern.DOMAIN_DRIVEN_DESIGN: self._analyze_domain_driven_design,
            ArchitecturalPattern.EVENT_DRIVEN_ARCHITECTURE: self._analyze_event_driven_architecture,
            ArchitecturalPattern.CQRS_PATTERN: self._analyze_cqrs_pattern,
            ArchitecturalPattern.REPOSITORY_PATTERN: self._analyze_repository_pattern,
            ArchitecturalPattern.FACTORY_PATTERN: self._analyze_factory_pattern,
            ArchitecturalPattern.OBSERVER_PATTERN: self._analyze_observer_pattern,
            ArchitecturalPattern.STRATEGY_PATTERN: self._analyze_strategy_pattern,
            ArchitecturalPattern.HEXAGONAL_ARCHITECTURE: self._analyze_hexagonal_architecture,
            ArchitecturalPattern.LAYERED_ARCHITECTURE: self._analyze_layered_architecture
        }
        
        analyzer = analyzers.get(pattern, self._default_pattern_analyzer)
        return analyzer()
    
    def _analyze_clean_architecture(self) -> PatternAnalysis:
        """
        Analyze Clean Architecture implementation
        """
        evidence = []
        violations = []
        
        # Check for clean architecture layers
        required_layers = ["api", "services", "models", "middleware"]
        present_layers = []
        
        for layer in required_layers:
            layer_path = self.backend_dir / layer
            if layer_path.exists() and any(layer_path.glob("*.py")):
                present_layers.append(layer)
                evidence.append(f"Found {layer} layer with Python modules")
            else:
                violations.append(f"Missing or empty {layer} layer")
        
        # Check dependency direction (outer layers depend on inner layers)
        dependency_violations = self._check_dependency_direction()
        violations.extend(dependency_violations)
        
        # Check for business logic isolation
        business_logic_in_api = self._check_business_logic_in_api()
        if business_logic_in_api:
            violations.extend(business_logic_in_api)
        
        confidence = len(present_layers) / len(required_layers)
        present = confidence >= 0.75
        
        recommendations = []
        if not present:
            recommendations.extend([
                "Implement missing architectural layers",
                "Move business logic from API layer to services layer",
                "Ensure proper dependency direction (API -> Services -> Models)",
                "Add interfaces/abstractions between layers"
            ])
        
        six_figure_barber_alignment = self._assess_six_figure_barber_alignment_clean_arch(present_layers)
        
        return PatternAnalysis(
            pattern=ArchitecturalPattern.CLEAN_ARCHITECTURE,
            present=present,
            confidence=confidence,
            evidence=evidence,
            violations=violations,
            recommendations=recommendations,
            six_figure_barber_alignment=six_figure_barber_alignment
        )
    
    def _analyze_microservices(self) -> PatternAnalysis:
        """
        Analyze Microservices architecture implementation
        """
        evidence = []
        violations = []
        
        # Check for service separation
        services_dir = self.backend_dir / "services"
        service_files = list(services_dir.glob("*.py")) if services_dir.exists() else []
        
        # Identify distinct services based on business domains
        domain_services = {}
        for service_file in service_files:
            for domain, keywords in self.business_domains.items():
                if any(keyword in service_file.name.lower() for keyword in keywords):
                    domain_services[domain] = service_file
                    evidence.append(f"Found {domain} service: {service_file.name}")
        
        # Check for proper service boundaries
        service_boundaries = self._check_service_boundaries(service_files)
        evidence.extend(service_boundaries["good"])
        violations.extend(service_boundaries["violations"])
        
        # Check for inter-service communication patterns
        communication_patterns = self._check_inter_service_communication()
        evidence.extend(communication_patterns["patterns"])
        violations.extend(communication_patterns["violations"])
        
        confidence = len(domain_services) / len(self.business_domains)
        present = confidence >= 0.5  # At least half of business domains have dedicated services
        
        recommendations = []
        if not present:
            missing_domains = set(self.business_domains.keys()) - set(domain_services.keys())
            recommendations.extend([
                f"Create dedicated service for {domain} domain" for domain in missing_domains
            ])
            recommendations.extend([
                "Implement proper service boundaries",
                "Add inter-service communication mechanisms",
                "Consider event-driven communication between services"
            ])
        
        six_figure_barber_alignment = self._assess_six_figure_barber_alignment_microservices(domain_services)
        
        return PatternAnalysis(
            pattern=ArchitecturalPattern.MICROSERVICES,
            present=present,
            confidence=confidence,
            evidence=evidence,
            violations=violations,
            recommendations=recommendations,
            six_figure_barber_alignment=six_figure_barber_alignment
        )
    
    def _analyze_api_first_design(self) -> PatternAnalysis:
        """
        Analyze API-First design implementation
        """
        evidence = []
        violations = []
        
        # Check for API documentation
        api_docs_found = self._check_api_documentation()
        evidence.extend(api_docs_found["evidence"])
        violations.extend(api_docs_found["violations"])
        
        # Check for API versioning
        api_versioning = self._check_api_versioning()
        evidence.extend(api_versioning["evidence"])
        violations.extend(api_versioning["violations"])
        
        # Check for consistent API design
        api_consistency = self._check_api_consistency()
        evidence.extend(api_consistency["evidence"])
        violations.extend(api_consistency["violations"])
        
        # Check for proper error handling
        error_handling = self._check_api_error_handling()
        evidence.extend(error_handling["evidence"])
        violations.extend(error_handling["violations"])
        
        total_checks = 4
        passed_checks = sum([
            1 if api_docs_found["score"] > 0.5 else 0,
            1 if api_versioning["score"] > 0.5 else 0,
            1 if api_consistency["score"] > 0.5 else 0,
            1 if error_handling["score"] > 0.5 else 0
        ])
        
        confidence = passed_checks / total_checks
        present = confidence >= 0.75
        
        recommendations = []
        if not present:
            recommendations.extend([
                "Add comprehensive API documentation (OpenAPI/Swagger)",
                "Implement proper API versioning strategy",
                "Standardize API response formats",
                "Add comprehensive error handling and status codes",
                "Implement API rate limiting and throttling"
            ])
        
        six_figure_barber_alignment = "Strong API-first design supports mobile apps and integrations for barbershop management"
        
        return PatternAnalysis(
            pattern=ArchitecturalPattern.API_FIRST_DESIGN,
            present=present,
            confidence=confidence,
            evidence=evidence,
            violations=violations,
            recommendations=recommendations,
            six_figure_barber_alignment=six_figure_barber_alignment
        )
    
    def _analyze_domain_driven_design(self) -> PatternAnalysis:
        """
        Analyze Domain-Driven Design implementation
        """
        evidence = []
        violations = []
        
        # Check for domain model organization
        domain_models = self._check_domain_models()
        evidence.extend(domain_models["evidence"])
        violations.extend(domain_models["violations"])
        
        # Check for bounded contexts
        bounded_contexts = self._check_bounded_contexts()
        evidence.extend(bounded_contexts["evidence"])
        violations.extend(bounded_contexts["violations"])
        
        # Check for domain services
        domain_services = self._check_domain_services()
        evidence.extend(domain_services["evidence"])
        violations.extend(domain_services["violations"])
        
        # Check for value objects
        value_objects = self._check_value_objects()
        evidence.extend(value_objects["evidence"])
        violations.extend(value_objects["violations"])
        
        total_score = (domain_models["score"] + bounded_contexts["score"] + 
                      domain_services["score"] + value_objects["score"]) / 4
        
        confidence = total_score
        present = confidence >= 0.6
        
        recommendations = []
        if not present:
            recommendations.extend([
                "Organize code around business domains (booking, payment, user management)",
                "Create clear bounded contexts for each business area",
                "Implement domain services for complex business logic",
                "Use value objects for business concepts (Money, TimeSlot, etc.)",
                "Add domain events for cross-domain communication"
            ])
        
        six_figure_barber_alignment = self._assess_six_figure_barber_alignment_ddd(domain_models, bounded_contexts)
        
        return PatternAnalysis(
            pattern=ArchitecturalPattern.DOMAIN_DRIVEN_DESIGN,
            present=present,
            confidence=confidence,
            evidence=evidence,
            violations=violations,
            recommendations=recommendations,
            six_figure_barber_alignment=six_figure_barber_alignment
        )
    
    def _analyze_event_driven_architecture(self) -> PatternAnalysis:
        """
        Analyze Event-Driven Architecture implementation
        """
        evidence = []
        violations = []
        
        # Check for event publishing
        event_publishing = self._check_event_publishing()
        evidence.extend(event_publishing["evidence"])
        violations.extend(event_publishing["violations"])
        
        # Check for event handlers
        event_handlers = self._check_event_handlers()
        evidence.extend(event_handlers["evidence"])
        violations.extend(event_handlers["violations"])
        
        # Check for message queues
        message_queues = self._check_message_queues()
        evidence.extend(message_queues["evidence"])
        violations.extend(message_queues["violations"])
        
        # Check for webhook handling
        webhook_handling = self._check_webhook_handling()
        evidence.extend(webhook_handling["evidence"])
        violations.extend(webhook_handling["violations"])
        
        total_score = (event_publishing["score"] + event_handlers["score"] + 
                      message_queues["score"] + webhook_handling["score"]) / 4
        
        confidence = total_score
        present = confidence >= 0.5
        
        recommendations = []
        if not present:
            recommendations.extend([
                "Implement event publishing for domain events",
                "Add event handlers for cross-service communication",
                "Consider message queue implementation (Redis, RabbitMQ)",
                "Implement webhook handling for external integrations",
                "Add event sourcing for audit trails"
            ])
        
        six_figure_barber_alignment = "Event-driven architecture supports real-time booking updates and notifications for better client experience"
        
        return PatternAnalysis(
            pattern=ArchitecturalPattern.EVENT_DRIVEN_ARCHITECTURE,
            present=present,
            confidence=confidence,
            evidence=evidence,
            violations=violations,
            recommendations=recommendations,
            six_figure_barber_alignment=six_figure_barber_alignment
        )
    
    def _check_dependency_direction(self) -> List[str]:
        """Check for proper dependency direction in clean architecture"""
        violations = []
        
        # Check if API layer imports from services layer (good)
        # Check if services layer imports from models layer (good)
        # Check if models layer doesn't import from upper layers (good)
        
        api_files = list(self.backend_dir.glob("api/**/*.py"))
        for api_file in api_files:
            try:
                with open(api_file, 'r') as f:
                    content = f.read()
                    
                # Check for direct database access in API layer
                if re.search(r'from.*models.*import|import.*models', content):
                    violations.append(f"API layer directly imports models in {api_file.name}")
                    
                # Check for business logic in API layer
                if re.search(r'def\s+\w+.*:\s*\n.*(?:calculate|process|validate)', content, re.MULTILINE):
                    violations.append(f"Business logic found in API layer in {api_file.name}")
            except Exception:
                continue
        
        return violations
    
    def _check_business_logic_in_api(self) -> List[str]:
        """Check for business logic in API layer"""
        violations = []
        
        api_files = list(self.backend_dir.glob("api/**/*.py"))
        business_logic_patterns = [
            r'def\s+calculate_commission',
            r'def\s+process_payment',
            r'def\s+validate_booking',
            r'def\s+compute_availability'
        ]
        
        for api_file in api_files:
            try:
                with open(api_file, 'r') as f:
                    content = f.read()
                    
                for pattern in business_logic_patterns:
                    if re.search(pattern, content):
                        violations.append(f"Business logic '{pattern}' found in API layer: {api_file.name}")
            except Exception:
                continue
        
        return violations
    
    def _check_service_boundaries(self, service_files: List[Path]) -> Dict[str, List[str]]:
        """Check for proper service boundaries"""
        good = []
        violations = []
        
        # Check for cross-service dependencies
        for service_file in service_files:
            try:
                with open(service_file, 'r') as f:
                    content = f.read()
                    
                # Check for imports from other services
                other_services = [f for f in service_files if f != service_file]
                for other_service in other_services:
                    service_name = other_service.stem
                    if f"from .{service_name}" in content or f"import .{service_name}" in content:
                        violations.append(f"Service {service_file.stem} directly imports {service_name}")
                    else:
                        good.append(f"Service {service_file.stem} maintains proper boundaries")
            except Exception:
                continue
        
        return {"good": good, "violations": violations}
    
    def _check_inter_service_communication(self) -> Dict[str, List[str]]:
        """Check for inter-service communication patterns"""
        patterns = []
        violations = []
        
        # Look for event-based communication
        event_files = list(self.backend_dir.glob("**/*event*.py"))
        if event_files:
            patterns.append(f"Found {len(event_files)} event-related files for inter-service communication")
        
        # Look for message queue usage
        queue_patterns = ["celery", "redis", "rabbitmq", "queue"]
        for pattern in queue_patterns:
            files = list(self.backend_dir.glob(f"**/*{pattern}*.py"))
            if files:
                patterns.append(f"Found {pattern} usage for async communication")
        
        # Check for direct service calls (violation)
        service_files = list(self.backend_dir.glob("services/*.py"))
        for service_file in service_files:
            try:
                with open(service_file, 'r') as f:
                    content = f.read()
                    if re.search(r'from\s+\..*service.*import', content):
                        violations.append(f"Direct service import found in {service_file.name}")
            except Exception:
                continue
        
        return {"patterns": patterns, "violations": violations}
    
    def _check_api_documentation(self) -> Dict[str, Any]:
        """Check for API documentation"""
        evidence = []
        violations = []
        score = 0.0
        
        # Check for FastAPI automatic documentation
        main_files = list(self.backend_dir.glob("main.py"))
        for main_file in main_files:
            try:
                with open(main_file, 'r') as f:
                    content = f.read()
                    if "FastAPI" in content:
                        evidence.append("FastAPI automatic documentation enabled")
                        score += 0.3
                    if re.search(r'title\s*=|description\s*=', content):
                        evidence.append("API metadata configuration found")
                        score += 0.2
            except Exception:
                continue
        
        # Check for OpenAPI/Swagger configuration
        if "docs_url" in content or "redoc_url" in content:
            evidence.append("Custom documentation URLs configured")
            score += 0.2
        
        # Check for endpoint documentation
        api_files = list(self.backend_dir.glob("api/**/*.py"))
        documented_endpoints = 0
        total_endpoints = 0
        
        for api_file in api_files:
            try:
                with open(api_file, 'r') as f:
                    content = f.read()
                    
                # Count endpoints
                endpoints = re.findall(r'@\w+\.(?:get|post|put|delete|patch)', content)
                total_endpoints += len(endpoints)
                
                # Count documented endpoints (with docstrings)
                documented = re.findall(r'@\w+\.(?:get|post|put|delete|patch).*?\n\s*def\s+\w+.*?:\s*"""', content, re.DOTALL)
                documented_endpoints += len(documented)
            except Exception:
                continue
        
        if total_endpoints > 0:
            doc_ratio = documented_endpoints / total_endpoints
            score += doc_ratio * 0.3
            evidence.append(f"{documented_endpoints}/{total_endpoints} endpoints documented")
        else:
            violations.append("No API endpoints found")
        
        if score < 0.5:
            violations.append("Insufficient API documentation")
        
        return {"evidence": evidence, "violations": violations, "score": score}
    
    def _check_api_versioning(self) -> Dict[str, Any]:
        """Check for API versioning"""
        evidence = []
        violations = []
        score = 0.0
        
        api_dir = self.backend_dir / "api"
        if not api_dir.exists():
            violations.append("No API directory found")
            return {"evidence": evidence, "violations": violations, "score": 0.0}
        
        # Check for version directories
        version_dirs = [d for d in api_dir.iterdir() if d.is_dir() and re.match(r'v\d+', d.name)]
        if version_dirs:
            evidence.append(f"Found API versions: {[d.name for d in version_dirs]}")
            score += 0.5
        else:
            violations.append("No API versioning structure found")
        
        # Check for v2 API (preferred)
        if (api_dir / "v2").exists():
            evidence.append("V2 API directory exists (current preferred version)")
            score += 0.3
        
        # Check for version routing
        main_files = list(self.backend_dir.glob("main.py"))
        for main_file in main_files:
            try:
                with open(main_file, 'r') as f:
                    content = f.read()
                    if re.search(r'include_router.*prefix\s*=\s*["\'].*v\d+', content):
                        evidence.append("Version-based routing configuration found")
                        score += 0.2
            except Exception:
                continue
        
        return {"evidence": evidence, "violations": violations, "score": score}
    
    def _check_api_consistency(self) -> Dict[str, Any]:
        """Check for API consistency"""
        evidence = []
        violations = []
        score = 0.0
        
        api_files = list(self.backend_dir.glob("api/**/*.py"))
        
        # Check for consistent naming conventions
        naming_patterns = {
            "get_": 0,
            "post_": 0,
            "put_": 0,
            "delete_": 0
        }
        
        response_models = 0
        total_endpoints = 0
        
        for api_file in api_files:
            try:
                with open(api_file, 'r') as f:
                    content = f.read()
                    
                # Count endpoints
                endpoints = re.findall(r'def\s+(\w+)', content)
                total_endpoints += len(endpoints)
                
                # Check naming patterns
                for endpoint in endpoints:
                    for pattern in naming_patterns:
                        if endpoint.startswith(pattern):
                            naming_patterns[pattern] += 1
                
                # Check for response models
                if "response_model" in content:
                    response_models += 1
            except Exception:
                continue
        
        # Assess naming consistency
        if total_endpoints > 0:
            consistency_ratio = sum(naming_patterns.values()) / total_endpoints
            if consistency_ratio > 0.7:
                evidence.append("Consistent endpoint naming conventions")
                score += 0.3
            else:
                violations.append("Inconsistent endpoint naming conventions")
        
        # Assess response model usage
        if api_files and response_models > 0:
            model_ratio = response_models / len(api_files)
            if model_ratio > 0.5:
                evidence.append("Good response model usage")
                score += 0.4
            else:
                violations.append("Inconsistent response model usage")
        
        # Check for status code usage
        status_code_files = [f for f in api_files if "status_code" in open(f).read()]
        if status_code_files:
            evidence.append("Proper HTTP status code usage")
            score += 0.3
        else:
            violations.append("Missing explicit status code usage")
        
        return {"evidence": evidence, "violations": violations, "score": score}
    
    def _check_api_error_handling(self) -> Dict[str, Any]:
        """Check for API error handling"""
        evidence = []
        violations = []
        score = 0.0
        
        # Check for exception handling
        exception_files = []
        middleware_files = list(self.backend_dir.glob("middleware/*.py"))
        
        for middleware_file in middleware_files:
            try:
                with open(middleware_file, 'r') as f:
                    content = f.read()
                    if "exception" in content.lower() or "error" in content.lower():
                        exception_files.append(middleware_file)
            except Exception:
                continue
        
        if exception_files:
            evidence.append(f"Exception handling middleware found: {len(exception_files)} files")
            score += 0.4
        else:
            violations.append("No exception handling middleware found")
        
        # Check for custom exceptions
        exception_patterns = ["HTTPException", "ValidationError", "CustomException"]
        api_files = list(self.backend_dir.glob("api/**/*.py"))
        
        exception_usage = 0
        for api_file in api_files:
            try:
                with open(api_file, 'r') as f:
                    content = f.read()
                    for pattern in exception_patterns:
                        if pattern in content:
                            exception_usage += 1
                            break
            except Exception:
                continue
        
        if exception_usage > 0:
            evidence.append(f"Custom exception usage in {exception_usage} API files")
            score += 0.3
        
        # Check for error response models
        models_dir = self.backend_dir / "models"
        if models_dir.exists():
            error_model_files = list(models_dir.glob("*error*.py"))
            if error_model_files:
                evidence.append("Error response models defined")
                score += 0.3
            else:
                violations.append("No error response models found")
        
        return {"evidence": evidence, "violations": violations, "score": score}
    
    def _default_pattern_analyzer(self) -> PatternAnalysis:
        """Default analyzer for patterns not yet implemented"""
        return PatternAnalysis(
            pattern=ArchitecturalPattern.FACTORY_PATTERN,  # Default
            present=False,
            confidence=0.0,
            evidence=["Pattern analysis not yet implemented"],
            violations=[],
            recommendations=["Implement pattern-specific analysis"],
            six_figure_barber_alignment="Analysis pending"
        )
    
    def _assess_six_figure_barber_alignment_clean_arch(self, present_layers: List[str]) -> str:
        """Assess Six Figure Barber alignment for clean architecture"""
        if len(present_layers) >= 3:
            return "Strong alignment: Clean architecture supports scalable barbershop business logic and revenue optimization"
        elif len(present_layers) >= 2:
            return "Moderate alignment: Some architectural separation supports business growth"
        else:
            return "Weak alignment: Lack of architectural layers may hinder business scalability"
    
    def _assess_six_figure_barber_alignment_microservices(self, domain_services: Dict[str, Path]) -> str:
        """Assess Six Figure Barber alignment for microservices"""
        critical_services = ["booking", "payment", "analytics"]
        present_critical = [service for service in critical_services if service in domain_services]
        
        if len(present_critical) >= 3:
            return "Excellent alignment: Microservices support independent scaling of critical business functions"
        elif len(present_critical) >= 2:
            return "Good alignment: Core business services are separated for better management"
        else:
            return "Limited alignment: Missing critical business service separation"
    
    def _assess_six_figure_barber_alignment_ddd(self, domain_models: Dict[str, Any], bounded_contexts: Dict[str, Any]) -> str:
        """Assess Six Figure Barber alignment for domain-driven design"""
        if domain_models["score"] > 0.7 and bounded_contexts["score"] > 0.7:
            return "Strong alignment: Domain-driven design reflects barbershop business complexity and Six Figure Barber methodology"
        elif domain_models["score"] > 0.5 or bounded_contexts["score"] > 0.5:
            return "Moderate alignment: Some domain modeling supports business logic organization"
        else:
            return "Weak alignment: Insufficient domain modeling for complex barbershop business rules"
    
    # Placeholder methods for additional pattern checks
    def _analyze_cqrs_pattern(self) -> PatternAnalysis:
        return self._default_pattern_analyzer()
    
    def _analyze_repository_pattern(self) -> PatternAnalysis:
        return self._default_pattern_analyzer()
    
    def _analyze_factory_pattern(self) -> PatternAnalysis:
        return self._default_pattern_analyzer()
    
    def _analyze_observer_pattern(self) -> PatternAnalysis:
        return self._default_pattern_analyzer()
    
    def _analyze_strategy_pattern(self) -> PatternAnalysis:
        return self._default_pattern_analyzer()
    
    def _analyze_hexagonal_architecture(self) -> PatternAnalysis:
        return self._default_pattern_analyzer()
    
    def _analyze_layered_architecture(self) -> PatternAnalysis:
        return self._default_pattern_analyzer()
    
    def _check_domain_models(self) -> Dict[str, Any]:
        return {"evidence": [], "violations": [], "score": 0.0}
    
    def _check_bounded_contexts(self) -> Dict[str, Any]:
        return {"evidence": [], "violations": [], "score": 0.0}
    
    def _check_domain_services(self) -> Dict[str, Any]:
        return {"evidence": [], "violations": [], "score": 0.0}
    
    def _check_value_objects(self) -> Dict[str, Any]:
        return {"evidence": [], "violations": [], "score": 0.0}
    
    def _check_event_publishing(self) -> Dict[str, Any]:
        return {"evidence": [], "violations": [], "score": 0.0}
    
    def _check_event_handlers(self) -> Dict[str, Any]:
        return {"evidence": [], "violations": [], "score": 0.0}
    
    def _check_message_queues(self) -> Dict[str, Any]:
        return {"evidence": [], "violations": [], "score": 0.0}
    
    def _check_webhook_handling(self) -> Dict[str, Any]:
        return {"evidence": [], "violations": [], "score": 0.0}
    
    def calculate_code_metrics(self) -> CodeMetrics:
        """
        Calculate comprehensive code quality metrics
        """
        total_files = 0
        total_lines = 0
        
        # Count Python files in backend
        python_files = list(self.backend_dir.glob("**/*.py"))
        total_files += len(python_files)
        
        for python_file in python_files:
            try:
                with open(python_file, 'r') as f:
                    lines = len(f.readlines())
                    total_lines += lines
            except Exception:
                continue
        
        # Count TypeScript files in frontend
        ts_files = list(self.frontend_dir.glob("**/*.ts*")) if self.frontend_dir.exists() else []
        total_files += len(ts_files)
        
        for ts_file in ts_files:
            try:
                with open(ts_file, 'r') as f:
                    lines = len(f.readlines())
                    total_lines += lines
            except Exception:
                continue
        
        # Calculate complexity (simplified metric based on file count and structure)
        complexity_score = min(1.0, total_files / 100)  # Normalize to 0-1
        
        # Calculate coupling (simplified metric based on imports)
        coupling_score = self._calculate_coupling_score(python_files)
        
        # Calculate cohesion (simplified metric based on file organization)
        cohesion_score = self._calculate_cohesion_score()
        
        # Test coverage (placeholder - would need actual coverage tool)
        test_coverage = self._estimate_test_coverage()
        
        # Documentation score (placeholder - based on docstrings)
        documentation_score = self._calculate_documentation_score(python_files)
        
        return CodeMetrics(
            total_files=total_files,
            total_lines=total_lines,
            complexity_score=complexity_score,
            coupling_score=coupling_score,
            cohesion_score=cohesion_score,
            test_coverage=test_coverage,
            documentation_score=documentation_score
        )
    
    def _calculate_coupling_score(self, python_files: List[Path]) -> float:
        """Calculate coupling score (lower is better)"""
        if not python_files:
            return 0.0
        
        total_imports = 0
        external_imports = 0
        
        for python_file in python_files:
            try:
                with open(python_file, 'r') as f:
                    content = f.read()
                    
                imports = re.findall(r'^(?:from|import)\s+(\S+)', content, re.MULTILINE)
                total_imports += len(imports)
                
                # Count external imports (not relative)
                external = [imp for imp in imports if not imp.startswith('.')]
                external_imports += len(external)
            except Exception:
                continue
        
        if total_imports == 0:
            return 0.0
        
        # Lower coupling is better, so invert the ratio
        return 1.0 - (external_imports / total_imports)
    
    def _calculate_cohesion_score(self) -> float:
        """Calculate cohesion score based on file organization"""
        # Check if files are well organized in directories
        backend_dirs = [d for d in self.backend_dir.iterdir() if d.is_dir()]
        organization_score = min(1.0, len(backend_dirs) / 6)  # Expect ~6 main directories
        
        return organization_score
    
    def _estimate_test_coverage(self) -> float:
        """Estimate test coverage based on test files"""
        test_files = list(self.backend_dir.glob("**/test_*.py")) + list(self.backend_dir.glob("**/tests/*.py"))
        source_files = [f for f in self.backend_dir.glob("**/*.py") if "test" not in str(f)]
        
        if not source_files:
            return 0.0
        
        # Simple estimation: ratio of test files to source files
        coverage_ratio = len(test_files) / len(source_files)
        return min(1.0, coverage_ratio * 2)  # Cap at 100%
    
    def _calculate_documentation_score(self, python_files: List[Path]) -> float:
        """Calculate documentation score based on docstrings"""
        if not python_files:
            return 0.0
        
        documented_functions = 0
        total_functions = 0
        
        for python_file in python_files:
            try:
                with open(python_file, 'r') as f:
                    content = f.read()
                    
                functions = re.findall(r'def\s+\w+', content)
                total_functions += len(functions)
                
                # Count functions with docstrings
                documented = re.findall(r'def\s+\w+.*?:\s*"""', content, re.DOTALL)
                documented_functions += len(documented)
            except Exception:
                continue
        
        if total_functions == 0:
            return 0.0
        
        return documented_functions / total_functions