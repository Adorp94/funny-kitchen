import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a Supabase client
export const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

// Export createClient function for compatibility
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseKey);
};

// Export default supabase client
export default supabase;

// Create a service role client for operations that need higher privileges
// This should only be used in server contexts (API routes, Server Actions, etc.)
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase; // Fallback to regular client if no service role key