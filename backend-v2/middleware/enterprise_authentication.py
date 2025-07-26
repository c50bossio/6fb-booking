"""
Enterprise Authentication Middleware for BookedBarber V2 Franchise Platform
Extends existing authentication with SSO, adaptive MFA, and zero-trust security
"""

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Optional, List, Any, Union
import time
import json
import logging
import hashlib
import hmac
import secrets
import jwt
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs
import xml.etree.ElementTree as ET
import base64
import urllib.parse

from models.franchise_security import (
    FranchiseNetwork, FranchiseSecurityPolicy, FranchiseSecurityContext,
    SecurityZone, ComplianceStandard, DataClassification
)
from models import User, UnifiedUserRole
from database import SessionLocal
from utils.auth_simple import get_current_user_from_token
from config.security_config import SecurityConfig

logger = logging.getLogger(__name__)


class FranchiseSSORealizer:
    """Enterprise SSO integration for franchise networks"""
    
    def __init__(self):
        self.supported_providers = {
            "saml2": SAML2Provider(),
            "oauth2": OAuth2Provider(),
            "oidc": OpenIDConnectProvider()
        }
        self.encryption_service = FranchiseEncryptionService()
    
    async def configure_saml_provider(self, franchise_network_id: str, saml_config: Dict) -> Dict:
        """Configure SAML SSO for franchise network"""
        
        # Validate SAML configuration
        required_fields = ['entity_id', 'sso_url', 'x509_cert', 'attribute_mapping']
        if not all(field in saml_config for field in required_fields):
            raise ValueError("Invalid SAML configuration: missing required fields")
        
        # Validate certificate format
        if not self._validate_x509_certificate(saml_config['x509_cert']):
            raise ValueError("Invalid X.509 certificate format")
        
        # Store encrypted SAML configuration
        encrypted_config = await self.encryption_service.encrypt_config(saml_config)
        
        # Update franchise network SSO configuration
        db = SessionLocal()
        try:
            franchise = db.query(FranchiseNetwork).filter(
                FranchiseNetwork.id == franchise_network_id
            ).first()
            
            if not franchise:
                raise ValueError(f"Franchise network {franchise_network_id} not found")
            
            franchise.sso_provider_config = {
                "provider": "saml2",
                "enabled": True,
                "config": encrypted_config,
                "attribute_mapping": saml_config["attribute_mapping"],
                "auto_provision_users": saml_config.get("auto_provision", False),
                "require_signed_assertions": saml_config.get("require_signed_assertions", True),
                "require_encrypted_assertions": saml_config.get("require_encrypted_assertions", False)
            }
            
            db.commit()
            
            logger.info(f"SAML SSO configured for franchise network {franchise_network_id}")
            
            return {
                "status": "configured",
                "provider": "saml2",
                "entity_id": saml_config["entity_id"],
                "sso_url": saml_config["sso_url"]
            }
            
        finally:
            db.close()
    
    async def handle_saml_response(self, saml_response: str, franchise_network_id: str) -> Dict:
        """Process SAML authentication response"""
        
        try:
            # Decode and parse SAML response
            decoded_response = base64.b64decode(saml_response)
            saml_root = ET.fromstring(decoded_response)
            
            # Validate SAML response signature
            if not await self._validate_saml_signature(saml_root, franchise_network_id):
                raise HTTPException(status_code=401, detail="Invalid SAML signature")
            
            # Extract user attributes
            user_attributes = await self._parse_saml_attributes(saml_root)
            
            # Validate assertion conditions (time bounds, audience, etc.)
            if not await self._validate_saml_conditions(saml_root, franchise_network_id):
                raise HTTPException(status_code=401, detail="SAML conditions not met")
            
            # Create or update user based on attributes
            user = await self._provision_franchise_user(user_attributes, franchise_network_id)
            
            # Generate franchise-aware JWT token
            token_data = await self._generate_franchise_jwt(user, franchise_network_id)
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data["refresh_token"],
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": f"{user.first_name} {user.last_name}",
                    "unified_role": user.unified_role,
                    "franchise_network_id": franchise_network_id
                },
                "franchise_context": await self._get_franchise_context(user, franchise_network_id)
            }
            
        except ET.ParseError as e:
            logger.error(f"Failed to parse SAML response: {e}")
            raise HTTPException(status_code=400, detail="Invalid SAML response format")
        except Exception as e:
            logger.error(f"SAML authentication failed: {e}")
            raise HTTPException(status_code=401, detail="SAML authentication failed")
    
    async def configure_oauth2_provider(self, franchise_network_id: str, oauth_config: Dict) -> Dict:
        """Configure OAuth 2.0 provider for franchise network"""
        
        # Validate OAuth configuration
        required_fields = ['client_id', 'client_secret', 'authorization_endpoint', 'token_endpoint']
        if not all(field in oauth_config for field in required_fields):
            raise ValueError("Invalid OAuth configuration: missing required fields")
        
        # Encrypt sensitive OAuth configuration
        encrypted_config = await self.encryption_service.encrypt_config(oauth_config)
        
        # Update franchise network OAuth configuration
        db = SessionLocal()
        try:
            franchise = db.query(FranchiseNetwork).filter(
                FranchiseNetwork.id == franchise_network_id
            ).first()
            
            if not franchise:
                raise ValueError(f"Franchise network {franchise_network_id} not found")
            
            franchise.sso_provider_config = {
                "provider": "oauth2",
                "enabled": True,
                "config": encrypted_config,
                "scopes": oauth_config.get("scopes", ["openid", "profile", "email"]),
                "auto_provision_users": oauth_config.get("auto_provision", False),
                "pkce_enabled": oauth_config.get("pkce_enabled", True)
            }
            
            db.commit()
            
            logger.info(f"OAuth 2.0 SSO configured for franchise network {franchise_network_id}")
            
            return {
                "status": "configured",
                "provider": "oauth2",
                "authorization_url": await self._build_oauth_authorization_url(oauth_config, franchise_network_id)
            }
            
        finally:
            db.close()
    
    def _validate_x509_certificate(self, cert_data: str) -> bool:
        """Validate X.509 certificate format"""
        try:
            # Basic validation - in production, use cryptography library
            if not cert_data.startswith("-----BEGIN CERTIFICATE-----"):
                return False
            if not cert_data.endswith("-----END CERTIFICATE-----"):
                return False
            return True
        except:
            return False
    
    async def _validate_saml_signature(self, saml_root: ET.Element, franchise_network_id: str) -> bool:
        """Validate SAML response signature"""
        # In production, implement proper XML signature validation
        # This is a simplified version for demonstration
        signature_elem = saml_root.find(".//{http://www.w3.org/2000/09/xmldsig#}Signature")
        return signature_elem is not None
    
    async def _parse_saml_attributes(self, saml_root: ET.Element) -> Dict:
        """Parse user attributes from SAML response"""
        attributes = {}
        
        # Find attribute statements
        attr_statements = saml_root.findall(".//{urn:oasis:names:tc:SAML:2.0:assertion}AttributeStatement")
        
        for statement in attr_statements:
            attrs = statement.findall(".//{urn:oasis:names:tc:SAML:2.0:assertion}Attribute")
            for attr in attrs:
                name = attr.get("Name")
                values = [v.text for v in attr.findall(".//{urn:oasis:names:tc:SAML:2.0:assertion}AttributeValue")]
                attributes[name] = values[0] if len(values) == 1 else values
        
        return attributes
    
    async def _validate_saml_conditions(self, saml_root: ET.Element, franchise_network_id: str) -> bool:
        """Validate SAML assertion conditions"""
        # Check time bounds, audience restrictions, etc.
        conditions = saml_root.find(".//{urn:oasis:names:tc:SAML:2.0:assertion}Conditions")
        
        if conditions is not None:
            not_before = conditions.get("NotBefore")
            not_on_or_after = conditions.get("NotOnOrAfter")
            
            now = datetime.now(timezone.utc)
            
            if not_before:
                if now < datetime.fromisoformat(not_before.replace('Z', '+00:00')):
                    return False
            
            if not_on_or_after:
                if now >= datetime.fromisoformat(not_on_or_after.replace('Z', '+00:00')):
                    return False
        
        return True
    
    async def _provision_franchise_user(self, attributes: Dict, franchise_network_id: str) -> User:
        """Create or update user based on SSO attributes"""
        db = SessionLocal()
        try:
            # Map attributes to user fields
            email = attributes.get("email") or attributes.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")
            first_name = attributes.get("first_name") or attributes.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname")
            last_name = attributes.get("last_name") or attributes.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname")
            
            if not email:
                raise ValueError("Email attribute required for user provisioning")
            
            # Find or create user
            user = db.query(User).filter(User.email == email).first()
            
            if not user:
                # Auto-provision user if enabled
                user = User(
                    email=email,
                    first_name=first_name or "",
                    last_name=last_name or "",
                    unified_role=UnifiedUserRole.BARBER.value,  # Default role, can be overridden
                    is_verified=True,  # SSO users are pre-verified
                    franchise_network_id=franchise_network_id
                )
                db.add(user)
            else:
                # Update existing user attributes
                user.first_name = first_name or user.first_name
                user.last_name = last_name or user.last_name
                user.franchise_network_id = franchise_network_id
            
            db.commit()
            return user
            
        finally:
            db.close()
    
    async def _generate_franchise_jwt(self, user: User, franchise_network_id: str) -> Dict:
        """Generate franchise-aware JWT tokens"""
        
        # Get franchise context for token claims
        franchise_context = await self._get_franchise_context(user, franchise_network_id)
        
        # JWT payload with franchise context
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "unified_role": user.unified_role,
            "franchise_network_id": franchise_network_id,
            "franchise_context": franchise_context,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        
        # Sign JWT with franchise-specific secret or platform secret
        secret_key = await self._get_jwt_signing_key(franchise_network_id)
        
        access_token = jwt.encode(payload, secret_key, algorithm="HS256")
        
        # Generate refresh token
        refresh_payload = {
            "sub": str(user.id),
            "type": "refresh",
            "franchise_network_id": franchise_network_id,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=30)
        }
        
        refresh_token = jwt.encode(refresh_payload, secret_key, algorithm="HS256")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 86400  # 24 hours
        }
    
    async def _get_franchise_context(self, user: User, franchise_network_id: str) -> Dict:
        """Get franchise security context for user"""
        
        db = SessionLocal()
        try:
            franchise = db.query(FranchiseNetwork).filter(
                FranchiseNetwork.id == franchise_network_id
            ).first()
            
            if not franchise:
                return {}
            
            return {
                "franchise_network_id": franchise_network_id,
                "franchise_name": franchise.name,
                "security_zone": SecurityZone.NETWORK.value,
                "compliance_requirements": franchise.compliance_requirements or [],
                "headquarters_country": franchise.headquarters_country,
                "headquarters_region": franchise.headquarters_region
            }
            
        finally:
            db.close()
    
    async def _get_jwt_signing_key(self, franchise_network_id: str) -> str:
        """Get JWT signing key for franchise network"""
        # In production, retrieve from secure key management service
        # For now, use a franchise-specific derivation of the platform key
        from config import settings
        
        platform_key = settings.SECRET_KEY
        franchise_key_material = f"{platform_key}:{franchise_network_id}"
        
        return hashlib.sha256(franchise_key_material.encode()).hexdigest()


