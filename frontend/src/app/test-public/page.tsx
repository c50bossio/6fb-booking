export default function TestPublicPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Test Public Page
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          This page should be accessible without authentication.
        </p>
        <p className="text-lg text-gray-500">
          If you can see this, the public route handling is working.
        </p>
        <div className="mt-8 space-x-4">
          <a href="/" className="text-blue-600 hover:underline">
            Go to Landing Page
          </a>
          <a href="/login" className="text-blue-600 hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    </div>
  );
}
