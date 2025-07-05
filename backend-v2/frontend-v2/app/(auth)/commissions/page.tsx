'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { 
  Loader2, DollarSign, TrendingUp, Users, 
  Calendar, Download, Filter, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { fetchAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { formatters } from '@/lib/formatters'

interface CommissionData {
  barber_id: number
  barber_name: string
  period_start: string
  period_end: string
  service_commission: number
  retail_commission: number
  total_commission: number
  items_count: number
  paid_amount: number
  pending_amount: number
}

interface PayoutData {
  id: number
  barber_name: string
  amount: number
  service_amount: number
  retail_amount: number
  status: string
  period_start: string
  period_end: string
  processed_at: string | null
  stripe_transfer_id: string | null
}

export default function CommissionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [selectedBarber, setSelectedBarber] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  
  // Fetch commission data
  const { data: commissionData, isLoading: loadingCommissions } = useQuery<CommissionData[]>({
    queryKey: ['commissions', selectedBarber, dateRange],
    queryFn: () => fetchAPI(`/api/v1/commissions?${new URLSearchParams({
      ...(selectedBarber && { barber_id: selectedBarber }),
      start_date: dateRange.start,
      end_date: dateRange.end
    })}`)
  })
  
  // Fetch payout history
  const { data: payoutHistory, isLoading: loadingPayouts } = useQuery<PayoutData[]>({
    queryKey: ['payouts', selectedBarber, dateRange],
    queryFn: () => fetchAPI(`/api/v1/payouts?${new URLSearchParams({
      ...(selectedBarber && { barber_id: selectedBarber }),
      start_date: dateRange.start,
      end_date: dateRange.end
    })}`)
  })
  
  // Fetch barbers list
  const { data: barbers } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => fetchAPI('/api/v1/users?role=barber')
  })
  
  // Calculate totals
  const totals = React.useMemo(() => {
    if (!commissionData) return {
      totalCommission: 0,
      totalService: 0,
      totalRetail: 0,
      totalPending: 0,
      totalPaid: 0
    }
    
    return commissionData.reduce((acc, commission) => ({
      totalCommission: acc.totalCommission + commission.total_commission,
      totalService: acc.totalService + commission.service_commission,
      totalRetail: acc.totalRetail + commission.retail_commission,
      totalPending: acc.totalPending + commission.pending_amount,
      totalPaid: acc.totalPaid + commission.paid_amount
    }), {
      totalCommission: 0,
      totalService: 0,
      totalRetail: 0,
      totalPending: 0,
      totalPaid: 0
    })
  }, [commissionData])
  
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetchAPI(`/api/v1/commissions/export?${new URLSearchParams({
        format,
        ...(selectedBarber && { barber_id: selectedBarber }),
        start_date: dateRange.start,
        end_date: dateRange.end
      })}`)
      
      // Handle file download
      const blob = new Blob([response], { 
        type: format === 'csv' ? 'text/csv' : 'application/pdf' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `commissions-${dateRange.start}-to-${dateRange.end}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Export Successful',
        description: `Commission report exported as ${format.toUpperCase()}`
      })
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export commission report',
        variant: 'destructive'
      })
    }
  }
  
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'outline',
      completed: 'default',
      failed: 'destructive'
    } as const
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>
  }
  
  if (loadingCommissions || loadingPayouts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Commissions & Payouts</h1>
          <p className="text-muted-foreground mt-2">
            Track barber commissions and manage payouts
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select
              value={selectedBarber}
              onChange={(e) => setSelectedBarber(e.target.value)}
              className="w-[200px]"
            >
              <option value="">All Barbers</option>
              {barbers?.map((barber: any) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </Select>
            
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-[180px]"
            />
            
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-[180px]"
            />
            
            <Button
              onClick={() => router.push('/payouts/process')}
              className="ml-auto"
            >
              Process Payouts
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalCommission)}</div>
            <p className="text-xs text-muted-foreground mt-1">This period</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Service Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.totalService)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Retail Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.totalRetail)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">From product sales</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(totals.totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">To be paid</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Already paid</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Commission Details */}
      <Tabs defaultValue="commissions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="commissions">Commission Details</TabsTrigger>
          <TabsTrigger value="payouts">Payout History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Commission Breakdown</CardTitle>
              <CardDescription>
                Detailed commission information by barber
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commissionData && commissionData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Barber
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Retail
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pending
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {commissionData.map((commission) => (
                        <tr key={commission.barber_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {commission.barber_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatCurrency(commission.service_commission)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatCurrency(commission.retail_commission)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(commission.total_commission)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {commission.items_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                            {formatCurrency(commission.pending_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              onClick={() => router.push(`/commissions/${commission.barber_id}`)}
                              variant="outline"
                              size="sm"
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No commission data found for the selected period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>
                Recent payout transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payoutHistory && payoutHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Barber
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Retail
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transfer ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {payoutHistory.map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatters.date(payout.processed_at || payout.period_end)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {payout.barber_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatCurrency(payout.service_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatCurrency(payout.retail_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(payout.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(payout.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payout.stripe_transfer_id ? (
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {payout.stripe_transfer_id.slice(0, 12)}...
                              </code>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No payout history found for the selected period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}