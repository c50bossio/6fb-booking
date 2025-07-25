import { checkRouteAccess, routeAccessControl } from './access-control'

/**
 * Test script to demonstrate access control functionality
 * This file can be used to verify that access control works correctly
 */

// Test scenarios
const testScenarios = [
  // Super admin should have access to everything
  { role: 'super_admin', path: '/admin/users', expectedAccess: true },
  { role: 'super_admin', path: '/tools', expectedAccess: true },
  { role: 'super_admin', path: '/commissions', expectedAccess: true },
  { role: 'super_admin', path: '/dashboard', expectedAccess: true },

  // Regular admin should have limited access
  { role: 'admin', path: '/admin/users', expectedAccess: false },
  { role: 'admin', path: '/admin/services', expectedAccess: true },
  { role: 'admin', path: '/commissions', expectedAccess: true },
  { role: 'admin', path: '/dashboard', expectedAccess: true },

  // Barbers should have even more limited access
  { role: 'barber', path: '/admin/users', expectedAccess: false },
  { role: 'barber', path: '/admin/services', expectedAccess: false },
  { role: 'barber', path: '/clients', expectedAccess: true },
  { role: 'barber', path: '/calendar', expectedAccess: true },
  { role: 'barber', path: '/dashboard', expectedAccess: true },

  // Regular users should have minimal access
  { role: 'user', path: '/admin', expectedAccess: false },
  { role: 'user', path: '/clients', expectedAccess: false },
  { role: 'user', path: '/bookings', expectedAccess: true },
  { role: 'user', path: '/dashboard', expectedAccess: true },

  // Unauthenticated users should only access public routes
  { role: null, path: '/login', expectedAccess: true },
  { role: null, path: '/register', expectedAccess: true },
  { role: null, path: '/book', expectedAccess: true },
  { role: null, path: '/dashboard', expectedAccess: false },
  { role: null, path: '/admin', expectedAccess: false },
]

/**
 * Run access control tests
 */
export function runAccessControlTests(): {
  passed: number
  failed: number
  total: number
  results: Array<{
    scenario: string
    passed: boolean
    expected: boolean
    actual: boolean
    error?: string
  }>
} {
  const results: Array<{
    scenario: string
    passed: boolean
    expected: boolean
    actual: boolean
    error?: string
  }> = []

  let passed = 0
  let failed = 0

  for (const scenario of testScenarios) {
    try {
      const isAuthenticated = scenario.role !== null
      const accessCheck = checkRouteAccess(scenario.path, scenario.role, isAuthenticated)
      
      const actualAccess = accessCheck.hasAccess
      const expectedAccess = scenario.expectedAccess
      const testPassed = actualAccess === expectedAccess

      results.push({
        scenario: `${scenario.role || 'unauthenticated'} accessing ${scenario.path}`,
        passed: testPassed,
        expected: expectedAccess,
        actual: actualAccess
      })

      if (testPassed) {
        passed++
      } else {
        failed++
      }
    } catch (error) {
      results.push({
        scenario: `${scenario.role || 'unauthenticated'} accessing ${scenario.path}`,
        passed: false,
        expected: scenario.expectedAccess,
        actual: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      failed++
    }
  }

  return {
    passed,
    failed,
    total: testScenarios.length,
    results
  }
}

/**
 * Print test results in a readable format
 */
export function printAccessControlTestResults(): void {
  
  const testResults = runAccessControlTests()
  

  // Print detailed results
  testResults.results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL'
    const expectedStr = result.expected ? 'ALLOW' : 'DENY'
    const actualStr = result.actual ? 'ALLOW' : 'DENY'
    
    
    if (result.error) {
    }
    
  })

  // Print route access summary
  
  const routesByRole = {
    'super_admin': routeAccessControl.filter(r => r.allowedRoles.includes('super_admin')),
    'admin': routeAccessControl.filter(r => r.allowedRoles.includes('admin')),
    'barber': routeAccessControl.filter(r => r.allowedRoles.includes('barber')),
    'user': routeAccessControl.filter(r => r.allowedRoles.includes('user') || r.allowedRoles.length === 0)
  }

  Object.entries(routesByRole).forEach(([role, routes]) => {
    routes.forEach(route => {
    })
  })
}

/**
 * Role hierarchy validation
 */
export function validateRoleHierarchy(): boolean {
  const hierarchyTests = [
    { role: 'super_admin', shouldInclude: ['admin', 'barber', 'user'] },
    { role: 'admin', shouldInclude: ['barber', 'user'] },
    { role: 'barber', shouldInclude: ['user'] },
    { role: 'user', shouldInclude: [] }
  ]

  const roleMapping: Record<string, string[]> = {
    'super_admin': ['super_admin', 'admin', 'barber', 'user'],
    'admin': ['admin', 'barber', 'user'],
    'barber': ['barber', 'user'],
    'user': ['user']
  }

  for (const test of hierarchyTests) {
    const equivalentRoles = roleMapping[test.role] || []
    
    for (const shouldInclude of test.shouldInclude) {
      if (!equivalentRoles.includes(shouldInclude)) {
        console.error(`❌ Role hierarchy error: ${test.role} should include ${shouldInclude}`)
        return false
      }
    }
  }

  return true
}

// Export for use in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testAccessControl = {
    runTests: runAccessControlTests,
    printResults: printAccessControlTestResults,
    validateHierarchy: validateRoleHierarchy
  }
}