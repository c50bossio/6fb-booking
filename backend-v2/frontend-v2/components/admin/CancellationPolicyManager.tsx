'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Users,
  Calendar
} from 'lucide-react';

interface CancellationPolicy {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  service_id?: number;
  location_id?: number;
  immediate_cancellation_hours: number;
  short_notice_hours: number;
  advance_notice_hours: number;
  immediate_refund_percentage: number;
  short_notice_refund_percentage: number;
  advance_refund_percentage: number;
  immediate_cancellation_fee: number;
  short_notice_cancellation_fee: number;
  advance_cancellation_fee: number;
  no_show_fee: number;
  no_show_refund_percentage: number;
  allow_emergency_exception: boolean;
  emergency_refund_percentage: number;
  emergency_requires_approval: boolean;
  first_time_client_grace: boolean;
  first_time_client_hours: number;
  first_time_client_refund_percentage: number;
  auto_offer_to_waitlist: boolean;
  waitlist_notification_hours: number;
  created_at: string;
  updated_at: string;
}

const CancellationPolicyManager: React.FC = () => {
  const [policies, setPolicies] = useState<CancellationPolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<CancellationPolicy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CancellationPolicy>>({});

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/cancellation/policies');
      if (!response.ok) throw new Error('Failed to fetch policies');
      const data = await response.json();
      setPolicies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch policies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      is_default: false,
      immediate_cancellation_hours: 0,
      short_notice_hours: 24,
      advance_notice_hours: 48,
      immediate_refund_percentage: 0.0,
      short_notice_refund_percentage: 0.5,
      advance_refund_percentage: 1.0,
      immediate_cancellation_fee: 0.0,
      short_notice_cancellation_fee: 0.0,
      advance_cancellation_fee: 0.0,
      no_show_fee: 0.0,
      no_show_refund_percentage: 0.0,
      allow_emergency_exception: true,
      emergency_refund_percentage: 1.0,
      emergency_requires_approval: true,
      first_time_client_grace: true,
      first_time_client_hours: 24,
      first_time_client_refund_percentage: 1.0,
      auto_offer_to_waitlist: true,
      waitlist_notification_hours: 2
    });
    setIsCreating(true);
    setIsEditing(false);
    setSelectedPolicy(null);
  };

  const handleEdit = (policy: CancellationPolicy) => {
    setFormData(policy);
    setSelectedPolicy(policy);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = async () => {
    try {
      const url = isCreating 
        ? '/api/v1/cancellation/policies'
        : `/api/v1/cancellation/policies/${selectedPolicy?.id}`;
      
      const method = isCreating ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save policy');
      }

      await fetchPolicies();
      setIsEditing(false);
      setIsCreating(false);
      setSelectedPolicy(null);
      setFormData({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save policy');
    }
  };

  const handleDelete = async (policy: CancellationPolicy) => {
    if (!confirm(`Are you sure you want to delete "${policy.name}"?`)) return;

    try {
      const response = await fetch(`/api/v1/cancellation/policies/${policy.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete policy');

      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete policy');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    setSelectedPolicy(null);
    setFormData({});
  };

  const createDefaultPolicies = async () => {
    try {
      const response = await fetch('/api/v1/cancellation/policies/default', {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to create default policies');

      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create default policies');
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(0)}%`;
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cancellation Policies</h2>
          <p className="text-gray-600">Manage cancellation and refund policies</p>
        </div>
        <div className="flex gap-2">
          {policies.length === 0 && (
            <Button onClick={createDefaultPolicies} variant="outline">
              Create Default Policies
            </Button>
          )}
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(isCreating || isEditing) && (
        <Card>
          <CardHeader>
            <CardTitle>{isCreating ? 'Create New Policy' : 'Edit Policy'}</CardTitle>
            <CardDescription>
              Configure cancellation rules and refund percentages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList>
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="timeframes">Timeframes & Refunds</TabsTrigger>
                <TabsTrigger value="fees">Fees & Penalties</TabsTrigger>
                <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
                <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Policy Name</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Standard Cancellation Policy"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.is_active || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.is_default || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                      />
                      <Label>Default Policy</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description of when this policy applies"
                  />
                </div>
              </TabsContent>

              <TabsContent value="timeframes" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Immediate Cancellation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label>Hours Before</Label>
                        <Input
                          type="number"
                          value={formData.immediate_cancellation_hours || 0}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            immediate_cancellation_hours: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>
                      <div>
                        <Label>Refund %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={(formData.immediate_refund_percentage || 0) * 100}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            immediate_refund_percentage: (parseInt(e.target.value) || 0) / 100 
                          })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Short Notice
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label>Hours Before</Label>
                        <Input
                          type="number"
                          value={formData.short_notice_hours || 24}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            short_notice_hours: parseInt(e.target.value) || 24 
                          })}
                        />
                      </div>
                      <div>
                        <Label>Refund %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={(formData.short_notice_refund_percentage || 0.5) * 100}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            short_notice_refund_percentage: (parseInt(e.target.value) || 50) / 100 
                          })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Advance Notice
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label>Hours Before</Label>
                        <Input
                          type="number"
                          value={formData.advance_notice_hours || 48}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            advance_notice_hours: parseInt(e.target.value) || 48 
                          })}
                        />
                      </div>
                      <div>
                        <Label>Refund %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={(formData.advance_refund_percentage || 1.0) * 100}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            advance_refund_percentage: (parseInt(e.target.value) || 100) / 100 
                          })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="fees" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Cancellation Fees
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Immediate Cancellation Fee</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.immediate_cancellation_fee || 0}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            immediate_cancellation_fee: parseFloat(e.target.value) || 0 
                          })}
                        />
                      </div>
                      <div>
                        <Label>Short Notice Fee</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.short_notice_cancellation_fee || 0}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            short_notice_cancellation_fee: parseFloat(e.target.value) || 0 
                          })}
                        />
                      </div>
                      <div>
                        <Label>Advance Notice Fee</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.advance_cancellation_fee || 0}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            advance_cancellation_fee: parseFloat(e.target.value) || 0 
                          })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        No-Show Policy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>No-Show Fee</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.no_show_fee || 0}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            no_show_fee: parseFloat(e.target.value) || 0 
                          })}
                        />
                      </div>
                      <div>
                        <Label>No-Show Refund %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={(formData.no_show_refund_percentage || 0) * 100}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            no_show_refund_percentage: (parseInt(e.target.value) || 0) / 100 
                          })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="exceptions" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Emergency Exceptions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.allow_emergency_exception || false}
                          onCheckedChange={(checked) => setFormData({ 
                            ...formData, 
                            allow_emergency_exception: checked 
                          })}
                        />
                        <Label>Allow Emergency Exceptions</Label>
                      </div>
                      <div>
                        <Label>Emergency Refund %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={(formData.emergency_refund_percentage || 1.0) * 100}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            emergency_refund_percentage: (parseInt(e.target.value) || 100) / 100 
                          })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.emergency_requires_approval || false}
                          onCheckedChange={(checked) => setFormData({ 
                            ...formData, 
                            emergency_requires_approval: checked 
                          })}
                        />
                        <Label>Requires Manual Approval</Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">First-Time Client Grace</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.first_time_client_grace || false}
                          onCheckedChange={(checked) => setFormData({ 
                            ...formData, 
                            first_time_client_grace: checked 
                          })}
                        />
                        <Label>Enable Grace Period</Label>
                      </div>
                      <div>
                        <Label>Grace Period Hours</Label>
                        <Input
                          type="number"
                          value={formData.first_time_client_hours || 24}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            first_time_client_hours: parseInt(e.target.value) || 24 
                          })}
                        />
                      </div>
                      <div>
                        <Label>Grace Refund %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={(formData.first_time_client_refund_percentage || 1.0) * 100}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            first_time_client_refund_percentage: (parseInt(e.target.value) || 100) / 100 
                          })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="waitlist" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Waitlist Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.auto_offer_to_waitlist || false}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          auto_offer_to_waitlist: checked 
                        })}
                      />
                      <Label>Auto-offer cancelled slots to waitlist</Label>
                    </div>
                    <div>
                      <Label>Notification Window (hours)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.waitlist_notification_hours || 2}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          waitlist_notification_hours: parseInt(e.target.value) || 2 
                        })}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        How long waitlist members have to respond to offers
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {policy.name}
                    {policy.is_default && <Badge variant="secondary">Default</Badge>}
                    {!policy.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {policy.description || 'No description provided'}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(policy)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(policy)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Timeframes</h4>
                  <div className="space-y-1">
                    <div>Immediate: {policy.immediate_cancellation_hours}h - {formatPercentage(policy.immediate_refund_percentage)}</div>
                    <div>Short Notice: {policy.short_notice_hours}h - {formatPercentage(policy.short_notice_refund_percentage)}</div>
                    <div>Advance: {policy.advance_notice_hours}h - {formatPercentage(policy.advance_refund_percentage)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Fees</h4>
                  <div className="space-y-1">
                    <div>Immediate: {formatCurrency(policy.immediate_cancellation_fee)}</div>
                    <div>Short Notice: {formatCurrency(policy.short_notice_cancellation_fee)}</div>
                    <div>No-Show: {formatCurrency(policy.no_show_fee)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Features</h4>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      {policy.allow_emergency_exception ? <CheckCircle className="h-3 w-3 text-green-500 mr-1" /> : <X className="h-3 w-3 text-red-500 mr-1" />}
                      Emergency Exceptions
                    </div>
                    <div className="flex items-center">
                      {policy.first_time_client_grace ? <CheckCircle className="h-3 w-3 text-green-500 mr-1" /> : <X className="h-3 w-3 text-red-500 mr-1" />}
                      First-Time Grace
                    </div>
                    <div className="flex items-center">
                      {policy.auto_offer_to_waitlist ? <CheckCircle className="h-3 w-3 text-green-500 mr-1" /> : <X className="h-3 w-3 text-red-500 mr-1" />}
                      Waitlist Integration
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {policies.length === 0 && !isCreating && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No cancellation policies configured</h3>
            <p className="text-gray-600 mb-4">
              Create your first cancellation policy to start managing refunds and cancellations
            </p>
            <div className="space-x-2">
              <Button onClick={createDefaultPolicies} variant="outline">
                Create Default Policies
              </Button>
              <Button onClick={handleCreate}>
                Create Custom Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CancellationPolicyManager;