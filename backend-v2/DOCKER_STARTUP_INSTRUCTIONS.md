# Docker Startup Instructions

## Quick Start (Once Docker is installed)

1. **Start the complete application:**
   ```bash
   cd /Users/bossio/6fb-booking/backend-v2
   docker-compose up --build
   ```

2. **Access the application:**
   - **Frontend**: http://localhost:3000 (Next.js)
   - **Backend API**: http://localhost:8000 (FastAPI)
   - **Database**: PostgreSQL on localhost:5432

3. **Test ShareBookingModal:**
   - Navigate to http://localhost:3000
   - Login as admin: admin@bookedbarber.com / admin123
   - Look for the Link button in the header
   - Click it to see all 8 sharing options

## Docker Services

The docker-compose.yml includes:

- **frontend**: Next.js app with Node.js 18-alpine
- **backend**: FastAPI with Python 3.11-slim  
- **db**: PostgreSQL 15-alpine database
- **Automatic networking**: Services can communicate internally

## Environment Variables

The containers use these environment variables:
- `NEXT_PUBLIC_API_URL=http://backend:8000` (internal Docker networking)
- `DATABASE_URL=postgresql://postgres:postgres@db:5432/sixfb`

## First Time Setup

When containers start for the first time:
1. PostgreSQL database will be created automatically
2. Backend will run database migrations
3. Frontend will build and start on port 3000

## Troubleshooting

If containers don't start:
```bash
# Stop all containers
docker-compose down

# Remove volumes and start fresh
docker-compose down -v

# Rebuild and start
docker-compose up --build
```

## Development Mode

For development with hot reload:
```bash
# Start with volume mounting for live code changes
docker-compose up --build
```

The volumes are already configured in docker-compose.yml for live development.