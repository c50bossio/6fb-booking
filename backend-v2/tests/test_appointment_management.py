"""
Comprehensive Appointment Management Tests
Tests appointment lifecycle: creation, rescheduling, cancellation, no-show handling
Includes Six Figure Barber methodology integration for client retention and revenue optimization.
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import status
from sqlalchemy.orm import Session

from models import (
    Appointment, User, Client, Service, Payment, Organization,
    UnifiedUserRole, AppointmentStatusEnum
)
from schemas import AppointmentUpdate, AppointmentReschedule, CancellationRequest
from services.cancellation_service import CancellationPolicyService
from services.analytics_service import AnalyticsService
from services.revenue_optimization_service import RevenueOptimizationService
from tests.factories import (
    UserFactory, ClientFactory, AppointmentFactory, ServiceFactory,
    PaymentFactory, OrganizationFactory
)
from utils.timezone_utils import get_timezone_aware_now


class TestAppointmentCreation:
    """Test comprehensive appointment creation flows"""
    
    def setup_method(self):
        """Setup test data for each test"""
        self.appointment_service = AppointmentManagementService()
        self.analytics_service = AnalyticsService()
        
    @pytest.mark.asyncio
    async def test_appointment_creation_with_client_history_analysis(self, db: Session, client, auth_headers):
        """Test appointment creation with client booking pattern analysis"""
        # Setup client with booking history
        user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        client_profile = ClientFactory(
            user_id=user.id,
            total_spent=Decimal('450.00'),
            total_visits=9,
            average_ticket=Decimal('50.00'),
            last_visit_date=datetime.utcnow() - timedelta(days=21),
            visit_frequency_days=28,  # Monthly regular
            customer_type="returning"
        )
        
        # Create appointment history to establish patterns
        historical_appointments = []
        for i in range(5):
            appointment = AppointmentFactory(
                client_id=client_profile.id,
                start_time=datetime.utcnow() - timedelta(days=30*i),
                status="completed",
                price=Decimal('50.00')
            )
            historical_appointments.append(appointment)
            db.add(appointment)
        
        db.commit()
        
        # Setup new appointment
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        service = ServiceFactory(base_price=Decimal('55.00'))
        organization = OrganizationFactory()
        
        appointment_time = get_timezone_aware_now() + timedelta(days=1, hours=10)
        
        booking_data = {
            "barber_id": barber.id,
            "service_id": service.id,
            "organization_id": organization.id,
            "start_time": appointment_time.isoformat(),
            "duration_minutes": 60,
            "notes": "Regular monthly appointment"
        }
        
        with patch('services.client_retention_service.analyze_booking_patterns') as mock_analysis:
            mock_analysis.return_value = {
                "pattern_type": "regular_monthly",
                "adherence_score": 0.85,
                "risk_level": "low",
                "next_suggested_booking": appointment_time + timedelta(days=28),
                "retention_strategies": ["loyalty_reward", "early_booking_discount"]
            }
            
            response = client.post("/api/v1/appointments", json=booking_data, headers=auth_headers)
            
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        appointment = db.query(Appointment).filter(Appointment.id == data["id"]).first()
        
        # Verify appointment creation
        assert appointment is not None
        assert appointment.status == "confirmed"
        
        # Verify client pattern analysis included
        assert "client_insights" in data
        insights = data["client_insights"]
        assert insights["pattern_type"] == "regular_monthly"
        assert insights["adherence_score"] == 0.85
        assert "next_suggested_booking" in insights
        
        # Verify retention strategies suggested
        assert "retention_strategies" in data
        assert "loyalty_reward" in data["retention_strategies"]
        
    @pytest.mark.asyncio
    async def test_appointment_creation_with_automatic_upselling(self, db: Session, client, auth_headers):
        """Test appointment creation triggers Six Figure Barber upselling"""
        # Setup client profile
        user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        client_profile = ClientFactory(
            user_id=user.id,
            total_spent=Decimal('800.00'),
            total_visits=12,
            customer_type="returning"
        )
        
        # Create service with upselling potential
        base_service = ServiceFactory(
            name="Classic Haircut",
            category="HAIRCUT",
            base_price=Decimal('45.00'),
            six_fb_tier="standard"
        )
        
        upsell_service = ServiceFactory(
            name="Beard Trim & Oil Treatment", 
            category="BEARD",
            base_price=Decimal('35.00'),
            six_fb_tier="premium"
        )
        
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        organization = OrganizationFactory()
        
        appointment_time = get_timezone_aware_now() + timedelta(days=2, hours=14)
        
        booking_data = {
            "barber_id": barber.id,
            "service_id": base_service.id,
            "organization_id": organization.id,
            "start_time": appointment_time.isoformat(),
            "duration_minutes": 60
        }
        
        with patch('services.booking_service.generate_6fb_upselling_suggestions') as mock_upsell:
            mock_upsell.return_value = [
                {
                    "service_id": upsell_service.id,
                    "name": "Beard Trim & Oil Treatment",
                    "price": "35.00",
                    "category": "BEARD", 
                    "revenue_impact": "77.8%",
                    "recommendation_reason": "Popular add-on for haircut clients",
                    "estimated_total_time": 30,
                    "six_fb_tier": "premium"
                }
            ]
            
            response = client.post("/api/v1/appointments", json=booking_data, headers=auth_headers)
            
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        
        # Verify upselling suggestions included
        assert "upselling_suggestions" in data
        suggestions = data["upselling_suggestions"]
        assert len(suggestions) == 1
        assert suggestions[0]["revenue_impact"] == "77.8%"
        assert suggestions[0]["six_fb_tier"] == "premium"
        
        # Verify automatic upsell tracking
        mock_upsell.assert_called_once()


class TestAppointmentRescheduling:
    """Test appointment rescheduling scenarios"""
    
    def setup_method(self):
        self.appointment_service = AppointmentManagementService()
        
    @pytest.mark.asyncio
    async def test_client_self_reschedule_within_policy(self, db: Session, client, auth_headers):
        """Test client rescheduling their own appointment within policy limits"""
        # Setup appointment 48 hours in advance (within reschedule window)
        user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        client_profile = ClientFactory(user_id=user.id)
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        service = ServiceFactory()
        
        original_time = get_timezone_aware_now() + timedelta(days=2, hours=10)
        appointment = AppointmentFactory(
            user_id=user.id,
            client_id=client_profile.id,
            barber_id=barber.id,
            service_id=service.id,
            start_time=original_time,
            status="confirmed",
            price=Decimal('50.00')
        )
        db.add(appointment)
        db.commit()
        
        # Reschedule to different time
        new_time = get_timezone_aware_now() + timedelta(days=3, hours=14)
        
        reschedule_data = {
            "new_start_time": new_time.isoformat(),
            "reason": "Schedule conflict",
            "client_initiated": True
        }
        
        with patch('services.appointment_management_service.check_reschedule_policy') as mock_policy:
            mock_policy.return_value = {
                "allowed": True,
                "fee_required": False,
                "hours_notice": 48,
                "policy_compliant": True
            }
            
            response = client.put(f"/api/v1/appointments/{appointment.id}/reschedule", 
                                json=reschedule_data, headers=auth_headers)
            
        assert response.status_code == status.HTTP_200_OK
        
        # Verify appointment updated
        updated_appointment = db.query(Appointment).filter(Appointment.id == appointment.id).first()
        assert updated_appointment.start_time.replace(tzinfo=None) == new_time.replace(tzinfo=None)
        assert updated_appointment.status == "confirmed"
        
        # Verify reschedule tracking
        data = response.json()
        assert data["reschedule_count"] >= 1
        assert data["policy_compliant"] == True
        assert data["fee_applied"] == False
        
    @pytest.mark.asyncio
    async def test_client_reschedule_with_fee_application(self, db: Session, client, auth_headers):
        """Test client rescheduling with policy fee application"""
        # Setup appointment within fee window (less than 24 hours)
        user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        client_profile = ClientFactory(user_id=user.id)
        appointment = AppointmentFactory(
            user_id=user.id,
            client_id=client_profile.id,
            start_time=get_timezone_aware_now() + timedelta(hours=12),  # 12 hours notice
            status="confirmed",
            price=Decimal('60.00')
        )
        db.add(appointment)
        db.commit()
        
        new_time = get_timezone_aware_now() + timedelta(days=1, hours=16)
        
        reschedule_data = {
            "new_start_time": new_time.isoformat(),
            "reason": "Emergency reschedule",
            "accept_fee": True
        }
        
        with patch('services.appointment_management_service.check_reschedule_policy') as mock_policy:
            mock_policy.return_value = {
                "allowed": True,
                "fee_required": True,
                "fee_amount": Decimal('15.00'),
                "hours_notice": 12,
                "policy_compliant": False
            }
            
            with patch('services.payment_service.process_reschedule_fee') as mock_fee:
                mock_fee.return_value = {"success": True, "fee_charged": Decimal('15.00')}
                
                response = client.put(f"/api/v1/appointments/{appointment.id}/reschedule",
                                    json=reschedule_data, headers=auth_headers)
                
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["fee_applied"] == True
        assert data["fee_amount"] == "15.00"
        assert data["policy_compliant"] == False
        
        # Verify fee processing called
        mock_fee.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_barber_reschedule_client_appointment(self, db: Session, client):
        """Test barber rescheduling client appointment with different policies"""
        # Setup barber and client
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client_profile = ClientFactory()
        appointment = AppointmentFactory(
            barber_id=barber.id,
            client_id=client_profile.id,
            start_time=get_timezone_aware_now() + timedelta(hours=6),  # Short notice
            status="confirmed"
        )
        db.add(appointment)
        db.commit()
        
        barber_auth = {"Authorization": f"Bearer barber_token_{barber.id}"}
        new_time = get_timezone_aware_now() + timedelta(days=1, hours=12)
        
        reschedule_data = {
            "new_start_time": new_time.isoformat(),
            "reason": "Barber emergency",
            "barber_initiated": True,
            "offer_compensation": True
        }
        
        with patch('services.notification_service.send_reschedule_notification') as mock_notify:
            response = client.put(f"/api/v1/appointments/{appointment.id}/reschedule",
                                json=reschedule_data, headers=barber_auth)
            
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        
        # Verify barber reschedule privileges (no fee for barber-initiated)
        assert data["fee_applied"] == False
        assert data["compensation_offered"] == True
        
        # Verify client notification sent
        mock_notify.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_reschedule_availability_conflicts(self, db: Session, client, auth_headers):
        """Test rescheduling with availability conflicts"""
        # Setup overlapping appointments
        user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        
        appointment1 = AppointmentFactory(
            user_id=user.id,
            barber_id=barber.id,
            start_time=get_timezone_aware_now() + timedelta(days=1, hours=10),
            duration_minutes=60,
            status="confirmed"
        )
        
        # Existing appointment at target time
        conflict_time = get_timezone_aware_now() + timedelta(days=1, hours=14)
        appointment2 = AppointmentFactory(
            barber_id=barber.id,
            start_time=conflict_time,
            duration_minutes=90,
            status="confirmed"
        )
        
        db.add_all([appointment1, appointment2])
        db.commit()
        
        # Try to reschedule to conflicting time
        reschedule_data = {
            "new_start_time": conflict_time.isoformat(),
            "reason": "Preferred time"
        }
        
        response = client.put(f"/api/v1/appointments/{appointment1.id}/reschedule",
                            json=reschedule_data, headers=auth_headers)
            
        assert response.status_code == status.HTTP_409_CONFLICT
        
        data = response.json()
        assert "conflict_detected" in data
        assert data["conflict_details"]["overlapping_appointments"] > 0
        
        # Verify alternative times suggested
        assert "suggested_alternatives" in data
        assert len(data["suggested_alternatives"]) > 0


class TestAppointmentCancellation:
    """Test appointment cancellation scenarios"""
    
    def setup_method(self):
        self.appointment_service = AppointmentManagementService()
        self.analytics_service = AnalyticsService()
        
    @pytest.mark.asyncio
    async def test_client_cancellation_within_policy(self, db: Session, client, auth_headers):
        """Test client cancelling appointment within policy guidelines"""
        # Setup appointment with sufficient notice
        user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        client_profile = ClientFactory(
            user_id=user.id,
            total_visits=8,
            cancellation_count=1  # Previous cancellation
        )
        
        appointment = AppointmentFactory(
            user_id=user.id,
            client_id=client_profile.id,
            start_time=get_timezone_aware_now() + timedelta(days=3),  # 72 hours notice
            status="confirmed",
            price=Decimal('55.00')
        )
        db.add(appointment)
        db.commit()
        
        cancellation_data = {
            "reason": "Personal emergency",
            "request_reschedule": False,
            "client_initiated": True
        }
        
        with patch('services.client_retention_service.analyze_cancellation_risk') as mock_risk:
            mock_risk.return_value = {
                "risk_level": "low",
                "retention_actions": ["offer_reschedule", "loyalty_incentive"],
                "pattern_concerning": False
            }
            
            response = client.post(f"/api/v1/appointments/{appointment.id}/cancel",
                                 json=cancellation_data, headers=auth_headers)
            
        assert response.status_code == status.HTTP_200_OK
        
        # Verify appointment cancelled
        cancelled_appointment = db.query(Appointment).filter(Appointment.id == appointment.id).first()
        assert cancelled_appointment.status == "cancelled"
        
        data = response.json()
        
        # Verify policy compliance
        assert data["cancellation_fee"] == 0.0
        assert data["refund_eligible"] == True
        
        # Verify retention analysis
        assert "retention_analysis" in data
        assert data["retention_analysis"]["risk_level"] == "low"
        
    @pytest.mark.asyncio
    async def test_client_cancellation_with_fee_and_retention(self, db: Session, client, auth_headers):
        """Test client cancellation with fee and retention intervention"""
        # Setup client with concerning cancellation pattern
        user = UserFactory(unified_role=UnifiedUserRole.CLIENT)
        client_profile = ClientFactory(
            user_id=user.id,
            total_visits=5,
            cancellation_count=3,  # High cancellation rate
            no_show_count=1
        )
        
        appointment = AppointmentFactory(
            user_id=user.id,
            client_id=client_profile.id,
            start_time=get_timezone_aware_now() + timedelta(hours=18),  # 18 hours notice
            status="confirmed",
            price=Decimal('70.00')
        )
        db.add(appointment)
        db.commit()
        
        cancellation_data = {
            "reason": "Changed mind",
            "accept_fee": True
        }
        
        with patch('services.client_retention_service.analyze_cancellation_risk') as mock_risk:
            mock_risk.return_value = {
                "risk_level": "high",
                "retention_actions": ["personal_outreach", "loyalty_discount", "priority_booking"],
                "pattern_concerning": True,
                "churn_probability": 0.75
            }
            
            with patch('services.payment_service.process_cancellation_fee') as mock_fee:
                mock_fee.return_value = {"success": True, "fee_amount": Decimal('25.00')}
                
                response = client.post(f"/api/v1/appointments/{appointment.id}/cancel",
                                     json=cancellation_data, headers=auth_headers)
                
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        
        # Verify fee application
        assert data["cancellation_fee"] == "25.00"
        assert data["fee_applied"] == True
        
        # Verify retention intervention triggered
        retention = data["retention_analysis"]
        assert retention["risk_level"] == "high"
        assert retention["churn_probability"] == 0.75
        assert "personal_outreach" in retention["retention_actions"]
        
        # Verify client profile updated
        updated_client = db.query(Client).filter(Client.id == client_profile.id).first()
        assert updated_client.cancellation_count == 4
        
    @pytest.mark.asyncio
    async def test_barber_initiated_cancellation(self, db: Session, client):
        """Test barber cancelling client appointment"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client_profile = ClientFactory()
        appointment = AppointmentFactory(
            barber_id=barber.id,
            client_id=client_profile.id,
            start_time=get_timezone_aware_now() + timedelta(hours=4),  # Short notice
            status="confirmed",
            price=Decimal('60.00')
        )
        db.add(appointment)
        db.commit()
        
        barber_auth = {"Authorization": f"Bearer barber_token_{barber.id}"}
        
        cancellation_data = {
            "reason": "Family emergency",
            "barber_initiated": True,
            "offer_compensation": True,
            "priority_reschedule": True
        }
        
        with patch('services.notification_service.send_cancellation_notification') as mock_notify:
            with patch('services.appointment_management_service.offer_priority_rebooking') as mock_priority:
                response = client.post(f"/api/v1/appointments/{appointment.id}/cancel",
                                     json=cancellation_data, headers=barber_auth)
                
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        
        # Verify barber cancellation policies
        assert data["cancellation_fee"] == 0.0  # No fee for barber cancellation
        assert data["compensation_offered"] == True
        assert data["priority_rebooking"] == True
        
        # Verify notifications sent
        mock_notify.assert_called_once()
        mock_priority.assert_called_once()


