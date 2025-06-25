import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'https://sixfb-backend.onrender.com';

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 Emergency login route activated');
    
    const formData = await request.formData();
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    
    console.log('Login attempt for:', username);
    
    // Create form data for backend
    const backendFormData = new URLSearchParams();
    backendFormData.append('username', username);
    backendFormData.append('password', password);
    
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: backendFormData.toString(),
    });
    
    console.log('Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { error: 'Login failed', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Login successful for:', username);
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('Emergency login error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}