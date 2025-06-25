# 🔒 Secure Stripe Key Storage Guide - 6FB Booking/Booked Barber

## Overview
After rotating your Stripe keys, here's where to securely store your NEW production keys for **6FB Booking/Booked Barber** deployment.

## ✅ SAFE Storage Locations

### 1. Environment Variables (Recommended)
```bash
# Add to ~/.zshrc or ~/.bash_profile
export STRIPE_SECRET_KEY="sk_live_YOUR_NEW_SECRET_KEY"  # pragma: allowlist secret
export STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_NEW_PUBLISHABLE_KEY"

# Reload your shell
source ~/.zshrc
```

**Pros**: Secure, not in files, available to applications
**Cons**: Need to re-export if terminal restarts

### 2. macOS Keychain (Most Secure)
```bash
# Store in keychain
security add-generic-password -a "stripe" -s "secret_key" -w "sk_live_YOUR_NEW_SECRET_KEY"
security add-generic-password -a "stripe" -s "publishable_key" -w "pk_live_YOUR_NEW_PUBLISHABLE_KEY"

# Retrieve when needed
security find-generic-password -a "stripe" -s "secret_key" -w
```

**Pros**: Encrypted, OS-level security, never in plain text
**Cons**: Requires scripting to access

### 3. Secure .env File (Good)
```bash
# Create outside of git repositories
mkdir -p ~/secure-configs
echo "STRIPE_SECRET_KEY=sk_live_YOUR_NEW_SECRET_KEY" > ~/secure-configs/stripe.env
echo "STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_NEW_PUBLISHABLE_KEY" >> ~/secure-configs/stripe.env
chmod 600 ~/secure-configs/stripe.env

# Load when needed
source ~/secure-configs/stripe.env
```

**Pros**: Organized, easy to manage
**Cons**: Still stored in plain text file

## 🚀 Deployment Platform Configuration

### Railway
1. Go to your Railway dashboard
2. Select your project
3. Go to "Variables" tab
4. Add:
   - `STRIPE_SECRET_KEY`: sk_live_YOUR_NEW_SECRET_KEY
   - `STRIPE_PUBLISHABLE_KEY`: pk_live_YOUR_NEW_PUBLISHABLE_KEY

### Render
1. Go to your Render dashboard
2. Select your service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Add the same keys as above

### Vercel (if using)
1. Go to your Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add the keys with appropriate environments (Production, Preview, Development)

### Docker
```bash
# Pass as environment variables
docker run -e STRIPE_SECRET_KEY="sk_live_YOUR_NEW_SECRET_KEY" \
           -e STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_NEW_PUBLISHABLE_KEY" \
           your-app

# Or use docker-compose with .env file
# docker-compose.yml
environment:
  - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
  - STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
```

## ❌ NEVER Store Keys In

- ✗ Any `.env` files in git repositories
- ✗ Source code or comments
- ✗ Database records
- ✗ Log files
- ✗ Configuration files committed to version control
- ✗ Cloud storage (Dropbox, Google Drive, etc.)
- ✗ Email or messaging apps
- ✗ Cursor extension directories (as we just cleaned up)

## 🔄 Key Rotation Best Practices

### Regular Rotation Schedule
- **Production keys**: Every 90 days
- **After security incident**: Immediately
- **When team members leave**: Within 24 hours

### Rotation Process
1. Generate new keys in Stripe Dashboard
2. Update all deployment platforms simultaneously
3. Test payment functionality
4. Revoke old keys only after confirming new ones work
5. Update team documentation

## 🛡️ Security Monitoring

### Set up alerts for:
- Failed payment attempts (could indicate wrong keys)
- Unusual API usage patterns
- Webhook delivery failures
- Rate limit violations

### Regular audits:
- Review Stripe Dashboard logs monthly
- Check for any unauthorized API calls
- Verify webhook endpoints are still valid
- Confirm no keys are logged anywhere

## 📋 Quick Setup Commands

### For 6FB Booking Production Deployment:
```bash
# Option 1: Environment variables for local testing
echo 'export STRIPE_SECRET_KEY="sk_live_YOUR_NEW_SECRET_KEY"  # pragma: allowlist secret' >> ~/.zshrc
echo 'export STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_NEW_PUBLISHABLE_KEY"' >> ~/.zshrc
source ~/.zshrc

# Option 2: Secure file for production configs
mkdir -p ~/secure-configs
cat > ~/secure-configs/6fb-stripe-production.env << EOF
STRIPE_SECRET_KEY=sk_live_YOUR_NEW_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_NEW_PUBLISHABLE_KEY
EOF
chmod 600 ~/secure-configs/6fb-stripe-production.env
```

### For 6FB Booking Development:
✅ The test keys are already configured and working! No changes needed for development.

## 🆘 Emergency Procedures

### If keys are compromised again:
1. **Immediately** regenerate keys in Stripe Dashboard
2. Run: `/Users/bossio/6fb-booking/security-remediation.sh`
3. Update all deployment platforms
4. Review git history for any accidental commits
5. Check all team member access

### Recovery commands:
```bash
# Quick key rotation script
./rotate-stripe-keys.sh  # (we can create this)

# Verify new keys are working
curl -u "sk_live_NEW_KEY:" https://api.stripe.com/v1/account
```

---
**Remember**: Security is an ongoing process, not a one-time setup. Regular audits and monitoring are essential for maintaining secure key management.
