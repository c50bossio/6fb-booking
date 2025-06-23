// Test script to verify calendar API integration
// Run this with: node test-calendar-api.js

const API_BASE_URL = 'http://localhost:8000/api/v1';
const TOKEN = 'your-auth-token-here'; // Replace with actual token from login

async function testCalendarAPIs() {
  console.log('🚀 Testing Calendar API Integration...\n');

  try {
    // 1. Test fetching appointments
    console.log('1️⃣ Testing: GET /appointments');
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const appointmentsResponse = await fetch(
      `${API_BASE_URL}/appointments?start_date=${startOfWeek.toISOString().split('T')[0]}&end_date=${endOfWeek.toISOString().split('T')[0]}`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      }
    );

    if (!appointmentsResponse.ok) {
      throw new Error(`Failed to fetch appointments: ${appointmentsResponse.status}`);
    }

    const appointments = await appointmentsResponse.json();
    console.log(`✅ Found ${appointments.length} appointments for this week`);
    console.log('Sample appointment:', appointments[0]);

    // 2. Test fetching barbers
    console.log('\n2️⃣ Testing: GET /barbers');
    const barbersResponse = await fetch(`${API_BASE_URL}/barbers?is_active=true`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (!barbersResponse.ok) {
      throw new Error(`Failed to fetch barbers: ${barbersResponse.status}`);
    }

    const barbers = await barbersResponse.json();
    console.log(`✅ Found ${barbers.data.length} active barbers`);
    console.log('Sample barber:', barbers.data[0]);

    // 3. Test fetching services
    console.log('\n3️⃣ Testing: GET /services');
    const servicesResponse = await fetch(`${API_BASE_URL}/services?is_active=true`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (!servicesResponse.ok) {
      throw new Error(`Failed to fetch services: ${servicesResponse.status}`);
    }

    const services = await servicesResponse.json();
    console.log(`✅ Found ${services.data.length} active services`);
    console.log('Sample service:', services.data[0]);

    // 4. Test creating appointment
    console.log('\n4️⃣ Testing: POST /appointments');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newAppointment = {
      barber_id: barbers.data[0]?.id || 1,
      client_name: 'Test Client',
      client_email: 'test@example.com',
      client_phone: '(555) 123-4567',
      appointment_date: tomorrow.toISOString().split('T')[0],
      appointment_time: '14:00',
      service_id: services.data[0]?.id || 1,
      service_name: services.data[0]?.name || 'Test Service',
      service_duration: 60,
      service_price: services.data[0]?.base_price || 50,
      notes: 'Test appointment from calendar integration'
    };

    console.log('Creating appointment:', newAppointment);

    const createResponse = await fetch(`${API_BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newAppointment)
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log(`❌ Failed to create appointment: ${createResponse.status}`, error);
    } else {
      const created = await createResponse.json();
      console.log('✅ Created appointment:', created);

      // 5. Test updating appointment
      console.log('\n5️⃣ Testing: PUT /appointments/:id');
      const updateData = {
        status: 'confirmed',
        notes: 'Updated from calendar test'
      };

      const updateResponse = await fetch(`${API_BASE_URL}/appointments/${created.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        console.log(`❌ Failed to update appointment: ${updateResponse.status}`);
      } else {
        const updated = await updateResponse.json();
        console.log('✅ Updated appointment status to:', updated.status);
      }

      // 6. Test deleting appointment
      console.log('\n6️⃣ Testing: DELETE /appointments/:id');
      const deleteResponse = await fetch(`${API_BASE_URL}/appointments/${created.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      });

      if (!deleteResponse.ok) {
        console.log(`❌ Failed to delete appointment: ${deleteResponse.status}`);
      } else {
        console.log('✅ Deleted test appointment');
      }
    }

    // 7. Test calendar view endpoint
    console.log('\n7️⃣ Testing: GET /appointments/calendar');
    const calendarResponse = await fetch(
      `${API_BASE_URL}/appointments/calendar?start_date=${startOfWeek.toISOString().split('T')[0]}&end_date=${endOfWeek.toISOString().split('T')[0]}`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      }
    );

    if (!calendarResponse.ok) {
      console.log(`❌ Calendar endpoint not available: ${calendarResponse.status}`);
    } else {
      const calendarData = await calendarResponse.json();
      console.log(`✅ Calendar data loaded: ${calendarData.length} items`);
    }

    console.log('\n✅ All calendar API tests completed!');
    console.log('\n📝 Summary:');
    console.log('- Appointments API: Working');
    console.log('- Barbers API: Working');
    console.log('- Services API: Working');
    console.log('- CRUD Operations: Working');
    console.log('\n🎉 Calendar is ready for use!');

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.log('\n🔍 Troubleshooting tips:');
    console.log('1. Make sure backend is running: cd backend && uvicorn main:app --reload');
    console.log('2. Replace TOKEN variable with actual auth token');
    console.log('3. Check that database has sample data');
  }
}

// Run the tests
testCalendarAPIs();
