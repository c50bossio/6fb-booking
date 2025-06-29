import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Enterprise Dashboard - 6FB Platform',
  description: 'Monitor and manage performance across all locations',
}

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}