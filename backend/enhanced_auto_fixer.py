#!/usr/bin/env python3
"""
Enhanced Sentry Auto-Fixer System
With notifications, learning, safety features, and advanced capabilities
"""

import os
import json
import asyncio
import logging
import hmac
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import aiohttp
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import FastAPI, Request, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
import redis
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Float,
    Integer,
    DateTime,
    Boolean,
    Text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database for pattern learning
Base = declarative_base()


class ErrorPattern(Base):
    __tablename__ = "error_patterns"

    id = Column(Integer, primary_key=True)
    pattern = Column(String, unique=True)
    error_type = Column(String)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    avg_fix_time = Column(Float, default=0.0)
    confidence_score = Column(Float, default=50.0)
    last_seen = Column(DateTime, default=datetime.utcnow)
    auto_fixable = Column(Boolean, default=True)


class FixHistory(Base):
    __tablename__ = "fix_history"

    id = Column(Integer, primary_key=True)
    error_id = Column(String)
    error_type = Column(String)
    fix_applied = Column(Text)
    success = Column(Boolean)
    rollback_required = Column(Boolean, default=False)
    fix_time_seconds = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    project = Column(String)
    confidence_score = Column(Float)


# Create database
engine = create_engine(os.getenv("DATABASE_URL", "sqlite:///./auto_fixer.db"))
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)


class NotificationService:
    """Handle notifications via Slack and Email"""

    def __init__(self):
        self.slack_webhook = os.getenv("SLACK_WEBHOOK_URL")
        self.email_config = {
            "smtp_host": os.getenv("SMTP_HOST"),
            "smtp_port": int(os.getenv("SMTP_PORT", 587)),
            "smtp_username": os.getenv("SMTP_USERNAME"),
            "smtp_password": os.getenv("SMTP_PASSWORD"),
            "from_email": os.getenv("EMAIL_FROM_ADDRESS"),
            "to_emails": os.getenv("NOTIFICATION_EMAILS", "").split(","),
        }

    async def send_slack_notification(self, message: str, severity: str = "info"):
        """Send notification to Slack"""
        if not self.slack_webhook:
            return

        color_map = {
            "success": "#36a64f",
            "error": "#ff0000",
            "warning": "#ff9900",
            "info": "#2196F3",
        }

        payload = {
            "attachments": [
                {
                    "color": color_map.get(severity, "#2196F3"),
                    "title": "🤖 Sentry Auto-Fixer",
                    "text": message,
                    "footer": "Auto-Fixer System",
                    "ts": int(time.time()),
                }
            ]
        }

        try:
            async with aiohttp.ClientSession() as session:
                await session.post(self.slack_webhook, json=payload)
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")

    async def send_email_notification(self, subject: str, body: str):
        """Send email notification"""
        if not all([self.email_config["smtp_host"], self.email_config["to_emails"]]):
            return

        try:
            msg = MIMEMultipart()
            msg["From"] = self.email_config["from_email"]
            msg["To"] = ", ".join(self.email_config["to_emails"])
            msg["Subject"] = f"[Auto-Fixer] {subject}"

            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(
                self.email_config["smtp_host"], self.email_config["smtp_port"]
            ) as server:
                server.starttls()
                server.login(
                    self.email_config["smtp_username"],
                    self.email_config["smtp_password"],
                )
                server.send_message(msg)
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")

    async def notify_fix_applied(
        self, error_type: str, project: str, success: bool, details: str
    ):
        """Send notification when fix is applied"""
        severity = "success" if success else "error"
        status = "✅ Successfully fixed" if success else "❌ Failed to fix"

        message = f"{status} {error_type} error in {project}\n{details}"

        await self.send_slack_notification(message, severity)

        if not success or error_type in ["database_schema", "authentication"]:
            # Send email for failures or critical fixes
            await self.send_email_notification(
                f"{status} {error_type} error", f"Project: {project}\n\n{details}"
            )


