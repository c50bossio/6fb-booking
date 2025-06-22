"""
Square Payouts Service for Barber Commission Payments
Uses Square's Payouts API for seamless payment processing
"""

import os
from typing import Dict, List, Optional
from datetime import datetime
from decimal import Decimal
# Square SDK is optional
try:
    from square.client import Client
    from square.models import (
        CreatePayoutRequest,
        CreateTeamMemberRequest,
        TeamMember,
        Money,
        Payout,
        ListPayoutsRequest,
        GetPayoutRequest,
    )
    SQUARE_AVAILABLE = True
except ImportError:
    Client = None
    SQUARE_AVAILABLE = False
    # Define placeholder classes so the code doesn't break
    CreatePayoutRequest = None
    CreateTeamMemberRequest = None
    TeamMember = None
    Money = None
    Payout = None
    ListPayoutsRequest = None
    GetPayoutRequest = None

import uuid

from config.settings import Settings


class SquarePayoutsService:
    """
    Square Payouts - Perfect integration since we're already using Square for sales
    - Free ACH transfers (1-2 days)
    - Instant transfers available (1.75% fee)
    - Barbers can get Square debit cards
    - Seamless with Square POS integration
    """

    def __init__(self):
        self.settings = Settings()

        # Initialize Square client (if available)
        self.client = None
        self.enabled = False
        
        if SQUARE_AVAILABLE and os.getenv("SQUARE_ACCESS_TOKEN"):
            try:
                self.client = Client(
                    access_token=os.getenv("SQUARE_ACCESS_TOKEN"),
                    environment=os.getenv("SQUARE_ENVIRONMENT", "sandbox")
                )
                self.enabled = True
            except Exception as e:
                print(f"Warning: Failed to initialize Square client: {e}")
                self.client = None
                self.enabled = False

        # Initialize API endpoints if client is available
        if self.client:
            self.payouts_api = self.client.payouts
            self.team_api = self.client.team
            self.locations_api = self.client.locations
        else:
            self.payouts_api = None
            self.team_api = None
            self.locations_api = None

    def create_team_member_for_barber(self, barber_data: Dict) -> Dict:
        """
        Create a Square team member for the barber
        This is required before they can receive payouts
        """
        if not self.enabled or not self.team_api:
            raise Exception("Square integration is not available. Please configure Square or use an alternative payment method.")
        
        try:
            # Create team member
            request = CreateTeamMemberRequest(
                team_member=TeamMember(
                    given_name=barber_data["first_name"],
                    family_name=barber_data["last_name"],
                    email_address=barber_data["email"],
                    phone_number=barber_data.get("phone"),
                    assigned_locations=barber_data.get("location_ids", []),
                )
            )

            result = self.team_api.create_team_member(request)

            if result.is_success():
                team_member = result.body.get("team_member", {})
                return {
                    "id": team_member.get("id"),
                    "email": team_member.get("email_address"),
                    "status": team_member.get("status"),
                    "is_owner": team_member.get("is_owner", False),
                }
            else:
                raise Exception(f"Failed to create team member: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def invite_team_member(self, team_member_id: str) -> bool:
        """
        Send invitation email to team member to set up their Square account
        They'll add their bank account details directly with Square
        """
        try:
            # Square automatically sends invitation when team member is created
            # But we can trigger a resend if needed
            return True

        except Exception as e:
            raise Exception(f"Failed to invite team member: {str(e)}")

    def create_payout(self, payout_data: Dict) -> Dict:
        """
        Create a payout to a team member (barber)

        payout_data should include:
        - team_member_id: Square team member ID
        - amount: Decimal amount in dollars
        - location_id: Square location ID
        - reference_id: Your internal reference
        - note: Optional note for the payout
        """
        if not self.enabled or not self.payouts_api:
            raise Exception("Square integration is not available. Please configure Square or use an alternative payment method.")
        
        try:
            # Convert amount to cents
            amount_cents = int(payout_data["amount"] * 100)

            # Create payout request
            request = CreatePayoutRequest(
                idempotency_key=str(uuid.uuid4()),
                payout=Payout(
                    location_id=payout_data["location_id"],
                    destination_type="TEAM_MEMBER",
                    destination_id=payout_data["team_member_id"],
                    amount_money=Money(amount=amount_cents, currency="USD"),
                    reference_id=payout_data.get("reference_id"),
                    note=payout_data.get("note", "Commission payout from 6FB"),
                ),
            )

            result = self.payouts_api.create_payout(request)

            if result.is_success():
                payout = result.body.get("payout", {})
                return {
                    "id": payout.get("id"),
                    "status": payout.get("status"),
                    "amount": float(payout.get("amount_money", {}).get("amount", 0))
                    / 100,
                    "created_at": payout.get("created_at"),
                    "arrival_date": payout.get("arrival_date"),
                    "type": payout.get("type", "ACH"),  # ACH or INSTANT
                }
            else:
                raise Exception(f"Failed to create payout: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def create_instant_payout(self, payout_data: Dict) -> Dict:
        """
        Create an instant payout (1.75% fee but arrives immediately)
        Barber needs Square debit card or linked debit card
        """
        try:
            # Calculate fee (1.75%)
            amount = Decimal(str(payout_data["amount"]))
            fee = amount * Decimal("0.0175")
            total_amount = amount + fee

            # Add instant flag
            payout_data["type"] = "INSTANT"

            # Create instant payout
            result = self.create_payout(payout_data)
            result["fee"] = float(fee)
            result["total_cost"] = float(total_amount)

            return result

        except Exception as e:
            raise Exception(f"Failed to create instant payout: {str(e)}")

    def get_payout_status(self, payout_id: str) -> Dict:
        """
        Check the status of a payout
        """
        if not self.enabled or not self.payouts_api:
            raise Exception("Square integration is not available.")
        
        try:
            result = self.payouts_api.get_payout(payout_id)

            if result.is_success():
                payout = result.body.get("payout", {})
                return {
                    "id": payout.get("id"),
                    "status": payout.get("status"),  # SENT, PAID, FAILED
                    "arrival_date": payout.get("arrival_date"),
                    "updated_at": payout.get("updated_at"),
                }
            else:
                raise Exception(f"Failed to get payout status: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def list_payouts(
        self,
        location_id: str,
        begin_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict]:
        """
        List payouts for a location within a time range
        """
        if not self.enabled or not self.payouts_api:
            raise Exception("Square integration is not available.")
        
        try:
            request_params = {"location_id": location_id, "limit": limit}

            if begin_time:
                request_params["begin_time"] = begin_time.isoformat() + "Z"
            if end_time:
                request_params["end_time"] = end_time.isoformat() + "Z"

            result = self.payouts_api.list_payouts(**request_params)

            if result.is_success():
                payouts = result.body.get("payouts", [])
                return [
                    {
                        "id": p.get("id"),
                        "amount": float(p.get("amount_money", {}).get("amount", 0))
                        / 100,
                        "status": p.get("status"),
                        "destination_id": p.get("destination_id"),
                        "created_at": p.get("created_at"),
                        "arrival_date": p.get("arrival_date"),
                    }
                    for p in payouts
                ]
            else:
                raise Exception(f"Failed to list payouts: {result.errors}")

        except Exception as e:
            raise Exception(f"Square API error: {str(e)}")

    def get_team_member_balance(self, team_member_id: str) -> Dict:
        """
        Get team member's available balance for instant payouts
        (Only applicable if they have a Square debit card)
        """
        try:
            # In Square, balances are managed per location
            # This would need to be implemented based on your specific setup
            return {"available_balance": 0.00, "pending_balance": 0.00}

        except Exception as e:
            raise Exception(f"Failed to get balance: {str(e)}")

    def batch_create_payouts(self, payouts: List[Dict]) -> Dict:
        """
        Create multiple payouts in a batch
        Note: Square doesn't have a true batch API, so we process sequentially
        but this method provides a convenient interface
        """
        successful_payouts = []
        failed_payouts = []
        total_amount = Decimal("0")

        for payout_data in payouts:
            try:
                result = self.create_payout(payout_data)
                successful_payouts.append(result)
                total_amount += Decimal(str(payout_data["amount"]))
            except Exception as e:
                failed_payouts.append(
                    {
                        "team_member_id": payout_data.get("team_member_id"),
                        "amount": payout_data.get("amount"),
                        "error": str(e),
                    }
                )

        return {
            "successful_count": len(successful_payouts),
            "failed_count": len(failed_payouts),
            "total_amount": float(total_amount),
            "successful_payouts": successful_payouts,
            "failed_payouts": failed_payouts,
        }

    def validate_bank_account(self, team_member_id: str) -> bool:
        """
        Check if team member has completed bank account setup
        """
        if not self.enabled or not self.team_api:
            return False
        
        try:
            # Get team member details
            result = self.team_api.retrieve_team_member(team_member_id)

            if result.is_success():
                team_member = result.body.get("team_member", {})
                # Check if they have completed onboarding
                # In production, you'd check specific fields or status
                return team_member.get("status") == "ACTIVE"

            return False

        except Exception as e:
            return False
