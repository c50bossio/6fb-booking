"""
Simple test endpoint to verify OAuth flow without authentication
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.payment_split_service import PaymentSplitService
import secrets

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/test-oauth/{platform}")
async def test_oauth(platform: str):
    """Test OAuth URL generation"""
    try:
        service = PaymentSplitService()
        state = secrets.token_urlsafe(32)
        
        if platform.lower() == "stripe":
            oauth_url = service.create_stripe_connect_oauth_url(barber_id=1, state=state)
        elif platform.lower() == "square":
            oauth_url = service.create_square_oauth_url(barber_id=1, state=state)
        else:
            return {"error": "Platform must be 'stripe' or 'square'"}
            
        return {
            "success": True,
            "oauth_url": oauth_url,
            "platform": platform,
            "state_token": state
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)