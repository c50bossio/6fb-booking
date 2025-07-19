const fetch = require('node-fetch');
const fs = require('fs');

async function checkSystemStatus() {
  console.log('🔍 6FB Booking System Status Check\n');
  console.log('=' .repeat(50));
  
  let backendOk = false;
  let frontendOk = false;
  let authOk = false;
  
  // Check Backend
  console.log('\n📡 Backend Status:');
  try {
    const healthResponse = await fetch('http://localhost:8000/health');
    if (healthResponse.status === 200) {
      console.log('✅ Backend is running on http://localhost:8000');
      console.log('   API Docs: http://localhost:8000/docs');
      backendOk = true;
    } else {
      console.log('❌ Backend health check failed');
    }
  } catch (error) {
    console.log('❌ Backend is not running!');
    console.log('   Run: cd backend-v2 && uvicorn main:app --reload');
  }
  
  // Check Frontend
  console.log('\n🖥️  Frontend Status:');
  try {
    const frontendResponse = await fetch('http://localhost:3000/');
    if (frontendResponse.status === 200) {
      console.log('✅ Frontend is running on http://localhost:3000');
      frontendOk = true;
    } else {
      console.log('❌ Frontend returned error status');
    }
  } catch (error) {
    console.log('❌ Frontend is not running!');
    console.log('   Run: cd backend-v2/frontend-v2 && npm run dev');
  }
  
  // Test Authentication
  if (backendOk) {
    console.log('\n🔐 Authentication Test:');
    try {
      const loginResponse = await fetch('http://localhost:8000/api/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin@6fb.com',
          password: 'admin123'
        })
      });
      
      if (loginResponse.status === 200) {
        console.log('✅ Admin login credentials are working');
        authOk = true;
      } else {
        console.log('❌ Admin login failed - credentials may be incorrect');
      }
    } catch (error) {
      console.log('❌ Could not test authentication');
    }
  }
  
  // Summary and Instructions
  console.log('\n' + '=' .repeat(50));
  console.log('📋 SUMMARY:\n');
  
  if (backendOk && frontendOk && authOk) {
    console.log('✅ Everything is working! Your pages are stuck loading because you need to log in first.\n');
    console.log('🚀 QUICK FIX:');
    console.log('1. Open the quick login helper:');
    console.log('   file://' + process.cwd() + '/frontend-v2/quick_login.html');
    console.log('\n2. Or manually login at:');
    console.log('   http://localhost:3000/login');
    console.log('   Email: admin@6fb.com');
    console.log('   Password: admin123');
    console.log('\n3. After login, visit:');
    console.log('   - Dashboard: http://localhost:3000/dashboard');
    console.log('   - Enterprise: http://localhost:3000/enterprise/dashboard');
  } else {
    console.log('❌ Some services are not running.\n');
    
    if (!backendOk) {
      console.log('1. Start the backend:');
      console.log('   cd backend-v2');
      console.log('   uvicorn main:app --reload\n');
    }
    
    if (!frontendOk) {
      console.log('2. Start the frontend:');
      console.log('   cd backend-v2/frontend-v2');
      console.log('   npm run dev\n');
    }
    
    console.log('3. Then run this check again:');
    console.log('   node check_system_status.js');
  }
  
  console.log('\n' + '=' .repeat(50));
}

checkSystemStatus().catch(console.error);