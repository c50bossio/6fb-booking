# Frontend Environment Variables Checklist

## Required Environment Variables

These environment variables are automatically set by the render.yaml configuration:

### ✅ Auto-configured Variables
| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `NEXT_PUBLIC_API_URL` | `https://sixfb-backend.onrender.com` | Backend API URL |
| `PORT` | `3000` | Frontend port |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disable Next.js telemetry |

### ⚠️ Optional Variables (Set Manually if Needed)
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Stripe Dashboard → API Keys |
| `NEXT_PUBLIC_GA_TRACKING_ID` | Google Analytics ID | Google Analytics → Admin → Data Streams |

## How to Set Optional Variables in Render

1. **Go to your frontend service in Render**
   - Dashboard → Services → `6fb-booking-frontend`

2. **Navigate to Environment**
   - Click "Environment" in the left sidebar

3. **Add Environment Variables**
   - Click "Add Environment Variable"
   - Enter the key and value
   - Click "Save"

4. **Restart Service**
   - The service will automatically restart with new variables

## Verifying Environment Variables

### From Render Dashboard
1. Go to your frontend service
2. Click "Environment"
3. All variables are listed there

### From Application
1. Check browser console on the frontend:
   ```javascript
   // Should show your API URL
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```

2. Check network tab for API calls going to correct URL

### Common Issues

1. **API calls failing**
   - Verify `NEXT_PUBLIC_API_URL` is set correctly
   - Check if backend is running
   - Verify CORS settings on backend

2. **Stripe not working**
   - Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Use the correct key (publishable, not secret)

3. **Environment variables not updating**
   - Render caches builds - may need to clear build cache
   - Go to Settings → Clear build cache → Redeploy

## Security Notes

- Never expose secret keys (use `NEXT_PUBLIC_` prefix only for client-side variables)
- Backend URL should use HTTPS in production
- Keep sensitive keys in Render dashboard, not in code
