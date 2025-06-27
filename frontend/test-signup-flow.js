#!/usr/bin/env node

const axios = require('axios').default;

const API_URL = 'http://localhost:3000/api/proxy/api/v1';

async function testSignupFlow() {
  console.log('🧪 Testing Signup Flow...\n');

  // Generate unique email
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;
  const testData = {
    email: testEmail,
    password: 'TestPass123@',  // pragma: allowlist secret
    first_name: 'Test',
    last_name: 'User' + timestamp,
    role: 'barber'
  };

  console.log('1️⃣ Testing Registration...');
  console.log('   Email:', testEmail);

  try {
    // Test registration
    const registerResponse = await axios.post(`${API_URL}/auth/register`, testData);
    console.log('✅ Registration successful!');
    console.log('   User ID:', registerResponse.data.id);
    console.log('   Trial active:', registerResponse.data.is_trial_active);
    console.log('   Days remaining:', registerResponse.data.days_remaining_in_trial);

    // Wait a bit for DB transaction
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n2️⃣ Testing Login...');

    // Test login
    const loginData = new URLSearchParams();
    loginData.append('username', testEmail);
    loginData.append('password', 'TestPass123@');

    const loginResponse = await axios.post(`${API_URL}/auth/token`, loginData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('✅ Login successful!');
    console.log('   Token length:', loginResponse.data.access_token.length);
    console.log('   User role:', loginResponse.data.user.role);
    console.log('   Permissions:', loginResponse.data.user.permissions);

    // Test authenticated request
    console.log('\n3️⃣ Testing Authenticated Request...');
    const meResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.access_token}`
      }
    });

    console.log('✅ Auth verification successful!');
    console.log('   User email:', meResponse.data.email);
    console.log('   Full name:', meResponse.data.full_name);

    console.log('\n✅ All tests passed! The signup flow is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No response received');
      console.error('   Request:', error.request._currentUrl || error.config.url);
    } else {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testSignupFlow();
