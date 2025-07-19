"""
Authentication and Authorization for AI Agent Operations
Production-grade security for agent endpoints and operations
"""

import hashlib
import hmac
import jwt
import secrets
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Set, Any, Callable
from functools import wraps
import logging
from dataclasses import dataclass, asdict
import sqlite3
from pathlib import Path

from .agent_error_handler import AuthenticationError, ValidationError, with_retry


class AgentRole(Enum):
    """Agent system roles with different permission levels"""
    SYSTEM_AGENT = "system_agent"          # Full system access
    CONVERSATION_AGENT = "conversation_agent"  # Client interaction only
    ANALYTICS_AGENT = "analytics_agent"    # Read-only analytics access
    SUPPORT_AGENT = "support_agent"        # Limited support operations
    READONLY_AGENT = "readonly_agent"      # Read-only access


class Permission(Enum):
    """Granular permissions for agent operations"""
    # Client operations
    READ_CLIENT_DATA = "read_client_data"
    WRITE_CLIENT_DATA = "write_client_data"
    DELETE_CLIENT_DATA = "delete_client_data"
    
    # Appointment operations
    READ_APPOINTMENTS = "read_appointments"
    CREATE_APPOINTMENTS = "create_appointments"
    MODIFY_APPOINTMENTS = "modify_appointments"
    CANCEL_APPOINTMENTS = "cancel_appointments"
    
    # Payment operations
    READ_PAYMENTS = "read_payments"
    PROCESS_PAYMENTS = "process_payments"
    REFUND_PAYMENTS = "refund_payments"
    
    # Analytics operations
    READ_ANALYTICS = "read_analytics"
    GENERATE_REPORTS = "generate_reports"
    
    # System operations
    MANAGE_AGENTS = "manage_agents"
    ACCESS_LOGS = "access_logs"
    SYSTEM_CONFIG = "system_config"
    
    # Communication operations
    SEND_EMAILS = "send_emails"
    SEND_SMS = "send_sms"
    SEND_NOTIFICATIONS = "send_notifications"


@dataclass
class AgentCredentials:
    """Agent authentication credentials"""
    agent_id: str
    api_key: str
    role: AgentRole
    permissions: Set[Permission]
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    is_active: bool = True
    rate_limit_per_hour: int = 1000
    allowed_ips: List[str] = None


@dataclass
class AuthenticationContext:
    """Context for authenticated agent operations"""
    agent_id: str
    role: AgentRole
    permissions: Set[Permission]
    session_id: str
    client_ip: str
    user_agent: str
    authenticated_at: datetime
    expires_at: datetime


class TokenType(Enum):
    ACCESS_TOKEN = "access"
    REFRESH_TOKEN = "refresh"
    API_KEY = "api_key"


