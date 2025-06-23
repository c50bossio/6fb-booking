# Render Dashboard Navigation Guide

This guide provides step-by-step instructions with exact navigation paths for deploying the 6FB Booking frontend using the Render Dashboard.

## Quick Links
- **Render Dashboard**: https://dashboard.render.com
- **API Keys**: https://dashboard.render.com/account/settings
- **New Service**: https://dashboard.render.com/new

## Step-by-Step Dashboard Navigation

### 1. Getting Your API Key (For Automated Scripts)

1. **Navigate to Account Settings**
   - Click your profile icon (top right corner)
   - Select "Account Settings"
   - Direct URL: https://dashboard.render.com/account/settings

2. **Create API Key**
   - Click "API Keys" in the left sidebar
   - Click "Create API Key" button
   - Give it a name (e.g., "6FB Deployment")
   - Copy the key immediately (it won't be shown again)
   - Save as: `export RENDER_API_KEY='rnd_xxxxxxxxxxxxx'`

### 2. Creating a New Web Service

1. **Start New Service Creation**
   - From dashboard home, click the blue "New +" button (top right)
   - Select "Web Service"
   - Direct URL: https://dashboard.render.com/new/web

2. **Connect Your Repository**
   - If not connected to GitHub:
     - Click "Connect GitHub account"
     - Authorize Render to access your repositories
     - Select "All repositories" or specific ones
   - Search for your repository: "6fb-booking"
   - Click "Connect" next to your repository

### 3. Configure Service Settings

#### Basic Configuration Section
| Field | Value |
|-------|-------|
| **Name** | `sixfb-frontend` |
| **Region** | Oregon (US West) |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Environment** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

#### Advanced Configuration (Click to Expand)
| Field | Value |
|-------|-------|
| **Auto-Deploy** | Yes (enabled) |
| **Health Check Path** | `/` |
| **Plan** | Free (or your choice) |

### 4. Environment Variables

1. **Expand "Advanced" Section**
2. **Click "Add Environment Variable"**
3. **Add Each Variable**:

   ```
   NEXT_PUBLIC_API_URL = https://sixfb-backend.onrender.com
   NEXT_PUBLIC_APP_URL = https://sixfb-frontend.onrender.com
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = [your-stripe-key]
   NEXT_PUBLIC_GOOGLE_CLIENT_ID = [your-google-client-id]
   ```

4. **Pro Tip**: You can bulk add by clicking "Add from .env file"

### 5. Create and Deploy

1. **Review Settings**
   - Scroll through all sections
   - Verify all fields are correct
   
2. **Click "Create Web Service"**
   - Bottom of the page
   - Blue button

3. **Monitor Initial Deployment**
   - You'll be redirected to the service page
   - Watch the logs in real-time
   - Initial build takes 5-10 minutes

### 6. Post-Deployment Navigation

#### Service Dashboard
Once deployed, your service dashboard URL will be:
```
https://dashboard.render.com/web/srv-[your-service-id]
```

#### Key Sections:
- **Events**: Deployment history
- **Logs**: Real-time and historical logs
- **Environment**: Manage environment variables
- **Settings**: Service configuration
- **Custom Domains**: Add your domain

### 7. Common Dashboard Actions

#### View Logs
1. Navigate to your service
2. Click "Logs" in the top navigation
3. Use filters:
   - Time range selector (top right)
   - Search box for specific terms
   - Log level filter

#### Update Environment Variables
1. Navigate to your service
2. Click "Environment" in the top navigation
3. Click "Add Environment Variable" or edit existing
4. Click "Save Changes"
5. Service will auto-redeploy

#### Manual Deploy
1. Navigate to your service
2. Click "Manual Deploy" button (top right)
3. Select branch and commit
4. Click "Deploy"

#### Connect Custom Domain
1. Navigate to your service
2. Click "Settings" in the top navigation
3. Scroll to "Custom Domains"
4. Click "Add Custom Domain"
5. Follow DNS configuration instructions

### 8. Monitoring and Maintenance

#### Check Service Health
- **Dashboard Home**: Shows all services at a glance
- **Green dot**: Service is healthy
- **Yellow dot**: Deploying
- **Red dot**: Failed or suspended

#### View Metrics
1. Navigate to your service
2. Click "Metrics" in the top navigation
3. View:
   - HTTP requests
   - Response times
   - Memory usage
   - CPU usage

### 9. Troubleshooting via Dashboard

#### If Build Fails
1. Go to "Events" tab
2. Click on the failed deploy
3. View detailed build logs
4. Common issues:
   - Missing dependencies in package.json
   - Wrong Node version
   - Build command syntax error

#### If Service Won't Start
1. Check "Logs" tab for errors
2. Verify start command in "Settings"
3. Check environment variables
4. Ensure health check path returns 200

### 10. Quick Reference URLs

| Action | URL |
|--------|-----|
| Dashboard Home | https://dashboard.render.com |
| Create New Service | https://dashboard.render.com/new |
| Account Settings | https://dashboard.render.com/account/settings |
| Billing | https://dashboard.render.com/billing |
| Team Settings | https://dashboard.render.com/team/settings |
| All Services | https://dashboard.render.com/services |

### 11. Keyboard Shortcuts (In Dashboard)

- `?` - Show keyboard shortcuts
- `g` then `h` - Go to dashboard home
- `g` then `s` - Go to services
- `/` - Focus search
- `n` - Create new resource

### 12. Mobile Dashboard Access

The Render dashboard is mobile-responsive. Key features on mobile:
- View service status
- Check logs
- Restart services
- View deployment status

Access via: https://dashboard.render.com on your mobile browser

## Next Steps After Deployment

1. **Verify Deployment**
   - Visit: https://sixfb-frontend.onrender.com
   - Check all pages load correctly
   - Test API connectivity

2. **Set Up Monitoring**
   - Enable notifications in account settings
   - Set up uptime monitoring
   - Configure deploy notifications

3. **Performance Optimization**
   - Review metrics after 24 hours
   - Optimize build times
   - Consider upgrading plan if needed

4. **Security**
   - Review environment variables
   - Enable 2FA on your Render account
   - Audit team permissions

## Support Resources

- **Render Status**: https://status.render.com
- **Documentation**: https://render.com/docs
- **Community Forum**: https://community.render.com
- **Support Ticket**: Click "Support" in dashboard