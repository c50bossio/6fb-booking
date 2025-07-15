'use client'

import React from 'react'

export default function LogoutPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="rounded-lg border bg-white shadow-sm p-6">
        <div className="flex flex-col space-y-1.5 pb-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            Logout
          </h3>
          <p className="text-sm text-gray-600">
            You have been successfully logged out
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600">
            Logout functionality coming soon...
          </p>
        </div>
      </div>
    </div>
  )
}