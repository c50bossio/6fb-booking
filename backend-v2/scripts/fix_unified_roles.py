#!/usr/bin/env python3
"""
Fix unified roles for users based on their original role/user_type combination.
This script ensures the role mapping follows the intended hierarchy.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection
DATABASE_URL = "sqlite:///6fb_booking.db"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Role mapping based on the original migration intent
ROLE_MAPPING = {
    # System admin roles
    ('admin', 'client'): 'super_admin',
    ('admin', 'barber'): 'super_admin',
    ('admin', 'barbershop'): 'super_admin',
    
    # Business owner roles
    ('barber', 'barbershop'): 'shop_owner',
    ('user', 'barbershop'): 'shop_owner',
    
    # Individual barber roles
    ('barber', 'barber'): 'individual_barber',
    ('user', 'barber'): 'individual_barber',
    
    # Staff barber roles
    ('barber', 'client'): 'barber',
    
    # Client roles
    ('user', 'client'): 'client',
    ('client', 'client'): 'client',
}

def fix_unified_roles():
    """Fix unified roles for all users."""
    session = Session()
    
    try:
        # Get current state
        result = session.execute(text("""
            SELECT role, user_type, unified_role, COUNT(*) as count 
            FROM users 
            GROUP BY role, user_type, unified_role
        """))
        
        logger.info("Current role distribution:")
        for row in result:
            logger.info(f"  role={row.role}, user_type={row.user_type}, unified_role={row.unified_role}, count={row.count}")
        
        # Apply role mapping
        updates_made = 0
        for (old_role, old_user_type), new_unified_role in ROLE_MAPPING.items():
            result = session.execute(text("""
                UPDATE users 
                SET unified_role = :new_role, role_migrated = 1
                WHERE role = :old_role 
                AND user_type = :old_user_type
                AND unified_role != :new_role
            """), {
                'new_role': new_unified_role,
                'old_role': old_role,
                'old_user_type': old_user_type
            })
            
            if result.rowcount > 0:
                logger.info(f"Updated {result.rowcount} users: role={old_role}, user_type={old_user_type} -> unified_role={new_unified_role}")
                updates_made += result.rowcount
        
        # Handle any users with NULL values
        result = session.execute(text("""
            UPDATE users 
            SET unified_role = 'client', role_migrated = 1
            WHERE unified_role IS NULL OR unified_role = ''
        """))
        
        if result.rowcount > 0:
            logger.info(f"Updated {result.rowcount} users with NULL/empty unified_role to 'client'")
            updates_made += result.rowcount
        
        session.commit()
        
        # Show final state
        result = session.execute(text("""
            SELECT role, user_type, unified_role, COUNT(*) as count 
            FROM users 
            GROUP BY role, user_type, unified_role
        """))
        
        logger.info(f"\nFinal role distribution (total updates: {updates_made}):")
        for row in result:
            logger.info(f"  role={row.role}, user_type={row.user_type}, unified_role={row.unified_role}, count={row.count}")
        
        # Show specific admin and barber users
        result = session.execute(text("""
            SELECT id, email, role, user_type, unified_role 
            FROM users 
            WHERE role IN ('admin', 'barber')
            ORDER BY role, email
        """))
        
        logger.info("\nAdmin and barber users:")
        for row in result:
            logger.info(f"  id={row.id}, email={row.email}, role={row.role}, user_type={row.user_type}, unified_role={row.unified_role}")
        
    except Exception as e:
        logger.error(f"Error fixing roles: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    logger.info("Starting unified role fix...")
    fix_unified_roles()
    logger.info("Unified role fix completed!")