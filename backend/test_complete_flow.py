#!/usr/bin/env python3
"""
Complete Automated Payout System Test Suite
Tests the entire flow from compensation plan creation to payout execution
"""

import os
import sys
import json
import time
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import SessionLocal, engine
from models.compensation_plan import CompensationPlan, CommissionCalculation, PaymentHistory
from models.barber import Barber
from models.user import User
from services.stripe_connect_service import StripeConnectService
from services.notification_service import NotificationService
from services.payout_scheduler import payout_scheduler

# Test configuration
TEST_CONFIG = {
    "test_email": "test@example.com",
    "test_barber": {
        "name": "Test Barber",
        "email": "testbarber@example.com",
        "phone": "+1234567890"
    },
    "test_compensation_plan": {
        "plan_name": "Test Automated Payout Plan",
        "compensation_type": "commission_only",
        "commission_structure": {
            "services": {
                "haircut": {"rate": 60, "new_client_bonus": 10},
                "beard_trim": {"rate": 65}
            },
            "products": {"default": 15, "premium": 20}
        },
        "performance_bonuses": {
            "revenue_milestones": [{"target": 1000, "bonus": 100}],
            "new_clients": {"per_client": 25, "monthly_cap": 500}
        },
        "deductions": {
            "processing_fees": {"type": "percentage", "value": 2.9}
        },
        "payout_settings": {
            "enabled": True,
            "method": "stripe_standard",
            "frequency": "weekly",
            "day_of_week": 5,
            "time": "17:00",
            "minimum_payout": 10,  # Low for testing
            "hold_days": 0,  # No hold for testing
            "auto_deduct_fees": True,
            "notification_settings": {
                "send_payout_notification": True,
                "send_summary_report": True
            }
        }
    }
}

class PayoutSystemTester:
    def __init__(self):
        self.db = SessionLocal()
        self.stripe_service = StripeConnectService()
        self.notification_service = NotificationService()
        self.test_results = []
        
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()
    
    def log_test(self, test_name: str, success: bool, message: str = "", details: Dict = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        if details:
            for key, value in details.items():
                print(f"    {key}: {value}")
    
    def test_environment_configuration(self):
        """Test 1: Verify environment configuration"""
        print("\n🔧 Testing Environment Configuration")
        print("=" * 50)
        
        # Test database connection
        try:
            from sqlalchemy import text
            self.db.execute(text("SELECT 1"))
            self.log_test("Database Connection", True, "Successfully connected to database")
        except Exception as e:
            self.log_test("Database Connection", False, f"Failed to connect: {str(e)}")
        
        # Test environment variables
        required_vars = [
            "SECRET_KEY", "STRIPE_SECRET_KEY", "STRIPE_CONNECT_CLIENT_ID"
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            self.log_test("Environment Variables", False, 
                         f"Missing required variables: {', '.join(missing_vars)}")
        else:
            self.log_test("Environment Variables", True, "All required variables configured")
        
        # Test Stripe configuration
        try:
            # This will fail if credentials are invalid
            accounts = self.stripe_service.stripe.Account.list(limit=1)
            self.log_test("Stripe API Connection", True, "Stripe API accessible")
        except Exception as e:
            self.log_test("Stripe API Connection", False, f"Stripe API error: {str(e)}")
    
    def test_email_configuration(self):
        """Test 2: Verify email configuration"""
        print("\n📧 Testing Email Configuration")
        print("=" * 50)
        
        if not self.notification_service.smtp_username:
            self.log_test("Email Configuration", False, "SMTP credentials not configured")
            return
        
        try:
            success = self.notification_service.send_email(
                to_email=TEST_CONFIG["test_email"],
                subject="6FB Test - Automated Payout System",
                message="This is a test email from the 6FB automated payout system test suite."
            )
            
            if success:
                self.log_test("Email Sending", True, f"Test email sent to {TEST_CONFIG['test_email']}")
            else:
                self.log_test("Email Sending", False, "Failed to send test email")
                
        except Exception as e:
            self.log_test("Email Sending", False, f"Email error: {str(e)}")
    
    def test_create_test_barber(self) -> int:
        """Test 3: Create test barber"""
        print("\n👤 Creating Test Barber")
        print("=" * 50)
        
        try:
            # Check if test barber already exists
            existing_barber = self.db.query(Barber).filter(
                Barber.email == TEST_CONFIG["test_barber"]["email"]
            ).first()
            
            if existing_barber:
                self.db.delete(existing_barber)
                self.db.commit()
            
            # Create new test barber
            test_barber = Barber(
                first_name="Test",
                last_name="Barber", 
                email=TEST_CONFIG["test_barber"]["email"],
                phone=TEST_CONFIG["test_barber"]["phone"],
                is_active=True,
                # Note: In production, stripe_account_id would be set after OAuth
                stripe_account_id=None  # Will be simulated for testing
            )
            
            self.db.add(test_barber)
            self.db.commit()
            self.db.refresh(test_barber)
            
            self.log_test("Create Test Barber", True, f"Created barber with ID {test_barber.id}")
            return test_barber.id
            
        except Exception as e:
            self.log_test("Create Test Barber", False, f"Failed to create barber: {str(e)}")
            return None
    
    def test_create_compensation_plan(self, barber_id: int) -> int:
        """Test 4: Create compensation plan with automated payouts"""
        print("\n💰 Creating Compensation Plan")
        print("=" * 50)
        
        try:
            # Remove existing plan if any
            existing_plan = self.db.query(CompensationPlan).filter(
                CompensationPlan.barber_id == barber_id
            ).first()
            
            if existing_plan:
                self.db.delete(existing_plan)
                self.db.commit()
            
            # Create new compensation plan
            from models.compensation_plan import CompensationType
            plan_data = TEST_CONFIG["test_compensation_plan"]
            compensation_plan = CompensationPlan(
                barber_id=barber_id,
                plan_name=plan_data["plan_name"],
                compensation_type=CompensationType.COMMISSION_ONLY,
                commission_structure=plan_data["commission_structure"],
                performance_bonuses=plan_data["performance_bonuses"],
                deductions=plan_data["deductions"],
                payout_settings=plan_data["payout_settings"],
                is_active=True,
                effective_date=datetime.utcnow()
            )
            
            self.db.add(compensation_plan)
            self.db.commit()
            self.db.refresh(compensation_plan)
            
            self.log_test("Create Compensation Plan", True, 
                         f"Created plan with ID {compensation_plan.id}",
                         {
                             "Plan Name": compensation_plan.plan_name,
                             "Payout Enabled": compensation_plan.payout_settings.get("enabled"),
                             "Payout Method": compensation_plan.payout_settings.get("method"),
                             "Payout Frequency": compensation_plan.payout_settings.get("frequency")
                         })
            return compensation_plan.id
            
        except Exception as e:
            self.log_test("Create Compensation Plan", False, f"Failed to create plan: {str(e)}")
            return None
    
    def test_create_test_commissions(self, plan_id: int, barber_id: int):
        """Test 5: Create test commission entries"""
        print("\n💵 Creating Test Commissions")
        print("=" * 50)
        
        try:
            # Create multiple commission entries
            commissions_data = [
                {"service_type": "haircut", "amount": 50.0, "rate": 60},
                {"service_type": "beard_trim", "amount": 30.0, "rate": 65},
                {"service_type": "haircut", "amount": 75.0, "rate": 60},
            ]
            
            created_commissions = []
            total_net = 0
            
            for comm_data in commissions_data:
                commission_amount = comm_data["amount"] * comm_data["rate"] / 100
                deduction = commission_amount * 0.029  # 2.9% processing fee
                net_commission = commission_amount - deduction
                total_net += net_commission
                
                commission = CommissionCalculation(
                    compensation_plan_id=plan_id,
                    barber_id=barber_id,
                    calculation_date=datetime.utcnow(),
                    service_type=comm_data["service_type"],
                    service_amount=comm_data["amount"],
                    commission_rate=comm_data["rate"],
                    commission_amount=commission_amount,
                    bonus_amount=0,
                    deduction_amount=deduction,
                    gross_commission=commission_amount,
                    net_commission=net_commission,
                    is_paid=False
                )
                
                self.db.add(commission)
                created_commissions.append(commission)
            
            self.db.commit()
            
            self.log_test("Create Test Commissions", True,
                         f"Created {len(created_commissions)} commission entries",
                         {
                             "Total Gross Commission": f"${sum(c.gross_commission for c in created_commissions):.2f}",
                             "Total Deductions": f"${sum(c.deduction_amount for c in created_commissions):.2f}",
                             "Total Net Commission": f"${total_net:.2f}"
                         })
            
        except Exception as e:
            self.log_test("Create Test Commissions", False, f"Failed to create commissions: {str(e)}")
    
    def test_payout_scheduler(self, plan_id: int):
        """Test 6: Test payout scheduler functionality"""
        print("\n⏰ Testing Payout Scheduler")
        print("=" * 50)
        
        try:
            # Start scheduler if not running
            if not payout_scheduler.scheduler.running:
                payout_scheduler.start()
            
            # Schedule the specific plan
            plan = self.db.query(CompensationPlan).filter(CompensationPlan.id == plan_id).first()
            if plan:
                payout_scheduler.schedule_payout_for_plan(plan)
                
                # Check if job was scheduled
                jobs = payout_scheduler.scheduler.get_jobs()
                job_found = any(job.id == f"payout_plan_{plan_id}" for job in jobs)
                
                if job_found:
                    self.log_test("Schedule Payout Job", True, f"Payout job scheduled for plan {plan_id}")
                else:
                    self.log_test("Schedule Payout Job", False, "Payout job not found in scheduler")
            else:
                self.log_test("Schedule Payout Job", False, f"Compensation plan {plan_id} not found")
                
        except Exception as e:
            self.log_test("Schedule Payout Job", False, f"Scheduler error: {str(e)}")
    
    def test_manual_payout_trigger(self, plan_id: int):
        """Test 7: Manually trigger payout process"""
        print("\n🚀 Testing Manual Payout Trigger")
        print("=" * 50)
        
        try:
            # Get unpaid commissions before payout
            unpaid_before = self.db.query(CommissionCalculation).filter(
                CommissionCalculation.compensation_plan_id == plan_id,
                CommissionCalculation.is_paid == False
            ).all()
            
            unpaid_count_before = len(unpaid_before)
            total_amount_before = sum(c.net_commission for c in unpaid_before)
            
            # Mock Stripe transfer for testing (since we don't have real connected accounts)
            original_transfer_method = self.stripe_service.transfer_to_barber
            
            def mock_transfer(barber_id, amount, instant=False):
                print(f"    Mock transfer: ${amount:.2f} to barber {barber_id}")
                return True  # Simulate successful transfer
            
            self.stripe_service.transfer_to_barber = mock_transfer
            
            try:
                # Trigger payout
                payout_scheduler.process_payout(plan_id)
                
                # Check results
                unpaid_after = self.db.query(CommissionCalculation).filter(
                    CommissionCalculation.compensation_plan_id == plan_id,
                    CommissionCalculation.is_paid == False
                ).all()
                
                paid_commissions = self.db.query(CommissionCalculation).filter(
                    CommissionCalculation.compensation_plan_id == plan_id,
                    CommissionCalculation.is_paid == True
                ).all()
                
                # Check payment history
                payment_history = self.db.query(PaymentHistory).filter(
                    PaymentHistory.compensation_plan_id == plan_id
                ).order_by(PaymentHistory.created_at.desc()).first()
                
                success = (
                    len(unpaid_after) == 0 and 
                    len(paid_commissions) == unpaid_count_before and
                    payment_history is not None
                )
                
                if success:
                    self.log_test("Manual Payout Trigger", True, "Payout processed successfully",
                                 {
                                     "Commissions Paid": len(paid_commissions),
                                     "Amount Paid": f"${total_amount_before:.2f}",
                                     "Payment History Created": bool(payment_history),
                                     "Payment Method": payment_history.payment_method if payment_history else "N/A"
                                 })
                else:
                    self.log_test("Manual Payout Trigger", False, "Payout processing failed",
                                 {
                                     "Unpaid Before": unpaid_count_before,
                                     "Unpaid After": len(unpaid_after),
                                     "Paid Commissions": len(paid_commissions),
                                     "Payment History": bool(payment_history)
                                 })
                    
            finally:
                # Restore original method
                self.stripe_service.transfer_to_barber = original_transfer_method
                
        except Exception as e:
            self.log_test("Manual Payout Trigger", False, f"Payout trigger error: {str(e)}")
    
    def test_notification_system(self, plan_id: int):
        """Test 8: Test notification system"""
        print("\n📬 Testing Notification System")
        print("=" * 50)
        
        try:
            plan = self.db.query(CompensationPlan).filter(CompensationPlan.id == plan_id).first()
            barber = self.db.query(Barber).filter(Barber.id == plan.barber_id).first()
            
            # Get recent payment history
            payment_history = self.db.query(PaymentHistory).filter(
                PaymentHistory.compensation_plan_id == plan_id
            ).order_by(PaymentHistory.created_at.desc()).first()
            
            if payment_history:
                # Test payout notification
                try:
                    payout_scheduler.send_payout_notification(plan, payment_history.net_amount, payment_history)
                    self.log_test("Payout Notification", True, f"Notification sent to {barber.email}")
                except Exception as e:
                    self.log_test("Payout Notification", False, f"Notification failed: {str(e)}")
            else:
                self.log_test("Payout Notification", False, "No payment history found for notification test")
                
        except Exception as e:
            self.log_test("Notification System", False, f"Notification test error: {str(e)}")
    
    def cleanup_test_data(self, barber_id: int = None):
        """Clean up test data"""
        print("\n🧹 Cleaning Up Test Data")
        print("=" * 50)
        
        try:
            if barber_id:
                # Clean up in correct order due to foreign key constraints
                self.db.query(CommissionCalculation).filter(
                    CommissionCalculation.barber_id == barber_id
                ).delete()
                
                self.db.query(PaymentHistory).filter(
                    PaymentHistory.barber_id == barber_id
                ).delete()
                
                self.db.query(CompensationPlan).filter(
                    CompensationPlan.barber_id == barber_id
                ).delete()
                
                self.db.query(Barber).filter(
                    Barber.id == barber_id
                ).delete()
                
                self.db.commit()
                self.log_test("Cleanup Test Data", True, f"Cleaned up data for barber {barber_id}")
            
        except Exception as e:
            self.log_test("Cleanup Test Data", False, f"Cleanup error: {str(e)}")
            self.db.rollback()
    
    def generate_report(self):
        """Generate test report"""
        print("\n📊 Test Report")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['message']}")
        
        # Save detailed report
        report_file = f"test_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "summary": {
                    "total_tests": total_tests,
                    "passed": passed_tests,
                    "failed": failed_tests,
                    "success_rate": passed_tests/total_tests*100
                },
                "test_results": self.test_results
            }, f, indent=2)
        
        print(f"\nDetailed report saved to: {report_file}")
        
        return failed_tests == 0
    
    def run_complete_test_suite(self):
        """Run the complete test suite"""
        print("🧪 6FB Automated Payout System - Complete Test Suite")
        print("=" * 60)
        print(f"Started at: {datetime.utcnow().isoformat()}")
        
        barber_id = None
        
        try:
            # Run all tests
            self.test_environment_configuration()
            self.test_email_configuration()
            
            barber_id = self.test_create_test_barber()
            if barber_id:
                plan_id = self.test_create_compensation_plan(barber_id)
                if plan_id:
                    self.test_create_test_commissions(plan_id, barber_id)
                    self.test_payout_scheduler(plan_id)
                    self.test_manual_payout_trigger(plan_id)
                    self.test_notification_system(plan_id)
            
        except Exception as e:
            print(f"❌ Test suite error: {str(e)}")
            self.log_test("Test Suite Execution", False, f"Unexpected error: {str(e)}")
        
        finally:
            # Clean up
            if barber_id:
                self.cleanup_test_data(barber_id)
            
            # Generate report
            success = self.generate_report()
            
            print("\n" + "=" * 60)
            if success:
                print("🎉 All tests passed! Your automated payout system is ready for production.")
            else:
                print("⚠️  Some tests failed. Please review the issues before deploying to production.")
            
            return success


def main():
    """Main function"""
    print("6FB Automated Payout System - Test Suite")
    print("This will test the complete payout flow including:")
    print("- Environment configuration")
    print("- Email notifications")
    print("- Database operations")
    print("- Payout scheduling")
    print("- Commission calculations")
    print("- Mock Stripe transfers")
    print("")
    
    response = input("Do you want to continue? (y/n): ")
    if response.lower() != 'y':
        print("Test cancelled.")
        return
    
    tester = PayoutSystemTester()
    success = tester.run_complete_test_suite()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()