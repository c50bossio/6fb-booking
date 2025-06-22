#!/bin/bash

# 🚀 BookBarber API - Production Startup Script
# Quick deployment for api.bookbarber.com

set -e

echo "🚀 Starting BookBarber API in Production Mode"
echo "============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from template..."
    cp .env.production .env
    echo "✅ .env file created from template"
    echo ""
    echo "🔧 IMPORTANT: Edit .env file with your actual values:"
    echo "   - DATABASE_URL (PostgreSQL connection string)"
    echo "   - SECRET_KEY (generate with: python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"
    echo "   - JWT_SECRET_KEY (generate with: python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"
    echo "   - STRIPE_SECRET_KEY (from Stripe Dashboard)"
    echo "   - STRIPE_PUBLISHABLE_KEY (from Stripe Dashboard)"
    echo "   - Email configuration (SMTP settings)"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check if SSL certificates exist
if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
    echo "⚠️  SSL certificates not found in ssl/ directory"
    echo "   For production, you need SSL certificates."
    echo "   Options:"
    echo "   1. Use Let's Encrypt: certbot certonly --standalone -d api.bookbarber.com"
    echo "   2. Use Cloudflare (modify nginx.conf for port 80 only)"
    echo "   3. Upload your own certificates to ssl/cert.pem and ssl/key.pem"
    echo ""
    read -p "Continue without SSL certificates? (y/n): " continue_without_ssl
    if [ "$continue_without_ssl" != "y" ]; then
        exit 1
    fi

    # Create self-signed certificates for testing
    mkdir -p ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=api.bookbarber.com"
    echo "✅ Created self-signed SSL certificates for testing"
fi

# Set database password
if [ -z "$DB_PASSWORD" ]; then
    echo "🔐 Setting database password..."
    export DB_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
    echo "Generated database password: $DB_PASSWORD"
fi

echo ""
echo "🐳 Starting Docker containers..."

# Build and start containers
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo ""
echo "🔍 Checking service health..."

# Check database
if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U bookbarber_user > /dev/null 2>&1; then
    echo "✅ Database: Healthy"
else
    echo "❌ Database: Not responding"
fi

# Check Redis
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: Healthy"
else
    echo "❌ Redis: Not responding"
fi

# Check API
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API: Healthy"
else
    echo "❌ API: Not responding"
fi

# Check Nginx
if curl -f -k https://localhost/health > /dev/null 2>&1; then
    echo "✅ Nginx: Healthy"
else
    echo "❌ Nginx: Not responding"
fi

echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🎉 BookBarber API is now running!"
echo ""
echo "📍 Service URLs:"
echo "   - API Health: https://api.bookbarber.com/health"
echo "   - API Documentation: https://api.bookbarber.com/docs"
echo "   - API Direct: http://localhost:8000 (internal)"
echo ""
echo "🔧 Useful Commands:"
echo "   - View logs: docker-compose -f docker-compose.prod.yml logs -f api"
echo "   - Stop services: docker-compose -f docker-compose.prod.yml down"
echo "   - Restart API: docker-compose -f docker-compose.prod.yml restart api"
echo "   - Database backup: docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U bookbarber_user 6fb_booking_prod > backup.sql"
echo ""
echo "⚠️  Important Next Steps:"
echo "   1. Point your domain api.bookbarber.com to this server"
echo "   2. Configure Stripe webhooks: https://api.bookbarber.com/api/v1/webhooks/stripe"
echo "   3. Test email functionality: POST /api/v1/test/email"
echo "   4. Set up automated backups"
echo "   5. Configure monitoring and alerts"
echo ""
echo "📚 Documentation: https://api.bookbarber.com/docs"
echo "📧 Support: Check logs with 'docker-compose logs -f api'"

# Save important information
cat > deployment-info.txt << EOF
BookBarber API Deployment Information
=====================================
Deployed: $(date)
Domain: api.bookbarber.com
Database Password: $DB_PASSWORD
SSL: $([ -f ssl/cert.pem ] && echo "Configured" || echo "Self-signed")

Service Status:
- Database: $(docker-compose -f docker-compose.prod.yml ps db | grep "Up" > /dev/null && echo "Running" || echo "Stopped")
- Redis: $(docker-compose -f docker-compose.prod.yml ps redis | grep "Up" > /dev/null && echo "Running" || echo "Stopped")
- API: $(docker-compose -f docker-compose.prod.yml ps api | grep "Up" > /dev/null && echo "Running" || echo "Stopped")
- Nginx: $(docker-compose -f docker-compose.prod.yml ps nginx | grep "Up" > /dev/null && echo "Running" || echo "Stopped")

Next Steps:
1. Configure DNS: Point api.bookbarber.com to $(curl -s ifconfig.me)
2. Configure Stripe webhooks
3. Test all functionality
4. Set up monitoring

Commands:
- Logs: docker-compose -f docker-compose.prod.yml logs -f api
- Stop: docker-compose -f docker-compose.prod.yml down
- Restart: docker-compose -f docker-compose.prod.yml restart api
EOF

echo "💾 Deployment info saved to deployment-info.txt"
