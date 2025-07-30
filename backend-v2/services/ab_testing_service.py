"""
A/B Testing Service for BookedBarber
Advanced conversion optimization with Six Figure Barber methodology alignment
"""

import asyncio
import hashlib
import json
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, Any
from enum import Enum
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from fastapi import HTTPException
from loguru import logger

from models import User, ABTest, ABTestVariant, ABTestEvent, ABConversionEvent
from services.redis_service import redis_client
from services.analytics_service import analytics_service
from utils.rate_limiter import rate_limiter


class ABTestStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class VariantType(Enum):
    CONTROL = "control"
    TREATMENT = "treatment"


class EventType(Enum):
    VIEW = "view"
    CLICK = "click"
    CONVERSION = "conversion"
    REVENUE = "revenue"


@dataclass
class ABTestConfig:
    """Configuration for A/B test setup"""
    name: str
    description: str
    target_metric: str  # 'conversion_rate', 'revenue', 'click_through_rate'
    traffic_split: float = 0.5  # 50/50 split by default
    min_sample_size: int = 100
    max_duration_days: int = 30
    confidence_level: float = 0.95
    minimum_effect_size: float = 0.05  # 5% minimum improvement
    six_figure_alignment: str = ""  # How test aligns with Six Figure Barber methodology


@dataclass
class VariantConfig:
    """Configuration for test variant"""
    name: str
    description: str
    type: VariantType
    config: Dict[str, Any]  # Variant-specific configuration
    weight: float = 0.5  # Traffic allocation weight


@dataclass
class ABTestResult:
    """Results of A/B test analysis"""
    test_id: str
    control_metrics: Dict[str, float]
    treatment_metrics: Dict[str, float]
    statistical_significance: float
    confidence_interval: Dict[str, float]
    recommendation: str
    revenue_impact: Optional[float]
    is_statistically_significant: bool
    sample_sizes: Dict[str, int]


