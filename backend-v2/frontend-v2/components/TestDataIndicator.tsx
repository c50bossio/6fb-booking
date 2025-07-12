'use client'

import React from 'react'

interface TestDataIndicatorProps {
  className?: string
}

export const TestDataIndicator: React.FC<TestDataIndicatorProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-md text-sm">
        Demo Mode - Test Data
      </div>
    </div>
  )
}