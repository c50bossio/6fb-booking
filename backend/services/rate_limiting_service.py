"""
Enhanced Rate Limiting Service for Authentication Security
Provides comprehensive protection against brute force attacks
"""

import time
import logging
from typing import Dict, Optional, Tuple, List
from collections import defaultdict, deque
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from dataclasses import dataclass, field
from utils.secure_logging import get_secure_logger, log_security_event

logger = get_secure_logger(__name__)


@dataclass
class RateLimitRule:
    """Rate limiting rule configuration"""

    max_requests: int
    window_seconds: int
    block_duration_seconds: int = 300  # 5 minutes default
    name: str = "default"


@dataclass
class LoginAttempt:
    """Individual login attempt record"""

    timestamp: float
    ip_address: str
    email: str
    success: bool
    user_agent: Optional[str] = None


@dataclass
class UserAccountState:
    """User account lockout state"""

    failed_attempts: int = 0
    last_failed_attempt: Optional[float] = None
    lockout_until: Optional[float] = None
    total_lockouts: int = 0
    lockout_escalation_factor: float = 1.0


@dataclass
class IPState:
    """IP address blocking state"""

    failed_attempts: int = 0
    last_attempt: Optional[float] = None
    blocked_until: Optional[float] = None
    suspicious_activity_score: float = 0.0
    blocked_count: int = 0


