"""
Square Appointments Data Parser

Square Appointments is Square's scheduling solution for appointment-based businesses.
This parser handles data exports from Square's customer management system.

Supported export formats:
- CSV customer exports from Square Dashboard
- API data from Square Customers API (JSON format)

Common Square field mappings:
- Given Name -> first_name
- Family Name -> last_name
- Email Address -> email
- Phone Number -> phone
- Creation Date -> first_visit_date
- Customer ID -> source_id
- Customer Notes -> notes
"""

import csv
import json
from typing import Dict, List, Tuple
from datetime import datetime
import logging

from .base_parser import BaseBookingParser, ParseResult

logger = logging.getLogger(__name__)


class SquareParser(BaseBookingParser):
    """Parser for Square Appointments platform data"""
    
    PLATFORM_NAME = "Square"
    SUPPORTED_FORMATS = ["csv", "json"]
    
    def get_field_mapping(self) -> Dict[str, str]:
        """Square field mapping to standardized fields"""
        return {
            'first_name': 'given_name',
            'last_name': 'family_name',
            'email': 'email_address',
            'phone': 'phone_number',
            'date_of_birth': 'birthday',
            'notes': 'note',
            'tags': 'preferences',
            'total_visits': 'visit_count',
            'total_spent': 'total_spent_money',
            'first_visit_date': 'creation_date',
            'last_visit_date': 'updated_date',
            'customer_type': 'segment'
        }
    
    def parse_csv(self, file_path: str) -> ParseResult:
        """Parse Square CSV export"""
        raw_clients = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                # Check if it's a Square export
                first_line = file.readline()
                file.seek(0)
                
                if not self._is_square_csv(first_line):
                    return ParseResult(
                        success=False,
                        clients=[],
                        errors=["File does not appear to be a Square CSV export"],
                        warnings=[],
                        duplicates_found=[],
                        total_processed=0,
                        valid_records=0,
                        skipped_records=0
                    )
                
                reader = csv.DictReader(file)
                raw_clients = list(reader)
                
        except Exception as e:
            return ParseResult(
                success=False,
                clients=[],
                errors=[f"Failed to read CSV file: {str(e)}"],
                warnings=[],
                duplicates_found=[],
                total_processed=0,
                valid_records=0,
                skipped_records=0
            )
        
        return self.clean_and_validate_data(raw_clients)
    
    def parse_json(self, file_path: str) -> ParseResult:
        """Parse Square API JSON data"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
                
            # Handle Square API response structure
            if isinstance(data, dict):
                if 'customers' in data:
                    raw_clients = data['customers']
                elif 'objects' in data:  # Square API often uses 'objects' key
                    raw_clients = data['objects']
                else:
                    raw_clients = [data]  # Single customer object
            elif isinstance(data, list):
                raw_clients = data
            else:
                return ParseResult(
                    success=False,
                    clients=[],
                    errors=["Invalid JSON structure for Square data"],
                    warnings=[],
                    duplicates_found=[],
                    total_processed=0,
                    valid_records=0,
                    skipped_records=0
                )
                
        except Exception as e:
            return ParseResult(
                success=False,
                clients=[],
                errors=[f"Failed to read JSON file: {str(e)}"],
                warnings=[],
                duplicates_found=[],
                total_processed=0,
                valid_records=0,
                skipped_records=0
            )
        
        return self.clean_and_validate_data(raw_clients)
    
    def validate_platform_data(self, raw_data: Dict) -> Tuple[bool, List[str]]:
        """Validate Square-specific data requirements"""
        errors = []
        
        # Check for Square-specific identifiers
        square_indicators = ['id', 'customer_id', 'given_name', 'family_name', 'creation_date']
        has_square_field = any(field in raw_data for field in square_indicators)
        
        if not has_square_field:
            # Check for basic required fields
            if not any(field in raw_data for field in ['given_name', 'family_name', 'email_address', 'phone_number']):
                errors.append("Data does not match expected Square format")
        
        # Validate Square-specific formats
        if 'total_spent_money' in raw_data:
            # Square API returns money as objects with 'amount' and 'currency'
            spent_data = raw_data['total_spent_money']
            if isinstance(spent_data, dict):
                if 'amount' not in spent_data:
                    errors.append("Invalid Square money format - missing amount")
            elif spent_data is not None:
                try:
                    float(spent_data)
                except (ValueError, TypeError):
                    errors.append("Invalid total_spent_money format")
        
        # Validate Square date format
        if 'creation_date' in raw_data and raw_data['creation_date']:
            if not self._is_valid_square_date(raw_data['creation_date']):
                errors.append("Invalid Square date format")
        
        return len(errors) == 0, errors
    
    def _is_square_csv(self, header_line: str) -> bool:
        """Check if CSV appears to be from Square"""
        header_lower = header_line.lower()
        
        # Common Square CSV headers
        square_headers = [
            'given_name',
            'family_name',
            'email_address',
            'phone_number',
            'creation_date',
            'customer_id',
            'total_spent_money'
        ]
        
        # Check if Square-specific headers are present
        return any(header in header_lower for header in square_headers)
    
    def _is_valid_square_date(self, date_str: str) -> bool:
        """Check if date string matches Square's expected formats"""
        square_date_formats = [
            "%Y-%m-%dT%H:%M:%S.%fZ",  # ISO with microseconds
            "%Y-%m-%dT%H:%M:%SZ",     # ISO without microseconds
            "%Y-%m-%d",                # Date only
            "%m/%d/%Y",                # US format
            "%m/%d/%Y %H:%M:%S"        # US format with time
        ]
        
        for fmt in square_date_formats:
            try:
                datetime.strptime(date_str, fmt)
                return True
            except ValueError:
                continue
        
        return False
    
    def clean_and_validate_data(self, raw_clients: List[Dict]) -> ParseResult:
        """Override to handle Square-specific data cleaning"""
        # Pre-process Square-specific formats
        for client in raw_clients:
            # Handle Square's money format
            if 'total_spent_money' in client:
                spent_data = client['total_spent_money']
                if isinstance(spent_data, dict) and 'amount' in spent_data:
                    # Square API returns amount in cents
                    try:
                        client['total_spent'] = float(spent_data['amount']) / 100
                    except (ValueError, TypeError):
                        client['total_spent'] = 0
                elif spent_data:
                    try:
                        client['total_spent'] = float(spent_data)
                    except (ValueError, TypeError):
                        client['total_spent'] = 0
                else:
                    client['total_spent'] = 0
            
            # Handle Square's address format (if present)
            if 'address' in client and isinstance(client['address'], dict):
                address_parts = []
                for key in ['address_line_1', 'address_line_2', 'locality', 'administrative_district_level_1', 'postal_code']:
                    if key in client['address'] and client['address'][key]:
                        address_parts.append(client['address'][key])
                if address_parts:
                    client['address_formatted'] = ', '.join(address_parts)
            
            # Handle Square's preferences (convert to tags)
            if 'preferences' in client and client['preferences']:
                if isinstance(client['preferences'], dict):
                    # Convert preferences dict to tags string
                    tags = []
                    for key, value in client['preferences'].items():
                        if value:
                            tags.append(f"{key}:{value}")
                    client['tags'] = ', '.join(tags)
                elif isinstance(client['preferences'], list):
                    client['tags'] = ', '.join(str(p) for p in client['preferences'])
                else:
                    client['tags'] = str(client['preferences'])
            
            # Handle Square's date formats
            date_fields = ['creation_date', 'updated_date', 'birthday']
            for field in date_fields:
                if field in client and client[field]:
                    parsed_date = self.parse_date(client[field], [
                        "%Y-%m-%dT%H:%M:%S.%fZ",
                        "%Y-%m-%dT%H:%M:%SZ",
                        "%Y-%m-%d",
                        "%m/%d/%Y",
                        "%m/%d/%Y %H:%M:%S"
                    ])
                    client[field] = parsed_date
            
            # Handle Square's note format
            if 'note' in client and client['note']:
                # Square sometimes stores notes as objects
                if isinstance(client['note'], dict) and 'text' in client['note']:
                    client['notes'] = client['note']['text']
                else:
                    client['notes'] = str(client['note'])
            
            # Handle Square customer segments
            if 'segment' in client and client['segment']:
                segment_mapping = {
                    'new_customer': 'new',
                    'returning_customer': 'returning',
                    'frequent_customer': 'vip',
                    'vip_customer': 'vip',
                    'inactive_customer': 'at_risk'
                }
                segment_key = client['segment'].lower() if isinstance(client['segment'], str) else 'new'
                client['customer_type'] = segment_mapping.get(segment_key, 'new')
            
            # Handle Square phone number format
            if 'phone_number' in client and client['phone_number']:
                # Square often includes country code
                phone = client['phone_number']
                if isinstance(phone, dict) and 'number' in phone:
                    client['phone'] = phone['number']
                else:
                    client['phone'] = str(phone)
        
        # Call parent method for standard processing
        return super().clean_and_validate_data(raw_clients)
    
    def get_square_specific_fields(self) -> List[Dict[str, str]]:
        """Get Square-specific field information"""
        base_fields = self.get_supported_fields()
        square_fields = [
            {"field": "given_name", "description": "Customer's given (first) name", "required": False},
            {"field": "family_name", "description": "Customer's family (last) name", "required": False},
            {"field": "email_address", "description": "Customer's email address", "required": False},
            {"field": "phone_number", "description": "Customer's phone number", "required": False},
            {"field": "total_spent_money", "description": "Total money spent (Square money object)", "required": False},
            {"field": "creation_date", "description": "Customer creation date", "required": False},
            {"field": "updated_date", "description": "Last update date", "required": False},
            {"field": "preferences", "description": "Customer preferences", "required": False},
            {"field": "birthday", "description": "Customer's birthday", "required": False},
            {"field": "address", "description": "Customer's address (Square address object)", "required": False}
        ]
        
        return base_fields + square_fields
    
    def get_export_instructions(self) -> Dict[str, str]:
        """Instructions for exporting data from Square"""
        return {
            "csv_export": "Square Dashboard > Customers > Export customers",
            "api_access": "Use Square Customers API with List Customers endpoint",
            "required_permissions": "CUSTOMERS_READ permission required for API access",
            "date_format": "Square uses ISO 8601 format for dates",
            "money_format": "Square API returns money as objects with amount (in cents) and currency",
            "rate_limits": "Square API has rate limits - check documentation for current limits",
            "notes": "Square groups customers by location - export may need to be done per location"
        }