"""
ELK Stack Integration for BookedBarber V2
=========================================

Comprehensive log aggregation system with Elasticsearch, Logstash, and Kibana
integration for centralized logging and analysis at enterprise scale.
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import aiofiles
from pathlib import Path
import gzip
import hashlib


class LogLevel(Enum):
    """Log levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogSource(Enum):
    """Log sources"""
    APPLICATION = "application"
    API = "api"
    DATABASE = "database"
    CACHE = "cache"
    PAYMENT = "payment"
    NOTIFICATION = "notification"
    SECURITY = "security"
    AUDIT = "audit"
    PERFORMANCE = "performance"


@dataclass
class StructuredLogEntry:
    """Structured log entry"""
    timestamp: datetime
    level: LogLevel
    source: LogSource
    message: str
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    response_time_ms: Optional[float] = None
    error_code: Optional[str] = None
    stack_trace: Optional[str] = None
    metadata: Dict[str, Any] = None
    tags: List[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['level'] = self.level.value
        data['source'] = self.source.value
        return data


class ElasticsearchClient:
    """Elasticsearch client for log ingestion"""
    
    def __init__(self, hosts: List[str], username: str = None, password: str = None):
        self.hosts = hosts
        self.username = username
        self.password = password
        self.session = None
        self.logger = logging.getLogger(f"{__name__}.elasticsearch")
        
        # Index configuration
        self.index_prefix = os.getenv("ELASTICSEARCH_INDEX_PREFIX", "bookedbarber-logs")
        self.index_pattern = f"{self.index_prefix}-{{date}}"
        
    async def initialize(self):
        """Initialize Elasticsearch client"""
        try:
            # Create HTTP session with authentication
            connector = aiohttp.TCPConnector(limit=100)
            auth = None
            
            if self.username and self.password:
                auth = aiohttp.BasicAuth(self.username, self.password)
            
            self.session = aiohttp.ClientSession(
                connector=connector,
                auth=auth,
                timeout=aiohttp.ClientTimeout(total=30),
            )
            
            # Test connectivity
            for host in self.hosts:
                try:
                    async with self.session.get(f"{host}/_cluster/health") as response:
                        if response.status == 200:
                            health = await response.json()
                            self.logger.info(f"Connected to Elasticsearch at {host}, status: {health.get('status')}")
                            break
                except Exception as e:
                    self.logger.warning(f"Failed to connect to Elasticsearch host {host}: {e}")
            
            # Create index templates
            await self._create_index_templates()
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Elasticsearch client: {e}")
    
    async def _create_index_templates(self):
        """Create Elasticsearch index templates"""
        try:
            # Log entry template
            log_template = {
                "index_patterns": [f"{self.index_prefix}-*"],
                "template": {
                    "settings": {
                        "number_of_shards": 3,
                        "number_of_replicas": 1,
                        "index.lifecycle.name": "logs-policy",
                        "index.lifecycle.rollover_alias": f"{self.index_prefix}",
                        "refresh_interval": "5s",
                    },
                    "mappings": {
                        "properties": {
                            "timestamp": {
                                "type": "date",
                                "format": "strict_date_optional_time"
                            },
                            "level": {
                                "type": "keyword"
                            },
                            "source": {
                                "type": "keyword"
                            },
                            "message": {
                                "type": "text",
                                "analyzer": "standard"
                            },
                            "correlation_id": {
                                "type": "keyword"
                            },
                            "user_id": {
                                "type": "keyword"
                            },
                            "session_id": {
                                "type": "keyword"
                            },
                            "request_id": {
                                "type": "keyword"
                            },
                            "endpoint": {
                                "type": "keyword"
                            },
                            "method": {
                                "type": "keyword"
                            },
                            "status_code": {
                                "type": "integer"
                            },
                            "response_time_ms": {
                                "type": "float"
                            },
                            "error_code": {
                                "type": "keyword"
                            },
                            "stack_trace": {
                                "type": "text",
                                "index": False
                            },
                            "metadata": {
                                "type": "object",
                                "dynamic": True
                            },
                            "tags": {
                                "type": "keyword"
                            },
                            "environment": {
                                "type": "keyword"
                            },
                            "service": {
                                "type": "keyword"
                            },
                            "version": {
                                "type": "keyword"
                            }
                        }
                    }
                }
            }
            
            # Create template
            for host in self.hosts:
                try:
                    async with self.session.put(
                        f"{host}/_index_template/bookedbarber-logs-template",
                        json=log_template
                    ) as response:
                        if response.status in [200, 201]:
                            self.logger.info("Elasticsearch index template created successfully")
                            break
                except Exception as e:
                    self.logger.warning(f"Failed to create index template on {host}: {e}")
            
        except Exception as e:
            self.logger.error(f"Failed to create index templates: {e}")
    
    async def index_log_entry(self, log_entry: StructuredLogEntry):
        """Index a log entry in Elasticsearch"""
        try:
            # Add environment metadata
            doc = log_entry.to_dict()
            doc.update({
                "environment": os.getenv("ENVIRONMENT", "production"),
                "service": "bookedbarber-api",
                "version": os.getenv("APP_VERSION", "2.3.0"),
                "node_name": os.getenv("NODE_NAME", "unknown"),
            })
            
            # Generate index name with date
            index_name = f"{self.index_prefix}-{datetime.utcnow().strftime('%Y.%m.%d')}"
            
            # Index document
            for host in self.hosts:
                try:
                    async with self.session.post(
                        f"{host}/{index_name}/_doc",
                        json=doc
                    ) as response:
                        if response.status in [200, 201]:
                            break
                except Exception as e:
                    self.logger.warning(f"Failed to index log on {host}: {e}")
            
        except Exception as e:
            self.logger.error(f"Failed to index log entry: {e}")
    
    async def bulk_index_logs(self, log_entries: List[StructuredLogEntry]):
        """Bulk index multiple log entries"""
        try:
            if not log_entries:
                return
            
            # Prepare bulk request
            bulk_body = []
            index_name = f"{self.index_prefix}-{datetime.utcnow().strftime('%Y.%m.%d')}"
            
            for log_entry in log_entries:
                # Index action
                bulk_body.append({"index": {"_index": index_name}})
                
                # Document
                doc = log_entry.to_dict()
                doc.update({
                    "environment": os.getenv("ENVIRONMENT", "production"),
                    "service": "bookedbarber-api",
                    "version": os.getenv("APP_VERSION", "2.3.0"),
                    "node_name": os.getenv("NODE_NAME", "unknown"),
                })
                bulk_body.append(doc)
            
            # Convert to NDJSON format
            bulk_data = "\n".join(json.dumps(item) for item in bulk_body) + "\n"
            
            # Send bulk request
            for host in self.hosts:
                try:
                    headers = {"Content-Type": "application/x-ndjson"}
                    async with self.session.post(
                        f"{host}/_bulk",
                        data=bulk_data,
                        headers=headers
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            if result.get("errors"):
                                self.logger.warning(f"Some bulk operations failed: {result}")
                            else:
                                self.logger.debug(f"Successfully indexed {len(log_entries)} log entries")
                            break
                except Exception as e:
                    self.logger.warning(f"Failed to bulk index on {host}: {e}")
            
        except Exception as e:
            self.logger.error(f"Failed to bulk index logs: {e}")
    
    async def search_logs(self, query: Dict[str, Any], size: int = 100) -> List[Dict[str, Any]]:
        """Search logs in Elasticsearch"""
        try:
            search_body = {
                "query": query,
                "size": size,
                "sort": [{"timestamp": {"order": "desc"}}]
            }
            
            for host in self.hosts:
                try:
                    async with self.session.post(
                        f"{host}/{self.index_prefix}-*/_search",
                        json=search_body
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            return [hit["_source"] for hit in result.get("hits", {}).get("hits", [])]
                except Exception as e:
                    self.logger.warning(f"Failed to search logs on {host}: {e}")
            
            return []
            
        except Exception as e:
            self.logger.error(f"Failed to search logs: {e}")
            return []
    
    async def close(self):
        """Close Elasticsearch client"""
        if self.session:
            await self.session.close()


class LogstashForwarder:
    """Logstash forwarder for real-time log shipping"""
    
    def __init__(self, host: str, port: int = 5044):
        self.host = host
        self.port = port
        self.logger = logging.getLogger(f"{__name__}.logstash")
        self.connection = None
        
    async def initialize(self):
        """Initialize Logstash connection"""
        try:
            # Test connectivity
            reader, writer = await asyncio.open_connection(self.host, self.port)
            writer.close()
            await writer.wait_closed()
            
            self.logger.info(f"Logstash connection tested successfully: {self.host}:{self.port}")
            
        except Exception as e:
            self.logger.error(f"Failed to connect to Logstash: {e}")
    
    async def forward_log(self, log_entry: StructuredLogEntry):
        """Forward log entry to Logstash"""
        try:
            # Convert to JSON format expected by Logstash
            logstash_entry = {
                "@timestamp": log_entry.timestamp.isoformat(),
                "@version": "1",
                "message": log_entry.message,
                "level": log_entry.level.value,
                "source": log_entry.source.value,
                "environment": os.getenv("ENVIRONMENT", "production"),
                "service": "bookedbarber-api",
                **{k: v for k, v in log_entry.to_dict().items() if v is not None}
            }
            
            # Send to Logstash via TCP
            reader, writer = await asyncio.open_connection(self.host, self.port)
            
            log_json = json.dumps(logstash_entry) + "\n"
            writer.write(log_json.encode())
            await writer.drain()
            
            writer.close()
            await writer.wait_closed()
            
        except Exception as e:
            self.logger.error(f"Failed to forward log to Logstash: {e}")


class StructuredLogger:
    """Structured logger with ELK integration"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.elasticsearch_client = None
        self.logstash_forwarder = None
        self.log_buffer = []
        self.buffer_size = int(os.getenv("LOG_BUFFER_SIZE", "100"))
        self.flush_interval = int(os.getenv("LOG_FLUSH_INTERVAL", "30"))  # seconds
        
        # File logging configuration
        self.log_directory = Path(os.getenv("LOG_DIRECTORY", "/var/log/bookedbarber"))
        self.log_directory.mkdir(parents=True, exist_ok=True)
        
        # Start background tasks
        asyncio.create_task(self._log_buffer_flush_worker())
        asyncio.create_task(self._log_file_rotation_worker())
    
    async def initialize(self):
        """Initialize structured logger with ELK stack"""
        try:
            # Initialize Elasticsearch client
            elasticsearch_hosts = os.getenv("ELASTICSEARCH_HOSTS", "http://localhost:9200").split(",")
            elasticsearch_username = os.getenv("ELASTICSEARCH_USERNAME")
            elasticsearch_password = os.getenv("ELASTICSEARCH_PASSWORD")
            
            self.elasticsearch_client = ElasticsearchClient(
                hosts=elasticsearch_hosts,
                username=elasticsearch_username,
                password=elasticsearch_password
            )
            await self.elasticsearch_client.initialize()
            
            # Initialize Logstash forwarder
            logstash_host = os.getenv("LOGSTASH_HOST")
            logstash_port = int(os.getenv("LOGSTASH_PORT", "5044"))
            
            if logstash_host:
                self.logstash_forwarder = LogstashForwarder(logstash_host, logstash_port)
                await self.logstash_forwarder.initialize()
            
            self.logger.info("Structured logger initialized with ELK integration")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize structured logger: {e}")
    
    async def log(self, 
                  level: LogLevel,
                  source: LogSource,
                  message: str,
                  correlation_id: str = None,
                  user_id: str = None,
                  session_id: str = None,
                  request_id: str = None,
                  endpoint: str = None,
                  method: str = None,
                  status_code: int = None,
                  response_time_ms: float = None,
                  error_code: str = None,
                  stack_trace: str = None,
                  metadata: Dict[str, Any] = None,
                  tags: List[str] = None):
        """Log a structured entry"""
        
        try:
            log_entry = StructuredLogEntry(
                timestamp=datetime.utcnow(),
                level=level,
                source=source,
                message=message,
                correlation_id=correlation_id,
                user_id=user_id,
                session_id=session_id,
                request_id=request_id,
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                response_time_ms=response_time_ms,
                error_code=error_code,
                stack_trace=stack_trace,
                metadata=metadata or {},
                tags=tags or [],
            )
            
            # Add to buffer
            self.log_buffer.append(log_entry)
            
            # Write to file immediately for critical logs
            if level in [LogLevel.ERROR, LogLevel.CRITICAL]:
                await self._write_to_file(log_entry)
                await self._flush_to_elk()
            
            # Flush buffer if it's full
            if len(self.log_buffer) >= self.buffer_size:
                await self._flush_to_elk()
            
        except Exception as e:
            self.logger.error(f"Failed to log entry: {e}")
    
    async def _flush_to_elk(self):
        """Flush log buffer to ELK stack"""
        try:
            if not self.log_buffer:
                return
            
            buffer_copy = self.log_buffer.copy()
            self.log_buffer.clear()
            
            # Send to Elasticsearch
            if self.elasticsearch_client:
                await self.elasticsearch_client.bulk_index_logs(buffer_copy)
            
            # Send to Logstash
            if self.logstash_forwarder:
                for log_entry in buffer_copy:
                    await self.logstash_forwarder.forward_log(log_entry)
            
            # Write to local files
            for log_entry in buffer_copy:
                await self._write_to_file(log_entry)
            
        except Exception as e:
            self.logger.error(f"Failed to flush logs to ELK: {e}")
    
    async def _write_to_file(self, log_entry: StructuredLogEntry):
        """Write log entry to local file"""
        try:
            # Determine log file based on source and level
            log_file = self.log_directory / f"{log_entry.source.value}.log"
            
            # Create log line
            log_line = json.dumps(log_entry.to_dict()) + "\n"
            
            # Write to file
            async with aiofiles.open(log_file, mode='a') as f:
                await f.write(log_line)
            
        except Exception as e:
            self.logger.error(f"Failed to write log to file: {e}")
    
    async def _log_buffer_flush_worker(self):
        """Background worker to flush log buffer periodically"""
        while True:
            try:
                await asyncio.sleep(self.flush_interval)
                await self._flush_to_elk()
            except Exception as e:
                self.logger.error(f"Log buffer flush worker error: {e}")
    
    async def _log_file_rotation_worker(self):
        """Background worker for log file rotation"""
        while True:
            try:
                await asyncio.sleep(3600)  # Check every hour
                await self._rotate_log_files()
            except Exception as e:
                self.logger.error(f"Log file rotation worker error: {e}")
    
    async def _rotate_log_files(self):
        """Rotate log files to manage disk space"""
        try:
            max_file_size = int(os.getenv("LOG_MAX_FILE_SIZE", "104857600"))  # 100MB
            max_files = int(os.getenv("LOG_MAX_FILES", "10"))
            
            for log_file in self.log_directory.glob("*.log"):
                if log_file.stat().st_size > max_file_size:
                    # Rotate file
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    rotated_name = f"{log_file.stem}_{timestamp}.log.gz"
                    rotated_path = self.log_directory / rotated_name
                    
                    # Compress and move
                    with open(log_file, 'rb') as f_in:
                        with gzip.open(rotated_path, 'wb') as f_out:
                            f_out.write(f_in.read())
                    
                    # Remove original
                    log_file.unlink()
                    
                    self.logger.info(f"Rotated log file: {log_file} -> {rotated_path}")
            
            # Clean up old files
            all_rotated = list(self.log_directory.glob("*.log.gz"))
            if len(all_rotated) > max_files:
                # Sort by creation time and remove oldest
                all_rotated.sort(key=lambda x: x.stat().st_ctime)
                for old_file in all_rotated[:-max_files]:
                    old_file.unlink()
                    self.logger.info(f"Removed old log file: {old_file}")
            
        except Exception as e:
            self.logger.error(f"Failed to rotate log files: {e}")
    
    async def search_logs(self, 
                         query: str = None,
                         level: LogLevel = None,
                         source: LogSource = None,
                         start_time: datetime = None,
                         end_time: datetime = None,
                         user_id: str = None,
                         correlation_id: str = None,
                         limit: int = 100) -> List[Dict[str, Any]]:
        """Search logs with various filters"""
        try:
            if not self.elasticsearch_client:
                return []
            
            # Build Elasticsearch query
            must_clauses = []
            
            if query:
                must_clauses.append({
                    "multi_match": {
                        "query": query,
                        "fields": ["message", "error_code", "endpoint"]
                    }
                })
            
            if level:
                must_clauses.append({"term": {"level": level.value}})
            
            if source:
                must_clauses.append({"term": {"source": source.value}})
            
            if user_id:
                must_clauses.append({"term": {"user_id": user_id}})
            
            if correlation_id:
                must_clauses.append({"term": {"correlation_id": correlation_id}})
            
            if start_time or end_time:
                time_range = {}
                if start_time:
                    time_range["gte"] = start_time.isoformat()
                if end_time:
                    time_range["lte"] = end_time.isoformat()
                
                must_clauses.append({
                    "range": {
                        "timestamp": time_range
                    }
                })
            
            # Build final query
            if must_clauses:
                es_query = {"bool": {"must": must_clauses}}
            else:
                es_query = {"match_all": {}}
            
            return await self.elasticsearch_client.search_logs(es_query, limit)
            
        except Exception as e:
            self.logger.error(f"Failed to search logs: {e}")
            return []
    
    async def get_log_statistics(self, timeframe: timedelta = None) -> Dict[str, Any]:
        """Get log statistics for monitoring"""
        try:
            if not self.elasticsearch_client:
                return {}
            
            if not timeframe:
                timeframe = timedelta(hours=24)
            
            start_time = datetime.utcnow() - timeframe
            
            # Aggregation query for statistics
            agg_query = {
                "query": {
                    "range": {
                        "timestamp": {
                            "gte": start_time.isoformat()
                        }
                    }
                },
                "size": 0,
                "aggs": {
                    "levels": {
                        "terms": {
                            "field": "level",
                            "size": 10
                        }
                    },
                    "sources": {
                        "terms": {
                            "field": "source",
                            "size": 20
                        }
                    },
                    "errors_over_time": {
                        "date_histogram": {
                            "field": "timestamp",
                            "interval": "1h"
                        },
                        "aggs": {
                            "error_count": {
                                "filter": {
                                    "terms": {
                                        "level": ["ERROR", "CRITICAL"]
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            # Execute aggregation
            stats = {}
            for host in self.elasticsearch_client.hosts:
                try:
                    async with self.elasticsearch_client.session.post(
                        f"{host}/{self.elasticsearch_client.index_prefix}-*/_search",
                        json=agg_query
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            aggregations = result.get("aggregations", {})
                            
                            stats = {
                                "total_logs": result.get("hits", {}).get("total", {}).get("value", 0),
                                "log_levels": {
                                    bucket["key"]: bucket["doc_count"] 
                                    for bucket in aggregations.get("levels", {}).get("buckets", [])
                                },
                                "log_sources": {
                                    bucket["key"]: bucket["doc_count"] 
                                    for bucket in aggregations.get("sources", {}).get("buckets", [])
                                },
                                "errors_over_time": [
                                    {
                                        "timestamp": bucket["key_as_string"],
                                        "total_logs": bucket["doc_count"],
                                        "error_count": bucket["error_count"]["doc_count"]
                                    }
                                    for bucket in aggregations.get("errors_over_time", {}).get("buckets", [])
                                ]
                            }
                            break
                except Exception as e:
                    self.logger.warning(f"Failed to get stats from {host}: {e}")
            
            return stats
            
        except Exception as e:
            self.logger.error(f"Failed to get log statistics: {e}")
            return {}


# Global structured logger instance
structured_logger = StructuredLogger()

# Convenience functions
async def log_info(source: LogSource, message: str, **kwargs):
    """Log info message"""
    await structured_logger.log(LogLevel.INFO, source, message, **kwargs)

async def log_warning(source: LogSource, message: str, **kwargs):
    """Log warning message"""
    await structured_logger.log(LogLevel.WARNING, source, message, **kwargs)

async def log_error(source: LogSource, message: str, **kwargs):
    """Log error message"""
    await structured_logger.log(LogLevel.ERROR, source, message, **kwargs)

async def log_critical(source: LogSource, message: str, **kwargs):
    """Log critical message"""
    await structured_logger.log(LogLevel.CRITICAL, source, message, **kwargs)

async def log_api_request(endpoint: str, method: str, status_code: int, response_time_ms: float, **kwargs):
    """Log API request"""
    await structured_logger.log(
        LogLevel.INFO,
        LogSource.API,
        f"{method} {endpoint} - {status_code} ({response_time_ms:.2f}ms)",
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        response_time_ms=response_time_ms,
        **kwargs
    )

async def log_payment_event(event_type: str, amount: float, status: str, **kwargs):
    """Log payment event"""
    await structured_logger.log(
        LogLevel.INFO,
        LogSource.PAYMENT,
        f"Payment {event_type}: ${amount:.2f} - {status}",
        metadata={"event_type": event_type, "amount": amount, "status": status},
        **kwargs
    )

async def log_security_event(event_type: str, description: str, severity: str = "warning", **kwargs):
    """Log security event"""
    level = LogLevel.CRITICAL if severity == "critical" else LogLevel.WARNING
    await structured_logger.log(
        level,
        LogSource.SECURITY,
        f"Security event: {event_type} - {description}",
        metadata={"event_type": event_type, "severity": severity},
        tags=["security", event_type],
        **kwargs
    )

async def initialize_logging():
    """Initialize the ELK logging system"""
    await structured_logger.initialize()
    await log_info(LogSource.APPLICATION, "ELK logging system initialized")