#!/usr/bin/env python3
"""
SQLite Backup Script for BookedBarber V2

Creates a safe backup of the SQLite database before migration.
Includes data export to JSON for additional safety.
"""

import os
import sys
import sqlite3
import json
import shutil
import logging
from datetime import datetime
from typing import Dict, Any, List
import argparse


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SQLiteBackup:
    """Handles SQLite database backup operations"""
    
    def __init__(self, db_path: str, backup_dir: str = None):
        self.db_path = db_path
        self.backup_dir = backup_dir or f"backups_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.backup_stats = {
            'tables_exported': 0,
            'total_records': 0,
            'backup_size': 0,
            'start_time': None,
            'end_time': None
        }
    
    def create_backup_directory(self) -> bool:
        """Create backup directory if it doesn't exist"""
        try:
            os.makedirs(self.backup_dir, exist_ok=True)
            logger.info(f"Created backup directory: {self.backup_dir}")
            return True
        except Exception as e:
            logger.error(f"Failed to create backup directory: {e}")
            return False
    
    def backup_database_file(self) -> bool:
        """Create a direct copy of the SQLite database file"""
        try:
            if not os.path.exists(self.db_path):
                logger.error(f"Database file not found: {self.db_path}")
                return False
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"6fb_booking_backup_{timestamp}.db"
            backup_path = os.path.join(self.backup_dir, backup_filename)
            
            # Create backup using SQLite's backup API (safer than file copy)
            source_conn = sqlite3.connect(self.db_path)
            backup_conn = sqlite3.connect(backup_path)
            
            source_conn.backup(backup_conn)
            
            source_conn.close()
            backup_conn.close()
            
            # Get file sizes
            original_size = os.path.getsize(self.db_path)
            backup_size = os.path.getsize(backup_path)
            
            if backup_size != original_size:
                logger.warning(f"Backup size mismatch: original={original_size}, backup={backup_size}")
            
            self.backup_stats['backup_size'] = backup_size
            logger.info(f"Database backup created: {backup_path} ({backup_size} bytes)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to backup database file: {e}")
            return False
    
    def export_table_to_json(self, conn: sqlite3.Connection, table_name: str) -> bool:
        """Export a single table to JSON format"""
        try:
            cursor = conn.cursor()
            
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [col[1] for col in cursor.fetchall()]
            
            # Get all data
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            
            # Convert to list of dictionaries
            table_data = {
                'table_name': table_name,
                'columns': columns,
                'row_count': len(rows),
                'exported_at': datetime.now().isoformat(),
                'data': []
            }
            
            for row in rows:
                row_dict = {}
                for i, col_name in enumerate(columns):
                    value = row[i]
                    # Handle special types
                    if isinstance(value, bytes):
                        value = value.decode('utf-8', errors='replace')
                    row_dict[col_name] = value
                table_data['data'].append(row_dict)
            
            # Write to JSON file
            json_filename = f"{table_name}.json"
            json_path = os.path.join(self.backup_dir, json_filename)
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(table_data, f, indent=2, default=str, ensure_ascii=False)
            
            logger.info(f"Exported {table_name}: {len(rows)} rows to {json_filename}")
            self.backup_stats['total_records'] += len(rows)
            return True
            
        except Exception as e:
            logger.error(f"Failed to export table {table_name}: {e}")
            return False
    
    def export_schema(self, conn: sqlite3.Connection) -> bool:
        """Export database schema to SQL file"""
        try:
            cursor = conn.cursor()
            
            # Get all CREATE statements
            cursor.execute("""
                SELECT sql FROM sqlite_master 
                WHERE type IN ('table', 'index', 'trigger', 'view')
                AND sql IS NOT NULL
                ORDER BY type, name
            """)
            
            schema_statements = cursor.fetchall()
            
            schema_file = os.path.join(self.backup_dir, 'schema.sql')
            with open(schema_file, 'w', encoding='utf-8') as f:
                f.write("-- BookedBarber V2 SQLite Schema Backup\n")
                f.write(f"-- Created: {datetime.now().isoformat()}\n\n")
                
                for (sql,) in schema_statements:
                    f.write(f"{sql};\n\n")
            
            logger.info(f"Schema exported to schema.sql")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export schema: {e}")
            return False
    
    def create_manifest(self) -> bool:
        """Create a manifest file with backup information"""
        try:
            manifest = {
                'backup_created': datetime.now().isoformat(),
                'source_database': self.db_path,
                'backup_directory': self.backup_dir,
                'statistics': self.backup_stats,
                'files_created': []
            }
            
            # List all files in backup directory
            for filename in os.listdir(self.backup_dir):
                file_path = os.path.join(self.backup_dir, filename)
                if os.path.isfile(file_path):
                    manifest['files_created'].append({
                        'filename': filename,
                        'size_bytes': os.path.getsize(file_path),
                        'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                    })
            
            manifest_file = os.path.join(self.backup_dir, 'manifest.json')
            with open(manifest_file, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2, default=str)
            
            logger.info("Backup manifest created")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create manifest: {e}")
            return False
    
    def run_backup(self, include_json: bool = True) -> bool:
        """Execute the complete backup process"""
        self.backup_stats['start_time'] = datetime.now()
        logger.info(f"Starting backup of {self.db_path}")
        
        try:
            # Create backup directory
            if not self.create_backup_directory():
                return False
            
            # Backup database file
            if not self.backup_database_file():
                return False
            
            # Connect to database for additional exports
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            
            try:
                # Export schema
                if not self.export_schema(conn):
                    return False
                
                if include_json:
                    # Get all table names
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name != 'sqlite_sequence'
                        ORDER BY name
                    """)
                    
                    tables = [row[0] for row in cursor.fetchall()]
                    logger.info(f"Exporting {len(tables)} tables to JSON...")
                    
                    for table_name in tables:
                        if not self.export_table_to_json(conn, table_name):
                            logger.warning(f"Failed to export {table_name}, continuing...")
                        self.backup_stats['tables_exported'] += 1
                
                # Create manifest
                if not self.create_manifest():
                    return False
                
            finally:
                conn.close()
            
            self.backup_stats['end_time'] = datetime.now()
            duration = self.backup_stats['end_time'] - self.backup_stats['start_time']
            
            logger.info("Backup completed successfully!")
            logger.info(f"Tables exported: {self.backup_stats['tables_exported']}")
            logger.info(f"Total records: {self.backup_stats['total_records']}")
            logger.info(f"Backup size: {self.backup_stats['backup_size']} bytes")
            logger.info(f"Duration: {duration}")
            logger.info(f"Backup location: {os.path.abspath(self.backup_dir)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return False


def main():
    """Main backup script"""
    parser = argparse.ArgumentParser(description='Backup BookedBarber V2 SQLite database')
    parser.add_argument('--db-path', default='6fb_booking.db', help='Path to SQLite database')
    parser.add_argument('--backup-dir', help='Backup directory (default: auto-generated)')
    parser.add_argument('--no-json', action='store_true', help='Skip JSON export')
    
    args = parser.parse_args()
    
    # Check if database exists
    if not os.path.exists(args.db_path):
        logger.error(f"Database file not found: {args.db_path}")
        sys.exit(1)
    
    # Create backup
    backup = SQLiteBackup(args.db_path, args.backup_dir)
    success = backup.run_backup(include_json=not args.no_json)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()