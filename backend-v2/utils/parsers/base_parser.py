"""
Base Parser Abstract Class for Booking Application Data Imports

This module provides the foundation for all booking application parsers,
defining the common interface and validation logic.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import re
import hashlib
import logging

logger = logging.getLogger(__name__)


@dataclass
class ParsedClient:
    """Standardized client data structure"""
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    total_visits: int = 0
    total_spent: float = 0.0
    first_visit_date: Optional[str] = None
    last_visit_date: Optional[str] = None
    customer_type: str = "new"
    
    # Source tracking
    source_platform: Optional[str] = None
    source_id: Optional[str] = None
    
    # Additional metadata
    raw_data: Optional[Dict] = None
    import_notes: Optional[str] = None


@dataclass
class ParseResult:
    """Result of parsing operation"""
    success: bool
    clients: List[ParsedClient]
    errors: List[str]
    warnings: List[str]
    duplicates_found: List[Dict]
    total_processed: int
    valid_records: int
    skipped_records: int
    
    def add_error(self, error: str):
        """Add an error message"""
        self.errors.append(error)
        logger.error(f"Parser error: {error}")
    
    def add_warning(self, warning: str):
        """Add a warning message"""
        self.warnings.append(warning)
        logger.warning(f"Parser warning: {warning}")


class BaseBookingParser(ABC):
    """Abstract base class for all booking application parsers"""
    
    PLATFORM_NAME = "Generic"
    SUPPORTED_FORMATS = ["csv", "json"]
    
    def __init__(self):
        self.duplicate_threshold = 0.8  # Similarity threshold for duplicate detection
        self.validation_errors = []
        
    @abstractmethod
    def parse_csv(self, file_path: str) -> ParseResult:
        """Parse CSV export from booking platform"""
        pass
    
    @abstractmethod
    def parse_json(self, file_path: str) -> ParseResult:
        """Parse JSON data from booking platform API"""
        pass
    
    @abstractmethod
    def get_field_mapping(self) -> Dict[str, str]:
        """Return mapping of platform fields to standardized fields"""
        pass
    
    @abstractmethod
    def validate_platform_data(self, raw_data: Dict) -> Tuple[bool, List[str]]:
        """Validate platform-specific data requirements"""
        pass
    
    def standardize_phone(self, phone: Optional[str]) -> Optional[str]:
        """Standardize phone number format"""
        if not phone:
            return None
            
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', phone)
        
        # Handle different phone number formats
        if len(digits) == 10:
            # US phone number without country code
            return f"+1{digits}"
        elif len(digits) == 11 and digits.startswith('1'):
            # US phone number with country code
            return f"+{digits}"
        elif len(digits) > 7:
            # International number, assume it's valid
            return f"+{digits}" if not digits.startswith('+') else digits
        else:
            # Invalid phone number
            return None
    
    def standardize_email(self, email: Optional[str]) -> Optional[str]:
        """Standardize and validate email format"""
        if not email:
            return None
            
        email = email.strip().lower()
        
        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if re.match(email_pattern, email):
            return email
        else:
            return None
    
    def standardize_name(self, name: Optional[str]) -> Optional[str]:
        """Standardize name format"""
        if not name:
            return None
            
        # Clean and capitalize properly
        name = name.strip()
        if name:
            return ' '.join(word.capitalize() for word in name.split())
        return None
    
    def parse_date(self, date_str: Optional[str], format_hints: List[str] = None) -> Optional[str]:
        """Parse date string with multiple format attempts"""
        if not date_str:
            return None
            
        # Common date formats to try
        formats = format_hints or [
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%Y/%m/%d",
            "%m-%d-%Y",
            "%d-%m-%Y",
            "%B %d, %Y",
            "%b %d, %Y",
            "%d %B %Y",
            "%d %b %Y"
        ]
        
        for fmt in formats:
            try:
                parsed_date = datetime.strptime(date_str.strip(), fmt)
                return parsed_date.strftime("%Y-%m-%d")
            except ValueError:
                continue
                
        return None
    
    def calculate_similarity(self, client1: ParsedClient, client2: ParsedClient) -> float:
        """Calculate similarity score between two clients for duplicate detection"""
        score = 0.0
        total_weight = 0.0
        
        # Email match (high weight)
        if client1.email and client2.email:
            if client1.email.lower() == client2.email.lower():
                score += 40
            total_weight += 40
        
        # Phone match (high weight)
        if client1.phone and client2.phone:
            if client1.phone == client2.phone:
                score += 35
            total_weight += 35
        
        # Name similarity (medium weight)
        if client1.first_name and client2.first_name:
            if client1.first_name.lower() == client2.first_name.lower():
                score += 15
            total_weight += 15
                
        if client1.last_name and client2.last_name:
            if client1.last_name.lower() == client2.last_name.lower():
                score += 15
            total_weight += 15
        
        # Date of birth match (medium weight)
        if client1.date_of_birth and client2.date_of_birth:
            if client1.date_of_birth == client2.date_of_birth:
                score += 10
            total_weight += 10
        
        # Calculate final similarity as percentage
        if total_weight > 0:
            return score / total_weight
        else:
            return 0.0
    
    def detect_duplicates(self, clients: List[ParsedClient]) -> List[Dict]:
        """Detect potential duplicates in the client list"""
        duplicates = []
        
        for i, client1 in enumerate(clients):
            for j, client2 in enumerate(clients[i+1:], i+1):
                similarity = self.calculate_similarity(client1, client2)
                
                if similarity >= self.duplicate_threshold:
                    duplicates.append({
                        'client1_index': i,
                        'client2_index': j,
                        'similarity': similarity,
                        'client1': client1,
                        'client2': client2,
                        'suggested_action': 'merge' if similarity > 0.9 else 'review'
                    })
        
        return duplicates
    
    def validate_client_data(self, client: ParsedClient) -> Tuple[bool, List[str]]:
        """Validate parsed client data"""
        errors = []
        
        # Required fields
        if not client.first_name:
            errors.append("First name is required")
        
        if not client.last_name:
            errors.append("Last name is required")
        
        # At least one contact method required
        if not client.email and not client.phone:
            errors.append("Either email or phone number is required")
        
        # Validate email format
        if client.email and not self.standardize_email(client.email):
            errors.append(f"Invalid email format: {client.email}")
        
        # Validate phone format
        if client.phone and not self.standardize_phone(client.phone):
            errors.append(f"Invalid phone number format: {client.phone}")
        
        # Validate numeric fields
        if client.total_visits < 0:
            errors.append("Total visits cannot be negative")
            
        if client.total_spent < 0:
            errors.append("Total spent cannot be negative")
        
        return len(errors) == 0, errors
    
    def clean_and_validate_data(self, raw_clients: List[Dict]) -> ParseResult:
        """Clean, validate, and process raw client data"""
        result = ParseResult(
            success=True,
            clients=[],
            errors=[],
            warnings=[],
            duplicates_found=[],
            total_processed=len(raw_clients),
            valid_records=0,
            skipped_records=0
        )
        
        field_mapping = self.get_field_mapping()
        
        for i, raw_client in enumerate(raw_clients):
            try:
                # Validate platform-specific data
                is_valid, platform_errors = self.validate_platform_data(raw_client)
                if not is_valid:
                    result.skipped_records += 1
                    for error in platform_errors:
                        result.add_error(f"Row {i+1}: {error}")
                    continue
                
                # Map fields to standardized format
                parsed_client = ParsedClient(
                    first_name=self.standardize_name(raw_client.get(field_mapping.get('first_name', 'first_name'))),
                    last_name=self.standardize_name(raw_client.get(field_mapping.get('last_name', 'last_name'))),
                    email=self.standardize_email(raw_client.get(field_mapping.get('email', 'email'))),
                    phone=self.standardize_phone(raw_client.get(field_mapping.get('phone', 'phone'))),
                    date_of_birth=self.parse_date(raw_client.get(field_mapping.get('date_of_birth', 'date_of_birth'))),
                    notes=raw_client.get(field_mapping.get('notes', 'notes')),
                    tags=raw_client.get(field_mapping.get('tags', 'tags')),
                    total_visits=int(raw_client.get(field_mapping.get('total_visits', 'total_visits'), 0) or 0),
                    total_spent=float(raw_client.get(field_mapping.get('total_spent', 'total_spent'), 0) or 0),
                    first_visit_date=self.parse_date(raw_client.get(field_mapping.get('first_visit_date', 'first_visit_date'))),
                    last_visit_date=self.parse_date(raw_client.get(field_mapping.get('last_visit_date', 'last_visit_date'))),
                    customer_type=raw_client.get(field_mapping.get('customer_type', 'customer_type'), 'new'),
                    source_platform=self.PLATFORM_NAME,
                    source_id=str(raw_client.get('id', i)),
                    raw_data=raw_client
                )
                
                # Validate parsed client
                is_valid, validation_errors = self.validate_client_data(parsed_client)
                if not is_valid:
                    result.skipped_records += 1
                    for error in validation_errors:
                        result.add_error(f"Row {i+1}: {error}")
                    continue
                
                result.clients.append(parsed_client)
                result.valid_records += 1
                
            except Exception as e:
                result.skipped_records += 1
                result.add_error(f"Row {i+1}: Unexpected error - {str(e)}")
        
        # Detect duplicates
        if result.clients:
            result.duplicates_found = self.detect_duplicates(result.clients)
            if result.duplicates_found:
                result.add_warning(f"Found {len(result.duplicates_found)} potential duplicate(s)")
        
        # Set overall success status
        result.success = result.valid_records > 0
        
        return result
    
    def generate_hash(self, client: ParsedClient) -> str:
        """Generate unique hash for client data"""
        # Create hash based on key identifying fields
        hash_input = f"{client.first_name}|{client.last_name}|{client.email}|{client.phone}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    def get_supported_fields(self) -> List[Dict[str, str]]:
        """Get list of supported fields with descriptions"""
        return [
            {"field": "first_name", "description": "Client's first name", "required": True},
            {"field": "last_name", "description": "Client's last name", "required": True},
            {"field": "email", "description": "Client's email address", "required": False},
            {"field": "phone", "description": "Client's phone number", "required": False},
            {"field": "date_of_birth", "description": "Client's date of birth", "required": False},
            {"field": "notes", "description": "Additional notes about the client", "required": False},
            {"field": "tags", "description": "Client tags or categories", "required": False},
            {"field": "total_visits", "description": "Total number of visits", "required": False},
            {"field": "total_spent", "description": "Total amount spent", "required": False},
            {"field": "first_visit_date", "description": "Date of first visit", "required": False},
            {"field": "last_visit_date", "description": "Date of last visit", "required": False},
            {"field": "customer_type", "description": "Customer type classification", "required": False}
        ]