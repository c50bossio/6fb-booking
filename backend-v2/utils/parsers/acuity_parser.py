"""
Acuity Scheduling Data Parser

Acuity Scheduling is a comprehensive appointment scheduling software.
This parser handles data exports from Acuity's client management system.

Supported export formats:
- CSV client exports from Acuity dashboard
- API data from Acuity Scheduling API (JSON format)

Common Acuity field mappings:
- First Name -> first_name
- Last Name -> last_name
- Email -> email
- Phone -> phone
- Date Created -> first_visit_date
- Notes -> notes
- Labels -> tags
- Appointment Count -> total_visits
"""

import csv
import json
from typing import Dict, List, Any, Tuple
from datetime import datetime
import logging

from .base_parser import BaseBookingParser, ParseResult, ParsedClient

logger = logging.getLogger(__name__)


class AcuityParser(BaseBookingParser):
    """Parser for Acuity Scheduling platform data"""
    
    PLATFORM_NAME = "Acuity"
    SUPPORTED_FORMATS = ["csv", "json"]
    
    def get_field_mapping(self) -> Dict[str, str]:
        """Acuity field mapping to standardized fields"""
        return {
            'first_name': 'firstName',
            'last_name': 'lastName',
            'email': 'email',
            'phone': 'phone',
            'date_of_birth': 'dateOfBirth',
            'notes': 'notes',
            'tags': 'labels',
            'total_visits': 'appointmentCount',
            'total_spent': 'totalSpent',
            'first_visit_date': 'dateCreated',
            'last_visit_date': 'lastAppointmentDate',
            'customer_type': 'clientType'
        }
    
    def parse_csv(self, file_path: str) -> ParseResult:
        """Parse Acuity CSV export"""
        raw_clients = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                # Check if it's an Acuity export
                first_line = file.readline()
                file.seek(0)
                
                if not self._is_acuity_csv(first_line):
                    return ParseResult(
                        success=False,
                        clients=[],
                        errors=["File does not appear to be an Acuity CSV export"],
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
        """Parse Acuity API JSON data"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
                
            # Handle Acuity API response structure
            if isinstance(data, dict):
                if 'clients' in data:
                    raw_clients = data['clients']
                elif 'data' in data:
                    raw_clients = data['data']
                else:
                    raw_clients = [data]  # Single client object
            elif isinstance(data, list):
                raw_clients = data
            else:
                return ParseResult(
                    success=False,
                    clients=[],
                    errors=["Invalid JSON structure for Acuity data"],
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
        """Validate Acuity-specific data requirements"""
        errors = []
        
        # Check for Acuity-specific identifiers
        acuity_indicators = ['id', 'firstName', 'lastName', 'dateCreated', 'appointmentCount']
        has_acuity_field = any(field in raw_data for field in acuity_indicators)
        
        if not has_acuity_field:
            # Check for basic required fields in alternative formats
            if not any(field in raw_data for field in ['firstName', 'lastName', 'email', 'phone']):
                errors.append("Data does not match expected Acuity format")
        
        # Validate Acuity-specific formats
        if 'appointmentCount' in raw_data:
            try:
                int(raw_data['appointmentCount'] or 0)
            except (ValueError, TypeError):
                errors.append("Invalid appointmentCount format")
        
        if 'totalSpent' in raw_data and raw_data['totalSpent']:
            try:
                # Remove currency symbols if present
                spent_str = str(raw_data['totalSpent'])
                cleaned_spent = ''.join(c for c in spent_str if c.isdigit() or c == '.')
                float(cleaned_spent or 0)
            except (ValueError, TypeError):
                errors.append("Invalid totalSpent format")
        
        # Validate Acuity date format
        if 'dateCreated' in raw_data and raw_data['dateCreated']:
            if not self._is_valid_acuity_date(raw_data['dateCreated']):
                errors.append("Invalid Acuity date format")
        
        return len(errors) == 0, errors
    
    def _is_acuity_csv(self, header_line: str) -> bool:
        """Check if CSV appears to be from Acuity"""
        header_lower = header_line.lower()
        
        # Common Acuity CSV headers
        acuity_headers = [
            'firstname',
            'lastname',
            'datecreated',
            'appointmentcount',
            'lastappointmentdate',
            'labels',
            'totalspent'
        ]
        
        # Check if Acuity-specific headers are present
        return any(header in header_lower for header in acuity_headers)
    
    def _is_valid_acuity_date(self, date_str: str) -> bool:
        """Check if date string matches Acuity's expected formats"""
        acuity_date_formats = [
            "%Y-%m-%d %H:%M:%S",      # Standard Acuity format
            "%Y-%m-%d",               # Date only
            "%m/%d/%Y %H:%M:%S",      # US format with time
            "%m/%d/%Y",               # US format date only
            "%Y-%m-%dT%H:%M:%S",      # ISO format
            "%Y-%m-%dT%H:%M:%SZ"      # ISO with Z suffix
        ]
        
        for fmt in acuity_date_formats:
            try:
                datetime.strptime(date_str, fmt)
                return True
            except ValueError:
                continue
        
        return False
    
    def clean_and_validate_data(self, raw_clients: List[Dict]) -> ParseResult:
        """Override to handle Acuity-specific data cleaning"""
        # Pre-process Acuity-specific formats
        for client in raw_clients:
            # Handle Acuity's labels format (convert to tags)
            if 'labels' in client and client['labels']:
                if isinstance(client['labels'], list):
                    client['tags'] = ', '.join(client['labels'])
                elif isinstance(client['labels'], str):
                    # Acuity often separates labels with commas or semicolons
                    labels = client['labels'].replace(';', ',').split(',')
                    client['tags'] = ', '.join(label.strip() for label in labels if label.strip())
                else:
                    client['tags'] = str(client['labels'])
            
            # Handle Acuity's currency format in totalSpent
            if 'totalSpent' in client and client['totalSpent']:
                spent_str = str(client['totalSpent'])
                # Remove currency symbols ($, €, £, etc.)
                cleaned_spent = ''.join(c for c in spent_str if c.isdigit() or c == '.')
                try:
                    client['total_spent'] = float(cleaned_spent or 0)
                except ValueError:
                    client['total_spent'] = 0
            
            # Handle Acuity's date formats
            date_fields = ['dateCreated', 'lastAppointmentDate', 'dateOfBirth']
            for field in date_fields:
                if field in client and client[field]:
                    parsed_date = self.parse_date(client[field], [
                        "%Y-%m-%d %H:%M:%S",
                        "%Y-%m-%d",
                        "%m/%d/%Y %H:%M:%S",
                        "%m/%d/%Y",
                        "%Y-%m-%dT%H:%M:%S",
                        "%Y-%m-%dT%H:%M:%SZ"
                    ])
                    client[field] = parsed_date
            
            # Handle Acuity's appointment count
            if 'appointmentCount' in client:
                try:
                    client['total_visits'] = int(client['appointmentCount'] or 0)
                except (ValueError, TypeError):
                    client['total_visits'] = 0
            
            # Handle Acuity's client type classification
            if 'clientType' in client and client['clientType']:
                type_mapping = {
                    'new': 'new',
                    'returning': 'returning',
                    'regular': 'returning',
                    'vip': 'vip',
                    'premium': 'vip',
                    'inactive': 'at_risk',
                    'lapsed': 'at_risk'
                }
                client_type = str(client['clientType']).lower()
                client['customer_type'] = type_mapping.get(client_type, 'new')
            
            # Handle Acuity's phone format
            if 'phone' in client and client['phone']:
                # Acuity sometimes includes extensions
                phone = str(client['phone'])
                # Remove common extensions formats
                phone = phone.split(' ext')[0].split(' x')[0]
                client['phone'] = phone.strip()
            
            # Handle Acuity's notes format
            if 'notes' in client and client['notes']:
                # Acuity sometimes stores notes with HTML tags
                import re
                notes = str(client['notes'])
                # Remove basic HTML tags
                notes = re.sub(r'<[^>]+>', '', notes)
                # Clean up excessive whitespace
                notes = ' '.join(notes.split())
                client['notes'] = notes if notes else None
            
            # Handle custom fields from Acuity forms
            custom_fields = {}
            for key, value in client.items():
                if key.startswith('custom_') or key.startswith('field_'):
                    if value:
                        custom_fields[key] = value
            
            if custom_fields:
                existing_notes = client.get('notes', '')
                custom_notes = ', '.join(f"{k}: {v}" for k, v in custom_fields.items())
                if existing_notes:
                    client['notes'] = f"{existing_notes}; {custom_notes}"
                else:
                    client['notes'] = custom_notes
        
        # Call parent method for standard processing
        return super().clean_and_validate_data(raw_clients)
    
    def get_acuity_specific_fields(self) -> List[Dict[str, str]]:
        """Get Acuity-specific field information"""
        base_fields = self.get_supported_fields()
        acuity_fields = [
            {"field": "firstName", "description": "Client's first name", "required": False},
            {"field": "lastName", "description": "Client's last name", "required": False},
            {"field": "dateCreated", "description": "Client creation date", "required": False},
            {"field": "lastAppointmentDate", "description": "Date of last appointment", "required": False},
            {"field": "appointmentCount", "description": "Total number of appointments", "required": False},
            {"field": "labels", "description": "Client labels/tags", "required": False},
            {"field": "clientType", "description": "Client type classification", "required": False},
            {"field": "dateOfBirth", "description": "Client's date of birth", "required": False},
            {"field": "custom_*", "description": "Custom form fields (will be added to notes)", "required": False}
        ]
        
        return base_fields + acuity_fields
    
    def get_export_instructions(self) -> Dict[str, str]:
        """Instructions for exporting data from Acuity"""
        return {
            "csv_export": "Acuity Dashboard > Clients > Export Clients > Download CSV",
            "api_access": "Use Acuity Scheduling API with /api/v2/clients endpoint",
            "authentication": "Requires API user ID and API key",
            "date_format": "Acuity uses YYYY-MM-DD HH:MM:SS format for dates",
            "custom_fields": "Custom intake form fields are included in exports",
            "rate_limits": "API has rate limits - check documentation for current limits",
            "filters": "Can filter by date range, appointment type, or client labels",
            "notes": "Notes may contain HTML formatting that will be cleaned during import"
        }