from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from utils.auth import get_current_user_from_token

# Re-export get_current_user for easy import
get_current_user = get_current_user_from_token