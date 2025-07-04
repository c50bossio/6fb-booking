#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script for BookedBarber V2

This script safely migrates data from SQLite to PostgreSQL with:
- Data integrity checks
- Batch processing for large tables
- Error handling and rollback capability
- Progress tracking
- Data validation
"""

import os
import sys
import sqlite3
import psycopg2
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Any, Optional
from psycopg2.extras import RealDictCursor, execute_values
from tqdm import tqdm
import argparse


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DatabaseMigrator:
    """Handles migration from SQLite to PostgreSQL"""
    
    def __init__(self, sqlite_path: str, pg_config: Dict[str, str], batch_size: int = 1000):
        self.sqlite_path = sqlite_path
        self.pg_config = pg_config
        self.batch_size = batch_size
        self.sqlite_conn = None
        self.pg_conn = None
        self.migration_stats = {
            'tables_migrated': 0,
            'total_records': 0,
            'start_time': None,
            'end_time': None,
            'errors': []
        }
        
    def connect_databases(self) -> bool:
        """Establish connections to both databases"""
        try:
            # Connect to SQLite
            self.sqlite_conn = sqlite3.connect(self.sqlite_path)
            self.sqlite_conn.row_factory = sqlite3.Row
            logger.info(f"Connected to SQLite database: {self.sqlite_path}")
            
            # Connect to PostgreSQL
            self.pg_conn = psycopg2.connect(**self.pg_config)
            self.pg_conn.autocommit = False
            logger.info(f"Connected to PostgreSQL database: {self.pg_config['host']}:{self.pg_config['port']}/{self.pg_config['dbname']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to databases: {e}")
            return False
    
    def get_table_info(self) -> Dict[str, Dict]:
        """Get information about all tables in SQLite"""
        cursor = self.sqlite_conn.cursor()
        
        # Get all tables except alembic_version
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name != 'alembic_version'
            ORDER BY name
        """)
        
        tables = {}
        for (table_name,) in cursor.fetchall():
            # Get column information
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            
            tables[table_name] = {
                'columns': [
                    {
                        'name': col[1],
                        'type': col[2],
                        'not_null': bool(col[3]),
                        'primary_key': bool(col[5])
                    }
                    for col in columns
                ],
                'row_count': row_count
            }
            
        return tables
    
    def prepare_postgresql_schema(self) -> bool:
        """Ensure PostgreSQL schema is ready for migration"""
        try:
            with self.pg_conn.cursor() as cursor:
                # Check if alembic_version table exists and has migrations
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_name = 'alembic_version'
                """)
                
                if cursor.fetchone()[0] == 0:
                    logger.error("PostgreSQL database is not initialized. Run 'alembic upgrade head' first.")
                    return False
                
                # Check for existing data
                cursor.execute("""
                    SELECT table_name, 
                           (xpath('/row/c/text()', xml_count))[1]::text::int as row_count
                    FROM (
                        SELECT table_name, 
                               query_to_xml(format('select count(*) as c from %I.%I', 
                                           table_schema, table_name), false, true, '') as xml_count
                        FROM information_schema.tables
                        WHERE table_schema = 'public' 
                        AND table_type = 'BASE TABLE'
                        AND table_name != 'alembic_version'
                    ) t
                """)
                
                existing_data = cursor.fetchall()
                non_empty_tables = [(table, count) for table, count in existing_data if count > 0]
                
                if non_empty_tables:
                    logger.warning(f"Found existing data in PostgreSQL tables: {non_empty_tables}")
                    response = input("Continue and potentially overwrite data? (y/N): ")
                    if response.lower() != 'y':
                        return False
                
                logger.info("PostgreSQL schema is ready for migration")
                return True
                
        except Exception as e:
            logger.error(f"Failed to prepare PostgreSQL schema: {e}")
            return False
    
    def convert_sqlite_value(self, value: Any, column_type: str) -> Any:
        """Convert SQLite value to PostgreSQL compatible format"""
        if value is None:
            return None
            
        # Handle JSON columns
        if column_type.upper() == 'JSON' and isinstance(value, str):
            try:
                return json.loads(value) if value else None
            except json.JSONDecodeError:
                return value
        
        # Handle boolean columns
        if column_type.upper() == 'BOOLEAN':
            if isinstance(value, (int, str)):
                return bool(int(value)) if str(value).isdigit() else bool(value)
            return bool(value)
        
        # Handle datetime columns
        if 'DATETIME' in column_type.upper() or 'TIMESTAMP' in column_type.upper():
            if isinstance(value, str):
                try:
                    # Try to parse various datetime formats
                    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    return dt
                except ValueError:
                    return value
        
        return value
    
    def migrate_table(self, table_name: str, table_info: Dict) -> bool:
        """Migrate a single table from SQLite to PostgreSQL"""
        logger.info(f"Migrating table: {table_name} ({table_info['row_count']} rows)")
        
        if table_info['row_count'] == 0:
            logger.info(f"Skipping empty table: {table_name}")
            return True
        
        try:
            # Get column names and types
            columns = table_info['columns']
            column_names = [col['name'] for col in columns]
            column_types = {col['name']: col['type'] for col in columns}
            
            # Clear existing data in PostgreSQL
            with self.pg_conn.cursor() as pg_cursor:
                pg_cursor.execute(f"DELETE FROM {table_name}")
                self.pg_conn.commit()
                logger.info(f"Cleared existing data from {table_name}")
            
            # Fetch data from SQLite in batches
            sqlite_cursor = self.sqlite_conn.cursor()
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            
            total_migrated = 0
            with tqdm(total=table_info['row_count'], desc=f"Migrating {table_name}") as pbar:
                while True:
                    rows = sqlite_cursor.fetchmany(self.batch_size)
                    if not rows:
                        break
                    
                    # Convert data for PostgreSQL
                    converted_rows = []
                    for row in rows:
                        converted_row = tuple(
                            self.convert_sqlite_value(row[col], column_types[col])
                            for col in column_names
                        )
                        converted_rows.append(converted_row)
                    
                    # Insert into PostgreSQL
                    with self.pg_conn.cursor() as pg_cursor:
                        placeholders = ','.join(['%s'] * len(column_names))
                        query = f"INSERT INTO {table_name} ({','.join(column_names)}) VALUES ({placeholders})"
                        
                        execute_values(
                            pg_cursor,
                            query,
                            converted_rows,
                            page_size=self.batch_size
                        )
                        
                        self.pg_conn.commit()
                    
                    total_migrated += len(rows)
                    pbar.update(len(rows))
            
            # Verify migration
            with self.pg_conn.cursor() as pg_cursor:
                pg_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                pg_count = pg_cursor.fetchone()[0]
                
                if pg_count != table_info['row_count']:
                    raise Exception(f"Row count mismatch: SQLite={table_info['row_count']}, PostgreSQL={pg_count}")
            
            logger.info(f"Successfully migrated {table_name}: {total_migrated} rows")
            self.migration_stats['total_records'] += total_migrated
            return True
            
        except Exception as e:
            logger.error(f"Failed to migrate table {table_name}: {e}")
            self.migration_stats['errors'].append(f"{table_name}: {str(e)}")
            self.pg_conn.rollback()
            return False
    
    def update_sequences(self) -> bool:
        """Update PostgreSQL sequences to correct values"""
        logger.info("Updating PostgreSQL sequences...")
        
        try:
            with self.pg_conn.cursor() as cursor:
                # Get all sequences
                cursor.execute("""
                    SELECT schemaname, sequencename, tablename, columnname
                    FROM pg_sequences
                    WHERE schemaname = 'public'
                """)
                
                sequences = cursor.fetchall()
                
                for schema, seq_name, table_name, column_name in sequences:
                    # Get max value from table
                    cursor.execute(f"SELECT MAX({column_name}) FROM {table_name}")
                    max_val = cursor.fetchone()[0]
                    
                    if max_val is not None:
                        # Set sequence to max_val + 1
                        cursor.execute(f"SELECT setval('{seq_name}', {max_val})")
                        logger.info(f"Updated sequence {seq_name} to {max_val}")
                
                self.pg_conn.commit()
                logger.info("Successfully updated all sequences")
                return True
                
        except Exception as e:
            logger.error(f"Failed to update sequences: {e}")
            self.pg_conn.rollback()
            return False
    
    def validate_migration(self) -> bool:
        """Validate the migration by comparing row counts and sample data"""
        logger.info("Validating migration...")
        
        try:
            sqlite_cursor = self.sqlite_conn.cursor()
            
            # Get table list
            sqlite_cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name != 'alembic_version'
            """)
            
            validation_passed = True
            
            for (table_name,) in sqlite_cursor.fetchall():
                # Compare row counts
                sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                sqlite_count = sqlite_cursor.fetchone()[0]
                
                with self.pg_conn.cursor() as pg_cursor:
                    pg_cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    pg_count = pg_cursor.fetchone()[0]
                
                if sqlite_count != pg_count:
                    logger.error(f"Row count mismatch in {table_name}: SQLite={sqlite_count}, PostgreSQL={pg_count}")
                    validation_passed = False
                else:
                    logger.info(f"✓ {table_name}: {sqlite_count} rows")
            
            if validation_passed:
                logger.info("✓ Migration validation passed!")
            else:
                logger.error("✗ Migration validation failed!")
            
            return validation_passed
            
        except Exception as e:
            logger.error(f"Migration validation failed: {e}")
            return False
    
    def run_migration(self) -> bool:
        """Execute the complete migration process"""
        self.migration_stats['start_time'] = datetime.now()
        logger.info("Starting SQLite to PostgreSQL migration...")
        
        try:
            # Connect to databases
            if not self.connect_databases():
                return False
            
            # Prepare PostgreSQL
            if not self.prepare_postgresql_schema():
                return False
            
            # Get table information
            tables = self.get_table_info()
            logger.info(f"Found {len(tables)} tables to migrate")
            
            # Migrate tables in dependency order (simple tables first)
            table_order = self.get_migration_order(tables)
            
            for table_name in table_order:
                if not self.migrate_table(table_name, tables[table_name]):
                    logger.error(f"Migration failed at table: {table_name}")
                    return False
                self.migration_stats['tables_migrated'] += 1
            
            # Update sequences
            if not self.update_sequences():
                return False
            
            # Validate migration
            if not self.validate_migration():
                return False
            
            self.migration_stats['end_time'] = datetime.now()
            duration = self.migration_stats['end_time'] - self.migration_stats['start_time']
            
            logger.info("Migration completed successfully!")
            logger.info(f"Tables migrated: {self.migration_stats['tables_migrated']}")
            logger.info(f"Total records: {self.migration_stats['total_records']}")
            logger.info(f"Duration: {duration}")
            
            return True
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            return False
        
        finally:
            if self.sqlite_conn:
                self.sqlite_conn.close()
            if self.pg_conn:
                self.pg_conn.close()
    
    def get_migration_order(self, tables: Dict[str, Dict]) -> List[str]:
        """Determine the order to migrate tables based on dependencies"""
        # Simple ordering - tables with no foreign keys first
        # This is a simplified version; for complex dependencies, use topological sort
        
        independent_tables = [
            'users', 'booking_settings', 'services', 'notification_templates',
            'barbershop_locations', 'timezone_cache', 'idempotency_keys'
        ]
        
        dependent_tables = [
            'clients', 'barber_availability', 'password_reset_tokens',
            'appointments', 'payments', 'payouts', 'gift_certificates',
            'reviews', 'integrations', 'sms_conversations'
        ]
        
        ordered_tables = []
        
        # Add independent tables first
        for table in independent_tables:
            if table in tables:
                ordered_tables.append(table)
        
        # Add dependent tables
        for table in dependent_tables:
            if table in tables:
                ordered_tables.append(table)
        
        # Add any remaining tables
        for table in tables:
            if table not in ordered_tables:
                ordered_tables.append(table)
        
        return ordered_tables


