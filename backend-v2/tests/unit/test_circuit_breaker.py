"""
Unit tests for Circuit Breaker implementation.
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch

from services.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerState,
    CircuitBreakerError,
    CircuitBreakerOpenError,
    CircuitBreakerManager
)


@pytest.fixture
def circuit_breaker_config():
    """Create test circuit breaker configuration."""
    return CircuitBreakerConfig(
        failure_threshold=3,
        recovery_timeout=60,
        success_threshold=2,
        timeout=5.0,
        expected_exception=(ValueError,)
    )


@pytest.fixture
def circuit_breaker(circuit_breaker_config):
    """Create test circuit breaker."""
    return CircuitBreaker("test_service", circuit_breaker_config)


class TestCircuitBreakerConfig:
    """Test circuit breaker configuration."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = CircuitBreakerConfig()
        assert config.failure_threshold == 5
        assert config.recovery_timeout == 60
        assert config.success_threshold == 3
        assert config.timeout == 30.0
        assert config.expected_exception == ()
        assert config.fallback_function is None
    
    def test_custom_config(self):
        """Test custom configuration values."""
        def fallback():
            return "fallback"
        
        config = CircuitBreakerConfig(
            failure_threshold=2,
            recovery_timeout=30,
            success_threshold=1,
            timeout=10.0,
            expected_exception=(Exception,),
            fallback_function=fallback
        )
        
        assert config.failure_threshold == 2
        assert config.recovery_timeout == 30
        assert config.success_threshold == 1
        assert config.timeout == 10.0
        assert config.expected_exception == (Exception,)
        assert config.fallback_function == fallback


