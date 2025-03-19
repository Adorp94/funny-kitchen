/**
 * Initializes application resources
 * This should be called on the client side when the app loads
 */
export async function initializeApp() {
  if (typeof window === 'undefined') return; // Skip on server-side
  
  try {
    console.log('Initializing application resources...');
    
    // Initialize Supabase storage buckets
    const response = await fetch('/api/supabase-init');
    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to initialize Supabase resources:', data.error);
    } else {
      console.log('Application resources initialized successfully');
    }
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
} 