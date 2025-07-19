import sqlite3
from passlib.context import CryptContext

# Create password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Connect to database
conn = sqlite3.connect('6fb_booking.db')
cursor = conn.cursor()

# Generate hash for Test123!
hashed_password = pwd_context.hash("Test123!")

# Update password for test@example.com
cursor.execute(
    "UPDATE users SET hashed_password = ? WHERE email = ?",
    (hashed_password, "test@example.com")
)

# Check if update was successful
if cursor.rowcount > 0:
    print(f"✅ Password updated for test@example.com")
    print(f"🔑 New password: Test123!")
else:
    print("❌ No user found with email test@example.com")

# Commit and close
conn.commit()
conn.close()