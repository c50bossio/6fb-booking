"""
Enhanced database dependencies with automatic read/write routing for BookedBarber V2.

This module provides FastAPI dependencies that automatically route database queries
to appropriate read replicas or primary database based on operation type.
"""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
from typing import Generator, Optional, Dict, Any
from contextlib import contextmanager
import inspect
import re

from database.read_replica_config import (
    get_db_manager, 
    get_read_db, 
    get_write_db, 
    db_session, 
    QueryType,
    DatabaseManager
)
from utils.auth import get_current_user
from models.user import User

logger = logging.getLogger(__name__)


class DatabaseDependency:
    """Enhanced database dependency with automatic query routing."""
    
    def __init__(self, query_type: QueryType = QueryType.READ, require_auth: bool = False):
        self.query_type = query_type
        self.require_auth = require_auth
        self.db_manager = get_db_manager()
    
    def __call__(self, request: Request, current_user: Optional[User] = None) -> Session:
        """
        FastAPI dependency that provides appropriate database session.
        
        Args:
            request: FastAPI request object
            current_user: Current authenticated user (if authentication required)
            
        Returns:
            Database session routed to appropriate database
        """
        # Check authentication if required
        if self.require_auth and not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Determine query type from HTTP method if not explicitly set
        query_type = self._determine_query_type(request)
        
        # Get appropriate session
        if query_type == QueryType.WRITE or query_type == QueryType.TRANSACTION:
            session = self.db_manager.get_write_session()
        else:
            session = self.db_manager.get_read_session()
        
        # Add request context to session for monitoring
        if hasattr(session, 'info'):
            session.info.update({
                'request_method': request.method,
                'request_path': str(request.url.path),
                'query_type': query_type.value,
                'user_id': current_user.id if current_user else None,
                'start_time': request.state.__dict__.get('start_time')
            })
        
        try:
            yield session
        except Exception as e:
            session.rollback()
            logger.error(f"Database error in {request.method} {request.url.path}: {e}")
            raise
        finally:
            session.close()
    
    def _determine_query_type(self, request: Request) -> QueryType:
        """Determine query type based on HTTP method and route."""
        if self.query_type != QueryType.READ:
            return self.query_type
        
        # Route write operations based on HTTP method
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return QueryType.WRITE
        
        # Check if it's a transaction-heavy endpoint
        path = str(request.url.path).lower()
        transaction_patterns = [
            '/payments/', '/bookings/', '/appointments/',
            '/bulk', '/batch', '/import', '/sync'
        ]
        
        if any(pattern in path for pattern in transaction_patterns):
            return QueryType.TRANSACTION
        
        return QueryType.READ


class SmartDatabaseRouter:
    """Smart database router that analyzes SQL queries to determine routing."""
    
    def __init__(self):
        self.db_manager = get_db_manager()
        self.read_keywords = {
            'select', 'with', 'show', 'describe', 'explain', 'analyze'
        }
        self.write_keywords = {
            'insert', 'update', 'delete', 'create', 'drop', 'alter',
            'truncate', 'replace', 'merge', 'upsert', 'copy'
        }
    
    def route_query(self, query: str) -> QueryType:
        """
        Analyze SQL query and determine appropriate routing.
        
        Args:
            query: SQL query string
            
        Returns:
            QueryType for routing decision
        """
        # Normalize query
        normalized = re.sub(r'\s+', ' ', query.strip().lower())
        first_word = normalized.split()[0] if normalized else ''
        
        # Detect transaction indicators
        if any(keyword in normalized for keyword in ['begin', 'commit', 'rollback', 'savepoint']):
            return QueryType.TRANSACTION
        
        # Detect write operations
        if first_word in self.write_keywords:
            return QueryType.WRITE
        
        # Complex queries that might benefit from primary
        if any(keyword in normalized for keyword in ['join', 'group by', 'order by', 'having']):
            # Large complex reads might be better on primary for consistency
            if len(normalized) > 500 or normalized.count('join') > 2:
                return QueryType.TRANSACTION
        
        # Default to read
        return QueryType.READ
    
    @contextmanager
    def smart_session(self, query: Optional[str] = None, force_type: Optional[QueryType] = None):
        """
        Context manager that provides optimally routed database session.
        
        Args:
            query: SQL query to analyze for routing
            force_type: Force specific query type regardless of analysis
        """
        if force_type:
            query_type = force_type
        elif query:
            query_type = self.route_query(query)
        else:
            query_type = QueryType.READ
        
        with db_session(query_type) as session:
            yield session


# Pre-configured dependency instances
get_read_db_dep = DatabaseDependency(QueryType.READ)
get_write_db_dep = DatabaseDependency(QueryType.WRITE)
get_transaction_db_dep = DatabaseDependency(QueryType.TRANSACTION)

# Authenticated dependencies
get_auth_read_db_dep = DatabaseDependency(QueryType.READ, require_auth=True)
get_auth_write_db_dep = DatabaseDependency(QueryType.WRITE, require_auth=True)
get_auth_transaction_db_dep = DatabaseDependency(QueryType.TRANSACTION, require_auth=True)


# FastAPI dependencies
def get_read_db_session(request: Request) -> Generator[Session, None, None]:
    """FastAPI dependency for read operations."""
    return get_read_db_dep(request)


def get_write_db_session(request: Request) -> Generator[Session, None, None]:
    """FastAPI dependency for write operations."""
    return get_write_db_dep(request)


def get_transaction_db_session(request: Request) -> Generator[Session, None, None]:
    """FastAPI dependency for transaction operations."""
    return get_transaction_db_dep(request)


