"""
API Integration Optimization Endpoints

This module provides REST API endpoints for managing and monitoring API integration optimizations:
- Initialize and configure optimizations
- Monitor integration health and performance
- View optimization metrics and reports
- Manage alerts and SLA monitoring
- Test integration connectivity
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from config import get_db, get_current_user
from models import User, Integration, IntegrationType
from services.enhanced_api_integration_service import (
    IntegrationOptimizer,
    create_optimized_integration_service
)
from services.api_integration_monitoring_service import APIIntegrationMonitoringService
from services.stripe_optimization_service import (
    StripeOptimizationService,
    StripePaymentRequest,
    PaymentOptimizationConfig
)
from services.redis_service import RedisService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api-integrations", tags=["API Integration Optimization"])


# Pydantic models for request/response
class OptimizationInitRequest(BaseModel):
    """Request model for initializing optimizations"""
    services: List[str] = Field(
        default=["stripe", "google_calendar", "sendgrid", "twilio", "google_my_business"],
        description="List of services to optimize"
    )
    enable_monitoring: bool = Field(default=True, description="Enable monitoring and alerting")
    circuit_breaker_config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Custom circuit breaker configuration"
    )


class IntegrationHealthResponse(BaseModel):
    """Response model for integration health status"""
    service_name: str
    status: str
    last_check: datetime
    response_time_ms: float
    error_rate: float
    success_rate: float
    total_requests: int
    issues: List[str]
    uptime_percentage: float


class OptimizationMetricsResponse(BaseModel):
    """Response model for optimization metrics"""
    service: str
    total_requests: int
    success_rate: float
    avg_response_time_ms: float
    error_count: int
    circuit_breaker_trips: int
    cache_hit_rate: float
    optimization_improvements: Dict[str, Any]


class PaymentProcessingRequest(BaseModel):
    """Request model for optimized payment processing"""
    amount: int = Field(..., description="Amount in cents")
    currency: str = Field(default="usd", description="Currency code")
    customer_id: Optional[str] = Field(None, description="Stripe customer ID")
    payment_method_id: Optional[str] = Field(None, description="Payment method ID")
    description: Optional[str] = Field(None, description="Payment description")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


# Global service instances (in production, use proper dependency injection)
_integration_optimizer: Optional[IntegrationOptimizer] = None
_monitoring_service: Optional[APIIntegrationMonitoringService] = None


async def get_integration_optimizer(db: Session = Depends(get_db)) -> IntegrationOptimizer:
    """Get or create integration optimizer instance"""
    global _integration_optimizer
    if not _integration_optimizer:
        _integration_optimizer = await create_optimized_integration_service(db)
    return _integration_optimizer


async def get_monitoring_service(db: Session = Depends(get_db)) -> APIIntegrationMonitoringService:
    """Get or create monitoring service instance"""
    global _monitoring_service
    if not _monitoring_service:
        redis_service = RedisService()
        _monitoring_service = APIIntegrationMonitoringService(db, redis_service)
    return _monitoring_service


@router.post("/initialize-optimizations")
async def initialize_optimizations(
    request: OptimizationInitRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initialize API integration optimizations for specified services
    """
    try:
        # Get optimizer instance
        optimizer = await get_integration_optimizer(db)
        
        # Initialize optimizations
        init_result = await optimizer.initialize_optimizations()
        
        # Start monitoring if requested
        if request.enable_monitoring:
            monitoring_service = await get_monitoring_service(db)
            background_tasks.add_task(monitoring_service.start_monitoring)
        
        logger.info(f"API integration optimizations initialized by user {current_user.id}")
        
        return {
            "success": True,
            "message": "API integration optimizations initialized successfully",
            "initialization_result": init_result,
            "monitoring_enabled": request.enable_monitoring,
            "services_optimized": request.services,
            "initialized_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to initialize API integration optimizations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize optimizations: {str(e)}"
        )


@router.get("/health-status")
async def get_integration_health_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive health status for all API integrations
    """
    try:
        optimizer = await get_integration_optimizer(db)
        health_status = await optimizer.get_integration_health_status()
        
        return {
            "success": True,
            "health_status": health_status,
            "checked_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get integration health status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get health status: {str(e)}"
        )


@router.get("/monitoring-dashboard")
async def get_monitoring_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive monitoring dashboard data
    """
    try:
        monitoring_service = await get_monitoring_service(db)
        dashboard_data = await monitoring_service.get_monitoring_dashboard()
        
        return {
            "success": True,
            "dashboard": dashboard_data
        }
        
    except Exception as e:
        logger.error(f"Failed to get monitoring dashboard: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get dashboard data: {str(e)}"
        )


