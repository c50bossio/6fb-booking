#!/usr/bin/env python3
"""
Test Environment-Aware Redis Configuration
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import click
from colorama import init, Fore
from config import settings
from services.redis_service import RedisConnectionManager, cache_service

init(autoreset=True)

@click.command()
def main():
    """Test environment-aware Redis configuration."""
    
    click.echo(f"{Fore.CYAN}🔍 Testing Environment-Aware Redis Configuration")
    click.echo("=" * 50)
    
    # Display current configuration
    click.echo(f"\n{Fore.BLUE}Current Configuration:")
    click.echo(f"Environment: {settings.environment}")
    click.echo(f"Redis URL: {settings.redis_url}")
    click.echo(f"ElastiCache Enabled: {settings.aws_elasticache_enabled}")
    
    # Test connection
    click.echo(f"\n{Fore.BLUE}Testing Redis Connection...")
    
    try:
        # Initialize Redis connection
        redis_manager = RedisConnectionManager()
        
        # Test if Redis is available
        if redis_manager.is_available():
            click.echo(f"{Fore.GREEN}✅ Redis connection successful!")
            
            # Test cache operations
            click.echo(f"\n{Fore.BLUE}Testing Cache Operations...")
            
            # Test SET
            test_key = "test:env:config"
            test_value = {"environment": settings.environment, "test": True}
            
            if cache_service.set(test_key, test_value, ttl=60):
                click.echo(f"{Fore.GREEN}✅ SET operation successful")
            else:
                click.echo(f"{Fore.RED}❌ SET operation failed")
            
            # Test GET
            retrieved = cache_service.get(test_key)
            if retrieved == test_value:
                click.echo(f"{Fore.GREEN}✅ GET operation successful")
                click.echo(f"   Retrieved: {retrieved}")
            else:
                click.echo(f"{Fore.RED}❌ GET operation failed")
            
            # Cleanup
            cache_service.delete(test_key)
            click.echo(f"{Fore.GREEN}✅ Cleanup successful")
            
            # Get cache stats
            stats = cache_service.get_stats()
            if stats.get('available'):
                click.echo(f"\n{Fore.BLUE}Cache Statistics:")
                click.echo(f"Memory Used: {stats.get('used_memory_human', 'N/A')}")
                click.echo(f"Connected Clients: {stats.get('connected_clients', 0)}")
                click.echo(f"Hit Rate: {stats.get('hit_rate', 0)}%")
            
        else:
            click.echo(f"{Fore.RED}❌ Redis is not available")
            
            # Show helpful message based on environment
            if settings.environment == 'development':
                click.echo(f"\n{Fore.YELLOW}Development Mode:")
                click.echo("Make sure local Redis is running:")
                click.echo("  redis-server")
            else:
                click.echo(f"\n{Fore.YELLOW}Production Mode:")
                click.echo("Check ElastiCache cluster status and network connectivity")
    
    except Exception as e:
        click.echo(f"{Fore.RED}❌ Error: {e}")
        
    # Show environment switching instructions
    click.echo(f"\n{Fore.CYAN}Environment Switching:")
    click.echo("To test with different environments:")
    click.echo("1. Development (local Redis):")
    click.echo("   ENVIRONMENT=development python scripts/test_redis_env_config.py")
    click.echo("2. Production (ElastiCache):")
    click.echo("   ENVIRONMENT=production AWS_ELASTICACHE_ENABLED=true python scripts/test_redis_env_config.py")

if __name__ == '__main__':
    main()