#!/usr/bin/env python3
"""
Test ElastiCache Connection
"""

import redis
import click
import time
from colorama import init, Fore
from dotenv import load_dotenv
import os

init(autoreset=True)

@click.command()
def main():
    """Test connection to ElastiCache cluster."""
    
    # Load environment variables
    load_dotenv()
    
    redis_url = os.getenv('REDIS_URL')
    
    if not redis_url:
        click.echo(f"{Fore.RED}❌ REDIS_URL not found in environment variables")
        return
    
    click.echo(f"{Fore.CYAN}🔍 Testing ElastiCache Connection")
    click.echo("=" * 50)
    click.echo(f"Redis URL: {redis_url}")
    
    try:
        # Parse URL
        if redis_url.startswith('redis://'):
            host = redis_url.split('//')[1].split(':')[0]
            port = int(redis_url.split(':')[-1].split('/')[0])
        else:
            click.echo(f"{Fore.RED}❌ Invalid Redis URL format")
            return
        
        click.echo(f"Host: {host}")
        click.echo(f"Port: {port}")
        
        # Test connection
        click.echo(f"\n{Fore.BLUE}Testing connection...")
        
        # Create connection
        r = redis.Redis(
            host=host,
            port=port,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )
        
        # Test PING
        start_time = time.time()
        response = r.ping()
        latency = (time.time() - start_time) * 1000
        
        if response:
            click.echo(f"{Fore.GREEN}✅ Connection successful!")
            click.echo(f"Latency: {latency:.2f}ms")
        else:
            click.echo(f"{Fore.RED}❌ PING failed")
            return
        
        # Test basic operations
        click.echo(f"\n{Fore.BLUE}Testing basic operations...")
        
        # SET
        test_key = "test:connection"
        test_value = "ElastiCache is working!"
        r.set(test_key, test_value)
        click.echo(f"{Fore.GREEN}✅ SET operation successful")
        
        # GET
        retrieved = r.get(test_key)
        if retrieved and retrieved.decode() == test_value:
            click.echo(f"{Fore.GREEN}✅ GET operation successful")
        else:
            click.echo(f"{Fore.RED}❌ GET operation failed")
        
        # DELETE
        r.delete(test_key)
        click.echo(f"{Fore.GREEN}✅ DELETE operation successful")
        
        # Test performance
        click.echo(f"\n{Fore.BLUE}Testing performance...")
        
        # Write test
        start_time = time.time()
        for i in range(100):
            r.set(f"perf:test:{i}", f"value_{i}")
        write_time = (time.time() - start_time) * 1000
        click.echo(f"Write 100 keys: {write_time:.2f}ms ({write_time/100:.2f}ms per key)")
        
        # Read test
        start_time = time.time()
        for i in range(100):
            r.get(f"perf:test:{i}")
        read_time = (time.time() - start_time) * 1000
        click.echo(f"Read 100 keys: {read_time:.2f}ms ({read_time/100:.2f}ms per key)")
        
        # Cleanup
        for i in range(100):
            r.delete(f"perf:test:{i}")
        
        # Connection pool stats
        click.echo(f"\n{Fore.BLUE}Connection pool stats:")
        pool = r.connection_pool
        click.echo(f"Created connections: {pool.created_connections}")
        click.echo(f"Available connections: {len(pool._available_connections)}")
        click.echo(f"In use connections: {len(pool._in_use_connections)}")
        
        click.echo(f"\n{Fore.GREEN}🎉 All tests passed! ElastiCache is ready for use.")
        
        # Show configuration for services
        click.echo(f"\n{Fore.CYAN}Configuration for services:")
        click.echo(f"REDIS_URL={redis_url}")
        click.echo(f"REDIS_HOST={host}")
        click.echo(f"REDIS_PORT={port}")
        
    except redis.ConnectionError as e:
        click.echo(f"{Fore.RED}❌ Connection error: {e}")
        click.echo(f"\nTroubleshooting:")
        click.echo(f"1. Check if cluster is in 'available' state")
        click.echo(f"2. Verify security group allows connection from your IP")
        click.echo(f"3. Ensure you're in the same VPC or have proper network access")
    except Exception as e:
        click.echo(f"{Fore.RED}❌ Error: {e}")

if __name__ == '__main__':
    main()