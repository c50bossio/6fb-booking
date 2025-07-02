"""
Test Data Service - Creates realistic test data for new accounts
"""
from sqlalchemy.orm import Session
from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any
import random
from decimal import Decimal

import models
from models import (
    Payment, Payout, SMSConversation, SMSMessage, SMSMessageDirection, SMSMessageStatus,
    NotificationQueue, NotificationStatus,  # Added notification imports
    RecurringAppointmentPattern,  # Added recurring pattern import
    GiftCertificate,  # Added gift certificate import
    MarketingCampaign, MarketingTemplate, ContactList, ContactListMember, CampaignAnalytics  # Marketing models
)
from location_models import (
    BarbershopLocation, BarberLocation, ChairInventory, ChairAssignmentHistory,
    CompensationPlan, LocationStatus, CompensationModel, ChairStatus, ChairType
)
from services import booking_service, barber_availability_service
from utils.auth import get_password_hash
import logging

logger = logging.getLogger(__name__)

# Test client templates
TEST_CLIENTS = [
    # VIP Clients
    {"first_name": "Robert", "last_name": "Johnson", "email": "robert.j@testdata.com", "phone": "+15551234567", "type": "vip", "notes": "Prefers morning appointments, always gets executive package"},
    {"first_name": "Michael", "last_name": "Chen", "email": "m.chen@testdata.com", "phone": "+15551234568", "type": "vip", "notes": "Long-time client, refers many friends"},
    {"first_name": "William", "last_name": "Davis", "email": "will.davis@testdata.com", "phone": "+15551234569", "type": "vip", "notes": "CEO of tech company, books monthly"},
    
    # Regular Clients
    {"first_name": "James", "last_name": "Wilson", "email": "j.wilson@testdata.com", "phone": "+15551234570", "type": "regular", "notes": "Every 3 weeks, beard trim"},
    {"first_name": "David", "last_name": "Brown", "email": "d.brown@testdata.com", "phone": "+15551234571", "type": "regular", "notes": "Monthly haircut"},
    {"first_name": "Christopher", "last_name": "Lee", "email": "chris.lee@testdata.com", "phone": "+15551234572", "type": "regular", "notes": "Likes fade cuts"},
    {"first_name": "Daniel", "last_name": "Martinez", "email": "d.martinez@testdata.com", "phone": "+15551234573", "type": "regular", "notes": "Saturday mornings only"},
    {"first_name": "Matthew", "last_name": "Garcia", "email": "matt.g@testdata.com", "phone": "+15551234574", "type": "regular", "notes": "Brings his son too"},
    {"first_name": "Joseph", "last_name": "Rodriguez", "email": "joe.r@testdata.com", "phone": "+15551234575", "type": "regular", "notes": "Prefers same barber"},
    {"first_name": "Anthony", "last_name": "Thomas", "email": "a.thomas@testdata.com", "phone": "+15551234576", "type": "regular", "notes": "Evening appointments"},
    
    # New Clients
    {"first_name": "Brandon", "last_name": "White", "email": "b.white@testdata.com", "phone": "+15551234577", "type": "new", "notes": "First time visitor"},
    {"first_name": "Tyler", "last_name": "Harris", "email": "tyler.h@testdata.com", "phone": "+15551234578", "type": "new", "notes": "Referred by Robert Johnson"},
    {"first_name": "Kyle", "last_name": "Clark", "email": "kyle.c@testdata.com", "phone": "+15551234579", "type": "new", "notes": "Moving to area"},
    {"first_name": "Jordan", "last_name": "Lewis", "email": "jordan.l@testdata.com", "phone": "+15551234580", "type": "new", "notes": "College student"},
    {"first_name": "Nathan", "last_name": "Walker", "email": "n.walker@testdata.com", "phone": "+15551234581", "type": "new", "notes": "Found us on Google"},
    
    # At-Risk Clients
    {"first_name": "Eric", "last_name": "Hall", "email": "eric.h@testdata.com", "phone": "+15551234582", "type": "at_risk", "notes": "Haven't seen in 3 months"},
    {"first_name": "Kevin", "last_name": "Allen", "email": "k.allen@testdata.com", "phone": "+15551234583", "type": "at_risk", "notes": "Used to be regular"},
    {"first_name": "Brian", "last_name": "Young", "email": "brian.y@testdata.com", "phone": "+15551234584", "type": "at_risk", "notes": "Last visit 60 days ago"},
    
    # Problem Clients (for testing no-show handling)
    {"first_name": "Test", "last_name": "NoShow", "email": "noshow@testdata.com", "phone": "+15551234585", "type": "problem", "notes": "Test client for no-show scenarios"},
    {"first_name": "Test", "last_name": "Canceler", "email": "canceler@testdata.com", "phone": "+15551234586", "type": "problem", "notes": "Test client for cancellation scenarios"},
]

# Test barber templates
TEST_BARBERS = [
    {
        "name": "Sarah Johnson",
        "email": "sarah.j@testbarber.com",
        "phone": "+15552001001",
        "bio": "Senior barber with 10 years experience. Specializes in modern cuts and beard styling.",
        "availability": {
            "monday": (time(9, 0), time(18, 0)),
            "tuesday": (time(9, 0), time(18, 0)),
            "wednesday": (time(9, 0), time(18, 0)),
            "thursday": (time(9, 0), time(20, 0)),  # Late night
            "friday": (time(9, 0), time(19, 0)),
            "saturday": (time(10, 0), time(16, 0)),
        },
        "specialties": ["Modern cuts", "Beard styling", "Hair design"]
    },
    {
        "name": "Marcus Chen",
        "email": "marcus.c@testbarber.com",
        "phone": "+15552001002",
        "bio": "Part-time barber specializing in classic cuts. Available select days.",
        "availability": {
            "tuesday": (time(10, 0), time(18, 0)),
            "thursday": (time(10, 0), time(18, 0)),
            "saturday": (time(9, 0), time(17, 0)),
        },
        "specialties": ["Classic cuts", "Hot towel shaves", "Kids cuts"]
    }
]

# Holiday dates (US holidays)
HOLIDAYS = [
    # 2025 Holidays
    (date(2025, 1, 1), "New Year's Day"),
    (date(2025, 5, 26), "Memorial Day"),
    (date(2025, 7, 4), "Independence Day"),
    (date(2025, 9, 1), "Labor Day"),
    (date(2025, 11, 27), "Thanksgiving"),
    (date(2025, 11, 28), "Black Friday"),
    (date(2025, 12, 24), "Christmas Eve"),
    (date(2025, 12, 25), "Christmas Day"),
    (date(2025, 12, 31), "New Year's Eve"),
]

def create_test_barbers(db: Session, user_id: int) -> List[models.User]:
    """Create test barbers with realistic schedules"""
    created_barbers = []
    
    for barber_data in TEST_BARBERS:
        # Check if barber already exists
        existing = db.query(models.User).filter(
            models.User.email == barber_data["email"]
        ).first()
        
        if not existing:
            # Create barber user
            barber = models.User(
                name=barber_data["name"],
                email=barber_data["email"],
                phone=barber_data["phone"],
                hashed_password=get_password_hash("testpass123"),  # Default password
                role="barber",
                is_active=True,
                is_test_data=True
            )
            db.add(barber)
            db.flush()  # Get the ID
            
            # Create availability schedule
            day_map = {
                "monday": 0,
                "tuesday": 1,
                "wednesday": 2,
                "thursday": 3,
                "friday": 4,
                "saturday": 5,
                "sunday": 6
            }
            
            for day_name, (start_time, end_time) in barber_data["availability"].items():
                availability = models.BarberAvailability(
                    barber_id=barber.id,
                    day_of_week=day_map[day_name],
                    start_time=start_time,
                    end_time=end_time,
                    is_active=True,
                    is_test_data=True
                )
                db.add(availability)
            
            # Add holidays as time off
            for holiday_date, holiday_name in HOLIDAYS:
                if holiday_date >= date.today():  # Only future holidays
                    time_off = models.BarberTimeOff(
                        barber_id=barber.id,
                        start_date=holiday_date,
                        end_date=holiday_date,
                        reason=holiday_name,
                        status="approved",
                        is_test_data=True
                    )
                    db.add(time_off)
            
            # Add a sample vacation (summer break)
            summer_vacation_start = date.today() + timedelta(days=45)
            summer_vacation_end = summer_vacation_start + timedelta(days=7)
            vacation = models.BarberTimeOff(
                barber_id=barber.id,
                start_date=summer_vacation_start,
                end_date=summer_vacation_end,
                reason="Summer vacation",
                notes="Annual family vacation",
                status="approved",
                is_test_data=True
            )
            db.add(vacation)
            
            created_barbers.append(barber)
            logger.info(f"Created test barber: {barber.name}")
        else:
            created_barbers.append(existing)
            
    return created_barbers

def create_test_clients(db: Session, user_id: int) -> List[models.Client]:
    """Create diverse test clients"""
    created_clients = []
    
    for idx, client_data in enumerate(TEST_CLIENTS):
        # Create client
        client = models.Client(
            first_name=client_data["first_name"],
            last_name=client_data["last_name"],
            email=client_data["email"],
            phone=client_data["phone"],
            customer_type=client_data["type"],
            notes=client_data["notes"],
            created_by_id=user_id,
            is_test_data=True,
            total_visits=0,
            total_spent=0.0
        )
        
        # Set additional attributes based on type
        if client_data["type"] == "vip":
            client.total_visits = random.randint(20, 50)
            client.total_spent = float(random.randint(1000, 3000))
            client.average_ticket = client.total_spent / client.total_visits
            client.first_visit_date = datetime.utcnow() - timedelta(days=365)
            client.last_visit_date = datetime.utcnow() - timedelta(days=random.randint(7, 21))
            
        elif client_data["type"] == "regular":
            client.total_visits = random.randint(5, 20)
            client.total_spent = float(random.randint(200, 800))
            client.average_ticket = client.total_spent / client.total_visits
            client.first_visit_date = datetime.utcnow() - timedelta(days=180)
            client.last_visit_date = datetime.utcnow() - timedelta(days=random.randint(14, 30))
            
        elif client_data["type"] == "at_risk":
            client.total_visits = random.randint(3, 10)
            client.total_spent = float(random.randint(100, 400))
            client.average_ticket = client.total_spent / client.total_visits
            client.first_visit_date = datetime.utcnow() - timedelta(days=365)
            client.last_visit_date = datetime.utcnow() - timedelta(days=random.randint(60, 90))
            
        elif client_data["type"] == "problem":
            client.total_visits = random.randint(2, 5)
            client.no_show_count = random.randint(1, 3)
            client.cancellation_count = random.randint(2, 5)
            
        db.add(client)
        created_clients.append(client)
        
    logger.info(f"Created {len(created_clients)} test clients")
    return created_clients

def create_test_services(db: Session) -> List[models.Service]:
    """Create standard barbershop services if they don't exist"""
    from models import ServiceCategoryEnum
    
    services = [
        {"name": "Men's Haircut", "duration_minutes": 30, "base_price": 35.00, "description": "Classic men's haircut and style", "category": ServiceCategoryEnum.HAIRCUT},
        {"name": "Beard Trim", "duration_minutes": 15, "base_price": 20.00, "description": "Professional beard shaping and trim", "category": ServiceCategoryEnum.BEARD},
        {"name": "Hair & Beard Combo", "duration_minutes": 45, "base_price": 50.00, "description": "Full haircut and beard service", "category": ServiceCategoryEnum.PACKAGE},
        {"name": "Kids Cut", "duration_minutes": 20, "base_price": 25.00, "description": "Children's haircut (12 and under)", "category": ServiceCategoryEnum.HAIRCUT},
        {"name": "Executive Package", "duration_minutes": 60, "base_price": 75.00, "description": "Premium cut, beard, and hot towel treatment", "category": ServiceCategoryEnum.PACKAGE},
        {"name": "Quick Cleanup", "duration_minutes": 15, "base_price": 15.00, "description": "Neck and sideburn cleanup", "category": ServiceCategoryEnum.HAIRCUT},
    ]
    
    created_services = []
    for service_data in services:
        existing = db.query(models.Service).filter(
            models.Service.name == service_data["name"]
        ).first()
        
        if not existing:
            service = models.Service(**service_data)
            db.add(service)
            created_services.append(service)
        else:
            created_services.append(existing)
            
    return created_services

def create_payments_for_appointments(
    db: Session,
    appointments: List[models.Appointment]
) -> List[models.Payment]:
    """Create payment records for completed appointments"""
    created_payments = []
    
    for appointment in appointments:
        if appointment.status == "completed":
            # Create payment record
            payment = models.Payment(
                user_id=appointment.user_id,
                appointment_id=appointment.id,
                barber_id=appointment.barber_id,
                amount=appointment.price,
                status="completed",
                stripe_payment_id=f"pi_test_{appointment.id}",
                stripe_payment_intent_id=f"pi_intent_test_{appointment.id}",
                platform_fee=appointment.price * 0.20,  # 20% platform fee
                barber_amount=appointment.price * 0.80,  # 80% to barber
                commission_rate=0.20,
                created_at=appointment.start_time + timedelta(hours=1),  # Payment processed 1 hour after appointment
                updated_at=appointment.start_time + timedelta(hours=1)
            )
            db.add(payment)
            created_payments.append(payment)
            
            # Create refunds for some payments (about 5% refund rate)
            if random.random() < 0.05:
                # 70% chance of full refund, 30% chance of partial refund
                if random.random() < 0.7:
                    refund_amount = appointment.price  # Full refund
                    payment.status = "refunded"
                    # Update amounts for full refund
                    payment.platform_fee = 0  # Platform fee returned
                    payment.barber_amount = 0  # Barber amount returned
                else:
                    # Partial refund (30-70% of original amount)
                    refund_percentage = random.uniform(0.3, 0.7)
                    refund_amount = round(appointment.price * refund_percentage, 2)
                    payment.status = "partially_refunded"
                    # Update amounts for partial refund
                    payment.platform_fee = payment.platform_fee * (1 - refund_percentage)
                    payment.barber_amount = payment.barber_amount * (1 - refund_percentage)
                
                refund_reason = random.choice([
                    "Service not satisfactory",
                    "Customer changed mind",
                    "Duplicate charge",
                    "Wrong service charged",
                    "Late service",
                    "Quality issue"
                ])
                
                payment.refund_amount = refund_amount
                payment.refund_reason = refund_reason
                payment.refunded_at = payment.created_at + timedelta(days=random.randint(1, 7))
                payment.stripe_refund_id = f"re_test_{appointment.id}"
    
    logger.info(f"Created {len(created_payments)} payment records")
    return created_payments

