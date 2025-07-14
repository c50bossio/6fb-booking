'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Download,
  Filter,
  Eye,
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { fetchAPI } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { SkeletonTable } from '@/components/ui/skeleton-loader'

interface PayoutCandidate {
  barber_id: number
  barber_name: string
  barber_email: string
  service_amount: number
  retail_amount: number
  total_amount: number
  service_payments_count: number
  retail_items_count: number
  stripe_account_id?: string
  account_status: 'active' | 'pending' | 'restricted' | 'inactive'
  minimum_payout_met: boolean
  last_payout_date?: string
}

interface PayoutPreview {
  barber_id: number
  service_amount: number
  retail_amount: number
  total_amount: number
  estimated_fees: number
  net_amount: number
  items_included: {
    service_payments: number
    order_items: number
    pos_transactions: number
  }
}

interface ProcessPayoutRequest {
  barber_ids: number[]
  include_retail: boolean
  period_start: string
  period_end: string
  notes?: string
}

export default function PayoutProcessPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [selectedBarberId, setSelectedBarberId] = useState<string>('')
  const [includeRetail, setIncludeRetail] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedBarbers, setSelectedBarbers] = useState<Set<number>>(new Set())
  const [showPreview, setShowPreview] = useState(false)
  const [processingNotes, setProcessingNotes] = useState('')

  // Fetch payout candidates
  const { data: payoutCandidates, isLoading: loadingCandidates, refetch } = useQuery<PayoutCandidate[]>({
    queryKey: ['payout-candidates', selectedBarberId, dateRange, includeRetail],
    queryFn: () => fetchAPI(`/api/v1/commissions/preview/payout?${new URLSearchParams({
      ...(selectedBarberId && { barber_id: selectedBarberId }),
      start_date: dateRange.start,
      end_date: dateRange.end,
      include_retail: includeRetail.toString()
    })}`)
  })

  // Fetch preview for selected barbers
  const { data: payoutPreview, isLoading: loadingPreview } = useQuery<PayoutPreview[]>({
    queryKey: ['payout-preview', Array.from(selectedBarbers), dateRange, includeRetail],
    queryFn: () => {
      if (selectedBarbers.size === 0) return []
      return fetchAPI('/api/v1/commissions/preview/batch', {
        method: 'POST',
        body: JSON.stringify({
          barber_ids: Array.from(selectedBarbers),
          period_start: dateRange.start,
          period_end: dateRange.end,
          include_retail: includeRetail
        })
      })
    },
    enabled: selectedBarbers.size > 0
  })

  // Process payout mutation
  const processPayoutMutation = useMutation({
    mutationFn: (request: ProcessPayoutRequest) => 
      fetchAPI('/api/v1/payouts/process', {
        method: 'POST',
        body: JSON.stringify(request)
      }),
    onSuccess: (result) => {
      toast({
        title: "Payouts Processed",
        description: `Successfully processed ${result.processed_count} payouts totaling ${formatCurrency(result.total_amount)}`
      })
      setSelectedBarbers(new Set())
      setShowPreview(false)
      queryClient.invalidateQueries({ queryKey: ['payout-candidates'] })
      queryClient.invalidateQueries({ queryKey: ['payouts'] })
    },
    onError: (error: any) => {
      toast({
        title: "Payout Processing Failed",
        description: error.message || "Failed to process payouts",
        variant: "destructive"
      })
    }
  })

  // Handle barber selection
  const handleBarberSelection = (barberId: number, checked: boolean) => {
    const newSelection = new Set(selectedBarbers)
    if (checked) {
      newSelection.add(barberId)
    } else {
      newSelection.delete(barberId)
    }
    setSelectedBarbers(newSelection)
  }

  // Select all eligible barbers
  const handleSelectAll = () => {
    if (!payoutCandidates) return
    const eligibleBarberIds = payoutCandidates
      .filter(candidate => candidate.minimum_payout_met && candidate.account_status === 'active')
      .map(candidate => candidate.barber_id)
    setSelectedBarbers(new Set(eligibleBarberIds))
  }

  // Clear all selections
  const handleClearAll = () => {
    setSelectedBarbers(new Set())
  }

  // Process selected payouts
  const handleProcessPayouts = () => {
    if (selectedBarbers.size === 0) return
    
    processPayoutMutation.mutate({
      barber_ids: Array.from(selectedBarbers),
      include_retail: includeRetail,
      period_start: dateRange.start,
      period_end: dateRange.end,
      notes: processingNotes
    })
  }

  // Calculate totals for selected barbers
  const selectedTotals = React.useMemo(() => {
    if (!payoutCandidates) return { service: 0, retail: 0, total: 0, count: 0 }
    
    const selected = payoutCandidates.filter(candidate => 
      selectedBarbers.has(candidate.barber_id)
    )
    
    return {
      service: selected.reduce((sum, candidate) => sum + candidate.service_amount, 0),
      retail: selected.reduce((sum, candidate) => sum + candidate.retail_amount, 0),
      total: selected.reduce((sum, candidate) => sum + candidate.total_amount, 0),
      count: selected.length
    }
  }, [payoutCandidates, selectedBarbers])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Process Payouts</h1>
            <p className="text-muted-foreground">
              Review and process commission payouts for barbers
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            onClick={() => refetch()}
            disabled={loadingCandidates}
          >
            {loadingCandidates ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout Filters</CardTitle>
          <CardDescription>
            Configure the payout period and options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="barber-filter">Filter by Barber</Label>
              <Select value={selectedBarberId} onValueChange={setSelectedBarberId} defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="All barbers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All barbers</SelectItem>
                  {payoutCandidates?.map(candidate => (
                    <SelectItem key={candidate.barber_id} value={candidate.barber_id.toString()}>
                      {candidate.barber_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="include-retail"
                checked={includeRetail}
                onCheckedChange={(checked) => setIncludeRetail(checked === true)}
              />
              <Label htmlFor="include-retail" className="text-sm">
                Include retail commissions
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Summary */}
      {selectedBarbers.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-primary" />
              Selected for Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Barbers Selected</p>
                <p className="text-2xl font-bold">{selectedTotals.count}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(selectedTotals.service)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retail Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(selectedTotals.retail)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(selectedTotals.total)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleClearAll}>
                  Clear All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPreview(true)}
                  disabled={loadingPreview}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
              <Button 
                onClick={handleProcessPayouts}
                disabled={processPayoutMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {processPayoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Process {selectedTotals.count} Payouts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Candidates Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Payout Candidates</CardTitle>
              <CardDescription>
                Barbers eligible for payout in the selected period
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All Eligible
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCandidates ? (
            <SkeletonTable rows={5} columns={8} />
          ) : !payoutCandidates || payoutCandidates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payout candidates found for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Barber</TableHead>
                  <TableHead>Service Amount</TableHead>
                  <TableHead>Retail Amount</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Eligible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutCandidates.map((candidate) => (
                  <TableRow key={candidate.barber_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedBarbers.has(candidate.barber_id)}
                        onCheckedChange={(checked) => 
                          handleBarberSelection(candidate.barber_id, checked === true)
                        }
                        disabled={!candidate.minimum_payout_met || candidate.account_status !== 'active'}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{candidate.barber_name}</p>
                        <p className="text-sm text-muted-foreground">{candidate.barber_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(candidate.service_amount)}</TableCell>
                    <TableCell>{formatCurrency(candidate.retail_amount)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(candidate.total_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{candidate.service_payments_count} payments</div>
                        <div>{candidate.retail_items_count} retail items</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        candidate.account_status === 'active' ? 'default' :
                        candidate.account_status === 'pending' ? 'secondary' :
                        'destructive'
                      }>
                        {candidate.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {candidate.minimum_payout_met && candidate.account_status === 'active' ? (
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Eligible
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Not Eligible
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payout Preview</DialogTitle>
            <DialogDescription>
              Review the details before processing payouts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : payoutPreview && payoutPreview.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barber</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Retail</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Est. Fees</TableHead>
                    <TableHead>Net Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutPreview.map((preview) => {
                    const candidate = payoutCandidates?.find(c => c.barber_id === preview.barber_id)
                    return (
                      <TableRow key={preview.barber_id}>
                        <TableCell>{candidate?.barber_name}</TableCell>
                        <TableCell>{formatCurrency(preview.service_amount)}</TableCell>
                        <TableCell>{formatCurrency(preview.retail_amount)}</TableCell>
                        <TableCell>{formatCurrency(preview.total_amount)}</TableCell>
                        <TableCell>{formatCurrency(preview.estimated_fees)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(preview.net_amount)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No preview data available
              </p>
            )}
            
            <div>
              <Label htmlFor="processing-notes">Processing Notes (Optional)</Label>
              <Input
                id="processing-notes"
                placeholder="Add notes about this payout batch..."
                value={processingNotes}
                onChange={(e) => setProcessingNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProcessPayouts}
              disabled={processPayoutMutation.isPending}
            >
              {processPayoutMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Confirm & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}