'use client'

import React, { useEffect, useState, useRef } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid'

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info'
  category: string
  message: string
  element?: HTMLElement
  guideline: string
}

interface AccessibilityTestResult {
  passed: number
  warnings: number
  errors: number
  issues: AccessibilityIssue[]
}

interface AccessibilityTesterProps {
  targetSelector?: string
  onTestComplete?: (result: AccessibilityTestResult) => void
  showDetails?: boolean
}

export function AccessibilityTester({ 
  targetSelector = '[role="application"], [role="grid"]',
  onTestComplete,
  showDetails = false
}: AccessibilityTesterProps) {
  const [testResult, setTestResult] = useState<AccessibilityTestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const testRef = useRef<HTMLDivElement>(null)

  // Color contrast calculation helper
  const getContrastRatio = (color1: string, color2: string): number => {
    // Simplified contrast calculation
    // In a real implementation, you'd use a library like color-contrast
    const getLuminance = (color: string): number => {
      // Basic RGB extraction and luminance calculation
      const rgb = color.match(/\d+/g)?.map(Number) || [255, 255, 255]
      const [r, g, b] = rgb.map(c => {
        c = c / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    const lum1 = getLuminance(color1)
    const lum2 = getLuminance(color2)
    const lighter = Math.max(lum1, lum2)
    const darker = Math.min(lum1, lum2)
    
    return (lighter + 0.05) / (darker + 0.05)
  }

  // WCAG 2.1 AA Tests
  const runAccessibilityTests = (): AccessibilityTestResult => {
    const issues: AccessibilityIssue[] = []
    let passed = 0
    let warnings = 0
    let errors = 0

    const targetElements = document.querySelectorAll(targetSelector)

    targetElements.forEach((element) => {
      const htmlElement = element as HTMLElement

      // Test 1: Check for proper ARIA labels
      const hasAriaLabel = htmlElement.hasAttribute('aria-label') || 
                          htmlElement.hasAttribute('aria-labelledby')
      
      if (!hasAriaLabel && htmlElement.role !== 'presentation') {
        issues.push({
          type: 'error',
          category: 'ARIA Labels',
          message: 'Interactive element missing aria-label or aria-labelledby',
          element: htmlElement,
          guideline: 'WCAG 2.1 AA - 4.1.2 Name, Role, Value'
        })
        errors++
      } else {
        passed++
      }

      // Test 2: Check keyboard navigation
      const focusableElements = htmlElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      focusableElements.forEach((focusable) => {
        const tabIndex = (focusable as HTMLElement).tabIndex
        if (tabIndex === 0 || tabIndex === -1) {
          passed++
        } else if (tabIndex > 0) {
          issues.push({
            type: 'warning',
            category: 'Keyboard Navigation',
            message: 'Positive tabindex found, may disrupt natural tab order',
            element: focusable as HTMLElement,
            guideline: 'WCAG 2.1 AA - 2.1.1 Keyboard'
          })
          warnings++
        }
      })

      // Test 3: Color contrast
      const style = getComputedStyle(htmlElement)
      const backgroundColor = style.backgroundColor
      const color = style.color
      
      if (backgroundColor !== 'rgba(0, 0, 0, 0)' && color !== 'rgba(0, 0, 0, 0)') {
        const contrast = getContrastRatio(backgroundColor, color)
        
        if (contrast < 4.5) {
          issues.push({
            type: 'error',
            category: 'Color Contrast',
            message: `Insufficient color contrast ratio: ${contrast.toFixed(2)} (minimum 4.5:1)`,
            element: htmlElement,
            guideline: 'WCAG 2.1 AA - 1.4.3 Contrast (Minimum)'
          })
          errors++
        } else {
          passed++
        }
      }

      // Test 4: Check for proper headings hierarchy
      const headings = htmlElement.querySelectorAll('h1, h2, h3, h4, h5, h6')
      let previousLevel = 0
      
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.substring(1))
        if (level > previousLevel + 1 && previousLevel !== 0) {
          issues.push({
            type: 'warning',
            category: 'Heading Structure',
            message: `Heading level ${level} follows ${previousLevel}, skipping levels`,
            element: heading as HTMLElement,
            guideline: 'WCAG 2.1 AA - 1.3.1 Info and Relationships'
          })
          warnings++
        } else {
          passed++
        }
        previousLevel = level
      })

      // Test 5: Check for focus indicators
      const interactiveElements = htmlElement.querySelectorAll('button, [href], input, select, textarea')
      interactiveElements.forEach((element) => {
        const styles = getComputedStyle(element as HTMLElement, ':focus')
        const hasOutline = styles.outline !== 'none' && styles.outline !== '0px'
        const hasBoxShadow = styles.boxShadow !== 'none'
        const hasBorder = styles.borderWidth !== '0px'
        
        if (!hasOutline && !hasBoxShadow && !hasBorder) {
          issues.push({
            type: 'error',
            category: 'Focus Indicators',
            message: 'Interactive element lacks visible focus indicator',
            element: element as HTMLElement,
            guideline: 'WCAG 2.1 AA - 2.4.7 Focus Visible'
          })
          errors++
        } else {
          passed++
        }
      })

      // Test 6: Check for proper button roles
      const buttons = htmlElement.querySelectorAll('[role="button"]')
      buttons.forEach((button) => {
        const hasKeyHandler = button.hasAttribute('onkeydown') || 
                             button.hasAttribute('onkeyup') ||
                             button.hasAttribute('onkeypress')
        
        if (!hasKeyHandler && button.tagName !== 'BUTTON') {
          issues.push({
            type: 'error',
            category: 'Keyboard Interaction',
            message: 'Element with button role missing keyboard event handlers',
            element: button as HTMLElement,
            guideline: 'WCAG 2.1 AA - 2.1.1 Keyboard'
          })
          errors++
        } else {
          passed++
        }
      })

      // Test 7: Check for ARIA live regions
      const liveRegions = htmlElement.querySelectorAll('[aria-live]')
      if (liveRegions.length === 0) {
        issues.push({
          type: 'warning',
          category: 'Dynamic Content',
          message: 'No ARIA live regions found for dynamic content updates',
          element: htmlElement,
          guideline: 'WCAG 2.1 AA - 4.1.3 Status Messages'
        })
        warnings++
      } else {
        passed++
      }

      // Test 8: Check for proper form labels
      const inputs = htmlElement.querySelectorAll('input, select, textarea')
      inputs.forEach((input) => {
        const hasLabel = input.hasAttribute('aria-label') ||
                        input.hasAttribute('aria-labelledby') ||
                        document.querySelector(`label[for="${input.id}"]`)
        
        if (!hasLabel) {
          issues.push({
            type: 'error',
            category: 'Form Labels',
            message: 'Form control missing associated label',
            element: input as HTMLElement,
            guideline: 'WCAG 2.1 AA - 1.3.1 Info and Relationships'
          })
          errors++
        } else {
          passed++
        }
      })
    })

    return { passed, warnings, errors, issues }
  }

  const runTests = async () => {
    setIsRunning(true)
    
    // Small delay to allow UI updates
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const result = runAccessibilityTests()
    setTestResult(result)
    setIsRunning(false)
    
    onTestComplete?.(result)
  }

  useEffect(() => {
    // Auto-run tests after component mount
    const timer = setTimeout(runTests, 1000)
    return () => clearTimeout(timer)
  }, [])

  const getIssueIcon = (type: AccessibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <CheckCircleIcon className="w-5 h-5 text-blue-500" />
    }
  }

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!showDetails && !isRunning && testResult) {
    return null
  }

  return (
    <div 
      ref={testRef}
      className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-md z-50"
      role="complementary"
      aria-label="Accessibility test results"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        <h3 className="font-semibold text-sm">Accessibility Test</h3>
      </div>

      {isRunning ? (
        <div className="text-sm text-gray-600">
          Running WCAG 2.1 AA compliance tests...
        </div>
      ) : testResult ? (
        <div className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-green-600">{testResult.passed}</div>
              <div className="text-gray-500">Passed</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-600">{testResult.warnings}</div>
              <div className="text-gray-500">Warnings</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{testResult.errors}</div>
              <div className="text-gray-500">Errors</div>
            </div>
          </div>

          {/* Score */}
          <div className="text-center">
            <div className={`text-lg font-bold ${getScoreColor(
              testResult.passed, 
              testResult.passed + testResult.warnings + testResult.errors
            )}`}>
              {Math.round((testResult.passed / (testResult.passed + testResult.warnings + testResult.errors)) * 100)}%
            </div>
            <div className="text-xs text-gray-500">WCAG 2.1 AA Compliance</div>
          </div>

          {/* Issues (if showing details) */}
          {showDetails && testResult.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-xs">Issues Found:</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {testResult.issues.slice(0, 5).map((issue, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <div className="font-medium">{issue.category}</div>
                      <div className="text-gray-600">{issue.message}</div>
                    </div>
                  </div>
                ))}
                {testResult.issues.length > 5 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{testResult.issues.length - 5} more issues
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={runTests}
              className="flex-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded hover:bg-blue-100 transition-colors"
            >
              Re-test
            </button>
            {testResult.errors === 0 && testResult.warnings === 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                <CheckCircleIcon className="w-3 h-3" />
                WCAG 2.1 AA
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {testResult && (
          `Accessibility test complete. ${testResult.passed} tests passed, ${testResult.warnings} warnings, ${testResult.errors} errors.`
        )}
      </div>
    </div>
  )
}

export default AccessibilityTester