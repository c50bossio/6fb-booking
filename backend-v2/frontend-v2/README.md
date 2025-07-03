# Frontend v2 - Minimal Setup

A minimal Next.js 14 frontend with TypeScript and Tailwind CSS.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your backend URL (default: http://localhost:8000)

4. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🌍 Environment Management

### Available Environments

| Environment | Frontend | Backend | Purpose |
|-------------|----------|---------|---------|
| Development | localhost:3000 | localhost:8000 | Daily development work |
| Staging | localhost:3001 | localhost:8001 | Testing & validation |

### Starting Environments

#### Development Environment (Default)
```bash
npm run dev          # Start frontend on port 3000
# Backend: cd ../.. && uvicorn main:app --reload --port 8000
```

#### Staging Environment
```bash
npm run staging      # Start frontend on port 3001  
# Backend: cd ../.. && uvicorn main:app --reload --port 8001 --env-file .env.staging
```

#### Both Environments (Parallel)
```bash
npm run dev &        # Development frontend
npm run staging &    # Staging frontend
# Start both backends in separate terminals
```

### Environment Detection Scripts
```bash
npm run env          # Show environment status and URLs
npm run env:check    # Check port availability and conflicts
npm run ports        # Show detailed port usage
npm run kill:staging # Stop staging processes
```

### Environment URLs
- **Development Frontend**: http://localhost:3000
- **Development Backend**: http://localhost:8000/docs  
- **Staging Frontend**: http://localhost:3001
- **Staging Backend**: http://localhost:8001/docs

## Structure

- `/app` - Next.js 14 app directory
  - `layout.tsx` - Minimal root layout
  - `page.tsx` - Simple landing page
  - `login/page.tsx` - Basic login form
  - `dashboard/page.tsx` - Protected dashboard
- `/lib/api.ts` - Simple fetch wrapper for API calls
- No complex state management - just React state
- No provider hell - clean and simple

## 📝 Available Scripts

### Development Scripts
- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run test suite

### Staging Scripts  
- `npm run staging` - Start staging server (port 3001)
- `npm run staging:turbo` - Start staging with Turbo mode

### Environment Management
- `npm run env` - Show environment status
- `npm run env:check` - Check port conflicts
- `npm run ports` - Show port usage
- `npm run kill:staging` - Kill staging processes

## 🔧 Troubleshooting

### Port Conflicts
If you get "port already in use" errors:
```bash
npm run env:check    # Check which ports are in use
npm run kill:staging # Kill staging processes
lsof -i :3000        # Check development frontend port
lsof -i :3001        # Check staging frontend port
```

### Environment Issues
```bash
npm run env          # Check environment status
rm -rf .next         # Clear Next.js cache
npm install          # Reinstall dependencies
```

### Staging Not Working
```bash
# Check if backend is running
curl http://localhost:8001/health

# Check frontend compilation
npm run staging

# Check environment variables
echo $NODE_ENV
```