def create_barber_payouts(
    db: Session,
    barbers: List[models.User],
    payments: List[models.Payment]
) -> List[models.Payout]:
    """Create weekly payouts for test barbers based on completed payments"""
    created_payouts = []
    
    # Get the current date and calculate the past 4 weeks
    today = date.today()
    current_week_start = today - timedelta(days=today.weekday())  # Monday of current week
    
    # Create payouts for each barber for the past 4 weeks
    for barber in barbers:
        # Filter payments for this barber
        barber_payments = [p for p in payments if p.barber_id == barber.id and p.status in ["completed", "partially_refunded"]]
        
        if not barber_payments:
            continue
            
        # Process each of the past 4 weeks
        for week_num in range(4):
            # Calculate week boundaries
            week_start_date = current_week_start - timedelta(weeks=(3 - week_num))
            week_start = datetime.combine(week_start_date, time(0, 0, 0))
            week_end = datetime.combine(week_start_date + timedelta(days=6), time(23, 59, 59))
            
            # Filter payments for this week
            week_payments = [
                p for p in barber_payments 
                if week_start <= p.created_at <= week_end
            ]
            
            if not week_payments:
                continue
                
            # Calculate total barber amount for the week
            total_amount = sum(p.barber_amount for p in week_payments)
            payment_count = len(week_payments)
            
            # Determine status based on week
            if week_num < 3:  # Past weeks
                status = "completed"
                processed_at = week_end + timedelta(days=1, hours=10)  # Process on Sunday morning
            else:  # Current week
                status = "pending"
                processed_at = None
            
            # Create payout record
            payout = Payout(
                barber_id=barber.id,
                amount=total_amount,
                status=status,
                period_start=week_start,
                period_end=week_end,
                payment_count=payment_count,
                stripe_payout_id=f"po_test_{barber.id}_{week_num}",
                stripe_transfer_id=f"tr_test_{barber.id}_{week_num}" if status == "completed" else None,
                created_at=week_end,
                processed_at=processed_at
            )
            
            db.add(payout)
            created_payouts.append(payout)
            
            logger.info(f"Created {status} payout for barber {barber.name}: ${total_amount:.2f} for week {week_num + 1}")
    
    logger.info(f"Created {len(created_payouts)} payout records")
    return created_payouts

def create_sms_conversations(
    db: Session,
    user_id: int,
    clients: List[models.Client],
    barbers: List[models.User],
    appointments: List[models.Appointment]
) -> List[models.SMSConversation]:
    """Create realistic SMS conversation threads"""
    created_conversations = []
    
    # Conversation scenarios
    scenarios = [
        {
            "type": "appointment_confirmation",
            "messages": [
                {"direction": "outbound", "content": "Hi {client_name}, this is a reminder of your appointment tomorrow at {time} with {barber_name} for {service}. Reply YES to confirm or CANCEL to cancel.", "unread": False},
                {"direction": "inbound", "content": "YES", "unread": False},
                {"direction": "outbound", "content": "Great! Your appointment is confirmed. See you tomorrow at {time}. - BookedBarber", "unread": False}
            ]
        },
        {
            "type": "reschedule_request",
            "messages": [
                {"direction": "inbound", "content": "Hi, I need to reschedule my appointment for tomorrow. Is there anything available later in the week?", "unread": True},
                {"direction": "outbound", "content": "Hi {client_name}, I can help you reschedule. I have openings on Thursday at 2pm or Friday at 4pm. Which works better for you?", "unread": False},
                {"direction": "inbound", "content": "Friday at 4pm works great", "unread": False},
                {"direction": "outbound", "content": "Perfect! I've rescheduled your appointment to Friday at 4pm with {barber_name}. You'll receive a confirmation shortly.", "unread": False}
            ]
        },
        {
            "type": "service_inquiry",
            "messages": [
                {"direction": "inbound", "content": "Do you offer beard trimming services?", "unread": True},
                {"direction": "outbound", "content": "Yes! We offer beard trims for $20 (15 min) or our Hair & Beard Combo for $50 (45 min). Would you like to book an appointment?", "unread": False},
                {"direction": "inbound", "content": "Yes, I'd like the combo please", "unread": False},
                {"direction": "outbound", "content": "Great choice! You can book online at bookedbarber.com/book or I can help you schedule. What day works best for you?", "unread": False}
            ]
        },
        {
            "type": "cancellation",
            "messages": [
                {"direction": "inbound", "content": "I need to cancel my appointment today. Sorry for the short notice", "unread": True},
                {"direction": "outbound", "content": "No problem {client_name}. I've cancelled your appointment for today. Would you like to reschedule for another day?", "unread": False},
                {"direction": "inbound", "content": "Not right now, I'll book online when I know my schedule", "unread": False},
                {"direction": "outbound", "content": "Sounds good! Visit bookedbarber.com/book when you're ready. We look forward to seeing you soon!", "unread": False}
            ]
        },
        {
            "type": "new_client_questions",
            "messages": [
                {"direction": "inbound", "content": "Hi, I'm new to the area. What are your prices for a men's haircut?", "unread": True},
                {"direction": "outbound", "content": "Welcome! Our men's haircut is $35 and includes consultation, cut, and style. First-time clients also get 10% off. Would you like to book?", "unread": False},
                {"direction": "inbound", "content": "That sounds good. Do I need to book online or can I just walk in?", "unread": False},
                {"direction": "outbound", "content": "We recommend booking online at bookedbarber.com/book to guarantee your spot. Walk-ins are welcome but subject to availability.", "unread": False},
                {"direction": "inbound", "content": "Ok I'll book online. Thanks!", "unread": False},
                {"direction": "outbound", "content": "Perfect! Looking forward to meeting you. If you have any questions, feel free to reach out. - BookedBarber Team", "unread": False}
            ]
        },
        {
            "type": "late_arrival",
            "messages": [
                {"direction": "inbound", "content": "Running 10 minutes late to my appointment. Is that ok?", "unread": True},
                {"direction": "outbound", "content": "Thanks for letting us know {client_name}. We can still take you but your service time may be shortened. See you soon!", "unread": False}
            ]
        },
        {
            "type": "feedback",
            "messages": [
                {"direction": "outbound", "content": "Hi {client_name}, thanks for visiting us yesterday! How was your experience with {barber_name}?", "unread": False},
                {"direction": "inbound", "content": "It was great! Really happy with my haircut. Will definitely be back", "unread": False},
                {"direction": "outbound", "content": "Wonderful to hear! We appreciate your feedback. See you next time! 💈", "unread": False}
            ]
        },
        {
            "type": "appointment_reminder_no_response",
            "messages": [
                {"direction": "outbound", "content": "Hi {client_name}, reminder: You have an appointment tomorrow at {time} with {barber_name}. Reply YES to confirm.", "unread": False}
            ]
        }
    ]
    
    # Create 5-8 conversations with different scenarios
    num_conversations = random.randint(5, 8)
    used_clients = []
    
    for i in range(num_conversations):
        # Pick a scenario
        scenario = random.choice(scenarios)
        
        # Pick a client (prefer not to reuse)
        available_clients = [c for c in clients if c not in used_clients] or clients
        client = random.choice(available_clients)
        used_clients.append(client)
        
        # Pick a barber
        barber = random.choice(barbers)
        
        # Find a relevant appointment for this client (if exists)
        client_appointments = [a for a in appointments if a.client_id == client.id]
        appointment = client_appointments[0] if client_appointments else None
        
        # Create conversation
        conversation = SMSConversation(
            client_id=client.id,
            customer_phone=client.phone,
            customer_name=f"{client.first_name} {client.last_name}",
            barber_id=barber.id,
            status="active",
            unread_customer_messages=sum(1 for msg in scenario["messages"] if msg["direction"] == "inbound" and msg.get("unread", True))
        )
        db.add(conversation)
        db.flush()  # Get the conversation ID
        
        # Create messages with realistic timestamps
        base_time = datetime.utcnow() - timedelta(days=random.randint(0, 3), hours=random.randint(0, 12))
        
        for idx, msg_template in enumerate(scenario["messages"]):
            # Add some time between messages (5 minutes to 2 hours)
            if idx > 0:
                base_time += timedelta(minutes=random.randint(5, 120))
            
            # Format message content with actual data
            content = msg_template["content"]
            if appointment:
                content = content.format(
                    client_name=client.first_name,
                    barber_name=barber.name.split()[0],  # First name only
                    time=appointment.start_time.strftime("%I:%M %p"),
                    service=appointment.service_name
                )
            else:
                # Use generic replacements
                content = content.format(
                    client_name=client.first_name,
                    barber_name=barber.name.split()[0],
                    time="2:00 PM",
                    service="Men's Haircut"
                )
            
            # Determine phone numbers based on direction
            if msg_template["direction"] == "outbound":
                from_phone = "+15551234500"  # Business phone
                to_phone = client.phone
                direction = SMSMessageDirection.OUTBOUND
                status = SMSMessageStatus.DELIVERED
            else:
                from_phone = client.phone
                to_phone = "+15551234500"  # Business phone
                direction = SMSMessageDirection.INBOUND
                status = SMSMessageStatus.READ if not msg_template.get("unread", False) else SMSMessageStatus.DELIVERED
            
            message = SMSMessage(
                conversation_id=conversation.id,
                body=content,
                direction=direction,
                from_phone=from_phone,
                to_phone=to_phone,
                status=status,
                created_at=base_time
            )
            db.add(message)
            
            # Update conversation's last message time and direction
            conversation.last_message_at = base_time
            conversation.last_message_from = "customer" if msg_template["direction"] == "inbound" else "business"
        
        # Update total messages count
        conversation.total_messages = len(scenario["messages"])
        
        created_conversations.append(conversation)
    
    logger.info(f"Created {len(created_conversations)} SMS conversations")
    return created_conversations

