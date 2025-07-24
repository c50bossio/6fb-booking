'use client'

import React from 'react'

export interface ABTestingWrapperProps {
  children: React.ReactNode
  testId?: string
  variant?: string
}

export function ABTestingWrapper({ children, testId, variant }: ABTestingWrapperProps) {
  return <div data-test-id={testId} data-variant={variant}>{children}</div>
}

export function ABTestDebugPanel() {
  return <div className="hidden">AB Test Debug Panel</div>
}