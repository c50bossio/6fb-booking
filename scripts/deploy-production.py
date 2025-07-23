#!/usr/bin/env python3
"""
BookedBarber V2 - Production Deployment Automation Script
Comprehensive production deployment with safety checks and rollback capabilities
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

class ProductionDeployer:
    """Comprehensive production deployment automation"""
    
    def __init__(self):
        self.deployment_steps = []
        self.rollback_steps = []
        self.deployment_start_time = None
        self.pre_deployment_state = {}
        
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
        """Check all deployment prerequisites"""
        logging.info("🔍 Checking deployment prerequisites...")
        
        prerequisites = [
            ("git status --porcelain", "Working directory is clean"),
            ("git branch --show-current", "On production branch"),
            ("docker --version", "Docker is available"),
            ("python --version", "Python is available"),
            ("node --version", "Node.js is available"),
        ]
        
        all_passed = True
        
        for command, description in prerequisites:
            success, output = self.run_command(command, f"Checking: {description}")
            
            if not success:
                all_passed = False
                continue
            
            # Special checks
            if "git status" in command and output.strip():
                logging.error("❌ Working directory has uncommitted changes")
                all_passed = False
            elif "git branch" in command and "production" not in output:
                logging.warning("⚠️ Not on production branch - this may be intentional")
        
        # Check environment variables
        required_env_vars = [
            "DATABASE_URL",
            "REDIS_URL", 
            "STRIPE_SECRET_KEY",
            "JWT_SECRET_KEY"
        ]
        
        for env_var in required_env_vars:
            if not os.getenv(env_var):
                logging.error(f"❌ Missing required environment variable: {env_var}")
                all_passed = False
        
        if all_passed:
            logging.info("✅ All prerequisites passed")
        else:
            logging.error("❌ Prerequisites check failed")
        
        return all_passed
    
    def backup_current_state(self) -> bool:
        """Create backup of current production state"""
        logging.info("💾 Creating production state backup...")
        
        backup_timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f"backups/production_backup_{backup_timestamp}"
        
        backup_commands = [
            (f"mkdir -p {backup_dir}", "Create backup directory"),
            (f"git stash push -m 'Pre-production-deploy-{backup_timestamp}'", "Stash current changes"),
            (f"git tag backup-{backup_timestamp}", "Tag current commit"),
            (f"cp -r backend-v2 {backup_dir}/", "Backup backend code"),
            (f"cp docker-compose.prod.yml {backup_dir}/", "Backup Docker config"),
            (f"cp render.production.yaml {backup_dir}/", "Backup Render config"),
        ]
        
        for command, description in backup_commands:
            success, output = self.run_command(command, description)
            if not success:
                logging.error(f"❌ Backup failed: {description}")
                return False
        
        # Store backup info for rollback
        self.pre_deployment_state = {
            'backup_dir': backup_dir,
            'timestamp': backup_timestamp,
            'git_commit': self.get_current_commit()
        }
        
        logging.info(f"✅ Backup created: {backup_dir}")
        return True
    
    def get_current_commit(self) -> str:
        """Get current git commit hash"""
        success, output = self.run_command("git rev-parse HEAD", "Get current commit")
        return output.strip() if success else "unknown"
    
    def run_tests(self) -> bool:
        """Run comprehensive test suite before deployment"""
        logging.info("🧪 Running comprehensive test suite...")
        
        test_commands = [
            ("cd backend-v2 && python -m pytest tests/ -v", "Backend unit tests"),
            ("cd backend-v2/frontend-v2 && npm test -- --watchAll=false", "Frontend tests"),
            ("cd backend-v2 && python -m pytest tests/integration/ -v", "Integration tests"),
            ("python scripts/validate-environment-keys.py", "Environment validation"),
        ]
        
        for command, description in test_commands:
            success, output = self.run_command(command, description)
            if not success:
                logging.error(f"❌ Test failed: {description}")
                logging.error(f"Test output: {output}")
                return False
        
        logging.info("✅ All tests passed")
        return True
    
    def build_production_images(self) -> bool:
        """Build optimized production Docker images"""
        logging.info("🏗️ Building production Docker images...")
        
        build_commands = [
            ("docker-compose -f docker-compose.prod.yml build --no-cache backend", "Build backend image"),
            ("docker-compose -f docker-compose.prod.yml build --no-cache frontend", "Build frontend image"),
            ("docker system prune -f", "Clean up build artifacts"),
        ]
        
        for command, description in build_commands:
            success, output = self.run_command(command, description)
            if not success:
                logging.error(f"❌ Build failed: {description}")
                return False
        
        logging.info("✅ Production images built successfully")
        return True
    
    def deploy_to_staging_first(self) -> bool:
        """Deploy to staging environment for final validation"""
        logging.info("🚀 Deploying to staging for final validation...")
        
        staging_commands = [
            ("git checkout staging", "Switch to staging branch"),
            ("git merge production --no-edit", "Merge production changes"),
            ("git push origin staging", "Push to staging"),
        ]
        
        for command, description in staging_commands:
            success, output = self.run_command(command, description)
            if not success:
                logging.error(f"❌ Staging deployment failed: {description}")
                return False
        
        # Wait for staging deployment to complete
        logging.info("⏳ Waiting for staging deployment to complete...")
        time.sleep(60)
        
        # Validate staging deployment
        if not self.validate_staging_deployment():
            return False
        
        # Switch back to production branch
        success, _ = self.run_command("git checkout production", "Return to production branch")
        if not success:
            return False
        
        logging.info("✅ Staging validation completed")
        return True
    
    def validate_staging_deployment(self) -> bool:
        """Validate staging deployment health"""
        logging.info("🔍 Validating staging deployment...")
        
        staging_url = "https://staging.bookedbarber.com"
        health_checks = [
            f"{staging_url}/health",
            f"{staging_url}/api/v2/health",
        ]
        
        for url in health_checks:
            try:
                response = requests.get(url, timeout=30)
                if response.status_code == 200:
                    logging.info(f"✅ Health check passed: {url}")
                else:
                    logging.error(f"❌ Health check failed: {url} - Status: {response.status_code}")
                    return False
            except Exception as e:
                logging.error(f"❌ Health check error: {url} - {e}")
                return False
        
        return True
    
    def deploy_to_production(self) -> bool:
        """Deploy to production environment"""
        logging.info("🚀 Deploying to production...")
        
        self.deployment_start_time = datetime.now()
        
        deployment_commands = [
            ("docker-compose -f docker-compose.prod.yml down", "Stop current production services"),
            ("docker-compose -f docker-compose.prod.yml up -d", "Start new production services"),
        ]
        
        for command, description in deployment_commands:
            success, output = self.run_command(command, description)
            if not success:
                logging.error(f"❌ Production deployment failed: {description}")
                return False
        
        # Wait for services to start
        logging.info("⏳ Waiting for services to start...")
        time.sleep(30)
        
        logging.info("✅ Production deployment initiated")
        return True
    
    def validate_production_deployment(self) -> bool:
        """Validate production deployment health"""
        logging.info("🔍 Validating production deployment...")
        
        production_url = "https://bookedbarber.com"
        health_checks = [
            f"{production_url}/health",
            f"{production_url}/api/v2/health",
        ]
        
        max_retries = 10
        retry_delay = 30
        
        for attempt in range(max_retries):
            all_healthy = True
            
            for url in health_checks:
                try:
                    response = requests.get(url, timeout=30)
                    if response.status_code == 200:
                        logging.info(f"✅ Health check passed: {url}")
                    else:
                        logging.warning(f"⚠️ Health check failed: {url} - Status: {response.status_code}")
                        all_healthy = False
                except Exception as e:
                    logging.warning(f"⚠️ Health check error: {url} - {e}")
                    all_healthy = False
            
            if all_healthy:
                logging.info("✅ All production health checks passed")
                return True
            
            if attempt < max_retries - 1:
                logging.info(f"⏳ Retrying health checks in {retry_delay} seconds... (Attempt {attempt + 1}/{max_retries})")
                time.sleep(retry_delay)
        
        logging.error("❌ Production health checks failed after all retries")
        return False
    
    def run_post_deployment_tests(self) -> bool:
        """Run post-deployment validation tests"""
        logging.info("🧪 Running post-deployment validation tests...")
        
        # Basic API tests
        api_tests = [
            ("curl -f https://bookedbarber.com/health", "Main health endpoint"),
            ("curl -f https://bookedbarber.com/api/v2/health", "API health endpoint"),
        ]
        
        for command, description in api_tests:
            success, output = self.run_command(command, description)
            if not success:
                logging.error(f"❌ Post-deployment test failed: {description}")
                return False
        
        logging.info("✅ Post-deployment tests passed")
        return True
    
    def notify_deployment_success(self) -> None:
        """Send deployment success notification"""
        logging.info("📢 Sending deployment success notification...")
        
        deployment_time = datetime.now() - self.deployment_start_time if self.deployment_start_time else None
        
        message = {
            "text": "🎉 BookedBarber V2 Production Deployment Successful!",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Production Deployment Completed*\n"
                               f"• Deployment Time: {deployment_time}\n"
                               f"• Commit: {self.get_current_commit()[:8]}\n"
                               f"• Status: ✅ All systems operational\n"
                               f"• URL: https://bookedbarber.com"
                    }
                }
            ]
        }
        
        webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        if webhook_url:
            try:
                requests.post(webhook_url, json=message, timeout=10)
                logging.info("✅ Deployment notification sent")
            except Exception as e:
                logging.warning(f"⚠️ Failed to send notification: {e}")
    
    def rollback_deployment(self) -> bool:
        """Rollback to previous production state"""
        logging.error("🔄 Initiating deployment rollback...")
        
        if not self.pre_deployment_state:
            logging.error("❌ No backup state available for rollback")
            return False
        
        rollback_commands = [
            (f"git reset --hard {self.pre_deployment_state['git_commit']}", "Reset to previous commit"),
            ("docker-compose -f docker-compose.prod.yml down", "Stop current services"),
            (f"cp -r {self.pre_deployment_state['backup_dir']}/backend-v2 .", "Restore backend code"),
            (f"cp {self.pre_deployment_state['backup_dir']}/docker-compose.prod.yml .", "Restore Docker config"),
            ("docker-compose -f docker-compose.prod.yml up -d", "Start rolled back services"),
        ]
        
        for command, description in rollback_commands:
            success, output = self.run_command(command, description)
            if not success:
                logging.error(f"❌ Rollback step failed: {description}")
                # Continue with remaining rollback steps
        
        # Wait for rollback services to start
        time.sleep(30)
        
        # Validate rollback
        if self.validate_production_deployment():
            logging.info("✅ Rollback completed successfully")
            self.notify_rollback()
            return True
        else:
            logging.error("❌ Rollback validation failed")
            return False
    
    def notify_rollback(self) -> None:
        """Send rollback notification"""
        message = {
            "text": "🔄 BookedBarber V2 Production Rollback Completed",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Production Rollback Completed*\n"
                               f"• Rolled back to: {self.pre_deployment_state['timestamp']}\n"
                               f"• Previous commit: {self.pre_deployment_state['git_commit'][:8]}\n"
                               f"• Status: ✅ Systems restored"
                    }
                }
            ]
        }
        
        webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        if webhook_url:
            try:
                requests.post(webhook_url, json=message, timeout=10)
            except Exception as e:
                logging.warning(f"⚠️ Failed to send rollback notification: {e}")
    
    def cleanup_deployment_artifacts(self) -> None:
        """Clean up deployment artifacts"""
        logging.info("🧹 Cleaning up deployment artifacts...")
        
        cleanup_commands = [
            ("docker system prune -f", "Clean Docker artifacts"),
            ("docker volume prune -f", "Clean unused volumes"),
        ]
        
        for command, description in cleanup_commands:
            self.run_command(command, description)
    
    def run_full_deployment(self) -> bool:
        """Run complete production deployment process"""
        logging.info("🚀 Starting BookedBarber V2 Production Deployment")
        
        try:
            # Pre-deployment checks
            if not self.check_prerequisites():
                logging.error("❌ Prerequisites check failed")
                return False
            
            if not self.backup_current_state():
                logging.error("❌ Backup failed")
                return False
            
            if not self.run_tests():
                logging.error("❌ Tests failed")
                return False
            
            if not self.build_production_images():
                logging.error("❌ Image build failed")
                return False
            
            if not self.deploy_to_staging_first():
                logging.error("❌ Staging deployment failed")
                return False
            
            # Production deployment
            if not self.deploy_to_production():
                logging.error("❌ Production deployment failed")
                if not self.rollback_deployment():
                    logging.error("❌ Rollback also failed - manual intervention required")
                return False
            
            if not self.validate_production_deployment():
                logging.error("❌ Production validation failed")
                if not self.rollback_deployment():
                    logging.error("❌ Rollback also failed - manual intervention required")
                return False
            
            if not self.run_post_deployment_tests():
                logging.error("❌ Post-deployment tests failed")
                if not self.rollback_deployment():
                    logging.error("❌ Rollback also failed - manual intervention required")
                return False
            
            # Success
            self.notify_deployment_success()
            self.cleanup_deployment_artifacts()
            
            logging.info("🎉 Production deployment completed successfully!")
            return True
            
        except Exception as e:
            logging.error(f"❌ Deployment failed with exception: {e}")
            if not self.rollback_deployment():
                logging.error("❌ Rollback also failed - manual intervention required")
            return False

def main():
    """Main execution function"""
    print("🚀 BookedBarber V2 Production Deployment")
    print("=" * 50)
    
    # Confirm deployment
    confirm = input("Are you sure you want to deploy to production? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ Deployment cancelled")
        sys.exit(0)
    
    deployer = ProductionDeployer()
    
    success = deployer.run_full_deployment()
    
    if success:
        print("🎉 Production deployment completed successfully!")
        print("📊 Monitor the deployment at: https://bookedbarber.com")
        sys.exit(0)
    else:
        print("❌ Production deployment failed")
        print("🔄 Check logs and rollback status above")
        sys.exit(1)

if __name__ == "__main__":
    main()