def create_notification_history(
    db: Session,
    appointments: List[models.Appointment],
    clients: List[models.Client],
    user_id: int
) -> List[models.NotificationQueue]:
    """Create notification history for appointments"""
    created_notifications = []
    
    # Notification templates
    templates = {
        "appointment_confirmation": {
            "email": {
                "subject": "Appointment Confirmed - BookedBarber",
                "body": "Hi {client_name},\n\nYour appointment has been confirmed:\n\nDate: {date}\nTime: {time}\nService: {service}\nBarber: {barber}\n\nWe look forward to seeing you!\n\nBookedBarber Team"
            },
            "sms": {
                "body": "Hi {client_name}, your appointment is confirmed for {date} at {time} with {barber} for {service}. Reply CANCEL to cancel."
            }
        },
        "reminder_24h": {
            "email": {
                "subject": "Appointment Reminder - Tomorrow at {time}",
                "body": "Hi {client_name},\n\nThis is a reminder that you have an appointment tomorrow:\n\nDate: {date}\nTime: {time}\nService: {service}\nBarber: {barber}\n\nIf you need to reschedule, please let us know as soon as possible.\n\nSee you tomorrow!"
            },
            "sms": {
                "body": "Reminder: You have an appointment tomorrow at {time} with {barber} for {service}. Reply YES to confirm or CANCEL to cancel."
            }
        },
        "reminder_2h": {
            "email": {
                "subject": "Appointment in 2 Hours",
                "body": "Hi {client_name},\n\nJust a quick reminder that your appointment is in 2 hours:\n\nTime: {time}\nService: {service}\nBarber: {barber}\n\nWe're looking forward to seeing you soon!"
            },
            "sms": {
                "body": "Hi {client_name}, your appointment is in 2 hours at {time} with {barber}. See you soon!"
            }
        },
        "thank_you": {
            "email": {
                "subject": "Thank You for Visiting BookedBarber",
                "body": "Hi {client_name},\n\nThank you for choosing BookedBarber! We hope you enjoyed your {service} with {barber} today.\n\nWe'd love to see you again. Book your next appointment at bookedbarber.com/book\n\nBest regards,\nThe BookedBarber Team"
            },
            "sms": {
                "body": "Thanks for visiting BookedBarber today, {client_name}! We hope you enjoyed your service. Book your next appointment at bookedbarber.com/book"
            }
        },
        "no_show_followup": {
            "email": {
                "subject": "We Missed You Today",
                "body": "Hi {client_name},\n\nWe noticed you weren't able to make your appointment today. We hope everything is okay!\n\nIf you'd like to reschedule, please visit bookedbarber.com/book or give us a call.\n\nWe look forward to seeing you soon!"
            },
            "sms": {
                "body": "Hi {client_name}, we missed you today. Hope everything is okay! Visit bookedbarber.com/book to reschedule anytime."
            }
        },
        "cancellation_confirmation": {
            "email": {
                "subject": "Appointment Cancelled",
                "body": "Hi {client_name},\n\nYour appointment for {date} at {time} has been cancelled as requested.\n\nWe hope to see you again soon. You can book a new appointment anytime at bookedbarber.com/book\n\nBookedBarber Team"
            },
            "sms": {
                "body": "Your appointment for {date} at {time} has been cancelled. Book again anytime at bookedbarber.com/book"
            }
        }
    }
    
    # Process appointments
    for appointment in appointments:
        client = next((c for c in clients if c.id == appointment.client_id), None)
        if not client:
            continue
            
        # Format notification data
        notification_data = {
            "client_name": client.first_name,
            "date": appointment.start_time.strftime("%B %d, %Y"),
            "time": appointment.start_time.strftime("%-I:%M %p"),
            "service": appointment.service_name,
            "barber": models.User.__table__.select().where(models.User.id == appointment.barber_id).scalar_subquery()
        }
        
        # For simplicity, just use barber name placeholder
        notification_data["barber"] = f"Barber {appointment.barber_id}"
        
        # Create notifications based on appointment status
        if appointment.status == "completed":
            # For completed appointments, create historical notifications
            
            # 1. Confirmation notification (sent when booked)
            for notification_type in ["email", "sms"]:
                template = templates["appointment_confirmation"][notification_type]
                notification = NotificationQueue(
                    user_id=user_id,
                    appointment_id=appointment.id,
                    notification_type=notification_type,
                    template_name="appointment_confirmation",
                    recipient=client.email if notification_type == "email" else client.phone,
                    subject=template.get("subject", "").format(**notification_data) if notification_type == "email" else None,
                    body=template["body"].format(**notification_data),
                    status=NotificationStatus.SENT,
                    scheduled_for=appointment.created_at,
                    sent_at=appointment.created_at + timedelta(minutes=2),
                    attempts=1,
                    notification_metadata={
                        "client_id": client.id,
                        "appointment_status": "scheduled"
                    }
                )
                db.add(notification)
                created_notifications.append(notification)
            
            # 2. 24-hour reminder
            reminder_24h_time = appointment.start_time - timedelta(hours=24)
            if reminder_24h_time > datetime.utcnow() - timedelta(days=30):  # Only for recent appointments
                for notification_type in ["email", "sms"]:
                    template = templates["reminder_24h"][notification_type]
                    # 90% success rate
                    status = NotificationStatus.SENT if random.random() < 0.9 else NotificationStatus.FAILED
                    notification = NotificationQueue(
                        user_id=user_id,
                        appointment_id=appointment.id,
                        notification_type=notification_type,
                        template_name="reminder_24h",
                        recipient=client.email if notification_type == "email" else client.phone,
                        subject=template.get("subject", "").format(**notification_data) if notification_type == "email" else None,
                        body=template["body"].format(**notification_data),
                        status=status,
                        scheduled_for=reminder_24h_time,
                        sent_at=reminder_24h_time + timedelta(minutes=5) if status == NotificationStatus.SENT else None,
                        attempts=1 if status == NotificationStatus.SENT else 3,
                        error_message="Failed to connect to email server" if status == NotificationStatus.FAILED and notification_type == "email" else 
                                     "Invalid phone number format" if status == NotificationStatus.FAILED else None,
                        notification_metadata={
                            "client_id": client.id,
                            "reminder_type": "24_hour"
                        }
                    )
                    db.add(notification)
                    created_notifications.append(notification)
            
            # 3. 2-hour reminder (only SMS)
            reminder_2h_time = appointment.start_time - timedelta(hours=2)
            if reminder_2h_time > datetime.utcnow() - timedelta(days=30):
                template = templates["reminder_2h"]["sms"]
                notification = NotificationQueue(
                    user_id=user_id,
                    appointment_id=appointment.id,
                    notification_type="sms",
                    template_name="reminder_2h",
                    recipient=client.phone,
                    body=template["body"].format(**notification_data),
                    status=NotificationStatus.SENT,
                    scheduled_for=reminder_2h_time,
                    sent_at=reminder_2h_time + timedelta(minutes=1),
                    attempts=1,
                    notification_metadata={
                        "client_id": client.id,
                        "reminder_type": "2_hour"
                    }
                )
                db.add(notification)
                created_notifications.append(notification)
            
            # 4. Thank you message (sent 1 hour after appointment)
            thank_you_time = appointment.start_time + timedelta(hours=1, minutes=30)
            if thank_you_time < datetime.utcnow():
                for notification_type in ["email", "sms"]:
                    template = templates["thank_you"][notification_type]
                    notification = NotificationQueue(
                        user_id=user_id,
                        appointment_id=appointment.id,
                        notification_type=notification_type,
                        template_name="thank_you",
                        recipient=client.email if notification_type == "email" else client.phone,
                        subject=template.get("subject", "").format(**notification_data) if notification_type == "email" else None,
                        body=template["body"].format(**notification_data),
                        status=NotificationStatus.SENT,
                        scheduled_for=thank_you_time,
                        sent_at=thank_you_time + timedelta(minutes=3),
                        attempts=1,
                        notification_metadata={
                            "client_id": client.id,
                            "follow_up_type": "thank_you"
                        }
                    )
                    db.add(notification)
                    created_notifications.append(notification)
                    
        elif appointment.status == "no_show":
            # No-show follow-up
            follow_up_time = appointment.start_time + timedelta(hours=2)
            if follow_up_time < datetime.utcnow():
                for notification_type in ["email", "sms"]:
                    template = templates["no_show_followup"][notification_type]
                    notification = NotificationQueue(
                        user_id=user_id,
                        appointment_id=appointment.id,
                        notification_type=notification_type,
                        template_name="no_show_followup",
                        recipient=client.email if notification_type == "email" else client.phone,
                        subject=template.get("subject", "").format(**notification_data) if notification_type == "email" else None,
                        body=template["body"].format(**notification_data),
                        status=NotificationStatus.SENT,
                        scheduled_for=follow_up_time,
                        sent_at=follow_up_time + timedelta(minutes=10),
                        attempts=1,
                        notification_metadata={
                            "client_id": client.id,
                            "follow_up_type": "no_show"
                        }
                    )
                    db.add(notification)
                    created_notifications.append(notification)
                    
        elif appointment.status == "cancelled":
            # Cancellation confirmation
            cancel_time = appointment.created_at  # Use created_at since updated_at doesn't exist
            for notification_type in ["email", "sms"]:
                template = templates["cancellation_confirmation"][notification_type]
                notification = NotificationQueue(
                    user_id=user_id,
                    appointment_id=appointment.id,
                    notification_type=notification_type,
                    template_name="cancellation_confirmation",
                    recipient=client.email if notification_type == "email" else client.phone,
                    subject=template.get("subject", "").format(**notification_data) if notification_type == "email" else None,
                    body=template["body"].format(**notification_data),
                    status=NotificationStatus.SENT,
                    scheduled_for=cancel_time,
                    sent_at=cancel_time + timedelta(minutes=1),
                    attempts=1,
                    notification_metadata={
                        "client_id": client.id,
                        "cancellation_time": cancel_time.isoformat()
                    }
                )
                db.add(notification)
                created_notifications.append(notification)
                
        elif appointment.status == "scheduled" and appointment.start_time > datetime.utcnow():
            # Future appointments - create pending notifications
            
            # 1. Confirmation (should already be sent)
            for notification_type in ["email", "sms"]:
                template = templates["appointment_confirmation"][notification_type]
                notification = NotificationQueue(
                    user_id=user_id,
                    appointment_id=appointment.id,
                    notification_type=notification_type,
                    template_name="appointment_confirmation",
                    recipient=client.email if notification_type == "email" else client.phone,
                    subject=template.get("subject", "").format(**notification_data) if notification_type == "email" else None,
                    body=template["body"].format(**notification_data),
                    status=NotificationStatus.SENT,
                    scheduled_for=appointment.created_at,
                    sent_at=appointment.created_at + timedelta(minutes=2),
                    attempts=1,
                    notification_metadata={
                        "client_id": client.id,
                        "appointment_status": "scheduled"
                    }
                )
                db.add(notification)
                created_notifications.append(notification)
            
            # 2. 24-hour reminder (pending if in future)
            reminder_24h_time = appointment.start_time - timedelta(hours=24)
            if reminder_24h_time > datetime.utcnow():
                for notification_type in ["email", "sms"]:
                    template = templates["reminder_24h"][notification_type]
                    notification = NotificationQueue(
                        user_id=user_id,
                        appointment_id=appointment.id,
                        notification_type=notification_type,
                        template_name="reminder_24h",
                        recipient=client.email if notification_type == "email" else client.phone,
                        subject=template.get("subject", "").format(**notification_data) if notification_type == "email" else None,
                        body=template["body"].format(**notification_data),
                        status=NotificationStatus.PENDING,
                        scheduled_for=reminder_24h_time,
                        attempts=0,
                        notification_metadata={
                            "client_id": client.id,
                            "reminder_type": "24_hour"
                        }
                    )
                    db.add(notification)
                    created_notifications.append(notification)
            
            # 3. 2-hour reminder (pending if in future)
            reminder_2h_time = appointment.start_time - timedelta(hours=2)
            if reminder_2h_time > datetime.utcnow():
                template = templates["reminder_2h"]["sms"]
                notification = NotificationQueue(
                    user_id=user_id,
                    appointment_id=appointment.id,
                    notification_type="sms",
                    template_name="reminder_2h",
                    recipient=client.phone,
                    body=template["body"].format(**notification_data),
                    status=NotificationStatus.PENDING,
                    scheduled_for=reminder_2h_time,
                    attempts=0,
                    notification_metadata={
                        "client_id": client.id,
                        "reminder_type": "2_hour"
                    }
                )
                db.add(notification)
                created_notifications.append(notification)
    
    # Add some random failed notifications for testing
    failed_scenarios = [
        {
            "type": "email",
            "error": "SMTP connection timeout",
            "template": "appointment_confirmation"
        },
        {
            "type": "sms",
            "error": "Invalid recipient phone number: number is not SMS capable",
            "template": "reminder_24h"
        },
        {
            "type": "email",
            "error": "Recipient email bounced: mailbox full",
            "template": "thank_you"
        },
        {
            "type": "sms",
            "error": "SMS delivery failed: carrier rejected message",
            "template": "reminder_2h"
        }
    ]
    
    # Create 2-4 failed notifications
    num_failed = random.randint(2, 4)
    sample_appointments = random.sample([a for a in appointments if a.status == "completed"], min(num_failed, len([a for a in appointments if a.status == "completed"])))
    
    for i, appointment in enumerate(sample_appointments[:num_failed]):
        client = next((c for c in clients if c.id == appointment.client_id), None)
        if not client:
            continue
            
        scenario = failed_scenarios[i % len(failed_scenarios)]
        
        notification = NotificationQueue(
            user_id=user_id,
            appointment_id=appointment.id,
            notification_type=scenario["type"],
            template_name=scenario["template"],
            recipient=client.email if scenario["type"] == "email" else client.phone,
            subject="Test Failed Notification" if scenario["type"] == "email" else None,
            body="This is a test failed notification",
            status=NotificationStatus.FAILED,
            scheduled_for=appointment.start_time - timedelta(hours=random.randint(1, 48)),
            attempts=3,
            error_message=scenario["error"],
            notification_metadata={
                "client_id": client.id,
                "failure_reason": "test_data"
            }
        )
        db.add(notification)
        created_notifications.append(notification)
    
    logger.info(f"Created {len(created_notifications)} notification records")
    return created_notifications

def create_test_appointments(
    db: Session, 
    user_id: int,
    barbers: List[models.User],
    clients: List[models.Client],
    services: List[models.Service]
) -> List[models.Appointment]:
    """Create realistic appointment history and future bookings"""
    created_appointments = []
    
    # Historical appointments (last 30 days)
    for days_ago in range(30, 0, -1):
        appointment_date = date.today() - timedelta(days=days_ago)
        
        # Skip Sundays
        if appointment_date.weekday() == 6:
            continue
            
        # Create appointments with realistic patterns
        # Fridays are busiest, Mondays are slowest
        if appointment_date.weekday() == 4:  # Friday
            num_appointments = random.randint(8, 12)
        elif appointment_date.weekday() == 5:  # Saturday
            num_appointments = random.randint(6, 10)
        elif appointment_date.weekday() == 0:  # Monday
            num_appointments = random.randint(2, 4)
        else:  # Tuesday-Thursday
            num_appointments = random.randint(4, 7)
        
        for _ in range(num_appointments):
            # Random client and service
            client = random.choice(clients)
            service = random.choice(services)
            barber = random.choice(barbers)
            
            # Realistic time distribution - busy after work hours
            if appointment_date.weekday() in [4, 5]:  # Friday/Saturday
                # More evening appointments
                if random.random() < 0.6:
                    hour = random.choice([16, 17, 18])
                else:
                    hour = random.randint(9, 15)
            else:
                # Regular days - some lunch gaps
                hour_choices = [9, 10, 11, 14, 15, 16, 17]  # Skip 12-1pm lunch
                hour = random.choice(hour_choices)
            minute = random.choice([0, 15, 30, 45])
            start_time = datetime.combine(appointment_date, time(hour, minute))
            
            # Skip if this is a no-show client sometimes
            status = "completed"
            if "NoShow" in client.last_name and random.random() < 0.3:
                status = "no_show"
            elif "Canceler" in client.last_name and random.random() < 0.4:
                status = "cancelled"
                
            appointment = models.Appointment(
                user_id=user_id,
                barber_id=barber.id,
                client_id=client.id,
                service_id=service.id,
                service_name=service.name,
                start_time=start_time,
                duration_minutes=service.duration_minutes,
                price=float(service.base_price),
                status=status,
                is_test_data=True
            )
            db.add(appointment)
            created_appointments.append(appointment)
    
    # Today's appointments
    today = date.today()
    today_times = [
        (9, 0), (9, 30), (10, 15), (11, 0), (11, 45),
        (14, 0), (14, 45), (15, 30), (16, 15), (17, 0)
    ]
    
    for idx, (hour, minute) in enumerate(today_times[:6]):  # Create 6 appointments for today
        client = clients[idx % len(clients)]
        service = services[idx % len(services)]
        barber = barbers[idx % len(barbers)]
        
        start_time = datetime.combine(today, time(hour, minute))
        
        # First few are completed, last few are scheduled
        status = "completed" if idx < 3 else "scheduled"
        
        appointment = models.Appointment(
            user_id=user_id,
            barber_id=barber.id,
            client_id=client.id,
            service_id=service.id,
            service_name=service.name,
            start_time=start_time,
            duration_minutes=service.duration_minutes,
            price=float(service.base_price),
            status=status,
            is_test_data=True
        )
        db.add(appointment)
        created_appointments.append(appointment)
    
    # Future appointments (next 14 days)
    for days_ahead in range(1, 15):
        future_date = today + timedelta(days=days_ahead)
        
        # Skip Sundays
        if future_date.weekday() == 6:
            continue
            
        # Realistic future booking patterns
        if future_date.weekday() == 4:  # Friday
            num_appointments = random.randint(10, 14)  # Nearly fully booked
        elif future_date.weekday() == 5:  # Saturday
            num_appointments = random.randint(8, 12)
        elif future_date.weekday() == 0:  # Monday
            num_appointments = random.randint(1, 3)  # Slow day
        else:  # Tuesday-Thursday
            num_appointments = random.randint(3, 7)
            
        for _ in range(num_appointments):
            client = random.choice(clients)
            service = random.choice(services)
            barber = random.choice(barbers)
            
            # Popular times (after work hours)
            if random.random() < 0.4:
                hour = random.choice([16, 17, 18])
            else:
                hour = random.randint(9, 17)
            minute = random.choice([0, 15, 30, 45])
            
            start_time = datetime.combine(future_date, time(hour, minute))
            
            appointment = models.Appointment(
                user_id=user_id,
                barber_id=barber.id,
                client_id=client.id,
                service_id=service.id,
                service_name=service.name,
                start_time=start_time,
                duration_minutes=service.duration_minutes,
                price=float(service.base_price),
                status="scheduled",
                is_test_data=True
            )
            db.add(appointment)
            created_appointments.append(appointment)
    
    logger.info(f"Created {len(created_appointments)} test appointments")
    return created_appointments

