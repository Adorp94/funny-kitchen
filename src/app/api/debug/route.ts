import { NextResponse } from 'next/server';
import pkg from '../../../../package.json';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
    
    // Test Supabase connection
    let supabaseStatus = 'Not tested';
    let supabaseError = null;
    let cotizacionesCount = 0;
    
    try {
      const supabase = createServerSupabaseClient();
      
      // Try to fetch a simple count of cotizaciones
      const { count, error } = await supabase
        .from('cotizaciones')
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        supabaseStatus = 'Error';
        supabaseError = error.message;
      } else {
        supabaseStatus = 'Connected';
        cotizacionesCount = count || 0;
      }
    } catch (err) {
      supabaseStatus = 'Exception';
      supabaseError = err instanceof Error ? err.message : String(err);
    }
    
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
      envVars,
      supabase: {
        status: supabaseStatus,
        error: supabaseError,
        cotizacionesCount
      },
      // Safe version of the URL for checking
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0]}.***.supabase.co` 
        : 'Not set',
      deploymentUrl: process.env.VERCEL_URL || 'Not on Vercel',
      vercelEnv: process.env.VERCEL_ENV || 'Not on Vercel'
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 