class TestCircuitBreaker:
    """Test circuit breaker functionality."""
    
    @pytest.mark.asyncio
    async def test_initial_state(self, circuit_breaker):
        """Test circuit breaker initial state."""
        stats = circuit_breaker.get_stats()
        assert stats.state == CircuitBreakerState.CLOSED
        assert stats.failure_count == 0
        assert stats.success_count == 0
        assert stats.total_requests == 0
    
    @pytest.mark.asyncio
    async def test_successful_call(self, circuit_breaker):
        """Test successful function call."""
        async def success_function():
            return "success"
        
        result = await circuit_breaker.call(success_function)
        assert result == "success"
        
        stats = circuit_breaker.get_stats()
        assert stats.state == CircuitBreakerState.CLOSED
        assert stats.success_count == 1
        assert stats.total_requests == 1
    
    @pytest.mark.asyncio
    async def test_failure_tracking(self, circuit_breaker):
        """Test failure tracking and state transition."""
        async def failing_function():
            raise ValueError("test error")
        
        # First two failures should keep circuit closed
        for i in range(2):
            with pytest.raises(ValueError):
                await circuit_breaker.call(failing_function)
            
            stats = circuit_breaker.get_stats()
            assert stats.state == CircuitBreakerState.CLOSED
            assert stats.failure_count == i + 1
        
        # Third failure should open the circuit
        with pytest.raises(ValueError):
            await circuit_breaker.call(failing_function)
        
        stats = circuit_breaker.get_stats()
        assert stats.state == CircuitBreakerState.OPEN
        assert stats.failure_count == 3
    
    @pytest.mark.asyncio
    async def test_open_circuit_blocks_calls(self, circuit_breaker):
        """Test that open circuit blocks calls."""
        async def failing_function():
            raise ValueError("test error")
        
        # Trigger circuit to open
        for _ in range(3):
            with pytest.raises(ValueError):
                await circuit_breaker.call(failing_function)
        
        # Now calls should be blocked
        async def success_function():
            return "success"
        
        with pytest.raises(CircuitBreakerOpenError):
            await circuit_breaker.call(success_function)
    
    @pytest.mark.asyncio
    async def test_half_open_transition(self, circuit_breaker):
        """Test transition to half-open state."""
        # Mock time to control recovery timeout
        with patch('time.time') as mock_time:
            mock_time.return_value = 1000
            
            async def failing_function():
                raise ValueError("test error")
            
            # Open the circuit
            for _ in range(3):
                with pytest.raises(ValueError):
                    await circuit_breaker.call(failing_function)
            
            # Advance time past recovery timeout
            mock_time.return_value = 1070  # 70 seconds later
            
            # Next call should transition to half-open
            async def success_function():
                return "success"
            
            result = await circuit_breaker.call(success_function)
            assert result == "success"
            
            stats = circuit_breaker.get_stats()
            assert stats.state == CircuitBreakerState.HALF_OPEN
    
    @pytest.mark.asyncio
    async def test_half_open_to_closed(self, circuit_breaker):
        """Test transition from half-open to closed."""
        with patch('time.time') as mock_time:
            mock_time.return_value = 1000
            
            # Open the circuit
            async def failing_function():
                raise ValueError("test error")
            
            for _ in range(3):
                with pytest.raises(ValueError):
                    await circuit_breaker.call(failing_function)
            
            # Advance time and transition to half-open
            mock_time.return_value = 1070
            
            async def success_function():
                return "success"
            
            # First success in half-open
            await circuit_breaker.call(success_function)
            stats = circuit_breaker.get_stats()
            assert stats.state == CircuitBreakerState.HALF_OPEN
            
            # Second success should close the circuit
            await circuit_breaker.call(success_function)
            stats = circuit_breaker.get_stats()
            assert stats.state == CircuitBreakerState.CLOSED
            assert stats.success_count == 2
            assert stats.failure_count == 0
    
    @pytest.mark.asyncio
    async def test_half_open_failure_reopens(self, circuit_breaker):
        """Test that failure in half-open reopens circuit."""
        with patch('time.time') as mock_time:
            mock_time.return_value = 1000
            
            # Open the circuit
            async def failing_function():
                raise ValueError("test error")
            
            for _ in range(3):
                with pytest.raises(ValueError):
                    await circuit_breaker.call(failing_function)
            
            # Advance time to half-open
            mock_time.return_value = 1070
            
            # Failure in half-open should reopen circuit
            with pytest.raises(ValueError):
                await circuit_breaker.call(failing_function)
            
            stats = circuit_breaker.get_stats()
            assert stats.state == CircuitBreakerState.OPEN
    
    @pytest.mark.asyncio
    async def test_timeout_handling(self, circuit_breaker):
        """Test timeout handling."""
        async def slow_function():
            await asyncio.sleep(10)  # Longer than 5s timeout
            return "slow"
        
        with pytest.raises(asyncio.TimeoutError):
            await circuit_breaker.call(slow_function)
        
        stats = circuit_breaker.get_stats()
        assert stats.failure_count == 1
    
    @pytest.mark.asyncio
    async def test_fallback_function(self):
        """Test fallback function execution."""
        async def fallback():
            return "fallback_result"
        
        config = CircuitBreakerConfig(
            failure_threshold=1,
            fallback_function=fallback
        )
        breaker = CircuitBreaker("test_fallback", config)
        
        # Open the circuit
        async def failing_function():
            raise ValueError("test error")
        
        with pytest.raises(ValueError):
            await breaker.call(failing_function)
        
        # Now fallback should be called
        async def any_function():
            return "normal"
        
        result = await breaker.call(any_function)
        assert result == "fallback_result"
    
    def test_reset(self, circuit_breaker):
        """Test circuit breaker reset."""
        # Manually set some state
        circuit_breaker._record_failure(ValueError("test"))
        stats = circuit_breaker.get_stats()
        assert stats.failure_count > 0
        
        # Reset
        circuit_breaker.reset()
        
        # Check state is reset
        stats = circuit_breaker.get_stats()
        assert stats.state == CircuitBreakerState.CLOSED
        assert stats.failure_count == 0
        assert stats.success_count == 0
        assert stats.total_requests == 0


