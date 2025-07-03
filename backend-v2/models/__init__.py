"""
Models package for BookedBarber V2.
Import all models here to ensure they're registered with SQLAlchemy.
"""

# Import models from parent models.py file using absolute import
import importlib.util
import os

# Get the path to models.py in the parent directory
models_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models.py')
spec = importlib.util.spec_from_file_location("models_file", models_path)
models_file = importlib.util.module_from_spec(spec)
spec.loader.exec_module(models_file)

# Import all the classes from models.py
User = models_file.User
Appointment = models_file.Appointment
Payment = models_file.Payment
Service = models_file.Service
BarberAvailability = models_file.BarberAvailability
PasswordResetToken = models_file.PasswordResetToken
Payout = models_file.Payout
GiftCertificate = models_file.GiftCertificate
Client = models_file.Client
Refund = models_file.Refund
BookingSettings = models_file.BookingSettings
ServiceCategoryEnum = models_file.ServiceCategoryEnum
ServicePricingRule = models_file.ServicePricingRule
ServiceBookingRule = models_file.ServiceBookingRule
NotificationTemplate = models_file.NotificationTemplate
NotificationPreference = models_file.NotificationPreference
NotificationStatus = models_file.NotificationStatus
NotificationQueue = models_file.NotificationQueue
SMSConversation = models_file.SMSConversation
SMSMessage = models_file.SMSMessage
SMSMessageDirection = models_file.SMSMessageDirection
SMSMessageStatus = models_file.SMSMessageStatus
BarberTimeOff = models_file.BarberTimeOff
BarberSpecialAvailability = models_file.BarberSpecialAvailability
RecurringAppointmentPattern = models_file.RecurringAppointmentPattern
BookingRule = models_file.BookingRule
WebhookEndpoint = models_file.WebhookEndpoint
WebhookLog = models_file.WebhookLog
WebhookAuthType = models_file.WebhookAuthType
WebhookEventType = models_file.WebhookEventType
WebhookStatus = models_file.WebhookStatus
MarketingCampaign = models_file.MarketingCampaign
MarketingTemplate = models_file.MarketingTemplate
MarketingUsage = models_file.MarketingUsage
CampaignAnalytics = models_file.CampaignAnalytics
ContactList = models_file.ContactList
ContactListMember = models_file.ContactListMember
ContactSegment = models_file.ContactSegment
NotificationPreferences = models_file.NotificationPreferences
NotificationPreferenceAudit = models_file.NotificationPreferenceAudit
UnsubscribeRequest = models_file.UnsubscribeRequest
NotificationChannel = models_file.NotificationChannel
EmailAnalyticsEvent = models_file.EmailAnalyticsEvent
EmailCampaign = models_file.EmailCampaign
EmailAnalyticsSummary = models_file.EmailAnalyticsSummary
EmailABTest = models_file.EmailABTest
EmailDeliverabilityTest = models_file.EmailDeliverabilityTest
EmailPreview = models_file.EmailPreview

# Tables
barber_services = models_file.barber_services
service_package_items = models_file.service_package_items

# Aliases
EmailEvent = models_file.EmailEvent

# Import specific models to avoid circular imports
from .integration import Integration, IntegrationType, IntegrationStatus
from .review import Review, ReviewResponse, ReviewTemplate, ReviewPlatform, ReviewSentiment, ReviewResponseStatus
from .product import (
    Product, ProductVariant, InventoryItem, Order, OrderItem, POSTransaction,
    ProductStatus, ProductType, OrderStatus, OrderSource
)
from .api_key import APIKey, APIKeyStatus
from .idempotency import IdempotencyKey, IdempotencyOperationType
from .consent import (
    UserConsent, CookieConsent, DataProcessingLog, DataExportRequest, LegalConsentAudit,
    ConsentType, ConsentStatus, CookieCategory, DataProcessingPurpose, ExportStatus
)
from .cancellation import (
    CancellationPolicy, AppointmentCancellation, WaitlistEntry, CancellationPolicyHistory,
    CancellationReason, RefundType
)
from .ai_analytics import (
    PerformanceBenchmark, AIInsightCache, CrossUserMetric, PredictiveModel, BusinessIntelligenceReport,
    BenchmarkCategory, InsightType, BusinessSegment
)

__all__ = [
    # Main models from parent models.py
    'User', 'Appointment', 'Payment', 'Service', 'BarberAvailability',
    'PasswordResetToken', 'Payout', 'GiftCertificate', 'Client', 'Refund',
    'BookingSettings', 'ServiceCategoryEnum', 'ServicePricingRule', 'ServiceBookingRule',
    'NotificationTemplate', 'NotificationPreference', 'NotificationStatus', 'NotificationQueue',
    'SMSConversation', 'SMSMessage', 'SMSMessageDirection', 'SMSMessageStatus',
    'BarberTimeOff', 'BarberSpecialAvailability', 'RecurringAppointmentPattern', 'BookingRule',
    'WebhookEndpoint', 'WebhookLog', 'WebhookAuthType', 'WebhookEventType', 'WebhookStatus',
    'MarketingCampaign', 'MarketingTemplate', 'MarketingUsage', 'CampaignAnalytics',
    'ContactList', 'ContactListMember', 'ContactSegment', 'NotificationPreferences',
    'NotificationPreferenceAudit', 'UnsubscribeRequest', 'NotificationChannel',
    'EmailAnalyticsEvent', 'EmailCampaign', 'EmailAnalyticsSummary', 'EmailABTest',
    'EmailDeliverabilityTest', 'EmailPreview',
    # Tables
    'barber_services', 'service_package_items',
    # Aliases
    'EmailEvent',
    # Models from this package
    'Integration', 'IntegrationType', 'IntegrationStatus',
    'Review', 'ReviewResponse', 'ReviewTemplate', 'ReviewPlatform', 'ReviewSentiment', 'ReviewResponseStatus',
    'Product', 'ProductVariant', 'InventoryItem', 'Order', 'OrderItem', 'POSTransaction',
    'ProductStatus', 'ProductType', 'OrderStatus', 'OrderSource',
    'APIKey', 'APIKeyStatus',
    'IdempotencyKey', 'IdempotencyOperationType',
    'UserConsent', 'CookieConsent', 'DataProcessingLog', 'DataExportRequest', 'LegalConsentAudit',
    'ConsentType', 'ConsentStatus', 'CookieCategory', 'DataProcessingPurpose', 'ExportStatus',
    'CancellationPolicy', 'AppointmentCancellation', 'WaitlistEntry', 'CancellationPolicyHistory',
    'CancellationReason', 'RefundType',
    'PerformanceBenchmark', 'AIInsightCache', 'CrossUserMetric', 'PredictiveModel', 'BusinessIntelligenceReport',
    'BenchmarkCategory', 'InsightType', 'BusinessSegment'
]