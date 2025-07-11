#!/usr/bin/env python3
"""
Quick test script for landing page functionality.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas_new.landing_page import LandingPageConfig, LandingPagePresets
from services.landing_page_service import landing_page_service

def test_landing_page_config():
    """Test landing page configuration creation."""
    print("Testing LandingPageConfig creation...")
    
    config = LandingPageConfig(
        enabled=True,
        logo_url="https://example.com/logo.png",
        primary_color="#000000",
        accent_color="#FFD700",
        background_preset="professional_dark",
        custom_headline="Welcome to our barbershop!",
        show_testimonials=True,
        testimonial_source="gmb_auto"
    )
    
    print(f"✅ Config created successfully: {config.background_preset}")
    return config

def test_landing_page_presets():
    """Test landing page presets functionality."""
    print("\nTesting LandingPagePresets...")
    
    presets = LandingPagePresets.get_default_presets()
    
    print(f"✅ Found {len(presets.backgrounds)} background presets")
    for bg in presets.backgrounds:
        print(f"  - {bg.name}: {bg.description}")
    
    print(f"✅ Found {len(presets.testimonial_templates)} testimonial templates")
    for testimonial in presets.testimonial_templates:
        print(f"  - {testimonial['reviewer_name']}: {testimonial['review_text'][:50]}...")
    
    return presets

def test_landing_page_service():
    """Test landing page service functionality."""
    print("\nTesting LandingPageService...")
    
    # Test presets
    presets = landing_page_service.get_available_presets()
    print(f"✅ Service returned {len(presets.backgrounds)} presets")
    
    # Test generic testimonials
    testimonials = landing_page_service.get_generic_testimonials(limit=2)
    print(f"✅ Generated {len(testimonials)} generic testimonials")
    for testimonial in testimonials:
        print(f"  - {testimonial.reviewer_name} ({testimonial.rating}⭐): {testimonial.review_text[:40]}...")
    
    # Test URL generation
    landing_url = landing_page_service.generate_landing_page_url("premium-cuts")
    booking_url = landing_page_service.generate_booking_page_url("premium-cuts")
    print(f"✅ Landing URL: {landing_url}")
    print(f"✅ Booking URL: {booking_url}")
    
    return True

def main():
    """Run all tests."""
    print("🚀 Testing Landing Page Implementation")
    print("=" * 50)
    
    try:
        test_landing_page_config()
        test_landing_page_presets()
        test_landing_page_service()
        
        print("\n" + "=" * 50)
        print("✅ All tests passed! Landing page implementation is working.")
        print("\nNext steps:")
        print("1. Create a test organization with landing page enabled")
        print("2. Test the API endpoints")
        print("3. Test the frontend components")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()