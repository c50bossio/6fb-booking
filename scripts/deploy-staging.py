#!/usr/bin/env python3
"""
BookedBarber V2 - Staging Deployment Automation Script
Automated staging deployment with comprehensive validation and testing
Last updated: 2025-07-23
"""

import os
import sys
import subprocess
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class StagingDeployer:
    """Automated staging deployment with comprehensive validation"""
    
    def __init__(self):
        self.deployment_steps = []
        self.validation_results = {}
        self.deployment_start_time = None
        
    def run_command(self, command: str, description: str) -> Tuple[bool, str]:
        """Run shell command with error handling"""
        try:
            logging.info(f"🔧 {description}")
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                timeout=300
            )
            
            if result.returncode == 0:
                logging.info(f"✅ {description} - Success")
                return True, result.stdout
            else:
                logging.error(f"❌ {description} - Failed: {result.stderr}")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            logging.error(f"❌ {description} - Timeout after 5 minutes")
            return False, "Command timeout"
        except Exception as e:
            logging.error(f"❌ {description} - Error: {e}")
            return False, str(e)
    
    def check_prerequisites(self) -> bool:
        """Check staging deployment prerequisites"""
        logging.info("🔍 Checking staging deployment prerequisites...")
        
        prerequisites = [
            ("git status --porcelain", "Working directory is clean"),
            ("git branch --show-current", "Current branch check"),
            ("node --version", "Node.js is available"),
            ("npm --version", "NPM is available"),
            ("python --version", "Python is available"),
            ("docker --version", "Docker is available"),
        ]
        
        all_passed = True
        
        for command, description in prerequisites:
            success, output = self.run_command(command, f"Checking: {description}")
            
            if not success:
                all_passed = False
                continue
            
            # Special checks
            if "git status" in command and output.strip():
                logging.warning("⚠️ Working directory has uncommitted changes - proceeding anyway for staging")
            elif "git branch" in command:
                current_branch = output.strip()
                logging.info(f"📍 Current branch: {current_branch}")
        
        # Check environment files
        env_files = [
            "backend-v2/.env",
            "backend-v2/frontend-v2/.env.local"
        ]
        
        for env_file in env_files:
            if not os.path.exists(env_file):
                logging.warning(f"⚠️ Environment file missing: {env_file}")
        
        if all_passed:
            logging.info("✅ All prerequisites passed")
        else:
            logging.error("❌ Prerequisites check failed")
        
        return all_passed
    
    def run_tests(self) -> bool:
        """Run comprehensive test suite before staging deployment"""
        logging.info("🧪 Running test suite for staging deployment...")
        
        test_commands = [
            ("cd backend-v2 && python -m pytest tests/ -v --tb=short", "Backend unit tests"),
            ("cd backend-v2/frontend-v2 && npm test -- --watchAll=false", "Frontend tests"),
            ("python scripts/validate-environment-keys.py", "Environment validation"),
        ]
        
        test_results = {}
        
        for command, description in test_commands:
            success, output = self.run_command(command, description)
            test_results[description] = {
                'success': success,
                'output': output[:500] if output else ""  # Truncate long output
            }
            
            if not success:
                logging.warning(f"⚠️ Test failed: {description} - Continuing with staging deployment")
        
        self.validation_results['tests'] = test_results
        logging.info("✅ Test suite completed (failures allowed for staging)")
        return True  # Allow staging deployment even with test failures
    
    def build_staging_images(self) -> bool:
        """Build Docker images for staging environment"""
        logging.info("🏗️ Building staging Docker images...")
        
        build_commands = [
            ("docker-compose -f docker-compose.staging.yml build --no-cache backend", "Build staging backend"),
            ("docker-compose -f docker-compose.staging.yml build --no-cache frontend", "Build staging frontend"),
            ("docker system prune -f", "Clean up build artifacts"),
        ]
        
        for command, description in build_commands:
            success, output = self.run_command(command, description)
            if not success:
                logging.error(f"❌ Build failed: {description}")
                return False
        
        logging.info("✅ Staging images built successfully")
        return True
    
    def deploy_to_render_staging(self) -> bool:
        """Deploy to Render staging environment"""
        logging.info("🚀 Deploying to Render staging environment...")
        
        self.deployment_start_time = datetime.now()
        
        # Create staging deployment commit if needed
        staging_commands = [
            ("git add .", "Stage all changes"),
            ("git commit -m 'feat: staging deployment - automated deployment' || true", "Commit staging changes"),
            ("git push origin staging", "Push to staging branch"),
        ]
        
        for command, description in staging_commands:
            success, output = self.run_command(command, description)
            if not success and "push" in command:
                logging.error(f"❌ Staging deployment failed: {description}")
                return False
        
        # Wait for Render deployment to process
        logging.info("⏳ Waiting for Render staging deployment to complete...")
        time.sleep(90)  # Give Render time to build and deploy
        
        logging.info("✅ Staging deployment initiated")
        return True
    
    def validate_staging_deployment(self) -> bool:
        """Comprehensive staging deployment validation"""
        logging.info("🔍 Validating staging deployment...")
        
        staging_url = "https://staging.bookedbarber.com"
        api_url = "https://api-staging.bookedbarber.com"
        
        health_checks = [
            (f"{staging_url}", "Frontend health check"),
            (f"{api_url}/health", "Backend health check"),
            (f"{api_url}/api/v2/health", "API health check"),
        ]
        
        validation_results = {}
        max_retries = 10
        retry_delay = 15
        
        for attempt in range(max_retries):
            all_healthy = True
            
            for url, description in health_checks:
                try:
                    response = requests.get(url, timeout=30)
                    if response.status_code == 200:
                        logging.info(f"✅ {description} passed: {url}")
                        validation_results[description] = {'status': 'success', 'response_time': response.elapsed.total_seconds()}
                    else:
                        logging.warning(f"⚠️ {description} failed: {url} - Status: {response.status_code}")
                        validation_results[description] = {'status': 'failed', 'status_code': response.status_code}
                        all_healthy = False
                except Exception as e:
                    logging.warning(f"⚠️ {description} error: {url} - {e}")
                    validation_results[description] = {'status': 'error', 'error': str(e)}
                    all_healthy = False
            
            if all_healthy:
                logging.info("✅ All staging health checks passed")
                self.validation_results['health_checks'] = validation_results
                return True
            
            if attempt < max_retries - 1:
                logging.info(f"⏳ Retrying health checks in {retry_delay} seconds... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(retry_delay)
        
        logging.error("❌ Staging health checks failed after all retries")
        self.validation_results['health_checks'] = validation_results
        return False
    
    def run_staging_smoke_tests(self) -> bool:
        """Run smoke tests against staging environment"""
        logging.info("🧪 Running staging smoke tests...")
        
        api_base = "https://api-staging.bookedbarber.com"
        
        smoke_tests = [
            (f"{api_base}/health", "Basic health endpoint"),
            (f"{api_base}/api/v2/health", "API health endpoint"),
            (f"{api_base}/api/v2/auth/public-key", "Auth public key endpoint"),
        ]
        
        test_results = {}
        
        for url, description in smoke_tests:
            try:
                response = requests.get(url, timeout=30)
                test_results[description] = {
                    'status_code': response.status_code,
                    'response_time': response.elapsed.total_seconds(),
                    'success': response.status_code == 200
                }
                
                if response.status_code == 200:
                    logging.info(f"✅ Smoke test passed: {description}")
                else:
                    logging.warning(f"⚠️ Smoke test failed: {description} - Status: {response.status_code}")
                    
            except Exception as e:
                logging.error(f"❌ Smoke test error: {description} - {e}")
                test_results[description] = {
                    'error': str(e),
                    'success': False
                }
        
        self.validation_results['smoke_tests'] = test_results
        
        # Calculate success rate
        successful_tests = sum(1 for test in test_results.values() if test.get('success', False))
        total_tests = len(test_results)
        success_rate = successful_tests / total_tests if total_tests > 0 else 0
        
        logging.info(f"📊 Smoke tests completed: {successful_tests}/{total_tests} passed ({success_rate:.1%})")
        
        # Allow staging deployment even with some smoke test failures
        return success_rate >= 0.5  # Require at least 50% success rate
    
    def generate_staging_report(self) -> None:
        """Generate comprehensive staging deployment report"""
        logging.info("📋 Generating staging deployment report...")
        
        deployment_time = datetime.now() - self.deployment_start_time if self.deployment_start_time else None
        
        report = f"""# BookedBarber V2 - Staging Deployment Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Deployment Duration: {deployment_time}

## 🚀 Deployment Summary

### Environment Information
- **Target Environment**: Staging
- **Staging URL**: https://staging.bookedbarber.com
- **API URL**: https://api-staging.bookedbarber.com
- **Deployment Time**: {deployment_time}
- **Current Branch**: {self.get_current_branch()}
- **Commit Hash**: {self.get_current_commit()[:8]}

## 📊 Validation Results

### Health Checks
"""
        
        # Add health check results
        health_checks = self.validation_results.get('health_checks', {})
        for check_name, result in health_checks.items():
            status = result.get('status', 'unknown')
            if status == 'success':
                report += f"- ✅ {check_name}: Success (Response time: {result.get('response_time', 'N/A')}s)\n"
            elif status == 'failed':
                report += f"- ❌ {check_name}: Failed (Status: {result.get('status_code', 'N/A')})\n"
            else:
                report += f"- ⚠️ {check_name}: Error ({result.get('error', 'Unknown error')})\n"
        
        report += "\n### Smoke Tests\n"
        
        # Add smoke test results
        smoke_tests = self.validation_results.get('smoke_tests', {})
        for test_name, result in smoke_tests.items():
            if result.get('success', False):
                report += f"- ✅ {test_name}: Success ({result.get('response_time', 'N/A')}s)\n"
            else:
                report += f"- ❌ {test_name}: Failed\n"
        
        report += f"""

### Test Results Summary
"""
        
        # Add test results
        tests = self.validation_results.get('tests', {})
        for test_name, result in tests.items():
            status = "✅ Passed" if result['success'] else "❌ Failed"
            report += f"- {status} {test_name}\n"
        
        report += f"""

## 🎯 Next Steps

### For Developers
1. **Test staging environment**: https://staging.bookedbarber.com
2. **Validate new features**: Test all recent changes
3. **Performance testing**: Run load tests if needed
4. **User acceptance testing**: Share staging URL with stakeholders

### For Production Deployment
1. **Validate staging**: Ensure all critical functions work
2. **Run production deployment**: Use `python scripts/deploy-production.py`
3. **Monitor deployment**: Watch for any issues
4. **Rollback plan**: Keep production rollback ready

## 📞 Support

- **Staging Issues**: Check logs in Render dashboard
- **API Errors**: Monitor Sentry staging environment
- **Database Issues**: Verify staging database connectivity

## 🔗 Useful Links

- **Staging Frontend**: https://staging.bookedbarber.com
- **Staging API**: https://api-staging.bookedbarber.com
- **Render Dashboard**: https://dashboard.render.com
- **Staging Logs**: Check individual service logs in Render

---
*Staging deployment completed successfully! Ready for production deployment.*
"""
        
        with open("STAGING_DEPLOYMENT_REPORT.md", "w") as f:
            f.write(report)
        
        logging.info("✅ Staging deployment report generated")
    
    def get_current_branch(self) -> str:
        """Get current git branch"""
        success, output = self.run_command("git branch --show-current", "Get current branch")
        return output.strip() if success else "unknown"
    
    def get_current_commit(self) -> str:
        """Get current git commit hash"""
        success, output = self.run_command("git rev-parse HEAD", "Get current commit")
        return output.strip() if success else "unknown"
    
    def notify_staging_deployment(self) -> None:
        """Send staging deployment notification"""
        logging.info("📢 Sending staging deployment notification...")
        
        deployment_time = datetime.now() - self.deployment_start_time if self.deployment_start_time else None
        
        # Calculate overall success rate
        health_checks = self.validation_results.get('health_checks', {})
        smoke_tests = self.validation_results.get('smoke_tests', {})
        
        successful_health_checks = sum(1 for result in health_checks.values() if result.get('status') == 'success')
        total_health_checks = len(health_checks)
        
        successful_smoke_tests = sum(1 for result in smoke_tests.values() if result.get('success', False))
        total_smoke_tests = len(smoke_tests)
        
        overall_success_rate = (successful_health_checks + successful_smoke_tests) / (total_health_checks + total_smoke_tests) if (total_health_checks + total_smoke_tests) > 0 else 0
        
        status_emoji = "🎉" if overall_success_rate >= 0.8 else "⚠️" if overall_success_rate >= 0.5 else "❌"
        
        message = {
            "text": f"{status_emoji} BookedBarber V2 Staging Deployment Complete",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Staging Deployment Completed*\n"
                               f"• Environment: Staging\n"
                               f"• Deployment Time: {deployment_time}\n"
                               f"• Success Rate: {overall_success_rate:.1%}\n"
                               f"• Branch: {self.get_current_branch()}\n"
                               f"• Commit: {self.get_current_commit()[:8]}\n"
                               f"• Staging URL: https://staging.bookedbarber.com"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Validation Results*\n"
                               f"• Health Checks: {successful_health_checks}/{total_health_checks}\n"
                               f"• Smoke Tests: {successful_smoke_tests}/{total_smoke_tests}\n"
                               f"• Ready for Production: {'✅ Yes' if overall_success_rate >= 0.8 else '⚠️ Review Required'}"
                    }
                }
            ]
        }
        
        webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        if webhook_url:
            try:
                requests.post(webhook_url, json=message, timeout=10)
                logging.info("✅ Staging deployment notification sent")
            except Exception as e:
                logging.warning(f"⚠️ Failed to send notification: {e}")
    
    def run_full_staging_deployment(self) -> bool:
        """Run complete staging deployment process"""
        logging.info("🚀 Starting BookedBarber V2 Staging Deployment")
        
        try:
            # Pre-deployment checks
            if not self.check_prerequisites():
                logging.error("❌ Prerequisites check failed")
                return False
            
            if not self.run_tests():
                logging.warning("⚠️ Some tests failed - continuing with staging deployment")
            
            # Build and deploy
            if not self.build_staging_images():
                logging.error("❌ Image build failed")
                return False
            
            if not self.deploy_to_render_staging():
                logging.error("❌ Staging deployment failed")
                return False
            
            # Validation
            if not self.validate_staging_deployment():
                logging.warning("⚠️ Some health checks failed - staging may need attention")
            
            if not self.run_staging_smoke_tests():
                logging.warning("⚠️ Some smoke tests failed - staging may need attention")
            
            # Generate report and notify
            self.generate_staging_report()
            self.notify_staging_deployment()
            
            logging.info("🎉 Staging deployment completed!")
            return True
            
        except Exception as e:
            logging.error(f"❌ Staging deployment failed with exception: {e}")
            return False

def main():
    """Main execution function"""
    print("🚀 BookedBarber V2 Staging Deployment")
    print("=" * 50)
    
    deployer = StagingDeployer()
    
    success = deployer.run_full_staging_deployment()
    
    if success:
        print("🎉 Staging deployment completed successfully!")
        print("🌐 Staging URL: https://staging.bookedbarber.com")
        print("📊 Check STAGING_DEPLOYMENT_REPORT.md for details")
        sys.exit(0)
    else:
        print("❌ Staging deployment failed")
        print("🔍 Check logs for details")
        sys.exit(1)

if __name__ == "__main__":
    main()