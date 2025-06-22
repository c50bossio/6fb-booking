#!/bin/bash

# 🚀 BookBarber API - Production Deployment Script
# Complete deployment script for api.bookbarber.com

set -e  # Exit on any error

echo "🚀 BookBarber API - Production Deployment"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-production}
DOMAIN=${DOMAIN:-api.bookbarber.com}
APP_PORT=${APP_PORT:-8000}
DB_TYPE=${DB_TYPE:-postgresql}
DEPLOY_METHOD=${DEPLOY_METHOD:-docker}

echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Domain: $DOMAIN${NC}"
echo -e "${BLUE}Port: $APP_PORT${NC}"
echo -e "${BLUE}Database: $DB_TYPE${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate secure secret
generate_secret() {
    python3 -c "import secrets; print(secrets.token_urlsafe(32))"
}

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local value
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        echo "${value:-$default}"
    else
        read -p "$prompt: " value
        echo "$value"
    fi
}

# Function to prompt for secret input
prompt_secret() {
    local prompt="$1"
    local value
    
    read -s -p "$prompt: " value
    echo ""
    echo "$value"
}

echo "📋 Step 1: Prerequisites Check"
echo "-----------------------------"

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✓ Python3 found: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Python3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

# Check pip
if command_exists pip3; then
    echo -e "${GREEN}✓ pip3 found${NC}"
else
    echo -e "${RED}✗ pip3 not found. Please install pip${NC}"
    exit 1
fi

# Check git (optional)
if command_exists git; then
    echo -e "${GREEN}✓ Git found${NC}"
else
    echo -e "${YELLOW}⚠ Git not found (optional)${NC}"
fi

echo ""

echo "📝 Step 2: Environment Configuration"
echo "-----------------------------------"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.template .env
fi

# Prompt for critical configuration
echo "Please provide the following configuration values:"
echo ""

# Database configuration
echo -e "${YELLOW}Database Configuration:${NC}"
if [ "$DB_TYPE" = "postgresql" ]; then
    DB_HOST=$(prompt_with_default "Database host" "localhost")
    DB_PORT=$(prompt_with_default "Database port" "5432")
    DB_NAME=$(prompt_with_default "Database name" "6fb_booking")
    DB_USER=$(prompt_with_default "Database user" "postgres")
    DB_PASS=$(prompt_secret "Database password")
    DATABASE_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"
else
    DATABASE_URL="sqlite:///./6fb_booking.db"
fi

# JWT Secret
echo -e "${YELLOW}Security Configuration:${NC}"
JWT_SECRET=$(prompt_with_default "JWT Secret Key (or press enter to generate)" "$(generate_secret)")

# Stripe Configuration
echo -e "${YELLOW}Stripe Configuration:${NC}"
STRIPE_SECRET_KEY=$(prompt_secret "Stripe Secret Key (sk_live_... for production)")
STRIPE_PUBLISHABLE_KEY=$(prompt_with_default "Stripe Publishable Key" "")
STRIPE_CONNECT_CLIENT_ID=$(prompt_with_default "Stripe Connect Client ID" "")
STRIPE_WEBHOOK_SECRET=$(prompt_with_default "Stripe Webhook Secret" "")

# Email Configuration
echo -e "${YELLOW}Email Configuration:${NC}"
echo "Choose email provider:"
echo "1) Gmail"
echo "2) SendGrid"
echo "3) Mailgun"
echo "4) AWS SES"
echo "5) Custom SMTP"
EMAIL_PROVIDER=$(prompt_with_default "Email provider (1-5)" "2")

