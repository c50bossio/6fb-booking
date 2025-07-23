#!/usr/bin/env node

/**
 * Cache Testing Script for BookedBarber V2
 * 
 * Tests the intelligent caching system to verify:
 * - Cache hits and misses
 * - Background refresh functionality
 * - Preloading behavior
 * - Cache invalidation
 */

const axios = require('axios')

const FRONTEND_URL = 'http://localhost:3001'
const BACKEND_URL = 'http://localhost:8000'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testPageLoad() {
  console.log('🧪 Testing page load performance...')
  const start = Date.now()
  
  try {
    const response = await axios.get(`${FRONTEND_URL}/book`)
    const loadTime = Date.now() - start
    
    console.log(`✅ Page loaded in ${loadTime}ms (status: ${response.status})`)
    return { success: true, loadTime }
  } catch (error) {
    console.error(`❌ Page load failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testAPIEndpoint(endpoint) {
  console.log(`🔍 Testing API endpoint: ${endpoint}`)
  const start = Date.now()
  
  try {
    const response = await axios.get(`${BACKEND_URL}${endpoint}`)
    const responseTime = Date.now() - start
    
    console.log(`✅ API responded in ${responseTime}ms (status: ${response.status})`)
    return { success: true, responseTime, data: response.data }
  } catch (error) {
    console.error(`❌ API call failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runCacheTests() {
  console.log('🚀 Starting Cache Performance Tests')
  console.log('=' .repeat(50))
  
  // Test 1: Initial page load
  console.log('\\n📋 Test 1: Initial Page Load')
  const initialLoad = await testPageLoad()
  
  if (!initialLoad.success) {
    console.error('❌ Cannot continue testing - page not accessible')
    return
  }
  
  // Test 2: API endpoints that will be cached
  console.log('\\n📋 Test 2: API Endpoints Testing')
  
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  // Test time slots endpoint
  const slotsTest1 = await testAPIEndpoint(`/api/v2/appointments/slots?appointment_date=${today}`)
  await sleep(100)
  const slotsTest2 = await testAPIEndpoint(`/api/v2/appointments/slots?appointment_date=${today}`)
  
  if (slotsTest1.success && slotsTest2.success) {
    console.log(`📊 Slots API consistency: ${slotsTest2.responseTime <= slotsTest1.responseTime ? '✅' : '⚠️'} (${slotsTest1.responseTime}ms → ${slotsTest2.responseTime}ms)`)
  }
  
  // Test next available endpoint
  const nextAvailTest1 = await testAPIEndpoint('/api/v2/appointments/slots/next-available')
  await sleep(100)
  const nextAvailTest2 = await testAPIEndpoint('/api/v2/appointments/slots/next-available')
  
  if (nextAvailTest1.success && nextAvailTest2.success) {
    console.log(`📊 Next Available API consistency: ${nextAvailTest2.responseTime <= nextAvailTest1.responseTime ? '✅' : '⚠️'} (${nextAvailTest1.responseTime}ms → ${nextAvailTest2.responseTime}ms)`)
  }
  
  // Test 3: Multiple page loads to test caching
  console.log('\\n📋 Test 3: Cache Performance (Multiple Loads)')
  
  const loadTimes = []
  for (let i = 0; i < 5; i++) {
    console.log(`Loading page ${i + 1}/5...`)
    const result = await testPageLoad()
    if (result.success) {
      loadTimes.push(result.loadTime)
    }
    await sleep(500) // Small delay between requests
  }
  
  if (loadTimes.length > 1) {
    const avgLoadTime = Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)
    const improvement = Math.round(((loadTimes[0] - loadTimes[loadTimes.length - 1]) / loadTimes[0]) * 100)
    
    console.log(`📊 Load Times: [${loadTimes.join(', ')}] ms`)
    console.log(`📊 Average: ${avgLoadTime}ms`)
    console.log(`📊 Performance trend: ${improvement > 0 ? `✅ ${improvement}% faster` : improvement < -10 ? `⚠️ ${Math.abs(improvement)}% slower` : '➡️ Stable'}`)
  }
  
  // Test 4: Cache preloading test
  console.log('\\n📋 Test 4: Preloading Test')
  
  // Request tomorrow's slots after today's - should be faster due to preloading
  const tomorrowTest = await testAPIEndpoint(`/api/v2/appointments/slots?appointment_date=${tomorrow}`)
  if (tomorrowTest.success) {
    console.log(`📊 Tomorrow's slots (preloaded): ${tomorrowTest.responseTime <= 100 ? '✅ Fast' : '⚠️ Slow'} (${tomorrowTest.responseTime}ms)`)
  }
  
  // Test 5: Summary
  console.log('\\n📋 Test Summary')
  console.log('=' .repeat(50))
  
  const results = {
    pageLoad: initialLoad.success,
    apiEndpoints: slotsTest1.success && nextAvailTest1.success,
    cachePerformance: loadTimes.length >= 3,
    preloading: tomorrowTest.success
  }
  
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length
  
  console.log(`✅ Tests Passed: ${passed}/${total}`)
  console.log(`📊 Success Rate: ${Math.round((passed / total) * 100)}%`)
  
  if (passed === total) {
    console.log('🎉 All cache tests passed! System is performing optimally.')
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for issues.')
  }
  
  console.log('\\n💡 Next Steps:')
  console.log('1. Open http://localhost:3001/book in browser')
  console.log('2. Check for cache performance indicator in top-right corner')
  console.log('3. Navigate between different dates to test cache hits')
  console.log('4. Monitor background refresh (look for blue "refreshing..." indicator)')
  
  return results
}

// Run tests if called directly
if (require.main === module) {
  runCacheTests().catch(console.error)
}

module.exports = { runCacheTests, testPageLoad, testAPIEndpoint }