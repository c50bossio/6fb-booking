'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AppointmentExportPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appointment Export Center</CardTitle>
          <CardDescription>
            Export appointments with advanced filtering and multiple format options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              Appointment export functionality coming soon...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}