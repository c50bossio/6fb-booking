#!/usr/bin/env python3
"""
Integration Verification Script for BookedBarber V2
Tests all configured integrations and reports their status
"""

import os
import sys
from datetime import datetime
from typing import Dict, List, Tuple
import httpx
from dotenv import load_dotenv
from colorama import init, Fore, Style

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Initialize colorama for colored output
init(autoreset=True)

# Load environment variables
load_dotenv()

class IntegrationVerifier:
    def __init__(self):
        self.results = []
        self.api_keys = self._load_api_keys()
    
    def _load_api_keys(self) -> Dict[str, str]:
        """Load all API keys from environment"""
        return {
            # Google Services
            "GOOGLE_CLIENT_ID": os.getenv("GOOGLE_CLIENT_ID", ""),
            "GOOGLE_CLIENT_SECRET": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            
            # Google Analytics 4
            "GA4_MEASUREMENT_ID": os.getenv("GA4_MEASUREMENT_ID", ""),
            "GA4_API_SECRET": os.getenv("GA4_API_SECRET", ""),
            
            # Google Tag Manager
            "GTM_CONTAINER_ID": os.getenv("GTM_CONTAINER_ID", ""),
            "GTM_SERVER_CONTAINER_URL": os.getenv("GTM_SERVER_CONTAINER_URL", ""),
            
            # Meta Business
            "META_APP_ID": os.getenv("META_APP_ID", ""),
            "META_APP_SECRET": os.getenv("META_APP_SECRET", ""),
            "META_PIXEL_ID": os.getenv("META_PIXEL_ID", ""),
            "META_CONVERSION_API_TOKEN": os.getenv("META_CONVERSION_API_TOKEN", ""),
            
            # Google Ads
            "GOOGLE_ADS_DEVELOPER_TOKEN": os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN", ""),
            "GOOGLE_ADS_CUSTOMER_ID": os.getenv("GOOGLE_ADS_CUSTOMER_ID", ""),
            
            # Stripe
            "STRIPE_SECRET_KEY": os.getenv("STRIPE_SECRET_KEY", ""),
            "STRIPE_PUBLISHABLE_KEY": os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
            "STRIPE_WEBHOOK_SECRET": os.getenv("STRIPE_WEBHOOK_SECRET", ""),
            "STRIPE_CONNECT_CLIENT_ID": os.getenv("STRIPE_CONNECT_CLIENT_ID", ""),
            
            # Communication
            "SENDGRID_API_KEY": os.getenv("SENDGRID_API_KEY", ""),
            "TWILIO_ACCOUNT_SID": os.getenv("TWILIO_ACCOUNT_SID", ""),
            "TWILIO_AUTH_TOKEN": os.getenv("TWILIO_AUTH_TOKEN", ""),
            
            # Monitoring
            "SENTRY_DSN": os.getenv("SENTRY_DSN", ""),
        }
    
    def print_header(self, text: str):
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{text:^60}")
        print(f"{'='*60}{Style.RESET_ALL}\n")
    
    def print_status(self, service: str, status: str, details: str = ""):
        if status == "configured":
            symbol = f"{Fore.GREEN}✓"
            color = Fore.GREEN
        elif status == "missing":
            symbol = f"{Fore.RED}✗"
            color = Fore.RED
        elif status == "partial":
            symbol = f"{Fore.YELLOW}⚠"
            color = Fore.YELLOW
        else:
            symbol = f"{Fore.BLUE}?"
            color = Fore.BLUE
        
        print(f"{symbol} {service:<30} {color}{status:<15}{Style.RESET_ALL} {details}")
    
    def verify_google_oauth(self) -> Tuple[str, str]:
        """Verify Google OAuth configuration"""
        if self.api_keys["GOOGLE_CLIENT_ID"] and self.api_keys["GOOGLE_CLIENT_SECRET"]:
            if "apps.googleusercontent.com" in self.api_keys["GOOGLE_CLIENT_ID"]:
                return "configured", "OAuth credentials configured"
            else:
                return "partial", "Client ID format looks incorrect"
        elif self.api_keys["GOOGLE_CLIENT_ID"] or self.api_keys["GOOGLE_CLIENT_SECRET"]:
            return "partial", "Only one OAuth credential configured"
        else:
            return "missing", "No OAuth credentials configured"
    
    def verify_ga4(self) -> Tuple[str, str]:
        """Verify Google Analytics 4 configuration"""
        if self.api_keys["GA4_MEASUREMENT_ID"] and self.api_keys["GA4_API_SECRET"]:
            if self.api_keys["GA4_MEASUREMENT_ID"].startswith("G-"):
                return "configured", "GA4 fully configured"
            else:
                return "partial", "Measurement ID format incorrect (should start with G-)"
        elif self.api_keys["GA4_MEASUREMENT_ID"] or self.api_keys["GA4_API_SECRET"]:
            return "partial", "Missing GA4 API Secret or Measurement ID"
        else:
            return "missing", "GA4 not configured"
    
    def verify_gtm(self) -> Tuple[str, str]:
        """Verify Google Tag Manager configuration"""
        if self.api_keys["GTM_CONTAINER_ID"]:
            if self.api_keys["GTM_CONTAINER_ID"].startswith("GTM-"):
                return "configured", "GTM container configured"
            else:
                return "partial", "Container ID format incorrect (should start with GTM-)"
        else:
            return "missing", "GTM not configured"
    
    def verify_meta(self) -> Tuple[str, str]:
        """Verify Meta Business configuration"""
        app_configured = bool(self.api_keys["META_APP_ID"] and self.api_keys["META_APP_SECRET"])
        pixel_configured = bool(self.api_keys["META_PIXEL_ID"])
        
        if app_configured and pixel_configured:
            return "configured", "Meta Business fully configured"
        elif app_configured:
            return "partial", "App configured, Pixel ID missing"
        elif pixel_configured:
            return "partial", "Pixel configured, App credentials missing"
        else:
            return "missing", "Meta Business not configured"
    
    def verify_google_ads(self) -> Tuple[str, str]:
        """Verify Google Ads configuration"""
        if self.api_keys["GOOGLE_ADS_DEVELOPER_TOKEN"] and self.api_keys["GOOGLE_ADS_CUSTOMER_ID"]:
            return "configured", "Google Ads API configured"
        elif self.api_keys["GOOGLE_ADS_DEVELOPER_TOKEN"] or self.api_keys["GOOGLE_ADS_CUSTOMER_ID"]:
            return "partial", "Missing Developer Token or Customer ID"
        else:
            return "missing", "Google Ads not configured"
    
    def verify_stripe(self) -> Tuple[str, str]:
        """Verify Stripe configuration"""
        basic_configured = all([
            self.api_keys["STRIPE_SECRET_KEY"],
            self.api_keys["STRIPE_PUBLISHABLE_KEY"],
            self.api_keys["STRIPE_WEBHOOK_SECRET"]
        ])
        
        if basic_configured:
            if self.api_keys["STRIPE_SECRET_KEY"].startswith("sk_live"):
                mode = "LIVE MODE"
            else:
                mode = "TEST MODE"
            
            connect_status = " + Connect" if self.api_keys["STRIPE_CONNECT_CLIENT_ID"] else ""
            return "configured", f"{mode}{connect_status}"
        else:
            return "partial", "Missing some Stripe credentials"
    
    def verify_communications(self) -> Dict[str, Tuple[str, str]]:
        """Verify communication services"""
        results = {}
        
        # SendGrid
        if self.api_keys["SENDGRID_API_KEY"]:
            if self.api_keys["SENDGRID_API_KEY"].startswith("SG."):
                results["SendGrid"] = ("configured", "Email service ready")
            else:
                results["SendGrid"] = ("partial", "API key format incorrect")
        else:
            results["SendGrid"] = ("missing", "No SendGrid API key")
        
        # Twilio
        if self.api_keys["TWILIO_ACCOUNT_SID"] and self.api_keys["TWILIO_AUTH_TOKEN"]:
            results["Twilio"] = ("configured", "SMS service ready")
        elif self.api_keys["TWILIO_ACCOUNT_SID"] or self.api_keys["TWILIO_AUTH_TOKEN"]:
            results["Twilio"] = ("partial", "Missing SID or Auth Token")
        else:
            results["Twilio"] = ("missing", "No Twilio credentials")
        
        return results
    
    def verify_sentry(self) -> Tuple[str, str]:
        """Verify Sentry configuration"""
        if self.api_keys["SENTRY_DSN"]:
            if "ingest.sentry.io" in self.api_keys["SENTRY_DSN"] or "ingest.us.sentry.io" in self.api_keys["SENTRY_DSN"]:
                return "configured", "Error tracking configured"
            else:
                return "partial", "DSN format looks incorrect"
        else:
            return "missing", "Sentry not configured"
    
    def run_verification(self):
        """Run all verification checks"""
        self.print_header("BookedBarber Integration Verification")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Google Services
        print(f"{Fore.BLUE}=== Google Services ==={Style.RESET_ALL}")
        status, details = self.verify_google_oauth()
        self.print_status("Google OAuth", status, details)
        
        status, details = self.verify_ga4()
        self.print_status("Google Analytics 4", status, details)
        
        status, details = self.verify_gtm()
        self.print_status("Google Tag Manager", status, details)
        
        status, details = self.verify_google_ads()
        self.print_status("Google Ads", status, details)
        
        # Meta Business
        print(f"\n{Fore.BLUE}=== Meta Business Platform ==={Style.RESET_ALL}")
        status, details = self.verify_meta()
        self.print_status("Meta Business", status, details)
        
        # Payment Processing
        print(f"\n{Fore.BLUE}=== Payment Processing ==={Style.RESET_ALL}")
        status, details = self.verify_stripe()
        self.print_status("Stripe", status, details)
        
        # Communications
        print(f"\n{Fore.BLUE}=== Communications ==={Style.RESET_ALL}")
        comm_results = self.verify_communications()
        for service, (status, details) in comm_results.items():
            self.print_status(service, status, details)
        
        # Monitoring
        print(f"\n{Fore.BLUE}=== Monitoring ==={Style.RESET_ALL}")
        status, details = self.verify_sentry()
        self.print_status("Sentry", status, details)
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print verification summary"""
        print(f"\n{Fore.CYAN}=== Summary ==={Style.RESET_ALL}")
        
        # Count statuses
        total_services = 0
        configured = 0
        partial = 0
        missing = 0
        
        # Manually count based on checks above
        services = [
            self.verify_google_oauth()[0],
            self.verify_ga4()[0],
            self.verify_gtm()[0],
            self.verify_google_ads()[0],
            self.verify_meta()[0],
            self.verify_stripe()[0],
            self.verify_communications()["SendGrid"][0],
            self.verify_communications()["Twilio"][0],
            self.verify_sentry()[0]
        ]
        
        for status in services:
            total_services += 1
            if status == "configured":
                configured += 1
            elif status == "partial":
                partial += 1
            elif status == "missing":
                missing += 1
        
        print(f"\nTotal integrations: {total_services}")
        print(f"{Fore.GREEN}Configured: {configured}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Partially configured: {partial}{Style.RESET_ALL}")
        print(f"{Fore.RED}Missing: {missing}{Style.RESET_ALL}")
        
        # Next steps
        if missing > 0 or partial > 0:
            print(f"\n{Fore.YELLOW}Next Steps:{Style.RESET_ALL}")
            if "missing" in self.verify_google_oauth()[0]:
                print("1. Add Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)")
            if "missing" in self.verify_ga4()[0]:
                print("2. Set up Google Analytics 4 and add GA4_MEASUREMENT_ID and GA4_API_SECRET")
            if "missing" in self.verify_meta()[0]:
                print("3. Create Meta Business app and add META_APP_ID and META_APP_SECRET")
            if "missing" in self.verify_sentry()[0]:
                print("4. Sign up for Sentry and add SENTRY_DSN")
        else:
            print(f"\n{Fore.GREEN}All integrations are configured! 🎉{Style.RESET_ALL}")

def main():
    verifier = IntegrationVerifier()
    verifier.run_verification()

if __name__ == "__main__":
    main()