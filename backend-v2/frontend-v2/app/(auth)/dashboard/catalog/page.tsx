'use client'

import React from 'react'

export default function CatalogPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="rounded-lg border bg-white shadow-sm p-6">
        <div className="flex flex-col space-y-1.5 pb-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            Product Catalog
          </h3>
          <p className="text-sm text-gray-600">
            Manage services and retail products
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600">
            Product catalog functionality coming soon...
          </p>
        </div>
      </div>
    </div>
  )
}