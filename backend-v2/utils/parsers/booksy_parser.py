"""
Booksy Booking Platform Data Parser

Booksy is a popular booking platform for beauty and wellness businesses.
This parser handles data exports from Booksy's client management system.

Supported export formats:
- CSV client exports from Booksy dashboard
- API data from Booksy Partner API (JSON format)

Common Booksy field mappings:
- Customer Name -> first_name, last_name
- Email -> email
- Phone -> phone
- Total Bookings -> total_visits
- Total Spent -> total_spent
- First Booking -> first_visit_date
- Last Booking -> last_visit_date
- Customer Notes -> notes
- Tags -> tags
"""

import csv
import json
from typing import Dict, List, Tuple
import logging

from .base_parser import BaseBookingParser, ParseResult

logger = logging.getLogger(__name__)


class BooksyParser(BaseBookingParser):
    """Parser for Booksy booking platform data"""
    
    PLATFORM_NAME = "Booksy"
    SUPPORTED_FORMATS = ["csv", "json"]
    
    def get_field_mapping(self) -> Dict[str, str]:
        """Booksy field mapping to standardized fields"""
        return {
            'first_name': 'first_name',
            'last_name': 'last_name', 
            'email': 'email',
            'phone': 'phone',
            'date_of_birth': 'birth_date',
            'notes': 'notes',
            'tags': 'tags',
            'total_visits': 'total_bookings',
            'total_spent': 'total_spent',
            'first_visit_date': 'first_booking_date',
            'last_visit_date': 'last_booking_date',
            'customer_type': 'customer_segment'
        }
    
    def parse_csv(self, file_path: str) -> ParseResult:
        """Parse Booksy CSV export"""
        raw_clients = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                # Try to detect if it's a Booksy export by checking headers
                first_line = file.readline()
                file.seek(0)
                
                if not self._is_booksy_csv(first_line):
                    return ParseResult(
                        success=False,
                        clients=[],
                        errors=["File does not appear to be a Booksy CSV export"],
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
        """Parse Booksy API JSON data"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
                
            # Handle different JSON structures from Booksy API
            if isinstance(data, dict):
                if 'customers' in data:
                    raw_clients = data['customers']
                elif 'data' in data and isinstance(data['data'], list):
                    raw_clients = data['data']
                else:
                    raw_clients = [data]  # Single customer object
            elif isinstance(data, list):
                raw_clients = data
            else:
                return ParseResult(
                    success=False,
                    clients=[],
                    errors=["Invalid JSON structure for Booksy data"],
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
        """Validate Booksy-specific data requirements"""
        errors = []
        
        # Check if it has required Booksy structure
        booksy_indicators = ['customer_id', 'booksy_id', 'total_bookings', 'booking_count']
        has_booksy_field = any(field in raw_data for field in booksy_indicators)
        
        if not has_booksy_field:
            # Check for common field combinations that suggest Booksy data
            name_fields = ['first_name', 'last_name', 'customer_name', 'name']
            contact_fields = ['email', 'phone', 'mobile']
            
            has_name = any(field in raw_data for field in name_fields)
            has_contact = any(field in raw_data for field in contact_fields)
            
            if not (has_name and has_contact):
                errors.append("Data does not match expected Booksy format")
        
        # Validate Booksy-specific field formats
        if 'total_bookings' in raw_data:
            try:
                int(raw_data['total_bookings'] or 0)
            except (ValueError, TypeError):
                errors.append("Invalid total_bookings format")
        
        if 'total_spent' in raw_data:
            try:
                # Booksy often includes currency symbols
                spent_str = str(raw_data['total_spent'] or '0')
                # Remove currency symbols and convert
                cleaned_spent = ''.join(c for c in spent_str if c.isdigit() or c == '.')
                float(cleaned_spent or 0)
            except (ValueError, TypeError):
                errors.append("Invalid total_spent format")
        
        return len(errors) == 0, errors
    
    def _is_booksy_csv(self, header_line: str) -> bool:
        """Check if CSV appears to be from Booksy"""
        header_lower = header_line.lower()
        
        # Common Booksy CSV headers
        booksy_headers = [
            'customer_id',
            'booksy_id', 
            'total_bookings',
            'booking_count',
            'customer_segment',
            'first_booking_date',
            'last_booking_date'
        ]
        
        # Check if any Booksy-specific headers are present
        return any(header in header_lower for header in booksy_headers)
    
    def clean_and_validate_data(self, raw_clients: List[Dict]) -> ParseResult:
        """Override to handle Booksy-specific data cleaning"""
        # Pre-process Booksy-specific formats
        for client in raw_clients:
            # Handle Booksy's customer name format (often "First Last")
            if 'customer_name' in client and not ('first_name' in client and 'last_name' in client):
                name_parts = str(client['customer_name']).split(' ', 1)
                client['first_name'] = name_parts[0] if name_parts else ''
                client['last_name'] = name_parts[1] if len(name_parts) > 1 else ''
            
            # Handle Booksy's phone format (often includes country code)
            if 'mobile' in client and not client.get('phone'):
                client['phone'] = client['mobile']
            
            # Handle Booksy's currency format in total_spent
            if 'total_spent' in client:
                spent_str = str(client['total_spent'] or '0')
                # Remove currency symbols (£, $, €, etc.)
                cleaned_spent = ''.join(c for c in spent_str if c.isdigit() or c == '.')
                try:
                    client['total_spent'] = float(cleaned_spent or 0)
                except ValueError:
                    client['total_spent'] = 0
            
            # Handle Booksy's date formats
            date_fields = ['first_booking_date', 'last_booking_date', 'birth_date']
            for field in date_fields:
                if field in client and client[field]:
                    # Booksy often uses ISO format or DD/MM/YYYY
                    parsed_date = self.parse_date(client[field], [
                        "%Y-%m-%d",
                        "%d/%m/%Y",
                        "%m/%d/%Y",
                        "%Y-%m-%d %H:%M:%S",
                        "%d-%m-%Y"
                    ])
                    client[field] = parsed_date
            
            # Handle Booksy's customer segments
            if 'customer_segment' in client:
                segment_mapping = {
                    'new': 'new',
                    'regular': 'returning',
                    'vip': 'vip',
                    'inactive': 'at_risk',
                    'loyal': 'returning'
                }
                client['customer_type'] = segment_mapping.get(client['customer_segment'].lower(), 'new')
        
        # Call parent method for standard processing
        return super().clean_and_validate_data(raw_clients)
    
    def get_booksy_specific_fields(self) -> List[Dict[str, str]]:
        """Get Booksy-specific field information"""
        base_fields = self.get_supported_fields()
        booksy_fields = [
            {"field": "customer_id", "description": "Booksy customer ID", "required": False},
            {"field": "customer_segment", "description": "Booksy customer segment (new, regular, vip)", "required": False},
            {"field": "total_bookings", "description": "Total number of bookings made", "required": False},
            {"field": "mobile", "description": "Mobile phone number", "required": False},
            {"field": "customer_name", "description": "Full customer name (will be split)", "required": False},
            {"field": "booking_count", "description": "Alternative field for total bookings", "required": False}
        ]
        
        return base_fields + booksy_fields
    
    def get_export_instructions(self) -> Dict[str, str]:
        """Instructions for exporting data from Booksy"""
        return {
            "csv_export": "Go to Booksy Dashboard > Customers > Export > Download as CSV",
            "api_access": "Use Booksy Partner API with customers endpoint",
            "required_fields": "Ensure export includes customer name, email/phone, and booking history",
            "date_format": "Booksy typically exports dates in DD/MM/YYYY or ISO format",
            "notes": "Some customer segments may require different export procedures"
        }