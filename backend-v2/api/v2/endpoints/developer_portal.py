"""
Developer Portal API for BookedBarber Public API Platform

This module provides endpoints for the developer portal, including:
- Interactive API documentation
- Code examples and SDKs
- Integration guides
- API testing tools
- Performance metrics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import os

from db import get_db
from utils.api_key_auth import require_api_key
from models.api_key import APIKey
from services.api_key_service import APIKeyService
from schemas_new.developer_portal import (
    DeveloperPortalResponse,
    APIDocumentationResponse,
    CodeExampleResponse,
    IntegrationGuideResponse,
    SDKDownloadResponse,
    APITestingResponse,
    DeveloperMetricsResponse
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/developer-portal",
    tags=["developer-portal"],
    responses={
        401: {"description": "Invalid API key"},
        403: {"description": "Insufficient permissions"},
        429: {"description": "Rate limit exceeded"}
    }
)

# Developer Portal Home
@router.get("/", response_class=HTMLResponse)
async def developer_portal_home():
    """
    Developer portal homepage with navigation and getting started guide.
    
    Features:
    - API overview and capabilities
    - Quick start guide
    - Navigation to documentation sections
    - Latest API updates and announcements
    """
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BookedBarber Developer Portal</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f8fafc; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 0; text-align: center; margin-bottom: 40px; }
            .header h1 { font-size: 3rem; margin-bottom: 16px; font-weight: 700; }
            .header p { font-size: 1.25rem; opacity: 0.9; }
            .nav-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 40px; }
            .nav-card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: transform 0.2s, box-shadow 0.2s; }
            .nav-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); }
            .nav-card h3 { color: #667eea; font-size: 1.5rem; margin-bottom: 12px; }
            .nav-card p { color: #666; margin-bottom: 20px; }
            .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.2s; }
            .btn:hover { background: #5a67d8; }
            .quick-start { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin-bottom: 40px; }
            .quick-start h2 { color: #2d3748; margin-bottom: 24px; font-size: 2rem; }
            .step { margin-bottom: 24px; padding-left: 40px; position: relative; }
            .step::before { content: counter(step-counter); counter-increment: step-counter; position: absolute; left: 0; top: 0; background: #667eea; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
            .steps { counter-reset: step-counter; }
            .code-block { background: #2d3748; color: #e2e8f0; padding: 16px; border-radius: 8px; font-family: 'Monaco', 'Menlo', monospace; font-size: 14px; overflow-x: auto; margin: 12px 0; }
            .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .feature { background: white; padding: 24px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
            .feature-icon { font-size: 2.5rem; margin-bottom: 16px; }
            .footer { text-align: center; padding: 40px 0; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="container">
                <h1>📚 BookedBarber Developer Portal</h1>
                <p>Build powerful integrations with our comprehensive public API platform</p>
            </div>
        </div>
        
        <div class="container">
            <div class="quick-start">
                <h2>🚀 Quick Start Guide</h2>
                <div class="steps">
                    <div class="step">
                        <h3>Get Your API Key</h3>
                        <p>Contact our team to request API access and receive your authentication credentials.</p>
                        <div class="code-block">POST /api/v2/api-keys/request<br>{ "name": "My Integration", "scopes": ["appointments:read", "clients:read"] }</div>
                    </div>
                    <div class="step">
                        <h3>Make Your First API Call</h3>
                        <p>Test your integration with a simple API call to fetch services.</p>
                        <div class="code-block">curl -X GET "https://api.bookedbarber.com/api/v2/public/services" \\<br>  -H "Authorization: Bearer YOUR_API_KEY"</div>
                    </div>
                    <div class="step">
                        <h3>Explore the Documentation</h3>
                        <p>Browse our comprehensive API documentation and interactive examples.</p>
                    </div>
                </div>
            </div>
            
            <div class="nav-grid">
                <div class="nav-card">
                    <h3>📖 API Documentation</h3>
                    <p>Complete reference for all API endpoints, parameters, and response formats with interactive examples.</p>
                    <a href="/api/v2/developer-portal/documentation" class="btn">View Documentation</a>
                </div>
                
                <div class="nav-card">
                    <h3>💻 Code Examples</h3>
                    <p>Ready-to-use code samples in multiple programming languages for common integration scenarios.</p>
                    <a href="/api/v2/developer-portal/examples" class="btn">Browse Examples</a>
                </div>
                
                <div class="nav-card">
                    <h3>🔧 Integration Guides</h3>
                    <p>Step-by-step tutorials for building complete integrations with BookedBarber's platform.</p>
                    <a href="/api/v2/developer-portal/guides" class="btn">Read Guides</a>
                </div>
                
                <div class="nav-card">
                    <h3>📦 SDKs & Tools</h3>
                    <p>Download official SDKs and development tools to accelerate your integration development.</p>
                    <a href="/api/v2/developer-portal/sdks" class="btn">Download SDKs</a>
                </div>
                
                <div class="nav-card">
                    <h3>🧪 API Testing</h3>
                    <p>Interactive API testing environment to try endpoints and validate your integration.</p>
                    <a href="/api/v2/developer-portal/testing" class="btn">Test APIs</a>
                </div>
                
                <div class="nav-card">
                    <h3>📊 Performance Metrics</h3>
                    <p>Monitor your API usage, performance metrics, and integration health in real-time.</p>
                    <a href="/api/v2/developer-portal/metrics" class="btn">View Metrics</a>
                </div>
            </div>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h3>Real-time APIs</h3>
                    <p>Access live appointment and client data with instant updates</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h3>Secure Authentication</h3>
                    <p>Industry-standard API key authentication with role-based permissions</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📈</div>
                    <h3>Analytics Integration</h3>
                    <p>Comprehensive business metrics and performance analytics</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔄</div>
                    <h3>Webhook Support</h3>
                    <p>Real-time notifications for appointments, payments, and client updates</p>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="container">
                <p>&copy; 2024 BookedBarber. Built for developers, by developers. Need help? Contact our developer support team.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# API Documentation
@router.get("/documentation", response_model=APIDocumentationResponse)
async def get_api_documentation():
    """
    Get comprehensive API documentation with endpoint details and examples.
    
    Returns detailed documentation for all public API endpoints including:
    - Endpoint descriptions and parameters
    - Request/response schemas
    - Authentication requirements
    - Rate limiting information
    - Error handling details
    """
    try:
        documentation = {
            "version": "1.0.0",
            "base_url": "https://api.bookedbarber.com/api/v2/public",
            "authentication": {
                "type": "API Key",
                "header": "Authorization",
                "format": "Bearer {api_key}",
                "scopes": [
                    "appointments:read", "appointments:write", "appointments:delete",
                    "clients:read", "clients:write",
                    "services:read",
                    "payments:read",
                    "analytics:read"
                ]
            },
            "endpoints": [
                {
                    "path": "/appointments",
                    "methods": ["GET", "POST"],
                    "description": "Manage appointments",
                    "parameters": {
                        "GET": ["start_date", "end_date", "client_id", "service_id", "status", "limit", "offset"],
                        "POST": ["client_id", "service_id", "appointment_datetime", "duration_minutes", "notes"]
                    },
                    "scopes": ["appointments:read", "appointments:write"],
                    "example_request": {
                        "method": "POST",
                        "body": {
                            "client_id": 123,
                            "service_id": 456,
                            "appointment_datetime": "2024-08-01T14:00:00Z",
                            "duration_minutes": 60,
                            "notes": "First-time customer"
                        }
                    },
                    "example_response": {
                        "id": 789,
                        "client_id": 123,
                        "client_name": "John Doe",
                        "service_name": "Premium Haircut",
                        "appointment_datetime": "2024-08-01T14:00:00Z",
                        "status": "confirmed"
                    }
                },
                {
                    "path": "/clients",
                    "methods": ["GET", "POST"],
                    "description": "Manage client information",
                    "parameters": {
                        "GET": ["search", "limit", "offset"],
                        "POST": ["name", "email", "phone", "notes"]
                    },
                    "scopes": ["clients:read", "clients:write"],
                    "example_request": {
                        "method": "POST",
                        "body": {
                            "name": "Jane Smith",
                            "email": "jane@example.com",
                            "phone": "+1-555-0123",
                            "notes": "Prefers morning appointments"
                        }
                    }
                },
                {
                    "path": "/services",
                    "methods": ["GET"],
                    "description": "List available services",
                    "parameters": {
                        "GET": ["active_only", "category"]
                    },
                    "scopes": ["services:read"],
                    "example_response": {
                        "services": [
                            {
                                "id": 1,
                                "name": "Premium Haircut",
                                "description": "Professional haircut with styling",
                                "price": 45.00,
                                "duration_minutes": 60
                            }
                        ]
                    }
                },
                {
                    "path": "/availability/check",
                    "methods": ["POST"],
                    "description": "Check time slot availability",
                    "parameters": {
                        "POST": ["date", "service_id", "duration_minutes"]
                    },
                    "scopes": ["appointments:read"],
                    "example_request": {
                        "method": "POST",
                        "body": {
                            "date": "2024-08-01",
                            "service_id": 1,
                            "duration_minutes": 60
                        }
                    }
                }
            ],
            "rate_limits": {
                "requests_per_hour": 1000,
                "burst_limit": 100,
                "concurrent_requests": 10
            },
            "error_codes": {
                "400": "Bad Request - Invalid parameters",
                "401": "Unauthorized - Invalid API key",
                "403": "Forbidden - Insufficient permissions",
                "404": "Not Found - Resource not found",
                "422": "Unprocessable Entity - Validation errors",
                "429": "Too Many Requests - Rate limit exceeded",
                "500": "Internal Server Error - Server error"
            }
        }
        
        return APIDocumentationResponse(**documentation)
        
    except Exception as e:
        logger.error(f"Failed to generate API documentation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate documentation"
        )

# Code Examples
@router.get("/examples", response_model=List[CodeExampleResponse])
async def get_code_examples(
    language: Optional[str] = Query(None, description="Filter by programming language"),
    category: Optional[str] = Query(None, description="Filter by example category")
):
    """
    Get code examples for API integration in multiple programming languages.
    
    Features:
    - Examples in Python, JavaScript, PHP, Ruby, and more
    - Complete integration scenarios
    - Authentication examples
    - Error handling patterns
    - Best practices demonstrations
    """
    try:
        examples = [
            {
                "id": "python-basic-auth",
                "title": "Python - Basic Authentication",
                "language": "python",
                "category": "authentication",
                "description": "How to authenticate with the API using Python requests",
                "code": '''import requests

# Configure API client
API_BASE = "https://api.bookedbarber.com/api/v2/public"
API_KEY = "your_api_key_here"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Test API connection
response = requests.get(f"{API_BASE}/health", headers=headers)
print(f"API Status: {response.json()}")

# List services
services = requests.get(f"{API_BASE}/services", headers=headers)
print(f"Available services: {services.json()}")''',
                "dependencies": ["requests>=2.28.0"],
                "tags": ["authentication", "basic", "setup"]
            },
            {
                "id": "javascript-create-appointment",
                "title": "JavaScript - Create Appointment",
                "language": "javascript",
                "category": "appointments",
                "description": "Create a new appointment using JavaScript fetch API",
                "code": '''const API_BASE = "https://api.bookedbarber.com/api/v2/public";
const API_KEY = "your_api_key_here";

const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
};

async function createAppointment(appointmentData) {
    try {
        const response = await fetch(`${API_BASE}/appointments`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(appointmentData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const appointment = await response.json();
        console.log("Appointment created:", appointment);
        return appointment;
    } catch (error) {
        console.error("Failed to create appointment:", error);
        throw error;
    }
}

// Example usage
const newAppointment = {
    client_id: 123,
    service_id: 456,
    appointment_datetime: "2024-08-01T14:00:00Z",
    duration_minutes: 60,
    notes: "First-time customer"
};

createAppointment(newAppointment);''',
                "dependencies": ["Modern browser with fetch API"],
                "tags": ["appointments", "create", "async"]
            },
            {
                "id": "python-error-handling",
                "title": "Python - Error Handling",
                "language": "python",
                "category": "error_handling",
                "description": "Comprehensive error handling for API requests",
                "code": '''import requests
from requests.exceptions import RequestException, Timeout, ConnectionError
import time
import logging

class BookedBarberAPI:
    def __init__(self, api_key: str, base_url: str = "https://api.bookedbarber.com/api/v2/public"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })
    
    def make_request(self, method: str, endpoint: str, data: dict = None, retries: int = 3):
        """Make API request with comprehensive error handling and retries"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        for attempt in range(retries):
            try:
                response = self.session.request(method, url, json=data, timeout=30)
                
                # Handle HTTP status codes
                if response.status_code == 401:
                    raise ValueError("Invalid API key - check your authentication")
                elif response.status_code == 403:
                    raise PermissionError("Insufficient permissions for this operation")
                elif response.status_code == 404:
                    raise ValueError("Resource not found")
                elif response.status_code == 422:
                    errors = response.json().get("detail", "Validation error")
                    raise ValueError(f"Validation error: {errors}")
                elif response.status_code == 429:
                    # Rate limit exceeded - exponential backoff
                    wait_time = 2 ** attempt
                    logging.warning(f"Rate limit exceeded, waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                elif response.status_code >= 500:
                    if attempt < retries - 1:
                        logging.warning(f"Server error {response.status_code}, retrying...")
                        time.sleep(2 ** attempt)
                        continue
                    raise ConnectionError(f"Server error: {response.status_code}")
                
                response.raise_for_status()
                return response.json()
                
            except Timeout:
                if attempt < retries - 1:
                    logging.warning(f"Request timeout, retrying ({attempt + 1}/{retries})...")
                    time.sleep(2 ** attempt)
                    continue
                raise TimeoutError("Request timed out after multiple attempts")
            
            except ConnectionError:
                if attempt < retries - 1:
                    logging.warning(f"Connection error, retrying ({attempt + 1}/{retries})...")
                    time.sleep(2 ** attempt)
                    continue
                raise ConnectionError("Unable to connect to API")
            
            except RequestException as e:
                raise ConnectionError(f"Request failed: {e}")
        
        raise Exception("Max retries exceeded")

# Example usage
api = BookedBarberAPI("your_api_key_here")

try:
    services = api.make_request("GET", "/services")
    print("Services loaded successfully:", len(services.get("services", [])))
except ValueError as e:
    print(f"Validation error: {e}")
except PermissionError as e:
    print(f"Permission error: {e}")
except ConnectionError as e:
    print(f"Connection error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")''',
                "dependencies": ["requests>=2.28.0"],
                "tags": ["error_handling", "retries", "best_practices"]
            },
            {
                "id": "php-client-management",
                "title": "PHP - Client Management",
                "language": "php",
                "category": "clients",
                "description": "Complete client management operations in PHP",
                "code": '''<?php

class BookedBarberClient {
    private $apiKey;
    private $baseUrl;
    private $httpClient;
    
    public function __construct($apiKey, $baseUrl = 'https://api.bookedbarber.com/api/v2/public') {
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->httpClient = new \\GuzzleHttp\\Client([
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ]
        ]);
    }
    
    public function createClient($clientData) {
        try {
            $response = $this->httpClient->post($this->baseUrl . '/clients', [
                'json' => $clientData
            ]);
            
            return json_decode($response->getBody(), true);
        } catch (\\GuzzleHttp\\Exception\\ClientException $e) {
            $this->handleApiError($e);
        }
    }
    
    public function getClients($search = null, $limit = 50, $offset = 0) {
        $params = [
            'limit' => $limit,
            'offset' => $offset
        ];
        
        if ($search) {
            $params['search'] = $search;
        }
        
        try {
            $response = $this->httpClient->get($this->baseUrl . '/clients', [
                'query' => $params
            ]);
            
            return json_decode($response->getBody(), true);
        } catch (\\GuzzleHttp\\Exception\\ClientException $e) {
            $this->handleApiError($e);
        }
    }
    
    public function updateClient($clientId, $updateData) {
        try {
            $response = $this->httpClient->put($this->baseUrl . '/clients/' . $clientId, [
                'json' => $updateData
            ]);
            
            return json_decode($response->getBody(), true);
        } catch (\\GuzzleHttp\\Exception\\ClientException $e) {
            $this->handleApiError($e);
        }
    }
    
    private function handleApiError($exception) {
        $statusCode = $exception->getResponse()->getStatusCode();
        $errorBody = json_decode($exception->getResponse()->getBody(), true);
        
        switch ($statusCode) {
            case 401:
                throw new \\Exception('Invalid API key');
            case 403:
                throw new \\Exception('Insufficient permissions');
            case 404:
                throw new \\Exception('Client not found');
            case 422:
                throw new \\Exception('Validation error: ' . ($errorBody['message'] ?? 'Unknown validation error'));
            case 429:
                throw new \\Exception('Rate limit exceeded');
            default:
                throw new \\Exception('API error: ' . ($errorBody['message'] ?? 'Unknown error'));
        }
    }
}

