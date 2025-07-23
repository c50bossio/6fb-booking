"""
Database package for BookedBarber V2

This package contains database configuration, connection pooling,
and migration utilities.
"""

# Only export components from this package
from .connection_pool_config import ConnectionPoolConfig

__all__ = ['ConnectionPoolConfig']