"""
Franchise Network Models for Enterprise-Scale Barbershop Operations

This module defines the database models for franchise network management,
supporting multi-level hierarchy, cross-network analytics, and compliance tracking.
"""

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, 
    Enum as SQLEnum, Numeric, Index
)
from sqlalchemy.orm import relationship, backref
from datetime import datetime, timezone
import enum
import sys
import os

# Add parent directory to path to resolve imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import Base
from utils.encryption import EncryptedText


def utcnow():
    """Helper function for UTC datetime (replaces deprecated utcnow())"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class FranchiseNetworkType(enum.Enum):
    """Types of franchise network structures"""
    CORPORATE_OWNED = "corporate_owned"
    FRANCHISEE_OWNED = "franchisee_owned"
    MASTER_FRANCHISE = "master_franchise"
    AREA_DEVELOPMENT = "area_development"
    HYBRID = "hybrid"


class FranchiseStatus(enum.Enum):
    """Franchise entity status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    DEVELOPMENT = "development"


class ComplianceJurisdiction(enum.Enum):
    """Legal jurisdictions for compliance tracking"""
    US_FEDERAL = "us_federal"
    US_STATE = "us_state"
    CANADA_FEDERAL = "canada_federal"
    CANADA_PROVINCIAL = "canada_provincial"
    EU_GENERAL = "eu_general"
    UK = "uk"
    AUSTRALIA = "australia"
    CUSTOM = "custom"