class RateLimiter:
    """Rate limiting for agent API calls"""
    
    def __init__(self, db_path: str = "agent_rate_limits.db"):
        self.db_path = db_path
        self.logger = logging.getLogger("rate_limiter")
        self._init_database()
    
    def _init_database(self):
        """Initialize rate limiting database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS rate_limits (
                    agent_id TEXT,
                    hour_bucket TEXT,
                    request_count INTEGER DEFAULT 1,
                    PRIMARY KEY (agent_id, hour_bucket)
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_hour_bucket ON rate_limits(hour_bucket)
            """)
    
    def check_rate_limit(self, agent_id: str, limit_per_hour: int) -> tuple[bool, int]:
        """
        Check if agent is within rate limit
        Returns: (is_allowed, requests_remaining)
        """
        current_hour = datetime.now().strftime("%Y-%m-%d-%H")
        
        with sqlite3.connect(self.db_path) as conn:
            # Get current count
            result = conn.execute("""
                SELECT request_count FROM rate_limits 
                WHERE agent_id = ? AND hour_bucket = ?
            """, (agent_id, current_hour)).fetchone()
            
            current_count = result[0] if result else 0
            
            if current_count >= limit_per_hour:
                return False, 0
            
            # Increment counter
            conn.execute("""
                INSERT OR REPLACE INTO rate_limits (agent_id, hour_bucket, request_count)
                VALUES (?, ?, ?)
            """, (agent_id, current_hour, current_count + 1))
            
            remaining = limit_per_hour - (current_count + 1)
            return True, remaining
    
    def reset_rate_limit(self, agent_id: str):
        """Reset rate limit for an agent (admin operation)"""
        current_hour = datetime.now().strftime("%Y-%m-%d-%H")
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                DELETE FROM rate_limits 
                WHERE agent_id = ? AND hour_bucket = ?
            """, (agent_id, current_hour))


class AgentAuthenticator:
    """Main authentication system for AI agents"""
    
    def __init__(self, 
                 secret_key: str = None, 
                 db_path: str = "agent_auth.db",
                 token_expiry_hours: int = 24):
        self.secret_key = secret_key or self._generate_secret_key()
        self.db_path = db_path
        self.token_expiry_hours = token_expiry_hours
        self.rate_limiter = RateLimiter()
        self.logger = logging.getLogger("agent_authenticator")
        
        # In-memory session cache for performance
        self.active_sessions: Dict[str, AuthenticationContext] = {}
        
        # Role-based permission mapping
        self.role_permissions = self._initialize_role_permissions()
        
        # Initialize database
        self._init_database()
        
        # Create default system credentials if none exist
        self._create_default_credentials()
    
    def _generate_secret_key(self) -> str:
        """Generate a secure secret key"""
        return secrets.token_urlsafe(64)
    
    def _initialize_role_permissions(self) -> Dict[AgentRole, Set[Permission]]:
        """Initialize role-based permission mappings"""
        return {
            AgentRole.SYSTEM_AGENT: set(Permission),  # All permissions
            
            AgentRole.CONVERSATION_AGENT: {
                Permission.READ_CLIENT_DATA,
                Permission.READ_APPOINTMENTS,
                Permission.CREATE_APPOINTMENTS,
                Permission.MODIFY_APPOINTMENTS,
                Permission.SEND_EMAILS,
                Permission.SEND_SMS,
                Permission.SEND_NOTIFICATIONS
            },
            
            AgentRole.ANALYTICS_AGENT: {
                Permission.READ_CLIENT_DATA,
                Permission.READ_APPOINTMENTS,
                Permission.READ_PAYMENTS,
                Permission.READ_ANALYTICS,
                Permission.GENERATE_REPORTS
            },
            
            AgentRole.SUPPORT_AGENT: {
                Permission.READ_CLIENT_DATA,
                Permission.READ_APPOINTMENTS,
                Permission.READ_PAYMENTS,
                Permission.SEND_EMAILS,
                Permission.ACCESS_LOGS
            },
            
            AgentRole.READONLY_AGENT: {
                Permission.READ_CLIENT_DATA,
                Permission.READ_APPOINTMENTS,
                Permission.READ_ANALYTICS
            }
        }
    
    def _init_database(self):
        """Initialize authentication database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_credentials (
                    agent_id TEXT PRIMARY KEY,
                    api_key_hash TEXT NOT NULL,
                    role TEXT NOT NULL,
                    permissions TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT,
                    last_used TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    rate_limit_per_hour INTEGER DEFAULT 1000,
                    allowed_ips TEXT,
                    metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS auth_sessions (
                    session_id TEXT PRIMARY KEY,
                    agent_id TEXT NOT NULL,
                    client_ip TEXT,
                    user_agent TEXT,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (agent_id) REFERENCES agent_credentials (agent_id)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS auth_audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT,
                    action TEXT NOT NULL,
                    client_ip TEXT,
                    user_agent TEXT,
                    success BOOLEAN NOT NULL,
                    error_message TEXT,
                    timestamp TEXT NOT NULL
                )
            """)
    
    def _create_default_credentials(self):
        """Create default system agent credentials"""
        try:
            # Check if system agent already exists
            with sqlite3.connect(self.db_path) as conn:
                existing = conn.execute("""
                    SELECT agent_id FROM agent_credentials WHERE role = ?
                """, (AgentRole.SYSTEM_AGENT.value,)).fetchone()
                
                if not existing:
                    # Create system agent
                    system_agent_key = self.create_agent_credentials(
                        agent_id="system_agent_001",
                        role=AgentRole.SYSTEM_AGENT,
                        rate_limit_per_hour=10000  # Higher limit for system operations
                    )
                    
                    self.logger.info(f"Created default system agent with key: {system_agent_key[:20]}...")
                    
        except Exception as e:
            self.logger.error(f"Failed to create default credentials: {e}")
    
    def create_agent_credentials(self, 
                               agent_id: str,
                               role: AgentRole,
                               expires_at: Optional[datetime] = None,
                               rate_limit_per_hour: int = 1000,
                               allowed_ips: List[str] = None) -> str:
        """Create new agent credentials"""
        
        # Validate agent_id
        if not agent_id or len(agent_id) < 3:
            raise ValidationError("Agent ID must be at least 3 characters")
        
        # Generate API key
        api_key = f"ak_{secrets.token_urlsafe(48)}"
        api_key_hash = self._hash_api_key(api_key)
        
        # Get permissions for role
        permissions = self.role_permissions.get(role, set())
        
        # Create credentials record
        credentials = AgentCredentials(
            agent_id=agent_id,
            api_key=api_key,  # We'll store hash, return plain key
            role=role,
            permissions=permissions,
            created_at=datetime.now(),
            expires_at=expires_at,
            rate_limit_per_hour=rate_limit_per_hour,
            allowed_ips=allowed_ips or []
        )
        
        # Store in database
        with sqlite3.connect(self.db_path) as conn:
            # Check if agent already exists
            existing = conn.execute("""
                SELECT agent_id FROM agent_credentials WHERE agent_id = ?
            """, (agent_id,)).fetchone()
            
            if existing:
                raise ValidationError(f"Agent {agent_id} already exists")
            
            conn.execute("""
                INSERT INTO agent_credentials 
                (agent_id, api_key_hash, role, permissions, created_at, expires_at,
                 rate_limit_per_hour, allowed_ips, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                credentials.agent_id,
                api_key_hash,
                credentials.role.value,
                ",".join([p.value for p in credentials.permissions]),
                credentials.created_at.isoformat(),
                credentials.expires_at.isoformat() if credentials.expires_at else None,
                credentials.rate_limit_per_hour,
                ",".join(credentials.allowed_ips),
                "{}"  # Empty metadata for now
            ))
        
        # Log creation
        self._log_auth_event(agent_id, "credentials_created", None, None, True)
        
        return api_key
    
    def authenticate_agent(self, 
                          api_key: str,
                          client_ip: str = None,
                          user_agent: str = None) -> AuthenticationContext:
        """Authenticate an agent and create session"""
        
        if not api_key or not api_key.startswith("ak_"):
            raise AuthenticationError("Invalid API key format")
        
        api_key_hash = self._hash_api_key(api_key)
        
        # Look up credentials
        with sqlite3.connect(self.db_path) as conn:
            result = conn.execute("""
                SELECT agent_id, role, permissions, expires_at, is_active,
                       rate_limit_per_hour, allowed_ips
                FROM agent_credentials 
                WHERE api_key_hash = ?
            """, (api_key_hash,)).fetchone()
            
            if not result:
                self._log_auth_event(None, "authentication_failed", client_ip, user_agent, False, "Invalid API key")
                raise AuthenticationError("Invalid API key")
            
            agent_id, role_str, permissions_str, expires_at_str, is_active, rate_limit, allowed_ips_str = result
            
            # Check if credentials are active
            if not is_active:
                self._log_auth_event(agent_id, "authentication_failed", client_ip, user_agent, False, "Agent deactivated")
                raise AuthenticationError("Agent credentials are deactivated")
            
            # Check expiration
            if expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str)
                if datetime.now() > expires_at:
                    self._log_auth_event(agent_id, "authentication_failed", client_ip, user_agent, False, "Credentials expired")
                    raise AuthenticationError("Agent credentials have expired")
            
            # Check IP restrictions
            allowed_ips = [ip.strip() for ip in allowed_ips_str.split(",") if ip.strip()] if allowed_ips_str else []
            if allowed_ips and client_ip and client_ip not in allowed_ips:
                self._log_auth_event(agent_id, "authentication_failed", client_ip, user_agent, False, "IP not allowed")
                raise AuthenticationError("Client IP not authorized")
            
            # Check rate limit
            is_allowed, remaining = self.rate_limiter.check_rate_limit(agent_id, rate_limit)
            if not is_allowed:
                self._log_auth_event(agent_id, "authentication_failed", client_ip, user_agent, False, "Rate limit exceeded")
                raise AuthenticationError("Rate limit exceeded")
            
            # Parse permissions
            permissions = set()
            if permissions_str:
                for perm_str in permissions_str.split(","):
                    try:
                        permissions.add(Permission(perm_str.strip()))
                    except ValueError:
                        self.logger.warning(f"Unknown permission: {perm_str}")
            
            # Update last used timestamp
            conn.execute("""
                UPDATE agent_credentials SET last_used = ? WHERE agent_id = ?
            """, (datetime.now().isoformat(), agent_id))
        
        # Create session
        session_id = f"ses_{secrets.token_urlsafe(32)}"
        session_expires = datetime.now() + timedelta(hours=self.token_expiry_hours)
        
        auth_context = AuthenticationContext(
            agent_id=agent_id,
            role=AgentRole(role_str),
            permissions=permissions,
            session_id=session_id,
            client_ip=client_ip or "unknown",
            user_agent=user_agent or "unknown",
            authenticated_at=datetime.now(),
            expires_at=session_expires
        )
        
        # Store session
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO auth_sessions 
                (session_id, agent_id, client_ip, user_agent, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                session_id, agent_id, client_ip, user_agent,
                auth_context.authenticated_at.isoformat(),
                auth_context.expires_at.isoformat()
            ))
        
        # Cache session
        self.active_sessions[session_id] = auth_context
        
        # Log successful authentication
        self._log_auth_event(agent_id, "authentication_success", client_ip, user_agent, True)
        
        return auth_context
    
    def validate_session(self, session_id: str) -> AuthenticationContext:
        """Validate an existing session"""
        
        # Check cache first
        if session_id in self.active_sessions:
            context = self.active_sessions[session_id]
            if datetime.now() < context.expires_at:
                return context
            else:
                # Session expired, remove from cache
                del self.active_sessions[session_id]
        
        # Check database
        with sqlite3.connect(self.db_path) as conn:
            result = conn.execute("""
                SELECT s.agent_id, c.role, c.permissions, s.client_ip, s.user_agent,
                       s.created_at, s.expires_at, s.is_active
                FROM auth_sessions s
                JOIN agent_credentials c ON s.agent_id = c.agent_id
                WHERE s.session_id = ?
            """, (session_id,)).fetchone()
            
            if not result:
                raise AuthenticationError("Invalid session")
            
            agent_id, role_str, permissions_str, client_ip, user_agent, created_at_str, expires_at_str, is_active = result
            
            if not is_active:
                raise AuthenticationError("Session is deactivated")
            
            expires_at = datetime.fromisoformat(expires_at_str)
            if datetime.now() > expires_at:
                # Deactivate expired session
                conn.execute("""
                    UPDATE auth_sessions SET is_active = 0 WHERE session_id = ?
                """, (session_id,))
                raise AuthenticationError("Session has expired")
            
            # Parse permissions
            permissions = set()
            if permissions_str:
                for perm_str in permissions_str.split(","):
                    try:
                        permissions.add(Permission(perm_str.strip()))
                    except ValueError:
                        pass
            
            # Recreate context
            context = AuthenticationContext(
                agent_id=agent_id,
                role=AgentRole(role_str),
                permissions=permissions,
                session_id=session_id,
                client_ip=client_ip,
                user_agent=user_agent,
                authenticated_at=datetime.fromisoformat(created_at_str),
                expires_at=expires_at
            )
            
            # Update cache
            self.active_sessions[session_id] = context
            
            return context
    
    def revoke_session(self, session_id: str):
        """Revoke a session"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE auth_sessions SET is_active = 0 WHERE session_id = ?
            """, (session_id,))
        
        # Remove from cache
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
    
    def revoke_agent_credentials(self, agent_id: str):
        """Revoke all credentials for an agent"""
        with sqlite3.connect(self.db_path) as conn:
            # Deactivate credentials
            conn.execute("""
                UPDATE agent_credentials SET is_active = 0 WHERE agent_id = ?
            """, (agent_id,))
            
            # Deactivate all sessions
            conn.execute("""
                UPDATE auth_sessions SET is_active = 0 WHERE agent_id = ?
            """, (agent_id,))
        
        # Remove from cache
        sessions_to_remove = [
            sid for sid, context in self.active_sessions.items()
            if context.agent_id == agent_id
        ]
        for session_id in sessions_to_remove:
            del self.active_sessions[session_id]
        
        self._log_auth_event(agent_id, "credentials_revoked", None, None, True)
    
    def check_permission(self, context: AuthenticationContext, required_permission: Permission) -> bool:
        """Check if agent has required permission"""
        return required_permission in context.permissions
    
    def _hash_api_key(self, api_key: str) -> str:
        """Hash API key for secure storage"""
        return hashlib.sha256(f"{self.secret_key}{api_key}".encode()).hexdigest()
    
    def _log_auth_event(self, 
                       agent_id: str,
                       action: str,
                       client_ip: str,
                       user_agent: str,
                       success: bool,
                       error_message: str = None):
        """Log authentication events for audit"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO auth_audit_log 
                (agent_id, action, client_ip, user_agent, success, error_message, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                agent_id, action, client_ip, user_agent, success, error_message,
                datetime.now().isoformat()
            ))
    
    def get_auth_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get authentication statistics"""
        cutoff = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            # Success/failure rates
            total_attempts = conn.execute("""
                SELECT COUNT(*) FROM auth_audit_log WHERE timestamp > ?
            """, (cutoff,)).fetchone()[0]
            
            successful_auths = conn.execute("""
                SELECT COUNT(*) FROM auth_audit_log 
                WHERE timestamp > ? AND success = 1 AND action = 'authentication_success'
            """, (cutoff,)).fetchone()[0]
            
            # Active sessions
            active_sessions = conn.execute("""
                SELECT COUNT(*) FROM auth_sessions 
                WHERE is_active = 1 AND expires_at > ?
            """, (datetime.now().isoformat(),)).fetchone()[0]
            
            # Top agents by activity
            top_agents = dict(conn.execute("""
                SELECT agent_id, COUNT(*) as auth_count
                FROM auth_audit_log 
                WHERE timestamp > ? AND success = 1
                GROUP BY agent_id
                ORDER BY auth_count DESC
                LIMIT 10
            """, (cutoff,)).fetchall())
        
        success_rate = (successful_auths / total_attempts * 100) if total_attempts > 0 else 0
        
        return {
            "time_period_hours": hours,
            "total_auth_attempts": total_attempts,
            "successful_authentications": successful_auths,
            "success_rate_percent": round(success_rate, 2),
            "active_sessions": active_sessions,
            "top_agents_by_activity": top_agents
        }


