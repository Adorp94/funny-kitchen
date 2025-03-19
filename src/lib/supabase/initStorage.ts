import { supabase } from "./client";

/**
 * Initializes the required Supabase storage buckets
 * This should be called during app initialization to ensure buckets exist
 */
export async function initializeStorageBuckets() {
  try {
    // Check if cotizaciones bucket exists
    const { data: buckets, error } = await supabase.storage.getBucket('cotizaciones');
    
    if (error && error.message.includes('does not exist')) {
      console.log('Creating cotizaciones bucket...');
      
      // Create the bucket with public access
      const { error: createError } = await supabase.storage.createBucket('cotizaciones', {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit for PDF files
      });
      
      if (createError) {
        throw createError;
      }
      
      console.log('Cotizaciones bucket created successfully');
    } else if (error) {
      throw error;
    } else {
      console.log('Cotizaciones bucket already exists');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
    return { success: false, error };
  }
} 