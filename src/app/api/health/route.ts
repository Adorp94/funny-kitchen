import { NextResponse } from 'next/server';

// This endpoint doesn't use cookies or authentication, so it should work even with static generation
export async function GET() {
  console.log('[API] Health check endpoint called');
  
  try {
    // Return basic app and environment information
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      nextVersion: process.env.NEXT_RUNTIME || 'unknown',
      auth0Domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN ? 'configured' : 'missing',
      auth0ClientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? 'configured' : 'missing',
    });
  } catch (error) {
    console.error('[API] Health check error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 