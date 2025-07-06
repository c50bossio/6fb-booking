#!/usr/bin/env python3
"""
Diagnose ElastiCache Network Connectivity
"""

import socket
import subprocess
import click
from colorama import init, Fore
import dns.resolver
import time

init(autoreset=True)

@click.command()
def main():
    """Diagnose network connectivity to ElastiCache."""
    
    elasticache_endpoint = "bookedbarber-redis.at4sku.0001.use1.cache.amazonaws.com"
    elasticache_port = 6379
    
    click.echo(f"{Fore.CYAN}🔍 ElastiCache Network Diagnostics")
    click.echo("=" * 50)
    click.echo(f"Endpoint: {elasticache_endpoint}")
    click.echo(f"Port: {elasticache_port}")
    
    # DNS Resolution
    click.echo(f"\n{Fore.BLUE}1. DNS Resolution:")
    try:
        # Get IP addresses
        ips = socket.gethostbyname_ex(elasticache_endpoint)[2]
        for ip in ips:
            click.echo(f"{Fore.GREEN}✅ Resolved to: {ip}")
        primary_ip = ips[0] if ips else None
    except Exception as e:
        click.echo(f"{Fore.RED}❌ DNS resolution failed: {e}")
        return
    
    # Ping test (might not work due to ICMP restrictions)
    click.echo(f"\n{Fore.BLUE}2. Ping Test (may fail due to AWS restrictions):")
    try:
        result = subprocess.run(
            ['ping', '-c', '3', '-W', '2', elasticache_endpoint],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            click.echo(f"{Fore.GREEN}✅ Ping successful")
            lines = result.stdout.strip().split('\n')
            for line in lines[-3:]:
                if line.strip():
                    click.echo(f"   {line}")
        else:
            click.echo(f"{Fore.YELLOW}⚠️ Ping failed (this is normal for AWS services)")
    except Exception as e:
        click.echo(f"{Fore.YELLOW}⚠️ Ping test error: {e}")
    
    # TCP connectivity test
    click.echo(f"\n{Fore.BLUE}3. TCP Port Connectivity Test:")
    if primary_ip:
        for attempt in range(3):
            try:
                click.echo(f"   Attempt {attempt + 1}/3...")
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex((primary_ip, elasticache_port))
                sock.close()
                
                if result == 0:
                    click.echo(f"{Fore.GREEN}✅ TCP port 6379 is reachable!")
                    break
                else:
                    click.echo(f"{Fore.RED}❌ TCP connection failed (error code: {result})")
                    if attempt < 2:
                        click.echo(f"   Waiting 5 seconds before retry...")
                        time.sleep(5)
            except Exception as e:
                click.echo(f"{Fore.RED}❌ Connection error: {e}")
    
    # Traceroute (to see network path)
    click.echo(f"\n{Fore.BLUE}4. Traceroute (first 10 hops):")
    try:
        result = subprocess.run(
            ['traceroute', '-m', '10', '-w', '2', elasticache_endpoint],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')[:12]
            for line in lines:
                if line.strip():
                    click.echo(f"   {line}")
        else:
            click.echo(f"{Fore.YELLOW}⚠️ Traceroute failed")
    except FileNotFoundError:
        click.echo(f"{Fore.YELLOW}⚠️ traceroute command not found")
    except Exception as e:
        click.echo(f"{Fore.YELLOW}⚠️ Traceroute error: {e}")
    
    # Network interface check
    click.echo(f"\n{Fore.BLUE}5. Local Network Interfaces:")
    try:
        result = subprocess.run(['ifconfig'], capture_output=True, text=True)
        if result.returncode == 0:
            # Extract key interfaces
            lines = result.stdout.split('\n')
            current_interface = None
            for line in lines:
                if line and not line.startswith(' ') and not line.startswith('\t'):
                    current_interface = line.split(':')[0]
                if current_interface and 'inet ' in line and '127.0.0.1' not in line:
                    ip = line.strip().split()[1]
                    click.echo(f"   {current_interface}: {ip}")
    except Exception as e:
        click.echo(f"{Fore.YELLOW}⚠️ Interface check error: {e}")
    
    # Recommendations
    click.echo(f"\n{Fore.CYAN}Diagnosis Summary:")
    click.echo("If TCP connection fails:")
    click.echo("1. Security group might need more time to update (wait 1-2 minutes)")
    click.echo("2. There might be additional network ACLs blocking access")
    click.echo("3. Your ISP might be blocking the connection")
    click.echo("4. Consider using a VPN or AWS bastion host")
    
    click.echo(f"\n{Fore.CYAN}Alternative Access Methods:")
    click.echo("1. SSH Tunnel through EC2:")
    click.echo("   - Launch t2.micro EC2 instance in same VPC")
    click.echo("   - SSH tunnel: ssh -L 6379:elasticache.endpoint:6379 ec2-user@ec2-instance")
    click.echo("2. AWS Session Manager:")
    click.echo("   - Use Systems Manager for secure access")
    click.echo("3. Deploy application to AWS:")
    click.echo("   - Best practice for production use")

if __name__ == '__main__':
    main()