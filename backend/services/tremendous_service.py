"""
Tremendous Service for Barber Payouts
Instant payouts via ACH, PayPal, Venmo, or gift cards
No sales calls required - instant API access
"""

import os
from typing import Dict, Optional, List
from datetime import datetime
from decimal import Decimal
import requests
from requests.auth import HTTPBasicAuth

from config.settings import Settings


class TremendousService:
    """
    Tremendous is a modern payout platform that's perfect for barber commissions:
    - Instant API access (no sales calls!)
    - $0.50-$2.00 per ACH transfer (cheaper than Stripe)
    - Multiple payout methods: ACH, PayPal, Venmo, gift cards
    - Same-day or next-day payouts
    - Great for recurring payments
    """

    def __init__(self):
        self.settings = Settings()
        self.api_key = os.getenv("TREMENDOUS_API_KEY")
        self.test_mode = os.getenv("TREMENDOUS_TEST_MODE", "true") == "true"

        # Use correct URL based on environment
        if self.test_mode or (self.api_key and self.api_key.startswith("TEST_")):
            self.base_url = "https://testflight.tremendous.com/api/v2"
        else:
            self.base_url = "https://api.tremendous.com/api/v2"

        # Headers with Bearer token
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def create_funding_source(self, bank_account_data: Dict) -> Dict:
        """
        Add a funding source (your bank account) to send payouts from
        Only needs to be done once for the shop owner
        """
        endpoint = f"{self.base_url}/funding_sources"

        payload = {
            "funding_source": {
                "method": "bank_account",
                "bank_account": {
                    "account_number": bank_account_data["account_number"],
                    "routing_number": bank_account_data["routing_number"],
                    "account_type": bank_account_data.get("account_type", "checking"),
                    "account_holder_name": bank_account_data["account_holder_name"],
                },
            }
        }

        response = requests.post(endpoint, json=payload, headers=self.headers)

        if response.status_code == 201:
            return response.json()["funding_source"]
        else:
            raise Exception(f"Failed to create funding source: {response.text}")

    def create_recipient(self, barber_data: Dict) -> Dict:
        """
        Create a recipient (barber) who can receive payouts
        """
        endpoint = f"{self.base_url}/recipients"

        payload = {
            "recipient": {
                "name": f"{barber_data['first_name']} {barber_data['last_name']}",
                "email": barber_data["email"],
                "delivery_method": barber_data.get("delivery_method", "BANK_TRANSFER"),
            }
        }

        response = requests.post(endpoint, json=payload, headers=self.headers)

        if response.status_code == 201:
            return response.json()["recipient"]
        else:
            raise Exception(f"Failed to create recipient: {response.text}")

    def send_payout(self, payout_data: Dict) -> Dict:
        """
        Send a payout to a barber

        payout_data should include:
        - recipient_id: Tremendous recipient ID
        - amount: Decimal amount to send
        - currency: 'USD'
        - delivery_method: 'ACH_TRANSFER', 'PAYPAL', 'VENMO', etc.
        - funding_source_id: Your bank account ID (optional)
        - campaign_id: For tracking (optional)
        - external_id: Your internal reference (optional)
        """
        endpoint = f"{self.base_url}/orders"

        # Convert Decimal to string for JSON
        amount = str(payout_data["amount"])

        payload = {
            "payment": {"funding_source_id": payout_data.get("funding_source_id")},
            "rewards": [
                {
                    "value": {
                        "denomination": float(amount),
                        "currency_code": payout_data.get("currency", "USD"),
                    },
                    "recipient": {"id": payout_data["recipient_id"]},
                    "delivery": {
                        "method": payout_data.get("delivery_method", "BANK_TRANSFER")
                    },
                    "campaign_id": payout_data.get("campaign_id"),
                    "external_id": payout_data.get("external_id"),
                }
            ],
        }

        response = requests.post(endpoint, json=payload, headers=self.headers)

        if response.status_code == 201:
            order = response.json()["order"]
            return {
                "id": order["id"],
                "status": order["status"],
                "created_at": order["created_at"],
                "rewards": order["rewards"],
            }
        else:
            raise Exception(f"Failed to send payout: {response.text}")

    def create_campaign(self, name: str, message: str = None) -> Dict:
        """
        Create a campaign for organizing payouts (e.g., "Weekly Barber Commissions")
        """
        endpoint = f"{self.base_url}/campaigns"

        payload = {
            "campaign": {
                "name": name,
                "message": message,
                "catalog_ids": [],  # Can specify allowed reward types
            }
        }

        response = requests.post(endpoint, json=payload, headers=self.headers)

        if response.status_code == 201:
            return response.json()["campaign"]
        else:
            raise Exception(f"Failed to create campaign: {response.text}")

    def get_payout_status(self, order_id: str) -> str:
        """
        Check the status of a payout
        """
        endpoint = f"{self.base_url}/orders/{order_id}"

        response = requests.get(endpoint, headers=self.headers)

        if response.status_code == 200:
            return response.json()["order"]["status"]
        else:
            raise Exception(f"Failed to get payout status: {response.text}")

    def list_delivery_methods(self) -> List[Dict]:
        """
        Get available delivery methods (ACH, PayPal, Venmo, etc.)
        """
        endpoint = f"{self.base_url}/delivery_methods"

        response = requests.get(endpoint, headers=self.headers)

        if response.status_code == 200:
            return response.json()["delivery_methods"]
        else:
            raise Exception(f"Failed to get delivery methods: {response.text}")

    def create_webhook(self, url: str, events: List[str]) -> Dict:
        """
        Create a webhook for payout status updates

        Events: 'ORDER_CREATED', 'ORDER_APPROVED', 'REWARD_SENT', etc.
        """
        endpoint = f"{self.base_url}/webhooks"

        payload = {"webhook": {"url": url, "active": True, "events": events}}

        response = requests.post(endpoint, json=payload, headers=self.headers)

        if response.status_code == 201:
            return response.json()["webhook"]
        else:
            raise Exception(f"Failed to create webhook: {response.text}")

    def verify_webhook_signature(self, signature: str, body: str) -> bool:
        """
        Verify webhook signature for security
        """
        import hmac
        import hashlib

        # Get webhook secret from Tremendous dashboard
        webhook_secret = os.getenv("TREMENDOUS_WEBHOOK_SECRET", "")

        # Calculate expected signature
        expected_signature = hmac.new(
            webhook_secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)

    def invite_recipient_to_add_payment(self, recipient_id: str) -> Dict:
        """
        Send an email to the barber to add their preferred payment method
        They can choose ACH, PayPal, Venmo, or gift cards
        """
        endpoint = f"{self.base_url}/recipients/{recipient_id}/invitations"

        response = requests.post(endpoint, auth=self.auth, headers=self.headers)

        if response.status_code == 201:
            return {
                "success": True,
                "message": "Invitation sent to barber to add payment method",
            }
        else:
            raise Exception(f"Failed to send invitation: {response.text}")

    def batch_payout(self, payouts: List[Dict]) -> Dict:
        """
        Send multiple payouts in one API call
        More efficient for weekly barber payouts
        """
        endpoint = f"{self.base_url}/orders"

        rewards = []
        for payout in payouts:
            rewards.append(
                {
                    "value": {
                        "denomination": float(str(payout["amount"])),
                        "currency_code": "USD",
                    },
                    "recipient": {"id": payout["recipient_id"]},
                    "delivery": {
                        "method": payout.get("delivery_method", "BANK_TRANSFER")
                    },
                    "external_id": payout.get("external_id"),
                }
            )

        payload = {
            "payment": {
                "funding_source_id": payouts[0].get(
                    "funding_source_id"
                )  # Use same funding source
            },
            "rewards": rewards,
        }

        response = requests.post(endpoint, json=payload, headers=self.headers)

        if response.status_code == 201:
            order = response.json()["order"]
            return {
                "id": order["id"],
                "status": order["status"],
                "created_at": order["created_at"],
                "total_amount": sum(float(str(p["amount"])) for p in payouts),
                "reward_count": len(order["rewards"]),
            }
        else:
            raise Exception(f"Failed to send batch payout: {response.text}")
