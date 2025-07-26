"""
Franchise Security Models for Enterprise-Scale BookedBarber V2
Extends existing security models for franchise network operations
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import enum
import uuid


class SecurityZone(enum.Enum):
    """Security zones for franchise operations"""
    GLOBAL = "global"           # Platform-wide access
    REGIONAL = "regional"       # Regional franchise access
    NETWORK = "network"         # Franchise network access
    GROUP = "group"            # Multi-location group access
    LOCAL = "local"            # Individual location access


class ComplianceStandard(enum.Enum):
    """Supported compliance standards"""
    GDPR = "gdpr"              # General Data Protection Regulation (EU)
    CCPA = "ccpa"              # California Consumer Privacy Act
    PCI_DSS = "pci_dss"        # Payment Card Industry Data Security Standard
    SOC2 = "soc2"              # Service Organization Control 2
    HIPAA = "hipaa"            # Health Insurance Portability and Accountability Act
    ISO27001 = "iso27001"      # ISO/IEC 27001 Information Security Management


class DataClassification(enum.Enum):
    """Data classification levels for encryption and access control"""
    PUBLIC = "public"                    # Public information
    INTERNAL = "internal"               # Internal business information
    CONFIDENTIAL = "confidential"       # Confidential business information
    RESTRICTED = "restricted"           # Restricted/sensitive information
    PII = "pii"                        # Personally Identifiable Information
    FINANCIAL = "financial"            # Financial and payment information
    HEALTH = "health"                  # Health-related information


class FranchiseNetwork(Base):
    """Franchise network entity for top-level franchise management"""
    __tablename__ = "franchise_networks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)  # URL-friendly identifier
    
    # Business information
    legal_entity_name = Column(String(255), nullable=False)
    business_registration_number = Column(String(100))
    headquarters_country = Column(String(2), nullable=False)  # ISO country code
    headquarters_region = Column(String(100), nullable=False)
    
    # Security configuration
    security_policy_id = Column(UUID(as_uuid=True), ForeignKey("franchise_security_policies.id"))
    sso_provider_config = Column(JSONB)  # SSO provider configuration
    compliance_requirements = Column(JSONB)  # Required compliance standards
    
    # Status and metadata
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    security_policy = relationship("FranchiseSecurityPolicy", back_populates="franchise_networks")
    regions = relationship("FranchiseRegion", back_populates="franchise_network", cascade="all, delete-orphan")
    security_events = relationship("FranchiseSecurityEvent", back_populates="franchise_network")


class FranchiseRegion(Base):
    """Regional subdivision of franchise networks for compliance and management"""
    __tablename__ = "franchise_regions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    franchise_network_id = Column(UUID(as_uuid=True), ForeignKey("franchise_networks.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False, index=True)
    
    # Geographic and compliance information
    countries = Column(JSONB, nullable=False)  # List of country codes in this region
    primary_jurisdiction = Column(String(2), nullable=False)  # Primary regulatory jurisdiction
    data_residency_requirements = Column(JSONB)  # Data residency and sovereignty requirements
    compliance_standards = Column(JSONB)  # Required compliance standards for this region
    
    # Regional security settings
    security_policy_overrides = Column(JSONB)  # Region-specific security policy overrides
    encryption_requirements = Column(JSONB)  # Region-specific encryption requirements
    
    # Status and metadata
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    franchise_network = relationship("FranchiseNetwork", back_populates="regions")
    groups = relationship("FranchiseGroup", back_populates="franchise_region", cascade="all, delete-orphan")
    
    # Unique constraint
    __table_args__ = (
        {"schema": None}
    )


class FranchiseGroup(Base):
    """Multi-location groups within franchise regions"""
    __tablename__ = "franchise_groups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    franchise_region_id = Column(UUID(as_uuid=True), ForeignKey("franchise_regions.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    
    # Group management
    group_admin_user_id = Column(Integer, ForeignKey("users.id"))  # Primary group administrator
    management_structure = Column(JSONB)  # Group management hierarchy
    
    # Security settings
    security_policy_overrides = Column(JSONB)  # Group-specific security overrides
    
    # Status and metadata
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    franchise_region = relationship("FranchiseRegion", back_populates="groups")
    group_admin = relationship("User", foreign_keys=[group_admin_user_id])


class FranchiseSecurityPolicy(Base):
    """Security policies for franchise networks"""
    __tablename__ = "franchise_security_policies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(255), nullable=False)
    version = Column(String(20), nullable=False, default="1.0")
    
    # Authentication requirements
    require_mfa = Column(Boolean, default=True, nullable=False)
    require_biometric_admin = Column(Boolean, default=False, nullable=False)
    require_biometric_payments = Column(Boolean, default=True, nullable=False)
    allow_pin_fallback = Column(Boolean, default=True, nullable=False)
    max_biometric_attempts = Column(Integer, default=3, nullable=False)
    
    # Session management
    session_timeout_minutes = Column(Integer, default=60, nullable=False)
    concurrent_session_limit = Column(Integer, default=3, nullable=False)
    require_session_reauth_hours = Column(Integer, default=8, nullable=False)
    
    # Access control
    require_device_registration = Column(Boolean, default=True, nullable=False)
    allow_public_device_access = Column(Boolean, default=False, nullable=False)
    ip_whitelist_enabled = Column(Boolean, default=False, nullable=False)
    ip_whitelist = Column(JSONB)  # List of allowed IP ranges
    
    # API security
    api_rate_limit_per_minute = Column(Integer, default=100, nullable=False)
    api_rate_limit_burst = Column(Integer, default=200, nullable=False)
    require_api_key_rotation_days = Column(Integer, default=90, nullable=False)
    
    # Data protection
    encryption_at_rest_required = Column(Boolean, default=True, nullable=False)
    field_level_encryption_required = Column(Boolean, default=True, nullable=False)
    data_retention_days = Column(Integer, default=2555, nullable=False)  # 7 years default
    
    # Compliance requirements
    compliance_standards = Column(JSONB, nullable=False)  # List of required compliance standards
    audit_log_retention_days = Column(Integer, default=2555, nullable=False)
    automated_compliance_reporting = Column(Boolean, default=True, nullable=False)
    
    # Incident response
    security_notification_enabled = Column(Boolean, default=True, nullable=False)
    security_notification_emails = Column(JSONB)  # List of security notification recipients
    automated_threat_response = Column(Boolean, default=True, nullable=False)
    
    # Status and metadata
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    franchise_networks = relationship("FranchiseNetwork", back_populates="security_policy")
    created_by = relationship("User", foreign_keys=[created_by_user_id])


class FranchiseSecurityContext(Base):
    """Security context for franchise operations - stored for audit and analysis"""
    __tablename__ = "franchise_security_contexts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Franchise hierarchy identifiers
    franchise_network_id = Column(UUID(as_uuid=True), ForeignKey("franchise_networks.id"))
    franchise_region_id = Column(UUID(as_uuid=True), ForeignKey("franchise_regions.id"))
    franchise_group_id = Column(UUID(as_uuid=True), ForeignKey("franchise_groups.id"))
    location_id = Column(Integer, ForeignKey("users.location_id"))  # Links to existing location system
    
    # Security context
    security_zone = Column(Enum(SecurityZone), nullable=False)
    compliance_requirements = Column(JSONB)  # Active compliance requirements
    data_classification_level = Column(Enum(DataClassification), nullable=False)
    
    # Request context
    user_id = Column(Integer, ForeignKey("users.id"))
    session_id = Column(String(255))
    request_path = Column(String(500))
    request_method = Column(String(10))
    client_ip = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    
    # Security assessment
    risk_score = Column(Integer, default=0)  # 0-100 risk score
    threat_indicators = Column(JSONB)  # Detected threat indicators
    security_actions_taken = Column(JSONB)  # Security actions applied
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    franchise_network = relationship("FranchiseNetwork")
    franchise_region = relationship("FranchiseRegion")
    franchise_group = relationship("FranchiseGroup")
    user = relationship("User", foreign_keys=[user_id])


class FranchiseSecurityEvent(Base):
    """Security events and incidents for franchise networks"""
    __tablename__ = "franchise_security_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    franchise_network_id = Column(UUID(as_uuid=True), ForeignKey("franchise_networks.id"), nullable=False)
    
    # Event classification
    event_type = Column(String(100), nullable=False, index=True)
    event_category = Column(String(50), nullable=False, index=True)  # authentication, authorization, data_access, etc.
    severity = Column(String(20), nullable=False, index=True)  # low, medium, high, critical
    
    # Event details
    event_description = Column(Text, nullable=False)
    event_data = Column(JSONB)  # Structured event data
    source_ip = Column(String(45))
    user_id = Column(Integer, ForeignKey("users.id"))
    location_id = Column(Integer)
    
    # Security context
    security_context_id = Column(UUID(as_uuid=True), ForeignKey("franchise_security_contexts.id"))
    threat_indicators = Column(JSONB)  # Associated threat indicators
    
    # Response and resolution
    automated_response_taken = Column(JSONB)  # Automated responses executed
    manual_response_required = Column(Boolean, default=False)
    incident_status = Column(String(20), default="open")  # open, investigating, resolved, false_positive
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"))
    resolution_notes = Column(Text)
    resolved_at = Column(DateTime(timezone=True))
    
    # Compliance and audit
    compliance_impact = Column(JSONB)  # Impact on compliance requirements
    audit_trail = Column(JSONB)  # Audit trail for this event
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    franchise_network = relationship("FranchiseNetwork", back_populates="security_events")
    user = relationship("User", foreign_keys=[user_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id])
    security_context = relationship("FranchiseSecurityContext")


class FranchiseEncryptionKey(Base):
    """Franchise encryption key management"""
    __tablename__ = "franchise_encryption_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Key hierarchy
    franchise_network_id = Column(UUID(as_uuid=True), ForeignKey("franchise_networks.id"))
    franchise_region_id = Column(UUID(as_uuid=True), ForeignKey("franchise_regions.id"))
    location_id = Column(Integer)
    
    # Key metadata
    key_type = Column(String(50), nullable=False)  # data_encryption, session, api_signing
    key_purpose = Column(String(100), nullable=False)  # Purpose of this key
    data_classification = Column(Enum(DataClassification), nullable=False)
    
    # Key management
    key_id = Column(String(255), nullable=False, unique=True)  # HSM key identifier
    key_version = Column(Integer, default=1, nullable=False)
    algorithm = Column(String(50), nullable=False, default="AES-256-GCM")
    
    # Key lifecycle
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    activated_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    rotated_at = Column(DateTime(timezone=True))
    
    # Status
    status = Column(String(20), default="pending")  # pending, active, rotated, revoked
    is_active = Column(Boolean, default=False)
    
    # Relationships
    franchise_network = relationship("FranchiseNetwork")
    franchise_region = relationship("FranchiseRegion")


# Utility functions for franchise security context

def create_franchise_security_context(
    franchise_network_id: Optional[str] = None,
    franchise_region_id: Optional[str] = None,
    franchise_group_id: Optional[str] = None,
    location_id: Optional[int] = None,
    security_zone: SecurityZone = SecurityZone.LOCAL,
    compliance_requirements: Optional[List[ComplianceStandard]] = None,
    data_classification: DataClassification = DataClassification.INTERNAL
) -> Dict[str, Any]:
    """Create a franchise security context dictionary"""
    
    return {
        "franchise_network_id": franchise_network_id,
        "franchise_region_id": franchise_region_id,
        "franchise_group_id": franchise_group_id,
        "location_id": location_id,
        "security_zone": security_zone.value,
        "compliance_requirements": [req.value for req in (compliance_requirements or [])],
        "data_classification": data_classification.value
    }


def get_effective_security_policy(
    franchise_network: FranchiseNetwork,
    franchise_region: Optional[FranchiseRegion] = None,
    franchise_group: Optional[FranchiseGroup] = None
) -> Dict[str, Any]:
    """Get effective security policy with regional and group overrides"""
    
    # Start with network-level policy
    policy = franchise_network.security_policy.__dict__.copy()
    
    # Apply regional overrides
    if franchise_region and franchise_region.security_policy_overrides:
        policy.update(franchise_region.security_policy_overrides)
    
    # Apply group overrides
    if franchise_group and franchise_group.security_policy_overrides:
        policy.update(franchise_group.security_policy_overrides)
    
    return policy


def validate_compliance_requirements(
    franchise_context: Dict[str, Any],
    operation: str,
    data_types: List[DataClassification]
) -> List[str]:
    """Validate compliance requirements for a given operation"""
    
    violations = []
    compliance_reqs = franchise_context.get("compliance_requirements", [])
    
    # GDPR validation
    if ComplianceStandard.GDPR.value in compliance_reqs:
        if DataClassification.PII in data_types and operation in ["create", "update", "delete"]:
            # Require explicit consent logging
            violations.append("GDPR requires explicit consent logging for PII operations")
    
    # PCI DSS validation
    if ComplianceStandard.PCI_DSS.value in compliance_reqs:
        if DataClassification.FINANCIAL in data_types:
            # Require additional encryption and audit logging
            violations.append("PCI DSS requires enhanced encryption for financial data")
    
    # SOC 2 validation
    if ComplianceStandard.SOC2.value in compliance_reqs:
        if operation in ["admin", "configuration"]:
            # Require MFA for administrative operations
            violations.append("SOC 2 requires MFA for administrative operations")
    
    return violations