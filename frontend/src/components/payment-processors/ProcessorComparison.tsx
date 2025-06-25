'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Building2,
  ArrowRight,
  Loader2,
  Info
} from 'lucide-react'
import { paymentProcessorsApi, ProcessorComparison } from '@/lib/api/payment-processors'
import { formatCurrency } from '@/lib/utils'

export default function ProcessorComparisonDashboard() {
  const [comparison, setComparison] = useState<ProcessorComparison | null>(null)
  const [timeframe, setTimeframe] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadComparison()
  }, [timeframe])

  const loadComparison = async () => {
    try {
      setLoading(true)
      const data = await paymentProcessorsApi.compareProcessors(timeframe)
      setComparison(data)
    } catch (error) {
      console.error('Failed to load comparison:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!comparison) {
    return (
      <Alert className="m-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          No comparison data available. Start processing payments to see comparisons.
        </AlertDescription>
      </Alert>
    )
  }

  const totalVolume = comparison.stripe.volume + comparison.square.volume
  const stripePercentage = totalVolume > 0 ? (comparison.stripe.volume / totalVolume) * 100 : 0
  const squarePercentage = totalVolume > 0 ? (comparison.square.volume / totalVolume) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Processor Comparison</h2>
          <p className="text-muted-foreground">
            Compare performance and fees between payment processors
          </p>
        </div>
        <Select value={timeframe.toString()} onValueChange={(value) => setTimeframe(parseInt(value))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recommendation Card */}
      {comparison.recommendation && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recommendation</span>
              <Badge variant="default">
                {comparison.recommendation.recommended === 'stripe' ? 'Stripe' : 'Square'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{comparison.recommendation.reason}</p>
            {comparison.recommendation.potential_savings > 0 && (
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium">Potential Monthly Savings</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(comparison.recommendation.potential_savings)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Volume Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Volume Distribution</CardTitle>
          <CardDescription>
            Processing volume split between processors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">Stripe</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(comparison.stripe.volume)} ({stripePercentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={stripePercentage} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">Square</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(comparison.square.volume)} ({squarePercentage.toFixed(1)}%)
                </span>
              </div>
              <Progress value={squarePercentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-side comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stripe Card */}
        <ProcessorCard
          name="Stripe"
          icon={<CreditCard className="h-5 w-5" />}
          data={comparison.stripe}
          isRecommended={comparison.recommendation.recommended === 'stripe'}
        />

        {/* Square Card */}
        <ProcessorCard
          name="Square"
          icon={<Building2 className="h-5 w-5" />}
          data={comparison.square}
          isRecommended={comparison.recommendation.recommended === 'square'}
        />
      </div>

      {/* Fee Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Analysis</CardTitle>
          <CardDescription>
            Effective fee rates based on your transaction patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FeeComparisonRow
              label="Payment Processing"
              stripeValue={comparison.stripe.fees?.payment_fee || 0}
              squareValue={comparison.square.fees?.payment_fee || 0}
            />
            <FeeComparisonRow
              label="Payout Fees"
              stripeValue={comparison.stripe.fees?.payout_fee || 0}
              squareValue={comparison.square.fees?.payout_fee || 0}
            />
            <FeeComparisonRow
              label="Total Fees"
              stripeValue={comparison.stripe.fees?.total_fee || 0}
              squareValue={comparison.square.fees?.total_fee || 0}
              highlight
            />
            <div className="pt-4 border-t">
              <FeeComparisonRow
                label="Effective Rate"
                stripeValue={comparison.stripe.effective_rate}
                squareValue={comparison.square.effective_rate}
                isPercentage
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ProcessorCardProps {
  name: string
  icon: React.ReactNode
  data: {
    transactions: number
    volume: number
    avg_transaction: number
    fees: any
    effective_rate: number
  }
  isRecommended: boolean
}

function ProcessorCard({ name, icon, data, isRecommended }: ProcessorCardProps) {
  return (
    <Card className={isRecommended ? 'border-primary' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <span>{name}</span>
          </div>
          {isRecommended && (
            <Badge variant="default" className="ml-2">
              Recommended
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold">{data.transactions}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Volume</p>
            <p className="text-2xl font-bold">{formatCurrency(data.volume)}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Average Transaction</p>
          <p className="text-lg font-semibold">{formatCurrency(data.avg_transaction)}</p>
        </div>
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Effective Fee Rate</span>
            <span className="text-lg font-semibold">{data.effective_rate}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface FeeComparisonRowProps {
  label: string
  stripeValue: number
  squareValue: number
  isPercentage?: boolean
  highlight?: boolean
}

function FeeComparisonRow({
  label,
  stripeValue,
  squareValue,
  isPercentage = false,
  highlight = false
}: FeeComparisonRowProps) {
  const stripeLower = stripeValue < squareValue
  const squareLower = squareValue < stripeValue

  const formatValue = (value: number) => {
    if (isPercentage) return `${value}%`
    return formatCurrency(value)
  }

  return (
    <div className={`flex items-center justify-between ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-sm">{label}</span>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <CreditCard className="h-3 w-3" />
          <span className={`text-sm ${stripeLower ? 'text-green-600' : ''}`}>
            {formatValue(stripeValue)}
          </span>
          {stripeLower && <TrendingDown className="h-3 w-3 text-green-600" />}
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <div className="flex items-center space-x-1">
          <Building2 className="h-3 w-3" />
          <span className={`text-sm ${squareLower ? 'text-green-600' : ''}`}>
            {formatValue(squareValue)}
          </span>
          {squareLower && <TrendingDown className="h-3 w-3 text-green-600" />}
        </div>
      </div>
    </div>
  )
}