class ABTestingService:
    """
    Advanced A/B Testing Service for BookedBarber
    
    Features:
    - Statistical significance testing
    - Revenue impact analysis
    - Six Figure Barber methodology alignment
    - Real-time conversion tracking
    - Multi-variant testing support
    - Automatic test stopping rules
    """
    
    def __init__(self):
        self.cache_ttl = 3600  # 1 hour cache
        self.active_tests_cache = {}
        
    async def create_test(
        self, 
        db: Session,
        user_id: int,
        test_config: ABTestConfig,
        control_variant: VariantConfig,
        treatment_variant: VariantConfig
    ) -> str:
        """Create a new A/B test"""
        
        try:
            # Validate test configuration
            await self._validate_test_config(test_config, control_variant, treatment_variant)
            
            # Create test record
            test_id = str(uuid.uuid4())
            ab_test = ABTest(
                id=test_id,
                user_id=user_id,
                name=test_config.name,
                description=test_config.description,
                target_metric=test_config.target_metric,
                traffic_split=test_config.traffic_split,
                min_sample_size=test_config.min_sample_size,
                max_duration_days=test_config.max_duration_days,
                confidence_level=test_config.confidence_level,
                minimum_effect_size=test_config.minimum_effect_size,
                six_figure_alignment=test_config.six_figure_alignment,
                status=ABTestStatus.DRAFT.value,
                created_at=datetime.utcnow()
            )
            
            db.add(ab_test)
            db.flush()
            
            # Create variants
            control_id = await self._create_variant(
                db, test_id, control_variant, is_control=True
            )
            treatment_id = await self._create_variant(
                db, test_id, treatment_variant, is_control=False
            )
            
            db.commit()
            
            # Cache test configuration
            await self._cache_test_config(test_id, test_config, control_variant, treatment_variant)
            
            logger.info(f"Created A/B test {test_id}: {test_config.name}")
            
            return test_id
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create A/B test: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create test: {str(e)}")
    
    async def start_test(self, db: Session, test_id: str, user_id: int) -> bool:
        """Start an A/B test"""
        
        try:
            # Get test
            test = db.query(ABTest).filter(
                and_(ABTest.id == test_id, ABTest.user_id == user_id)
            ).first()
            
            if not test:
                raise HTTPException(status_code=404, detail="Test not found")
            
            if test.status != ABTestStatus.DRAFT.value:
                raise HTTPException(status_code=400, detail="Test is not in draft status")
            
            # Validate test has variants
            variants = db.query(ABTestVariant).filter(
                ABTestVariant.test_id == test_id
            ).all()
            
            if len(variants) < 2:
                raise HTTPException(status_code=400, detail="Test must have at least 2 variants")
            
            # Start test
            test.status = ABTestStatus.ACTIVE.value
            test.started_at = datetime.utcnow()
            test.ends_at = datetime.utcnow() + timedelta(days=test.max_duration_days)
            
            db.commit()
            
            # Update cache
            await self._refresh_active_tests_cache()
            
            logger.info(f"Started A/B test {test_id}")
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to start test {test_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to start test: {str(e)}")
    
    async def assign_variant(
        self, 
        test_id: str, 
        user_identifier: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Assign user to test variant using consistent hashing"""
        
        try:
            # Get test from cache
            test_config = await self._get_cached_test_config(test_id)
            if not test_config:
                return "control"  # Default to control if test not found
            
            # Create stable hash for user assignment
            hash_input = f"{test_id}:{user_identifier}"
            hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
            
            # Determine variant based on traffic split
            normalized_hash = (hash_value % 10000) / 10000  # 0-1 range
            
            if normalized_hash < test_config['traffic_split']:
                variant = "treatment"
            else:
                variant = "control"
            
            # Track assignment
            await self._track_assignment(test_id, user_identifier, variant, context)
            
            return variant
            
        except Exception as e:
            logger.error(f"Failed to assign variant for test {test_id}: {str(e)}")
            return "control"  # Fail safely to control
    
    async def track_event(
        self,
        db: Session,
        test_id: str,
        user_identifier: str,
        event_type: EventType,
        variant: str,
        value: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track A/B test event"""
        
        try:
            # Rate limit event tracking
            rate_key = f"ab_event:{user_identifier}:{test_id}"
            if not await rate_limiter.allow_request(rate_key, max_requests=10, window_seconds=60):
                logger.warning(f"Rate limited A/B test event tracking for {user_identifier}")
                return False
            
            # Create event record
            event = ABTestEvent(
                id=str(uuid.uuid4()),
                test_id=test_id,
                user_identifier=user_identifier,
                variant=variant,
                event_type=event_type.value,
                value=value or 0.0,
                metadata=json.dumps(metadata or {}),
                timestamp=datetime.utcnow()
            )
            
            db.add(event)
            db.commit()
            
            # Update real-time metrics
            await self._update_realtime_metrics(test_id, variant, event_type, value)
            
            # Check for auto-stopping conditions
            await self._check_auto_stop_conditions(db, test_id)
            
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to track A/B test event: {str(e)}")
            return False
    
    async def get_test_results(self, db: Session, test_id: str, user_id: int) -> ABTestResult:
        """Get comprehensive A/B test results with statistical analysis"""
        
        try:
            # Get test
            test = db.query(ABTest).filter(
                and_(ABTest.id == test_id, ABTest.user_id == user_id)
            ).first()
            
            if not test:
                raise HTTPException(status_code=404, detail="Test not found")
            
            # Get variants
            variants = db.query(ABTestVariant).filter(
                ABTestVariant.test_id == test_id
            ).all()
            
            # Get events
            events = db.query(ABTestEvent).filter(
                ABTestEvent.test_id == test_id
            ).all()
            
            # Calculate metrics for each variant
            control_metrics = await self._calculate_variant_metrics(events, "control")
            treatment_metrics = await self._calculate_variant_metrics(events, "treatment")
            
            # Perform statistical analysis
            significance = await self._calculate_statistical_significance(
                control_metrics, treatment_metrics, test.confidence_level
            )
            
            # Calculate confidence intervals
            confidence_interval = await self._calculate_confidence_intervals(
                control_metrics, treatment_metrics, test.confidence_level
            )
            
            # Generate recommendation
            recommendation = await self._generate_recommendation(
                test, control_metrics, treatment_metrics, significance
            )
            
            # Calculate revenue impact
            revenue_impact = await self._calculate_revenue_impact(
                control_metrics, treatment_metrics
            )
            
            return ABTestResult(
                test_id=test_id,
                control_metrics=control_metrics,
                treatment_metrics=treatment_metrics,
                statistical_significance=significance,
                confidence_interval=confidence_interval,
                recommendation=recommendation,
                revenue_impact=revenue_impact,
                is_statistically_significant=significance >= test.confidence_level,
                sample_sizes={
                    "control": control_metrics.get("sample_size", 0),
                    "treatment": treatment_metrics.get("sample_size", 0)
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to get test results for {test_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get results: {str(e)}")
    
    async def list_tests(
        self, 
        db: Session, 
        user_id: int,
        status: Optional[ABTestStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List A/B tests for user"""
        
        try:
            query = db.query(ABTest).filter(ABTest.user_id == user_id)
            
            if status:
                query = query.filter(ABTest.status == status.value)
            
            tests = query.order_by(ABTest.created_at.desc()).limit(limit).offset(offset).all()
            
            results = []
            for test in tests:
                # Get variant count
                variant_count = db.query(ABTestVariant).filter(
                    ABTestVariant.test_id == test.id
                ).count()
                
                # Get event count
                event_count = db.query(ABTestEvent).filter(
                    ABTestEvent.test_id == test.id
                ).count()
                
                results.append({
                    "id": test.id,
                    "name": test.name,
                    "description": test.description,
                    "status": test.status,
                    "target_metric": test.target_metric,
                    "variant_count": variant_count,
                    "event_count": event_count,
                    "created_at": test.created_at.isoformat(),
                    "started_at": test.started_at.isoformat() if test.started_at else None,
                    "ends_at": test.ends_at.isoformat() if test.ends_at else None
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to list tests for user {user_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to list tests: {str(e)}")
    
    # Private helper methods
    
    async def _validate_test_config(
        self, 
        test_config: ABTestConfig, 
        control: VariantConfig, 
        treatment: VariantConfig
    ):
        """Validate A/B test configuration"""
        
        if test_config.traffic_split < 0.1 or test_config.traffic_split > 0.9:
            raise ValueError("Traffic split must be between 0.1 and 0.9")
        
        if test_config.min_sample_size < 30:
            raise ValueError("Minimum sample size must be at least 30")
        
        if test_config.confidence_level < 0.8 or test_config.confidence_level > 0.99:
            raise ValueError("Confidence level must be between 0.8 and 0.99")
        
        if control.type != VariantType.CONTROL:
            raise ValueError("Control variant must have type 'control'")
        
        if treatment.type != VariantType.TREATMENT:
            raise ValueError("Treatment variant must have type 'treatment'")
    
    async def _create_variant(
        self, 
        db: Session, 
        test_id: str, 
        variant_config: VariantConfig, 
        is_control: bool
    ) -> str:
        """Create test variant"""
        
        variant_id = str(uuid.uuid4())
        variant = ABTestVariant(
            id=variant_id,
            test_id=test_id,
            name=variant_config.name,
            description=variant_config.description,
            type=variant_config.type.value,
            config=json.dumps(variant_config.config),
            weight=variant_config.weight,
            is_control=is_control,
            created_at=datetime.utcnow()
        )
        
        db.add(variant)
        return variant_id
    
    async def _cache_test_config(
        self, 
        test_id: str, 
        test_config: ABTestConfig, 
        control: VariantConfig, 
        treatment: VariantConfig
    ):
        """Cache test configuration for fast access"""
        
        cache_data = {
            "test_config": asdict(test_config),
            "control": asdict(control),
            "treatment": asdict(treatment),
            "cached_at": datetime.utcnow().isoformat()
        }
        
        await redis_client.setex(
            f"ab_test:{test_id}",
            self.cache_ttl,
            json.dumps(cache_data)
        )
    
    async def _get_cached_test_config(self, test_id: str) -> Optional[Dict[str, Any]]:
        """Get cached test configuration"""
        
        try:
            cached = await redis_client.get(f"ab_test:{test_id}")
            if cached:
                return json.loads(cached)
            return None
        except Exception as e:
            logger.warning(f"Failed to get cached test config: {str(e)}")
            return None
    
    async def _track_assignment(
        self, 
        test_id: str, 
        user_identifier: str, 
        variant: str, 
        context: Optional[Dict[str, Any]]
    ):
        """Track variant assignment"""
        
        assignment_key = f"ab_assignment:{test_id}:{user_identifier}"
        assignment_data = {
            "variant": variant,
            "assigned_at": datetime.utcnow().isoformat(),
            "context": context or {}
        }
        
        await redis_client.setex(
            assignment_key,
            86400 * 7,  # 7 days
            json.dumps(assignment_data)
        )
    
    async def _calculate_variant_metrics(
        self, 
        events: List[ABTestEvent], 
        variant: str
    ) -> Dict[str, float]:
        """Calculate metrics for a variant"""
        
        variant_events = [e for e in events if e.variant == variant]
        
        if not variant_events:
            return {
                "sample_size": 0,
                "conversion_rate": 0.0,
                "average_value": 0.0,
                "total_value": 0.0,
                "unique_users": 0
            }
        
        unique_users = len(set(e.user_identifier for e in variant_events))
        conversions = [e for e in variant_events if e.event_type == EventType.CONVERSION.value]
        
        conversion_rate = len(conversions) / unique_users if unique_users > 0 else 0.0
        
        values = [e.value for e in variant_events if e.value > 0]
        average_value = sum(values) / len(values) if values else 0.0
        total_value = sum(values)
        
        return {
            "sample_size": unique_users,
            "conversion_rate": conversion_rate,
            "average_value": average_value,
            "total_value": total_value,
            "unique_users": unique_users,
            "total_events": len(variant_events)
        }
    
    async def _calculate_statistical_significance(
        self, 
        control_metrics: Dict[str, float], 
        treatment_metrics: Dict[str, float],
        confidence_level: float
    ) -> float:
        """Calculate statistical significance using z-test"""
        
        # Simplified z-test for conversion rates
        # In production, consider using more sophisticated statistical tests
        
        n1 = control_metrics["sample_size"]
        n2 = treatment_metrics["sample_size"]
        p1 = control_metrics["conversion_rate"]
        p2 = treatment_metrics["conversion_rate"]
        
        if n1 == 0 or n2 == 0:
            return 0.0
        
        # Pooled proportion
        p_pool = ((p1 * n1) + (p2 * n2)) / (n1 + n2)
        
        if p_pool == 0 or p_pool == 1:
            return 0.0
        
        # Standard error
        se = (p_pool * (1 - p_pool) * ((1/n1) + (1/n2))) ** 0.5
        
        if se == 0:
            return 0.0
        
        # Z-score
        z_score = abs(p2 - p1) / se
        
        # Convert to confidence level (simplified)
        # This is a rough approximation - use proper statistical libraries in production
        if z_score > 2.58:  # 99% confidence
            return 0.99
        elif z_score > 1.96:  # 95% confidence
            return 0.95
        elif z_score > 1.64:  # 90% confidence
            return 0.90
        else:
            return z_score / 2.58  # Rough approximation
    
    async def _calculate_confidence_intervals(
        self, 
        control_metrics: Dict[str, float], 
        treatment_metrics: Dict[str, float],
        confidence_level: float
    ) -> Dict[str, float]:
        """Calculate confidence intervals for the difference"""
        
        # Simplified confidence interval calculation
        # In production, use proper statistical libraries
        
        p1 = control_metrics["conversion_rate"]
        p2 = treatment_metrics["conversion_rate"]
        n1 = control_metrics["sample_size"]
        n2 = treatment_metrics["sample_size"]
        
        if n1 == 0 or n2 == 0:
            return {"lower": 0.0, "upper": 0.0, "difference": 0.0}
        
        difference = p2 - p1
        
        # Standard error for difference
        se_diff = ((p1 * (1 - p1) / n1) + (p2 * (1 - p2) / n2)) ** 0.5
        
        # Z-score for confidence level
        z_scores = {0.90: 1.64, 0.95: 1.96, 0.99: 2.58}
        z = z_scores.get(confidence_level, 1.96)
        
        margin_error = z * se_diff
        
        return {
            "lower": difference - margin_error,
            "upper": difference + margin_error,
            "difference": difference
        }
    
    async def _generate_recommendation(
        self, 
        test: ABTest, 
        control_metrics: Dict[str, float], 
        treatment_metrics: Dict[str, float],
        significance: float
    ) -> str:
        """Generate actionable recommendation based on results"""
        
        if control_metrics["sample_size"] < test.min_sample_size:
            return "Continue test - insufficient sample size for reliable results"
        
        if significance < test.confidence_level:
            return "Continue test - results not statistically significant"
        
        improvement = (treatment_metrics["conversion_rate"] - control_metrics["conversion_rate"]) / control_metrics["conversion_rate"] if control_metrics["conversion_rate"] > 0 else 0
        
        if improvement >= test.minimum_effect_size:
            return f"Launch treatment variant - {improvement:.1%} improvement with {significance:.0%} confidence"
        elif improvement <= -test.minimum_effect_size:
            return f"Keep control variant - treatment shows {abs(improvement):.1%} decrease"
        else:
            return "No significant difference - consider new test approach"
    
    async def _calculate_revenue_impact(
        self, 
        control_metrics: Dict[str, float], 
        treatment_metrics: Dict[str, float]
    ) -> Optional[float]:
        """Calculate estimated revenue impact"""
        
        if control_metrics["sample_size"] == 0:
            return None
        
        # Revenue per user difference
        control_rpm = control_metrics["total_value"] / control_metrics["sample_size"] if control_metrics["sample_size"] > 0 else 0
        treatment_rpm = treatment_metrics["total_value"] / treatment_metrics["sample_size"] if treatment_metrics["sample_size"] > 0 else 0
        
        return treatment_rpm - control_rpm
    
    async def _update_realtime_metrics(
        self, 
        test_id: str, 
        variant: str, 
        event_type: EventType, 
        value: Optional[float]
    ):
        """Update real-time metrics in Redis"""
        
        metrics_key = f"ab_metrics:{test_id}:{variant}"
        
        # Increment counters
        await redis_client.hincrby(metrics_key, f"{event_type.value}_count", 1)
        
        if value and value > 0:
            await redis_client.hincrbyfloat(metrics_key, f"{event_type.value}_value", value)
        
        # Set expiration
        await redis_client.expire(metrics_key, 86400 * 7)  # 7 days
    
    async def _check_auto_stop_conditions(self, db: Session, test_id: str):
        """Check if test should be automatically stopped"""
        
        # Get test
        test = db.query(ABTest).filter(ABTest.id == test_id).first()
        if not test or test.status != ABTestStatus.ACTIVE.value:
            return
        
        # Check if test has exceeded max duration
        if test.ends_at and datetime.utcnow() > test.ends_at:
            test.status = ABTestStatus.COMPLETED.value
            db.commit()
            logger.info(f"Auto-stopped A/B test {test_id} - exceeded max duration")
            return
        
        # Check for statistical significance with sufficient sample size
        # This would require more sophisticated analysis in production
    
    async def _refresh_active_tests_cache(self):
        """Refresh cache of active tests"""
        
        # This would query active tests and cache them for fast access
        # Implementation depends on specific caching strategy
        pass


# Global service instance
ab_testing_service = ABTestingService()