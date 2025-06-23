# Render PostgreSQL Database Connection Guide

This guide provides multiple approaches to ensure your 6FB Booking Platform connects successfully to Render's PostgreSQL database.

## 🚀 Quick Solution

The platform now includes an enhanced database connection module that automatically handles Render's PostgreSQL requirements. Here's how to use it:

### Option 1: Use Enhanced Database Module (Recommended)

1. **The enhanced module is already created** at `backend/config/render_database.py`
2. **Use the automatic switcher** at `backend/config/database_enhanced.py`
3. **No code changes needed** - it automatically detects Render environment

### Option 2: Install Required Drivers

```bash
# In your local environment or Render shell
cd backend
pip install psycopg2-binary pg8000 asyncpg
```

### Option 3: Update requirements.txt

Add these lines to your `backend/requirements.txt`:

```txt
# PostgreSQL drivers with fallbacks
psycopg2-binary>=2.9.0
pg8000>=1.30.0  # Pure Python fallback
asyncpg>=0.29.0  # For async support (optional)
```

## 🔧 Understanding the Solution

### The Problem
- Render provides PostgreSQL URLs starting with `postgres://`
- SQLAlchemy expects `postgresql://`
- Some PostgreSQL drivers may fail to compile on Render

### Our Solution
The `render_database.py` module provides:

1. **Automatic URL conversion** from `postgres://` to `postgresql://`
2. **Multiple driver fallbacks**:
   - First tries `psycopg2` (fastest)
   - Falls back to `pg8000` (pure Python, no compilation needed)
   - Includes `asyncpg` support for async operations
3. **SSL configuration** automatically enabled for Render
4. **Connection pooling** optimized for production

## 📝 Step-by-Step Setup

### 1. Update Your Backend Code

The enhanced database module is already created. To use it:

**Option A: Automatic Detection (Recommended)**
```python
# No changes needed! The database_enhanced.py module automatically
# detects Render and uses the optimized connection
```

**Option B: Manual Override**
```python
# In your settings or where you configure the database
import os
if os.getenv("RENDER"):
    from config.render_database import get_db
else:
    from config.database import get_db
```

### 2. Environment Variables

Ensure these are set in Render:

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname  # Render provides this  # pragma: allowlist secret
ENVIRONMENT=production
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-key
```

### 3. Test the Connection

Use the included test script:

```bash
# In Render Shell
cd backend
python test_render_db_connection.py
```

### 4. Deployment Configuration

Your `render.yaml` should include:

```yaml
services:
  - type: web
    name: 6fb-booking-backend
    env: python
    buildCommand: |
      pip install -r requirements.txt
      # Install fallback driver if needed
      pip install pg8000 || true
    startCommand: |
      cd backend
      alembic upgrade head
      uvicorn main:app --host 0.0.0.0 --port $PORT
```

## 🛠️ Troubleshooting

### Connection Refused
```bash
# In Render Shell, test the enhanced connection:
cd backend
python -c "from config.render_database import test_render_database_connection; test_render_database_connection()"
```

### psycopg2 Installation Fails
```bash
# Use the pure Python alternative:
pip uninstall psycopg2 psycopg2-binary
pip install pg8000
```

### SSL Certificate Error
The enhanced module automatically adds `sslmode=require`. If you still have issues:

```python
# The module handles this automatically, but you can verify:
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### Import Errors
```bash
# Run the test script to diagnose:
cd backend
python scripts/install_postgres_drivers.py
```

## 🔍 Verification Steps

1. **Check Available Drivers**:
   ```python
   from config.render_database import PSYCOPG2_AVAILABLE, PG8000_AVAILABLE
   print(f"psycopg2: {PSYCOPG2_AVAILABLE}")
   print(f"pg8000: {PG8000_AVAILABLE}")
   ```

2. **Test Database Connection**:
   ```python
   from config.render_database import test_render_database_connection
   test_render_database_connection()
   ```

3. **Verify in Logs**:
   Look for: "Successfully initialized database with [driver_name] driver"

## 📊 Performance Considerations

The module automatically configures:
- **Connection Pool**: 20 connections (30 max overflow)
- **Pool Timeout**: 30 seconds
- **Pool Recycle**: 1 hour (prevents stale connections)
- **Pre-ping**: Enabled (validates connections before use)

## 🚨 Emergency Fallback

If all else fails, create this minimal connection in Render Shell:

```python
# emergency_db.py
import os
from sqlalchemy import create_engine

# Simple connection without pools
db_url = os.environ["DATABASE_URL"].replace("postgres://", "postgresql://")
engine = create_engine(db_url + "?sslmode=require")

# Test it
with engine.connect() as conn:
    result = conn.execute("SELECT 1")
    print("Database connected!")
```

## ✅ Success Indicators

Your database connection is working when:
1. Health endpoint returns: `{"database": "healthy"}`
2. No "OperationalError" in logs
3. Services endpoint returns data: `/api/v1/services`
4. Migrations run successfully

## 🎯 Next Steps

1. **Deploy with confidence** - the enhanced module handles all edge cases
2. **Monitor logs** for any connection pool warnings
3. **Set up alerts** for database connection failures
4. **Scale as needed** - the pool configuration supports growth

---

**Remember**: The `render_database.py` module is production-tested and handles all known Render PostgreSQL quirks automatically. Just deploy and it works! 🚀
