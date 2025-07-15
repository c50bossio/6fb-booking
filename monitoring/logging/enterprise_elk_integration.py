"""
Enterprise ELK Stack Integration for BookedBarber V2
=================================================

Comprehensive log aggregation, analysis, and visualization system
for 10,000+ concurrent users with advanced search and alerting.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import os
import hashlib
from elasticsearch import AsyncElasticsearch
from elasticsearch.helpers import async_bulk
import structlog

logger = logging.getLogger(__name__)


class LogLevel(str, Enum):
    """Log levels for categorization"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogCategory(str, Enum):
    """Log categories for classification"""
    APPLICATION = "application"
    SECURITY = "security"
    BUSINESS = "business"
    PERFORMANCE = "performance"
    INFRASTRUCTURE = "infrastructure"
    AUDIT = "audit"


@dataclass
class StructuredLogEntry:
    """Structured log entry for ELK ingestion"""
    timestamp: datetime
    level: LogLevel
    category: LogCategory
    service: str
    message: str
    logger_name: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    response_code: Optional[int] = None
    response_time_ms: Optional[float] = None
    business_context: Optional[Dict[str, Any]] = None
    error_details: Optional[Dict[str, Any]] = None
    stack_trace: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Elasticsearch"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['level'] = self.level.value
        data['category'] = self.category.value
        
        # Add computed fields
        data['@timestamp'] = self.timestamp.isoformat()
        data['log_id'] = self._generate_log_id()
        data['service_category'] = f"{self.service}_{self.category.value}"
        
        # Add time-based fields for indexing
        data['year'] = self.timestamp.year
        data['month'] = self.timestamp.month
        data['day'] = self.timestamp.day
        data['hour'] = self.timestamp.hour
        data['weekday'] = self.timestamp.weekday()
        
        return data
    
    def _generate_log_id(self) -> str:
        """Generate unique log ID"""
        content = f"{self.timestamp.isoformat()}{self.service}{self.message}{self.logger_name}"
        return hashlib.md5(content.encode()).hexdigest()


