import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to get proper headers for the backend request
function getBackendHeaders(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('content-type') || 'application/json',
    'Accept': 'application/json',
  };

  // Forward authorization header if present
  const auth = request.headers.get('authorization');
  if (auth) {
    headers['Authorization'] = auth;
  }

  return headers;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/${path}${request.nextUrl.search}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getBackendHeaders(request),
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error('Proxy GET error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/${path}`;

  console.log('[API Proxy] POST request to:', url);

  try {
    // Handle different content types
    const contentType = request.headers.get('content-type') || '';
    let body: string | FormData;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // For OAuth2 login
      body = await request.text();
      console.log('[API Proxy] Form data request');
    } else if (contentType.includes('multipart/form-data')) {
      body = await request.formData();
      console.log('[API Proxy] Multipart form data request');
    } else {
      // Default to JSON
      const jsonBody = await request.json();
      body = JSON.stringify(jsonBody);
      console.log('[API Proxy] JSON request body keys:', Object.keys(jsonBody));
    }

    const headers = getBackendHeaders(request);
    console.log('[API Proxy] Request headers:', Object.keys(headers));

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    console.log('[API Proxy] Backend response status:', response.status);

    // Check if response has content
    const responseText = await response.text();
    console.log('[API Proxy] Response text length:', responseText.length);
    console.log('[API Proxy] Response text preview:', responseText.substring(0, 500));

    if (!responseText) {
      console.error('[API Proxy] Empty response from backend');
      return NextResponse.json(
        { error: 'Empty response from backend' },
        { status: response.status || 500 }
      );
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[API Proxy] Failed to parse response as JSON:', parseError);
      console.error('[API Proxy] Full response text:', responseText);

      // Try to extract just the error message if this is an error response
      if (response.status >= 400) {
        // For error responses, try to extract a simpler error message
        const simpleError = responseText.includes('Email already registered')
          ? 'Email already registered'
          : `Server error: ${response.statusText}`;

        return NextResponse.json(
          { error: simpleError, message: simpleError },
          { status: response.status }
        );
      }

      return NextResponse.json(
        { error: 'Invalid JSON response from backend', details: responseText.substring(0, 200) },
        { status: 500 }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  } catch (error: any) {
    console.error('[API Proxy] POST error:', error);
    console.error('[API Proxy] Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });

    return NextResponse.json(
      {
        error: 'Proxy request failed',
        message: error.message,
        url: url
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/${path}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: getBackendHeaders(request),
      body: JSON.stringify(await request.json()),
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error('Proxy PUT error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/${path}`;

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: getBackendHeaders(request),
      body: JSON.stringify(await request.json()),
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error('Proxy PATCH error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = `${BACKEND_URL}/${path}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getBackendHeaders(request),
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error('Proxy DELETE error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Handle preflight requests
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
