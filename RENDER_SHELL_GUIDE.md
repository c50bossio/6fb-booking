# Finding Shell Access on Render

## Where to Look:

### 1. **Connect Tab Method**
- Go to your PostgreSQL database on Render
- Click the **"Connect"** tab (not Shell)
- Look for **"PSQL Command"** section
- Copy the command that looks like:
  ```
  PGPASSWORD=xxxxx psql -h oregon-postgres.render.com -U your_db_user your_db_name
  ```

### 2. **Use External Connection URL**
- Still in the **"Connect"** tab
- Find **"External Database URL"**
- Copy the URL (starts with `postgres://`)
- Use it locally:
  ```bash
  psql "postgres://your_connection_url_here"
  ```

### 3. **Quick Alternative - Use Our Reset Endpoint**
Just open this in your browser:
```
https://sixfb-backend-v0bq.onrender.com/api/auth/reset-admin-password?secret=reset-6fb-admin-2024
```

## If Shell Tab is Missing:

Render removed the Shell tab for some database plans. Instead:

1. **Install psql locally** (if not installed):
   - Mac: `brew install postgresql`
   - Windows: Download from postgresql.org
   - Linux: `sudo apt-get install postgresql-client`

2. **Connect from your terminal**:
   - Copy the External Database URL from Render
   - Run: `psql "YOUR_DATABASE_URL"`
   - Paste the SQL command

## The SQL Command to Run:
```sql
UPDATE users SET hashed_password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQaXUIpaPE4q' WHERE email = 'c50bossio@gmail.com';
```

This sets your password to: **admin123**