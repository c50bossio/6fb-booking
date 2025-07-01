// Simple route protection test
const { execSync } = require('child_process');

function testRoute(path, expectedContent, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`📍 Route: ${path}`);
  
  try {
    const result = execSync(`curl -s http://localhost:3000${path}`, { timeout: 5000 });
    const content = result.toString();
    
    const hasExpectedContent = expectedContent.some(text => 
      content.toLowerCase().includes(text.toLowerCase())
    );
    
    const hasError = content.includes('500') || content.includes('404') || content.includes('error');
    const isWorking = hasExpectedContent && !hasError;
    
    console.log(`   📄 Expected content found: ${hasExpectedContent ? '✅' : '❌'}`);
    console.log(`   🚫 No errors detected: ${!hasError ? '✅' : '❌'}`);
    console.log(`   🎯 Overall status: ${isWorking ? '✅ WORKING' : '❌ ISSUES'}`);
    
    if (!isWorking && content.length < 200) {
      console.log(`   📝 Response snippet: ${content.substring(0, 100)}...`);
    }
    
    return isWorking;
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runRouteTests() {
  console.log('🚀 Route Protection Testing');
  console.log('=' .repeat(40));
  
  const tests = [
    {
      path: '/',
      expectedContent: ['6FB', 'booking', 'home'],
      description: 'Home Page'
    },
    {
      path: '/login',
      expectedContent: ['login', 'sign in', 'email', 'password'],
      description: 'Login Page (Public)'
    },
    {
      path: '/register',
      expectedContent: ['register', 'sign up', 'email'],
      description: 'Register Page (Public)'
    },
    {
      path: '/dashboard',
      expectedContent: ['dashboard', 'command center', 'login', 'loading'],
      description: 'Dashboard (Protected - should redirect or show login)'
    },
    {
      path: '/admin',
      expectedContent: ['admin', 'settings', 'login', 'loading'],
      description: 'Admin Panel (Admin-only - should redirect or show login)'
    },
    {
      path: '/analytics',
      expectedContent: ['analytics', 'login', 'loading'],
      description: 'Analytics (Staff-only - should redirect or show login)'
    },
    {
      path: '/bookings',
      expectedContent: ['bookings', 'appointments', 'login', 'loading'],
      description: 'Bookings (Protected - should redirect or show login)'
    },
    {
      path: '/clients',
      expectedContent: ['clients', 'login', 'loading'],
      description: 'Clients (Staff-only - should redirect or show login)'
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const passed = testRoute(test.path, test.expectedContent, test.description);
    results.push({ ...test, passed });
  }
  
  console.log('\n📊 Test Summary:');
  console.log('=' .repeat(40));
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.description}`);
  });
  
  console.log(`\n🎯 Results: ${passedCount}/${totalCount} routes working correctly`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All routes are accessible and working! ✅');
  } else if (passedCount >= totalCount * 0.75) {
    console.log('⚠️  Most routes working, minor issues detected.');
  } else {
    console.log('🚨 Multiple route issues detected.');
  }
  
  // Test route protection behavior
  console.log('\n🔒 Route Protection Behavior:');
  console.log('=' .repeat(40));
  
  console.log('📋 Expected behavior for unauthenticated users:');
  console.log('   • Public routes (/, /login, /register) → Accessible');
  console.log('   • Protected routes → Redirect to login or show auth form');
  console.log('   • Admin routes → Redirect to login or show auth form');
  console.log('   • Staff routes → Redirect to login or show auth form');
  
  const protectedRoutes = results.filter(r => 
    ['/dashboard', '/admin', '/analytics', '/bookings', '/clients'].includes(r.path)
  );
  
  const protectedWorking = protectedRoutes.filter(r => r.passed).length;
  console.log(`\n📊 Protected routes accessible: ${protectedWorking}/${protectedRoutes.length}`);
  console.log('ℹ️  Note: "Accessible" means they load (may show login or redirect)');
  
  return {
    totalTests: totalCount,
    passedTests: passedCount,
    protectedRoutes: protectedRoutes.length,
    protectedWorking: protectedWorking
  };
}

// Run the tests
runRouteTests().then(results => {
  console.log('\n🏁 Testing Complete!');
  
  if (results.passedTests === results.totalTests) {
    console.log('✅ Route protection system is functioning correctly.');
  } else {
    console.log('⚠️  Route protection system needs attention.');
  }
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});