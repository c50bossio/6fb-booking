"""
Trafft Sync Service
Handles initial data import and ongoing synchronization with Trafft
"""
import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from .trafft_client import get_trafft_client, TrafftAPIError
from .trafft_data_mapper import TrafftDataMapper
from .sixfb_calculator import SixFBCalculator
from models.appointment import Appointment
from models.client import Client
from models.barber import Barber
from config.database import get_db
from config.settings import settings

logger = logging.getLogger(__name__)

class TrafftSyncService:
    """Service for synchronizing data with Trafft"""
    
    def __init__(self, db: Session):
        self.db = db
        self.mapper = TrafftDataMapper()
        self.calculator = SixFBCalculator(db)
    
    async def initial_import(self, days_back: int = 30) -> Dict[str, Any]:
        """
        Perform initial import of data from Trafft
        Imports appointments, customers, and services from the last N days
        """
        logger.info(f"Starting initial Trafft import for last {days_back} days")
        
        try:
            async with await get_trafft_client() as client:
                # Calculate date range
                end_date = datetime.now()
                start_date = end_date - timedelta(days=days_back)
                
                # Import employees first (to get barber mappings)
                employees_imported = await self._import_employees(client)
                
                # Import customers
                customers_imported = await self._import_customers(client)
                
                # Import appointments
                appointments_imported = await self._import_appointments(
                    client, start_date, end_date
                )
                
                # Import services
                services_imported = await self._import_services(client)
                
                # Recalculate all 6FB scores
                await self._recalculate_all_scores()
                
                import_summary = {
                    "status": "completed",
                    "import_date": datetime.utcnow().isoformat(),
                    "date_range": {
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat()
                    },
                    "imported": {
                        "employees": employees_imported,
                        "customers": customers_imported,
                        "appointments": appointments_imported,
                        "services": services_imported
                    }
                }
                
                logger.info(f"Initial import completed: {import_summary}")
                return import_summary
                
        except Exception as e:
            logger.error(f"Initial import failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "import_date": datetime.utcnow().isoformat()
            }
    
    async def _import_employees(self, client) -> int:
        """Import employees/barbers from Trafft"""
        try:
            trafft_employees = await client.get_employees()
            imported_count = 0
            
            for trafft_employee in trafft_employees:
                try:
                    # Check if employee already exists
                    existing_barber = self.db.query(Barber).filter(
                        Barber.trafft_id == trafft_employee.get('id')
                    ).first()
                    
                    if existing_barber:
                        # Update existing barber
                        existing_barber.name = self.mapper._get_employee_name(trafft_employee)
                        existing_barber.email = trafft_employee.get('email', '')
                        existing_barber.updated_at = datetime.utcnow()
                    else:
                        # Create new barber
                        barber = Barber(
                            trafft_id=trafft_employee.get('id'),
                            name=self.mapper._get_employee_name(trafft_employee),
                            email=trafft_employee.get('email', ''),
                            phone=trafft_employee.get('phone', ''),
                            created_at=datetime.utcnow()
                        )
                        self.db.add(barber)
                    
                    imported_count += 1
                    
                except Exception as e:
                    logger.error(f"Error importing employee {trafft_employee.get('id')}: {e}")
            
            self.db.commit()
            logger.info(f"Imported {imported_count} employees")
            return imported_count
            
        except Exception as e:
            logger.error(f"Error importing employees: {e}")
            return 0
    
    async def _import_customers(self, client) -> int:
        """Import customers from Trafft"""
        try:
            imported_count = 0
            offset = 0
            limit = 100
            
            while True:
                trafft_customers = await client.get_customers(limit=limit, offset=offset)
                
                if not trafft_customers:
                    break
                
                for trafft_customer in trafft_customers:
                    try:
                        customer_data = self.mapper.map_customer(trafft_customer)
                        
                        # Check if customer already exists
                        existing_client = self.db.query(Client).filter(
                            Client.trafft_id == customer_data['trafft_id']
                        ).first()
                        
                        if existing_client:
                            # Update existing client
                            for key, value in customer_data.items():
                                if hasattr(existing_client, key) and value is not None:
                                    setattr(existing_client, key, value)
                            existing_client.updated_at = datetime.utcnow()
                        else:
                            # Create new client
                            client_obj = Client(**customer_data)
                            self.db.add(client_obj)
                        
                        imported_count += 1
                        
                    except Exception as e:
                        logger.error(f"Error importing customer {trafft_customer.get('id')}: {e}")
                
                # Check if we got fewer results than requested (end of data)
                if len(trafft_customers) < limit:
                    break
                
                offset += limit
            
            self.db.commit()
            logger.info(f"Imported {imported_count} customers")
            return imported_count
            
        except Exception as e:
            logger.error(f"Error importing customers: {e}")
            return 0
    
    async def _import_appointments(self, client, start_date: datetime, end_date: datetime) -> int:
        """Import appointments from Trafft for date range"""
        try:
            trafft_appointments = await client.get_appointments(start_date, end_date)
            imported_count = 0
            
            for trafft_appointment in trafft_appointments:
                try:
                    appointment_data = self.mapper.map_appointment(trafft_appointment)
                    
                    # Find corresponding barber
                    barber = None
                    if appointment_data.get('trafft_employee_id'):
                        barber = self.db.query(Barber).filter(
                            Barber.trafft_id == appointment_data['trafft_employee_id']
                        ).first()
                    
                    if not barber:
                        # Create default barber if none found
                        barber = self._get_or_create_default_barber()
                    
                    appointment_data['barber_id'] = barber.id
                    
                    # Find corresponding client
                    client_obj = None
                    if appointment_data.get('trafft_customer_id'):
                        client_obj = self.db.query(Client).filter(
                            Client.trafft_id == appointment_data['trafft_customer_id']
                        ).first()
                    
                    if client_obj:
                        appointment_data['client_id'] = client_obj.id
                    
                    # Check if appointment already exists
                    existing_appointment = self.db.query(Appointment).filter(
                        Appointment.trafft_id == appointment_data['trafft_id']
                    ).first()
                    
                    if existing_appointment:
                        # Update existing appointment
                        for key, value in appointment_data.items():
                            if hasattr(existing_appointment, key) and value is not None:
                                setattr(existing_appointment, key, value)
                        existing_appointment.updated_at = datetime.utcnow()
                    else:
                        # Create new appointment
                        # Remove fields that don't exist in the model
                        model_fields = {
                            key: value for key, value in appointment_data.items()
                            if key in Appointment.__table__.columns.keys()
                        }
                        appointment = Appointment(**model_fields)
                        self.db.add(appointment)
                    
                    imported_count += 1
                    
                except Exception as e:
                    logger.error(f"Error importing appointment {trafft_appointment.get('id')}: {e}")
            
            self.db.commit()
            logger.info(f"Imported {imported_count} appointments")
            return imported_count
            
        except Exception as e:
            logger.error(f"Error importing appointments: {e}")
            return 0
    
    async def _import_services(self, client) -> int:
        """Import services from Trafft"""
        try:
            trafft_services = await client.get_services()
            imported_count = len(trafft_services)
            
            # Store service mappings for future reference
            service_mappings = {}
            for service in trafft_services:
                service_mappings[service.get('id')] = {
                    'name': service.get('name'),
                    'duration': service.get('duration'),
                    'price': service.get('price'),
                    'mapped_name': self.mapper._map_service_name(service.get('name', ''))
                }
            
            # TODO: Store service mappings in database if needed
            # For now, we rely on the mapper's built-in mappings
            
            logger.info(f"Processed {imported_count} services")
            return imported_count
            
        except Exception as e:
            logger.error(f"Error importing services: {e}")
            return 0
    
    def _get_or_create_default_barber(self) -> Barber:
        """Get or create a default barber for appointments without employee info"""
        default_barber = self.db.query(Barber).filter(
            Barber.name == "Default Barber"
        ).first()
        
        if not default_barber:
            default_barber = Barber(
                name="Default Barber",
                email="",
                phone="",
                created_at=datetime.utcnow()
            )
            self.db.add(default_barber)
            self.db.commit()
        
        return default_barber
    
    async def _recalculate_all_scores(self):
        """Recalculate 6FB scores for all barbers"""
        try:
            barbers = self.db.query(Barber).all()
            
            for barber in barbers:
                await self.calculator.recalculate_scores(barber.id)
            
            logger.info(f"Recalculated 6FB scores for {len(barbers)} barbers")
            
        except Exception as e:
            logger.error(f"Error recalculating scores: {e}")
    
    async def sync_recent_changes(self, hours_back: int = 24) -> Dict[str, Any]:
        """
        Sync recent changes from Trafft (last N hours)
        Used for periodic sync to catch any missed webhook events
        """
        logger.info(f"Syncing recent changes from last {hours_back} hours")
        
        try:
            async with await get_trafft_client() as client:
                # Calculate sync window
                end_date = datetime.now()
                start_date = end_date - timedelta(hours=hours_back)
                
                # Get recent appointments
                appointments = await self._import_appointments(client, start_date, end_date)
                
                sync_summary = {
                    "status": "completed",
                    "sync_date": datetime.utcnow().isoformat(),
                    "sync_window_hours": hours_back,
                    "synced_appointments": appointments
                }
                
                logger.info(f"Recent sync completed: {sync_summary}")
                return sync_summary
                
        except Exception as e:
            logger.error(f"Recent sync failed: {e}")
            return {
                "status": "failed", 
                "error": str(e),
                "sync_date": datetime.utcnow().isoformat()
            }
    
    async def register_webhooks(self) -> Dict[str, Any]:
        """Register webhooks with Trafft for real-time sync"""
        try:
            async with await get_trafft_client() as client:
                # Get webhook URL from settings
                webhook_base_url = getattr(settings, 'WEBHOOK_BASE_URL', 'https://your-domain.com')
                webhook_url = f"{webhook_base_url}/api/webhooks/trafft"
                
                # Events we want to listen for
                events = [
                    "appointment.created",
                    "appointment.updated", 
                    "appointment.cancelled",
                    "appointment.completed",
                    "customer.created",
                    "customer.updated",
                    "payment.completed"
                ]
                
                # Register webhook
                webhook_response = await client.register_webhook(webhook_url, events)
                
                logger.info(f"Webhook registered: {webhook_response}")
                return {
                    "status": "registered",
                    "webhook_id": webhook_response.get('id'),
                    "webhook_url": webhook_url,
                    "events": events
                }
                
        except Exception as e:
            logger.error(f"Webhook registration failed: {e}")
            return {
                "status": "failed",
                "error": str(e)
            }

# Convenience functions for API endpoints
async def perform_initial_import(days_back: int = 30) -> Dict[str, Any]:
    """Perform initial import from Trafft"""
    db = next(get_db())
    try:
        sync_service = TrafftSyncService(db)
        return await sync_service.initial_import(days_back)
    finally:
        db.close()

async def sync_recent_changes(hours_back: int = 24) -> Dict[str, Any]:
    """Sync recent changes from Trafft"""
    db = next(get_db())
    try:
        sync_service = TrafftSyncService(db)
        return await sync_service.sync_recent_changes(hours_back)
    finally:
        db.close()

async def register_trafft_webhooks() -> Dict[str, Any]:
    """Register webhooks with Trafft"""
    db = next(get_db())
    try:
        sync_service = TrafftSyncService(db)
        return await sync_service.register_webhooks()
    finally:
        db.close()