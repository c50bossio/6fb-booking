'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Mail, 
  MessageSquare,
  Users,
  BarChart3,
  Plus,
  Send,
  Calendar,
  Target,
  TrendingUp,
  Clock,
  Edit,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Search,
  Eye
} from 'lucide-react'
import { marketingApi } from '@/lib/api/integrations'
import { useToast } from '@/hooks/use-toast'
import { CampaignBuilder } from '@/components/marketing/CampaignBuilder'
import { TemplateManager } from '@/components/marketing/TemplateManager'
import { CampaignAnalytics } from '@/components/marketing/CampaignAnalytics'

interface Campaign {
  id: number
  name: string
  type: 'email' | 'sms'
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused'
  created_at: string
  scheduled_at?: string
  sent_at?: string
  recipients_count: number
  open_rate?: number
  click_rate?: number
  conversion_rate?: number
  template_id?: number
  template_name?: string
}

interface Template {
  id: number
  name: string
  type: 'email' | 'sms'
  subject?: string
  content: string
  variables: string[]
  usage_count: number
  created_at: string
  updated_at: string
}

interface Contact {
  id: number
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  status: 'active' | 'unsubscribed' | 'bounced'
  tags: string[]
  created_at: string
  last_activity?: string
}

interface ContactList {
  id: number
  name: string
  description?: string
  contact_count: number
  created_at: string
}

export default function MarketingPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [selectedTab, setSelectedTab] = useState('campaigns')
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState<number | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMarketingData()
  }, [])

  const loadMarketingData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [campaignsData, emailTemplates, smsTemplates] = await Promise.all([
        marketingApi.getCampaigns(),
        marketingApi.getEmailTemplates(),
        marketingApi.getSMSTemplates()
      ])

      setCampaigns(campaignsData)
      setTemplates([...emailTemplates, ...smsTemplates])
    } catch (err) {
      console.error('Failed to load marketing data:', err)
      setError('Failed to load marketing data')
      toast({
        title: 'Error',
        description: 'Failed to load marketing data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCampaign = async (campaignId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${name}"?`)) return

    try {
      // API call would go here
      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
      toast({
        title: 'Campaign Deleted',
        description: `Campaign "${name}" has been deleted successfully`
      })
    } catch (err) {
      console.error('Failed to delete campaign:', err)
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete campaign',
        variant: 'destructive'
      })
    }
  }

  const handleSendCampaign = async (campaignId: number, name: string) => {
    if (!confirm(`Are you sure you want to send campaign "${name}"?`)) return

    try {
      // API call would go here
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId 
          ? { ...c, status: 'sending' as const }
          : c
      ))
      toast({
        title: 'Campaign Sent',
        description: `Campaign "${name}" has been queued for sending`
      })
    } catch (err) {
      console.error('Failed to send campaign:', err)
      toast({
        title: 'Send Failed',
        description: 'Failed to send campaign',
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'sending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'scheduled': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />
  }

  const activeCampaigns = campaigns.filter(c => c.status !== 'draft' && c.status !== 'sent')
  const draftCampaigns = campaigns.filter(c => c.status === 'draft')
  const sentCampaigns = campaigns.filter(c => c.status === 'sent')
  const totalSent = sentCampaigns.reduce((sum, c) => sum + c.recipients_count, 0)
  const avgOpenRate = sentCampaigns.length > 0 
    ? sentCampaigns.reduce((sum, c) => sum + (c.open_rate || 0), 0) / sentCampaigns.length 
    : 0

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading marketing data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            Marketing Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and track email & SMS marketing campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadMarketingData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCampaignBuilder(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCampaigns.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOpenRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Email campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready to use
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Builder Modal */}
      {showCampaignBuilder && (
        <CampaignBuilder
          campaignId={editingCampaignId}
          onCancel={() => {
            setShowCampaignBuilder(false)
            setEditingCampaignId(undefined)
          }}
          onSave={(campaign) => {
            if (editingCampaignId) {
              setCampaigns(prev => prev.map(c => c.id === editingCampaignId ? campaign : c))
            } else {
              setCampaigns(prev => [...prev, campaign])
            }
            setShowCampaignBuilder(false)
            setEditingCampaignId(undefined)
          }}
        />
      )}

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <TemplateManager
          onSelectTemplate={(template) => {
            setTemplates(prev => [...prev.filter(t => t.id !== template.id), template])
            setShowTemplateManager(false)
          }}
          className="fixed inset-0 z-50 bg-background p-6 overflow-auto"
        />
      )}

      {!showCampaignBuilder && !showTemplateManager && (
        <Tabs value={selectedTab} onValueChange={setSelectedTab} defaultValue="campaigns" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" variant="outline">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            <Button size="sm" onClick={() => setShowCampaignBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>

          {campaigns.length > 0 ? (
            <div className="space-y-4">
              {/* Active/Scheduled Campaigns */}
              {activeCampaigns.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400">
                    Active & Scheduled ({activeCampaigns.length})
                  </h4>
                  {activeCampaigns.map((campaign) => (
                    <Card key={campaign.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(campaign.type)}
                            <div>
                              <h5 className="font-medium">{campaign.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getStatusColor(campaign.status)}>
                                  {campaign.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {campaign.recipients_count} recipients
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            {campaign.scheduled_at && (
                              <p>Scheduled: {new Date(campaign.scheduled_at).toLocaleDateString()}</p>
                            )}
                            <p>Created: {new Date(campaign.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {campaign.status === 'scheduled' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleSendCampaign(campaign.id, campaign.name)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send Now
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Draft Campaigns */}
              {draftCampaigns.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Drafts ({draftCampaigns.length})</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {draftCampaigns.map((campaign) => (
                      <Card key={campaign.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(campaign.type)}
                              <h5 className="font-medium text-sm">{campaign.name}</h5>
                            </div>
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {campaign.recipients_count} recipients • Created {new Date(campaign.created_at).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleSendCampaign(campaign.id, campaign.name)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Sent Campaigns */}
              {sentCampaigns.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Recent Campaigns ({sentCampaigns.slice(0, 5).length})</h4>
                  {sentCampaigns.slice(0, 5).map((campaign) => (
                    <Card key={campaign.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(campaign.type)}
                            <div>
                              <h5 className="font-medium text-sm">{campaign.name}</h5>
                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                <span>{campaign.recipients_count} sent</span>
                                {campaign.open_rate && (
                                  <span>{campaign.open_rate.toFixed(1)}% opened</span>
                                )}
                                {campaign.click_rate && (
                                  <span>{campaign.click_rate.toFixed(1)}% clicked</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {campaign.sent_at && new Date(campaign.sent_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Campaigns Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first marketing campaign to get started
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <TemplateManager />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Contact Management</h3>
              <p className="text-muted-foreground mb-6">
                Import, organize, and segment your contacts for targeted campaigns
              </p>
              <div className="flex gap-2 justify-center">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Contacts
                </Button>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <CampaignAnalytics />
        </TabsContent>
        </Tabs>
      )}
    </div>
  )
}