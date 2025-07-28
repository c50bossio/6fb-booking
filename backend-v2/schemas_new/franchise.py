"""
Pydantic schemas for franchise network API operations.
Provides request/response models for franchise hierarchy management,
analytics, and compliance tracking.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, List, Any, Union
from datetime import datetime
from enum import Enum

from models.franchise import (
    FranchiseNetworkType, 
    FranchiseStatus, 
    ComplianceJurisdiction
)

# Base schemas for common patterns
class TimestampMixin(BaseModel):
    """Common timestamp fields"""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class StatusMixin(BaseModel):
    """Common status fields"""
    status: FranchiseStatus = FranchiseStatus.ACTIVE
    is_active: bool = True

# Franchise Network Schemas
class FranchiseNetworkBase(BaseModel):
    """Base franchise network fields"""
    name: str = Field(..., min_length=1, max_length=255)
    legal_name: str = Field(..., min_length=1, max_length=255)
    brand: str = Field(..., min_length=1, max_length=100)
    network_type: FranchiseNetworkType
    parent_network_id: Optional[int] = None
    
    # Corporate information
    corporate_headquarters: Dict[str, Any] = Field(default_factory=dict)
    primary_contact_info: Dict[str, Any] = Field(default_factory=dict)
    legal_structure: Optional[str] = None
    
    # Business metrics
    total_locations_target: int = Field(default=0, ge=0)
    territory_coverage: Dict[str, Any] = Field(default_factory=dict)
    
    # Financial tracking
    franchise_fee_structure: Dict[str, Any] = Field(default_factory=dict)
    revenue_sharing_model: Dict[str, Any] = Field(default_factory=dict)
    
    # Compliance and governance
    compliance_requirements: Dict[str, Any] = Field(default_factory=dict)
    governance_policies: Dict[str, Any] = Field(default_factory=dict)
    
    established_date: Optional[datetime] = None

class FranchiseNetworkCreate(FranchiseNetworkBase):
    """Schema for creating a new franchise network"""
    pass

class FranchiseNetworkUpdate(BaseModel):
    """Schema for updating a franchise network"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    legal_name: Optional[str] = Field(None, min_length=1, max_length=255)
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    network_type: Optional[FranchiseNetworkType] = None
    parent_network_id: Optional[int] = None
    
    corporate_headquarters: Optional[Dict[str, Any]] = None
    primary_contact_info: Optional[Dict[str, Any]] = None
    legal_structure: Optional[str] = None
    
    total_locations_target: Optional[int] = Field(None, ge=0)
    territory_coverage: Optional[Dict[str, Any]] = None
    
    franchise_fee_structure: Optional[Dict[str, Any]] = None
    revenue_sharing_model: Optional[Dict[str, Any]] = None
    
    compliance_requirements: Optional[Dict[str, Any]] = None
    governance_policies: Optional[Dict[str, Any]] = None
    
    status: Optional[FranchiseStatus] = None
    is_active: Optional[bool] = None
    established_date: Optional[datetime] = None

class FranchiseNetworkResponse(FranchiseNetworkBase, StatusMixin, TimestampMixin):
    """Schema for franchise network responses"""
    id: int
    current_locations_count: int = 0
    
    # Computed fields
    total_regions: Optional[int] = None
    total_groups: Optional[int] = None
    network_revenue_ytd: Optional[float] = None
    
    model_config = ConfigDict(
        from_attributes = True
)

# Franchise Region Schemas
class FranchiseRegionBase(BaseModel):
    """Base franchise region fields"""
    network_id: int
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=20)
    
    # Geographic information
    geographic_boundaries: Dict[str, Any] = Field(default_factory=dict)
    primary_markets: List[str] = Field(default_factory=list)
    market_demographics: Dict[str, Any] = Field(default_factory=dict)
    
    # Regional management
    regional_manager_id: Optional[int] = None
    development_coordinator_id: Optional[int] = None
    support_team_ids: List[int] = Field(default_factory=list)
    
    # Business metrics
    target_locations: int = Field(default=0, ge=0)
    development_timeline: Dict[str, Any] = Field(default_factory=dict)
    market_penetration: float = Field(default=0.0, ge=0.0, le=100.0)
    
    # Compliance tracking
    jurisdictions: List[ComplianceJurisdiction] = Field(default_factory=list)
    regulatory_requirements: Dict[str, Any] = Field(default_factory=dict)
    licensing_requirements: Dict[str, Any] = Field(default_factory=dict)
    
    # Performance tracking
    performance_metrics: Dict[str, Any] = Field(default_factory=dict)
    benchmarking_data: Dict[str, Any] = Field(default_factory=dict)

class FranchiseRegionCreate(FranchiseRegionBase):
    """Schema for creating a new franchise region"""
    pass

