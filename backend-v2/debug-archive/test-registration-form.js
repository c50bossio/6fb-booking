// Test script for registration form debugging
// Open http://localhost:3001/register in browser and run this in console

console.log('🚀 Registration Form Test Script Started');

// Helper function to wait for element
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkForElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Element ${selector} not found after ${timeout}ms`));
      } else {
        setTimeout(checkForElement, 100);
      }
    };
    checkForElement();
  });
}

// Helper function to fill form field
function fillField(selector, value) {
  const field = document.querySelector(selector);
  if (field) {
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`✅ Filled ${selector} with: ${value}`);
    return true;
  } else {
    console.error(`❌ Field not found: ${selector}`);
    return false;
  }
}

// Helper function to check checkbox
function checkBox(selector) {
  const checkbox = document.querySelector(selector);
  if (checkbox) {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`✅ Checked: ${selector}`);
    return true;
  } else {
    console.error(`❌ Checkbox not found: ${selector}`);
    return false;
  }
}

// Main test function
async function testRegistrationForm() {
  try {
    console.log('🔍 Checking if we are on the registration page...');
    
    // Check if we're on the right page
    if (!window.location.href.includes('/register')) {
      console.error('❌ Not on registration page. Please navigate to http://localhost:3001/register');
      return;
    }
    
    console.log('✅ On registration page');
    
    // Wait for form to load
    await waitForElement('form');
    console.log('✅ Form found');
    
    // Fill form fields
    const testData = {
      name: 'Test User',
      email: 'test.browser@example.com',
      password: 'MyPassword123',
      confirmPassword: 'MyPassword123'
    };
    
    console.log('📝 Filling form fields...');
    fillField('input[name="name"]', testData.name);
    fillField('input[name="email"]', testData.email);
    fillField('input[name="password"]', testData.password);
    fillField('input[name="confirmPassword"]', testData.confirmPassword);
    
    // Check required checkboxes
    console.log('☑️ Checking required checkboxes...');
    checkBox('#terms-consent');
    checkBox('#privacy-consent');
    
    // Wait a moment for validation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if submit button is enabled
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      console.log('✅ Submit button found');
      console.log('Button disabled:', submitButton.disabled);
      console.log('Button text:', submitButton.textContent);
    } else {
      console.error('❌ Submit button not found');
      return;
    }
    
    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      console.log('🌐 Fetch request:', args[0], args[1]);
      try {
        const response = await originalFetch.apply(this, args);
        console.log('📡 Response:', response.status, response.statusText);
        
        // If it's the registration request, log more details
        if (args[0].includes('/api/v1/auth/register') || args[0].includes('register')) {
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();
            console.log('📊 Response data:', data);
          } catch (e) {
            console.log('📊 Response data: (not JSON)');
          }
        }
        
        return response;
      } catch (error) {
        console.error('🚨 Fetch error:', error);
        throw error;
      }
    };
    
    // Monitor console errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      originalConsoleError.apply(console, ['🚨 Console Error:', ...args]);
    };
    
    console.log('🎯 Ready to submit form. Click the submit button or run submitForm()');
    
    // Make submitForm available globally
    window.submitForm = function() {
      console.log('🚀 Submitting form...');
      submitButton.click();
    };
    
    // Display current state
    console.log('📋 Current form state:');
    console.log('- Name:', document.querySelector('input[name="name"]')?.value);
    console.log('- Email:', document.querySelector('input[name="email"]')?.value);
    console.log('- Password filled:', !!document.querySelector('input[name="password"]')?.value);
    console.log('- Confirm Password filled:', !!document.querySelector('input[name="confirmPassword"]')?.value);
    console.log('- Terms checked:', document.querySelector('#terms-consent')?.checked);
    console.log('- Privacy checked:', document.querySelector('#privacy-consent')?.checked);
    console.log('- Submit button enabled:', !submitButton.disabled);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run the test
testRegistrationForm();

console.log('📋 Available functions:');
console.log('- submitForm(): Submit the registration form');
console.log('- testRegistrationForm(): Re-run the test');