import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ContactsSectionProps {
  userRole?: string
}

export default function ContactsSection({ userRole }: ContactsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marketing Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Marketing contacts management coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}