class FranchiseRegionUpdate(BaseModel):
    """Schema for updating a franchise region"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    
    geographic_boundaries: Optional[Dict[str, Any]] = None
    primary_markets: Optional[List[str]] = None
    market_demographics: Optional[Dict[str, Any]] = None
    
    regional_manager_id: Optional[int] = None
    development_coordinator_id: Optional[int] = None
    support_team_ids: Optional[List[int]] = None
    
    target_locations: Optional[int] = Field(None, ge=0)
    development_timeline: Optional[Dict[str, Any]] = None
    market_penetration: Optional[float] = Field(None, ge=0.0, le=100.0)
    
    jurisdictions: Optional[List[ComplianceJurisdiction]] = None
    regulatory_requirements: Optional[Dict[str, Any]] = None
    licensing_requirements: Optional[Dict[str, Any]] = None
    
    performance_metrics: Optional[Dict[str, Any]] = None
    benchmarking_data: Optional[Dict[str, Any]] = None
    
    status: Optional[FranchiseStatus] = None
    is_active: Optional[bool] = None

class FranchiseRegionResponse(FranchiseRegionBase, StatusMixin, TimestampMixin):
    """Schema for franchise region responses"""
    id: int
    
    # Computed fields
    total_groups: Optional[int] = None
    total_locations: Optional[int] = None
    region_revenue_ytd: Optional[float] = None
    compliance_score: Optional[float] = None
    
    model_config = ConfigDict(
        from_attributes = True
)

# Franchise Group Schemas
class FranchiseGroupBase(BaseModel):
    """Base franchise group fields"""
    region_id: int
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=20)
    group_type: str = Field(..., min_length=1, max_length=50)
    
    franchisee_id: Optional[int] = None
    corporate_manager_id: Optional[int] = None
    
    # Territory and development
    territory_definition: Dict[str, Any] = Field(default_factory=dict)
    development_rights: Dict[str, Any] = Field(default_factory=dict)
    exclusivity_agreements: Dict[str, Any] = Field(default_factory=dict)
    
    # Operational shared resources
    shared_resources: Dict[str, Any] = Field(default_factory=dict)
    cross_training_programs: Dict[str, Any] = Field(default_factory=dict)
    group_purchasing_agreements: Dict[str, Any] = Field(default_factory=dict)
    
    # Performance coordination
    standardization_requirements: Dict[str, Any] = Field(default_factory=dict)
    quality_assurance_protocols: Dict[str, Any] = Field(default_factory=dict)
    cross_location_metrics: Dict[str, Any] = Field(default_factory=dict)
    
    # Financial coordination
    revenue_sharing_model: Dict[str, Any] = Field(default_factory=dict)
    cost_sharing_agreements: Dict[str, Any] = Field(default_factory=dict)
    group_financial_targets: Dict[str, Any] = Field(default_factory=dict)
    
    formation_date: Optional[datetime] = None

class FranchiseGroupCreate(FranchiseGroupBase):
    """Schema for creating a new franchise group"""
    pass

class FranchiseGroupUpdate(BaseModel):
    """Schema for updating a franchise group"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    group_type: Optional[str] = Field(None, min_length=1, max_length=50)
    
    franchisee_id: Optional[int] = None
    corporate_manager_id: Optional[int] = None
    
    territory_definition: Optional[Dict[str, Any]] = None
    development_rights: Optional[Dict[str, Any]] = None
    exclusivity_agreements: Optional[Dict[str, Any]] = None
    
    shared_resources: Optional[Dict[str, Any]] = None
    cross_training_programs: Optional[Dict[str, Any]] = None
    group_purchasing_agreements: Optional[Dict[str, Any]] = None
    
    standardization_requirements: Optional[Dict[str, Any]] = None
    quality_assurance_protocols: Optional[Dict[str, Any]] = None
    cross_location_metrics: Optional[Dict[str, Any]] = None
    
    revenue_sharing_model: Optional[Dict[str, Any]] = None
    cost_sharing_agreements: Optional[Dict[str, Any]] = None
    group_financial_targets: Optional[Dict[str, Any]] = None
    
    status: Optional[FranchiseStatus] = None
    is_active: Optional[bool] = None
    formation_date: Optional[datetime] = None

class FranchiseGroupResponse(FranchiseGroupBase, StatusMixin, TimestampMixin):
    """Schema for franchise group responses"""
    id: int
    
    # Computed fields
    total_locations: Optional[int] = None
    group_revenue_ytd: Optional[float] = None
    performance_score: Optional[float] = None
    
    model_config = ConfigDict(
        from_attributes = True
)