def create_recurring_patterns(
    db: Session,
    user_id: int,
    barbers: List[models.User],
    clients: List[models.Client],
    services: List[models.Service],
    appointments: List[models.Appointment]
) -> List[models.RecurringAppointmentPattern]:
    """Create recurring appointment patterns and link some existing appointments"""
    created_patterns = []
    
    # Pattern 1: Weekly haircut (every Friday at 3pm)
    # Find VIP client for weekly pattern
    vip_client = next((c for c in clients if c.customer_type == "vip"), clients[0])
    haircut_service = next((s for s in services if "Haircut" in s.name and "Kids" not in s.name), services[0])
    primary_barber = barbers[0] if barbers else None
    
    if primary_barber:
        weekly_pattern = RecurringAppointmentPattern(
            user_id=user_id,
            barber_id=primary_barber.id,
            client_id=vip_client.id,
            service_id=haircut_service.id,
            pattern_type="weekly",
            days_of_week=[4],  # Friday (0=Monday, 4=Friday)
            preferred_time=time(15, 0),  # 3:00 PM
            duration_minutes=haircut_service.duration_minutes,
            start_date=date.today() - timedelta(days=90),  # Started 3 months ago
            end_date=date.today() + timedelta(days=180),  # Continues for 6 months
            is_active=True
        )
        db.add(weekly_pattern)
        db.flush()
        created_patterns.append(weekly_pattern)
        
        # Link some existing Friday appointments to this pattern
        friday_appointments = [
            a for a in appointments 
            if a.client_id == vip_client.id 
            and a.start_time.weekday() == 4  # Friday
            and a.start_time.hour == 15  # 3 PM
        ]
        for appt in friday_appointments[:4]:  # Link up to 4 appointments
            appt.recurring_pattern_id = weekly_pattern.id
    
    # Pattern 2: Bi-weekly beard trim (every other Tuesday)
    # Find regular client for bi-weekly pattern
    regular_client = next((c for c in clients if c.customer_type == "regular" and "beard" in c.notes.lower()), clients[1])
    beard_service = next((s for s in services if "Beard" in s.name and "Combo" not in s.name), services[1])
    
    if len(barbers) > 1:
        biweekly_pattern = RecurringAppointmentPattern(
            user_id=user_id,
            barber_id=barbers[1].id,
            client_id=regular_client.id,
            service_id=beard_service.id,
            pattern_type="biweekly",
            days_of_week=[1],  # Tuesday
            preferred_time=time(17, 30),  # 5:30 PM
            duration_minutes=beard_service.duration_minutes,
            start_date=date.today() - timedelta(days=60),  # Started 2 months ago
            end_date=None,  # No end date
            is_active=True
        )
        db.add(biweekly_pattern)
        db.flush()
        created_patterns.append(biweekly_pattern)
        
        # Link some existing Tuesday appointments to this pattern
        tuesday_appointments = [
            a for a in appointments 
            if a.client_id == regular_client.id 
            and a.start_time.weekday() == 1  # Tuesday
            and a.service_id == beard_service.id
        ]
        for idx, appt in enumerate(tuesday_appointments[:3]):
            # Only link every other appointment (bi-weekly)
            if idx % 2 == 0:
                appt.recurring_pattern_id = biweekly_pattern.id
    
    # Pattern 3: Monthly executive package (first Monday of month)
    # Find another VIP client for monthly pattern
    monthly_vip_client = next((c for c in clients if c.customer_type == "vip" and c.id != vip_client.id), vip_client)
    executive_service = next((s for s in services if "Executive" in s.name), services[2])
    
    monthly_pattern = RecurringAppointmentPattern(
        user_id=user_id,
        barber_id=primary_barber.id if primary_barber else None,
        client_id=monthly_vip_client.id,
        service_id=executive_service.id,
        pattern_type="monthly",
        week_of_month=1,  # First week
        days_of_week=[0],  # Monday
        preferred_time=time(10, 0),  # 10:00 AM
        duration_minutes=executive_service.duration_minutes,
        start_date=date.today() - timedelta(days=120),  # Started 4 months ago
        end_date=date.today() + timedelta(days=365),  # Continues for 1 year
        is_active=True
    )
    db.add(monthly_pattern)
    db.flush()
    created_patterns.append(monthly_pattern)
    
    # Link some existing Monday appointments to this pattern
    # Find first Monday appointments
    monday_appointments = [
        a for a in appointments 
        if a.client_id == monthly_vip_client.id 
        and a.start_time.weekday() == 0  # Monday
        and a.service_id == executive_service.id
        and a.start_time.day <= 7  # First week of month
    ]
    for appt in monday_appointments[:3]:  # Link up to 3 appointments
        appt.recurring_pattern_id = monthly_pattern.id
    
    # Pattern 4: Weekly kids cut (Saturday mornings)
    # Find a client who brings their child
    parent_client = next((c for c in clients if "son" in c.notes.lower()), clients[3])
    kids_service = next((s for s in services if "Kids" in s.name), services[3])
    
    if len(barbers) > 1:
        kids_pattern = RecurringAppointmentPattern(
            user_id=user_id,
            barber_id=barbers[1].id,  # Different barber for variety
            client_id=parent_client.id,
            service_id=kids_service.id,
            pattern_type="weekly",
            days_of_week=[5],  # Saturday
            preferred_time=time(9, 30),  # 9:30 AM
            duration_minutes=kids_service.duration_minutes,
            start_date=date.today() - timedelta(days=45),  # Started 1.5 months ago
            end_date=None,  # Ongoing
            is_active=True
        )
        db.add(kids_pattern)
        db.flush()
        created_patterns.append(kids_pattern)
        
        # Link Saturday morning appointments
        saturday_appointments = [
            a for a in appointments 
            if a.client_id == parent_client.id 
            and a.start_time.weekday() == 5  # Saturday
            and a.start_time.hour < 12  # Morning
            and kids_service.id == a.service_id
        ]
        for appt in saturday_appointments[:4]:
            appt.recurring_pattern_id = kids_pattern.id
        
        # Create a modified instance for one appointment (simulate a schedule change)
        if saturday_appointments:
            # Mark one appointment as modified (different time than usual)
            modified_appt = next(
                (a for a in saturday_appointments if a.start_time.hour != 9), 
                None
            )
            if modified_appt:
                # This appointment deviates from the pattern but is still linked
                modified_appt.notes = "Modified from regular 9:30 AM slot due to schedule conflict"
    
    logger.info(f"Created {len(created_patterns)} recurring appointment patterns")
    
    # Log pattern details for debugging
    for pattern in created_patterns:
        linked_count = len([a for a in appointments if a.recurring_pattern_id == pattern.id])
        logger.info(f"Pattern {pattern.pattern_type} for client {pattern.client_id}: {linked_count} linked appointments")
    
    return created_patterns

def create_gift_certificates(
    db: Session,
    user_id: int,
    payments: List[models.Payment]
) -> List[models.GiftCertificate]:
    """Create gift certificates with various statuses"""
    created_certificates = []
    
    # Certificate 1: Active $50 certificate
    cert1 = GiftCertificate(
        code=f"GIFT-2025-{random.randint(1000, 9999)}",
        amount=50.0,
        balance=50.0,
        status="active",
        purchaser_name="John Smith",
        purchaser_email="john.smith@testdata.com",
        recipient_name="Mike Johnson",
        recipient_email="mike.j@testdata.com",
        message="Happy Birthday! Enjoy a fresh cut on me.",
        valid_from=datetime.utcnow() - timedelta(days=30),
        valid_until=datetime.utcnow() + timedelta(days=335),  # Valid for ~1 year
        created_by_id=user_id,
        stripe_payment_intent_id="pi_test_gift_50",
        created_at=datetime.utcnow() - timedelta(days=30)
    )
    db.add(cert1)
    created_certificates.append(cert1)
    
    # Certificate 2: Active $100 certificate
    cert2 = GiftCertificate(
        code=f"GIFT-2025-{random.randint(1000, 9999)}",
        amount=100.0,
        balance=100.0,
        status="active",
        purchaser_name="Sarah Williams",
        purchaser_email="sarah.w@testdata.com",
        recipient_name="David Brown",
        recipient_email="david.b@testdata.com",
        message="Merry Christmas! Treat yourself to some grooming.",
        valid_from=datetime.utcnow() - timedelta(days=10),
        valid_until=datetime.utcnow() + timedelta(days=355),
        created_by_id=user_id,
        stripe_payment_intent_id="pi_test_gift_100",
        created_at=datetime.utcnow() - timedelta(days=10)
    )
    db.add(cert2)
    created_certificates.append(cert2)
    
    # Certificate 3: Partially used certificate ($75 balance of $100)
    cert3 = GiftCertificate(
        code=f"GIFT-2025-{random.randint(1000, 9999)}",
        amount=100.0,
        balance=75.0,  # $25 used
        status="active",
        purchaser_name="Emily Davis",
        purchaser_email="emily.d@testdata.com",
        recipient_name="Robert Johnson",
        recipient_email="robert.j@testdata.com",
        message="Happy Father's Day! You deserve it.",
        valid_from=datetime.utcnow() - timedelta(days=60),
        valid_until=datetime.utcnow() + timedelta(days=305),
        created_by_id=user_id,
        stripe_payment_intent_id="pi_test_gift_100_partial",
        created_at=datetime.utcnow() - timedelta(days=60),
        used_at=datetime.utcnow() - timedelta(days=15)  # First used 15 days ago
    )
    db.add(cert3)
    db.flush()  # Get the ID for linking to payment
    created_certificates.append(cert3)
    
    # Find a recent payment to link with the partially used certificate
    recent_payments = [p for p in payments if p.created_at > datetime.utcnow() - timedelta(days=20) and p.status == "completed"]
    if recent_payments and recent_payments[0].amount >= 25:
        # Link the certificate to a payment
        payment = recent_payments[0]
        payment.gift_certificate_id = cert3.id
        payment.gift_certificate_amount_used = 25.0  # Used $25 from the certificate
        logger.info(f"Linked partially used gift certificate to payment {payment.id}")
    
    # Certificate 4: Expired certificate
    cert4 = GiftCertificate(
        code=f"GIFT-2025-{random.randint(1000, 9999)}",
        amount=75.0,
        balance=75.0,  # Never used
        status="expired",
        purchaser_name="Michael Chen",
        purchaser_email="m.chen@testdata.com",
        recipient_name="James Wilson",
        recipient_email="j.wilson@testdata.com",
        message="Happy holidays! Get yourself looking sharp.",
        valid_from=datetime.utcnow() - timedelta(days=400),
        valid_until=datetime.utcnow() - timedelta(days=35),  # Expired 35 days ago
        created_by_id=user_id,
        stripe_payment_intent_id="pi_test_gift_75_expired",
        created_at=datetime.utcnow() - timedelta(days=400)
    )
    db.add(cert4)
    created_certificates.append(cert4)
    
    # Certificate 5: Fully redeemed certificate
    cert5 = GiftCertificate(
        code=f"GIFT-2025-{random.randint(1000, 9999)}",
        amount=50.0,
        balance=0.0,  # Fully used
        status="used",
        purchaser_name="Lisa Anderson",
        purchaser_email="lisa.a@testdata.com",
        recipient_name="Christopher Lee",
        recipient_email="chris.lee@testdata.com",
        message="Congratulations on your promotion!",
        valid_from=datetime.utcnow() - timedelta(days=90),
        valid_until=datetime.utcnow() + timedelta(days=275),
        created_by_id=user_id,
        stripe_payment_intent_id="pi_test_gift_50_used",
        created_at=datetime.utcnow() - timedelta(days=90),
        used_at=datetime.utcnow() - timedelta(days=45)  # Fully used 45 days ago
    )
    db.add(cert5)
    db.flush()  # Get the ID for linking to payment
    created_certificates.append(cert5)
    
    # Find an older payment to link with the fully redeemed certificate
    older_payments = [p for p in payments if p.created_at > datetime.utcnow() - timedelta(days=50) 
                      and p.created_at < datetime.utcnow() - timedelta(days=40) 
                      and p.status == "completed"]
    if older_payments and older_payments[0].amount >= 50:
        # Link the certificate to a payment
        payment = older_payments[0]
        payment.gift_certificate_id = cert5.id
        payment.gift_certificate_amount_used = 50.0  # Used full $50 from the certificate
        logger.info(f"Linked fully redeemed gift certificate to payment {payment.id}")
    
    logger.info(f"Created {len(created_certificates)} gift certificates with various statuses")
    return created_certificates

