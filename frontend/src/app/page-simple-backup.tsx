export default function SimplePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Server is Working!
        </h1>
        <p className="text-xl text-gray-600">
          Development server is stable and running.
        </p>
        <div className="mt-6 space-x-4">
          <a href="/login" className="bg-blue-600 text-white px-6 py-2 rounded">
            Login
          </a>
          <a href="/signup" className="bg-green-600 text-white px-6 py-2 rounded">
            Sign Up
          </a>
        </div>
      </div>
    </div>
  )
}
