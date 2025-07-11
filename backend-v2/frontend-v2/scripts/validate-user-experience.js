#!/usr/bin/env node

/**
 * User Experience Validation Script
 * 
 * Simulates real user interactions to validate that caching
 * improves the actual booking experience without compromising functionality.
 */

const axios = require('axios')

const FRONTEND_URL = 'http://localhost:3001'
const BACKEND_URL = 'http://localhost:8000'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function simulateUserJourney() {
  console.log('👤 Simulating Real User Booking Journey')
  console.log('=' .repeat(50))
  
  const journey = []
  
  // Step 1: User lands on booking page
  console.log('🏁 Step 1: User visits booking page')
  const start = Date.now()
  
  try {
    const pageResponse = await axios.get(`${FRONTEND_URL}/book`)
    const pageLoadTime = Date.now() - start
    journey.push({ step: 'page_load', time: pageLoadTime, success: true })
    console.log(`✅ Page loaded in ${pageLoadTime}ms`)
  } catch (error) {
    journey.push({ step: 'page_load', time: null, success: false, error: error.message })
    console.error(`❌ Page load failed: ${error.message}`)
    return journey
  }
  
  // Step 2: User selects service (triggers cache preloading)
  console.log('\\n🎯 Step 2: User selects service (Haircut)')
  await sleep(1000) // User thinks for 1 second
  
  // Step 3: User checks today's availability
  console.log('\\n📅 Step 3: User checks today\'s availability')
  const today = new Date().toISOString().split('T')[0]
  const todayStart = Date.now()
  
  try {
    const todaySlots = await axios.get(`${BACKEND_URL}/api/v1/appointments/slots?appointment_date=${today}`)
    const todayTime = Date.now() - todayStart
    journey.push({ step: 'today_slots', time: todayTime, success: true, slots: todaySlots.data.slots?.length || 0 })
    console.log(`✅ Today's slots loaded in ${todayTime}ms (${todaySlots.data.slots?.length || 0} slots)`)
  } catch (error) {
    journey.push({ step: 'today_slots', time: null, success: false, error: error.message })
    console.error(`❌ Today's slots failed: ${error.message}`)
  }
  
  await sleep(2000) // User takes 2 seconds to review
  
  // Step 4: User checks tomorrow (should be preloaded)
  console.log('\\n📅 Step 4: User checks tomorrow (testing preload)')
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const tomorrowStart = Date.now()
  
  try {
    const tomorrowSlots = await axios.get(`${BACKEND_URL}/api/v1/appointments/slots?appointment_date=${tomorrow}`)
    const tomorrowTime = Date.now() - tomorrowStart
    journey.push({ step: 'tomorrow_slots', time: tomorrowTime, success: true, slots: tomorrowSlots.data.slots?.length || 0 })
    console.log(`✅ Tomorrow's slots loaded in ${tomorrowTime}ms (${tomorrowSlots.data.slots?.length || 0} slots)`)
    
    if (tomorrowTime < 50) {
      console.log(`🚀 CACHE HIT! Tomorrow's data was preloaded`)
    }
  } catch (error) {
    journey.push({ step: 'tomorrow_slots', time: null, success: false, error: error.message })
    console.error(`❌ Tomorrow's slots failed: ${error.message}`)
  }
  
  await sleep(1500) // User decides
  
  // Step 5: User checks next available
  console.log('\\n⚡ Step 5: User wants next available slot')
  const nextAvailStart = Date.now()
  
  try {
    const nextAvail = await axios.get(`${BACKEND_URL}/api/v1/appointments/slots/next-available`)
    const nextAvailTime = Date.now() - nextAvailStart
    journey.push({ step: 'next_available', time: nextAvailTime, success: true, data: nextAvail.data })
    console.log(`✅ Next available loaded in ${nextAvailTime}ms`)
    
    if (nextAvail.data.date && nextAvail.data.time) {
      console.log(`📍 Next slot: ${nextAvail.data.date} at ${nextAvail.data.time}`)
    }
  } catch (error) {
    journey.push({ step: 'next_available', time: null, success: false, error: error.message })
    console.error(`❌ Next available failed: ${error.message}`)
  }
  
  await sleep(500)
  
  // Step 6: User goes back to today (cache hit test)
  console.log('\\n🔄 Step 6: User goes back to today (cache hit test)')
  const backToTodayStart = Date.now()
  
  try {
    const todayAgain = await axios.get(`${BACKEND_URL}/api/v1/appointments/slots?appointment_date=${today}`)
    const backToTodayTime = Date.now() - backToTodayStart
    journey.push({ step: 'today_cache_hit', time: backToTodayTime, success: true })
    console.log(`✅ Today's slots (cached) loaded in ${backToTodayTime}ms`)
    
    if (backToTodayTime < 20) {
      console.log(`🚀 PERFECT CACHE HIT! Sub-20ms response`)
    }
  } catch (error) {
    journey.push({ step: 'today_cache_hit', time: null, success: false, error: error.message })
    console.error(`❌ Today's slots (cached) failed: ${error.message}`)
  }
  
  return journey
}

