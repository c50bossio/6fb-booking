# Creating Admin Account on Render

Since direct database connections from local machines to Render PostgreSQL can have SSL issues, follow these steps to create an admin account:

## Option 1: Using Render Shell (Recommended)

1. Go to your Render Dashboard: https://dashboard.render.com
2. Navigate to your backend service (`sixfb-backend`)
3. Click on the "Shell" tab
4. Run the following command:

```bash
python create_admin_render_shell.py
```

This will create an admin user with:
- Email: `c50bossio@gmail.com`
- Password: `Welcome123!`

## Option 2: Manual Python Commands in Render Shell

If the script above doesn't work, you can run these commands directly:

1. Open Render Shell for your backend service
2. Copy and paste this entire block:

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import User
import bcrypt
from datetime import datetime

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

email = 'c50bossio@gmail.com'
password = 'Welcome123!'

# Hash password
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

# Check if user exists
user = db.query(User).filter(User.email == email).first()
if user:
    user.role = 'super_admin'
    user.hashed_password = hashed
    user.is_active = True
    user.is_verified = True
    user.permissions = ["*"]
    print("Updated existing user")
else:
    user = User(
        email=email,
        first_name='Chris',
        last_name='Bossio',
        hashed_password=hashed,
        role='super_admin',
        is_active=True,
        is_verified=True,
        permissions=["*"]
    )
    db.add(user)
    print("Created new user")

db.commit()
print(f"Admin ready! Email: {email}, Password: {password}")
```

## Option 3: Using curl from Local Machine

If your backend API is running and accessible, you can try creating a temporary endpoint or use existing endpoints.

## Testing the Admin Account

1. Go to: https://sixfb-backend.onrender.com/docs
2. Click the "Authorize" button (lock icon)
3. Enter:
   - Username: `c50bossio@gmail.com`
   - Password: `Welcome123!`
4. Click "Authorize"

## Important Security Notes

⚠️ **Change the password immediately after first login!**

The default password `Welcome123!` should only be used for initial setup. Once logged in:
1. Use the user management endpoints to update your password
2. Consider adding additional admin users with unique credentials
3. Remove or disable any temporary admin accounts

## Troubleshooting

If you're still having issues:

1. **Check if the backend is running**: 
   - Visit https://sixfb-backend.onrender.com/health

2. **Check Render logs**:
   - Go to your Render dashboard
   - Click on "Logs" tab
   - Look for any database connection errors

3. **Verify PostgreSQL is running**:
   - Check your PostgreSQL service in Render
   - Ensure it's active and healthy

4. **SSL Connection Issues**:
   - The backend should already be configured to handle SSL
   - Check `main.py` for proper DATABASE_URL handling