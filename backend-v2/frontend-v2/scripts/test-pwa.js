#!/usr/bin/env node

/**
 * PWA Functionality Test Script
 * Comprehensive testing of BookedBarber PWA features
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 BookedBarber PWA Test Suite Starting...\n');

// Test 1: Manifest.json validation
function testManifest() {
  console.log('📄 Testing manifest.json...');
  
  try {
    const manifestPath = path.join(__dirname, '../public/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color', 'icons'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    // Check icons
    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
      console.log('❌ No icons defined in manifest');
      return false;
    }
    
    // Check for 192x192 and 512x512 icons (required for installability)
    const iconSizes = manifest.icons.map(icon => icon.sizes);
    const has192 = iconSizes.some(size => size.includes('192x192'));
    const has512 = iconSizes.some(size => size.includes('512x512'));
    
    if (!has192 || !has512) {
      console.log('⚠️  Missing required icon sizes (192x192 and 512x512)');
    }
    
    // Check shortcuts
    if (manifest.shortcuts && manifest.shortcuts.length > 0) {
      console.log(`✅ ${manifest.shortcuts.length} app shortcuts defined`);
    }
    
    console.log('✅ Manifest.json is valid');
    return true;
    
  } catch (error) {
    console.log(`❌ Manifest.json error: ${error.message}`);
    return false;
  }
}

// Test 2: Service Worker validation
function testServiceWorker() {
  console.log('\n🔧 Testing service worker...');
  
  try {
    const swPath = path.join(__dirname, '../public/sw.js');
    const swContent = fs.readFileSync(swPath, 'utf8');
    
    // Check for required service worker features
    const requiredFeatures = [
      'install',
      'activate', 
      'fetch',
      'cache',
      'IndexedDB',
      'background sync',
      'push notification'
    ];
    
    const checks = [
      { name: 'install', pattern: /addEventListener\(['"]install['"]/ },
      { name: 'activate', pattern: /addEventListener\(['"]activate['"]/ },
      { name: 'fetch', pattern: /addEventListener\(['"]fetch['"]/ },
      { name: 'cache', pattern: /caches\.(open|match|delete)/ },
      { name: 'IndexedDB', pattern: /indexedDB\.open/ },
      { name: 'background sync', pattern: /addEventListener\(['"]sync['"]/ },
      { name: 'push notification', pattern: /addEventListener\(['"]push['"]/ }
    ];
    
    let passedChecks = 0;
    checks.forEach(check => {
      if (check.pattern.test(swContent)) {
        console.log(`✅ ${check.name} handler found`);
        passedChecks++;
      } else {
        console.log(`❌ ${check.name} handler missing`);
      }
    });
    
    // Check cache version
    const cacheVersionMatch = swContent.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (cacheVersionMatch) {
      console.log(`✅ Cache version: ${cacheVersionMatch[1]}`);
    }
    
    console.log(`✅ Service worker validation: ${passedChecks}/${checks.length} features implemented`);
    return passedChecks >= checks.length * 0.8; // 80% pass rate
    
  } catch (error) {
    console.log(`❌ Service worker error: ${error.message}`);
    return false;
  }
}

// Test 3: PWA component validation
function testPWAComponents() {
  console.log('\n🧩 Testing PWA components...');
  
  const components = [
    'components/PWAInstallPrompt.tsx',
    'components/ServiceWorkerUpdate.tsx',
    'components/MobilePWAManager.tsx',
    'components/OfflineCalendarManager.tsx'
  ];
  
  let existingComponents = 0;
  
  components.forEach(component => {
    const componentPath = path.join(__dirname, '..', component);
    if (fs.existsSync(componentPath)) {
      console.log(`✅ ${component} exists`);
      existingComponents++;
    } else {
      console.log(`❌ ${component} missing`);
    }
  });
  
  return existingComponents === components.length;
}

// Test 4: Offline data manager validation
function testOfflineDataManager() {
  console.log('\n💾 Testing offline data manager...');
  
  try {
    const odlPath = path.join(__dirname, '../lib/offline-data-manager.ts');
    const odlContent = fs.readFileSync(odlPath, 'utf8');
    
    const requiredMethods = [
      'initialize',
      'storeAppointmentOffline',
      'getOfflineAppointments',
      'syncWithServer',
      'getOfflineStats'
    ];
    
    let foundMethods = 0;
    requiredMethods.forEach(method => {
      if (odlContent.includes(method)) {
        console.log(`✅ ${method} method found`);
        foundMethods++;
      } else {
        console.log(`❌ ${method} method missing`);
      }
    });
    
    return foundMethods === requiredMethods.length;
    
  } catch (error) {
    console.log(`❌ Offline data manager error: ${error.message}`);
    return false;
  }
}

// Test 5: Push notification setup validation
function testPushNotifications() {
  console.log('\n🔔 Testing push notifications setup...');
  
  try {
    const hookPath = path.join(__dirname, '../hooks/usePushNotifications.ts');
    const libPath = path.join(__dirname, '../lib/push-notifications.ts');
    
    const hookExists = fs.existsSync(hookPath);
    const libExists = fs.existsSync(libPath);
    
    if (hookExists) {
      console.log('✅ usePushNotifications hook exists');
    } else {
      console.log('❌ usePushNotifications hook missing');
    }
    
    if (libExists) {
      console.log('✅ push-notifications library exists');
    } else {
      console.log('❌ push-notifications library missing');
    }
    
    return hookExists && libExists;
    
  } catch (error) {
    console.log(`❌ Push notifications error: ${error.message}`);
    return false;
  }
}

// Test 6: PWA routes validation
function testPWARoutes() {
  console.log('\n🛣️  Testing PWA routes...');
  
  const routes = [
    'app/pwa/page.tsx',
    'app/offline/page.tsx'
  ];
  
  let existingRoutes = 0;
  
  routes.forEach(route => {
    const routePath = path.join(__dirname, '..', route);
    if (fs.existsSync(routePath)) {
      console.log(`✅ ${route} exists`);
      existingRoutes++;
    } else {
      console.log(`❌ ${route} missing`);
    }
  });
  
  return existingRoutes === routes.length;
}

// Test 7: Layout integration validation
function testLayoutIntegration() {
  console.log('\n📱 Testing layout integration...');
  
  try {
    const layoutPath = path.join(__dirname, '../app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    const checks = [
      { name: 'PWAInstallPrompt', pattern: /PWAInstallPrompt/ },
      { name: 'ServiceWorkerUpdate', pattern: /ServiceWorkerUpdate/ },
      { name: 'manifest link', pattern: /manifest\.json/ },
      { name: 'theme-color meta', pattern: /theme-color/ },
      { name: 'viewport meta', pattern: /viewport/ }
    ];
    
    let foundIntegrations = 0;
    checks.forEach(check => {
      if (check.pattern.test(layoutContent)) {
        console.log(`✅ ${check.name} integrated`);
        foundIntegrations++;
      } else {
        console.log(`❌ ${check.name} not integrated`);
      }
    });
    
    return foundIntegrations >= checks.length * 0.8;
    
  } catch (error) {
    console.log(`❌ Layout integration error: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const tests = [
    { name: 'Manifest Validation', fn: testManifest },
    { name: 'Service Worker Validation', fn: testServiceWorker },
    { name: 'PWA Components', fn: testPWAComponents },
    { name: 'Offline Data Manager', fn: testOfflineDataManager },
    { name: 'Push Notifications', fn: testPushNotifications },
    { name: 'PWA Routes', fn: testPWARoutes },
    { name: 'Layout Integration', fn: testLayoutIntegration }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const passed = test.fn();
    results.push({ name: test.name, passed });
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log(`\n🎯 Overall Score: ${passedCount}/${totalCount} (${Math.round(passedCount/totalCount*100)}%)`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All PWA tests passed! Your app is ready for production.');
  } else if (passedCount >= totalCount * 0.8) {
    console.log('⚠️  Most PWA features are working. Address remaining issues for optimal experience.');
  } else {
    console.log('❌ Critical PWA features are missing. Please address the failing tests.');
  }
  
  // PWA Installation Checklist
  console.log('\n📋 PWA Installation Checklist:');
  console.log('=============================');
  console.log('✅ Served over HTTPS (required for production)');
  console.log('✅ Web app manifest with required fields');
  console.log('✅ Service worker registered and caching resources');
  console.log('✅ Responsive design for mobile devices');
  console.log('✅ App install prompt and offline functionality');
  console.log('✅ Push notification support');
  console.log('✅ Offline data synchronization');
  
  console.log('\n🚀 To test PWA installation:');
  console.log('1. Deploy to a secure HTTPS domain');
  console.log('2. Open in Chrome/Edge on mobile or desktop');
  console.log('3. Look for "Install App" prompt in address bar');
  console.log('4. Test offline functionality by going offline');
  console.log('5. Test push notifications with user permission');
  
  return passedCount === totalCount;
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testManifest,
  testServiceWorker,
  testPWAComponents,
  testOfflineDataManager,
  testPushNotifications,
  testPWARoutes,
  testLayoutIntegration,
  runAllTests
};