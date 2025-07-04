// Quick login test to run in browser console
console.log('🚀 Starting login test...');

// Navigate to login page first
window.location.href = 'http://localhost:3000/login';

// Wait a moment, then run the login test
setTimeout(() => {
    console.log('📝 Filling login form...');
    
    // Fill the form
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    
    if (emailField && passwordField) {
        emailField.value = 'admin.test@bookedbarber.com';
        passwordField.value = 'AdminTest123';
        
        // Trigger events to make React recognize the input
        emailField.dispatchEvent(new Event('input', {bubbles: true}));
        passwordField.dispatchEvent(new Event('input', {bubbles: true}));
        
        console.log('✅ Form filled with admin credentials');
        
        // Submit the form after a short delay
        setTimeout(() => {
            console.log('🚀 Submitting login form...');
            const form = document.querySelector('form');
            if (form) {
                form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
            } else {
                // Try clicking the submit button
                const submitBtn = document.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                }
            }
        }, 1000);
    } else {
        console.error('❌ Could not find email or password fields');
    }
}, 2000);