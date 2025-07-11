#\!/bin/bash
# Essential server cleanup script
# Simplified from SuperClaude V2 system

echo "🧹 Cleaning up development servers..."

# Kill any running Next.js dev servers
if pgrep -f "next dev" > /dev/null; then
    echo "🛑 Stopping Next.js development servers..."
    pkill -f "next dev"
    sleep 2
fi

# Kill any npm run dev processes
if pgrep -f "npm run dev" > /dev/null; then
    echo "🛑 Stopping npm development processes..."
    pkill -f "npm run dev"
    sleep 2
fi

# Kill any uvicorn servers on port 8000
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "🛑 Stopping FastAPI server on port 8000..."
    lsof -ti:8000 | xargs kill -9
fi

# Clear any corrupted Next.js build cache
if [ -d "backend-v2/frontend-v2/.next" ]; then
    echo "🗑️  Clearing Next.js build cache..."
    rm -rf backend-v2/frontend-v2/.next
fi

echo "✅ Server cleanup complete"
EOF < /dev/null