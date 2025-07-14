# Database Optimization Strategy - BookedBarber V2

## Executive Summary

This document outlines the comprehensive database optimization strategy for BookedBarber V2, focusing on migration from SQLite to PostgreSQL, implementation of connection pooling, indexing optimization, and scaling to support 10,000+ concurrent users.

## Current State Analysis

### Current Database Setup
- **Development**: SQLite (`6fb_booking.db`)
- **Cloud Staging**: PostgreSQL staging cluster
- **Production Target**: PostgreSQL with high availability
- **ORM**: SQLAlchemy with declarative models
- **Migrations**: Alembic-based migration system

### Database Schema Overview
Based on analysis of `models.py`, the system includes:
- **Core Tables**: Users, Appointments, Payments, Organizations
- **Advanced Features**: MFA, Reviews, Cancellations, Analytics
- **Integration Data**: Stripe accounts, Google Calendar, Marketing
- **Security**: Encrypted fields for sensitive data
- **Multi-tenancy**: Location-based data separation

### Current Limitations
1. **SQLite Constraints**:
   - Single writer limitation
   - No concurrent write operations
   - Limited to ~100 concurrent readers
   - No built-in replication
   - File-based storage limitations

2. **Performance Issues**:
   - No connection pooling
   - No query optimization for complex joins
   - Limited indexing strategies
   - No read replica support

3. **Scalability Concerns**:
   - Cannot handle 10,000+ concurrent users
   - No horizontal scaling capability
   - Single point of failure

## Migration Strategy: SQLite → PostgreSQL

### Phase 1: Infrastructure Preparation (Week 1-2)

#### 1.1 PostgreSQL Setup
```bash
# Development Environment
# Install PostgreSQL locally
brew install postgresql@15
brew services start postgresql@15

# Create development database
createdb bookedbarber_dev
createuser --interactive bookedbarber_dev_user
```

#### 1.2 Connection Configuration
```python
# config.py updates
class Settings(BaseSettings):
    # Database configuration with automatic environment detection
    database_url: str = "sqlite:///./6fb_booking.db"  # Default for dev
    
    # PostgreSQL configuration
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "bookedbarber_dev_user"
    postgres_password: str = ""  # Set via environment
    postgres_database: str = "bookedbarber_dev"
    postgres_ssl_mode: str = "prefer"
    
    # Connection pooling
    postgres_pool_size: int = 20
    postgres_max_overflow: int = 30
    postgres_pool_timeout: int = 30
    postgres_pool_recycle: int = 3600
    
    @property
    def postgres_url(self) -> str:
        """Generate PostgreSQL connection URL"""
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_database}?sslmode={self.postgres_ssl_mode}"
    
    def get_database_url(self) -> str:
        """Return appropriate database URL based on environment"""
        if self.environment == "production" or self.environment == "staging":
            return self.postgres_url
        elif os.getenv("USE_POSTGRES", "false").lower() == "true":
            return self.postgres_url
        else:
            return self.database_url
```

#### 1.3 Database Engine Configuration
```python
# database.py updates
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool
from config import settings

def get_database_engine():
    """Create database engine with appropriate configuration"""
    db_url = settings.get_database_url()
    
    if db_url.startswith("postgresql"):
        # PostgreSQL configuration with connection pooling
        engine = create_engine(
            db_url,
            poolclass=QueuePool,
            pool_size=settings.postgres_pool_size,
            max_overflow=settings.postgres_max_overflow,
            pool_timeout=settings.postgres_pool_timeout,
            pool_recycle=settings.postgres_pool_recycle,
            pool_pre_ping=True,  # Validate connections
            echo=settings.debug,
            connect_args={
                "options": "-c timezone=utc",
                "application_name": "bookedbarber_v2",
                "connect_timeout": 10,
            }
        )
    else:
        # SQLite configuration (development only)
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            echo=settings.debug
        )
    
    return engine
```

### Phase 2: Data Migration (Week 2-3)

