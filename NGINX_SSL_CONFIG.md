# Nginx SSL Configuration for BookBarber.com

*Production-ready Nginx configuration for SSL and domain routing*

## 🔧 Complete Nginx Configuration

### Main Configuration File: `/etc/nginx/sites-available/bookbarber.com`

```nginx
# BookBarber.com - Production Nginx Configuration
# Supports: app.bookbarber.com, api.bookbarber.com, admin.bookbarber.com

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=app:10m rate=30r/s;

# SSL Certificate paths (update these paths based on your setup)
# For Cloudflare Origin Certificate:
ssl_certificate /etc/ssl/certs/bookbarber.com.pem;
ssl_certificate_key /etc/ssl/private/bookbarber.com.key;

# For Let's Encrypt:
# ssl_certificate /etc/letsencrypt/live/bookbarber.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/bookbarber.com/privkey.pem;

# SSL Configuration (A+ SSL Rating)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;

# Security Headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Gzip Compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/json
    application/javascript
    application/xml+rss
    application/atom+xml
    image/svg+xml;

# Frontend Application - app.bookbarber.com
server {
    listen 80;
    server_name app.bookbarber.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.bookbarber.com;

    # Rate limiting
    limit_req zone=app burst=50 nodelay;

    # Root directory for static files
    root /var/www/bookbarber/frontend/dist;
    index index.html;

    # Security headers specific to frontend
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.bookbarber.com https://api.stripe.com; frame-src https://js.stripe.com;" always;

    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }

    # Next.js frontend (port 3000)
    location / {
        try_files $uri $uri/ @nextjs;
    }

    location @nextjs {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support for real-time features
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;

    location = /50x.html {
        root /usr/share/nginx/html;
    }
}

# Backend API - api.bookbarber.com
server {
    listen 80;
    server_name api.bookbarber.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.bookbarber.com;

    # Rate limiting for API
    limit_req zone=api burst=20 nodelay;

    # API-specific security headers
    add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none';" always;

    # CORS handling (adjust origins as needed)
    location / {
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://app.bookbarber.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Type' 'text/plain; charset=utf-8' always;
            add_header 'Content-Length' 0 always;
            return 204;
        }

        # Add CORS headers to all responses
        add_header 'Access-Control-Allow-Origin' 'https://app.bookbarber.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

        # Proxy to FastAPI backend (port 8000)
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:8000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Webhook endpoints (higher limits for payment providers)
    location /api/v1/webhooks/ {
        limit_req zone=api burst=100 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60;
    }
}

# Admin Dashboard - admin.bookbarber.com (Optional)
server {
    listen 80;
    server_name admin.bookbarber.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.bookbarber.com;

    # Admin-specific security (stricter)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.bookbarber.com;" always;

    # IP-based access control (uncomment and adjust if needed)
    # allow 192.168.1.0/24;  # Your office network
    # allow 10.0.0.0/8;      # Your VPN range
    # deny all;

    # Proxy to admin interface (could be same as app or separate service)
    location / {
        proxy_pass http://127.0.0.1:3001;  # Separate admin port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Main Domain - bookbarber.com (Future use)
server {
    listen 80;
    server_name bookbarber.com www.bookbarber.com;

    # Temporary redirect to app subdomain
    return 301 https://app.bookbarber.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bookbarber.com www.bookbarber.com;

    # Temporary redirect to app subdomain
    return 301 https://app.bookbarber.com$request_uri;
}
```

## 🔐 SSL Certificate Setup Options

### Option 1: Cloudflare Origin Certificate (Recommended)

```bash
# 1. Generate certificate in Cloudflare dashboard
# 2. Save certificate to server
sudo mkdir -p /etc/ssl/certs /etc/ssl/private
sudo chmod 700 /etc/ssl/private

# Save Cloudflare certificate
sudo nano /etc/ssl/certs/bookbarber.com.pem
# Paste the certificate content from Cloudflare

# Save private key
sudo nano /etc/ssl/private/bookbarber.com.key
# Paste the private key content from Cloudflare

# Set proper permissions
sudo chmod 644 /etc/ssl/certs/bookbarber.com.pem
sudo chmod 600 /etc/ssl/private/bookbarber.com.key
```

