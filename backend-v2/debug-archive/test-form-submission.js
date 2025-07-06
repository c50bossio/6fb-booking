// Test the exact form submission behavior
// Run this in the browser console on http://localhost:3001/register

console.log('🎯 Form Submission Test Script');

// Monitor all fetch requests
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    console.log('🌐 Intercepted Fetch Request:');
    console.log('  URL:', args[0]);
    console.log('  Options:', args[1]);
    
    // Log the request body if present
    if (args[1] && args[1].body) {
        console.log('  Body:', args[1].body);
        try {
            const bodyData = JSON.parse(args[1].body);
            console.log('  Parsed Body:', bodyData);
        } catch (e) {
            console.log('  Body (not JSON):', args[1].body);
        }
    }
    
    try {
        const response = await originalFetch.apply(this, args);
        console.log('📡 Response:');
        console.log('  Status:', response.status);
        console.log('  StatusText:', response.statusText);
        console.log('  Headers:', Object.fromEntries(response.headers.entries()));
        
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        try {
            const responseData = await clonedResponse.text();
            console.log('  Response Body:', responseData);
            
            // Try to parse as JSON
            try {
                const jsonData = JSON.parse(responseData);
                console.log('  Parsed Response:', jsonData);
            } catch (e) {
                console.log('  Response not JSON');
            }
        } catch (e) {
            console.log('  Could not read response body');
        }
        
        return response;
    } catch (error) {
        console.error('🚨 Fetch Error:', error);
        throw error;
    }
};

// Monitor form submission
document.addEventListener('submit', (event) => {
    console.log('📝 Form Submission Event:');
    console.log('  Form:', event.target);
    console.log('  Form Data:');
    
    const formData = new FormData(event.target);
    for (let [key, value] of formData.entries()) {
        console.log(`    ${key}: ${value}`);
    }
    
    // Also check for controlled form inputs
    console.log('  Controlled Input Values:');
    const inputs = event.target.querySelectorAll('input');
    inputs.forEach(input => {
        if (input.type !== 'password') {
            console.log(`    ${input.name}: ${input.value}`);
        } else {
            console.log(`    ${input.name}: [password hidden]`);
        }
    });
    
    // Check checkbox states
    const checkboxes = event.target.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        console.log(`    ${checkbox.id}: ${checkbox.checked}`);
    });
});

// Monitor React state changes by watching for React events
const originalSetState = React.Component.prototype.setState;
if (originalSetState) {
    React.Component.prototype.setState = function(state, callback) {
        console.log('🔄 React State Change:', state);
        return originalSetState.call(this, state, callback);
    };
}

// Monitor console errors
const originalConsoleError = console.error;
console.error = function(...args) {
    console.log('🚨 Console Error Detected:');
    originalConsoleError.apply(console, args);
};

// Monitor unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.log('🚨 Unhandled Promise Rejection:', event.reason);
});

// Function to manually trigger form submission
window.testFormSubmission = function() {
    console.log('🎯 Manually Testing Form Submission');
    
    // Fill form if not already filled
    const nameInput = document.querySelector('input[name="name"]');
    const emailInput = document.querySelector('input[name="email"]');
    const passwordInput = document.querySelector('input[name="password"]');
    const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
    const termsCheckbox = document.querySelector('#terms-consent');
    const privacyCheckbox = document.querySelector('#privacy-consent');
    
    if (nameInput && !nameInput.value) {
        nameInput.value = 'Test User';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    if (emailInput && !emailInput.value) {
        emailInput.value = 'test.manual@example.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    if (passwordInput && !passwordInput.value) {
        passwordInput.value = 'MyPassword123';
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    if (confirmPasswordInput && !confirmPasswordInput.value) {
        confirmPasswordInput.value = 'MyPassword123';
        confirmPasswordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    if (termsCheckbox && !termsCheckbox.checked) {
        termsCheckbox.checked = true;
        termsCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    if (privacyCheckbox && !privacyCheckbox.checked) {
        privacyCheckbox.checked = true;
        privacyCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Wait a moment for React to update
    setTimeout(() => {
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            console.log('🚀 Clicking submit button');
            console.log('  Button disabled:', submitButton.disabled);
            console.log('  Button text:', submitButton.textContent);
            
            if (!submitButton.disabled) {
                submitButton.click();
            } else {
                console.log('❌ Submit button is disabled');
            }
        } else {
            console.log('❌ Submit button not found');
        }
    }, 1000);
};

console.log('✅ Form monitoring set up');
console.log('📋 Available functions:');
console.log('  - testFormSubmission(): Fill and submit the form');
console.log('🎯 Ready to monitor form submission. Fill out the form and click submit, or run testFormSubmission()');