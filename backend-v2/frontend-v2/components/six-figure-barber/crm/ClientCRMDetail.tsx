"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  TrendingUp,
  Heart,
  MessageCircle,
  Target,
  AlertTriangle,
  Crown,
  Star,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Activity,
  Zap,
  Send,
  BarChart3,
  History,
  ChevronRight,
  Plus,
  Eye
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

interface TierProgression {
  client_id: number;
  current_tier: string;
  recommended_tier: string;
  progression_score: number;
  requirements_met: string[];
  requirements_missing: string[];
  estimated_timeline_days: number | null;
}

interface ChurnRisk {
  client_id: number;
  risk_score: number;
  risk_level: string;
  contributing_factors: string[];
  recommended_interventions: string[];
  intervention_priority: string;
}

interface ClientJourney {
  client_id: number;
  current_stage: string;
  stage_entry_date: string;
  days_in_current_stage: number;
  previous_stage: string | null;
  progression_score: number;
  relationship_quality_score: number;
  premium_positioning_readiness: number;
  value_tier_alignment: string | null;
  last_calculated: string;
}

interface Communication {
  id: number;
  communication_type: string;
  subject: string | null;
  sent_at: string;
  status: string;
  responded_at: string | null;
  engagement_score: number;
  touchpoint_type: string | null;
}

interface Props {
  clientId: number;
  onClose?: () => void;
}