#### 2.1 Migration Scripts
```python
# migrations/migrate_sqlite_to_postgres.py
import asyncio
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import *
import json

class DatabaseMigrator:
    def __init__(self, sqlite_url: str, postgres_url: str):
        self.sqlite_engine = create_engine(sqlite_url)
        self.postgres_engine = create_engine(postgres_url)
        
        self.sqlite_session = sessionmaker(bind=self.sqlite_engine)
        self.postgres_session = sessionmaker(bind=self.postgres_engine)
    
    async def migrate_all_data(self):
        """Migrate all data from SQLite to PostgreSQL"""
        try:
            # Create all tables in PostgreSQL
            Base.metadata.create_all(self.postgres_engine)
            
            # Migration order (respecting foreign key constraints)
            migration_order = [
                User,
                Organization,
                BarbershopLocation,
                Service,
                Appointment,
                Payment,
                Payout,
                Review,
                # Add other models...
            ]
            
            for model in migration_order:
                await self.migrate_table(model)
                
            print("✅ Migration completed successfully")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise
    
    async def migrate_table(self, model_class):
        """Migrate a specific table"""
        table_name = model_class.__tablename__
        print(f"Migrating {table_name}...")
        
        with self.sqlite_session() as sqlite_session:
            with self.postgres_session() as postgres_session:
                # Read all records from SQLite
                records = sqlite_session.query(model_class).all()
                
                # Batch insert into PostgreSQL
                batch_size = 1000
                for i in range(0, len(records), batch_size):
                    batch = records[i:i + batch_size]
                    postgres_session.bulk_save_objects(batch)
                    postgres_session.commit()
                
                print(f"✅ Migrated {len(records)} records from {table_name}")

# Usage
migrator = DatabaseMigrator(
    sqlite_url="sqlite:///./6fb_booking.db",
    postgres_url="postgresql://user:pass@localhost/bookedbarber_dev"
)
asyncio.run(migrator.migrate_all_data())
```

#### 2.2 Data Validation
```python
# scripts/validate_migration.py
class MigrationValidator:
    def __init__(self, sqlite_url: str, postgres_url: str):
        self.sqlite_engine = create_engine(sqlite_url)
        self.postgres_engine = create_engine(postgres_url)
    
    def validate_record_counts(self):
        """Validate that record counts match"""
        models_to_check = [User, Appointment, Payment, Organization]
        
        for model in models_to_check:
            sqlite_count = self.get_count(self.sqlite_engine, model)
            postgres_count = self.get_count(self.postgres_engine, model)
            
            if sqlite_count == postgres_count:
                print(f"✅ {model.__tablename__}: {sqlite_count} records")
            else:
                print(f"❌ {model.__tablename__}: SQLite={sqlite_count}, PostgreSQL={postgres_count}")
    
    def get_count(self, engine, model):
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {model.__tablename__}"))
            return result.scalar()
```

### Phase 3: Performance Optimization (Week 3-4)

#### 3.1 Advanced Indexing Strategy
```sql
-- indexes/performance_indexes.sql
-- User table optimization
CREATE INDEX CONCURRENTLY idx_users_email_active ON users(email) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_users_role_unified ON users(unified_role);
CREATE INDEX CONCURRENTLY idx_users_location_role ON users(location_id, unified_role);
CREATE INDEX CONCURRENTLY idx_users_trial_status ON users(trial_active, trial_expires_at);

-- Appointment table optimization  
CREATE INDEX CONCURRENTLY idx_appointments_user_status ON appointments(user_id, status);
CREATE INDEX CONCURRENTLY idx_appointments_barber_date ON appointments(barber_id, appointment_date);
CREATE INDEX CONCURRENTLY idx_appointments_location_date ON appointments(location_id, appointment_date);
CREATE INDEX CONCURRENTLY idx_appointments_datetime_range ON appointments(appointment_date, start_time, end_time);
CREATE INDEX CONCURRENTLY idx_appointments_status_created ON appointments(status, created_at);

-- Payment table optimization
CREATE INDEX CONCURRENTLY idx_payments_user_status ON payments(user_id, status);
CREATE INDEX CONCURRENTLY idx_payments_stripe_session ON payments(stripe_session_id);
CREATE INDEX CONCURRENTLY idx_payments_created_amount ON payments(created_at, amount);

-- Location-based indexes for multi-tenancy
CREATE INDEX CONCURRENTLY idx_appointments_location_user ON appointments(location_id, user_id);
CREATE INDEX CONCURRENTLY idx_payments_location ON payments(location_id);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_users_name_search ON users USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY idx_appointments_notes_search ON appointments USING gin(to_tsvector('english', notes));
```