class EnhancedRateLimitingService:
    """
    Comprehensive rate limiting service with multiple layers of protection:
    1. Per-IP rate limiting
    2. Per-user account lockouts
    3. Suspicious IP detection and blocking
    4. Adaptive rate limiting
    5. Admin bypass mechanisms
    """

    def __init__(self):
        # Rate limiting rules for different auth endpoints
        self.rules = {
            "login": RateLimitRule(
                max_requests=5,
                window_seconds=300,  # 5 minutes
                block_duration_seconds=900,  # 15 minutes
                name="login",
            ),
            "register": RateLimitRule(
                max_requests=3,
                window_seconds=600,  # 10 minutes
                block_duration_seconds=1800,  # 30 minutes
                name="register",
            ),
            "forgot_password": RateLimitRule(
                max_requests=3,
                window_seconds=3600,  # 1 hour
                block_duration_seconds=3600,  # 1 hour
                name="forgot_password",
            ),
            "mfa_verify": RateLimitRule(
                max_requests=10,
                window_seconds=300,  # 5 minutes
                block_duration_seconds=600,  # 10 minutes
                name="mfa_verify",
            ),
        }

        # Account lockout configuration
        self.account_lockout_config = {
            "max_failed_attempts": 5,
            "lockout_duration_minutes": 30,
            "escalation_factor": 1.5,  # Increase lockout time on repeated violations
            "max_lockout_duration_hours": 24,
        }

        # IP blocking configuration
        self.ip_blocking_config = {
            "suspicious_threshold": 20,  # Failed attempts to be considered suspicious
            "block_duration_hours": 2,
            "permanent_block_threshold": 100,  # Attempts before permanent block consideration
        }

        # Admin bypass mechanism
        self.admin_bypass_ips = set()  # IPs that bypass rate limiting
        self.admin_bypass_tokens = set()  # Special bypass tokens

        # In-memory storage (in production, use Redis or database)
        self.ip_attempts: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.user_account_states: Dict[str, UserAccountState] = {}
        self.ip_states: Dict[str, IPState] = {}
        self.recent_attempts: deque = deque(maxlen=10000)  # Global attempt tracking

        # Statistics tracking
        self.stats = {
            "total_blocked_requests": 0,
            "total_user_lockouts": 0,
            "total_ip_blocks": 0,
            "false_positive_reports": 0,
        }

    def add_admin_bypass_ip(self, ip_address: str) -> bool:
        """Add IP to admin bypass list"""
        try:
            self.admin_bypass_ips.add(ip_address)
            logger.info(f"Added admin bypass for IP: {ip_address}")
            return True
        except Exception as e:
            logger.error(f"Failed to add admin bypass IP: {e}")
            return False

    def remove_admin_bypass_ip(self, ip_address: str) -> bool:
        """Remove IP from admin bypass list"""
        try:
            self.admin_bypass_ips.discard(ip_address)
            logger.info(f"Removed admin bypass for IP: {ip_address}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove admin bypass IP: {e}")
            return False

    def is_admin_bypass(
        self, ip_address: str, bypass_token: Optional[str] = None
    ) -> bool:
        """Check if request should bypass rate limiting"""
        if ip_address in self.admin_bypass_ips:
            return True
        if bypass_token and bypass_token in self.admin_bypass_tokens:
            return True
        return False

    def _cleanup_old_attempts(self, ip_address: str, rule: RateLimitRule):
        """Remove old attempts outside the time window"""
        now = time.time()
        cutoff = now - rule.window_seconds

        # Clean IP attempts
        while self.ip_attempts[ip_address] and self.ip_attempts[ip_address][0] < cutoff:
            self.ip_attempts[ip_address].popleft()

    def _is_account_locked(self, email: str) -> Tuple[bool, Optional[float]]:
        """Check if user account is locked"""
        if email not in self.user_account_states:
            return False, None

        state = self.user_account_states[email]
        now = time.time()

        if state.lockout_until and now < state.lockout_until:
            return True, state.lockout_until

        # Clear expired lockout
        if state.lockout_until and now >= state.lockout_until:
            state.lockout_until = None
            state.failed_attempts = 0

        return False, None

    def _is_ip_blocked(self, ip_address: str) -> Tuple[bool, Optional[float]]:
        """Check if IP is blocked"""
        if ip_address not in self.ip_states:
            return False, None

        state = self.ip_states[ip_address]
        now = time.time()

        if state.blocked_until and now < state.blocked_until:
            return True, state.blocked_until

        # Clear expired block
        if state.blocked_until and now >= state.blocked_until:
            state.blocked_until = None

        return False, None

    def _lockout_account(self, email: str):
        """Lock user account after failed attempts"""
        now = time.time()

        if email not in self.user_account_states:
            self.user_account_states[email] = UserAccountState()

        state = self.user_account_states[email]
        state.failed_attempts += 1
        state.last_failed_attempt = now
        state.total_lockouts += 1

        # Calculate lockout duration with escalation
        base_duration = self.account_lockout_config["lockout_duration_minutes"] * 60
        escalated_duration = base_duration * (
            state.lockout_escalation_factor ** (state.total_lockouts - 1)
        )

        # Cap at maximum duration
        max_duration = self.account_lockout_config["max_lockout_duration_hours"] * 3600
        lockout_duration = min(escalated_duration, max_duration)

        state.lockout_until = now + lockout_duration
        state.lockout_escalation_factor = min(
            state.lockout_escalation_factor * 1.5, 5.0
        )

        self.stats["total_user_lockouts"] += 1

        logger.warning(f"Account locked: {email} for {lockout_duration/60:.1f} minutes")

        # Log security event
        log_security_event(
            event_type="account_lockout",
            description=f"Account locked after {state.failed_attempts} failed attempts",
            additional_data={
                "email": email,
                "failed_attempts": state.failed_attempts,
                "lockout_duration_minutes": lockout_duration / 60,
                "total_lockouts": state.total_lockouts,
            },
            severity="WARNING",
        )

    def _block_ip(self, ip_address: str):
        """Block IP address after suspicious activity"""
        now = time.time()

        if ip_address not in self.ip_states:
            self.ip_states[ip_address] = IPState()

        state = self.ip_states[ip_address]
        state.failed_attempts += 1
        state.last_attempt = now
        state.blocked_count += 1

        # Calculate block duration
        base_duration = self.ip_blocking_config["block_duration_hours"] * 3600
        # Escalate block duration for repeat offenders
        block_duration = base_duration * (1.5 ** (state.blocked_count - 1))

        # Check for permanent block threshold
        if (
            state.failed_attempts
            >= self.ip_blocking_config["permanent_block_threshold"]
        ):
            block_duration = 365 * 24 * 3600  # 1 year
            logger.critical(
                f"IP {ip_address} permanently blocked after {state.failed_attempts} failed attempts"
            )

        state.blocked_until = now + block_duration

        self.stats["total_ip_blocks"] += 1

        logger.warning(f"IP blocked: {ip_address} for {block_duration/3600:.1f} hours")

        # Log security event
        log_security_event(
            event_type="ip_address_blocked",
            description=f"IP blocked after {state.failed_attempts} failed attempts",
            ip_address=ip_address,
            additional_data={
                "failed_attempts": state.failed_attempts,
                "block_duration_hours": block_duration / 3600,
                "blocked_count": state.blocked_count,
            },
            severity="WARNING",
        )

    def check_rate_limit(
        self,
        endpoint: str,
        ip_address: str,
        email: Optional[str] = None,
        bypass_token: Optional[str] = None,
    ) -> Tuple[bool, Dict[str, str]]:
        """
        Check if request is allowed based on comprehensive rate limiting
        Returns: (allowed, headers_dict)
        """
        now = time.time()

        # Check admin bypass
        if self.is_admin_bypass(ip_address, bypass_token):
            return True, {"X-RateLimit-Bypass": "admin"}

        # Get rule for endpoint
        rule = self.rules.get(endpoint, self.rules["login"])

        # Check IP blocking first
        ip_blocked, blocked_until = self._is_ip_blocked(ip_address)
        if ip_blocked:
            reset_time = int(blocked_until - now) if blocked_until else 0
            headers = {
                "X-RateLimit-Blocked": "ip",
                "X-RateLimit-Reset": str(int(blocked_until)) if blocked_until else "",
                "Retry-After": str(reset_time),
            }
            return False, headers

        # Check account lockout if email provided
        if email:
            account_locked, lockout_until = self._is_account_locked(email)
            if account_locked:
                reset_time = int(lockout_until - now) if lockout_until else 0
                headers = {
                    "X-RateLimit-Blocked": "account",
                    "X-RateLimit-Reset": (
                        str(int(lockout_until)) if lockout_until else ""
                    ),
                    "Retry-After": str(reset_time),
                }
                return False, headers

        # Clean old attempts
        self._cleanup_old_attempts(ip_address, rule)

        # Count current attempts in window
        current_attempts = len(self.ip_attempts[ip_address])
        remaining = max(0, rule.max_requests - current_attempts)
        reset_time = int(now + rule.window_seconds)

        # Standard rate limit headers
        headers = {
            "X-RateLimit-Limit": str(rule.max_requests),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(reset_time),
            "X-RateLimit-Window": str(rule.window_seconds),
        }

        # Check if under limit
        if current_attempts < rule.max_requests:
            self.ip_attempts[ip_address].append(now)
            return True, headers

        # Rate limit exceeded - add to failed attempts
        self.stats["total_blocked_requests"] += 1

        # Track suspicious activity
        if ip_address not in self.ip_states:
            self.ip_states[ip_address] = IPState()

        ip_state = self.ip_states[ip_address]
        ip_state.suspicious_activity_score += 1

        # Check if IP should be blocked
        if (
            ip_state.suspicious_activity_score
            >= self.ip_blocking_config["suspicious_threshold"]
        ):
            self._block_ip(ip_address)
            headers["X-RateLimit-Blocked"] = "ip"

        # Log rate limit violation
        logger.warning(
            f"Rate limit exceeded for {endpoint}: IP {ip_address}, "
            f"attempts: {current_attempts}/{rule.max_requests}"
        )

        # Log security event
        log_security_event(
            event_type="rate_limit_exceeded",
            description=f"Rate limit exceeded for {endpoint}",
            ip_address=ip_address,
            additional_data={
                "endpoint": endpoint,
                "email": email,
                "attempts": current_attempts,
                "limit": rule.max_requests,
            },
            severity="WARNING",
        )

        retry_after = self._get_retry_after(ip_address, rule)
        headers["Retry-After"] = str(retry_after)

        return False, headers

    def record_login_attempt(
        self,
        ip_address: str,
        email: str,
        success: bool,
        user_agent: Optional[str] = None,
    ):
        """Record login attempt for analysis and account lockout"""
        now = time.time()

        attempt = LoginAttempt(
            timestamp=now,
            ip_address=ip_address,
            email=email,
            success=success,
            user_agent=user_agent,
        )

        self.recent_attempts.append(attempt)

        if not success and email:
            # Track failed attempts for account lockout
            if email not in self.user_account_states:
                self.user_account_states[email] = UserAccountState()

            state = self.user_account_states[email]
            state.failed_attempts += 1
            state.last_failed_attempt = now

            # Check if account should be locked
            if (
                state.failed_attempts
                >= self.account_lockout_config["max_failed_attempts"]
            ):
                self._lockout_account(email)

        elif success and email:
            # Reset failed attempts on successful login
            if email in self.user_account_states:
                self.user_account_states[email].failed_attempts = 0
                self.user_account_states[email].last_failed_attempt = None

            # Reset IP suspicious activity on successful login
            if ip_address in self.ip_states:
                self.ip_states[ip_address].suspicious_activity_score = max(
                    0, self.ip_states[ip_address].suspicious_activity_score - 2
                )

    def _get_retry_after(self, ip_address: str, rule: RateLimitRule) -> int:
        """Calculate retry-after time"""
        if not self.ip_attempts[ip_address]:
            return rule.window_seconds

        oldest_attempt = self.ip_attempts[ip_address][0]
        reset_time = oldest_attempt + rule.window_seconds - time.time()
        return max(0, int(reset_time))

    def unlock_account(self, email: str, admin_override: bool = False) -> bool:
        """Manually unlock a user account"""
        try:
            if email in self.user_account_states:
                state = self.user_account_states[email]
                state.lockout_until = None
                state.failed_attempts = 0

                if admin_override:
                    state.total_lockouts = 0
                    state.lockout_escalation_factor = 1.0

                logger.info(
                    f"Account unlocked: {email} (admin_override: {admin_override})"
                )

                log_security_event(
                    event_type="account_unlocked",
                    description=f"Account manually unlocked: {email}",
                    additional_data={"email": email, "admin_override": admin_override},
                    severity="INFO",
                )

                return True
        except Exception as e:
            logger.error(f"Failed to unlock account {email}: {e}")

        return False

    def unblock_ip(self, ip_address: str, admin_override: bool = False) -> bool:
        """Manually unblock an IP address"""
        try:
            if ip_address in self.ip_states:
                state = self.ip_states[ip_address]
                state.blocked_until = None

                if admin_override:
                    state.failed_attempts = 0
                    state.suspicious_activity_score = 0
                    state.blocked_count = 0

                logger.info(
                    f"IP unblocked: {ip_address} (admin_override: {admin_override})"
                )

                log_security_event(
                    event_type="ip_address_unblocked",
                    description=f"IP manually unblocked: {ip_address}",
                    ip_address=ip_address,
                    additional_data={"admin_override": admin_override},
                    severity="INFO",
                )

                return True
        except Exception as e:
            logger.error(f"Failed to unblock IP {ip_address}: {e}")

        return False

    def get_stats(self) -> Dict:
        """Get rate limiting statistics"""
        now = time.time()

        # Count currently locked accounts
        locked_accounts = sum(
            1
            for state in self.user_account_states.values()
            if state.lockout_until and now < state.lockout_until
        )

        # Count currently blocked IPs
        blocked_ips = sum(
            1
            for state in self.ip_states.values()
            if state.blocked_until and now < state.blocked_until
        )

        # Recent attempt statistics
        recent_window = now - 3600  # Last hour
        recent_attempts_count = sum(
            1 for attempt in self.recent_attempts if attempt.timestamp > recent_window
        )

        recent_failed_attempts = sum(
            1
            for attempt in self.recent_attempts
            if attempt.timestamp > recent_window and not attempt.success
        )

        return {
            "total_blocked_requests": self.stats["total_blocked_requests"],
            "total_user_lockouts": self.stats["total_user_lockouts"],
            "total_ip_blocks": self.stats["total_ip_blocks"],
            "currently_locked_accounts": locked_accounts,
            "currently_blocked_ips": blocked_ips,
            "recent_attempts_last_hour": recent_attempts_count,
            "recent_failed_attempts_last_hour": recent_failed_attempts,
            "total_tracked_ips": len(self.ip_states),
            "total_tracked_accounts": len(self.user_account_states),
            "admin_bypass_ips": len(self.admin_bypass_ips),
        }

    def get_account_status(self, email: str) -> Dict:
        """Get detailed account status"""
        if email not in self.user_account_states:
            return {"status": "normal", "locked": False}

        state = self.user_account_states[email]
        now = time.time()

        is_locked = state.lockout_until and now < state.lockout_until

        return {
            "status": "locked" if is_locked else "normal",
            "locked": is_locked,
            "failed_attempts": state.failed_attempts,
            "total_lockouts": state.total_lockouts,
            "lockout_until": state.lockout_until,
            "time_until_unlock": (
                max(0, int(state.lockout_until - now)) if state.lockout_until else 0
            ),
        }

    def get_ip_status(self, ip_address: str) -> Dict:
        """Get detailed IP status"""
        if ip_address not in self.ip_states:
            return {"status": "normal", "blocked": False}

        state = self.ip_states[ip_address]
        now = time.time()

        is_blocked = state.blocked_until and now < state.blocked_until

        return {
            "status": "blocked" if is_blocked else "normal",
            "blocked": is_blocked,
            "failed_attempts": state.failed_attempts,
            "suspicious_activity_score": state.suspicious_activity_score,
            "blocked_count": state.blocked_count,
            "blocked_until": state.blocked_until,
            "time_until_unblock": (
                max(0, int(state.blocked_until - now)) if state.blocked_until else 0
            ),
        }


# Global rate limiting service instance
rate_limiting_service = EnhancedRateLimitingService()
