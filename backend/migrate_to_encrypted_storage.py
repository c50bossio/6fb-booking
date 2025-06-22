#!/usr/bin/env python3
"""
Data Migration Script: Plaintext to Encrypted Storage
Migrates existing customer data to encrypted format for GDPR/CCPA compliance
"""

import os
import sys
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add backend directory to path
sys.path.append('/Users/bossio/6fb-booking/backend')

from config.database import SessionLocal, engine
from models.client import Client
from models.user import User
from utils.encryption import encrypt_data
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataMigrationManager:
    """Manages the migration of plaintext data to encrypted format"""
    
    def __init__(self, db: Session):
        self.db = db
        self.backup_created = False
    
    def create_backup(self):
        """Create database backup before migration"""
        logger.info("Creating database backup...")
        
        try:
            backup_filename = f"6fb_booking_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
            
            # For SQLite
            if "sqlite" in str(engine.url):
                import shutil
                db_file = str(engine.url).replace('sqlite:///', '')
                backup_file = f"{backup_filename}.db"
                shutil.copy2(db_file, backup_file)
                logger.info(f"SQLite backup created: {backup_file}")
            
            # For PostgreSQL (if using)
            elif "postgresql" in str(engine.url):
                os.system(f"pg_dump {engine.url} > {backup_filename}")
                logger.info(f"PostgreSQL backup created: {backup_filename}")
            
            self.backup_created = True
            return True
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return False
    
    def check_environment(self):
        """Verify environment is ready for migration"""
        logger.info("Checking migration environment...")
        
        # Check encryption key is set
        if not os.getenv('DATA_ENCRYPTION_KEY') and not os.getenv('MASTER_PASSWORD'):
            logger.error("No encryption key found. Set DATA_ENCRYPTION_KEY or MASTER_PASSWORD")
            return False
        
        # Check database connection
        try:
            self.db.execute(text("SELECT 1"))
            logger.info("Database connection OK")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
        
        # Check if migration already performed
        try:
            sample_client = self.db.query(Client).first()
            if sample_client and sample_client.email:
                # Check if data looks already encrypted (long base64-like string)
                if len(sample_client.email) > 100 and '=' in sample_client.email:
                    logger.warning("Data appears already encrypted. Migration may have been run before.")
                    response = input("Continue anyway? (y/N): ")
                    if response.lower() != 'y':
                        return False
        except Exception as e:
            logger.info("No existing data found or table doesn't exist yet")
        
        return True
    
    def migrate_client_data(self, dry_run=False):
        """Migrate client table data to encrypted format"""
        logger.info("Starting client data migration...")
        
        try:
            # Get all clients with non-null email or phone
            clients = self.db.query(Client).filter(
                (Client.email.isnot(None)) | 
                (Client.phone.isnot(None)) |
                (Client.notes.isnot(None))
            ).all()
            
            logger.info(f"Found {len(clients)} clients with sensitive data")
            
            migrated_count = 0
            for client in clients:
                try:
                    updated = False
                    
                    # Migrate email
                    if client.email and not self._is_encrypted(client.email):
                        if not dry_run:
                            client.email = encrypt_data(client.email)
                        logger.debug(f"Encrypted email for client {client.id}")
                        updated = True
                    
                    # Migrate phone
                    if client.phone and not self._is_encrypted(client.phone):
                        if not dry_run:
                            client.phone = encrypt_data(client.phone)
                        logger.debug(f"Encrypted phone for client {client.id}")
                        updated = True
                    
                    # Migrate notes
                    if client.notes and not self._is_encrypted(client.notes):
                        if not dry_run:
                            client.notes = encrypt_data(client.notes)
                        logger.debug(f"Encrypted notes for client {client.id}")
                        updated = True
                    
                    if updated:
                        migrated_count += 1
                
                except Exception as e:
                    logger.error(f"Failed to migrate client {client.id}: {e}")
            
            if not dry_run:
                self.db.commit()
                logger.info(f"Successfully migrated {migrated_count} client records")
            else:
                logger.info(f"DRY RUN: Would migrate {migrated_count} client records")
            
            return migrated_count
        
        except Exception as e:
            logger.error(f"Client data migration failed: {e}")
            self.db.rollback()
            return 0
    
    def migrate_user_data(self, dry_run=False):
        """Migrate user table data to encrypted format"""
        logger.info("Starting user data migration...")
        
        try:
            users = self.db.query(User).filter(User.email.isnot(None)).all()
            logger.info(f"Found {len(users)} users with email data")
            
            migrated_count = 0
            for user in users:
                try:
                    if user.email and not self._is_encrypted(user.email):
                        if not dry_run:
                            user.email = encrypt_data(user.email)
                        logger.debug(f"Encrypted email for user {user.id}")
                        migrated_count += 1
                
                except Exception as e:
                    logger.error(f"Failed to migrate user {user.id}: {e}")
            
            if not dry_run:
                self.db.commit()
                logger.info(f"Successfully migrated {migrated_count} user records")
            else:
                logger.info(f"DRY RUN: Would migrate {migrated_count} user records")
            
            return migrated_count
        
        except Exception as e:
            logger.error(f"User data migration failed: {e}")
            self.db.rollback()
            return 0
    
    def _is_encrypted(self, data: str) -> bool:
        """Check if data appears to be already encrypted"""
        if not data:
            return False
        
        # Encrypted data is base64 encoded and typically much longer
        # Also contains base64 characters
        return (len(data) > 50 and 
                any(c in data for c in ['+', '/', '=']) and
                not '@' in data and  # emails contain @
                not '-' in data[:10])  # phone numbers often start with area codes
    
    def verify_migration(self):
        """Verify migration was successful"""
        logger.info("Verifying migration...")
        
        try:
            # Check a few sample records
            sample_clients = self.db.query(Client).limit(5).all()
            
            for client in sample_clients:
                if client.email:
                    # Try to decrypt to verify it works
                    from utils.encryption import decrypt_data
                    try:
                        decrypted = decrypt_data(client.email)
                        if '@' in decrypted:
                            logger.info(f"✓ Client {client.id} email encryption verified")
                        else:
                            logger.warning(f"⚠ Client {client.id} email decryption suspicious")
                    except Exception:
                        logger.error(f"✗ Client {client.id} email decryption failed")
            
            logger.info("Migration verification complete")
            
        except Exception as e:
            logger.error(f"Migration verification failed: {e}")
    
    def generate_report(self):
        """Generate migration report"""
        logger.info("Generating migration report...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'backup_created': self.backup_created,
            'client_count': self.db.query(Client).count(),
            'user_count': self.db.query(User).count(),
            'encrypted_fields': [
                'clients.email',
                'clients.phone', 
                'clients.notes',
                'users.email'
            ]
        }
        
        report_filename = f"migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        import json
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Migration report saved: {report_filename}")
        return report

