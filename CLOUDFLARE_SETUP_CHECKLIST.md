# Cloudflare Setup Checklist for BookBarber.com

*Quick Reference Guide for DNS Migration*

## 🚀 Pre-Setup Requirements

### Information Needed
- [ ] **GoDaddy Login**: Access to bookbarber.com domain management
- [ ] **Server IPs**: Production server IP addresses
  - Frontend Server IP: `_________________`
  - Backend Server IP: `_________________`
  - Admin Server IP: `_________________`
- [ ] **Email Address**: For Cloudflare account (preferably business email)

## 📋 Step-by-Step Cloudflare Setup

### Phase 1: Cloudflare Account & Domain Addition (15 minutes)

1. **Create Cloudflare Account**
   - [ ] Go to https://cloudflare.com/
   - [ ] Sign up with business email
   - [ ] Verify email address
   - [ ] Choose Free plan (sufficient for initial setup)

2. **Add Domain to Cloudflare**
   - [ ] Click "Add Site"
   - [ ] Enter: `bookbarber.com`
   - [ ] Click "Add Site"
   - [ ] Wait for DNS scan to complete

3. **Review Existing DNS Records**
   - [ ] Verify Cloudflare detected current A records
   - [ ] Note any missing records to add manually

### Phase 2: DNS Record Configuration (20 minutes)

4. **Add New Subdomain Records**
   ```
   Add these records in Cloudflare DNS tab:

   Type: A    | Name: app   | Content: [FRONTEND_IP] | TTL: Auto | Proxy: ON
   Type: A    | Name: api   | Content: [BACKEND_IP]  | TTL: Auto | Proxy: ON
   Type: A    | Name: admin | Content: [ADMIN_IP]    | TTL: Auto | Proxy: OFF
   Type: CNAME| Name: www   | Content: bookbarber.com| TTL: Auto | Proxy: ON
   ```

5. **Configure Security Records**
   ```
   Type: CAA  | Name: @     | Content: 0 issue "letsencrypt.org"
   Type: CAA  | Name: @     | Content: 0 issue "digicert.com"
   Type: CAA  | Name: @     | Content: 0 issuewild "letsencrypt.org"
   ```

6. **Update Email Records (Optional)**
   ```
   # If you plan to use email with this domain
   Type: TXT  | Name: @     | Content: v=spf1 include:sendgrid.net ~all
   Type: TXT  | Name: _dmarc| Content: v=DMARC1; p=quarantine; rua=mailto:admin@bookbarber.com
   ```

### Phase 3: GoDaddy Name Server Update (10 minutes)

7. **Login to GoDaddy**
   - [ ] Go to https://account.godaddy.com/
   - [ ] Navigate to "My Products" > "All Products and Services"
   - [ ] Find bookbarber.com domain

8. **Change Name Servers**
   - [ ] Click "DNS" next to bookbarber.com
   - [ ] Click "Change" next to Name Servers
   - [ ] Select "I'll use my own name servers"
   - [ ] Remove existing name servers:
     - `NS1.PERFECTDOMAIN.COM`
     - `NS2.PERFECTDOMAIN.COM`
   - [ ] Add Cloudflare name servers (found in Cloudflare dashboard):
     - Name server 1: `___________________.ns.cloudflare.com`
     - Name server 2: `___________________.ns.cloudflare.com`
   - [ ] Click "Save"

### Phase 4: Cloudflare SSL Configuration (15 minutes)

9. **Configure SSL/TLS Settings**
   - [ ] Go to SSL/TLS tab in Cloudflare
   - [ ] Set encryption mode to "Full (Strict)"
   - [ ] Enable "Always Use HTTPS"
   - [ ] Enable "HTTP Strict Transport Security (HSTS)"

10. **Edge Certificates**
    - [ ] Verify "Universal SSL" is active
    - [ ] Enable "TLS 1.3"
    - [ ] Set minimum TLS version to "TLS 1.2"

11. **Origin Certificates** (For your servers)
    - [ ] Click "Create Certificate"
    - [ ] Add hostnames: `*.bookbarber.com`, `bookbarber.com`
    - [ ] Choose key type: "RSA (2048)"
    - [ ] Click "Create"
    - [ ] Save certificate and private key for server configuration

### Phase 5: Performance Optimization (10 minutes)

12. **Speed Settings**
    - [ ] Go to Speed tab
    - [ ] Enable "Auto Minify" for JS, CSS, HTML
    - [ ] Enable "Brotli" compression
    - [ ] Set "Browser Cache TTL" to "1 month"

13. **Caching Settings**
    - [ ] Go to Caching tab
    - [ ] Set "Caching Level" to "Standard"
    - [ ] Enable "Always Online"

### Phase 6: Security Configuration (10 minutes)

14. **Security Settings**
    - [ ] Go to Security tab
    - [ ] Set "Security Level" to "Medium"
    - [ ] Enable "Bot Fight Mode"
    - [ ] Review "WAF" rules (Web Application Firewall)

