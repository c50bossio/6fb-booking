"""
Enhanced Password Security Service

Provides comprehensive password validation, strength checking, and security policies.
"""

import string
import secrets
from typing import Dict, List, Optional
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PasswordValidationResult:
    """Result of password validation"""
    is_valid: bool
    strength_score: int  # 0-100
    strength_level: str  # weak, fair, good, strong, very_strong
    errors: List[str]
    warnings: List[str]
    recommendations: List[str]


class PasswordSecurityService:
    """
    Enhanced password security service with comprehensive validation and policies.
    """
    
    # Password policy configuration
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    MIN_UNIQUE_CHARS = 6
    
    # Character requirements
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGITS = True
    REQUIRE_SPECIAL_CHARS = True
    MIN_SPECIAL_CHARS = 1
    
    # Security patterns
    COMMON_PASSWORDS_FILE = None  # In production, load from file
    COMMON_PASSWORDS = {
        "password", "123456", "password123", "admin", "qwerty", "letmein",
        "welcome", "monkey", "dragon", "master", "hello", "freedom",
        "whatever", "jesus", "ninja", "mustang", "access", "shadow",
        "jordan", "superman", "liverpool", "iloveyou", "starwars"
    }
    
    # Dictionary words (simplified - in production use comprehensive dictionary)
    DICTIONARY_WORDS = {
        "password", "computer", "internet", "security", "database", "admin",
        "user", "login", "system", "network", "server", "application"
    }
    
    # Keyboard patterns
    KEYBOARD_PATTERNS = [
        "qwerty", "asdf", "zxcv", "1234", "abcd", "qwertyuiop",
        "asdfghjkl", "zxcvbnm", "123456789", "abcdefg"
    ]
    
    # Company/service specific terms (configurable)
    COMPANY_TERMS = {
        "bookedbarber", "barber", "booking", "appointment", "6fb", "sixfigure"
    }
    
    def validate_password(self, password: str, user_data: Optional[Dict] = None) -> PasswordValidationResult:
        """
        Comprehensive password validation.
        
        Args:
            password: Password to validate
            user_data: Optional user data for personalized validation (email, name, etc.)
            
        Returns:
            PasswordValidationResult with validation details
        """
        errors = []
        warnings = []
        recommendations = []
        
        # Basic length validation
        if len(password) < self.MIN_LENGTH:
            errors.append(f"Password must be at least {self.MIN_LENGTH} characters long")
        elif len(password) > self.MAX_LENGTH:
            errors.append(f"Password must not exceed {self.MAX_LENGTH} characters")
        
        # Character requirements
        if self.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if self.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if self.REQUIRE_DIGITS and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one digit")
        
        if self.REQUIRE_SPECIAL_CHARS:
            special_chars = set(string.punctuation)
            password_special_chars = len([c for c in password if c in special_chars])
            if password_special_chars < self.MIN_SPECIAL_CHARS:
                errors.append(f"Password must contain at least {self.MIN_SPECIAL_CHARS} special character(s)")
        
        # Unique character requirement
        unique_chars = len(set(password.lower()))
        if unique_chars < self.MIN_UNIQUE_CHARS:
            errors.append(f"Password must contain at least {self.MIN_UNIQUE_CHARS} unique characters")
        
        # Common password check
        if password.lower() in self.COMMON_PASSWORDS:
            errors.append("Password is too common and easily guessable")
        
        # Dictionary word check
        password_lower = password.lower()
        for word in self.DICTIONARY_WORDS:
            if word in password_lower and len(word) > 4:
                warnings.append(f"Password contains dictionary word: {word}")
        
        # Keyboard pattern check
        for pattern in self.KEYBOARD_PATTERNS:
            if pattern in password_lower:
                warnings.append(f"Password contains keyboard pattern: {pattern}")
        
        # Company/service term check
        for term in self.COMPANY_TERMS:
            if term in password_lower:
                warnings.append(f"Avoid using service-related terms in password")
                break
        
        # Personal information check
        if user_data:
            self._check_personal_information(password, user_data, warnings)
        
        # Repetitive pattern check
        repetitive_warnings = self._check_repetitive_patterns(password)
        warnings.extend(repetitive_warnings)
        
        # Sequential pattern check
        sequential_warnings = self._check_sequential_patterns(password)
        warnings.extend(sequential_warnings)
        
        # Calculate strength score
        strength_score = self._calculate_strength_score(password)
        strength_level = self._get_strength_level(strength_score)
        
        # Generate recommendations
        if strength_score < 70:
            recommendations.extend(self._generate_recommendations(password, errors, warnings))
        
        # Determine if password is valid
        is_valid = len(errors) == 0 and strength_score >= 60
        
        return PasswordValidationResult(
            is_valid=is_valid,
            strength_score=strength_score,
            strength_level=strength_level,
            errors=errors,
            warnings=warnings,
            recommendations=recommendations
        )
    
    def _check_personal_information(self, password: str, user_data: Dict, warnings: List[str]):
        """Check if password contains personal information"""
        password_lower = password.lower()
        
        # Check email parts
        if "email" in user_data:
            email_parts = user_data["email"].lower().split("@")
            username = email_parts[0]
            if len(username) > 3 and username in password_lower:
                warnings.append("Password should not contain parts of your email address")
        
        # Check name parts
        if "name" in user_data:
            name_parts = user_data["name"].lower().split()
            for part in name_parts:
                if len(part) > 2 and part in password_lower:
                    warnings.append("Password should not contain parts of your name")
        
        # Check other personal data
        personal_fields = ["username", "phone", "company"]
        for field in personal_fields:
            if field in user_data and user_data[field]:
                value = str(user_data[field]).lower()
                if len(value) > 3 and value in password_lower:
                    warnings.append(f"Password should not contain your {field}")
    
    def _check_repetitive_patterns(self, password: str) -> List[str]:
        """Check for repetitive patterns in password"""
        warnings = []
        
        # Check for repeated characters
        for i in range(len(password) - 2):
            if password[i] == password[i+1] == password[i+2]:
                warnings.append("Password contains repetitive characters")
                break
        
        # Check for repeated patterns
        for length in range(2, 5):
            for i in range(len(password) - length * 2 + 1):
                pattern = password[i:i+length]
                if password[i+length:i+length*2] == pattern:
                    warnings.append("Password contains repetitive patterns")
                    return warnings
        
        return warnings
    
    def _check_sequential_patterns(self, password: str) -> List[str]:
        """Check for sequential patterns in password"""
        warnings = []
        
        # Check for ascending sequences
        for i in range(len(password) - 2):
            if (ord(password[i+1]) == ord(password[i]) + 1 and 
                ord(password[i+2]) == ord(password[i+1]) + 1):
                warnings.append("Password contains sequential characters")
                break
        
        # Check for descending sequences
        for i in range(len(password) - 2):
            if (ord(password[i+1]) == ord(password[i]) - 1 and 
                ord(password[i+2]) == ord(password[i+1]) - 1):
                warnings.append("Password contains reverse sequential characters")
                break
        
        return warnings
    
    def _calculate_strength_score(self, password: str) -> int:
        """Calculate password strength score (0-100)"""
        score = 0
        
        # Length bonus (up to 25 points)
        if len(password) >= self.MIN_LENGTH:
            score += min(25, (len(password) - self.MIN_LENGTH + 1) * 2)
        
        # Character diversity (up to 40 points)
        has_lower = any(c.islower() for c in password)
        has_upper = any(c.isupper() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in string.punctuation for c in password)
        
        char_types = sum([has_lower, has_upper, has_digit, has_special])
        score += char_types * 10
        
        # Unique character bonus (up to 20 points)
        unique_chars = len(set(password))
        score += min(20, unique_chars * 2)
        
        # Avoid common patterns bonus (up to 15 points)
        if password.lower() not in self.COMMON_PASSWORDS:
            score += 5
        
        has_keyboard_pattern = any(pattern in password.lower() for pattern in self.KEYBOARD_PATTERNS)
        if not has_keyboard_pattern:
            score += 5
        
        has_company_terms = any(term in password.lower() for term in self.COMPANY_TERMS)
        if not has_company_terms:
            score += 5
        
        return min(100, score)
    
    def _get_strength_level(self, score: int) -> str:
        """Convert numeric score to strength level"""
        if score < 30:
            return "weak"
        elif score < 50:
            return "fair"
        elif score < 70:
            return "good"
        elif score < 90:
            return "strong"
        else:
            return "very_strong"
    
    def _generate_recommendations(self, password: str, errors: List[str], warnings: List[str]) -> List[str]:
        """Generate personalized recommendations for password improvement"""
        recommendations = []
        
        if len(password) < self.MIN_LENGTH:
            recommendations.append(f"Increase password length to at least {self.MIN_LENGTH} characters")
        
        if not any(c.isupper() for c in password):
            recommendations.append("Add uppercase letters for better security")
        
        if not any(c.islower() for c in password):
            recommendations.append("Add lowercase letters for better security")
        
        if not any(c.isdigit() for c in password):
            recommendations.append("Add numbers for increased complexity")
        
        if not any(c in string.punctuation for c in password):
            recommendations.append("Add special characters (!@#$%^&*) for stronger security")
        
        if len(set(password)) < self.MIN_UNIQUE_CHARS:
            recommendations.append("Use more unique characters to increase entropy")
        
        if any("repetitive" in warning for warning in warnings):
            recommendations.append("Avoid repetitive characters and patterns")
        
        if any("sequential" in warning for warning in warnings):
            recommendations.append("Avoid sequential characters (abc, 123)")
        
        if any("dictionary" in warning for warning in warnings):
            recommendations.append("Avoid common dictionary words")
        
        if any("keyboard" in warning for warning in warnings):
            recommendations.append("Avoid keyboard patterns (qwerty, asdf)")
        
        # General recommendations
        recommendations.append("Consider using a passphrase with multiple words")
        recommendations.append("Use a password manager to generate and store strong passwords")
        
        return recommendations
    
    def generate_secure_password(self, length: int = 16, exclude_ambiguous: bool = True) -> str:
        """
        Generate a cryptographically secure password.
        
        Args:
            length: Desired password length
            exclude_ambiguous: Whether to exclude ambiguous characters (0, O, l, I)
            
        Returns:
            Generated secure password
        """
        if length < self.MIN_LENGTH:
            length = self.MIN_LENGTH
        elif length > self.MAX_LENGTH:
            length = self.MAX_LENGTH
        
        # Character sets
        lowercase = string.ascii_lowercase
        uppercase = string.ascii_uppercase
        digits = string.digits
        special = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        
        if exclude_ambiguous:
            # Remove ambiguous characters
            lowercase = lowercase.replace('l', '')
            uppercase = uppercase.replace('O', '').replace('I', '')
            digits = digits.replace('0', '').replace('1', '')
        
        # Ensure at least one character from each required set
        password = []
        password.append(secrets.choice(lowercase))
        password.append(secrets.choice(uppercase))
        password.append(secrets.choice(digits))
        password.append(secrets.choice(special))
        
        # Fill remaining length with random characters from all sets
        all_chars = lowercase + uppercase + digits + special
        for _ in range(length - 4):
            password.append(secrets.choice(all_chars))
        
        # Shuffle the password
        secrets.SystemRandom().shuffle(password)
        
        return ''.join(password)
    
    def check_password_breach(self, password: str) -> Dict:
        """
        Check if password has been found in data breaches.
        
        Note: In production, this would integrate with HaveIBeenPwned API
        or similar service. For now, returns a mock implementation.
        
        Args:
            password: Password to check
            
        Returns:
            Dict with breach information
        """
        # Mock implementation - in production integrate with real service
        password_lower = password.lower()
        
        # Check against our known common passwords
        if password_lower in self.COMMON_PASSWORDS:
            return {
                "found_in_breach": True,
                "breach_count": "multiple",
                "severity": "high",
                "recommendation": "This password is commonly used and should be changed immediately"
            }
        
        # Mock check for simple patterns
        if len(password) < 8 or password.isdigit() or password.isalpha():
            return {
                "found_in_breach": True,
                "breach_count": "likely",
                "severity": "medium",
                "recommendation": "This password pattern is commonly found in breaches"
            }
        
        return {
            "found_in_breach": False,
            "breach_count": 0,
            "severity": "low",
            "recommendation": "Password not found in known breaches"
        }
    
    def get_password_policy(self) -> Dict:
        """Get current password policy configuration"""
        return {
            "min_length": self.MIN_LENGTH,
            "max_length": self.MAX_LENGTH,
            "min_unique_chars": self.MIN_UNIQUE_CHARS,
            "require_uppercase": self.REQUIRE_UPPERCASE,
            "require_lowercase": self.REQUIRE_LOWERCASE,
            "require_digits": self.REQUIRE_DIGITS,
            "require_special_chars": self.REQUIRE_SPECIAL_CHARS,
            "min_special_chars": self.MIN_SPECIAL_CHARS,
            "prohibited_patterns": [
                "Common passwords",
                "Dictionary words",
                "Keyboard patterns",
                "Personal information",
                "Company/service terms",
                "Repetitive patterns",
                "Sequential patterns"
            ],
            "recommendations": [
                "Use a mix of uppercase and lowercase letters",
                "Include numbers and special characters",
                "Avoid personal information",
                "Use passphrases for better memorability",
                "Consider using a password manager",
                "Change passwords regularly",
                "Never reuse passwords across services"
            ]
        }


# Create service instance
password_security_service = PasswordSecurityService()


def validate_password_strength(password: str, user_data: Optional[Dict] = None) -> PasswordValidationResult:
    """Convenience function for password validation"""
    return password_security_service.validate_password(password, user_data)


def generate_secure_password(length: int = 16) -> str:
    """Convenience function for password generation"""
    return password_security_service.generate_secure_password(length)