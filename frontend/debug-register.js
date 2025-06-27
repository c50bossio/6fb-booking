// Quick test to see what's being sent
const axios = require('axios').default;

async function testRegister() {
  const testData = {
    email: 'debugtest' + Date.now() + '@example.com',
    password: 'TestPass123@',  // pragma: allowlist secret
    first_name: 'Debug',
    last_name: 'Test',
    role: 'barber'
  };

  console.log('Sending:', JSON.stringify(testData, null, 2));

  try {
    const response = await axios.post('http://localhost:3000/api/proxy/api/v1/auth/register', testData);
    console.log('Success:', response.data.id, response.data.email);
  } catch (error) {
    if (error.response) {
      console.log('Error:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Network error:', error.message);
    }
  }
}

testRegister();
