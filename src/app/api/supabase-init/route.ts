import { NextRequest, NextResponse } from 'next/server';
import { initializeStorageBuckets } from '@/lib/supabase/initStorage';

// This route is called during app initialization to set up Supabase resources
export async function GET(request: NextRequest) {
  try {
    const result = await initializeStorageBuckets();
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to initialize storage buckets' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in storage initialization route:', error);
    return NextResponse.json(
      { error: 'Server error during initialization' },
      { status: 500 }
    );
  }
} 