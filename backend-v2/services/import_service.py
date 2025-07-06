import csv
import json
import io
import re
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

import models
import schemas
from services import client_service
from utils.encryption import encrypt_data


class ImportService:
    """Service for handling data imports from various sources"""
    
    def __init__(self):
        self.supported_sources = {
            "booksy": self._parse_booksy_format,
            "square": self._parse_square_format,
            "acuity": self._parse_acuity_format,
            "mindbody": self._parse_mindbody_format,
            "csv": self._parse_csv_format,
            "json": self._parse_json_format
        }
        
        # Standard field mappings for different import types
        self.standard_mappings = {
            "clients": {
                "first_name": ["first_name", "fname", "first", "given_name"],
                "last_name": ["last_name", "lname", "last", "surname", "family_name"],
                "email": ["email", "email_address", "contact_email"],
                "phone": ["phone", "phone_number", "mobile", "cell", "contact_phone"],
                "date_of_birth": ["date_of_birth", "dob", "birth_date", "birthdate"],
                "notes": ["notes", "comments", "remarks", "description"]
            },
            "appointments": {
                "client_email": ["client_email", "customer_email", "email"],
                "service_name": ["service", "service_name", "treatment", "service_type"],
                "start_time": ["start_time", "appointment_time", "datetime", "start"],
                "duration_minutes": ["duration", "duration_minutes", "length", "time"],
                "price": ["price", "cost", "amount", "fee"],
                "status": ["status", "state", "appointment_status"],
                "notes": ["notes", "comments", "remarks", "description"]
            },
            "services": {
                "name": ["name", "service_name", "title"],
                "description": ["description", "details", "info"],
                "duration_minutes": ["duration", "duration_minutes", "length", "time"],
                "base_price": ["price", "cost", "amount", "base_price"],
                "category": ["category", "type", "service_type"]
            }
        }

    def validate_file(self, content: str, source_type: str, import_type: str, file_extension: str) -> Dict[str, Any]:
        """Validate uploaded file and return validation results"""
        try:
            # Parse content based on source type
            if source_type in self.supported_sources:
                parser = self.supported_sources[source_type]
                parsed_data = parser(content, import_type)
            else:
                return {
                    "is_valid": False,
                    "total_records": 0,
                    "errors": [f"Unsupported source type: {source_type}"],
                    "warnings": []
                }
            
            if not parsed_data:
                return {
                    "is_valid": False,
                    "total_records": 0,
                    "errors": ["No valid data found in file"],
                    "warnings": []
                }
            
            # Validate data structure
            validation_errors = []
            validation_warnings = []
            
            # Check for required fields based on import type
            required_fields = self._get_required_fields(import_type)
            available_fields = set()
            
            if parsed_data:
                available_fields = set(parsed_data[0].keys())
            
            # Check for missing required fields
            missing_fields = []
            for field in required_fields:
                if not any(self._field_matches(field, available) for available in available_fields):
                    missing_fields.append(field)
            
            if missing_fields:
                validation_errors.append(f"Missing required fields: {', '.join(missing_fields)}")
            
            # Validate data quality
            for i, record in enumerate(parsed_data[:100]):  # Sample first 100 records
                record_errors = self._validate_record(record, import_type, i + 1)
                validation_errors.extend(record_errors)
            
            # Check for potential duplicates
            duplicates = self._find_potential_duplicates(parsed_data, import_type)
            if duplicates:
                validation_warnings.append(f"Found {len(duplicates)} potential duplicate records")
            
            return {
                "is_valid": len(validation_errors) == 0,
                "total_records": len(parsed_data),
                "errors": validation_errors,
                "warnings": validation_warnings
            }
            
        except Exception as e:
            return {
                "is_valid": False,
                "total_records": 0,
                "errors": [f"File validation failed: {str(e)}"],
                "warnings": []
            }

    def generate_preview(self, content: str, source_type: str, import_type: str, 
                        field_mapping: Optional[Dict[str, str]], max_records: int = 10) -> Dict[str, Any]:
        """Generate preview of import data with field mapping and validation"""
        try:
            # Parse content
            parser = self.supported_sources[source_type]
            parsed_data = parser(content, import_type)
            
            if not parsed_data:
                raise ValueError("No data found in file")
            
            # Generate or use provided field mapping
            if not field_mapping:
                field_mapping = self._generate_field_mapping(parsed_data[0].keys(), import_type)
            
            # Apply field mapping and validate sample records
            preview_records = []
            for i, record in enumerate(parsed_data[:max_records]):
                mapped_record = self._apply_field_mapping(record, field_mapping)
                validation_result = self._validate_record(mapped_record, import_type, i + 1)
                
                preview_records.append({
                    "row_number": i + 1,
                    "data": mapped_record,
                    "validation_status": "error" if validation_result else "valid",
                    "validation_messages": validation_result,
                    "is_duplicate": self._is_potential_duplicate(mapped_record, import_type),
                    "suggested_action": "review" if validation_result else "import"
                })
            
            # Overall validation
            validation_results = self._validate_all_records(parsed_data, field_mapping, import_type)
            
            # Generate recommendations
            recommendations = self._generate_import_recommendations(
                parsed_data, field_mapping, validation_results, import_type
            )
            
            return {
                "sample_records": preview_records,
                "total_records": len(parsed_data),
                "suggested_mapping": field_mapping,
                "validation_results": validation_results,
                "potential_duplicates": len(self._find_potential_duplicates(parsed_data, import_type)),
                "data_quality_issues": self._identify_data_quality_issues(parsed_data, import_type),
                "recommendations": recommendations,
                "estimated_duration": self._estimate_import_duration(len(parsed_data))
            }
            
        except Exception as e:
            raise ValueError(f"Preview generation failed: {str(e)}")

    def execute_import(self, content: str, source_type: str, import_type: str,
                      field_mapping: Dict[str, str], options: Dict[str, Any],
                      progress_callback: Callable, db: Session, user_id: int) -> Dict[str, Any]:
        """Execute the actual import process"""
        try:
            # Parse data
            parser = self.supported_sources[source_type]
            parsed_data = parser(content, import_type)
            
            if not parsed_data:
                raise ValueError("No data found to import")
            
            # Initialize counters
            total_records = len(parsed_data)
            processed = 0
            successful = 0
            failed = 0
            errors = []
            warnings = []
            imported_ids = []
            
            batch_size = options.get("batch_size", 100)
            error_threshold = options.get("error_threshold", 10)
            rollback_on_error = options.get("rollback_on_error", True)
            
            # Process in batches
            for batch_start in range(0, total_records, batch_size):
                batch_end = min(batch_start + batch_size, total_records)
                batch_data = parsed_data[batch_start:batch_end]
                
                try:
                    batch_result = self._process_batch(
                        batch_data, field_mapping, import_type, options, db, user_id
                    )
                    
                    successful += batch_result["successful"]
                    failed += batch_result["failed"]
                    errors.extend(batch_result["errors"])
                    warnings.extend(batch_result["warnings"])
                    imported_ids.extend(batch_result["imported_ids"])
                    
                    processed = batch_end
                    
                    # Update progress
                    progress_callback({
                        "percentage": int((processed / total_records) * 100),
                        "processed": processed,
                        "successful": successful,
                        "failed": failed,
                        "operation": f"Processing batch {batch_start//batch_size + 1}",
                        "estimated_completion": self._calculate_eta(processed, total_records)
                    })
                    
                    # Check error threshold
                    if failed >= error_threshold:
                        if rollback_on_error:
                            self._rollback_imported_records(imported_ids, import_type, db)
                            raise ValueError(f"Error threshold reached ({failed} failures). Import rolled back.")
                        else:
                            break
                    
                    # Commit batch
                    db.commit()
                    
                except Exception as batch_error:
                    db.rollback()
                    if rollback_on_error:
                        self._rollback_imported_records(imported_ids, import_type, db)
                        raise
                    else:
                        errors.append(f"Batch {batch_start//batch_size + 1} failed: {str(batch_error)}")
                        failed += len(batch_data)
                        processed = batch_end
            
            # Final results
            return {
                "success": failed < error_threshold,
                "processed_records": processed,
                "successful_imports": successful,
                "failed_imports": failed,
                "errors": errors,
                "warnings": warnings,
                "imported_record_ids": imported_ids,
                "summary": {
                    "total_processed": processed,
                    "success_rate": (successful / processed * 100) if processed > 0 else 0,
                    "error_rate": (failed / processed * 100) if processed > 0 else 0
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "processed_records": 0,
                "successful_imports": 0,
                "failed_imports": 0,
                "errors": [f"Import execution failed: {str(e)}"],
                "warnings": [],
                "imported_record_ids": [],
                "summary": {"error": str(e)}
            }

    def rollback_import(self, import_id: str, imported_record_ids: List[int],
                       rollback_type: str, selective_criteria: Optional[Dict[str, Any]],
                       db: Session, user_id: int) -> Dict[str, Any]:
        """Rollback imported records"""
        try:
            rollback_count = 0
            
            if rollback_type == "soft_delete":
                # Mark records as inactive
                for record_id in imported_record_ids:
                    # This would depend on the record type
                    # For now, implement for clients as an example
                    client = db.query(models.Client).filter(models.Client.id == record_id).first()
                    if client:
                        client.is_active = False
                        rollback_count += 1
                        
            elif rollback_type == "hard_delete":
                # Permanently delete records
                for record_id in imported_record_ids:
                    client = db.query(models.Client).filter(models.Client.id == record_id).first()
                    if client:
                        db.delete(client)
                        rollback_count += 1
            
            db.commit()
            
            return {
                "success": True,
                "rollback_count": rollback_count,
                "summary": f"Successfully rolled back {rollback_count} records"
            }
            
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "rollback_count": 0,
                "summary": f"Rollback failed: {str(e)}"
            }

    # Private helper methods
    
    def _parse_csv_format(self, content: str, import_type: str) -> List[Dict[str, Any]]:
        """Parse CSV format data"""
        try:
            reader = csv.DictReader(io.StringIO(content))
            return [dict(row) for row in reader]
        except Exception as e:
            raise ValueError(f"CSV parsing failed: {str(e)}")

    def _parse_json_format(self, content: str, import_type: str) -> List[Dict[str, Any]]:
        """Parse JSON format data"""
        try:
            data = json.loads(content)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # Try to find the data array in the JSON
                for key in ["data", "records", "items", "clients", "appointments"]:
                    if key in data and isinstance(data[key], list):
                        return data[key]
                return [data]  # Single record
            else:
                raise ValueError("JSON format not supported")
        except Exception as e:
            raise ValueError(f"JSON parsing failed: {str(e)}")

    def _parse_booksy_format(self, content: str, import_type: str) -> List[Dict[str, Any]]:
        """Parse Booksy export format"""
        # Booksy typically exports CSV with specific column names
        data = self._parse_csv_format(content, import_type)
        
        # Apply Booksy-specific field transformations
        for record in data:
            # Standardize Booksy field names
            if "Customer Name" in record:
                name_parts = record["Customer Name"].split(" ", 1)
                record["first_name"] = name_parts[0]
                record["last_name"] = name_parts[1] if len(name_parts) > 1 else ""
            
            if "Customer Email" in record:
                record["email"] = record["Customer Email"]
                
            if "Customer Phone" in record:
                record["phone"] = record["Customer Phone"]
        
        return data

    def _parse_square_format(self, content: str, import_type: str) -> List[Dict[str, Any]]:
        """Parse Square export format"""
        data = self._parse_csv_format(content, import_type)
        
        # Apply Square-specific transformations
        for record in data:
            # Square uses different field names
            if "Customer Name" in record:
                record["customer_name"] = record["Customer Name"]
            if "Email Address" in record:
                record["email"] = record["Email Address"]
        
        return data

    def _parse_acuity_format(self, content: str, import_type: str) -> List[Dict[str, Any]]:
        """Parse Acuity Scheduling export format"""
        return self._parse_csv_format(content, import_type)

    def _parse_mindbody_format(self, content: str, import_type: str) -> List[Dict[str, Any]]:
        """Parse MindBody export format"""
        return self._parse_csv_format(content, import_type)

    def _get_required_fields(self, import_type: str) -> List[str]:
        """Get required fields for each import type"""
        required_fields = {
            "clients": ["first_name", "last_name", "email"],
            "appointments": ["client_email", "service_name", "start_time"],
            "services": ["name", "duration_minutes", "base_price"],
            "barbers": ["name", "email"],
            "payments": ["amount", "appointment_id"]
        }
        return required_fields.get(import_type, [])

    def _field_matches(self, target_field: str, available_field: str) -> bool:
        """Check if an available field matches a target field"""
        target_variations = self.standard_mappings.get("clients", {}).get(target_field, [target_field])
        return available_field.lower() in [v.lower() for v in target_variations]

    def _validate_record(self, record: Dict[str, Any], import_type: str, row_number: int) -> List[str]:
        """Validate a single record"""
        errors = []
        
        if import_type == "clients":
            # Validate email format
            email = record.get("email", "").strip()
            if email and not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
                errors.append(f"Row {row_number}: Invalid email format")
            
            # Validate required fields
            if not record.get("first_name", "").strip():
                errors.append(f"Row {row_number}: First name is required")
            if not record.get("last_name", "").strip():
                errors.append(f"Row {row_number}: Last name is required")
                
        elif import_type == "appointments":
            # Validate datetime format
            start_time = record.get("start_time", "")
            if start_time:
                try:
                    datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                except ValueError:
                    errors.append(f"Row {row_number}: Invalid datetime format for start_time")
            
            # Validate duration
            duration = record.get("duration_minutes")
            if duration:
                try:
                    duration_int = int(duration)
                    if duration_int <= 0 or duration_int > 480:  # Max 8 hours
                        errors.append(f"Row {row_number}: Duration must be between 1 and 480 minutes")
                except ValueError:
                    errors.append(f"Row {row_number}: Duration must be a number")
        
        return errors

    def _find_potential_duplicates(self, data: List[Dict[str, Any]], import_type: str) -> List[Dict[str, Any]]:
        """Find potential duplicate records"""
        duplicates = []
        seen = set()
        
        for record in data:
            if import_type == "clients":
                # Check for duplicate emails
                email = record.get("email", "").strip().lower()
                if email and email in seen:
                    duplicates.append(record)
                elif email:
                    seen.add(email)
        
        return duplicates

    def _is_potential_duplicate(self, record: Dict[str, Any], import_type: str) -> bool:
        """Check if a single record is a potential duplicate"""
        # This would check against existing database records
        # For now, return False as a placeholder
        return False

    def _generate_field_mapping(self, available_fields: List[str], import_type: str) -> Dict[str, str]:
        """Generate automatic field mapping based on field names"""
        mapping = {}
        standard_fields = self.standard_mappings.get(import_type, {})
        
        for target_field, variations in standard_fields.items():
            for available_field in available_fields:
                if available_field.lower() in [v.lower() for v in variations]:
                    mapping[available_field] = target_field
                    break
        
        return mapping

    def _apply_field_mapping(self, record: Dict[str, Any], field_mapping: Dict[str, str]) -> Dict[str, Any]:
        """Apply field mapping to a record"""
        mapped_record = {}
        for source_field, target_field in field_mapping.items():
            if source_field in record:
                mapped_record[target_field] = record[source_field]
        return mapped_record

    def _validate_all_records(self, data: List[Dict[str, Any]], field_mapping: Dict[str, str], 
                             import_type: str) -> Dict[str, Any]:
        """Validate all records and return summary"""
        total_records = len(data)
        valid_records = 0
        warning_records = 0
        error_records = 0
        validation_errors = []
        field_mapping_issues = []
        
        for i, record in enumerate(data):
            mapped_record = self._apply_field_mapping(record, field_mapping)
            record_errors = self._validate_record(mapped_record, import_type, i + 1)
            
            if not record_errors:
                valid_records += 1
            else:
                error_records += 1
                validation_errors.extend(record_errors)
        
        return {
            "total_records": total_records,
            "valid_records": valid_records,
            "warning_records": warning_records,
            "error_records": error_records,
            "validation_errors": validation_errors[:20],  # Limit to first 20 errors
            "field_mapping_issues": field_mapping_issues
        }

    def _identify_data_quality_issues(self, data: List[Dict[str, Any]], import_type: str) -> List[str]:
        """Identify data quality issues"""
        issues = []
        
        if not data:
            return ["No data found in file"]
        
        # Check for empty records
        empty_records = sum(1 for record in data if not any(record.values()))
        if empty_records > 0:
            issues.append(f"{empty_records} empty records found")
        
        # Check for inconsistent field names
        all_fields = set()
        for record in data:
            all_fields.update(record.keys())
        
        if len(all_fields) > 50:  # Too many fields might indicate parsing issues
            issues.append("Large number of fields detected - check data structure")
        
        return issues

    def _generate_import_recommendations(self, data: List[Dict[str, Any]], field_mapping: Dict[str, str],
                                       validation_results: Dict[str, Any], import_type: str) -> List[str]:
        """Generate recommendations for successful import"""
        recommendations = []
        
        error_rate = validation_results["error_records"] / validation_results["total_records"] if validation_results["total_records"] > 0 else 0
        
        if error_rate > 0.1:  # More than 10% errors
            recommendations.append("High error rate detected. Consider cleaning data before import.")
        
        if error_rate > 0.5:  # More than 50% errors
            recommendations.append("Very high error rate. Review field mapping and data format.")
        
        if validation_results["total_records"] > 10000:
            recommendations.append("Large dataset detected. Consider importing in smaller batches.")
        
        if len(field_mapping) < len(self._get_required_fields(import_type)):
            recommendations.append("Some required fields are not mapped. Review field mapping.")
        
        return recommendations

    def _estimate_import_duration(self, record_count: int) -> str:
        """Estimate import duration based on record count"""
        # Assume 100 records per second processing rate
        seconds = record_count / 100
        
        if seconds < 60:
            return f"{int(seconds)} seconds"
        elif seconds < 3600:
            return f"{int(seconds / 60)} minutes"
        else:
            return f"{int(seconds / 3600)} hours"

    def _calculate_eta(self, processed: int, total: int) -> str:
        """Calculate estimated time of arrival"""
        if processed == 0:
            return "Unknown"
        
        # Simple ETA calculation
        rate = processed / 60  # Assume 1 minute has passed
        remaining = total - processed
        eta_seconds = remaining / rate if rate > 0 else 0
        
        if eta_seconds < 60:
            return f"{int(eta_seconds)} seconds"
        else:
            return f"{int(eta_seconds / 60)} minutes"

    def _process_batch(self, batch_data: List[Dict[str, Any]], field_mapping: Dict[str, str],
                      import_type: str, options: Dict[str, Any], db: Session, user_id: int) -> Dict[str, Any]:
        """Process a batch of records"""
        successful = 0
        failed = 0
        errors = []
        warnings = []
        imported_ids = []
        
        for i, record in enumerate(batch_data):
            try:
                mapped_record = self._apply_field_mapping(record, field_mapping)
                
                # Import based on type
                if import_type == "clients":
                    result = self._import_client(mapped_record, options, db, user_id)
                elif import_type == "appointments":
                    result = self._import_appointment(mapped_record, options, db, user_id)
                elif import_type == "services":
                    result = self._import_service(mapped_record, options, db, user_id)
                else:
                    raise ValueError(f"Unsupported import type: {import_type}")
                
                if result["success"]:
                    successful += 1
                    if result.get("record_id"):
                        imported_ids.append(result["record_id"])
                else:
                    failed += 1
                    errors.append(result["error"])
                    
            except Exception as e:
                failed += 1
                errors.append(f"Record {i + 1}: {str(e)}")
        
        return {
            "successful": successful,
            "failed": failed,
            "errors": errors,
            "warnings": warnings,
            "imported_ids": imported_ids
        }

    def _import_client(self, record: Dict[str, Any], options: Dict[str, Any], 
                      db: Session, user_id: int) -> Dict[str, Any]:
        """Import a single client record"""
        try:
            # Check for existing client by email
            email = record.get("email", "").strip().lower()
            existing_client = None
            
            if email:
                existing_client = db.query(models.Client).filter(
                    models.Client.email == email
                ).first()
            
            duplicate_handling = options.get("duplicate_handling", "skip")
            
            if existing_client:
                if duplicate_handling == "skip":
                    return {"success": True, "message": "Skipped duplicate"}
                elif duplicate_handling == "update":
                    # Update existing client
                    for field, value in record.items():
                        if hasattr(existing_client, field) and value:
                            setattr(existing_client, field, value)
                    
                    existing_client.updated_at = datetime.utcnow()
                    db.commit()
                    db.refresh(existing_client)
                    
                    return {"success": True, "record_id": existing_client.id, "message": "Updated existing client"}
            
            # Create new client
            client_data = {
                "first_name": record.get("first_name", ""),
                "last_name": record.get("last_name", ""),
                "email": email,
                "phone": record.get("phone", ""),
                "notes": record.get("notes", ""),
                "created_by_id": user_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Handle date of birth
            dob_str = record.get("date_of_birth", "")
            if dob_str:
                try:
                    client_data["date_of_birth"] = datetime.strptime(dob_str, "%Y-%m-%d").date()
                except ValueError:
                    # Try other date formats
                    for fmt in ["%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"]:
                        try:
                            client_data["date_of_birth"] = datetime.strptime(dob_str, fmt).date()
                            break
                        except ValueError:
                            continue
            
            new_client = models.Client(**client_data)
            db.add(new_client)
            db.flush()  # Get ID without committing
            
            return {"success": True, "record_id": new_client.id, "message": "Created new client"}
            
        except Exception as e:
            return {"success": False, "error": f"Failed to import client: {str(e)}"}

    def _import_appointment(self, record: Dict[str, Any], options: Dict[str, Any],
                           db: Session, user_id: int) -> Dict[str, Any]:
        """Import a single appointment record"""
        try:
            # Find client by email
            client_email = record.get("client_email", "").strip().lower()
            if not client_email:
                return {"success": False, "error": "Client email is required"}
            
            client = db.query(models.Client).filter(
                models.Client.email == client_email
            ).first()
            
            if not client:
                return {"success": False, "error": f"Client not found: {client_email}"}
            
            # Parse start time
            start_time_str = record.get("start_time", "")
            try:
                start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
            except ValueError:
                return {"success": False, "error": f"Invalid start time format: {start_time_str}"}
            
            # Create appointment
            appointment_data = {
                "user_id": client.id,  # Link to client's user account if exists
                "client_id": client.id,
                "service_name": record.get("service_name", ""),
                "start_time": start_time,
                "duration_minutes": int(record.get("duration_minutes", 30)),
                "price": float(record.get("price", 0)),
                "status": record.get("status", "confirmed"),
                "notes": record.get("notes", ""),
                "created_at": datetime.utcnow()
            }
            
            new_appointment = models.Appointment(**appointment_data)
            db.add(new_appointment)
            db.flush()
            
            return {"success": True, "record_id": new_appointment.id, "message": "Created appointment"}
            
        except Exception as e:
            return {"success": False, "error": f"Failed to import appointment: {str(e)}"}

    def _import_service(self, record: Dict[str, Any], options: Dict[str, Any],
                       db: Session, user_id: int) -> Dict[str, Any]:
        """Import a single service record"""
        try:
            # Check for existing service by name
            service_name = record.get("name", "").strip()
            if not service_name:
                return {"success": False, "error": "Service name is required"}
            
            existing_service = db.query(models.Service).filter(
                models.Service.name == service_name
            ).first()
            
            duplicate_handling = options.get("duplicate_handling", "skip")
            
            if existing_service and duplicate_handling == "skip":
                return {"success": True, "message": "Skipped duplicate service"}
            
            # Create new service
            service_data = {
                "name": service_name,
                "description": record.get("description", ""),
                "duration_minutes": int(record.get("duration_minutes", 30)),
                "base_price": float(record.get("base_price", 0)),
                "category": models.ServiceCategoryEnum.OTHER,  # Default category
                "created_by_id": user_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Map category if provided
            category_str = record.get("category", "").lower()
            category_mapping = {
                "haircut": models.ServiceCategoryEnum.HAIRCUT,
                "shave": models.ServiceCategoryEnum.SHAVE,
                "beard": models.ServiceCategoryEnum.BEARD,
                "treatment": models.ServiceCategoryEnum.HAIR_TREATMENT,
                "styling": models.ServiceCategoryEnum.STYLING,
                "color": models.ServiceCategoryEnum.COLOR
            }
            
            if category_str in category_mapping:
                service_data["category"] = category_mapping[category_str]
            
            new_service = models.Service(**service_data)
            db.add(new_service)
            db.flush()
            
            return {"success": True, "record_id": new_service.id, "message": "Created service"}
            
        except Exception as e:
            return {"success": False, "error": f"Failed to import service: {str(e)}"}

    def _rollback_imported_records(self, imported_ids: List[int], import_type: str, db: Session):
        """Rollback imported records in case of error"""
        try:
            if import_type == "clients":
                db.query(models.Client).filter(models.Client.id.in_(imported_ids)).delete()
            elif import_type == "appointments":
                db.query(models.Appointment).filter(models.Appointment.id.in_(imported_ids)).delete()
            elif import_type == "services":
                db.query(models.Service).filter(models.Service.id.in_(imported_ids)).delete()
            
            db.commit()
        except Exception:
            # If rollback fails, log the error but don't raise
            pass