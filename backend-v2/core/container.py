"""
Dependency Injection Container for BookedBarber V2

This module provides a lightweight dependency injection container that manages
service instances and their dependencies throughout the application lifecycle.
"""

from typing import Dict, Any, TypeVar, Type, Callable
from functools import wraps
import inspect
from threading import Lock
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class ServiceContainer:
    """
    Lightweight dependency injection container with support for:
    - Singleton and transient service lifetimes
    - Constructor injection
    - Circular dependency detection
    - Lazy loading of services
    """
    
    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._factories: Dict[str, Callable] = {}
        self._singletons: Dict[str, Any] = {}
        self._resolving: set = set()
        self._lock = Lock()
    
    def register_singleton(self, interface: Type[T], implementation: Type[T] = None) -> 'ServiceContainer':
        """Register a service as singleton (one instance for application lifetime)"""
        impl = implementation or interface
        service_name = self._get_service_name(interface)
        
        def factory():
            if service_name in self._singletons:
                return self._singletons[service_name]
            
            instance = self._create_instance(impl)
            self._singletons[service_name] = instance
            return instance
        
        self._factories[service_name] = factory
        logger.debug(f"Registered singleton: {service_name}")
        return self
    
    def register_transient(self, interface: Type[T], implementation: Type[T] = None) -> 'ServiceContainer':
        """Register a service as transient (new instance each time)"""
        impl = implementation or interface
        service_name = self._get_service_name(interface)
        
        def factory():
            return self._create_instance(impl)
        
        self._factories[service_name] = factory
        logger.debug(f"Registered transient: {service_name}")
        return self
    
    def register_instance(self, interface: Type[T], instance: T) -> 'ServiceContainer':
        """Register a pre-created instance"""
        service_name = self._get_service_name(interface)
        self._singletons[service_name] = instance
        self._factories[service_name] = lambda: instance
        logger.debug(f"Registered instance: {service_name}")
        return self
    
    def resolve(self, interface: Type[T]) -> T:
        """Resolve a service instance"""
        service_name = self._get_service_name(interface)
        
        if service_name in self._resolving:
            raise ValueError(f"Circular dependency detected for {service_name}")
        
        if service_name not in self._factories:
            raise ValueError(f"Service {service_name} not registered")
        
        with self._lock:
            self._resolving.add(service_name)
            try:
                instance = self._factories[service_name]()
                return instance
            finally:
                self._resolving.discard(service_name)
    
    def _create_instance(self, cls: Type[T]) -> T:
        """Create instance with dependency injection"""
        constructor = cls.__init__
        sig = inspect.signature(constructor)
        
        # Get constructor parameters (excluding 'self')
        params = list(sig.parameters.values())[1:]
        
        # Resolve dependencies
        kwargs = {}
        for param in params:
            if param.annotation != inspect.Parameter.empty:
                dependency = self.resolve(param.annotation)
                kwargs[param.name] = dependency
            elif param.default != inspect.Parameter.empty:
                # Use default value if no type annotation
                kwargs[param.name] = param.default
            else:
                raise ValueError(f"Cannot resolve parameter {param.name} for {cls.__name__}")
        
        return cls(**kwargs)
    
    def _get_service_name(self, interface: Type) -> str:
        """Get unique service name from type"""
        return f"{interface.__module__}.{interface.__name__}"
    
    def clear(self):
        """Clear all registrations (useful for testing)"""
        with self._lock:
            self._services.clear()
            self._factories.clear()
            self._singletons.clear()
            self._resolving.clear()


# Global container instance
container = ServiceContainer()


def inject(interface: Type[T]) -> T:
    """Decorator for injecting dependencies into functions"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            service = container.resolve(interface)
            return func(service, *args, **kwargs)
        return wrapper
    return decorator


def injectable(cls: Type[T]) -> Type[T]:
    """
    Class decorator to mark classes as injectable.
    Automatically registers the class with the container.
    """
    container.register_transient(cls)
    return cls


def singleton(cls: Type[T]) -> Type[T]:
    """
    Class decorator to mark classes as singletons.
    Automatically registers the class as singleton with the container.
    """
    container.register_singleton(cls)
    return cls


# Configuration for common service lifetimes
class ServiceLifetime:
    SINGLETON = "singleton"
    TRANSIENT = "transient"
    SCOPED = "scoped"  # Future implementation for request-scoped services


class DIConfig:
    """Configuration class for dependency injection setup"""
    
    @staticmethod
    def configure_services(container: ServiceContainer):
        """Configure all application services"""
        # This will be called during application startup
        # Services will be registered here based on their decorators
    
    @staticmethod
    def setup_for_testing(container: ServiceContainer):
        """Setup container for testing with mock services"""
        container.clear()
        # Test-specific registrations can be added here