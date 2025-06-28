#!/bin/bash
# Script to create admin user on Render with proper database URL

# Render PostgreSQL connection string
export DATABASE_URL="postgresql://sixfb_user:mxQrZ0HDH0MjYQQK0iOkwRvhCuLGdNON@dpg-ct7qsoa3esus73ff5710-a.oregon-postgres.render.com/sixfb_db"

# Run the create_admin script with command line arguments
# You can either provide all arguments or let it prompt you
echo "Creating admin user for 6FB Platform..."
echo ""
echo "Option 1: Run with command line arguments:"
echo "python3 scripts/create_admin.py --email admin@example.com --first-name Admin --last-name User --password YourPassword123"
echo ""
echo "Option 2: Run interactively (will prompt for details):"
echo "python3 scripts/create_admin.py"
echo ""
echo "Running interactively now..."

python3 scripts/create_admin.py
