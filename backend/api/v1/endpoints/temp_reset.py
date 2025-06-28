"""
Temporary password reset endpoint - REMOVE AFTER USE
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from passlib.context import CryptContext
from datetime import datetime
import os

from config.database import get_db

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("/reset-admin-password")
async def reset_admin_password(secret: str, db: Session = Depends(get_db)):
    """One-time password reset - REMOVE THIS ENDPOINT AFTER USE"""

    # Simple secret check
    if secret != "reset-6fb-admin-2024":
        raise HTTPException(status_code=404, detail="Not found")

    try:
        # Find admin user
        result = db.execute(
            text(
                """
            SELECT id, email, first_name, last_name
            FROM users
            WHERE email = 'c50bossio@gmail.com'
        """
            )
        )

        user = result.fetchone()

        if user:
            # Reset password
            new_password = "admin123"
            hashed_password = pwd_context.hash(new_password)

            db.execute(
                text(
                    """
                UPDATE users
                SET hashed_password = :password,
                    is_active = true,
                    updated_at = :updated_at
                WHERE id = :user_id
            """
                ),
                {
                    "password": hashed_password,
                    "user_id": user.id,
                    "updated_at": datetime.utcnow(),
                },
            )

            db.commit()

            return {
                "status": "success",
                "message": "Password reset successfully",
                "email": user.email,
                "new_password": "admin123",
                "user": f"{user.first_name} {user.last_name}",
            }
        else:
            # Create admin
            hashed_password = pwd_context.hash("admin123")

            result = db.execute(
                text(
                    """
                INSERT INTO users (
                    email, hashed_password, first_name, last_name,
                    role, is_active, created_at, updated_at
                ) VALUES (
                    :email, :password, :first_name, :last_name,
                    :role, :is_active, :created_at, :updated_at
                ) RETURNING id
            """
                ),
                {
                    "email": "c50bossio@gmail.com",
                    "password": hashed_password,
                    "first_name": "Admin",
                    "last_name": "User",
                    "role": "admin",
                    "is_active": True,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                },
            )

            user_id = result.scalar()
            db.commit()

            return {
                "status": "success",
                "message": "Admin account created",
                "email": "c50bossio@gmail.com",
                "new_password": "admin123",
                "user_id": user_id,
            }

    except Exception as e:
        return {"status": "error", "message": str(e)}
