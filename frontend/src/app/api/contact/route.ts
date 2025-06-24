import { NextResponse } from 'next/server'

// Temporary contact API endpoint while we fix the contact page issue
export async function GET() {
  return NextResponse.json({
    message: 'Contact Us',
    email: 'support@6fb.com',
    response_time: '24 hours'
  })
}

export async function POST(request: Request) {
  const data = await request.json()
  // In production, this would send an email
  console.log('Contact form submission:', data)
  return NextResponse.json({ success: true, message: 'Message received' })
}