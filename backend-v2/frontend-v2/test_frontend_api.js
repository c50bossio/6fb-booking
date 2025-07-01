// Test frontend API functions
import { login } from './lib/api.js';

async function testFrontendLogin() {
    console.log('🔧 Testing frontend login function...');
    
    try {
        // Test the frontend login function
        const response = await login('test-barber@6fb.com', 'testpass123');
        
        console.log('✅ Frontend login function successful');
        console.log('📄 Response keys:', Object.keys(response));
        
        // Check if tokens are stored
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('token');
            const storedRefreshToken = localStorage.getItem('refresh_token');
            
            console.log('💾 Token stored:', !!storedToken);
            console.log('💾 Refresh token stored:', !!storedRefreshToken);
        }
        
    } catch (error) {
        console.error('❌ Frontend login failed:', error.message);
    }
}

export { testFrontendLogin };