def get_authenticated_read_db(
    request: Request, 
    current_user: User = Depends(get_current_user)
) -> Generator[Session, None, None]:
    """FastAPI dependency for authenticated read operations."""
    return get_auth_read_db_dep(request, current_user)


def get_authenticated_write_db(
    request: Request, 
    current_user: User = Depends(get_current_user)
) -> Generator[Session, None, None]:
    """FastAPI dependency for authenticated write operations."""
    return get_auth_write_db_dep(request, current_user)


def get_authenticated_transaction_db(
    request: Request, 
    current_user: User = Depends(get_current_user)
) -> Generator[Session, None, None]:
    """FastAPI dependency for authenticated transaction operations."""
    return get_auth_transaction_db_dep(request, current_user)


# Smart router instance
smart_router = SmartDatabaseRouter()


def get_smart_db_session(request: Request) -> Generator[Session, None, None]:
    """
    FastAPI dependency with intelligent query routing.
    Automatically determines read/write based on HTTP method and route patterns.
    """
    query_type = QueryType.READ
    
    # Route based on HTTP method
    if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
        query_type = QueryType.WRITE
    
    # Check for transaction-heavy endpoints
    path = str(request.url.path).lower()
    if any(pattern in path for pattern in ['/bulk', '/batch', '/import', '/sync', '/transaction']):
        query_type = QueryType.TRANSACTION
    
    # Use smart router
    with smart_router.smart_session(force_type=query_type) as session:
        yield session


# Database health monitoring dependency
def get_db_health() -> Dict[str, Any]:
    """FastAPI dependency that provides database health status."""
    return get_db_manager().health_check()


def get_db_stats() -> Dict[str, Any]:
    """FastAPI dependency that provides database statistics."""
    return get_db_manager().get_stats()


# Connection pool monitoring utility
class ConnectionPoolMonitor:
    """Monitor connection pool usage and health."""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def get_pool_metrics(self) -> Dict[str, Any]:
        """Get current connection pool metrics."""
        metrics = {
            'primary': self._get_engine_metrics(self.db_manager.primary_engine, 'primary'),
            'replicas': []
        }
        
        for i, engine in enumerate(self.db_manager.replica_engines):
            replica_metrics = self._get_engine_metrics(engine, f'replica_{i+1}')
            metrics['replicas'].append(replica_metrics)
        
        return metrics
    
    def _get_engine_metrics(self, engine, name: str) -> Dict[str, Any]:
        """Get metrics for a specific database engine."""
        try:
            pool = engine.pool
            return {
                'name': name,
                'pool_size': pool.size(),
                'checked_in': pool.checkedin(),
                'checked_out': pool.checkedout(),
                'overflow': pool.overflow(),
                'total_available': pool.checkedin(),
                'utilization_percent': round((pool.checkedout() / (pool.size() + pool.overflow())) * 100, 2)
            }
        except Exception as e:
            return {'name': name, 'error': str(e)}
    
    def check_pool_health(self) -> Dict[str, Any]:
        """Check if connection pools are healthy."""
        metrics = self.get_pool_metrics()
        health_status = {
            'healthy': True,
            'warnings': [],
            'metrics': metrics
        }
        
        # Check primary pool
        primary_metrics = metrics['primary']
        if 'error' not in primary_metrics:
            if primary_metrics['utilization_percent'] > 80:
                health_status['warnings'].append('Primary pool utilization high')
            if primary_metrics['overflow'] > primary_metrics['pool_size'] * 0.5:
                health_status['warnings'].append('Primary pool overflow high')
        
        # Check replica pools
        for replica_metrics in metrics['replicas']:
            if 'error' not in replica_metrics:
                if replica_metrics['utilization_percent'] > 90:
                    health_status['warnings'].append(f"{replica_metrics['name']} utilization critical")
        
        if health_status['warnings']:
            health_status['healthy'] = False
        
        return health_status


# Global instances
pool_monitor = ConnectionPoolMonitor(get_db_manager())


def get_pool_health() -> Dict[str, Any]:
    """FastAPI dependency for connection pool health."""
    return pool_monitor.check_pool_health()


# Backward compatibility
def get_db() -> Generator[Session, None, None]:
    """
    Backward compatibility function.
    Now intelligently routes to read replica for read operations.
    """
    # For backward compatibility, default to read operations
    # Write operations should use explicit write dependencies
    session = get_db_manager().get_read_session()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# Usage examples in FastAPI routes:
"""
from dependencies_v2 import (
    get_read_db_session, 
    get_write_db_session, 
    get_authenticated_write_db,
    get_smart_db_session
)

# Read operation (automatically routed to replica)
@app.get("/users")
async def get_users(db: Session = Depends(get_read_db_session)):
    return db.query(User).all()

# Write operation (automatically routed to primary)
@app.post("/users")
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_authenticated_write_db)
):
    user = User(**user_data.dict())
    db.add(user)
    db.commit()
    return user

# Smart routing (automatically determines read/write)
@app.get("/complex-report")
async def complex_report(db: Session = Depends(get_smart_db_session)):
    # Complex read operation - might be routed to primary for consistency
    return db.execute(text("SELECT * FROM complex_view")).fetchall()

# Transaction operation (always uses primary)
@app.post("/bulk-import")
async def bulk_import(
    data: List[dict],
    db: Session = Depends(get_transaction_db_session)
):
    # Bulk operations that require consistency
    for item in data:
        db.add(SomeModel(**item))
    db.commit()
    return {"imported": len(data)}
"""