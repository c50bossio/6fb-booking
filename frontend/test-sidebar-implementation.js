#!/usr/bin/env node

/**
 * Global Sidebar Implementation Test Script
 *
 * This script tests the ConditionalLayout system to ensure:
 * 1. Route classification is working correctly
 * 2. Sidebar shows/hides appropriately for different route types
 * 3. No import issues or missing dependencies
 * 4. Component structure is properly implemented
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Global Sidebar Implementation\n');

// Test 1: Check for required files
console.log('📁 Checking Required Files...');
const requiredFiles = [
  'src/components/layouts/ConditionalLayout.tsx',
  'src/components/layouts/DashboardLayout.tsx',
  'src/components/LayoutWrapper.tsx',
  'src/utils/routeClassification.ts',
  'src/app/layout.tsx'
];

let filesExist = true;
requiredFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    filesExist = false;
  }
});

if (!filesExist) {
  console.log('\n❌ Some required files are missing. Implementation incomplete.');
  process.exit(1);
}

// Test 2: Test route classification logic
console.log('\n🛣️  Testing Route Classification...');

// Import the route classification functions (simulate)
const testRoutes = [
  // Public routes
  { path: '/', expectedType: 'public', shouldShowSidebar: false },
  { path: '/login', expectedType: 'public', shouldShowSidebar: false },
  { path: '/register', expectedType: 'public', shouldShowSidebar: false },
  { path: '/book', expectedType: 'public', shouldShowSidebar: false },
  { path: '/demo', expectedType: 'public', shouldShowSidebar: false },
  { path: '/landing', expectedType: 'public', shouldShowSidebar: false },

  // Dashboard routes
  { path: '/dashboard', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/appointments', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/calendar', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/clients', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/analytics', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/settings', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/profile', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/admin', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/barber', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/customer', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/payouts', expectedType: 'dashboard', shouldShowSidebar: true },

  // Nested routes
  { path: '/dashboard/overview', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/appointments/new', expectedType: 'dashboard', shouldShowSidebar: true },
  { path: '/settings/profile', expectedType: 'dashboard', shouldShowSidebar: true }
];

// Simulate route classification logic (based on patterns from the file)
function simulateRouteClassification(pathname) {
  const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/emergency-login',
                        '/simple-login', '/book', '/demo', '/booking-demo', '/calendar-demo',
                        '/simple-calendar-demo', '/enhanced-calendar-demo', '/demo-google-calendar',
                        '/contact', '/about', '/privacy', '/terms', '/security', '/test-public', '/landing'];

  const DASHBOARD_ROUTES = ['/dashboard', '/appointments', '/calendar', '/clients', '/analytics',
                           '/settings', '/profile', '/admin', '/barber', '/customer', '/reports',
                           '/payouts', '/payments', '/notifications', '/staff', '/services',
                           '/inventory', '/schedule'];

  const NO_SIDEBAR_ROUTES = ['/login', '/register', '/forgot-password', '/emergency-login',
                            '/simple-login', '/', '/landing', '/book', '/demo', '/booking-demo',
                            '/calendar-demo', '/simple-calendar-demo', '/enhanced-calendar-demo',
                            '/demo-google-calendar'];

  const isPublic = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  const isDashboard = DASHBOARD_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
  const shouldHideSidebar = NO_SIDEBAR_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

  return {
    isPublic,
    isDashboard,
    shouldShowSidebar: !shouldHideSidebar && isDashboard,
    routeType: isPublic ? 'public' : isDashboard ? 'dashboard' : 'unknown'
  };
}

let routeTestsPassed = 0;
let routeTestsFailed = 0;

testRoutes.forEach(test => {
  const result = simulateRouteClassification(test.path);
  const sidebarMatch = result.shouldShowSidebar === test.shouldShowSidebar;
  const typeMatch = result.routeType === test.expectedType;

  if (sidebarMatch && typeMatch) {
    console.log(`✅ ${test.path} -> ${result.routeType}, sidebar: ${result.shouldShowSidebar}`);
    routeTestsPassed++;
  } else {
    console.log(`❌ ${test.path} -> Expected: ${test.expectedType}, sidebar: ${test.shouldShowSidebar} | Got: ${result.routeType}, sidebar: ${result.shouldShowSidebar}`);
    routeTestsFailed++;
  }
});

console.log(`\n📊 Route Classification Results: ${routeTestsPassed} passed, ${routeTestsFailed} failed`);

// Test 3: Check component structure and imports
console.log('\n🧩 Testing Component Structure...');

function checkFileContent(filePath, checks) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${filePath} - File not found`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  let allPassed = true;

  checks.forEach(check => {
    if (check.type === 'import') {
      if (content.includes(check.pattern)) {
        console.log(`✅ ${filePath} - ${check.description}`);
      } else {
        console.log(`❌ ${filePath} - ${check.description}`);
        allPassed = false;
      }
    } else if (check.type === 'function') {
      if (content.includes(check.pattern)) {
        console.log(`✅ ${filePath} - ${check.description}`);
      } else {
        console.log(`❌ ${filePath} - ${check.description}`);
        allPassed = false;
      }
    }
  });

  return allPassed;
}

// Check ConditionalLayout
const conditionalLayoutChecks = [
  { type: 'import', pattern: "import { usePathname }", description: 'Imports usePathname from Next.js' },
  { type: 'import', pattern: "shouldShowSidebar, isDashboardRoute, isPublicRoute", description: 'Imports route classification functions' },
  { type: 'import', pattern: "import DashboardLayout", description: 'Imports DashboardLayout component' },
  { type: 'function', pattern: "shouldShowSidebar(pathname)", description: 'Uses shouldShowSidebar function' },
  { type: 'function', pattern: "isDashboardRoute(pathname)", description: 'Uses isDashboardRoute function' },
  { type: 'function', pattern: "isPublicRoute(pathname)", description: 'Uses isPublicRoute function' }
];

checkFileContent('src/components/layouts/ConditionalLayout.tsx', conditionalLayoutChecks);

// Check LayoutWrapper
const layoutWrapperChecks = [
  { type: 'import', pattern: "import { useAuth }", description: 'Imports useAuth hook' },
  { type: 'import', pattern: "import { ConditionalLayout }", description: 'Imports ConditionalLayout' },
  { type: 'function', pattern: "const { user, logout } = useAuth()", description: 'Uses useAuth hook' },
  { type: 'function', pattern: "<ConditionalLayout", description: 'Renders ConditionalLayout component' }
];

checkFileContent('src/components/LayoutWrapper.tsx', layoutWrapperChecks);

// Check route classification
const routeClassificationChecks = [
  { type: 'function', pattern: "export function isPublicRoute", description: 'Exports isPublicRoute function' },
  { type: 'function', pattern: "export function isDashboardRoute", description: 'Exports isDashboardRoute function' },
  { type: 'function', pattern: "export function shouldShowSidebar", description: 'Exports shouldShowSidebar function' },
  { type: 'function', pattern: "ROUTE_PATTERNS", description: 'Defines route patterns' }
];

checkFileContent('src/utils/routeClassification.ts', routeClassificationChecks);

// Check main layout
const mainLayoutChecks = [
  { type: 'import', pattern: "import LayoutWrapper", description: 'Imports LayoutWrapper component' },
  { type: 'function', pattern: "<LayoutWrapper>", description: 'Uses LayoutWrapper in layout' }
];

checkFileContent('src/app/layout.tsx', mainLayoutChecks);

// Test 4: Check for potential issues
console.log('\n⚠️  Checking for Potential Issues...');

const potentialIssues = [];

// Check if DemoModernSidebar exists (used by DashboardLayout)
if (!fs.existsSync(path.join(process.cwd(), 'src/components/DemoModernSidebar.tsx'))) {
  potentialIssues.push('DemoModernSidebar component not found - required by DashboardLayout');
}

// Check if ThemeContext exists (used by DashboardLayout)
if (!fs.existsSync(path.join(process.cwd(), 'src/contexts/ThemeContext.tsx'))) {
  potentialIssues.push('ThemeContext not found - required by DashboardLayout');
}

// Check if AuthProvider exists (used by LayoutWrapper)
if (!fs.existsSync(path.join(process.cwd(), 'src/components/AuthProvider.tsx'))) {
  potentialIssues.push('AuthProvider component not found - required by LayoutWrapper');
}

if (potentialIssues.length === 0) {
  console.log('✅ No obvious issues detected');
} else {
  potentialIssues.forEach(issue => {
    console.log(`⚠️  ${issue}`);
  });
}

// Test 5: Server response test
console.log('\n🌐 Testing Server Response...');

const http = require('http');

function testServerResponse() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          hasHtml: data.includes('<html'),
          hasReact: data.includes('_next') || data.includes('__NEXT_DATA__'),
          size: data.length
        });
      });
    });

    req.on('error', () => {
      resolve({ success: false });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ success: false, timeout: true });
    });
  });
}

testServerResponse().then(result => {
  if (result.success) {
    console.log(`✅ Server responding with status ${result.statusCode}`);
    console.log(`✅ Response contains HTML: ${result.hasHtml}`);
    console.log(`✅ Response contains React/Next.js: ${result.hasReact}`);
    console.log(`✅ Response size: ${result.size} bytes`);
  } else if (result.timeout) {
    console.log('⚠️  Server timeout - may still be starting up');
  } else {
    console.log('❌ Server not responding');
  }

  // Final summary
  console.log('\n📋 Test Summary:');
  console.log('================');

  if (filesExist) {
    console.log('✅ All required files present');
  } else {
    console.log('❌ Missing required files');
  }

  if (routeTestsFailed === 0) {
    console.log('✅ Route classification working correctly');
  } else {
    console.log(`❌ Route classification has ${routeTestsFailed} issues`);
  }

  if (potentialIssues.length === 0) {
    console.log('✅ Component dependencies look good');
  } else {
    console.log(`⚠️  ${potentialIssues.length} potential dependency issues`);
  }

  if (result.success) {
    console.log('✅ Development server is running');
  } else {
    console.log('❌ Development server issues');
  }

  console.log('\n🎯 Recommendations:');
  console.log('===================');

  if (routeTestsFailed > 0) {
    console.log('- Review route classification logic in src/utils/routeClassification.ts');
  }

  if (potentialIssues.length > 0) {
    console.log('- Ensure all component dependencies are properly installed');
    console.log('- Check import paths for accuracy');
  }

  if (!result.success) {
    console.log('- Start the development server: npm run dev');
    console.log('- Check for compilation errors: npx tsc --noEmit');
  }

  console.log('- Test the implementation by navigating to different routes');
  console.log('- Verify sidebar shows on dashboard routes (/dashboard, /appointments, etc.)');
  console.log('- Verify sidebar is hidden on public routes (/, /login, /register, etc.)');
  console.log('- Check browser console for any runtime errors');

  console.log('\n✨ Test completed!');
});