def create_marketing_data(
    db: Session,
    user_id: int,
    clients: List[models.Client]
) -> Dict[str, List]:
    """Create marketing campaigns, templates, contact lists and analytics"""
    created_data = {
        "campaigns": [],
        "templates": [],
        "contact_lists": [],
        "analytics": []
    }
    
    try:
        # Create email/SMS templates first
        templates_data = [
            {
                "name": "Appointment Confirmation",
                "type": "email",
                "subject": "Your Appointment is Confirmed - {{barber_name}}",
                "content": """
                    <h2>Hi {{client_name}},</h2>
                    <p>Your appointment has been confirmed!</p>
                    <ul>
                        <li><strong>Date:</strong> {{appointment_date}}</li>
                        <li><strong>Time:</strong> {{appointment_time}}</li>
                        <li><strong>Service:</strong> {{service_name}}</li>
                        <li><strong>Barber:</strong> {{barber_name}}</li>
                    </ul>
                    <p>We look forward to seeing you!</p>
                    <p>Best regards,<br>BookedBarber Team</p>
                """,
                "is_active": True,
                "created_by_id": user_id
            },
            {
                "name": "New Client Welcome",
                "type": "email",
                "subject": "Welcome to BookedBarber - 10% Off Your First Visit!",
                "content": """
                    <h2>Welcome {{client_name}}!</h2>
                    <p>Thank you for choosing BookedBarber. As a welcome gift, enjoy 10% off your first service!</p>
                    <p>Use code: <strong>WELCOME10</strong></p>
                    <p>Our services include:</p>
                    <ul>
                        <li>Professional Haircuts</li>
                        <li>Beard Styling</li>
                        <li>Executive Packages</li>
                    </ul>
                    <p><a href="{{booking_link}}">Book Your Appointment</a></p>
                """,
                "is_active": True,
                "created_by_id": user_id
            },
            {
                "name": "Promotional Offer",
                "type": "sms",
                "content": "Hi {{client_name}}! 🎉 {{promotion_text}} Book now: {{booking_link}} Reply STOP to unsubscribe.",
                "is_active": True,
                "created_by_id": user_id
            },
            {
                "name": "VIP Loyalty",
                "type": "email",
                "subject": "VIP Exclusive: {{reward_title}}",
                "content": """
                    <h2>Dear Valued VIP Client,</h2>
                    <p>As one of our most loyal customers, you've earned:</p>
                    <h3>{{reward_description}}</h3>
                    <p>Your loyalty means everything to us. This exclusive offer is valid until {{expiry_date}}.</p>
                    <p><a href="{{booking_link}}">Claim Your Reward</a></p>
                    <p>Thank you for being part of the BookedBarber family!</p>
                """,
                "is_active": True,
                "created_by_id": user_id
            }
        ]
        
        for template_data in templates_data:
            template = MarketingTemplate(**template_data)
            db.add(template)
            created_data["templates"].append(template)
        
        db.flush()  # Get template IDs
        
        # Create contact lists
        # All Clients list
        all_clients_list = ContactList(
            name="All Clients",
            description="Complete client database",
            created_by_id=user_id,
            member_count=len(clients)
        )
        db.add(all_clients_list)
        db.flush()
        
        # Add all clients to the list
        for client in clients:
            member = ContactListMember(
                list_id=all_clients_list.id,
                client_id=client.id
            )
            db.add(member)
        created_data["contact_lists"].append(all_clients_list)
        
        # VIP Clients list
        vip_clients = [c for c in clients if c.customer_type == "vip"]
        if vip_clients:
            vip_list = ContactList(
                name="VIP Clients",
                description="High-value loyal customers",
                created_by_id=user_id,
                member_count=len(vip_clients)
            )
            db.add(vip_list)
            db.flush()
            
            for client in vip_clients:
                member = ContactListMember(
                    list_id=vip_list.id,
                    client_id=client.id
                )
                db.add(member)
            created_data["contact_lists"].append(vip_list)
        
        # New Clients list
        new_clients = [c for c in clients if c.customer_type == "new"]
        if new_clients:
            new_list = ContactList(
                name="New Clients",
                description="Recently acquired customers",
                created_by_id=user_id,
                member_count=len(new_clients)
            )
            db.add(new_list)
            db.flush()
            
            for client in new_clients:
                member = ContactListMember(
                    list_id=new_list.id,
                    client_id=client.id
                )
                db.add(member)
            created_data["contact_lists"].append(new_list)
        
        # Create marketing campaigns
        campaigns_data = [
            {
                "name": "Summer Special",
                "type": "email",
                "status": "active",
                "template_id": next((t.id for t in created_data["templates"] if t.name == "Promotional Offer" and t.type == "email"), None),
                "subject": "☀️ Summer Special: 20% Off All Services!",
                "content": "Beat the heat with a fresh cut! Get 20% off all services this week only.",
                "scheduled_at": datetime.utcnow() - timedelta(weeks=2),
                "sent_at": datetime.utcnow() - timedelta(weeks=2, hours=1),
                "created_by_id": user_id,
                "target_audience": "all",
                "contact_list_id": all_clients_list.id
            },
            {
                "name": "New Client Welcome",
                "type": "email",
                "status": "active",
                "template_id": next((t.id for t in created_data["templates"] if t.name == "New Client Welcome"), None),
                "subject": "Welcome to BookedBarber - 10% Off Your First Visit!",
                "scheduled_at": datetime.utcnow() - timedelta(days=30),
                "sent_at": datetime.utcnow() - timedelta(days=30),
                "created_by_id": user_id,
                "target_audience": "new_clients",
                "contact_list_id": new_list.id if new_clients else None
            },
            {
                "name": "VIP Loyalty Rewards",
                "type": "sms",
                "status": "completed",
                "template_id": next((t.id for t in created_data["templates"] if t.name == "Promotional Offer" and t.type == "sms"), None),
                "content": "VIP Alert! You've earned a FREE beard trim with your next haircut. Book now!",
                "scheduled_at": datetime.utcnow() - timedelta(weeks=1),
                "sent_at": datetime.utcnow() - timedelta(weeks=1, minutes=30),
                "created_by_id": user_id,
                "target_audience": "vip",
                "contact_list_id": vip_list.id if vip_clients else None
            },
            {
                "name": "Holiday Promotion",
                "type": "email",
                "status": "scheduled",
                "subject": "🎄 Holiday Special: Gift Certificates Now Available!",
                "content": "Give the gift of great grooming! Purchase gift certificates and save 15%.",
                "scheduled_at": datetime.utcnow() + timedelta(days=45),
                "created_by_id": user_id,
                "target_audience": "all",
                "contact_list_id": all_clients_list.id
            }
        ]
        
        for campaign_data in campaigns_data:
            # Only create campaign if it has a valid contact list
            if campaign_data.get("contact_list_id"):
                campaign = MarketingCampaign(**campaign_data)
                db.add(campaign)
                db.flush()
                created_data["campaigns"].append(campaign)
                
                # Create analytics for sent campaigns
                if campaign.status in ["active", "completed"] and campaign.sent_at:
                    # Calculate realistic metrics based on campaign type and audience
                    if campaign.type == "email":
                        if campaign.target_audience == "vip":
                            open_rate = random.uniform(0.45, 0.65)  # VIPs engage more
                            click_rate = random.uniform(0.15, 0.25)
                            conversion_rate = random.uniform(0.08, 0.15)
                        elif campaign.target_audience == "new_clients":
                            open_rate = random.uniform(0.25, 0.35)
                            click_rate = random.uniform(0.08, 0.15)
                            conversion_rate = random.uniform(0.05, 0.10)
                        else:  # all
                            open_rate = random.uniform(0.20, 0.30)
                            click_rate = random.uniform(0.05, 0.12)
                            conversion_rate = random.uniform(0.02, 0.08)
                    else:  # SMS
                        open_rate = random.uniform(0.90, 0.98)  # SMS has higher open rates
                        click_rate = random.uniform(0.15, 0.30)
                        conversion_rate = random.uniform(0.05, 0.15)
                    
                    # Get recipient count from contact list
                    recipient_count = campaign.contact_list.member_count if campaign.contact_list else 0
                    
                    analytics = CampaignAnalytics(
                        campaign_id=campaign.id,
                        recipients_count=recipient_count,
                        delivered_count=int(recipient_count * random.uniform(0.95, 0.99)),
                        opened_count=int(recipient_count * open_rate),
                        clicked_count=int(recipient_count * click_rate),
                        converted_count=int(recipient_count * conversion_rate),
                        unsubscribed_count=int(recipient_count * random.uniform(0.001, 0.005)),
                        bounced_count=int(recipient_count * random.uniform(0.01, 0.03)),
                        revenue_generated=float(random.randint(500, 3000)) if conversion_rate > 0 else 0.0,
                        updated_at=campaign.sent_at + timedelta(days=7)  # Analytics finalized after a week
                    )
                    
                    # Calculate rates
                    if analytics.delivered_count > 0:
                        analytics.open_rate = analytics.opened_count / analytics.delivered_count
                        analytics.click_rate = analytics.clicked_count / analytics.delivered_count
                        analytics.conversion_rate = analytics.converted_count / analytics.delivered_count
                    
                    db.add(analytics)
                    created_data["analytics"].append(analytics)
        
        logger.info(f"Created {len(created_data['campaigns'])} campaigns, {len(created_data['templates'])} templates, "
                   f"{len(created_data['contact_lists'])} contact lists, {len(created_data['analytics'])} analytics records")
        
    except Exception as e:
        logger.error(f"Error creating marketing data: {str(e)}")
        
    return created_data