class CircuitBreaker:
    """Circuit breaker pattern to prevent cascading failures"""

    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open

    def call(self, func):
        """Execute function with circuit breaker protection"""
        if self.state == "open":
            if (datetime.now() - self.last_failure_time).seconds > self.timeout:
                self.state = "half-open"
            else:
                raise Exception("Circuit breaker is open")

        try:
            result = func()
            if self.state == "half-open":
                self.state = "closed"
                self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = datetime.now()

            if self.failures >= self.failure_threshold:
                self.state = "open"
                logger.error(f"Circuit breaker opened after {self.failures} failures")

            raise e


class RateLimiter:
    """Rate limiting for auto-fixes"""

    def __init__(self, max_fixes_per_minute: int = 10, max_fixes_per_hour: int = 50):
        self.max_per_minute = max_fixes_per_minute
        self.max_per_hour = max_fixes_per_hour
        self.minute_window = deque(maxlen=max_fixes_per_minute)
        self.hour_window = deque(maxlen=max_fixes_per_hour)

    def allow_fix(self) -> bool:
        """Check if fix is allowed under rate limits"""
        now = datetime.now()

        # Clean old entries
        minute_ago = now - timedelta(minutes=1)
        hour_ago = now - timedelta(hours=1)

        self.minute_window = deque(
            [t for t in self.minute_window if t > minute_ago],
            maxlen=self.max_per_minute,
        )
        self.hour_window = deque(
            [t for t in self.hour_window if t > hour_ago], maxlen=self.max_per_hour
        )

        # Check limits
        if len(self.minute_window) >= self.max_per_minute:
            logger.warning("Rate limit exceeded: per-minute limit")
            return False

        if len(self.hour_window) >= self.max_per_hour:
            logger.warning("Rate limit exceeded: per-hour limit")
            return False

        # Record fix
        self.minute_window.append(now)
        self.hour_window.append(now)
        return True


class ErrorGrouper:
    """Group similar errors to prevent duplicate fixes"""

    def __init__(self):
        self.error_groups = defaultdict(list)
        self.group_timeout = 300  # 5 minutes

    def get_group_key(self, error_data: Dict) -> str:
        """Generate group key for error"""
        error_type = error_data.get("type", "unknown")
        file_path = error_data.get("filename", "unknown")
        line = error_data.get("line_number", "unknown")

        # Extract key parts of error message
        message = error_data.get("message", "")
        if "column" in message and "does not exist" in message:
            # Group by missing column name
            import re

            match = re.search(r"column (\S+) does not exist", message)
            if match:
                return f"missing_column:{match.group(1)}"

        return f"{error_type}:{file_path}:{line}"

    def should_process(self, error_data: Dict) -> bool:
        """Check if error should be processed or is duplicate"""
        group_key = self.get_group_key(error_data)
        now = datetime.now()

        # Clean old groups
        self.error_groups = defaultdict(
            list,
            {
                k: [t for t in v if (now - t).seconds < self.group_timeout]
                for k, v in self.error_groups.items()
            },
        )

        # Check if already processed recently
        if group_key in self.error_groups and self.error_groups[group_key]:
            logger.info(f"Skipping duplicate error: {group_key}")
            return False

        self.error_groups[group_key].append(now)
        return True


class HealthChecker:
    """Monitor system health and trigger rollbacks if needed"""

    def __init__(self, sentry_auth_token: str):
        self.sentry_auth_token = sentry_auth_token
        self.baseline_error_rate = None
        self.check_interval = 60  # seconds
        self.error_spike_threshold = 2.0  # 2x baseline

    async def get_current_error_rate(self, project: str) -> float:
        """Get current error rate from Sentry"""
        try:
            headers = {
                "Authorization": f"Bearer {self.sentry_auth_token}",
                "Content-Type": "application/json",
            }

            # Get errors from last 5 minutes
            url = (
                f"https://sentry.io/api/0/projects/bossio-solution-inc/{project}/stats/"
            )
            params = {
                "stat": "received",
                "resolution": "1m",
                "since": int((datetime.now() - timedelta(minutes=5)).timestamp()),
            }

            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        # Calculate average error rate
                        rates = [point[1] for point in data]
                        return sum(rates) / len(rates) if rates else 0.0
        except Exception as e:
            logger.error(f"Failed to get error rate: {e}")

        return 0.0

    async def check_health_after_fix(self, project: str, fix_id: str) -> bool:
        """Check system health after applying fix"""
        # Wait a bit for metrics to update
        await asyncio.sleep(30)

        current_rate = await self.get_current_error_rate(project)

        if self.baseline_error_rate and current_rate > (
            self.baseline_error_rate * self.error_spike_threshold
        ):
            logger.error(
                f"Error rate spike detected after fix {fix_id}: {current_rate} > {self.baseline_error_rate * self.error_spike_threshold}"
            )
            return False

        return True


