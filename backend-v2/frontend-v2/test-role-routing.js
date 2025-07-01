#!/usr/bin/env node

/**
 * Test script to verify role-based dashboard routing
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:8000';

// Test credentials for different roles
const testUsers = [
  { email: 'admin@test.com', password: 'admin123', expectedDashboard: '/admin', role: 'admin' },
  { email: 'barber@test.com', password: 'barber123', expectedDashboard: '/dashboard', role: 'barber' },
  { email: 'user@test.com', password: 'user123', expectedDashboard: '/dashboard', role: 'user' },
  { email: 'superadmin@test.com', password: 'super123', expectedDashboard: '/admin', role: 'super_admin' }
];

async function loginUser(email, password) {
  try {
    const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
      username: email,
      password: password
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  } catch (error) {
    console.error(`Login failed for ${email}:`, error.response?.data || error.message);
    return null;
  }
}

async function getUserProfile(token) {
  try {
    const response = await axios.get(`${API_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get user profile:', error.response?.data || error.message);
    return null;
  }
}

function getDefaultDashboard(user) {
  if (!user) return '/login';
  
  const role = user.role;
  switch (role) {
    case 'admin':
    case 'super_admin':
      return '/admin';
    case 'barber':
      return '/dashboard';
    case 'user':
    default:
      return '/dashboard';
  }
}

async function testRoleRouting() {
  console.log('Testing role-based dashboard routing...\n');

  for (const testUser of testUsers) {
    console.log(`Testing ${testUser.role} user (${testUser.email}):`);
    
    // 1. Login
    const loginResponse = await loginUser(testUser.email, testUser.password);
    if (!loginResponse || !loginResponse.access_token) {
      console.log(`  ❌ Login failed\n`);
      continue;
    }
    console.log(`  ✅ Login successful`);

    // 2. Get user profile
    const userProfile = await getUserProfile(loginResponse.access_token);
    if (!userProfile) {
      console.log(`  ❌ Failed to get user profile\n`);
      continue;
    }
    console.log(`  ✅ User profile retrieved - Role: ${userProfile.role}`);

    // 3. Check dashboard routing
    const dashboardUrl = getDefaultDashboard(userProfile);
    const isCorrect = dashboardUrl === testUser.expectedDashboard;
    
    console.log(`  ${isCorrect ? '✅' : '❌'} Dashboard routing: ${dashboardUrl} (expected: ${testUser.expectedDashboard})`);
    
    if (!isCorrect) {
      console.log(`  ⚠️  MISMATCH: User with role '${userProfile.role}' is being redirected to '${dashboardUrl}' instead of '${testUser.expectedDashboard}'`);
    }
    
    console.log('');
  }
}

// Run the test
testRoleRouting().then(() => {
  console.log('Role-based routing test completed!');
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});