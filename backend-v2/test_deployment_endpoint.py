"""
Simple test endpoint to verify deployment is working
"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/deployment-test")
async def deployment_test():
    """Test endpoint to verify deployment status"""
    return {
        "status": "deployment_test_active",
        "message": "This endpoint confirms our code is being deployed",
        "timestamp": datetime.now().isoformat(),
        "deployment_id": "fc8a78799_test_2025_07_26",
        "v2_endpoints_should_work": True
    }