"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Stop,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MessageCircle,
  TrendingUp,
  Target,
  BarChart3,
  Settings,
  Eye,
  Copy,
  Download
} from 'lucide-react';

// Types
interface WorkflowStep {
  type: string;
  name: string;
  configuration: Record<string, any>;
  delay_hours?: number;
}

interface Workflow {
  id: number;
  workflow_name: string;
  workflow_description?: string;
  workflow_type: string;
  trigger_event: string;
  is_active: boolean;
  total_executions: number;
  successful_executions: number;
  average_success_rate: number;
  total_revenue_generated: number;
  created_at: string;
}

interface WorkflowExecution {
  execution_id: string;
  workflow_id: number;
  client_id: number;
  status: string;
  started_at: string;
  completed_at?: string;
  current_step: number;
  total_steps: number;
  revenue_generated: number;
}

const WorkflowManager: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  
  // Create workflow form state
  const [createForm, setCreateForm] = useState({
    workflow_name: '',
    workflow_description: '',
    workflow_type: 'touchpoint_sequence',
    trigger_event: 'new_client_signup',
    methodology_principle: 'client_value_maximization',
    target_client_criteria: {},
    workflow_steps: [] as WorkflowStep[],
    is_active: true
  });

  // Step builder state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>({
    type: 'send_communication',
    name: '',
    configuration: {}
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  useEffect(() => {
    loadWorkflows();
    loadRecentExecutions();
  }, []);

  const loadWorkflows = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v2/six-figure-barber/crm/workflows', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load workflows');
      }

      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (err) {
      console.error('Error loading workflows:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    }
  };

  const loadRecentExecutions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      // This would be a separate endpoint for execution history
      // For now, we'll just set empty array
      setExecutions([]);
    } catch (err) {
      console.error('Error loading executions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v2/six-figure-barber/crm/workflows', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }

      // Reset form and reload workflows
      setCreateForm({
        workflow_name: '',
        workflow_description: '',
        workflow_type: 'touchpoint_sequence',
        trigger_event: 'new_client_signup',
        methodology_principle: 'client_value_maximization',
        target_client_criteria: {},
        workflow_steps: [],
        is_active: true
      });
      setShowCreateForm(false);
      loadWorkflows();
      
      alert('Workflow created successfully!');
    } catch (err) {
      console.error('Error creating workflow:', err);
      alert('Failed to create workflow');
    }
  };

  const handleExecuteWorkflow = async (workflowId: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v2/six-figure-barber/crm/workflows/execute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: workflowId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }

      const result = await response.json();
      alert(`Started ${result.executions_started} workflow executions`);
      loadRecentExecutions();
    } catch (err) {
      console.error('Error executing workflow:', err);
      alert('Failed to execute workflow');
    }
  };

  const addStep = () => {
    if (currentStep.name) {
      setCreateForm(prev => ({
        ...prev,
        workflow_steps: [...prev.workflow_steps, { ...currentStep }]
      }));
      
      setCurrentStep({
        type: 'send_communication',
        name: '',
        configuration: {}
      });
    }
  };

  const removeStep = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      workflow_steps: prev.workflow_steps.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status: string) => {
    const colors = {
      running: 'text-blue-600 bg-blue-50',
      completed: 'text-green-600 bg-green-50',
      failed: 'text-red-600 bg-red-50',
      cancelled: 'text-gray-600 bg-gray-50'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Workflow Manager</h1>
          <p className="text-gray-600 mt-1">
            Automate client relationship management with intelligent workflows
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Active Workflows</p>
                <p className="text-2xl font-bold text-blue-900">
                  {workflows.filter(w => w.is_active).length}
                </p>
              </div>
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Executions</p>
                <p className="text-2xl font-bold text-green-900">
                  {workflows.reduce((sum, w) => sum + w.total_executions, 0)}
                </p>
              </div>
              <Play className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-900">
                  {workflows.length > 0 
                    ? (workflows.reduce((sum, w) => sum + w.average_success_rate, 0) / workflows.length).toFixed(1)
                    : 0}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Revenue Generated</p>
                <p className="text-xl font-bold text-orange-900">
                  {formatCurrency(workflows.reduce((sum, w) => sum + w.total_revenue_generated, 0))}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Workflows</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{workflow.workflow_name}</CardTitle>
                      <CardDescription className="mt-1">
                        {workflow.workflow_description || 'No description'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={workflow.is_active ? "default" : "secondary"}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <div className="font-medium capitalize">
                        {workflow.workflow_type.replace('_', ' ')}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Trigger:</span>
                      <div className="font-medium capitalize">
                        {workflow.trigger_event.replace('_', ' ')}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Executions:</span>
                      <div className="font-medium">{workflow.total_executions}</div>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Success Rate:</span>
                      <div className="font-medium">{workflow.average_success_rate.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Performance:</span>
                    <Progress value={workflow.average_success_rate} className="w-20 h-2" />
                  </div>

                  <div className="text-sm">
                    <span className="text-gray-600">Revenue Generated: </span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(workflow.total_revenue_generated)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleExecuteWorkflow(workflow.id)}
                      className="flex-1"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Execute
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3" />
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Settings className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {workflows.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows created</h3>
                <p className="text-gray-600 mb-4">
                  Create your first automated workflow to streamline client relationship management.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Workflow
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>
                Monitor workflow execution status and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recent executions</h3>
                  <p className="text-gray-600">
                    Workflow executions will appear here once they start running.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.map((execution) => (
                    <div key={execution.execution_id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(execution.status)}>
                            {execution.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            Execution #{execution.execution_id.slice(-8)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(execution.started_at)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Client ID:</span>
                          <div className="font-medium">{execution.client_id}</div>
                        </div>
                        
                        <div>
                          <span className="text-gray-600">Progress:</span>
                          <div className="font-medium">
                            {execution.current_step}/{execution.total_steps}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-600">Revenue:</span>
                          <div className="font-medium text-green-600">
                            {formatCurrency(execution.revenue_generated)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <Progress 
                          value={(execution.current_step / execution.total_steps) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Workflow Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.map((workflow) => (
                    <div key={workflow.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{workflow.workflow_name}</div>
                        <div className="text-sm text-gray-600">
                          {workflow.total_executions} executions
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-medium">{workflow.average_success_rate.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">success</div>
                        </div>
                        <div className="w-16">
                          <Progress value={workflow.average_success_rate} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Revenue Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.map((workflow) => (
                    <div key={workflow.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{workflow.workflow_name}</div>
                        <div className="text-sm text-gray-600">
                          {workflow.workflow_type.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {formatCurrency(workflow.total_revenue_generated)}
                        </div>
                        <div className="text-sm text-gray-600">generated</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Workflow Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Create New Workflow</h2>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Workflow Name</label>
                    <Input
                      value={createForm.workflow_name}
                      onChange={(e) => setCreateForm(prev => ({...prev, workflow_name: e.target.value}))}
                      placeholder="Enter workflow name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Workflow Type</label>
                    <Select 
                      value={createForm.workflow_type}
                      onValueChange={(value) => setCreateForm(prev => ({...prev, workflow_type: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="touchpoint_sequence">Touchpoint Sequence</SelectItem>
                        <SelectItem value="retention_campaign">Retention Campaign</SelectItem>
                        <SelectItem value="engagement_boost">Engagement Boost</SelectItem>
                        <SelectItem value="upsell_sequence">Upsell Sequence</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Trigger Event</label>
                    <Select 
                      value={createForm.trigger_event}
                      onValueChange={(value) => setCreateForm(prev => ({...prev, trigger_event: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_client_signup">New Client Signup</SelectItem>
                        <SelectItem value="first_appointment_completed">First Appointment Completed</SelectItem>
                        <SelectItem value="multiple_no_shows">Multiple No Shows</SelectItem>
                        <SelectItem value="high_spend_threshold">High Spend Threshold</SelectItem>
                        <SelectItem value="overdue_visit">Overdue Visit</SelectItem>
                        <SelectItem value="churn_risk_detected">Churn Risk Detected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Six FB Principle</label>
                    <Select 
                      value={createForm.methodology_principle}
                      onValueChange={(value) => setCreateForm(prev => ({...prev, methodology_principle: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue_optimization">Revenue Optimization</SelectItem>
                        <SelectItem value="client_value_maximization">Client Value Maximization</SelectItem>
                        <SelectItem value="service_delivery_excellence">Service Delivery Excellence</SelectItem>
                        <SelectItem value="business_efficiency">Business Efficiency</SelectItem>
                        <SelectItem value="professional_growth">Professional Growth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    value={createForm.workflow_description}
                    onChange={(e) => setCreateForm(prev => ({...prev, workflow_description: e.target.value}))}
                    placeholder="Describe what this workflow does..."
                    rows={3}
                  />
                </div>

                {/* Workflow Steps */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Workflow Steps</h3>
                  
                  {/* Existing Steps */}
                  {createForm.workflow_steps.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {createForm.workflow_steps.map((step, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{step.name}</div>
                            <div className="text-sm text-gray-600 capitalize">
                              {step.type.replace('_', ' ')}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeStep(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Step */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Add Step</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Step Type</label>
                          <Select 
                            value={currentStep.type}
                            onValueChange={(value) => setCurrentStep(prev => ({...prev, type: value}))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="send_communication">Send Communication</SelectItem>
                              <SelectItem value="create_touchpoint">Create Touchpoint</SelectItem>
                              <SelectItem value="update_client_data">Update Client Data</SelectItem>
                              <SelectItem value="wait">Wait Period</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">Step Name</label>
                          <Input
                            value={currentStep.name}
                            onChange={(e) => setCurrentStep(prev => ({...prev, name: e.target.value}))}
                            placeholder="Enter step name"
                          />
                        </div>
                      </div>

                      <Button onClick={addStep} disabled={!currentStep.name}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Step
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Active</label>
                    <p className="text-sm text-gray-600">Enable this workflow to start automatically</p>
                  </div>
                  <Switch
                    checked={createForm.is_active}
                    onCheckedChange={(checked) => setCreateForm(prev => ({...prev, is_active: checked}))}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateWorkflow}
                    disabled={!createForm.workflow_name || createForm.workflow_steps.length === 0}
                  >
                    Create Workflow
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowManager;