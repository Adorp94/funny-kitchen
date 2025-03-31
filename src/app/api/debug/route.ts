import { NextResponse } from 'next/server';
import pkg from '../../../../package.json';

export async function GET() {
  try {
    // Check environment variables (redacting sensitive info)
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
      AUTH0_BASE_URL: process.env.AUTH0_BASE_URL ? 'Set' : 'Not set',
      AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL ? 'Set' : 'Not set',
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID ? 'Set' : 'Not set',
      AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ? 'Set' : 'Not set',
      NODE_ENV: process.env.NODE_ENV,
    };
    
    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      packageVersions: {
        next: pkg.dependencies.next,
        react: pkg.dependencies.react,
        auth0: pkg.dependencies['@auth0/nextjs-auth0'],
        supabase: pkg.dependencies['@supabase/supabase-js'],
        supabaseSSR: pkg.dependencies['@supabase/ssr'] || 'Not installed',
      },
      envVars
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 