class FranchiseNetwork(Base):
    """
    Top-level franchise network entity representing a multi-brand franchise company.
    Supports master franchise operations, corporate ownership, and area development.
    """
    __tablename__ = "franchise_networks"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    legal_name = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=False, index=True)
    
    # Network structure
    network_type = Column(SQLEnum(FranchiseNetworkType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    parent_network_id = Column(Integer, ForeignKey("franchise_networks.id"), nullable=True)
    
    # Corporate information
    corporate_headquarters = Column(JSON, default=dict)  # Address, contact info
    primary_contact_info = Column(JSON, default=dict)  # CEO, Operations Director
    legal_structure = Column(String(100), nullable=True)  # LLC, Corporation, etc.
    
    # Business metrics
    total_locations_target = Column(Integer, default=0)
    current_locations_count = Column(Integer, default=0)
    territory_coverage = Column(JSON, default=dict)  # Geographic coverage data
    
    # Financial tracking
    franchise_fee_structure = Column(JSON, default=dict)  # Initial fees, royalties, etc.
    revenue_sharing_model = Column(JSON, default=dict)  # Revenue distribution rules
    
    # Compliance and governance
    compliance_requirements = Column(JSON, default=dict)  # Regulatory requirements
    governance_policies = Column(JSON, default=dict)  # Operating standards
    
    # Status and metadata
    status = Column(SQLEnum(FranchiseStatus, values_callable=lambda obj: [e.value for e in obj]), default=FranchiseStatus.ACTIVE)
    established_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    parent_network = relationship("FranchiseNetwork", remote_side=[id])
    child_networks = relationship("FranchiseNetwork", back_populates="parent_network")
    regions = relationship("FranchiseRegion", back_populates="network", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_franchise_network_brand_status', 'brand', 'status'),
        Index('idx_franchise_network_type', 'network_type'),
    )
    
    def __repr__(self):
        return f"<FranchiseNetwork(id={self.id}, name='{self.name}', brand='{self.brand}', type={self.network_type.value})>"


class FranchiseRegion(Base):
    """
    Regional divisions within a franchise network for geographic and operational management.
    Supports multi-jurisdiction compliance and regional market analysis.
    """
    __tablename__ = "franchise_regions"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    network_id = Column(Integer, ForeignKey("franchise_networks.id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(20), nullable=False, index=True)  # Region identifier (e.g., 'NE', 'SW', 'CA-ON')
    
    # Geographic information
    geographic_boundaries = Column(JSON, default=dict)  # Lat/lng boundaries, ZIP codes, etc.
    primary_markets = Column(JSON, default=list)  # Major cities/markets in region
    market_demographics = Column(JSON, default=dict)  # Population, income, competition data
    
    # Regional management
    regional_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    development_coordinator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    support_team_ids = Column(JSON, default=list)  # List of support staff user IDs
    
    # Business metrics
    target_locations = Column(Integer, default=0)
    development_timeline = Column(JSON, default=dict)  # Expansion schedule
    market_penetration = Column(Numeric(5, 2), default=0.00)  # Percentage
    
    # Compliance tracking
    jurisdictions = Column(JSON, default=list)  # List of ComplianceJurisdiction values
    regulatory_requirements = Column(JSON, default=dict)  # Regional regulations
    licensing_requirements = Column(JSON, default=dict)  # Business licenses needed
    
    # Performance tracking
    performance_metrics = Column(JSON, default=dict)  # Revenue, growth, satisfaction
    benchmarking_data = Column(JSON, default=dict)  # Comparative performance
    
    # Status and metadata
    status = Column(SQLEnum(FranchiseStatus, values_callable=lambda obj: [e.value for e in obj]), default=FranchiseStatus.ACTIVE)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    network = relationship("FranchiseNetwork", back_populates="regions")
    regional_manager = relationship("User", foreign_keys=[regional_manager_id])
    development_coordinator = relationship("User", foreign_keys=[development_coordinator_id])
    groups = relationship("FranchiseGroup", back_populates="region", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_franchise_region_network_status', 'network_id', 'status'),
        Index('idx_franchise_region_code', 'code'),
    )
    
    def __repr__(self):
        return f"<FranchiseRegion(id={self.id}, name='{self.name}', code='{self.code}', network_id={self.network_id})>"


class FranchiseGroup(Base):
    """
    Operational groups within regions for cluster management and shared resources.
    Supports area development agreements and multi-unit franchisee operations.
    """
    __tablename__ = "franchise_groups"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("franchise_regions.id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(20), nullable=False, index=True)
    
    # Group structure
    group_type = Column(String(50), nullable=False)  # area_development, multi_unit, corporate_cluster
    franchisee_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Multi-unit franchisee
    corporate_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Territory and development
    territory_definition = Column(JSON, default=dict)  # Protected territory boundaries
    development_rights = Column(JSON, default=dict)  # Expansion rights and obligations
    exclusivity_agreements = Column(JSON, default=dict)  # Non-compete and territory protection
    
    # Operational shared resources
    shared_resources = Column(JSON, default=dict)  # Shared marketing, staff, inventory
    cross_training_programs = Column(JSON, default=dict)  # Staff development across locations
    group_purchasing_agreements = Column(JSON, default=dict)  # Bulk purchasing benefits
    
    # Performance coordination
    standardization_requirements = Column(JSON, default=dict)  # Brand standards compliance
    quality_assurance_protocols = Column(JSON, default=dict)  # QA processes
    cross_location_metrics = Column(JSON, default=dict)  # Group-level KPIs
    
    # Financial coordination
    revenue_sharing_model = Column(JSON, default=dict)  # Internal revenue distribution
    cost_sharing_agreements = Column(JSON, default=dict)  # Shared cost allocations
    group_financial_targets = Column(JSON, default=dict)  # Collective goals
    
    # Status and metadata
    status = Column(SQLEnum(FranchiseStatus, values_callable=lambda obj: [e.value for e in obj]), default=FranchiseStatus.ACTIVE)
    formation_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Relationships
    region = relationship("FranchiseRegion", back_populates="groups")
    franchisee = relationship("User", foreign_keys=[franchisee_id])
    corporate_manager = relationship("User", foreign_keys=[corporate_manager_id])
    
    # Enhanced location relationship will be added when location model is extended
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_franchise_group_region_status', 'region_id', 'status'),
        Index('idx_franchise_group_franchisee', 'franchisee_id'),
        Index('idx_franchise_group_type', 'group_type'),
    )
    
    def __repr__(self):
        return f"<FranchiseGroup(id={self.id}, name='{self.name}', type='{self.group_type}', region_id={self.region_id})>"


class FranchiseCompliance(Base):
    """
    Compliance tracking for franchise operations across multiple jurisdictions.
    Handles regulatory requirements, audits, and reporting obligations.
    """
    __tablename__ = "franchise_compliance"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)  # network, region, group, location
    entity_id = Column(Integer, nullable=False)  # ID of the entity being tracked
    
    # Compliance details
    jurisdiction = Column(SQLEnum(ComplianceJurisdiction, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    requirement_type = Column(String(100), nullable=False)  # license, tax, labor, health, etc.
    requirement_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Status and dates
    compliance_status = Column(String(50), nullable=False, default="pending")  # compliant, non_compliant, pending, expired
    required_by_date = Column(DateTime, nullable=True)
    last_compliance_check = Column(DateTime, nullable=True)
    next_review_date = Column(DateTime, nullable=True)
    
    # Documentation
    compliance_documents = Column(JSON, default=list)  # Document IDs, URLs, metadata
    audit_history = Column(JSON, default=list)  # Audit results and findings
    remediation_actions = Column(JSON, default=list)  # Required corrective actions
    
    # Risk assessment
    risk_level = Column(String(20), default="medium")  # low, medium, high, critical
    non_compliance_penalties = Column(JSON, default=dict)  # Potential fines/consequences
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_franchise_compliance_entity', 'entity_type', 'entity_id'),
        Index('idx_franchise_compliance_jurisdiction', 'jurisdiction'),
        Index('idx_franchise_compliance_status', 'compliance_status'),
        Index('idx_franchise_compliance_review_date', 'next_review_date'),
    )
    
    def __repr__(self):
        return f"<FranchiseCompliance(id={self.id}, entity={self.entity_type}:{self.entity_id}, requirement='{self.requirement_name}')>"


class FranchiseAnalytics(Base):
    """
    Pre-computed analytics for franchise network performance tracking.
    Supports real-time dashboards and cross-network benchmarking.
    """
    __tablename__ = "franchise_analytics"
    
    # Primary fields
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)  # network, region, group, location
    entity_id = Column(Integer, nullable=False)
    
    # Time period
    period_type = Column(String(20), nullable=False)  # daily, weekly, monthly, quarterly, yearly
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Core metrics
    revenue_metrics = Column(JSON, default=dict)  # Revenue, growth, per-unit averages
    operational_metrics = Column(JSON, default=dict)  # Appointments, utilization, efficiency
    client_metrics = Column(JSON, default=dict)  # Acquisition, retention, satisfaction
    staff_metrics = Column(JSON, default=dict)  # Productivity, retention, training
    
    # Franchise-specific metrics
    franchise_fee_collection = Column(JSON, default=dict)  # Royalty collection rates
    brand_compliance_scores = Column(JSON, default=dict)  # Standards adherence
    cross_selling_performance = Column(JSON, default=dict)  # Multi-location client behavior
    territory_performance = Column(JSON, default=dict)  # Market penetration, competition
    
    # Benchmarking data
    peer_comparison_metrics = Column(JSON, default=dict)  # Performance vs. similar entities
    network_percentile_ranking = Column(JSON, default=dict)  # Ranking within network
    industry_benchmark_comparison = Column(JSON, default=dict)  # Industry standards comparison
    
    # Calculated at computation time
    computed_at = Column(DateTime, default=utcnow)
    data_completeness_score = Column(Numeric(3, 2), default=1.00)  # 0-1 data quality score
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_franchise_analytics_entity_period', 'entity_type', 'entity_id', 'period_type', 'period_start'),
        Index('idx_franchise_analytics_computed', 'computed_at'),
    )
    
    def __repr__(self):
        return f"<FranchiseAnalytics(id={self.id}, entity={self.entity_type}:{self.entity_id}, period={self.period_type})>"


# Extension to existing BarbershopLocation model (add to location_models.py)
"""
Add these fields to the existing BarbershopLocation model:

# Franchise relationships (add to existing model)
franchise_group_id = Column(Integer, ForeignKey("franchise_groups.id"), nullable=True)
franchise_agreement_id = Column(String(100), nullable=True, index=True)  # Legal agreement reference

# Franchise-specific data
franchisee_type = Column(String(50), nullable=True)  # owner_operator, investor, corporate
franchise_fee_structure = Column(JSON, default=dict)  # Location-specific fee arrangements
territory_rights = Column(JSON, default=dict)  # Protected territory for this location
brand_compliance_data = Column(JSON, default=dict)  # Standards compliance tracking

# Add relationship
franchise_group = relationship("FranchiseGroup", backref="locations")
"""