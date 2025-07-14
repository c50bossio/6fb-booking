#!/bin/bash

# Troubleshoot staging environment issues
echo "🔧 BookedBarber V2 Staging Environment Troubleshooting"
echo "======================================================"

# Function to check and fix common issues
check_ports() {
    echo "🔌 Checking ports and processes..."
    
    # Check for port conflicts
    if lsof -i:8001 >/dev/null 2>&1; then
        echo "⚠️  Port 8001 is in use:"
        lsof -i:8001
        echo ""
        echo "To fix: kill \$(lsof -ti:8001)"
    else
        echo "✅ Port 8001 is available"
    fi
    
    if lsof -i:3001 >/dev/null 2>&1; then
        echo "⚠️  Port 3001 is in use:"
        lsof -i:3001
        echo ""
        echo "To fix: kill \$(lsof -ti:3001)"
    else
        echo "✅ Port 3001 is available"
    fi
    
    # Check for zombie processes
    echo ""
    echo "🧟 Checking for zombie processes..."
    ZOMBIE_PROCS=$(ps aux | grep -E "(uvicorn|next|npm)" | grep -v grep | grep -E "(8001|3001|staging)")
    if [ ! -z "$ZOMBIE_PROCS" ]; then
        echo "⚠️  Found potential zombie processes:"
        echo "$ZOMBIE_PROCS"
        echo ""
        echo "To fix: run ./stop-staging-environment.sh"
    else
        echo "✅ No zombie processes found"
    fi
}

check_config() {
    echo ""
    echo "⚙️  Checking configuration files..."
    
    # Check backend config
    if [ -f ".env.staging" ]; then
        echo "✅ Backend .env.staging exists"
        
        # Check for required variables
        if grep -q "DATABASE_URL=sqlite:///./staging_6fb_booking.db" .env.staging; then
            echo "✅ Database URL configured correctly"
        else
            echo "⚠️  Database URL may be incorrect"
        fi
        
        if grep -q "PORT=8001" .env.staging; then
            echo "✅ Backend port configured correctly"
        else
            echo "⚠️  Backend port may be incorrect"
        fi
    else
        echo "❌ Backend .env.staging missing"
        echo "Fix: Copy .env.template to .env.staging and configure"
    fi
    
    # Check frontend config
    if [ -f "frontend-v2/.env.staging" ]; then
        echo "✅ Frontend .env.staging exists"
        
        if grep -q "NEXT_PUBLIC_API_URL=http://localhost:8001" frontend-v2/.env.staging; then
            echo "✅ Frontend API URL configured correctly"
        else
            echo "⚠️  Frontend API URL may be incorrect"
        fi
    else
        echo "❌ Frontend .env.staging missing"
        echo "Fix: Create frontend-v2/.env.staging with staging configuration"
    fi
    
    # Check database
    if [ -f "staging_6fb_booking.db" ]; then
        DB_SIZE=$(ls -lh staging_6fb_booking.db | awk '{print $5}')
        echo "✅ Staging database exists (size: $DB_SIZE)"
    else
        echo "❌ Staging database missing"
        echo "Fix: Run ./reset-staging-database.sh"
    fi
}

check_dependencies() {
    echo ""
    echo "📦 Checking dependencies..."
    
    # Check Python dependencies
    if command -v python >/dev/null 2>&1; then
        echo "✅ Python available"
        if python -c "import uvicorn" 2>/dev/null; then
            echo "✅ uvicorn available"
        else
            echo "❌ uvicorn not available"
            echo "Fix: pip install uvicorn"
        fi
    else
        echo "❌ Python not available"
    fi
    
    # Check Node.js dependencies
    if command -v npm >/dev/null 2>&1; then
        echo "✅ npm available"
        if [ -f "frontend-v2/package.json" ]; then
            echo "✅ Frontend package.json exists"
            if [ -d "frontend-v2/node_modules" ]; then
                echo "✅ Frontend dependencies installed"
            else
                echo "⚠️  Frontend dependencies not installed"
                echo "Fix: cd frontend-v2 && npm install"
            fi
        else
            echo "❌ Frontend package.json missing"
        fi
    else
        echo "❌ npm not available"
    fi
    
    # Check for tmux
    if command -v tmux >/dev/null 2>&1; then
        echo "✅ tmux available"
    else
        echo "⚠️  tmux not available (optional but recommended)"
        echo "Install: brew install tmux (macOS) or apt-get install tmux (Ubuntu)"
    fi
}