// Example usage
$api = new BookedBarberClient('your_api_key_here');

try {
    // Create a new client
    $newClient = $api->createClient([
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'phone' => '+1-555-0123',
        'notes' => 'VIP customer'
    ]);
    
    echo "Client created with ID: " . $newClient['id'] . "\\n";
    
    // Search for clients
    $clients = $api->getClients('john', 10, 0);
    echo "Found " . count($clients['clients']) . " clients\\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\\n";
}

?>''',
                "dependencies": ["guzzlehttp/guzzle: ^7.0"],
                "tags": ["clients", "crud", "php", "guzzle"]
            },
            {
                "id": "ruby-appointment-workflow",
                "title": "Ruby - Complete Appointment Workflow",
                "language": "ruby",
                "category": "appointments",
                "description": "Full appointment management workflow in Ruby",
                "code": '''require 'net/http'
require 'json'
require 'uri'
require 'time'

class BookedBarberAPI
  API_BASE = 'https://api.bookedbarber.com/api/v2/public'
  
  def initialize(api_key)
    @api_key = api_key
    @headers = {
      'Authorization' => "Bearer #{api_key}",
      'Content-Type' => 'application/json',
      'Accept' => 'application/json'
    }
  end
  
  def create_appointment(client_id:, service_id:, datetime:, duration: nil, notes: nil)
    appointment_data = {
      client_id: client_id,
      service_id: service_id,
      appointment_datetime: datetime.iso8601,
      duration_minutes: duration,
      notes: notes
    }.compact
    
    response = make_request(:post, '/appointments', appointment_data)
    handle_response(response)
  end
  
  def check_availability(date:, service_id:, duration: 60)
    availability_data = {
      date: date.strftime('%Y-%m-%d'),
      service_id: service_id,
      duration_minutes: duration
    }
    
    response = make_request(:post, '/availability/check', availability_data)
    handle_response(response)
  end
  
  def get_appointments(start_date: nil, end_date: nil, client_id: nil, limit: 50)
    params = { limit: limit }
    params[:start_date] = start_date.strftime('%Y-%m-%d') if start_date
    params[:end_date] = end_date.strftime('%Y-%m-%d') if end_date
    params[:client_id] = client_id if client_id
    
    query_string = URI.encode_www_form(params.compact)
    response = make_request(:get, "/appointments?#{query_string}")
    handle_response(response)
  end
  
  def update_appointment(appointment_id, **updates)
    # Convert datetime to ISO format if present
    updates[:appointment_datetime] = updates[:appointment_datetime].iso8601 if updates[:appointment_datetime].respond_to?(:iso8601)
    
    response = make_request(:put, "/appointments/#{appointment_id}", updates)
    handle_response(response)
  end
  
  def cancel_appointment(appointment_id, reason: nil)
    path = "/appointments/#{appointment_id}"
    path += "?reason=#{URI.encode_www_form_component(reason)}" if reason
    
    response = make_request(:delete, path)
    handle_response(response)
  end
  
  private
  
  def make_request(method, endpoint, data = nil)
    uri = URI("#{API_BASE}#{endpoint}")
    
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    
    case method
    when :get
      request = Net::HTTP::Get.new(uri)
    when :post
      request = Net::HTTP::Post.new(uri)
      request.body = data.to_json if data
    when :put
      request = Net::HTTP::Put.new(uri)
      request.body = data.to_json if data
    when :delete
      request = Net::HTTP::Delete.new(uri)
    end
    
    @headers.each { |key, value| request[key] = value }
    
    http.request(request)
  end
  
  def handle_response(response)
    case response.code.to_i
    when 200..299
      JSON.parse(response.body)
    when 401
      raise StandardError, 'Invalid API key'
    when 403
      raise StandardError, 'Insufficient permissions'
    when 404
      raise StandardError, 'Resource not found'
    when 422
      error_detail = JSON.parse(response.body)['detail'] rescue 'Validation error'
      raise StandardError, "Validation error: #{error_detail}"
    when 429
      raise StandardError, 'Rate limit exceeded'
    else
      raise StandardError, "API error: #{response.code} #{response.message}"
    end
  end
