# GitHub Codespaces Setup Guide for BookedBarber V2

## 🚀 Quick Start

1. **Open in Codespaces**: Click "Code" → "Codespaces" → "Create codespace on staging"
2. **Wait for setup**: The devcontainer will automatically install dependencies (~3-5 minutes)
3. **Configure secrets**: Follow the environment variables setup below
4. **Start development**: Run `./backend-v2/docker-dev-start.sh`

## 🔐 Environment Variables Setup

### Option 1: GitHub Codespaces Secrets (Recommended)

**For Repository-Wide Secrets:**
1. Go to your repository settings
2. Navigate to "Secrets and variables" → "Codespaces"
3. Add the following secrets:

```bash
# Essential Development Keys
JWT_SECRET_KEY=your_secure_jwt_secret_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
```

**For User-Wide Secrets:**
1. Go to GitHub Settings (your profile)
2. Navigate to "Codespaces" 
3. Add personal development keys that work across all your codespaces

### Option 2: Codespace Environment Variables

**Set directly in your codespace:**
```bash
# Open terminal in Codespaces
export JWT_SECRET_KEY="your_secure_jwt_secret_key_here"
export STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"

# Or create .env file
cp .devcontainer/codespaces.env.template .env
# Edit .env with your actual keys
```

## 📋 Required API Keys for Full Functionality

### 🔧 Essential (Core Features)
```bash
JWT_SECRET_KEY       # Generate: python -c 'import secrets; print(secrets.token_urlsafe(64))'
STRIPE_SECRET_KEY    # Get from: https://dashboard.stripe.com/test/apikeys
GOOGLE_CLIENT_SECRET # Get from: https://console.cloud.google.com/apis/credentials
```

### 📧 Communication (Optional)
```bash
SENDGRID_API_KEY     # Get from: https://app.sendgrid.com/settings/api_keys
TWILIO_AUTH_TOKEN    # Get from: https://console.twilio.com/
```

### 📊 Analytics (Optional)
```bash
GOOGLE_ANALYTICS_ID  # Get from: https://analytics.google.com/
META_PIXEL_ID        # Get from: https://business.facebook.com/
```

## 🛠️ Development Workflow

### Starting the Development Environment

```bash
# Method 1: Automated Docker setup (Recommended)
./backend-v2/docker-dev-start.sh

# Method 2: Manual startup
cd backend-v2
uvicorn main:app --reload --port 8000 &
cd frontend-v2
npm run dev &
```

### Port Forwarding (Automatic)

Codespaces automatically forwards these ports:
- **3000**: Next.js Frontend (https://your-codespace-name-3000.app.github.dev)
- **8000**: FastAPI Backend (https://your-codespace-name-8000.app.github.dev)
- **5432**: PostgreSQL Database (internal)
- **6379**: Redis Cache (internal)

### Database Management

```bash
# Development database (SQLite)
ls -la 6fb_booking.db

# Staging database (SQLite)
ls -la staging_6fb_booking.db

# Run migrations
python -c "from db import init_db; init_db()"

# Reset database
rm 6fb_booking.db && python -c "from db import init_db; init_db()"
```

## 🔧 Troubleshooting Common Issues

### Issue: Environment Variables Not Loading

**Solution:**
```bash
# Check if secrets are available
env | grep STRIPE
env | grep JWT

# Restart codespace if secrets were recently added
# Go to Codespaces dashboard and restart
```

### Issue: Docker Services Not Starting

**Solution:**
```bash
# Check Docker status
docker ps

# Restart Docker Compose
cd backend-v2
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d --build
```

### Issue: Port Forwarding Not Working

**Solution:**
```bash
# Check port forwarding in VS Code
# Click "Ports" tab at bottom of VS Code
# Ensure ports 3000 and 8000 are forwarded

# Manual port forwarding
curl http://localhost:3000  # Should return Next.js app
curl http://localhost:8000/health  # Should return {"status": "healthy"}
```

### Issue: Frontend Build Errors

**Solution:**
```bash
# Clear build cache
cd frontend-v2
rm -rf .next node_modules/.cache
npm install
npm run build
```

### Issue: Database Connection Errors

**Solution:**
```bash
# Check database file exists
ls -la backend-v2/6fb_booking.db

# Recreate database
cd backend-v2
python -c "
import sqlite3
conn = sqlite3.connect('6fb_booking.db')
conn.close()
print('Database created')
"
```

## 📈 Performance Optimization

### Recommended Codespace Machine Types

| Use Case | Machine Type | Specs | Cost/Hour |
|----------|-------------|-------|-----------|
| **Light Development** | 2-core | 8GB RAM | $0.18 |
| **Full Stack Development** | 4-core | 16GB RAM | $0.36 |
| **Heavy Testing/Building** | 8-core | 32GB RAM | $0.72 |

### Performance Tips

```bash
# Prebuilds: Set up repository prebuilds for faster startup
# Go to repository settings → Codespaces → Set up prebuilds

# Optimize Docker builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Use npm cache
npm config set cache /tmp/.npm
```

## 🤝 Team Collaboration

### Sharing Development Environment

```bash
# Share codespace (if enabled in organization)
# Go to Codespaces dashboard → Share codespace

# Export development data
cd backend-v2
cp 6fb_booking.db /tmp/shared_database.db
```

### Code Collaboration

```bash
# Live Share extension is pre-installed
# Use VS Code Live Share for real-time collaboration

# Commit changes
git add .
git commit -m "feat: implement feature in codespaces"
git push origin feature-branch
```

## 🎯 Next Steps

1. **Test the setup**: Verify all services start properly
2. **Configure webhooks**: Set up Stripe webhook endpoints pointing to your codespace
3. **Run tests**: Execute the test suite to ensure everything works
4. **Deploy**: Use the same environment for staging deployments

## 📞 Support

If you encounter issues:
1. Check the VS Code terminal for error messages
2. Review the Docker Compose logs: `docker-compose logs`
3. Restart the codespace if needed
4. Contact the team with specific error messages

---

## 🔒 Security Best Practices

- ✅ Use GitHub Secrets for API keys
- ✅ Never commit `.env` files with real keys
- ✅ Use test/development keys only
- ✅ Regularly rotate development keys
- ✅ Review codespace access permissions

**Your BookedBarber V2 development environment is now crash-proof and runs in the cloud!** 🎉