class TestCircuitBreakerManager:
    """Test circuit breaker manager."""
    
    def test_get_breaker(self):
        """Test getting/creating circuit breakers."""
        manager = CircuitBreakerManager()
        
        # Get new breaker
        breaker1 = manager.get_breaker("test_service")
        assert breaker1 is not None
        assert breaker1.name == "test_service"
        
        # Get same breaker again
        breaker2 = manager.get_breaker("test_service")
        assert breaker1 is breaker2
    
    def test_get_breaker_with_custom_config(self):
        """Test getting breaker with custom config."""
        manager = CircuitBreakerManager()
        config = CircuitBreakerConfig(failure_threshold=10)
        
        breaker = manager.get_breaker("custom_service", config)
        assert breaker.config.failure_threshold == 10
    
    def test_get_breaker_with_predefined_config(self):
        """Test getting breaker with predefined service config."""
        manager = CircuitBreakerManager()
        
        # Get stripe payments breaker (should use predefined config)
        breaker = manager.get_breaker("stripe_payments")
        assert breaker.config.failure_threshold == 3
        assert breaker.config.recovery_timeout == 60
    
    @pytest.mark.asyncio
    async def test_execute_with_breaker(self):
        """Test execute with breaker method."""
        manager = CircuitBreakerManager()
        
        async def test_function(value):
            return f"result: {value}"
        
        result = await manager.execute_with_breaker(
            "test_service",
            test_function,
            "test_value"
        )
        
        assert result == "result: test_value"
    
    def test_protect_decorator(self):
        """Test protect decorator."""
        manager = CircuitBreakerManager()
        
        @manager.protect("test_service")
        async def protected_function(value):
            return f"protected: {value}"
        
        # Function should be wrapped
        assert hasattr(protected_function, '__wrapped__')
    
    def test_get_all_stats(self):
        """Test getting all circuit breaker stats."""
        manager = CircuitBreakerManager()
        
        # Create a few breakers
        manager.get_breaker("service1")
        manager.get_breaker("service2")
        
        stats = manager.get_all_stats()
        assert "service1" in stats
        assert "service2" in stats
        assert stats["service1"]["state"] == "closed"
        assert stats["service2"]["state"] == "closed"
    
    def test_reset_breaker(self):
        """Test resetting specific breaker."""
        manager = CircuitBreakerManager()
        breaker = manager.get_breaker("test_service")
        
        # Simulate some failures
        breaker._record_failure(ValueError("test"))
        
        # Reset specific breaker
        result = manager.reset_breaker("test_service")
        assert result is True
        
        # Check it was reset
        stats = breaker.get_stats()
        assert stats.failure_count == 0
    
    def test_reset_nonexistent_breaker(self):
        """Test resetting non-existent breaker."""
        manager = CircuitBreakerManager()
        result = manager.reset_breaker("nonexistent")
        assert result is False
    
    def test_reset_all_breakers(self):
        """Test resetting all breakers."""
        manager = CircuitBreakerManager()
        
        # Create and modify breakers
        breaker1 = manager.get_breaker("service1")
        breaker2 = manager.get_breaker("service2")
        
        breaker1._record_failure(ValueError("test"))
        breaker2._record_failure(ValueError("test"))
        
        # Reset all
        manager.reset_all_breakers()
        
        # Check all were reset
        assert breaker1.get_stats().failure_count == 0
        assert breaker2.get_stats().failure_count == 0
    
    def test_get_health_status(self):
        """Test getting health status."""
        manager = CircuitBreakerManager()
        
        # No breakers initially
        health = manager.get_health_status()
        assert health["status"] == "healthy"
        assert health["total_breakers"] == 0
        
        # Add some breakers
        manager.get_breaker("service1")
        manager.get_breaker("service2")
        
        health = manager.get_health_status()
        assert health["status"] == "healthy"
        assert health["total_breakers"] == 2
        assert health["closed_breakers"] == 2
        assert health["open_breakers"] == 0
    
    def test_health_status_with_open_breakers(self):
        """Test health status with some open breakers."""
        manager = CircuitBreakerManager()
        
        # Create breakers and open one
        breaker1 = manager.get_breaker("service1")
        breaker2 = manager.get_breaker("service2")
        
        # Open one breaker
        for _ in range(5):  # Default threshold is 5
            breaker1._record_failure(ValueError("test"))
        
        health = manager.get_health_status()
        assert health["total_breakers"] == 2
        assert health["closed_breakers"] == 1
        assert health["open_breakers"] == 1
        
        # Should be degraded since 50% are open (> 30% threshold)
        assert health["status"] == "critical"


@pytest.mark.integration
class TestCircuitBreakerIntegration:
    """Integration tests for circuit breaker."""
    
    @pytest.mark.asyncio
    async def test_realistic_failure_scenario(self):
        """Test realistic failure and recovery scenario."""
        manager = CircuitBreakerManager()
        
        call_count = 0
        
        @manager.protect("external_service")
        async def external_api_call():
            nonlocal call_count
            call_count += 1
            
            if call_count <= 5:
                raise ConnectionError("Service unavailable")
            return f"Success on call {call_count}"
        
        # First 5 calls should fail and eventually open circuit
        for i in range(5):
            with pytest.raises(ConnectionError):
                await external_api_call()
        
        # Circuit should be open now
        with pytest.raises(CircuitBreakerOpenError):
            await external_api_call()
        
        # Simulate time passing (would need to mock time for real test)
        # For this test, we'll manually reset to simulate recovery
        manager.reset_breaker("external_service")
        
        # Now calls should succeed
        result = await external_api_call()
        assert "Success" in result
    
    @pytest.mark.asyncio
    async def test_multiple_services(self):
        """Test circuit breaker with multiple services."""
        manager = CircuitBreakerManager()
        
        @manager.protect("service_a")
        async def service_a_call():
            return "Service A"
        
        @manager.protect("service_b")
        async def service_b_call():
            raise ValueError("Service B error")
        
        # Service A should work
        result_a = await service_a_call()
        assert result_a == "Service A"
        
        # Service B should fail
        with pytest.raises(ValueError):
            await service_b_call()
        
        # Check individual stats
        stats = manager.get_all_stats()
        assert stats["service_a"]["success_count"] == 1
        assert stats["service_b"]["failure_count"] == 1