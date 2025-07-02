# Getting Started with BookedBarber V2

Welcome to BookedBarber V2! This guide will walk you through setting up your development environment and getting the platform running locally.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Backend Configuration](#backend-configuration)
- [Frontend Configuration](#frontend-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Testing Your Setup](#testing-your-setup)
- [Common Issues](#common-issues)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Python 3.9 or higher** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18 or higher** - [Download Node.js](https://nodejs.org/)
- **Git** - [Download Git](https://git-scm.com/downloads)
- **PostgreSQL 13+** (for production) or SQLite (for development)

### Recommended Tools
- **VS Code** - [Download VS Code](https://code.visualstudio.com/)
- **Postman** or **Insomnia** - For API testing
- **TablePlus** or **pgAdmin** - For database management

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, or Ubuntu 20.04+
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 2GB free space

## Initial Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/bookedbarber-v2.git

# Navigate to the project directory
cd bookedbarber-v2

# Create a feature branch for your work
git checkout -b feature/your-name-setup-$(date +%Y%m%d)
```

### 2. Project Structure Overview

```
bookedbarber-v2/
├── backend-v2/           # FastAPI backend (V2)
│   ├── frontend-v2/      # Next.js frontend (V2)
│   ├── main.py          # Backend entry point
│   ├── requirements.txt  # Python dependencies
│   └── alembic/         # Database migrations
├── docs/                # Documentation
├── scripts/             # Utility scripts
└── CLAUDE.md           # AI assistant guidelines
```

⚠️ **Important**: Only use the V2 directories (`backend-v2/` and `backend-v2/frontend-v2/`). The V1 directories are deprecated.

## Backend Configuration

### 1. Create Python Virtual Environment

```bash
# Navigate to backend directory
cd backend-v2

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# You should see (venv) in your terminal prompt
```

### 2. Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install all dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print('FastAPI installed successfully!')"
```

### 3. Environment Variables

Create your environment configuration:

```bash
# Copy the template
cp .env.template .env

# Open .env in your editor
# Edit the following required variables:
```

Edit `.env` with these essential settings:

```env
# Application Settings
APP_NAME="BookedBarber V2"
SECRET_KEY="your-secret-key-here"  # Generate with: python -c 'import secrets; print(secrets.token_urlsafe(64))'
ENVIRONMENT="development"
DEBUG=True

# Database Configuration
DATABASE_URL="sqlite:///./6fb_booking.db"  # For development
# DATABASE_URL="postgresql://user:password@localhost/bookedbarber"  # For PostgreSQL

# JWT Configuration
JWT_SECRET_KEY="your-jwt-secret"  # Generate another secret key
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Stripe Configuration (Get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email Configuration (SendGrid)
SENDGRID_API_KEY="SG...."
FROM_EMAIL="noreply@bookedbarber.com"

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1234567890"

# Google Calendar (Optional for now)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Frontend URL
FRONTEND_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
# Run database migrations
alembic upgrade head

# Create initial admin user (optional)
python scripts/create_admin.py

# Seed sample data (optional)
python scripts/seed_data.py
```

## Frontend Configuration

### 1. Install Node Dependencies

```bash
# Navigate to frontend directory
cd ../backend-v2/frontend-v2

# Install dependencies
npm install

# Verify installation
npm list react
```

### 2. Frontend Environment Variables

Create your frontend environment configuration:

```bash
# Copy the template
cp .env.local.example .env.local

# Edit .env.local with your configuration
```

Edit `.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME="BookedBarber V2"

# Stripe Public Key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Google Analytics (Optional)
NEXT_PUBLIC_GA_ID=

# Feature Flags
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

## Running the Application

### Option 1: Using the Start Script (Recommended)

From the project root:

```bash
# Make the script executable
chmod +x ./scripts/start-dev-session.sh

# Run both backend and frontend
./scripts/start-dev-session.sh
```

### Option 2: Manual Start

#### Terminal 1 - Backend
```bash
cd backend-v2
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Terminal 2 - Frontend
```bash
cd backend-v2/frontend-v2
npm run dev
```

### Access Points

Once running, you can access:

- 🌐 **Frontend**: http://localhost:3000
- 🔧 **Backend API**: http://localhost:8000
- 📚 **API Documentation**: http://localhost:8000/docs
- 🔍 **API Interactive Docs**: http://localhost:8000/redoc

## Testing Your Setup

### 1. Backend Health Check

```bash
# Check if the backend is running
curl http://localhost:8000/health

# Expected response:
# {"status": "healthy", "timestamp": "..."}
```

### 2. Create a Test User

```bash
# Using the API
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### 3. Frontend Check

1. Open http://localhost:3000
2. You should see the BookedBarber landing page
3. Click "Login" to test the auth flow
4. Try creating a test booking

### 4. Run Tests

```bash
# Backend tests
cd backend-v2
pytest

# Frontend tests
cd backend-v2/frontend-v2
npm test
```

## Common Issues

### Issue: "Module not found" errors
**Solution**: Ensure you've activated your virtual environment and installed all dependencies.

```bash
# Reactivate venv and reinstall
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Database connection errors
**Solution**: Check your DATABASE_URL in `.env` and ensure the database server is running.

```bash
# For SQLite, ensure the file has write permissions
chmod 664 6fb_booking.db
```

### Issue: CORS errors in browser
**Solution**: Ensure FRONTEND_URL in backend `.env` matches your frontend URL.

### Issue: Port already in use
**Solution**: Kill the process using the port or use a different port.

```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

## Next Steps

Now that you have BookedBarber V2 running locally:

1. **Explore the API**: Visit http://localhost:8000/docs to see all available endpoints
2. **Read the Architecture Guide**: Understand the system design in [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Review Coding Standards**: Check [DEVELOPMENT/CODING_STANDARDS.md](./DEVELOPMENT/CODING_STANDARDS.md)
4. **Set Up Your IDE**: Configure VS Code with recommended extensions
5. **Join the Community**: Connect with other developers on Discord

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Search existing [GitHub Issues](https://github.com/yourusername/bookedbarber-v2/issues)
3. Ask in our [Discord Community](https://discord.gg/bookedbarber)
4. Email support: dev-support@bookedbarber.com

---

🎉 **Congratulations!** You've successfully set up BookedBarber V2. Happy coding!