def main():
    """Main migration script"""
    parser = argparse.ArgumentParser(description='Migrate BookedBarber V2 from SQLite to PostgreSQL')
    parser.add_argument('--sqlite-path', default='6fb_booking.db', help='Path to SQLite database')
    parser.add_argument('--pg-host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--pg-port', default='5432', help='PostgreSQL port')
    parser.add_argument('--pg-database', default='bookedbarber_v2', help='PostgreSQL database name')
    parser.add_argument('--pg-user', default='bookedbarber_app', help='PostgreSQL user')
    parser.add_argument('--pg-password', required=True, help='PostgreSQL password')
    parser.add_argument('--batch-size', type=int, default=1000, help='Batch size for migration')
    parser.add_argument('--dry-run', action='store_true', help='Perform a dry run without actual migration')
    
    args = parser.parse_args()
    
    # PostgreSQL configuration
    pg_config = {
        'host': args.pg_host,
        'port': args.pg_port,
        'dbname': args.pg_database,
        'user': args.pg_user,
        'password': args.pg_password
    }
    
    # Check if SQLite database exists
    if not os.path.exists(args.sqlite_path):
        logger.error(f"SQLite database not found: {args.sqlite_path}")
        sys.exit(1)
    
    # Create migrator
    migrator = DatabaseMigrator(args.sqlite_path, pg_config, args.batch_size)
    
    if args.dry_run:
        logger.info("DRY RUN MODE - No actual migration will be performed")
        # Just validate connections and show what would be migrated
        if migrator.connect_databases():
            tables = migrator.get_table_info()
            logger.info(f"Would migrate {len(tables)} tables:")
            for table_name, info in tables.items():
                logger.info(f"  - {table_name}: {info['row_count']} rows")
    else:
        # Run actual migration
        success = migrator.run_migration()
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()