def create_short_urls_data(db: Session, user_id: int, barbers: List[models.User] = None,
                          services: List[models.Service] = None, locations: List = None) -> Dict[str, Any]:
    """Create short URLs and QR codes for marketing, bookings, and campaigns
    
    Args:
        db: Database session
        user_id: User ID to create test data for
        barbers: List of test barbers to create booking links for
        services: List of services to include in booking links
        locations: List of locations (if multi-location)
    
    Returns:
        Dictionary with created short URLs and analytics
    """
    created_data = {
        "short_urls": [],
        "qr_codes": [],
        "click_analytics": [],
        "conversion_data": []
    }
    
    # Check if ShortURL model exists
    try:
        # Try to import ShortURL model
        if hasattr(models, 'ShortURL'):
            ShortURL = models.ShortURL
        else:
            logger.warning("ShortURL model not found in models - skipping short URL creation")
            return created_data
    except Exception as e:
        logger.warning(f"Could not access ShortURL model: {str(e)}")
        return created_data
    
    try:
        base_url = "https://bookedbarber.com"
        current_time = datetime.utcnow()
        
        # 1. Create booking links with pre-selected services/barbers
        if barbers and services:
            for barber in barbers[:3]:  # Top 3 barbers
                # VIP booking link
                vip_code = f"vip-{barber.first_name.lower()}"
                vip_url = ShortURL(
                    short_code=vip_code,
                    target_url=f"{base_url}/book?barber={barber.id}&service={services[0].id if services else ''}",
                    title=f"Book VIP Service with {barber.first_name}",
                    description="Exclusive VIP booking link",
                    created_by_id=user_id,
                    is_active=True,
                    click_count=random.randint(50, 200),
                    unique_visitors=random.randint(40, 150),
                    last_clicked_at=current_time - timedelta(hours=random.randint(1, 48)),
                    metadata={
                        "type": "booking",
                        "barber_id": barber.id,
                        "service_id": services[0].id if services else None,
                        "campaign": "vip-clients",
                        "conversion_rate": random.uniform(0.25, 0.45)
                    }
                )
                db.add(vip_url)
                created_data["short_urls"].append(vip_url)
                
                # Service-specific link
                for service in services[:2]:  # Top 2 services
                    service_code = f"{barber.first_name.lower()}-{service.name.lower().replace(' ', '-')[:10]}"
                    service_url = ShortURL(
                        short_code=service_code,
                        target_url=f"{base_url}/book?barber={barber.id}&service={service.id}",
                        title=f"Book {service.name} with {barber.first_name}",
                        description=f"Direct booking for {service.name}",
                        created_by_id=user_id,
                        is_active=True,
                        click_count=random.randint(20, 100),
                        unique_visitors=random.randint(15, 80),
                        last_clicked_at=current_time - timedelta(hours=random.randint(2, 72)),
                        metadata={
                            "type": "booking",
                            "barber_id": barber.id,
                            "service_id": service.id,
                            "price": float(service.price),
                            "conversion_rate": random.uniform(0.15, 0.35)
                        }
                    )
                    db.add(service_url)
                    created_data["short_urls"].append(service_url)
        
        # 2. Marketing campaign landing pages
        campaign_links = [
            {
                "code": "summer2025",
                "title": "Summer 2025 Special - 20% Off",
                "target": "/book?promo=SUMMER20",
                "campaign": "summer-promotion",
                "clicks": random.randint(500, 1500),
                "conversion": random.uniform(0.08, 0.15)
            },
            {
                "code": "newclient",
                "title": "New Client Special - First Cut 50% Off",
                "target": "/book?promo=NEW50",
                "campaign": "new-client-acquisition",
                "clicks": random.randint(300, 800),
                "conversion": random.uniform(0.12, 0.25)
            },
            {
                "code": "referral25",
                "title": "Refer a Friend - Both Get 25% Off",
                "target": "/book?promo=REFER25",
                "campaign": "referral-program",
                "clicks": random.randint(200, 600),
                "conversion": random.uniform(0.10, 0.20)
            },
            {
                "code": "instagram-bio",
                "title": "Instagram Bio Link",
                "target": "/book",
                "campaign": "social-media",
                "clicks": random.randint(1000, 3000),
                "conversion": random.uniform(0.05, 0.12)
            }
        ]
        
        for campaign_data in campaign_links:
            campaign_url = ShortURL(
                short_code=campaign_data["code"],
                target_url=f"{base_url}{campaign_data['target']}",
                title=campaign_data["title"],
                description=f"Marketing campaign: {campaign_data['campaign']}",
                created_by_id=user_id,
                is_active=True,
                click_count=campaign_data["clicks"],
                unique_visitors=int(campaign_data["clicks"] * random.uniform(0.7, 0.9)),
                last_clicked_at=current_time - timedelta(minutes=random.randint(30, 360)),
                metadata={
                    "type": "campaign",
                    "campaign": campaign_data["campaign"],
                    "conversion_rate": campaign_data["conversion"],
                    "revenue_generated": campaign_data["clicks"] * campaign_data["conversion"] * random.uniform(40, 80)
                }
            )
            db.add(campaign_url)
            created_data["short_urls"].append(campaign_url)
        
        # 3. Gift certificate purchase links
        gift_amounts = [50, 100, 150, 200]
        for amount in gift_amounts:
            gift_code = f"gift-{amount}"
            gift_url = ShortURL(
                short_code=gift_code,
                target_url=f"{base_url}/gift-certificates?amount={amount}",
                title=f"${amount} Gift Certificate",
                description=f"Purchase ${amount} gift certificate",
                created_by_id=user_id,
                is_active=True,
                click_count=random.randint(50, 300),
                unique_visitors=random.randint(40, 250),
                last_clicked_at=current_time - timedelta(days=random.randint(1, 7)),
                metadata={
                    "type": "gift-certificate",
                    "amount": amount,
                    "conversion_rate": random.uniform(0.10, 0.25),
                    "total_sold": random.randint(5, 25)
                }
            )
            db.add(gift_url)
            created_data["short_urls"].append(gift_url)
        
        # 4. Location-specific booking pages (if multi-location)
        if locations:
            for location in locations[:3]:  # First 3 locations
                location_code = location.get("code", location.get("name", "").lower().replace(" ", "-")[:10])
                location_url = ShortURL(
                    short_code=f"{location_code}-book",
                    target_url=f"{base_url}/book?location={location.get('id', '')}",
                    title=f"Book at {location.get('name', 'Location')}",
                    description=f"Direct booking for {location.get('name', '')} location",
                    created_by_id=user_id,
                    is_active=True,
                    click_count=random.randint(200, 800),
                    unique_visitors=random.randint(150, 700),
                    last_clicked_at=current_time - timedelta(hours=random.randint(1, 24)),
                    metadata={
                        "type": "location-booking",
                        "location_id": location.get("id"),
                        "location_name": location.get("name"),
                        "address": location.get("address"),
                        "conversion_rate": random.uniform(0.15, 0.30)
                    }
                )
                db.add(location_url)
                created_data["short_urls"].append(location_url)
        
        # 5. Create QR code metadata for physical marketing
        qr_locations = [
            {"name": "Business Cards", "material": "print", "distribution": 500},
            {"name": "Shop Window", "material": "vinyl", "distribution": 1},
            {"name": "Flyers", "material": "print", "distribution": 1000},
            {"name": "Instagram Posts", "material": "digital", "distribution": 10},
            {"name": "Email Signatures", "material": "digital", "distribution": 100}
        ]
        
        # Add QR codes for select short URLs
        for i, short_url in enumerate(created_data["short_urls"][:10]):  # First 10 URLs get QR codes
            if hasattr(models, 'QRCode'):
                for qr_location in random.sample(qr_locations, random.randint(1, 3)):
                    qr_code = models.QRCode(
                        short_url_id=short_url.id,
                        location_name=qr_location["name"],
                        material_type=qr_location["material"],
                        distribution_count=qr_location["distribution"],
                        scan_count=random.randint(10, qr_location["distribution"] // 10),
                        created_by_id=user_id,
                        created_at=current_time - timedelta(days=random.randint(30, 90)),
                        metadata={
                            "design_version": f"v{random.randint(1, 3)}",
                            "size": "2x2 inches" if qr_location["material"] == "print" else "various",
                            "color_scheme": random.choice(["black_white", "brand_colors", "custom"])
                        }
                    )
                    db.add(qr_code)
                    created_data["qr_codes"].append(qr_code)
        
        # 6. Generate click analytics with time-based patterns
        for short_url in created_data["short_urls"]:
            # Create hourly click patterns for the last 7 days
            for day in range(7):
                date_for_analytics = current_time - timedelta(days=day)
                
                # Business hours have more clicks
                hourly_clicks = {}
                for hour in range(24):
                    if 9 <= hour <= 20:  # Business hours
                        clicks = random.randint(5, 20)
                    elif 6 <= hour < 9 or 20 < hour <= 23:  # Early morning/evening
                        clicks = random.randint(1, 8)
                    else:  # Night hours
                        clicks = random.randint(0, 2)
                    
                    if clicks > 0:
                        hourly_clicks[hour] = clicks
                
                if hasattr(models, 'ShortURLAnalytics'):
                    analytics = models.ShortURLAnalytics(
                        short_url_id=short_url.id,
                        date=date_for_analytics.date(),
                        total_clicks=sum(hourly_clicks.values()),
                        unique_clicks=int(sum(hourly_clicks.values()) * random.uniform(0.7, 0.9)),
                        hourly_clicks=hourly_clicks,
                        device_breakdown={
                            "mobile": random.uniform(0.60, 0.80),
                            "desktop": random.uniform(0.15, 0.30),
                            "tablet": random.uniform(0.05, 0.10)
                        },
                        browser_breakdown={
                            "safari": random.uniform(0.35, 0.50),
                            "chrome": random.uniform(0.30, 0.45),
                            "firefox": random.uniform(0.05, 0.15),
                            "other": random.uniform(0.05, 0.10)
                        },
                        referrer_breakdown={
                            "direct": random.uniform(0.40, 0.60),
                            "instagram": random.uniform(0.20, 0.35),
                            "google": random.uniform(0.10, 0.20),
                            "facebook": random.uniform(0.05, 0.15),
                            "other": random.uniform(0.05, 0.10)
                        },
                        conversion_count=int(sum(hourly_clicks.values()) * 
                                           short_url.metadata.get("conversion_rate", 0.1)),
                        revenue_generated=float(int(sum(hourly_clicks.values()) * 
                                              short_url.metadata.get("conversion_rate", 0.1)) * 
                                              random.uniform(50, 150))
                    )
                    db.add(analytics)
                    created_data["click_analytics"].append(analytics)
        
        # 7. Add conversion tracking data
        if hasattr(models, 'ShortURLConversion'):
            for short_url in created_data["short_urls"]:
                conversion_count = int(short_url.click_count * 
                                     short_url.metadata.get("conversion_rate", 0.1))
                
                for _ in range(min(conversion_count, 50)):  # Limit to 50 conversions per URL
                    conversion_time = current_time - timedelta(
                        days=random.randint(0, 30),
                        hours=random.randint(0, 23),
                        minutes=random.randint(0, 59)
                    )
                    
                    conversion = models.ShortURLConversion(
                        short_url_id=short_url.id,
                        conversion_type=short_url.metadata.get("type", "booking"),
                        conversion_value=random.uniform(40, 200),
                        customer_id=None,  # Would need to query clients from DB if needed
                        converted_at=conversion_time,
                        metadata={
                            "source": random.choice(["instagram", "google", "direct", "referral"]),
                            "device": random.choice(["mobile", "desktop", "tablet"]),
                            "time_to_convert": random.randint(1, 300),  # seconds
                            "page_views": random.randint(1, 5)
                        }
                    )
                    db.add(conversion)
                    created_data["conversion_data"].append(conversion)
        
        db.flush()
        
        logger.info(f"Created {len(created_data['short_urls'])} short URLs, "
                   f"{len(created_data['qr_codes'])} QR codes, "
                   f"{len(created_data['click_analytics'])} analytics records, "
                   f"{len(created_data['conversion_data'])} conversions")
        
    except Exception as e:
        logger.error(f"Error creating short URLs data: {str(e)}")
        db.rollback()
    
    return created_data

def create_enterprise_data(db: Session, user_id: int, barbers: List[models.User] = None, 
                         clients: List[models.Client] = None, services: List[models.Service] = None) -> Dict[str, Any]:
    """Create multi-location enterprise test data"""
    created_data = {
        "locations": [],
        "barber_locations": [],
        "chair_inventory": [],
        "compensation_plans": [],
        "location_appointments": {},
        "location_analytics": {}
    }
    
    try:
        # Create 3 barbershop locations
        locations_data = [
            {
                "name": "Downtown Flagship",
                "code": "DTF",
                "address": "123 Main Street",
                "city": "New York",
                "state": "NY",
                "zip_code": "10001",
                "phone": "+12125551001",
                "email": "downtown@bookedbarber.com",
                "status": LocationStatus.ACTIVE,
                "compensation_model": CompensationModel.COMMISSION,
                "total_chairs": 8,
                "active_chairs": 7,
                "manager_id": user_id,
                "owner_id": user_id,
                "business_hours": {
                    "monday": {"open": "09:00", "close": "20:00"},
                    "tuesday": {"open": "09:00", "close": "20:00"},
                    "wednesday": {"open": "09:00", "close": "20:00"},
                    "thursday": {"open": "09:00", "close": "21:00"},
                    "friday": {"open": "09:00", "close": "21:00"},
                    "saturday": {"open": "10:00", "close": "18:00"},
                    "sunday": {"open": "11:00", "close": "17:00"}
                },
                "compensation_config": {
                    "commission_rate": 0.20,
                    "processing_fee": 0.029,
                    "platform_fee": 0.05
                }
            },
            {
                "name": "Westside Branch",
                "code": "WSB",
                "address": "456 West Avenue",
                "city": "Los Angeles",
                "state": "CA",
                "zip_code": "90001",
                "phone": "+13105552001",
                "email": "westside@bookedbarber.com",
                "status": LocationStatus.ACTIVE,
                "compensation_model": CompensationModel.BOOTH_RENTAL,
                "total_chairs": 6,
                "active_chairs": 5,
                "manager_id": user_id,
                "owner_id": user_id,
                "business_hours": {
                    "monday": {"open": "10:00", "close": "19:00"},
                    "tuesday": {"open": "10:00", "close": "19:00"},
                    "wednesday": {"open": "10:00", "close": "19:00"},
                    "thursday": {"open": "10:00", "close": "20:00"},
                    "friday": {"open": "10:00", "close": "20:00"},
                    "saturday": {"open": "09:00", "close": "17:00"},
                    "sunday": "closed"
                },
                "compensation_config": {
                    "weekly_booth_rental": 250,
                    "monthly_booth_rental": 900,
                    "utilities_included": True
                }
            },
            {
                "name": "Airport Express",
                "code": "AEX",
                "address": "789 Airport Boulevard",
                "city": "Chicago",
                "state": "IL",
                "zip_code": "60601",
                "phone": "+13125553001",
                "email": "airport@bookedbarber.com",
                "status": LocationStatus.ACTIVE,
                "compensation_model": CompensationModel.HYBRID,
                "total_chairs": 4,
                "active_chairs": 4,
                "manager_id": user_id,
                "owner_id": user_id,
                "business_hours": {
                    "monday": {"open": "06:00", "close": "22:00"},
                    "tuesday": {"open": "06:00", "close": "22:00"},
                    "wednesday": {"open": "06:00", "close": "22:00"},
                    "thursday": {"open": "06:00", "close": "22:00"},
                    "friday": {"open": "06:00", "close": "22:00"},
                    "saturday": {"open": "06:00", "close": "22:00"},
                    "sunday": {"open": "06:00", "close": "22:00"}
                },
                "compensation_config": {
                    "base_booth_rental": 150,
                    "commission_rate": 0.10,
                    "commission_threshold": 2000  # Commission kicks in after $2000 in monthly revenue
                }
            }
        ]
        
        # Create locations
        for loc_data in locations_data:
            location = BarbershopLocation(**loc_data)
            db.add(location)
            db.flush()
            created_data["locations"].append(location)
        
        # Create chair inventory for each location
        chair_numbers = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"]
        for location in created_data["locations"]:
            num_chairs = location.total_chairs
            for i in range(num_chairs):
                chair = ChairInventory(
                    location_id=location.id,
                    chair_number=chair_numbers[i % len(chair_numbers)],
                    chair_type=ChairType.PREMIUM if i < 2 else ChairType.STANDARD,
                    status=ChairStatus.OCCUPIED if i < location.active_chairs else ChairStatus.AVAILABLE,
                    rental_rate_weekly=250 if location.compensation_model == CompensationModel.BOOTH_RENTAL else 0,
                    rental_rate_monthly=900 if location.compensation_model == CompensationModel.BOOTH_RENTAL else 0,
                    features=["adjustable", "heated"] if i < 2 else ["adjustable"],
                    equipment={"tools": "premium set"} if i < 2 else {"tools": "standard set"}
                )
                db.add(chair)
                created_data["chair_inventory"].append(chair)
        
        db.flush()
        
        # Assign barbers to locations if provided
        if barbers:
            # Distribute barbers across locations
            for idx, barber in enumerate(barbers):
                # Primary location assignment
                primary_location = created_data["locations"][idx % len(created_data["locations"])]
                barber_loc = BarberLocation(
                    barber_id=barber.id,
                    location_id=primary_location.id,
                    is_primary=True,
                    chair_number=created_data["chair_inventory"][idx].chair_number if idx < len(created_data["chair_inventory"]) else "A1",
                    is_active=True
                )
                db.add(barber_loc)
                created_data["barber_locations"].append(barber_loc)
                
                # Assign chair to barber
                if idx < len(created_data["chair_inventory"]):
                    chair = created_data["chair_inventory"][idx]
                    chair.assigned_barber_id = barber.id
                    chair.assignment_start = datetime.utcnow()
                
                # Some barbers work at multiple locations (20% chance)
                if random.random() < 0.2 and len(created_data["locations"]) > 1:
                    secondary_location = created_data["locations"][(idx + 1) % len(created_data["locations"])]
                    secondary_barber_loc = BarberLocation(
                        barber_id=barber.id,
                        location_id=secondary_location.id,
                        is_primary=False,
                        is_active=True
                    )
                    db.add(secondary_barber_loc)
                    created_data["barber_locations"].append(secondary_barber_loc)
        
        # Create compensation plans for each location
        for location in created_data["locations"]:
            plan = CompensationPlan(
                name=f"{location.name} Standard Plan",
                description=f"Standard compensation plan for {location.name}",
                location_id=location.id,
                model_type=location.compensation_model,
                is_active=True,
                is_default=True,
                effective_from=datetime.utcnow() - timedelta(days=180),
                configuration=location.compensation_config,
                created_by=user_id
            )
            db.add(plan)
            created_data["compensation_plans"].append(plan)
        
        # Create location-specific services with different pricing
        if services:
            for location in created_data["locations"]:
                # Adjust prices based on location
                price_multiplier = 1.0
                if "Flagship" in location.name:
                    price_multiplier = 1.2  # 20% premium for flagship
                elif "Airport" in location.name:
                    price_multiplier = 1.5  # 50% premium for airport
                
                # Create location-specific service pricing (this would need a location_services table in real implementation)
                location.service_pricing = {
                    service.id: {
                        "price": float(service.price) * price_multiplier,
                        "duration": service.duration
                    } for service in services
                }
        
        # Generate location-specific appointments if we have all the data
        if barbers and clients and services:
            for location in created_data["locations"]:
                location_appointments = []
                location_barbers = [bl.barber_id for bl in created_data["barber_locations"] if bl.location_id == location.id]
                
                if location_barbers:
                    # Generate appointments for the past 90 days
                    start_date = datetime.utcnow() - timedelta(days=90)
                    
                    # Number of appointments varies by location
                    num_appointments = 50
                    if "Flagship" in location.name:
                        num_appointments = 100
                    elif "Airport" in location.name:
                        num_appointments = 75
                    
                    for _ in range(num_appointments):
                        barber_id = random.choice(location_barbers)
                        client = random.choice(clients)
                        service = random.choice(services)
                        
                        # Random appointment date/time in the past 90 days
                        days_ago = random.randint(0, 90)
                        appointment_date = start_date + timedelta(days=days_ago)
                        hour = random.randint(9, 19)
                        appointment_time = appointment_date.replace(hour=hour, minute=random.choice([0, 30]))
                        
                        # Price based on location
                        price_multiplier = 1.0
                        if "Flagship" in location.name:
                            price_multiplier = 1.2
                        elif "Airport" in location.name:
                            price_multiplier = 1.5
                        
                        appointment = models.Appointment(
                            user_id=user_id,
                            barber_id=barber_id,
                            client_id=client.id,
                            service_id=service.id,
                            service_name=service.name,
                            start_time=appointment_time,
                            end_time=appointment_time + timedelta(minutes=service.duration),
                            price=float(service.price) * price_multiplier,
                            status="completed" if appointment_time < datetime.utcnow() else "scheduled",
                            is_test_data=True,
                            location_id=location.id,  # This would need to be added to Appointment model
                            notes=f"Appointment at {location.name}"
                        )
                        db.add(appointment)
                        location_appointments.append(appointment)
                
                created_data["location_appointments"][location.id] = location_appointments
        
        # Create enterprise-level analytics
        for location in created_data["locations"]:
            appointments = created_data["location_appointments"].get(location.id, [])
            completed_appointments = [a for a in appointments if a.status == "completed"]
            
            analytics = {
                "location_id": location.id,
                "location_name": location.name,
                "total_appointments": len(appointments),
                "completed_appointments": len(completed_appointments),
                "total_revenue": sum(a.price for a in completed_appointments),
                "average_ticket": sum(a.price for a in completed_appointments) / len(completed_appointments) if completed_appointments else 0,
                "barber_count": len([bl for bl in created_data["barber_locations"] if bl.location_id == location.id]),
                "utilization_rate": (location.active_chairs / location.total_chairs * 100) if location.total_chairs > 0 else 0,
                "client_retention": random.uniform(0.65, 0.85),  # Mock retention rate
                "new_client_rate": random.uniform(0.15, 0.35),  # Mock new client rate
            }
            
            created_data["location_analytics"][location.id] = analytics
        
        db.flush()
        
        logger.info(f"Created enterprise data: {len(created_data['locations'])} locations, "
                   f"{len(created_data['barber_locations'])} barber assignments, "
                   f"{len(created_data['chair_inventory'])} chairs")
        
    except Exception as e:
        logger.error(f"Error creating enterprise data: {str(e)}")
        db.rollback()
        raise
    
    return created_data

def create_test_data_for_user(db: Session, user_id: int, include_enterprise: bool = False) -> Dict[str, Any]:
    """Create complete test data ecosystem for a user
    
    Args:
        db: Database session
        user_id: User ID to create test data for
        include_enterprise: If True, also creates multi-location enterprise data
    """
    try:
        logger.info(f"Creating test data for user {user_id} (enterprise={include_enterprise})")
        
        # Create test barbers (or use existing)
        barbers = create_test_barbers(db, user_id)
        
        # Create test services
        services = create_test_services(db)
        
        # Create test clients
        clients = create_test_clients(db, user_id)
        
        # Create test appointments
        appointments = create_test_appointments(db, user_id, barbers, clients, services)
        
        # Flush to get appointment IDs before creating payments
        db.flush()
        
        # Create payments for completed appointments
        payments = create_payments_for_appointments(db, appointments)
        
        # Create barber payouts based on payments
        payouts = create_barber_payouts(db, barbers, payments)
        
        # Create SMS conversations
        sms_conversations = create_sms_conversations(db, user_id, clients, barbers, appointments)
        
        # Create notification history
        notifications = create_notification_history(db, appointments, clients, user_id)
        
        # Create recurring appointment patterns
        recurring_patterns = create_recurring_patterns(db, user_id, barbers, clients, services, appointments)
        
        # Create gift certificates with various statuses
        gift_certificates = create_gift_certificates(db, user_id, payments)
        
        # Create marketing data (campaigns, templates, contact lists, analytics)
        marketing_data = create_marketing_data(db, user_id, clients)
        
        # Create enterprise data if requested
        enterprise_data = {}
        if include_enterprise:
            enterprise_data = create_enterprise_data(db, user_id, barbers, clients, services)
        
        # Create short URLs and QR codes for marketing
        locations = enterprise_data.get("locations", []) if include_enterprise else None
        short_urls_data = create_short_urls_data(db, user_id, barbers, services, locations)
        
        # Commit all changes
        db.commit()
        
        result = {
            "success": True,
            "created": {
                "barbers": len(barbers),
                "clients": len(clients),
                "services": len(services),
                "appointments": len(appointments),
                "payments": len(payments),
                "payouts": len(payouts),
                "sms_conversations": len(sms_conversations),
                "notifications": len(notifications),
                "recurring_patterns": len(recurring_patterns),
                "gift_certificates": len(gift_certificates),
                "marketing_campaigns": len(marketing_data.get("campaigns", [])),
                "marketing_templates": len(marketing_data.get("templates", [])),
                "contact_lists": len(marketing_data.get("contact_lists", [])),
                "campaign_analytics": len(marketing_data.get("analytics", [])),
                "short_urls": len(short_urls_data.get("short_urls", [])),
                "qr_codes": len(short_urls_data.get("qr_codes", [])),
                "click_analytics": len(short_urls_data.get("click_analytics", [])),
                "url_conversions": len(short_urls_data.get("conversion_data", []))
            },
            "message": f"Successfully created test data: {len(barbers)} barbers, {len(clients)} clients, {len(services)} services, {len(appointments)} appointments, {len(payments)} payments, {len(payouts)} payouts, {len(sms_conversations)} SMS conversations, {len(notifications)} notifications, {len(recurring_patterns)} recurring patterns, {len(gift_certificates)} gift certificates, {len(marketing_data.get('campaigns', []))} marketing campaigns, {len(marketing_data.get('templates', []))} templates, {len(marketing_data.get('contact_lists', []))} contact lists, {len(short_urls_data.get('short_urls', []))} short URLs"
        }
        
        # Add enterprise data to results if created
        if enterprise_data:
            result["created"]["locations"] = len(enterprise_data.get("locations", []))
            result["created"]["barber_locations"] = len(enterprise_data.get("barber_locations", []))
            result["created"]["chair_inventory"] = len(enterprise_data.get("chair_inventory", []))
            result["created"]["compensation_plans"] = len(enterprise_data.get("compensation_plans", []))
            result["created"]["location_appointments"] = sum(len(apps) for apps in enterprise_data.get("location_appointments", {}).values())
            result["message"] += f", {len(enterprise_data.get('locations', []))} locations with {len(enterprise_data.get('chair_inventory', []))} chairs"
        
        logger.info(f"Test data creation complete: {result['message']}")
        return result
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating test data: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to create test data"
        }

