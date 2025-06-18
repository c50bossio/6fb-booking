"""
WebSocket endpoints for real-time notifications
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
import jwt
from typing import Optional

from config.database import get_db
from config.settings import settings
from models.user import User
from websocket.connection_manager import manager
from utils.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


async def get_current_user_ws(
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Authenticate WebSocket connection via query parameter"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        email = payload.get("sub")
        if not email:
            return None
        
        user = db.query(User).filter(User.email == email).first()
        return user
    except jwt.PyJWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """Main WebSocket endpoint for real-time notifications"""
    
    # Authenticate user
    user = await get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    # Connect user
    await manager.connect(
        websocket,
        user_id=user.id,
        location_id=user.primary_location_id
    )
    
    try:
        # Handle messages
        await manager.handle_message(websocket, user.id)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"User {user.id} disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(websocket)


@router.get("/ws/status")
async def websocket_status():
    """Get WebSocket connection statistics"""
    return {
        "status": "active",
        "connections": manager.get_connection_count()
    }