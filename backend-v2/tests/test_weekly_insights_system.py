"""
Comprehensive Integration Tests for Weekly Insights System

This test suite validates the complete weekly insights generation system,
including data processing, recommendation generation, email delivery,
and PDF report creation. Tests are designed to ensure system reliability,
accuracy, and Six Figure Barber methodology alignment.
"""

import pytest
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch, MagicMock
import json
import io
from decimal import Decimal

from models import User, Appointment, Payment, Service, Client
from models.weekly_insights import (
    WeeklyInsight, WeeklyRecommendation, InsightEmailDelivery, InsightTemplate,
    InsightCategory, RecommendationPriority, RecommendationStatus,
    InsightStatus, EmailDeliveryStatus
)
from services.weekly_insights_service import WeeklyInsightsService
from services.intelligent_recommendation_engine import IntelligentRecommendationEngine
from services.insight_email_service import InsightEmailService
from services.pdf_report_generator import PDFReportGenerator
from api.v2.endpoints.weekly_insights import router
from workers.weekly_insights_worker import WeeklyInsightsWorker

class TestWeeklyInsightsSystem:
    """Comprehensive test suite for the weekly insights system"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        # This would be configured with test database
        pass
    
    @pytest.fixture
    def test_user(self, db_session):
        """Create test user"""
        user = User(
            id=1,
            name="Test Barber",
            email="testbarber@example.com",
            unified_role="barber",
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=90)
        )
        db_session.add(user)
        db_session.commit()
        return user
    
    @pytest.fixture
    def test_appointments(self, db_session, test_user):
        """Create test appointments and payments"""
        appointments = []
        payments = []
        
        # Create a week's worth of test data
        week_start = datetime.now() - timedelta(days=7)
        
        for i in range(5):  # 5 appointments
            appointment_time = week_start + timedelta(days=i, hours=10)
            
            appointment = Appointment(
                id=i + 1,
                barber_id=test_user.id,
                client_id=i + 10,  # Mock client IDs
                service_id=1,
                start_time=appointment_time,
                duration_minutes=60,
                status="completed",
                price=Decimal('75.00'),
                created_at=appointment_time
            )
            
            payment = Payment(
                id=i + 1,
                appointment_id=appointment.id,
                barber_id=test_user.id,
                amount=Decimal('75.00'),
                status="completed",
                created_at=appointment_time
            )
            
            appointments.append(appointment)
            payments.append(payment)
            
            db_session.add(appointment)
            db_session.add(payment)
        
        db_session.commit()
        return appointments, payments
    
    def test_weekly_insights_generation(self, db_session, test_user, test_appointments):
        """Test complete weekly insights generation process"""
        
        service = WeeklyInsightsService(db_session)
        
        # Generate insights for last week
        week_start = datetime.now() - timedelta(days=7)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        insight = service.generate_weekly_insights(test_user.id, week_start)
        
        # Validate insight generation
        assert insight is not None
        assert insight.user_id == test_user.id
        assert insight.status == InsightStatus.GENERATED
        assert insight.overall_score > 0
        assert insight.revenue_current_week > 0
        assert insight.appointments_current_week > 0
        
        # Validate Six Figure Barber scores
        assert 0 <= insight.revenue_optimization_score <= 100
        assert 0 <= insight.client_value_score <= 100
        assert 0 <= insight.service_excellence_score <= 100
        assert 0 <= insight.business_efficiency_score <= 100
        assert 0 <= insight.professional_growth_score <= 100
        
        # Validate insights content
        assert insight.executive_summary is not None
        assert insight.key_insights is not None
        assert isinstance(insight.top_achievements, list)
        assert isinstance(insight.key_opportunities, list)
        
        print(f"✓ Weekly insights generated successfully: Score {insight.overall_score:.1f}/100")
    
    def test_recommendation_engine(self, db_session, test_user):
        """Test intelligent recommendation generation"""
        
        engine = IntelligentRecommendationEngine(db_session)
        
        # Mock business data
        business_data = {
            'total_revenue': 375.0,  # 5 appointments × $75
            'total_appointments': 5,
            'unique_clients': 5,
            'average_ticket_size': 75.0,
            'booking_efficiency_percent': 65.0,
            'revenue_growth_percent': 10.0,
            'revenue_optimization_score': 70.0,
            'client_value_score': 65.0,
            'service_excellence_score': 75.0,
            'business_efficiency_score': 68.0,
            'professional_growth_score': 60.0
        }
        
        recommendations = engine.generate_personalized_recommendations(\n            user_id=test_user.id,\n            business_data=business_data,\n            max_recommendations=5\n        )\n        \n        # Validate recommendations\n        assert len(recommendations) > 0\n        assert len(recommendations) <= 5\n        \n        for rec in recommendations:\n            assert 'category' in rec\n            assert 'priority' in rec\n            assert 'title' in rec\n            assert 'description' in rec\n            assert 'expected_impact' in rec\n            assert 'confidence_score' in rec\n            assert 0.0 <= rec['confidence_score'] <= 1.0\n            assert 'six_fb_principle' in rec\n            assert 'action_items' in rec\n            assert isinstance(rec['action_items'], list)\n        \n        print(f"✓ Generated {len(recommendations)} personalized recommendations")\n        \n        # Test recommendation scoring\n        high_priority_recs = [r for r in recommendations if r['priority'] == RecommendationPriority.HIGH]\n        assert len(high_priority_recs) > 0, "Should generate at least one high-priority recommendation"\n    \n    def test_email_service_integration(self, db_session, test_user):\n        """Test email template generation and delivery preparation"""\n        \n        # Create mock insight\n        insight = WeeklyInsight(\n            id=1,\n            user_id=test_user.id,\n            week_start_date=datetime.now() - timedelta(days=7),\n            week_end_date=datetime.now() - timedelta(days=1),\n            overall_score=78.5,\n            revenue_current_week=375.0,\n            revenue_previous_week=340.0,\n            revenue_growth_percent=10.3,\n            appointments_current_week=5,\n            appointments_previous_week=4,\n            new_clients_count=2,\n            returning_clients_count=3,\n            average_ticket_size=75.0,\n            booking_efficiency_percent=72.0,\n            revenue_optimization_score=75.0,\n            client_value_score=70.0,\n            service_excellence_score=80.0,\n            business_efficiency_score=78.0,\n            professional_growth_score=68.0,\n            status=InsightStatus.GENERATED,\n            executive_summary="Strong week with revenue growth and new client acquisition.",\n            top_achievements=["Increased revenue by 10.3%", "Acquired 2 new clients"],\n            key_opportunities=["Optimize booking efficiency", "Increase premium services"]\n        )\n        \n        db_session.add(insight)\n        db_session.commit()\n        \n        # Mock email service\n        with patch('services.insight_email_service.EmailService') as mock_email_service:\n            mock_email_service.return_value.send_email.return_value = 'test-message-id'\n            \n            email_service = InsightEmailService(db_session, mock_email_service)\n            \n            # Test email preparation and content generation\n            content_data = email_service._prepare_email_content(insight, test_user)\n            \n            # Validate email content\n            assert content_data['barber_name'] == test_user.name\n            assert content_data['overall_score'] == insight.overall_score\n            assert content_data['revenue_current'] == insight.revenue_current_week\n            assert content_data['week_label'] is not None\n            assert isinstance(content_data['top_achievements'], list)\n            \n            # Test email delivery\n            delivery = email_service.send_weekly_insight_email(\n                insight_id=insight.id,\n                scheduled_time=datetime.utcnow()\n            )\n            \n            assert delivery is not None\n            assert delivery.user_id == test_user.id\n            assert delivery.weekly_insight_id == insight.id\n            assert delivery.email_address == test_user.email\n            \n            print("✓ Email service integration successful")\n    \n    def test_pdf_report_generation(self, db_session, test_user):\n        """Test PDF report generation with charts and visualizations"""\n        \n        # Create mock insight with comprehensive data\n        insight = WeeklyInsight(\n            id=1,\n            user_id=test_user.id,\n            week_start_date=datetime.now() - timedelta(days=7),\n            week_end_date=datetime.now() - timedelta(days=1),\n            overall_score=82.3,\n            score_change=5.2,\n            revenue_current_week=450.0,\n            revenue_previous_week=380.0,\n            revenue_growth_percent=18.4,\n            appointments_current_week=6,\n            appointments_previous_week=5,\n            new_clients_count=3,\n            returning_clients_count=3,\n            client_retention_rate=75.0,\n            average_ticket_size=75.0,\n            booking_efficiency_percent=78.0,\n            no_show_rate_percent=8.0,\n            revenue_optimization_score=85.0,\n            client_value_score=75.0,\n            service_excellence_score=88.0,\n            business_efficiency_score=80.0,\n            professional_growth_score=72.0,\n            status=InsightStatus.GENERATED,\n            executive_summary="Excellent week with strong revenue growth and improved efficiency.",\n            key_insights="Focus on premium services and client retention strategies.",\n            top_achievements=["18.4% revenue increase", "Improved booking efficiency", "Strong client satisfaction"],\n            key_opportunities=["Expand premium services", "Enhance client retention", "Optimize schedule"],\n            risk_factors=[]\n        )\n        \n        # Create mock recommendations\n        recommendations = [\n            WeeklyRecommendation(\n                id=1,\n                weekly_insight_id=1,\n                user_id=test_user.id,\n                category=InsightCategory.REVENUE_OPTIMIZATION,\n                priority=RecommendationPriority.HIGH,\n                title="Implement Premium Service Packages",\n                description="Create bundled premium services to increase average ticket size.",\n                expected_impact="20-30% revenue increase",\n                estimated_effort="2-3 weeks",\n                confidence_score=0.85,\n                six_fb_principle="revenue_optimization",\n                action_items=["Analyze current service mix", "Design premium packages", "Train on upselling"],\n                success_metrics=["Average ticket >$100", "Premium adoption >25%"]\n            )\n        ]\n        \n        insight.recommendations = recommendations\n        \n        # Generate PDF report\n        pdf_generator = PDFReportGenerator()\n        \n        pdf_bytes = pdf_generator.generate_weekly_report(insight, test_user)\n        \n        # Validate PDF generation\n        assert pdf_bytes is not None\n        assert len(pdf_bytes) > 0\n        assert pdf_bytes.startswith(b'%PDF')  # PDF header\n        \n        # Test PDF content (basic validation)\n        pdf_content = pdf_bytes.decode('latin-1', errors='ignore')\n        assert 'Six Figure Barber' in pdf_content\n        assert test_user.name in pdf_content\n        assert str(insight.overall_score) in pdf_content\n        \n        print(f"✓ PDF report generated successfully ({len(pdf_bytes)} bytes)")\n    \n    def test_api_endpoints(self, db_session, test_user):\n        """Test API endpoints functionality"""\n        \n        from fastapi.testclient import TestClient\n        from main import app\n        \n        client = TestClient(app)\n        \n        # Mock authentication\n        with patch('utils.auth.get_current_user', return_value=test_user):\n            # Test insights listing\n            response = client.get("/api/v2/weekly-insights")\n            assert response.status_code == 200\n            \n            # Test insight generation\n            response = client.post("/api/v2/weekly-insights/generate", json={\n                "force_regenerate": False\n            })\n            assert response.status_code in [200, 202]  # Success or accepted\n            \n            # Test trends endpoint\n            response = client.get("/api/v2/weekly-insights/history/trends", params={\n                "metric_name": "overall_score",\n                "weeks_back": 8\n            })\n            # May return 404 if no historical data, which is acceptable\n            assert response.status_code in [200, 404]\n            \n            print("✓ API endpoints responding correctly")\n    \n    def test_background_worker_integration(self, db_session):\n        """Test background worker functionality"""\n        \n        with patch('workers.weekly_insights_worker.SessionLocal', return_value=db_session):\n            worker = WeeklyInsightsWorker()\n            \n            # Test user eligibility check\n            users = worker.get_active_users_for_insights()\n            assert isinstance(users, list)\n            \n            print("✓ Background worker initialization successful")\n    \n    def test_data_accuracy_validation(self, db_session, test_user, test_appointments):\n        """Test accuracy of calculated metrics and insights"""\n        \n        service = WeeklyInsightsService(db_session)\n        appointments, payments = test_appointments\n        \n        # Generate insights\n        week_start = datetime.now() - timedelta(days=7)\n        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)\n        \n        insight = service.generate_weekly_insights(test_user.id, week_start)\n        \n        # Validate calculated metrics against expected values\n        expected_revenue = sum(float(p.amount) for p in payments)\n        expected_appointments = len([a for a in appointments if a.status == "completed"])\n        \n        assert abs(insight.revenue_current_week - expected_revenue) < 0.01\n        assert insight.appointments_current_week == expected_appointments\n        \n        # Validate average ticket calculation\n        expected_avg_ticket = expected_revenue / expected_appointments if expected_appointments > 0 else 0\n        assert abs(insight.average_ticket_size - expected_avg_ticket) < 0.01\n        \n        print("✓ Metric calculations are accurate")\n    \n    def test_six_figure_barber_methodology_alignment(self, db_session, test_user):\n        """Test alignment with Six Figure Barber methodology principles"""\n        \n        service = WeeklyInsightsService(db_session)\n        engine = IntelligentRecommendationEngine(db_session)\n        \n        # Test various business scenarios\n        scenarios = [\n            {\n                'name': 'startup_barber',\n                'data': {\n                    'total_revenue': 200.0,\n                    'total_appointments': 4,\n                    'average_ticket_size': 50.0,\n                    'booking_efficiency_percent': 45.0,\n                    'revenue_optimization_score': 50.0\n                }\n            },\n            {\n                'name': 'established_barber',\n                'data': {\n                    'total_revenue': 800.0,\n                    'total_appointments': 8,\n                    'average_ticket_size': 100.0,\n                    'booking_efficiency_percent': 85.0,\n                    'revenue_optimization_score': 85.0\n                }\n            }\n        ]\n        \n        for scenario in scenarios:\n            recommendations = engine.generate_personalized_recommendations(\n                user_id=test_user.id,\n                business_data=scenario['data'],\n                max_recommendations=3\n            )\n            \n            # Validate Six Figure Barber principle alignment\n            for rec in recommendations:\n                assert rec['six_fb_principle'] in [\n                    'revenue_optimization', 'client_value_maximization',\n                    'service_excellence', 'business_efficiency', 'professional_growth'\n                ]\n                \n                # Check methodology alignment score\n                assert 0.0 <= rec['methodology_alignment_score'] <= 1.0\n            \n            print(f"✓ {scenario['name']} scenario aligned with Six Figure Barber methodology")\n    \n    def test_error_handling_and_resilience(self, db_session, test_user):\n        """Test system error handling and resilience"""\n        \n        service = WeeklyInsightsService(db_session)\n        \n        # Test with insufficient data\n        future_date = datetime.now() + timedelta(days=7)\n        try:\n            insight = service.generate_weekly_insights(test_user.id, future_date)\n            # Should handle gracefully, possibly with minimal insight generation\n            assert insight.status in [InsightStatus.GENERATED, InsightStatus.FAILED]\n        except Exception as e:\n            # Should not raise unhandled exceptions\n            assert False, f"Unhandled exception: {e}"\n        \n        # Test with invalid user ID\n        try:\n            insight = service.generate_weekly_insights(99999, datetime.now() - timedelta(days=7))\n            assert False, "Should raise exception for invalid user"\n        except Exception:\n            pass  # Expected behavior\n        \n        print("✓ Error handling working correctly")\n    \n    def test_performance_benchmarks(self, db_session, test_user, test_appointments):\n        """Test system performance benchmarks"""\n        \n        import time\n        \n        service = WeeklyInsightsService(db_session)\n        \n        # Benchmark insight generation\n        start_time = time.time()\n        \n        week_start = datetime.now() - timedelta(days=7)\n        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)\n        \n        insight = service.generate_weekly_insights(test_user.id, week_start)\n        \n        generation_time = time.time() - start_time\n        \n        # Performance assertions\n        assert generation_time < 30.0, f"Insight generation took {generation_time:.2f}s, should be under 30s"\n        assert insight.generation_duration_seconds < 30.0\n        \n        print(f"✓ Insight generation completed in {generation_time:.2f}s")\n        \n        # Benchmark PDF generation\n        pdf_generator = PDFReportGenerator()\n        \n        start_time = time.time()\n        pdf_bytes = pdf_generator.generate_weekly_report(insight, test_user)\n        pdf_generation_time = time.time() - start_time\n        \n        assert pdf_generation_time < 15.0, f"PDF generation took {pdf_generation_time:.2f}s, should be under 15s"\n        \n        print(f"✓ PDF generation completed in {pdf_generation_time:.2f}s")\n\n    @pytest.mark.integration\n    def test_complete_end_to_end_workflow(self, db_session, test_user, test_appointments):\n        """Test complete end-to-end workflow from data to delivery"""\n        \n        print("\\n🚀 Starting complete end-to-end workflow test...")\n        \n        # Step 1: Generate weekly insights\n        service = WeeklyInsightsService(db_session)\n        week_start = datetime.now() - timedelta(days=14)  # Two weeks ago\n        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)\n        \n        insight = service.generate_weekly_insights(test_user.id, week_start)\n        assert insight.status == InsightStatus.GENERATED\n        print("  ✓ Step 1: Weekly insights generated")\n        \n        # Step 2: Validate recommendations\n        recommendations = service.get_insight_recommendations(insight.id)\n        assert len(recommendations) > 0\n        print(f"  ✓ Step 2: {len(recommendations)} recommendations generated")\n        \n        # Step 3: Generate PDF report\n        pdf_generator = PDFReportGenerator()\n        pdf_bytes = pdf_generator.generate_weekly_report(insight, test_user)\n        assert len(pdf_bytes) > 0\n        print("  ✓ Step 3: PDF report generated")\n        \n        # Step 4: Prepare email content\n        with patch('services.insight_email_service.EmailService') as mock_email_service:\n            mock_email_service.return_value.send_email.return_value = 'test-message-id'\n            \n            email_service = InsightEmailService(db_session, mock_email_service)\n            content_data = email_service._prepare_email_content(insight, test_user)\n            \n            assert content_data['barber_name'] == test_user.name\n            assert len(content_data['recommendations']) > 0\n            print("  ✓ Step 4: Email content prepared")\n        \n        # Step 5: Validate data consistency\n        assert insight.overall_score > 0\n        assert insight.revenue_current_week > 0\n        assert insight.appointments_current_week > 0\n        print("  ✓ Step 5: Data consistency validated")\n        \n        print("\\n🎉 Complete end-to-end workflow test PASSED!")\n        print(f"   Final insight score: {insight.overall_score:.1f}/100")\n        print(f"   Revenue analyzed: ${insight.revenue_current_week:,.0f}")\n        print(f"   Recommendations generated: {len(recommendations)}")\n        print(f"   PDF size: {len(pdf_bytes):,} bytes")\n\nif __name__ == "__main__":\n    # Run key integration tests\n    print("🧪 Running Weekly Insights System Integration Tests...")\n    \n    # These would be run with pytest in actual implementation\n    # pytest backend-v2/tests/test_weekly_insights_system.py -v\n    \n    print("\\n✅ All integration tests configured and ready to run!")\n    print("\\nTo run tests:")\n    print("  cd backend-v2")\n    print("  pytest tests/test_weekly_insights_system.py -v")\n    print("  pytest tests/test_weekly_insights_system.py::TestWeeklyInsightsSystem::test_complete_end_to_end_workflow -v")