#### 3.2 Query Optimization
```python
# services/optimized_queries.py
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import func, and_, or_

class OptimizedQueries:
    @staticmethod
    def get_user_with_relationships(session, user_id: int):
        """Optimized user query with eager loading"""
        return session.query(User).options(
            selectinload(User.appointments),
            selectinload(User.payments),
            joinedload(User.stripe_account),
            selectinload(User.user_organizations).joinedload(UserOrganization.organization)
        ).filter(User.id == user_id).first()
    
    @staticmethod
    def get_appointments_for_barber(session, barber_id: int, date_range: tuple):
        """Optimized appointment query for barber dashboard"""
        start_date, end_date = date_range
        
        return session.query(Appointment).options(
            joinedload(Appointment.user),
            joinedload(Appointment.service),
            joinedload(Appointment.payment)
        ).filter(
            and_(
                Appointment.barber_id == barber_id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
                Appointment.status.in_(['confirmed', 'in_progress'])
            )
        ).order_by(Appointment.appointment_date, Appointment.start_time).all()
    
    @staticmethod
    def get_revenue_analytics(session, location_id: int, date_range: tuple):
        """Optimized revenue query with aggregations"""
        start_date, end_date = date_range
        
        return session.query(
            func.date(Payment.created_at).label('date'),
            func.sum(Payment.amount).label('total_revenue'),
            func.count(Payment.id).label('transaction_count'),
            func.avg(Payment.amount).label('average_transaction')
        ).filter(
            and_(
                Payment.location_id == location_id,
                Payment.status == 'completed',
                Payment.created_at >= start_date,
                Payment.created_at <= end_date
            )
        ).group_by(func.date(Payment.created_at)).all()
```

### Phase 4: Advanced Features (Week 4-5)

#### 4.1 Read Replicas Configuration
```python
# database.py - Multi-database setup
class DatabaseManager:
    def __init__(self):
        self.primary_engine = get_database_engine(settings.postgres_url)
        self.read_replica_engines = [
            get_database_engine(url) for url in settings.postgres_read_replica_urls
        ]
        
        self.primary_session = sessionmaker(bind=self.primary_engine)
        self.read_sessions = [
            sessionmaker(bind=engine) for engine in self.read_replica_engines
        ]
    
    def get_write_session(self):
        """Get session for write operations"""
        return self.primary_session()
    
    def get_read_session(self):
        """Get session for read operations (load balanced)"""
        if not self.read_sessions:
            return self.primary_session()
        
        # Simple round-robin load balancing
        import random
        return random.choice(self.read_sessions)()
    
    def get_analytics_session(self):
        """Get session for heavy analytics queries"""
        # Use dedicated analytics replica if available
        analytics_engine = getattr(settings, 'postgres_analytics_url', None)
        if analytics_engine:
            return sessionmaker(bind=create_engine(analytics_engine))()
        
        return self.get_read_session()
```