# Global authenticator instance
authenticator = AgentAuthenticator()


def require_auth(required_permission: Permission = None):
    """Decorator to require authentication for agent operations"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract session_id from kwargs or headers
            session_id = kwargs.pop('session_id', None)
            
            if not session_id:
                raise AuthenticationError("Missing session ID")
            
            # Validate session
            try:
                context = authenticator.validate_session(session_id)
            except Exception as e:
                raise AuthenticationError(f"Authentication failed: {e}")
            
            # Check permission if required
            if required_permission and not authenticator.check_permission(context, required_permission):
                raise AuthenticationError(f"Insufficient permissions. Required: {required_permission.value}")
            
            # Add context to kwargs
            kwargs['auth_context'] = context
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_role(required_role: AgentRole):
    """Decorator to require specific role for agent operations"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            auth_context = kwargs.get('auth_context')
            
            if not auth_context:
                raise AuthenticationError("Missing authentication context")
            
            if auth_context.role != required_role and auth_context.role != AgentRole.SYSTEM_AGENT:
                raise AuthenticationError(f"Insufficient role. Required: {required_role.value}")
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def create_agent_api_key(agent_id: str, role: AgentRole) -> str:
    """Convenience function to create agent credentials"""
    return authenticator.create_agent_credentials(agent_id, role)


def authenticate_agent_request(api_key: str, client_ip: str = None) -> AuthenticationContext:
    """Convenience function to authenticate agent requests"""
    return authenticator.authenticate_agent(api_key, client_ip)