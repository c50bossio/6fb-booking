const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('CONSOLE:', msg.text());
    } else if (msg.type() === 'error') {
      console.log('ERROR:', msg.text());
    }
  });
  
  try {
    console.log('Testing appointment modal with tomorrow default...');
    await page.goto('http://localhost:3000/calendar');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n=== Finding and clicking New Appointment button ===');
    
    // Find button with any text containing "New", "Create", "Add", or "Appointment"
    const buttonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const appointmentButton = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('new') || 
               text.includes('create') || 
               text.includes('add') || 
               text.includes('appointment');
      });
      
      if (appointmentButton) {
        appointmentButton.click();
        return true;
      }
      return false;
    });
    
    if (buttonFound) {
      console.log('✅ Found and clicked appointment button');
      
      // Wait for modal to open
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('\n=== Checking modal state ===');
      
      // Check what date is selected and if slots are loading
      const modalState = await page.evaluate(() => {
        const dateInputs = document.querySelectorAll('input[type="date"], input[name*="date"]');
        const selectedDate = dateInputs.length > 0 ? dateInputs[0].value : 'Not found';
        
        // Check for loading states or errors
        const hasErrorMessage = document.body.textContent?.includes('Failed to load available times');
        const hasLoadingState = document.body.textContent?.includes('Loading') || 
                                document.body.textContent?.includes('loading');
        
        return {
          selectedDate,
          hasErrorMessage,
          hasLoadingState,
          dateInputsFound: dateInputs.length
        };
      });
      
      console.log('Modal state:', modalState);
      
      if (!modalState.hasErrorMessage) {
        console.log('✅ SUCCESS: No "Failed to load available times" error!');
        console.log('✅ The modal should now default to tomorrow with available slots');
      } else {
        console.log('❌ Still showing error message');
      }
      
    } else {
      console.log('❌ Could not find appointment button');
      
      // Log all button texts for debugging
      const buttonTexts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim());
      });
      console.log('Available buttons:', buttonTexts);
    }
    
    console.log('\nBrowser will stay open for 20 seconds for manual verification...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();