def delete_test_data_for_user(db: Session, user_id: int) -> Dict[str, Any]:
    """Delete all test data for a user"""
    try:
        logger.info(f"Deleting test data for user {user_id}")
        
        # Get test client IDs for marketing data deletion
        test_client_ids = db.query(models.Client.id).filter(
            models.Client.created_by_id == user_id,
            models.Client.is_test_data == True
        ).all()
        test_client_id_list = [id[0] for id in test_client_ids]
        
        # Count items before deletion
        counts = {
            "gift_certificates": db.query(models.GiftCertificate).filter(
                models.GiftCertificate.created_by_id == user_id,
                models.GiftCertificate.stripe_payment_intent_id.like("pi_test_gift_%")
            ).count(),
            "payouts": db.query(models.Payout).filter(
                models.Payout.stripe_payout_id.like("po_test_%")
            ).count(),
            "payments": db.query(models.Payment).filter(
                models.Payment.user_id == user_id,
                models.Payment.stripe_payment_id.like("pi_test_%")
            ).count(),
            "appointments": db.query(models.Appointment).filter(
                models.Appointment.user_id == user_id,
                models.Appointment.is_test_data == True
            ).count(),
            "clients": db.query(models.Client).filter(
                models.Client.created_by_id == user_id,
                models.Client.is_test_data == True
            ).count(),
            "barbers": db.query(models.User).filter(
                models.User.role == "barber",
                models.User.is_test_data == True
            ).count(),
            "availability": db.query(models.BarberAvailability).filter(
                models.BarberAvailability.is_test_data == True
            ).count(),
            "time_off": db.query(models.BarberTimeOff).filter(
                models.BarberTimeOff.is_test_data == True
            ).count(),
            "sms_conversations": db.query(models.SMSConversation).filter(
                models.SMSConversation.client_id.in_(
                    db.query(models.Client.id).filter(
                        models.Client.created_by_id == user_id,
                        models.Client.is_test_data == True
                    )
                )
            ).count(),
            "sms_messages": db.query(models.SMSMessage).filter(
                models.SMSMessage.conversation_id.in_(
                    db.query(models.SMSConversation.id).filter(
                        models.SMSConversation.client_id.in_(
                            db.query(models.Client.id).filter(
                                models.Client.created_by_id == user_id,
                                models.Client.is_test_data == True
                            )
                        )
                    )
                )
            ).count(),
            "notifications": db.query(models.NotificationQueue).filter(
                models.NotificationQueue.user_id == user_id,
                models.NotificationQueue.notification_metadata.op("->>")(
                    "failure_reason"
                ) == "test_data"
            ).count(),
            "recurring_patterns": db.query(models.RecurringAppointmentPattern).filter(
                models.RecurringAppointmentPattern.user_id == user_id
            ).count(),
            "campaign_analytics": db.query(models.CampaignAnalytics).filter(
                models.CampaignAnalytics.campaign_id.in_(
                    db.query(models.MarketingCampaign.id).filter(
                        models.MarketingCampaign.created_by_id == user_id
                    )
                )
            ).count(),
            "marketing_campaigns": db.query(models.MarketingCampaign).filter(
                models.MarketingCampaign.created_by_id == user_id
            ).count(),
            "marketing_templates": db.query(models.MarketingTemplate).filter(
                models.MarketingTemplate.created_by_id == user_id
            ).count(),
            "contact_list_members": db.query(models.ContactListMember).filter(
                models.ContactListMember.client_id.in_(test_client_id_list)
            ).count() if test_client_id_list else 0,
            "contact_lists": db.query(models.ContactList).filter(
                models.ContactList.created_by_id == user_id
            ).count()
        }
        
        # Add short URL counts if model exists
        if hasattr(models, 'ShortURL'):
            counts["short_urls"] = db.query(models.ShortURL).filter(
                models.ShortURL.created_by_id == user_id
            ).count()
            
            # Count related analytics and conversions
            if hasattr(models, 'ShortURLAnalytics'):
                counts["short_url_analytics"] = db.query(models.ShortURLAnalytics).filter(
                    models.ShortURLAnalytics.short_url_id.in_(
                        db.query(models.ShortURL.id).filter(
                            models.ShortURL.created_by_id == user_id
                        )
                    )
                ).count()
            
            if hasattr(models, 'ShortURLConversion'):
                counts["short_url_conversions"] = db.query(models.ShortURLConversion).filter(
                    models.ShortURLConversion.short_url_id.in_(
                        db.query(models.ShortURL.id).filter(
                            models.ShortURL.created_by_id == user_id
                        )
                    )
                ).count()
            
            if hasattr(models, 'QRCode'):
                counts["qr_codes"] = db.query(models.QRCode).filter(
                    models.QRCode.created_by_id == user_id
                ).count()
        
        # Delete marketing data first (before clients due to foreign keys)
        # Delete campaign analytics
        db.query(models.CampaignAnalytics).filter(
            models.CampaignAnalytics.campaign_id.in_(
                db.query(models.MarketingCampaign.id).filter(
                    models.MarketingCampaign.created_by_id == user_id
                )
            )
        ).delete(synchronize_session=False)
        
        # Delete marketing campaigns
        db.query(models.MarketingCampaign).filter(
            models.MarketingCampaign.created_by_id == user_id
        ).delete()
        
        # Delete marketing templates
        db.query(models.MarketingTemplate).filter(
            models.MarketingTemplate.created_by_id == user_id
        ).delete()
        
        # Delete contact list members (must be before deleting clients)
        if test_client_id_list:
            db.query(models.ContactListMember).filter(
                models.ContactListMember.client_id.in_(test_client_id_list)
            ).delete(synchronize_session=False)
        
        # Delete contact lists
        db.query(models.ContactList).filter(
            models.ContactList.created_by_id == user_id
        ).delete()
        
        # Delete short URLs and related data if models exist
        if hasattr(models, 'ShortURL'):
            # Get short URL IDs for cascading deletes
            short_url_ids = db.query(models.ShortURL.id).filter(
                models.ShortURL.created_by_id == user_id
            ).subquery()
            
            # Delete analytics data first
            if hasattr(models, 'ShortURLAnalytics'):
                db.query(models.ShortURLAnalytics).filter(
                    models.ShortURLAnalytics.short_url_id.in_(short_url_ids)
                ).delete(synchronize_session=False)
            
            # Delete conversion data
            if hasattr(models, 'ShortURLConversion'):
                db.query(models.ShortURLConversion).filter(
                    models.ShortURLConversion.short_url_id.in_(short_url_ids)
                ).delete(synchronize_session=False)
            
            # Delete QR codes
            if hasattr(models, 'QRCode'):
                db.query(models.QRCode).filter(
                    models.QRCode.short_url_id.in_(short_url_ids)
                ).delete(synchronize_session=False)
                
                # Also delete QR codes created by user directly
                db.query(models.QRCode).filter(
                    models.QRCode.created_by_id == user_id
                ).delete(synchronize_session=False)
            
            # Finally delete the short URLs
            db.query(models.ShortURL).filter(
                models.ShortURL.created_by_id == user_id
            ).delete()
        
        # Delete recurring patterns first (before appointments due to foreign key)
        db.query(models.RecurringAppointmentPattern).filter(
            models.RecurringAppointmentPattern.user_id == user_id
        ).delete()
        
        # Delete payouts first (test payouts)
        db.query(models.Payout).filter(
            models.Payout.stripe_payout_id.like("po_test_%")
        ).delete()
        
        # Delete payments (due to foreign key constraints)
        db.query(models.Payment).filter(
            models.Payment.user_id == user_id,
            models.Payment.stripe_payment_id.like("pi_test_%")
        ).delete()
        
        # Delete gift certificates
        db.query(models.GiftCertificate).filter(
            models.GiftCertificate.created_by_id == user_id,
            models.GiftCertificate.stripe_payment_intent_id.like("pi_test_gift_%")
        ).delete()
        
        # Delete appointments
        db.query(models.Appointment).filter(
            models.Appointment.user_id == user_id,
            models.Appointment.is_test_data == True
        ).delete()
        
        # Delete SMS messages first (due to foreign key)
        # Find test client IDs
        test_client_ids = db.query(models.Client.id).filter(
            models.Client.created_by_id == user_id,
            models.Client.is_test_data == True
        ).subquery()
        
        # Find conversation IDs for test clients
        test_conversation_ids = db.query(models.SMSConversation.id).filter(
            models.SMSConversation.client_id.in_(test_client_ids)
        ).subquery()
        
        # Delete messages in test conversations
        db.query(models.SMSMessage).filter(
            models.SMSMessage.conversation_id.in_(test_conversation_ids)
        ).delete(synchronize_session=False)
        
        # Delete SMS conversations for test clients
        db.query(models.SMSConversation).filter(
            models.SMSConversation.client_id.in_(test_client_ids)
        ).delete(synchronize_session=False)
        
        # Delete test notifications
        # Delete based on user_id and test data marker in metadata
        db.query(models.NotificationQueue).filter(
            models.NotificationQueue.user_id == user_id,
            models.NotificationQueue.notification_metadata.op("->>")(
                "failure_reason"
            ) == "test_data"
        ).delete(synchronize_session=False)
        
        # Also delete notifications for test appointments
        test_appointment_ids = db.query(models.Appointment.id).filter(
            models.Appointment.user_id == user_id,
            models.Appointment.is_test_data == True
        ).subquery()
        
        db.query(models.NotificationQueue).filter(
            models.NotificationQueue.appointment_id.in_(test_appointment_ids)
        ).delete(synchronize_session=False)
        
        # Delete clients (after marketing data that references them)
        db.query(models.Client).filter(
            models.Client.created_by_id == user_id,
            models.Client.is_test_data == True
        ).delete()
        
        # Delete barber availability and time off
        db.query(models.BarberAvailability).filter(
            models.BarberAvailability.is_test_data == True
        ).delete()
        
        db.query(models.BarberTimeOff).filter(
            models.BarberTimeOff.is_test_data == True
        ).delete()
        
        # Delete test barbers
        db.query(models.User).filter(
            models.User.role == "barber",
            models.User.is_test_data == True
        ).delete()
        
        # Delete enterprise data if it exists
        try:
            # Count enterprise data before deletion
            enterprise_counts = {
                "compensation_plans": db.query(CompensationPlan).filter(
                    CompensationPlan.created_by == user_id
                ).count(),
                "chair_assignments": db.query(ChairAssignmentHistory).filter(
                    ChairAssignmentHistory.barber_id.in_(
                        db.query(models.User.id).filter(
                            models.User.role == "barber",
                            models.User.is_test_data == True
                        )
                    )
                ).count(),
                "barber_locations": db.query(BarberLocation).filter(
                    BarberLocation.barber_id.in_(
                        db.query(models.User.id).filter(
                            models.User.role == "barber",
                            models.User.is_test_data == True
                        )
                    )
                ).count(),
                "chair_inventory": db.query(ChairInventory).filter(
                    ChairInventory.location_id.in_(
                        db.query(BarbershopLocation.id).filter(
                            BarbershopLocation.owner_id == user_id
                        )
                    )
                ).count(),
                "locations": db.query(BarbershopLocation).filter(
                    BarbershopLocation.owner_id == user_id
                ).count()
            }
            
            # Delete in order of dependencies
            # Delete compensation plans
            db.query(CompensationPlan).filter(
                CompensationPlan.created_by == user_id
            ).delete()
            
            # Delete chair assignment history
            db.query(ChairAssignmentHistory).filter(
                ChairAssignmentHistory.location_id.in_(
                    db.query(BarbershopLocation.id).filter(
                        BarbershopLocation.owner_id == user_id
                    )
                )
            ).delete(synchronize_session=False)
            
            # Delete barber locations
            db.query(BarberLocation).filter(
                BarberLocation.location_id.in_(
                    db.query(BarbershopLocation.id).filter(
                        BarbershopLocation.owner_id == user_id
                    )
                )
            ).delete(synchronize_session=False)
            
            # Delete chair inventory
            db.query(ChairInventory).filter(
                ChairInventory.location_id.in_(
                    db.query(BarbershopLocation.id).filter(
                        BarbershopLocation.owner_id == user_id
                    )
                )
            ).delete(synchronize_session=False)
            
            # Delete locations
            db.query(BarbershopLocation).filter(
                BarbershopLocation.owner_id == user_id
            ).delete()
            
            # Add enterprise counts to main counts
            counts.update({f"enterprise_{k}": v for k, v in enterprise_counts.items()})
            
        except Exception as e:
            logger.warning(f"Error deleting enterprise data (may not exist): {str(e)}")
        
        db.commit()
        
        result = {
            "success": True,
            "deleted": counts,
            "message": f"Successfully deleted test data"
        }
        
        logger.info(f"Test data deletion complete: {result['message']}")
        return result
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting test data: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to delete test data"
        }

