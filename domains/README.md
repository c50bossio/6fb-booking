# BookedBarber V2 - Domain Configuration Guide

Complete domain setup and configuration guide for BookedBarber V2 production deployment.

## 📁 Directory Structure

```
domains/
├── README.md                          # This guide
├── nginx/                            # Nginx configurations
│   └── nginx.conf                    # Main nginx configuration
├── ssl/                              # SSL/TLS configurations
│   ├── ssl-params.conf              # SSL parameters
│   ├── certbot-setup.sh             # SSL certificate setup
│   └── ssl-renewal-monitor.sh       # Certificate monitoring
├── cloudflare/                       # CloudFlare configurations
│   ├── cloudflare-setup.js          # CloudFlare API setup
│   ├── caching-rules.json           # Caching configuration
│   └── worker-cors.js               # CloudFlare Worker for CORS
├── dns/                              # DNS configurations
│   ├── dns-records.json             # DNS record templates
│   └── dns-setup.sh                 # DNS setup script
├── monitoring/                       # Monitoring configurations
│   ├── health-checks.sh             # Health monitoring
│   └── uptimerobot-setup.sh         # UptimeRobot setup
├── templates/                        # Configuration templates
│   ├── nginx-subdomain.conf         # Nginx subdomain template
│   └── subdomain-configs.json       # Subdomain configurations
└── scripts/                          # Automation scripts
    ├── generate-subdomain-configs.sh # Generate nginx configs
    ├── cors-configuration.sh         # CORS setup
    ├── failover-recovery.sh          # Failover automation
    └── backup-restore.sh             # Backup/restore system
```

## 🚀 Quick Start

### 1. Prerequisites

