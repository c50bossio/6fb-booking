/**
 * Collection History Component
 * Displays history of commission and rent collections with detailed transaction records
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Download,
  Search,
  Filter,
  RefreshCw,
  Eye,
  TrendingUp
} from 'lucide-react';

interface CollectionRecord {
  id: number;
  collection_type: 'commission' | 'booth_rent' | 'penalty' | 'refund';
  amount: number;
  status: 'pending' | 'collected' | 'failed' | 'cancelled';
  scheduled_date: string;
  collected_date?: string;
  description: string;
  related_transactions: number[];
  collection_method: 'ach' | 'card' | 'manual';
  failure_reason?: string;
  retry_count: number;
  metadata: any;
}

interface CollectionSummary {
  total_collections: number;
  total_amount: number;
  success_rate: number;
  pending_amount: number;
  failed_amount: number;
  last_30_days: {
    collections: number;
    amount: number;
    success_rate: number;
  };
}

export const CollectionHistory: React.FC = () => {
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('30_days');

  useEffect(() => {
    loadCollectionHistory();
  }, [statusFilter, typeFilter, dateRange]);

  const loadCollectionHistory = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        status: statusFilter === 'all' ? '' : statusFilter,
        type: typeFilter === 'all' ? '' : typeFilter,
        period: dateRange
      });

      const response = await fetch(`/api/v2/external-payments/collections?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error('Failed to load collection history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryCollection = async (collectionId: number) => {
    try {
      const response = await fetch(`/api/v2/external-payments/collections/${collectionId}/retry`, {
        method: 'POST'
      });

      if (response.ok) {
        // Reload collections to show updated status
        await loadCollectionHistory();
      }
    } catch (error) {
      console.error('Failed to retry collection:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'collected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      collected: 'default',
      failed: 'destructive',
      pending: 'secondary',
      cancelled: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      commission: 'Commission',
      booth_rent: 'Booth Rent',
      penalty: 'Penalty',
      refund: 'Refund'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const filteredCollections = collections.filter(collection => {
    const matchesSearch = collection.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         collection.id.toString().includes(searchTerm);
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <div>Loading collection history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Collection History</h3>
          <p className="text-muted-foreground mt-1">
            Track commission and rent collection records
          </p>
        </div>
        
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Collections</p>
                  <p className="text-2xl font-bold">{summary.total_collections}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_amount)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{summary.success_rate.toFixed(1)}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.pending_amount)}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="booth_rent">Booth Rent</SelectItem>
                  <SelectItem value="penalty">Penalty</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7_days">Last 7 days</SelectItem>
                  <SelectItem value="30_days">Last 30 days</SelectItem>
                  <SelectItem value="90_days">Last 3 months</SelectItem>
                  <SelectItem value="1_year">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collections List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Collection Records</CardTitle>
            <Button variant="outline" size="sm" onClick={loadCollectionHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCollections.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No Collections Found</h3>
              <p className="text-sm text-muted-foreground">
                {collections.length === 0 
                  ? "No collection records available"
                  : "No collections match your current filters"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCollections.map((collection) => (
                <Card key={collection.id} className="border">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(collection.status)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              Collection #{collection.id}
                            </span>
                            {getStatusBadge(collection.status)}
                            <Badge variant="outline" className="capitalize">
                              {getTypeLabel(collection.collection_type)}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {collection.description}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatCurrency(collection.amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {collection.status === 'collected' && collection.collected_date
                            ? `Collected ${formatDate(collection.collected_date)}`
                            : `Scheduled ${formatDate(collection.scheduled_date)}`
                          }
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Method:</span>
                          <span className="ml-2 capitalize">{collection.collection_method}</span>
                        </div>
                        <div>
                          <span className="font-medium">Transactions:</span>
                          <span className="ml-2">{collection.related_transactions.length} linked</span>
                        </div>
                        {collection.retry_count > 0 && (
                          <div>
                            <span className="font-medium">Retries:</span>
                            <span className="ml-2">{collection.retry_count}</span>
                          </div>
                        )}
                      </div>

                      {/* Failure Reason */}
                      {collection.status === 'failed' && collection.failure_reason && (
                        <Alert className="mt-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Failure Reason:</strong> {collection.failure_reason}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-4">
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Eye className="h-3 w-3" />
                          View Details
                        </Button>

                        {collection.status === 'failed' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleRetryCollection(collection.id)}
                            className="flex items-center gap-2"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry Collection
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Performance */}
      {summary && summary.last_30_days.collections > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Performance (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{summary.last_30_days.collections}</div>
                <div className="text-sm text-muted-foreground">Collections</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(summary.last_30_days.amount)}</div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {summary.last_30_days.success_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};