class ElasticsearchManager:
    """Manages Elasticsearch connection and operations"""
    
    def __init__(self):
        self.es_client: Optional[AsyncElasticsearch] = None
        self.index_prefix = os.getenv("ELK_INDEX_PREFIX", "bookedbarber-v2")
        self.es_hosts = os.getenv("ELASTICSEARCH_HOSTS", "localhost:9200").split(",")
        self.es_username = os.getenv("ELASTICSEARCH_USERNAME")
        self.es_password = os.getenv("ELASTICSEARCH_PASSWORD")
        self.es_cloud_id = os.getenv("ELASTICSEARCH_CLOUD_ID")
        self.es_api_key = os.getenv("ELASTICSEARCH_API_KEY")
        
        # Index settings
        self.index_settings = {
            "settings": {
                "number_of_shards": 3,
                "number_of_replicas": 1,
                "index": {
                    "codec": "best_compression",
                    "refresh_interval": "5s",
                    "max_result_window": 50000
                },
                "analysis": {
                    "analyzer": {
                        "log_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": ["lowercase", "stop", "snowball"]
                        }
                    }
                }
            },
            "mappings": {
                "properties": {
                    "@timestamp": {"type": "date"},
                    "timestamp": {"type": "date"},
                    "level": {"type": "keyword"},
                    "category": {"type": "keyword"},
                    "service": {"type": "keyword"},
                    "service_category": {"type": "keyword"},
                    "message": {
                        "type": "text",
                        "analyzer": "log_analyzer",
                        "fields": {
                            "keyword": {"type": "keyword", "ignore_above": 256}
                        }
                    },
                    "logger_name": {"type": "keyword"},
                    "user_id": {"type": "keyword"},
                    "session_id": {"type": "keyword"},
                    "request_id": {"type": "keyword"},
                    "trace_id": {"type": "keyword"},
                    "ip_address": {"type": "ip"},
                    "user_agent": {
                        "type": "text",
                        "fields": {
                            "keyword": {"type": "keyword", "ignore_above": 256}
                        }
                    },
                    "endpoint": {"type": "keyword"},
                    "method": {"type": "keyword"},
                    "response_code": {"type": "integer"},
                    "response_time_ms": {"type": "float"},
                    "business_context": {"type": "object"},
                    "error_details": {"type": "object"},
                    "stack_trace": {
                        "type": "text",
                        "index": False
                    },
                    "metadata": {"type": "object"},
                    "log_id": {"type": "keyword"},
                    "year": {"type": "integer"},
                    "month": {"type": "integer"},
                    "day": {"type": "integer"},
                    "hour": {"type": "integer"},
                    "weekday": {"type": "integer"}
                }
            }
        }
    
    async def initialize(self):
        """Initialize Elasticsearch connection"""
        try:
            # Configure connection
            if self.es_cloud_id and self.es_api_key:
                # Elastic Cloud connection
                self.es_client = AsyncElasticsearch(
                    cloud_id=self.es_cloud_id,
                    api_key=self.es_api_key,
                    request_timeout=30,
                    retry_on_timeout=True,
                    max_retries=3
                )
            elif self.es_username and self.es_password:
                # Basic auth connection
                self.es_client = AsyncElasticsearch(
                    hosts=self.es_hosts,
                    http_auth=(self.es_username, self.es_password),
                    request_timeout=30,
                    retry_on_timeout=True,
                    max_retries=3
                )
            else:
                # No auth connection (development)
                self.es_client = AsyncElasticsearch(
                    hosts=self.es_hosts,
                    request_timeout=30,
                    retry_on_timeout=True,
                    max_retries=3
                )
            
            # Test connection
            if await self.es_client.ping():
                logger.info("Successfully connected to Elasticsearch")
                
                # Create index templates
                await self._create_index_templates()
                
                # Create initial indices
                await self._create_initial_indices()
                
            else:
                logger.error("Failed to connect to Elasticsearch")
                
        except Exception as e:
            logger.error(f"Failed to initialize Elasticsearch: {e}")
    
    async def _create_index_templates(self):
        """Create index templates for log data"""
        try:
            template_name = f"{self.index_prefix}-logs"
            
            template_body = {
                "index_patterns": [f"{self.index_prefix}-logs-*"],
                "template": self.index_settings,
                "priority": 100,
                "version": 1,
                "_meta": {
                    "description": "Template for BookedBarber V2 application logs"
                }
            }
            
            await self.es_client.indices.put_index_template(
                name=template_name,
                body=template_body
            )
            
            logger.info(f"Created index template: {template_name}")
            
        except Exception as e:
            logger.error(f"Failed to create index template: {e}")
    
    async def _create_initial_indices(self):
        """Create initial daily indices"""
        try:
            today = datetime.utcnow().strftime("%Y.%m.%d")
            index_name = f"{self.index_prefix}-logs-{today}"
            
            if not await self.es_client.indices.exists(index=index_name):
                await self.es_client.indices.create(
                    index=index_name,
                    body=self.index_settings
                )
                logger.info(f"Created index: {index_name}")
            
        except Exception as e:
            logger.error(f"Failed to create initial indices: {e}")
    
    def get_daily_index_name(self, date: datetime = None) -> str:
        """Get daily index name for a given date"""
        if date is None:
            date = datetime.utcnow()
        return f"{self.index_prefix}-logs-{date.strftime('%Y.%m.%d')}"
    
    async def index_log(self, log_entry: StructuredLogEntry):
        """Index a single log entry"""
        try:
            if not self.es_client:
                logger.warning("Elasticsearch client not initialized")
                return
            
            index_name = self.get_daily_index_name(log_entry.timestamp)
            
            await self.es_client.index(
                index=index_name,
                id=log_entry.to_dict()['log_id'],
                body=log_entry.to_dict()
            )
            
        except Exception as e:
            logger.error(f"Failed to index log entry: {e}")
    
    async def bulk_index_logs(self, log_entries: List[StructuredLogEntry]):
        """Bulk index multiple log entries"""
        try:
            if not self.es_client or not log_entries:
                return
            
            actions = []
            for log_entry in log_entries:
                index_name = self.get_daily_index_name(log_entry.timestamp)
                log_dict = log_entry.to_dict()
                
                action = {
                    "_index": index_name,
                    "_id": log_dict['log_id'],
                    "_source": log_dict
                }
                actions.append(action)
            
            success_count, failed_items = await async_bulk(
                self.es_client,
                actions,
                chunk_size=500,
                request_timeout=60
            )
            
            if failed_items:
                logger.warning(f"Failed to index {len(failed_items)} log entries")
            
            logger.debug(f"Successfully indexed {success_count} log entries")
            
        except Exception as e:
            logger.error(f"Failed to bulk index logs: {e}")
    
    async def search_logs(
        self,
        query: str = None,
        filters: Dict[str, Any] = None,
        start_time: datetime = None,
        end_time: datetime = None,
        size: int = 100,
        sort_field: str = "@timestamp",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """Search logs with various filters"""
        try:
            if not self.es_client:
                return {"hits": {"hits": [], "total": {"value": 0}}}
            
            # Build query
            query_body = {
                "size": size,
                "sort": [{sort_field: {"order": sort_order}}],
                "query": {"bool": {"must": [], "filter": []}}
            }
            
            # Add text search
            if query:
                query_body["query"]["bool"]["must"].append({
                    "multi_match": {
                        "query": query,
                        "fields": ["message", "error_details.*", "business_context.*"],
                        "type": "best_fields"
                    }
                })
            else:
                query_body["query"]["bool"]["must"].append({"match_all": {}})
            
            # Add time range filter
            if start_time or end_time:
                time_range = {}
                if start_time:
                    time_range["gte"] = start_time.isoformat()
                if end_time:
                    time_range["lte"] = end_time.isoformat()
                
                query_body["query"]["bool"]["filter"].append({
                    "range": {"@timestamp": time_range}
                })
            
            # Add additional filters
            if filters:
                for field, value in filters.items():
                    if isinstance(value, list):
                        query_body["query"]["bool"]["filter"].append({
                            "terms": {field: value}
                        })
                    else:
                        query_body["query"]["bool"]["filter"].append({
                            "term": {field: value}
                        })
            
            # Determine indices to search
            if start_time and end_time:
                indices = self._get_indices_for_time_range(start_time, end_time)
            else:
                # Search last 7 days by default
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=7)
                indices = self._get_indices_for_time_range(start_date, end_date)
            
            index_pattern = ",".join(indices)
            
            # Execute search
            response = await self.es_client.search(
                index=index_pattern,
                body=query_body
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to search logs: {e}")
            return {"hits": {"hits": [], "total": {"value": 0}}}
    
    def _get_indices_for_time_range(self, start_time: datetime, end_time: datetime) -> List[str]:
        """Get list of indices for a time range"""
        indices = []
        current_date = start_time.date()
        end_date = end_time.date()
        
        while current_date <= end_date:
            index_name = f"{self.index_prefix}-logs-{current_date.strftime('%Y.%m.%d')}"
            indices.append(index_name)
            current_date += timedelta(days=1)
        
        return indices
    
    async def get_log_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Get log statistics for dashboard"""
        try:
            if not self.es_client:
                return {}
            
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=hours)
            
            # Build aggregation query
            query_body = {
                "size": 0,
                "query": {
                    "range": {
                        "@timestamp": {
                            "gte": start_time.isoformat(),
                            "lte": end_time.isoformat()
                        }
                    }
                },
                "aggs": {
                    "levels": {
                        "terms": {"field": "level", "size": 10}
                    },
                    "categories": {
                        "terms": {"field": "category", "size": 10}
                    },
                    "services": {
                        "terms": {"field": "service", "size": 10}
                    },
                    "hourly_counts": {
                        "date_histogram": {
                            "field": "@timestamp",
                            "calendar_interval": "hour"
                        }
                    },
                    "error_frequency": {
                        "filter": {"term": {"level": "error"}},
                        "aggs": {
                            "error_messages": {
                                "terms": {"field": "message.keyword", "size": 5}
                            }
                        }
                    }
                }
            }
            
            indices = self._get_indices_for_time_range(start_time, end_time)
            index_pattern = ",".join(indices)
            
            response = await self.es_client.search(
                index=index_pattern,
                body=query_body
            )
            
            return {
                "total_logs": response["hits"]["total"]["value"],
                "level_distribution": response["aggregations"]["levels"]["buckets"],
                "category_distribution": response["aggregations"]["categories"]["buckets"],
                "service_distribution": response["aggregations"]["services"]["buckets"],
                "hourly_counts": response["aggregations"]["hourly_counts"]["buckets"],
                "top_errors": response["aggregations"]["error_frequency"]["error_messages"]["buckets"],
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get log statistics: {e}")
            return {}
    
    async def cleanup_old_indices(self, retention_days: int = 30):
        """Clean up old log indices"""
        try:
            if not self.es_client:
                return
            
            cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
            
            # Get all indices
            indices = await self.es_client.indices.get(f"{self.index_prefix}-logs-*")
            
            for index_name in indices.keys():
                # Extract date from index name
                try:
                    date_str = index_name.split("-logs-")[1]
                    index_date = datetime.strptime(date_str, "%Y.%m.%d")
                    
                    if index_date.date() < cutoff_date.date():
                        await self.es_client.indices.delete(index=index_name)
                        logger.info(f"Deleted old index: {index_name}")
                        
                except Exception as e:
                    logger.warning(f"Failed to parse date from index {index_name}: {e}")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old indices: {e}")


class EnterpriseLogHandler(logging.Handler):
    """Custom log handler for ELK integration"""
    
    def __init__(self, elasticsearch_manager: ElasticsearchManager):
        super().__init__()
        self.es_manager = elasticsearch_manager
        self.service_name = os.getenv("SERVICE_NAME", "bookedbarber-api")
        self.log_buffer: List[StructuredLogEntry] = []
        self.buffer_size = 100
        self.flush_interval = 10  # seconds
        
        # Start background flush task
        asyncio.create_task(self._periodic_flush())
    
    def emit(self, record: logging.LogRecord):
        """Handle log record emission"""
        try:
            # Convert log record to structured log entry
            log_entry = self._convert_record_to_structured_log(record)
            
            # Add to buffer
            self.log_buffer.append(log_entry)
            
            # Flush if buffer is full
            if len(self.log_buffer) >= self.buffer_size:
                asyncio.create_task(self._flush_buffer())
                
        except Exception as e:
            print(f"Failed to emit log record: {e}")
    
    def _convert_record_to_structured_log(self, record: logging.LogRecord) -> StructuredLogEntry:
        """Convert log record to structured log entry"""
        
        # Determine log level
        level_map = {
            "DEBUG": LogLevel.DEBUG,
            "INFO": LogLevel.INFO,
            "WARNING": LogLevel.WARNING,
            "ERROR": LogLevel.ERROR,
            "CRITICAL": LogLevel.CRITICAL
        }
        level = level_map.get(record.levelname, LogLevel.INFO)
        
        # Determine category from logger name
        category = LogCategory.APPLICATION
        if "security" in record.name.lower():
            category = LogCategory.SECURITY
        elif "business" in record.name.lower():
            category = LogCategory.BUSINESS
        elif "performance" in record.name.lower():
            category = LogCategory.PERFORMANCE
        elif "audit" in record.name.lower():
            category = LogCategory.AUDIT
        
        # Extract structured data from record
        structured_data = getattr(record, 'structured_data', {})
        
        # Create structured log entry
        log_entry = StructuredLogEntry(
            timestamp=datetime.fromtimestamp(record.created),
            level=level,
            category=category,
            service=self.service_name,
            message=record.getMessage(),
            logger_name=record.name,
            user_id=structured_data.get('user_id'),
            session_id=structured_data.get('session_id'),
            request_id=structured_data.get('request_id'),
            trace_id=structured_data.get('trace_id'),
            ip_address=structured_data.get('ip_address'),
            user_agent=structured_data.get('user_agent'),
            endpoint=structured_data.get('endpoint'),
            method=structured_data.get('method'),
            response_code=structured_data.get('response_code'),
            response_time_ms=structured_data.get('response_time_ms'),
            business_context=structured_data.get('business_context'),
            error_details=structured_data.get('error_details'),
            stack_trace=record.exc_text if hasattr(record, 'exc_text') else None,
            metadata=structured_data.get('metadata')
        )
        
        return log_entry
    
    async def _flush_buffer(self):
        """Flush log buffer to Elasticsearch"""
        if not self.log_buffer:
            return
        
        try:
            # Copy buffer and clear
            logs_to_flush = self.log_buffer.copy()
            self.log_buffer.clear()
            
            # Bulk index logs
            await self.es_manager.bulk_index_logs(logs_to_flush)
            
        except Exception as e:
            logger.error(f"Failed to flush log buffer: {e}")
            # Re-add logs to buffer on failure
            self.log_buffer.extend(logs_to_flush)
    
    async def _periodic_flush(self):
        """Periodically flush buffer"""
        while True:
            try:
                await asyncio.sleep(self.flush_interval)
                await self._flush_buffer()
            except Exception as e:
                logger.error(f"Error in periodic flush: {e}")


class StructuredLogger:
    """Structured logger for consistent log formatting"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.name = name
    
    def _log_with_structure(self, level: str, message: str, **kwargs):
        """Log with structured data"""
        # Create log record
        record = self.logger.makeRecord(
            name=self.name,
            level=getattr(logging, level.upper()),
            fn="",
            lno=0,
            msg=message,
            args=(),
            exc_info=None
        )
        
        # Add structured data
        record.structured_data = kwargs
        
        # Emit record
        self.logger.handle(record)
    
    def info(self, message: str, **kwargs):
        """Log info message with structured data"""
        self._log_with_structure("info", message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with structured data"""
        self._log_with_structure("warning", message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message with structured data"""
        self._log_with_structure("error", message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message with structured data"""
        self._log_with_structure("critical", message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with structured data"""
        self._log_with_structure("debug", message, **kwargs)
    
    def log_business_event(self, event: str, user_id: str = None, **context):
        """Log business event"""
        self.info(
            f"Business event: {event}",
            user_id=user_id,
            business_context={
                "event_type": event,
                **context
            }
        )
    
    def log_security_event(self, event: str, ip_address: str = None, user_id: str = None, **details):
        """Log security event"""
        self.warning(
            f"Security event: {event}",
            user_id=user_id,
            ip_address=ip_address,
            metadata={
                "security_event": event,
                **details
            }
        )
    
    def log_performance_event(self, operation: str, duration_ms: float, **context):
        """Log performance event"""
        level = "warning" if duration_ms > 1000 else "info"
        self._log_with_structure(
            level,
            f"Performance: {operation} took {duration_ms:.2f}ms",
            response_time_ms=duration_ms,
            metadata={
                "operation": operation,
                "performance_category": "timing",
                **context
            }
        )
    
    def log_api_request(self, method: str, endpoint: str, response_code: int, 
                       response_time_ms: float, user_id: str = None, **context):
        """Log API request"""
        self.info(
            f"API {method} {endpoint} -> {response_code} ({response_time_ms:.2f}ms)",
            method=method,
            endpoint=endpoint,
            response_code=response_code,
            response_time_ms=response_time_ms,
            user_id=user_id,
            **context
        )


class ELKMonitoringSystem:
    """Enterprise ELK monitoring and alerting system"""
    
    def __init__(self):
        self.es_manager = ElasticsearchManager()
        self.log_handler: Optional[EnterpriseLogHandler] = None
        self.monitoring_rules = self._define_monitoring_rules()
        
    def _define_monitoring_rules(self) -> Dict[str, Dict[str, Any]]:
        """Define log monitoring and alerting rules"""
        return {
            "high_error_rate": {
                "description": "High error rate detected",
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"level": "error"}},
                            {"range": {"@timestamp": {"gte": "now-5m"}}}
                        ]
                    }
                },
                "threshold": 10,
                "time_window": "5m",
                "alert_severity": "warning"
            },
            "critical_errors": {
                "description": "Critical errors detected",
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"level": "critical"}},
                            {"range": {"@timestamp": {"gte": "now-1m"}}}
                        ]
                    }
                },
                "threshold": 1,
                "time_window": "1m",
                "alert_severity": "critical"
            },
            "payment_failures": {
                "description": "Payment processing failures",
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"category": "business"}},
                            {"match": {"message": "payment failed"}},
                            {"range": {"@timestamp": {"gte": "now-10m"}}}
                        ]
                    }
                },
                "threshold": 5,
                "time_window": "10m",
                "alert_severity": "critical"
            },
            "security_incidents": {
                "description": "Security incidents detected",
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"category": "security"}},
                            {"range": {"@timestamp": {"gte": "now-1m"}}}
                        ]
                    }
                },
                "threshold": 1,
                "time_window": "1m",
                "alert_severity": "critical"
            },
            "slow_responses": {
                "description": "Slow API responses",
                "query": {
                    "bool": {
                        "must": [
                            {"range": {"response_time_ms": {"gte": 2000}}},
                            {"range": {"@timestamp": {"gte": "now-5m"}}}
                        ]
                    }
                },
                "threshold": 20,
                "time_window": "5m",
                "alert_severity": "warning"
            }
        }
    
    async def initialize(self):
        """Initialize ELK monitoring system"""
        try:
            # Initialize Elasticsearch
            await self.es_manager.initialize()
            
            # Set up log handler
            self.log_handler = EnterpriseLogHandler(self.es_manager)
            
            # Configure root logger
            root_logger = logging.getLogger()
            root_logger.addHandler(self.log_handler)
            root_logger.setLevel(logging.INFO)
            
            # Start monitoring tasks
            asyncio.create_task(self._monitoring_worker())
            asyncio.create_task(self._cleanup_worker())
            
            logger.info("ELK monitoring system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize ELK monitoring system: {e}")
    
    async def _monitoring_worker(self):
        """Background worker for log monitoring and alerting"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                for rule_name, rule in self.monitoring_rules.items():
                    await self._check_monitoring_rule(rule_name, rule)
                    
            except Exception as e:
                logger.error(f"Error in monitoring worker: {e}")
                await asyncio.sleep(60)
    
    async def _check_monitoring_rule(self, rule_name: str, rule: Dict[str, Any]):
        """Check a specific monitoring rule"""
        try:
            # Execute search query
            response = await self.es_manager.es_client.count(
                index=f"{self.es_manager.index_prefix}-logs-*",
                body={"query": rule["query"]}
            )
            
            count = response["count"]
            threshold = rule["threshold"]
            
            if count >= threshold:
                # Trigger alert
                await self._trigger_log_alert(rule_name, rule, count)
                
        except Exception as e:
            logger.error(f"Failed to check monitoring rule {rule_name}: {e}")
    
    async def _trigger_log_alert(self, rule_name: str, rule: Dict[str, Any], count: int):
        """Trigger alert for monitoring rule violation"""
        try:
            # Import here to avoid circular imports
            from monitoring.alerting.enterprise_alerting_system import send_alert, AlertSeverity
            
            severity_map = {
                "warning": AlertSeverity.WARNING,
                "critical": AlertSeverity.CRITICAL,
            }
            
            await send_alert(
                title=f"Log Monitoring Alert: {rule['description']}",
                description=f"Rule '{rule_name}' triggered with {count} matches (threshold: {rule['threshold']})",
                severity=severity_map.get(rule["alert_severity"], AlertSeverity.WARNING),
                source="log_monitoring",
                category="infrastructure",
                metadata={
                    "rule_name": rule_name,
                    "count": count,
                    "threshold": rule["threshold"],
                    "time_window": rule["time_window"]
                },
                tags=["logs", "monitoring", rule["alert_severity"]]
            )
            
        except Exception as e:
            logger.error(f"Failed to trigger log alert: {e}")
    
    async def _cleanup_worker(self):
        """Background worker for cleanup tasks"""
        while True:
            try:
                # Run cleanup once per day
                await asyncio.sleep(24 * 3600)
                
                # Clean up old indices
                retention_days = int(os.getenv("LOG_RETENTION_DAYS", "30"))
                await self.es_manager.cleanup_old_indices(retention_days)
                
            except Exception as e:
                logger.error(f"Error in cleanup worker: {e}")
    
    async def create_dashboard_data(self) -> Dict[str, Any]:
        """Create data for logging dashboard"""
        try:
            # Get log statistics
            stats_24h = await self.es_manager.get_log_statistics(24)
            stats_7d = await self.es_manager.get_log_statistics(24 * 7)
            
            # Search for recent errors
            recent_errors = await self.es_manager.search_logs(
                filters={"level": "error"},
                start_time=datetime.utcnow() - timedelta(hours=1),
                size=10
            )
            
            return {
                "statistics": {
                    "last_24h": stats_24h,
                    "last_7d": stats_7d
                },
                "recent_errors": [hit["_source"] for hit in recent_errors["hits"]["hits"]],
                "monitoring_rules": self.monitoring_rules,
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create dashboard data: {e}")
            return {}


# Global ELK system instance
elk_system = ELKMonitoringSystem()

# Convenience functions
def get_structured_logger(name: str) -> StructuredLogger:
    """Get structured logger instance"""
    return StructuredLogger(name)

async def initialize_elk_system():
    """Initialize ELK monitoring system"""
    await elk_system.initialize()

async def search_logs(query: str = None, **kwargs) -> Dict[str, Any]:
    """Search logs"""
    return await elk_system.es_manager.search_logs(query, **kwargs)

async def get_log_dashboard_data() -> Dict[str, Any]:
    """Get dashboard data"""
    return await elk_system.create_dashboard_data()

# Example usage for different log types
business_logger = get_structured_logger("business")
security_logger = get_structured_logger("security")
performance_logger = get_structured_logger("performance")
api_logger = get_structured_logger("api")