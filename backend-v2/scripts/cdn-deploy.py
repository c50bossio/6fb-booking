#!/usr/bin/env python3
"""
CDN Deployment and Cache Management Script

This script handles CDN deployment tasks including:
- Cache purging across multiple CDN providers
- Asset optimization and deployment
- CDN configuration validation
- Performance monitoring

Supports CloudFlare, CloudFront, and Fastly CDNs.
"""

import os
import sys
import json
import time
import hashlib
import requests
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

@dataclass
class CDNConfig:
    provider: str
    domain: str
    credentials: Dict[str, str]
    ttl_settings: Dict[str, int]

class CDNManager:
    """Unified CDN management for multiple providers"""
    
    def __init__(self, config: CDNConfig):
        self.config = config
        self.provider = config.provider.lower()
        
    def purge_cache(self, paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """Purge CDN cache for specified paths or all content"""
        if self.provider == 'cloudflare':
            return self._purge_cloudflare(paths)
        elif self.provider == 'cloudfront':
            return self._purge_cloudfront(paths)
        elif self.provider == 'fastly':
            return self._purge_fastly(paths)
        else:
            raise ValueError(f"Unsupported CDN provider: {self.provider}")
    
    def _purge_cloudflare(self, paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """Purge CloudFlare cache"""
        zone_id = self.config.credentials.get('zone_id')
        api_token = self.config.credentials.get('api_token')
        
        if not zone_id or not api_token:
            raise ValueError("CloudFlare zone_id and api_token required")
        
        url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache"
        
        headers = {
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json',
        }
        
        if paths:
            # Purge specific files
            # CloudFlare requires full URLs
            domain = self.config.domain
            full_urls = [f"https://{domain}{path}" for path in paths]
            data = {'files': full_urls}
        else:
            # Purge everything
            data = {'purge_everything': True}
        
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        if not result.get('success'):
            raise Exception(f"CloudFlare purge failed: {result.get('errors')}")
        
        return {
            'provider': 'cloudflare',
            'success': True,
            'purged_paths': paths or ['*'],
            'result': result
        }
    
    def _purge_cloudfront(self, paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """Purge CloudFront cache"""
        distribution_id = self.config.credentials.get('distribution_id')
        aws_access_key = self.config.credentials.get('aws_access_key_id')
        aws_secret_key = self.config.credentials.get('aws_secret_access_key')
        aws_region = self.config.credentials.get('aws_region', 'us-east-1')
        
        if not distribution_id:
            raise ValueError("CloudFront distribution_id required")
        
        try:
            if aws_access_key and aws_secret_key:
                client = boto3.client(
                    'cloudfront',
                    aws_access_key_id=aws_access_key,
                    aws_secret_access_key=aws_secret_key,
                    region_name=aws_region
                )
            else:
                # Use default credentials (IAM role, environment, etc.)
                client = boto3.client('cloudfront', region_name=aws_region)
            
            invalidation_paths = paths or ['/*']
            
            response = client.create_invalidation(
                DistributionId=distribution_id,
                InvalidationBatch={
                    'Paths': {
                        'Quantity': len(invalidation_paths),
                        'Items': invalidation_paths
                    },
                    'CallerReference': f"cdn-deploy-{int(time.time())}"
                }
            )
            
            return {
                'provider': 'cloudfront',
                'success': True,
                'purged_paths': invalidation_paths,
                'invalidation_id': response['Invalidation']['Id'],
                'result': response
            }
            
        except (ClientError, NoCredentialsError) as e:
            raise Exception(f"CloudFront purge failed: {str(e)}")
    
    def _purge_fastly(self, paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """Purge Fastly cache"""
        api_token = self.config.credentials.get('api_token')
        service_id = self.config.credentials.get('service_id')
        
        if not api_token or not service_id:
            raise ValueError("Fastly api_token and service_id required")
        
        headers = {
            'Fastly-Token': api_token,
            'Accept': 'application/json',
        }
        
        if paths:
            # Purge specific URLs
            results = []
            for path in paths:
                url = f"https://api.fastly.com/purge/{self.config.domain}{path}"
                response = requests.post(url, headers=headers)
                response.raise_for_status()
                results.append(response.json())
            
            return {
                'provider': 'fastly',
                'success': True,
                'purged_paths': paths,
                'results': results
            }
        else:
            # Purge all content for service
            url = f"https://api.fastly.com/service/{service_id}/purge_all"
            response = requests.post(url, headers=headers)
            response.raise_for_status()
            
            return {
                'provider': 'fastly',
                'success': True,
                'purged_paths': ['*'],
                'result': response.json()
            }
    
    def get_cache_status(self, paths: List[str]) -> Dict[str, Any]:
        """Check cache status for given paths"""
        results = {}
        
        for path in paths:
            url = f"https://{self.config.domain}{path}"
            try:
                response = requests.head(url, timeout=10)
                results[path] = {
                    'status_code': response.status_code,
                    'cache_status': response.headers.get('CF-Cache-Status', 
                                   response.headers.get('X-Cache', 'unknown')),
                    'age': response.headers.get('Age'),
                    'expires': response.headers.get('Expires'),
                    'last_modified': response.headers.get('Last-Modified'),
                }
            except requests.RequestException as e:
                results[path] = {'error': str(e)}
        
        return results

def load_cdn_config() -> CDNConfig:
    """Load CDN configuration from environment variables"""
    provider = os.getenv('CDN_PROVIDER', '').lower()
    
    if provider == 'cloudflare':
        credentials = {
            'zone_id': os.getenv('CLOUDFLARE_ZONE_ID', ''),
            'api_token': os.getenv('CLOUDFLARE_API_TOKEN', ''),
        }
        domain = os.getenv('CLOUDFLARE_DOMAIN', '')
    elif provider == 'cloudfront':
        credentials = {
            'distribution_id': os.getenv('CLOUDFRONT_DISTRIBUTION_ID', ''),
            'aws_access_key_id': os.getenv('AWS_ACCESS_KEY_ID', ''),
            'aws_secret_access_key': os.getenv('AWS_SECRET_ACCESS_KEY', ''),
            'aws_region': os.getenv('AWS_REGION', 'us-east-1'),
        }
        domain = os.getenv('CLOUDFRONT_DOMAIN', '')
    elif provider == 'fastly':
        credentials = {
            'api_token': os.getenv('FASTLY_API_TOKEN', ''),
            'service_id': os.getenv('FASTLY_SERVICE_ID', ''),
        }
        domain = os.getenv('FASTLY_DOMAIN', '')
    else:
        raise ValueError(f"Unsupported or missing CDN provider: {provider}")
    
    if not domain:
        raise ValueError(f"CDN domain not configured for provider: {provider}")
    
    ttl_settings = {
        'static': int(os.getenv('CDN_TTL_STATIC', '31536000')),  # 1 year
        'images': int(os.getenv('CDN_TTL_IMAGES', '604800')),    # 1 week
        'dynamic': int(os.getenv('CDN_TTL_DYNAMIC', '300')),     # 5 minutes
    }
    
    return CDNConfig(
        provider=provider,
        domain=domain,
        credentials=credentials,
        ttl_settings=ttl_settings
    )

def find_static_assets(build_dir: Path) -> List[str]:
    """Find all static assets in the Next.js build directory"""
    assets = []
    
    # Next.js static files
    if (build_dir / 'static').exists():
        for file_path in (build_dir / 'static').rglob('*'):
            if file_path.is_file():
                relative_path = file_path.relative_to(build_dir)
                assets.append(f"/_next/{relative_path}")
    
    # Public directory assets
    public_dir = build_dir.parent / 'public'
    if public_dir.exists():
        for file_path in public_dir.rglob('*'):
            if file_path.is_file():
                relative_path = file_path.relative_to(public_dir)
                assets.append(f"/{relative_path}")
    
    return assets

def validate_cdn_config(config: CDNConfig) -> Dict[str, Any]:
    """Validate CDN configuration"""
    errors = []
    warnings = []
    
    # Check required credentials
    if config.provider == 'cloudflare':
        if not config.credentials.get('zone_id'):
            errors.append("CloudFlare zone_id is required")
        if not config.credentials.get('api_token'):
            errors.append("CloudFlare api_token is required")
    elif config.provider == 'cloudfront':
        if not config.credentials.get('distribution_id'):
            errors.append("CloudFront distribution_id is required")
        # AWS credentials are optional (can use IAM roles)
    elif config.provider == 'fastly':
        if not config.credentials.get('api_token'):
            errors.append("Fastly api_token is required")
        if not config.credentials.get('service_id'):
            errors.append("Fastly service_id is required")
    
    # Test domain accessibility
    try:
        response = requests.head(f"https://{config.domain}", timeout=10)
        if response.status_code >= 400:
            warnings.append(f"CDN domain returned {response.status_code}")
    except requests.RequestException as e:
        errors.append(f"CDN domain not accessible: {str(e)}")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'config': asdict(config)
    }

def main():
    parser = argparse.ArgumentParser(description='CDN Deployment and Management')
    parser.add_argument('command', choices=['purge', 'validate', 'status', 'deploy'],
                       help='Command to execute')
    parser.add_argument('--paths', nargs='*', help='Specific paths to purge')
    parser.add_argument('--build-dir', type=str, default='.next',
                       help='Next.js build directory')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without executing')
    
    args = parser.parse_args()
    
    try:
        # Load CDN configuration
        config = load_cdn_config()
        cdn_manager = CDNManager(config)
        
        if args.command == 'validate':
            # Validate CDN configuration
            result = validate_cdn_config(config)
            print(json.dumps(result, indent=2))
            
            if not result['valid']:
                print("\n❌ CDN configuration is invalid!")
                sys.exit(1)
            else:
                print("\n✅ CDN configuration is valid!")
        
        elif args.command == 'purge':
            # Purge CDN cache
            if args.dry_run:
                print(f"Would purge paths: {args.paths or ['*']} from {config.provider}")
                return
            
            print(f"Purging CDN cache for {config.provider}...")
            result = cdn_manager.purge_cache(args.paths)
            print(json.dumps(result, indent=2))
            print("✅ Cache purge completed!")
        
        elif args.command == 'status':
            # Check cache status
            paths = args.paths or ['/']
            print(f"Checking cache status for {len(paths)} paths...")
            
            result = cdn_manager.get_cache_status(paths)
            print(json.dumps(result, indent=2))
        
        elif args.command == 'deploy':
            # Full deployment process
            build_dir = Path(args.build_dir)
            if not build_dir.exists():
                print(f"❌ Build directory not found: {build_dir}")
                sys.exit(1)
            
            # Find static assets
            print("🔍 Finding static assets...")
            assets = find_static_assets(build_dir)
            print(f"Found {len(assets)} static assets")
            
            if args.dry_run:
                print("Dry run - would purge the following assets:")
                for asset in assets[:10]:  # Show first 10
                    print(f"  {asset}")
                if len(assets) > 10:
                    print(f"  ... and {len(assets) - 10} more")
                return
            
            # Purge cache for all assets
            print("🚀 Purging CDN cache...")
            result = cdn_manager.purge_cache(assets)
            
            print(f"✅ Deployment completed!")
            print(f"Purged {len(result.get('purged_paths', []))} paths from {config.provider}")
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()