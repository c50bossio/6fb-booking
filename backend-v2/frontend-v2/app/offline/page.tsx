'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { WifiOff, RefreshCw, Calendar, Home } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <WifiOff className="h-8 w-8 text-gray-600 dark:text-gray-400" />
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
          <CardDescription className="text-base">
            It looks like you've lost your internet connection. Some features may be unavailable until you're back online.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Don't worry! Your data is safe and will sync automatically when you reconnect.
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleRefresh} 
              className="w-full"
              variant="primary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Link href="/dashboard" className="block">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              
              <Link href="/calendar" className="block">
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium text-sm mb-2">What you can do offline:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• View cached appointments</li>
              <li>• Access your calendar</li>
              <li>• Review client information</li>
              <li>• View business analytics</li>
            </ul>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium text-sm mb-2">What requires internet:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Creating new appointments</li>
              <li>• Processing payments</li>
              <li>• Sending notifications</li>
              <li>• Syncing with Google Calendar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}