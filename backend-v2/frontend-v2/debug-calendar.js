#!/usr/bin/env node

/**
 * Calendar Debugging Script
 * Checks for specific issues that might prevent calendar components from rendering
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Calendar Page Issues...\n');

// Check if critical files exist
const criticalFiles = [
    'components/ResponsiveCalendar.tsx',
    'components/CalendarWeekView.tsx', 
    'components/CalendarDayView.tsx',
    'components/CalendarMonthView.tsx',
    'hooks/useResponsiveCalendar.ts',
    'lib/calendar-optimistic-updates.ts',
    'lib/calendar-api-enhanced.ts',
    'hooks/useCalendarPerformance.ts'
];

console.log('📁 Checking critical files:');
criticalFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Check for common TypeScript/encoding issues
console.log('\n📝 Checking for common issues:');

// Check for smart quotes in critical files
const filesToCheck = [
    'app/calendar/page.tsx',
    'components/ResponsiveCalendar.tsx',
    'components/CalendarWeekView.tsx'
];

filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const hasSmartQuotes = /[""''‛‚„‟″‴‶‷]/.test(content);
        console.log(`${hasSmartQuotes ? '❌' : '✅'} ${file} - Smart quotes check`);
        
        if (hasSmartQuotes) {
            console.log(`   ⚠️  Smart quotes detected in ${file}`);
        }
    }
});

// Check package.json for required dependencies
console.log('\n📦 Checking dependencies:');
if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['react', 'next', 'date-fns', '@heroicons/react'];
    
    requiredDeps.forEach(dep => {
        const hasIt = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
        console.log(`${hasIt ? '✅' : '❌'} ${dep}`);
    });
}

// Check for build/compilation issues
console.log('\n🏗️  Quick TypeScript check:');
try {
    const { execSync } = require('child_process');
    
    // Simple check if TypeScript can parse the calendar page
    execSync('npx tsc --noEmit --skipLibCheck app/calendar/page.tsx', { stdio: 'pipe' });
    console.log('✅ Calendar page TypeScript compilation');
} catch (error) {
    console.log('❌ Calendar page TypeScript compilation');
    console.log('   ⚠️  TypeScript errors detected');
}

console.log('\n🎯 Summary:');
console.log('1. If any critical files are missing (❌), they need to be created or restored');
console.log('2. If smart quotes are detected, replace with regular quotes (" and \')');  
console.log('3. If TypeScript compilation fails, fix the syntax errors first');
console.log('4. After fixing issues, restart the development server');

console.log('\n💡 Next steps:');
console.log('1. Run: npm run dev');
console.log('2. Navigate to: http://localhost:3000/calendar'); 
console.log('3. Check browser console for JavaScript errors');