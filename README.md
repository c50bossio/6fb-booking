# 6FB Booking Platform

A comprehensive booking platform for Six Figure Barber mentorship members that integrates with Trafft and automates the proven 6FB methodology.

## Quick Start

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.template .env
# Edit .env with your actual values
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
6fb-booking/
├── backend/          # FastAPI backend
│   ├── models/       # Database models
│   ├── api/          # API routes
│   ├── services/     # Business logic
│   └── config/       # Configuration
├── frontend/         # Next.js frontend
└── docs/            # Documentation
```

## Features

- **Trafft Integration**: Real-time sync with existing booking system
- **6FB Analytics**: Automated calculation of key business metrics
- **Client Management**: Enhanced customer tracking and insights
- **Automation**: Smart workflows for retention and growth
- **Mentor Portal**: Coaching tools and member management

## Development Phases

- **Phase 1**: Foundation & Trafft Integration (Weeks 1-2)
- **Phase 2**: 6FB Analytics Engine (Weeks 3-4)
- **Phase 3**: Automation Engine (Weeks 5-6)
- **Phase 4**: Admin & Mentor Portal (Weeks 7-8)