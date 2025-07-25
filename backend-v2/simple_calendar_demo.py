#!/usr/bin/env python3
"""
Simple Calendar Demo - Direct Database Setup
"""
import os
import webbrowser
import sqlite3
from datetime import datetime
from passlib.context import CryptContext

# Test credentials
TEST_EMAIL = "calendar-demo@6fb.com"
TEST_PASSWORD = "Demo123!@#"
TEST_NAME = "Calendar Demo User"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def setup_test_data():
    """Setup test data directly in SQLite database"""
    print("🚀 Calendar Demo Setup")
    print("=" * 50)
    
    # Connect to database
    db_path = "6fb_booking.db"  # Main database file
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create test user
        print("\n📝 Creating test user...")
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (TEST_EMAIL,))
        existing = cursor.fetchone()
        
        if existing:
            user_id = existing[0]
            print(f"   User already exists (ID: {user_id})")
        else:
            # Create new user
            hashed_password = pwd_context.hash(TEST_PASSWORD)
            cursor.execute("""
                INSERT INTO users (email, name, hashed_password, role, is_active, created_at, timezone)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (TEST_EMAIL, TEST_NAME, hashed_password, "barber", True, datetime.now(), "UTC"))
            user_id = cursor.lastrowid
            print(f"   ✅ Created user (ID: {user_id})")
        
        # Create services if needed
        print("\n📋 Setting up services...")
        cursor.execute("SELECT COUNT(*) FROM services")
        service_count = cursor.fetchone()[0]
        
        if service_count == 0:
            services = [
                ("Haircut", 30, 45.0, "Classic men's haircut"),
                ("Beard Trim", 20, 25.0, "Professional beard trimming"),
                ("Hair + Beard", 45, 65.0, "Complete grooming package"),
                ("Hair Design", 60, 85.0, "Custom design and styling"),
            ]
            for name, duration, price, desc in services:
                cursor.execute("""
                    INSERT INTO services (name, duration, price, description)
                    VALUES (?, ?, ?, ?)
                """, (name, duration, price, desc))
            print(f"   ✅ Created {len(services)} services")
        else:
            print(f"   Found {service_count} existing services")
        
        # Create test client
        print("\n👤 Setting up test client...")
        cursor.execute("SELECT id FROM clients WHERE email = ?", ("john.doe@example.com",))
        client_result = cursor.fetchone()
        
        if client_result:
            client_id = client_result[0]
            print(f"   Client already exists (ID: {client_id})")
        else:
            cursor.execute("""
                INSERT INTO clients (first_name, last_name, email, phone, created_by_id)
                VALUES (?, ?, ?, ?, ?)
            """, ("John", "Doe", "john.doe@example.com", "+1234567890", user_id))
            client_id = cursor.lastrowid
            print(f"   ✅ Created test client (ID: {client_id})")
        
        # Create appointments for today
        print("\n📅 Creating test appointments...")
        
        # Get service IDs
        cursor.execute("SELECT id, name, price FROM services LIMIT 4")
        services = cursor.fetchall()
        
        if services:
            today = datetime.now().date()
            appointments_created = 0
            
            # Create appointments at different times
            times = [(10, 0), (11, 0), (14, 0), (15, 30)]
            statuses = ["completed", "completed", "confirmed", "confirmed"]
            
            for i, ((hour, minute), status) in enumerate(zip(times, statuses)):
                if i < len(services):
                    service_id, service_name, price = services[i]
                    start_time = datetime.combine(today, datetime.min.time()).replace(hour=hour, minute=minute)
                    
                    # Check if appointment exists
                    cursor.execute("""
                        SELECT id FROM appointments 
                        WHERE barber_id = ? AND start_time = ?
                    """, (user_id, start_time))
                    
                    if not cursor.fetchone():
                        cursor.execute("""
                            INSERT INTO appointments 
                            (user_id, barber_id, client_id, service_id, service_name, 
                             start_time, duration_minutes, price, status, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (user_id, user_id, client_id, service_id, service_name,
                              start_time, 30, price, status, datetime.now()))
                        appointments_created += 1
            
            print(f"   ✅ Created {appointments_created} appointments")
            
            # Calculate today's revenue
            cursor.execute("""
                SELECT SUM(price) FROM appointments 
                WHERE barber_id = ? 
                AND DATE(start_time) = ? 
                AND status = 'completed'
            """, (user_id, today))
            revenue = cursor.fetchone()[0] or 0
            print(f"   💰 Today's revenue: ${revenue:.2f}")
        
        # Commit all changes
        conn.commit()
        print("\n✅ Database setup complete!")
        
        return user_id
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        return None
    finally:
        conn.close()

def create_auth_html(user_id):
    """Create HTML page that sets auth token and redirects to calendar"""
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>Calendar Demo - Loading...</title>
    <meta charset="utf-8">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }}
        .loading {{
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        .spinner {{
            width: 50px;
            height: 50px;
            border: 3px solid #e0e0e0;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }}
        @keyframes spin {{
            to {{ transform: rotate(360deg); }}
        }}
        h2 {{ color: #333; margin: 10px 0; }}
        p {{ color: #666; }}
        .info {{
            margin-top: 20px;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 4px;
            text-align: left;
            max-width: 400px;
        }}
        .info strong {{ color: #1976d2; }}
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <h2>Setting up Calendar Demo...</h2>
        <p>Preparing your test environment</p>
        
        <div class="info">
            <strong>Test Credentials:</strong><br>
            Email: {TEST_EMAIL}<br>
            Password: {TEST_PASSWORD}<br><br>
            
            <strong>What's happening:</strong><br>
            1. Creating authentication token ✓<br>
            2. Setting up browser session...<br>
            3. Redirecting to calendar...
        </div>
    </div>
    
    <script>
        // Create a mock token (in production this would come from the backend)
        const mockToken = btoa(JSON.stringify({{
            user_id: {user_id},
            email: '{TEST_EMAIL}',
            role: 'barber',
            exp: Date.now() + 3600000
        }}));
        
        // Store auth data
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify({{
            id: {user_id},
            email: '{TEST_EMAIL}',
            name: '{TEST_NAME}',
            role: 'barber'
        }}));
        
        // Redirect to calendar after a short delay
        setTimeout(() => {{
            window.location.href = 'http://localhost:3000/calendar';
        }}, 2000);
    </script>
</body>
</html>"""
    
    # Save HTML file
    html_path = "calendar_demo_auth.html"
    with open(html_path, "w") as f:
        f.write(html_content)
    
    return html_path

def main():
    """Main demo setup"""
    try:
        # Setup database
        user_id = setup_test_data()
        if not user_id:
            print("\n❌ Failed to setup test data")
            return
        
        # Create auth HTML
        print("\n🌐 Creating authentication page...")
        html_path = create_auth_html(user_id)
        full_path = os.path.abspath(html_path)
        
        # Open in browser
        print(f"\n🚀 Opening calendar demo...")
        print(f"   File: {full_path}")
        webbrowser.open(f"file://{full_path}")
        
        print("\n✨ Demo setup complete!")
        print("\n📌 Next steps:")
        print("1. The browser will open with authentication")
        print("2. You'll be redirected to the calendar")
        print("3. Look for today's revenue counter in the header")
        print("4. Try the calendar features:")
        print("   - Drag appointments to reschedule")
        print("   - Click 'Sync' for Google Calendar")
        print("   - Click 'Conflicts' for conflict resolution")
        print("   - Click 'New Appointment' to create more")
        
        print(f"\n📧 Login credentials:")
        print(f"   Email: {TEST_EMAIL}")
        print(f"   Password: {TEST_PASSWORD}")
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()