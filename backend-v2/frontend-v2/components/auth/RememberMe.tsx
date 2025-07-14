'use client'

import React, { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from "@/components/ui/Label"
import { Button } from '@/components/ui/Button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info, Shield, Smartphone } from 'lucide-react'
import {
  generateDeviceFingerprint,
  trustDevice,
  isDeviceTrusted,
  generateDeviceName
} from '@/lib/device-fingerprint'

interface RememberMeProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  userId?: string
  showDeviceInfo?: boolean
  trustDuration?: number // in days
}

export function RememberMe({
  checked,
  onCheckedChange,
  userId,
  showDeviceInfo = false,
  trustDuration = 30
}: RememberMeProps) {
  const [deviceName, setDeviceName] = useState<string>('')
  const [isAlreadyTrusted, setIsAlreadyTrusted] = useState(false)

  useEffect(() => {
    // Get device information on mount
    const setupDevice = async () => {
      setDeviceName(generateDeviceName(navigator.userAgent))
      
      if (userId) {
        const trusted = await isDeviceTrusted(userId)
        setIsAlreadyTrusted(trusted)
      }
    }
    
    setupDevice()
  }, [userId])

  const handleCheckedChange = async (newChecked: boolean) => {
    onCheckedChange(newChecked)
    
    // If checking the box and we have a userId, trust this device
    if (newChecked && userId) {
      const deviceId = await generateDeviceFingerprint()
      await trustDevice(deviceId, userId, trustDuration)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="remember-me"
          checked={checked}
          onCheckedChange={handleCheckedChange}
        />
        <Label
          htmlFor="remember-me"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none cursor-pointer"
        >
          Remember me on this device
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                <Info className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                When enabled, you won't need to enter your password on this device for {trustDuration} days.
                Your device will be securely remembered.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {showDeviceInfo && deviceName && (
        <div className="ml-6 flex items-center gap-2 text-xs text-muted-foreground">
          {isAlreadyTrusted ? (
            <>
              <Shield className="h-3 w-3 text-green-600" />
              <span>This device is already trusted</span>
            </>
          ) : (
            <>
              <Smartphone className="h-3 w-3" />
              <span>Device: {deviceName}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Enhanced checkbox for login forms with device trust
interface EnhancedRememberMeProps {
  value: boolean
  onChange: (value: boolean) => void
  className?: string
}

export function EnhancedRememberMe({ value, onChange, className }: EnhancedRememberMeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className={className}>
      <div className="flex items-start space-x-3">
        <Checkbox
          id="enhanced-remember"
          checked={value}
          onCheckedChange={onChange}
          className="mt-1"
          aria-label="Keep me signed in for 30 days on this device"
        />
        <div className="space-y-1">
          <Label
            htmlFor="enhanced-remember"
            className="text-sm font-medium cursor-pointer"
          >
            Keep me signed in
          </Label>
          <p className="text-xs text-muted-foreground">
            Stay signed in for 30 days on this device.{' '}
            <button
              type="button"
              className="underline hover:text-primary"
              onClick={() => setShowTooltip(!showTooltip)}
            >
              Learn more
            </button>
          </p>
          
          {showTooltip && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-xs space-y-2">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    How device trust works:
                  </p>
                  <ul className="mt-1 space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Your device is securely identified and remembered</li>
                    <li>• You won't need to enter your password for 30 days</li>
                    <li>• You can manage trusted devices in security settings</li>
                    <li>• Sign out anytime to remove device trust</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}