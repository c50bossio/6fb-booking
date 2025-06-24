# 6FB Booking Financial Dashboard - Demo Testing Guide

## 🚀 Quick Start Testing

### Option 1: Direct API Testing (Immediate)

The backend is currently running at `http://localhost:8000`. You can test the financial dashboard APIs directly:

#### Test Financial Dashboard Endpoints

1. **Shop Metrics API** (Demo Mode):
```bash
curl "http://localhost:8000/api/v1/financial/shop-metrics?period=month" \
  -H "Authorization: Bearer demo_token" \
  -H "Content-Type: application/json"
```

2. **Barber Revenue API** (Demo Mode):
```bash
curl "http://localhost:8000/api/v1/financial/barber-revenue?period=month" \
  -H "Authorization: Bearer demo_token" \
  -H "Content-Type: application/json"
```

3. **Payout Summary API** (Demo Mode):
```bash
curl "http://localhost:8000/api/v1/financial/payout-summary?period=month" \
  -H "Authorization: Bearer demo_token" \
  -H "Content-Type: application/json"
```

4. **API Documentation**:
```bash
open http://localhost:8000/docs
```

### Option 2: Full Frontend Testing

#### Start Both Servers:

1. **Backend Server** (if not running):
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. **Frontend Server**:
```bash
cd frontend
npm run dev
```

#### Access the Application:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Option 3: Demo Mode Testing (Recommended)

The system includes a comprehensive demo mode that works without real user authentication:

#### Create Demo User:
```bash
cd backend
python -c "
from models.user import User
from config.database import SessionLocal
from passlib.context import CryptContext

db = SessionLocal()
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

demo_user = User(
    email='demo@6fb.com',
    first_name='Demo',
    last_name='User',
    hashed_password=pwd_context.hash('demo123'),
    role='shop_owner',
    is_active=True
)
db.add(demo_user)
db.commit()
print('Demo user created: demo@6fb.com / demo123')
"
```

## 🎯 What You'll See

### Financial Dashboard Features:

1. **Shop Owner Dashboard**:
   - Real-time revenue metrics with animated counters
   - Interactive pie charts showing revenue breakdown
   - Bar charts for barber performance comparison
   - Trend indicators showing period-over-period growth
   - Processing fees and net revenue calculations

2. **Compensation Plan Manager**:
   - Create/edit compensation plans
   - Commission vs Booth Rent vs Hybrid models
   - Plan comparison tool (side-by-side analysis)
   - Earnings preview calculator
   - Barber assignment interface

3. **Payout History**:
   - Complete transaction history with filtering
   - Status tracking (pending, completed, failed)
   - Receipt download functionality
   - Detailed breakdown modals
   - Retry failed payouts

### Demo Data Generated:
- **Monthly Revenue**: ~$37,500 (realistic for mid-size shop)
- **Active Barbers**: 4 with different compensation models
- **Service Revenue**: 85% of total revenue
- **Product Revenue**: 10% of total revenue  
- **Tips**: 5% of total revenue
- **Processing Fees**: 2.9% + $0.30 per transaction
- **Pending Payouts**: ~$4,500 across 3 barbers

## 🔧 Troubleshooting

### If APIs Return 401 Unauthorized:
The demo mode should work without authentication, but if you get 401 errors:

1. **Login with Demo User**:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@6fb.com", "password": "demo123"}'
```

2. **Use the returned access_token** in subsequent requests:
```bash
curl "http://localhost:8000/api/v1/financial/shop-metrics?period=month" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### If Frontend Won't Start:
```bash
cd frontend
npm install
npm run build
npm run dev
```

### If Backend Won't Start:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

## 📱 Expected User Experience

### Dashboard Navigation:
1. Login with demo@6fb.com / demo123
2. Navigate to Financial Dashboard section
3. See real-time metrics and charts
4. Click through different time periods (week/month/quarter)
5. Explore compensation plans and payout history

### Demo Mode Features:
- All financial data is realistic but generated
- Charts and graphs populate with sample data
- All interactions work without real payment processing
- Perfect for sales presentations and testing

## 🎉 Key Testing Points

1. **Revenue Calculations**: Verify numbers add up correctly
2. **Chart Interactions**: Hover effects and responsive design
3. **Period Switching**: Different time ranges update data
4. **Compensation Plans**: Create/edit/compare functionality
5. **Payout Management**: Transaction history and filtering
6. **Mobile Responsiveness**: Test on different screen sizes

## 📞 Support

If you encounter any issues:
1. Check the console logs in browser developer tools
2. Verify both servers are running on correct ports
3. Ensure demo user exists in database
4. Try the direct API testing approach first

The system is designed to work immediately with realistic demo data, making it perfect for testing and presentations!