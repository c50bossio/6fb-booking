'use client'

import { useState } from 'react'

export default function WebhookDocumentation() {
  const [activeSection, setActiveSection] = useState('overview')

  const sections = [
    { id: 'overview', title: 'Overview' },
    { id: 'authentication', title: 'Authentication' },
    { id: 'events', title: 'Event Types' },
    { id: 'payload', title: 'Payload Structure' },
    { id: 'retry', title: 'Retry Logic' },
    { id: 'security', title: 'Security' },
    { id: 'examples', title: 'Examples' }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Webhook Overview</h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Webhooks allow your application to receive real-time notifications when events occur in the 6FB Booking platform. 
              Instead of polling our API for changes, you can register webhook endpoints that will receive HTTP POST requests 
              whenever specific events happen.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Key Features</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Real-time event notifications</li>
              <li>Automatic retry mechanism for failed deliveries</li>
              <li>Multiple authentication methods supported</li>
              <li>Comprehensive event logging and monitoring</li>
              <li>Test mode for development and debugging</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">How It Works</h3>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Register a webhook endpoint URL in the admin panel</li>
              <li>Select the events you want to receive</li>
              <li>Configure authentication (optional but recommended)</li>
              <li>Your endpoint will receive POST requests when events occur</li>
              <li>Respond with a 2xx status code to acknowledge receipt</li>
            </ol>
          </div>
        )

      case 'authentication':
        return (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Methods</h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We support multiple authentication methods to secure your webhook endpoints. Choose the method that best fits 
              your security requirements and infrastructure.
            </p>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bearer Token</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Send a static bearer token in the Authorization header.
                </p>
                <div className="bg-white rounded border border-gray-200 p-3 font-mono text-sm">
                  Authorization: Bearer your-secret-token
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Basic Authentication</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Use HTTP Basic Authentication with username and password.
                </p>
                <div className="bg-white rounded border border-gray-200 p-3 font-mono text-sm">
                  Authorization: Basic base64(username:password)
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">HMAC Signature</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Verify webhook authenticity using HMAC-SHA256 signatures.
                </p>
                <div className="bg-white rounded border border-gray-200 p-3 font-mono text-sm">
                  X-Webhook-Signature: sha256={"<hmac-signature>"}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  The signature is calculated using your webhook secret and the request body.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">API Key</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Include an API key in a custom header.
                </p>
                <div className="bg-white rounded border border-gray-200 p-3 font-mono text-sm">
                  X-API-Key: your-api-key
                </div>
              </div>
            </div>
          </div>
        )

      case 'events':
        return (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Types</h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The following events can trigger webhook notifications. Subscribe only to the events relevant to your integration.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Events</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Event</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 font-mono text-sm">booking.created</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">A new booking has been created</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-sm">booking.updated</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">Booking details have been modified</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-sm">booking.cancelled</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">A booking has been cancelled</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-sm">booking.confirmed</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">A booking has been confirmed</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-sm">booking.completed</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">A booking has been marked as completed</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Events</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Event</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 font-mono text-sm">payment.completed</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">Payment successfully processed</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-sm">payment.failed</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">Payment processing failed</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono text-sm">payment.refunded</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">Payment has been refunded</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'payload':
        return (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Payload Structure</h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              All webhook payloads follow a consistent structure with event-specific data included in the data field.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Standard Payload Format</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="bg-white rounded border border-gray-200 p-4 overflow-x-auto text-sm">
{`{
  "id": "evt_1234567890",
  "type": "booking.created",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    // Event-specific data
  },
  "metadata": {
    "environment": "production",
    "api_version": "v1"
  }
}`}
              </pre>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Example: Booking Created Event</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="bg-white rounded border border-gray-200 p-4 overflow-x-auto text-sm">
{`{
  "id": "evt_booking_abc123",
  "type": "booking.created",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    "booking": {
      "id": "book_xyz789",
      "client_id": "client_123",
      "barber_id": "barber_456",
      "service_id": "service_789",
      "start_time": "2024-01-20T14:00:00Z",
      "end_time": "2024-01-20T15:00:00Z",
      "status": "confirmed",
      "total_amount": 5000,
      "currency": "usd"
    },
    "client": {
      "id": "client_123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "barber": {
      "id": "barber_456",
      "name": "Jane Smith"
    },
    "service": {
      "id": "service_789",
      "name": "Premium Haircut",
      "duration": 60
    }
  }
}`}
              </pre>
            </div>
          </div>
        )

      case 'retry':
        return (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Retry Logic</h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We implement automatic retry logic to ensure reliable webhook delivery. Understanding how retries work 
              helps you design resilient webhook endpoints.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Retry Schedule</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Failed webhook deliveries are retried with exponential backoff:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-4">
              <li>1st retry: 1 minute after initial failure</li>
              <li>2nd retry: 5 minutes after 1st retry</li>
              <li>3rd retry: 30 minutes after 2nd retry</li>
              <li>Final retry: 2 hours after 3rd retry</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Success Criteria</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800">
                A webhook delivery is considered successful when your endpoint returns any 2xx HTTP status code 
                (200, 201, 202, etc.) within the timeout period.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Failure Scenarios</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 mb-2">A webhook delivery fails if:</p>
              <ul className="list-disc pl-6 space-y-1 text-red-700">
                <li>Connection timeout (30 seconds)</li>
                <li>4xx status code (client error)</li>
                <li>5xx status code (server error)</li>
                <li>Invalid SSL certificate</li>
                <li>DNS resolution failure</li>
              </ul>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Best Practices</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Respond quickly with a 2xx status, then process asynchronously</li>
              <li>Implement idempotency to handle duplicate deliveries</li>
              <li>Log all received webhooks for debugging</li>
              <li>Monitor your endpoint\'s availability and response times</li>
              <li>Use the webhook logs to track delivery status</li>
            </ul>
          </div>
        )

      case 'security':
        return (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Security Best Practices</h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Securing your webhook endpoints is crucial to prevent unauthorized access and ensure data integrity.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Verify Webhook Signatures</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Always verify the HMAC signature to ensure webhooks are coming from our servers:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <pre className="bg-white rounded border border-gray-200 p-4 overflow-x-auto text-sm">
{`// Node.js example
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}`}
              </pre>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Security Measures</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>
                <strong>Use HTTPS:</strong> Always use HTTPS endpoints to encrypt data in transit
              </li>
              <li>
                <strong>IP Whitelisting:</strong> Restrict access to known IP addresses (contact support for our IP ranges)
              </li>
              <li>
                <strong>Rate Limiting:</strong> Implement rate limiting to prevent abuse
              </li>
              <li>
                <strong>Validate Content-Type:</strong> Ensure the Content-Type header is application/json
              </li>
              <li>
                <strong>Timestamp Validation:</strong> Reject webhooks with timestamps older than 5 minutes
              </li>
              <li>
                <strong>Store Secrets Securely:</strong> Never commit webhook secrets to version control
              </li>
            </ul>
          </div>
        )

      case 'examples':
        return (
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Implementation Examples</h2>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Here are example implementations for handling webhooks in different programming languages.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Node.js / Express</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="bg-white rounded border border-gray-200 p-4 overflow-x-auto text-sm">
{`const express = require('express');
const crypto = require('crypto');

app.post('/webhooks/6fb', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  // Verify signature
  if (!verifySignature(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(req.body);
  
  // Process event asynchronously
  processWebhookEvent(event).catch(console.error);
  
  // Respond immediately
  res.status(200).json({ received: true });
});

async function processWebhookEvent(event) {
  switch (event.type) {
    case 'booking.created':
      await handleBookingCreated(event.data);
      break;
    case 'payment.completed':
      await handlePaymentCompleted(event.data);
      break;
    // ... handle other events
  }
}`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Python / Flask</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="bg-white rounded border border-gray-200 p-4 overflow-x-auto text-sm">
{`from flask import Flask, request, jsonify
import hmac
import hashlib
import json

app = Flask(__name__)

@app.route('/webhooks/6fb', methods=['POST'])
def handle_webhook():
    # Get raw body for signature verification
    payload = request.get_data()
    signature = request.headers.get('X-Webhook-Signature')
    
    # Verify signature
    if not verify_signature(payload, signature, app.config['WEBHOOK_SECRET']):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Parse event
    event = json.loads(payload)
    
    # Process asynchronously (using Celery, threading, etc.)
    process_webhook_async.delay(event)
    
    # Respond immediately
    return jsonify({'received': True}), 200

def verify_signature(payload, signature, secret):
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">PHP</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="bg-white rounded border border-gray-200 p-4 overflow-x-auto text-sm">
{`<?php
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';
$secret = $_ENV['WEBHOOK_SECRET'];

// Verify signature
$expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    die('Invalid signature');
}

// Parse event
$event = json_decode($payload, true);

// Queue for processing
$queue->push(new ProcessWebhookJob($event));

// Respond immediately
http_response_code(200);
echo json_encode(['received' => true]);`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="p-6">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 pr-8">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}