"""
Multi-Factor Authentication (MFA) service
"""

import pyotp
import qrcode
import io
import base64
from typing import Optional, Tuple
from datetime import datetime, timedelta
import secrets
import logging

logger = logging.getLogger(__name__)


class MFAService:
    """Service for handling multi-factor authentication"""

    def __init__(self):
        self.issuer_name = "6FB Booking Platform"

    def generate_secret(self) -> str:
        """Generate a new TOTP secret for a user"""
        return pyotp.random_base32()

    def generate_qr_code(self, user_email: str, secret: str) -> str:
        """Generate QR code for TOTP setup"""
        try:
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=user_email, issuer_name=self.issuer_name
            )

            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_uri)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")

            # Convert to base64 string
            img_buffer = io.BytesIO()
            img.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            img_b64 = base64.b64encode(img_buffer.getvalue()).decode()

            return f"data:image/png;base64,{img_b64}"

        except Exception as e:
            logger.error(f"Failed to generate QR code: {str(e)}")
            raise

    def verify_totp(self, secret: str, token: str) -> bool:
        """Verify a TOTP token"""
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=1)  # Allow 1 window tolerance
        except Exception as e:
            logger.error(f"Failed to verify TOTP: {str(e)}")
            return False

    def generate_backup_codes(self, count: int = 10) -> list[str]:
        """Generate backup codes for account recovery"""
        codes = []
        for _ in range(count):
            code = secrets.token_hex(4).upper()  # 8-character hex codes
            codes.append(code)
        return codes

    def verify_backup_code(
        self, stored_codes: list[str], provided_code: str
    ) -> Tuple[bool, list[str]]:
        """
        Verify a backup code and remove it from the list
        Returns: (is_valid, updated_codes_list)
        """
        provided_code = provided_code.upper().strip()

        if provided_code in stored_codes:
            updated_codes = [code for code in stored_codes if code != provided_code]
            return True, updated_codes

        return False, stored_codes

    def is_setup_required(self, user_mfa_secret: Optional[str]) -> bool:
        """Check if MFA setup is required for user"""
        return user_mfa_secret is None or user_mfa_secret == ""

    def generate_recovery_token(self) -> str:
        """Generate a recovery token for account access"""
        return secrets.token_urlsafe(32)


# Global instance
mfa_service = MFAService()
