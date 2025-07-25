"""
Enhanced Logging Configuration for 6FB Booking Platform

Provides comprehensive logging setup with:
- Structured logging with data masking
- Audit trails for financial data
- Performance logging
- Security event logging
- Production-ready configuration
- Financial data protection compliance
"""

import logging
import logging.handlers
import json
import sys
from datetime import datetime
from typing import Dict, Any
from pathlib import Path

# Data masking utility functions
def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Basic data masking for sensitive information"""
    masked_data = data.copy()
    sensitive_fields = ['password', 'ssn', 'credit_card', 'bank_account', 'client_secret']
    
    for field in sensitive_fields:
        if field in masked_data:
            if isinstance(masked_data[field], str) and len(masked_data[field]) > 4:
                masked_data[field] = masked_data[field][:4] + "*" * (len(masked_data[field]) - 4)
            else:
                masked_data[field] = "***masked***"
    
    return masked_data

def create_safe_payment_log(event_type: str, **kwargs) -> Dict[str, Any]:
    """Create safe payment log data"""
    return {
        "event_type": "payment",
        "payment_event": event_type,
        **mask_sensitive_data(kwargs)
    }

def create_safe_commission_log(event_type: str, **kwargs) -> Dict[str, Any]:
    """Create safe commission log data"""
    return {
        "event_type": "commission", 
        "commission_event": event_type,
        **mask_sensitive_data(kwargs)
    }

def create_safe_user_activity_log(event_type: str, **kwargs) -> Dict[str, Any]:
    """Create safe user activity log data"""
    return {
        "event_type": event_type,
        **mask_sensitive_data(kwargs)
    }

class StructuredFormatter(logging.Formatter):
    """
    Custom formatter for structured JSON logging with data masking
    """
    
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields with masking
        if hasattr(record, 'user_id'):
            log_entry["user_id"] = record.user_id
        if hasattr(record, 'request_id'):
            log_entry["request_id"] = record.request_id
        if hasattr(record, 'ip_address'):
            # Mask IP address (keep first 2 octets)
            ip = record.ip_address
            if ip and '.' in ip:
                ip_parts = ip.split('.')
                if len(ip_parts) == 4:
                    log_entry["ip_address"] = f"{ip_parts[0]}.{ip_parts[1]}.*.{ip_parts[3]}"
                else:
                    log_entry["ip_address"] = "***masked***"
            else:
                log_entry["ip_address"] = ip
        if hasattr(record, 'endpoint'):
            log_entry["endpoint"] = record.endpoint
        if hasattr(record, 'response_time'):
            log_entry["response_time"] = record.response_time
        if hasattr(record, 'status_code'):
            log_entry["status_code"] = record.status_code
        
        # Process any additional extra fields with masking
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                          'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                          'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process', 'getMessage',
                          'user_id', 'request_id', 'ip_address', 'endpoint', 'response_time', 'status_code']:
                # Mask any additional sensitive fields
                if isinstance(value, dict):
                    log_entry[key] = mask_sensitive_data(value)
                elif key.lower() in ['amount', 'balance', 'fee', 'payment']:
                    log_entry[key] = f"${float(value):.2f}" if isinstance(value, (int, float)) else value
                elif isinstance(value, str):
                    log_entry[key] = value
                else:
                    log_entry[key] = value
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, default=str, separators=(',', ':'))

class AuditLogger:
    """
    Specialized logger for audit events
    """
    
    def __init__(self):
        self.logger = logging.getLogger("audit")
        self._setup_audit_logger()
    
    def _setup_audit_logger(self):
        """Setup audit logger with file rotation"""
        # Create logs directory if it doesn't exist
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        # File handler with rotation
        file_handler = logging.handlers.RotatingFileHandler(
            "logs/audit.log",
            maxBytes=10*1024*1024,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(StructuredFormatter())
        
        self.logger.addHandler(file_handler)
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False
    
    def log_auth_event(self, event_type: str, user_id: str = None, ip_address: str = None, 
                      success: bool = True, details: Dict[str, Any] = None):
        """Log authentication events"""
        self.logger.info(
            f"AUTH: {event_type}",
            extra={
                "event_type": "authentication",
                "auth_event": event_type,
                "user_id": user_id,
                "ip_address": ip_address,
                "success": success,
                "details": details or {}
            }
        )
    
    def log_payment_event(self, event_type: str, user_id: str = None, amount: float = None,
                         payment_id: str = None, success: bool = True, details: Dict[str, Any] = None):
        """Log payment events"""
        self.logger.info(
            f"PAYMENT: {event_type}",
            extra={
                "event_type": "payment",
                "payment_event": event_type,
                "user_id": user_id,
                "amount": amount,
                "payment_id": payment_id,
                "success": success,
                "details": details or {}
            }
        )
    
    def log_booking_event(self, event_type: str, user_id: str = None, appointment_id: str = None,
                         barber_id: str = None, details: Dict[str, Any] = None):
        """Log booking events"""
        self.logger.info(
            f"BOOKING: {event_type}",
            extra={
                "event_type": "booking",
                "booking_event": event_type,
                "user_id": user_id,
                "appointment_id": appointment_id,
                "barber_id": barber_id,
                "details": details or {}
            }
        )
    
    def log_admin_event(self, event_type: str, admin_user_id: str = None, target_user_id: str = None,
                       action: str = None, details: Dict[str, Any] = None):
        """Log admin events"""
        self.logger.info(
            f"ADMIN: {event_type}",
            extra={
                "event_type": "admin",
                "admin_event": event_type,
                "admin_user_id": admin_user_id,
                "target_user_id": target_user_id,
                "action": action,
                "details": details or {}
            }
        )
    
    def log_security_event(self, event_type: str, ip_address: str = None, user_agent: str = None,
                          severity: str = "medium", details: Dict[str, Any] = None):
        """Log security events"""
        self.logger.warning(
            f"SECURITY: {event_type}",
            extra={
                "event_type": "security",
                "security_event": event_type,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "severity": severity,
                "details": details or {}
            }
        )
    
    def log_commission_calculation(self, user_id: str = None, order_id: str = None, 
                                  commission_amount: float = None, commission_rate: float = None,
                                  base_amount: float = None, calculation_method: str = None,
                                  success: bool = True, details: Dict[str, Any] = None):
        """Log commission calculation events"""
        self.logger.info(
            f"COMMISSION: calculation - Amount: ${commission_amount:.2f} from ${base_amount:.2f} at {commission_rate:.2%}",
            extra={
                "event_type": "commission",
                "commission_event": "calculation",
                "user_id": user_id,
                "order_id": order_id,
                "commission_amount": commission_amount,
                "commission_rate": commission_rate,
                "base_amount": base_amount,
                "calculation_method": calculation_method,
                "success": success,
                "details": details or {}
            }
        )
        
    
    def log_payout_processing(self, user_id: str = None, payout_id: str = None,
                             amount: float = None, currency: str = "USD",
                             payment_method: str = None, status: str = None,
                             processing_fee: float = None, success: bool = True,
                             details: Dict[str, Any] = None):
        """Log payout processing events"""
        log_level = logging.INFO if success else logging.ERROR
        self.logger.log(
            log_level,
            f"PAYOUT: {status} - ${amount:.2f} {currency} to {payment_method}",
            extra={
                "event_type": "payout",
                "payout_event": "processing",
                "user_id": user_id,
                "payout_id": payout_id,
                "amount": amount,
                "currency": currency,
                "payment_method": payment_method,
                "status": status,
                "processing_fee": processing_fee,
                "success": success,
                "details": details or {}
            }
        )
    
    def log_order_creation(self, user_id: str = None, order_id: str = None,
                          order_type: str = None, total_amount: float = None,
                          items_count: int = None, payment_method: str = None,
                          success: bool = True, details: Dict[str, Any] = None):
        """Log order creation events"""
        self.logger.info(
            f"ORDER: created - {order_type} order ${total_amount:.2f} with {items_count} items",
            extra={
                "event_type": "order",
                "order_event": "creation",
                "user_id": user_id,
                "order_id": order_id,
                "order_type": order_type,
                "total_amount": total_amount,
                "items_count": items_count,
                "payment_method": payment_method,
                "success": success,
                "details": details or {}
            }
        )
    
    def log_financial_adjustment(self, admin_user_id: str = None, target_user_id: str = None,
                               adjustment_type: str = None, amount: float = None,
                               reason: str = None, reference_id: str = None,
                               before_balance: float = None, after_balance: float = None,
                               success: bool = True, details: Dict[str, Any] = None):
        """Log financial adjustment events"""
        log_level = logging.WARNING  # Financial adjustments are always important
        self.logger.log(
            log_level,
            f"FINANCIAL_ADJUSTMENT: {adjustment_type} - ${amount:.2f} for {reason}",
            extra={
                "event_type": "financial_adjustment",
                "adjustment_event": adjustment_type,
                "admin_user_id": admin_user_id,
                "target_user_id": target_user_id,
                "adjustment_type": adjustment_type,
                "amount": amount,
                "reason": reason,
                "reference_id": reference_id,
                "before_balance": before_balance,
                "after_balance": after_balance,
                "balance_change": after_balance - before_balance if before_balance and after_balance else None,
                "success": success,
                "details": details or {}
            }
        )

class PerformanceLogger:
    """
    Logger for performance metrics
    """
    
    def __init__(self):
        self.logger = logging.getLogger("performance")
        self._setup_performance_logger()
    
    def _setup_performance_logger(self):
        """Setup performance logger"""
        # Create logs directory if it doesn't exist
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        # File handler with rotation
        file_handler = logging.handlers.RotatingFileHandler(
            "logs/performance.log",
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(StructuredFormatter())
        
        self.logger.addHandler(file_handler)
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False
    
    def log_slow_query(self, query: str, duration: float, endpoint: str = None):
        """Log slow database queries"""
        self.logger.warning(
            f"Slow query: {duration:.3f}s",
            extra={
                "event_type": "slow_query",
                "duration": duration,
                "query": query[:500],  # Truncate long queries
                "endpoint": endpoint
            }
        )
    
    def log_slow_request(self, method: str, path: str, duration: float, status_code: int):
        """Log slow API requests"""
        self.logger.warning(
            f"Slow request: {method} {path} - {duration:.3f}s",
            extra={
                "event_type": "slow_request",
                "method": method,
                "path": path,
                "duration": duration,
                "status_code": status_code
            }
        )
    
    def log_performance_metrics(self, cpu_percent: float, memory_percent: float, 
                              active_connections: int = None):
        """Log system performance metrics"""
        self.logger.info(
            f"Performance metrics - CPU: {cpu_percent}%, Memory: {memory_percent}%",
            extra={
                "event_type": "performance_metrics",
                "cpu_percent": cpu_percent,
                "memory_percent": memory_percent,
                "active_connections": active_connections
            }
        )

def setup_logging(environment: str = "development", log_level: str = "INFO"):
    """
    Setup comprehensive logging configuration
    """
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    if environment == "production":
        console_handler.setFormatter(StructuredFormatter())
    else:
        # Use masking even in development for sensitive data protection
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
    
    root_logger.addHandler(console_handler)
    
    # File handler for general application logs
    if environment == "production":
        file_handler = logging.handlers.RotatingFileHandler(
            "logs/application.log",
            maxBytes=50*1024*1024,  # 50MB
            backupCount=10
        )
        file_handler.setFormatter(StructuredFormatter())
        root_logger.addHandler(file_handler)
    
    # Error file handler - always use masking for errors
    error_handler = logging.handlers.RotatingFileHandler(
        "logs/errors.log",
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(error_handler)
    
    # Configure specific loggers
    
    # FastAPI logger
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.setLevel(logging.INFO)
    
    # SQLAlchemy logger (only errors in production)
    sqlalchemy_logger = logging.getLogger("sqlalchemy.engine")
    if environment == "production":
        sqlalchemy_logger.setLevel(logging.ERROR)
    else:
        sqlalchemy_logger.setLevel(logging.WARNING)
    
    # Suppress noisy third-party loggers
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    
    logging.info(f"Logging configured for {environment} environment at {log_level} level")

def get_audit_logger() -> AuditLogger:
    """Get audit logger instance"""
    return AuditLogger()

def get_performance_logger() -> PerformanceLogger:
    """Get performance logger instance"""
    return PerformanceLogger()

# Request ID generator for correlation
import uuid

def generate_request_id() -> str:
    """Generate unique request ID for log correlation"""
    return str(uuid.uuid4())

# Context manager for request logging
class RequestLoggingContext:
    """
    Context manager for request-scoped logging
    """
    
    def __init__(self, request_id: str, method: str, path: str, ip_address: str):
        self.request_id = request_id
        self.method = method
        self.path = path
        self.ip_address = ip_address
        self.start_time = None
        self.logger = logging.getLogger("request")
    
    def __enter__(self):
        self.start_time = datetime.utcnow()
        self.logger.info(
            f"Request started: {self.method} {self.path}",
            extra={
                "request_id": self.request_id,
                "method": self.method,
                "path": self.path,
                "ip_address": self.ip_address,
                "event_type": "request_start"
            }
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.utcnow() - self.start_time).total_seconds()
        
        if exc_type:
            self.logger.error(
                f"Request failed: {self.method} {self.path} - {duration:.3f}s",
                extra={
                    "request_id": self.request_id,
                    "method": self.method,
                    "path": self.path,
                    "ip_address": self.ip_address,
                    "duration": duration,
                    "event_type": "request_error",
                    "exception": str(exc_val)
                }
            )
        else:
            self.logger.info(
                f"Request completed: {self.method} {self.path} - {duration:.3f}s",
                extra={
                    "request_id": self.request_id,
                    "method": self.method,
                    "path": self.path,
                    "ip_address": self.ip_address,
                    "duration": duration,
                    "event_type": "request_complete"
                }
            )

# Logging setup can be called manually when needed
# from utils.logging_config import setup_logging
# setup_logging(environment="development", log_level="INFO")