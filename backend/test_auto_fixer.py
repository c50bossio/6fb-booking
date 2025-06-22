#!/usr/bin/env python3
"""
Test Auto-Fixer Service
A simplified version for testing without requiring API keys
"""

import os
import json
import logging
import hmac
import hashlib
from datetime import datetime
from typing import Dict
from fastapi import FastAPI, Request, HTTPException, Header
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestAutoFixer:
    """Enhanced auto-fixer with real Sentry integration"""

    def __init__(self):
        self.fix_history = []
        self.supported_error_types = [
            "database_schema",
            "authentication",
            "api_rate_limit",
            "import_error",
            "undefined_variable",
        ]
        # Load Sentry credentials from environment
        self.sentry_token = os.getenv(
            "SENTRY_INTEGRATION_TOKEN",
            "490de1a139e58fc7d8f5eae81c60ca2ea5d6a50accc247ecce4976c80d9c356a",
        )
        self.sentry_client_secret = os.getenv(
            "SENTRY_CLIENT_SECRET",
            "2f231593da004229854fa5fb98104402e3cc4ebf8d4f1cad95dde4c36bf4c818",
        )
        self.sentry_org = "bossio-solution-inc"

        logger.info(f"Initialized auto-fixer with Sentry org: {self.sentry_org}")
        logger.info(
            f"Integration token: {self.sentry_token[:20]}..."
            if self.sentry_token
            else "No token found"
        )

    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Sentry webhook signature"""
        if not self.sentry_client_secret or not signature:
            logger.warning("No signature verification - missing secret or signature")
            return True  # Allow in test mode

        try:
            expected = hmac.new(
                self.sentry_client_secret.encode(), payload, hashlib.sha256
            ).hexdigest()

            # Sentry sends signature as "sha256=<hash>"
            received = (
                signature.replace("sha256=", "")
                if signature.startswith("sha256=")
                else signature
            )

            is_valid = hmac.compare_digest(expected, received)
            logger.info(
                f"Signature verification: {'✅ Valid' if is_valid else '❌ Invalid'}"
            )
            return is_valid

        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            return False

    def classify_error(self, error_message: str) -> str:
        """Simple error classification for testing"""
        error_lower = error_message.lower()

        if "column" in error_lower and "does not exist" in error_lower:
            return "database_schema"
        elif "could not validate credentials" in error_lower:
            return "authentication"
        elif "rate limit" in error_lower:
            return "api_rate_limit"
        elif "modulenotfounderror" in error_lower or "importerror" in error_lower:
            return "import_error"
        elif "is not defined" in error_lower or "nameerror" in error_lower:
            return "undefined_variable"
        else:
            return "unknown"

    async def process_sentry_error(self, webhook_data: Dict) -> Dict:
        """Process Sentry error webhook (test version)"""
        try:
            # Extract error information
            issue_data = webhook_data.get("data", {}).get("issue", {})
            error_message = issue_data.get("title", "")
            project = issue_data.get("project", {}).get("name", "unknown")

            # Classify the error
            error_type = self.classify_error(error_message)

            if error_type == "unknown":
                return {
                    "status": "ignored",
                    "reason": "Error pattern not recognized for auto-fixing",
                    "error_message": error_message,
                }

            # Simulate analysis and fix application
            fix_confidence = (
                85 if error_type in ["database_schema", "api_rate_limit"] else 65
            )
            auto_fixable = error_type in [
                "database_schema",
                "api_rate_limit",
                "import_error",
            ]

            if auto_fixable and fix_confidence > 70:
                # Simulate successful fix
                fix_result = {
                    "status": "fix_applied",
                    "error_type": error_type,
                    "fix_description": f"Applied automatic fix for {error_type}",
                    "confidence": fix_confidence,
                    "project": project,
                    "timestamp": datetime.now().isoformat(),
                }

                # Record in history
                self.fix_history.append(
                    {
                        "timestamp": datetime.now().isoformat(),
                        "error_type": error_type,
                        "success": True,
                        "message": f"Successfully fixed {error_type} error",
                        "project": project,
                    }
                )

                logger.info(f"Simulated fix applied for {error_type}: {error_message}")
                return fix_result
            else:
                return {
                    "status": "fix_recommendation",
                    "error_type": error_type,
                    "requires_review": True,
                    "confidence": fix_confidence,
                    "reason": f"Confidence too low or manual review required",
                }

        except Exception as e:
            logger.error(f"Error processing Sentry webhook: {e}")
            return {"status": "processing_error", "error": str(e)}


# FastAPI app
app = FastAPI(title="Test Sentry Auto-Fixer", version="1.0.0")
test_fixer = TestAutoFixer()


@app.post("/sentry/webhook")
async def handle_sentry_webhook(
    request: Request,
    sentry_hook_signature: str = Header(None, alias="sentry-hook-signature"),
):
    """Handle incoming Sentry webhook for error alerts"""
    try:
        # Get raw payload for signature verification
        raw_payload = await request.body()

        # Verify signature if provided
        if sentry_hook_signature:
            if not test_fixer.verify_signature(raw_payload, sentry_hook_signature):
                logger.warning("Invalid webhook signature - rejecting request")
                raise HTTPException(status_code=401, detail="Invalid signature")

        # Parse payload
        payload = json.loads(raw_payload.decode())
        logger.info(f"✅ Received valid Sentry webhook")
        logger.info(f"Event: {payload.get('action', 'unknown')}")
        logger.info(
            f"Issue: {payload.get('data', {}).get('issue', {}).get('title', 'Unknown')}"
        )

        # Process the error
        result = await test_fixer.process_sentry_error(payload)

        logger.info(f"🎯 Processing result: {result.get('status', 'unknown')}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status")
async def get_status():
    """Get auto-fixer status and recent fixes"""
    return {
        "status": "running",
        "mode": "test",
        "recent_fixes": test_fixer.fix_history[-10:],
        "total_fixes": len(test_fixer.fix_history),
        "supported_error_types": test_fixer.supported_error_types,
        "active_fixes": 0,
    }


@app.get("/fix-history")
async def get_fix_history():
    """Get complete fix history"""
    return {
        "total_fixes": len(test_fixer.fix_history),
        "history": test_fixer.fix_history,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0-test",
    }


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "message": "Sentry Auto-Fixer Test Service",
        "version": "1.0.0-test",
        "endpoints": {
            "webhook": "/sentry/webhook",
            "status": "/status",
            "history": "/fix-history",
            "health": "/health",
        },
        "documentation": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    print("🤖 Starting Test Sentry Auto-Fixer...")
    print("🌐 Service will run on http://localhost:8003")
    print("📊 Dashboard available at http://localhost:8003/docs")
    uvicorn.run(app, host="0.0.0.0", port=8003)