case $EMAIL_PROVIDER in
    1)  # Gmail
        SMTP_SERVER="smtp.gmail.com"
        SMTP_PORT="587"
        SMTP_USERNAME=$(prompt_with_default "Gmail address" "")
        SMTP_PASSWORD=$(prompt_secret "Gmail App Password")
        FROM_EMAIL="$SMTP_USERNAME"
        ;;
    2)  # SendGrid
        SMTP_SERVER="smtp.sendgrid.net"
        SMTP_PORT="587"
        SMTP_USERNAME="apikey"
        SMTP_PASSWORD=$(prompt_secret "SendGrid API Key")
        FROM_EMAIL=$(prompt_with_default "From email address" "noreply@$DOMAIN")
        ;;
    3)  # Mailgun
        SMTP_SERVER="smtp.mailgun.org"
        SMTP_PORT="587"
        SMTP_USERNAME=$(prompt_with_default "Mailgun SMTP username" "")
        SMTP_PASSWORD=$(prompt_secret "Mailgun SMTP password")
        FROM_EMAIL=$(prompt_with_default "From email address" "noreply@$DOMAIN")
        ;;
    4)  # AWS SES
        SMTP_SERVER="email-smtp.us-east-1.amazonaws.com"
        SMTP_PORT="587"
        SMTP_USERNAME=$(prompt_with_default "AWS Access Key ID" "")
        SMTP_PASSWORD=$(prompt_secret "AWS Secret Access Key")
        FROM_EMAIL=$(prompt_with_default "From email address" "noreply@$DOMAIN")
        ;;
    5)  # Custom
        SMTP_SERVER=$(prompt_with_default "SMTP server" "")
        SMTP_PORT=$(prompt_with_default "SMTP port" "587")
        SMTP_USERNAME=$(prompt_with_default "SMTP username" "")
        SMTP_PASSWORD=$(prompt_secret "SMTP password")
        FROM_EMAIL=$(prompt_with_default "From email address" "")
        ;;
esac

echo ""

echo "🔧 Step 3: Updating Environment File"
echo "------------------------------------"

# Update .env file
cat > .env << EOF
# 6FB Booking Platform - Production Configuration
# Generated on $(date)

# Database
DATABASE_URL=$DATABASE_URL

# JWT & Security
SECRET_KEY=$JWT_SECRET
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Stripe
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
STRIPE_CONNECT_CLIENT_ID=$STRIPE_CONNECT_CLIENT_ID
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET

# Email
SMTP_SERVER=$SMTP_SERVER
SMTP_PORT=$SMTP_PORT
SMTP_USERNAME=$SMTP_USERNAME
SMTP_PASSWORD=$SMTP_PASSWORD
FROM_EMAIL=$FROM_EMAIL

# Application
ENVIRONMENT=$ENVIRONMENT
DEBUG=false
API_V1_STR=/api/v1
BACKEND_CORS_ORIGINS=["https://$DOMAIN","http://localhost:3000"]

# Payout Scheduler
DEFAULT_PAYOUT_METHOD=stripe_standard
DEFAULT_MINIMUM_PAYOUT=50
DEFAULT_HOLD_DAYS=2
SCHEDULER_TIMEZONE=America/New_York
EOF

echo -e "${GREEN}✓ Environment file updated${NC}"

echo ""

echo "📦 Step 4: Installing Dependencies"
echo "---------------------------------"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
else
    echo "Installing core dependencies..."
    pip install fastapi uvicorn sqlalchemy psycopg2-binary alembic python-jose[cryptography] passlib[bcrypt] python-multipart stripe apscheduler
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""

echo "🗄️ Step 5: Database Setup"
echo "-------------------------"

# Run database migrations
echo "Setting up database..."
python -c "
from config.database import engine, Base
from models import *
try:
    Base.metadata.create_all(bind=engine)
    print('✓ Database tables created successfully')
except Exception as e:
    print(f'✗ Database setup failed: {e}')
    exit(1)
"

echo ""

echo "🧪 Step 6: Configuration Test"
echo "-----------------------------"

echo "Testing configuration..."

# Test database connection
python -c "
import os
from config.database import SessionLocal
try:
    db = SessionLocal()
    db.execute('SELECT 1')
    db.close()
    print('✓ Database connection successful')
except Exception as e:
    print(f'✗ Database connection failed: {e}')
"

