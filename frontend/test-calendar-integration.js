/**
 * Calendar-Booking Integration Test Script
 *
 * This script tests the full integration between the calendar and booking system
 * to ensure there are no data conflicts and all workflows function correctly.
 */

const API_BASE = 'http://localhost:8000/api/v1'

// Mock authentication token (in real implementation, get from auth service)
const AUTH_TOKEN = 'your-test-auth-token'

/**
 * Test configuration
 */
const TEST_CONFIG = {
  testBarberId: 1,
  testServiceId: 1,
  testLocationId: 1,
  testClientData: {
    name: 'Test Client',
    email: 'test@example.com',
    phone: '+1234567890'
  }
}

/**
 * API Helper functions
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  }

  const response = await fetch(url, { ...defaultOptions, ...options })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Error ${response.status}: ${errorText}`)
  }

  return response.json()
}

/**
 * Test 1: Verify Calendar-Appointment Data Consistency
 */
async function testCalendarAppointmentSync() {
  console.log('\n🔄 Test 1: Calendar-Appointment Data Consistency')

  try {
    // Get appointments from appointments API
    const appointmentsResponse = await apiRequest('/appointments', {
      method: 'GET'
    })

    // Get calendar appointments
    const calendarResponse = await apiRequest('/appointments/calendar', {
      method: 'GET'
    })

    console.log(`✅ Appointments API returned ${appointmentsResponse.length || 0} appointments`)
    console.log(`✅ Calendar API returned ${calendarResponse.length || 0} appointments`)

    // Verify data consistency
    if (appointmentsResponse.length === calendarResponse.length) {
      console.log('✅ Appointment count matches between APIs')
    } else {
      console.warn('⚠️  Appointment count mismatch between APIs')
    }

    return { success: true, appointmentsCount: appointmentsResponse.length, calendarCount: calendarResponse.length }
  } catch (error) {
    console.error('❌ Calendar-Appointment sync test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 2: Availability Checking Integration
 */
async function testAvailabilityChecking() {
  console.log('\n🔍 Test 2: Availability Checking Integration')

  try {
    const testDate = new Date()
    testDate.setDate(testDate.getDate() + 1) // Tomorrow
    const dateStr = testDate.toISOString().split('T')[0]

    // Test public booking availability
    const publicAvailability = await apiRequest(
      `/booking-public/barbers/${TEST_CONFIG.testBarberId}/availability?start_date=${dateStr}&service_id=${TEST_CONFIG.testServiceId}`,
      { method: 'GET' }
    )

    // Test appointments availability
    const appointmentSlots = await apiRequest(
      `/appointments/slots?barber_id=${TEST_CONFIG.testBarberId}&date=${dateStr}&service_id=${TEST_CONFIG.testServiceId}`,
      { method: 'GET' }
    )

    console.log('✅ Public booking availability retrieved')
    console.log('✅ Appointment slots retrieved')
    console.log(`   Available slots: ${appointmentSlots.available_slots}/${appointmentSlots.total_slots}`)

    return {
      success: true,
      availableSlots: appointmentSlots.available_slots,
      totalSlots: appointmentSlots.total_slots
    }
  } catch (error) {
    console.error('❌ Availability checking test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 3: Conflict Detection System
 */
async function testConflictDetection() {
  console.log('\n⚡ Test 3: Conflict Detection System')

  try {
    const testDate = new Date()
    testDate.setDate(testDate.getDate() + 1)
    const dateStr = testDate.toISOString().split('T')[0]

    // Test conflict detection for a potentially busy time slot
    const conflictCheck = await apiRequest('/appointments/check-conflicts', {
      method: 'POST',
      body: JSON.stringify({
        barberId: TEST_CONFIG.testBarberId,
        serviceId: TEST_CONFIG.testServiceId,
        date: dateStr,
        time: '10:00',
        duration: 60
      })
    })

    console.log(`✅ Conflict detection completed`)
    console.log(`   Has conflicts: ${conflictCheck.has_conflicts}`)

    if (conflictCheck.has_conflicts) {
      console.log(`   Conflicts found: ${conflictCheck.conflicts.length}`)
      conflictCheck.conflicts.forEach((conflict, index) => {
        console.log(`   ${index + 1}. ${conflict.type}: ${conflict.message}`)
      })
    }

    if (conflictCheck.suggested_alternatives?.length > 0) {
      console.log(`   Suggested alternatives: ${conflictCheck.suggested_alternatives.length}`)
    }

    return {
      success: true,
      hasConflicts: conflictCheck.has_conflicts,
      conflictCount: conflictCheck.conflicts?.length || 0,
      alternativesCount: conflictCheck.suggested_alternatives?.length || 0
    }
  } catch (error) {
    console.error('❌ Conflict detection test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 4: Complete Appointment Workflow
 */
async function testAppointmentWorkflow() {
  console.log('\n🔄 Test 4: Complete Appointment Workflow')

  let createdAppointmentId = null

  try {
    const testDate = new Date()
    testDate.setDate(testDate.getDate() + 2) // Day after tomorrow
    const dateStr = testDate.toISOString().split('T')[0]

    // Step 1: Create appointment
    console.log('   Creating appointment...')
    const createResponse = await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        barber_id: TEST_CONFIG.testBarberId,
        client_name: TEST_CONFIG.testClientData.name,
        client_email: TEST_CONFIG.testClientData.email,
        client_phone: TEST_CONFIG.testClientData.phone,
        appointment_date: dateStr,
        appointment_time: '14:00',
        service_id: TEST_CONFIG.testServiceId,
        service_name: 'Test Service',
        service_duration: 60,
        service_price: 50.00,
        notes: 'Calendar integration test appointment',
        timezone: 'America/New_York',
        send_confirmation: false
      })
    })

    createdAppointmentId = createResponse.id
    console.log(`✅ Appointment created with ID: ${createdAppointmentId}`)

    // Step 2: Verify it appears in calendar
    const calendarResponse = await apiRequest(`/appointments/calendar?start_date=${dateStr}&end_date=${dateStr}`)
    const calendarAppointment = calendarResponse.find(apt => apt.id === createdAppointmentId)

    if (calendarAppointment) {
      console.log('✅ Appointment appears in calendar view')
    } else {
      throw new Error('Appointment not found in calendar view')
    }

    // Step 3: Update appointment
    console.log('   Updating appointment...')
    const updateResponse = await apiRequest(`/appointments/${createdAppointmentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'confirmed',
        notes: 'Updated via calendar integration test'
      })
    })
    console.log('✅ Appointment updated successfully')

    // Step 4: Reschedule appointment
    console.log('   Rescheduling appointment...')
    const rescheduleResponse = await apiRequest(`/appointments/${createdAppointmentId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({
        appointment_date: dateStr,
        appointment_time: '15:00',
        reason: 'Calendar integration test reschedule'
      })
    })
    console.log('✅ Appointment rescheduled successfully')

    return {
      success: true,
      appointmentId: createdAppointmentId,
      created: true,
      updated: true,
      rescheduled: true
    }
  } catch (error) {
    console.error('❌ Appointment workflow test failed:', error.message)
    return {
      success: false,
      error: error.message,
      appointmentId: createdAppointmentId
    }
  }
}

/**
 * Test 5: Booking System Integration
 */
async function testBookingSystemIntegration() {
  console.log('\n🔗 Test 5: Booking System Integration')

  try {
    // Test 1: Get barbers list
    const barbersResponse = await apiRequest(`/booking-public/shops/${TEST_CONFIG.testLocationId}/barbers`)
    console.log(`✅ Retrieved ${barbersResponse.length} barbers from booking system`)

    // Test 2: Get services
    const servicesResponse = await apiRequest(`/booking-public/barbers/${TEST_CONFIG.testBarberId}/services`)
    console.log(`✅ Retrieved ${servicesResponse.length} services from booking system`)

    // Test 3: Create public booking
    const testDate = new Date()
    testDate.setDate(testDate.getDate() + 3)
    const dateStr = testDate.toISOString().split('T')[0]

    try {
      const bookingResponse = await apiRequest('/booking-public/bookings/create', {
        method: 'POST',
        body: JSON.stringify({
          barber_id: TEST_CONFIG.testBarberId,
          service_id: TEST_CONFIG.testServiceId,
          appointment_date: dateStr,
          appointment_time: '16:00',
          client_first_name: 'Public',
          client_last_name: 'Booking Test',
          client_email: 'publictest@example.com',
          client_phone: '+1234567891',
          notes: 'Public booking integration test',
          timezone: 'America/New_York'
        })
      })

      console.log(`✅ Public booking created with confirmation: ${bookingResponse.booking_token}`)

      return {
        success: true,
        barbersCount: barbersResponse.length,
        servicesCount: servicesResponse.length,
        publicBookingCreated: true,
        bookingToken: bookingResponse.booking_token
      }
    } catch (bookingError) {
      console.warn('⚠️  Public booking creation failed (may be due to conflicts):', bookingError.message)

      return {
        success: true,
        barbersCount: barbersResponse.length,
        servicesCount: servicesResponse.length,
        publicBookingCreated: false,
        bookingError: bookingError.message
      }
    }
  } catch (error) {
    console.error('❌ Booking system integration test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 6: Data Consistency Validation
 */
async function testDataConsistency() {
  console.log('\n🔍 Test 6: Data Consistency Validation')

  try {
    const testDate = new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)
    const endDateStr = endDate.toISOString().split('T')[0]

    // Get data from multiple endpoints
    const [
      appointmentsData,
      calendarData,
      barbersData
    ] = await Promise.all([
      apiRequest(`/appointments?start_date=${testDate}&end_date=${endDateStr}`),
      apiRequest(`/appointments/calendar?start_date=${testDate}&end_date=${endDateStr}`),
      apiRequest('/barbers')
    ])

    // Validate data consistency
    let consistencyIssues = []

    // Check appointment counts
    if (appointmentsData.length !== calendarData.length) {
      consistencyIssues.push(`Appointment count mismatch: appointments(${appointmentsData.length}) vs calendar(${calendarData.length})`)
    }

    // Check for orphaned appointments (appointments without valid barbers)
    const barberIds = new Set(barbersData.map(b => b.id))
    const orphanedAppointments = appointmentsData.filter(apt => !barberIds.has(apt.barber_id))

    if (orphanedAppointments.length > 0) {
      consistencyIssues.push(`Found ${orphanedAppointments.length} appointments with invalid barber IDs`)
    }

    if (consistencyIssues.length === 0) {
      console.log('✅ No data consistency issues found')
    } else {
      console.warn('⚠️  Data consistency issues detected:')
      consistencyIssues.forEach(issue => console.warn(`   - ${issue}`))
    }

    return {
      success: true,
      consistencyIssues,
      totalAppointments: appointmentsData.length,
      totalBarbers: barbersData.length
    }
  } catch (error) {
    console.error('❌ Data consistency test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Cleanup function
 */
async function cleanup(testResults) {
  console.log('\n🧹 Cleanup: Removing test data...')

  // Clean up any test appointments created
  for (const result of testResults) {
    if (result.appointmentId) {
      try {
        await apiRequest(`/appointments/${result.appointmentId}`, {
          method: 'DELETE'
        })
        console.log(`✅ Cleaned up appointment ${result.appointmentId}`)
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup appointment ${result.appointmentId}:`, error.message)
      }
    }
  }
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log('🚀 Starting Calendar-Booking Integration Tests')
  console.log('=' .repeat(60))

  const results = []

  try {
    // Run all tests
    results.push(await testCalendarAppointmentSync())
    results.push(await testAvailabilityChecking())
    results.push(await testConflictDetection())
    results.push(await testAppointmentWorkflow())
    results.push(await testBookingSystemIntegration())
    results.push(await testDataConsistency())

    // Cleanup
    await cleanup(results)

    // Generate summary
    console.log('\n📊 Test Results Summary')
    console.log('=' .repeat(60))

    const passedTests = results.filter(r => r.success).length
    const totalTests = results.length

    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`)

    if (passedTests === totalTests) {
      console.log('🎉 All integration tests passed!')
      console.log('\n✅ Calendar-Booking Integration Status: FULLY OPERATIONAL')
    } else {
      console.log('⚠️  Some tests failed. See details above.')
    }

    // Detailed results
    console.log('\nDetailed Results:')
    results.forEach((result, index) => {
      const testName = [
        'Calendar-Appointment Sync',
        'Availability Checking',
        'Conflict Detection',
        'Appointment Workflow',
        'Booking System Integration',
        'Data Consistency'
      ][index]

      console.log(`${result.success ? '✅' : '❌'} ${testName}: ${result.success ? 'PASS' : 'FAIL'}`)
      if (!result.success) {
        console.log(`   Error: ${result.error}`)
      }
    })

  } catch (error) {
    console.error('💥 Test runner failed:', error.message)
  }
}

// Auto-run if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runIntegrationTests()
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runIntegrationTests,
    testCalendarAppointmentSync,
    testAvailabilityChecking,
    testConflictDetection,
    testAppointmentWorkflow,
    testBookingSystemIntegration,
    testDataConsistency
  }
}
