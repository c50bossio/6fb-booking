"""
Trafft Data Synchronization Service
Handles importing and syncing data from Trafft to 6FB database
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models.location import Location
from models.barber import Barber
from models.client import Client
from models.appointment import Appointment
from services.trafft_oauth_client import TrafftOAuthClient, TrafftOAuthError

logger = logging.getLogger(__name__)


class TrafftDataSyncService:
    """
    Service for syncing data between Trafft and 6FB database
    """

    def __init__(self, db: Session):
        self.db = db

    async def full_sync(
        self, client: TrafftOAuthClient, owner_user_id: int
    ) -> Dict[str, Any]:
        """
        Perform a full data sync from Trafft
        """
        try:
            logger.info("Starting full Trafft data sync")

            # Test connection first
            connection_test = await client.test_connection()
            if not connection_test.get("connected"):
                raise TrafftOAuthError("Connection test failed")

            sync_results = {
                "locations_imported": 0,
                "barbers_imported": 0,
                "clients_imported": 0,
                "appointments_imported": 0,
                "services_found": connection_test.get("services_count", 0),
                "errors": [],
            }

            # 1. Import Locations
            logger.info("Syncing locations...")
            locations = await client.get_locations()
            for location_data in locations:
                try:
                    location = await self._import_location(location_data, owner_user_id)
                    if location:
                        sync_results["locations_imported"] += 1
                except Exception as e:
                    logger.error(
                        f"Failed to import location {location_data.get('id')}: {e}"
                    )
                    sync_results["errors"].append(f"Location import error: {e}")

            # 2. Import Employees/Barbers
            logger.info("Syncing employees...")
            employees = await client.get_employees()
            for employee_data in employees:
                try:
                    barber = await self._import_barber(employee_data)
                    if barber:
                        sync_results["barbers_imported"] += 1
                except Exception as e:
                    logger.error(
                        f"Failed to import employee {employee_data.get('id')}: {e}"
                    )
                    sync_results["errors"].append(f"Employee import error: {e}")

            # 3. Import Customers
            logger.info("Syncing customers...")
            customers = await client.get_customers()
            for customer_data in customers:
                try:
                    client_obj = await self._import_client(customer_data)
                    if client_obj:
                        sync_results["clients_imported"] += 1
                except Exception as e:
                    logger.error(
                        f"Failed to import customer {customer_data.get('id')}: {e}"
                    )
                    sync_results["errors"].append(f"Customer import error: {e}")

            # 4. Import Recent Appointments (last 30 days)
            logger.info("Syncing recent appointments...")
            from datetime import timedelta

            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)

            appointments = await client.get_appointments(start_date, end_date)
            for appointment_data in appointments:
                try:
                    appointment = await self._import_appointment(appointment_data)
                    if appointment:
                        sync_results["appointments_imported"] += 1
                except Exception as e:
                    logger.error(
                        f"Failed to import appointment {appointment_data.get('id')}: {e}"
                    )
                    sync_results["errors"].append(f"Appointment import error: {e}")

            # Commit all changes
            self.db.commit()

            logger.info(f"Full sync completed: {sync_results}")
            return sync_results

        except Exception as e:
            logger.error(f"Full sync failed: {e}")
            self.db.rollback()
            raise TrafftOAuthError(f"Full sync failed: {e}")

    async def _import_location(
        self, location_data: Dict[str, Any], owner_user_id: int
    ) -> Optional[Location]:
        """Import a single location from Trafft"""
        try:
            trafft_location_id = str(location_data.get("id", ""))

            # Check if location already exists
            existing_location = (
                self.db.query(Location)
                .filter(Location.trafft_location_id == trafft_location_id)
                .first()
            )

            if existing_location:
                logger.debug(
                    f"Location {trafft_location_id} already exists, updating..."
                )
                location = existing_location
            else:
                location = Location()

            # Map Trafft data to 6FB location fields
            location.name = location_data.get("name", "Unknown Location")
            location.business_name = location_data.get("name", location.name)
            location.location_code = location_data.get(
                "code", location.name.lower().replace(" ", "_")
            )

            # Parse address
            address = location_data.get("address", {})
            if isinstance(address, dict):
                location.address = (
                    f"{address.get('street', '')} {address.get('number', '')}".strip()
                )
                location.city = address.get("city", "Unknown")
                location.state = address.get("state", "FL")
                location.zip_code = address.get("zip", "00000")
            else:
                location.address = str(address) if address else ""
                location.city = "Unknown"
                location.state = "FL"
                location.zip_code = "00000"

            location.phone = location_data.get("phone", "")
            location.email = location_data.get("email", "")
            location.trafft_location_id = trafft_location_id
            location.mentor_id = owner_user_id
            location.is_active = location_data.get("status", "active") == "active"
            location.onboarding_status = "completed"

            if not existing_location:
                self.db.add(location)

            self.db.flush()
            logger.info(f"Imported location: {location.name}")
            return location

        except Exception as e:
            logger.error(f"Failed to import location: {e}")
            return None

    async def _import_barber(self, employee_data: Dict[str, Any]) -> Optional[Barber]:
        """Import a single barber/employee from Trafft"""
        try:
            trafft_employee_id = str(employee_data.get("id", ""))

            # Check if barber already exists
            existing_barber = (
                self.db.query(Barber)
                .filter(Barber.trafft_employee_id == trafft_employee_id)
                .first()
            )

            if existing_barber:
                logger.debug(f"Barber {trafft_employee_id} already exists, updating...")
                barber = existing_barber
            else:
                barber = Barber()

            # Map Trafft employee data to 6FB barber fields
            barber.first_name = employee_data.get("firstName", "Unknown")
            barber.last_name = employee_data.get("lastName", "")
            barber.email = employee_data.get(
                "email", f"{barber.first_name.lower()}@temp.com"
            )
            barber.phone = employee_data.get("phone", "")
            barber.trafft_employee_id = trafft_employee_id
            barber.trafft_employee_email = barber.email
            barber.is_active = employee_data.get("status", "active") == "active"
            barber.subscription_tier = "basic"

            # Try to link to a location if available
            if not barber.location_id:
                location = (
                    self.db.query(Location).filter(Location.is_active == True).first()
                )
                if location:
                    barber.location_id = location.id

            if not existing_barber:
                self.db.add(barber)

            self.db.flush()
            logger.info(f"Imported barber: {barber.first_name} {barber.last_name}")
            return barber

        except IntegrityError as e:
            logger.warning(
                f"Barber with email {employee_data.get('email')} already exists"
            )
            self.db.rollback()
            return None
        except Exception as e:
            logger.error(f"Failed to import barber: {e}")
            return None

    async def _import_client(self, customer_data: Dict[str, Any]) -> Optional[Client]:
        """Import a single client/customer from Trafft"""
        try:
            trafft_customer_id = str(customer_data.get("id", ""))

            # Check if client already exists
            existing_client = (
                self.db.query(Client)
                .filter(Client.trafft_customer_id == trafft_customer_id)
                .first()
            )

            if existing_client:
                logger.debug(f"Client {trafft_customer_id} already exists, updating...")
                client = existing_client
            else:
                client = Client()

            # Map Trafft customer data to 6FB client fields
            client.first_name = customer_data.get("firstName", "Unknown")
            client.last_name = customer_data.get("lastName", "")
            client.email = customer_data.get("email", "")
            client.phone = customer_data.get("phone", "")
            client.trafft_customer_id = trafft_customer_id
            client.is_active = customer_data.get("status", "active") == "active"

            # Additional fields if available
            client.date_of_birth = customer_data.get("dateOfBirth")
            client.gender = customer_data.get("gender", "")
            client.notes = customer_data.get("note", "")

            if not existing_client:
                self.db.add(client)

            self.db.flush()
            logger.info(f"Imported client: {client.first_name} {client.last_name}")
            return client

        except IntegrityError as e:
            logger.warning(
                f"Client with email {customer_data.get('email')} already exists"
            )
            self.db.rollback()
            return None
        except Exception as e:
            logger.error(f"Failed to import client: {e}")
            return None

    async def _import_appointment(
        self, appointment_data: Dict[str, Any]
    ) -> Optional[Appointment]:
        """Import a single appointment from Trafft"""
        try:
            trafft_appointment_id = str(appointment_data.get("id", ""))

            # Check if appointment already exists
            existing_appointment = (
                self.db.query(Appointment)
                .filter(Appointment.trafft_appointment_id == trafft_appointment_id)
                .first()
            )

            if existing_appointment:
                logger.debug(
                    f"Appointment {trafft_appointment_id} already exists, updating..."
                )
                appointment = existing_appointment
            else:
                appointment = Appointment()

            # Map Trafft appointment data to 6FB appointment fields
            appointment.trafft_appointment_id = trafft_appointment_id

            # Parse date and time
            appointment_datetime = appointment_data.get("dateTime")
            if appointment_datetime:
                dt = datetime.fromisoformat(appointment_datetime.replace("Z", "+00:00"))
                appointment.appointment_date = dt.date()
                appointment.appointment_time = dt.time()

            appointment.status = self._map_appointment_status(
                appointment_data.get("status", "pending")
            )
            appointment.service_name = appointment_data.get("serviceName", "Service")
            appointment.service_duration = appointment_data.get("duration", 60)
            appointment.service_revenue = float(appointment_data.get("price", 0))
            appointment.notes = appointment_data.get("internalNotes", "")

            # Link to barber if possible
            employee_id = appointment_data.get("providerId")
            if employee_id:
                barber = (
                    self.db.query(Barber)
                    .filter(Barber.trafft_employee_id == str(employee_id))
                    .first()
                )
                if barber:
                    appointment.barber_id = barber.id

            # Link to client if possible
            customer_id = appointment_data.get("customerId")
            if customer_id:
                client = (
                    self.db.query(Client)
                    .filter(Client.trafft_customer_id == str(customer_id))
                    .first()
                )
                if client:
                    appointment.client_id = client.id

            # Link to location if possible
            location_id = appointment_data.get("locationId")
            if location_id:
                location = (
                    self.db.query(Location)
                    .filter(Location.trafft_location_id == str(location_id))
                    .first()
                )
                if location:
                    appointment.location_id = location.id

            if not existing_appointment:
                self.db.add(appointment)

            self.db.flush()
            logger.info(
                f"Imported appointment: {appointment.service_name} on {appointment.appointment_date}"
            )
            return appointment

        except Exception as e:
            logger.error(f"Failed to import appointment: {e}")
            return None

    def _map_appointment_status(self, trafft_status: str) -> str:
        """Map Trafft appointment status to 6FB status"""
        status_mapping = {
            "pending": "pending",
            "approved": "confirmed",
            "confirmed": "confirmed",
            "canceled": "cancelled",
            "cancelled": "cancelled",
            "rejected": "cancelled",
            "completed": "completed",
            "show": "completed",
            "no-show": "no_show",
        }
        return status_mapping.get(trafft_status.lower(), "pending")