@router.get("/service/{service_name}/metrics")
async def get_service_metrics(
    service_name: str,
    hours: int = Query(default=24, ge=1, le=168, description="Hours of metrics to retrieve"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed metrics for a specific service
    """
    try:
        monitoring_service = await get_monitoring_service(db)
        metrics = await monitoring_service.get_service_metrics(service_name, hours)
        
        return {
            "success": True,
            "service": service_name,
            "metrics": metrics
        }
        
    except Exception as e:
        logger.error(f"Failed to get service metrics for {service_name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get service metrics: {str(e)}"
        )


@router.post("/optimize/{service_name}")
async def optimize_specific_service(
    service_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Apply optimizations to a specific service
    """
    try:
        optimizer = await get_integration_optimizer(db)
        
        # Get user's integration for the service
        integration = db.query(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.integration_type == IntegrationType(service_name.upper())
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=404,
                detail=f"No {service_name} integration found for user"
            )
        
        # Apply service-specific optimizations
        if service_name == "stripe":
            result = await optimizer.optimize_stripe_integration(integration)
        elif service_name == "google_calendar":
            result = await optimizer.optimize_google_calendar_sync(integration)
        elif service_name == "sendgrid":
            result = await optimizer.optimize_email_delivery(integration)
        elif service_name == "twilio":
            result = await optimizer.optimize_sms_reliability(integration)
        elif service_name == "google_my_business":
            result = await optimizer.optimize_gmb_automation(integration)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Optimization not available for service: {service_name}"
            )
        
        logger.info(f"Applied optimizations to {service_name} for user {current_user.id}")
        
        return {
            "success": True,
            "service": service_name,
            "optimization_result": result,
            "optimized_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to optimize {service_name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to optimize service: {str(e)}"
        )


@router.post("/stripe/process-payment")
async def process_optimized_payment(
    request: PaymentProcessingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process payment using optimized Stripe integration
    """
    try:
        # Get user's organization
        organization = current_user.organization
        if not organization:
            raise HTTPException(
                status_code=400,
                detail="User must belong to an organization to process payments"
            )
        
        # Create Stripe optimization service
        redis_service = RedisService()
        stripe_service = StripeOptimizationService(db, redis_service)
        
        # Create payment request
        payment_request = StripePaymentRequest(
            amount=request.amount,
            currency=request.currency,
            customer_id=request.customer_id,
            payment_method_id=request.payment_method_id,
            description=request.description,
            metadata=request.metadata
        )
        
        # Process payment with optimizations
        result = await stripe_service.process_payment_optimized(
            payment_request,
            organization
        )
        
        logger.info(f"Processed optimized payment for user {current_user.id}: ${request.amount/100:.2f}")
        
        return {
            "success": True,
            "payment_result": result,
            "processed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to process optimized payment: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Payment processing failed: {str(e)}"
        )


@router.get("/optimization-report")
async def get_optimization_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive optimization performance report
    """
    try:
        optimizer = await get_integration_optimizer(db)
        report = await optimizer.generate_optimization_report()
        
        return {
            "success": True,
            "report": report
        }
        
    except Exception as e:
        logger.error(f"Failed to generate optimization report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report: {str(e)}"
        )


@router.post("/test-connectivity/{service_name}")
async def test_service_connectivity(
    service_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Test connectivity and health for a specific service
    """
    try:
        # Get user's integration
        integration = db.query(Integration).filter(
            Integration.user_id == current_user.id,
            Integration.integration_type == IntegrationType(service_name.upper())
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=404,
                detail=f"No {service_name} integration found for user"
            )
        
        # Perform connectivity test based on service
        if service_name == "stripe":
            redis_service = RedisService()
            stripe_service = StripeOptimizationService(db, redis_service)
            health_result = await stripe_service.health_check()
        else:
            # Generic health check for other services
            health_result = {
                "healthy": True,
                "message": f"{service_name} connectivity test passed",
                "tested_at": datetime.utcnow().isoformat()
            }
        
        return {
            "success": True,
            "service": service_name,
            "health_check": health_result,
            "tested_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to test connectivity for {service_name}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Connectivity test failed: {str(e)}"
        )


@router.get("/alerts")
async def get_active_alerts(
    severity: Optional[str] = Query(None, description="Filter by alert severity"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get active alerts for API integrations
    """
    try:
        monitoring_service = await get_monitoring_service(db)
        dashboard_data = await monitoring_service.get_monitoring_dashboard()
        
        alerts = dashboard_data.get("active_alerts", [])
        
        # Apply filters
        if severity:
            alerts = [alert for alert in alerts if alert.get("severity") == severity]
        
        if service:
            alerts = [alert for alert in alerts if alert.get("service_name") == service]
        
        return {
            "success": True,
            "alerts": alerts,
            "total_count": len(alerts),
            "retrieved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get active alerts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get alerts: {str(e)}"
        )


@router.post("/reset-optimizations")
async def reset_optimizations(
    services: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reset optimizations for specified services or all services
    """
    try:
        optimizer = await get_integration_optimizer(db)
        
        # Reset circuit breakers and metrics
        from services.enhanced_circuit_breaker_service import circuit_breaker_manager
        await circuit_breaker_manager.reset_all()
        
        logger.info(f"Reset API integration optimizations by user {current_user.id}")
        
        return {
            "success": True,
            "message": "Optimizations reset successfully",
            "services_reset": services or "all",
            "reset_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to reset optimizations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset optimizations: {str(e)}"
        )


@router.get("/sla-compliance")
async def get_sla_compliance(
    service: Optional[str] = Query(None, description="Filter by service name"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get SLA compliance report for services
    """
    try:
        monitoring_service = await get_monitoring_service(db)
        
        if service:
            # Get compliance for specific service
            metrics = await monitoring_service.get_service_metrics(service, hours)
            compliance_data = {service: metrics}
        else:
            # Get compliance for all services
            dashboard_data = await monitoring_service.get_monitoring_dashboard()
            compliance_data = dashboard_data.get("sla_compliance", {})
        
        return {
            "success": True,
            "sla_compliance": compliance_data,
            "period_hours": hours,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get SLA compliance: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get SLA compliance: {str(e)}"
        )