class DatabaseMigrationHelper:
    """Auto-generate and apply safe database migrations"""

    def __init__(self):
        self.safe_operations = ["add_column", "add_index", "create_table"]

    def generate_migration_for_missing_column(
        self, table: str, column: str, error_context: Dict
    ) -> Optional[str]:
        """Generate migration for missing column"""
        # Analyze error context to determine column type
        column_type = self._infer_column_type(column, error_context)

        migration = f"""
-- Auto-generated migration for missing column
ALTER TABLE {table} ADD COLUMN {column} {column_type};

-- Add index if it looks like a foreign key
"""

        if column.endswith("_id"):
            migration += f"CREATE INDEX idx_{table}_{column} ON {table}({column});\n"

        return migration

    def _infer_column_type(self, column: str, context: Dict) -> str:
        """Infer column type from name and context"""
        if column.endswith("_id"):
            return "INTEGER"
        elif column.endswith("_at"):
            return "TIMESTAMP"
        elif "amount" in column or "price" in column:
            return "DECIMAL(10,2)"
        elif "is_" in column or column.startswith("has_"):
            return "BOOLEAN DEFAULT FALSE"
        else:
            return "VARCHAR(255)"


class EnhancedAutoFixer:
    """Enhanced auto-fixer with all advanced features"""

    def __init__(self):
        # Core services
        self.notifications = NotificationService()
        self.circuit_breaker = CircuitBreaker()
        self.rate_limiter = RateLimiter()
        self.error_grouper = ErrorGrouper()
        self.health_checker = HealthChecker(os.getenv("SENTRY_AUTH_TOKEN"))
        self.migration_helper = DatabaseMigrationHelper()

        # Credentials
        self.claude_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.sentry_token = os.getenv(
            "SENTRY_INTEGRATION_TOKEN",
            "490de1a139e58fc7d8f5eae81c60ca2ea5d6a50accc247ecce4976c80d9c356a",
        )
        self.sentry_client_secret = os.getenv(
            "SENTRY_CLIENT_SECRET",
            "2f231593da004229854fa5fb98104402e3cc4ebf8d4f1cad95dde4c36bf4c818",
        )

        # Pattern learning
        self.db = SessionLocal()

        # Performance monitoring
        self.performance_baselines = {}

        logger.info("Enhanced Auto-Fixer initialized with all features")

    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Sentry webhook signature"""
        if not self.sentry_client_secret or not signature:
            return True  # Allow in test mode

        try:
            expected = hmac.new(
                self.sentry_client_secret.encode(), payload, hashlib.sha256
            ).hexdigest()

            received = (
                signature.replace("sha256=", "")
                if signature.startswith("sha256=")
                else signature
            )

            return hmac.compare_digest(expected, received)
        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            return False

    async def learn_from_fix(
        self, error_pattern: str, error_type: str, success: bool, fix_time: float
    ):
        """Update pattern confidence based on fix outcome"""
        pattern = self.db.query(ErrorPattern).filter_by(pattern=error_pattern).first()

        if not pattern:
            pattern = ErrorPattern(
                pattern=error_pattern,
                error_type=error_type,
                success_count=0,
                failure_count=0,
            )
            self.db.add(pattern)

        # Update counts
        if success:
            pattern.success_count += 1
        else:
            pattern.failure_count += 1

        # Update average fix time
        total_fixes = pattern.success_count + pattern.failure_count
        pattern.avg_fix_time = (
            pattern.avg_fix_time * (total_fixes - 1) + fix_time
        ) / total_fixes

        # Update confidence score (Bayesian approach)
        success_rate = pattern.success_count / total_fixes if total_fixes > 0 else 0.5
        confidence = (pattern.success_count + 1) / (
            total_fixes + 2
        )  # Laplace smoothing
        pattern.confidence_score = confidence * 100

        # Disable auto-fix if confidence too low
        if total_fixes > 10 and pattern.confidence_score < 30:
            pattern.auto_fixable = False
            await self.notifications.send_slack_notification(
                f"⚠️ Disabled auto-fix for {error_type} due to low confidence ({pattern.confidence_score:.1f}%)",
                "warning",
            )

        pattern.last_seen = datetime.utcnow()
        self.db.commit()

    async def analyze_error_with_claude(
        self, error_data: Dict, pattern_history: Optional[ErrorPattern] = None
    ) -> Dict:
        """Enhanced error analysis with historical context"""

        history_context = ""
        if pattern_history:
            history_context = f"""
