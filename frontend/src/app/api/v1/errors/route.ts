import { NextRequest, NextResponse } from 'next/server';

/**
 * Error reporting endpoint for frontend errors
 * Accepts POST requests with error information and logs them
 */
export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();

    // Log the error (in production, you might want to send to a service like Sentry)
    console.error('Frontend Error Report:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      url: request.headers.get('referer'),
      ...errorData
    });

    return NextResponse.json(
      { status: 'error_logged', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing error report:', error);
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

/**
 * Health check for the error reporting endpoint
 */
export async function GET() {
  return NextResponse.json(
    { status: 'healthy', endpoint: 'error_reporting' },
    { status: 200 }
  );
}
