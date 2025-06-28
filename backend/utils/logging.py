"""
Centralized logging configuration for 6FB Platform
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional
import json
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler

from config.settings import settings


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""

    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add extra fields if present
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "ip_address"):
            log_data["ip_address"] = record.ip_address

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)


def setup_logging():
    """Configure logging for the application"""

    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Remove default handlers
    root_logger.handlers = []

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(
        logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG
    )

    # Use different formatters for dev and production
    if settings.ENVIRONMENT == "production":
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(
            logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        )

    root_logger.addHandler(console_handler)

    # File handlers
    # Application log - rotates daily
    app_handler = TimedRotatingFileHandler(
        filename=log_dir / "app.log",
        when="midnight",
        interval=1,
        backupCount=30,
        encoding="utf-8",
    )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(app_handler)

    # Error log - rotates by size
    error_handler = RotatingFileHandler(
        filename=log_dir / "error.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(error_handler)

    # Security log - for authentication and authorization events
    security_logger = logging.getLogger("security")
    security_handler = TimedRotatingFileHandler(
        filename=log_dir / "security.log",
        when="midnight",
        interval=1,
        backupCount=90,  # Keep 90 days of security logs
        encoding="utf-8",
    )
    security_handler.setFormatter(JSONFormatter())
    security_logger.addHandler(security_handler)
    security_logger.setLevel(logging.INFO)
    security_logger.propagate = False

    # API log - for request/response logging
    api_logger = logging.getLogger("api")
    api_handler = TimedRotatingFileHandler(
        filename=log_dir / "api.log",
        when="midnight",
        interval=1,
        backupCount=7,  # Keep 7 days of API logs
        encoding="utf-8",
    )
    api_handler.setFormatter(JSONFormatter())
    api_logger.addHandler(api_handler)
    api_logger.setLevel(logging.INFO)
    api_logger.propagate = False

    # Performance log - for slow queries and operations
    performance_logger = logging.getLogger("performance")
    performance_handler = RotatingFileHandler(
        filename=log_dir / "performance.log",
        maxBytes=50 * 1024 * 1024,  # 50MB
        backupCount=3,
        encoding="utf-8",
    )
    performance_handler.setFormatter(JSONFormatter())
    performance_logger.addHandler(performance_handler)
    performance_logger.setLevel(logging.WARNING)
    performance_logger.propagate = False

    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance"""
    return logging.getLogger(name)


def log_user_action(
    action: str,
    user_id: Optional[int] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    """Log user actions for audit trail"""
    logger = logging.getLogger("security")
    extra = {
        "user_id": user_id,
        "ip_address": ip_address,
        "action": action,
        "details": details or {},
    }
    logger.info(f"User action: {action}", extra=extra)


def log_api_request(
    method: str,
    path: str,
    status_code: int,
    duration: float,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
):
    """Log API requests"""
    logger = logging.getLogger("api")
    extra = {
        "method": method,
        "path": path,
        "status_code": status_code,
        "duration": duration,
        "user_id": user_id,
        "ip_address": ip_address,
        "request_id": request_id,
    }

    message = f"{method} {path} - {status_code} - {duration:.3f}s"

    if status_code >= 500:
        logger.error(message, extra=extra)
    elif status_code >= 400:
        logger.warning(message, extra=extra)
    else:
        logger.info(message, extra=extra)


def log_performance_issue(
    operation: str, duration: float, threshold: float, details: Optional[dict] = None
):
    """Log performance issues"""
    logger = logging.getLogger("performance")
    extra = {
        "operation": operation,
        "duration": duration,
        "threshold": threshold,
        "details": details or {},
    }
    logger.warning(
        f"Slow operation: {operation} took {duration:.3f}s (threshold: {threshold:.3f}s)",
        extra=extra,
    )
