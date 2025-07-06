#!/usr/bin/env node

// Simple test to verify calendar constants work
const path = require('path');

// Mock TypeScript module resolution
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    jsx: 'react-jsx'
  }
});

try {
  console.log('Testing calendar constants...');
  
  // This will show us if there are import/syntax errors
  const constants = require('./lib/calendar-constants.ts');
  
  console.log('✅ Constants loaded successfully');
  console.log('SERVICE_TYPES:', Object.keys(constants.SERVICE_TYPES || {}));
  console.log('getServiceConfig available:', typeof constants.getServiceConfig === 'function');
  console.log('getBarberSymbol available:', typeof constants.getBarberSymbol === 'function');
  
  if (constants.getServiceConfig) {
    const haircut = constants.getServiceConfig('haircut');
    console.log('Haircut config:', haircut ? '✅ Working' : '❌ Failed');
  }
  
} catch (error) {
  console.error('❌ Error testing constants:', error.message);
  console.error('Stack:', error.stack);
}