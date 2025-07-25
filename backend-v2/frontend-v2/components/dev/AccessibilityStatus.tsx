/**
 * Development-only Accessibility Status Display
 * Shows WCAG AA compliance status during development
 */

'use client'

import { useEffect, useState } from 'react'
import { runAccessibilityAudit } from '@/utils/accessibility-test'

interface AccessibilityAuditResult {
  passed: boolean
  violations: Array<{
    element: string
    issue: string
    severity: 'error' | 'warning'
    wcagGuideline: string
  }>
  recommendations: string[]
}

export function AccessibilityStatus() {
  const [auditResult, setAuditResult] = useState<{
    overall: AccessibilityAuditResult
    colorContrast: AccessibilityAuditResult
    headingHierarchy: AccessibilityAuditResult
    keyboardNavigation: AccessibilityAuditResult
    ariaAttributes: AccessibilityAuditResult
  } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') return

    // Run audit after component mount
    const audit = runAccessibilityAudit()
    setAuditResult(audit)
  }, [])

  // Don't render in production
  if (process.env.NODE_ENV !== 'development' || !auditResult) {
    return null
  }

  return (
    <>
      {/* Floating accessibility status indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white font-bold text-sm transition-all ${
            auditResult.overall.passed 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
          aria-label={`Accessibility status: ${auditResult.overall.passed ? 'Passed' : 'Issues found'}. Click to view details.`}
          title={`WCAG AA Status: ${auditResult.overall.passed ? 'PASS' : 'FAIL'}`}
        >
          {auditResult.overall.passed ? '✓' : '!'}
        </button>
      </div>

      {/* Accessibility audit panel */}
      {isVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Calendar Accessibility Audit
              </h2>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close accessibility audit"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status overview */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                auditResult.overall.passed
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {auditResult.overall.passed ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    WCAG AA Compliant
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {auditResult.overall.violations.length} Issues Found
                  </>
                )}
              </div>
            </div>

            {/* Audit details */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Test categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <TestCategoryCard
                  title="Color Contrast"
                  result={auditResult.colorContrast}
                  icon="🎨"
                />
                <TestCategoryCard
                  title="Heading Hierarchy"
                  result={auditResult.headingHierarchy}
                  icon="📋"
                />
                <TestCategoryCard
                  title="Keyboard Navigation"
                  result={auditResult.keyboardNavigation}
                  icon="⌨️"
                />
                <TestCategoryCard
                  title="ARIA Attributes"
                  result={auditResult.ariaAttributes}
                  icon="🏷️"
                />
              </div>

              {/* Violations */}
              {auditResult.overall.violations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Issues to Address
                  </h3>
                  <div className="space-y-2">
                    {auditResult.overall.violations.map((violation, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-start">
                          <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-900 dark:text-red-200">
                              {violation.element}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              {violation.issue}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              WCAG Guideline: {violation.wcagGuideline}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Implementation Summary
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {auditResult.overall.recommendations.map((rec, index) => (
                      <div key={index}>{rec}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface TestCategoryCardProps {
  title: string
  result: AccessibilityAuditResult
  icon: string
}

function TestCategoryCard({ title, result, icon }: TestCategoryCardProps) {
  return (
    <div className={`p-4 rounded-lg border-2 ${
      result.passed
        ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
        : 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
    }`}>
      <div className="flex items-center mb-2">
        <span className="text-lg mr-2">{icon}</span>
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <div className="ml-auto">
          {result.passed ? (
            <span className="text-green-600 dark:text-green-400">✓</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">!</span>
          )}
        </div>
      </div>
      <p className={`text-sm ${
        result.passed
          ? 'text-green-700 dark:text-green-300'
          : 'text-red-700 dark:text-red-300'
      }`}>
        {result.passed 
          ? 'All tests passed' 
          : `${result.violations.length} issue${result.violations.length !== 1 ? 's' : ''} found`
        }
      </p>
    </div>
  )
}