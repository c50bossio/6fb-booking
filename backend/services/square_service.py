"""
Simplified Square Service for OAuth and basic operations
"""

import os
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class SquareService:
    """Simplified Square service for payment splits"""

    def __init__(self):
        # Square SDK is optional - only initialize if token is provided
        self.client = None
        self.enabled = False

        access_token = os.getenv("SQUARE_ACCESS_TOKEN")
        if access_token:
            try:
                from square.client import Client

                self.client = Client(
                    access_token=access_token,
                    environment=os.getenv("SQUARE_ENVIRONMENT", "sandbox"),
                )
                self.enabled = True
                logger.info("Square service initialized successfully")
            except ImportError:
                logger.warning("Square SDK not installed. Square features disabled.")
            except Exception as e:
                logger.error(f"Failed to initialize Square client: {e}")

    def test_connection(self) -> bool:
        """Test if Square connection works"""
        if not self.enabled or not self.client:
            return False

        try:
            # Try to get locations as a simple test
            result = self.client.locations.list_locations()
            return result.is_success()
        except:
            return False

    def get_merchant_info(self) -> Optional[Dict]:
        """Get basic merchant info"""
        if not self.enabled or not self.client:
            return None

        try:
            result = self.client.merchants.retrieve_merchant("me")
            if result.is_success():
                return result.body
            return None
        except:
            return None


# Create a singleton instance
square_service = SquareService()