15. **Page Rules** (Optional)
    - [ ] Create rule for `api.bookbarber.com/*`
    - [ ] Settings: "Cache Level: Bypass"
    - [ ] This prevents API responses from being cached

## ⏱️ DNS Propagation Timeline

### Expected Timeframes
- **Cloudflare Changes**: 1-5 minutes
- **Global DNS Propagation**: 24-48 hours (typically 2-4 hours)
- **Full Propagation**: Up to 72 hours in rare cases

### Testing Propagation
```bash
# Test DNS propagation from different locations:
# Online tools:
# - https://www.whatsmydns.net/
# - https://dnschecker.org/

# Command line testing:
nslookup app.bookbarber.com
nslookup api.bookbarber.com
dig app.bookbarber.com
dig api.bookbarber.com
```

## 🧪 Testing Checklist

### Immediate Testing (After DNS Changes)
- [ ] **DNS Resolution**: `nslookup app.bookbarber.com`
- [ ] **HTTP Access**: `curl -I http://app.bookbarber.com`
- [ ] **HTTPS Access**: `curl -I https://app.bookbarber.com`
- [ ] **API Endpoint**: `curl -I https://api.bookbarber.com`

### Post-Propagation Testing (24 hours later)
- [ ] **Frontend Loading**: Visit https://app.bookbarber.com
- [ ] **API Connectivity**: Test API calls from frontend
- [ ] **SSL Certificate**: Check certificate validity
- [ ] **Performance**: Run speed tests
- [ ] **Mobile Testing**: Test on mobile devices

## 🚨 Troubleshooting Common Issues

### DNS Not Resolving
1. **Check Name Servers**: Verify Cloudflare name servers are set in GoDaddy
2. **Wait for Propagation**: DNS changes can take up to 48 hours
3. **Clear DNS Cache**: `sudo dscacheutil -flushcache` (macOS)

### SSL Certificate Issues
1. **Check SSL Mode**: Should be "Full (Strict)" in Cloudflare
2. **Origin Certificate**: Install Cloudflare origin certificate on server
3. **Certificate Validation**: Use SSL checker tools

### Performance Issues
1. **Disable Development Mode**: Make sure it's OFF in Cloudflare
2. **Check Proxy Status**: Subdomains should have orange cloud (proxied)
3. **Review Page Rules**: Ensure API endpoints bypass cache

### 502/503 Errors
1. **Check Server Status**: Verify your servers are running
2. **Firewall Settings**: Ensure Cloudflare IPs are allowed
3. **Origin Server**: Verify server can handle HTTPS requests

## 🔍 Monitoring & Maintenance

### Set Up Monitoring
- [ ] **Uptime Monitoring**: Use Pingdom, UptimeRobot, or Cloudflare monitoring
- [ ] **SSL Monitoring**: Set alerts for certificate expiry
- [ ] **Performance Monitoring**: Track page load times
- [ ] **Error Monitoring**: Monitor 4xx/5xx errors

### Regular Maintenance Tasks
- **Weekly**: Review analytics and performance
- **Monthly**: Check SSL certificate status
- **Quarterly**: Review security settings and update as needed
- **Annually**: Review domain registration and renewal

## 📞 Emergency Contacts

### Rollback Plan
If something goes wrong, you can quickly rollback:

1. **Quick Rollback** (5 minutes):
   - Log into Cloudflare
   - Pause Cloudflare (orange to grey cloud)
   - This bypasses Cloudflare while keeping DNS

2. **Full Rollback** (30 minutes):
   - Log into GoDaddy
   - Change name servers back to:
     - `NS1.PERFECTDOMAIN.COM`
     - `NS2.PERFECTDOMAIN.COM`

### Support Resources
- **Cloudflare Community**: https://community.cloudflare.com/
- **Cloudflare Support**: Available in dashboard
- **GoDaddy Support**: 1-480-505-8877

## ✅ Success Verification

Your setup is successful when:
- [ ] `https://app.bookbarber.com` loads your frontend
- [ ] `https://api.bookbarber.com` returns API responses
- [ ] SSL certificates show green lock in browser
- [ ] DNS lookup tools show Cloudflare IPs
- [ ] Performance tests show improved load times

---

## 🎯 Quick Command Reference

```bash
# Test DNS resolution
nslookup app.bookbarber.com
nslookup api.bookbarber.com

# Test HTTP response
curl -I https://app.bookbarber.com
curl -I https://api.bookbarber.com

# Check SSL certificate
openssl s_client -connect app.bookbarber.com:443 -servername app.bookbarber.com

# Test from different locations
dig @1.1.1.1 app.bookbarber.com  # Cloudflare DNS
dig @8.8.8.8 app.bookbarber.com  # Google DNS
```

Print this checklist and check off items as you complete them. The entire process should take about 1-2 hours, with most of the time waiting for DNS propagation.