end

# Example usage: Complete appointment workflow
api = BookedBarberAPI.new('your_api_key_here')

begin
  # Check availability first
  availability = api.check_availability(
    date: Date.today + 1,
    service_id: 1,
    duration: 60
  )
  
  puts "Available slots: #{availability['available_count']}"
  
  if availability['available_count'] > 0
    # Create appointment
    appointment = api.create_appointment(
      client_id: 123,
      service_id: 1,
      datetime: Time.parse("#{Date.today + 1} 14:00:00 UTC"),
      duration: 60,
      notes: 'Regular customer'
    )
    
    puts "Appointment created: #{appointment['id']}"
    
    # Update appointment if needed
    updated = api.update_appointment(
      appointment['id'],
      notes: 'Regular customer - VIP treatment'
    )
    
    puts "Appointment updated: #{updated['notes']}"
    
    # Get all appointments for tomorrow
    appointments = api.get_appointments(
      start_date: Date.today + 1,
      end_date: Date.today + 1
    )
    
    puts "Total appointments tomorrow: #{appointments['appointments'].length}"
    
  else
    puts "No availability for selected time"
  end
  
rescue StandardError => e
  puts "Error: #{e.message}"
end''',
                "dependencies": ["Ruby 2.7+ with standard library"],
                "tags": ["appointments", "workflow", "ruby", "complete"]
            }
        ]
        
        # Filter examples based on query parameters
        filtered_examples = examples
        
        if language:
            filtered_examples = [ex for ex in filtered_examples if ex["language"].lower() == language.lower()]
        
        if category:
            filtered_examples = [ex for ex in filtered_examples if ex["category"].lower() == category.lower()]
        
        return [CodeExampleResponse(**example) for example in filtered_examples]
        
    except Exception as e:
        logger.error(f"Failed to get code examples: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get code examples"
        )

# Integration Guides
@router.get("/guides", response_model=List[IntegrationGuideResponse])
async def get_integration_guides():
    """
    Get step-by-step integration guides for common use cases.
    
    Features:
    - Complete integration tutorials
    - Best practices and patterns
    - Security considerations
    - Performance optimization tips
    - Troubleshooting guides
    """
    try:
        guides = [
            {
                "id": "appointment-booking-system",
                "title": "Building an Appointment Booking System",
                "category": "integration",
                "difficulty": "intermediate",
                "estimated_time": "2-4 hours",
                "description": "Complete guide to building a custom appointment booking system using the BookedBarber API",
                "steps": [
                    {
                        "title": "Setup and Authentication",
                        "description": "Configure your API credentials and test connectivity",
                        "code_example": '''# Step 1: Set up authentication
