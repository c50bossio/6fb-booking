'use client'

import React from 'react'
import { Button } from '../ui/Button'

interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  conflict?: any
  onResolve: (resolution: string) => void
}

export default function ConflictResolutionModal({ 
  isOpen, 
  onClose, 
  conflict, 
  onResolve 
}: ConflictResolutionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Appointment Conflict</h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            There is a scheduling conflict that needs to be resolved.
          </p>
          
          {conflict && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <p className="text-sm">
                <strong>Conflict Type:</strong> {conflict.type || 'Schedule overlap'}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => onResolve('reschedule')}
            variant="primary"
            className="w-full"
          >
            Reschedule Appointment
          </Button>
          
          <Button
            onClick={() => onResolve('modify')}
            variant="secondary"
            className="w-full"
          >
            Modify Time
          </Button>
          
          <Button
            onClick={() => onResolve('cancel')}
            variant="destructive"
            className="w-full"
          >
            Cancel Appointment
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}