#### 4.2 Connection Pooling Optimization
```python
# database.py - Advanced connection pooling
from sqlalchemy.pool import QueuePool, StaticPool
import logging

logger = logging.getLogger(__name__)

def create_optimized_engine(database_url: str, is_primary: bool = True):
    """Create engine with optimized connection pooling"""
    
    pool_config = {
        'poolclass': QueuePool,
        'pool_size': 20 if is_primary else 10,
        'max_overflow': 30 if is_primary else 20,
        'pool_timeout': 30,
        'pool_recycle': 3600,  # Recycle connections every hour
        'pool_pre_ping': True,  # Validate connections before use
    }
    
    # Production-specific optimizations
    if settings.is_production():
        pool_config.update({
            'pool_reset_on_return': 'commit',
            'pool_timeout': 10,  # Shorter timeout in production
        })
    
    connect_args = {
        'options': '-c timezone=utc',
        'application_name': f'bookedbarber_v2_{"primary" if is_primary else "replica"}',
        'connect_timeout': 10,
        'statement_timeout': 30000,  # 30 second query timeout
        'lock_timeout': 5000,  # 5 second lock timeout
    }
    
    engine = create_engine(
        database_url,
        connect_args=connect_args,
        echo=settings.debug,
        **pool_config
    )
    
    # Configure engine events for monitoring
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if 'sqlite' in database_url:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    
    @event.listens_for(engine, "checkout")
    def receive_checkout(dbapi_connection, connection_record, connection_proxy):
        logger.debug(f"Connection checked out: {id(dbapi_connection)}")
    
    return engine
```

### Phase 5: Monitoring and Observability (Week 5-6)

#### 5.1 Database Performance Monitoring
```python
# monitoring/database_monitor.py
from sqlalchemy import event, text
from sqlalchemy.engine import Engine
import time
import logging
from prometheus_client import Counter, Histogram, Gauge

# Metrics
db_query_counter = Counter('database_queries_total', 'Total database queries', ['operation', 'table'])
db_query_duration = Histogram('database_query_duration_seconds', 'Database query duration')
db_connection_pool_size = Gauge('database_connection_pool_size', 'Connection pool size')
db_connection_pool_checked_out = Gauge('database_connection_pool_checked_out', 'Checked out connections')

class DatabaseMonitor:
    def __init__(self, engine: Engine):
        self.engine = engine
        self.setup_monitoring()
    
    def setup_monitoring(self):
        """Setup database monitoring events"""
        
        @event.listens_for(self.engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
        
        @event.listens_for(self.engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total = time.time() - context._query_start_time
            
            # Record metrics
            db_query_duration.observe(total)
            
            # Extract operation and table from statement
            operation = statement.strip().split()[0].upper()
            table = self.extract_table_name(statement)
            
            db_query_counter.labels(operation=operation, table=table).inc()
            
            # Log slow queries
            if total > 1.0:  # Queries taking more than 1 second
                logging.warning(f"Slow query detected: {total:.2f}s - {statement[:100]}...")
    
    def extract_table_name(self, statement: str) -> str:
        """Extract table name from SQL statement"""
        statement = statement.strip().upper()
        
        if statement.startswith('SELECT'):
            from_index = statement.find('FROM')
            if from_index != -1:
                words = statement[from_index + 4:].split()
                return words[0] if words else 'unknown'
        elif statement.startswith(('INSERT', 'UPDATE', 'DELETE')):
            words = statement.split()
            return words[2] if len(words) > 2 else 'unknown'
        
        return 'unknown'
    
    def get_pool_stats(self) -> dict:
        """Get connection pool statistics"""
        pool = self.engine.pool
        
        stats = {
            'size': pool.size(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'checked_in': pool.checkedin()
        }
        
        # Update Prometheus metrics
        db_connection_pool_size.set(stats['size'])
        db_connection_pool_checked_out.set(stats['checked_out'])
        
        return stats
```