### Option 2: Let's Encrypt Certificate

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generate wildcard certificate
sudo certbot certonly --manual --preferred-challenges=dns \
  -d bookbarber.com \
  -d "*.bookbarber.com"

# Follow the prompts to add DNS TXT records
# Certificate will be saved to:
# /etc/letsencrypt/live/bookbarber.com/fullchain.pem
# /etc/letsencrypt/live/bookbarber.com/privkey.pem

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet --nginx
```

## 🚀 Deployment Script

### Create deployment script: `deploy-nginx-config.sh`

```bash
#!/bin/bash

# BookBarber.com Nginx Configuration Deployment Script

set -e

echo "🚀 Deploying BookBarber.com Nginx Configuration..."

# Backup current configuration
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Copy new configuration
sudo cp bookbarber-nginx.conf /etc/nginx/sites-available/bookbarber.com

# Create symlink if it doesn't exist
if [ ! -L /etc/nginx/sites-enabled/bookbarber.com ]; then
    sudo ln -s /etc/nginx/sites-available/bookbarber.com /etc/nginx/sites-enabled/
fi

# Remove default site if it exists
if [ -L /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# Test configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuration test passed"

    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx

    # Check status
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running successfully"
        echo "🌐 Your sites should now be available at:"
        echo "   - https://app.bookbarber.com"
        echo "   - https://api.bookbarber.com"
        echo "   - https://admin.bookbarber.com"
    else
        echo "❌ Nginx failed to start"
        exit 1
    fi
else
    echo "❌ Configuration test failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
```

## 🧪 Testing Commands

### Test SSL Configuration

```bash
# Test SSL rating (should be A+)
curl -s "https://api.ssllabs.com/api/v3/analyze?host=app.bookbarber.com" | jq '.endpoints[0].grade'

# Test certificate chain
openssl s_client -connect app.bookbarber.com:443 -servername app.bookbarber.com

# Test cipher suites
nmap --script ssl-enum-ciphers -p 443 app.bookbarber.com
```

### Test Performance

```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s https://app.bookbarber.com

# Create curl-format.txt:
cat > curl-format.txt << 'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF

# Test gzip compression
curl -H "Accept-Encoding: gzip" -v https://app.bookbarber.com 2>&1 | grep -i "content-encoding"
```

### Test Security Headers

```bash
# Check security headers
curl -I https://app.bookbarber.com | grep -E "(Strict-Transport|X-Frame|X-Content|X-XSS|Content-Security)"

# Test HSTS
curl -I https://app.bookbarber.com | grep -i "strict-transport-security"
```

## 🔧 Troubleshooting Common Issues

### Nginx Won't Start
```bash
# Check syntax
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check if ports are available
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :80
```

### SSL Certificate Issues
```bash
# Verify certificate
sudo openssl x509 -in /etc/ssl/certs/bookbarber.com.pem -text -noout

# Check certificate expiry
sudo openssl x509 -in /etc/ssl/certs/bookbarber.com.pem -enddate -noout

# Test certificate chain
sudo openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/bookbarber.com.pem
```

### CORS Issues
```bash
# Test CORS headers
curl -H "Origin: https://app.bookbarber.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.bookbarber.com/api/v1/auth/login
```

## 📊 Monitoring Configuration

### Log Configuration
```nginx
# Add to http block in /etc/nginx/nginx.conf
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for" '
                'rt=$request_time uct="$upstream_connect_time" '
                'uht="$upstream_header_time" urt="$upstream_response_time"';

access_log /var/log/nginx/access.log main;
error_log /var/log/nginx/error.log warn;
```

### Log Rotation
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/bookbarber
```

```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 nginx nginx
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi \
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
```

This Nginx configuration provides a production-ready setup with SSL, security headers, performance optimization, and proper domain routing for the BookBarber.com platform.
