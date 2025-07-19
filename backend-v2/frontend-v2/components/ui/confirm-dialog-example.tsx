'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, useConfirmDialog } from './confirm-dialog'
import { TrashIcon } from '@heroicons/react/24/outline'

// Example 1: Basic usage with state management
export function DeleteButtonExample() {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    // Your delete logic here
    }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setShowConfirm(true)}
      >
        <TrashIcon className="h-4 w-4 mr-2" />
        Delete Item
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleDelete}
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </>
  )
}

// Example 2: Using the convenience hook
export function DeleteWithHookExample() {
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Client',
      description: 'This will permanently delete the client and all associated data. This action cannot be undone.',
      confirmText: 'Delete Client',
      variant: 'danger'
    })

    if (confirmed) {
      // Perform delete action
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={handleDelete}>
        Delete Client
      </Button>
      <ConfirmDialog />
    </>
  )
}

// Example 3: Replacing browser confirm() calls
export function ReplaceConfirmExample() {
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleAction = async () => {
    // OLD WAY:
    // if (confirm('Are you sure you want to cancel this appointment?')) {
    //   cancelAppointment()
    // }

    // NEW WAY:
    const confirmed = await confirm({
      title: 'Cancel Appointment',
      description: 'Are you sure you want to cancel this appointment? The client will be notified.',
      confirmText: 'Cancel Appointment',
      cancelText: 'Keep Appointment',
      variant: 'warning'
    })

    if (confirmed) {
      // cancelAppointment()
      }
  }

  return (
    <>
      <Button onClick={handleAction}>
        Cancel Appointment
      </Button>
      <ConfirmDialog />
    </>
  )
}

// Example 4: Different variants
export function VariantExamples() {
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const examples = [
    {
      label: 'Danger Action',
      variant: 'danger' as const,
      action: () => confirm({
        title: 'Delete Account',
        description: 'This will permanently delete your account and all data.',
        variant: 'danger',
        confirmText: 'Delete Account'
      })
    },
    {
      label: 'Warning Action',
      variant: 'warning' as const,
      action: () => confirm({
        title: 'Unsaved Changes',
        description: 'You have unsaved changes. Are you sure you want to leave?',
        variant: 'warning',
        confirmText: 'Leave Page',
        cancelText: 'Stay'
      })
    },
    {
      label: 'Info Action',
      variant: 'info' as const,
      action: () => confirm({
        title: 'Enable Notifications',
        description: 'Would you like to receive push notifications for new bookings?',
        variant: 'info',
        confirmText: 'Enable',
        cancelText: 'Not Now'
      })
    },
    {
      label: 'Success Action',
      variant: 'success' as const,
      action: () => confirm({
        title: 'Accept Payment',
        description: 'Confirm receipt of $50.00 payment from John Doe?',
        variant: 'success',
        confirmText: 'Accept Payment'
      })
    }
  ]

  return (
    <>
      <div className="space-y-2">
        {examples.map(({ label, action }) => (
          <Button key={label} variant="outline" onClick={action}>
            {label}
          </Button>
        ))}
      </div>
      <ConfirmDialog />
    </>
  )
}