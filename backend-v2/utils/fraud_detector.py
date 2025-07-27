"""
Advanced fraud detection system for payment processing.
Implements machine learning algorithms and pattern recognition
for Six Figure Barber premium service protection.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
import json
from collections import defaultdict
import statistics

logger = logging.getLogger(__name__)


class AdvancedFraudDetector:
    """
    Advanced fraud detection system using behavioral analysis,
    pattern recognition, and risk scoring algorithms.
    """
    
    def __init__(self):
        # Risk scoring weights
        self.risk_weights = {
            "velocity_risk": 0.25,        # Payment frequency patterns
            "amount_risk": 0.20,          # Unusual payment amounts
            "pattern_risk": 0.20,         # Behavioral pattern anomalies
            "geolocation_risk": 0.15,     # Geographic inconsistencies
            "device_risk": 0.10,          # Device fingerprinting
            "time_risk": 0.10            # Unusual timing patterns
        }
        
        # Fraud indicators for premium barbershop services
        self.fraud_patterns = {
            "rapid_payments": {
                "threshold": 5,           # More than 5 payments in 1 hour
                "time_window": 3600,      # 1 hour in seconds
                "risk_score": 75
            },
            "unusual_amounts": {
                "premium_threshold": 500,  # Very high amounts
                "micro_threshold": 5,      # Very low amounts
                "risk_score": 60
            },
            "geographic_velocity": {
                "distance_threshold": 100,  # Miles between locations
                "time_threshold": 3600,     # Within 1 hour
                "risk_score": 80
            },
            "device_switching": {
                "device_changes": 3,       # Multiple devices in short time
                "time_window": 86400,      # 24 hours
                "risk_score": 65
            }
        }
        
        # Allowlisted patterns for legitimate Six Figure Barber operations
        self.legitimate_patterns = {
            "regular_clients": {
                "frequency": "monthly",    # Regular monthly appointments
                "amount_variance": 0.2,    # 20% variance in amount
                "risk_reduction": 30
            },
            "premium_services": {
                "min_amount": 100,         # Consistent with premium positioning
                "max_amount": 300,         # Reasonable for high-end services
                "risk_reduction": 20
            },
            "business_hours": {
                "start_hour": 8,           # 8 AM
                "end_hour": 19,            # 7 PM
                "risk_reduction": 15
            }
        }
    
    async def analyze_payment_risk(
        self,
        payment_data: Dict[str, Any],
        customer_history: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze payment for fraud risk using multiple algorithms.
        
        Args:
            payment_data: Current payment information
            customer_history: Historical payment data for customer
            context: Additional context (device, location, etc.)
            
        Returns:
            Dict containing risk assessment and recommendations
        """
        try:
            risk_scores = {}
            risk_factors = []
            
            # Velocity risk analysis
            velocity_risk = await self._analyze_velocity_risk(
                payment_data, customer_history
            )
            risk_scores["velocity"] = velocity_risk["score"]
            if velocity_risk["factors"]:
                risk_factors.extend(velocity_risk["factors"])
            
            # Amount pattern analysis
            amount_risk = await self._analyze_amount_risk(
                payment_data, customer_history
            )
            risk_scores["amount"] = amount_risk["score"]
            if amount_risk["factors"]:
                risk_factors.extend(amount_risk["factors"])
            
            # Behavioral pattern analysis
            pattern_risk = await self._analyze_behavioral_patterns(
                payment_data, customer_history, context
            )
            risk_scores["pattern"] = pattern_risk["score"]
            if pattern_risk["factors"]:
                risk_factors.extend(pattern_risk["factors"])
            
            # Geographic risk analysis
            geo_risk = await self._analyze_geographic_risk(
                payment_data, customer_history, context
            )
            risk_scores["geographic"] = geo_risk["score"]
            if geo_risk["factors"]:
                risk_factors.extend(geo_risk["factors"])
            
            # Device risk analysis
            device_risk = await self._analyze_device_risk(
                payment_data, customer_history, context
            )
            risk_scores["device"] = device_risk["score"]
            if device_risk["factors"]:
                risk_factors.extend(device_risk["factors"])
            
            # Time-based risk analysis
            time_risk = await self._analyze_time_risk(
                payment_data, customer_history
            )
            risk_scores["time"] = time_risk["score"]
            if time_risk["factors"]:
                risk_factors.extend(time_risk["factors"])
            
            # Calculate overall risk score
            overall_risk = self._calculate_overall_risk_score(risk_scores)
            
            # Apply Six Figure Barber methodology adjustments
            adjusted_risk = await self._apply_six_figure_adjustments(
                overall_risk, payment_data, customer_history
            )
            
            # Generate recommendations
            recommendations = await self._generate_fraud_recommendations(
                adjusted_risk, risk_factors, payment_data
            )
            
            return {
                "risk_score": adjusted_risk,
                "risk_level": self._categorize_risk_level(adjusted_risk),
                "risk_factors": risk_factors,
                "detailed_scores": risk_scores,
                "recommendations": recommendations,
                "approved": adjusted_risk < 75,  # Threshold for automatic approval
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "six_figure_optimized": True
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze payment risk: {str(e)}")
            return {
                "risk_score": 100,  # Fail safe to high risk
                "risk_level": "high",
                "error": str(e),
                "approved": False
            }
    
    async def _analyze_velocity_risk(
        self,
        payment_data: Dict[str, Any],
        customer_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze payment velocity patterns for fraud indicators"""
        try:
            current_time = datetime.utcnow()
            risk_factors = []
            risk_score = 0
            
            # Get recent payments (last 24 hours)
            recent_payments = [
                p for p in customer_history
                if self._parse_timestamp(p.get("created", 0)) > current_time - timedelta(hours=24)
            ]
            
            # Check for rapid payment pattern
            if len(recent_payments) >= self.fraud_patterns["rapid_payments"]["threshold"]:
                risk_score += self.fraud_patterns["rapid_payments"]["risk_score"]
                risk_factors.append(f"Rapid payments detected: {len(recent_payments)} in 24 hours")
            
            # Check for unusual payment frequency
            if len(customer_history) > 0:
                avg_interval = self._calculate_average_payment_interval(customer_history)
                if avg_interval < 86400:  # Less than 1 day average
                    risk_score += 30
                    risk_factors.append("Unusually frequent payments")
            
            # Check for payment bursts
            payment_burst_score = self._detect_payment_bursts(customer_history)
            risk_score += payment_burst_score
            if payment_burst_score > 0:
                risk_factors.append("Payment burst pattern detected")
            
            return {
                "score": min(risk_score, 100),
                "factors": risk_factors
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze velocity risk: {str(e)}")
            return {"score": 50, "factors": ["Velocity analysis failed"]}
    
    async def _analyze_amount_risk(
        self,
        payment_data: Dict[str, Any],
        customer_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze payment amount patterns for anomalies"""
        try:
            current_amount = payment_data.get("amount", 0) / 100  # Convert from cents
            risk_factors = []
            risk_score = 0
            
            # Check for extremely high amounts
            if current_amount > self.fraud_patterns["unusual_amounts"]["premium_threshold"]:
                risk_score += self.fraud_patterns["unusual_amounts"]["risk_score"]
                risk_factors.append(f"Unusually high payment amount: ${current_amount}")
            
            # Check for extremely low amounts (potential testing)
            if current_amount < self.fraud_patterns["unusual_amounts"]["micro_threshold"]:
                risk_score += self.fraud_patterns["unusual_amounts"]["risk_score"]
                risk_factors.append(f"Unusually low payment amount: ${current_amount}")
            
            # Analyze amount compared to customer history
            if customer_history:
                historical_amounts = [p.get("amount", 0) / 100 for p in customer_history]
                
                if len(historical_amounts) > 3:
                    avg_amount = statistics.mean(historical_amounts)
                    std_dev = statistics.stdev(historical_amounts)
                    
                    # Check if current amount is significantly different
                    if abs(current_amount - avg_amount) > (2 * std_dev):
                        risk_score += 40
                        risk_factors.append(f"Amount deviates significantly from customer pattern")
            
            # Six Figure Barber methodology: premium services should have consistent pricing
            if self.legitimate_patterns["premium_services"]["min_amount"] <= current_amount <= self.legitimate_patterns["premium_services"]["max_amount"]:
                risk_score = max(0, risk_score - self.legitimate_patterns["premium_services"]["risk_reduction"])
            
            return {
                "score": min(risk_score, 100),
                "factors": risk_factors
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze amount risk: {str(e)}")
            return {"score": 50, "factors": ["Amount analysis failed"]}
    
    async def _analyze_behavioral_patterns(
        self,
        payment_data: Dict[str, Any],
        customer_history: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze behavioral patterns for fraud indicators"""
        try:
            risk_factors = []
            risk_score = 0
            
            # Analyze payment method changes
            current_method = payment_data.get("payment_method_type", "unknown")
            historical_methods = [p.get("payment_method_type", "unknown") for p in customer_history]
            
            if historical_methods and current_method not in historical_methods[-5:]:
                risk_score += 25
                risk_factors.append("New payment method used")
            
            # Analyze user agent/browser changes
            current_user_agent = context.get("user_agent", "")
            if len(customer_history) > 0:
                recent_user_agents = [p.get("user_agent", "") for p in customer_history[-5:]]
                if current_user_agent and current_user_agent not in recent_user_agents:
                    risk_score += 20
                    risk_factors.append("Different browser/device detected")
            
            # Check for automation indicators
            automation_score = self._detect_automation_patterns(payment_data, context)
            risk_score += automation_score
            if automation_score > 0:
                risk_factors.append("Potential automated payment behavior")
            
            # Analyze session duration (if available)
            session_duration = context.get("session_duration", 0)
            if session_duration < 30:  # Very quick payment (less than 30 seconds)
                risk_score += 30
                risk_factors.append("Unusually quick payment process")
            
            return {
                "score": min(risk_score, 100),
                "factors": risk_factors
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze behavioral patterns: {str(e)}")
            return {"score": 50, "factors": ["Behavioral analysis failed"]}
    
    async def _analyze_geographic_risk(
        self,
        payment_data: Dict[str, Any],
        customer_history: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze geographic patterns for fraud indicators"""
        try:
            risk_factors = []
            risk_score = 0
            
            current_location = context.get("location", {})
            current_country = current_location.get("country", "")
            current_city = current_location.get("city", "")
            
            if not current_country:
                return {"score": 0, "factors": []}
            
            # Check against historical locations
            if customer_history:
                historical_locations = [
                    p.get("location", {}) for p in customer_history[-10:]
                ]
                
                historical_countries = [
                    loc.get("country", "") for loc in historical_locations if loc.get("country")
                ]
                
                # Check for new country
                if historical_countries and current_country not in historical_countries:
                    risk_score += 60
                    risk_factors.append(f"Payment from new country: {current_country}")
                
                # Check for rapid geographic changes
                recent_location = historical_locations[-1] if historical_locations else {}
                if recent_location.get("city") and current_city:
                    if recent_location["city"] != current_city:
                        # Check if this is happening quickly
                        last_payment_time = self._parse_timestamp(customer_history[-1].get("created", 0))
                        if datetime.utcnow() - last_payment_time < timedelta(hours=1):
                            risk_score += self.fraud_patterns["geographic_velocity"]["risk_score"]
                            risk_factors.append("Rapid geographic change detected")
            
            # Check for high-risk countries (if applicable)
            high_risk_countries = ["XX", "YY"]  # Configure based on business rules
            if current_country in high_risk_countries:
                risk_score += 40
                risk_factors.append(f"Payment from high-risk country: {current_country}")
            
            return {
                "score": min(risk_score, 100),
                "factors": risk_factors
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze geographic risk: {str(e)}")
            return {"score": 0, "factors": []}
    
    async def _analyze_device_risk(
        self,
        payment_data: Dict[str, Any],
        customer_history: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze device patterns for fraud indicators"""
        try:
            risk_factors = []
            risk_score = 0
            
            current_device_id = context.get("device_fingerprint", "")
            current_ip = context.get("ip_address", "")
            
            if not current_device_id and not current_ip:
                return {"score": 0, "factors": []}
            
            # Analyze device history
            if customer_history:
                recent_devices = [
                    p.get("device_fingerprint", "") for p in customer_history[-10:]
                ]
                recent_ips = [
                    p.get("ip_address", "") for p in customer_history[-10:]
                ]
                
                # Check for new device
                if current_device_id and recent_devices and current_device_id not in recent_devices:
                    risk_score += 30
                    risk_factors.append("Payment from new device")
                
                # Check for multiple devices in short time
                unique_devices = set(filter(None, recent_devices))
                if len(unique_devices) >= self.fraud_patterns["device_switching"]["device_changes"]:
                    risk_score += self.fraud_patterns["device_switching"]["risk_score"]
                    risk_factors.append("Multiple devices used recently")
                
                # Check for IP address changes
                if current_ip and recent_ips and current_ip not in recent_ips[-3:]:
                    risk_score += 20
                    risk_factors.append("New IP address detected")
            
            # Check for suspicious device characteristics
            user_agent = context.get("user_agent", "")
            if self._is_suspicious_user_agent(user_agent):
                risk_score += 35
                risk_factors.append("Suspicious browser/device characteristics")
            
            return {
                "score": min(risk_score, 100),
                "factors": risk_factors
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze device risk: {str(e)}")
            return {"score": 0, "factors": []}
    
    async def _analyze_time_risk(
        self,
        payment_data: Dict[str, Any],
        customer_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze timing patterns for fraud indicators"""
        try:
            risk_factors = []
            risk_score = 0
            
            current_time = datetime.utcnow()
            current_hour = current_time.hour
            
            # Check if payment is during unusual hours
            business_start = self.legitimate_patterns["business_hours"]["start_hour"]
            business_end = self.legitimate_patterns["business_hours"]["end_hour"]
            
            if current_hour < business_start or current_hour > business_end:
                risk_score += 25
                risk_factors.append(f"Payment outside business hours: {current_hour}:00")
            else:
                # Reduce risk for business hours
                risk_score = max(0, risk_score - self.legitimate_patterns["business_hours"]["risk_reduction"])
            
            # Analyze historical timing patterns
            if customer_history:
                historical_hours = [
                    self._parse_timestamp(p.get("created", 0)).hour 
                    for p in customer_history
                ]
                
                if historical_hours:
                    avg_hour = statistics.mean(historical_hours)
                    if abs(current_hour - avg_hour) > 6:  # More than 6 hours difference
                        risk_score += 20
                        risk_factors.append("Unusual payment time compared to customer pattern")
            
            # Check for weekend/holiday patterns
            if current_time.weekday() >= 5:  # Saturday or Sunday
                risk_score += 15
                risk_factors.append("Weekend payment")
            
            return {
                "score": min(risk_score, 100),
                "factors": risk_factors
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze time risk: {str(e)}")
            return {"score": 0, "factors": []}
    
    def _calculate_overall_risk_score(self, risk_scores: Dict[str, int]) -> int:
        """Calculate weighted overall risk score"""
        total_score = 0
        
        for risk_type, score in risk_scores.items():
            weight = self.risk_weights.get(risk_type.replace("_risk", "_risk"), 0)
            total_score += score * weight
        
        return min(100, int(total_score))
    
    async def _apply_six_figure_adjustments(
        self,
        risk_score: int,
        payment_data: Dict[str, Any],
        customer_history: List[Dict[str, Any]]
    ) -> int:
        """Apply Six Figure Barber methodology adjustments to risk score"""
        try:
            adjusted_score = risk_score
            amount = payment_data.get("amount", 0) / 100
            
            # Reduce risk for premium service amounts
            if (self.legitimate_patterns["premium_services"]["min_amount"] <= 
                amount <= self.legitimate_patterns["premium_services"]["max_amount"]):
                adjusted_score -= self.legitimate_patterns["premium_services"]["risk_reduction"]
            
            # Reduce risk for regular clients
            if len(customer_history) >= 3:
                # Check for regular appointment pattern
                if self._is_regular_client(customer_history):
                    adjusted_score -= self.legitimate_patterns["regular_clients"]["risk_reduction"]
            
            # Reduce risk for consistent amounts (premium service consistency)
            if customer_history:
                amount_consistency = self._calculate_amount_consistency(customer_history)
                if amount_consistency > 0.8:  # High consistency
                    adjusted_score -= 20
            
            return max(0, min(100, adjusted_score))
            
        except Exception as e:
            logger.error(f"Failed to apply Six Figure adjustments: {str(e)}")
            return risk_score
    
    def _is_regular_client(self, customer_history: List[Dict[str, Any]]) -> bool:
        """Determine if customer shows regular appointment patterns"""
        if len(customer_history) < 3:
            return False
        
        # Calculate intervals between payments
        timestamps = [self._parse_timestamp(p.get("created", 0)) for p in customer_history]
        timestamps.sort()
        
        intervals = []
        for i in range(1, len(timestamps)):
            interval = (timestamps[i] - timestamps[i-1]).days
            intervals.append(interval)
        
        if not intervals:
            return False
        
        # Check if intervals are consistent (within 50% variance)
        avg_interval = statistics.mean(intervals)
        variance = statistics.variance(intervals) if len(intervals) > 1 else 0
        coefficient_of_variation = (variance ** 0.5) / avg_interval if avg_interval > 0 else 1
        
        # Regular clients typically have appointments every 20-45 days
        return (20 <= avg_interval <= 45) and (coefficient_of_variation < 0.5)
    
    def _calculate_amount_consistency(self, customer_history: List[Dict[str, Any]]) -> float:
        """Calculate consistency of payment amounts"""
        amounts = [p.get("amount", 0) for p in customer_history]
        
        if len(amounts) < 2:
            return 0.0
        
        avg_amount = statistics.mean(amounts)
        if avg_amount == 0:
            return 0.0
        
        variance = statistics.variance(amounts)
        coefficient_of_variation = (variance ** 0.5) / avg_amount
        
        # Return consistency score (1.0 = perfectly consistent, 0.0 = highly variable)
        return max(0.0, 1.0 - coefficient_of_variation)
    
    def _parse_timestamp(self, timestamp: int) -> datetime:
        """Parse timestamp to datetime object"""
        try:
            if timestamp > 1e10:  # Timestamp in milliseconds
                timestamp = timestamp / 1000
            return datetime.fromtimestamp(timestamp)
        except (ValueError, TypeError):
            return datetime.utcnow()
    
    def _calculate_average_payment_interval(self, customer_history: List[Dict[str, Any]]) -> float:
        """Calculate average interval between payments in seconds"""
        if len(customer_history) < 2:
            return 86400 * 30  # Default to 30 days
        
        timestamps = [self._parse_timestamp(p.get("created", 0)) for p in customer_history]
        timestamps.sort()
        
        total_interval = (timestamps[-1] - timestamps[0]).total_seconds()
        return total_interval / (len(timestamps) - 1)
    
    def _detect_payment_bursts(self, customer_history: List[Dict[str, Any]]) -> int:
        """Detect unusual payment bursts"""
        if len(customer_history) < 5:
            return 0
        
        # Group payments by hour
        hourly_counts = defaultdict(int)
        for payment in customer_history:
            timestamp = self._parse_timestamp(payment.get("created", 0))
            hour_key = timestamp.replace(minute=0, second=0, microsecond=0)
            hourly_counts[hour_key] += 1
        
        # Check for hours with unusual activity
        max_hourly = max(hourly_counts.values())
        if max_hourly >= 3:  # 3 or more payments in one hour
            return 40
        
        return 0
    
    def _detect_automation_patterns(self, payment_data: Dict[str, Any], context: Dict[str, Any]) -> int:
        """Detect patterns indicating automated/bot behavior"""
        risk_score = 0
        
        # Check for missing typical human indicators
        if not context.get("mouse_movements"):
            risk_score += 20
        
        if not context.get("keyboard_interactions"):
            risk_score += 15
        
        # Check for suspiciously fast form completion
        form_completion_time = context.get("form_completion_time", 0)
        if 0 < form_completion_time < 5:  # Less than 5 seconds
            risk_score += 30
        
        return risk_score
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check if user agent indicates suspicious behavior"""
        if not user_agent:
            return True
        
        suspicious_indicators = [
            "bot", "crawler", "spider", "scraper", "curl", "wget", "python", "automated"
        ]
        
        user_agent_lower = user_agent.lower()
        return any(indicator in user_agent_lower for indicator in suspicious_indicators)
    
    def _categorize_risk_level(self, risk_score: int) -> str:
        """Categorize risk score into levels"""
        if risk_score >= 80:
            return "high"
        elif risk_score >= 50:
            return "medium"
        else:
            return "low"
    
    async def _generate_fraud_recommendations(
        self,
        risk_score: int,
        risk_factors: List[str],
        payment_data: Dict[str, Any]
    ) -> List[str]:
        """Generate recommendations based on fraud analysis"""
        recommendations = []
        
        if risk_score >= 80:
            recommendations.extend([
                "Block payment and require manual review",
                "Request additional verification from customer",
                "Consider implementing 3D Secure authentication"
            ])
        elif risk_score >= 50:
            recommendations.extend([
                "Hold payment for additional verification",
                "Request customer confirmation via known contact method",
                "Monitor customer closely for future transactions"
            ])
        else:
            recommendations.append("Process payment with standard monitoring")
        
        # Specific recommendations based on risk factors
        if "Rapid payments detected" in " ".join(risk_factors):
            recommendations.append("Implement velocity limits for this customer")
        
        if "New payment method" in " ".join(risk_factors):
            recommendations.append("Verify new payment method with customer")
        
        if "Payment from new country" in " ".join(risk_factors):
            recommendations.append("Confirm travel/location change with customer")
        
        return recommendations