async function analyzeUserExperience(journey) {
  console.log('\\n📊 User Experience Analysis')
  console.log('=' .repeat(50))
  
  const successfulSteps = journey.filter(step => step.success)
  const failedSteps = journey.filter(step => !step.success)
  
  console.log(`✅ Successful Steps: ${successfulSteps.length}/${journey.length}`)
  
  if (failedSteps.length > 0) {
    console.log(`❌ Failed Steps: ${failedSteps.length}`)
    failedSteps.forEach(step => {
      console.log(`   - ${step.step}: ${step.error}`)
    })
  }
  
  // Analyze performance
  const times = successfulSteps.filter(step => step.time !== null).map(step => ({ name: step.step, time: step.time }))
  
  if (times.length > 0) {
    console.log('\\n⚡ Performance Metrics:')
    times.forEach(({ name, time }) => {
      const status = time < 50 ? '🚀 Excellent' : time < 100 ? '✅ Good' : time < 200 ? '⚠️ Acceptable' : '❌ Slow'
      console.log(`   ${name}: ${time}ms ${status}`)
    })
    
    const avgTime = Math.round(times.reduce((sum, t) => sum + t.time, 0) / times.length)
    console.log(`\\n📊 Average Response Time: ${avgTime}ms`)
  }
  
  // Check for cache benefits
  const todayFirst = journey.find(s => s.step === 'today_slots')
  const todaySecond = journey.find(s => s.step === 'today_cache_hit')
  
  if (todayFirst && todaySecond && todayFirst.success && todaySecond.success) {
    const improvement = Math.round(((todayFirst.time - todaySecond.time) / todayFirst.time) * 100)
    console.log(`\\n🔄 Cache Performance:`)
    console.log(`   First load: ${todayFirst.time}ms`)
    console.log(`   Cached load: ${todaySecond.time}ms`)
    console.log(`   Improvement: ${improvement}% faster`)
    
    if (improvement > 50) {
      console.log(`   🎉 CACHE WORKING EXCELLENTLY!`)
    } else if (improvement > 20) {
      console.log(`   ✅ Cache providing good benefit`)
    } else {
      console.log(`   ⚠️ Cache benefit is minimal`)
    }
  }
  
  // Overall assessment
  const successRate = (successfulSteps.length / journey.length) * 100
  const avgPerformance = times.length > 0 ? times.reduce((sum, t) => sum + t.time, 0) / times.length : 0
  
  console.log('\\n🎯 Overall Assessment:')
  console.log(`   Success Rate: ${Math.round(successRate)}%`)
  console.log(`   Avg Performance: ${Math.round(avgPerformance)}ms`)
  
  if (successRate >= 90 && avgPerformance < 100) {
    console.log(`   🏆 EXCELLENT: System providing outstanding user experience`)
  } else if (successRate >= 80 && avgPerformance < 200) {
    console.log(`   ✅ GOOD: System performing well for users`)
  } else if (successRate >= 70) {
    console.log(`   ⚠️ ACCEPTABLE: Some issues but functional`)
  } else {
    console.log(`   ❌ POOR: System needs attention`)
  }
  
  return {
    successRate,
    avgPerformance,
    cacheWorking: todayFirst && todaySecond ? todaySecond.time < todayFirst.time : false
  }
}

async function runValidation() {
  try {
    const journey = await simulateUserJourney()
    const analysis = await analyzeUserExperience(journey)
    
    console.log('\\n🎪 Ready for Manual Testing:')
    console.log(`   Open: ${FRONTEND_URL}/book`)
    console.log(`   Look for: Cache indicator in top-right corner`)
    console.log(`   Test: Navigate between dates and watch cache metrics`)
    console.log(`   Expected: Sub-100ms loading, high hit rates`)
    
    return analysis
  } catch (error) {
    console.error('❌ Validation failed:', error.message)
    return null
  }
}

if (require.main === module) {
  runValidation().catch(console.error)
}

module.exports = { runValidation, simulateUserJourney, analyzeUserExperience }