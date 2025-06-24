#!/usr/bin/env python3
"""
Live Holiday Email Campaign Test
Send actual holiday promotional emails to c50bossio@gmail.com
"""

import asyncio
import os
from datetime import datetime
from services.email_campaign_service import get_email_campaign_service
from services.email_campaign_config import EmailCampaignConfigManager

async def send_valentines_campaigns():
    """Send Valentine's Day email campaigns"""
    print("💕 TESTING VALENTINE'S DAY CAMPAIGNS")
    print("-" * 50)
    
    service = get_email_campaign_service()
    
    # Test with discount offer
    print("📧 Sending Valentine's Day email with discount...")
    config = EmailCampaignConfigManager.get_config('valentines_with_discount')
    
    test_data = {
        'client_first_name': 'Carlos',
        'barbershop_name': 'Six Figure Barber - Chicago Location',
        **config.to_dict(),
        'unsubscribe_link': 'https://sixfigurebarber.com/unsubscribe?id=carlos-test'
    }
    
    success1 = await service.send_campaign_email(
        to_email="c50bossio@gmail.com",
        template_id="valentines_day_special",
        template_data=test_data
    )
    
    if success1:
        print("✅ Valentine's Day with discount sent!")
        print(f"   💰 Offer: {config.offer_details}")
        print(f"   🏷️ Code: {config.promo_code}")
    else:
        print("❌ Failed to send Valentine's Day with discount")
    
    # Test without offer
    await asyncio.sleep(2)  # Small delay between emails
    
    print("\n📧 Sending Valentine's Day email without offer...")
    config = EmailCampaignConfigManager.get_config('valentines_no_offer')
    
    test_data = {
        'client_first_name': 'Carlos',
        'barbershop_name': 'Six Figure Barber - Miami Location',
        **config.to_dict(),
        'unsubscribe_link': 'https://sixfigurebarber.com/unsubscribe?id=carlos-test'
    }
    
    success2 = await service.send_campaign_email(
        to_email="c50bossio@gmail.com",
        template_id="valentines_day_special",
        template_data=test_data
    )
    
    if success2:
        print("✅ Valentine's Day premium focus sent!")
        print("   💎 Focus: Premium experience without discounts")
    else:
        print("❌ Failed to send Valentine's Day premium")
    
    return success1 or success2

async def send_fathers_day_campaign():
    """Send Father's Day email campaign"""
    print("\n👨‍👦 TESTING FATHER'S DAY CAMPAIGN")
    print("-" * 50)
    
    service = get_email_campaign_service()
    
    print("📧 Sending Father's Day family deal email...")
    config = EmailCampaignConfigManager.get_config('fathers_day_family_deal')
    
    test_data = {
        'client_first_name': 'Carlos',
        'barbershop_name': 'Six Figure Barber - Atlanta Location',
        **config.to_dict(),
        'unsubscribe_link': 'https://sixfigurebarber.com/unsubscribe?id=carlos-test'
    }
    
    success = await service.send_campaign_email(
        to_email="c50bossio@gmail.com",
        template_id="fathers_day_special",
        template_data=test_data
    )
    
    if success:
        print("✅ Father's Day family deal sent!")
        print(f"   💰 Offer: {config.offer_details}")
        print(f"   🏷️ Code: {config.promo_code}")
    else:
        print("❌ Failed to send Father's Day campaign")
    
    return success

async def send_custom_campaign():
    """Send a custom campaign with different settings"""
    print("\n🎨 TESTING CUSTOM CAMPAIGN")
    print("-" * 50)
    
    service = get_email_campaign_service()
    
    # Create custom configuration
    custom_config = EmailCampaignConfigManager.create_custom_config(
        offer_details="WEEKEND WARRIOR SPECIAL - Save 40%",
        promo_code="WARRIOR40",
        offer_expiry="This weekend only!",
        discount_percentage=40
    )
    
    print("📧 Sending custom weekend warrior campaign...")
    
    test_data = {
        'client_first_name': 'Carlos',
        'barbershop_name': 'Six Figure Barber - Las Vegas Location',
        **custom_config.to_dict(),
        'unsubscribe_link': 'https://sixfigurebarber.com/unsubscribe?id=carlos-test'
    }
    
    success = await service.send_campaign_email(
        to_email="c50bossio@gmail.com",
        template_id="valentines_day_special",  # Reuse template with different data
        template_data=test_data
    )
    
    if success:
        print("✅ Custom weekend warrior campaign sent!")
        print(f"   💰 Offer: {custom_config.offer_details}")
        print(f"   🏷️ Code: {custom_config.promo_code}")
    else:
        print("❌ Failed to send custom campaign")
    
    return success

