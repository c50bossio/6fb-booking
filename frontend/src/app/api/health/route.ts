import { NextResponse } from 'next/server'

export async function GET() {
  // Check if we can reach the backend
  let backendStatus = 'unknown'
  
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(`${backendUrl}/health`, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    backendStatus = response.ok ? 'healthy' : 'unhealthy'
  } catch (error) {
    backendStatus = 'unreachable'
  }
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    backend: backendStatus,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV
  })
}