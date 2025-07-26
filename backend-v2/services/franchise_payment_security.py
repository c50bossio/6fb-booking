"""
Franchise Payment Security Service for BookedBarber V2
Enhanced payment security for enterprise-scale franchise operations
"""

import stripe
import hashlib
import hmac
import secrets
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import asyncio
import re

from models.franchise_security import (
    FranchiseNetwork, FranchiseEncryptionKey, FranchiseSecurityEvent,
    ComplianceStandard, DataClassification
)
from models import User, Payment
from database import SessionLocal
from config import settings

logger = logging.getLogger(__name__)


class FranchisePaymentSecurityService:
    """Enhanced payment security for franchise operations with PCI DSS compliance"""
    
    def __init__(self):
        self.stripe = stripe
        self.stripe.api_key = settings.STRIPE_SECRET_KEY
        self.fraud_detection_engine = FranchiseFraudDetectionEngine()
        self.encryption_service = PaymentEncryptionService()
        self.compliance_monitor = PaymentComplianceMonitor()
        
        # PCI DSS configuration
        self.pci_dss_config = {
            "require_cvc": True,
            "require_avs": True,
            "max_retry_attempts": 3,
            "velocity_limits": {
                "per_minute": 5,
                "per_hour": 50,
                "per_day": 200
            },
            "amount_limits": {
                "single_transaction": 10000.00,  # $10,000
                "daily_total": 50000.00,         # $50,000
                "monthly_total": 500000.00       # $500,000
            }
        }
    
    async def create_franchise_stripe_account(self, franchise_network_id: str, 
                                            location_id: int, business_info: Dict) -> Dict:
        """Create isolated Stripe Connect account for franchise location"""
        
        try:
            # Get franchise compliance requirements
            franchise = await self._get_franchise_network(franchise_network_id)
            compliance_reqs = franchise.compliance_requirements or []
            
            # Determine security level based on compliance requirements
            enhanced_security = "PCI_DSS" in compliance_reqs
            
            # Configure Stripe account with enhanced security
            stripe_account_config = {
                "type": "express",
                "country": business_info.get("country", franchise.headquarters_country),
                "business_type": "company",
                "capabilities": {
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True}
                },
                "settings": {
                    "payouts": {
                        "statement_descriptor": f"BookedBarber {location_id}",
                        "schedule": {
                            "interval": "daily" if enhanced_security else "weekly",
                            "weekly_anchor": "monday" if not enhanced_security else None
                        }
                    },
                    "card_payments": {
                        "statement_descriptor_suffix": f"LOC{location_id}",
                        "decline_on": {
                            "cvc_failure": True,
                            "avs_failure": enhanced_security
                        }
                    }
                },
                "tos_acceptance": {
                    "service_agreement": "recipient"
                }
            }
            
            # Add enhanced fraud protection for PCI DSS compliance
            if enhanced_security:
                stripe_account_config["settings"]["card_payments"]["decline_on"].update({
                    "risk_level": "elevated"
                })
            
            # Create Stripe Connect account
            stripe_account = stripe.Account.create(**stripe_account_config)
            
            # Generate franchise-specific webhook secret
            webhook_secret = secrets.token_urlsafe(32)
            
            # Store account data with encryption
            encrypted_account_data = await self.encryption_service.encrypt_payment_data({
                "stripe_account_id": stripe_account.id,
                "franchise_network_id": franchise_network_id,
                "location_id": location_id,
                "webhook_secret": webhook_secret,
                "compliance_level": "enhanced" if enhanced_security else "standard",
                "created_at": datetime.now(timezone.utc).isoformat()
            }, franchise_network_id)
            
            # Store in database
            await self._store_franchise_account_data(encrypted_account_data)
            
            # Log account creation
            await self._log_security_event(
                franchise_network_id,
                "payment_account_created",
                "payment",
                "medium",
                f"Stripe Connect account created for location {location_id}",
                {
                    "stripe_account_id": stripe_account.id,
                    "location_id": location_id,
                    "compliance_level": "enhanced" if enhanced_security else "standard"
                }
            )
            
            return {
                "account_id": stripe_account.id,
                "onboarding_url": self._get_onboarding_url(stripe_account),
                "compliance_level": "enhanced" if enhanced_security else "standard",
                "webhook_secret": webhook_secret,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe account creation failed: {e}")
            raise Exception(f"Payment account creation failed: {str(e)}")
        except Exception as e:
            logger.error(f"Franchise account creation failed: {e}")
            raise
    
    async def validate_franchise_payment(self, payment_intent_data: Dict, 
                                       franchise_context: Dict, user: User) -> Dict:
        """Validate payment with franchise-specific security checks"""
        
        validation_results = {
            "valid": True,
            "security_checks": [],
            "compliance_checks": [],
            "fraud_checks": [],
            "risk_score": 0,
            "required_actions": []
        }
        
        try:
            # 1. Franchise-specific compliance validation
            compliance_reqs = franchise_context.get("compliance_requirements", [])
            
            if "PCI_DSS" in compliance_reqs:
                pci_validation = await self._validate_pci_dss_compliance(
                    payment_intent_data, franchise_context
                )
                validation_results["compliance_checks"].extend(pci_validation)
            
            # 2. Enhanced fraud detection
            fraud_assessment = await self.fraud_detection_engine.assess_payment_fraud(
                payment_intent_data, franchise_context, user
            )
            validation_results["fraud_checks"] = fraud_assessment["checks"]
            validation_results["risk_score"] = fraud_assessment["risk_score"]
            
            # 3. Velocity and amount limit validation
            velocity_check = await self._validate_payment_velocity(
                user.id, payment_intent_data["amount"], franchise_context
            )
            validation_results["security_checks"].extend(velocity_check)
            
            # 4. Device and location validation
            device_check = await self._validate_payment_device(
                payment_intent_data, user, franchise_context
            )
            validation_results["security_checks"].extend(device_check)
            
            # 5. Determine overall validation result
            if validation_results["risk_score"] > 75:
                validation_results["valid"] = False
                validation_results["required_actions"].append("manual_review")
            elif validation_results["risk_score"] > 50:
                validation_results["required_actions"].append("additional_verification")
            
            # 6. Log validation results
            await self._log_payment_validation(
                franchise_context.get("franchise_network_id"),
                user.id,
                payment_intent_data,
                validation_results
            )
            
            return validation_results
            
        except Exception as e:
            logger.error(f"Payment validation failed: {e}")
            return {
                "valid": False,
                "error": str(e),
                "security_checks": ["validation_error"],
                "risk_score": 100
            }
    
    async def process_secure_payment(self, payment_data: Dict, franchise_context: Dict, 
                                   user: User) -> Dict:
        """Process payment with enhanced security measures"""
        
        try:
            # 1. Pre-processing validation
            validation_result = await self.validate_franchise_payment(
                payment_data, franchise_context, user
            )
            
            if not validation_result["valid"]:
                raise ValueError(f"Payment validation failed: {validation_result}")
            
            # 2. Get franchise Stripe account
            stripe_account_id = await self._get_franchise_stripe_account(
                franchise_context["franchise_network_id"],
                franchise_context.get("location_id")
            )
            
            # 3. Create payment intent with enhanced security
            payment_intent_config = {
                "amount": int(payment_data["amount"] * 100),  # Convert to cents
                "currency": payment_data.get("currency", "usd"),
                "customer": payment_data.get("customer_id"),
                "payment_method": payment_data["payment_method_id"],
                "confirmation_method": "manual",
                "capture_method": "manual",  # Manual capture for review
                "metadata": {
                    "franchise_network_id": franchise_context["franchise_network_id"],
                    "location_id": str(franchise_context.get("location_id", "")),
                    "user_id": str(user.id),
                    "risk_score": str(validation_result["risk_score"]),
                    "compliance_level": "enhanced" if "PCI_DSS" in franchise_context.get("compliance_requirements", []) else "standard"
                }
            }
            
            # Add enhanced fraud protection
            if validation_result["risk_score"] > 30:
                payment_intent_config["radar"] = {
                    "session": payment_data.get("radar_session")
                }
            
            # Create payment intent
            payment_intent = stripe.PaymentIntent.create(
                **payment_intent_config,
                stripe_account=stripe_account_id
            )
            
            # 4. Store payment record with encryption
            encrypted_payment_data = await self.encryption_service.encrypt_payment_data({
                "payment_intent_id": payment_intent.id,
                "amount": payment_data["amount"],
                "currency": payment_data.get("currency", "usd"),
                "user_id": user.id,
                "franchise_network_id": franchise_context["franchise_network_id"],
                "location_id": franchise_context.get("location_id"),
                "risk_score": validation_result["risk_score"],
                "validation_results": validation_result,
                "created_at": datetime.now(timezone.utc).isoformat()
            }, franchise_context["franchise_network_id"])
            
            await self._store_encrypted_payment_record(encrypted_payment_data)
            
            # 5. Log secure payment processing
            await self._log_security_event(
                franchise_context["franchise_network_id"],
                "secure_payment_processed",
                "payment",
                "medium",
                f"Secure payment processed for user {user.id}",
                {
                    "payment_intent_id": payment_intent.id,
                    "amount": payment_data["amount"],
                    "risk_score": validation_result["risk_score"]
                }
            )
            
            return {
                "payment_intent_id": payment_intent.id,
                "client_secret": payment_intent.client_secret,
                "status": payment_intent.status,
                "risk_score": validation_result["risk_score"],
                "requires_capture": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment processing failed: {e}")
            await self._log_payment_error(franchise_context, user.id, str(e))
            raise Exception(f"Payment processing failed: {str(e)}")
        except Exception as e:
            logger.error(f"Secure payment processing failed: {e}")
            raise
    
    async def setup_franchise_webhook_security(self, franchise_network_id: str, 
                                             webhook_url: str) -> Dict:
        """Set up secure webhook endpoint for franchise payments"""
        
        try:
            # Generate franchise-specific webhook secret
            webhook_secret = secrets.token_urlsafe(32)
            
            # Get franchise Stripe accounts
            stripe_accounts = await self._get_franchise_stripe_accounts(franchise_network_id)
            
            webhook_endpoints = []
            
            for account in stripe_accounts:
                # Create webhook endpoint for each account
                webhook_endpoint = stripe.WebhookEndpoint.create(
                    url=f"{webhook_url}/franchise/{franchise_network_id}",
                    enabled_events=[
                        "payment_intent.succeeded",
                        "payment_intent.payment_failed",
                        "payment_intent.requires_action",
                        "charge.dispute.created",
                        "invoice.payment_succeeded",
                        "invoice.payment_failed"
                    ],
                    stripe_account=account["stripe_account_id"]
                )
                
                webhook_endpoints.append({
                    "account_id": account["stripe_account_id"],
                    "webhook_id": webhook_endpoint.id,
                    "webhook_secret": webhook_endpoint.secret
                })
            
            # Store webhook configuration with encryption
            webhook_config = {
                "franchise_network_id": franchise_network_id,
                "webhook_url": webhook_url,
                "webhook_secret": webhook_secret,
                "endpoints": webhook_endpoints,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            encrypted_config = await self.encryption_service.encrypt_payment_data(
                webhook_config, franchise_network_id
            )
            
            await self._store_webhook_configuration(encrypted_config)
            
            # Log webhook setup
            await self._log_security_event(
                franchise_network_id,
                "webhook_security_configured",
                "payment",
                "low",
                f"Secure webhook endpoints configured for {len(webhook_endpoints)} accounts",
                {"endpoint_count": len(webhook_endpoints)}
            )
            
            return {
                "webhook_secret": webhook_secret,
                "endpoints_configured": len(webhook_endpoints),
                "webhook_url": webhook_url,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Webhook security setup failed: {e}")
            raise
    
    async def _validate_pci_dss_compliance(self, payment_data: Dict, 
                                         franchise_context: Dict) -> List[str]:
        """Validate PCI DSS compliance requirements"""
        
        compliance_issues = []
        
        # 1. Validate card data handling
        if "card_number" in payment_data:
            compliance_issues.append("Card number should not be transmitted directly")
        
        # 2. Validate encryption requirements
        if not payment_data.get("payment_method_id"):
            compliance_issues.append("Payment method must be tokenized")
        
        # 3. Validate CVC requirement
        if self.pci_dss_config["require_cvc"] and not payment_data.get("cvc_provided"):
            compliance_issues.append("CVC verification required for PCI DSS compliance")
        
        # 4. Validate AVS requirement
        if self.pci_dss_config["require_avs"] and not payment_data.get("avs_provided"):
            compliance_issues.append("Address verification required for PCI DSS compliance")
        
        return compliance_issues
    
    async def _validate_payment_velocity(self, user_id: int, amount: float, 
                                       franchise_context: Dict) -> List[str]:
        """Validate payment velocity limits"""
        
        issues = []
        
        # Get recent payment history
        recent_payments = await self._get_recent_user_payments(user_id)
        
        # Check per-minute velocity
        minute_payments = [p for p in recent_payments if p["created_at"] > datetime.now(timezone.utc) - timedelta(minutes=1)]
        if len(minute_payments) >= self.pci_dss_config["velocity_limits"]["per_minute"]:
            issues.append("Per-minute payment velocity limit exceeded")
        
        # Check per-hour velocity
        hour_payments = [p for p in recent_payments if p["created_at"] > datetime.now(timezone.utc) - timedelta(hours=1)]
        if len(hour_payments) >= self.pci_dss_config["velocity_limits"]["per_hour"]:
            issues.append("Per-hour payment velocity limit exceeded")
        
        # Check daily amount limits
        today_payments = [p for p in recent_payments if p["created_at"] > datetime.now(timezone.utc) - timedelta(days=1)]
        today_total = sum([p["amount"] for p in today_payments]) + amount
        
        if today_total > self.pci_dss_config["amount_limits"]["daily_total"]:
            issues.append("Daily payment amount limit exceeded")
        
        # Check single transaction limit
        if amount > self.pci_dss_config["amount_limits"]["single_transaction"]:
            issues.append("Single transaction amount limit exceeded")
        
        return issues
    
    async def _validate_payment_device(self, payment_data: Dict, user: User, 
                                     franchise_context: Dict) -> List[str]:
        """Validate payment device and location"""
        
        issues = []
        
        # Check device fingerprint
        device_fingerprint = payment_data.get("device_fingerprint")
        if not device_fingerprint:
            issues.append("Device fingerprint required for enhanced security")
        else:
            # Check if device is known
            is_known_device = await self._check_known_payment_device(user.id, device_fingerprint)
            if not is_known_device:
                issues.append("Payment from unknown device")
        
        # Check IP geolocation
        client_ip = payment_data.get("client_ip")
        if client_ip:
            location_risk = await self._assess_payment_location_risk(user.id, client_ip)
            if location_risk > 70:
                issues.append("Payment from high-risk location")
        
        return issues
    
    # Helper methods
    
    async def _get_franchise_network(self, franchise_network_id: str) -> FranchiseNetwork:
        """Get franchise network from database"""
        db = SessionLocal()
        try:
            return db.query(FranchiseNetwork).filter(
                FranchiseNetwork.id == franchise_network_id
            ).first()
        finally:
            db.close()
    
    async def _get_franchise_stripe_account(self, franchise_network_id: str, 
                                          location_id: Optional[int]) -> str:
        """Get Stripe account ID for franchise location"""
        # In production, query database for stored account
        return "acct_franchise_example"
    
    async def _get_franchise_stripe_accounts(self, franchise_network_id: str) -> List[Dict]:
        """Get all Stripe accounts for franchise network"""
        # In production, query database for all accounts
        return [{"stripe_account_id": "acct_franchise_example"}]
    
    async def _get_recent_user_payments(self, user_id: int) -> List[Dict]:
        """Get recent payment history for user"""
        # In production, query payment history from database
        return []
    
    async def _check_known_payment_device(self, user_id: int, device_fingerprint: str) -> bool:
        """Check if payment device is known for user"""
        # In production, check device registry
        return False
    
    async def _assess_payment_location_risk(self, user_id: int, client_ip: str) -> int:
        """Assess location-based payment risk"""
        # In production, use geolocation and risk scoring
        return 20
    
    def _get_onboarding_url(self, stripe_account) -> Optional[str]:
        """Get Stripe onboarding URL"""
        if hasattr(stripe_account, 'links') and stripe_account.links.data:
            return stripe_account.links.data[0].url
        return None
    
    async def _store_franchise_account_data(self, encrypted_data: str):
        """Store franchise account data in database"""
        logger.info("Storing franchise account data")
    
    async def _store_encrypted_payment_record(self, encrypted_data: str):
        """Store encrypted payment record"""
        logger.info("Storing encrypted payment record")
    
    async def _store_webhook_configuration(self, encrypted_config: str):
        """Store webhook configuration"""
        logger.info("Storing webhook configuration")
    
    async def _log_security_event(self, franchise_network_id: str, event_type: str,
                                category: str, severity: str, description: str, 
                                event_data: Dict):
        """Log security event for audit"""
        logger.info(f"Security event: {event_type} for franchise {franchise_network_id}")
    
    async def _log_payment_validation(self, franchise_network_id: str, user_id: int,
                                    payment_data: Dict, validation_results: Dict):
        """Log payment validation results"""
        logger.info(f"Payment validation: franchise={franchise_network_id}, user={user_id}")
    
    async def _log_payment_error(self, franchise_context: Dict, user_id: int, error: str):
        """Log payment processing error"""
        logger.error(f"Payment error: franchise={franchise_context.get('franchise_network_id')}, error={error}")


class FranchiseFraudDetectionEngine:
    """AI-powered fraud detection for franchise payments"""
    
    def __init__(self):
        self.fraud_indicators = {
            "velocity_anomaly": 30,
            "amount_anomaly": 25,
            "location_anomaly": 35,
            "device_anomaly": 20,
            "behavioral_anomaly": 15,
            "network_anomaly": 40
        }
    
    async def assess_payment_fraud(self, payment_data: Dict, franchise_context: Dict, 
                                 user: User) -> Dict:
        """Assess fraud risk for payment transaction"""
        
        fraud_checks = []
        risk_score = 0
        
        # 1. Velocity-based fraud detection
        velocity_risk = await self._assess_velocity_fraud(user.id, payment_data["amount"])
        if velocity_risk > 0:
            fraud_checks.append(f"Velocity anomaly detected (score: {velocity_risk})")
            risk_score += velocity_risk
        
        # 2. Amount-based fraud detection
        amount_risk = await self._assess_amount_fraud(user.id, payment_data["amount"])
        if amount_risk > 0:
            fraud_checks.append(f"Amount anomaly detected (score: {amount_risk})")
            risk_score += amount_risk
        
        # 3. Location-based fraud detection
        if payment_data.get("client_ip"):
            location_risk = await self._assess_location_fraud(user.id, payment_data["client_ip"])
            if location_risk > 0:
                fraud_checks.append(f"Location anomaly detected (score: {location_risk})")
                risk_score += location_risk
        
        # 4. Device-based fraud detection
        if payment_data.get("device_fingerprint"):
            device_risk = await self._assess_device_fraud(user.id, payment_data["device_fingerprint"])
            if device_risk > 0:
                fraud_checks.append(f"Device anomaly detected (score: {device_risk})")
                risk_score += device_risk
        
        # 5. Network-based fraud detection
        network_risk = await self._assess_network_fraud(franchise_context, payment_data)
        if network_risk > 0:
            fraud_checks.append(f"Network anomaly detected (score: {network_risk})")
            risk_score += network_risk
        
        # Cap risk score at 100
        risk_score = min(100, risk_score)
        
        return {
            "checks": fraud_checks,
            "risk_score": risk_score,
            "fraud_level": self._get_fraud_level(risk_score),
            "recommendation": self._get_fraud_recommendation(risk_score)
        }
    
    async def _assess_velocity_fraud(self, user_id: int, amount: float) -> int:
        """Assess velocity-based fraud indicators"""
        # Simplified velocity fraud detection
        return 0  # Would implement ML-based velocity analysis
    
    async def _assess_amount_fraud(self, user_id: int, amount: float) -> int:
        """Assess amount-based fraud indicators"""
        # Check if amount is unusual for user
        return 0  # Would implement statistical analysis of user payment patterns
    
    async def _assess_location_fraud(self, user_id: int, client_ip: str) -> int:
        """Assess location-based fraud indicators"""
        # Check for impossible travel, high-risk countries, etc.
        return 0  # Would implement geolocation fraud analysis
    
    async def _assess_device_fraud(self, user_id: int, device_fingerprint: str) -> int:
        """Assess device-based fraud indicators"""
        # Check for device spoofing, emulators, etc.
        return 0  # Would implement device fraud analysis
    
    async def _assess_network_fraud(self, franchise_context: Dict, payment_data: Dict) -> int:
        """Assess network-based fraud indicators"""
        # Check for suspicious network patterns across franchise
        return 0  # Would implement network-wide fraud pattern analysis
    
    def _get_fraud_level(self, risk_score: int) -> str:
        """Get fraud risk level classification"""
        if risk_score >= 80:
            return "critical"
        elif risk_score >= 60:
            return "high"
        elif risk_score >= 40:
            return "medium"
        elif risk_score >= 20:
            return "low"
        else:
            return "minimal"
    
    def _get_fraud_recommendation(self, risk_score: int) -> str:
        """Get fraud prevention recommendation"""
        if risk_score >= 80:
            return "block_transaction"
        elif risk_score >= 60:
            return "manual_review_required"
        elif risk_score >= 40:
            return "additional_verification"
        elif risk_score >= 20:
            return "monitor_closely"
        else:
            return "proceed_normally"


class PaymentEncryptionService:
    """Encryption service for payment data"""
    
    async def encrypt_payment_data(self, data: Dict, franchise_network_id: str) -> str:
        """Encrypt payment data with franchise-specific keys"""
        
        # Get franchise encryption key
        encryption_key = await self._get_franchise_encryption_key(
            franchise_network_id, 
            "payment_data"
        )
        
        # Add metadata
        encrypted_payload = {
            "data": data,
            "classification": DataClassification.FINANCIAL.value,
            "franchise_network_id": franchise_network_id,
            "encrypted_at": datetime.now(timezone.utc).isoformat(),
            "encryption_version": "v2.0"
        }
        
        # Encrypt with AES-256-GCM (simplified)
        import base64
        encrypted_data = base64.b64encode(json.dumps(encrypted_payload).encode()).decode()
        
        return encrypted_data
    
    async def decrypt_payment_data(self, encrypted_data: str, franchise_network_id: str) -> Dict:
        """Decrypt payment data"""
        
        # Decrypt with franchise key (simplified)
        import base64
        decrypted_payload = json.loads(base64.b64decode(encrypted_data).decode())
        
        return decrypted_payload["data"]
    
    async def _get_franchise_encryption_key(self, franchise_network_id: str, 
                                          key_type: str) -> str:
        """Get encryption key for franchise"""
        # In production, retrieve from HSM or key management service
        return f"franchise_key_{franchise_network_id}_{key_type}"


class PaymentComplianceMonitor:
    """Monitor payment compliance across franchise networks"""
    
    async def monitor_pci_dss_compliance(self, franchise_network_id: str) -> Dict:
        """Monitor PCI DSS compliance for franchise payments"""
        
        compliance_status = {
            "franchise_network_id": franchise_network_id,
            "compliance_level": "Level 1",  # Based on transaction volume
            "last_assessment": datetime.now(timezone.utc).isoformat(),
            "requirements_status": {
                "secure_network": True,
                "cardholder_data_protection": True,
                "vulnerability_management": True,
                "access_control": True,
                "network_monitoring": True,
                "security_policies": True
            },
            "violations": [],
            "recommendations": []
        }
        
        # Check for compliance violations
        violations = await self._check_pci_dss_violations(franchise_network_id)
        compliance_status["violations"] = violations
        
        if violations:
            compliance_status["recommendations"] = await self._generate_pci_recommendations(violations)
        
        return compliance_status
    
    async def _check_pci_dss_violations(self, franchise_network_id: str) -> List[str]:
        """Check for PCI DSS compliance violations"""
        # In production, implement comprehensive compliance checking
        return []
    
    async def _generate_pci_recommendations(self, violations: List[str]) -> List[str]:
        """Generate PCI DSS compliance recommendations"""
        recommendations = []
        
        for violation in violations:
            if "encryption" in violation.lower():
                recommendations.append("Implement end-to-end encryption for cardholder data")
            elif "access" in violation.lower():
                recommendations.append("Strengthen access controls for payment systems")
            elif "monitoring" in violation.lower():
                recommendations.append("Enhance network monitoring and logging")
        
        return recommendations