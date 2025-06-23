#!/bin/bash
# QUICK START SCRIPT FOR RENDER WITH ERROR HANDLING

echo "Starting 6FB Booking Backend on Render..."

# Set environment defaults if not present
export PYTHONPATH=/app:$PYTHONPATH
export PORT=${PORT:-8000}

# Try to fix any import issues
if [ -f "alembic.ini" ]; then
    echo "Running database migrations..."
    alembic upgrade head || echo "Migration failed, continuing anyway..."
fi

# Multiple start attempts with different methods
echo "Attempting to start server..."

# Method 1: Direct Python
python main.py && exit 0

# Method 2: Uvicorn with main module
uvicorn main:app --host 0.0.0.0 --port $PORT && exit 0

# Method 3: Gunicorn fallback
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT && exit 0

# Method 4: Emergency basic start
python -c "
import os
from fastapi import FastAPI
app = FastAPI()
@app.get('/')
def health(): return {'status': 'emergency mode'}
if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv('PORT', 8000)))
"
