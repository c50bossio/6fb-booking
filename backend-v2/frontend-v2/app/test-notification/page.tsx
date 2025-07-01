'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export default function TestNotificationPage() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <h1 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">
        Notification Dropdown Test
      </h1>
      
      <div className="space-y-8">
        {/* Test Case 1: Original Implementation */}
        <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Test 1: Original Radix UI Dropdown
          </h2>
          
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-[9999] mt-2 w-80 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
                sideOffset={5}
                align="end"
              >
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Notifications
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 rounded bg-gray-50 dark:bg-gray-700">
                      <p className="text-sm text-gray-900 dark:text-white">Test notification 1</p>
                    </div>
                    <div className="p-3 rounded bg-gray-50 dark:bg-gray-700">
                      <p className="text-sm text-gray-900 dark:text-white">Test notification 2</p>
                    </div>
                  </div>
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Test Case 2: Custom Portal Implementation */}
        <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Test 2: Custom Portal with Fixed Positioning
          </h2>
          
          <div className="relative inline-block">
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            {isOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setIsOpen(false)}
                />
                
                {/* Dropdown */}
                <div 
                  className="fixed z-[9999] mt-2 w-80 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
                  style={{
                    top: '100px',
                    right: '20px'
                  }}
                >
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Notifications (Custom Portal)
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="p-3 rounded bg-gray-50 dark:bg-gray-700">
                          <p className="text-sm text-gray-900 dark:text-white">
                            Test notification {i + 1}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Test Case 3: React Portal */}
        <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Test 3: React Portal Implementation
          </h2>
          
          <NotificationWithPortal />
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6B7280;
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4B5563;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #9CA3AF;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
      `}</style>
    </div>
  )
}

// Component with React Portal
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function NotificationWithPortal() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const dropdown = (
    <div 
      className="fixed z-[9999] mt-2 w-80 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
      style={{
        top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 100,
        right: 20
      }}
    >
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Notifications (React Portal)
        </h3>
        <div className="space-y-2">
          <div className="p-3 rounded bg-gray-50 dark:bg-gray-700">
            <p className="text-sm text-gray-900 dark:text-white">Portal notification 1</p>
          </div>
          <div className="p-3 rounded bg-gray-50 dark:bg-gray-700">
            <p className="text-sm text-gray-900 dark:text-white">Portal notification 2</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button 
        ref={buttonRef}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
      
      {isOpen && mounted && (
        <>
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          {createPortal(dropdown, document.body)}
        </>
      )}
    </>
  )
}