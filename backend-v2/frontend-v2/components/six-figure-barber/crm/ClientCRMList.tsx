"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Filter,
  Users,
  TrendingUp,
  AlertTriangle,
  Crown,
  Star,
  Eye,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  Download,
  MoreVertical,
  SortAsc,
  SortDesc
} from 'lucide-react';

// Types
interface ClientScore {
  client_id: number;
  relationship_score: number;
  engagement_score: number;
  value_score: number;
  consistency_score: number;
  growth_potential: number;
  overall_score: number;
  score_updated_at: string;
}

interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  customer_type: string;
  total_visits: number;
  total_spent: number;
  average_ticket: number;
  visit_frequency_days: number | null;
  last_visit_date: string | null;
  created_at: string;
  // CRM data
  score?: ClientScore;
  tier?: string;
  stage?: string;
  churn_risk?: number;
}

interface Props {
  onClientSelect?: (clientId: number) => void;
}

const ClientCRMList: React.FC<Props> = ({ onClientSelect }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientScores, setClientScores] = useState<Record<number, ClientScore>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('overall_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadClients();
  }, [currentPage, searchTerm, tierFilter, stageFilter, riskFilter, sortBy, sortOrder]);

  const loadClients = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Load clients with pagination
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        search: searchTerm,
        ...(tierFilter !== 'all' && { tier: tierFilter }),
        ...(stageFilter !== 'all' && { stage: stageFilter }),
        ...(riskFilter !== 'all' && { risk_level: riskFilter }),
        sort_by: sortBy,
        sort_order: sortOrder
      });

      const clientsResponse = await fetch(`/api/v2/clients?${params}`, { headers });

      if (!clientsResponse.ok) {
        throw new Error('Failed to load clients');
      }

      const clientsData = await clientsResponse.json();
      setClients(clientsData.clients || []);
      setTotalPages(Math.ceil((clientsData.total || 0) / pageSize));

      // Load scores for visible clients
      if (clientsData.clients && clientsData.clients.length > 0) {
        const clientIds = clientsData.clients.map((c: Client) => c.id);
        await loadClientScores(clientIds);
      }

    } catch (err) {
      console.error('Error loading clients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadClientScores = async (clientIds: number[]) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const scoresResponse = await fetch(
        `/api/v2/six-figure-barber/crm/clients/scores/batch?${clientIds.map(id => `client_ids=${id}`).join('&')}`,
        { headers }
      );

      if (scoresResponse.ok) {
        const scoresData = await scoresResponse.json();
        const scoresMap: Record<number, ClientScore> = {};
        
        scoresData.scores?.forEach((score: ClientScore) => {
          scoresMap[score.client_id] = score;
        });
        
        setClientScores(scoresMap);
      }
    } catch (err) {
      console.error('Error loading client scores:', err);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getTierColor = (tier: string) => {
    const colors = {
      premium_vip: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      core_regular: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      developing: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
      occasional: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
      at_risk: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const getTierIcon = (tier: string) => {
    const icons = {
      premium_vip: Crown,
      core_regular: Star,
      developing: TrendingUp,
      occasional: Users,
      at_risk: AlertTriangle,
    };
    const Icon = icons[tier as keyof typeof icons] || Users;
    return <Icon className="w-4 h-4" />;
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 80) return 'text-red-600 bg-red-50';
    if (riskScore >= 60) return 'text-orange-600 bg-orange-50';
    if (riskScore >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client CRM Management</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive client relationship tracking and analytics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            Add Client
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Tier Filter */}
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="premium_vip">Premium VIP</SelectItem>
                <SelectItem value="core_regular">Core Regular</SelectItem>
                <SelectItem value="developing">Developing</SelectItem>
                <SelectItem value="occasional">Occasional</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
              </SelectContent>
            </Select>

            {/* Stage Filter */}
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="first_time_client">First Time</SelectItem>
                <SelectItem value="converting_client">Converting</SelectItem>
                <SelectItem value="regular_client">Regular</SelectItem>
                <SelectItem value="loyal_client">Loyal</SelectItem>
                <SelectItem value="vip_client">VIP</SelectItem>
                <SelectItem value="at_risk_client">At Risk</SelectItem>
              </SelectContent>
            </Select>

            {/* Risk Filter */}
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Risk Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="critical">Critical Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Clients ({clients.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">
                    <button 
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Client
                      {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    <button 
                      onClick={() => handleSort('overall_score')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      CRM Score
                      {getSortIcon('overall_score')}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">Tier</th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    <button 
                      onClick={() => handleSort('total_spent')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Value
                      {getSortIcon('total_spent')}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">
                    <button 
                      onClick={() => handleSort('total_visits')}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Visits
                      {getSortIcon('total_visits')}
                    </button>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600">Risk</th>
                  <th className="text-left p-4 font-medium text-gray-600">Last Visit</th>
                  <th className="text-right p-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const score = clientScores[client.id];
                  return (
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                            {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{client.email}</div>
                            {client.phone && (
                              <div className="text-sm text-gray-500">{client.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        {score ? (
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-bold text-gray-900">
                              {score.overall_score.toFixed(1)}
                            </div>
                            <div className="w-20">
                              <Progress value={score.overall_score} className="h-2" />
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Loading...</div>
                        )}
                      </td>
                      
                      <td className="p-4">
                        {client.tier ? (
                          <Badge className={`${getTierColor(client.tier)} text-xs`}>
                            <span className="flex items-center gap-1">
                              {getTierIcon(client.tier)}
                              {client.tier.replace('_', ' ')}
                            </span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {client.customer_type}
                          </Badge>
                        )}
                      </td>
                      
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="font-medium">{formatCurrency(client.total_spent)}</div>
                          <div className="text-gray-500">
                            Avg: {formatCurrency(client.average_ticket)}
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="font-medium">{client.total_visits}</div>
                          {client.visit_frequency_days && (
                            <div className="text-gray-500">
                              Every {client.visit_frequency_days}d
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        {score?.relationship_score !== undefined ? (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getRiskColor(100 - score.relationship_score)}`}
                          >
                            {score.relationship_score >= 80 ? 'Low' :
                             score.relationship_score >= 60 ? 'Medium' :
                             score.relationship_score >= 40 ? 'High' : 'Critical'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Unknown
                          </Badge>
                        )}
                      </td>
                      
                      <td className="p-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(client.last_visit_date)}
                        </div>
                      </td>
                      
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onClientSelect?.(client.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-900">{clients.length}</div>
            <div className="text-sm text-blue-600">Total Clients</div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-900">
              {clients.filter(c => {
                const score = clientScores[c.id];
                return score && score.relationship_score >= 80;
              }).length}
            </div>
            <div className="text-sm text-green-600">Low Risk</div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-900">
              {clients.filter(c => c.tier === 'premium_vip' || c.tier === 'core_regular').length}
            </div>
            <div className="text-sm text-purple-600">High Value</div>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-900">
              {clients.filter(c => {
                const score = clientScores[c.id];
                return score && score.relationship_score < 40;
              }).length}
            </div>
            <div className="text-sm text-orange-600">Need Attention</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientCRMList;