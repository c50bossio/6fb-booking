#!/bin/bash

# BookedBarber V2 - Docker Auth Consistency Verification Script
# Tests authentication flow reliability in Docker environment

set -e

echo "🔍 BookedBarber Docker Auth Verification"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_EMAIL="dockertest@example.com"
TEST_PASSWORD="DockerTest123!"
TEST_NAME="Docker Test User"
NUM_TESTS=10
API_BASE="http://localhost:8000"
FRONTEND_BASE="http://localhost:3000"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to make API request with proper error handling
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local expected_status="$4"
    
    local response
    local status_code
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -H "Cache-Control: no-cache" \
            -d "$data" \
            "$API_BASE$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X "$method" \
            -H "Cache-Control: no-cache" \
            "$API_BASE$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
    fi
    
    status_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    response_body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "$response_body"
        return 0
    else
        echo "HTTP $status_code: $response_body" >&2
        return 1
    fi
}

# Function to extract JSON field
extract_json_field() {
    local json="$1"
    local field="$2"
    echo "$json" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('$field', ''))
except:
    pass
"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        exit 1
    fi
    
    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        print_error "BookedBarber containers are not running"
        echo "Start them with: docker-compose up -d"
        exit 1
    fi
    
    # Check if backend is responding
    if ! curl -sf "$API_BASE/health" >/dev/null 2>&1; then
        print_error "Backend is not responding at $API_BASE"
        print_status "Waiting for backend to start..."
        sleep 10
        if ! curl -sf "$API_BASE/health" >/dev/null 2>&1; then
            print_error "Backend failed to start"
            exit 1
        fi
    fi
    
    # Check if frontend is responding
    if ! curl -sf "$FRONTEND_BASE" >/dev/null 2>&1; then
        print_warning "Frontend is not responding at $FRONTEND_BASE (this is okay for API testing)"
    fi
    
    print_success "Prerequisites check passed"
}

# Setup test user
setup_test_user() {
    print_status "Setting up test user..."
    
    # Try to create test user (ignore if already exists)
    local user_data="{
        \"email\": \"$TEST_EMAIL\",
        \"name\": \"$TEST_NAME\",
        \"password\": \"$TEST_PASSWORD\",
        \"user_type\": \"client\"
    }"
    
    if api_request "POST" "/api/v1/auth/register-client" "$user_data" "200" >/dev/null 2>&1; then
        print_success "Test user created"
    else
        print_status "Test user already exists (expected)"
    fi
}

# Test single login attempt
test_login_attempt() {
    local attempt_num="$1"
    local start_time=$(date +%s.%N)
    
    local login_data="{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\"
    }"
    
    local response
    if response=$(api_request "POST" "/api/v1/auth/login" "$login_data" "200" 2>/dev/null); then
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc -l)
        
        # Extract token information
        local access_token=$(extract_json_field "$response" "access_token")
        local token_type=$(extract_json_field "$response" "token_type")
        
        if [ -n "$access_token" ] && [ "$token_type" = "bearer" ]; then
            printf "✅ Test %2d: SUCCESS (%.3fs) token_len=%d\n" "$attempt_num" "$duration" "${#access_token}"
            return 0
        else
            printf "❌ Test %2d: FAILED - Invalid token response\n" "$attempt_num"
            return 1
        fi
    else
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc -l)
        printf "❌ Test %2d: FAILED (%.3fs) - HTTP error\n" "$attempt_num" "$duration"
        return 1
    fi
}

# Test auth consistency
test_auth_consistency() {
    print_status "Testing authentication consistency ($NUM_TESTS attempts)..."
    echo "=================================================="
    
    local success_count=0
    local total_time=0
    local durations=()
    
    for i in $(seq 1 $NUM_TESTS); do
        local start_time=$(date +%s.%N)
        
        if test_login_attempt "$i"; then
            ((success_count++))
        fi
        
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc -l)
        durations+=("$duration")
        total_time=$(echo "$total_time + $duration" | bc -l)
        
        # Small delay between tests
        sleep 0.1
    done
    
    echo ""
    echo "📊 Test Results Summary"
    echo "======================"
    
    local success_rate=$(echo "scale=1; $success_count * 100 / $NUM_TESTS" | bc -l)
    local avg_time=$(echo "scale=3; $total_time / $NUM_TESTS" | bc -l)
    
    echo "Total tests: $NUM_TESTS"
    echo "Successful: $success_count"
    echo "Failed: $((NUM_TESTS - success_count))"
    printf "Success rate: %.1f%%\n" "$success_rate"
    printf "Average response time: %.3fs\n" "$avg_time"
    
    # Calculate min/max response times
    local min_time=$(printf '%s\n' "${durations[@]}" | sort -n | head -1)
    local max_time=$(printf '%s\n' "${durations[@]}" | sort -n | tail -1)
    printf "Response time range: %.3fs - %.3fs\n" "$min_time" "$max_time"
    
    echo ""
    
    if [ "$success_count" -eq "$NUM_TESTS" ]; then
        print_success "Perfect consistency! All tests passed."
        return 0
    elif [ "$success_count" -ge $((NUM_TESTS * 90 / 100)) ]; then
        print_warning "Good consistency (>90% success rate)"
        return 0
    else
        print_error "Poor consistency (<90% success rate)"
        return 1
    fi
}

# Test container health
test_container_health() {
    print_status "Testing container health..."
    
    # Test backend health
    if curl -sf "$API_BASE/health" >/dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Test detailed health
    if curl -sf "$API_BASE/health/detailed" >/dev/null 2>&1; then
        print_success "Detailed health check passed"
    else
        print_warning "Detailed health check not available"
    fi
    
    # Test auth debug endpoint
    if curl -sf "$API_BASE/api/v1/auth/debug" >/dev/null 2>&1; then
        print_success "Auth debug endpoint responding"
    else
        print_warning "Auth debug endpoint not available (may be disabled)"
    fi
    
    return 0
}

# Test Redis session storage
test_redis_sessions() {
    print_status "Testing Redis session storage..."
    
    # Check if Redis is accessible from host
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis is accessible"
        
        # Count sessions
        local session_count=$(docker-compose exec -T redis redis-cli eval "return #redis.call('keys', 'session:*')" 0 2>/dev/null || echo "0")
        print_status "Active sessions in Redis: $session_count"
        
        # Test session creation by doing a login
        local login_data="{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\"
        }"
        
        if api_request "POST" "/api/v1/auth/login" "$login_data" "200" >/dev/null 2>&1; then
            sleep 1  # Give Redis time to store session
            local new_session_count=$(docker-compose exec -T redis redis-cli eval "return #redis.call('keys', 'session:*')" 0 2>/dev/null || echo "0")
            
            if [ "$new_session_count" -gt "$session_count" ]; then
                print_success "Session successfully stored in Redis"
            else
                print_warning "Session may not be stored in Redis properly"
            fi
        else
            print_warning "Could not test session storage (login failed)"
        fi
    else
        print_error "Redis is not accessible"
        return 1
    fi
    
    return 0
}

