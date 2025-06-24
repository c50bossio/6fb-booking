import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Building,
  CreditCard,
  FileText,
  DollarSign,
  Download,
  MoreHorizontal,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { payoutService } from '@/lib/api/payouts';
import type { Payout, PayoutStatus, PayoutMethod, PayoutFilters } from '@/lib/api/payouts';
import { formatCurrency, formatDate } from '@/lib/utils';
import Notification from '@/components/Notification';

interface PayoutHistoryProps {
  barberId?: number;
  isShopOwner?: boolean;
}

export function PayoutHistory({ barberId, isShopOwner = false }: PayoutHistoryProps) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PayoutFilters>({
    barber_id: barberId
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  } | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchPayouts();
  }, [filters, barberId]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const response = await payoutService.getPayouts({
        ...filters,
        barber_id: barberId || filters.barber_id
      });

      if (response.data) {
        setPayouts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
      setNotification({
        type: 'error',
        title: 'Failed to load payout history',
        message: 'Please try again later or contact support if the issue persists.'
      });
    } finally {
      setLoading(false);
    }
  };

  const [downloadingReceipts, setDownloadingReceipts] = useState<Set<number>>(new Set());
  const [retryingPayouts, setRetryingPayouts] = useState<Set<number>>(new Set());

  const handleDownloadReceipt = async (payout: Payout, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (downloadingReceipts.has(payout.id)) return;

    try {
      setDownloadingReceipts(prev => new Set(prev).add(payout.id));
      
      const blob = await payoutService.downloadReceipt(payout.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payout-receipt-${payout.reference_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setNotification({
        type: 'success',
        title: 'Receipt downloaded',
        message: `Receipt for ${payout.reference_number} has been downloaded.`
      });
    } catch (error) {
      console.error('Failed to download receipt:', error);
      setNotification({
        type: 'error',
        title: 'Failed to download receipt',
        message: 'Please try again later.'
      });
    } finally {
      setDownloadingReceipts(prev => {
        const newSet = new Set(prev);
        newSet.delete(payout.id);
        return newSet;
      });
    }
  };

  const handleRetryPayout = async (payout: Payout, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (retryingPayouts.has(payout.id)) return;

    try {
      setRetryingPayouts(prev => new Set(prev).add(payout.id));
      
      const response = await payoutService.retryPayout(payout.id);
      if (response.data) {
        await fetchPayouts();
        setNotification({
          type: 'success',
          title: 'Payout retry initiated',
          message: `Payout ${payout.reference_number} is being processed again.`
        });
      }
    } catch (error) {
      console.error('Failed to retry payout:', error);
      setNotification({
        type: 'error',
        title: 'Failed to retry payout',
        message: 'Please try again later or contact support.'
      });
    } finally {
      setRetryingPayouts(prev => {
        const newSet = new Set(prev);
        newSet.delete(payout.id);
        return newSet;
      });
    }
  };

  const handleExportPayouts = () => {
    if (!payouts.length) {
      setNotification({
        type: 'warning',
        title: 'No data to export',
        message: 'There are no payouts to export.'
      });
      return;
    }

    // Create CSV content
    const headers = ['Reference', 'Date', 'Amount', 'Status', 'Method', 'Period', 'Barber'];
    const rows = payouts.map(payout => [
      payout.reference_number,
      new Date(payout.created_at).toLocaleDateString(),
      payout.amount.toFixed(2),
      payout.status,
      payout.method,
      `${payout.period_start} to ${payout.period_end}`,
      payout.barber_name
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setNotification({
      type: 'success',
      title: 'Export successful',
      message: 'Payout history has been exported to CSV.'
    });
  };

  const getStatusIcon = (status: PayoutStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getMethodIcon = (method: PayoutMethod) => {
    switch (method) {
      case 'bank_transfer':
        return <Building className="h-4 w-4" />;
      case 'stripe':
        return <CreditCard className="h-4 w-4" />;
      case 'check':
        return <FileText className="h-4 w-4" />;
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  // Pagination
  const totalPages = Math.ceil(payouts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayouts = payouts.slice(startIndex, endIndex);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payout History</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isShopOwner ? 'View all barber payouts' : 'View your past and pending payouts'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPayouts}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => setFilters({
                      ...filters,
                      status: value === 'all' ? undefined : value as PayoutStatus
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Method</Label>
                  <Select
                    value={filters.method || 'all'}
                    onValueChange={(value) => setFilters({
                      ...filters,
                      method: value === 'all' ? undefined : value as PayoutMethod
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All methods</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={filters.date_from || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        date_from: e.target.value || undefined
                      })}
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={filters.date_to || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        date_to: e.target.value || undefined
                      })}
                      placeholder="To"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ barber_id: barberId })}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Payouts Table */}
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No payouts found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                      {isShopOwner && <TableHead>Barber</TableHead>}
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPayouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="font-medium">
                          {payout.reference_number}
                        </TableCell>
                        <TableCell>
                          {new Date(payout.created_at).toLocaleDateString()}
                        </TableCell>
                        {isShopOwner && (
                          <TableCell>{payout.barber_name}</TableCell>
                        )}
                        <TableCell className="font-medium">
                          {formatCurrency(payout.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={payoutService.getStatusBadgeVariant(payout.status)}
                            className="flex items-center gap-1 w-fit"
                          >
                            {getStatusIcon(payout.status)}
                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getMethodIcon(payout.method)}
                            <span className="text-sm">
                              {payout.method.replace('_', ' ').charAt(0).toUpperCase() +
                               payout.method.replace('_', ' ').slice(1)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(payout.period_start).toLocaleDateString()} -<br />
                          {new Date(payout.period_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedPayout(payout);
                                  setShowDetails(true);
                                }}
                              >
                                <Info className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {(payout.status === 'completed' || payout.receipt_url) && (
                                <DropdownMenuItem
                                  onClick={(e) => handleDownloadReceipt(payout, e)}
                                  disabled={downloadingReceipts.has(payout.id)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  {downloadingReceipts.has(payout.id) ? 'Downloading...' : 'Download Receipt'}
                                </DropdownMenuItem>
                              )}
                              {payout.status === 'failed' && (
                                <DropdownMenuItem
                                  onClick={(e) => handleRetryPayout(payout, e)}
                                  disabled={retryingPayouts.has(payout.id)}
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${retryingPayouts.has(payout.id) ? 'animate-spin' : ''}`} />
                                  {retryingPayouts.has(payout.id) ? 'Retrying...' : 'Retry Payout'}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, payouts.length)} of {payouts.length} payouts
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payout Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
            <DialogDescription>
              {selectedPayout?.reference_number}
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              {/* Status and Timeline */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={payoutService.getStatusBadgeVariant(selectedPayout.status)}
                    className="flex items-center gap-1 w-fit mt-1"
                  >
                    {getStatusIcon(selectedPayout.status)}
                    {selectedPayout.status.charAt(0).toUpperCase() + selectedPayout.status.slice(1)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(selectedPayout.created_at)}</p>
                </div>
              </div>

              {/* Amount Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Amount Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Service Revenue</span>
                      <span>{formatCurrency(selectedPayout.breakdown.service_revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Product Revenue</span>
                      <span>{formatCurrency(selectedPayout.breakdown.product_revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Tips</span>
                      <span>{formatCurrency(selectedPayout.breakdown.tips)}</span>
                    </div>
                    {selectedPayout.breakdown.commission_rate && (
                      <div className="flex justify-between text-red-600">
                        <span className="text-sm">Commission ({selectedPayout.breakdown.commission_rate}%)</span>
                        <span>-{formatCurrency(selectedPayout.breakdown.commission_amount || 0)}</span>
                      </div>
                    )}
                    {selectedPayout.breakdown.booth_rent && (
                      <div className="flex justify-between text-red-600">
                        <span className="text-sm">Booth Rent</span>
                        <span>-{formatCurrency(selectedPayout.breakdown.booth_rent)}</span>
                      </div>
                    )}
                    {selectedPayout.breakdown.fees && (
                      <div className="flex justify-between text-red-600">
                        <span className="text-sm">Processing Fees</span>
                        <span>-{formatCurrency(selectedPayout.breakdown.fees)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Net Amount</span>
                      <span className="text-green-600">{formatCurrency(selectedPayout.breakdown.net_amount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getMethodIcon(selectedPayout.method)}
                        <span className="font-medium">
                          {selectedPayout.method.replace('_', ' ').charAt(0).toUpperCase() +
                           selectedPayout.method.replace('_', ' ').slice(1)}
                        </span>
                      </div>
                    </div>
                    {selectedPayout.bank_account_last4 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Bank Account</p>
                        <p className="font-medium">****{selectedPayout.bank_account_last4}</p>
                      </div>
                    )}
                    {selectedPayout.stripe_transfer_id && (
                      <div>
                        <p className="text-sm text-muted-foreground">Stripe Transfer ID</p>
                        <p className="font-mono text-sm">{selectedPayout.stripe_transfer_id}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Error Message (if failed) */}
              {selectedPayout.status === 'failed' && selectedPayout.error_message && (
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
                      <p className="text-sm text-red-700 dark:text-red-300">{selectedPayout.error_message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedPayout?.status === 'failed' && (
              <Button
                variant="default"
                disabled={retryingPayouts.has(selectedPayout.id)}
                onClick={(e) => {
                  handleRetryPayout(selectedPayout, e);
                  setShowDetails(false);
                }}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${retryingPayouts.has(selectedPayout.id) ? 'animate-spin' : ''}`} />
                {retryingPayouts.has(selectedPayout.id) ? 'Retrying...' : 'Retry Payout'}
              </Button>
            )}
            {(selectedPayout?.status === 'completed' || selectedPayout?.receipt_url) && (
              <Button
                variant="outline"
                disabled={selectedPayout ? downloadingReceipts.has(selectedPayout.id) : false}
                onClick={(e) => {
                  if (selectedPayout) {
                    handleDownloadReceipt(selectedPayout, e);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                {selectedPayout && downloadingReceipts.has(selectedPayout.id) ? 'Downloading...' : 'Download Receipt'}
              </Button>
            )}
            <Button 
              variant="ghost" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDetails(false);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}