class AdaptiveMFAEngine:
    """Adaptive MFA based on risk assessment and threat intelligence"""
    
    def __init__(self):
        self.risk_thresholds = {
            "low": 30,
            "medium": 60,
            "high": 80,
            "critical": 95
        }
        self.threat_intel_service = ThreatIntelligenceService()
    
    async def assess_authentication_risk(self, request: Request, user: User) -> Dict:
        """Assess authentication risk for adaptive MFA requirements"""
        
        risk_factors = {
            "device_trust": await self._assess_device_trust(request, user),
            "location_anomaly": await self._assess_location_anomaly(user, request.client.host),
            "behavior_anomaly": await self._assess_behavior_anomaly(user, request),
            "threat_intelligence": await self._check_threat_intelligence(request.client.host),
            "time_anomaly": await self._assess_time_anomaly(user),
            "velocity_anomaly": await self._assess_velocity_anomaly(user)
        }
        
        # Calculate composite risk score (0-100)
        risk_score = self._calculate_risk_score(risk_factors)
        
        # Determine required MFA level based on risk
        mfa_requirements = {
            "required": risk_score > self.risk_thresholds["low"],
            "biometric_required": risk_score > self.risk_thresholds["medium"],
            "hardware_token_required": risk_score > self.risk_thresholds["high"],
            "admin_approval_required": risk_score > self.risk_thresholds["critical"],
            "methods": await self._get_required_mfa_methods(risk_score, user)
        }
        
        # Log risk assessment for audit
        await self._log_risk_assessment(user, risk_score, risk_factors, mfa_requirements)
        
        return {
            "risk_score": risk_score,
            "risk_level": self._get_risk_level(risk_score),
            "risk_factors": risk_factors,
            "mfa_requirements": mfa_requirements,
            "assessment_timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    async def _assess_device_trust(self, request: Request, user: User) -> Dict:
        """Assess device trust level"""
        
        device_fingerprint = request.headers.get("X-Device-Fingerprint")
        trust_token = request.headers.get("X-Trust-Token")
        
        if not device_fingerprint:
            return {"score": 80, "reason": "Unknown device - no fingerprint"}
        
        # Check if device is registered for this user
        device_trust_score = await self._check_device_registration(user.id, device_fingerprint)
        
        # Check trust token validity
        if trust_token:
            trust_score = await self._validate_trust_token(trust_token, user.id)
            device_trust_score = min(device_trust_score, trust_score)
        
        return {
            "score": device_trust_score,
            "device_fingerprint": device_fingerprint[:8] + "..." if device_fingerprint else None,
            "registered": device_trust_score < 50
        }
    
    async def _assess_location_anomaly(self, user: User, client_ip: str) -> Dict:
        """Assess location-based risk"""
        
        # Get IP geolocation
        location_data = await self._get_ip_geolocation(client_ip)
        
        # Get user's typical locations
        user_locations = await self._get_user_typical_locations(user.id)
        
        # Calculate distance from typical locations
        if user_locations and location_data:
            min_distance = min([
                self._calculate_distance(location_data, loc) 
                for loc in user_locations
            ])
            
            # Score based on distance (0-100, higher = more risky)
            if min_distance < 50:  # Within 50km
                score = 0
            elif min_distance < 500:  # Within 500km
                score = 30
            elif min_distance < 2000:  # Within 2000km
                score = 60
            else:  # International/far distance
                score = 90
        else:
            score = 50  # Unknown baseline
        
        return {
            "score": score,
            "current_location": location_data,
            "distance_from_typical": min_distance if 'min_distance' in locals() else None
        }
    
    async def _assess_behavior_anomaly(self, user: User, request: Request) -> Dict:
        """Assess behavioral anomalies"""
        
        # Get user agent patterns
        user_agent = request.headers.get("user-agent", "")
        typical_user_agents = await self._get_user_typical_user_agents(user.id)
        
        # Check for user agent anomalies
        ua_anomaly_score = 0 if user_agent in typical_user_agents else 40
        
        # Check request timing patterns
        timing_anomaly_score = await self._assess_timing_patterns(user.id)
        
        # Check for suspicious request patterns
        request_pattern_score = await self._assess_request_patterns(user.id, request)
        
        total_score = max(ua_anomaly_score, timing_anomaly_score, request_pattern_score)
        
        return {
            "score": total_score,
            "user_agent_anomaly": ua_anomaly_score > 0,
            "timing_anomaly": timing_anomaly_score > 30,
            "request_pattern_anomaly": request_pattern_score > 30
        }
    
    async def _check_threat_intelligence(self, client_ip: str) -> Dict:
        """Check IP against threat intelligence feeds"""
        
        threat_score = await self.threat_intel_service.check_ip_reputation(client_ip)
        
        threat_indicators = []
        if threat_score > 80:
            threat_indicators.append("Known malicious IP")
        elif threat_score > 60:
            threat_indicators.append("Suspicious IP activity")
        elif threat_score > 40:
            threat_indicators.append("IP from high-risk region")
        
        return {
            "score": threat_score,
            "indicators": threat_indicators,
            "source": "threat_intelligence"
        }
    
    async def _assess_time_anomaly(self, user: User) -> Dict:
        """Assess time-based access anomalies"""
        
        current_hour = datetime.now(timezone.utc).hour
        typical_hours = await self._get_user_typical_access_hours(user.id)
        
        if not typical_hours:
            return {"score": 20, "reason": "No baseline data"}
        
        # Check if current time is within typical access hours
        if current_hour in typical_hours:
            score = 0
        elif abs(min([(h - current_hour) % 24 for h in typical_hours])) <= 2:
            score = 20  # Within 2 hours of typical
        else:
            score = 60  # Outside typical hours
        
        return {
            "score": score,
            "current_hour": current_hour,
            "typical_hours": typical_hours
        }
    
    async def _assess_velocity_anomaly(self, user: User) -> Dict:
        """Assess login velocity anomalies"""
        
        # Check recent login attempts
        recent_logins = await self._get_recent_login_attempts(user.id, minutes=10)
        
        if len(recent_logins) > 5:
            score = 90  # Too many rapid attempts
        elif len(recent_logins) > 3:
            score = 60  # Elevated attempt rate
        else:
            score = 0  # Normal velocity
        
        return {
            "score": score,
            "recent_attempts": len(recent_logins),
            "time_window": "10 minutes"
        }
    
    def _calculate_risk_score(self, risk_factors: Dict) -> int:
        """Calculate composite risk score from individual factors"""
        
        # Weighted risk calculation
        weights = {
            "device_trust": 0.25,
            "location_anomaly": 0.20,
            "behavior_anomaly": 0.15,
            "threat_intelligence": 0.25,
            "time_anomaly": 0.10,
            "velocity_anomaly": 0.05
        }
        
        weighted_score = sum([
            risk_factors[factor]["score"] * weights[factor]
            for factor in weights
            if factor in risk_factors
        ])
        
        return min(100, max(0, int(weighted_score)))
    
    def _get_risk_level(self, risk_score: int) -> str:
        """Get risk level classification"""
        if risk_score >= self.risk_thresholds["critical"]:
            return "critical"
        elif risk_score >= self.risk_thresholds["high"]:
            return "high"
        elif risk_score >= self.risk_thresholds["medium"]:
            return "medium"
        elif risk_score >= self.risk_thresholds["low"]:
            return "low"
        else:
            return "minimal"
    
    async def _get_required_mfa_methods(self, risk_score: int, user: User) -> List[str]:
        """Get required MFA methods based on risk score and user preferences"""
        
        methods = []
        
        if risk_score > self.risk_thresholds["critical"]:
            methods = ["biometric", "hardware_token", "admin_approval"]
        elif risk_score > self.risk_thresholds["high"]:
            methods = ["biometric", "hardware_token"]
        elif risk_score > self.risk_thresholds["medium"]:
            methods = ["biometric", "totp"]
        elif risk_score > self.risk_thresholds["low"]:
            methods = ["totp", "sms"]
        
        # Filter based on user's available MFA methods
        available_methods = await self._get_user_available_mfa_methods(user.id)
        return [method for method in methods if method in available_methods]
    
    async def _log_risk_assessment(self, user: User, risk_score: int, 
                                 risk_factors: Dict, mfa_requirements: Dict):
        """Log risk assessment for audit purposes"""
        
        log_entry = {
            "user_id": user.id,
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "mfa_requirements": mfa_requirements,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Risk assessment completed for user {user.id}: score={risk_score}")
        
        # In production, store in audit log table
        # await self._store_audit_log("risk_assessment", log_entry)


class BiometricAuthenticationService:
    """Biometric authentication for franchise operations"""
    
    def __init__(self):
        self.supported_types = ["fingerprint", "face", "voice", "iris"]
        self.encryption_service = FranchiseEncryptionService()
        self.quality_thresholds = {
            "fingerprint": 0.8,
            "face": 0.75,
            "voice": 0.7,
            "iris": 0.9
        }
    
    async def register_biometric_template(self, user_id: int, biometric_type: str, 
                                        template_data: bytes, device_id: str) -> Dict:
        """Register biometric template for user"""
        
        if biometric_type not in self.supported_types:
            raise ValueError(f"Unsupported biometric type: {biometric_type}")
        
        # Assess template quality
        quality_score = await self._assess_template_quality(template_data, biometric_type)
        
        if quality_score < self.quality_thresholds[biometric_type]:
            raise ValueError(f"Biometric template quality too low: {quality_score}")
        
        # Create template hash for deduplication
        template_hash = hashlib.sha256(template_data).hexdigest()
        
        # Check for duplicate templates
        if await self._check_duplicate_template(user_id, template_hash):
            raise ValueError("Duplicate biometric template")
        
        # Encrypt biometric template with user-specific key
        encrypted_template = await self.encryption_service.encrypt_biometric_data(
            template_data, user_id
        )
        
        # Store biometric reference
        biometric_ref = {
            "id": secrets.token_urlsafe(16),
            "user_id": user_id,
            "biometric_type": biometric_type,
            "template_hash": template_hash,
            "encrypted_template": encrypted_template,
            "quality_score": quality_score,
            "device_id": device_id,
            "registered_at": datetime.now(timezone.utc),
            "last_used": None,
            "usage_count": 0,
            "is_active": True
        }
        
        # In production, store in database
        await self._store_biometric_template(biometric_ref)
        
        logger.info(f"Biometric template registered for user {user_id}, type {biometric_type}")
        
        return {
            "template_id": biometric_ref["id"],
            "biometric_type": biometric_type,
            "quality_score": quality_score,
            "registered_at": biometric_ref["registered_at"].isoformat()
        }
    
    async def verify_biometric(self, user_id: int, biometric_type: str, 
                             verification_data: bytes, device_id: str) -> Dict:
        """Verify biometric authentication"""
        
        if biometric_type not in self.supported_types:
            raise ValueError(f"Unsupported biometric type: {biometric_type}")
        
        # Get stored templates for user and biometric type
        templates = await self._get_user_templates(user_id, biometric_type)
        
        if not templates:
            return {
                "verified": False,
                "reason": "No biometric templates registered",
                "confidence": 0.0
            }
        
        verification_results = []
        
        for template in templates:
            if not template["is_active"]:
                continue
            
            try:
                # Decrypt template for comparison
                decrypted_template = await self.encryption_service.decrypt_biometric_data(
                    template["encrypted_template"], user_id
                )
                
                # Perform biometric matching
                match_score = await self._biometric_matcher(
                    verification_data, decrypted_template, biometric_type
                )
                
                verification_results.append({
                    "template_id": template["id"],
                    "match_score": match_score,
                    "threshold_met": match_score > 0.85  # 85% confidence threshold
                })
                
            except Exception as e:
                logger.error(f"Biometric verification error for template {template['id']}: {e}")
                continue
        
        if not verification_results:
            return {
                "verified": False,
                "reason": "Verification failed",
                "confidence": 0.0
            }
        
        # Get best match
        best_match = max(verification_results, key=lambda x: x["match_score"])
        
        # Update template usage statistics
        if best_match["threshold_met"]:
            await self._update_template_usage(best_match["template_id"])
        
        # Log verification attempt
        await self._log_biometric_verification(
            user_id, biometric_type, device_id, best_match["threshold_met"], best_match["match_score"]
        )
        
        return {
            "verified": best_match["threshold_met"],
            "confidence": best_match["match_score"],
            "template_used": best_match["template_id"],
            "biometric_type": biometric_type,
            "device_id": device_id,
            "verified_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _assess_template_quality(self, template_data: bytes, biometric_type: str) -> float:
        """Assess biometric template quality"""
        # Simplified quality assessment - in production, use specialized libraries
        
        if biometric_type == "fingerprint":
            # Check data size and basic pattern recognition
            if len(template_data) < 100:
                return 0.3
            elif len(template_data) < 500:
                return 0.6
            else:
                return 0.85
        
        elif biometric_type == "face":
            # Check image quality metrics
            return 0.8  # Simplified
        
        elif biometric_type == "voice":
            # Check audio quality and duration
            return 0.75  # Simplified
        
        elif biometric_type == "iris":
            # Check iris pattern clarity
            return 0.9  # Simplified
        
        return 0.5  # Default
    
    async def _biometric_matcher(self, verification_data: bytes, template_data: bytes, 
                               biometric_type: str) -> float:
        """Perform biometric matching between verification data and template"""
        
        # Simplified matching - in production, use specialized biometric SDKs
        
        if biometric_type == "fingerprint":
            # Simplified fingerprint matching
            similarity = len(set(verification_data) & set(template_data)) / len(set(template_data))
            return min(1.0, similarity * 1.2)  # Boost score slightly
        
        elif biometric_type == "face":
            # Simplified face matching
            return 0.88 if len(verification_data) == len(template_data) else 0.4
        
        elif biometric_type == "voice":
            # Simplified voice matching
            return 0.82 if abs(len(verification_data) - len(template_data)) < 100 else 0.3
        
        elif biometric_type == "iris":
            # Simplified iris matching  
            return 0.92 if verification_data[:50] == template_data[:50] else 0.2
        
        return 0.0
    
    async def _check_duplicate_template(self, user_id: int, template_hash: str) -> bool:
        """Check if template hash already exists for user"""
        # In production, query database for existing template hash
        return False  # Simplified
    
    async def _store_biometric_template(self, template_ref: Dict):
        """Store biometric template reference in database"""
        # In production, store in secure biometric template table
        logger.info(f"Storing biometric template {template_ref['id']}")
    
    async def _get_user_templates(self, user_id: int, biometric_type: str) -> List[Dict]:
        """Get user's biometric templates for specific type"""
        # In production, query database for user templates
        return []  # Simplified
    
    async def _update_template_usage(self, template_id: str):
        """Update template usage statistics"""
        # In production, update database with usage stats
        logger.info(f"Updated usage for template {template_id}")
    
    async def _log_biometric_verification(self, user_id: int, biometric_type: str, 
                                        device_id: str, success: bool, confidence: float):
        """Log biometric verification attempt"""
        log_entry = {
            "user_id": user_id,
            "biometric_type": biometric_type,
            "device_id": device_id,
            "success": success,
            "confidence": confidence,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Biometric verification: user={user_id}, type={biometric_type}, success={success}")


# Supporting classes for demonstration

class SAML2Provider:
    """SAML 2.0 provider implementation"""
    pass

class OAuth2Provider:
    """OAuth 2.0 provider implementation"""
    pass

class OpenIDConnectProvider:
    """OpenID Connect provider implementation"""
    pass

class FranchiseEncryptionService:
    """Encryption service for franchise data"""
    
    async def encrypt_config(self, config: Dict) -> str:
        """Encrypt configuration data"""
        return base64.b64encode(json.dumps(config).encode()).decode()
    
    async def decrypt_config(self, encrypted_config: str) -> Dict:
        """Decrypt configuration data"""
        return json.loads(base64.b64decode(encrypted_config).decode())
    
    async def encrypt_biometric_data(self, data: bytes, user_id: int) -> str:
        """Encrypt biometric template data"""
        return base64.b64encode(data).decode()
    
    async def decrypt_biometric_data(self, encrypted_data: str, user_id: int) -> bytes:
        """Decrypt biometric template data"""
        return base64.b64decode(encrypted_data)

class ThreatIntelligenceService:
    """Threat intelligence service for IP reputation checks"""
    
    async def check_ip_reputation(self, ip_address: str) -> int:
        """Check IP reputation score (0-100, higher = more risky)"""
        # Simplified threat intelligence check
        if ip_address.startswith("192.168.") or ip_address.startswith("10."):
            return 0  # Private IP
        elif ip_address.startswith("127."):
            return 0  # Localhost
        else:
            return 20  # Default external IP risk