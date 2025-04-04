import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './types';

// Create a Supabase client for use in server components and actions
export function createClient() {
  const cookieStore = cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

/**
 * Create a Supabase client specifically for API routes
 * This is a wrapper around createClient to make it easier to use in API routes
 */
export function createServerSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookies()
    }
  );
}

/**
 * Get the current user ID, with fallback options if authentication fails
 * Returns a valid user ID for database operations
 */
export async function getCurrentUserId(fallbackUserId = 1): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      // We need a numeric user ID for the database
      // First try to get user metadata, which might have a numeric ID
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData?.user?.user_metadata?.id) {
        const numericId = parseInt(userData.user.user_metadata.id);
        if (!isNaN(numericId)) {
          return numericId;
        }
      }
      
      // If no metadata ID, see if we can use the email to generate a consistent ID
      // This is a workaround and not ideal for production
      if (userData?.user?.email) {
        // Generate a simple hash from the email for a more consistent ID
        // This is just a placeholder approach - in production, store a proper mapping
        const emailHash = userData.user.email
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 0);
          
        return (emailHash % 1000) + 1; // Keep it reasonable size, avoid 0
      }
    }
    
    // Fallback: Return the default user ID
    console.warn('No valid user information found, using fallback user ID:', fallbackUserId);
    return fallbackUserId;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return fallbackUserId;
  }
}