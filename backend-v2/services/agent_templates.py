"""
Agent Templates - Predefined configurations for different agent types
"""

from typing import Dict, Any
from models import AgentType


class AgentTemplates:
    """Predefined agent templates following Six Figure Barber methodology"""
    
    @staticmethod
    def get_all_templates() -> Dict[str, Dict[str, Any]]:
        """Get all available agent templates"""
        return {
            AgentType.REBOOKING.value: AgentTemplates.get_rebooking_template(),
            AgentType.NO_SHOW_FEE.value: AgentTemplates.get_no_show_fee_template(),
            AgentType.BIRTHDAY_WISHES.value: AgentTemplates.get_birthday_template(),
            AgentType.HOLIDAY_GREETINGS.value: AgentTemplates.get_holiday_template(),
            AgentType.REVIEW_REQUEST.value: AgentTemplates.get_review_template(),
            AgentType.RETENTION.value: AgentTemplates.get_retention_template(),
            AgentType.UPSELL.value: AgentTemplates.get_upsell_template(),
            AgentType.APPOINTMENT_REMINDER.value: AgentTemplates.get_reminder_template(),
        }
    
    @staticmethod
    def get_rebooking_template() -> Dict[str, Any]:
        """Template for rebooking agent"""
        return {
            "name": "Smart Rebooking Agent",
            "description": "Automatically reaches out to clients for rebooking based on optimal intervals",
            "default_config": {
                "rebooking_intervals": {
                    "haircut": 21,  # days
                    "beard_trim": 14,
                    "hair_color": 28,
                    "shave": 7,
                    "default": 28
                },
                "message_timing": {
                    "days_before": 3,  # Contact 3 days before optimal rebooking
                    "time_of_day": "10:00",
                    "avoid_weekends": True
                },
                "max_conversations_per_run": 50,
                "supported_channels": ["sms", "email"]
            },
            "prompt_templates": {
                "system": """You are a friendly and professional barbershop assistant for {barbershop_name}. 
Your goal is to help {client_name} schedule their next appointment at the optimal time.
Be conversational, warm, and respectful of their time. Keep messages concise for SMS (under 160 characters).
Use the Six Figure Barber methodology: focus on consistency, quality, and building lasting client relationships.""",
                
                "initial_sms": """Hey {client_name}! It's been {days_since_visit} days since your last {last_service} with {last_barber}. 
Time for a fresh look? I have some great times available this week. Reply YES to see options or call us at {shop_phone}.""",
                
                "initial_email": """Subject: Time for Your Next Visit at {barbershop_name}?

Hi {client_name},

I hope you've been enjoying your {last_service} from your visit on {last_visit_date}!

Based on our records, it's been {days_since_visit} days since your last appointment with {last_barber}, and it's the perfect time to schedule your next visit.

We have several convenient times available this week:
{available_slots}

Would you like to book one of these times, or would you prefer a different day?

Best regards,
{barbershop_name} Team

P.S. As a valued client, you can always book online at {booking_url} or call us at {shop_phone}.""",
                
                "follow_up": """Hi {client_name}! Just following up on my previous message. 
We'd love to see you again soon. Need help finding a time that works? Reply with your preferred day.""",
                
                "booking_confirmation": """Perfect! I've booked you for {service} on {date} at {time} with {barber}. 
We'll send a reminder the day before. Looking forward to seeing you!"""
            },
            "required_permissions": ["view_clients", "create_appointments", "send_messages"],
            "tone_settings": {
                "formality": "casual_professional",
                "enthusiasm": "moderate",
                "emoji_usage": "minimal"
            }
        }
    
    @staticmethod
    def get_no_show_fee_template() -> Dict[str, Any]:
        """Template for no-show fee collection agent"""
        return {
            "name": "Professional Fee Collection Agent",
            "description": "Handles no-show fee collection with tact and professionalism",
            "default_config": {
                "fee_amount": 25.00,
                "grace_period_hours": 24,
                "max_attempts": 3,
                "days_between_attempts": 3,
                "payment_methods": ["card_on_file", "payment_link"],
                "supported_channels": ["sms", "email"]
            },
            "prompt_templates": {
                "system": """You are a professional representative for {barbershop_name} handling a delicate fee collection matter.
Be respectful, understanding, and professional while firmly explaining the no-show policy.
The goal is to collect the fee while maintaining a positive relationship with the client.""",
                
                "initial_sms": """Hi {client_name}, we missed you for your {service} appointment on {no_show_date}. 
Per our policy, there's a ${fee_amount} no-show fee. Would you prefer to pay now or add it to your next visit? 
Reply PAY for a secure link.""",
                
                "initial_email": """Subject: Missed Appointment - {barbershop_name}

Dear {client_name},

We noticed you weren't able to make your {service} appointment on {no_show_date} at {no_show_time}.

We understand that unexpected situations arise. However, as per our booking policy, a ${fee_amount} no-show fee applies when appointments are missed without 24-hour notice. This helps us compensate our barbers for the reserved time.

You can settle this fee in one of the following ways:
1. Pay now using this secure link: {payment_link}
2. We can add it to your next appointment
3. Call us at {shop_phone} if you'd like to discuss

We value your business and look forward to seeing you at your next appointment.

Best regards,
{barbershop_name} Team""",
                
                "reminder": """Hi {client_name}, just a friendly reminder about the ${fee_amount} no-show fee from {no_show_date}. 
Would you like to take care of it now? Reply PAY for a secure link or NEXT to add to your next visit.""",
                
                "payment_success": """Thank you for taking care of the no-show fee, {client_name}! 
We appreciate your understanding. Ready to book your next appointment? Reply BOOK or visit {booking_url}."""
            },
            "required_permissions": ["view_appointments", "process_payments", "send_messages"],
            "tone_settings": {
                "formality": "professional",
                "enthusiasm": "low",
                "emoji_usage": "none"
            }
        }
    
    @staticmethod
    def get_birthday_template() -> Dict[str, Any]:
        """Template for birthday wishes agent"""
        return {
            "name": "Birthday Celebration Agent",
            "description": "Sends personalized birthday wishes with special offers",
            "default_config": {
                "days_before_birthday": 7,
                "birthday_discount": 20,  # percentage
                "discount_validity_days": 30,
                "send_time": "09:00",
                "supported_channels": ["sms", "email"]
            },
            "prompt_templates": {
                "system": """You are a warm and friendly representative of {barbershop_name} reaching out to celebrate a client's birthday.
Be genuine, personal, and celebratory. Make them feel special and valued.""",
                
                "sms": """🎉 Happy Birthday {client_name}! 
From all of us at {barbershop_name}, we hope your day is amazing! 
Enjoy {birthday_discount}% off your next visit as our gift. Valid for {validity_days} days. 
Book at {booking_url}""",
                
                "email": """Subject: 🎂 Happy Birthday from {barbershop_name}!

Dear {client_name},

Happy Birthday! 🎉

On behalf of everyone at {barbershop_name}, we want to wish you an incredible day filled with joy and celebration.

As our birthday gift to you, enjoy {birthday_discount}% off your next service! This special offer is valid for the next {validity_days} days.

You've been with us for {years_as_client} years, and we're grateful to be part of your grooming journey.

Ready to treat yourself to a fresh birthday look? Book your appointment at {booking_url} or call us at {shop_phone}.

Warmest wishes,
{barbershop_name} Team

P.S. Don't forget to mention your birthday discount when booking!"""
            },
            "required_permissions": ["view_clients", "send_messages"],
            "tone_settings": {
                "formality": "casual_warm",
                "enthusiasm": "high",
                "emoji_usage": "moderate"
            }
        }
    
    @staticmethod
    def get_review_template() -> Dict[str, Any]:
        """Template for review request agent"""
        return {
            "name": "Smart Review Request Agent",
            "description": "Requests reviews at optimal times from satisfied clients",
            "default_config": {
                "days_after_appointment": 3,
                "only_regular_clients": True,
                "min_appointments": 3,
                "review_platforms": ["google", "yelp"],
                "supported_channels": ["sms", "email"]
            },
            "prompt_templates": {
                "system": """You are representing {barbershop_name} to request an honest review from a satisfied client.
Be grateful, brief, and make it as easy as possible for them to leave a review.""",
                
                "sms": """Hi {client_name}! Hope you're loving your {last_service} from {last_barber}! 
Would you mind sharing your experience in a quick Google review? It really helps us out: {review_link}
Thanks! 🙏""",
                
                "email": """Subject: How was your experience at {barbershop_name}?

Hi {client_name},

I hope you're enjoying your {last_service} from your visit with {last_barber} on {last_visit_date}!

As a valued client who's been with us for {total_visits} visits, your feedback means the world to us.

Would you mind taking 30 seconds to share your experience?

⭐ Leave a Google Review: {google_review_link}
⭐ Leave a Yelp Review: {yelp_review_link}

Your honest feedback helps us improve and helps other clients find us.

Thank you for being an amazing client!

Best regards,
{barbershop_name} Team"""
            },
            "required_permissions": ["view_clients", "view_appointments", "send_messages"],
            "tone_settings": {
                "formality": "casual_professional",
                "enthusiasm": "moderate",
                "emoji_usage": "minimal"
            }
        }
    
    @staticmethod
    def get_retention_template() -> Dict[str, Any]:
        """Template for client retention agent"""
        return {
            "name": "Win-Back Agent",
            "description": "Re-engages clients who haven't visited in a while",
            "default_config": {
                "inactive_days": 60,
                "comeback_discount": 15,  # percentage
                "max_attempts": 2,
                "days_between_attempts": 14,
                "supported_channels": ["sms", "email"]
            },
            "prompt_templates": {
                "system": """You are reaching out to win back a client who hasn't visited {barbershop_name} in a while.
Be understanding, non-judgmental, and focus on how much you'd love to see them again.""",
                
                "sms": """Hey {client_name}! We miss you at {barbershop_name}! 
It's been {days_since_visit} days since your last visit. 
Come back for {comeback_discount}% off your next service. We'd love to see you again! 
Book: {booking_url}""",
                
                "email": """Subject: We Miss You at {barbershop_name}!

Hi {client_name},

We noticed it's been a while since your last visit (your last {last_service} was on {last_visit_date}), and we wanted to check in.

We miss having you in the chair! Whether you've been busy, trying somewhere new, or just letting it grow out, we'd love to welcome you back.

As a special incentive, enjoy {comeback_discount}% off your next service – no strings attached.

What's new at {barbershop_name}:
- Extended hours for your convenience
- New services and treatments
- Same great team, even better skills

Ready to come back? Book online at {booking_url} or call us at {shop_phone}.

Hope to see you soon!

{barbershop_name} Team"""
            },
            "required_permissions": ["view_clients", "view_appointments", "send_messages"],
            "tone_settings": {
                "formality": "casual_warm",
                "enthusiasm": "moderate",
                "emoji_usage": "minimal"
            }
        }
    
    @staticmethod
    def get_reminder_template() -> Dict[str, Any]:
        """Template for appointment reminder agent"""
        return {
            "name": "Smart Reminder Agent",
            "description": "Sends intelligent appointment reminders with helpful information",
            "default_config": {
                "reminder_times": [48, 24, 2],  # hours before appointment
                "include_weather": True,
                "include_parking": True,
                "include_barber_info": True,
                "supported_channels": ["sms", "email"]
            },
            "prompt_templates": {
                "system": """You are sending appointment reminders for {barbershop_name}.
Include all helpful information while keeping the message concise and friendly.""",
                
                "sms_48h": """Hi {client_name}! Reminder: {service} with {barber} on {date} at {time}.
Need to change? Reply CHANGE or call {shop_phone}.""",
                
                "sms_24h": """See you tomorrow {client_name}! {service} at {time} with {barber}.
Weather: {weather_forecast}. Reply CONFIRM or CANCEL.""",
                
                "sms_2h": """Almost time {client_name}! See you at {time} for your {service}.
Address: {shop_address}. We're excited to see you!""",
                
                "email": """Subject: Appointment Reminder - {date} at {time}

Hi {client_name},

This is a friendly reminder about your upcoming appointment:

📅 Date: {date}
⏰ Time: {time}
✂️ Service: {service}
💈 Barber: {barber}
📍 Location: {shop_address}

{weather_section}
{parking_section}

Need to reschedule? No problem:
- Call us: {shop_phone}
- Reschedule online: {reschedule_link}

We look forward to seeing you!

{barbershop_name} Team"""
            },
            "required_permissions": ["view_appointments", "send_messages"],
            "tone_settings": {
                "formality": "casual_professional",
                "enthusiasm": "moderate",
                "emoji_usage": "minimal"
            }
        }
    
    @staticmethod
    def get_upsell_template() -> Dict[str, Any]:
        """Template for service upsell agent"""
        return {
            "name": "Service Enhancement Agent",
            "description": "Suggests complementary services based on client history",
            "default_config": {
                "trigger_after_appointments": 3,
                "upsell_discount": 10,
                "analyze_service_patterns": True,
                "supported_channels": ["sms", "email"]
            },
            "prompt_templates": {
                "system": """You are suggesting complementary services to enhance the client's experience at {barbershop_name}.
Be helpful and informative without being pushy. Focus on the benefits to the client.""",
                
                "sms": """Hi {client_name}! Based on your love for {frequent_service}, have you tried our {suggested_service}? 
It's perfect with your style! Get {upsell_discount}% off when you add it to your next visit. 
Interested? Reply YES for details.""",
                
                "email": """Subject: Enhance Your Look with {suggested_service}

Hi {client_name},

We've noticed you're a regular for our {frequent_service} (you've had {service_count} in the last few months!), and we think you'd love our {suggested_service}.

Here's why it's perfect for you:
{benefit_1}
{benefit_2}
{benefit_3}

As a valued client, enjoy {upsell_discount}% off when you try it with your next appointment.

Ready to enhance your experience? Book your next visit with {suggested_service} at {booking_url}.

Looking forward to helping you look your best!

{barbershop_name} Team"""
            },
            "required_permissions": ["view_clients", "view_appointments", "send_messages"],
            "tone_settings": {
                "formality": "casual_professional",
                "enthusiasm": "moderate",
                "emoji_usage": "minimal"
            }
        }
    
    @staticmethod
    def get_holiday_template() -> Dict[str, Any]:
        """Template for holiday greetings agent"""
        return {
            "name": "Holiday Greetings Agent",
            "description": "Sends personalized holiday greetings to maintain client relationships",
            "default_config": {
                "holidays": ["new_year", "thanksgiving", "christmas", "fathers_day"],
                "include_special_hours": True,
                "holiday_discount": 15,
                "supported_channels": ["sms", "email"]
            },
            "prompt_templates": {
                "system": """You are sending warm holiday greetings on behalf of {barbershop_name}.
Be genuine, warm, and inclusive. Keep the focus on gratitude and well-wishes.""",
                
                "sms": """Happy {holiday} {client_name}! 🎄
From all of us at {barbershop_name}, thank you for being part of our family.
Enjoy {holiday_discount}% off this week! 
Holiday hours: {special_hours}""",
                
                "email": """Subject: Happy {holiday} from {barbershop_name}!

Dear {client_name},

As we celebrate {holiday}, we want to take a moment to thank you for your continued trust and support.

You've been part of our {barbershop_name} family for {years_as_client} years, and we're grateful for every visit.

Our holiday gift to you: Enjoy {holiday_discount}% off any service through {offer_end_date}.

Special Holiday Hours:
{special_hours_list}

Wishing you and your loved ones a wonderful {holiday} season!

Warmly,
{barbershop_name} Team

Book your holiday appointment: {booking_url}"""
            },
            "required_permissions": ["view_clients", "send_messages"],
            "tone_settings": {
                "formality": "warm_professional",
                "enthusiasm": "high",
                "emoji_usage": "moderate"
            }
        }


# Agent template registry
agent_templates = AgentTemplates()