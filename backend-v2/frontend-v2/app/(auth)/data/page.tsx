'use client'

import { Card } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { DocumentArrowUpIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function DataManagementPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Management</h1>
        <p className="text-gray-600">Import and export your business data</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <DocumentArrowUpIcon className="h-8 w-8 text-blue-500 mr-3" />
            <h2 className="text-xl font-semibold">Import Data</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Import client information, services, and historical data from CSV files or other systems.
          </p>
          <Link href="/import">
            <Button className="w-full">Go to Import</Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center mb-4">
            <DocumentArrowDownIcon className="h-8 w-8 text-green-500 mr-3" />
            <h2 className="text-xl font-semibold">Export Data</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Export your business data for backup, analysis, or migration to other systems.
          </p>
          <Link href="/export">
            <Button className="w-full">Go to Export</Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}