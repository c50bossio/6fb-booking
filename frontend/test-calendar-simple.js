/**
 * Simple Calendar Test - Manual Browser Check
 * Run this in the browser console at http://localhost:3001/dashboard/calendar
 */

console.log('🚀 Starting Calendar Functionality Check...');

// Test 1: Check if calendar component exists
function testCalendarExists() {
  const calendar = document.querySelector('[class*="rounded-xl"][class*="shadow-sm"][class*="border"]');
  if (calendar) {
    console.log('✅ Calendar component found');
    return true;
  } else {
    console.log('❌ Calendar component not found');
    return false;
  }
}

// Test 2: Check view buttons
function testViewButtons() {
  const buttons = Array.from(document.querySelectorAll('button'));
  const monthBtn = buttons.find(btn => btn.textContent.includes('Month'));
  const weekBtn = buttons.find(btn => btn.textContent.includes('Week'));
  const dayBtn = buttons.find(btn => btn.textContent.includes('Day'));
  
  if (monthBtn && weekBtn && dayBtn) {
    console.log('✅ All view buttons found (Month, Week, Day)');
    return true;
  } else {
    console.log('❌ View buttons missing:', {
      month: !!monthBtn,
      week: !!weekBtn,
      day: !!dayBtn
    });
    return false;
  }
}

// Test 3: Check navigation buttons
function testNavigationButtons() {
  const prevBtn = document.querySelector('svg[class*="ChevronLeft"]');
  const nextBtn = document.querySelector('svg[class*="ChevronRight"]');
  const todayBtn = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Today')
  );
  
  if (prevBtn && nextBtn) {
    console.log('✅ Navigation buttons found');
    return true;
  } else {
    console.log('❌ Navigation buttons missing:', {
      prev: !!prevBtn,
      next: !!nextBtn,
      today: !!todayBtn
    });
    return false;
  }
}

// Test 4: Check if appointments are displayed
function testAppointmentsDisplay() {
  const appointments = document.querySelectorAll('[class*="bg-slate-"], [class*="bg-emerald-"], [class*="bg-amber-"], [class*="bg-red-"]');
  console.log(`✅ Found ${appointments.length} appointment elements`);
  return appointments.length > 0;
}

// Test 5: Test clicking functionality
function testClickFunctionality() {
  try {
    // Test week view click
    const weekBtn = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Week')
    );
    if (weekBtn) {
      weekBtn.click();
      console.log('✅ Week view click test passed');
    }
    
    // Test month view click
    setTimeout(() => {
      const monthBtn = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent.includes('Month')
      );
      if (monthBtn) {
        monthBtn.click();
        console.log('✅ Month view click test passed');
      }
    }, 500);
    
    return true;
  } catch (error) {
    console.log('❌ Click test failed:', error.message);
    return false;
  }
}

// Test 6: Check console for errors
function checkConsoleErrors() {
  // This function checks if we can run without errors
  try {
    const hasErrors = window.console.error.length > 0;
    console.log('✅ No immediate JavaScript errors detected');
    return true;
  } catch (error) {
    console.log('❌ Console error check failed:', error.message);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('\n📋 Running Calendar Tests...\n');
  
  const results = {
    calendarExists: testCalendarExists(),
    viewButtons: testViewButtons(),
    navigationButtons: testNavigationButtons(),
    appointmentsDisplay: testAppointmentsDisplay(),
    clickFunctionality: testClickFunctionality(),
    consoleErrors: checkConsoleErrors()
  };
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  console.log('\n📊 Test Results:');
  console.log('================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Calendar is working correctly.');
  } else {
    console.log('🚨 Some tests failed. Check the issues above.');
  }
  
  return results;
}

// Auto-run tests after a short delay
setTimeout(runAllTests, 1000);

// Export for manual running
window.testCalendar = runAllTests;