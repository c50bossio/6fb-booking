import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Store notification channels in memory (in production, use Redis or database)
const notificationChannels = new Map<string, {
  resourceId: string
  calendarId: string
  expiresAt: number
}>()

export async function POST(request: NextRequest) {
  try {
    const headersList = headers()

    // Verify the request is from Google
    const channelId = headersList.get('x-goog-channel-id')
    const resourceId = headersList.get('x-goog-resource-id')
    const resourceState = headersList.get('x-goog-resource-state')
    const messageNumber = headersList.get('x-goog-message-number')

    if (!channelId || !resourceId) {
      return NextResponse.json(
        { error: 'Invalid webhook notification' },
        { status: 400 }
      )
    }

    // Handle sync notification
    console.log('Google Calendar webhook received:', {
      channelId,
      resourceId,
      resourceState,
      messageNumber
    })

    // Resource states:
    // - sync: Initial sync message when watch is set up
    // - exists: Resource created or updated
    // - not_exists: Resource deleted

    if (resourceState === 'sync') {
      // Initial sync message, just acknowledge
      return NextResponse.json({ status: 'ok' })
    }

    // Get the calendar ID associated with this resource
    const channelInfo = notificationChannels.get(channelId)
    if (!channelInfo) {
      console.warn('Unknown channel ID:', channelId)
      return NextResponse.json({ status: 'ok' })
    }

    // Trigger a sync for the affected calendar
    // In a real implementation, this would notify the client via WebSocket
    // or queue a sync job
    const syncEvent = {
      type: 'calendar_changed',
      calendarId: channelInfo.calendarId,
      resourceState,
      timestamp: Date.now()
    }

    // Log the sync event (in production, send to client or queue)
    console.log('Triggering calendar sync:', syncEvent)

    // For now, just acknowledge the webhook
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Error processing Google Calendar webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle webhook verification (Google sends a GET request to verify the endpoint)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get('hub.challenge')
  const mode = searchParams.get('hub.mode')
  const topic = searchParams.get('hub.topic')

  if (mode === 'subscribe' && challenge) {
    // Verify the subscription request
    console.log('Google Calendar webhook verification:', { mode, topic })
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }

  return NextResponse.json({ status: 'ok' })
}
