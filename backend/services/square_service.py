"""
Simplified Square Service for OAuth and basic operations
"""

import os
from typing import Dict, Optional
from square.client import Client


class SquareService:
    """Simplified Square service for payment splits"""

    def __init__(self):
        self.client = Client(
            access_token=os.getenv("SQUARE_ACCESS_TOKEN"),
            environment=os.getenv("SQUARE_ENVIRONMENT", "sandbox"),
        )

    def test_connection(self) -> bool:
        """Test if Square connection works"""
        try:
            # Try to get locations as a simple test
            result = self.client.locations.list_locations()
            return result.is_success()
        except:
            return False

    def get_merchant_info(self) -> Optional[Dict]:
        """Get basic merchant info"""
        try:
            result = self.client.merchants.retrieve_merchant("me")
            if result.is_success():
                return result.body
            return None
        except:
            return None


# Create a singleton instance
square_service = SquareService()