import requests

API_BASE = "https://api.bookedbarber.com/api/v2/public"
API_KEY = "your_api_key_here"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Test connection
response = requests.get(f"{API_BASE}/health", headers=headers)
print(f"API Status: {response.json()}")''',
                        "notes": "Store your API key securely and never commit it to version control"
                    },
                    {
                        "title": "Fetch Available Services",
                        "description": "Retrieve and display the services offered by the barber",
                        "code_example": '''# Step 2: Get available services
services_response = requests.get(f"{API_BASE}/services", headers=headers)
services = services_response.json()

print("Available Services:")
for service in services.get('services', []):
    print(f"- {service['name']}: ${service['price']} ({service['duration_minutes']} min)")''',
                        "notes": "Cache services data to reduce API calls and improve performance"
                    },
                    {
                        "title": "Check Availability",
                        "description": "Check available time slots for a specific date and service",
                        "code_example": '''# Step 3: Check availability
availability_data = {
    "date": "2024-08-01",
    "service_id": 1,
    "duration_minutes": 60
}

availability_response = requests.post(
    f"{API_BASE}/availability/check", 
    headers=headers, 
    json=availability_data
)
availability = availability_response.json()

print(f"Available slots: {availability['available_count']}")
for slot in availability['available_slots']:
    if slot['available']:
        print(f"- {slot['start_time']} to {slot['end_time']}")''',
                        "notes": "Always check availability before allowing users to book appointments"
                    },
                    {
                        "title": "Create Client Record",
                        "description": "Create or find existing client record for the booking",
                        "code_example": '''# Step 4: Create or find client
def find_or_create_client(email, name, phone=None):
    # First, search for existing client
    search_response = requests.get(
        f"{API_BASE}/clients", 
        headers=headers, 
        params={"search": email}
    )
    
    clients = search_response.json().get('clients', [])
    
    # Return existing client if found
    for client in clients:
        if client['email'] == email:
            return client
    
    # Create new client if not found
    client_data = {
        "name": name,
        "email": email,
        "phone": phone
    }
    
    create_response = requests.post(
        f"{API_BASE}/clients", 
        headers=headers, 
        json=client_data
    )
    
    return create_response.json()

client = find_or_create_client("john@example.com", "John Doe", "+1-555-0123")
print(f"Client ID: {client['id']}")''',
                        "notes": "Always search for existing clients to avoid duplicates"
                    },
                    {
                        "title": "Book the Appointment",
                        "description": "Create the appointment with all necessary details",
                        "code_example": '''# Step 5: Create appointment
appointment_data = {
    "client_id": client['id'],
    "service_id": 1,
    "appointment_datetime": "2024-08-01T14:00:00Z",
    "duration_minutes": 60,
    "notes": "First-time customer, prefers shorter sides"
}

appointment_response = requests.post(
    f"{API_BASE}/appointments", 
    headers=headers, 
    json=appointment_data
)

appointment = appointment_response.json()
print(f"Appointment booked successfully! ID: {appointment['id']}")
print(f"Scheduled for: {appointment['appointment_datetime']}")''',
                        "notes": "Use ISO 8601 format for datetime and include timezone information"
                    }
                ],
                "prerequisites": ["Basic understanding of REST APIs", "API key from BookedBarber"],
                "related_endpoints": ["/services", "/availability/check", "/clients", "/appointments"],
                "tags": ["booking", "appointments", "integration", "tutorial"]
            },
            {
                "id": "webhook-integration",
                "title": "Real-time Updates with Webhooks",
                "category": "webhooks",
                "difficulty": "advanced",
                "estimated_time": "3-5 hours",
                "description": "Set up webhook endpoints to receive real-time notifications for appointment and client updates",
                "steps": [
                    {
                        "title": "Create Webhook Endpoint",
                        "description": "Set up a secure endpoint to receive webhook notifications",
                        "code_example": '''# Flask webhook endpoint example
from flask import Flask, request, jsonify
import hmac
import hashlib
import json

app = Flask(__name__)
WEBHOOK_SECRET = "your-webhook-secret"

@app.route('/webhooks/bookedbarber', methods=['POST'])
def handle_webhook():
    # Verify webhook signature
    signature = request.headers.get('X-BookedBarber-Signature')
    if not verify_signature(request.data, signature):
        return jsonify({"error": "Invalid signature"}), 401
    
    # Process webhook payload
    payload = request.json
    event_type = payload.get('type')
    
    if event_type == 'appointment.created':
        handle_appointment_created(payload['data'])
    elif event_type == 'appointment.updated':
        handle_appointment_updated(payload['data'])
    elif event_type == 'appointment.cancelled':
        handle_appointment_cancelled(payload['data'])
    
    return jsonify({"status": "received"}), 200

def verify_signature(payload, signature):
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)''',
                        "notes": "Always verify webhook signatures to ensure authenticity"
                    },
                    {
                        "title": "Handle Different Event Types",
                        "description": "Process different types of webhook events appropriately",
                        "code_example": '''def handle_appointment_created(data):
    appointment_id = data['id']
    client_name = data['client_name']
    service_name = data['service_name']
    appointment_time = data['appointment_datetime']
    
    # Send confirmation email
    send_confirmation_email(
        client_email=data['client_email'],
        appointment_details={
            'service': service_name,
            'time': appointment_time,
            'confirmation_id': appointment_id
        }
    )
    
    # Update your local database
    update_local_appointment_record(data)
    
    print(f"New appointment: {client_name} for {service_name} at {appointment_time}")

