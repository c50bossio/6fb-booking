import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const pagesDir = path.join(process.cwd(), 'src/app')

  const calendarPages = [
    'enhanced-calendar-demo',
    'simple-calendar-demo',
    'test-calendar',
    'calendar-demo'
  ]

  const results = {}

  for (const page of calendarPages) {
    const pagePath = path.join(pagesDir, page, 'page.tsx')
    try {
      const exists = fs.existsSync(pagePath)
      results[page] = {
        exists,
        path: pagePath,
        url: `/${page}`
      }
    } catch (error) {
      results[page] = {
        exists: false,
        error: error.message
      }
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    cwd: process.cwd(),
    pages: results,
    nextVersion: process.env.NEXT_RUNTIME_VERSION || 'unknown'
  })
}
