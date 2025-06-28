const axios = require('axios');

async function testBookingFlow() {
  const API_BASE = 'http://localhost:3000/api/proxy/api/v1/booking/public';

  try {
    // 1. Get shops
    console.log('1. Getting shops...');
    const shopsRes = await axios.get(`${API_BASE}/shops`);
    const shop = shopsRes.data[0];
    console.log(`   Found ${shopsRes.data.length} shops. Using: ${shop.name}`);

    // 2. Get barbers for shop
    console.log('\n2. Getting barbers...');
    const barbersRes = await axios.get(`${API_BASE}/shops/${shop.id}/barbers`);
    const barber = barbersRes.data[0];
    console.log(`   Found ${barbersRes.data.length} barbers. Using: ${barber.first_name} ${barber.last_name}`);

    // 3. Get services for shop
    console.log('\n3. Getting services...');
    const servicesRes = await axios.get(`${API_BASE}/shops/${shop.id}/services`);
    const service = servicesRes.data[0];
    console.log(`   Found ${servicesRes.data.length} services. Using: ${service.name} ($${service.base_price})`);

    // 4. Get availability
    console.log('\n4. Getting availability...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const availRes = await axios.get(`${API_BASE}/barbers/${barber.id}/availability`, {
      params: {
        service_id: service.id,
        start_date: dateStr,
        end_date: dateStr
      }
    });

    const availableSlot = availRes.data.slots.find(slot => slot.available);
    console.log(`   Found ${availRes.data.slots.filter(s => s.available).length} available slots`);
    console.log(`   Using slot: ${availableSlot.date} at ${availableSlot.start_time}`);

    // 5. Create booking
    console.log('\n5. Creating booking...');
    const bookingData = {
      location_id: shop.id,
      barber_id: barber.id,
      service_id: service.id,
      appointment_date: availableSlot.date,
      appointment_time: availableSlot.start_time,
      client_first_name: 'Test',
      client_last_name: 'Customer',
      client_email: 'testcustomer@example.com',
      client_phone: '5551234567',  // 10 digits
      notes: 'Test booking from API',
      timezone: shop.timezone || 'America/New_York'
    };

    console.log('   Sending booking data:', JSON.stringify(bookingData, null, 2));

    const bookingRes = await axios.post(`${API_BASE}/bookings/create`, bookingData);
    console.log('\n✅ Booking created successfully!');
    console.log('   Confirmation:', bookingRes.data);

    // Test payment settings
    console.log('\n6. Getting payment settings...');
    const paymentRes = await axios.get(`${API_BASE}/shops/${shop.id}/payment-settings`);
    console.log('   Payment settings:', paymentRes.data);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Validation errors:', error.response.data.details);
    }
  }
}

testBookingFlow();
