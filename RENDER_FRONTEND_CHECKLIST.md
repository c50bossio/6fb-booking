# Frontend Deployment Debugging Checklist

## In Your Render Dashboard:

### 1. Service URL
- Go to https://dashboard.render.com
- Click on your `sixfb-frontend` service
- Look at the top of the page for the actual URL
- It should look like: `https://sixfb-frontend-XXXX.onrender.com`
- Copy this exact URL

### 2. Service Status
- In the same service page, check the status
- Should show "Live" with a green indicator
- If it shows "Deploy in progress" or "Failed", that's the issue

### 3. Logs Tab
- Click on the "Logs" tab
- Look for any red error messages
- Common issues:
  - "Build failed"
  - "Cannot find module"
  - "Port binding error"

### 4. Environment Tab
- Click on "Environment" tab
- Verify all these variables are set:
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=https://sixfb-backend.onrender.com/api/v1
  - All other NEXT_PUBLIC_* variables

### 5. Settings Tab
- Click on "Settings" tab
- Verify:
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
  - Root Directory: `frontend`

## Quick Fixes:

### If Status is "Failed":
1. Click "Manual Deploy" → "Deploy latest commit"
2. Watch the logs for errors

### If Build Succeeds but Site Doesn't Load:
1. Check the exact URL from dashboard
2. Wait 2-3 minutes for DNS propagation
3. Try in incognito/private browser window

### If Environment Variables Missing:
1. Add them in Environment tab
2. Trigger a new deploy

## What to Share:
Please share:
1. The exact URL from your dashboard
2. Current status (Live/Failed/Building)
3. Any error messages from logs
4. Screenshot of the service overview page