def main():
    parser = argparse.ArgumentParser(description='Migrate 6FB customer data to encrypted storage')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be migrated without making changes')
    parser.add_argument('--skip-backup', action='store_true',
                       help='Skip database backup (not recommended)')
    parser.add_argument('--force', action='store_true',
                       help='Force migration even if data appears encrypted')
    
    args = parser.parse_args()
    
    logger.info("Starting 6FB data encryption migration")
    logger.info(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE MIGRATION'}")
    
    # Create database session
    db = SessionLocal()
    migrator = DataMigrationManager(db)
    
    try:
        # Environment check
        if not migrator.check_environment():
            logger.error("Environment check failed. Aborting migration.")
            return 1
        
        # Create backup
        if not args.skip_backup and not args.dry_run:
            if not migrator.create_backup():
                logger.error("Backup failed. Aborting migration.")
                return 1
        
        # Perform migrations
        client_migrated = migrator.migrate_client_data(dry_run=args.dry_run)
        user_migrated = migrator.migrate_user_data(dry_run=args.dry_run)
        
        total_migrated = client_migrated + user_migrated
        
        if not args.dry_run:
            # Verify migration
            migrator.verify_migration()
            
            # Generate report
            report = migrator.generate_report()
            
            logger.info(f"✅ Migration completed successfully!")
            logger.info(f"Total records migrated: {total_migrated}")
            logger.info(f"Backup created: {migrator.backup_created}")
        else:
            logger.info(f"DRY RUN completed. Would migrate {total_migrated} records.")
            logger.info("Run without --dry-run to perform actual migration.")
        
        return 0
    
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return 1
    
    finally:
        db.close()

if __name__ == "__main__":
    sys.exit(main())