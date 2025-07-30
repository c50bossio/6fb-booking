# Sentry CLI Setup Instructions for BookedBarber V2

## Quick Setup Process

### Step 1: Get Sentry Auth Token
1. **Go to Sentry.io**: https://sentry.io/settings/auth-tokens/
2. **Create New Token**: Click "Create New Token"
3. **Set Permissions**: 
   - ✅ `project:read`
   - ✅ `project:write` 
   - ✅ `org:read`
4. **Copy the token** (it will only be shown once)

### Step 2: Authenticate Sentry CLI
```bash
# Method 1: Set environment variable
export SENTRY_AUTH_TOKEN="your-token-here"

# Method 2: Use login command
sentry-cli login
# Then paste your token when prompted

# Verify authentication
sentry-cli projects list
```

### Step 3: Create BookedBarber Projects
```bash
# Create backend project
sentry-cli projects create \
  --org "your-org-slug" \
  --name "BookedBarber Backend" \
  --slug "bookedbarber-backend" \
  --platform "python-fastapi"

# Create frontend project  
sentry-cli projects create \
  --org "your-org-slug" \
  --name "BookedBarber Frontend" \
  --slug "bookedbarber-frontend" \
  --platform "javascript-nextjs"
```

### Step 4: Get DSNs
```bash
# Get backend DSN
sentry-cli projects info your-org-slug bookedbarber-backend | grep "DSN:"

# Get frontend DSN
sentry-cli projects info your-org-slug bookedbarber-frontend | grep "DSN:"
```

### Step 5: Update Environment Files
Once you have the DSNs, I'll help you update the `.env` files automatically.

## Alternative: Use Existing Sentry Account
If you already have Sentry projects:
```bash
# List your existing projects
sentry-cli projects list

# Use existing project DSN
sentry-cli projects info your-org-slug your-project-slug
```

## Need Help?
Run the automated setup script after authentication:
```bash
cd /Users/bossio/6fb-booking/backend-v2
./scripts/setup-sentry.sh
```

The script will guide you through the rest of the process!