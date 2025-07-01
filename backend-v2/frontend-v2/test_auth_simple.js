// Simple test to verify authentication without puppeteer
async function testAuthAPI() {
    console.log('🚀 Testing authentication API directly...');
    
    // Test backend login endpoint
    try {
        const response = await fetch('http://localhost:8000/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'test-barber@6fb.com',
                password: 'testpass123'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend login successful');
            console.log('📄 Response:', {
                access_token: data.access_token ? 'Present' : 'Missing',
                refresh_token: data.refresh_token ? 'Present' : 'Missing',
                token_type: data.token_type
            });
            
            // Test protected endpoint
            const protectedResponse = await fetch('http://localhost:8000/api/v1/auth/me', {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`
                }
            });
            
            if (protectedResponse.ok) {
                const userInfo = await protectedResponse.json();
                console.log('✅ Protected endpoint access successful');
                console.log('👤 User info:', {
                    email: userInfo.email,
                    role: userInfo.role,
                    name: userInfo.name
                });
            } else {
                console.log('❌ Protected endpoint failed:', protectedResponse.status);
            }
            
        } else {
            const error = await response.text();
            console.log('❌ Backend login failed:', response.status, error);
        }
        
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

// Run the test
testAuthAPI();