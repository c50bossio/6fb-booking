// Debug script to test which function is being called
console.log("🔍 Testing registration functions...");

// Test the API functions directly
import { register, registerComplete } from './lib/api.js';

console.log("✅ register function:", typeof register);
console.log("✅ registerComplete function:", typeof registerComplete);

// Test calling registerComplete with sample data
const sampleData = {
  firstName: "Test",
  lastName: "User",
  email: "test@example.com", 
  password: "TestPassword123@",
  user_type: "barber",
  businessName: "Test Shop",
  businessType: "individual",
  address: {
    street: "123 Main St",
    city: "Test City",
    state: "CA", 
    zipCode: "12345"
  },
  phone: "555-1234",
  consent: {
    terms: true,
    privacy: true,
    marketing: false,
    testData: false
  }
};

console.log("🚀 About to call registerComplete...");
console.log("📦 Sample data:", sampleData);

// This should call /api/v1/auth/register-complete
registerComplete(sampleData).then(result => {
  console.log("✅ registerComplete succeeded:", result);
}).catch(error => {
  console.log("❌ registerComplete failed:", error);
});