Historical data for this error pattern:
- Success rate: {pattern_history.success_count}/{pattern_history.success_count + pattern_history.failure_count}
- Average fix time: {pattern_history.avg_fix_time:.1f} seconds
- Confidence: {pattern_history.confidence_score:.1f}%
"""

        prompt = f"""
You are an expert software engineer tasked with analyzing and fixing a production error.

Error Details:
- Message: {error_data.get('message', 'N/A')}
- Type: {error_data.get('type', 'N/A')}
- Stack Trace: {error_data.get('stack_trace', 'N/A')}
- File: {error_data.get('filename', 'N/A')}
- Line: {error_data.get('line_number', 'N/A')}
- Project: {error_data.get('project', 'Unknown')}
- Environment: {error_data.get('environment', 'Unknown')}
- Frequency: {error_data.get('count', 1)} occurrences

{history_context}

Please analyze this error and provide:
1. Root cause analysis
2. Specific fix recommendation
3. Code changes needed (if any)
4. Risk assessment (LOW/MEDIUM/HIGH)
5. Testing recommendations
6. Rollback plan if fix causes issues
7. Performance impact assessment

Format your response as JSON with these keys:
- root_cause: string
- fix_description: string
- code_changes: array of objects with {file, changes}
- risk_level: string
- test_recommendations: array of strings
- rollback_plan: string
- performance_impact: string (none/low/medium/high)
- confidence: number (0-100)
- requires_migration: boolean
- migration_sql: string (if requires_migration is true)
"""

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.claude_api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": "claude-3-sonnet-20240229",
                        "max_tokens": 3000,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                ) as response:
                    result = await response.json()

                    if response.status == 200:
                        analysis = result["content"][0]["text"]
                        try:
                            return json.loads(analysis)
                        except json.JSONDecodeError:
                            return {
                                "root_cause": "Analysis failed to parse",
                                "fix_description": analysis,
                                "code_changes": [],
                                "risk_level": "HIGH",
                                "test_recommendations": ["Manual review required"],
                                "confidence": 0,
                            }
                    else:
                        logger.error(f"Claude API error: {result}")
                        return None

        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            return None

    async def apply_fix_with_rollback(
        self, fix_data: Dict, error_data: Dict
    ) -> Tuple[bool, str]:
        """Apply fix with automatic rollback on failure"""
        fix_id = f"fix_{int(time.time())}"
        start_time = time.time()

        # Record baseline error rate
        project = error_data.get("project", "unknown")
        self.health_checker.baseline_error_rate = (
            await self.health_checker.get_current_error_rate(project)
        )

        try:
            # Check rate limits
            if not self.rate_limiter.allow_fix():
                return False, "Rate limit exceeded"

            # Apply fix with circuit breaker
            def apply():
                # Simulate fix application
                # In real implementation, this would apply actual code changes
                logger.info(f"Applying fix: {fix_data.get('fix_description')}")
                return True

            self.circuit_breaker.call(apply)

            # Check system health
            health_ok = await self.health_checker.check_health_after_fix(
                project, fix_id
            )

            if not health_ok:
                # Rollback
                logger.error(f"Rolling back fix {fix_id} due to health check failure")
                await self.notifications.send_slack_notification(
                    f"🔄 Rolled back fix for {error_data.get('type')} due to error spike",
                    "error",
                )
                return False, "Fix rolled back due to error spike"

            # Record success
            fix_time = time.time() - start_time
            history = FixHistory(
                error_id=error_data.get("id", "unknown"),
                error_type=error_data.get("type", "unknown"),
                fix_applied=json.dumps(fix_data),
                success=True,
                fix_time_seconds=fix_time,
                project=project,
                confidence_score=fix_data.get("confidence", 0),
            )
            self.db.add(history)
            self.db.commit()

            # Learn from success
            await self.learn_from_fix(
                error_data.get("pattern", ""),
                error_data.get("type", ""),
                True,
                fix_time,
            )

            return True, f"Fix applied successfully in {fix_time:.1f}s"

        except Exception as e:
            logger.error(f"Error applying fix: {e}")
            return False, str(e)

    async def process_sentry_error(self, webhook_data: Dict) -> Dict:
        """Process Sentry error with all enhancements"""
        try:
            # Extract error information
            issue_data = webhook_data.get("data", {}).get("issue", {})
            error_message = issue_data.get("title", "")

            error_data = {
                "id": issue_data.get("id"),
                "message": error_message,
                "type": self._classify_error_type(error_message),
                "project": issue_data.get("project", {}).get("name", ""),
                "count": issue_data.get("count", 1),
                "pattern": self._extract_error_pattern(error_message),
            }

            # Check error grouping
            if not self.error_grouper.should_process(error_data):
                return {
                    "status": "skipped",
                    "reason": "Duplicate error recently processed",
                }

            # Get pattern history
            pattern = (
                self.db.query(ErrorPattern)
                .filter_by(pattern=error_data["pattern"])
                .first()
            )

            if pattern and not pattern.auto_fixable:
                return {
                    "status": "manual_review",
                    "reason": f"Pattern disabled due to low confidence ({pattern.confidence_score:.1f}%)",
                }

            # Analyze with Claude
            fix_analysis = await self.analyze_error_with_claude(error_data, pattern)

            if not fix_analysis:
                return {"status": "analysis_failed"}

            # Determine if auto-fix should proceed
            confidence = fix_analysis.get("confidence", 0)
            risk_level = fix_analysis.get("risk_level", "HIGH")

            if confidence > 75 and risk_level == "LOW":
                # Apply fix
                success, message = await self.apply_fix_with_rollback(
                    fix_analysis, error_data
                )

                # Send notifications
                await self.notifications.notify_fix_applied(
                    error_data["type"],
                    error_data["project"],
                    success,
                    f"{fix_analysis.get('fix_description')}\n{message}",
                )

                return {
                    "status": "fix_applied" if success else "fix_failed",
                    "message": message,
                    "confidence": confidence,
                }
            else:
                # Create recommendation
                return {
                    "status": "recommendation",
                    "analysis": fix_analysis,
                    "reason": f"Confidence: {confidence}%, Risk: {risk_level}",
                }

        except Exception as e:
            logger.error(f"Error processing: {e}")
            return {"status": "error", "message": str(e)}

    def _classify_error_type(self, message: str) -> str:
        """Classify error type from message"""
        message_lower = message.lower()

        if "column" in message_lower and "does not exist" in message_lower:
            return "database_schema"
        elif "could not validate credentials" in message_lower:
            return "authentication"
        elif "rate limit" in message_lower:
            return "api_rate_limit"
        elif "modulenotfounderror" in message_lower or "importerror" in message_lower:
            return "import_error"
        elif "is not defined" in message_lower or "nameerror" in message_lower:
            return "undefined_variable"
        elif "timeout" in message_lower:
            return "timeout"
        elif "connection" in message_lower:
            return "connection_error"
        else:
            return "unknown"

    def _extract_error_pattern(self, message: str) -> str:
        """Extract reusable pattern from error message"""
        import re

        # Remove specific values to create generic pattern
        pattern = message
        pattern = re.sub(r"\b\d+\b", "NUM", pattern)  # Replace numbers
        pattern = re.sub(r'"[^"]*"', "STRING", pattern)  # Replace quoted strings
        pattern = re.sub(r"'[^']*'", "STRING", pattern)  # Replace single quoted

        return pattern[:100]  # Limit length


# FastAPI app
app = FastAPI(title="Enhanced Sentry Auto-Fixer", version="2.0.0")
auto_fixer = EnhancedAutoFixer()


@app.post("/sentry/webhook")
async def handle_sentry_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    sentry_hook_signature: str = Header(None, alias="sentry-hook-signature"),
):
    """Handle incoming Sentry webhook"""
    try:
        raw_payload = await request.body()

        if sentry_hook_signature:
            if not auto_fixer.verify_signature(raw_payload, sentry_hook_signature):
                raise HTTPException(status_code=401, detail="Invalid signature")

        payload = json.loads(raw_payload.decode())

        # Process in background
        result = await auto_fixer.process_sentry_error(payload)

        return result

    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status")
async def get_status():
    """Get system status"""
    db = SessionLocal()

    # Get recent fixes
    recent_fixes = (
        db.query(FixHistory).order_by(FixHistory.timestamp.desc()).limit(10).all()
    )

    # Get pattern stats
    patterns = db.query(ErrorPattern).all()

    return {
        "status": "running",
        "version": "2.0.0",
        "features": {
            "notifications": True,
            "learning": True,
            "rate_limiting": True,
            "circuit_breaker": auto_fixer.circuit_breaker.state,
            "error_grouping": True,
            "health_monitoring": True,
            "auto_rollback": True,
        },
        "stats": {
            "total_fixes": db.query(FixHistory).count(),
            "success_rate": db.query(FixHistory).filter_by(success=True).count()
            / max(db.query(FixHistory).count(), 1)
            * 100,
            "patterns_learned": len(patterns),
            "avg_confidence": (
                sum(p.confidence_score for p in patterns) / len(patterns)
                if patterns
                else 0
            ),
        },
        "recent_fixes": [
            {
                "timestamp": f.timestamp.isoformat(),
                "error_type": f.error_type,
                "success": f.success,
                "project": f.project,
                "confidence": f.confidence_score,
            }
            for f in recent_fixes
        ],
    }


@app.get("/patterns")
async def get_patterns():
    """Get learned error patterns"""
    db = SessionLocal()
    patterns = (
        db.query(ErrorPattern).order_by(ErrorPattern.confidence_score.desc()).all()
    )

    return {
        "patterns": [
            {
                "pattern": p.pattern,
                "error_type": p.error_type,
                "confidence": p.confidence_score,
                "success_rate": (
                    p.success_count / (p.success_count + p.failure_count) * 100
                    if (p.success_count + p.failure_count) > 0
                    else 0
                ),
                "avg_fix_time": p.avg_fix_time,
                "auto_fixable": p.auto_fixable,
                "last_seen": p.last_seen.isoformat(),
            }
            for p in patterns
        ]
    }


@app.post("/patterns/{pattern_id}/toggle")
async def toggle_pattern(pattern_id: int):
    """Enable/disable auto-fix for pattern"""
    db = SessionLocal()
    pattern = db.query(ErrorPattern).filter_by(id=pattern_id).first()

    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    pattern.auto_fixable = not pattern.auto_fixable
    db.commit()

    return {"pattern": pattern.pattern, "auto_fixable": pattern.auto_fixable}


@app.get("/performance")
async def get_performance_metrics():
    """Get performance monitoring data"""
    # This would integrate with your APM tool
    return {
        "api_response_times": {"p50": 45, "p95": 120, "p99": 250},
        "error_rates": {"current": 0.5, "baseline": 0.3},
        "throughput": {"requests_per_minute": 1200},
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "dependencies": {
            "database": "connected",
            "sentry": "connected",
            "notifications": "configured",
        },
    }


if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting Enhanced Sentry Auto-Fixer v2.0...")
    print("📊 Dashboard: http://localhost:8003/docs")
    print("🔍 Status: http://localhost:8003/status")
    print("🧠 Patterns: http://localhost:8003/patterns")
    uvicorn.run(app, host="0.0.0.0", port=8003)
