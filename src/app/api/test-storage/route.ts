import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Test basic connection with anon key
    const { data: anonData, error: anonError } = await supabase.auth.getSession();
    
    // Test service role connection
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    // Test specific bucket access
    const { data: bucketInfo, error: bucketError } = await supabaseAdmin.storage
      .getBucket('cotizacionpdf');
    
    // Create test buffer (simple text file)
    const testBuffer = Buffer.from('Test file for storage access', 'utf-8');
    
    // Test file upload
    const testFileName = `test-connection-${Date.now()}.txt`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('cotizacionpdf')
      .upload(testFileName, testBuffer, {
        contentType: 'text/plain',
        upsert: true
      });
    
    // Get URL for the test file
    const { data: urlData } = supabaseAdmin.storage
      .from('cotizacionpdf')
      .getPublicUrl(testFileName);
    
    // Delete test file to clean up
    const { data: deleteData, error: deleteError } = await supabaseAdmin.storage
      .from('cotizacionpdf')
      .remove([testFileName]);
    
    return NextResponse.json({
      success: true,
      anonConnection: {
        success: !anonError,
        error: anonError ? anonError.message : null
      },
      adminConnection: {
        success: !bucketsError,
        buckets: buckets?.map(b => b.name) || [],
        error: bucketsError ? bucketsError.message : null
      },
      bucketAccess: {
        success: !bucketError,
        bucketInfo: bucketInfo || null,
        error: bucketError ? bucketError.message : null
      },
      fileUpload: {
        success: !uploadError,
        path: uploadData?.path || null,
        error: uploadError ? uploadError.message : null,
        publicUrl: urlData?.publicUrl || null,
      },
      fileDelete: {
        success: !deleteError,
        error: deleteError ? deleteError.message : null
      }
    });
  } catch (error) {
    console.error('Storage test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 