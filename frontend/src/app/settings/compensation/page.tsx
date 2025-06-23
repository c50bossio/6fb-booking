'use client'

import CompensationPlanManager from '@/components/CompensationPlanManager'

export default function CompensationPlansPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Compensation Plans</h1>
      <p className="text-gray-400">
        Manage compensation plans for your barbers. Create different plans for commission-based, 
        booth rent, or hybrid payment models.
      </p>
      <CompensationPlanManager />
    </div>
  )
}