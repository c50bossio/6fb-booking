#!/usr/bin/env python3
"""Test simple barbers endpoint"""

from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import get_db
import models

app = FastAPI()

@app.get("/test-barbers")
def get_test_barbers(db: Session = Depends(get_db)):
    """Simple test endpoint for barbers"""
    try:
        barbers = db.query(models.User).filter(
            models.User.role.in_(["barber", "admin", "super_admin"]),
            models.User.is_active == True
        ).all()
        
        # Return simple dict instead of Pydantic model
        result = []
        for barber in barbers:
            result.append({
                "id": barber.id,
                "name": barber.name,
                "email": barber.email,
                "role": barber.role,
                "created_at": str(barber.created_at) if barber.created_at else None
            })
            
        return {"barbers": result, "count": len(result)}
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)