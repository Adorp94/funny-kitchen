import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

// Create a single instance of the Supabase client for server-side use (Route Handlers, Server Actions)
// This uses the ANON KEY by default, suitable for public data access or RLS based on anon role.
// If you need SERVICE_ROLE access, you would create another client instance using the service role key.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in environment variables');
}

// Export the single instance
export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey);

// Remove the previous SSR-based client functions
/*
export function createClient() { ... }
export function createRouteHandlerClient() { ... }
*/