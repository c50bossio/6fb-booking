'use client'

import { BuilderComponent, builder } from '@builder.io/react'
import { useEffect, useState } from 'react'

// Initialize Builder.io with your API key
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY!)

export default function BuilderTestPage() {
  const [content, setContent] = useState(null)

  useEffect(() => {
    // Fetch the page content from Builder.io
    builder.get('page', {
      url: '/builder-test'
    }).promise().then(setContent)
  }, [])

  return (
    <div className="min-h-screen">
      <h1 className="text-2xl font-bold p-4">Builder.io Test Page</h1>
      {content ? (
        <BuilderComponent model="page" content={content} />
      ) : (
        <div className="p-4">
          <p>Loading Builder.io content...</p>
          <p className="text-sm text-gray-600 mt-2">
            If you see this message, the connection is working but no content exists yet.
            Create content in the Builder.io visual editor.
          </p>
        </div>
      )}
    </div>
  )
}