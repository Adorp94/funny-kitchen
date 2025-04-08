import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This is a debug endpoint to test direct access to productos table
export async function GET() {
  console.log("[Test Productos API] Called");
  
  try {
    // Create a direct Supabase client using environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("[Test Productos API] Missing Supabase credentials");
      return NextResponse.json({ 
        error: 'Missing Supabase credentials',
        env_keys_present: {
          NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      }, { status: 500 });
    }
    
    console.log("[Test Productos API] Creating Supabase client");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Perform a simple query to get all productos
    console.log("[Test Productos API] Fetching productos");
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error("[Test Productos API] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log("[Test Productos API] Success, found", data?.length || 0, "productos");
    
    // Return the data
    return NextResponse.json({
      message: 'Productos fetched successfully',
      count: data?.length || 0,
      data: data
    });
  } catch (err) {
    console.error("[Test Productos API] Unexpected error:", err);
    return NextResponse.json({ 
      error: 'Unexpected error',
      message: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
} 