# Franchise Analytics Schemas
class FranchiseAnalyticsFilter(BaseModel):
    """Filters for franchise analytics queries"""
    entity_type: Optional[str] = Field(None, pattern="^(network|region|group|location)$")
    entity_ids: Optional[List[int]] = None
    period_type: Optional[str] = Field(None, pattern="^(daily|weekly|monthly|quarterly|yearly)$")
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    metrics: Optional[List[str]] = None
    include_benchmarks: bool = True
    include_forecasts: bool = False

class FranchiseAnalyticsResponse(BaseModel):
    """Response schema for franchise analytics"""
    entity_type: str
    entity_id: int
    period_type: str
    period_start: datetime
    period_end: datetime
    
    # Core metrics
    revenue_metrics: Dict[str, Any]
    operational_metrics: Dict[str, Any]
    client_metrics: Dict[str, Any]
    staff_metrics: Dict[str, Any]
    
    # Franchise-specific metrics
    franchise_fee_collection: Dict[str, Any]
    brand_compliance_scores: Dict[str, Any]
    cross_selling_performance: Dict[str, Any]
    territory_performance: Dict[str, Any]
    
    # Benchmarking data
    peer_comparison_metrics: Optional[Dict[str, Any]] = None
    network_percentile_ranking: Optional[Dict[str, Any]] = None
    industry_benchmark_comparison: Optional[Dict[str, Any]] = None
    
    # Metadata
    computed_at: datetime
    data_completeness_score: float
    
    model_config = ConfigDict(
        from_attributes = True
)

# Compliance Schemas
class FranchiseComplianceBase(BaseModel):
    """Base franchise compliance fields"""
    entity_type: str = Field(..., pattern="^(network|region|group|location)$")
    entity_id: int
    jurisdiction: ComplianceJurisdiction
    requirement_type: str = Field(..., min_length=1, max_length=100)
    requirement_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    
    compliance_status: str = Field(default="pending", pattern="^(compliant|non_compliant|pending|expired)$")
    required_by_date: Optional[datetime] = None
    next_review_date: Optional[datetime] = None
    
    compliance_documents: List[Dict[str, Any]] = Field(default_factory=list)
    audit_history: List[Dict[str, Any]] = Field(default_factory=list)
    remediation_actions: List[Dict[str, Any]] = Field(default_factory=list)
    
    risk_level: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    non_compliance_penalties: Dict[str, Any] = Field(default_factory=dict)

class FranchiseComplianceCreate(FranchiseComplianceBase):
    """Schema for creating compliance tracking"""
    pass

class FranchiseComplianceUpdate(BaseModel):
    """Schema for updating compliance status"""
    compliance_status: Optional[str] = Field(None, pattern="^(compliant|non_compliant|pending|expired)$")
    required_by_date: Optional[datetime] = None
    next_review_date: Optional[datetime] = None
    
    compliance_documents: Optional[List[Dict[str, Any]]] = None
    audit_history: Optional[List[Dict[str, Any]]] = None
    remediation_actions: Optional[List[Dict[str, Any]]] = None
    
    risk_level: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    non_compliance_penalties: Optional[Dict[str, Any]] = None

class FranchiseComplianceResponse(FranchiseComplianceBase, TimestampMixin):
    """Schema for compliance responses"""
    id: int
    last_compliance_check: Optional[datetime] = None
    
    model_config = ConfigDict(
        from_attributes = True
)

# Network Dashboard Schemas
class FranchiseNetworkDashboard(BaseModel):
    """Comprehensive network dashboard data"""
    network_summary: Dict[str, Any]
    performance_overview: Dict[str, Any]
    regional_breakdown: List[Dict[str, Any]]
    compliance_status: Dict[str, Any]
    financial_summary: Dict[str, Any]
    growth_metrics: Dict[str, Any]
    alerts_and_notifications: List[Dict[str, Any]]
    
    # Real-time data
    real_time_metrics: Optional[Dict[str, Any]] = None
    last_updated: datetime

# Cross-Network Benchmarking Schemas
class BenchmarkingRequest(BaseModel):
    """Request schema for cross-network benchmarking"""
    primary_entity_type: str = Field(..., pattern="^(network|region|group|location)$")
    primary_entity_id: int
    comparison_entity_ids: Optional[List[int]] = None
    benchmark_type: str = Field(..., pattern="^(peer|industry|historical|target)$")
    metrics: List[str] = Field(..., min_length=1)
    time_period: str = Field(..., pattern="^(daily|weekly|monthly|quarterly|yearly)$")
    normalize_by_size: bool = True

class BenchmarkingResponse(BaseModel):
    """Response schema for benchmarking analysis"""
    primary_entity: Dict[str, Any]
    benchmark_results: List[Dict[str, Any]]
    percentile_rankings: Dict[str, float]
    performance_gaps: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    generated_at: datetime

# API Response Wrappers
class FranchiseAPIResponse(BaseModel):
    """Generic API response wrapper"""
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    errors: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int
    has_next: bool
    has_prev: bool