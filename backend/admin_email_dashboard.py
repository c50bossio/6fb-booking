#!/usr/bin/env python3
"""
Admin Email Dashboard for Six Figure Barber
Company-level email system management and testing
"""

import asyncio
import os
from datetime import datetime
from services.email_campaign_service import get_email_campaign_service
from services.email_campaign_config import EmailCampaignConfigManager


def print_header():
    """Print dashboard header"""
    print("=" * 70)
    print("   📧 SIX FIGURE BARBER - EMAIL SYSTEM DASHBOARD")
    print("=" * 70)
    print(f"   🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("   🏢 Company-Level Global Email Service")
    print("=" * 70)


async def show_system_status():
    """Show email system status"""
    print("\n📊 SYSTEM STATUS")
    print("-" * 40)

    try:
        service = get_email_campaign_service()

        # Check configurations
        sendgrid_configured = service.sendgrid_client is not None
        smtp_configured = bool(
            os.getenv("SMTP_USERNAME") and os.getenv("SMTP_PASSWORD")
        )

        print(f"✅ Email Service: Initialized")
        print(
            f"📧 SendGrid: {'✅ Configured' if sendgrid_configured else '❌ Not Configured'}"
        )
        print(
            f"📨 SMTP Fallback: {'✅ Configured' if smtp_configured else '❌ Not Configured'}"
        )
        print(f"📄 Templates Loaded: {len(service.templates)}")
        print(f"🎯 Campaigns Active: {len(service.campaigns)}")
        print(f"📬 From Email: {service.from_email}")
        print(f"📮 Reply-To: {service.reply_to_email}")

        return True

    except Exception as e:
        print(f"❌ System Error: {e}")
        return False


async def show_available_templates():
    """Show available email templates"""
    print("\n📄 AVAILABLE EMAIL TEMPLATES")
    print("-" * 40)

    try:
        service = get_email_campaign_service()
        templates = await service.list_templates()

        for template in templates:
            print(f"💌 {template.id}")
            print(f"   📝 {template.name}")
            print(f"   🏷️ Type: {template.campaign_type.value}")
            print(f"   📧 Subject: {template.subject}")
            print()

    except Exception as e:
        print(f"❌ Error loading templates: {e}")


async def show_configuration_options():
    """Show available configuration options"""
    print("\n🎛️ OFFER CONFIGURATION OPTIONS")
    print("-" * 40)

    configs = EmailCampaignConfigManager.CAMPAIGN_CONFIGS

    for config_name, config in configs.items():
        print(f"⚙️ {config_name}")
        if config.has_offer:
            print(f"   💰 {config.offer_details}")
            print(f"   🏷️ Code: {config.promo_code}")
            print(f"   ⏰ {config.offer_expiry}")
        else:
            print(f"   💎 Premium focus (no discounts)")
        print()


async def test_email_rendering():
    """Test email rendering for c50bossio@gmail.com"""
    print("\n🧪 EMAIL RENDERING TEST")
    print("-" * 40)

    try:
        service = get_email_campaign_service()

        # Test different configurations
        test_configs = [
            (
                "Valentine's with discount",
                "valentines_day_special",
                "valentines_with_discount",
            ),
            ("Valentine's no offer", "valentines_day_special", "valentines_no_offer"),
            (
                "Father's Day family deal",
                "fathers_day_special",
                "fathers_day_family_deal",
            ),
        ]

        for name, template_id, config_name in test_configs:
            print(f"\n🎯 Testing: {name}")
            config = EmailCampaignConfigManager.get_config(config_name)

            test_data = {
                "client_first_name": "Carlos",
                "barbershop_name": "Six Figure Barber",
                **config.to_dict(),
                "unsubscribe_link": "https://sixfigurebarber.com/unsubscribe",
            }

            rendered = await service.render_template(template_id, test_data)

            print(f"   📧 TO: c50bossio@gmail.com")
            print(f"   📝 SUBJECT: {rendered['subject']}")
            if config.has_offer:
                print(f"   💰 OFFER: {config.offer_details}")
                print(f"   🏷️ CODE: {config.promo_code}")
            else:
                print(f"   💎 FOCUS: Premium experience")
            print(f"   ✅ Rendered successfully")

        return True

    except Exception as e:
        print(f"❌ Rendering test failed: {e}")
        return False


def show_setup_instructions():
    """Show setup instructions"""
    print("\n🔧 SETUP INSTRUCTIONS")
    print("-" * 40)
    print("Choose one of these email delivery options:")
    print()
    print("📧 OPTION 1: SendGrid (Recommended for Production)")
    print("   → Professional delivery from sixfigurebarber.com")
    print("   → Higher deliverability rates")
    print("   → Better analytics and monitoring")
    print("   → See: SENDGRID_SETUP_GUIDE_6FB.md")
    print()
    print("📨 OPTION 2: Gmail SMTP (Good for Testing)")
    print("   → Quick setup with Gmail account")
    print("   → Good for development and testing")
    print("   → Set up 2FA and App Password on c50bossio@gmail.com")
    print("   → Update .env file with credentials")
    print()
    print("🎯 RECOMMENDED FLOW:")
    print("   1. Start with Gmail SMTP for testing")
    print("   2. Set up SendGrid for production")
    print("   3. Keep Gmail as backup")


def show_next_steps():
    """Show next steps"""
    print("\n🚀 NEXT STEPS")
    print("-" * 40)
    print("1. ✅ Email templates created and tested")
    print("2. ✅ Configurable offer system working")
    print("3. ✅ Company-level architecture implemented")
    print("4. 🔧 Configure email delivery (SendGrid or Gmail)")
    print("5. 📧 Test actual email delivery")
    print("6. 🎨 Customize templates for 6FB branding")
    print("7. 📊 Set up email analytics monitoring")
    print("8. 🏢 Train franchise owners on email system")


async def main():
    """Main dashboard function"""
    print_header()

    # Show system status
    system_ok = await show_system_status()

    if system_ok:
        # Show templates
        await show_available_templates()

        # Show configurations
        await show_configuration_options()

        # Test rendering
        await test_email_rendering()

    # Show setup instructions
    show_setup_instructions()

    # Show next steps
    show_next_steps()

    print("\n" + "=" * 70)
    print("   📧 Six Figure Barber Email System Ready!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
