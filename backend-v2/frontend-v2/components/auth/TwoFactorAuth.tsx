'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Smartphone,
  Mail,
  Shield,
  Key,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  QrCode
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface TwoFactorAuthProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (code: string, method?: string) => Promise<void>
  method?: 'sms' | 'email' | 'totp' | 'backup'
  phoneNumber?: string
  email?: string
  onResend?: () => Promise<void>
  cooldownSeconds?: number
}

export function TwoFactorAuth({
  isOpen,
  onClose,
  onVerify,
  method = 'sms',
  phoneNumber,
  email,
  onResend,
  cooldownSeconds = 60
}: TwoFactorAuthProps) {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { toast } = useToast()

  // Focus first input when dialog opens
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [isOpen])

  // Handle cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const newCode = [...code]
    newCode[index] = value.slice(-1) // Only keep last digit

    setCode(newCode)
    setError(null)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits entered
    if (newCode.every(digit => digit) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6)
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6)
      setCode(newCode)
      if (pastedData.length === 6) {
        handleVerify(pastedData)
      }
    }
  }

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('')
    
    if (codeToVerify.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      await onVerify(codeToVerify, method)
      toast({
        title: 'Verification successful',
        description: 'You have been successfully authenticated.'
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!onResend || resendCooldown > 0) return

    try {
      await onResend()
      setResendCooldown(cooldownSeconds)
      toast({
        title: 'Code resent',
        description: `A new verification code has been sent to your ${method === 'sms' ? 'phone' : 'email'}.`
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to resend code',
        description: 'Please try again later.'
      })
    }
  }

  const getMaskedContact = () => {
    if (method === 'sms' && phoneNumber) {
      return phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }
    if (method === 'email' && email) {
      const [name, domain] = email.split('@')
      return `${name.slice(0, 2)}****@${domain}`
    }
    return ''
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
              <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </div>
          <DialogDescription>
            Enter the 6-digit code sent to {getMaskedContact()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Code Input */}
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleCodeChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={cn(
                  "w-12 h-12 text-center text-lg font-semibold",
                  error && "border-destructive"
                )}
                disabled={isVerifying}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Resend Option */}
          {onResend && (
            <div className="text-center">
              <Button
                variant="link"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-sm"
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Didn't receive a code? Resend"}
              </Button>
            </div>
          )}

          {/* Method Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {method === 'sms' && <Smartphone className="h-4 w-4" />}
            {method === 'email' && <Mail className="h-4 w-4" />}
            {method === 'totp' && <Key className="h-4 w-4" />}
            <span>
              {method === 'sms' && 'SMS verification'}
              {method === 'email' && 'Email verification'}
              {method === 'totp' && 'Authenticator app'}
            </span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isVerifying}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleVerify()}
            disabled={isVerifying || code.join('').length !== 6}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Setup component for enabling 2FA
interface TwoFactorSetupProps {
  onSetup: (method: string, data?: any) => Promise<void>
  onCancel: () => void
  availableMethods?: string[]
}

export function TwoFactorSetup({
  onSetup,
  onCancel,
  availableMethods = ['sms', 'email', 'totp']
}: TwoFactorSetupProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>(availableMethods[0])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleSetup = async () => {
    setIsSettingUp(true)
    try {
      const data: any = {}
      if (selectedMethod === 'sms') {
        data.phoneNumber = phoneNumber
      }
      
      await onSetup(selectedMethod, data)
      
      // For TOTP, we'd typically receive QR code and secret
      if (selectedMethod === 'totp') {
        // Mock data - in real app, this would come from the API
        setQrCode('data:image/png;base64,...') // QR code image
        setSecret('JBSWY3DPEHPK3PXP') // Secret key
      } else {
        toast({
          title: '2FA enabled',
          description: `Two-factor authentication via ${selectedMethod} has been enabled.`
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Setup failed',
        description: 'Failed to enable two-factor authentication.'
      })
    } finally {
      setIsSettingUp(false)
    }
  }

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Enable Two-Factor Authentication</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add an extra layer of security to your account
        </p>
      </div>

      <Tabs value={selectedMethod} onValueChange={setSelectedMethod}>
        <TabsList className="grid w-full grid-cols-3">
          {availableMethods.includes('sms') && (
            <TabsTrigger value="sms">
              <Smartphone className="h-4 w-4 mr-2" />
              SMS
            </TabsTrigger>
          )}
          {availableMethods.includes('email') && (
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
          )}
          {availableMethods.includes('totp') && (
            <TabsTrigger value="totp">
              <Key className="h-4 w-4 mr-2" />
              App
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="sms" className="space-y-4">
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              We'll send a verification code to your phone via SMS when you sign in.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
            />
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              We'll send a verification code to your email address when you sign in.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="totp" className="space-y-4">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              Use an authenticator app like Google Authenticator or Authy to generate codes.
            </AlertDescription>
          </Alert>
          
          {qrCode && secret ? (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QrCode className="h-48 w-48" />
              </div>
              <div className="space-y-2">
                <Label>Manual Entry Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSetup}
          disabled={isSettingUp || (selectedMethod === 'sms' && !phoneNumber)}
        >
          {isSettingUp ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            'Enable 2FA'
          )}
        </Button>
      </div>
    </div>
  )
}