#!/bin/bash
# Monitor script for 6FB Booking development environment

echo "📊 6FB Booking Development Monitor"
echo "=================================="

while true; do
    clear
    echo "📊 6FB Booking Development Monitor - $(date)"
    echo "=================================="
    echo ""
    
    # Check backend
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        echo "✅ Backend (port 8000): HEALTHY"
    else
        echo "❌ Backend (port 8000): DOWN"
        echo "   Last 3 lines from backend.log:"
        tail -3 backend.log 2>/dev/null | sed 's/^/   /'
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend (port 3000): RUNNING"
    else
        echo "❌ Frontend (port 3000): DOWN"
        echo "   Last 3 lines from frontend.log:"
        tail -3 frontend.log 2>/dev/null | sed 's/^/   /'
    fi
    
    echo ""
    echo "🔧 Process Information:"
    echo "----------------------"
    
    # Backend process
    BACKEND_PID=$(lsof -ti:8000)
    if [ -n "$BACKEND_PID" ]; then
        echo "Backend PID: $BACKEND_PID"
        ps -p $BACKEND_PID -o pid,ppid,pcpu,pmem,cmd --no-headers | sed 's/^/  /'
    else
        echo "Backend: No process found"
    fi
    
    # Frontend process
    FRONTEND_PID=$(lsof -ti:3000)
    if [ -n "$FRONTEND_PID" ]; then
        echo "Frontend PID: $FRONTEND_PID"
        ps -p $FRONTEND_PID -o pid,ppid,pcpu,pmem,cmd --no-headers | sed 's/^/  /'
    else
        echo "Frontend: No process found"
    fi
    
    echo ""
    echo "📈 Recent Activity:"
    echo "------------------"
    echo "Backend (last 2 lines):"
    tail -2 backend.log 2>/dev/null | sed 's/^/  /' || echo "  No backend log"
    echo "Frontend (last 2 lines):"
    tail -2 frontend.log 2>/dev/null | sed 's/^/  /' || echo "  No frontend log"
    
    echo ""
    echo "Press Ctrl+C to exit monitoring..."
    sleep 10
done