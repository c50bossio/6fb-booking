import { OAuthErrorHandler } from '@/components/auth/OAuthButtons'

export default function OAuthErrorPage() {
  return (
    <div className="container mx-auto max-w-md py-8">
      <OAuthErrorHandler />
    </div>
  )
}