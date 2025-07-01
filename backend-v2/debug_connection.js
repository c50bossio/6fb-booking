const http = require('http');

console.log('=== Frontend/Backend Connection Debugger ===\n');

// Test 1: Check if backend is accessible
console.log('1. Testing backend accessibility...');
http.get('http://localhost:8000/health', (res) => {
  console.log(`   ✓ Backend health check: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(`   Response: ${data}`));
}).on('error', (err) => {
  console.error(`   ✗ Backend not accessible: ${err.message}`);
});

// Test 2: Check if frontend is running
console.log('\n2. Testing frontend accessibility...');
http.get('http://localhost:3001/', (res) => {
  console.log(`   ✓ Frontend status: ${res.statusCode}`);
}).on('error', (err) => {
  console.error(`   ✗ Frontend not accessible: ${err.message}`);
});

// Test 3: Check CORS headers
console.log('\n3. Testing CORS configuration...');
const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/v1/appointments/slots?appointment_date=2025-06-30',
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3001',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'authorization,content-type'
  }
};

const corsReq = http.request(options, (res) => {
  console.log(`   CORS preflight status: ${res.statusCode}`);
  console.log('   CORS headers:');
  console.log(`     - Allow-Origin: ${res.headers['access-control-allow-origin']}`);
  console.log(`     - Allow-Credentials: ${res.headers['access-control-allow-credentials']}`);
  console.log(`     - Allow-Headers: ${res.headers['access-control-allow-headers']}`);
});
corsReq.on('error', (err) => {
  console.error(`   ✗ CORS test failed: ${err.message}`);
});
corsReq.end();

// Test 4: Check process environment
console.log('\n4. Environment check:');
console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   - API URL: ${process.env.NEXT_PUBLIC_API_URL || 'not set (defaults to http://localhost:8000)'}`);

// Test 5: Network interfaces
console.log('\n5. Network interfaces:');
const os = require('os');
const interfaces = os.networkInterfaces();
Object.keys(interfaces).forEach(name => {
  interfaces[name].forEach(iface => {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`   - ${name}: ${iface.address}`);
    }
  });
});

// Test 6: Check for common issues
setTimeout(() => {
  console.log('\n6. Common issues check:');
  
  // Check if both servers are on same network
  console.log('   - Both servers on localhost: ✓');
  
  // Check for proxy settings
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    console.log('   - ⚠️  Proxy detected:', process.env.HTTP_PROXY || process.env.HTTPS_PROXY);
    console.log('     This might interfere with localhost connections');
  }
  
  // Check for firewall/security software
  console.log('\n7. Recommendations:');
  console.log('   - Ensure no firewall is blocking port 8000');
  console.log('   - Check browser console for specific error messages');
  console.log('   - Try disabling browser extensions temporarily');
  console.log('   - Clear browser cache and cookies for localhost');
  console.log('   - Try accessing http://localhost:8000/docs directly');
  
  console.log('\n=== Debug Complete ===');
}, 1000);