check_permissions() {
    echo ""
    echo "🔐 Checking file permissions..."
    
    # Check script permissions
    scripts=("start-staging-environment.sh" "stop-staging-environment.sh" "check-staging-status.sh" "reset-staging-database.sh")
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            if [ -x "$script" ]; then
                echo "✅ $script is executable"
            else
                echo "⚠️  $script is not executable"
                echo "Fix: chmod +x $script"
            fi
        else
            echo "❌ $script missing"
        fi
    done
    
    # Check database permissions
    if [ -f "staging_6fb_booking.db" ]; then
        if [ -r "staging_6fb_booking.db" ] && [ -w "staging_6fb_booking.db" ]; then
            echo "✅ Database permissions correct"
        else
            echo "⚠️  Database permissions may be incorrect"
            echo "Fix: chmod 644 staging_6fb_booking.db"
        fi
    fi
}

test_connectivity() {
    echo ""
    echo "🌐 Testing connectivity..."
    
    # Only test if services are running
    if lsof -i:8001 >/dev/null 2>&1; then
        echo "Testing backend API..."
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health | grep -q "200"; then
            echo "✅ Backend API responding"
        else
            echo "⚠️  Backend API not responding properly"
        fi
        
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/docs | grep -q "200"; then
            echo "✅ API documentation accessible"
        else
            echo "⚠️  API documentation not accessible"
        fi
    else
        echo "ℹ️  Backend not running - skipping connectivity test"
    fi
    
    if lsof -i:3001 >/dev/null 2>&1; then
        echo "Testing frontend..."
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
            echo "✅ Frontend responding"
        else
            echo "⚠️  Frontend not responding properly"
        fi
    else
        echo "ℹ️  Frontend not running - skipping connectivity test"
    fi
}

fix_common_issues() {
    echo ""
    echo "🔧 Auto-fixing common issues..."
    
    # Fix script permissions
    echo "Setting script permissions..."
    chmod +x *.sh 2>/dev/null || true
    
    # Clean up old processes
    echo "Cleaning up old processes..."
    ./stop-staging-environment.sh >/dev/null 2>&1 || true
    
    # Check if database needs reset
    if [ ! -f "staging_6fb_booking.db" ]; then
        echo "Creating staging database..."
        if [ -f "6fb_booking.db" ]; then
            cp 6fb_booking.db staging_6fb_booking.db
            echo "✅ Staging database created"
        else
            echo "⚠️  Main database not found - cannot create staging database"
        fi
    fi
    
    echo "✅ Auto-fix complete"
}

# Main troubleshooting sequence
echo "Running comprehensive troubleshooting..."
echo ""

check_ports
check_config
check_dependencies
check_permissions
test_connectivity

echo ""
echo "🔧 Quick Fix Options:"
echo "1. Auto-fix common issues: This script with --fix flag"
echo "2. Reset database: ./reset-staging-database.sh"
echo "3. Stop all processes: ./stop-staging-environment.sh"
echo "4. Check status: ./check-staging-status.sh"
echo "5. Start fresh: ./start-staging-environment.sh"

# Check if --fix flag was provided
if [[ "$1" == "--fix" ]]; then
    fix_common_issues
fi

echo ""
echo "📚 Common Solutions:"
echo "• Port conflicts: ./stop-staging-environment.sh"
echo "• Database issues: ./reset-staging-database.sh"
echo "• Missing dependencies: npm install (frontend) or pip install (backend)"
echo "• Permission issues: chmod +x *.sh"
echo "• Config problems: Check .env.staging files"
echo ""
echo "🆘 If issues persist, check the logs in the tmux session or run services manually"