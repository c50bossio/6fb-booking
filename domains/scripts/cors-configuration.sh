#!/bin/bash

# BookedBarber V2 CORS Configuration Script
# Configures Cross-Origin Resource Sharing for all domains and subdomains

set -e

# Configuration
DOMAINS=(
    "https://bookedbarber.com"
    "https://www.bookedbarber.com"
    "https://app.bookedbarber.com"
    "https://admin.bookedbarber.com"
)

# Development domains
DEV_DOMAINS=(
    "http://localhost:3000"
    "http://localhost:3001"
    "http://localhost:8000"
    "http://localhost:8001"
    "https://staging.bookedbarber.com"
)

# API endpoints that need CORS
API_ENDPOINTS=(
    "/api/v1/auth"
    "/api/v1/appointments"
    "/api/v1/payments"
    "/api/v1/analytics"
    "/api/v1/integrations"
    "/api/v1/webhooks"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Environment
ENVIRONMENT="${ENVIRONMENT:-production}"

echo -e "${GREEN}BookedBarber V2 CORS Configuration${NC}"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo ""

# Function to generate CORS configuration for nginx
generate_nginx_cors() {
    local config_file="/tmp/nginx-cors-config.conf"
    
    echo -e "${BLUE}Generating nginx CORS configuration...${NC}"
    
    # Start of configuration
    cat > "$config_file" << 'EOF'
# BookedBarber V2 CORS Configuration for Nginx
# Add this to your nginx server blocks

# CORS Configuration Map
map $http_origin $cors_origin {
    default "";
EOF

    # Add production domains
    for domain in "${DOMAINS[@]}"; do
        echo "    \"$domain\" \"$domain\";" >> "$config_file"
    done
    
    # Add development domains if not production
    if [ "$ENVIRONMENT" != "production" ]; then
        for domain in "${DEV_DOMAINS[@]}"; do
            echo "    \"$domain\" \"$domain\";" >> "$config_file"
        done
    fi
    
    cat >> "$config_file" << 'EOF'
}

# CORS headers for API endpoints
location ~ ^/api/v1/.*$ {
    # Handle preflight requests
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin $cors_origin always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Max-Age "3600" always;
        add_header Content-Length 0;
        add_header Content-Type "text/plain charset=UTF-8";
        return 204;
    }
    
    # Add CORS headers to actual responses
    add_header Access-Control-Allow-Origin $cors_origin always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Vary "Origin" always;
    
    # Your existing proxy configuration here
    proxy_pass http://backend_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# CORS for webhook endpoints (more restrictive)
location ~ ^/api/v1/webhooks/.*$ {
    # No CORS for webhooks - they should come from trusted sources
    add_header Access-Control-Allow-Origin "" always;
    
    proxy_pass http://backend_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# CORS for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET" always;
    
    # Your existing static file configuration here
    expires 1y;
    add_header Cache-Control "public, immutable";
}
EOF

    echo -e "${GREEN}✓ Generated nginx CORS configuration: $config_file${NC}"
    echo "Add this configuration to your nginx server blocks"
}

# Function to generate CORS configuration for FastAPI backend
generate_fastapi_cors() {
    local config_file="/tmp/fastapi-cors-config.py"
    
    echo -e "${BLUE}Generating FastAPI CORS configuration...${NC}"
    
    cat > "$config_file" << 'EOF'
"""
BookedBarber V2 CORS Configuration for FastAPI
Add this to your main.py or create a separate cors.py module
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

def configure_cors(app: FastAPI, environment: str = "production"):
    """Configure CORS middleware for the FastAPI application"""
    
    # Production domains
    production_origins = [
        "https://bookedbarber.com",
        "https://www.bookedbarber.com",
        "https://app.bookedbarber.com",
        "https://admin.bookedbarber.com"
    ]
    
    # Development domains
    development_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://localhost:8001",
        "https://staging.bookedbarber.com"
    ]
    
    # Determine allowed origins based on environment
    if environment == "production":
        allowed_origins = production_origins
    elif environment == "staging":
        allowed_origins = production_origins + ["https://staging.bookedbarber.com"]
    else:  # development
        allowed_origins = production_origins + development_origins
    
    # Configure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRF-Token",
            "Cache-Control"
        ],
        expose_headers=[
            "X-Total-Count",
            "X-Page-Count",
            "X-Rate-Limit-Remaining",
            "X-Rate-Limit-Reset"
        ],
        max_age=3600  # Cache preflight requests for 1 hour
    )

# Custom CORS handler for specific endpoints
def add_cors_headers(response, origin: str = None):
    """Add CORS headers to a response manually"""
    
    production_origins = [
        "https://bookedbarber.com",
        "https://www.bookedbarber.com", 
        "https://app.bookedbarber.com",
        "https://admin.bookedbarber.com"
    ]
    
    if origin and origin in production_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    
    return response

# Example usage in main.py:
"""
from fastapi import FastAPI
from .cors import configure_cors

app = FastAPI()

# Configure CORS
environment = os.getenv("ENVIRONMENT", "development")
configure_cors(app, environment)

# Your routes here...
"""

# Webhook CORS configuration (more restrictive)
def configure_webhook_cors():
    """
    Webhooks should not allow CORS from browsers for security.
    This is a placeholder for webhook-specific security measures.
    """
    webhook_allowed_ips = [
        "185.199.108.0/22",  # GitHub webhooks
        "140.82.112.0/20",   # GitHub webhooks
        "3.131.12.8/29",     # Stripe webhooks
        "3.18.12.8/29",      # Stripe webhooks
    ]
    
    return {
        "allowed_ips": webhook_allowed_ips,
        "allow_cors": False,
        "verify_signatures": True
    }
EOF

    echo -e "${GREEN}✓ Generated FastAPI CORS configuration: $config_file${NC}"
    echo "Add this to your FastAPI application"
}

# Function to generate JavaScript fetch configuration
generate_js_cors_config() {
    local config_file="/tmp/js-cors-config.js"
    
    echo -e "${BLUE}Generating JavaScript CORS configuration...${NC}"
    
    cat > "$config_file" << 'EOF'
/**
 * BookedBarber V2 CORS Configuration for Frontend JavaScript
 * Use this configuration for API calls from the frontend
 */

// API Configuration
const API_CONFIG = {
    production: {
        baseURL: 'https://api.bookedbarber.com',
        timeout: 10000,
        credentials: 'include'  // Include cookies for authentication
    },
    staging: {
        baseURL: 'https://staging-api.bookedbarber.com',
        timeout: 15000,
        credentials: 'include'
    },
    development: {
        baseURL: 'http://localhost:8000',
        timeout: 30000,
        credentials: 'include'
    }
};

// Get current environment
const getEnvironment = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname === 'bookedbarber.com' || hostname === 'www.bookedbarber.com') {
            return 'production';
        } else if (hostname.includes('staging')) {
            return 'staging';
        }
    }
    return 'development';
};

// Get API configuration for current environment
const getAPIConfig = () => {
    const env = getEnvironment();
    return API_CONFIG[env] || API_CONFIG.development;
};

// Enhanced fetch function with CORS handling
const corsEnabledFetch = async (endpoint, options = {}) => {
    const config = getAPIConfig();
    const url = `${config.baseURL}${endpoint}`;
    
    const defaultOptions = {
        credentials: config.credentials,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    try {
        const response = await fetch(url, defaultOptions);
        
        // Handle CORS errors
        if (!response.ok) {
            if (response.status === 0) {
                throw new Error('CORS request blocked or network error');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        console.error('CORS-enabled fetch error:', error);
        throw error;
    }
};

// API client with CORS support
class BookedBarberAPI {
    constructor() {
        this.config = getAPIConfig();
        this.baseURL = this.config.baseURL;
    }
    
    async request(endpoint, options = {}) {
        return corsEnabledFetch(endpoint, options);
    }
    
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }
    
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
    
    // Handle file uploads with proper CORS
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.entries(additionalData).forEach(([key, value]) => {
            formData.append(key, value);
        });
        
        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {
                // Don't set Content-Type for FormData, let browser set it
            }
        });
    }
}

// Export for use in applications
const api = new BookedBarberAPI();

// Example usage:
/*
// Get appointments
const appointments = await api.get('/api/v1/appointments');

// Create appointment
const newAppointment = await api.post('/api/v1/appointments', {
    client_id: 1,
    service_id: 2,
    datetime: '2024-01-15T10:00:00Z'
});

// Upload profile image
const fileInput = document.getElementById('profile-image');
const uploadResult = await api.uploadFile('/api/v1/users/profile-image', fileInput.files[0]);
*/

// CORS troubleshooting helper
const troubleshootCORS = () => {
    console.log('CORS Troubleshooting Information:');
    console.log('Current origin:', window.location.origin);
    console.log('API base URL:', getAPIConfig().baseURL);
    console.log('Environment:', getEnvironment());
    console.log('Credentials mode:', getAPIConfig().credentials);
    
    // Test CORS preflight
    fetch(getAPIConfig().baseURL + '/health', {
        method: 'OPTIONS',
        credentials: 'include'
    }).then(response => {
        console.log('CORS preflight test:', response.ok ? 'SUCCESS' : 'FAILED');
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    }).catch(error => {
        console.error('CORS preflight failed:', error);
    });
};

// Make troubleshooting available globally in development
if (getEnvironment() === 'development') {
    window.troubleshootCORS = troubleshootCORS;
}
EOF

    echo -e "${GREEN}✓ Generated JavaScript CORS configuration: $config_file${NC}"
    echo "Add this to your frontend JavaScript application"
}

# Function to test CORS configuration
test_cors_configuration() {
    echo -e "${BLUE}Testing CORS configuration...${NC}"
    
    local api_url="https://api.bookedbarber.com"
    local test_origins=("${DOMAINS[@]}")
    
    if [ "$ENVIRONMENT" != "production" ]; then
        test_origins+=("${DEV_DOMAINS[@]}")
    fi
    
    for origin in "${test_origins[@]}"; do
        echo -n "Testing CORS from $origin... "
        
        # Test preflight request
        local response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Origin: $origin" \
            -H "Access-Control-Request-Method: POST" \
            -H "Access-Control-Request-Headers: Content-Type,Authorization" \
            -X OPTIONS \
            "$api_url/api/v1/health" 2>/dev/null)
        
        if [ "$response" = "204" ] || [ "$response" = "200" ]; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗ (HTTP $response)${NC}"
        fi
    done
}

# Function to show CORS troubleshooting guide
show_troubleshooting_guide() {
    echo -e "${BLUE}CORS Troubleshooting Guide${NC}"
    echo "========================="
    echo ""
    echo -e "${YELLOW}Common CORS Issues and Solutions:${NC}"
    echo ""
    echo "1. 'Access to fetch at X from origin Y has been blocked by CORS policy'"
    echo "   Solution: Ensure the origin is added to allowed origins list"
    echo ""
    echo "2. 'Preflight request doesn't pass access control check'"
    echo "   Solution: Check that OPTIONS method is handled correctly"
    echo ""
    echo "3. 'Credentials flag is 'true', but Access-Control-Allow-Credentials is not'"
    echo "   Solution: Set Access-Control-Allow-Credentials: true on server"
    echo ""
    echo "4. 'Request header field X is not allowed by Access-Control-Allow-Headers'"
    echo "   Solution: Add the header to Access-Control-Allow-Headers list"
    echo ""
    echo -e "${YELLOW}Debugging Tools:${NC}"
    echo ""
    echo "• Browser Developer Tools Network tab"
    echo "• Check preflight (OPTIONS) requests"
    echo "• Verify response headers include CORS headers"
    echo "• Test with curl:"
    echo "  curl -H 'Origin: https://bookedbarber.com' -I https://api.bookedbarber.com/health"
    echo ""
    echo -e "${YELLOW}Testing Commands:${NC}"
    echo ""
    echo "# Test preflight request"
    echo "curl -X OPTIONS \\"
    echo "  -H 'Origin: https://bookedbarber.com' \\"
    echo "  -H 'Access-Control-Request-Method: POST' \\"
    echo "  -H 'Access-Control-Request-Headers: Content-Type' \\"
    echo "  -I https://api.bookedbarber.com/api/v1/health"
    echo ""
    echo "# Test actual request"
    echo "curl -X GET \\"
    echo "  -H 'Origin: https://bookedbarber.com' \\"
    echo "  -I https://api.bookedbarber.com/api/v1/health"
}

# Main function
main() {
    case "${1:-all}" in
        "nginx")
            generate_nginx_cors
            ;;
        "fastapi"|"backend")
            generate_fastapi_cors
            ;;
        "javascript"|"js"|"frontend")
            generate_js_cors_config
            ;;
        "test")
            test_cors_configuration
            ;;
        "troubleshoot")
            show_troubleshooting_guide
            ;;
        "all")
            generate_nginx_cors
            echo ""
            generate_fastapi_cors
            echo ""
            generate_js_cors_config
            echo ""
            echo -e "${GREEN}All CORS configurations generated!${NC}"
            echo ""
            echo "Generated files:"
            echo "  - /tmp/nginx-cors-config.conf"
            echo "  - /tmp/fastapi-cors-config.py"
            echo "  - /tmp/js-cors-config.js"
            echo ""
            echo "Next steps:"
            echo "1. Review and integrate the configurations into your application"
            echo "2. Test CORS with: $0 test"
            echo "3. If issues occur, run: $0 troubleshoot"
            ;;
        *)
            echo "Usage: $0 {nginx|fastapi|javascript|test|troubleshoot|all}"
            echo ""
            echo "Commands:"
            echo "  nginx        - Generate nginx CORS configuration"
            echo "  fastapi      - Generate FastAPI CORS configuration"
            echo "  javascript   - Generate JavaScript CORS configuration"
            echo "  test         - Test CORS configuration"
            echo "  troubleshoot - Show CORS troubleshooting guide"
            echo "  all          - Generate all configurations (default)"
            echo ""
            echo "Environment variables:"
            echo "  ENVIRONMENT  - Set to 'production', 'staging', or 'development'"
            exit 1
            ;;
    esac
}

main "$@"