"""
Trafft Data Mapper
Maps data between Trafft API format and 6FB internal format
Handles the transformation of appointments, customers, and payments
"""
from typing import Dict, Any, Optional
from datetime import datetime, date
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

class TrafftDataMapper:
    """Maps data between Trafft API and 6FB database formats"""
    
    def __init__(self):
        self.service_mappings = self._load_service_mappings()
        self.customer_type_mappings = self._load_customer_type_mappings()
    
    def _load_service_mappings(self) -> Dict[str, str]:
        """Load service name mappings from Trafft to 6FB categories"""
        return {
            # Common barbershop services
            "haircut": "Haircut",
            "hair cut": "Haircut", 
            "cut": "Haircut",
            "standard cut": "Haircut",
            "premium cut": "Premium Cut",
            "beard trim": "Beard Trim",
            "beard": "Beard Trim",
            "mustache trim": "Mustache Trim",
            "shave": "Shave",
            "hot towel shave": "Hot Towel Shave",
            "straight razor shave": "Straight Razor Shave",
            "styling": "Styling",
            "hair styling": "Styling",
            "wash": "Wash",
            "hair wash": "Wash",
            "consultation": "Consultation",
            # Combo services
            "cut and beard": "Cut + Beard",
            "haircut and beard": "Cut + Beard",
            "cut & beard": "Cut + Beard",
            "haircut & beard trim": "Cut + Beard",
            "cut and style": "Cut + Style",
            "haircut and styling": "Cut + Style",
            "premium package": "Premium Package",
            "full service": "Full Service"
        }
    
    def _load_customer_type_mappings(self) -> Dict[str, str]:
        """Load customer type mappings"""
        return {
            "new": "new",
            "returning": "returning",
            "regular": "returning",
            "existing": "returning",
            "repeat": "returning"
        }
    
    def map_appointment(self, trafft_appointment: Dict[str, Any]) -> Dict[str, Any]:
        """Map Trafft appointment to 6FB appointment format"""
        try:
            # Parse appointment date/time
            appointment_datetime = self._parse_datetime(
                trafft_appointment.get('dateTime') or 
                trafft_appointment.get('date') + ' ' + trafft_appointment.get('time', '00:00')
            )
            
            # Map service information
            service_data = trafft_appointment.get('service', {})
            service_name = self._map_service_name(service_data.get('name', ''))
            
            # Map customer information
            customer_data = trafft_appointment.get('customer', {})
            customer_type = self._determine_customer_type(customer_data, trafft_appointment)
            
            # Extract financial data
            financial_data = self._extract_financial_data(trafft_appointment)
            
            # Map appointment status
            status = self._map_appointment_status(trafft_appointment.get('status', 'scheduled'))
            
            mapped_data = {
                'trafft_id': trafft_appointment.get('id'),
                'appointment_date': appointment_datetime.date(),
                'appointment_time': appointment_datetime.time(),
                'client_name': self._get_customer_name(customer_data),
                'client_phone': customer_data.get('phone', ''),
                'client_email': customer_data.get('email', ''),
                'service_name': service_name,
                'service_duration': service_data.get('duration', 60),  # minutes
                'service_revenue': financial_data['service_revenue'],
                'tip_amount': financial_data['tip_amount'],
                'product_revenue': financial_data['product_revenue'],
                'total_amount': financial_data['total_amount'],
                'customer_type': customer_type,
                'status': status,
                'payment_status': trafft_appointment.get('paymentStatus', 'pending'),
                'notes': trafft_appointment.get('notes', ''),
                'trafft_service_id': service_data.get('id'),
                'trafft_customer_id': customer_data.get('id'),
                'created_at': self._parse_datetime(trafft_appointment.get('createdAt')),
                'updated_at': self._parse_datetime(trafft_appointment.get('updatedAt'))
            }
            
            # Add barber/employee information if available
            employee_data = trafft_appointment.get('employee', {})
            if employee_data:
                mapped_data['barber_name'] = self._get_employee_name(employee_data)
                mapped_data['trafft_employee_id'] = employee_data.get('id')
            
            return mapped_data
            
        except Exception as e:
            logger.error(f"Error mapping Trafft appointment: {e}")
            logger.error(f"Trafft appointment data: {trafft_appointment}")
            raise
    
    def map_customer(self, trafft_customer: Dict[str, Any]) -> Dict[str, Any]:
        """Map Trafft customer to 6FB client format"""
        try:
            mapped_data = {
                'trafft_id': trafft_customer.get('id'),
                'name': self._get_customer_name(trafft_customer),
                'first_name': trafft_customer.get('firstName', ''),
                'last_name': trafft_customer.get('lastName', ''),
                'email': trafft_customer.get('email', ''),
                'phone': trafft_customer.get('phone', ''),
                'date_of_birth': self._parse_date(trafft_customer.get('dateOfBirth')),
                'gender': trafft_customer.get('gender', ''),
                'notes': trafft_customer.get('notes', ''),
                'created_at': self._parse_datetime(trafft_customer.get('createdAt')),
                'updated_at': self._parse_datetime(trafft_customer.get('updatedAt'))
            }
            
            # Calculate visit history from Trafft data
            visit_data = trafft_customer.get('visitHistory', {})
            mapped_data.update({
                'total_visits': visit_data.get('totalVisits', 0),
                'total_spent': Decimal(str(visit_data.get('totalSpent', 0.0))),
                'last_visit_date': self._parse_date(visit_data.get('lastVisitDate')),
                'average_ticket': Decimal(str(visit_data.get('averageTicket', 0.0)))
            })
            
            return mapped_data
            
        except Exception as e:
            logger.error(f"Error mapping Trafft customer: {e}")
            logger.error(f"Trafft customer data: {trafft_customer}")
            raise
    
    def map_payment(self, trafft_payment: Dict[str, Any]) -> Dict[str, Any]:
        """Map Trafft payment to 6FB payment format"""
        try:
            total_amount = Decimal(str(trafft_payment.get('totalAmount', 0.0)))
            tip_amount = Decimal(str(trafft_payment.get('tipAmount', 0.0)))
            
            # Extract service and product revenue
            items = trafft_payment.get('items', [])
            service_revenue = Decimal('0.0')
            product_revenue = Decimal('0.0')
            
            for item in items:
                item_type = item.get('type', 'service')
                item_amount = Decimal(str(item.get('amount', 0.0)))
                
                if item_type in ['service', 'appointment']:
                    service_revenue += item_amount
                elif item_type in ['product', 'retail']:
                    product_revenue += item_amount
            
            # If no itemized breakdown, assume all is service revenue
            if service_revenue == 0 and product_revenue == 0:
                service_revenue = total_amount - tip_amount
            
            return {
                'service_revenue': float(service_revenue),
                'tip_amount': float(tip_amount),
                'product_revenue': float(product_revenue),
                'total_amount': float(total_amount),
                'payment_method': trafft_payment.get('paymentMethod', 'cash'),
                'payment_status': trafft_payment.get('status', 'completed')
            }
            
        except Exception as e:
            logger.error(f"Error mapping Trafft payment: {e}")
            logger.error(f"Trafft payment data: {trafft_payment}")
            raise
    
    def _map_service_name(self, trafft_service_name: str) -> str:
        """Map Trafft service name to standardized 6FB service name"""
        if not trafft_service_name:
            return "Standard Service"
        
        # Normalize the service name
        normalized = trafft_service_name.lower().strip()
        
        # Check direct mappings
        if normalized in self.service_mappings:
            return self.service_mappings[normalized]
        
        # Check for partial matches
        for trafft_name, sixfb_name in self.service_mappings.items():
            if trafft_name in normalized or normalized in trafft_name:
                return sixfb_name
        
        # Return original if no mapping found
        return trafft_service_name.title()
    
    def _determine_customer_type(self, customer_data: Dict[str, Any], 
                                appointment_data: Dict[str, Any]) -> str:
        """Determine if customer is new or returning"""
        # Check explicit customer type in appointment
        explicit_type = appointment_data.get('customerType', '').lower()
        if explicit_type in self.customer_type_mappings:
            return self.customer_type_mappings[explicit_type]
        
        # Check customer visit history
        visit_history = customer_data.get('visitHistory', {})
        total_visits = visit_history.get('totalVisits', 0)
        
        # If customer has previous visits, they're returning
        if total_visits > 1:
            return "returning"
        elif total_visits == 1:
            # This might be their second appointment
            return "returning"
        else:
            # New customer
            return "new"
    
    def _extract_financial_data(self, trafft_appointment: Dict[str, Any]) -> Dict[str, float]:
        """Extract financial data from Trafft appointment"""
        try:
            # Try to get payment information
            payment_data = trafft_appointment.get('payment', {})
            if payment_data:
                return self.map_payment(payment_data)
            
            # Fallback to appointment-level pricing
            total_amount = float(trafft_appointment.get('price', 0.0) or 
                               trafft_appointment.get('totalAmount', 0.0) or 
                               trafft_appointment.get('cost', 0.0))
            
            tip_amount = float(trafft_appointment.get('tipAmount', 0.0) or 
                             trafft_appointment.get('tip', 0.0))
            
            service_revenue = total_amount - tip_amount
            
            return {
                'service_revenue': max(0.0, service_revenue),
                'tip_amount': tip_amount,
                'product_revenue': 0.0,  # No product info at appointment level
                'total_amount': total_amount
            }
            
        except Exception as e:
            logger.warning(f"Error extracting financial data: {e}")
            return {
                'service_revenue': 0.0,
                'tip_amount': 0.0,
                'product_revenue': 0.0,
                'total_amount': 0.0
            }
    
    def _map_appointment_status(self, trafft_status: str) -> str:
        """Map Trafft appointment status to 6FB status"""
        status_mappings = {
            'scheduled': 'scheduled',
            'confirmed': 'scheduled', 
            'pending': 'scheduled',
            'arrived': 'in_progress',
            'in_progress': 'in_progress',
            'started': 'in_progress',
            'completed': 'completed',
            'finished': 'completed',
            'done': 'completed',
            'cancelled': 'cancelled',
            'canceled': 'cancelled',
            'no_show': 'no_show',
            'noshow': 'no_show'
        }
        
        normalized_status = trafft_status.lower().replace('-', '_').replace(' ', '_')
        return status_mappings.get(normalized_status, 'scheduled')
    
    def _get_customer_name(self, customer_data: Dict[str, Any]) -> str:
        """Get customer full name from Trafft customer data"""
        first_name = customer_data.get('firstName', '').strip()
        last_name = customer_data.get('lastName', '').strip()
        
        if first_name and last_name:
            return f"{first_name} {last_name}"
        elif first_name:
            return first_name
        elif last_name:
            return last_name
        else:
            return customer_data.get('name', 'Unknown Customer')
    
    def _get_employee_name(self, employee_data: Dict[str, Any]) -> str:
        """Get employee full name from Trafft employee data"""
        first_name = employee_data.get('firstName', '').strip()
        last_name = employee_data.get('lastName', '').strip()
        
        if first_name and last_name:
            return f"{first_name} {last_name}"
        elif first_name:
            return first_name
        elif last_name:
            return last_name
        else:
            return employee_data.get('name', 'Unknown Barber')
    
    def _parse_datetime(self, datetime_str: Optional[str]) -> Optional[datetime]:
        """Parse datetime string from Trafft API"""
        if not datetime_str:
            return None
        
        # Common datetime formats from Trafft
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%d"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(datetime_str, fmt)
            except ValueError:
                continue
        
        logger.warning(f"Could not parse datetime: {datetime_str}")
        return None
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        """Parse date string from Trafft API"""
        if not date_str:
            return None
        
        parsed_datetime = self._parse_datetime(date_str)
        return parsed_datetime.date() if parsed_datetime else None
    
    def reverse_map_appointment(self, sixfb_appointment: Dict[str, Any]) -> Dict[str, Any]:
        """Map 6FB appointment back to Trafft format for API calls"""
        try:
            # Combine date and time for Trafft
            appointment_date = sixfb_appointment.get('appointment_date')
            appointment_time = sixfb_appointment.get('appointment_time')
            
            if appointment_date and appointment_time:
                if isinstance(appointment_date, str):
                    appointment_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
                if isinstance(appointment_time, str):
                    appointment_time = datetime.strptime(appointment_time, '%H:%M:%S').time()
                
                appointment_datetime = datetime.combine(appointment_date, appointment_time)
            else:
                appointment_datetime = datetime.now()
            
            return {
                'dateTime': appointment_datetime.isoformat(),
                'customerId': sixfb_appointment.get('trafft_customer_id'),
                'serviceId': sixfb_appointment.get('trafft_service_id'),
                'employeeId': sixfb_appointment.get('trafft_employee_id'),
                'notes': sixfb_appointment.get('notes', ''),
                'status': self._reverse_map_status(sixfb_appointment.get('status', 'scheduled'))
            }
            
        except Exception as e:
            logger.error(f"Error reverse mapping appointment: {e}")
            raise
    
    def _reverse_map_status(self, sixfb_status: str) -> str:
        """Map 6FB status back to Trafft status"""
        reverse_mappings = {
            'scheduled': 'scheduled',
            'in_progress': 'in_progress',
            'completed': 'completed',
            'cancelled': 'cancelled',
            'no_show': 'no_show'
        }
        
        return reverse_mappings.get(sixfb_status, 'scheduled')