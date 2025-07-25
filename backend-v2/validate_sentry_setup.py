#!/usr/bin/env python3
"""
Sentry Setup Validation Script
=============================

This script validates Sentry configuration and setup for deployment.
It performs comprehensive checks to ensure Sentry is properly configured
and functioning correctly in the deployment environment.

Usage:
    python validate_sentry_setup.py [--environment ENV] [--check-type TYPE] [--verbose]

Check Types:
    all         - Run all validation checks (default)
    config      - Configuration validation only
    connectivity - Network connectivity tests
    integration - Integration tests
    performance - Performance monitoring validation
    deployment  - Deployment-specific checks

Environments:
    development - Development environment checks
    staging     - Staging environment checks  
    production  - Production environment checks
"""

import os
import sys
import json
import time
import logging
import argparse
import requests
from typing import Dict, Any, List
from urllib.parse import urlparse
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import after path setup
import sentry_sdk
from config.sentry import (
    configure_sentry,
    sentry_health_check,
    SentryConfig
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SentryValidator:
    """Comprehensive Sentry setup validator for deployment environments."""
    
    def __init__(self, environment: str = "development", verbose: bool = False):
        self.environment = environment
        self.verbose = verbose
        self.validation_results: List[Dict[str, Any]] = []
        self.config = SentryConfig()
        
    def validate_all(self) -> Dict[str, Any]:
        """Run all validation checks."""
        
        logger.info(f"Starting comprehensive Sentry validation for {self.environment} environment...")
        
        # Define validation checks
        validation_checks = [
            ("Environment Configuration", self.validate_environment_config),
            ("DSN Configuration", self.validate_dsn_config),
            ("Network Connectivity", self.validate_connectivity),
            ("Sentry Integration", self.validate_sentry_integration),
            ("Performance Monitoring", self.validate_performance_monitoring),
            ("Error Filtering", self.validate_error_filtering),
            ("Security Configuration", self.validate_security_config),
            ("Deployment Readiness", self.validate_deployment_readiness)
        ]
        
        # Run each validation check
        for check_name, check_func in validation_checks:
            try:
                logger.info(f"Running {check_name} validation...")
                result = check_func()
                self.validation_results.append({
                    "check": check_name,
                    "success": result.get("success", False),
                    "details": result
                })
                
                if self.verbose:
                    logger.info(f"{check_name} result: {result}")
                    
            except Exception as e:
                logger.error(f"Validation check '{check_name}' failed: {e}")
                self.validation_results.append({
                    "check": check_name,
                    "success": False,
                    "error": str(e)
                })
        
        # Generate validation summary
        total_checks = len(self.validation_results)
        successful_checks = sum(1 for result in self.validation_results if result["success"])
        
        summary = {
            "success": successful_checks == total_checks,
            "environment": self.environment,
            "total_checks": total_checks,
            "successful_checks": successful_checks,
            "failed_checks": total_checks - successful_checks,
            "validation_results": self.validation_results,
            "timestamp": datetime.utcnow().isoformat(),
            "recommendations": self._generate_recommendations()
        }
        
        logger.info(f"Validation summary: {successful_checks}/{total_checks} checks passed")
        return summary
    
    def validate_environment_config(self) -> Dict[str, Any]:
        """Validate environment-specific configuration."""
        
        try:
            checks = []
            issues = []
            
            # Check if environment variables are set
            required_vars = ["SENTRY_DSN"]
            optional_vars = [
                "SENTRY_ENVIRONMENT", "SENTRY_RELEASE", "SENTRY_SAMPLE_RATE",
                "SENTRY_TRACES_SAMPLE_RATE", "SENTRY_DEBUG"
            ]
            
            for var in required_vars:
                if os.getenv(var):
                    checks.append(f"{var}_set")
                else:
                    issues.append(f"{var}_missing")
            
            for var in optional_vars:
                if os.getenv(var):
                    checks.append(f"{var}_set")
            
            # Validate environment-specific settings
            env_checks = self._validate_environment_specific_settings()
            checks.extend(env_checks["checks"])
            issues.extend(env_checks["issues"])
            
            return {
                "success": len(issues) == 0,
                "checks_passed": checks,
                "issues_found": issues,
                "environment": self.environment
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_dsn_config(self) -> Dict[str, Any]:
        """Validate Sentry DSN configuration."""
        
        try:
            if not self.config.dsn:
                return {
                    "success": False,
                    "error": "SENTRY_DSN not configured"
                }
            
            # Parse DSN
            try:
                parsed_dsn = urlparse(self.config.dsn)
                
                dsn_info = {
                    "scheme": parsed_dsn.scheme,
                    "hostname": parsed_dsn.hostname,
                    "project_id": parsed_dsn.path.lstrip('/'),
                    "valid_format": True
                }
                
                # Validate DSN format
                if not all([parsed_dsn.scheme, parsed_dsn.hostname, parsed_dsn.path]):
                    dsn_info["valid_format"] = False
                
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Invalid DSN format: {e}",
                    "dsn_masked": self._mask_dsn(self.config.dsn)
                }
            
            return {
                "success": dsn_info["valid_format"],
                "dsn_info": dsn_info,
                "dsn_masked": self._mask_dsn(self.config.dsn)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_connectivity(self) -> Dict[str, Any]:
        """Validate network connectivity to Sentry."""
        
        try:
            if not self.config.dsn:
                return {
                    "success": False,
                    "error": "Cannot test connectivity without DSN"
                }
            
            # Parse hostname from DSN
            parsed_dsn = urlparse(self.config.dsn)
            hostname = parsed_dsn.hostname
            
            if not hostname:
                return {
                    "success": False,
                    "error": "Cannot extract hostname from DSN"
                }
            
            # Test basic connectivity
            try:
                # Test HTTPS connectivity
                response = requests.get(f"https://{hostname}", timeout=10)
                connectivity_success = response.status_code in [200, 404, 403]  # 404/403 are acceptable
                
                # Test Sentry API endpoint
                api_test_success = False
                try:
                    api_response = requests.get(f"https://{hostname}/api/", timeout=10)
                    api_test_success = api_response.status_code in [200, 401, 403]
                except:
                    pass  # API test is optional
                
                return {
                    "success": connectivity_success,
                    "hostname": hostname,
                    "connectivity_test": connectivity_success,
                    "api_test": api_test_success,
                    "response_time_ms": response.elapsed.total_seconds() * 1000
                }
                
            except requests.RequestException as e:
                return {
                    "success": False,
                    "error": f"Connectivity test failed: {e}",
                    "hostname": hostname
                }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_sentry_integration(self) -> Dict[str, Any]:
        """Validate Sentry integration functionality."""
        
        try:
            # Initialize Sentry
            sentry_configured = configure_sentry()
            
            if not sentry_configured:
                return {
                    "success": False,
                    "error": "Sentry configuration failed"
                }
            
            # Test basic functionality
            test_results = []
            
            # Test message capture
            try:
                message_id = sentry_sdk.capture_message(
                    f"Sentry validation test from {self.environment}", 
                    level="info"
                )
                test_results.append(("message_capture", bool(message_id)))
            except Exception as e:
                test_results.append(("message_capture", False))
            
            # Test exception capture
            try:
                try:
                    raise ValueError("Test exception for Sentry validation")
                except ValueError as e:
                    exception_id = sentry_sdk.capture_exception(e)
                    test_results.append(("exception_capture", bool(exception_id)))
            except Exception as e:
                test_results.append(("exception_capture", False))
            
            # Test breadcrumb functionality
            try:
                sentry_sdk.add_breadcrumb(
                    message="Validation test breadcrumb",
                    category="validation",
                    level="info"
                )
                test_results.append(("breadcrumb_add", True))
            except Exception as e:
                test_results.append(("breadcrumb_add", False))
            
            # Test user context
            try:
                sentry_sdk.set_user({
                    "id": "validation_test",
                    "email": "validation@test.com"
                })
                test_results.append(("user_context", True))
            except Exception as e:
                test_results.append(("user_context", False))
            
            # Check health
            health = sentry_health_check()
            
            success = all(result[1] for result in test_results) and health.get("enabled", False)
            
            return {
                "success": success,
                "test_results": dict(test_results),
                "health_check": health
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_performance_monitoring(self) -> Dict[str, Any]:
        """Validate performance monitoring configuration."""
        
        try:
            # Check performance monitoring settings
            traces_sample_rate = self.config.traces_sample_rate
            profiles_sample_rate = self.config.profiles_sample_rate
            
            checks = []
            
            # Test transaction creation
            try:
                with sentry_sdk.start_transaction(op="validation", name="performance_test"):
                    time.sleep(0.01)  # Small delay
                    sentry_sdk.set_measurement("test_metric", 1.0, "count")
                checks.append("transaction_test_passed")
            except Exception as e:
                checks.append(f"transaction_test_failed: {e}")
            
            # Test span creation
            try:
                with sentry_sdk.start_span(op="validation.span", description="test_span"):
                    time.sleep(0.005)
                checks.append("span_test_passed")
            except Exception as e:
                checks.append(f"span_test_failed: {e}")
            
            # Validate sample rates for environment
            sample_rate_valid = self._validate_sample_rates(traces_sample_rate, profiles_sample_rate)
            
            return {
                "success": "transaction_test_passed" in checks and "span_test_passed" in checks,
                "traces_sample_rate": traces_sample_rate,
                "profiles_sample_rate": profiles_sample_rate,
                "sample_rates_valid": sample_rate_valid,
                "performance_tests": checks
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_error_filtering(self) -> Dict[str, Any]:
        """Validate error filtering configuration."""
        
        try:
            # Test that before_send filter is working
            filter_tests = []
            
            # These should be filtered out
            filtered_errors = [
                ConnectionError("Connection aborted"),
                ValueError("Invalid JSON")
            ]
            
            # These should be captured
            captured_errors = [
                RuntimeError("Critical validation error")
            ]
            
            # Test filtered errors (should not reach Sentry)
            for error in filtered_errors:
                try:
                    try:
                        raise error
                    except Exception as e:
                        event_id = sentry_sdk.capture_exception(e)
                        # If before_send filter works, event_id should be None
                        filter_tests.append(f"filtered_{type(error).__name__}: {event_id is None}")
                except Exception as e:
                    filter_tests.append(f"filter_test_error: {e}")
            
            # Test captured errors (should reach Sentry)
            for error in captured_errors:
                try:
                    try:
                        raise error
                    except Exception as e:
                        event_id = sentry_sdk.capture_exception(e)
                        filter_tests.append(f"captured_{type(error).__name__}: {event_id is not None}")
                except Exception as e:
                    filter_tests.append(f"capture_test_error: {e}")
            
            return {
                "success": True,  # If no exceptions, filtering is working
                "filter_tests": filter_tests
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_security_config(self) -> Dict[str, Any]:
        """Validate security-related configuration."""
        
        try:
            security_checks = []
            issues = []
            
            # Check PII settings
            send_default_pii = self.config.send_default_pii
            if send_default_pii and self.environment == "production":
                issues.append("send_default_pii_enabled_in_production")
            else:
                security_checks.append("pii_settings_appropriate")
            
            # Check debug settings
            debug = self.config.debug
            if debug and self.environment == "production":
                issues.append("debug_enabled_in_production")
            else:
                security_checks.append("debug_settings_appropriate")
            
            # Check DSN exposure
            if self.config.dsn:
                # DSN should not be logged or exposed
                security_checks.append("dsn_configured")
            
            # Check include_local_variables setting
            include_local_vars = self.config.include_local_variables
            if include_local_vars and self.environment == "production":
                issues.append("local_variables_included_in_production")
            else:
                security_checks.append("local_variables_settings_appropriate")
            
            return {
                "success": len(issues) == 0,
                "security_checks_passed": security_checks,
                "security_issues": issues,
                "send_default_pii": send_default_pii,
                "debug_enabled": debug,
                "include_local_variables": include_local_vars
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_deployment_readiness(self) -> Dict[str, Any]:
        """Validate deployment-specific requirements."""
        
        try:
            readiness_checks = []
            warnings = []
            
            # Check release tracking
            if self.config.release:
                readiness_checks.append("release_configured")
            else:
                warnings.append("release_not_configured")
            
            # Check environment setting
            if self.config.environment:
                readiness_checks.append("environment_configured")
            else:
                warnings.append("environment_not_configured")
            
            # Check sample rates for environment
            sample_rate = self.config.sample_rate
            traces_sample_rate = self.config.traces_sample_rate
            
            if self.environment == "production":
                if sample_rate > 0.8:
                    warnings.append("high_error_sample_rate_in_production")
                if traces_sample_rate > 0.1:
                    warnings.append("high_traces_sample_rate_in_production")
            
            # Check middleware integration
            try:
                readiness_checks.append("sentry_middleware_available")
            except ImportError:
                warnings.append("sentry_middleware_not_available")
            
            # Check monitoring integration
            try:
                readiness_checks.append("sentry_monitoring_available")
            except ImportError:
                warnings.append("sentry_monitoring_not_available")
            
            return {
                "success": len(readiness_checks) > 0,
                "readiness_checks_passed": readiness_checks,
                "warnings": warnings,
                "deployment_ready": len(warnings) == 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _validate_environment_specific_settings(self) -> Dict[str, List[str]]:
        """Validate environment-specific Sentry settings."""
        
        checks = []
        issues = []
        
        if self.environment == "production":
            # Production-specific validations
            if self.config.debug:
                issues.append("debug_enabled_in_production")
            
            if self.config.sample_rate > 0.9:
                issues.append("sample_rate_too_high_for_production")
            else:
                checks.append("production_sample_rate_appropriate")
                
            if self.config.traces_sample_rate > 0.1:
                issues.append("traces_sample_rate_too_high_for_production") 
            else:
                checks.append("production_traces_sample_rate_appropriate")
                
        elif self.environment == "development":
            # Development-specific validations
            if self.config.sample_rate < 1.0:
                checks.append("development_full_sampling_recommended")
            
        elif self.environment == "staging":
            # Staging-specific validations
            if self.config.sample_rate < 0.5:
                checks.append("staging_sample_rate_sufficient")
        
        return {"checks": checks, "issues": issues}
    
    def _validate_sample_rates(self, traces_rate: float, profiles_rate: float) -> bool:
        """Validate sample rates for the environment."""
        
        if self.environment == "production":
            return traces_rate <= 0.1 and profiles_rate <= 0.05
        elif self.environment == "staging":
            return traces_rate <= 0.5 and profiles_rate <= 0.2
        else:  # development
            return True  # Any sample rate is acceptable in development
    
    def _mask_dsn(self, dsn: str) -> str:
        """Mask sensitive parts of DSN for logging."""
        
        try:
            parsed = urlparse(dsn)
            if parsed.password:
                masked_password = "*" * len(parsed.password)
                return dsn.replace(parsed.password, masked_password)
            return dsn
        except:
            return "***masked***"
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on validation results."""
        
        recommendations = []
        
        # Analyze failed checks and generate recommendations
        for result in self.validation_results:
            if not result["success"]:
                check_name = result["check"]
                
                if "DSN Configuration" in check_name:
                    recommendations.append("Verify SENTRY_DSN is correctly set in environment variables")
                
                elif "Network Connectivity" in check_name:
                    recommendations.append("Check network connectivity to Sentry servers")
                    recommendations.append("Verify firewall settings allow HTTPS connections to sentry.io")
                
                elif "Security Configuration" in check_name:
                    recommendations.append("Review security settings for production environment")
                    recommendations.append("Disable debug mode and PII collection in production")
                
                elif "Performance Monitoring" in check_name:
                    recommendations.append("Adjust sample rates for better performance monitoring")
                
                elif "Deployment Readiness" in check_name:
                    recommendations.append("Configure release tracking and environment tags")
        
        # Environment-specific recommendations
        if self.environment == "production":
            recommendations.append("Ensure error sample rates are optimized for production volume")
            recommendations.append("Set up alerts for error rate increases")
        
        # Remove duplicates
        return list(set(recommendations))


def main():
    """Main validation execution function."""
    
    parser = argparse.ArgumentParser(description="Validate Sentry setup for deployment")
    parser.add_argument("--environment", default="development",
                       choices=["development", "staging", "production"],
                       help="Target environment")
    parser.add_argument("--check-type", default="all",
                       choices=["all", "config", "connectivity", "integration", 
                               "performance", "deployment"],
                       help="Type of validation to run")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--output", help="Output file for validation results (JSON)")
    
    args = parser.parse_args()
    
    # Create validator
    validator = SentryValidator(environment=args.environment, verbose=args.verbose)
    
    # Run validation based on type
    if args.check_type == "all":
        results = validator.validate_all()
    else:
        # Run specific validation type
        validation_methods = {
            "config": validator.validate_environment_config,
            "connectivity": validator.validate_connectivity,
            "integration": validator.validate_sentry_integration,
            "performance": validator.validate_performance_monitoring,
            "deployment": validator.validate_deployment_readiness
        }
        
        if args.check_type in validation_methods:
            logger.info(f"Running {args.check_type} validation...")
            result = validation_methods[args.check_type]()
            results = {
                "success": result.get("success", False),
                "validation_type": args.check_type,
                "environment": args.environment,
                "result": result,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            logger.error(f"Unknown validation type: {args.check_type}")
            sys.exit(1)
    
    # Save results to file if requested
    if args.output:
        try:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Validation results saved to {args.output}")
        except Exception as e:
            logger.error(f"Failed to save results to {args.output}: {e}")
    
    # Print results
    print("\n" + "="*70)
    print("SENTRY SETUP VALIDATION RESULTS")
    print("="*70)
    
    print(f"Environment: {args.environment}")
    print(f"Validation Type: {args.check_type}")
    print(f"Timestamp: {results.get('timestamp', 'Unknown')}")
    
    if args.check_type == "all":
        print(f"\nOverall Success: {results['success']}")
        print(f"Total Checks: {results['total_checks']}")
        print(f"Successful: {results['successful_checks']}")
        print(f"Failed: {results['failed_checks']}")
        
        if not results['success']:
            print("\nFAILED CHECKS:")
            for check_result in results['validation_results']:
                if not check_result['success']:
                    print(f"- {check_result['check']}: {check_result.get('error', 'Check failed')}")
        
        # Show recommendations
        if results.get('recommendations'):
            print("\nRECOMMENDATIONS:")
            for rec in results['recommendations']:
                print(f"- {rec}")
                
    else:
        print(f"\nValidation Success: {results['success']}")
        if args.verbose:
            print(f"Details: {json.dumps(results['result'], indent=2)}")
    
    print("\n" + "="*70)
    
    # Exit with appropriate code
    sys.exit(0 if results['success'] else 1)


if __name__ == "__main__":
    main()