#!/bin/bash

# BookedBarber V2 SSL Certificate Setup with Let's Encrypt
# This script sets up SSL certificates for all domains

set -e

# Configuration
DOMAINS=(
    "bookedbarber.com"
    "www.bookedbarber.com"
    "api.bookedbarber.com"
    "app.bookedbarber.com"
    "admin.bookedbarber.com"
)

EMAIL="admin@bookedbarber.com"  # Replace with your email
WEBROOT="/var/www/certbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting SSL certificate setup for BookedBarber V2${NC}"

# Create webroot directory
sudo mkdir -p $WEBROOT

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing certbot...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install certbot
    else
        echo -e "${RED}Unsupported OS. Please install certbot manually.${NC}"
        exit 1
    fi
fi

# Generate Diffie-Hellman parameters if they don't exist
if [ ! -f /etc/ssl/certs/dhparam.pem ]; then
    echo -e "${YELLOW}Generating Diffie-Hellman parameters (this may take a while)...${NC}"
    sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
fi

# Function to obtain certificate for a domain
obtain_certificate() {
    local domain=$1
    echo -e "${YELLOW}Obtaining certificate for $domain...${NC}"
    
    # Try webroot method first
    if certbot certonly \
        --webroot \
        --webroot-path=$WEBROOT \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --expand \
        -d $domain; then
        echo -e "${GREEN}Certificate obtained successfully for $domain${NC}"
        return 0
    else
        echo -e "${RED}Failed to obtain certificate for $domain using webroot method${NC}"
        
        # Try standalone method as fallback
        echo -e "${YELLOW}Trying standalone method for $domain...${NC}"
        if certbot certonly \
            --standalone \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            --expand \
            -d $domain; then
            echo -e "${GREEN}Certificate obtained successfully for $domain using standalone method${NC}"
            return 0
        else
            echo -e "${RED}Failed to obtain certificate for $domain${NC}"
            return 1
        fi
    fi
}

# Function to setup nginx for ACME challenge
setup_nginx_acme() {
    echo -e "${YELLOW}Setting up nginx for ACME challenge...${NC}"
    
    # Create temporary nginx config for ACME challenge
    cat > /tmp/nginx-acme.conf << EOF
server {
    listen 80;
    server_name ${DOMAINS[@]};
    
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
    
    # Backup existing nginx config if it exists
    if [ -f /etc/nginx/sites-available/default ]; then
        sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    fi
    
    # Install temporary config
    sudo cp /tmp/nginx-acme.conf /etc/nginx/sites-available/acme-challenge
    sudo ln -sf /etc/nginx/sites-available/acme-challenge /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    sudo nginx -t && sudo systemctl reload nginx
}

# Main certificate setup process
main() {
    echo -e "${GREEN}Setting up SSL certificates for BookedBarber V2${NC}"
    echo "Domains to configure: ${DOMAINS[@]}"
    echo "Email: $EMAIL"
    echo "Webroot: $WEBROOT"
    echo ""
    
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi
    
    # Setup nginx for ACME challenge
    setup_nginx_acme
    
    # Obtain certificates for each domain
    for domain in "${DOMAINS[@]}"; do
        obtain_certificate "$domain"
        sleep 2  # Small delay between requests
    done
    
    # Set up automatic renewal
    echo -e "${YELLOW}Setting up automatic renewal...${NC}"
    
    # Create renewal script
    cat > /tmp/certbot-renewal.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
if [ $? -eq 0 ]; then
    systemctl reload nginx
fi
EOF
    
    sudo mv /tmp/certbot-renewal.sh /etc/cron.d/certbot-renewal
    sudo chmod +x /etc/cron.d/certbot-renewal
    
    # Add to crontab (run twice daily)
    echo "0 */12 * * * root /etc/cron.d/certbot-renewal" | sudo tee -a /etc/crontab > /dev/null
    
    echo -e "${GREEN}SSL certificate setup completed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Update your nginx configuration to use the new certificates"
    echo "2. Copy the BookedBarber nginx.conf to /etc/nginx/sites-available/"
    echo "3. Enable the site and restart nginx"
    echo "4. Test your SSL configuration at https://www.ssllabs.com/ssltest/"
    echo ""
    echo "Certificate locations:"
    for domain in "${DOMAINS[@]}"; do
        echo "  $domain: /etc/letsencrypt/live/$domain/"
    done
}

# Verify nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}nginx is not installed. Please install nginx first.${NC}"
    echo "Ubuntu/Debian: sudo apt-get install nginx"
    echo "macOS: brew install nginx"
    exit 1
fi

# Run main function
main "$@"