#!/usr/bin/env node

/**
 * Calendar API Integration Test
 * Tests all calendar-related API endpoints for functionality and data integrity
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:8000',
  testUser: {
    email: 'authtest@example.com',
    password: 'testpass123'
  },
  timeout: 30000
};

let authToken = null;
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
  apiCalls: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '🔌',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type] || '📝';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function makeRequest(method, endpoint, data = null, useAuth = true) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, CONFIG.baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(useAuth && authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      timeout: CONFIG.timeout
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          };
          
          testResults.apiCalls.push({
            method,
            endpoint,
            status: res.statusCode,
            timestamp: new Date().toISOString(),
            success: res.statusCode >= 200 && res.statusCode < 300
          });
          
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testAuthentication() {
  log('Testing authentication...', 'info');
  
  try {
    // Test login
    const response = await makeRequest('POST', '/api/v1/auth/login', {
      username: CONFIG.testUser.email,
      password: CONFIG.testUser.password
    }, false);
    
    if (response.status === 200 && response.data.access_token) {
      authToken = response.data.access_token;
      log('Authentication successful', 'success');
      testResults.tests.push({ name: 'Authentication', status: 'PASSED' });
      testResults.passed++;
      return true;
    } else {
      log(`Authentication failed: ${response.status}`, 'error');
      testResults.tests.push({ name: 'Authentication', status: 'FAILED', error: `Status ${response.status}` });
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log(`Authentication error: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Authentication', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testAppointmentsAPI() {
  log('Testing appointments API...', 'info');
  
  try {
    // Test get appointments
    const response = await makeRequest('GET', '/api/v1/appointments/');
    
    if (response.status === 200) {
      const appointments = response.data.appointments || response.data;
      log(`Retrieved ${appointments ? appointments.length : 0} appointments`, 'success');
      
      // Validate appointment structure
      if (Array.isArray(appointments) && appointments.length > 0) {
        const appointment = appointments[0];
        const requiredFields = ['id', 'start_time', 'service_name', 'status'];
        const missingFields = requiredFields.filter(field => !(field in appointment));
        
        if (missingFields.length === 0) {
          log('Appointment data structure is valid', 'success');
          testResults.tests.push({ name: 'Appointments API - Structure', status: 'PASSED' });
          testResults.passed++;
        } else {
          log(`Appointment missing fields: ${missingFields.join(', ')}`, 'warning');
          testResults.tests.push({ name: 'Appointments API - Structure', status: 'FAILED', error: `Missing fields: ${missingFields.join(', ')}` });
          testResults.failed++;
        }
      }
      
      testResults.tests.push({ name: 'Appointments API - Fetch', status: 'PASSED', details: `${appointments ? appointments.length : 0} appointments` });
      testResults.passed++;
      return true;
    } else {
      log(`Appointments API failed: ${response.status}`, 'error');
      testResults.tests.push({ name: 'Appointments API - Fetch', status: 'FAILED', error: `Status ${response.status}` });
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log(`Appointments API error: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Appointments API - Fetch', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testAvailableSlots() {
  log('Testing available slots API...', 'info');
  
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const response = await makeRequest('GET', `/api/v1/appointments/slots?appointment_date=${dateStr}`);
    
    if (response.status === 200) {
      const slots = response.data.slots || response.data;
      log(`Retrieved ${slots ? slots.length : 0} available slots for ${dateStr}`, 'success');
      
      // Validate slot structure
      if (Array.isArray(slots) && slots.length > 0) {
        const slot = slots[0];
        if (slot.time && slot.available !== undefined) {
          log('Slot data structure is valid', 'success');
          testResults.tests.push({ name: 'Available Slots - Structure', status: 'PASSED' });
          testResults.passed++;
        } else {
          log('Invalid slot structure', 'warning');
          testResults.tests.push({ name: 'Available Slots - Structure', status: 'FAILED', error: 'Invalid slot structure' });
          testResults.failed++;
        }
      }
      
      testResults.tests.push({ name: 'Available Slots - Fetch', status: 'PASSED', details: `${slots ? slots.length : 0} slots` });
      testResults.passed++;
      return true;
    } else {
      log(`Available slots API failed: ${response.status}`, 'error');
      testResults.tests.push({ name: 'Available Slots - Fetch', status: 'FAILED', error: `Status ${response.status}` });
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log(`Available slots API error: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Available Slots - Fetch', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testCreateAppointment() {
  log('Testing create appointment API...', 'info');
  
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const appointmentData = {
      date: dateStr,
      time: '13:00',
      service: 'Haircut'
    };
    
    const response = await makeRequest('POST', '/api/v1/appointments/', appointmentData);
    
    if (response.status === 200 || response.status === 201) {
      const appointment = response.data;
      log(`Created appointment with ID: ${appointment.id}`, 'success');
      
      // Validate created appointment
      if (appointment.id && appointment.start_time && appointment.service_name) {
        log('Created appointment structure is valid', 'success');
        testResults.tests.push({ name: 'Create Appointment - Structure', status: 'PASSED' });
        testResults.passed++;
        
        // Store for potential cleanup
        testResults.createdAppointmentId = appointment.id;
      } else {
        log('Invalid created appointment structure', 'warning');
        testResults.tests.push({ name: 'Create Appointment - Structure', status: 'FAILED', error: 'Invalid structure' });
        testResults.failed++;
      }
      
      testResults.tests.push({ name: 'Create Appointment', status: 'PASSED', details: `ID: ${appointment.id}` });
      testResults.passed++;
      return appointment.id;
    } else {
      log(`Create appointment failed: ${response.status} - ${JSON.stringify(response.data)}`, 'error');
      testResults.tests.push({ name: 'Create Appointment', status: 'FAILED', error: `Status ${response.status}` });
      testResults.failed++;
      return null;
    }
  } catch (error) {
    log(`Create appointment error: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Create Appointment', status: 'FAILED', error: error.message });
    testResults.failed++;
    return null;
  }
}

async function testUpdateAppointment(appointmentId) {
  if (!appointmentId) {
    log('Skipping update test - no appointment ID', 'warning');
    testResults.tests.push({ name: 'Update Appointment', status: 'SKIPPED', reason: 'No appointment ID' });
    return false;
  }
  
  log(`Testing update appointment API for ID: ${appointmentId}...`, 'info');
  
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const updateData = {
      date: dateStr,
      time: '14:00'
    };
    
    const response = await makeRequest('PUT', `/api/v1/appointments/${appointmentId}`, updateData);
    
    if (response.status === 200) {
      const appointment = response.data;
      log(`Updated appointment ID: ${appointment.id}`, 'success');
      testResults.tests.push({ name: 'Update Appointment', status: 'PASSED' });
      testResults.passed++;
      return true;
    } else {
      log(`Update appointment failed: ${response.status}`, 'error');
      testResults.tests.push({ name: 'Update Appointment', status: 'FAILED', error: `Status ${response.status}` });
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log(`Update appointment error: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Update Appointment', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testCancelAppointment(appointmentId) {
  if (!appointmentId) {
    log('Skipping cancel test - no appointment ID', 'warning');
    testResults.tests.push({ name: 'Cancel Appointment', status: 'SKIPPED', reason: 'No appointment ID' });
    return false;
  }
  
  log(`Testing cancel appointment API for ID: ${appointmentId}...`, 'info');
  
  try {
    const response = await makeRequest('PUT', `/api/v1/appointments/${appointmentId}/cancel`);
    
    if (response.status === 200) {
      const appointment = response.data;
      log(`Cancelled appointment ID: ${appointment.id}`, 'success');
      testResults.tests.push({ name: 'Cancel Appointment', status: 'PASSED' });
      testResults.passed++;
      return true;
    } else {
      log(`Cancel appointment failed: ${response.status}`, 'error');
      testResults.tests.push({ name: 'Cancel Appointment', status: 'FAILED', error: `Status ${response.status}` });
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log(`Cancel appointment error: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Cancel Appointment', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testNextAvailableSlot() {
  log('Testing next available slot API...', 'info');
  
  try {
    const response = await makeRequest('GET', '/api/v1/appointments/slots/next-available');
    
    if (response.status === 200) {
      const nextSlot = response.data;
      if (nextSlot.date && nextSlot.time) {
        log(`Next available slot: ${nextSlot.date} at ${nextSlot.time}`, 'success');
        testResults.tests.push({ name: 'Next Available Slot', status: 'PASSED', details: `${nextSlot.date} ${nextSlot.time}` });
        testResults.passed++;
        return true;
      } else {
        log('Invalid next available slot structure', 'warning');
        testResults.tests.push({ name: 'Next Available Slot', status: 'FAILED', error: 'Invalid structure' });
        testResults.failed++;
        return false;
      }
    } else {
      log(`Next available slot failed: ${response.status}`, 'error');
      testResults.tests.push({ name: 'Next Available Slot', status: 'FAILED', error: `Status ${response.status}` });
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log(`Next available slot error: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Next Available Slot', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testUserProfile() {
  log('Testing user profile API...', 'info');
  
  try {
    const response = await makeRequest('GET', '/api/v1/users/me');
    
    if (response.status === 200) {
      const profile = response.data;
      if (profile.email && profile.role) {
        log(`User profile: ${profile.email} (${profile.role})`, 'success');
        testResults.tests.push({ name: 'User Profile', status: 'PASSED', details: `${profile.email}` });
        testResults.passed++;
        return true;
      } else {
        log('Invalid user profile structure', 'warning');
        testResults.tests.push({ name: 'User Profile', status: 'FAILED', error: 'Invalid structure' });
        testResults.failed++;
        return false;
      }
    } else {
      log(`User profile failed: ${response.status}`, 'error');
      testResults.tests.push({ name: 'User Profile', status: 'FAILED', error: `Status ${response.status}` });
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log(`User profile error: ${error.message}`, 'error');
    testResults.tests.push({ name: 'User Profile', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

// Main test runner
async function runAPITests() {
  log('🔌 Starting Calendar API Integration Tests', 'info');
  log(`Testing against: ${CONFIG.baseUrl}`, 'info');
  
  try {
    // Run authentication first
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      log('Authentication failed - skipping authenticated tests', 'error');
      generateReport();
      return;
    }
    
    // Run all API tests
    await testUserProfile();
    await testAppointmentsAPI();
    await testAvailableSlots();
    await testNextAvailableSlot();
    
    // Test CRUD operations
    const appointmentId = await testCreateAppointment();
    if (appointmentId) {
      await testUpdateAppointment(appointmentId);
      await testCancelAppointment(appointmentId);
    }
    
  } catch (error) {
    log(`Test runner error: ${error.message}`, 'error');
  }
  
  generateReport();
}

function generateReport() {
  log('\n🔌 CALENDAR API TEST REPORT', 'info');
  log('=' * 40, 'info');
  
  log(`✅ Passed: ${testResults.passed}`, 'success');
  log(`❌ Failed: ${testResults.failed}`, 'error');
  
  if (testResults.tests.length > 0) {
    log('\n📋 API Test Details:', 'info');
    testResults.tests.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : test.status === 'FAILED' ? '❌' : '⏭️';
      log(`${status} ${test.name}: ${test.status}${test.details ? ` (${test.details})` : ''}${test.error ? ` - ${test.error}` : ''}`, 'info');
    });
  }
  
  // API call summary
  const successfulCalls = testResults.apiCalls.filter(call => call.success).length;
  const failedCalls = testResults.apiCalls.filter(call => !call.success).length;
  
  log(`\n📊 API Call Summary:`, 'info');
  log(`   Successful: ${successfulCalls}`, 'success');
  log(`   Failed: ${failedCalls}`, failedCalls > 0 ? 'error' : 'info');
  
  if (failedCalls > 0) {
    log('\n❌ Failed API Calls:', 'error');
    testResults.apiCalls.filter(call => !call.success).forEach(call => {
      log(`   ${call.method} ${call.endpoint} - Status: ${call.status}`, 'error');
    });
  }
  
  // Calculate API health score
  const totalTests = testResults.passed + testResults.failed;
  const healthScore = totalTests > 0 ? Math.round((testResults.passed / totalTests) * 100) : 0;
  
  log(`\n🏥 API Health Score: ${healthScore}%`, healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'error');
  
  // Save detailed report
  const fs = require('fs');
  const path = require('path');
  const reportPath = './test-results/calendar-api-report.json';
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      healthScore,
      apiCallsSuccessful: successfulCalls,
      apiCallsFailed: failedCalls
    },
    tests: testResults.tests,
    apiCalls: testResults.apiCalls
  }, null, 2));
  
  log(`\n📄 Detailed API report saved to: ${reportPath}`, 'info');
  
  // Exit with appropriate code
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run tests
if (require.main === module) {
  runAPITests().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runAPITests, testResults };