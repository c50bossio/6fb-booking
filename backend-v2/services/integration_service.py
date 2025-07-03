"""
Base integration service for managing third-party service integrations.
Provides common functionality for OAuth flows, token management, and health monitoring.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import secrets
import json
import logging

from models.integration import Integration, IntegrationType, IntegrationStatus
from models import User
from schemas_new.integration import (
    IntegrationCreate, 
    IntegrationUpdate, 
    IntegrationResponse,
    OAuthInitiateRequest,
    OAuthCallbackRequest,
    IntegrationHealthCheck
)
from utils.encryption import encrypt_data, decrypt_data


logger = logging.getLogger(__name__)


class BaseIntegrationService(ABC):
    """
    Abstract base class for integration services.
    Provides common functionality for OAuth, token management, and health checks.
    """
    
    def __init__(self, db: Session):
        self.db = db
        
    @property
    @abstractmethod
    def integration_type(self) -> IntegrationType:
        """Return the integration type this service handles"""
        pass
    
    @property
    @abstractmethod
    def oauth_authorize_url(self) -> str:
        """Return the OAuth authorization URL for this integration"""
        pass
    
    @property
    @abstractmethod
    def oauth_token_url(self) -> str:
        """Return the OAuth token exchange URL for this integration"""
        pass
    
    @property
    @abstractmethod
    def required_scopes(self) -> List[str]:
        """Return the required OAuth scopes for this integration"""
        pass
    
    @property
    @abstractmethod
    def client_id(self) -> str:
        """Return the OAuth client ID for this integration"""
        pass
    
    @property
    @abstractmethod
    def client_secret(self) -> str:
        """Return the OAuth client secret for this integration"""
        pass
    
    @property
    @abstractmethod
    def default_redirect_uri(self) -> str:
        """Return the default redirect URI for OAuth callback"""
        pass
    
    @abstractmethod
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access and refresh tokens.
        Must be implemented by each integration service.
        """
        pass
    
    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh the access token using the refresh token.
        Must be implemented by each integration service.
        """
        pass
    
    @abstractmethod
    async def verify_connection(self, integration: Integration) -> Tuple[bool, Optional[str]]:
        """
        Verify that the integration connection is valid.
        Returns (is_valid, error_message).
        """
        pass
    
    def create_integration(self, user_id: int, data: IntegrationCreate) -> Integration:
        """Create a new integration record"""
        try:
            integration = Integration(
                user_id=user_id,
                name=data.name,
                integration_type=data.integration_type,
                config=data.config or {},
                is_active=data.is_active,
                status=IntegrationStatus.PENDING
            )
            
            # Handle non-OAuth integrations with API keys
            if data.api_key:
                integration.api_key = data.api_key
            if data.api_secret:
                integration.api_secret = data.api_secret
            if data.webhook_url:
                integration.webhook_url = str(data.webhook_url)
                
            self.db.add(integration)
            self.db.commit()
            self.db.refresh(integration)
            
            logger.info(f"Created integration {integration.id} of type {integration.integration_type.value} for user {user_id}")
            return integration
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating integration: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create integration: {str(e)}"
            )
    
    def get_integration(self, integration_id: int, user_id: Optional[int] = None) -> Integration:
        """Get an integration by ID with optional user validation"""
        query = self.db.query(Integration).filter(Integration.id == integration_id)
        
        if user_id:
            query = query.filter(Integration.user_id == user_id)
            
        integration = query.first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integration not found"
            )
            
        return integration
    
    def list_user_integrations(self, user_id: int, integration_type: Optional[IntegrationType] = None) -> List[Integration]:
        """List all integrations for a user"""
        query = self.db.query(Integration).filter(Integration.user_id == user_id)
        
        if integration_type:
            query = query.filter(Integration.integration_type == integration_type)
            
        return query.all()
    
    def update_integration(self, integration_id: int, user_id: int, data: IntegrationUpdate) -> Integration:
        """Update an integration"""
        integration = self.get_integration(integration_id, user_id)
        
        if data.name is not None:
            integration.name = data.name
        if data.config is not None:
            integration.config = data.config
        if data.is_active is not None:
            integration.is_active = data.is_active
        if data.webhook_url is not None:
            integration.webhook_url = str(data.webhook_url)
            
        try:
            self.db.commit()
            self.db.refresh(integration)
            return integration
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating integration {integration_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update integration: {str(e)}"
            )
    
    def delete_integration(self, integration_id: int, user_id: int) -> bool:
        """Delete an integration"""
        integration = self.get_integration(integration_id, user_id)
        
        try:
            self.db.delete(integration)
            self.db.commit()
            logger.info(f"Deleted integration {integration_id} for user {user_id}")
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting integration {integration_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete integration: {str(e)}"
            )
    
    def generate_oauth_state(self, user_id: int, integration_id: Optional[int] = None) -> str:
        """Generate a secure state parameter for OAuth"""
        state_data = {
            "user_id": user_id,
            "integration_id": integration_id,
            "timestamp": datetime.utcnow().isoformat(),
            "nonce": secrets.token_urlsafe(16)
        }
        # In production, encrypt this state
        return json.dumps(state_data)
    
    def verify_oauth_state(self, state: str) -> Dict[str, Any]:
        """Verify and decode OAuth state parameter"""
        try:
            # In production, decrypt the state
            state_data = json.loads(state)
            
            # Verify timestamp (e.g., not older than 10 minutes)
            timestamp = datetime.fromisoformat(state_data["timestamp"])
            if datetime.utcnow() - timestamp > timedelta(minutes=10):
                raise ValueError("State parameter expired")
                
            return state_data
        except Exception as e:
            logger.error(f"Invalid OAuth state: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid state parameter"
            )
    
    async def handle_oauth_callback(self, code: str, state: str, redirect_uri: str) -> Integration:
        """Handle OAuth callback and exchange code for tokens"""
        # Verify state
        state_data = self.verify_oauth_state(state)
        user_id = state_data["user_id"]
        integration_id = state_data.get("integration_id")
        
        # Get or create integration
        if integration_id:
            integration = self.get_integration(integration_id, user_id)
        else:
            # Create new integration
            integration_data = IntegrationCreate(
                name=f"{self.integration_type.value} Integration",
                integration_type=self.integration_type,
                is_active=True
            )
            integration = self.create_integration(user_id, integration_data)
        
        try:
            # Exchange code for tokens
            token_data = await self.exchange_code_for_tokens(code, redirect_uri)
            
            # Store tokens (encrypted)
            integration.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                integration.refresh_token = token_data["refresh_token"]
            
            # Calculate token expiration
            if "expires_in" in token_data:
                integration.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
            
            # Store granted scopes
            if "scope" in token_data:
                integration.scopes = token_data["scope"].split() if isinstance(token_data["scope"], str) else token_data["scope"]
            
            # Mark as active
            integration.status = IntegrationStatus.ACTIVE
            integration.last_sync_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(integration)
            
            logger.info(f"Successfully connected integration {integration.id} for user {user_id}")
            return integration
            
        except Exception as e:
            integration.mark_error(f"OAuth callback failed: {str(e)}")
            self.db.commit()
            logger.error(f"OAuth callback failed for integration {integration.id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to complete OAuth flow: {str(e)}"
            )
    
    async def refresh_token_if_needed(self, integration: Integration) -> bool:
        """Refresh access token if expired or about to expire"""
        if not integration.refresh_token:
            return False
            
        # Check if token needs refresh (5 minutes buffer)
        if integration.token_expires_at:
            if datetime.utcnow() + timedelta(minutes=5) < integration.token_expires_at:
                return False
        
        try:
            # Refresh the token
            token_data = await self.refresh_access_token(integration.refresh_token)
            
            # Update tokens
            integration.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                integration.refresh_token = token_data["refresh_token"]
            
            # Update expiration
            if "expires_in" in token_data:
                integration.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
            
            integration.status = IntegrationStatus.ACTIVE
            self.db.commit()
            
            logger.info(f"Successfully refreshed token for integration {integration.id}")
            return True
            
        except Exception as e:
            integration.mark_error(f"Token refresh failed: {str(e)}")
            self.db.commit()
            logger.error(f"Token refresh failed for integration {integration.id}: {str(e)}")
            return False
    
    async def perform_health_check(self, integration: Integration) -> IntegrationHealthCheck:
        """Perform health check on the integration"""
        try:
            # Refresh token if needed
            await self.refresh_token_if_needed(integration)
            
            # Verify connection
            is_valid, error_message = await self.verify_connection(integration)
            
            health_data = {
                "healthy": is_valid,
                "error": error_message,
                "checked_at": datetime.utcnow().isoformat()
            }
            
            # Update integration health status
            integration.update_health_check(health_data)
            self.db.commit()
            
            return IntegrationHealthCheck(
                integration_id=integration.id,
                integration_type=integration.integration_type,
                name=integration.name,
                status=integration.status,
                healthy=is_valid,
                last_check=datetime.utcnow(),
                details=health_data,
                error=error_message
            )
            
        except Exception as e:
            logger.error(f"Health check failed for integration {integration.id}: {str(e)}")
            
            health_data = {
                "healthy": False,
                "error": str(e),
                "checked_at": datetime.utcnow().isoformat()
            }
            
            integration.update_health_check(health_data)
            self.db.commit()
            
            return IntegrationHealthCheck(
                integration_id=integration.id,
                integration_type=integration.integration_type,
                name=integration.name,
                status=IntegrationStatus.ERROR,
                healthy=False,
                last_check=datetime.utcnow(),
                details=health_data,
                error=str(e)
            )


class IntegrationServiceFactory:
    """Factory for creating integration service instances"""
    
    _services: Dict[IntegrationType, type] = {}
    
    @classmethod
    def register(cls, integration_type: IntegrationType, service_class: type):
        """Register an integration service class"""
        cls._services[integration_type] = service_class
    
    @classmethod
    def create(cls, integration_type: IntegrationType, db: Session) -> BaseIntegrationService:
        """Create an integration service instance"""
        service_class = cls._services.get(integration_type)
        if not service_class:
            raise ValueError(f"No service registered for integration type: {integration_type}")
        return service_class(db)