Ensure you have the following:
- Server with public IP address
- Domain name (bookedbarber.com)
- DNS management access (CloudFlare/Route53)
- SSL certificate capability (Let's Encrypt)

### 2. Initial Setup

```bash
# Make all scripts executable
find ./domains/scripts -name "*.sh" -exec chmod +x {} \;
find ./domains/ssl -name "*.sh" -exec chmod +x {} \;
find ./domains/dns -name "*.sh" -exec chmod +x {} \;
find ./domains/monitoring -name "*.sh" -exec chmod +x {} \;

# Set up environment variables
export CLOUDFLARE_API_TOKEN="your_cloudflare_token"
export CLOUDFLARE_ZONE_ID="your_zone_id"
export SERVER_IP="your_server_ip"
```

### 3. Step-by-Step Deployment

#### Step 1: DNS Configuration
```bash
# Update server IP in DNS setup script
sed -i 's/192.0.2.1/YOUR_ACTUAL_IP/' ./domains/dns/dns-setup.sh

# Run DNS setup
./domains/dns/dns-setup.sh
```

#### Step 2: SSL Certificates
```bash
# Set up SSL certificates
./domains/ssl/certbot-setup.sh

# Set up SSL monitoring
./domains/ssl/ssl-renewal-monitor.sh check
```

#### Step 3: Nginx Configuration
```bash
# Generate subdomain configurations
./domains/scripts/generate-subdomain-configs.sh

# Install to nginx
sudo cp ./domains/nginx/nginx.conf /etc/nginx/
sudo cp ./domains/ssl/ssl-params.conf /etc/nginx/

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 4: CloudFlare Setup
```bash
# Configure CloudFlare
node ./domains/cloudflare/cloudflare-setup.js configure

# Deploy CORS worker (optional)
# Upload worker-cors.js to CloudFlare Workers
```

#### Step 5: CORS Configuration
```bash
# Generate CORS configurations
./domains/scripts/cors-configuration.sh all
```

#### Step 6: Monitoring Setup
```bash
# Set up health monitoring
./domains/monitoring/health-checks.sh check

# Set up UptimeRobot (optional)
export UPTIMEROBOT_API_KEY="your_api_key"
./domains/monitoring/uptimerobot-setup.sh setup
```

#### Step 7: Failover Setup
```bash
# Initialize failover system
export PRIMARY_SERVER="your_primary_ip"
export BACKUP_SERVER="your_backup_ip"
./domains/scripts/failover-recovery.sh init
```

## 🌐 Domain Structure

### Primary Domains
- **bookedbarber.com** - Main website
- **www.bookedbarber.com** - WWW redirect
- **api.bookedbarber.com** - Backend API
- **app.bookedbarber.com** - Application interface
- **admin.bookedbarber.com** - Administrative interface

### Development Domains (Optional)
- **staging.bookedbarber.com** - Staging environment
- **dev.bookedbarber.com** - Development environment
- **status.bookedbarber.com** - Status page

## 🔧 Configuration Details

### Nginx Configuration Features
- **Load Balancing**: Multiple backend servers
- **SSL Termination**: Let's Encrypt certificates
- **Rate Limiting**: API and authentication endpoints
- **Security Headers**: HSTS, CSP, X-Frame-Options
- **Caching**: Static assets and API responses
- **Compression**: Gzip and Brotli
- **Health Checks**: Automatic failover

### SSL/TLS Features
- **Modern Protocols**: TLS 1.2 and 1.3 only
- **Strong Ciphers**: ECDHE with perfect forward secrecy
- **HSTS**: HTTP Strict Transport Security
- **OCSP Stapling**: Certificate validation
- **Auto Renewal**: Automated certificate updates

### CloudFlare Features
- **CDN**: Global content delivery
- **DDoS Protection**: Automatic mitigation
- **Web Application Firewall**: Security rules
- **Analytics**: Performance monitoring
- **Edge Caching**: Reduced server load

### CORS Configuration
- **Origin Validation**: Whitelist approved domains
- **Preflight Handling**: OPTIONS request support
- **Credentials Support**: Cookie-based authentication
- **Security Headers**: Comprehensive protection

## 📊 Monitoring and Alerts

### Health Checks
```bash
# Run manual health check
./domains/monitoring/health-checks.sh check

# Start continuous monitoring
./domains/monitoring/health-checks.sh monitor

# View status dashboard
./domains/monitoring/health-checks.sh status
```

### SSL Monitoring
```bash
# Check certificate status
./domains/ssl/ssl-renewal-monitor.sh check

# Test certificate renewal
./domains/ssl/ssl-renewal-monitor.sh renew
```

### Failover Testing
```bash
# Test failover procedure
./domains/scripts/failover-recovery.sh test-failover

# Test recovery procedure
./domains/scripts/failover-recovery.sh test-recovery

# View failover status
./domains/scripts/failover-recovery.sh status
```

## 💾 Backup and Recovery

### Creating Backups
```bash
# Create full backup
./domains/scripts/backup-restore.sh backup

# List available backups
./domains/scripts/backup-restore.sh list
```

### Restoring from Backup
```bash
# View backup details
./domains/scripts/backup-restore.sh details backup-20240115-120000.tar.gz

# Restore from backup
./domains/scripts/backup-restore.sh restore backup-20240115-120000.tar.gz
```

## 🔄 Maintenance Tasks

### Daily Tasks
- Monitor health checks
- Review SSL certificate status
- Check backup completion
- Monitor performance metrics

### Weekly Tasks
- Review access logs
- Update security configurations
- Test failover procedures
- Cleanup old backups

### Monthly Tasks
- Update SSL certificates (auto-renewed)
- Review and update firewall rules
- Performance optimization
- Security audit

## 🛠️ Troubleshooting

### Common Issues

#### DNS Resolution Problems
```bash
# Check DNS propagation
dig bookedbarber.com
dig @8.8.8.8 bookedbarber.com

# Test all subdomains
for subdomain in www api app admin; do
  echo "Testing $subdomain.bookedbarber.com"
  dig "$subdomain.bookedbarber.com"
done
```

#### SSL Certificate Issues
```bash
# Check certificate details
openssl x509 -in /etc/letsencrypt/live/bookedbarber.com/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect bookedbarber.com:443 -servername bookedbarber.com

# Force certificate renewal
certbot renew --force-renewal
```

#### Nginx Configuration Problems
```bash
# Test nginx configuration
nginx -t

# Check nginx logs
tail -f /var/log/nginx/error.log

# Restart nginx safely
nginx -t && systemctl reload nginx
```

#### CORS Issues
```bash
# Test CORS with curl
curl -H "Origin: https://app.bookedbarber.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.bookedbarber.com/api/v1/health

# Debug CORS configuration
./domains/scripts/cors-configuration.sh troubleshoot
```

### Emergency Procedures

#### Emergency Failover
```bash
# Manual failover to backup server
./domains/scripts/failover-recovery.sh failover

# Manual recovery to primary server
./domains/scripts/failover-recovery.sh recovery
```

#### Emergency SSL Fix
```bash
# Temporary self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /tmp/emergency.key \
  -out /tmp/emergency.crt \
  -subj "/CN=bookedbarber.com"

# Update nginx temporarily
# Then fix with proper Let's Encrypt cert
```

## 📝 Environment Variables

### Required Variables
```bash
# DNS Provider Configuration
export CLOUDFLARE_API_TOKEN="your_token"
export CLOUDFLARE_ZONE_ID="your_zone_id"

# Server Configuration
export PRIMARY_SERVER="192.0.2.1"
export BACKUP_SERVER="192.0.2.2"

# Monitoring
export ALERT_EMAIL="admin@bookedbarber.com"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
export UPTIMEROBOT_API_KEY="your_key"
```

### Optional Variables
```bash
# Remote Backup
export REMOTE_BACKUP_ENABLED="true"
export S3_BUCKET="bookedbarber-backups"
export RSYNC_HOST="backup.example.com"
export RSYNC_PATH="/backups/bookedbarber"

# Custom Settings
export RETENTION_DAYS="30"
export HEALTH_CHECK_INTERVAL="60"
export FAILURE_THRESHOLD="3"
```

## 🔐 Security Considerations

### Security Features
- **HTTPS Enforcement**: All traffic redirected to HTTPS
- **Security Headers**: Comprehensive header protection
- **Rate Limiting**: Prevent abuse and DoS attacks
- **IP Filtering**: Geographic and IP-based restrictions
- **Authentication**: Basic auth for admin areas
- **Certificate Pinning**: HPKP for added security

### Security Best Practices
1. **Regular Updates**: Keep all components updated
2. **Strong Passwords**: Use complex passwords for auth
3. **Access Control**: Limit admin access by IP
4. **Monitoring**: Real-time security monitoring
5. **Backups**: Encrypted backup storage
6. **Audit Logs**: Comprehensive logging

## 📞 Support and Resources

### Documentation Links
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Guide](https://letsencrypt.org/docs/)
- [CloudFlare API](https://api.cloudflare.com/)
- [UptimeRobot API](https://uptimerobot.com/api)

### Emergency Contacts
- **Primary Admin**: admin@bookedbarber.com
- **DevOps Team**: devops@bookedbarber.com
- **Security Issues**: security@bookedbarber.com

### Monitoring Dashboards
- **Status Page**: https://status.bookedbarber.com
- **CloudFlare Analytics**: CloudFlare Dashboard
- **UptimeRobot**: UptimeRobot Dashboard
- **Server Monitoring**: Custom monitoring solution

---

## 🎯 Production Checklist

Before going live, ensure all items are completed:

### Pre-Deployment
- [ ] DNS records configured and propagated
- [ ] SSL certificates obtained and installed
- [ ] Nginx configuration tested and deployed
- [ ] CloudFlare configured with proper caching rules
- [ ] CORS properly configured for all origins
- [ ] Health checks implemented and tested
- [ ] Monitoring and alerting configured
- [ ] Backup system implemented and tested
- [ ] Failover procedures tested

### Post-Deployment
- [ ] All domains accessible via HTTPS
- [ ] SSL certificates valid and auto-renewing
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Performance metrics within acceptable ranges
- [ ] Security headers properly configured
- [ ] Backup system running automatically
- [ ] Documentation updated

### Ongoing Maintenance
- [ ] Daily health check monitoring
- [ ] Weekly performance reviews
- [ ] Monthly security audits
- [ ] Quarterly disaster recovery testing
- [ ] Regular backup verification
- [ ] Certificate renewal monitoring
- [ ] DNS configuration reviews

---

*This guide provides comprehensive domain configuration for BookedBarber V2. For additional support or questions, please refer to the support contacts listed above.*