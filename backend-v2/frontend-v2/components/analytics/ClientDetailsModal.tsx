'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Calendar, DollarSign, TrendingUp, Clock, MessageSquare } from 'lucide-react'

interface UpsellOpportunity {
  id: string
  clientId: string
  clientName: string
  currentService: string
  suggestedService: string
  potentialRevenue: number
  confidence: number
  reasons: string[]
  lastVisit: string
  frequency: number
}

interface ClientDetailsModalProps {
  opportunity: UpsellOpportunity | null
  isOpen: boolean
  onClose: () => void
  onImplement: (opportunity: UpsellOpportunity) => void
}

export default function ClientDetailsModal({ opportunity, isOpen, onClose, onImplement }: ClientDetailsModalProps) {
  if (!opportunity) return null

  const confidenceColor = opportunity.confidence >= 90 ? 'bg-green-100 text-green-800' :
                         opportunity.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                         'bg-red-100 text-red-800'

  const frequencyText = opportunity.frequency <= 2 ? 'New Client' :
                       opportunity.frequency <= 8 ? 'Regular Client' :
                       'VIP Client'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Upselling Opportunity: {opportunity.clientName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Client Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                Client Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Client Status</p>
                  <Badge variant="secondary">{frequencyText}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Visit Frequency</p>
                  <p className="font-semibold">{opportunity.frequency} visits/year</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Visit</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {opportunity.lastVisit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Confidence Level</p>
                  <Badge className={confidenceColor}>
                    {opportunity.confidence}% Likely
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upselling Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Upselling Opportunity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current Service</p>
                  <p className="font-semibold">{opportunity.currentService}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Suggested Upgrade</p>
                  <p className="font-semibold text-green-600">{opportunity.suggestedService}</p>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Revenue Potential</span>
                </div>
                <p className="text-2xl font-bold text-green-600">+${opportunity.potentialRevenue}</p>
                <p className="text-sm text-green-700">Additional revenue per visit</p>
              </div>
            </CardContent>
          </Card>

          {/* Why This Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Why This Opportunity Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {opportunity.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Implementation Strategy */}
          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                <Clock className="w-4 h-4" />
                Recommended Implementation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <p className="mb-4">
                Based on this client's history and preferences, the best approach would be:
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Schedule a follow-up appointment or call</li>
                <li>Mention the enhanced service during their next visit</li>
                <li>Highlight the added value and convenience</li>
                <li>Offer a small discount for first-time upgrade</li>
              </ol>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={() => {
                onImplement(opportunity)
                onClose()
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Implement Strategy
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Review Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}