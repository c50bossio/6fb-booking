"""
Service for managing recurring appointments and series
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, date, time, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Dict, Optional, Tuple, Any
import secrets
import string

from models.appointment_series import (
    AppointmentSeries,
    SeriesExclusion,
    SeriesChangeLog,
    RecurrencePattern,
    SeriesStatus,
)
from models.appointment import Appointment
from models.client import Client
from models.barber import Barber
from models.booking import Service
from services.availability_service import AvailabilityService


class RecurringAppointmentService:
    """Service for managing recurring appointments and series"""

    def __init__(self, db: Session):
        self.db = db
        self.availability_service = AvailabilityService(db)

    def create_appointment_series(
        self,
        client_id: int,
        barber_id: int,
        service_id: int,
        location_id: int,
        recurrence_pattern: RecurrencePattern,
        preferred_time: time,
        start_date: date,
        end_date: Optional[date] = None,
        max_appointments: Optional[int] = None,
        series_discount_percent: float = 0.0,
        payment_frequency: str = "per_appointment",  # per_appointment, monthly, upfront
        enable_subscription: bool = False,
        **kwargs,
    ) -> AppointmentSeries:
        """Create a new appointment series"""

        # Generate unique series token
        series_token = self._generate_series_token()

        # Get service details for duration
        service = self.db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise ValueError(f"Service {service_id} not found")

        # Validate payment frequency
        valid_payment_frequencies = ["per_appointment", "monthly", "upfront"]
        if payment_frequency not in valid_payment_frequencies:
            raise ValueError(
                f"Invalid payment frequency. Must be one of: {valid_payment_frequencies}"
            )

        # Calculate total series price if upfront payment
        total_series_price = None
        if payment_frequency == "upfront" and enable_subscription:
            # Calculate based on estimated appointments
            estimated_appointments = self._estimate_appointments_in_series(
                recurrence_pattern, start_date, end_date, max_appointments
            )
            discounted_price = service.base_price * (1 - series_discount_percent / 100)
            total_series_price = discounted_price * estimated_appointments

        # Create the series
        series = AppointmentSeries(
            series_token=series_token,
            client_id=client_id,
            barber_id=barber_id,
            service_id=service_id,
            location_id=location_id,
            recurrence_pattern=recurrence_pattern,
            preferred_time=preferred_time,
            start_date=start_date,
            end_date=end_date,
            max_appointments=max_appointments,
            duration_minutes=service.duration_minutes,
            series_discount_percent=series_discount_percent,
            payment_frequency=payment_frequency,
            total_series_price=total_series_price,
            **kwargs,
        )

        self.db.add(series)
        self.db.flush()  # Get the ID

        # Log the creation
        self._log_series_change(
            series.id,
            "created",
            change_reason="New recurring appointment series created",
            changed_by_type="customer",
        )

        self.db.commit()
        return series

    def generate_upcoming_appointments(
        self, series_id: int, lookahead_days: int = 60
    ) -> List[Appointment]:
        """Generate upcoming appointments for a series"""

        series = (
            self.db.query(AppointmentSeries)
            .filter(AppointmentSeries.id == series_id)
            .first()
        )

        if not series or not series.is_active:
            raise ValueError(f"Series {series_id} not found or not active")

        # Get exclusion dates
        exclusions = (
            self.db.query(SeriesExclusion)
            .filter(SeriesExclusion.series_id == series_id)
            .all()
        )
        exclusion_dates = {exc.exclusion_date for exc in exclusions}

        # Calculate appointment dates
        appointment_dates = self._calculate_appointment_dates(
            series, lookahead_days, exclusion_dates
        )

        created_appointments = []

        for appointment_date in appointment_dates:
            # Check if appointment already exists
            existing = (
                self.db.query(Appointment)
                .filter(
                    and_(
                        Appointment.series_id == series_id,
                        Appointment.appointment_date == appointment_date,
                    )
                )
                .first()
            )

            if existing:
                continue

            # Check availability
            is_available, conflicts = (
                self.availability_service.check_real_time_availability(
                    barber_id=series.barber_id,
                    appointment_date=appointment_date,
                    start_time=series.preferred_time,
                    duration_minutes=series.duration_minutes,
                )
            )

            if is_available:
                # Create the appointment
                appointment = self._create_series_appointment(series, appointment_date)
                created_appointments.append(appointment)
            else:
                # Try to find alternative time if flexible
                if series.is_flexible_time:
                    alternative_time = self._find_alternative_time(
                        series, appointment_date
                    )
                    if alternative_time:
                        appointment = self._create_series_appointment(
                            series, appointment_date, alternative_time
                        )
                        created_appointments.append(appointment)

        # Update series statistics
        series.total_appointments_created += len(created_appointments)
        if created_appointments:
            series.next_appointment_date = min(
                apt.appointment_date for apt in created_appointments
            )

        self.db.commit()
        return created_appointments

    def _create_series_appointment(
        self,
        series: AppointmentSeries,
        appointment_date: date,
        appointment_time: Optional[time] = None,
    ) -> Appointment:
        """Create a single appointment from a series"""

        if appointment_time is None:
            appointment_time = series.preferred_time

        appointment_datetime = datetime.combine(appointment_date, appointment_time)

        # Calculate discounted price
        base_price = series.service.base_price
        discounted_price = base_price * (1 - series.series_discount_percent / 100)

        appointment = Appointment(
            appointment_date=appointment_date,
            appointment_time=appointment_datetime,
            duration_minutes=series.duration_minutes,
            barber_id=series.barber_id,
            client_id=series.client_id,
            series_id=series.id,
            service_name=series.service.name,
            service_category=(
                series.service.category.name if series.service.category else None
            ),
            service_revenue=discounted_price,
            customer_type="returning",  # Series customers are always returning
            status="scheduled",
            payment_status="pending",
            booking_source="recurring_series",
            booking_time=datetime.utcnow(),
            client_notes=f"Recurring appointment from series {series.series_token}",
        )

        self.db.add(appointment)
        return appointment

    def _calculate_appointment_dates(
        self, series: AppointmentSeries, lookahead_days: int, exclusion_dates: set
    ) -> List[date]:
        """Calculate upcoming appointment dates based on recurrence pattern"""

        current_date = max(series.start_date, date.today())
        end_date = date.today() + timedelta(days=lookahead_days)

        if series.end_date:
            end_date = min(end_date, series.end_date)

        dates = []

        if series.recurrence_pattern == RecurrencePattern.WEEKLY:
            dates = self._calculate_weekly_dates(current_date, end_date, 1)
        elif series.recurrence_pattern == RecurrencePattern.BIWEEKLY:
            dates = self._calculate_weekly_dates(current_date, end_date, 2)
        elif series.recurrence_pattern == RecurrencePattern.EVERY_4_WEEKS:
            dates = self._calculate_weekly_dates(current_date, end_date, 4)
        elif series.recurrence_pattern == RecurrencePattern.EVERY_6_WEEKS:
            dates = self._calculate_weekly_dates(current_date, end_date, 6)
        elif series.recurrence_pattern == RecurrencePattern.EVERY_8_WEEKS:
            dates = self._calculate_weekly_dates(current_date, end_date, 8)
        elif series.recurrence_pattern == RecurrencePattern.MONTHLY:
            dates = self._calculate_monthly_dates(current_date, end_date)
        elif series.recurrence_pattern == RecurrencePattern.CUSTOM:
            dates = self._calculate_weekly_dates(
                current_date, end_date, series.interval_weeks
            )

        # Remove exclusion dates
        dates = [d for d in dates if d not in exclusion_dates]

        # Limit by max_appointments if specified
        if series.max_appointments:
            remaining_slots = (
                series.max_appointments - series.total_appointments_created
            )
            dates = dates[:remaining_slots]

        return dates

    def _calculate_weekly_dates(
        self, start_date: date, end_date: date, interval_weeks: int
    ) -> List[date]:
        """Calculate dates for weekly recurrence patterns"""
        dates = []
        current = start_date

        while current <= end_date:
            dates.append(current)
            current += timedelta(weeks=interval_weeks)

        return dates

    def _calculate_monthly_dates(self, start_date: date, end_date: date) -> List[date]:
        """Calculate dates for monthly recurrence"""
        dates = []
        current = start_date

        while current <= end_date:
            dates.append(current)
            current += relativedelta(months=1)

        return dates

    def _find_alternative_time(
        self, series: AppointmentSeries, appointment_date: date
    ) -> Optional[time]:
        """Find alternative time slot if preferred time is not available"""

        # Try times within the buffer window
        preferred_datetime = datetime.combine(appointment_date, series.preferred_time)
        buffer_minutes = series.buffer_time_minutes

        # Try earlier times first
        for minutes_offset in range(-buffer_minutes, buffer_minutes + 1, 15):
            if minutes_offset == 0:
                continue  # Already know this doesn't work

            alternative_time = (
                preferred_datetime + timedelta(minutes=minutes_offset)
            ).time()

            is_available, _ = self.availability_service.check_real_time_availability(
                barber_id=series.barber_id,
                appointment_date=appointment_date,
                start_time=alternative_time,
                duration_minutes=series.duration_minutes,
            )

            if is_available:
                return alternative_time

        return None

    def pause_series(
        self, series_id: int, pause_reason: str = "Customer requested pause"
    ) -> AppointmentSeries:
        """Pause an appointment series"""

        series = (
            self.db.query(AppointmentSeries)
            .filter(AppointmentSeries.id == series_id)
            .first()
        )

        if not series:
            raise ValueError(f"Series {series_id} not found")

        series.status = SeriesStatus.PAUSED
        series.paused_at = datetime.utcnow()

        # Cancel future appointments
        future_appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.series_id == series_id,
                    Appointment.appointment_date > date.today(),
                    Appointment.status == "scheduled",
                )
            )
            .all()
        )

        for appointment in future_appointments:
            appointment.status = "cancelled"

        self._log_series_change(
            series_id,
            "paused",
            change_reason=pause_reason,
            changed_by_type="customer",
            affected_appointments=len(future_appointments),
        )

        self.db.commit()
        return series

    def resume_series(
        self, series_id: int, resume_reason: str = "Customer requested resume"
    ) -> AppointmentSeries:
        """Resume a paused appointment series"""

        series = (
            self.db.query(AppointmentSeries)
            .filter(AppointmentSeries.id == series_id)
            .first()
        )

        if not series:
            raise ValueError(f"Series {series_id} not found")

        series.status = SeriesStatus.ACTIVE
        series.paused_at = None

        self._log_series_change(
            series_id,
            "resumed",
            change_reason=resume_reason,
            changed_by_type="customer",
        )

        self.db.commit()

        # Generate new appointments
        self.generate_upcoming_appointments(series_id)

        return series

    def cancel_series(
        self, series_id: int, cancel_reason: str = "Customer requested cancellation"
    ) -> AppointmentSeries:
        """Cancel an appointment series"""

        series = (
            self.db.query(AppointmentSeries)
            .filter(AppointmentSeries.id == series_id)
            .first()
        )

        if not series:
            raise ValueError(f"Series {series_id} not found")

        series.status = SeriesStatus.CANCELLED
        series.cancelled_at = datetime.utcnow()

        # Cancel all future appointments
        future_appointments = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.series_id == series_id,
                    Appointment.appointment_date >= date.today(),
                    Appointment.status.in_(["scheduled", "confirmed"]),
                )
            )
            .all()
        )

        for appointment in future_appointments:
            appointment.status = "cancelled"

        self._log_series_change(
            series_id,
            "cancelled",
            change_reason=cancel_reason,
            changed_by_type="customer",
            affected_appointments=len(future_appointments),
        )

        self.db.commit()
        return series

    def add_series_exclusion(
        self,
        series_id: int,
        exclusion_date: date,
        reason: str = "Customer requested exclusion",
        reschedule_to_date: Optional[date] = None,
    ) -> SeriesExclusion:
        """Add an exclusion date to a series"""

        exclusion = SeriesExclusion(
            series_id=series_id,
            exclusion_date=exclusion_date,
            exclusion_reason=reason,
            reschedule_to_date=reschedule_to_date,
            created_by="customer",
        )

        self.db.add(exclusion)

        # Cancel appointment on that date if it exists
        existing_appointment = (
            self.db.query(Appointment)
            .filter(
                and_(
                    Appointment.series_id == series_id,
                    Appointment.appointment_date == exclusion_date,
                    Appointment.status == "scheduled",
                )
            )
            .first()
        )

        if existing_appointment:
            existing_appointment.status = "cancelled"

        self._log_series_change(
            series_id,
            "exclusion_added",
            change_reason=f"Exclusion added for {exclusion_date}: {reason}",
            changed_by_type="customer",
        )

        self.db.commit()
        return exclusion

    def get_series_by_token(self, series_token: str) -> Optional[AppointmentSeries]:
        """Get series by token"""
        return (
            self.db.query(AppointmentSeries)
            .filter(AppointmentSeries.series_token == series_token)
            .first()
        )

    def get_client_series(self, client_id: int) -> List[AppointmentSeries]:
        """Get all series for a client"""
        return (
            self.db.query(AppointmentSeries)
            .filter(AppointmentSeries.client_id == client_id)
            .all()
        )

    def _generate_series_token(self) -> str:
        """Generate a unique series token"""
        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(32))

    def _log_series_change(
        self,
        series_id: int,
        change_type: str,
        field_changed: Optional[str] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        change_reason: Optional[str] = None,
        changed_by_type: str = "system",
        changed_by_id: Optional[int] = None,
        affected_appointments: int = 0,
    ):
        """Log a change to the series"""

        log_entry = SeriesChangeLog(
            series_id=series_id,
            change_type=change_type,
            field_changed=field_changed,
            old_value=old_value,
            new_value=new_value,
            change_reason=change_reason,
            changed_by_type=changed_by_type,
            changed_by_id=changed_by_id,
            affected_appointments=affected_appointments,
        )

        self.db.add(log_entry)

    def calculate_series_savings(
        self,
        service_id: int,
        recurrence_pattern: RecurrencePattern,
        discount_percent: float,
        duration_months: int = 12,
    ) -> Dict[str, float]:
        """Calculate potential savings from a recurring series"""

        service = self.db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise ValueError(f"Service {service_id} not found")

        # Calculate appointments per year based on pattern
        appointments_per_year = {
            RecurrencePattern.WEEKLY: 52,
            RecurrencePattern.BIWEEKLY: 26,
            RecurrencePattern.EVERY_4_WEEKS: 13,
            RecurrencePattern.EVERY_6_WEEKS: 8.7,
            RecurrencePattern.EVERY_8_WEEKS: 6.5,
            RecurrencePattern.MONTHLY: 12,
        }.get(recurrence_pattern, 12)

        appointments_in_period = appointments_per_year * (duration_months / 12)

        regular_total = service.base_price * appointments_in_period
        discount_amount = regular_total * (discount_percent / 100)
        discounted_total = regular_total - discount_amount

        return {
            "appointments_in_period": appointments_in_period,
            "regular_price_per_appointment": service.base_price,
            "discounted_price_per_appointment": service.base_price
            * (1 - discount_percent / 100),
            "regular_total": regular_total,
            "discounted_total": discounted_total,
            "total_savings": discount_amount,
            "savings_per_appointment": service.base_price * (discount_percent / 100),
        }

    def _estimate_appointments_in_series(
        self,
        recurrence_pattern: RecurrencePattern,
        start_date: date,
        end_date: Optional[date] = None,
        max_appointments: Optional[int] = None,
    ) -> int:
        """Estimate total number of appointments in a series"""

        if max_appointments:
            return max_appointments

        if not end_date:
            # Default to 1 year if no end date specified
            end_date = start_date + timedelta(days=365)

        # Calculate appointments based on pattern
        total_days = (end_date - start_date).days

        appointments_per_year = {
            RecurrencePattern.WEEKLY: 52,
            RecurrencePattern.BIWEEKLY: 26,
            RecurrencePattern.EVERY_4_WEEKS: 13,
            RecurrencePattern.EVERY_6_WEEKS: 8.7,
            RecurrencePattern.EVERY_8_WEEKS: 6.5,
            RecurrencePattern.MONTHLY: 12,
        }.get(recurrence_pattern, 12)

        estimated_appointments = int((total_days / 365) * appointments_per_year)
        return max(1, estimated_appointments)  # At least 1 appointment

    def get_series_payment_info(self, series_id: int) -> Dict[str, Any]:
        """Get payment information for a series"""

        series = (
            self.db.query(AppointmentSeries)
            .filter(AppointmentSeries.id == series_id)
            .first()
        )

        if not series:
            raise ValueError(f"Series {series_id} not found")

        # Get service for pricing
        service = self.db.query(Service).filter(Service.id == series.service_id).first()
        if not service:
            raise ValueError("Service not found")

        return {
            "series_id": series.id,
            "series_token": series.series_token,
            "payment_frequency": series.payment_frequency,
            "is_subscription_enabled": series.payment_frequency
            in ["monthly", "upfront"],
            "regular_price_per_appointment": float(service.base_price),
            "discounted_price_per_appointment": float(
                series.discounted_price_per_appointment
            ),
            "discount_percent": float(series.series_discount_percent),
            "discount_amount_per_appointment": float(series.discount_amount),
            "total_series_price": (
                float(series.total_series_price) if series.total_series_price else None
            ),
            "estimated_appointments": self._estimate_appointments_in_series(
                series.recurrence_pattern,
                series.start_date,
                series.end_date,
                series.max_appointments,
            ),
            "payment_options": {
                "per_appointment": {
                    "enabled": True,
                    "description": "Pay for each appointment individually",
                    "price_per_appointment": float(
                        series.discounted_price_per_appointment
                    ),
                    "benefits": [
                        "No upfront commitment",
                        "Cancel anytime",
                        "Flexible scheduling",
                    ],
                },
                "monthly_subscription": {
                    "enabled": True,
                    "description": "Monthly subscription with automatic booking",
                    "monthly_price": self._calculate_monthly_subscription_price(series),
                    "benefits": [
                        "Guaranteed booking slots",
                        "Additional 5% discount",
                        "Priority scheduling",
                    ],
                },
                "upfront_payment": {
                    "enabled": True,
                    "description": "Pay for entire series upfront",
                    "total_price": (
                        float(series.total_series_price)
                        if series.total_series_price
                        else None
                    ),
                    "benefits": [
                        "Maximum discount",
                        "Locked-in pricing",
                        "No payment worries",
                    ],
                },
            },
        }

    def _calculate_monthly_subscription_price(self, series: AppointmentSeries) -> float:
        """Calculate monthly subscription price for a series"""

        # Get appointments per month based on pattern
        appointments_per_month = {
            RecurrencePattern.WEEKLY: 4.33,  # ~52/12
            RecurrencePattern.BIWEEKLY: 2.17,  # ~26/12
            RecurrencePattern.EVERY_4_WEEKS: 1.08,  # ~13/12
            RecurrencePattern.EVERY_6_WEEKS: 0.72,  # ~8.7/12
            RecurrencePattern.EVERY_8_WEEKS: 0.54,  # ~6.5/12
            RecurrencePattern.MONTHLY: 1.0,
        }.get(series.recurrence_pattern, 1.0)

        # Apply additional 5% discount for subscription
        base_price = series.discounted_price_per_appointment * 0.95
        return round(base_price * appointments_per_month, 2)

    def update_series_payment_method(
        self, series_id: int, payment_frequency: str, user_id: Optional[int] = None
    ) -> AppointmentSeries:
        """Update payment method for an existing series"""

        series = (
            self.db.query(AppointmentSeries)
            .filter(AppointmentSeries.id == series_id)
            .first()
        )

        if not series:
            raise ValueError(f"Series {series_id} not found")

        # Validate payment frequency
        valid_payment_frequencies = ["per_appointment", "monthly", "upfront"]
        if payment_frequency not in valid_payment_frequencies:
            raise ValueError(
                f"Invalid payment frequency. Must be one of: {valid_payment_frequencies}"
            )

        old_payment_frequency = series.payment_frequency
        series.payment_frequency = payment_frequency

        # Recalculate total series price if switching to upfront
        if payment_frequency == "upfront":
            estimated_appointments = self._estimate_appointments_in_series(
                series.recurrence_pattern,
                series.start_date,
                series.end_date,
                series.max_appointments,
            )
            series.total_series_price = (
                series.discounted_price_per_appointment * estimated_appointments
            )
        elif payment_frequency == "per_appointment":
            series.total_series_price = None

        # Log the change
        self._log_series_change(
            series.id,
            "payment_method_updated",
            field_changed="payment_frequency",
            old_value=old_payment_frequency,
            new_value=payment_frequency,
            change_reason="Payment method updated by user",
            changed_by_type="customer" if user_id else "system",
            changed_by_id=user_id,
        )

        self.db.commit()
        return series

    def get_series_by_token(self, series_token: str) -> Optional[AppointmentSeries]:
        """Get a series by its token (for customer subscription management)"""

        return (
            self.db.query(AppointmentSeries)
            .filter(AppointmentSeries.series_token == series_token)
            .first()
        )

    def toggle_series_subscription(
        self,
        series_token: str,
        enable_subscription: bool,
        payment_frequency: str = "monthly",
    ) -> Dict[str, Any]:
        """Toggle subscription on/off for a series"""

        series = self.get_series_by_token(series_token)
        if not series:
            raise ValueError("Series not found")

        if enable_subscription:
            # Enable subscription
            if payment_frequency not in ["monthly", "upfront"]:
                payment_frequency = "monthly"

            old_frequency = series.payment_frequency
            series.payment_frequency = payment_frequency

            # Calculate pricing
            if payment_frequency == "upfront":
                estimated_appointments = self._estimate_appointments_in_series(
                    series.recurrence_pattern,
                    series.start_date,
                    series.end_date,
                    series.max_appointments,
                )
                series.total_series_price = (
                    series.discounted_price_per_appointment * estimated_appointments
                )

            message = f"Subscription enabled with {payment_frequency} payment"
        else:
            # Disable subscription - switch to per appointment
            old_frequency = series.payment_frequency
            series.payment_frequency = "per_appointment"
            series.total_series_price = None
            message = "Switched to pay-per-appointment"

        # Log the change
        self._log_series_change(
            series.id,
            "subscription_toggled",
            field_changed="payment_frequency",
            old_value=old_frequency,
            new_value=series.payment_frequency,
            change_reason=message,
            changed_by_type="customer",
        )

        self.db.commit()

        return {
            "success": True,
            "message": message,
            "payment_frequency": series.payment_frequency,
            "is_subscription_enabled": series.payment_frequency
            in ["monthly", "upfront"],
            "payment_info": self.get_series_payment_info(series.id),
        }