const ClientCRMDetail: React.FC<Props> = ({ clientId, onClose }) => {
  const [clientScore, setClientScore] = useState<ClientScore | null>(null);
  const [tierProgression, setTierProgression] = useState<TierProgression | null>(null);
  const [churnRisk, setChurnRisk] = useState<ChurnRisk | null>(null);
  const [clientJourney, setClientJourney] = useState<ClientJourney | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Communication form state
  const [communicationForm, setCommunicationForm] = useState({
    communication_type: 'email',
    subject: '',
    message_content: '',
    touchpoint_type: ''
  });

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Load all client CRM data in parallel
      const [scoreRes, progressionRes, riskRes, journeyRes, commRes] = await Promise.all([
        fetch(`/api/v2/six-figure-barber/crm/clients/${clientId}/score`, { headers }),
        fetch(`/api/v2/six-figure-barber/crm/clients/${clientId}/tier-progression`, { headers }),
        fetch(`/api/v2/six-figure-barber/crm/clients/${clientId}/churn-risk`, { headers }),
        fetch(`/api/v2/six-figure-barber/crm/clients/${clientId}/journey`, { headers }),
        fetch(`/api/v2/six-figure-barber/crm/clients/${clientId}/communications?limit=10`, { headers })
      ]);

      if (scoreRes.ok) setClientScore(await scoreRes.json());
      if (progressionRes.ok) setTierProgression(await progressionRes.json());
      if (riskRes.ok) setChurnRisk(await riskRes.json());
      if (journeyRes.ok) setClientJourney(await journeyRes.json());
      if (commRes.ok) {
        const commData = await commRes.json();
        setCommunications(commData.communications || []);
      }

    } catch (err) {
      console.error('Error loading client data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCommunication = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v2/six-figure-barber/crm/communications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          ...communicationForm
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send communication');
      }

      // Reset form and reload communications
      setCommunicationForm({
        communication_type: 'email',
        subject: '',
        message_content: '',
        touchpoint_type: ''
      });
      
      // Reload communications
      const commRes = await fetch(`/api/v2/six-figure-barber/crm/clients/${clientId}/communications?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (commRes.ok) {
        const commData = await commRes.json();
        setCommunications(commData.communications || []);
      }

      alert('Communication sent successfully!');
    } catch (err) {
      console.error('Error sending communication:', err);
      alert('Failed to send communication');
    }
  };

  const updateClientJourney = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v2/six-figure-barber/crm/clients/journey/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          force_recalculation: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update journey');
      }

      // Reload client data
      loadClientData();
      alert('Client journey updated successfully!');
    } catch (err) {
      console.error('Error updating journey:', err);
      alert('Failed to update client journey');
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

  const getRiskColor = (level: string) => {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      critical: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[level as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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
          <h1 className="text-2xl font-bold text-gray-900">Client CRM Profile</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive relationship management for Client #{clientId}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={updateClientJourney} variant="outline" size="sm">
            Update Journey
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {clientScore && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Overall Score</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {clientScore.overall_score.toFixed(1)}
                  </p>
                  <p className="text-xs text-blue-600">Out of 100</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        )}

        {tierProgression && (
          <Card className={`${getTierColor(tierProgression.current_tier)}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-80">Current Tier</p>
                  <p className="text-lg font-bold capitalize">
                    {tierProgression.current_tier.replace('_', ' ')}
                  </p>
                  <p className="text-xs opacity-80">Value tier</p>
                </div>
                <Crown className="w-8 h-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        )}

        {churnRisk && (
          <Card className={`border ${getRiskColor(churnRisk.risk_level)}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Churn Risk</p>
                  <p className="text-2xl font-bold">
                    {churnRisk.risk_score.toFixed(1)}
                  </p>
                  <p className="text-xs capitalize">{churnRisk.risk_level} risk</p>
                </div>
                <AlertTriangle className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        )}

        {clientJourney && (
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Journey Stage</p>
                  <p className="text-sm font-bold text-purple-900 capitalize">
                    {clientJourney.current_stage.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-purple-600">
                    {clientJourney.days_in_current_stage} days
                  </p>
                </div>
                <Target className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="journey">Journey</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tier Progression */}
            {tierProgression && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Tier Progression Analysis
                  </CardTitle>
                  <CardDescription>
                    Current tier status and advancement opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">Current Tier:</span>
                    <Badge className={getTierColor(tierProgression.current_tier)}>
                      {tierProgression.current_tier.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Recommended Tier:</span>
                    <Badge className={getTierColor(tierProgression.recommended_tier)}>
                      {tierProgression.recommended_tier.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progression Score</span>
                      <span>{tierProgression.progression_score.toFixed(1)}/100</span>
                    </div>
                    <Progress value={tierProgression.progression_score} className="h-2" />
                  </div>

                  {tierProgression.requirements_met.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Requirements Met:</h4>
                      <ul className="space-y-1">
                        {tierProgression.requirements_met.map((req, index) => (
                          <li key={index} className="text-sm text-green-600 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {tierProgression.requirements_missing.length > 0 && (
                    <div>
                      <h4 className="font-medium text-orange-700 mb-2">Areas for Improvement:</h4>
                      <ul className="space-y-1">
                        {tierProgression.requirements_missing.map((req, index) => (
                          <li key={index} className="text-sm text-orange-600 flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {tierProgression.estimated_timeline_days && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">
                        Estimated timeline: {tierProgression.estimated_timeline_days} days
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Churn Risk Analysis */}
            {churnRisk && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Churn Risk Analysis
                  </CardTitle>
                  <CardDescription>
                    Risk assessment and intervention recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-3 rounded-lg border ${getRiskColor(churnRisk.risk_level)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Risk Level:</span>
                      <Badge variant="outline" className="capitalize">
                        {churnRisk.risk_level}
                      </Badge>
                    </div>
                    <div className="text-sm mt-1">
                      Score: {churnRisk.risk_score.toFixed(1)}/100
                    </div>
                  </div>

                  {churnRisk.contributing_factors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">Contributing Factors:</h4>
                      <ul className="space-y-1">
                        {churnRisk.contributing_factors.map((factor, index) => (
                          <li key={index} className="text-sm text-red-600 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {churnRisk.recommended_interventions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-700 mb-2">Recommended Actions:</h4>
                      <ul className="space-y-1">
                        {churnRisk.recommended_interventions.map((intervention, index) => (
                          <li key={index} className="text-sm text-blue-600 flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {intervention}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className={`p-3 rounded-lg ${
                    churnRisk.intervention_priority === 'urgent' ? 'bg-red-50 border border-red-200' :
                    churnRisk.intervention_priority === 'high' ? 'bg-orange-50 border border-orange-200' :
                    'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <span className="text-sm font-medium capitalize">
                      Priority: {churnRisk.intervention_priority}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Scores Tab */}
        <TabsContent value="scores" className="space-y-4">
          {clientScore && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Score Breakdown</CardTitle>
                  <CardDescription>
                    Detailed scoring across all relationship dimensions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Relationship Score</span>
                        <span>{clientScore.relationship_score.toFixed(1)}/100</span>
                      </div>
                      <Progress value={clientScore.relationship_score} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Engagement Score</span>
                        <span>{clientScore.engagement_score.toFixed(1)}/100</span>
                      </div>
                      <Progress value={clientScore.engagement_score} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Value Score</span>
                        <span>{clientScore.value_score.toFixed(1)}/100</span>
                      </div>
                      <Progress value={clientScore.value_score} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Consistency Score</span>
                        <span>{clientScore.consistency_score.toFixed(1)}/100</span>
                      </div>
                      <Progress value={clientScore.consistency_score} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Growth Potential</span>
                        <span>{clientScore.growth_potential.toFixed(1)}/100</span>
                      </div>
                      <Progress value={clientScore.growth_potential} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overall Performance</CardTitle>
                  <CardDescription>
                    Comprehensive client relationship performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <div className="text-4xl font-bold text-blue-900">
                      {clientScore.overall_score.toFixed(1)}
                    </div>
                    <div className="text-sm text-blue-600 mt-1">Overall Score</div>
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    Last updated: {formatDate(clientScore.score_updated_at)}
                  </div>
                  
                  <Button className="w-full" variant="outline" size="sm">
                    Recalculate Scores
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Journey Tab */}
        <TabsContent value="journey" className="space-y-4">
          {clientJourney && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Client Journey
                </CardTitle>
                <CardDescription>
                  Current stage and progression through the Six Figure Barber methodology
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-purple-800">Current Stage</span>
                      <Badge variant="outline" className="capitalize">
                        {clientJourney.current_stage.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-purple-600 mt-1">
                      Since: {formatDate(clientJourney.stage_entry_date)}
                    </div>
                    <div className="text-sm text-purple-600">
                      Duration: {clientJourney.days_in_current_stage} days
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800">Previous Stage</span>
                      <Badge variant="outline" className="capitalize">
                        {clientJourney.previous_stage?.replace('_', ' ') || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progression Score</span>
                      <span>{clientJourney.progression_score.toFixed(1)}/100</span>
                    </div>
                    <Progress value={clientJourney.progression_score} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Relationship Quality</span>
                      <span>{clientJourney.relationship_quality_score.toFixed(1)}/100</span>
                    </div>
                    <Progress value={clientJourney.relationship_quality_score} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Premium Positioning Readiness</span>
                      <span>{clientJourney.premium_positioning_readiness.toFixed(1)}/100</span>
                    </div>
                    <Progress value={clientJourney.premium_positioning_readiness} className="h-2" />
                  </div>
                </div>

                {clientJourney.value_tier_alignment && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">Value Tier Alignment</span>
                      <Badge className={getTierColor(clientJourney.value_tier_alignment)}>
                        {clientJourney.value_tier_alignment.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-600">
                  Last calculated: {formatDate(clientJourney.last_calculated)}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send Communication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Communication
                </CardTitle>
                <CardDescription>
                  Create and send targeted client communication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Communication Type</label>
                    <Select 
                      value={communicationForm.communication_type}
                      onValueChange={(value) => setCommunicationForm(prev => ({...prev, communication_type: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="phone_call">Phone Call</SelectItem>
                        <SelectItem value="in_person">In Person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Touchpoint Type</label>
                    <Select 
                      value={communicationForm.touchpoint_type}
                      onValueChange={(value) => setCommunicationForm(prev => ({...prev, touchpoint_type: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select touchpoint type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome_sequence">Welcome Sequence</SelectItem>
                        <SelectItem value="post_appointment">Post Appointment</SelectItem>
                        <SelectItem value="retention_campaign">Retention Campaign</SelectItem>
                        <SelectItem value="upsell_opportunity">Upsell Opportunity</SelectItem>
                        <SelectItem value="review_request">Review Request</SelectItem>
                        <SelectItem value="birthday_outreach">Birthday Outreach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Subject</label>
                    <Input
                      value={communicationForm.subject}
                      onChange={(e) => setCommunicationForm(prev => ({...prev, subject: e.target.value}))}
                      placeholder="Communication subject"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Message</label>
                    <Textarea
                      value={communicationForm.message_content}
                      onChange={(e) => setCommunicationForm(prev => ({...prev, message_content: e.target.value}))}
                      placeholder="Your message content..."
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={handleSendCommunication}
                    className="w-full"
                    disabled={!communicationForm.message_content}
                  >
                    Send Communication
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Communication History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Communication History
                </CardTitle>
                <CardDescription>
                  Recent communications and engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {communications.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No communications found
                    </p>
                  ) : (
                    communications.map((comm) => (
                      <div key={comm.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="capitalize">
                            {comm.communication_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(comm.sent_at)}
                          </span>
                        </div>
                        
                        {comm.subject && (
                          <div className="font-medium text-sm mb-1">
                            {comm.subject}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className={`capitalize ${
                            comm.status === 'responded' ? 'text-green-600' :
                            comm.status === 'delivered' ? 'text-blue-600' :
                            'text-gray-600'
                          }`}>
                            {comm.status}
                          </span>
                          
                          {comm.engagement_score > 0 && (
                            <span className="text-purple-600">
                              Engagement: {comm.engagement_score.toFixed(1)}
                            </span>
                          )}
                        </div>
                        
                        {comm.touchpoint_type && (
                          <div className="text-xs text-gray-500 mt-1 capitalize">
                            {comm.touchpoint_type.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                
                {communications.length > 0 && (
                  <Button variant="outline" className="w-full mt-4" size="sm">
                    View All Communications
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Touchpoint Plan
                </Button>
                <Button className="w-full" variant="outline" size="sm">
                  <Activity className="w-4 h-4 mr-2" />
                  Record Engagement
                </Button>
                <Button className="w-full" variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Follow-up
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Detailed Analytics
                </Button>
                <Button className="w-full" variant="outline" size="sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Growth Opportunity Analysis
                </Button>
                <Button className="w-full" variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Competitive Positioning
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Automation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline" size="sm">
                  <Zap className="w-4 h-4 mr-2" />
                  Trigger Workflow
                </Button>
                <Button className="w-full" variant="outline" size="sm">
                  <Target className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
                <Button className="w-full" variant="outline" size="sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Schedule Automation
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientCRMDetail;