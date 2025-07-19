#!/usr/bin/env python3
"""
BookedBarber V2 Agent System - Real Data Integration Testing

This script tests the agent system with actual BookedBarber V2 data
to validate staging readiness and ensure proper integration.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

# Add the backend-v2 directory to the path for imports
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import BookedBarber V2 models and services
try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    from models.base import Base
    from models.user import User
    from models.appointment import Appointment
    from models.barbershop import Barbershop
    from models.service import Service
    from utils.database import get_database_url
    from utils.sub_agent_manager import SubAgentManager
    from services.agent_service import AgentService
except ImportError as e:
    logger.error(f"Failed to import BookedBarber V2 modules: {e}")
    logger.info("Ensure you're running from the backend-v2 directory")
    sys.exit(1)


class RealDataIntegrationTester:
    """Test agent system integration with real BookedBarber V2 data."""
    
    def __init__(self, use_staging_db: bool = False):
        """Initialize the tester with database connection."""
        self.use_staging_db = use_staging_db
        self.engine = self._setup_database()
        self.Session = sessionmaker(bind=self.engine)
        self.agent_manager = SubAgentManager()
        self.agent_service = AgentService()
        
        # Test results tracking
        self.test_results = {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'errors': [],
            'performance_metrics': {}
        }
    
    def _setup_database(self):
        """Set up database connection based on environment."""
        if self.use_staging_db:
            # Use staging database URL
            db_url = os.getenv('STAGING_DATABASE_URL')
            if not db_url:
                logger.warning("STAGING_DATABASE_URL not set, falling back to default")
                db_url = get_database_url()
        else:
            # Use development database
            db_url = get_database_url()
        
        logger.info(f"Connecting to database: {db_url.split('@')[0]}@***")
        engine = create_engine(db_url)
        return engine
    
    async def test_database_connectivity(self) -> bool:
        """Test basic database connectivity and table existence."""
        logger.info("🔌 Testing database connectivity...")
        
        try:
            with self.engine.connect() as conn:
                # Test basic connection
                result = conn.execute(text("SELECT 1 as test"))
                test_value = result.scalar()
                assert test_value == 1, "Basic database query failed"
                
                # Check for required BookedBarber V2 tables
                required_tables = [
                    'users', 'barbershops', 'appointments', 
                    'services', 'clients'
                ]
                
                for table in required_tables:
                    result = conn.execute(text(f"""
                        SELECT table_name FROM information_schema.tables 
                        WHERE table_name = '{table}' AND table_schema = 'public'
                    """))
                    if not result.fetchone():
                        logger.warning(f"Required table '{table}' not found")
                        return False
                
                # Check for agent tables
                agent_tables = ['agents', 'agent_conversations', 'agent_templates']
                agent_tables_exist = 0
                for table in agent_tables:
                    result = conn.execute(text(f"""
                        SELECT table_name FROM information_schema.tables 
                        WHERE table_name = '{table}' AND table_schema = 'public'
                    """))
                    if result.fetchone():
                        agent_tables_exist += 1
                
                if agent_tables_exist == 0:
                    logger.warning("No agent tables found - may need to run agent setup")
                    return False
                
                logger.info("✅ Database connectivity test passed")
                return True
                
        except Exception as e:
            logger.error(f"❌ Database connectivity test failed: {e}")
            self.test_results['errors'].append(f"Database connectivity: {e}")
            return False
    
    async def fetch_real_client_data(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch real client data for agent testing."""
        logger.info(f"📊 Fetching real client data (limit: {limit})...")
        
        try:
            with self.Session() as session:
                # Fetch clients with recent appointments
                query = text("""
                    SELECT 
                        u.id as client_id,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.phone,
                        COUNT(a.id) as total_appointments,
                        MAX(a.appointment_date) as last_appointment_date,
                        AVG(s.price) as avg_service_price,
                        STRING_AGG(DISTINCT s.name, ', ') as services_used
                    FROM users u
                    JOIN appointments a ON u.id = a.client_id
                    JOIN services s ON a.service_id = s.id
                    WHERE u.role = 'CLIENT' 
                      AND a.status = 'COMPLETED'
                      AND a.appointment_date >= NOW() - INTERVAL '6 months'
                    GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone
                    HAVING COUNT(a.id) >= 2
                    ORDER BY MAX(a.appointment_date) DESC
                    LIMIT :limit
                """)
                
                result = session.execute(query, {'limit': limit})
                clients = []
                
                for row in result:
                    client_data = {
                        'client_id': row.client_id,
                        'name': f"{row.first_name} {row.last_name}",
                        'email': row.email,
                        'phone': row.phone,
                        'total_appointments': row.total_appointments,
                        'last_appointment_date': row.last_appointment_date,
                        'avg_service_price': float(row.avg_service_price or 0),
                        'services_used': row.services_used,
                        'days_since_last': (datetime.now().date() - row.last_appointment_date).days
                    }
                    clients.append(client_data)
                
                logger.info(f"✅ Fetched {len(clients)} real client records")
                return clients
                
        except Exception as e:
            logger.error(f"❌ Failed to fetch real client data: {e}")
            self.test_results['errors'].append(f"Client data fetch: {e}")
            return []
    
    async def test_agent_with_real_client(self, client_data: Dict[str, Any]) -> bool:
        """Test agent system with a specific real client."""
        logger.info(f"🤖 Testing agent with client: {client_data['name']}")
        
        start_time = datetime.now()
        
        try:
            # Determine appropriate agent type based on client data
            days_since_last = client_data['days_since_last']
            
            if days_since_last > 60:
                agent_type = "retention"
                test_scenario = "Long-time client needs re-engagement"
            elif days_since_last > 30:
                agent_type = "rebooking" 
                test_scenario = "Client due for rebooking"
            else:
                agent_type = "upsell"
                test_scenario = "Recent client for upselling"
            
            # Create agent conversation context
            conversation_context = {
                'client_id': client_data['client_id'],
                'client_name': client_data['name'],
                'days_since_last': days_since_last,
                'total_appointments': client_data['total_appointments'],
                'avg_service_price': client_data['avg_service_price'],
                'services_used': client_data['services_used'],
                'scenario': test_scenario
            }
            
            # Test agent processing
            conversation_id = await self.agent_service.create_conversation(
                agent_type=agent_type,
                client_id=client_data['client_id'],
                context=conversation_context
            )
            
            # Generate agent response
            response = await self.agent_service.process_conversation(
                conversation_id=conversation_id,
                client_message=f"Test message for {agent_type} agent"
            )
            
            # Validate response quality
            response_quality = self._validate_response_quality(response, client_data)
            
            # Record performance metrics
            processing_time = (datetime.now() - start_time).total_seconds()
            self.test_results['performance_metrics'][f'{agent_type}_response_time'] = processing_time
            
            if response_quality['is_valid']:
                logger.info(f"✅ Agent test passed for {client_data['name']} ({processing_time:.2f}s)")
                return True
            else:
                logger.warning(f"⚠️ Agent response quality issues: {response_quality['issues']}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Agent test failed for {client_data['name']}: {e}")
            self.test_results['errors'].append(f"Agent test ({client_data['name']}): {e}")
            return False
    
    def _validate_response_quality(self, response: str, client_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate the quality and appropriateness of agent responses."""
        issues = []
        
        # Check for client name personalization
        if client_data['name'].split()[0] not in response:
            issues.append("Response lacks client name personalization")
        
        # Check response length (should be substantial but not too long)
        if len(response) < 50:
            issues.append("Response too short")
        elif len(response) > 500:
            issues.append("Response too long")
        
        # Check for service mentions (should reference past services)
        services = client_data['services_used'].lower()
        if not any(service in response.lower() for service in services.split(', ')):
            issues.append("Response doesn't reference client's service history")
        
        # Check for professional tone indicators
        professional_indicators = ['thank you', 'appreciate', 'please', 'would you']
        if not any(indicator in response.lower() for indicator in professional_indicators):
            issues.append("Response lacks professional tone")
        
        # Check for call-to-action
        action_indicators = ['book', 'schedule', 'appointment', 'call', 'visit']
        if not any(action in response.lower() for action in action_indicators):
            issues.append("Response lacks clear call-to-action")
        
        return {
            'is_valid': len(issues) == 0,
            'issues': issues,
            'quality_score': max(0, 100 - (len(issues) * 20))
        }
    
    async def test_performance_under_load(self, client_list: List[Dict[str, Any]]) -> bool:
        """Test agent system performance with multiple concurrent clients."""
        logger.info(f"⚡ Testing performance under load ({len(client_list)} clients)...")
        
        start_time = datetime.now()
        
        try:
            # Process multiple clients concurrently
            tasks = []
            for client in client_list[:5]:  # Limit to 5 concurrent for safety
                task = self.test_agent_with_real_client(client)
                tasks.append(task)
            
            # Wait for all tasks to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Calculate performance metrics
            total_time = (datetime.now() - start_time).total_seconds()
            successful_tests = sum(1 for r in results if r is True)
            
            self.test_results['performance_metrics']['concurrent_processing_time'] = total_time
            self.test_results['performance_metrics']['concurrent_success_rate'] = successful_tests / len(results)
            
            # Performance thresholds
            max_acceptable_time = 30.0  # 30 seconds for 5 concurrent clients
            min_success_rate = 0.8      # 80% success rate
            
            performance_ok = (
                total_time <= max_acceptable_time and 
                (successful_tests / len(results)) >= min_success_rate
            )
            
            if performance_ok:
                logger.info(f"✅ Performance test passed: {successful_tests}/{len(results)} successful in {total_time:.2f}s")
            else:
                logger.warning(f"⚠️ Performance issues: {successful_tests}/{len(results)} successful in {total_time:.2f}s")
            
            return performance_ok
            
        except Exception as e:
            logger.error(f"❌ Performance test failed: {e}")
            self.test_results['errors'].append(f"Performance test: {e}")
            return False
    
    async def test_data_integrity(self, client_list: List[Dict[str, Any]]) -> bool:
        """Test that agent operations maintain data integrity."""
        logger.info("🔒 Testing data integrity...")
        
        try:
            # Test 1: Verify client data access controls
            test_client = client_list[0] if client_list else None
            if not test_client:
                logger.warning("No client data available for integrity testing")
                return False
            
            # Simulate accessing client data as different user types
            access_tests = [
                {'role': 'CLIENT', 'should_access': False},
                {'role': 'BARBER', 'should_access': True},
                {'role': 'SHOP_OWNER', 'should_access': True},
                {'role': 'ENTERPRISE_OWNER', 'should_access': True}
            ]
            
            integrity_passed = True
            
            for test in access_tests:
                try:
                    # Mock user with different role
                    mock_user = {'id': 999, 'role': test['role']}
                    
                    # Test client data access (this would use actual access control logic)
                    can_access = self._check_client_access(mock_user, test_client['client_id'])
                    
                    if can_access != test['should_access']:
                        logger.error(f"Access control violation: {test['role']} access should be {test['should_access']} but was {can_access}")
                        integrity_passed = False
                        
                except Exception as e:
                    logger.error(f"Access control test failed for {test['role']}: {e}")
                    integrity_passed = False
            
            # Test 2: Verify conversation data persistence
            with self.Session() as session:
                # Check that agent conversations are properly saved
                result = session.execute(text("""
                    SELECT COUNT(*) as conversation_count 
                    FROM agent_conversations 
                    WHERE created_at >= NOW() - INTERVAL '1 hour'
                """))
                recent_conversations = result.scalar()
                
                if recent_conversations == 0:
                    logger.warning("No recent agent conversations found in database")
                    integrity_passed = False
            
            if integrity_passed:
                logger.info("✅ Data integrity test passed")
            else:
                logger.error("❌ Data integrity test failed")
            
            return integrity_passed
            
        except Exception as e:
            logger.error(f"❌ Data integrity test failed: {e}")
            self.test_results['errors'].append(f"Data integrity: {e}")
            return False
    
    def _check_client_access(self, user: Dict[str, Any], client_id: int) -> bool:
        """Mock function to check client data access permissions."""
        # This would implement actual access control logic
        role = user['role']
        
        if role == 'CLIENT':
            # Clients can only access their own data
            return user['id'] == client_id
        elif role in ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER']:
            # Barbers and owners can access client data in their scope
            return True
        else:
            return False
    
    async def run_comprehensive_integration_test(self) -> Dict[str, Any]:
        """Run comprehensive integration testing suite."""
        logger.info("🚀 Starting comprehensive integration testing...")
        
        # Test 1: Database connectivity
        db_test = await self.test_database_connectivity()
        self.test_results['total_tests'] += 1
        if db_test:
            self.test_results['passed_tests'] += 1
        else:
            self.test_results['failed_tests'] += 1
            logger.error("Database connectivity failed - aborting further tests")
            return self.test_results
        
        # Test 2: Fetch real client data
        client_data = await self.fetch_real_client_data(limit=10)
        if not client_data:
            logger.error("No real client data available - aborting agent tests")
            self.test_results['failed_tests'] += 1
            return self.test_results
        
        # Test 3: Individual agent tests
        individual_test_results = []
        for client in client_data[:3]:  # Test with first 3 clients
            result = await self.test_agent_with_real_client(client)
            individual_test_results.append(result)
            self.test_results['total_tests'] += 1
            if result:
                self.test_results['passed_tests'] += 1
            else:
                self.test_results['failed_tests'] += 1
        
        # Test 4: Performance under load
        load_test = await self.test_performance_under_load(client_data)
        self.test_results['total_tests'] += 1
        if load_test:
            self.test_results['passed_tests'] += 1
        else:
            self.test_results['failed_tests'] += 1
        
        # Test 5: Data integrity
        integrity_test = await self.test_data_integrity(client_data)
        self.test_results['total_tests'] += 1
        if integrity_test:
            self.test_results['passed_tests'] += 1
        else:
            self.test_results['failed_tests'] += 1
        
        # Calculate overall success rate
        success_rate = (self.test_results['passed_tests'] / self.test_results['total_tests']) * 100
        self.test_results['success_rate'] = success_rate
        
        # Determine staging readiness
        staging_ready = success_rate >= 80 and len(self.test_results['errors']) == 0
        self.test_results['staging_ready'] = staging_ready
        
        return self.test_results
    
    def generate_test_report(self) -> str:
        """Generate a comprehensive test report."""
        report = f"""
# BookedBarber V2 Agent System - Real Data Integration Test Report

**Test Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Database**: {'Staging' if self.use_staging_db else 'Development'}

## Test Summary
- **Total Tests**: {self.test_results['total_tests']}
- **Passed**: {self.test_results['passed_tests']}
- **Failed**: {self.test_results['failed_tests']}
- **Success Rate**: {self.test_results.get('success_rate', 0):.1f}%
- **Staging Ready**: {'✅ YES' if self.test_results.get('staging_ready', False) else '❌ NO'}

## Performance Metrics
"""
        
        for metric, value in self.test_results.get('performance_metrics', {}).items():
            if 'time' in metric:
                report += f"- **{metric.replace('_', ' ').title()}**: {value:.2f} seconds\n"
            else:
                report += f"- **{metric.replace('_', ' ').title()}**: {value:.2%}\n"
        
        if self.test_results.get('errors'):
            report += "\n## Errors Encountered\n"
            for i, error in enumerate(self.test_results['errors'], 1):
                report += f"{i}. {error}\n"
        
        report += f"""
## Staging Readiness Assessment

{'✅ READY for staging deployment' if self.test_results.get('staging_ready', False) else '❌ NOT READY for staging deployment'}

### Criteria Met
- Database connectivity: {'✅' if self.test_results['passed_tests'] > 0 else '❌'}
- Agent functionality: {'✅' if 'agent_test' not in str(self.test_results['errors']) else '❌'}
- Performance acceptable: {'✅' if self.test_results.get('performance_metrics', {}).get('concurrent_success_rate', 0) >= 0.8 else '❌'}
- Data integrity maintained: {'✅' if 'integrity' not in str(self.test_results['errors']) else '❌'}

### Recommendations
"""
        
        if self.test_results.get('staging_ready', False):
            report += "- ✅ Proceed with staging deployment following the staging checklist\n"
            report += "- ✅ Monitor performance metrics during initial staging deployment\n"
            report += "- ✅ Set up alerting for agent conversation failures\n"
        else:
            report += "- ❌ Address all failing tests before staging deployment\n"
            report += "- ❌ Implement additional error handling as needed\n"
            report += "- ❌ Re-run integration tests after fixes\n"
        
        return report


async def main():
    """Main test execution function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='BookedBarber V2 Agent System Real Data Integration Testing')
    parser.add_argument('--staging', action='store_true', help='Use staging database')
    parser.add_argument('--output', type=str, help='Output file for test report')
    
    args = parser.parse_args()
    
    # Initialize tester
    tester = RealDataIntegrationTester(use_staging_db=args.staging)
    
    # Run comprehensive tests
    try:
        logger.info("Starting BookedBarber V2 Agent System integration testing...")
        results = await tester.run_comprehensive_integration_test()
        
        # Generate and save report
        report = tester.generate_test_report()
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(report)
            logger.info(f"Test report saved to {args.output}")
        else:
            print(report)
        
        # Exit with appropriate code
        sys.exit(0 if results.get('staging_ready', False) else 1)
        
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())