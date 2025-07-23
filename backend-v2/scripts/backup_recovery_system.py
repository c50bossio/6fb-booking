"""
Backup and Disaster Recovery System for BookedBarber V2
Comprehensive backup, monitoring, and recovery procedures
"""

import os
import shutil
import subprocess
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import asyncio
import aiofiles

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BackupRecoveryManager:
    """Comprehensive backup and disaster recovery management"""
    
    def __init__(self, project_root: str = "/Users/bossio/6fb-booking/backend-v2"):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / "backups"
        self.backup_dir.mkdir(exist_ok=True)
        
        # Backup configuration
        self.backup_config = {
            'database_backup': True,
            'code_backup': True,
            'config_backup': True,
            'logs_backup': True,
            'retention_days': 30,
            'compression': True
        }
    
    def create_database_backup(self) -> Dict[str, Any]:
        """Create database backup"""
        logger.info("💾 Creating database backup...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_result = {
            'type': 'database',
            'timestamp': timestamp,
            'success': False,
            'files': [],
            'size_mb': 0
        }
        
        try:
            # SQLite database backup
            db_files = list(self.project_root.glob("*.db"))
            
            for db_file in db_files:
                backup_filename = f"{db_file.stem}_backup_{timestamp}.db"
                backup_path = self.backup_dir / backup_filename
                
                # Copy database file
                shutil.copy2(db_file, backup_path)
                
                # Create SQL dump for additional safety
                sql_filename = f"{db_file.stem}_dump_{timestamp}.sql"
                sql_path = self.backup_dir / sql_filename
                
                try:
                    # SQLite dump
                    with open(sql_path, 'w') as f:
                        subprocess.run([
                            'sqlite3', str(db_file), '.dump'
                        ], stdout=f, check=True)
                    
                    backup_result['files'].extend([str(backup_path), str(sql_path)])
                    backup_result['size_mb'] += backup_path.stat().st_size / (1024*1024)
                    backup_result['size_mb'] += sql_path.stat().st_size / (1024*1024)
                    
                except subprocess.CalledProcessError as e:
                    logger.warning(f"SQL dump failed for {db_file}: {e}")
            
            if backup_result['files']:
                backup_result['success'] = True
                logger.info(f"✅ Database backup completed: {len(backup_result['files'])} files, {backup_result['size_mb']:.1f}MB")
            else:
                logger.warning("❌ No database files found to backup")
        
        except Exception as e:
            logger.error(f"Database backup failed: {e}")
            backup_result['error'] = str(e)
        
        return backup_result
    
    def create_code_backup(self) -> Dict[str, Any]:
        """Create code repository backup"""
        logger.info("📂 Creating code backup...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_result = {
            'type': 'code',
            'timestamp': timestamp,
            'success': False,
            'files': [],
            'size_mb': 0
        }
        
        try:
            # Create git bundle (complete repository backup)
            bundle_filename = f"bookedbarber_code_backup_{timestamp}.bundle"
            bundle_path = self.backup_dir / bundle_filename
            
            result = subprocess.run([
                'git', 'bundle', 'create', str(bundle_path), '--all'
            ], cwd=self.project_root.parent, capture_output=True, text=True)
            
            if result.returncode == 0:
                backup_result['files'].append(str(bundle_path))
                backup_result['size_mb'] = bundle_path.stat().st_size / (1024*1024)
                backup_result['success'] = True
                logger.info(f"✅ Code backup completed: {backup_result['size_mb']:.1f}MB")
            else:
                logger.error(f"Git bundle creation failed: {result.stderr}")
                backup_result['error'] = result.stderr
            
            # Additional: Create tar archive of critical files
            critical_files = [
                '*.py',
                'requirements.txt',
                'alembic.ini',
                'alembic/',
                'deployment/',
                'scripts/',
                'docs/',
                'CLAUDE.md',
                'monitoring/'
            ]
            
            tar_filename = f"bookedbarber_critical_files_{timestamp}.tar.gz"
            tar_path = self.backup_dir / tar_filename
            
            # Create tar archive
            import tarfile
            with tarfile.open(tar_path, 'w:gz') as tar:
                for pattern in critical_files:
                    for file_path in self.project_root.glob(pattern):
                        if file_path.is_file():
                            tar.add(file_path, arcname=file_path.relative_to(self.project_root))
                        elif file_path.is_dir():
                            for subfile in file_path.rglob('*'):
                                if subfile.is_file() and 'venv' not in str(subfile) and '__pycache__' not in str(subfile):
                                    tar.add(subfile, arcname=subfile.relative_to(self.project_root))
            
            backup_result['files'].append(str(tar_path))
            backup_result['size_mb'] += tar_path.stat().st_size / (1024*1024)
            
        except Exception as e:
            logger.error(f"Code backup failed: {e}")
            backup_result['error'] = str(e)
        
        return backup_result
    
    def create_config_backup(self) -> Dict[str, Any]:
        """Create configuration backup"""
        logger.info("⚙️ Creating configuration backup...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_result = {
            'type': 'configuration',
            'timestamp': timestamp,
            'success': False,
            'files': [],
            'size_mb': 0
        }
        
        try:
            config_files = [
                '.env.template',
                '.env.production.template',
                'alembic.ini',
                'config.py',
                'database.py'
            ]
            
            # Create config backup directory
            config_backup_dir = self.backup_dir / f"config_backup_{timestamp}"
            config_backup_dir.mkdir(exist_ok=True)
            
            for config_file in config_files:
                source_path = self.project_root / config_file
                if source_path.exists():
                    dest_path = config_backup_dir / config_file
                    shutil.copy2(source_path, dest_path)
                    backup_result['files'].append(str(dest_path))
            
            # Backup middleware and router configurations
            config_dirs = ['middleware', 'routers', 'utils']
            for config_dir in config_dirs:
                source_dir = self.project_root / config_dir
                if source_dir.exists():
                    dest_dir = config_backup_dir / config_dir
                    shutil.copytree(source_dir, dest_dir, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
            
            # Create environment documentation
            env_doc_path = config_backup_dir / 'environment_documentation.json'
            env_doc = {
                'backup_timestamp': timestamp,
                'required_environment_variables': [
                    'DATABASE_URL',
                    'SECRET_KEY',
                    'STRIPE_SECRET_KEY',
                    'STRIPE_PUBLISHABLE_KEY',
                    'REDIS_URL',
                    'ENVIRONMENT'
                ],
                'production_settings': {
                    'database': 'PostgreSQL recommended',
                    'redis': 'Redis cluster for production',
                    'secret_rotation': 'Rotate secrets quarterly',
                    'cors_origins': 'Update for production domains'
                },
                'deployment_checklist': [
                    'Apply database migrations',
                    'Apply performance indexes',
                    'Configure Redis cache',
                    'Set up monitoring alerts',
                    'Configure backup automation'
                ]
            }
            
            with open(env_doc_path, 'w') as f:
                json.dump(env_doc, f, indent=2)
            backup_result['files'].append(str(env_doc_path))
            
            # Calculate total size
            total_size = sum(
                sum(f.stat().st_size for f in Path(d).rglob('*') if f.is_file())
                for d in [config_backup_dir]
            )
            backup_result['size_mb'] = total_size / (1024*1024)
            backup_result['success'] = True
            
            logger.info(f"✅ Configuration backup completed: {len(backup_result['files'])} files, {backup_result['size_mb']:.1f}MB")
        
        except Exception as e:
            logger.error(f"Configuration backup failed: {e}")
            backup_result['error'] = str(e)
        
        return backup_result
    
    def create_logs_backup(self) -> Dict[str, Any]:
        """Create application logs backup"""
        logger.info("📋 Creating logs backup...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_result = {
            'type': 'logs',
            'timestamp': timestamp,
            'success': False,
            'files': [],
            'size_mb': 0
        }
        
        try:
            # Find log files
            log_patterns = ['*.log', '*.out', '*.err']
            log_files = []
            
            for pattern in log_patterns:
                log_files.extend(self.project_root.glob(pattern))
                log_files.extend(self.project_root.glob(f"**/{pattern}"))
            
            if log_files:
                # Create logs backup directory
                logs_backup_dir = self.backup_dir / f"logs_backup_{timestamp}"
                logs_backup_dir.mkdir(exist_ok=True)
                
                for log_file in log_files:
                    if log_file.is_file():
                        dest_path = logs_backup_dir / log_file.name
                        shutil.copy2(log_file, dest_path)
                        backup_result['files'].append(str(dest_path))
                
                # Create log analysis summary
                log_summary_path = logs_backup_dir / 'log_analysis_summary.json'
                log_summary = {
                    'backup_timestamp': timestamp,
                    'total_log_files': len(log_files),
                    'analysis_period': '7_days',
                    'monitoring_recommendations': [
                        'Set up centralized logging (ELK stack)',
                        'Configure log rotation',
                        'Set up error alerting',
                        'Monitor performance metrics'
                    ]
                }
                
                with open(log_summary_path, 'w') as f:
                    json.dump(log_summary, f, indent=2)
                backup_result['files'].append(str(log_summary_path))
                
                # Calculate total size
                total_size = sum(f.stat().st_size for f in logs_backup_dir.rglob('*') if f.is_file())
                backup_result['size_mb'] = total_size / (1024*1024)
                backup_result['success'] = True
                
                logger.info(f"✅ Logs backup completed: {len(backup_result['files'])} files, {backup_result['size_mb']:.1f}MB")
            else:
                logger.info("📋 No log files found to backup")
                backup_result['success'] = True
        
        except Exception as e:
            logger.error(f"Logs backup failed: {e}")
            backup_result['error'] = str(e)
        
        return backup_result
    
    def cleanup_old_backups(self) -> Dict[str, Any]:
        """Clean up old backup files based on retention policy"""
        logger.info("🧹 Cleaning up old backups...")
        
        cleanup_result = {
            'deleted_files': [],
            'freed_space_mb': 0,
            'retention_days': self.backup_config['retention_days']
        }
        
        try:
            cutoff_date = datetime.now() - timedelta(days=self.backup_config['retention_days'])
            
            for backup_file in self.backup_dir.rglob('*'):
                if backup_file.is_file():
                    # Check file modification time
                    file_mtime = datetime.fromtimestamp(backup_file.stat().st_mtime)
                    
                    if file_mtime < cutoff_date:
                        file_size = backup_file.stat().st_size
                        backup_file.unlink()
                        cleanup_result['deleted_files'].append(str(backup_file))
                        cleanup_result['freed_space_mb'] += file_size / (1024*1024)
            
            # Clean up empty directories
            for backup_dir in self.backup_dir.glob('*'):
                if backup_dir.is_dir() and not any(backup_dir.iterdir()):
                    backup_dir.rmdir()
            
            logger.info(f"✅ Cleanup completed: {len(cleanup_result['deleted_files'])} files deleted, {cleanup_result['freed_space_mb']:.1f}MB freed")
        
        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
            cleanup_result['error'] = str(e)
        
        return cleanup_result
    
    def create_comprehensive_backup(self) -> Dict[str, Any]:
        """Create comprehensive backup of all system components"""
        logger.info("🚀 Starting Comprehensive Backup Process")
        
        backup_session = {
            'session_id': datetime.now().strftime("%Y%m%d_%H%M%S"),
            'start_time': datetime.now().isoformat(),
            'components': {},
            'summary': {
                'total_files': 0,
                'total_size_mb': 0,
                'success_count': 0,
                'failure_count': 0
            }
        }
        
        # Backup components
        backup_functions = [
            ('database', self.create_database_backup),
            ('code', self.create_code_backup),
            ('configuration', self.create_config_backup),
            ('logs', self.create_logs_backup)
        ]
        
        for component_name, backup_function in backup_functions:
            try:
                result = backup_function()
                backup_session['components'][component_name] = result
                
                # Update summary
                backup_session['summary']['total_files'] += len(result.get('files', []))
                backup_session['summary']['total_size_mb'] += result.get('size_mb', 0)
                
                if result.get('success', False):
                    backup_session['summary']['success_count'] += 1
                else:
                    backup_session['summary']['failure_count'] += 1
                    
            except Exception as e:
                logger.error(f"Backup component {component_name} failed: {e}")
                backup_session['components'][component_name] = {
                    'success': False,
                    'error': str(e)
                }
                backup_session['summary']['failure_count'] += 1
        
        # Cleanup old backups
        cleanup_result = self.cleanup_old_backups()
        backup_session['cleanup'] = cleanup_result
        
        # Finalize session
        backup_session['end_time'] = datetime.now().isoformat()
        backup_session['duration_minutes'] = (
            datetime.fromisoformat(backup_session['end_time']) - 
            datetime.fromisoformat(backup_session['start_time'])
        ).total_seconds() / 60
        
        # Save backup report
        report_path = self.backup_dir / f"backup_report_{backup_session['session_id']}.json"
        with open(report_path, 'w') as f:
            json.dump(backup_session, f, indent=2)
        
        self.print_backup_report(backup_session)
        return backup_session
    
    def print_backup_report(self, backup_session: Dict[str, Any]):
        """Print formatted backup report"""
        print("\\n" + "="*80)
        print("💾 BOOKEDBARBER V2 BACKUP REPORT")
        print("="*80)
        
        summary = backup_session['summary']
        session_id = backup_session['session_id']
        duration = backup_session.get('duration_minutes', 0)
        
        print(f"\\n📋 Backup Session: {session_id}")
        print(f"   Duration: {duration:.1f} minutes")
        print(f"   Components: {summary['success_count']} successful, {summary['failure_count']} failed")
        print(f"   Total Files: {summary['total_files']}")
        print(f"   Total Size: {summary['total_size_mb']:.1f}MB")
        
        print(f"\\n📦 Component Status:")
        for component, result in backup_session['components'].items():
            status = "✅" if result.get('success', False) else "❌"
            size = result.get('size_mb', 0)
            file_count = len(result.get('files', []))
            
            print(f"   {status} {component.title()}: {file_count} files, {size:.1f}MB")
            
            if not result.get('success', False) and 'error' in result:
                print(f"      Error: {result['error']}")
        
        # Cleanup summary
        if 'cleanup' in backup_session:
            cleanup = backup_session['cleanup']
            deleted_count = len(cleanup.get('deleted_files', []))
            freed_space = cleanup.get('freed_space_mb', 0)
            
            print(f"\\n🧹 Cleanup Summary:")
            print(f"   Deleted Files: {deleted_count}")
            print(f"   Freed Space: {freed_space:.1f}MB")
            print(f"   Retention: {cleanup.get('retention_days', 30)} days")
        
        # Overall status
        overall_success = summary['failure_count'] == 0
        status_message = "✅ ALL BACKUPS SUCCESSFUL" if overall_success else f"⚠️ {summary['failure_count']} COMPONENTS FAILED"
        
        print(f"\\n🎯 Overall Status: {status_message}")
        
        if overall_success:
            print("   All system components backed up successfully")
            print("   Ready for production deployment")
        else:
            print("   Review failed components before production deployment")
        
        print("="*80)
    
    def create_disaster_recovery_guide(self) -> str:
        """Create disaster recovery documentation"""
        recovery_guide_path = self.project_root / "docs" / "DISASTER_RECOVERY_GUIDE.md"
        
        recovery_guide_content = """# BookedBarber V2 - Disaster Recovery Guide

## 🚨 Emergency Recovery Procedures

### **Immediate Response (0-15 minutes)**
1. **Assess Impact**
   - Check system status: `curl http://localhost:8000/health`
   - Review monitoring dashboard: `python monitoring/production_monitoring.py`
   - Identify affected components

2. **Emergency Contacts**
   - Development Team: [team-email]
   - Infrastructure Team: [infra-email]
   - Business Stakeholders: [business-email]

### **Database Recovery (15-30 minutes)**
1. **Database Restoration**
   ```bash
   # Stop application
   pkill -f "uvicorn main:app"
   
   # Restore from latest backup
   cp backups/6fb_booking_backup_YYYYMMDD_HHMMSS.db 6fb_booking.db
   
   # Or restore from SQL dump
   sqlite3 6fb_booking.db < backups/6fb_booking_dump_YYYYMMDD_HHMMSS.sql
   
   # Apply any missing migrations
   alembic upgrade head
   
   # Restart application
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Verify Database Integrity**
   ```bash
   # Check database consistency
   sqlite3 6fb_booking.db "PRAGMA integrity_check;"
   
   # Verify critical tables
   sqlite3 6fb_booking.db "SELECT COUNT(*) FROM appointments;"
   sqlite3 6fb_booking.db "SELECT COUNT(*) FROM users;"
   ```

### **Code Recovery (5-15 minutes)**
1. **Repository Restoration**
   ```bash
   # Clone from git bundle backup
   git clone backups/bookedbarber_code_backup_YYYYMMDD_HHMMSS.bundle recovery_repo
   
   # Or extract from tar backup
   tar -xzf backups/bookedbarber_critical_files_YYYYMMDD_HHMMSS.tar.gz
   ```

2. **Dependency Installation**
   ```bash
   cd recovery_repo/backend-v2
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### **Configuration Recovery (5-10 minutes)**
1. **Environment Setup**
   ```bash
   # Restore configuration
   cp backups/config_backup_YYYYMMDD_HHMMSS/.env.production .env
   
   # Update database URL if needed
   export DATABASE_URL="sqlite:///./6fb_booking.db"
   
   # Verify configuration
   python -c "from config import settings; print(settings.environment)"
   ```

### **Cache Recovery (2-5 minutes)**
1. **Redis Restoration**
   ```bash
   # Restart Redis
   redis-server --daemonize yes
   
   # Verify Redis connection
   redis-cli ping
   
   # Clear cache if needed
   redis-cli FLUSHALL
   ```

### **Monitoring Recovery (2-5 minutes)**
1. **Health Check Verification**
   ```bash
   # Test health endpoint
   curl http://localhost:8000/health
   
   # Run monitoring dashboard
   python monitoring/production_monitoring.py
   
   # Verify all systems
   python tests/load_testing/load_test_suite.py
   ```

## 🔄 Recovery Testing Procedures

### **Monthly Recovery Tests**
1. **Database Recovery Test**
   - Restore database from backup
   - Verify data integrity
   - Test application functionality

2. **Full System Recovery Test**
   - Complete environment restoration
   - End-to-end functionality testing
   - Performance validation

### **Recovery Time Objectives (RTO)**
- **Database Recovery**: 30 minutes
- **Code Recovery**: 15 minutes  
- **Configuration Recovery**: 10 minutes
- **Total System Recovery**: 45 minutes

### **Recovery Point Objectives (RPO)**
- **Database**: 1 hour (hourly backups)
- **Code**: 1 day (daily git bundles)
- **Configuration**: 1 day (daily config backups)

## 📞 Escalation Procedures

### **Level 1: Automated Recovery**
- Health check failures trigger automatic restart
- Cache clearing for performance issues
- Log rotation for disk space issues

### **Level 2: Manual Intervention**
- Database restoration from backups
- Configuration updates
- Performance optimization

### **Level 3: Emergency Response**
- Complete system rebuild
- Data migration procedures
- Business continuity activation

## 📋 Post-Recovery Checklist

1. **System Verification**
   - [ ] Database integrity confirmed
   - [ ] All services operational
   - [ ] Performance metrics normal
   - [ ] Security configurations intact

2. **Business Verification**
   - [ ] Booking system functional
   - [ ] Walk-in queue operational
   - [ ] Mobile experience working
   - [ ] Payment processing active

3. **Monitoring Setup**
   - [ ] Health checks active
   - [ ] Alerts configured
   - [ ] Performance monitoring enabled
   - [ ] Error tracking operational

4. **Documentation Update**
   - [ ] Incident documented
   - [ ] Recovery procedures updated
   - [ ] Lessons learned recorded
   - [ ] Team notification sent

## 🎯 Prevention Measures

### **Proactive Monitoring**
- Real-time health checks
- Performance monitoring
- Error rate tracking
- Resource utilization alerts

### **Regular Maintenance**
- Weekly backup verification
- Monthly recovery testing
- Quarterly security updates
- Annual disaster recovery drills

### **System Hardening**
- Database connection pooling
- Redis cluster configuration
- Load balancer setup
- CDN implementation

---

**Remember: The best disaster recovery is disaster prevention. Monitor proactively and maintain regularly.**
"""
        
        with open(recovery_guide_path, 'w') as f:
            f.write(recovery_guide_content)
        
        logger.info(f"✅ Disaster recovery guide created: {recovery_guide_path}")
        return str(recovery_guide_path)

def main():
    """Run comprehensive backup and recovery setup"""
    manager = BackupRecoveryManager()
    
    # Create comprehensive backup
    backup_result = manager.create_comprehensive_backup()
    
    # Create disaster recovery guide
    recovery_guide = manager.create_disaster_recovery_guide()
    
    print(f"\\n📄 Disaster Recovery Guide: {recovery_guide}")
    print(f"📁 Backup Directory: {manager.backup_dir}")
    
    return backup_result['summary']['failure_count'] == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)