# Test Stripe configuration
python -c "
import os
import stripe
try:
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
    stripe.Account.list(limit=1)
    print('✓ Stripe connection successful')
except Exception as e:
    print(f'✗ Stripe connection failed: {e}')
"

echo ""

echo "🚀 Step 7: Service Setup"
echo "------------------------"

# Create systemd service file for production
if command_exists systemctl && [ "$ENVIRONMENT" = "production" ]; then
    SERVICE_FILE="/etc/systemd/system/6fb-api.service"
    
    echo "Creating systemd service..."
    
    sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=6FB Automated Payout API
After=network.target

[Service]
Type=exec
User=$(whoami)
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/uvicorn main:app --host 0.0.0.0 --port $APP_PORT --workers 4
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable 6fb-api
    
    echo -e "${GREEN}✓ Systemd service created${NC}"
fi

# Create nginx configuration (if nginx is available)
if command_exists nginx && [ "$ENVIRONMENT" = "production" ]; then
    NGINX_CONFIG="/etc/nginx/sites-available/6fb-api"
    
    echo "Creating nginx configuration..."
    
    sudo tee $NGINX_CONFIG > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL configuration (you'll need to add your certificates)
    # ssl_certificate /path/to/your/certificate.crt;
    # ssl_certificate_key /path/to/your/private.key;
    
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
EOF

    sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    
    echo -e "${GREEN}✓ Nginx configuration created${NC}"
fi

echo ""

echo "🔐 Step 8: SSL Certificate Setup"
echo "--------------------------------"

if command_exists certbot && [ "$ENVIRONMENT" = "production" ]; then
    read -p "Do you want to set up SSL certificate with Let's Encrypt? (y/n): " setup_ssl
    
    if [ "$setup_ssl" = "y" ]; then
        echo "Setting up SSL certificate..."
        sudo certbot --nginx -d $DOMAIN
        echo -e "${GREEN}✓ SSL certificate configured${NC}"
    fi
fi

echo ""

echo "🎯 Step 9: Final Steps"
echo "---------------------"

# Create startup script
cat > start.sh << 'EOF'
#!/bin/bash
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
EOF

chmod +x start.sh

# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
# Backup script for 6FB database
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

if [ "$DB_TYPE" = "postgresql" ]; then
    pg_dump $DATABASE_URL > $BACKUP_DIR/6fb_backup_$DATE.sql
else
    cp 6fb_booking.db $BACKUP_DIR/6fb_backup_$DATE.db
fi

echo "Backup created: $BACKUP_DIR/6fb_backup_$DATE"
EOF

chmod +x backup.sh

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo -e "${GREEN}Your 6FB Automated Payout System is ready!${NC}"
echo ""
echo "📍 Next Steps:"
echo "1. Start the application:"
if [ "$ENVIRONMENT" = "production" ] && command_exists systemctl; then
    echo "   sudo systemctl start 6fb-api"
    echo "   sudo systemctl status 6fb-api"
else
    echo "   ./start.sh"
fi
echo ""
echo "2. Test the configuration:"
echo "   curl http://localhost:$APP_PORT/health"
echo ""
echo "3. Set up your first compensation plan:"
echo "   https://$DOMAIN/docs"
echo ""
echo "4. Configure Stripe Connect webhooks:"
echo "   Webhook URL: https://$DOMAIN/api/v1/webhooks/stripe"
echo ""
echo "5. Test email notifications:"
echo "   POST https://$DOMAIN/api/v1/test-payout/test-email"
echo ""
echo -e "${YELLOW}Important Security Notes:${NC}"
echo "• Keep your .env file secure and never commit it to version control"
echo "• Regularly update your dependencies"
echo "• Monitor your logs for any issues"
echo "• Set up regular database backups (use ./backup.sh)"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "• Setup Guide: SETUP_GUIDE.md"
echo "• Stripe Connect: STRIPE_CONNECT_SETUP.md"
echo "• API Documentation: https://$DOMAIN/docs"
echo ""
echo "🚀 Happy automating payouts!"