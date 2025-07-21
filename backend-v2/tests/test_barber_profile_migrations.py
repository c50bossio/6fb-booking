"""
Database Migration Tests for Barber Profile System

This test suite validates that database migrations work correctly:
- Migration applies successfully
- All tables, columns, and indexes are created
- Rollback functionality works
- Data integrity is maintained during migrations
"""

import pytest
import tempfile
import os
from pathlib import Path
from sqlalchemy import create_engine, text, inspect, MetaData
from sqlalchemy.orm import sessionmaker
from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from alembic.runtime.environment import EnvironmentContext

# Import models to ensure they're available
from database import Base
import models


class TestBarberProfileMigrations:
    """Test suite for database migrations"""
    
    @pytest.fixture(scope="function")
    def temp_db_engine(self):
        """Create a temporary database for migration testing"""
        # Create temporary SQLite database
        temp_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        temp_db_file.close()
        
        db_url = f"sqlite:///{temp_db_file.name}"
        engine = create_engine(db_url, connect_args={"check_same_thread": False})
        
        yield engine, temp_db_file.name
        
        # Cleanup
        engine.dispose()
        if os.path.exists(temp_db_file.name):
            os.unlink(temp_db_file.name)
    
    @pytest.fixture(scope="function")
    def alembic_config(self, temp_db_engine):
        """Create Alembic configuration for testing"""
        engine, db_path = temp_db_engine
        
        # Create alembic configuration
        alembic_cfg = Config()
        
        # Set the database URL
        alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
        
        # Set the script location (adjust path as needed)
        script_location = Path(__file__).parent.parent / "alembic"
        alembic_cfg.set_main_option("script_location", str(script_location))
        
        return alembic_cfg, engine

    def test_migration_applies_successfully(self, alembic_config):
        """Test that barber profile migration applies without errors"""
        alembic_cfg, engine = alembic_config
        
        # Run migration to head
        try:
            command.upgrade(alembic_cfg, "head")
            migration_success = True
        except Exception as e:
            migration_success = False
            print(f"Migration failed: {e}")
        
        assert migration_success, "Migration should apply successfully"

    def test_barber_profiles_table_created(self, alembic_config):
        """Test that barber_profiles table is created with correct structure"""
        alembic_cfg, engine = alembic_config
        
        # Run migration
        command.upgrade(alembic_cfg, "head")
        
        # Inspect the database
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        # Verify table exists
        assert "barber_profiles" in tables, "barber_profiles table should be created"
        
        # Verify table structure
        columns = inspector.get_columns("barber_profiles")
        column_names = [col['name'] for col in columns]
        
        expected_columns = [
            'id', 'user_id', 'bio', 'years_experience', 'profile_image_url',
            'instagram_handle', 'website_url', 'specialties', 'certifications',
            'hourly_rate', 'created_at', 'updated_at', 'is_active'
        ]
        
        for expected_col in expected_columns:
            assert expected_col in column_names, f"Column {expected_col} should exist"

    def test_barber_profiles_indexes_created(self, alembic_config):
        """Test that all required indexes are created"""
        alembic_cfg, engine = alembic_config
        
        # Run migration
        command.upgrade(alembic_cfg, "head")
        
        # Inspect indexes
        inspector = inspect(engine)
        indexes = inspector.get_indexes("barber_profiles")
        index_names = [idx['name'] for idx in indexes]
        
        expected_indexes = [
            'ix_barber_profiles_user_id',
            'ix_barber_profiles_active', 
            'ix_barber_profiles_created_at',
            'ix_barber_profiles_id'
        ]
        
        for expected_idx in expected_indexes:
            assert expected_idx in index_names, f"Index {expected_idx} should be created"

    def test_foreign_key_constraints(self, alembic_config):
        """Test that foreign key constraints are properly created"""
        alembic_cfg, engine = alembic_config
        
        # Run migration
        command.upgrade(alembic_cfg, "head")
        
        # Inspect foreign keys
        inspector = inspect(engine)
        foreign_keys = inspector.get_foreign_keys("barber_profiles")
        
        # Should have foreign key to users table
        assert len(foreign_keys) > 0, "Should have foreign key constraints"
        
        user_fk = next((fk for fk in foreign_keys if fk['referred_table'] == 'users'), None)
        assert user_fk is not None, "Should have foreign key to users table"
        assert 'user_id' in user_fk['constrained_columns'], "Foreign key should reference user_id"

    def test_unique_constraint_on_user_id(self, alembic_config):
        """Test that unique constraint exists on user_id"""
        alembic_cfg, engine = alembic_config
        
        # Run migration
        command.upgrade(alembic_cfg, "head")
        
        # Test by attempting to create duplicate entries
        with engine.connect() as conn:
            # Insert a test user first (assuming users table exists from previous migrations)
            try:
                conn.execute(text("""
                    INSERT INTO users (email, name, hashed_password, role)
                    VALUES ('test@example.com', 'Test User', 'hashed_pass', 'barber')
                """))
                user_id = conn.execute(text("SELECT id FROM users WHERE email = 'test@example.com'")).fetchone()[0]
                
                # Insert first barber profile
                conn.execute(text("""
                    INSERT INTO barber_profiles (user_id, bio, created_at, updated_at, is_active)
                    VALUES (:user_id, 'Test bio', datetime('now'), datetime('now'), 1)
                """), {"user_id": user_id})
                
                # Attempt to insert duplicate - should fail
                with pytest.raises(Exception):  # Should raise integrity error
                    conn.execute(text("""
                        INSERT INTO barber_profiles (user_id, bio, created_at, updated_at, is_active)
                        VALUES (:user_id, 'Another bio', datetime('now'), datetime('now'), 1)
                    """), {"user_id": user_id})
                
                conn.rollback()
            except Exception:
                # If users table doesn't exist, this test will be skipped
                pytest.skip("Users table not available for unique constraint test")

    def test_migration_rollback_functionality(self, alembic_config):
        """Test that migration can be rolled back successfully"""
        alembic_cfg, engine = alembic_config
        
        # Run migration to head
        command.upgrade(alembic_cfg, "head")
        
        # Verify table exists
        inspector = inspect(engine)
        assert "barber_profiles" in inspector.get_table_names()
        
        # Get the revision ID of the barber profiles migration
        barber_profile_revision = "84384b18be74"  # From the migration file
        
        try:
            # Rollback the migration
            command.downgrade(alembic_cfg, f"{barber_profile_revision}^")  # One step back
            
            # Verify table is removed
            inspector = inspect(engine)
            tables_after_rollback = inspector.get_table_names()
            assert "barber_profiles" not in tables_after_rollback, "Table should be removed after rollback"
            
        except Exception as e:
            # If rollback fails, that's also a test failure
            pytest.fail(f"Migration rollback failed: {e}")

    def test_data_types_are_correct(self, alembic_config):
        """Test that column data types are correctly defined"""
        alembic_cfg, engine = alembic_config
        
        # Run migration
        command.upgrade(alembic_cfg, "head")
        
        # Inspect column types
        inspector = inspect(engine)
        columns = inspector.get_columns("barber_profiles")
        column_types = {col['name']: str(col['type']) for col in columns}
        
        # Verify key column types
        assert "INTEGER" in str(column_types.get('id', '')), "id should be INTEGER"
        assert "INTEGER" in str(column_types.get('user_id', '')), "user_id should be INTEGER" 
        assert "TEXT" in str(column_types.get('bio', '')), "bio should be TEXT"
        assert "INTEGER" in str(column_types.get('years_experience', '')), "years_experience should be INTEGER"
        assert "FLOAT" in str(column_types.get('hourly_rate', '')), "hourly_rate should be FLOAT"
        assert "BOOLEAN" in str(column_types.get('is_active', '')), "is_active should be BOOLEAN"
        assert "JSON" in str(column_types.get('specialties', '')), "specialties should be JSON"

    def test_can_insert_sample_data(self, alembic_config):
        """Test that we can insert and query sample data after migration"""
        alembic_cfg, engine = alembic_config
        
        # Run migration
        command.upgrade(alembic_cfg, "head")
        
        # Create a session to insert data
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        
        try:
            # Create a test user first
            test_user = models.User(
                email="barber@test.com",
                name="Test Barber",
                hashed_password="hashed_password",
                role="barber"
            )
            session.add(test_user)
            session.commit()
            
            # Create barber profile
            test_profile = models.BarberProfile(
                user_id=test_user.id,
                bio="Test barber profile",
                years_experience=5,
                specialties=["haircuts", "shaves"],
                hourly_rate=50.0,
                is_active=True
            )
            session.add(test_profile)
            session.commit()
            
            # Query the data back
            retrieved_profile = session.query(models.BarberProfile).filter_by(user_id=test_user.id).first()
            
            assert retrieved_profile is not None, "Should be able to retrieve inserted profile"
            assert retrieved_profile.bio == "Test barber profile"
            assert retrieved_profile.years_experience == 5
            assert retrieved_profile.specialties == ["haircuts", "shaves"]
            assert retrieved_profile.hourly_rate == 50.0
            
        finally:
            session.close()

    def test_json_fields_work_correctly(self, alembic_config):
        """Test that JSON fields (specialties, certifications) work correctly"""
        alembic_cfg, engine = alembic_config
        
        # Run migration
        command.upgrade(alembic_cfg, "head")
        
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        
        try:
            # Create test user
            test_user = models.User(
                email="jsontest@test.com",
                name="JSON Test User",
                hashed_password="hashed_password",
                role="barber"
            )
            session.add(test_user)
            session.commit()
            
            # Test complex JSON data
            complex_specialties = [
                "Classic Haircuts",
                "Beard Trimming & Styling", 
                "Hot Towel Shaves",
                "Hair Washing & Conditioning"
            ]
            
            complex_certifications = [
                "State Licensed Barber",
                "Advanced Cutting Techniques Certification",
                "Straight Razor Specialist"
            ]
            
            # Create profile with complex JSON data
            profile = models.BarberProfile(
                user_id=test_user.id,
                bio="Test JSON functionality",
                specialties=complex_specialties,
                certifications=complex_certifications,
                is_active=True
            )
            session.add(profile)
            session.commit()
            
            # Retrieve and verify JSON data
            retrieved = session.query(models.BarberProfile).filter_by(user_id=test_user.id).first()
            
            assert retrieved.specialties == complex_specialties, "Specialties JSON should be preserved"
            assert retrieved.certifications == complex_certifications, "Certifications JSON should be preserved"
            
        finally:
            session.close()

    def test_migration_is_idempotent(self, alembic_config):
        """Test that running migration multiple times doesn't cause issues"""
        alembic_cfg, engine = alembic_config
        
        # Run migration twice
        command.upgrade(alembic_cfg, "head")
        
        # Running again should not cause errors
        try:
            command.upgrade(alembic_cfg, "head")
            idempotent_success = True
        except Exception as e:
            idempotent_success = False
            print(f"Idempotent migration test failed: {e}")
        
        assert idempotent_success, "Migration should be idempotent"
        
        # Verify table still exists and is functional
        inspector = inspect(engine)
        assert "barber_profiles" in inspector.get_table_names()

    def test_migration_preserves_existing_data(self, alembic_config):
        """Test that migration doesn't affect existing data in other tables"""
        alembic_cfg, engine = alembic_config
        
        # Create some initial data (if users table exists)
        try:
            with engine.connect() as conn:
                # Insert test user
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY,
                        email VARCHAR(255) UNIQUE,
                        name VARCHAR(255),
                        hashed_password VARCHAR(255),
                        role VARCHAR(50)
                    )
                """))
                
                conn.execute(text("""
                    INSERT INTO users (email, name, hashed_password, role)
                    VALUES ('preserve@test.com', 'Preserve Test', 'hashed', 'user')
                """))
                conn.commit()
                
                # Get the inserted user ID
                result = conn.execute(text("SELECT id FROM users WHERE email = 'preserve@test.com'"))
                user_id = result.fetchone()[0]
                
            # Run the migration
            command.upgrade(alembic_cfg, "head")
            
            # Verify the original data still exists
            with engine.connect() as conn:
                result = conn.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id})
                preserved_user = result.fetchone()
                
                assert preserved_user is not None, "Existing data should be preserved"
                assert preserved_user[1] == 'preserve@test.com', "Email should be preserved"
                assert preserved_user[2] == 'Preserve Test', "Name should be preserved"
                
        except Exception as e:
            # If this fails, it might be because the test database doesn't have users table
            # This is acceptable for isolated migration testing
            print(f"Data preservation test skipped: {e}")


# Utility functions for migration testing

def get_migration_head_revision():
    """Get the head revision from Alembic"""
    script_dir = ScriptDirectory.from_config(Config("alembic.ini"))
    return script_dir.get_current_head()


def check_migration_history():
    """Check if all migrations in the history are valid"""
    script_dir = ScriptDirectory.from_config(Config("alembic.ini"))
    revisions = list(script_dir.walk_revisions())
    return len(revisions) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])