def get_test_data_status(db: Session, user_id: int) -> Dict[str, Any]:
    """Get current test data status for a user"""
    try:
        status = {
            "has_test_data": False,
            "counts": {
                "appointments": db.query(models.Appointment).filter(
                    models.Appointment.user_id == user_id,
                    models.Appointment.is_test_data == True
                ).count(),
                "clients": db.query(models.Client).filter(
                    models.Client.created_by_id == user_id,
                    models.Client.is_test_data == True
                ).count(),
                "barbers": db.query(models.User).filter(
                    models.User.role == "barber",
                    models.User.is_test_data == True
                ).count(),
                "payments": db.query(models.Payment).filter(
                    models.Payment.user_id == user_id,
                    models.Payment.stripe_payment_id.like("pi_test_%")
                ).count(),
                "payouts": db.query(models.Payout).filter(
                    models.Payout.stripe_payout_id.like("po_test_%")
                ).count(),
                "sms_conversations": db.query(models.SMSConversation).filter(
                    models.SMSConversation.client_id.in_(
                        db.query(models.Client.id).filter(
                            models.Client.created_by_id == user_id,
                            models.Client.is_test_data == True
                        )
                    )
                ).count(),
                "notifications": db.query(models.NotificationQueue).filter(
                    models.NotificationQueue.user_id == user_id,
                    models.NotificationQueue.appointment_id.in_(
                        db.query(models.Appointment.id).filter(
                            models.Appointment.user_id == user_id,
                            models.Appointment.is_test_data == True
                        )
                    )
                ).count(),
                "recurring_patterns": db.query(models.RecurringAppointmentPattern).filter(
                    models.RecurringAppointmentPattern.user_id == user_id
                ).count(),
                "gift_certificates": db.query(models.GiftCertificate).filter(
                    models.GiftCertificate.created_by_id == user_id,
                    models.GiftCertificate.stripe_payment_intent_id.like("pi_test_gift_%")
                ).count(),
                "marketing_campaigns": db.query(models.MarketingCampaign).filter(
                    models.MarketingCampaign.created_by_id == user_id
                ).count(),
                "marketing_templates": db.query(models.MarketingTemplate).filter(
                    models.MarketingTemplate.created_by_id == user_id
                ).count(),
                "contact_lists": db.query(models.ContactList).filter(
                    models.ContactList.created_by_id == user_id
                ).count()
            }
        }
        
        # Add short URL counts if model exists
        if hasattr(models, 'ShortURL'):
            status["counts"]["short_urls"] = db.query(models.ShortURL).filter(
                models.ShortURL.created_by_id == user_id
            ).count()
            
            # Count related data if models exist
            if hasattr(models, 'QRCode'):
                status["counts"]["qr_codes"] = db.query(models.QRCode).filter(
                    models.QRCode.created_by_id == user_id
                ).count()
            
            if hasattr(models, 'ShortURLAnalytics'):
                status["counts"]["short_url_analytics"] = db.query(models.ShortURLAnalytics).filter(
                    models.ShortURLAnalytics.short_url_id.in_(
                        db.query(models.ShortURL.id).filter(
                            models.ShortURL.created_by_id == user_id
                        )
                    )
                ).count()
            
            if hasattr(models, 'ShortURLConversion'):
                status["counts"]["short_url_conversions"] = db.query(models.ShortURLConversion).filter(
                    models.ShortURLConversion.short_url_id.in_(
                        db.query(models.ShortURL.id).filter(
                            models.ShortURL.created_by_id == user_id
                        )
                    )
                ).count()
        
        # Check for enterprise data
        try:
            enterprise_counts = {
                "locations": db.query(BarbershopLocation).filter(
                    BarbershopLocation.owner_id == user_id
                ).count(),
                "barber_locations": db.query(BarberLocation).filter(
                    BarberLocation.location_id.in_(
                        db.query(BarbershopLocation.id).filter(
                            BarbershopLocation.owner_id == user_id
                        )
                    )
                ).count(),
                "chair_inventory": db.query(ChairInventory).filter(
                    ChairInventory.location_id.in_(
                        db.query(BarbershopLocation.id).filter(
                            BarbershopLocation.owner_id == user_id
                        )
                    )
                ).count(),
                "compensation_plans": db.query(CompensationPlan).filter(
                    CompensationPlan.created_by == user_id
                ).count()
            }
            
            status["enterprise_counts"] = enterprise_counts
            status["has_enterprise_data"] = any(count > 0 for count in enterprise_counts.values())
        except Exception as e:
            logger.debug(f"Error checking enterprise data (may not exist): {str(e)}")
            status["enterprise_counts"] = {}
            status["has_enterprise_data"] = False
        
        status["has_test_data"] = any(count > 0 for count in status["counts"].values())
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting test data status: {str(e)}")
        return {
            "has_test_data": False,
            "counts": {},
            "error": str(e)
        }