import { supabaseAdmin } from "./client";

/**
 * Initializes the required Supabase storage buckets
 * This should be called during app initialization to ensure buckets exist
 */
export async function initializeStorageBuckets() {
  try {
    // Check if cotizacionpdf bucket exists
    const { data: buckets, error } = await supabaseAdmin.storage.getBucket('cotizacionpdf');
    
    if (error && error.message.includes('does not exist')) {
      console.log('Creating cotizacionpdf bucket...');
      
      // Create the bucket with public access
      const { error: createError } = await supabaseAdmin.storage.createBucket('cotizacionpdf', {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit for PDF files
      });
      
      if (createError) {
        throw createError;
      }
      
      console.log('Cotizacionpdf bucket created successfully');
    } else if (error) {
      throw error;
    } else {
      console.log('Cotizacionpdf bucket already exists');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
    return { success: false, error };
  }
} 