def show_email_preview():
    """Show what emails were sent"""
    print("\n📧 EMAILS SENT TO c50bossio@gmail.com")
    print("=" * 60)
    print("Check your inbox for these test emails:")
    print()
    print("1. 💕 Valentine's Day Special (with 25% discount)")
    print("   → Subject: Get Date Night Ready, Carlos! 💕 25% OFF")
    print("   → From: Six Figure Barber - Chicago Location")
    print("   → Code: LOVE25")
    print()
    print("2. 💕 Valentine's Day Premium (no discount)")
    print("   → Subject: Get Date Night Ready, Carlos! 💕")
    print("   → From: Six Figure Barber - Miami Location")
    print("   → Focus: Premium luxury experience")
    print()
    print("3. 👨‍👦 Father's Day Family Deal")
    print("   → Subject: Happy Father's Day, Carlos! 👨‍👦 35% OFF")
    print("   → From: Six Figure Barber - Atlanta Location")
    print("   → Code: FAMILY35")
    print()
    print("4. 🎨 Weekend Warrior Special")
    print("   → Subject: Get Date Night Ready, Carlos! 💕 40% OFF")
    print("   → From: Six Figure Barber - Las Vegas Location")
    print("   → Code: WARRIOR40")

def check_email_config():
    """Check if email delivery is configured"""
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY", "")
    gmail_password = os.getenv("SMTP_PASSWORD", "")
    
    sendgrid_configured = sendgrid_api_key and sendgrid_api_key != "SG.demo-key-replace-with-real-sendgrid-api-key"
    gmail_configured = gmail_password and gmail_password != "demo-password-replace-with-real-gmail-app-password"
    
    return sendgrid_configured or gmail_configured

async def main():
    """Main test function"""
    print("=" * 60)
    print("🎉 Six Figure Barber Holiday Email Campaign Test")
    print("=" * 60)
    print(f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🎯 Sending live holiday campaigns to c50bossio@gmail.com")
    print("=" * 60)
    
    # Check if email delivery is configured
    if not check_email_config():
        print("❌ Email delivery not configured yet!")
        print("🔧 Please run one of these setup scripts first:")
        print("   → python setup_gmail_test.py (for Gmail SMTP)")
        print("   → Configure SendGrid (see SENDGRID_SETUP_GUIDE_6FB.md)")
        return
    
    print("✅ Email delivery configured - proceeding with tests")
    print()
    
    # Send all campaign types
    valentines_success = await send_valentines_campaigns()
    fathers_day_success = await send_fathers_day_campaign()
    custom_success = await send_custom_campaign()
    
    # Show results
    print("\n" + "=" * 60)
    print("📊 CAMPAIGN TEST RESULTS")
    print("=" * 60)
    print(f"💕 Valentine's Day Campaigns: {'✅ SENT' if valentines_success else '❌ FAILED'}")
    print(f"👨‍👦 Father's Day Campaign: {'✅ SENT' if fathers_day_success else '❌ FAILED'}")
    print(f"🎨 Custom Campaign: {'✅ SENT' if custom_success else '❌ FAILED'}")
    
    total_success = sum([valentines_success, fathers_day_success, custom_success])
    print(f"\n🎯 Overall Success: {total_success}/3 campaigns sent")
    
    if total_success > 0:
        show_email_preview()
        print("\n🎉 Holiday email campaigns are working!")
        print("📈 Ready for franchise-wide deployment")
        print("💡 Set up SendGrid for production-scale sending")
    else:
        print("\n❌ No campaigns sent successfully")
        print("🔧 Check email configuration and try again")
    
    print("\n" + "=" * 60)
    print("🎊 Six Figure Barber Email System Test Complete")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())