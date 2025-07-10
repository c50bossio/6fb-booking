import SixFBComplianceDashboard from '@/components/compliance/SixFBComplianceDashboard'

export default function CompliancePage() {
  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <SixFBComplianceDashboard />
    </div>
  )
}

export const metadata = {
  title: 'Six Figure Barber Compliance | BookedBarber',
  description: 'Track your alignment with Six Figure Barber methodology and improve your business performance',
}