# Generate browser test script
generate_browser_test() {
    print_status "Generating browser test script..."
    
    cat > /tmp/docker-auth-browser-test.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>BookedBarber Docker Auth Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; }
        .info { background-color: #d1ecf1; border: 1px solid #bee5eb; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>🐳 BookedBarber Docker Auth Test</h1>
    
    <div>
        <button onclick="testLogin()">Test Login</button>
        <button onclick="testAuthState()">Check Auth State</button>
        <button onclick="clearCache()">Clear Cache</button>
        <button onclick="runConsistencyTest()">Run Consistency Test (10x)</button>
    </div>
    
    <div id="results"></div>
    
    <script>
        const API_BASE = 'http://localhost:8000';
        const TEST_EMAIL = 'dockertest@example.com';
        const TEST_PASSWORD = 'DockerTest123!';
        
        function addResult(message, type = 'info') {
            const div = document.createElement('div');
            div.className = `test-result ${type}`;
            div.innerHTML = `${new Date().toLocaleTimeString()}: ${message}`;
            document.getElementById('results').appendChild(div);
            div.scrollIntoView();
        }
        
        async function testLogin() {
            try {
                addResult('Testing login...', 'info');
                
                const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    body: JSON.stringify({
                        email: TEST_EMAIL,
                        password: TEST_PASSWORD
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    addResult(`✅ Login successful! Token length: ${data.access_token?.length || 0}`, 'success');
                    
                    // Store token for testing
                    localStorage.setItem('test_token', data.access_token);
                } else {
                    const error = await response.text();
                    addResult(`❌ Login failed: ${response.status} - ${error}`, 'error');
                }
            } catch (error) {
                addResult(`❌ Login error: ${error.message}`, 'error');
            }
        }
        
        async function testAuthState() {
            try {
                const token = localStorage.getItem('test_token');
                if (!token) {
                    addResult('❌ No token found. Please login first.', 'error');
                    return;
                }
                
                addResult('Testing auth state...', 'info');
                
                const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (response.ok) {
                    const user = await response.json();
                    addResult(`✅ Auth state valid! User: ${user.email}`, 'success');
                } else {
                    addResult(`❌ Auth state invalid: ${response.status}`, 'error');
                    localStorage.removeItem('test_token');
                }
            } catch (error) {
                addResult(`❌ Auth state error: ${error.message}`, 'error');
            }
        }
        
        function clearCache() {
            localStorage.clear();
            sessionStorage.clear();
            addResult('🧹 Cache cleared', 'info');
        }
        
        async function runConsistencyTest() {
            addResult('🔄 Running consistency test (10 attempts)...', 'info');
            
            let successCount = 0;
            const startTime = Date.now();
            
            for (let i = 1; i <= 10; i++) {
                try {
                    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache'
                        },
                        body: JSON.stringify({
                            email: TEST_EMAIL,
                            password: TEST_PASSWORD
                        })
                    });
                    
                    if (response.ok) {
                        successCount++;
                    }
                    
                    // Small delay between requests
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    // Request failed
                }
            }
            
            const totalTime = Date.now() - startTime;
            const successRate = (successCount / 10) * 100;
            
            if (successRate === 100) {
                addResult(`✅ Perfect consistency! ${successCount}/10 successful (${totalTime}ms total)`, 'success');
            } else if (successRate >= 90) {
                addResult(`⚠️ Good consistency: ${successCount}/10 successful (${successRate}%)`, 'info');
            } else {
                addResult(`❌ Poor consistency: ${successCount}/10 successful (${successRate}%)`, 'error');
            }
        }
        
        // Add initial info
        addResult('🐳 Docker Auth Test page loaded. Click buttons to test authentication.', 'info');
    </script>
</body>
</html>
EOF
    
    print_success "Browser test script generated: /tmp/docker-auth-browser-test.html"
    print_status "Open this file in your browser to test auth from the frontend perspective"
}

# Main test execution
run_all_tests() {
    local exit_code=0
    
    check_prerequisites || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        setup_test_user
        
        echo ""
        test_container_health || exit_code=1
        
        echo ""
        test_redis_sessions || exit_code=1
        
        echo ""
        test_auth_consistency || exit_code=1
        
        echo ""
        generate_browser_test
    fi
    
    return $exit_code
}

# Parse command line arguments
case "${1:-all}" in
    "login")
        setup_test_user
        test_login_attempt 1
        ;;
    "health")
        test_container_health
        ;;
    "redis")
        test_redis_sessions
        ;;
    "consistency")
        setup_test_user
        test_auth_consistency
        ;;
    "browser")
        generate_browser_test
        ;;
    "all"|*)
        run_all_tests
        ;;
esac

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    print_success "All Docker auth tests completed successfully!"
else
    print_error "Some tests failed. Check the output above for details."
    echo ""
    echo "💡 Troubleshooting tips:"
    echo "  1. Run './scripts/docker-auth-reset.sh' to clear auth state"
    echo "  2. Restart containers: docker-compose restart"
    echo "  3. Check container logs: docker-compose logs backend frontend"
    echo "  4. Verify Redis: docker-compose exec redis redis-cli ping"
fi

exit $exit_code