#!/usr/bin/env node

/**
 * Test calendar component imports to identify specific errors
 */

const fs = require('fs')
const path = require('path')

function checkImportStructure() {
  console.log('🔍 Checking calendar import structure...')
  
  const projectRoot = '/Users/bossio/6fb-booking/backend-v2/frontend-v2'
  
  // Check if all imported files exist
  const imports = [
    'components/CalendarWeekView.tsx',
    'components/CalendarDayView.tsx', 
    'components/CalendarMonthView.tsx',
    'components/CalendarSync.tsx',
    'components/CalendarConflictResolver.tsx',
    'components/modals/CreateAppointmentModal.tsx',
    'components/modals/TimePickerModal.tsx',
    'components/modals/RescheduleModal.tsx',
    'lib/calendar-optimistic-updates.ts',
    'lib/calendar-api-enhanced.ts',
    'lib/request-deduplication.ts',
    'hooks/use-toast.ts',
    'hooks/useCalendarPerformance.ts',
    'hooks/useResponsiveCalendar.ts'
  ]
  
  console.log('\n📁 Checking file existence:')
  let missingFiles = []
  
  imports.forEach(importPath => {
    const fullPath = path.join(projectRoot, importPath)
    const exists = fs.existsSync(fullPath)
    console.log(`${exists ? '✅' : '❌'} ${importPath}`)
    if (!exists) {
      missingFiles.push(importPath)
    }
  })
  
  if (missingFiles.length > 0) {
    console.log('\n❌ Missing files found:')
    missingFiles.forEach(file => console.log(`  - ${file}`))
  } else {
    console.log('\n✅ All imported files exist')
  }
  
  // Check for Next.js build errors
  console.log('\n🔨 Checking for build errors...')
  const { exec } = require('child_process')
  
  exec('cd /Users/bossio/6fb-booking/backend-v2/frontend-v2 && npm run build', { timeout: 60000 }, (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Build failed with errors:')
      console.log(error.message)
      console.log('\nStderr:', stderr)
      
      // Look for specific React/import errors
      if (stderr.includes('Module not found') || stdout.includes('Module not found')) {
        console.log('\n🔍 Module resolution errors detected')
        const moduleErrors = stderr.match(/Module not found.*$/gm) || []
        moduleErrors.forEach(err => console.log(`  ${err}`))
      }
      
      if (stderr.includes('React Hook') || stdout.includes('React Hook')) {
        console.log('\n🪝 React Hook errors detected')
        const hookErrors = stderr.match(/React Hook.*$/gm) || []
        hookErrors.forEach(err => console.log(`  ${err}`))
      }
      
    } else {
      console.log('✅ Build completed successfully')
      console.log('Build output preview:')
      console.log(stdout.slice(-500)) // Last 500 chars
    }
  })
  
  // Check calendar page specifically
  console.log('\n📄 Checking calendar page structure...')
  const calendarPagePath = path.join(projectRoot, 'app/calendar/page.tsx')
  
  try {
    const content = fs.readFileSync(calendarPagePath, 'utf8')
    
    // Look for potential issues
    const issues = []
    
    // Check for lazy imports
    if (content.includes('const CalendarWeekView = lazy(')) {
      console.log('✅ CalendarWeekView lazy import found')
    } else {
      issues.push('CalendarWeekView lazy import missing or malformed')
    }
    
    if (content.includes('const CalendarDayView = lazy(')) {
      console.log('✅ CalendarDayView lazy import found')
    } else {
      issues.push('CalendarDayView lazy import missing or malformed')
    }
    
    if (content.includes('const CalendarMonthView = lazy(')) {
      console.log('✅ CalendarMonthView lazy import found')
    } else {
      issues.push('CalendarMonthView lazy import missing or malformed')
    }
    
    // Check for Suspense wrapper
    if (content.includes('<Suspense fallback=')) {
      console.log('✅ Suspense wrapper found')
    } else {
      issues.push('Suspense wrapper for lazy components missing')
    }
    
    // Check for view mode state
    if (content.includes('viewMode') && content.includes('setViewMode')) {
      console.log('✅ View mode state management found')
    } else {
      issues.push('View mode state management missing')
    }
    
    // Check for view switcher buttons
    if (content.includes('onClick={() => setViewMode(')) {
      console.log('✅ View switcher buttons found')
    } else {
      issues.push('View switcher buttons missing or malformed')
    }
    
    if (issues.length > 0) {
      console.log('\n⚠️  Potential issues found:')
      issues.forEach(issue => console.log(`  - ${issue}`))
    } else {
      console.log('\n✅ Calendar page structure looks good')
    }
    
  } catch (error) {
    console.error('❌ Error reading calendar page:', error.message)
  }
}

checkImportStructure()