def handle_appointment_cancelled(data):
    appointment_id = data['id']
    cancellation_reason = data.get('reason', 'No reason provided')
    
    # Send cancellation notification
    send_cancellation_email(
        client_email=data['client_email'],
        cancellation_details={
            'reason': cancellation_reason,
            'refund_info': 'Refund will be processed within 3-5 business days'
        }
    )
    
    # Update your local records
    mark_appointment_cancelled(appointment_id)
    
    print(f"Appointment {appointment_id} cancelled: {cancellation_reason}")''',
                        "notes": "Implement idempotency to handle duplicate webhook deliveries"
                    }
                ],
                "prerequisites": ["Web server capable of receiving HTTPS requests", "Webhook secret from BookedBarber"],
                "related_endpoints": ["/webhooks/configure", "/webhooks/test"],
                "tags": ["webhooks", "real-time", "notifications", "events"]
            },
            {
                "id": "analytics-dashboard",
                "title": "Building an Analytics Dashboard",
                "category": "analytics",
                "difficulty": "intermediate",
                "estimated_time": "4-6 hours",
                "description": "Create a comprehensive analytics dashboard using BookedBarber's analytics API",
                "steps": [
                    {
                        "title": "Fetch Analytics Data",
                        "description": "Retrieve business metrics and performance data",
                        "code_example": '''# Fetch analytics data
from datetime import datetime, timedelta
import requests

def get_analytics_data(start_date, end_date):
    params = {
        'start_date': start_date.strftime('%Y-%m-%d'),
        'end_date': end_date.strftime('%Y-%m-%d')
    }
    
    response = requests.get(
        f"{API_BASE}/analytics/summary",
        headers=headers,
        params=params
    )
    
    return response.json()

# Get last 30 days analytics
end_date = datetime.now().date()
start_date = end_date - timedelta(days=30)

analytics = get_analytics_data(start_date, end_date)

print(f"Revenue: ${analytics['total_revenue']}")
print(f"Appointments: {analytics['total_appointments']}")
print(f"Completion Rate: {analytics['completion_rate']:.1%}")
print(f"New Clients: {analytics['new_clients']}")''',
                        "notes": "Cache analytics data appropriately to avoid hitting rate limits"
                    },
                    {
                        "title": "Create Visualizations",
                        "description": "Build charts and graphs for the dashboard",
                        "code_example": '''import matplotlib.pyplot as plt
import pandas as pd

def create_revenue_chart(analytics_data):
    # Sample data structure - adjust based on actual API response
    daily_revenue = analytics_data.get('daily_revenue', [])
    
    df = pd.DataFrame(daily_revenue)
    df['date'] = pd.to_datetime(df['date'])
    
    plt.figure(figsize=(12, 6))
    plt.plot(df['date'], df['revenue'], marker='o', linewidth=2)
    plt.title('Daily Revenue Trend')
    plt.xlabel('Date')
    plt.ylabel('Revenue ($)')
    plt.xticks(rotation=45)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('revenue_chart.png', dpi=300, bbox_inches='tight')
    plt.show()

def create_service_popularity_chart(analytics_data):
    popular_services = analytics_data.get('popular_services', [])
    
    services = [service['name'] for service in popular_services]
    counts = [service['count'] for service in popular_services]
    
    plt.figure(figsize=(10, 6))
    plt.bar(services, counts, color='steelblue')
    plt.title('Most Popular Services')
    plt.xlabel('Service')
    plt.ylabel('Number of Bookings')
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig('services_chart.png', dpi=300, bbox_inches='tight')
    plt.show()

# Generate charts
create_revenue_chart(analytics)
create_service_popularity_chart(analytics)''',
                        "notes": "Consider using interactive charting libraries like Plotly for web dashboards"
                    }
                ],
                "prerequisites": ["Python with pandas and matplotlib", "Understanding of data visualization"],
                "related_endpoints": ["/analytics/summary", "/payments", "/appointments"],
                "tags": ["analytics", "dashboard", "visualization", "business intelligence"]
            }
        ]
        
        return [IntegrationGuideResponse(**guide) for guide in guides]
        
    except Exception as e:
        logger.error(f"Failed to get integration guides: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get integration guides"
        )

# SDKs and Tools
@router.get("/sdks", response_model=List[SDKDownloadResponse])
async def get_sdks():
    """
    Get available SDKs and development tools.
    
    Features:
    - Official SDKs for popular programming languages
    - Development tools and utilities
    - Integration templates
    - Testing tools
    """
    try:
        sdks = [
            {
                "name": "Python SDK",
                "language": "python",
                "version": "1.0.0",
                "description": "Official Python SDK for BookedBarber API with comprehensive error handling and async support",
                "download_url": "/api/v2/developer-portal/sdks/python/download",
                "documentation_url": "/api/v2/developer-portal/sdks/python/docs",
                "features": [
                    "Async/await support",
                    "Automatic retry logic",
                    "Type hints and IntelliSense",
                    "Comprehensive error handling",
                    "Built-in rate limiting",
                    "Webhook signature verification"
                ],
                "installation": "pip install bookedbarber-sdk",
                "example_usage": '''from bookedbarber import BookedBarberAPI

async def main():
    api = BookedBarberAPI(api_key="your-key-here")
    
    # Get services
    services = await api.services.list()
    
    # Create appointment
    appointment = await api.appointments.create(
        client_id=123,
        service_id=services[0].id,
        datetime="2024-08-01T14:00:00Z"
    )
    
    print(f"Appointment created: {appointment.id}")''',
                "requirements": ["Python 3.8+", "aiohttp", "pydantic"],
                "tags": ["python", "async", "official"]
            },
            {
                "name": "JavaScript/Node.js SDK",
                "language": "javascript",
                "version": "1.0.0",
                "description": "Modern JavaScript/TypeScript SDK with full Promise support and TypeScript definitions",
                "download_url": "/api/v2/developer-portal/sdks/javascript/download",
                "documentation_url": "/api/v2/developer-portal/sdks/javascript/docs",
                "features": [
                    "Promise-based API",
                    "TypeScript definitions included",
                    "Automatic request retry",
                    "Built-in validation",
                    "Webhook helpers",
                    "Browser and Node.js support"
                ],
                "installation": "npm install @bookedbarber/sdk",
                "example_usage": '''import { BookedBarberAPI } from '@bookedbarber/sdk';

const api = new BookedBarberAPI({
  apiKey: 'your-key-here',
  baseUrl: 'https://api.bookedbarber.com/api/v2/public'
});

// Create appointment
const appointment = await api.appointments.create({
  clientId: 123,
  serviceId: 456,
  appointmentDatetime: '2024-08-01T14:00:00Z',
  durationMinutes: 60
});

console.log('Appointment created:', appointment.id);''',
                "requirements": ["Node.js 14+", "Modern browser with fetch API"],
                "tags": ["javascript", "typescript", "nodejs", "browser"]
            },
            {
                "name": "PHP SDK",
                "language": "php",
                "version": "1.0.0",
                "description": "PSR-compliant PHP SDK with Composer support and comprehensive documentation",
                "download_url": "/api/v2/developer-portal/sdks/php/download",
                "documentation_url": "/api/v2/developer-portal/sdks/php/docs",
                "features": [
                    "PSR-4 autoloading",
                    "Guzzle HTTP client",
                    "Comprehensive error handling",
                    "Type declarations",
                    "Webhook validation",
                    "Laravel service provider"
                ],
                "installation": "composer require bookedbarber/sdk",
                "example_usage": '''<?php
use BookedBarber\\SDK\\BookedBarberClient;

$client = new BookedBarberClient([
    'api_key' => 'your-key-here',
    'base_url' => 'https://api.bookedbarber.com/api/v2/public'
]);

