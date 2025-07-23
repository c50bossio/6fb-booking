#!/usr/bin/env python3
"""
PostgreSQL Read Replica Setup Script for BookedBarber V2

This script helps set up and configure PostgreSQL read replicas for production scaling.
Supports AWS RDS, Google Cloud SQL, Azure Database, and self-managed PostgreSQL.

Usage:
    python scripts/setup-read-replicas.py --provider aws --replicas 2 --validate
    python scripts/setup-read-replicas.py --provider gcp --replicas 1 --region us-west1
    python scripts/setup-read-replicas.py --validate-only
"""

import os
import sys
import argparse
import asyncio
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
import json
import time

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from database.read_replica_config import ReadReplicaConfig, DatabaseManager, check_database_health


class ReadReplicaSetup:
    """PostgreSQL read replica setup and configuration manager."""
    
    def __init__(
        self, 
        provider: str = "aws", 
        replica_count: int = 1, 
        region: Optional[str] = None,
        validate_only: bool = False
    ):
        self.provider = provider.lower()
        self.replica_count = replica_count
        self.region = region
        self.validate_only = validate_only
        self.setup_logger()
        
        # Supported providers
        self.supported_providers = ["aws", "gcp", "azure", "self-managed"]
        
        if self.provider not in self.supported_providers:
            raise ValueError(f"Provider {provider} not supported. Use: {', '.join(self.supported_providers)}")
    
    def setup_logger(self):
        """Set up logging configuration."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler('read_replica_setup.log')
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    async def setup(self):
        """Main setup process."""
        print(f"🚀 Setting up PostgreSQL Read Replicas")
        print(f"Provider: {self.provider}")
        print(f"Replica Count: {self.replica_count}")
        print(f"Region: {self.region or 'auto-detect'}")
        print("="*60)
        
        try:
            # Step 1: Validate current configuration
            await self.validate_current_setup()
            
            if self.validate_only:
                print("✅ Validation complete - no setup performed")
                return
            
            # Step 2: Check prerequisites
            self.check_prerequisites()
            
            # Step 3: Create read replicas based on provider
            replica_info = await self.create_replicas()
            
            # Step 4: Configure application
            self.configure_application(replica_info)
            
            # Step 5: Test connections
            await self.test_replica_connections(replica_info)
            
            # Step 6: Verify replication
            await self.verify_replication(replica_info)
            
            print("✅ Read replica setup completed successfully!")
            self.print_summary(replica_info)
            
        except Exception as e:
            self.logger.error(f"Setup failed: {e}")
            print(f"❌ Setup failed: {e}")
            sys.exit(1)
    
    async def validate_current_setup(self):
        """Validate current database configuration."""
        print("📋 Validating current database setup...")
        
        # Check if primary database is PostgreSQL
        primary_url = os.getenv('DATABASE_URL', '')
        if not primary_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        if 'postgresql' not in primary_url.lower() and 'postgres' not in primary_url.lower():
            raise ValueError("Primary database must be PostgreSQL for read replicas")
        
        # Test primary database connection
        try:
            config = ReadReplicaConfig()
            db_manager = DatabaseManager(config)
            health = db_manager.health_check()
            
            if not health["primary"]["healthy"]:
                raise ValueError("Primary database is not healthy")
            
            print(f"✅ Primary database validated: {db_manager._mask_database_url(primary_url)}")
            
        except Exception as e:
            raise ValueError(f"Failed to validate primary database: {e}")
        
        # Check if read replicas are already configured
        existing_replicas = os.getenv('READ_REPLICA_URLS', '')
        if existing_replicas:
            print(f"⚠️  Existing read replicas found: {len(existing_replicas.split(','))} replicas")
            
            # Test existing replicas
            existing_config = ReadReplicaConfig()
            if existing_config.enable_read_replicas:
                existing_manager = DatabaseManager(existing_config)
                existing_health = existing_manager.health_check()
                
                healthy_replicas = sum(1 for r in existing_health["replicas"] if r["healthy"])
                print(f"✅ Existing healthy replicas: {healthy_replicas}/{len(existing_health['replicas'])}")
    
    def check_prerequisites(self):
        """Check prerequisites for replica setup."""
        print("🔍 Checking prerequisites...")
        
        # Check required environment variables based on provider
        required_vars = self.get_required_env_vars()
        missing_vars = []
        
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            print("❌ Missing required environment variables:")
            for var in missing_vars:
                print(f"   - {var}")
            print(f"\nFor {self.provider} provider, you need:")
            self.print_provider_setup_guide()
            raise ValueError("Missing required environment variables")
        
        print("✅ Prerequisites check passed")
    
    def get_required_env_vars(self) -> List[str]:
        """Get required environment variables for the provider."""
        base_vars = ['DATABASE_URL']
        
        if self.provider == 'aws':
            return base_vars + [
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY',
                'AWS_REGION'
            ]
        elif self.provider == 'gcp':
            return base_vars + [
                'GOOGLE_APPLICATION_CREDENTIALS',
                'GCP_PROJECT_ID'
            ]
        elif self.provider == 'azure':
            return base_vars + [
                'AZURE_SUBSCRIPTION_ID',
                'AZURE_CLIENT_ID',
                'AZURE_CLIENT_SECRET',
                'AZURE_TENANT_ID'
            ]
        elif self.provider == 'self-managed':
            return base_vars  # Will require manual replica URLs
        
        return base_vars
    
    def print_provider_setup_guide(self):
        """Print setup guide for the provider."""
        guides = {
            'aws': """