class TestNoShowHandling:
    """Test appointment no-show scenarios and handling"""
    
    def setup_method(self):
        self.appointment_service = AppointmentManagementService()
        self.analytics_service = AnalyticsService()
        
    @pytest.mark.asyncio
    async def test_automatic_no_show_detection(self, db: Session):
        """Test automatic no-show detection and processing"""
        # Setup appointment that should be marked as no-show
        client_profile = ClientFactory(
            no_show_count=1,  # Previous no-show
            total_visits=6
        )
        
        # Appointment 30 minutes past start time
        past_appointment = AppointmentFactory(
            client_id=client_profile.id,
            start_time=get_timezone_aware_now() - timedelta(minutes=30),
            status="confirmed",
            price=Decimal('50.00')
        )
        db.add(past_appointment)
        db.commit()
        
        # Simulate automated no-show check
        with patch('services.client_retention_service.analyze_no_show_pattern') as mock_analysis:
            mock_analysis.return_value = {
                "pattern_severity": "moderate",
                "intervention_recommended": True,
                "retention_risk": "medium",
                "suggested_actions": ["personal_contact", "policy_reminder"]
            }
            
            result = self.appointment_service.process_no_show(past_appointment.id)
            
        # Verify appointment marked as no-show
        updated_appointment = db.query(Appointment).filter(Appointment.id == past_appointment.id).first()
        assert updated_appointment.status == "no_show"
        
        # Verify client profile updated
        updated_client = db.query(Client).filter(Client.id == client_profile.id).first()
        assert updated_client.no_show_count == 2
        
        # Verify retention analysis performed
        assert result["retention_analysis"]["intervention_recommended"] == True
        
    @pytest.mark.asyncio
    async def test_manual_no_show_marking_by_barber(self, db: Session, client):
        """Test barber manually marking client as no-show"""
        barber = UserFactory(unified_role=UnifiedUserRole.BARBER)
        client_profile = ClientFactory(no_show_count=0)
        
        appointment = AppointmentFactory(
            barber_id=barber.id,
            client_id=client_profile.id,
            start_time=get_timezone_aware_now() - timedelta(minutes=10),
            status="confirmed",
            price=Decimal('45.00')
        )
        db.add(appointment)
        db.commit()
        
        barber_auth = {"Authorization": f"Bearer barber_token_{barber.id}"}
        
        no_show_data = {
            "confirmed_no_show": True,
            "wait_time_minutes": 15,
            "attempted_contact": True,
            "notes": "Client did not arrive, no response to calls"
        }
        
        with patch('services.revenue_optimization_service.calculate_no_show_impact') as mock_impact:
            mock_impact.return_value = {
                "lost_revenue": Decimal('45.00'),
                "opportunity_cost": Decimal('15.00'),
                "total_impact": Decimal('60.00')
            }
            
            response = client.post(f"/api/v1/appointments/{appointment.id}/no-show",
                                 json=no_show_data, headers=barber_auth)
            
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        
        # Verify no-show processing
        assert data["status"] == "no_show"
        assert data["no_show_fee_applied"] == True
        
        # Verify revenue impact calculated
        assert "revenue_impact" in data
        assert data["revenue_impact"]["lost_revenue"] == "45.00"
        
    @pytest.mark.asyncio
    async def test_no_show_pattern_intervention(self, db: Session):
        """Test intervention for clients with concerning no-show patterns"""
        # Setup client with high no-show rate
        problem_client = ClientFactory(
            total_visits=8,
            no_show_count=4,  # 50% no-show rate
            customer_type="at_risk"
        )
        
        # Recent no-show appointment
        recent_no_show = AppointmentFactory(
            client_id=problem_client.id,
            start_time=get_timezone_aware_now() - timedelta(days=1),
            status="no_show",
            price=Decimal('55.00')
        )
        db.add(recent_no_show)
        db.commit()
        
        # Analyze pattern and trigger intervention
        retention_analysis = self.retention_service.analyze_client_retention_risk(problem_client.id)
        
        # Verify high-risk classification
        assert retention_analysis["risk_level"] == "high"
        assert retention_analysis["no_show_rate"] >= 0.4  # 40%+ no-show rate
        assert retention_analysis["intervention_required"] == True
        
        # Verify intervention strategies
        interventions = retention_analysis["recommended_interventions"]
        assert "booking_deposit_required" in interventions
        assert "personal_manager_assignment" in interventions
        assert "flexible_booking_policy" in interventions
        
    @pytest.mark.asyncio
    async def test_no_show_fee_application_and_policy(self, db: Session):
        """Test no-show fee application according to Six Figure Barber policies"""
        # Setup premium client with different fee structure
        premium_client = ClientFactory(
            total_spent=Decimal('1200.00'),
            total_visits=18,
            customer_type="vip",
            no_show_count=0  # First no-show
        )
        
        premium_appointment = AppointmentFactory(
            client_id=premium_client.id,
            start_time=get_timezone_aware_now() - timedelta(minutes=20),
            status="confirmed",
            price=Decimal('85.00')  # Premium service
        )
        db.add(premium_appointment)
        db.commit()
        
        # Process no-show with premium client considerations
        with patch('services.client_tier_service.get_client_tier') as mock_tier:
            mock_tier.return_value = {
                "tier": "gold",
                "no_show_fee_discount": 0.5,  # 50% discount for gold clients
                "grace_period_minutes": 20   # Extended grace period
            }
            
            result = self.appointment_service.process_no_show(premium_appointment.id)
            
        # Verify tier-based fee calculation
        assert result["no_show_fee"] == Decimal('21.25')  # 25% of service price with 50% discount
        assert result["tier_discount_applied"] == True
        assert result["grace_period_extended"] == True
        
        # Verify client retention focus for premium clients
        assert result["retention_priority"] == "high"
        assert "personal_outreach" in result["immediate_actions"]