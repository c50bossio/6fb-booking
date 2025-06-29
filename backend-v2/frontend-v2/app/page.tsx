import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { LogoFull } from '@/components/ui/Logo'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <LogoFull variant="color" size="xl" className="mx-auto mb-8" href="#" />
        <p className="text-xl text-gray-700 dark:text-gray-300 max-w-lg mx-auto">
          Professional booking and business management platform built on the Six Figure Barber methodology
        </p>
        <div className="pt-8 space-y-4">
          <Link href="/login">
            <Button variant="primary" size="lg" className="min-w-[200px]">
              Sign In
            </Button>
          </Link>
          <div>
            <Link href="/register" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm">
              Don't have an account? Sign up
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}