AWS RDS Setup:
1. Set AWS credentials: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
2. Ensure IAM permissions: rds:CreateDBInstanceReadReplica, rds:DescribeDBInstances
3. Primary database must have automated backups enabled
4. Example: aws rds create-db-instance-read-replica --db-instance-identifier myapp-replica-1 --source-db-instance-identifier myapp-primary
            """,
            'gcp': """
Google Cloud SQL Setup:
1. Set GCP credentials: GOOGLE_APPLICATION_CREDENTIALS, GCP_PROJECT_ID
2. Enable Cloud SQL Admin API
3. Ensure service account has cloudsql.instances.create permission
4. Example: gcloud sql instances create myapp-replica-1 --master-instance-name=myapp-primary
            """,
            'azure': """
Azure Database Setup:
1. Set Azure credentials: AZURE_SUBSCRIPTION_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID
2. Ensure service principal has Contributor role
3. Primary server must be in General Purpose or Business Critical tier
4. Example: az postgres server replica create --name myapp-replica-1 --source-server myapp-primary
            """,
            'self-managed': """
Self-Managed PostgreSQL Setup:
1. Set up streaming replication on your PostgreSQL servers
2. Configure READ_REPLICA_URLS environment variable with comma-separated URLs
3. Example: READ_REPLICA_URLS=postgresql://user:pass@replica1:5432/db,postgresql://user:pass@replica2:5432/db
4. Ensure replicas are properly configured and synchronized
            """
        }
        
        print(guides.get(self.provider, "No specific guide available"))
    
    async def create_replicas(self) -> List[Dict[str, Any]]:
        """Create read replicas based on provider."""
        print(f"🏗️  Creating {self.replica_count} read replica(s) using {self.provider}...")
        
        if self.provider == 'aws':
            return await self.create_aws_replicas()
        elif self.provider == 'gcp':
            return await self.create_gcp_replicas()
        elif self.provider == 'azure':
            return await self.create_azure_replicas()
        elif self.provider == 'self-managed':
            return self.setup_self_managed_replicas()
        
        raise ValueError(f"Replica creation not implemented for {self.provider}")
    
    async def create_aws_replicas(self) -> List[Dict[str, Any]]:
        """Create AWS RDS read replicas."""
        try:
            import boto3
        except ImportError:
            raise ValueError("boto3 package required for AWS provider. Install with: pip install boto3")
        
        replicas = []
        primary_url = os.getenv('DATABASE_URL')
        
        # Extract primary instance identifier from DATABASE_URL
        # This is a simplified version - production code should parse more robustly
        primary_identifier = self.extract_aws_identifier(primary_url)
        
        # Create RDS client
        rds_client = boto3.client('rds', region_name=os.getenv('AWS_REGION'))
        
        for i in range(self.replica_count):
            replica_identifier = f"{primary_identifier}-replica-{i+1}"
            
            try:
                print(f"Creating AWS RDS replica: {replica_identifier}")
                
                response = rds_client.create_db_instance_read_replica(
                    DBInstanceIdentifier=replica_identifier,
                    SourceDBInstanceIdentifier=primary_identifier,
                    DBInstanceClass=os.getenv('REPLICA_INSTANCE_CLASS', 'db.t3.micro'),
                    PubliclyAccessible=True,  # Adjust based on your security requirements
                    MultiAZ=False,  # Read replicas can't be Multi-AZ initially
                    Tags=[
                        {
                            'Key': 'Application',
                            'Value': 'BookedBarber'
                        },
                        {
                            'Key': 'Environment',
                            'Value': os.getenv('ENVIRONMENT', 'production')
                        }
                    ]
                )
                
                # Wait for replica to be available
                print(f"Waiting for replica {replica_identifier} to be available...")
                waiter = rds_client.get_waiter('db_instance_available')
                waiter.wait(
                    DBInstanceIdentifier=replica_identifier,
                    WaiterConfig={
                        'Delay': 30,
                        'MaxAttempts': 40  # Wait up to 20 minutes
                    }
                )
                
                # Get replica details
                replica_info = rds_client.describe_db_instances(
                    DBInstanceIdentifier=replica_identifier
                )['DBInstances'][0]
                
                replica_url = self.build_postgresql_url(
                    replica_info['Endpoint']['Address'],
                    replica_info['Endpoint']['Port'],
                    replica_info['DBName'],
                    primary_url  # Extract credentials from primary URL
                )
                
                replicas.append({
                    'identifier': replica_identifier,
                    'endpoint': replica_info['Endpoint']['Address'],
                    'port': replica_info['Endpoint']['Port'],
                    'url': replica_url,
                    'status': replica_info['DBInstanceStatus'],
                    'provider': 'aws'
                })
                
                print(f"✅ AWS RDS replica created: {replica_identifier}")
                
            except Exception as e:
                self.logger.error(f"Failed to create AWS replica {replica_identifier}: {e}")
                raise
        
        return replicas
    
    async def create_gcp_replicas(self) -> List[Dict[str, Any]]:
        """Create Google Cloud SQL read replicas."""
        try:
            from google.cloud import sql_v1
        except ImportError:
            raise ValueError("google-cloud-sql package required for GCP provider. Install with: pip install google-cloud-sql")
        
        # Placeholder implementation
        print("🚧 GCP Cloud SQL replica creation - implementation in progress")
        return []
    
    async def create_azure_replicas(self) -> List[Dict[str, Any]]:
        """Create Azure Database read replicas."""
        try:
            from azure.mgmt.rdbms.postgresql import PostgreSQLManagementClient
        except ImportError:
            raise ValueError("azure-mgmt-rdbms package required for Azure provider. Install with: pip install azure-mgmt-rdbms")
        
        # Placeholder implementation
        print("🚧 Azure Database replica creation - implementation in progress")
        return []
    
    def setup_self_managed_replicas(self) -> List[Dict[str, Any]]:
        """Set up self-managed PostgreSQL replicas."""
        print("📝 Self-managed replica setup - requires manual configuration")
        
        # Check if replica URLs are already provided
        replica_urls = os.getenv('READ_REPLICA_URLS', '').strip()
        if not replica_urls:
            print("Please set READ_REPLICA_URLS environment variable with your replica connection strings")
            print("Example: READ_REPLICA_URLS=postgresql://user:pass@replica1:5432/db,postgresql://user:pass@replica2:5432/db")
            raise ValueError("READ_REPLICA_URLS not configured for self-managed setup")
        
        urls = [url.strip() for url in replica_urls.split(',') if url.strip()]
        
        if len(urls) != self.replica_count:
            print(f"⚠️  Found {len(urls)} replica URLs, expected {self.replica_count}")
        
        replicas = []
        for i, url in enumerate(urls):
            replicas.append({
                'identifier': f'self-managed-replica-{i+1}',
                'url': url,
                'provider': 'self-managed'
            })
        
        return replicas
    
    def extract_aws_identifier(self, database_url: str) -> str:
        """Extract AWS RDS identifier from database URL."""
        # This is a simplified version - production should use proper URL parsing
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        
        # For AWS RDS, the hostname typically contains the identifier
        # Format: identifier.hash.region.rds.amazonaws.com
        hostname_parts = parsed.hostname.split('.')
        if len(hostname_parts) > 0 and 'rds.amazonaws.com' in parsed.hostname:
            return hostname_parts[0]
        
        # Fallback - use environment variable or default
        return os.getenv('RDS_PRIMARY_IDENTIFIER', 'bookedbarber-primary')
    
    def build_postgresql_url(self, host: str, port: int, database: str, primary_url: str) -> str:
        """Build PostgreSQL URL for replica."""
        from urllib.parse import urlparse
        
        # Extract credentials from primary URL
        parsed = urlparse(primary_url)
        username = parsed.username
        password = parsed.password
        database_name = database or parsed.path.lstrip('/')
        
        return f"postgresql://{username}:{password}@{host}:{port}/{database_name}"
    
    def configure_application(self, replica_info: List[Dict[str, Any]]):
        """Configure application to use read replicas."""
        print("⚙️  Configuring BookedBarber application...")
        
        # Build replica URLs list
        replica_urls = [replica['url'] for replica in replica_info]
        
        # Update environment configuration
        env_updates = {
            'ENABLE_READ_REPLICAS': 'true',
            'READ_REPLICA_URLS': ','.join(replica_urls),
            'READ_REPLICA_POOL_SIZE': '15',
            'READ_REPLICA_MAX_OVERFLOW': '25',
            'READ_REPLICA_LAG_THRESHOLD': '5'
        }
        
        # Write to .env file
        self.update_env_file(env_updates)
        
        # Update backend configuration if needed
        self.update_backend_config(replica_info)
        
        print(f"✅ Application configured with {len(replica_urls)} read replicas")
    
    def update_env_file(self, updates: Dict[str, str]):
        """Update .env file with new configuration."""
        env_file = Path(__file__).parent.parent / '.env'
        
        # Read existing content
        existing_content = ""
        if env_file.exists():
            existing_content = env_file.read_text()
        
        lines = existing_content.split('\n') if existing_content else []
        updated_lines = []
        updated_keys = set()
        
        # Update existing lines
        for line in lines:
            if '=' in line and not line.startswith('#'):
                key = line.split('=')[0].strip()
                if key in updates:
                    updated_lines.append(f"{key}={updates[key]}")
                    updated_keys.add(key)
                else:
                    updated_lines.append(line)
            else:
                updated_lines.append(line)
        
        # Add new keys
        for key, value in updates.items():
            if key not in updated_keys:
                updated_lines.append(f"{key}={value}")
        
        # Write updated content
        env_file.write_text('\n'.join(updated_lines))
        print(f"✅ Updated {env_file}")
    
    def update_backend_config(self, replica_info: List[Dict[str, Any]]):
        """Update backend configuration files if needed."""
        # This could update other configuration files as needed
        pass
    
    async def test_replica_connections(self, replica_info: List[Dict[str, Any]]):
        """Test connections to all replicas."""
        print("🔍 Testing replica connections...")
        
        # Reload configuration with new replicas
        config = ReadReplicaConfig()
        if not config.enable_read_replicas:
            print("⚠️  Read replicas not enabled in configuration")
            return
        
        db_manager = DatabaseManager(config)
        
        # Test each replica
        for replica in replica_info:
            identifier = replica['identifier']
            try:
                # Find corresponding engine
                replica_index = None
                for i, url in enumerate(config.replica_urls):
                    if url == replica['url']:
                        replica_index = i
                        break
                
                if replica_index is not None and replica_index < len(db_manager.replica_engines):
                    engine = db_manager.replica_engines[replica_index]
                    
                    with engine.connect() as conn:
                        result = conn.execute("SELECT version(), pg_is_in_recovery()")
                        row = result.fetchone()
                        
                        print(f"✅ {identifier}: Connected - Recovery mode: {row[1] if row else 'Unknown'}")
                else:
                    print(f"⚠️  {identifier}: Could not find corresponding engine")
                    
            except Exception as e:
                print(f"❌ {identifier}: Connection failed - {e}")
                raise
    
    async def verify_replication(self, replica_info: List[Dict[str, Any]]):
        """Verify that replication is working correctly."""
        print("🔄 Verifying replication...")
        
        config = ReadReplicaConfig()
        db_manager = DatabaseManager(config)
        
        try:
            # Write test data to primary
            test_table = "read_replica_test"
            test_value = f"test_{int(time.time())}"
            
            with db_manager.get_write_session() as primary_session:
                # Create test table if not exists
                primary_session.execute(f"""
                    CREATE TABLE IF NOT EXISTS {test_table} (
                        id SERIAL PRIMARY KEY,
                        test_value VARCHAR(100),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Insert test data
                primary_session.execute(f"""
                    INSERT INTO {test_table} (test_value) VALUES ('{test_value}')
                """)
                primary_session.commit()
            
            print(f"✅ Test data written to primary: {test_value}")
            
            # Wait for replication
            print("⏳ Waiting for replication (10 seconds)...")
            await asyncio.sleep(10)
            
            # Check replicas
            replication_verified = True
            for i, replica in enumerate(replica_info):
                try:
                    with db_manager.replica_session_factories[i]() as replica_session:
                        result = replica_session.execute(f"""
                            SELECT test_value FROM {test_table} 
                            WHERE test_value = '{test_value}'
                        """)
                        
                        if result.fetchone():
                            print(f"✅ {replica['identifier']}: Replication verified")
                        else:
                            print(f"❌ {replica['identifier']}: Test data not found")
                            replication_verified = False
                            
                except Exception as e:
                    print(f"❌ {replica['identifier']}: Replication check failed - {e}")
                    replication_verified = False
            
            # Cleanup test data
            with db_manager.get_write_session() as primary_session:
                primary_session.execute(f"DELETE FROM {test_table} WHERE test_value = '{test_value}'")
                primary_session.commit()
            
            if not replication_verified:
                raise ValueError("Replication verification failed for some replicas")
            
            print("✅ Replication verification completed")
            
        except Exception as e:
            self.logger.error(f"Replication verification failed: {e}")
            raise
    
    def print_summary(self, replica_info: List[Dict[str, Any]]):
        """Print setup summary."""
        print("\n" + "="*60)
        print("📊 READ REPLICA SETUP SUMMARY")
        print("="*60)
        print(f"Provider:           {self.provider}")
        print(f"Replicas Created:   {len(replica_info)}")
        print(f"Region:             {self.region or 'Default'}")
        print()
        
        for i, replica in enumerate(replica_info, 1):
            print(f"Replica {i}:")
            print(f"  Identifier:       {replica['identifier']}")
            if 'endpoint' in replica:
                print(f"  Endpoint:         {replica['endpoint']}:{replica.get('port', 5432)}")
            print(f"  Provider:         {replica['provider']}")
            print()
        
        print("🔗 Next Steps:")
        print("1. Restart your application servers")
        print("2. Monitor replica lag and performance")
        print("3. Update your monitoring/alerting systems")
        print("4. Test read operations are using replicas")
        print("5. Set up automated failover if needed")
        print()
        print("📊 Monitoring Commands:")
        print("  curl http://localhost:8000/api/v2/database/health")
        print("  curl http://localhost:8000/api/v2/database/replica-lag")
        print("  curl http://localhost:8000/api/v2/database/pool-metrics")
        print()
        print("✨ PostgreSQL read replicas are now ready!")


async def main():
    """Main script entry point."""
    parser = argparse.ArgumentParser(description='Setup PostgreSQL read replicas for BookedBarber V2')
    parser.add_argument(
        '--provider',
        choices=['aws', 'gcp', 'azure', 'self-managed'],
        default='aws',
        help='Cloud provider for replica creation'
    )
    parser.add_argument(
        '--replicas',
        type=int,
        default=1,
        help='Number of read replicas to create (1-5)'
    )
    parser.add_argument(
        '--region',
        help='Cloud provider region (auto-detected if not specified)'
    )
    parser.add_argument(
        '--validate-only',
        action='store_true',
        help='Only validate configuration, do not create replicas'
    )
    
    args = parser.parse_args()
    
    if not (1 <= args.replicas <= 5):
        print("❌ Number of replicas must be between 1 and 5")
        sys.exit(1)
    
    setup = ReadReplicaSetup(
        provider=args.provider,
        replica_count=args.replicas,
        region=args.region,
        validate_only=args.validate_only
    )
    
    try:
        await setup.setup()
    except KeyboardInterrupt:
        print("\n⚠️  Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())