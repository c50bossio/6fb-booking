#!/bin/bash

# BookedBarber V2 Performance Testing Dependencies Installation
echo "🚀 Installing BookedBarber V2 Performance Testing Dependencies"
echo "============================================================="

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Please run this script from the backend-v2 directory"
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install aiohttp psutil requests statistics

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found. Please install Node.js for frontend performance testing."
    echo "   Visit: https://nodejs.org/"
else
    echo "✅ Node.js found: $(node --version)"
    
    # Install Puppeteer for frontend testing
    echo "📦 Installing Puppeteer for frontend testing..."
    if [ ! -f "package.json" ]; then
        echo "Creating package.json..."
        cat > package.json << EOF
{
  "name": "bookedbarber-performance-tests",
  "version": "1.0.0",
  "description": "Performance testing suite for BookedBarber V2",
  "main": "frontend_performance_analyzer.js",
  "dependencies": {
    "puppeteer": "^21.0.0"
  },
  "scripts": {
    "test": "node frontend_performance_analyzer.js"
  }
}
EOF
    fi
    
    # Install npm dependencies
    npm install puppeteer
    
    if [ $? -eq 0 ]; then
        echo "✅ Puppeteer installed successfully"
    else
        echo "⚠️  Puppeteer installation failed. Frontend tests may not work."
    fi
fi

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x run_performance_benchmark.py
chmod +x performance_benchmark_suite.py
chmod +x e2e_booking_performance_test.py

# Create a quick test runner
echo "📝 Creating quick test runner..."
cat > run_quick_performance_test.sh << 'EOF'
#!/bin/bash

echo "🎯 BookedBarber V2 Quick Performance Test"
echo "========================================"

# Check if backend is running
if ! curl -s http://localhost:8000/api/v1/health > /dev/null; then
    echo "❌ Backend server is not running at http://localhost:8000"
    echo "Please start the backend server first:"
    echo "   cd backend-v2"
    echo "   uvicorn main:app --reload"
    exit 1
fi

echo "✅ Backend server is running"

# Run the performance benchmark
echo "🚀 Running performance benchmark..."
python3 run_performance_benchmark.py

echo "🎉 Performance test completed!"
EOF

chmod +x run_quick_performance_test.sh

echo ""
echo "✅ Installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Start your backend server: uvicorn main:app --reload"
echo "2. (Optional) Start your frontend server: cd frontend-v2 && npm run dev"
echo "3. Run performance tests: ./run_quick_performance_test.sh"
echo ""
echo "🔧 Available test scripts:"
echo "   ./run_quick_performance_test.sh     - Run all performance tests"
echo "   python3 performance_benchmark_suite.py    - Backend and API tests only"
echo "   node frontend_performance_analyzer.js     - Frontend tests only"
echo "   python3 e2e_booking_performance_test.py   - E2E booking flow tests only"
echo ""
echo "📊 Results will be saved as JSON files with timestamps for detailed analysis."