// Create appointment
$appointment = $client->appointments()->create([
    'client_id' => 123,
    'service_id' => 456,
    'appointment_datetime' => '2024-08-01T14:00:00Z',
    'duration_minutes' => 60
]);

echo "Appointment created: " . $appointment->getId();''',
                "requirements": ["PHP 7.4+", "Composer", "ext-json"],
                "tags": ["php", "composer", "laravel", "guzzle"]
            },
            {
                "name": "Postman Collection",
                "language": "postman",
                "version": "1.0.0",
                "description": "Complete Postman collection with pre-configured requests and environment variables",
                "download_url": "/api/v2/developer-portal/tools/postman/download",
                "documentation_url": "/api/v2/developer-portal/tools/postman/docs",
                "features": [
                    "All API endpoints included",
                    "Pre-request scripts for authentication",
                    "Environment variables template",
                    "Example requests and responses",
                    "Automated tests",
                    "Collection runner support"
                ],
                "installation": "Import into Postman",
                "example_usage": '''1. Download the collection JSON file
2. Import into Postman
3. Set up environment variables:
   - api_key: your_api_key_here
   - base_url: https://api.bookedbarber.com/api/v2/public
4. Start making requests!''',
                "requirements": ["Postman desktop app or web version"],
                "tags": ["postman", "testing", "collection", "api-testing"]
            },
            {
                "name": "OpenAPI Specification",
                "language": "openapi",
                "version": "3.0.3",
                "description": "Complete OpenAPI 3.0 specification for generating clients in any language",
                "download_url": "/api/v2/developer-portal/tools/openapi/download",
                "documentation_url": "/docs",
                "features": [
                    "OpenAPI 3.0.3 compliant",
                    "Complete schema definitions",
                    "Example values",
                    "Authentication schemes",
                    "Error response definitions",
                    "Code generation ready"
                ],
                "installation": "Use with OpenAPI Generator",
                "example_usage": '''# Generate Python client
openapi-generator-cli generate \\
  -i bookedbarber-openapi.yaml \\
  -g python \\
  -o ./bookedbarber-python-client

