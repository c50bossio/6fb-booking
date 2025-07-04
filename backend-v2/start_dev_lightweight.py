#!/usr/bin/env python3
"""
Lightweight development server startup script
Ensures minimal middleware configuration for development
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_dev_environment():
    """Set up development environment with minimal middleware"""
    # Load environment variables
    load_dotenv()
    
    # Force development mode
    os.environ["ENVIRONMENT"] = "development"
    os.environ["ENABLE_DEVELOPMENT_MODE"] = "true"
    os.environ["DEBUG"] = "true"
    
    logger.info("🔧 Development environment configured")
    logger.info("⚡ Lightweight middleware mode enabled")
    
    # Disable heavy middleware components
    logger.info("❌ Disabled: RequestValidationMiddleware")
    logger.info("❌ Disabled: MultiTenancyMiddleware") 
    logger.info("❌ Disabled: FinancialSecurityMiddleware")
    logger.info("❌ Disabled: MFAEnforcementMiddleware")
    logger.info("❌ Disabled: SentryEnhancementMiddleware")
    logger.info("✅ Enabled: SecurityHeadersMiddleware only")

def main():
    """Main startup function"""
    try:
        setup_dev_environment()
        
        # Import and run the FastAPI app
        logger.info("🚀 Starting FastAPI server with lightweight middleware...")
        
        # Use uvicorn to run the server
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
        
    except KeyboardInterrupt:
        logger.info("👋 Server shutdown requested")
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()