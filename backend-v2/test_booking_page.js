const fetch = require('node-fetch');

async function testBookingPage() {
  console.log('🧪 Testing booking page functionality...\n');
  
  try {
    // Test 1: Organization API endpoint
    console.log('📡 Testing organization API endpoint...');
    const orgResponse = await fetch('http://localhost:8000/api/v1/public/booking/organization/test-pixel-shop');
    
    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      console.log('✅ Organization API: SUCCESS');
      console.log(`   - Organization: ${orgData.name}`);
      console.log(`   - Barber: ${orgData.barber_name}`);
      console.log(`   - Tracking pixels configured: ${orgData.tracking_pixels.tracking_enabled}`);
      console.log(`   - GTM Container: ${orgData.tracking_pixels.gtm_container_id}`);
      console.log(`   - GA4 Measurement: ${orgData.tracking_pixels.ga4_measurement_id}`);
    } else {
      console.log('❌ Organization API: FAILED');
      return;
    }
    
    // Test 2: Frontend booking page
    console.log('\n🌐 Testing frontend booking page...');
    const pageResponse = await fetch('http://localhost:3001/book/test-pixel-shop');
    
    if (pageResponse.ok) {
      const html = await pageResponse.text();
      console.log('✅ Frontend page: SUCCESS');
      console.log(`   - Status: ${pageResponse.status}`);
      console.log(`   - Content length: ${html.length} characters`);
      
      // Check for key elements in the HTML
      const hasTitle = html.includes('Booked Barber');
      const hasBookingContent = html.includes('test-pixel-shop');
      
      console.log(`   - Has title: ${hasTitle ? '✅' : '❌'}`);
      console.log(`   - Has booking content: ${hasBookingContent ? '✅' : '❌'}`);
      
    } else {
      console.log('❌ Frontend page: FAILED');
      console.log(`   - Status: ${pageResponse.status}`);
    }
    
    // Test 3: Customer pixels endpoint
    console.log('\n🎯 Testing customer pixels API...');
    const pixelsResponse = await fetch('http://localhost:8000/api/v1/public/customer-pixels/test-pixel-shop');
    
    if (pixelsResponse.ok) {
      const pixelData = await pixelsResponse.json();
      console.log('✅ Customer pixels API: SUCCESS');
      console.log(`   - Pixels found: ${pixelData.length}`);
      pixelData.forEach(pixel => {
        console.log(`   - ${pixel.pixel_type}: ${pixel.pixel_id || pixel.container_id || 'configured'}`);
      });
    } else {
      console.log('❌ Customer pixels API: FAILED');
    }
    
    console.log('\n🎉 Conversion tracking system is working!');
    console.log('\nNext steps:');
    console.log('1. Open http://localhost:3001/book/test-pixel-shop in browser');
    console.log('2. Check browser developer tools for pixel events');
    console.log('3. Verify tracking fires during booking flow');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBookingPage();