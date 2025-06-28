import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          6FB Booking
        </h1>
        <p className="text-lg text-gray-600">
          Simple booking platform for your business
        </p>
        <div className="pt-4">
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  )
}