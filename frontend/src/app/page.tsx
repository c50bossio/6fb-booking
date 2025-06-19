// import DashboardWithAPI from '@/components/DashboardWithAPI'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-8">
          6FB Platform - Deployment Success!
        </h1>
        <p className="text-center text-gray-600 mb-4">
          Your platform is deploying!
        </p>
        <p className="text-center text-sm text-gray-500">
          Backend API: {process.env.NEXT_PUBLIC_API_URL || 'Not configured'}
        </p>
      </div>
    </main>
  )
}