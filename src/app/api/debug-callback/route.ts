import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Log all the query parameters to see what we're getting
  const params = Object.fromEntries(searchParams.entries());
  
  console.log('Debug callback params:', JSON.stringify(params, null, 2));
  
  return NextResponse.json({
    url: request.url,
    params: params,
    message: 'Check server logs for full details'
  });
}