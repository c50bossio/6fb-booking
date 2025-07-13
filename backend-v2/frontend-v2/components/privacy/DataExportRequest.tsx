'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Download, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Database,
  Lock,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DataExportRequest {
  request_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
  requested_at: string
  completed_at?: string
  expires_at?: string
  file_size_bytes?: number
  format: string
  download_url?: string
  error_message?: string
}

interface DataExportRequestProps {
  onRequestCreated?: (requestId: string) => void
}

export default function DataExportRequestComponent({ onRequestCreated }: DataExportRequestProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [format, setFormat] = useState('json')
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  useEffect(() => {
    loadExportRequests()
  }, [])

  const loadExportRequests = async () => {
    try {
      setLoadingRequests(true)
      const response = await fetch('/api/v1/privacy/export-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (response.ok) {
        const requests = await response.json()
        setExportRequests(requests)
      } else {
        console.error('Failed to load export requests')
      }
    } catch (error) {
      console.error('Error loading export requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const createExportRequest = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/v1/privacy/export-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ format })
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: 'Export Request Created',
          description: `Your data export request ${result.request_id} has been created and will be processed in the background.`
        })

        // Refresh the list
        await loadExportRequests()

        // Notify parent component
        if (onRequestCreated) {
          onRequestCreated(result.request_id)
        }
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create export request')
      }
    } catch (error) {
      console.error('Error creating export request:', error)
      toast({
        title: 'Export Request Failed',
        description: error instanceof Error ? error.message : 'Failed to create data export request',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadExport = async (request: DataExportRequest) => {
    if (!request.download_url) return

    try {
      // Create a temporary link to download the file
      const link = document.createElement('a')
      link.href = request.download_url
      link.download = `gdpr_export_${request.request_id}.${request.format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Download Started',
        description: 'Your data export file download has started.'
      })
    } catch (error) {
      console.error('Error downloading export:', error)
      toast({
        title: 'Download Failed',
        description: 'Failed to download the export file. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'expired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const canCreateNewRequest = exportRequests.every(req => 
    !['pending', 'processing'].includes(req.status)
  )

  return (
    <div className="space-y-6">
      {/* GDPR Information */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Under GDPR Article 20 (Right to data portability), you can request a complete export of your personal data. 
          This export will include all data we have stored about you in a machine-readable format.
        </AlertDescription>
      </Alert>

      {/* Create New Export Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Request Data Export
          </CardTitle>
          <CardDescription>
            Export all your personal data in your preferred format. The process will be completed within 30 days as per GDPR requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (recommended)</SelectItem>
                <SelectItem value="csv">CSV (multiple files in ZIP)</SelectItem>
                <SelectItem value="xml">XML</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data Categories Included</label>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• Profile information (name, email, phone)</div>
              <div>• Appointment history and booking details</div>
              <div>• Payment history and transaction records</div>
              <div>• Consent history and privacy preferences</div>
              <div>• Review and rating data</div>
              <div>• Communication preferences and logs</div>
            </div>
          </div>

          <Button 
            onClick={createExportRequest}
            disabled={isLoading || !canCreateNewRequest}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Request...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Request Data Export
              </>
            )}
          </Button>

          {!canCreateNewRequest && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have an active export request. Please wait for it to complete before creating a new one.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Export Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Request History
          </CardTitle>
          <CardDescription>
            Track the status of your data export requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading export requests...</span>
            </div>
          ) : exportRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No export requests found. Create your first data export request above.
            </div>
          ) : (
            <div className="space-y-4">
              {exportRequests.map((request) => (
                <div key={request.request_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <span className="font-medium">Request {request.request_id}</span>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                    
                    {request.status === 'completed' && request.download_url && (
                      <Button 
                        size="sm" 
                        onClick={() => downloadExport(request)}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Format</div>
                      <div className="font-medium">{request.format.toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Requested</div>
                      <div className="font-medium">{formatDate(request.requested_at)}</div>
                    </div>
                    {request.completed_at && (
                      <div>
                        <div className="text-gray-500">Completed</div>
                        <div className="font-medium">{formatDate(request.completed_at)}</div>
                      </div>
                    )}
                    {request.file_size_bytes && (
                      <div>
                        <div className="text-gray-500">File Size</div>
                        <div className="font-medium">{formatFileSize(request.file_size_bytes)}</div>
                      </div>
                    )}
                  </div>

                  {request.expires_at && request.status === 'completed' && (
                    <div className="text-sm text-gray-600">
                      <strong>Download expires:</strong> {formatDate(request.expires_at)}
                    </div>
                  )}

                  {request.error_message && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {request.error_message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}