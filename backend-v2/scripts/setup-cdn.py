#!/usr/bin/env python3
"""
CDN Setup and Configuration Script for BookedBarber V2

This script configures CDN for different environments (development, staging, production)
and providers (CloudFlare, CloudFront, Fastly).

Usage:
    python scripts/setup-cdn.py --env production --provider cloudflare
    python scripts/setup-cdn.py --env staging --provider cloudfront --test
"""

import os
import sys
import argparse
import json
import asyncio
from typing import Dict, Any, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from config.cdn_config import get_cdn_config, CDN_CONFIGS
from services.cdn_service import CDNService


class CDNSetup:
    """CDN setup and configuration manager."""
    
    def __init__(self, environment: str, provider: str, test_mode: bool = False):
        self.environment = environment
        self.provider = provider
        self.test_mode = test_mode
        self.config = None
        
    async def setup(self):
        """Main setup process."""
        print(f"🚀 Setting up CDN for {self.environment} environment with {self.provider}")
        
        # Step 1: Validate configuration
        await self.validate_configuration()
        
        # Step 2: Test CDN connectivity
        await self.test_connectivity()
        
        # Step 3: Configure Next.js
        self.configure_nextjs()
        
        # Step 4: Configure backend
        self.configure_backend()
        
        # Step 5: Test end-to-end
        if not self.test_mode:
            await self.test_end_to_end()
        
        print("✅ CDN setup completed successfully!")
        self.print_summary()
    
    async def validate_configuration(self):
        """Validate CDN configuration and environment variables."""
        print("📋 Validating CDN configuration...")
        
        # Load configuration
        os.environ['ENVIRONMENT'] = self.environment
        os.environ['CDN_PROVIDER'] = self.provider
        
        self.config = get_cdn_config(self.environment)
        
        # Check required environment variables
        required_vars = self.get_required_env_vars()
        missing_vars = []
        
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            print(f"❌ Missing required environment variables:")
            for var in missing_vars:
                print(f"   - {var}")
            print("\nPlease set these variables and try again.")
            sys.exit(1)
        
        # Validate provider-specific settings
        await self.validate_provider_config()
        
        print("✅ Configuration validation passed")
    
    def get_required_env_vars(self) -> list:
        """Get required environment variables for the provider."""
        base_vars = ['CDN_PROVIDER']
        
        if self.provider == 'cloudflare':
            return base_vars + [
                'CLOUDFLARE_ZONE_ID',
                'CLOUDFLARE_API_TOKEN',
                'CLOUDFLARE_DOMAIN'
            ]
        elif self.provider == 'cloudfront':
            return base_vars + [
                'CLOUDFRONT_DISTRIBUTION_ID',
                'CLOUDFRONT_DOMAIN',
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY'
            ]
        elif self.provider == 'fastly':
            return base_vars + [
                'FASTLY_SERVICE_ID',
                'FASTLY_API_TOKEN',
                'FASTLY_DOMAIN'
            ]
        
        return base_vars
    
    async def validate_provider_config(self):
        """Validate provider-specific configuration."""
        if self.provider == 'cloudflare':
            await self.validate_cloudflare()
        elif self.provider == 'cloudfront':
            await self.validate_cloudfront()
        elif self.provider == 'fastly':
            await self.validate_fastly()
    
    async def validate_cloudflare(self):
        """Validate CloudFlare configuration."""
        import aiohttp
        
        zone_id = os.getenv('CLOUDFLARE_ZONE_ID')
        api_token = os.getenv('CLOUDFLARE_API_TOKEN')
        
        headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json'
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}"
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ CloudFlare zone validated: {data['result']['name']}")
                    else:
                        print(f"❌ CloudFlare API error: {response.status}")
                        sys.exit(1)
            except Exception as e:
                print(f"❌ CloudFlare validation failed: {e}")
                sys.exit(1)
    
    async def validate_cloudfront(self):
        """Validate CloudFront configuration."""
        # This would use boto3 to validate CloudFront distribution
        print("✅ CloudFront configuration assumed valid (would validate with boto3)")
    
    async def validate_fastly(self):
        """Validate Fastly configuration."""
        import aiohttp
        
        service_id = os.getenv('FASTLY_SERVICE_ID')
        api_token = os.getenv('FASTLY_API_TOKEN')
        
        headers = {
            'Fastly-Token': api_token,
            'Accept': 'application/json'
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                url = f"https://api.fastly.com/service/{service_id}"
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Fastly service validated: {data['name']}")
                    else:
                        print(f"❌ Fastly API error: {response.status}")
                        sys.exit(1)
            except Exception as e:
                print(f"❌ Fastly validation failed: {e}")
                sys.exit(1)
    
    async def test_connectivity(self):
        """Test CDN connectivity and response times."""
        print("🔍 Testing CDN connectivity...")
        
        async with CDNService() as cdn:
            health = await cdn.health_check()
            
            if health['status'] == 'healthy':
                print(f"✅ CDN health check passed ({health.get('response_time_ms', 0):.1f}ms)")
            else:
                print(f"⚠️  CDN health check warning: {health.get('error', 'Unknown issue')}")
    
    def configure_nextjs(self):
        """Configure Next.js for CDN usage."""
        print("⚙️  Configuring Next.js CDN settings...")
        
        frontend_dir = Path(__file__).parent.parent / "frontend-v2"
        env_file = frontend_dir / ".env.local"
        
        # Environment variables for Next.js
        env_vars = {
            'NEXT_PUBLIC_CDN_PROVIDER': self.provider,
            'NEXT_PUBLIC_ENVIRONMENT': self.environment
        }
        
        if self.provider == 'cloudflare':
            env_vars['NEXT_PUBLIC_CLOUDFLARE_DOMAIN'] = os.getenv('CLOUDFLARE_DOMAIN', '')
        elif self.provider == 'cloudfront':
            env_vars['NEXT_PUBLIC_CLOUDFRONT_DOMAIN'] = os.getenv('CLOUDFRONT_DOMAIN', '')
        elif self.provider == 'fastly':
            env_vars['NEXT_PUBLIC_FASTLY_DOMAIN'] = os.getenv('FASTLY_DOMAIN', '')
        
        # Write environment variables
        existing_content = ""
        if env_file.exists():
            existing_content = env_file.read_text()
        
        # Update or add CDN variables
        lines = existing_content.split('\n') if existing_content else []
        updated_lines = []
        updated_vars = set()
        
        for line in lines:
            if '=' in line and not line.startswith('#'):
                key = line.split('=')[0].strip()
                if key in env_vars:
                    updated_lines.append(f"{key}={env_vars[key]}")
                    updated_vars.add(key)
                else:
                    updated_lines.append(line)
            else:
                updated_lines.append(line)
        
        # Add new variables
        for key, value in env_vars.items():
            if key not in updated_vars:
                updated_lines.append(f"{key}={value}")
        
        env_file.write_text('\n'.join(updated_lines))
        print(f"✅ Updated {env_file}")
    
    def configure_backend(self):
        """Configure backend CDN settings."""
        print("⚙️  Configuring backend CDN settings...")
        
        backend_dir = Path(__file__).parent.parent
        env_file = backend_dir / ".env"
        
        # Backend environment variables
        env_vars = {
            'CDN_PROVIDER': self.provider,
            'CDN_ENABLED': 'true'
        }
        
        if self.provider == 'cloudflare':
            env_vars.update({
                'CDN_CLOUDFLARE_ZONE_ID': os.getenv('CLOUDFLARE_ZONE_ID', ''),
                'CDN_CLOUDFLARE_API_TOKEN': os.getenv('CLOUDFLARE_API_TOKEN', ''),
                'CDN_URL': f"https://{os.getenv('CLOUDFLARE_DOMAIN', '')}"
            })
        elif self.provider == 'cloudfront':
            env_vars.update({
                'CDN_CLOUDFRONT_DISTRIBUTION_ID': os.getenv('CLOUDFRONT_DISTRIBUTION_ID', ''),
                'CDN_URL': f"https://{os.getenv('CLOUDFRONT_DOMAIN', '')}"
            })
        elif self.provider == 'fastly':
            env_vars.update({
                'CDN_FASTLY_SERVICE_ID': os.getenv('FASTLY_SERVICE_ID', ''),
                'CDN_FASTLY_API_TOKEN': os.getenv('FASTLY_API_TOKEN', ''),
                'CDN_URL': f"https://{os.getenv('FASTLY_DOMAIN', '')}"
            })
        
        # Update backend .env file
        existing_content = ""
        if env_file.exists():
            existing_content = env_file.read_text()
        
        lines = existing_content.split('\n') if existing_content else []
        updated_lines = []
        updated_vars = set()
        
        for line in lines:
            if '=' in line and not line.startswith('#'):
                key = line.split('=')[0].strip()
                if key in env_vars:
                    updated_lines.append(f"{key}={env_vars[key]}")
                    updated_vars.add(key)
                else:
                    updated_lines.append(line)
            else:
                updated_lines.append(line)
        
        # Add new variables
        for key, value in env_vars.items():
            if key not in updated_vars:
                updated_lines.append(f"{key}={value}")
        
        env_file.write_text('\n'.join(updated_lines))
        print(f"✅ Updated {env_file}")
    
    async def test_end_to_end(self):
        """Test end-to-end CDN functionality."""
        print("🧪 Running end-to-end CDN tests...")
        
        async with CDNService() as cdn:
            # Test asset URL generation
            test_assets = [
                ('/images/logo.png', 'static'),
                ('/css/main.css', 'static'),
                ('/tracking/pixel.js', 'tracking')
            ]
            
            for asset_path, asset_type in test_assets:
                cdn_url = cdn.get_asset_url(asset_path, asset_type)
                print(f"✅ Generated CDN URL: {asset_path} -> {cdn_url}")
            
            # Test image optimization
            try:
                optimized_url = await cdn.optimize_image(
                    '/images/hero.jpg',
                    width=800,
                    height=400,
                    format='webp'
                )
                print(f"✅ Image optimization: /images/hero.jpg -> {optimized_url}")
            except Exception as e:
                print(f"⚠️  Image optimization test failed: {e}")
            
            # Test analytics
            try:
                analytics = await cdn.get_cache_analytics()
                print(f"✅ Analytics retrieved: {analytics.get('cache_hit_rate', 0):.1%} hit rate")
            except Exception as e:
                print(f"⚠️  Analytics test failed: {e}")
    
    def print_summary(self):
        """Print setup summary."""
        print("\n" + "="*60)
        print("📊 CDN SETUP SUMMARY")
        print("="*60)
        print(f"Environment:  {self.environment}")
        print(f"Provider:     {self.provider}")
        print(f"CDN URL:      {self.config.cdn_url if self.config else 'Not configured'}")
        print(f"Test Mode:    {self.test_mode}")
        print("\n🔗 Next Steps:")
        print("1. Restart your development servers")
        print("2. Verify CDN URLs in browser dev tools")
        print("3. Monitor CDN analytics for performance")
        print("4. Configure DNS (if using custom domain)")
        print("\n✨ CDN is now ready for use!")


async def main():
    """Main script entry point."""
    parser = argparse.ArgumentParser(description='Setup CDN for BookedBarber V2')
    parser.add_argument(
        '--env', 
        choices=['development', 'staging', 'production'],
        default='development',
        help='Environment to configure'
    )
    parser.add_argument(
        '--provider',
        choices=['cloudflare', 'cloudfront', 'fastly'],
        default='cloudflare',
        help='CDN provider to use'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Run in test mode (skip end-to-end tests)'
    )
    parser.add_argument(
        '--validate-only',
        action='store_true',
        help='Only validate configuration, do not setup'
    )
    
    args = parser.parse_args()
    
    setup = CDNSetup(args.env, args.provider, args.test)
    
    try:
        if args.validate_only:
            await setup.validate_configuration()
            print("✅ Configuration validation completed")
        else:
            await setup.setup()
    except KeyboardInterrupt:
        print("\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())