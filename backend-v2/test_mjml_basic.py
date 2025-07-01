#!/usr/bin/env python3
"""
Basic MJML template test for BookedBarber
"""
import sys
import os
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.mjml_compiler import get_mjml_compiler

def test_mjml_basic():
    """Test basic MJML compilation"""
    print("🧪 Testing MJML Template Compilation...")
    
    try:
        compiler = get_mjml_compiler()
        
        # Test context with all required variables
        context = {
            'title': 'Appointment Confirmed',
            'preview_text': 'Your appointment at BookedBarber is confirmed',
            'subtitle': 'Professional Barber Services',
            'client_name': 'John Doe',
            'service_name': 'Premium Haircut',
            'appointment_date': 'December 15, 2025',
            'appointment_time': '2:00 PM',
            'duration': 60,
            'price': 75.00,
            'barber_name': 'Mike Johnson',
            'business_name': 'BookedBarber',
            'business_address': '123 Main St, City, ST 12345',
            'business_phone': '(555) 123-4567',
            'business_website': 'https://bookedbarber.com',
            'current_year': datetime.now().year,
            'calendar_link': 'https://bookedbarber.com/calendar/add',
            'directions_link': 'https://maps.google.com/directions',
            'qr_code_url': 'https://bookedbarber.com/qr/checkin/123',
            'manage_appointment_url': 'https://bookedbarber.com/appointments/123',
            'unsubscribe_url': 'https://bookedbarber.com/unsubscribe/token123',
            'preferences_url': 'https://bookedbarber.com/preferences/token123'
        }
        
        # Compile template
        html_content, plain_text = compiler.compile_template(
            'appointment_confirmation.mjml',
            context
        )
        
        print("✅ MJML template compiled successfully!")
        print(f"   📄 HTML content: {len(html_content)} characters")
        print(f"   📝 Plain text: {len(plain_text)} characters")
        
        # Check for expected content
        expected_content = [
            'BookedBarber',
            'John Doe',
            'Premium Haircut',
            '$75.00',
            'December 15, 2025',
            '2:00 PM'
        ]
        
        missing_content = []
        for expected in expected_content:
            if expected not in html_content:
                missing_content.append(expected)
        
        if missing_content:
            print(f"⚠️  Missing expected content: {missing_content}")
        else:
            print("✅ All expected content found in compiled template")
        
        # Save preview
        preview_html = compiler.preview_template('appointment_confirmation.mjml', context)
        with open('email_preview.html', 'w') as f:
            f.write(preview_html)
        print("✅ Email preview saved as 'email_preview.html'")
        
        # Save just the email HTML for testing
        with open('email_compiled.html', 'w') as f:
            f.write(html_content)
        print("✅ Compiled email saved as 'email_compiled.html'")
        
        return True
        
    except Exception as e:
        print(f"❌ MJML compilation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 BookedBarber MJML Template Test")
    print("=" * 40)
    
    success = test_mjml_basic()
    
    if success:
        print("\n🎉 Test completed successfully!")
        print("📧 Check the generated HTML files to see the email design")
        print("💡 You can open 'email_preview.html' in a browser to preview the email")
    else:
        print("\n❌ Test failed. Check the error messages above.")