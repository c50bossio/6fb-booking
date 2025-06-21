"""
Dwolla Service for ACH transfers and barber payouts
Handles bank account verification and ACH transfers
"""

import os
from typing import Dict, Optional, List
from datetime import datetime
import dwollav2
from decimal import Decimal

from config.settings import Settings


class DwollaService:
    def __init__(self):
        self.settings = Settings()

        # Initialize Dwolla client
        self.client = dwollav2.Client(
            key=os.getenv("DWOLLA_KEY"),
            secret=os.getenv("DWOLLA_SECRET"),
            environment=os.getenv(
                "DWOLLA_ENVIRONMENT", "sandbox"
            ),  # 'sandbox' or 'production'
        )

        # Get access token
        self.app_token = self.client.Auth.client()

    def create_customer(self, barber_data: Dict) -> Dict:
        """
        Create a Dwolla customer (barber) for receiving payments
        """
        customer_data = {
            "firstName": barber_data["first_name"],
            "lastName": barber_data["last_name"],
            "email": barber_data["email"],
            "type": "receive-only",  # Can only receive payments
            "businessName": barber_data.get("business_name"),
            "ipAddress": barber_data.get("ip_address", "127.0.0.1"),
        }

        # Remove None values
        customer_data = {k: v for k, v in customer_data.items() if v is not None}

        try:
            customer = self.app_token.post("customers", customer_data)
            return {
                "id": customer.headers["location"].split("/")[-1],
                "resource_location": customer.headers["location"],
            }
        except Exception as e:
            raise Exception(f"Failed to create Dwolla customer: {str(e)}")

    def add_bank_account(self, customer_id: str, bank_data: Dict) -> Dict:
        """
        Add a bank account to a Dwolla customer using micro-deposits
        """
        bank_account_data = {
            "routingNumber": bank_data["routing_number"],
            "accountNumber": bank_data["account_number"],
            "bankAccountType": bank_data.get(
                "account_type", "checking"
            ),  # 'checking' or 'savings'
            "name": bank_data["account_name"],
        }

        try:
            customer_url = f"{self.client.base_url}/customers/{customer_id}"
            funding_source = self.app_token.post(
                f"{customer_url}/funding-sources", bank_account_data
            )

            funding_source_url = funding_source.headers["location"]

            # Initiate micro-deposits for verification
            self.app_token.post(f"{funding_source_url}/micro-deposits")

            return {
                "id": funding_source_url.split("/")[-1],
                "resource_location": funding_source_url,
                "status": "pending_verification",
            }
        except Exception as e:
            raise Exception(f"Failed to add bank account: {str(e)}")

    def verify_micro_deposits(
        self, funding_source_id: str, amount1: Decimal, amount2: Decimal
    ) -> bool:
        """
        Verify micro-deposits to activate the bank account
        """
        try:
            funding_source_url = (
                f"{self.client.base_url}/funding-sources/{funding_source_id}"
            )

            verification_data = {
                "amount1": {"value": str(amount1), "currency": "USD"},
                "amount2": {"value": str(amount2), "currency": "USD"},
            }

            self.app_token.post(
                f"{funding_source_url}/micro-deposits", verification_data
            )

            return True
        except Exception as e:
            raise Exception(f"Failed to verify micro-deposits: {str(e)}")

    def create_transfer(
        self,
        source_funding_id: str,
        dest_funding_id: str,
        amount: Decimal,
        metadata: Optional[Dict] = None,
    ) -> Dict:
        """
        Create an ACH transfer from shop owner to barber
        """
        transfer_data = {
            "_links": {
                "source": {
                    "href": f"{self.client.base_url}/funding-sources/{source_funding_id}"
                },
                "destination": {
                    "href": f"{self.client.base_url}/funding-sources/{dest_funding_id}"
                },
            },
            "amount": {"currency": "USD", "value": str(amount)},
        }

        if metadata:
            transfer_data["metadata"] = metadata

        try:
            transfer = self.app_token.post("transfers", transfer_data)
            transfer_url = transfer.headers["location"]

            # Get transfer details
            transfer_details = self.app_token.get(transfer_url)

            return {
                "id": transfer_url.split("/")[-1],
                "resource_location": transfer_url,
                "status": transfer_details.body["status"],
                "amount": amount,
                "created_at": transfer_details.body["created"],
            }
        except Exception as e:
            raise Exception(f"Failed to create transfer: {str(e)}")

    def get_transfer_status(self, transfer_id: str) -> str:
        """
        Get the status of a transfer
        """
        try:
            transfer_url = f"{self.client.base_url}/transfers/{transfer_id}"
            transfer = self.app_token.get(transfer_url)
            return transfer.body["status"]
        except Exception as e:
            raise Exception(f"Failed to get transfer status: {str(e)}")

    def create_webhook_subscription(self, url: str, secret: str) -> Dict:
        """
        Create a webhook subscription for transfer updates
        """
        webhook_data = {"url": url, "secret": secret}

        try:
            webhook = self.app_token.post("webhook-subscriptions", webhook_data)
            return {
                "id": webhook.headers["location"].split("/")[-1],
                "resource_location": webhook.headers["location"],
            }
        except Exception as e:
            raise Exception(f"Failed to create webhook subscription: {str(e)}")

    def get_balance(self, funding_source_id: str) -> Decimal:
        """
        Get the balance of a funding source (if it's a Dwolla balance)
        """
        try:
            funding_source_url = (
                f"{self.client.base_url}/funding-sources/{funding_source_id}"
            )
            balance_url = f"{funding_source_url}/balance"
            balance = self.app_token.get(balance_url)
            return Decimal(balance.body["balance"]["value"])
        except Exception as e:
            # Bank accounts don't have accessible balances
            return Decimal("0.00")

    def list_transfers(
        self, customer_id: Optional[str] = None, limit: int = 25
    ) -> List[Dict]:
        """
        List transfers for a customer or all transfers
        """
        try:
            params = {"limit": limit}

            if customer_id:
                customer_url = f"{self.client.base_url}/customers/{customer_id}"
                transfers = self.app_token.get(f"{customer_url}/transfers", params)
            else:
                transfers = self.app_token.get("transfers", params)

            return transfers.body["_embedded"]["transfers"]
        except Exception as e:
            raise Exception(f"Failed to list transfers: {str(e)}")

    def create_mass_payment(self, source_funding_id: str, payments: List[Dict]) -> Dict:
        """
        Create a mass payment to multiple barbers at once
        Payments should be a list of dicts with 'amount', 'destination_id', and 'metadata'
        """
        items = []
        total_amount = Decimal("0.00")

        for payment in payments:
            item = {
                "_links": {
                    "destination": {
                        "href": f"{self.client.base_url}/funding-sources/{payment['destination_id']}"
                    }
                },
                "amount": {"currency": "USD", "value": str(payment["amount"])},
                "metadata": payment.get("metadata", {}),
            }
            items.append(item)
            total_amount += Decimal(payment["amount"])

        mass_payment_data = {
            "_links": {
                "source": {
                    "href": f"{self.client.base_url}/funding-sources/{source_funding_id}"
                }
            },
            "items": items,
        }

        try:
            mass_payment = self.app_token.post("mass-payments", mass_payment_data)
            return {
                "id": mass_payment.headers["location"].split("/")[-1],
                "resource_location": mass_payment.headers["location"],
                "total_amount": total_amount,
                "item_count": len(items),
            }
        except Exception as e:
            raise Exception(f"Failed to create mass payment: {str(e)}")
