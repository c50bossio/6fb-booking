# Admin Scripts for 6FB Booking Platform

This directory contains administrative scripts for managing the 6FB Booking Platform in production.

## Available Scripts

### 1. create_admin_user.py
Creates admin users in the production database.

**Usage:**
```bash
# Basic usage (will prompt for password)
python create_admin_user.py --email admin@example.com --name "Admin Name"

# With password provided
python create_admin_user.py --email admin@example.com --password your-secure-password --name "Admin Name"

# Using custom environment file
python create_admin_user.py --email admin@example.com --name "Admin Name" --env .env.production
```

**Features:**
- Creates admin users with full access
- Updates existing users to admin if they already exist
- Validates password strength (minimum 8 characters)
- Supports different environment configurations

### 2. populate_test_data.py
Populates the database with test data for development and testing.

**Usage:**
```bash
# Populate all test data
python populate_test_data.py

# Populate specific data types
python populate_test_data.py --type services
python populate_test_data.py --type barbers
python populate_test_data.py --type locations

# Using custom environment file
python populate_test_data.py --env .env.production
```

**Test Data Includes:**
- **Services**: 6 common barbershop services with pricing
- **Barbers**: 4 test barbers with different specialties
- **Locations**: 3 San Francisco locations with operating hours

### 3. health-check.py
Comprehensive health check script that tests all major endpoints.

**Usage:**
```bash
# Basic health check (public endpoints only)
python health-check.py --url https://your-app.onrender.com

# With authentication (tests protected endpoints)
python health-check.py --url https://your-app.onrender.com --email admin@example.com --password your-password

# Using auth token directly
python health-check.py --url https://your-app.onrender.com --token your-jwt-token

# Save results to file
python health-check.py --url https://your-app.onrender.com --save --output results.json
```

**Health Checks Include:**
- Basic connectivity tests
- Public endpoint availability
- Authentication flow
- Protected endpoint access (with auth)
- Database connectivity verification
- Performance metrics
- Error rate analysis

### 4. render-deploy-helper.sh
Render-specific deployment helper for common tasks.

**Usage:**
```bash
# Make executable
chmod +x render-deploy-helper.sh

# Run specific task
./render-deploy-helper.sh migrate
./render-deploy-helper.sh admin
./render-deploy-helper.sh populate
./render-deploy-helper.sh health
./render-deploy-helper.sh setup  # Run all tasks

# Interactive mode
./render-deploy-helper.sh
```

## Production Deployment Workflow

### Initial Setup (First Deployment)

1. **Deploy to Render**
   ```bash
   git push origin main
   ```

2. **Run Database Migrations**
   ```bash
   # SSH into Render or use Render Shell
   cd backend
   alembic upgrade head
   ```

3. **Create Admin User**
   ```bash
   python scripts/admin/create_admin_user.py \
     --email admin@yourdomain.com \
     --name "Your Name"
   ```

4. **Populate Initial Data** (Optional)
   ```bash
   python scripts/admin/populate_test_data.py --type locations
   python scripts/admin/populate_test_data.py --type services
   ```

5. **Verify Health**
   ```bash
   python scripts/health-check.py --url https://your-app.onrender.com
   ```

### Regular Maintenance

1. **Health Monitoring**
   ```bash
   # Run periodic health checks
   python scripts/health-check.py --url https://your-app.onrender.com --save
   ```

2. **Create Additional Admins**
   ```bash
   python scripts/admin/create_admin_user.py --email newadmin@example.com --name "New Admin"
   ```

3. **Database Maintenance**
   ```bash
   # Check for pending migrations
   alembic current
   alembic history

   # Apply new migrations
   alembic upgrade head
   ```

## Environment Variables

These scripts respect the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_EMAIL`: Default admin email for automated setup
- `ADMIN_PASSWORD`: Default admin password for automated setup
- `ADMIN_NAME`: Default admin name
- `HEALTH_CHECK_URL`: URL for health checks

## Security Notes

1. **Never commit passwords** or sensitive data to version control
2. **Use strong passwords** for admin accounts (minimum 8 characters)
3. **Rotate credentials** regularly
4. **Monitor access logs** for unauthorized attempts
5. **Use environment variables** for sensitive configuration

## Troubleshooting

### Database Connection Issues
```bash
# Test database connection
python -c "from config.settings import get_settings; print(get_settings().DATABASE_URL)"
```

### Script Import Errors
```bash
# Ensure you're in the backend directory
cd backend
export PYTHONPATH=$PYTHONPATH:$(pwd)
```

### Permission Errors on Render
```bash
# Make scripts executable
chmod +x scripts/admin/*.py
chmod +x scripts/*.py
chmod +x scripts/*.sh
```

## Monitoring and Alerts

Set up monitoring for:
1. Health check endpoint responses
2. Database connection pool usage
3. API response times
4. Error rates
5. Admin action audit logs

## Support

For issues or questions:
1. Check application logs in Render Dashboard
2. Run health checks to identify problems
3. Review error messages and stack traces
4. Contact system administrator for database access