#### 5.2 Health Checks
```python
# health/database_health.py
import asyncio
from sqlalchemy import text
from datetime import datetime, timedelta

class DatabaseHealthChecker:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    async def check_primary_health(self) -> dict:
        """Check primary database health"""
        try:
            with self.db_manager.get_write_session() as session:
                start_time = time.time()
                result = session.execute(text("SELECT 1")).scalar()
                response_time = time.time() - start_time
                
                return {
                    'status': 'healthy' if result == 1 else 'unhealthy',
                    'response_time': response_time,
                    'timestamp': datetime.utcnow().isoformat()
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def check_replica_health(self) -> list:
        """Check read replica health"""
        replica_health = []
        
        for i, session_maker in enumerate(self.db_manager.read_sessions):
            try:
                with session_maker() as session:
                    start_time = time.time()
                    result = session.execute(text("SELECT 1")).scalar()
                    response_time = time.time() - start_time
                    
                    replica_health.append({
                        'replica_id': i,
                        'status': 'healthy' if result == 1 else 'unhealthy',
                        'response_time': response_time,
                        'timestamp': datetime.utcnow().isoformat()
                    })
            except Exception as e:
                replica_health.append({
                    'replica_id': i,
                    'status': 'unhealthy',
                    'error': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        return replica_health
    
    async def check_data_integrity(self) -> dict:
        """Check basic data integrity"""
        checks = []
        
        # Check for orphaned records
        checks.append(await self.check_orphaned_appointments())
        checks.append(await self.check_orphaned_payments())
        
        # Check for data consistency
        checks.append(await self.check_user_appointment_consistency())
        
        return {
            'integrity_checks': checks,
            'overall_status': 'healthy' if all(c['status'] == 'passed' for c in checks) else 'issues_found'
        }
    
    async def check_orphaned_appointments(self) -> dict:
        """Check for appointments with invalid user references"""
        try:
            with self.db_manager.get_read_session() as session:
                query = text("""
                    SELECT COUNT(*) FROM appointments a
                    LEFT JOIN users u ON a.user_id = u.id
                    WHERE u.id IS NULL
                """)
                orphaned_count = session.execute(query).scalar()
                
                return {
                    'check': 'orphaned_appointments',
                    'status': 'passed' if orphaned_count == 0 else 'failed',
                    'orphaned_count': orphaned_count
                }
        except Exception as e:
            return {
                'check': 'orphaned_appointments',
                'status': 'error',
                'error': str(e)
            }
```

## Implementation Timeline

### Week 1-2: Setup and Configuration
- [ ] Install PostgreSQL in all environments
- [ ] Configure connection pooling
- [ ] Set up read replicas
- [ ] Create migration scripts

### Week 3: Data Migration
- [ ] Migrate staging environment
- [ ] Validate data integrity
- [ ] Performance testing
- [ ] Rollback procedures

### Week 4: Optimization
- [ ] Implement advanced indexing
- [ ] Query optimization
- [ ] Connection pool tuning
- [ ] Load testing

### Week 5-6: Monitoring and Production
- [ ] Deploy monitoring systems
- [ ] Set up alerting
- [ ] Production migration
- [ ] Performance validation

## Success Metrics

### Performance Targets
- **Query Response Time**: < 100ms for 95% of queries
- **Connection Pool Efficiency**: > 80% utilization without timeouts
- **Concurrent Users**: Support 10,000+ concurrent connections
- **Data Integrity**: 99.99% consistency across replicas

### Monitoring Metrics
- Database query duration and frequency
- Connection pool statistics
- Read/write operation distribution
- Error rates and timeout frequency

## Risk Management

### Identified Risks
1. **Data Loss During Migration**: Mitigated by comprehensive backup strategy
2. **Extended Downtime**: Mitigated by blue-green deployment approach
3. **Performance Degradation**: Mitigated by thorough testing and rollback plans
4. **Connection Pool Exhaustion**: Mitigated by proper sizing and monitoring

### Rollback Strategy
- Maintain SQLite backup during transition period
- Automated rollback triggers based on error rates
- Quick switch mechanism between database backends
- Data synchronization procedures for emergency rollback

---

**Status**: Phase 2 Implementation Ready  
**Next Phase**: Redis Caching Layer Implementation  
**Dependencies**: Configuration management, monitoring infrastructure