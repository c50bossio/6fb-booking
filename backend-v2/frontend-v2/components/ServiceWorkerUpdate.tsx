'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useServiceWorker } from './PWAInstallPrompt'

export function ServiceWorkerUpdate() {
  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker()

  if (!isUpdateAvailable) {
    return null
  }

  return (
    <Alert className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
      <RefreshCw className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>A new version is available</span>
        <Button
          size="sm"
          onClick={updateServiceWorker}
          className="ml-4"
        >
          Update
        </Button>
      </AlertDescription>
    </Alert>
  )
}