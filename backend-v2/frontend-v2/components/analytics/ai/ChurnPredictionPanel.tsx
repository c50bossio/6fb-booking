import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle, 
  User,
  Mail,
  Phone,
  Calendar
} from 'lucide-react'
import { aiAnalyticsApi } from '@/lib/api/ai-analytics'
import type { ChurnPrediction, PredictionResponse } from '@/lib/api/ai-analytics'
import { useToast } from '@/hooks/use-toast'

interface ChurnPredictionPanelProps {
  className?: string
}

export const ChurnPredictionPanel: React.FC<ChurnPredictionPanelProps> = ({
  className = ''
}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [predictions, setPredictions] = useState<ChurnPrediction[] | null>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPredictions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response: PredictionResponse = await aiAnalyticsApi.getChurnPredictions()
      setPredictions(response.data as ChurnPrediction[])
      setMetadata(response.metadata)
    } catch (err) {
      console.error('Failed to load churn predictions:', err)
      setError('Failed to load churn predictions')
      toast({
        title: 'Error',
        description: 'Failed to load churn predictions',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPredictions()
  }, [])

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <AlertTriangle className="h-4 w-4" />
      case 'medium': return <TrendingDown className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  const highRiskClients = predictions?.filter(p => p.risk_level === 'high') || []
  const mediumRiskClients = predictions?.filter(p => p.risk_level === 'medium') || []
  const lowRiskClients = predictions?.filter(p => p.risk_level === 'low') || []

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Churn Prediction
            </CardTitle>
            <CardDescription>
              AI analysis of client retention risk and recommended actions
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={loadPredictions}
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {predictions && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-2xl font-bold">{predictions.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">High Risk</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-red-600">{highRiskClients.length}</p>
                <Badge className={getRiskColor('high')}>
                  {((highRiskClients.length / predictions.length) * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Medium Risk</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-yellow-600">{mediumRiskClients.length}</p>
                <Badge className={getRiskColor('medium')}>
                  {((mediumRiskClients.length / predictions.length) * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Low Risk</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-green-600">{lowRiskClients.length}</p>
                <Badge className={getRiskColor('low')}>
                  {((lowRiskClients.length / predictions.length) * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* High Risk Clients - Priority Section */}
        {highRiskClients.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h4 className="font-medium text-red-700 dark:text-red-400">
                High Risk Clients - Immediate Action Required
              </h4>
            </div>
            <div className="space-y-3">
              {highRiskClients.slice(0, 5).map((client, index) => (
                <Card key={index} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h5 className="font-medium">{client.client_name}</h5>
                          <p className="text-sm text-muted-foreground">Client ID: {client.client_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getRiskColor(client.risk_level)}>
                          {client.risk_level.toUpperCase()} RISK
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {(client.churn_probability * 100).toFixed(0)}% chance
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h6 className="text-xs font-medium text-muted-foreground mb-1">
                          CONTRIBUTING FACTORS
                        </h6>
                        <ul className="space-y-1">
                          {client.contributing_factors.slice(0, 3).map((factor, factorIndex) => (
                            <li key={factorIndex} className="text-xs flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h6 className="text-xs font-medium text-muted-foreground mb-1">
                          RECOMMENDED ACTIONS
                        </h6>
                        <ul className="space-y-1">
                          {client.recommended_actions.slice(0, 2).map((action, actionIndex) => (
                            <li key={actionIndex} className="text-xs flex items-start gap-2">
                              <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        Send Email
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        <Phone className="h-3 w-3 mr-1" />
                        Call Client
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        Book Follow-up
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Medium Risk Clients - Monitor Section */}
        {mediumRiskClients.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-500" />
              <h4 className="font-medium text-yellow-700 dark:text-yellow-400">
                Medium Risk Clients - Monitor Closely
              </h4>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {mediumRiskClients.slice(0, 4).map((client, index) => (
                <Card key={index} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">{client.client_name}</h5>
                      <Badge className={getRiskColor(client.risk_level)} size="sm">
                        {(client.churn_probability * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <ul className="space-y-1">
                      {client.recommended_actions.slice(0, 2).map((action, actionIndex) => (
                        <li key={actionIndex} className="text-xs flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No predictions state */}
        {predictions && predictions.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No churn predictions available</p>
            <p className="text-sm text-muted-foreground">
              Requires sufficient historical data to generate predictions
            </p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Analyzing client churn risk...</p>
            </div>
          </div>
        )}

        {/* Model Info */}
        {metadata && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Analysis generated using {metadata.model_version} with {metadata.data_points_used} data points.
              Confidence score: {metadata.confidence_score}%. Predictions based on appointment frequency, 
              communication patterns, and booking behavior.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}