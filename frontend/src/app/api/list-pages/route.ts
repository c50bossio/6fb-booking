import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const appDir = path.join(process.cwd(), 'src/app')
    const entries = fs.readdirSync(appDir, { withFileTypes: true })
    
    const pages = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.'))
      .map(entry => entry.name)
      .sort()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      appDirectory: appDir,
      pages: pages,
      totalPages: pages.length,
      calendarPages: pages.filter(p => p.includes('calendar')),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DEPLOYMENT: process.env.RAILWAY_ENVIRONMENT || 'unknown'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}