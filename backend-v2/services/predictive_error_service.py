"""
Predictive Error Detection Service
AI-powered error prediction and proactive resolution for BookedBarber V2
"""

import asyncio
import logging
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import json
import psutil
import numpy as np

from services.error_monitoring_service import (
    ErrorEvent, ErrorSeverity, ErrorCategory, BusinessImpact,
    error_monitoring_service
)

logger = logging.getLogger(__name__)

@dataclass
class PredictionModel:
    """Error prediction model configuration"""
    name: str
    features: List[str]
    weights: Dict[str, float]
    threshold: float
    accuracy: float
    last_trained: datetime

@dataclass
class ErrorPrediction:
    """Error prediction result"""
    probability: float
    confidence: float
    predicted_category: ErrorCategory
    predicted_severity: ErrorSeverity
    time_horizon_minutes: int
    contributing_factors: List[str]
    recommended_actions: List[str]
    business_impact_risk: float

@dataclass
class SystemHealthMetrics:
    """Current system health indicators"""
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    active_connections: int
    response_time_avg: float
    error_rate: float
    external_service_health: Dict[str, float]
    database_performance: float

class PredictiveErrorService:
    """AI-powered predictive error detection and prevention"""
    
    def __init__(self):
        self.prediction_models = self._initialize_models()
        self.metrics_history = deque(maxlen=1000)  # Store last 1000 metric points
        self.error_patterns = defaultdict(list)
        self.feature_extractors = self._setup_feature_extractors()
        
    def _initialize_models(self) -> Dict[str, PredictionModel]:
        """Initialize prediction models for different error categories"""
        return {
            "payment_errors": PredictionModel(
                name="Payment Error Predictor",
                features=["stripe_response_time", "payment_error_rate", "cpu_usage", "memory_usage"],
                weights={"stripe_response_time": 0.4, "payment_error_rate": 0.3, "cpu_usage": 0.2, "memory_usage": 0.1},
                threshold=0.7,
                accuracy=0.85,
                last_trained=datetime.utcnow()
            ),
            "database_errors": PredictionModel(
                name="Database Error Predictor", 
                features=["db_response_time", "connection_pool_usage", "cpu_usage", "memory_usage", "disk_io"],
                weights={"db_response_time": 0.35, "connection_pool_usage": 0.25, "cpu_usage": 0.2, "memory_usage": 0.15, "disk_io": 0.05},
                threshold=0.75,
                accuracy=0.82,
                last_trained=datetime.utcnow()
            ),
            "booking_errors": PredictionModel(
                name="Booking Error Predictor",
                features=["booking_load", "external_api_health", "user_session_duration", "error_rate"],
                weights={"booking_load": 0.3, "external_api_health": 0.3, "user_session_duration": 0.2, "error_rate": 0.2},
                threshold=0.65,
                accuracy=0.78,
                last_trained=datetime.utcnow()
            ),
            "authentication_errors": PredictionModel(
                name="Authentication Error Predictor",
                features=["auth_response_time", "failed_login_rate", "jwt_validation_time", "session_count"],
                weights={"auth_response_time": 0.4, "failed_login_rate": 0.3, "jwt_validation_time": 0.2, "session_count": 0.1},
                threshold=0.6,
                accuracy=0.75,
                last_trained=datetime.utcnow()
            )
        }
    
    def _setup_feature_extractors(self) -> Dict[str, callable]:
        """Setup feature extraction functions"""
        return {
            "cpu_usage": self._get_cpu_usage,
            "memory_usage": self._get_memory_usage,
            "disk_usage": self._get_disk_usage,
            "active_connections": self._get_active_connections,
            "response_time_avg": self._get_avg_response_time,
            "error_rate": self._get_current_error_rate,
            "db_response_time": self._get_db_response_time,
            "connection_pool_usage": self._get_connection_pool_usage,
            "stripe_response_time": self._get_stripe_response_time,
            "payment_error_rate": self._get_payment_error_rate,
            "booking_load": self._get_booking_load,
            "external_api_health": self._get_external_api_health,
            "user_session_duration": self._get_avg_session_duration,
            "auth_response_time": self._get_auth_response_time,
            "failed_login_rate": self._get_failed_login_rate,
            "jwt_validation_time": self._get_jwt_validation_time,
            "session_count": self._get_active_session_count,
            "disk_io": self._get_disk_io_rate
        }
    
    async def predict_errors(self, time_horizon_minutes: int = 15) -> List[ErrorPrediction]:
        """Predict potential errors within the specified time horizon"""
        
        # Collect current system metrics
        current_metrics = await self._collect_current_metrics()
        
        # Store metrics for historical analysis
        self.metrics_history.append({
            "timestamp": datetime.utcnow(),
            "metrics": current_metrics
        })
        
        predictions = []
        
        # Run prediction for each model
        for category, model in self.prediction_models.items():
            prediction = await self._run_prediction_model(
                model, current_metrics, time_horizon_minutes
            )
            if prediction.probability > model.threshold:
                predictions.append(prediction)
        
        # Sort by probability (highest risk first)
        predictions.sort(key=lambda x: x.probability, reverse=True)
        
        # Log predictions for monitoring
        if predictions:
            logger.warning(f"Error predictions generated: {len(predictions)} potential issues detected")
            for pred in predictions[:3]:  # Log top 3
                logger.warning(f"  - {pred.predicted_category.value}: {pred.probability:.2f} probability")
        
        return predictions
    
    async def _run_prediction_model(
        self, 
        model: PredictionModel, 
        metrics: Dict[str, float],
        time_horizon_minutes: int
    ) -> ErrorPrediction:
        """Run a specific prediction model"""
        
        # Extract features for this model
        feature_values = {}
        for feature in model.features:
            extractor = self.feature_extractors.get(feature)
            if extractor:
                try:
                    feature_values[feature] = await extractor() if asyncio.iscoroutinefunction(extractor) else extractor()
                except Exception as e:
                    logger.warning(f"Failed to extract feature {feature}: {e}")
                    feature_values[feature] = 0.0
            else:
                feature_values[feature] = metrics.get(feature, 0.0)
        
        # Calculate weighted probability
        probability = 0.0
        contributing_factors = []
        
        for feature, weight in model.weights.items():
            value = feature_values.get(feature, 0.0)
            normalized_value = self._normalize_feature_value(feature, value)
            contribution = normalized_value * weight
            probability += contribution
            
            # Track significant contributing factors
            if normalized_value > 0.7:  # Feature is contributing significantly
                contributing_factors.append(f"{feature}: {value:.2f}")
        
        # Add historical pattern influence
        historical_influence = self._get_historical_pattern_influence(model.name)
        probability = (probability * 0.8) + (historical_influence * 0.2)
        
        # Determine predicted category and severity
        predicted_category = self._map_model_to_category(model.name)
        predicted_severity = self._predict_severity(probability, predicted_category)
        
        # Calculate business impact risk
        business_impact_risk = self._calculate_business_impact_risk(
            predicted_category, predicted_severity, probability
        )
        
        # Generate recommended actions
        recommended_actions = self._generate_recommended_actions(
            predicted_category, contributing_factors, probability
        )
        
        return ErrorPrediction(
            probability=min(probability, 1.0),
            confidence=self._calculate_confidence(model, feature_values),
            predicted_category=predicted_category,
            predicted_severity=predicted_severity,
            time_horizon_minutes=time_horizon_minutes,
            contributing_factors=contributing_factors,
            recommended_actions=recommended_actions,
            business_impact_risk=business_impact_risk
        )
    
    async def _collect_current_metrics(self) -> Dict[str, float]:
        """Collect current system metrics"""
        metrics = {}
        
        # System metrics
        metrics["cpu_usage"] = psutil.cpu_percent(interval=1)
        metrics["memory_usage"] = psutil.virtual_memory().percent
        metrics["disk_usage"] = psutil.disk_usage('/').percent
        
        # Application metrics
        metrics["active_connections"] = await self._get_active_connections()
        metrics["response_time_avg"] = await self._get_avg_response_time()
        metrics["error_rate"] = await self._get_current_error_rate()
        
        # Database metrics
        metrics["db_response_time"] = await self._get_db_response_time()
        metrics["connection_pool_usage"] = await self._get_connection_pool_usage()
        
        # External service metrics
        metrics["stripe_response_time"] = await self._get_stripe_response_time()
        metrics["external_api_health"] = await self._get_external_api_health()
        
        # Business metrics
        metrics["booking_load"] = await self._get_booking_load()
        metrics["user_session_duration"] = await self._get_avg_session_duration()
        metrics["payment_error_rate"] = await self._get_payment_error_rate()
        
        return metrics
    
    def _normalize_feature_value(self, feature: str, value: float) -> float:
        """Normalize feature value to 0-1 scale"""
        
        # Feature-specific normalization thresholds
        thresholds = {
            "cpu_usage": 100.0,
            "memory_usage": 100.0,
            "disk_usage": 100.0,
            "response_time_avg": 5000.0,  # 5 seconds
            "error_rate": 10.0,  # 10%
            "db_response_time": 1000.0,  # 1 second
            "connection_pool_usage": 100.0,
            "stripe_response_time": 3000.0,  # 3 seconds
            "booking_load": 100.0,  # requests per minute
            "user_session_duration": 3600.0,  # 1 hour
            "payment_error_rate": 5.0,  # 5%
            "external_api_health": 100.0,
            "active_connections": 1000.0,
            "auth_response_time": 2000.0,  # 2 seconds
            "failed_login_rate": 20.0,  # 20%
            "jwt_validation_time": 500.0,  # 500ms
            "session_count": 10000.0,
            "disk_io": 100.0  # MB/s
        }
        
        threshold = thresholds.get(feature, 100.0)
        return min(value / threshold, 1.0)
    
    def _get_historical_pattern_influence(self, model_name: str) -> float:
        """Calculate influence of historical error patterns"""
        
        if len(self.metrics_history) < 10:
            return 0.0
        
        # Analyze recent trends in metrics
        recent_metrics = list(self.metrics_history)[-10:]
        
        # Look for upward trends in error-related metrics
        trend_indicators = []
        
        for i in range(1, len(recent_metrics)):
            prev_metrics = recent_metrics[i-1]["metrics"]
            curr_metrics = recent_metrics[i]["metrics"]
            
            # Calculate trend for key indicators
            if "error_rate" in prev_metrics and "error_rate" in curr_metrics:
                error_rate_trend = (curr_metrics["error_rate"] - prev_metrics["error_rate"]) / max(prev_metrics["error_rate"], 0.01)
                trend_indicators.append(error_rate_trend)
        
        if trend_indicators:
            avg_trend = statistics.mean(trend_indicators)
            return max(0.0, min(avg_trend * 2, 1.0))  # Scale and cap at 1.0
        
        return 0.0
    
    def _map_model_to_category(self, model_name: str) -> ErrorCategory:
        """Map prediction model to error category"""
        mapping = {
            "Payment Error Predictor": ErrorCategory.PAYMENT,
            "Database Error Predictor": ErrorCategory.DATABASE,
            "Booking Error Predictor": ErrorCategory.BOOKING,
            "Authentication Error Predictor": ErrorCategory.AUTHENTICATION
        }
        return mapping.get(model_name, ErrorCategory.BUSINESS_LOGIC)
    
    def _predict_severity(self, probability: float, category: ErrorCategory) -> ErrorSeverity:
        """Predict error severity based on probability and category"""
        
        # Category-specific severity mapping
        if category in [ErrorCategory.PAYMENT, ErrorCategory.BOOKING]:
            # Business-critical categories
            if probability > 0.9:
                return ErrorSeverity.CRITICAL
            elif probability > 0.7:
                return ErrorSeverity.HIGH
            elif probability > 0.5:
                return ErrorSeverity.MEDIUM
            else:
                return ErrorSeverity.LOW
        else:
            # Other categories
            if probability > 0.95:
                return ErrorSeverity.CRITICAL
            elif probability > 0.8:
                return ErrorSeverity.HIGH
            elif probability > 0.6:
                return ErrorSeverity.MEDIUM
            else:
                return ErrorSeverity.LOW
    
    def _calculate_business_impact_risk(
        self, 
        category: ErrorCategory, 
        severity: ErrorSeverity,
        probability: float
    ) -> float:
        """Calculate business impact risk score"""
        
        # Base impact scores by category
        category_impact = {
            ErrorCategory.PAYMENT: 1.0,
            ErrorCategory.BOOKING: 0.9,
            ErrorCategory.AUTHENTICATION: 0.7,
            ErrorCategory.DATABASE: 0.8,
            ErrorCategory.EXTERNAL_API: 0.6,
            ErrorCategory.PERFORMANCE: 0.5,
            ErrorCategory.VALIDATION: 0.3,
            ErrorCategory.SECURITY: 0.9,
            ErrorCategory.INFRASTRUCTURE: 0.7,
            ErrorCategory.USER_EXPERIENCE: 0.6,
            ErrorCategory.BUSINESS_LOGIC: 0.5,
            ErrorCategory.AUTHORIZATION: 0.6
        }
        
        # Severity multipliers
        severity_multiplier = {
            ErrorSeverity.CRITICAL: 1.0,
            ErrorSeverity.HIGH: 0.8,
            ErrorSeverity.MEDIUM: 0.6,
            ErrorSeverity.LOW: 0.4,
            ErrorSeverity.INFO: 0.2
        }
        
        base_impact = category_impact.get(category, 0.5)
        severity_mult = severity_multiplier.get(severity, 0.5)
        
        return base_impact * severity_mult * probability
    
    def _generate_recommended_actions(
        self, 
        category: ErrorCategory,
        contributing_factors: List[str],
        probability: float
    ) -> List[str]:
        """Generate recommended preventive actions"""
        
        actions = []
        
        # Category-specific recommendations
        if category == ErrorCategory.PAYMENT:
            actions.extend([
                "Monitor Stripe API response times closely",
                "Check payment webhook delivery status",
                "Verify payment processing capacity"
            ])
            if probability > 0.8:
                actions.append("🚨 URGENT: Review payment gateway configuration")
        
        elif category == ErrorCategory.DATABASE:
            actions.extend([
                "Monitor database connection pool",
                "Check for slow queries",
                "Verify database server resources"
            ])
            if "db_response_time" in str(contributing_factors):
                actions.append("Investigate database performance bottlenecks")
        
        elif category == ErrorCategory.BOOKING:
            actions.extend([
                "Monitor booking system load",
                "Check calendar integration health",
                "Verify appointment processing capacity"
            ])
        
        elif category == ErrorCategory.AUTHENTICATION:
            actions.extend([
                "Monitor JWT token validation performance",
                "Check authentication service health",
                "Review session management"
            ])
        
        # System-level recommendations based on contributing factors
        for factor in contributing_factors:
            if "cpu_usage" in factor:
                actions.append("⚠️ High CPU usage detected - consider scaling")
            if "memory_usage" in factor:
                actions.append("⚠️ High memory usage detected - investigate memory leaks")
            if "response_time" in factor:
                actions.append("⚠️ Slow response times - optimize critical paths")
        
        return list(set(actions))  # Remove duplicates
    
    def _calculate_confidence(self, model: PredictionModel, feature_values: Dict[str, float]) -> float:
        """Calculate prediction confidence based on model accuracy and feature completeness"""
        
        # Feature completeness factor
        available_features = len([f for f in model.features if f in feature_values])
        feature_completeness = available_features / len(model.features)
        
        # Model accuracy factor
        model_accuracy = model.accuracy
        
        # Data recency factor (models trained recently are more reliable)
        days_since_training = (datetime.utcnow() - model.last_trained).days
        recency_factor = max(0.5, 1.0 - (days_since_training * 0.1))
        
        confidence = feature_completeness * model_accuracy * recency_factor
        return min(confidence, 1.0)
    
    # Feature extraction methods
    async def _get_active_connections(self) -> float:
        """Get current active connections"""
        try:
            # This would integrate with your connection monitoring
            # For now, return a mock value
            return len(psutil.net_connections())
        except Exception:
            return 0.0
    
    async def _get_avg_response_time(self) -> float:
        """Get average response time from recent requests"""
        try:
            # This would integrate with your request monitoring
            # For now, return a mock value based on recent errors
            recent_errors = await error_monitoring_service.get_recent_errors(
                since=datetime.utcnow() - timedelta(minutes=5)
            )
            if recent_errors:
                # If there are recent errors, assume higher response times
                return 1500.0
            return 800.0
        except Exception:
            return 1000.0
    
    async def _get_current_error_rate(self) -> float:
        """Get current error rate percentage"""
        try:
            recent_errors = await error_monitoring_service.get_recent_errors(
                since=datetime.utcnow() - timedelta(minutes=10)
            )
            # Estimate error rate based on recent error count
            # This is simplified - in production you'd have request counts
            error_count = len(recent_errors)
            estimated_requests = 100  # Assume 100 requests in 10 minutes
            return (error_count / estimated_requests) * 100
        except Exception:
            return 0.0
    
    async def _get_db_response_time(self) -> float:
        """Get database response time"""
        try:
            from db import get_db
            import time
            
            start_time = time.time()
            db = next(get_db())
            db.execute("SELECT 1")
            end_time = time.time()
            
            return (end_time - start_time) * 1000  # Convert to milliseconds
        except Exception:
            return 100.0
    
    async def _get_connection_pool_usage(self) -> float:
        """Get database connection pool usage percentage"""
        try:
            # This would integrate with your connection pool monitoring
            # For now, return a mock value
            return 45.0
        except Exception:
            return 0.0
    
    async def _get_stripe_response_time(self) -> float:
        """Get Stripe API response time"""
        try:
            # This would integrate with your Stripe monitoring
            # For now, return a mock value
            return 850.0
        except Exception:
            return 1000.0
    
    async def _get_payment_error_rate(self) -> float:
        """Get payment error rate"""
        try:
            payment_errors = await error_monitoring_service.get_errors_by_category(
                ErrorCategory.PAYMENT,
                since=datetime.utcnow() - timedelta(hours=1)
            )
            # Simplified calculation
            return len(payment_errors) * 0.5  # Assume each error represents 0.5% error rate
        except Exception:
            return 0.0
    
    async def _get_booking_load(self) -> float:
        """Get current booking system load"""
        try:
            # This would integrate with your booking system metrics
            # For now, return a mock value based on time of day
            hour = datetime.utcnow().hour
            if 9 <= hour <= 17:  # Business hours
                return 65.0
            else:
                return 25.0
        except Exception:
            return 30.0
    
    async def _get_external_api_health(self) -> float:
        """Get external API health score"""
        try:
            # This would integrate with your circuit breaker service
            from services.circuit_breaker_service import circuit_breaker_service
            
            services = ["stripe", "google_calendar", "sendgrid", "twilio"]
            health_scores = []
            
            for service in services:
                if hasattr(circuit_breaker_service, f"is_{service}_healthy"):
                    is_healthy = getattr(circuit_breaker_service, f"is_{service}_healthy")()
                    health_scores.append(100.0 if is_healthy else 0.0)
            
            return statistics.mean(health_scores) if health_scores else 80.0
        except Exception:
            return 75.0
    
    async def _get_avg_session_duration(self) -> float:
        """Get average user session duration"""
        try:
            # This would integrate with your session tracking
            # For now, return a mock value
            return 1800.0  # 30 minutes
        except Exception:
            return 1200.0
    
    async def _get_auth_response_time(self) -> float:
        """Get authentication response time"""
        try:
            # This would integrate with your auth monitoring
            return 400.0
        except Exception:
            return 500.0
    
    async def _get_failed_login_rate(self) -> float:
        """Get failed login rate"""
        try:
            auth_errors = await error_monitoring_service.get_errors_by_category(
                ErrorCategory.AUTHENTICATION,
                since=datetime.utcnow() - timedelta(hours=1)
            )
            return len(auth_errors) * 2.0  # Simplified calculation
        except Exception:
            return 1.0
    
    async def _get_jwt_validation_time(self) -> float:
        """Get JWT validation time"""
        try:
            # This would integrate with your JWT monitoring
            return 50.0
        except Exception:
            return 100.0
    
    async def _get_active_session_count(self) -> float:
        """Get active session count"""
        try:
            # This would integrate with your session management
            return 250.0
        except Exception:
            return 100.0
    
    def _get_cpu_usage(self) -> float:
        """Get current CPU usage"""
        return psutil.cpu_percent(interval=1)
    
    def _get_memory_usage(self) -> float:
        """Get current memory usage"""
        return psutil.virtual_memory().percent
    
    def _get_disk_usage(self) -> float:
        """Get current disk usage"""
        return psutil.disk_usage('/').percent
    
    def _get_disk_io_rate(self) -> float:
        """Get current disk I/O rate"""
        try:
            disk_io = psutil.disk_io_counters()
            return (disk_io.read_bytes + disk_io.write_bytes) / 1024 / 1024  # MB/s
        except Exception:
            return 0.0

# Global predictive error service instance
predictive_error_service = PredictiveErrorService()