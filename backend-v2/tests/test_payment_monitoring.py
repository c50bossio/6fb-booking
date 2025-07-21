"""
Comprehensive tests for Payment Monitoring and Alerting System.

Tests real-time monitoring, SLA tracking, alert generation,
and monitoring API endpoints.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from main import app
from models import Payment, User
from services.payment_monitoring import (
    PaymentMonitoringService, PaymentMetrics, PaymentAlert, 
    AlertLevel, PaymentMetricType, SLATarget
)
from tests.factories import UserFactory, PaymentFactory


@pytest.fixture
def admin_user():
    """Create an admin user for testing."""
    return UserFactory.create_user(
        email="admin@test.com",
        unified_role="platform_admin",
        is_active=True
    )


@pytest.fixture
def monitoring_service(db_session):
    """Create monitoring service instance."""
    return PaymentMonitoringService(db_session)


class TestPaymentMonitoringService:
    """Test payment monitoring service functionality."""
    
    @pytest.mark.asyncio
    async def test_collect_real_time_metrics_success(self, monitoring_service, db_session):
        """Test collecting real-time payment metrics."""
        # Create test payments within the time window
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        
        successful_payments = []
        for i in range(8):  # 8 successful payments
            payment = PaymentFactory.create_payment(
                amount=Decimal("25.00"),
                status="completed",
                created_at=cutoff_time + timedelta(minutes=i % 5)
            )
            successful_payments.append(payment)
        
        failed_payments = []
        for i in range(2):  # 2 failed payments
            payment = PaymentFactory.create_payment(
                amount=Decimal("30.00"),
                status="failed",
                created_at=cutoff_time + timedelta(minutes=i % 5)
            )
            failed_payments.append(payment)
        
        db_session.add_all(successful_payments + failed_payments)
        db_session.commit()
        
        # Mock the processing time calculation
        with patch.object(monitoring_service, '_calculate_average_processing_time', return_value=1.5):
            with patch.object(monitoring_service, '_count_fraud_alerts', return_value=0):
                metrics = await monitoring_service.collect_real_time_metrics(period_minutes=5)
        
        assert metrics.total_payments == 10
        assert metrics.successful_payments == 8
        assert metrics.failed_payments == 2
        assert metrics.success_rate == 80.0  # 8/10 * 100
        assert metrics.average_processing_time == 1.5
        assert metrics.total_revenue == Decimal("200.00")  # 8 * 25.00
        assert metrics.fraud_alerts == 0
        assert metrics.period_minutes == 5
    
    @pytest.mark.asyncio
    async def test_collect_metrics_no_payments(self, monitoring_service):
        """Test collecting metrics when no payments exist."""
        with patch.object(monitoring_service, '_calculate_average_processing_time', return_value=0.0):
            with patch.object(monitoring_service, '_count_fraud_alerts', return_value=0):
                metrics = await monitoring_service.collect_real_time_metrics(period_minutes=15)
        
        assert metrics.total_payments == 0
        assert metrics.successful_payments == 0
        assert metrics.failed_payments == 0
        assert metrics.success_rate == 100.0  # Default when no payments
        assert metrics.total_revenue == Decimal("0")
    
    @pytest.mark.asyncio
    async def test_calculate_average_processing_time(self, monitoring_service, db_session):
        """Test processing time calculation."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=10)
        
        # Create payments to simulate load
        payments = []
        for i in range(20):  # Higher payment volume
            payment = PaymentFactory.create_payment(
                status="completed",
                created_at=cutoff_time + timedelta(minutes=i % 10)
            )
            payments.append(payment)
        
        db_session.add_all(payments)
        db_session.commit()
        
        processing_time = await monitoring_service._calculate_average_processing_time(cutoff_time)
        
        # Should be base time (1.5s) + volume impact
        assert processing_time > 1.5
        assert processing_time <= 3.5  # Base + max volume impact
    
    @pytest.mark.asyncio
    async def test_count_fraud_alerts(self, monitoring_service, db_session):
        """Test fraud alert detection."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=30)
        
        # Create high-value payments (potential fraud pattern)
        high_value_payments = []
        for i in range(6):  # 6 payments over $500 (should trigger alert)
            payment = PaymentFactory.create_payment(
                amount=Decimal("600.00"),
                status="completed",
                created_at=cutoff_time + timedelta(minutes=i * 5)
            )
            high_value_payments.append(payment)
        
        # Create multiple failed payments from same user (fraud pattern)
        user_id = 123
        failed_payments = []
        for i in range(4):  # 4 failed payments from same user
            payment = PaymentFactory.create_payment(
                user_id=user_id,
                status="failed",
                created_at=cutoff_time + timedelta(minutes=i * 2)
            )
            failed_payments.append(payment)
        
        db_session.add_all(high_value_payments + failed_payments)
        db_session.commit()
        
        fraud_count = await monitoring_service._count_fraud_alerts(cutoff_time)
        
        # Should detect 2 patterns: high-value volume + repeated failures
        assert fraud_count == 2
    
    @pytest.mark.asyncio
    async def test_check_sla_compliance_success_rate_warning(self, monitoring_service):
        """Test SLA compliance check for success rate warning."""
        # Create metrics with success rate below warning threshold
        metrics = PaymentMetrics(
            timestamp=datetime.utcnow(),
            total_payments=100,
            successful_payments=97,  # 97% success rate (below 98% warning)
            failed_payments=3,
            success_rate=97.0,
            average_processing_time=1.5,
            total_revenue=Decimal("2500.00"),
            fraud_alerts=0,
            period_minutes=15
        )
        
        alerts = await monitoring_service.check_sla_compliance(metrics)
        
        # Should generate warning alert for success rate
        success_rate_alerts = [a for a in alerts if a.metric_type == PaymentMetricType.SUCCESS_RATE]
        assert len(success_rate_alerts) == 1
        assert success_rate_alerts[0].level == AlertLevel.WARNING
        assert success_rate_alerts[0].actual_value == 97.0
        assert success_rate_alerts[0].threshold_value == 98.0
    
    @pytest.mark.asyncio
    async def test_check_sla_compliance_processing_time_critical(self, monitoring_service):
        """Test SLA compliance check for processing time critical alert."""
        metrics = PaymentMetrics(
            timestamp=datetime.utcnow(),
            total_payments=50,
            successful_payments=49,
            failed_payments=1,
            success_rate=98.0,
            average_processing_time=12.0,  # Above 10s critical threshold
            total_revenue=Decimal("1200.00"),
            fraud_alerts=0,
            period_minutes=5
        )
        
        alerts = await monitoring_service.check_sla_compliance(metrics)
        
        # Should generate critical alert for processing time
        processing_alerts = [a for a in alerts if a.metric_type == PaymentMetricType.PROCESSING_TIME]
        assert len(processing_alerts) == 1
        assert processing_alerts[0].level == AlertLevel.CRITICAL
        assert processing_alerts[0].actual_value == 12.0
        assert processing_alerts[0].threshold_value == 10.0
    
    @pytest.mark.asyncio
    async def test_check_sla_compliance_fraud_rate_critical(self, monitoring_service):
        """Test SLA compliance check for fraud rate critical alert."""
        metrics = PaymentMetrics(
            timestamp=datetime.utcnow(),
            total_payments=200,
            successful_payments=195,
            failed_payments=5,
            success_rate=97.5,
            average_processing_time=2.0,
            total_revenue=Decimal("4800.00"),
            fraud_alerts=3,  # 1.5% fraud rate (above 1% critical)
            period_minutes=60
        )
        
        alerts = await monitoring_service.check_sla_compliance(metrics)
        
        # Should generate critical alert for fraud rate
        fraud_alerts = [a for a in alerts if a.metric_type == PaymentMetricType.FRAUD_RATE]
        assert len(fraud_alerts) == 1
        assert fraud_alerts[0].level == AlertLevel.CRITICAL
        assert fraud_alerts[0].actual_value == 1.5  # 3/200 * 100
        assert fraud_alerts[0].threshold_value == 1.0
    
    @pytest.mark.asyncio
    async def test_handle_alert_escalation(self, monitoring_service):
        """Test alert handling and escalation."""
        # Create critical success rate alert
        alert = PaymentAlert(
            alert_id="test_critical_001",
            level=AlertLevel.CRITICAL,
            metric_type=PaymentMetricType.SUCCESS_RATE,
            title="Critical Success Rate Drop",
            description="Success rate dropped to 94%",
            threshold_value=95.0,
            actual_value=94.0,
            timestamp=datetime.utcnow()
        )
        
        with patch.object(monitoring_service, '_send_alert_notifications') as mock_notify:
            with patch.object(monitoring_service, '_escalate_alert') as mock_escalate:
                await monitoring_service._handle_alert(alert)
        
        # Should be stored in active alerts
        assert alert.alert_id in monitoring_service.active_alerts
        
        # Should trigger notifications and escalation
        mock_notify.assert_called_once_with(alert)
        mock_escalate.assert_called_once_with(alert)
    
    @pytest.mark.asyncio
    async def test_resolve_alert(self, monitoring_service):
        """Test alert resolution."""
        # Create and store alert
        alert = PaymentAlert(
            alert_id="test_resolve_001",
            level=AlertLevel.WARNING,
            metric_type=PaymentMetricType.PROCESSING_TIME,
            title="Processing Time Warning",
            description="Processing time increased",
            threshold_value=5.0,
            actual_value=6.0,
            timestamp=datetime.utcnow()
        )
        monitoring_service.active_alerts[alert.alert_id] = alert
        
        # Resolve the alert
        resolved = await monitoring_service.resolve_alert(
            alert_id="test_resolve_001",
            resolved_by="test_admin",
            resolution_notes="Fixed by restarting payment service"
        )
        
        assert resolved is True
        assert alert.resolved is True
        assert alert.resolved_at is not None
        assert alert.metadata["resolved_by"] == "test_admin"
        assert alert.metadata["resolution_notes"] == "Fixed by restarting payment service"
    
    @pytest.mark.asyncio
    async def test_get_system_health_status(self, monitoring_service):
        """Test getting comprehensive system health status."""
        # Add some active alerts
        warning_alert = PaymentAlert(
            alert_id="warning_001",
            level=AlertLevel.WARNING,
            metric_type=PaymentMetricType.PROCESSING_TIME,
            title="Processing Time Warning",
            description="Processing time elevated",
            threshold_value=5.0,
            actual_value=6.0,
            timestamp=datetime.utcnow(),
            resolved=False
        )
        
        critical_alert = PaymentAlert(
            alert_id="critical_001",
            level=AlertLevel.CRITICAL,
            metric_type=PaymentMetricType.SUCCESS_RATE,
            title="Success Rate Critical",
            description="Success rate below critical threshold",
            threshold_value=95.0,
            actual_value=93.0,
            timestamp=datetime.utcnow(),
            resolved=False
        )
        
        monitoring_service.active_alerts[warning_alert.alert_id] = warning_alert
        monitoring_service.active_alerts[critical_alert.alert_id] = critical_alert
        
        with patch.object(monitoring_service, 'collect_real_time_metrics') as mock_metrics:
            mock_metrics.return_value = PaymentMetrics(
                timestamp=datetime.utcnow(),
                total_payments=100,
                successful_payments=93,
                failed_payments=7,
                success_rate=93.0,
                average_processing_time=6.0,
                total_revenue=Decimal("2500.00"),
                fraud_alerts=0,
                period_minutes=15
            )
            
            health_status = await monitoring_service.get_system_health_status()
        
        assert health_status["status"] == "critical"  # Due to critical alert
        assert health_status["active_alerts"]["warning"] == 1
        assert health_status["active_alerts"]["critical"] == 1
        assert health_status["total_active_alerts"] == 2
        assert "metrics" in health_status
        assert "uptime" in health_status
        assert "sla_targets" in health_status


class TestPaymentMonitoringAPI:
    """Test payment monitoring API endpoints."""
    
    def test_get_payment_system_health_success(self, client: TestClient, admin_user, db_session):
        """Test payment system health API endpoint."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Mock health status response
        mock_health = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": {
                "total_payments": 50,
                "success_rate": 98.5,
                "average_processing_time": 1.8
            },
            "active_alerts": {
                "warning": 0,
                "critical": 0,
                "emergency": 0
            },
            "uptime": {
                "last_24_hours": 99.9,
                "last_7_days": 99.8
            }
        }
        
        with patch('services.payment_monitoring.get_payment_health_status', return_value=mock_health):
            response = client.get(
                "/api/v1/payments/monitoring/health",
                headers=headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["status"] == "healthy"
        assert "metrics" in data["data"]
        assert "active_alerts" in data["data"]
    
    def test_get_payment_system_health_unauthorized(self, client: TestClient, db_session):
        """Test health endpoint requires proper authorization."""
        regular_user = UserFactory.create_user(
            email="user@test.com",
            unified_role="client"
        )
        db_session.add(regular_user)
        db_session.commit()
        
        login_response = client.post("/api/v1/auth/login", json={
            "email": regular_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get(
            "/api/v1/payments/monitoring/health",
            headers=headers
        )
        
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]
    
    def test_get_active_payment_alerts(self, client: TestClient, admin_user, db_session):
        """Test getting active payment alerts."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Mock active alerts
        mock_alerts = [
            {
                "alert_id": "test_001",
                "level": "warning",
                "metric_type": "processing_time",
                "title": "Processing Time Warning",
                "description": "Processing time above normal",
                "threshold_value": 5.0,
                "actual_value": 6.2,
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
        
        with patch('services.payment_monitoring.check_payment_alerts', return_value=mock_alerts):
            response = client.get(
                "/api/v1/payments/monitoring/alerts",
                headers=headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["alerts"]) == 1
        assert data["alert_count"] == 1
        assert data["alerts"][0]["alert_id"] == "test_001"
    
    def test_get_payment_metrics(self, client: TestClient, admin_user, db_session):
        """Test getting real-time payment metrics."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Mock metrics response
        mock_metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "total_payments": 75,
            "successful_payments": 73,
            "failed_payments": 2,
            "success_rate": 97.3,
            "average_processing_time": 2.1,
            "total_revenue": 1825.00,
            "fraud_alerts": 0,
            "period_minutes": 30
        }
        
        with patch('services.payment_monitoring.collect_payment_metrics', return_value=mock_metrics):
            response = client.get(
                "/api/v1/payments/monitoring/metrics",
                headers=headers,
                params={"period_minutes": 30}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["metrics"]["total_payments"] == 75
        assert data["metrics"]["success_rate"] == 97.3
        assert data["collection_period_minutes"] == 30
    
    def test_resolve_payment_alert(self, client: TestClient, admin_user, db_session):
        """Test resolving a payment alert."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Mock successful alert resolution
        with patch.object(PaymentMonitoringService, 'resolve_alert', return_value=True) as mock_resolve:
            response = client.post(
                "/api/v1/payments/monitoring/alerts/test_alert_001/resolve",
                headers=headers,
                params={"resolution_notes": "Fixed payment processing issue"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["alert_id"] == "test_alert_001"
        assert data["resolved_by"] == admin_user.name
        
        # Verify the resolve method was called correctly
        mock_resolve.assert_called_once()
        call_args = mock_resolve.call_args
        assert call_args[1]["alert_id"] == "test_alert_001"
        assert call_args[1]["resolution_notes"] == "Fixed payment processing issue"
    
    def test_resolve_nonexistent_alert(self, client: TestClient, admin_user, db_session):
        """Test resolving a non-existent alert."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Mock failed alert resolution
        with patch.object(PaymentMonitoringService, 'resolve_alert', return_value=False):
            response = client.post(
                "/api/v1/payments/monitoring/alerts/nonexistent_alert/resolve",
                headers=headers,
                params={"resolution_notes": "Attempted fix"}
            )
        
        assert response.status_code == 404
        assert "not found or already resolved" in response.json()["detail"]
    
    def test_get_payment_metrics_history(self, client: TestClient, admin_user, db_session):
        """Test getting payment metrics history."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "email": admin_user.email,
            "password": "test_password"
        })
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Mock metrics history
        mock_history = [
            {
                "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                "total_payments": 40,
                "success_rate": 95.0,
                "average_processing_time": 2.3
            },
            {
                "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                "total_payments": 35,
                "success_rate": 97.1,
                "average_processing_time": 1.9
            }
        ]
        
        with patch.object(PaymentMonitoringService, 'get_metrics_history', return_value=mock_history):
            response = client.get(
                "/api/v1/payments/monitoring/metrics/history",
                headers=headers,
                params={"hours": 24}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert len(data["metrics_history"]) == 2
        assert data["hours_requested"] == 24
        assert data["data_points"] == 2


class TestPaymentMonitoringEdgeCases:
    """Test edge cases and error conditions for payment monitoring."""
    
    @pytest.mark.asyncio
    async def test_metrics_collection_with_database_error(self, monitoring_service):
        """Test metrics collection handles database errors gracefully."""
        with patch.object(monitoring_service.db, 'query', side_effect=Exception("Database error")):
            metrics = await monitoring_service.collect_real_time_metrics(period_minutes=10)
        
        # Should return empty metrics instead of crashing
        assert metrics.total_payments == 0
        assert metrics.success_rate == 100.0
        assert metrics.total_revenue == Decimal('0')
    
    @pytest.mark.asyncio
    async def test_alert_generation_with_invalid_metrics(self, monitoring_service):
        """Test alert generation with invalid/edge case metrics."""
        # Metrics with zero payments but non-zero failures (edge case)
        invalid_metrics = PaymentMetrics(
            timestamp=datetime.utcnow(),
            total_payments=0,
            successful_payments=0,
            failed_payments=1,  # Inconsistent data
            success_rate=0.0,
            average_processing_time=-1.0,  # Invalid processing time
            total_revenue=Decimal("-100.00"),  # Negative revenue
            fraud_alerts=-1,  # Invalid fraud count
            period_minutes=15
        )
        
        # Should handle gracefully without crashing
        alerts = await monitoring_service.check_sla_compliance(invalid_metrics)
        
        # Should still be able to generate alerts based on valid data
        assert isinstance(alerts, list)
    
    def test_concurrent_alert_resolution(self, monitoring_service):
        """Test concurrent alert resolution attempts."""
        # Create alert
        alert = PaymentAlert(
            alert_id="concurrent_test",
            level=AlertLevel.WARNING,
            metric_type=PaymentMetricType.PROCESSING_TIME,
            title="Concurrent Test Alert",
            description="Test alert for concurrency",
            threshold_value=5.0,
            actual_value=6.0,
            timestamp=datetime.utcnow()
        )
        monitoring_service.active_alerts[alert.alert_id] = alert
        
        async def resolve_alert():
            return await monitoring_service.resolve_alert(
                alert_id="concurrent_test",
                resolved_by="concurrent_user",
                resolution_notes="Concurrent resolution test"
            )
        
        # Simulate concurrent resolution attempts
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            tasks = [resolve_alert() for _ in range(3)]
            results = loop.run_until_complete(asyncio.gather(*tasks))
        finally:
            loop.close()
        
        # First resolution should succeed, others should fail gracefully
        successful_resolutions = sum(results)
        assert successful_resolutions == 1
        assert alert.resolved is True
    
    @pytest.mark.asyncio
    async def test_monitoring_with_extremely_high_load(self, monitoring_service, db_session):
        """Test monitoring performance with very high payment volume."""
        # Create a large number of payments
        import time
        start_time = time.time()
        
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        payments = []
        
        # Create 1000 payments
        for i in range(1000):
            payment = PaymentFactory.create_payment(
                amount=Decimal("10.00"),
                status="completed" if i % 10 != 0 else "failed",  # 10% failure rate
                created_at=cutoff_time + timedelta(seconds=i % 300)
            )
            payments.append(payment)
        
        db_session.add_all(payments)
        db_session.commit()
        
        # Collect metrics and ensure it completes in reasonable time
        with patch.object(monitoring_service, '_calculate_average_processing_time', return_value=2.0):
            with patch.object(monitoring_service, '_count_fraud_alerts', return_value=5):
                metrics = await monitoring_service.collect_real_time_metrics(period_minutes=5)
        
        collection_time = time.time() - start_time
        
        # Should complete within 10 seconds even with high volume
        assert collection_time < 10.0
        assert metrics.total_payments == 1000
        assert metrics.success_rate == 90.0
        assert metrics.total_revenue == Decimal("9000.00")  # 900 successful * $10