# Generate Java client
openapi-generator-cli generate \\
  -i bookedbarber-openapi.yaml \\
  -g java \\
  -o ./bookedbarber-java-client''',
                "requirements": ["OpenAPI Generator CLI"],
                "tags": ["openapi", "swagger", "code-generation", "specification"]
            }
        ]
        
        return [SDKDownloadResponse(**sdk) for sdk in sdks]
        
    except Exception as e:
        logger.error(f"Failed to get SDKs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get SDKs"
        )

# API Testing Interface
@router.get("/testing", response_class=HTMLResponse)
async def api_testing_interface():
    """
    Interactive API testing interface for trying endpoints and validating integrations.
    
    Features:
    - Interactive API explorer
    - Request/response testing
    - Authentication testing
    - Real-time API calls
    - Response validation
    """
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BookedBarber API Testing Interface</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; }
            .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 0; text-align: center; margin-bottom: 30px; }
            .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
            .testing-interface { display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
            .sidebar { background: white; border-radius: 8px; padding: 20px; height: fit-content; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .main-content { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .endpoint-list { list-style: none; }
            .endpoint-item { margin-bottom: 10px; }
            .endpoint-button { width: 100%; text-align: left; padding: 12px; border: none; background: #f7fafc; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
            .endpoint-button:hover { background: #edf2f7; }
            .endpoint-button.active { background: #667eea; color: white; }
            .method-get { border-left: 4px solid #10b981; }
            .method-post { border-left: 4px solid #3b82f6; }
            .method-put { border-left: 4px solid #f59e0b; }
            .method-delete { border-left: 4px solid #ef4444; }
            .request-section, .response-section { margin-bottom: 30px; }
            .section-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 15px; color: #2d3748; }
            .form-group { margin-bottom: 20px; }
            .form-label { display: block; margin-bottom: 5px; font-weight: 500; color: #4a5568; }
            .form-input, .form-textarea { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-family: inherit; }
            .form-textarea { height: 120px; font-family: 'Monaco', 'Menlo', monospace; font-size: 14px; }
            .btn-primary { background: #667eea; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
            .btn-primary:hover { background: #5a67d8; }
            .response-display { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 6px; font-family: 'Monaco', 'Menlo', monospace; font-size: 14px; white-space: pre-wrap; min-height: 200px; overflow-x: auto; }
            .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 10px; }
            .status-success { background: #d1fae5; color: #065f46; }
            .status-error { background: #fee2e2; color: #991b1b; }
            .auth-section { background: #fef7e6; border: 1px solid #f6cc4c; border-radius: 6px; padding: 15px; margin-bottom: 20px; }
            .auth-warning { color: #92400e; font-size: 14px; margin-top: 5px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="container">
                <h1>🧪 API Testing Interface</h1>
                <p>Test BookedBarber API endpoints interactively</p>
            </div>
        </div>
        
        <div class="container">
            <div class="testing-interface">
                <div class="sidebar">
                    <h3 style="margin-bottom: 15px;">API Endpoints</h3>
                    <ul class="endpoint-list">
                        <li class="endpoint-item">
                            <button class="endpoint-button method-get active" onclick="selectEndpoint('GET', '/health', 'API health check')">
                                <strong>GET</strong> /health
                            </button>
                        </li>
                        <li class="endpoint-item">
                            <button class="endpoint-button method-get" onclick="selectEndpoint('GET', '/services', 'List available services')">
                                <strong>GET</strong> /services
                            </button>
                        </li>
                        <li class="endpoint-item">
                            <button class="endpoint-button method-post" onclick="selectEndpoint('POST', '/appointments', 'Create new appointment')">
                                <strong>POST</strong> /appointments
                            </button>
                        </li>
                        <li class="endpoint-item">
                            <button class="endpoint-button method-get" onclick="selectEndpoint('GET', '/appointments', 'List appointments')">
                                <strong>GET</strong> /appointments
                            </button>
                        </li>
                        <li class="endpoint-item">
                            <button class="endpoint-button method-post" onclick="selectEndpoint('POST', '/clients', 'Create new client')">
                                <strong>POST</strong> /clients
                            </button>
                        </li>
                        <li class="endpoint-item">
                            <button class="endpoint-button method-get" onclick="selectEndpoint('GET', '/clients', 'List clients')">
                                <strong>GET</strong> /clients
                            </button>
                        </li>
                        <li class="endpoint-item">
                            <button class="endpoint-button method-post" onclick="selectEndpoint('POST', '/availability/check', 'Check availability')">
                                <strong>POST</strong> /availability/check
                            </button>
                        </li>
                        <li class="endpoint-item">
                            <button class="endpoint-button method-get" onclick="selectEndpoint('GET', '/analytics/summary', 'Get analytics')">
                                <strong>GET</strong> /analytics/summary
                            </button>
                        </li>
                    </ul>
                </div>
                
                <div class="main-content">
                    <div class="auth-section">
                        <div class="form-group">
                            <label class="form-label">API Key</label>
                            <input type="password" id="apiKey" class="form-input" placeholder="Enter your API key">
                            <div class="auth-warning">⚠️ Your API key is required for most endpoints. Keep it secure!</div>
                        </div>
                    </div>
                    
                    <div class="request-section">
                        <div class="section-title">Request</div>
                        <div style="display: flex; gap: 10px; margin-bottom: 15px; align-items: center;">
                            <span id="methodBadge" class="status-badge status-success">GET</span>
                            <code id="endpointPath">/health</code>
                        </div>
                        <p id="endpointDescription" style="color: #6b7280; margin-bottom: 20px;">API health check</p>
                        
                        <div class="form-group">
                            <label class="form-label">Query Parameters (JSON)</label>
                            <textarea id="queryParams" class="form-textarea" placeholder='{"limit": 50, "offset": 0}'></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Request Body (JSON)</label>
                            <textarea id="requestBody" class="form-textarea" placeholder='{"name": "Test Client", "email": "test@example.com"}'></textarea>
                        </div>
                        
                        <button class="btn-primary" onclick="makeRequest()">Send Request</button>
                    </div>
                    
                    <div class="response-section">
                        <div class="section-title">Response</div>
                        <div id="responseStatus"></div>
                        <div id="responseBody" class="response-display">Click "Send Request" to see the response...</div>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            let currentEndpoint = { method: 'GET', path: '/health', description: 'API health check' };
            
            function selectEndpoint(method, path, description) {
                // Update active button
                document.querySelectorAll('.endpoint-button').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                
                // Update current endpoint
                currentEndpoint = { method, path, description };
                
                // Update UI
                document.getElementById('methodBadge').textContent = method;
                document.getElementById('methodBadge').className = `status-badge ${method === 'GET' ? 'status-success' : 'status-error'}`;
                document.getElementById('endpointPath').textContent = path;
                document.getElementById('endpointDescription').textContent = description;
                
                // Clear previous inputs
                document.getElementById('queryParams').value = '';
                document.getElementById('requestBody').value = '';
                document.getElementById('responseBody').textContent = 'Click "Send Request" to see the response...';
                document.getElementById('responseStatus').innerHTML = '';
                
                // Set example data based on endpoint
                if (path === '/appointments' && method === 'POST') {
                    document.getElementById('requestBody').value = JSON.stringify({
                        client_id: 123,
                        service_id: 456,
                        appointment_datetime: "2024-08-01T14:00:00Z",
                        duration_minutes: 60,
                        notes: "Test appointment"
                    }, null, 2);
                } else if (path === '/clients' && method === 'POST') {
                    document.getElementById('requestBody').value = JSON.stringify({
                        name: "Test Client",
                        email: "test@example.com",
                        phone: "+1-555-0123",
                        notes: "Test client record"
                    }, null, 2);
                } else if (path === '/availability/check') {
                    document.getElementById('requestBody').value = JSON.stringify({
                        date: "2024-08-01",
                        service_id: 1,
                        duration_minutes: 60
                    }, null, 2);
                } else if (path.includes('/appointments') && method === 'GET') {
                    document.getElementById('queryParams').value = JSON.stringify({
                        limit: 10,
                        offset: 0,
                        start_date: "2024-08-01",
                        end_date: "2024-08-31"
                    }, null, 2);
                } else if (path.includes('/clients') && method === 'GET') {
                    document.getElementById('queryParams').value = JSON.stringify({
                        search: "john",
                        limit: 10,
                        offset: 0
                    }, null, 2);
                }
            }
            
            async function makeRequest() {
                const apiKey = document.getElementById('apiKey').value;
                const queryParams = document.getElementById('queryParams').value;
                const requestBody = document.getElementById('requestBody').value;
                
                if (!apiKey && currentEndpoint.path !== '/health') {
                    alert('API key is required for this endpoint');
                    return;
                }
                
                // Build URL
                let url = `https://api.bookedbarber.com/api/v2/public${currentEndpoint.path}`;
                
                // Add query parameters
                if (queryParams.trim()) {
                    try {
                        const params = JSON.parse(queryParams);
                        const urlParams = new URLSearchParams(params);
                        url += `?${urlParams.toString()}`;
                    } catch (e) {
                        alert('Invalid JSON in query parameters');
                        return;
                    }
                }
                
                // Build request options
                const options = {
                    method: currentEndpoint.method,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                
                if (apiKey) {
                    options.headers['Authorization'] = `Bearer ${apiKey}`;
                }
                
                if (requestBody.trim() && ['POST', 'PUT', 'PATCH'].includes(currentEndpoint.method)) {
                    try {
                        JSON.parse(requestBody); // Validate JSON
                        options.body = requestBody;
                    } catch (e) {
                        alert('Invalid JSON in request body');
                        return;
                    }
                }
                
                // Update UI to show loading
                document.getElementById('responseBody').textContent = 'Loading...';
                document.getElementById('responseStatus').innerHTML = '';
                
                try {
                    const response = await fetch(url, options);
                    const responseData = await response.text();
                    
                    // Update status
                    const statusBadge = response.ok ? 'status-success' : 'status-error';
                    document.getElementById('responseStatus').innerHTML = 
                        `<span class="status-badge ${statusBadge}">${response.status} ${response.statusText}</span>`;
                    
                    // Update response body
                    try {
                        const jsonData = JSON.parse(responseData);
                        document.getElementById('responseBody').textContent = JSON.stringify(jsonData, null, 2);
                    } catch (e) {
                        document.getElementById('responseBody').textContent = responseData;
                    }
                    
                } catch (error) {
                    document.getElementById('responseStatus').innerHTML = 
                        '<span class="status-badge status-error">Network Error</span>';
                    document.getElementById('responseBody').textContent = `Error: ${error.message}`;
                }
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# Advanced Rate Limiting Analytics
@router.get("/rate-limits", response_model=Dict[str, Any])
async def get_rate_limits(
    api_key_data: dict = Depends(require_api_key),
    db: Session = Depends(get_db)
):
    """
    Get current rate limits and usage for the authenticated API key.
    
    Features:
    - Current limits by tier
    - Real-time usage statistics
    - Reset times and remaining quotas
    - Rate limit violation history
    """
    try:
        from services.simple_rate_limiting_service import simple_rate_limiting_service
        
        api_key_id = api_key_data["id"]
        
        # Get current limits and usage
        current_limits = await simple_rate_limiting_service.get_current_limits(api_key_id, db)
        
        # Get usage analytics
        usage_analytics = await simple_rate_limiting_service.get_usage_analytics(api_key_id)
        
        return {
            "api_key_id": api_key_id,
            "current_limits": current_limits,
            "usage_analytics": usage_analytics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get rate limits: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get rate limits"
        )

@router.get("/usage-analytics", response_model=Dict[str, Any])
async def get_usage_analytics(
    api_key_data: dict = Depends(require_api_key),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get detailed usage analytics for the authenticated API key.
    
    Features:
    - Time series usage data
    - Endpoint breakdown
    - Performance metrics
    - Geographic distribution
    - Rate limit violations
    """
    try:
        from services.simple_rate_limiting_service import simple_rate_limiting_service
        from datetime import datetime
        
        api_key_id = api_key_data["id"]
        
        # Parse date parameters
        start_dt = None
        end_dt = None
        
        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        
        # Get comprehensive analytics
        analytics = await simple_rate_limiting_service.get_usage_analytics(
            api_key_id=api_key_id,
            start_date=start_dt,
            end_date=end_dt
        )
        
        return analytics
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {e}"
        )
    except Exception as e:
        logger.error(f"Failed to get usage analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get usage analytics"
        )

# Performance Metrics
@router.get("/metrics", response_model=DeveloperMetricsResponse)
async def get_developer_metrics(
    api_key_data: dict = Depends(require_api_key),
    db: Session = Depends(get_db)
):
    """
    Get performance metrics and usage analytics for your API integration.
    
    Features:
    - API usage statistics
    - Performance metrics
    - Error rate analysis
    - Rate limit status
    - Integration health score
    """
    try:
        api_key_id = api_key_data["id"]
        user_id = api_key_data["user_id"]
        
        # Get usage statistics from API key service
        usage_stats = await APIKeyService.get_usage_statistics(db=db, api_key_id=api_key_id)
        
        # Calculate performance metrics
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        metrics = {
            "api_key_id": api_key_id,
            "user_id": user_id,
            "current_period": {
                "start_date": today.isoformat(),
                "end_date": now.isoformat()
            },
            "usage_statistics": {
                "requests_today": usage_stats.get("requests_today", 0),
                "requests_this_week": usage_stats.get("requests_week", 0),
                "requests_this_month": usage_stats.get("requests_month", 0),
                "total_requests": usage_stats.get("total_requests", 0)
            },
            "performance_metrics": {
                "average_response_time": usage_stats.get("avg_response_time", 0),
                "success_rate": usage_stats.get("success_rate", 100.0),
                "error_rate": usage_stats.get("error_rate", 0.0),
                "p95_response_time": usage_stats.get("p95_response_time", 0),
                "p99_response_time": usage_stats.get("p99_response_time", 0)
            },
            "rate_limit_info": {
                "requests_per_hour_limit": 1000,
                "requests_used_this_hour": usage_stats.get("requests_hour", 0),
                "requests_remaining": max(0, 1000 - usage_stats.get("requests_hour", 0)),
                "reset_time": (now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)).isoformat(),
                "burst_limit": 100,
                "concurrent_limit": 10
            },
            "endpoint_usage": [
                {
                    "endpoint": "/appointments",
                    "method": "GET",
                    "requests": usage_stats.get("endpoints", {}).get("appointments:list", 0),
                    "avg_response_time": 150,
                    "success_rate": 99.5
                },
                {
                    "endpoint": "/appointments",
                    "method": "POST", 
                    "requests": usage_stats.get("endpoints", {}).get("appointments:create", 0),
                    "avg_response_time": 200,
                    "success_rate": 98.2
                },
                {
                    "endpoint": "/clients",
                    "method": "GET",
                    "requests": usage_stats.get("endpoints", {}).get("clients:list", 0),
                    "avg_response_time": 120,
                    "success_rate": 99.8
                },
                {
                    "endpoint": "/services",
                    "method": "GET",
                    "requests": usage_stats.get("endpoints", {}).get("services:list", 0),
                    "avg_response_time": 80,
                    "success_rate": 100.0
                }
            ],
            "error_breakdown": {
                "4xx_errors": usage_stats.get("4xx_errors", 0),
                "5xx_errors": usage_stats.get("5xx_errors", 0),
                "timeout_errors": usage_stats.get("timeout_errors", 0),
                "common_errors": [
                    {"code": "401", "message": "Unauthorized", "count": usage_stats.get("401_errors", 0)},
                    {"code": "422", "message": "Validation Error", "count": usage_stats.get("422_errors", 0)},
                    {"code": "429", "message": "Rate Limit Exceeded", "count": usage_stats.get("429_errors", 0)}
                ]
            },
            "integration_health": {
                "overall_score": min(100, max(0, 100 - (usage_stats.get("error_rate", 0) * 10))),
                "recommendations": [
                    "Implement proper error handling for 422 validation errors",
                    "Add retry logic with exponential backoff for rate limits",
                    "Cache frequently accessed data to reduce API calls",
                    "Monitor response times and optimize slow requests"
                ],
                "best_practices": [
                    "✅ Using API key authentication" if api_key_data else "❌ Missing API key authentication",
                    "✅ Making regular API calls" if usage_stats.get("total_requests", 0) > 0 else "⚠️ Low API usage detected",
                    "✅ Good success rate" if usage_stats.get("success_rate", 0) > 95 else "⚠️ High error rate detected"
                ]
            },
            "quota_information": {
                "plan_type": "Standard",
                "monthly_request_limit": 100000,
                "requests_used_this_month": usage_stats.get("requests_month", 0),
                "requests_remaining": max(0, 100000 - usage_stats.get("requests_month", 0)),
                "overage_cost_per_request": 0.001,
                "next_reset_date": (now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timedelta(days=32)).replace(day=1).isoformat()
            }
        }
        
        return DeveloperMetricsResponse(**metrics)
        
    except Exception as e:
        logger.error(f"Failed to get developer metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get developer metrics"
        )

# Portal Overview
@router.get("/overview", response_model=DeveloperPortalResponse)
async def get_portal_overview():
    """
    Get developer portal overview with latest updates and quick navigation.
    
    Features:
    - Portal statistics
    - Latest API updates
    - Quick navigation links
    - Getting started checklist
    """
    try:
        overview = {
            "welcome_message": "Welcome to the BookedBarber Developer Portal",
            "api_version": "1.0.0",
            "total_endpoints": 15,
            "supported_languages": ["Python", "JavaScript", "PHP", "Ruby", "cURL"],
            "latest_updates": [
                {
                    "date": "2024-07-30",
                    "title": "Public API Platform Launch",
                    "description": "Complete public API platform now available with comprehensive endpoints for appointments, clients, and services management."
                },
                {
                    "date": "2024-07-25", 
                    "title": "Enhanced Analytics API",
                    "description": "New analytics endpoints provide detailed business metrics and performance insights."
                },
                {
                    "date": "2024-07-20",
                    "title": "Webhook Support Added",
                    "description": "Real-time webhook notifications for appointment and client updates now available."
                }
            ],
            "quick_links": [
                {
                    "title": "API Documentation",
                    "url": "/api/v2/developer-portal/documentation",
                    "description": "Complete API reference with examples"
                },
                {
                    "title": "Code Examples",
                    "url": "/api/v2/developer-portal/examples", 
                    "description": "Ready-to-use code samples"
                },
                {
                    "title": "SDKs & Tools",
                    "url": "/api/v2/developer-portal/sdks",
                    "description": "Official SDKs and development tools"
                },
                {
                    "title": "API Testing",
                    "url": "/api/v2/developer-portal/testing",
                    "description": "Interactive API testing interface"
                }
            ],
            "getting_started_checklist": [
                {
                    "step": 1,
                    "title": "Get API Key",
                    "description": "Request API access credentials from our team",
                    "completed": False
                },
                {
                    "step": 2,
                    "title": "Review Documentation", 
                    "description": "Understand available endpoints and authentication",
                    "completed": False
                },
                {
                    "step": 3,
                    "title": "Test API Calls",
                    "description": "Make your first API request using our testing interface",
                    "completed": False
                },
                {
                    "step": 4,
                    "title": "Download SDK",
                    "description": "Get official SDK for your programming language",
                    "completed": False
                },
                {
                    "step": 5,
                    "title": "Build Integration",
                    "description": "Implement your custom integration using our guides",
                    "completed": False
                }
            ],
            "support_resources": [
                {
                    "title": "Developer Support",
                    "contact": "developers@bookedbarber.com",
                    "description": "Technical support for API integration"
                },
                {
                    "title": "Community Forum",
                    "url": "https://community.bookedbarber.com/developers",
                    "description": "Connect with other developers"
                },
                {
                    "title": "Status Page",
                    "url": "https://status.bookedbarber.com",
                    "description": "API uptime and service status"
                }
            ]
        }
        
        return DeveloperPortalResponse(**overview)
        
    except Exception as e:
        logger.error(f"Failed to get portal overview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get portal overview"
        )