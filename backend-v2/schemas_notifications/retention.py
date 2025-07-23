"""
Retention Service Schemas
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from enum import Enum

class ChurnRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ChurnPredictionResponse(BaseModel):
    client_id: int
    risk_level: ChurnRiskLevel
    risk_score: float
    factors: List[str]
    recommended_actions: List[str]
    
    class Config:
        from_attributes = True

class ChurnAnalysisResponse(BaseModel):
    total_clients: int
    at_risk_clients: int
    churn_rate: float
    predictions: List[ChurnPredictionResponse]
    
    class Config:
        from_attributes = True

class RetentionMetricsResponse(BaseModel):
    retention_rate: float
    churn_rate: float
    avg_customer_lifetime: float
    revenue_at_risk: float
    
    class Config:
        from_attributes = True

class RetentionCampaignResponse(BaseModel):
    id: int
    name: str
    target_clients: List[int]
    campaign_type: str
    status: str
    
    class Config:
        from_attributes = True

class RetentionDashboardResponse(BaseModel):
    metrics: RetentionMetricsResponse
    churn_analysis: ChurnAnalysisResponse
    active_campaigns: List[RetentionCampaignResponse]
    
    class Config:
        from_attributes = True

class ChurnRiskAssessmentRequest(BaseModel):
    client_ids: Optional[List[int]] = None
    include_predictions: bool = True
    include_recommendations: bool = True
    
    class Config:
        from_attributes = True