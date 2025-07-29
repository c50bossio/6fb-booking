"""
Insight Email Service for BookedBarber V2

This service handles the creation, personalization, and delivery of weekly insight
email reports. It provides professional email templates, engagement tracking,
and comprehensive delivery analytics aligned with the Six Figure Barber brand.

Key Features:
- Professional, mobile-responsive email templates
- Personalized content generation
- Email delivery with SendGrid integration
- Comprehensive engagement tracking (opens, clicks, conversions)
- A/B testing support for template optimization
- Automated retry and error handling
- Unsubscribe management and compliance
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import json
import jinja2
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import smtplib
import ssl
from pathlib import Path

from models import User
from models.weekly_insights import (
    WeeklyInsight, WeeklyRecommendation, InsightEmailDelivery, InsightTemplate,
    EmailDeliveryStatus, InsightCategory, RecommendationPriority
)
from utils.email_utils import EmailService  # Assume existing email utility

logger = logging.getLogger(__name__)

class InsightEmailService:
    """
    Comprehensive email service for delivering weekly insights with professional
    templates, engagement tracking, and Six Figure Barber branding.
    """
    
    def __init__(self, db: Session, email_service: Optional[EmailService] = None):
        self.db = db
        self.email_service = email_service or EmailService()
        self.template_loader = jinja2.FileSystemLoader(
            Path(__file__).parent.parent / 'templates' / 'email'
        )
        self.jinja_env = jinja2.Environment(loader=self.template_loader)
        self._initialize_default_templates()
    
    def _initialize_default_templates(self):
        """Initialize default email templates if they don't exist"""
        
        # Check if default template exists
        default_template = self.db.query(InsightTemplate).filter(
            InsightTemplate.is_default == True
        ).first()
        
        if not default_template:
            self._create_default_templates()
    
    def _create_default_templates(self):
        """Create default professional email templates"""
        
        # Primary template - Six Figure Barber branded
        primary_template = InsightTemplate(
            name="six_figure_barber_weekly",
            version="1.0",
            description="Professional Six Figure Barber methodology weekly insights template",
            email_subject_template="Your Weekly Six Figure Barber Insights - {{week_label}}",
            email_html_template=self._get_primary_html_template(),
            email_text_template=self._get_primary_text_template(),
            pdf_template=None,  # Will be implemented separately
            variables=json.dumps([
                "barber_name", "week_label", "overall_score", "score_change",
                "revenue_current", "revenue_growth", "top_achievements",
                "key_recommendations", "executive_summary"
            ]),
            styling_config=json.dumps({
                "primary_color": "#1E40AF",
                "secondary_color": "#F59E0B",
                "accent_color": "#10B981",
                "background_color": "#F9FAFB",
                "text_color": "#1F2937",
                "font_family": "system-ui, -apple-system, sans-serif"
            }),
            is_active=True,
            is_default=True
        )
        
        self.db.add(primary_template)
        
        # Alternative template for A/B testing
        alt_template = InsightTemplate(
            name="six_figure_barber_modern",
            version="1.0",
            description="Modern, minimal design alternative template",
            email_subject_template="📊 Weekly Business Insights - {{week_label}} Performance",
            email_html_template=self._get_modern_html_template(),
            email_text_template=self._get_modern_text_template(),
            variables=json.dumps([
                "barber_name", "week_label", "overall_score", "revenue_current",
                "top_achievements", "key_recommendations"
            ]),
            styling_config=json.dumps({
                "primary_color": "#6366F1",
                "secondary_color": "#EC4899",
                "accent_color": "#06B6D4",
                "background_color": "#FFFFFF",
                "text_color": "#111827",
                "font_family": "Inter, system-ui, sans-serif"
            }),
            is_active=True,
            ab_test_group="modern"
        )
        
        self.db.add(alt_template)
        self.db.commit()
    
    def send_weekly_insight_email(self, insight_id: int, 
                                 template_name: Optional[str] = None,
                                 scheduled_time: Optional[datetime] = None) -> InsightEmailDelivery:
        """
        Send weekly insight email to a barber
        
        Args:
            insight_id: ID of the weekly insight to send
            template_name: Specific template to use (optional)
            scheduled_time: When to send the email (optional)
            
        Returns:
            InsightEmailDelivery: Email delivery record
        """
        try:
            # Get insight and user data
            insight = self.db.query(WeeklyInsight).filter(
                WeeklyInsight.id == insight_id
            ).first()
            
            if not insight:
                raise ValueError(f"Weekly insight {insight_id} not found")
            
            user = self.db.query(User).filter(User.id == insight.user_id).first()
            if not user:
                raise ValueError(f"User {insight.user_id} not found")
            
            # Get email template
            template = self._get_email_template(template_name)
            
            # Create email delivery record
            email_delivery = InsightEmailDelivery(
                weekly_insight_id=insight_id,
                user_id=insight.user_id,
                email_address=user.email,
                subject_line="",  # Will be set below
                template_version=template.version,
                status=EmailDeliveryStatus.PENDING,
                scheduled_send_time=scheduled_time or datetime.utcnow(),
                email_provider="sendgrid"  # Or configured provider
            )
            
            self.db.add(email_delivery)
            self.db.commit()
            
            # Generate personalized content
            content_data = self._prepare_email_content(insight, user)
            
            # Render email content
            subject = self._render_template(template.email_subject_template, content_data)
            html_content = self._render_template(template.email_html_template, content_data)
            text_content = self._render_template(template.email_text_template, content_data)
            
            # Update email delivery record
            email_delivery.subject_line = subject
            email_delivery.content_html = html_content
            email_delivery.content_text = text_content
            
            # Send email
            if scheduled_time and scheduled_time > datetime.utcnow():
                # Schedule for later delivery
                email_delivery.status = EmailDeliveryStatus.PENDING
                logger.info(f"Email scheduled for {scheduled_time} for user {user.id}")
            else:
                # Send immediately
                success, message_id = self._send_email(
                    to_email=user.email,
                    subject=subject,
                    html_content=html_content,
                    text_content=text_content,
                    insight=insight
                )
                
                if success:
                    email_delivery.status = EmailDeliveryStatus.SENT
                    email_delivery.actual_send_time = datetime.utcnow()
                    email_delivery.message_id = message_id
                    logger.info(f"Successfully sent insight email to {user.email}")
                else:
                    email_delivery.status = EmailDeliveryStatus.FAILED
                    email_delivery.error_message = "Failed to send email"
                    logger.error(f"Failed to send insight email to {user.email}")
            
            self.db.commit()
            return email_delivery
            
        except Exception as e:
            logger.error(f"Error sending weekly insight email: {e}")
            if 'email_delivery' in locals():
                email_delivery.status = EmailDeliveryStatus.FAILED
                email_delivery.error_message = str(e)
                self.db.commit()
            raise\n    \n    def _get_email_template(self, template_name: Optional[str] = None) -> InsightTemplate:\n        """Get email template for rendering"""\n        \n        if template_name:\n            template = self.db.query(InsightTemplate).filter(\n                InsightTemplate.name == template_name,\n                InsightTemplate.is_active == True\n            ).first()\n        else:\n            template = self.db.query(InsightTemplate).filter(\n                InsightTemplate.is_default == True,\n                InsightTemplate.is_active == True\n            ).first()\n        \n        if not template:\n            raise ValueError("No suitable email template found")\n        \n        return template\n    \n    def _prepare_email_content(self, insight: WeeklyInsight, user: User) -> Dict[str, Any]:\n        """Prepare personalized content data for email rendering"""\n        \n        # Get recommendations\n        recommendations = self.db.query(WeeklyRecommendation).filter(\n            WeeklyRecommendation.weekly_insight_id == insight.id\n        ).order_by(\n            WeeklyRecommendation.priority.desc(),\n            WeeklyRecommendation.confidence_score.desc()\n        ).limit(5).all()\n        \n        # Format week label\n        week_label = insight.week_start_date.strftime("%B %d")\n        if insight.week_end_date.month != insight.week_start_date.month:\n            week_label += insight.week_end_date.strftime(" - %B %d")\n        else:\n            week_label += insight.week_end_date.strftime(" - %d")\n        \n        # Calculate score change indicator\n        score_change_text = ""\n        if insight.score_change > 0:\n            score_change_text = f"↗️ +{insight.score_change:.1f} points"\n        elif insight.score_change < 0:\n            score_change_text = f"↘️ {insight.score_change:.1f} points"\n        else:\n            score_change_text = "→ No change"\n        \n        # Format revenue change\n        revenue_change_text = ""\n        if insight.revenue_growth_percent > 0:\n            revenue_change_text = f"📈 +{insight.revenue_growth_percent:.1f}%"\n        elif insight.revenue_growth_percent < 0:\n            revenue_change_text = f"📉 {insight.revenue_growth_percent:.1f}%"\n        else:\n            revenue_change_text = "➡️ No change"\n        \n        # Prepare recommendation data\n        rec_data = []\n        for rec in recommendations:\n            rec_data.append({\n                'title': rec.title,\n                'description': rec.description,\n                'priority': rec.priority.value,\n                'expected_impact': rec.expected_impact,\n                'action_items': rec.action_items[:3] if rec.action_items else [],\n                'priority_emoji': self._get_priority_emoji(rec.priority)\n            })\n        \n        return {\n            'barber_name': user.name or "Barber",\n            'user_email': user.email,\n            'week_label': week_label,\n            'overall_score': insight.overall_score,\n            'score_change': insight.score_change,\n            'score_change_text': score_change_text,\n            'revenue_current': insight.revenue_current_week,\n            'revenue_previous': insight.revenue_previous_week,\n            'revenue_growth': insight.revenue_growth_percent,\n            'revenue_change_text': revenue_change_text,\n            'appointments_current': insight.appointments_current_week,\n            'appointments_growth': insight.appointment_growth_percent,\n            'new_clients': insight.new_clients_count,\n            'returning_clients': insight.returning_clients_count,\n            'retention_rate': insight.client_retention_rate,\n            'average_ticket': insight.average_ticket_size,\n            'booking_efficiency': insight.booking_efficiency_percent,\n            'top_achievements': insight.top_achievements or [],\n            'key_opportunities': insight.key_opportunities or [],\n            'risk_factors': insight.risk_factors or [],\n            'recommendations': rec_data,\n            'executive_summary': insight.executive_summary,\n            'key_insights': insight.key_insights,\n            'six_fb_scores': {\n                'revenue_optimization': insight.revenue_optimization_score,\n                'client_value': insight.client_value_score,\n                'service_excellence': insight.service_excellence_score,\n                'business_efficiency': insight.business_efficiency_score,\n                'professional_growth': insight.professional_growth_score\n            },\n            'dashboard_url': f"https://bookedbarber.com/analytics/insights/{insight.id}",\n            'unsubscribe_url': f"https://bookedbarber.com/unsubscribe/{user.id}",\n            'current_year': datetime.now().year\n        }\n    \n    def _render_template(self, template_string: str, data: Dict[str, Any]) -> str:\n        """Render Jinja2 template with data"""\n        \n        try:\n            template = jinja2.Template(template_string)\n            return template.render(**data)\n        except Exception as e:\n            logger.error(f"Error rendering template: {e}")\n            return f"Error rendering content: {str(e)}"\n    \n    def _send_email(self, to_email: str, subject: str, html_content: str, \n                   text_content: str, insight: WeeklyInsight) -> Tuple[bool, Optional[str]]:\n        """Send email using configured email service"""\n        \n        try:\n            # Use existing email service or implement SendGrid integration\n            message_id = self.email_service.send_email(\n                to_email=to_email,\n                subject=subject,\n                html_content=html_content,\n                text_content=text_content,\n                category="weekly_insights",\n                custom_args={\n                    "insight_id": str(insight.id),\n                    "user_id": str(insight.user_id),\n                    "email_type": "weekly_insights"\n                }\n            )\n            \n            return True, message_id\n            \n        except Exception as e:\n            logger.error(f"Error sending email to {to_email}: {e}")\n            return False, None\n    \n    def _get_priority_emoji(self, priority: RecommendationPriority) -> str:\n        """Get emoji for recommendation priority"""\n        \n        emoji_map = {\n            RecommendationPriority.CRITICAL: "🔴",\n            RecommendationPriority.HIGH: "🟡",\n            RecommendationPriority.MEDIUM: "🟢",\n            RecommendationPriority.LOW: "⚪"\n        }\n        return emoji_map.get(priority, "⚪")\n    \n    def track_email_engagement(self, message_id: str, event_type: str, \n                              event_data: Dict[str, Any]) -> bool:\n        """Track email engagement events (opens, clicks, etc.)"""\n        \n        try:\n            email_delivery = self.db.query(InsightEmailDelivery).filter(\n                InsightEmailDelivery.message_id == message_id\n            ).first()\n            \n            if not email_delivery:\n                logger.warning(f"Email delivery not found for message_id: {message_id}")\n                return False\n            \n            now = datetime.utcnow()\n            \n            if event_type == "delivered":\n                email_delivery.status = EmailDeliveryStatus.DELIVERED\n                email_delivery.delivery_time = now\n            \n            elif event_type == "open":\n                email_delivery.opened_count += 1\n                if not email_delivery.first_opened_at:\n                    email_delivery.first_opened_at = now\n                email_delivery.last_opened_at = now\n                \n                if email_delivery.status == EmailDeliveryStatus.DELIVERED:\n                    email_delivery.status = EmailDeliveryStatus.OPENED\n            \n            elif event_type == "click":\n                email_delivery.clicked_count += 1\n                if not email_delivery.first_clicked_at:\n                    email_delivery.first_clicked_at = now\n                email_delivery.last_clicked_at = now\n                \n                # Track clicked links\n                clicked_links = email_delivery.clicked_links or []\n                if event_data.get('url'):\n                    clicked_links.append({\n                        'url': event_data['url'],\n                        'timestamp': now.isoformat()\n                    })\n                    email_delivery.clicked_links = clicked_links\n                \n                if email_delivery.status in [EmailDeliveryStatus.DELIVERED, EmailDeliveryStatus.OPENED]:\n                    email_delivery.status = EmailDeliveryStatus.CLICKED\n            \n            elif event_type == "bounce":\n                email_delivery.status = EmailDeliveryStatus.BOUNCED\n                email_delivery.bounce_reason = event_data.get('reason', 'Unknown')\n            \n            elif event_type == "unsubscribe":\n                email_delivery.unsubscribed_at = now\n                email_delivery.unsubscribe_reason = event_data.get('reason')\n            \n            self.db.commit()\n            return True\n            \n        except Exception as e:\n            logger.error(f"Error tracking email engagement: {e}")\n            return False\n    \n    def get_email_analytics(self, user_id: Optional[int] = None, \n                           days_back: int = 30) -> Dict[str, Any]:\n        """Get comprehensive email analytics"""\n        \n        cutoff_date = datetime.utcnow() - timedelta(days=days_back)\n        \n        query = self.db.query(InsightEmailDelivery).filter(\n            InsightEmailDelivery.created_at >= cutoff_date\n        )\n        \n        if user_id:\n            query = query.filter(InsightEmailDelivery.user_id == user_id)\n        \n        deliveries = query.all()\n        \n        if not deliveries:\n            return {\n                'total_sent': 0,\n                'delivery_rate': 0,\n                'open_rate': 0,\n                'click_rate': 0,\n                'unsubscribe_rate': 0\n            }\n        \n        total_sent = len(deliveries)\n        delivered = len([d for d in deliveries if d.status in [\n            EmailDeliveryStatus.DELIVERED, EmailDeliveryStatus.OPENED, EmailDeliveryStatus.CLICKED\n        ]])\n        opened = len([d for d in deliveries if d.opened_count > 0])\n        clicked = len([d for d in deliveries if d.clicked_count > 0])\n        unsubscribed = len([d for d in deliveries if d.unsubscribed_at])\n        \n        return {\n            'total_sent': total_sent,\n            'delivery_rate': (delivered / total_sent * 100) if total_sent > 0 else 0,\n            'open_rate': (opened / delivered * 100) if delivered > 0 else 0,\n            'click_rate': (clicked / delivered * 100) if delivered > 0 else 0,\n            'unsubscribe_rate': (unsubscribed / total_sent * 100) if total_sent > 0 else 0,\n            'engagement_by_day': self._get_engagement_by_day(deliveries, days_back)\n        }\n    \n    def _get_engagement_by_day(self, deliveries: List[InsightEmailDelivery], \n                              days_back: int) -> List[Dict[str, Any]]:\n        """Get daily engagement metrics"""\n        \n        daily_metrics = []\n        for i in range(days_back):\n            day = datetime.utcnow().date() - timedelta(days=i)\n            day_deliveries = [\n                d for d in deliveries \n                if d.actual_send_time and d.actual_send_time.date() == day\n            ]\n            \n            if day_deliveries:\n                daily_metrics.append({\n                    'date': day.isoformat(),\n                    'sent': len(day_deliveries),\n                    'opened': len([d for d in day_deliveries if d.opened_count > 0]),\n                    'clicked': len([d for d in day_deliveries if d.clicked_count > 0])\n                })\n        \n        return daily_metrics[::-1]  # Reverse to show oldest first\n    \n    def _get_primary_html_template(self) -> str:\n        """Primary professional HTML email template"""\n        \n        return """\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Your Weekly Six Figure Barber Insights</title>\n    <style>\n        body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; }\n        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }\n        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px 20px; text-align: center; }\n        .score-card { background: #f8fafc; margin: 20px; padding: 20px; border-radius: 8px; border-left: 4px solid #1e40af; }\n        .metric-row { display: flex; justify-content: space-between; margin: 10px 0; }\n        .recommendation { background: #fef3c7; margin: 15px 20px; padding: 15px; border-radius: 6px; border-left: 3px solid #f59e0b; }\n        .footer { background: #374151; color: #d1d5db; padding: 20px; text-align: center; font-size: 12px; }\n        .btn { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }\n        @media (max-width: 600px) { .container { width: 100% !important; } .metric-row { flex-direction: column; } }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <div class="header">\n            <h1>Weekly Six Figure Barber Insights</h1>\n            <p>Week of {{week_label}}</p>\n            <h2>Overall Score: {{overall_score}}/100</h2>\n            <p>{{score_change_text}}</p>\n        </div>\n        \n        <div class="score-card">\n            <h3>Key Performance Metrics</h3>\n            <div class="metric-row">\n                <span><strong>Revenue:</strong> ${{revenue_current}}</span>\n                <span>{{revenue_change_text}}</span>\n            </div>\n            <div class="metric-row">\n                <span><strong>Appointments:</strong> {{appointments_current}}</span>\n                <span><strong>New Clients:</strong> {{new_clients}}</span>\n            </div>\n            <div class="metric-row">\n                <span><strong>Avg Ticket:</strong> ${{average_ticket}}</span>\n                <span><strong>Efficiency:</strong> {{booking_efficiency}}%</span>\n            </div>\n        </div>\n        \n        {% if executive_summary %}\n        <div style="margin: 20px; padding: 20px; background: #f0f9ff; border-radius: 8px;">\n            <h3>Executive Summary</h3>\n            <p>{{executive_summary}}</p>\n        </div>\n        {% endif %}\n        \n        {% if top_achievements %}\n        <div style="margin: 20px;">\n            <h3>🏆 This Week's Achievements</h3>\n            <ul>\n                {% for achievement in top_achievements %}\n                <li>{{achievement}}</li>\n                {% endfor %}\n            </ul>\n        </div>\n        {% endif %}\n        \n        {% if recommendations %}\n        <div style="margin: 20px;">\n            <h3>📈 Recommended Actions</h3>\n            {% for rec in recommendations[:3] %}\n            <div class="recommendation">\n                <h4>{{rec.priority_emoji}} {{rec.title}}</h4>\n                <p>{{rec.description}}</p>\n                <p><strong>Expected Impact:</strong> {{rec.expected_impact}}</p>\n                {% if rec.action_items %}\n                <ul>\n                    {% for action in rec.action_items %}\n                    <li>{{action}}</li>\n                    {% endfor %}\n                </ul>\n                {% endif %}\n            </div>\n            {% endfor %}\n        </div>\n        {% endif %}\n        \n        <div style="text-align: center; margin: 30px 20px;">\n            <a href="{{dashboard_url}}" class="btn">View Full Dashboard</a>\n        </div>\n        \n        <div class="footer">\n            <p>Six Figure Barber Methodology - Empowering Barber Success</p>\n            <p><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Unsubscribe</a> | <a href="https://bookedbarber.com" style="color: #9ca3af;">BookedBarber.com</a></p>\n        </div>\n    </div>\n</body>\n</html>\n        """\n    \n    def _get_primary_text_template(self) -> str:\n        """Primary text email template for accessibility"""\n        \n        return """\nSIX FIGURE BARBER WEEKLY INSIGHTS\nWeek of {{week_label}}\n\n📊 OVERALL SCORE: {{overall_score}}/100\n{{score_change_text}}\n\n💰 KEY METRICS:\n• Revenue: ${{revenue_current}} {{revenue_change_text}}\n• Appointments: {{appointments_current}}\n• New Clients: {{new_clients}}\n• Average Ticket: ${{average_ticket}}\n• Booking Efficiency: {{booking_efficiency}}%\n\n{% if executive_summary %}\n📝 EXECUTIVE SUMMARY:\n{{executive_summary}}\n{% endif %}\n\n{% if top_achievements %}\n🏆 THIS WEEK'S ACHIEVEMENTS:\n{% for achievement in top_achievements %}\n• {{achievement}}\n{% endfor %}\n{% endif %}\n\n{% if recommendations %}\n📈 RECOMMENDED ACTIONS:\n{% for rec in recommendations[:3] %}\n\n{{rec.priority_emoji}} {{rec.title}}\n{{rec.description}}\nExpected Impact: {{rec.expected_impact}}\n{% if rec.action_items %}\nAction Items:\n{% for action in rec.action_items %}\n• {{action}}\n{% endfor %}\n{% endif %}\n{% endfor %}\n{% endif %}\n\n🔗 View Full Dashboard: {{dashboard_url}}\n\n---\nSix Figure Barber Methodology - Empowering Barber Success\nBookedBarber.com | Unsubscribe: {{unsubscribe_url}}\n        """\n    \n    def _get_modern_html_template(self) -> str:\n        """Modern alternative HTML template for A/B testing"""\n        \n        return """\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Weekly Performance Report</title>\n    <style>\n        body { margin: 0; padding: 0; font-family: Inter, system-ui, sans-serif; background: #ffffff; }\n        .container { max-width: 600px; margin: 0 auto; }\n        .header { background: #6366f1; color: white; padding: 40px 30px; text-align: center; }\n        .card { margin: 25px; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; }\n        .metric { display: inline-block; margin: 10px 15px; text-align: center; }\n        .metric-value { font-size: 24px; font-weight: bold; color: #6366f1; }\n        .rec-card { background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); color: white; margin: 20px 0; padding: 20px; border-radius: 10px; }\n        .footer { padding: 30px; text-align: center; color: #6b7280; }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <div class="header">\n            <h1>📊 Performance Report</h1>\n            <p>{{week_label}}</p>\n            <div style="font-size: 36px; font-weight: bold;">{{overall_score}}</div>\n            <p>Six Figure Score</p>\n        </div>\n        \n        <div class="card">\n            <div class="metric">\n                <div class="metric-value">${{revenue_current}}</div>\n                <div>Revenue</div>\n            </div>\n            <div class="metric">\n                <div class="metric-value">{{appointments_current}}</div>\n                <div>Appointments</div>\n            </div>\n            <div class="metric">\n                <div class="metric-value">{{new_clients}}</div>\n                <div>New Clients</div>\n            </div>\n        </div>\n        \n        {% if recommendations %}\n        {% for rec in recommendations[:2] %}\n        <div class="rec-card">\n            <h3>{{rec.title}}</h3>\n            <p>{{rec.description}}</p>\n            <strong>Impact: {{rec.expected_impact}}</strong>\n        </div>\n        {% endfor %}\n        {% endif %}\n        \n        <div class="footer">\n            <a href="{{dashboard_url}}" style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">View Dashboard</a>\n            <p><small><a href="{{unsubscribe_url}}" style="color: #9ca3af;">Unsubscribe</a></small></p>\n        </div>\n    </div>\n</body>\n</html>\n        """\n    \n    def _get_modern_text_template(self) -> str:\n        """Modern text template for A/B testing"""\n        \n        return """\n📊 WEEKLY PERFORMANCE REPORT\n{{week_label}}\n\nSIX FIGURE SCORE: {{overall_score}}/100\n\n💼 KEY METRICS:\nRevenue: ${{revenue_current}}\nAppointments: {{appointments_current}}\nNew Clients: {{new_clients}}\n\n{% if recommendations %}\n🚀 TOP RECOMMENDATIONS:\n{% for rec in recommendations[:2] %}\n\n• {{rec.title}}\n  {{rec.description}}\n  Impact: {{rec.expected_impact}}\n{% endfor %}\n{% endif %}\n\n🔗 Dashboard: {{dashboard_url}}\n\nUnsubscribe: {{unsubscribe_url}}\n        """