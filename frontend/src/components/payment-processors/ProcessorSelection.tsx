'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { paymentProcessorsApi, ProcessorPreference, ProcessorHealth } from '@/lib/api/payment-processors'
import { useToast } from '@/components/ui/use-toast'

export default function ProcessorSelection() {
  const [preference, setPreference] = useState<ProcessorPreference | null>(null)
  const [health, setHealth] = useState<ProcessorHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [prefData, healthData] = await Promise.all([
        paymentProcessorsApi.getPreference(),
        paymentProcessorsApi.getProcessorHealth()
      ])
      setPreference(prefData)
      setHealth(healthData)
    } catch (error) {
      console.error('Failed to load processor data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load payment processor data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleProcessorSwitch = async (processor: 'stripe' | 'square') => {
    try {
      setSwitching(true)
      await paymentProcessorsApi.switchProcessor(processor)
      toast({
        title: 'Success',
        description: `Switched to ${processor === 'stripe' ? 'Stripe' : 'Square'} as primary processor`
      })
      await loadData()
    } catch (error) {
      console.error('Failed to switch processor:', error)
      toast({
        title: 'Error',
        description: 'Failed to switch payment processor',
        variant: 'destructive'
      })
    } finally {
      setSwitching(false)
    }
  }

  const handleToggleProcessor = async (processor: 'stripe' | 'square', enabled: boolean) => {
    try {
      const updates: Partial<ProcessorPreference> = {}
      if (processor === 'stripe') {
        updates.stripe_enabled = enabled
      } else {
        updates.square_enabled = enabled
      }

      await paymentProcessorsApi.updatePreference(updates)
      toast({
        title: 'Success',
        description: `${processor === 'stripe' ? 'Stripe' : 'Square'} ${enabled ? 'enabled' : 'disabled'}`
      })
      await loadData()
    } catch (error) {
      console.error('Failed to toggle processor:', error)
      toast({
        title: 'Error',
        description: 'Failed to update processor settings',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!preference || !health) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load payment processor settings
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Processor Selection</CardTitle>
          <CardDescription>
            Choose your preferred payment processor for accepting payments and receiving payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={preference.primary_processor} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe" disabled={switching}>
                <CreditCard className="h-4 w-4 mr-2" />
                Stripe
              </TabsTrigger>
              <TabsTrigger value="square" disabled={switching}>
                <Building2 className="h-4 w-4 mr-2" />
                Square
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stripe" className="space-y-4">
              <ProcessorCard
                name="Stripe"
                icon={<CreditCard className="h-8 w-8" />}
                isActive={preference.primary_processor === 'stripe'}
                isConnected={health.stripe?.connected || false}
                isEnabled={preference.stripe_enabled}
                health={health.stripe}
                onSwitch={() => handleProcessorSwitch('stripe')}
                onToggle={(enabled) => handleToggleProcessor('stripe', enabled)}
                switching={switching}
                features={[
                  'Industry standard for online payments',
                  '2.9% + $0.30 per transaction',
                  '$0.25 standard payout fee',
                  '1% instant payout fee',
                  'Next business day payouts',
                  'Automatic tax form generation (1099s)'
                ]}
              />
            </TabsContent>

            <TabsContent value="square" className="space-y-4">
              <ProcessorCard
                name="Square"
                icon={<Building2 className="h-8 w-8" />}
                isActive={preference.primary_processor === 'square'}
                isConnected={health.square?.connected || false}
                isEnabled={preference.square_enabled}
                health={health.square}
                onSwitch={() => handleProcessorSwitch('square')}
                onToggle={(enabled) => handleToggleProcessor('square', enabled)}
                switching={switching}
                features={[
                  'Popular for in-person and online payments',
                  '2.9% + $0.30 per transaction',
                  'Free standard payouts',
                  '1.5% instant payout fee',
                  'Next business day payouts',
                  'Built-in business tools and analytics'
                ]}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

interface ProcessorCardProps {
  name: string
  icon: React.ReactNode
  isActive: boolean
  isConnected: boolean
  isEnabled: boolean
  health: any
  onSwitch: () => void
  onToggle: (enabled: boolean) => void
  switching: boolean
  features: string[]
}

function ProcessorCard({
  name,
  icon,
  isActive,
  isConnected,
  isEnabled,
  health,
  onSwitch,
  onToggle,
  switching,
  features
}: ProcessorCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {icon}
          <div>
            <h3 className="text-lg font-semibold">{name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              {isConnected ? (
                <Badge variant="default" className="flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
              {isActive && (
                <Badge variant="outline" className="flex items-center">
                  Primary
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor={`${name}-enabled`} className="text-sm">
              Enabled
            </label>
            <Switch
              id={`${name}-enabled`}
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={!isConnected}
            />
          </div>

          {!isActive && isConnected && (
            <Button
              onClick={onSwitch}
              disabled={switching || !isEnabled}
              size="sm"
            >
              {switching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Make Primary
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {health && health.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{health.error}</AlertDescription>
        </Alert>
      )}

      {isConnected && health && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-sm">
            <span className="text-muted-foreground">Payments:</span>
            <span className="ml-2 font-medium">
              {health.charges_enabled || health.can_receive_payments ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Payouts:</span>
            <span className="ml-2 font-medium">
              {health.payouts_enabled || health.can_make_payouts ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Features</h4>
        <ul className="space-y-1">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start text-sm text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {!isConnected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Connect your {name} account to start accepting payments through this processor.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
