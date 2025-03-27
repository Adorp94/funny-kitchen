import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Cliente related functions
export async function searchClientes(searchTerm: string, limit: number = 5) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .ilike('nombre', `%${searchTerm}%`)
      .limit(limit);
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error searching clientes:', error);
    return { data: null, error };
  }
}

export async function getClienteById(clienteId: number) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('cliente_id', clienteId)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting cliente by ID:', error);
    return { data: null, error };
  }
}

export async function insertCliente(cliente: Omit<any, 'cliente_id'>) {
  try {
    // Get the highest cliente_id to generate a new one
    const { data: maxIdData, error: maxIdError } = await supabase
      .from('clientes')
      .select('cliente_id')
      .order('cliente_id', { ascending: false })
      .limit(1);
    
    if (maxIdError) throw maxIdError;
    
    // Generate new cliente_id
    const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].cliente_id + 1 : 1;
    
    // Insert new cliente
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ ...cliente, cliente_id: nextId }])
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error inserting cliente:', error);
    return { data: null, error };
  }
}

export async function updateCliente(cliente_id: number, updates: Partial<any>) {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .update(updates)
      .eq('cliente_id', cliente_id)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating cliente:', error);
    return { data: null, error };
  }
}

// Generic query function
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryFn();
    return result;
  } catch (error) {
    console.error('Error executing query:', error);
    return { data: null, error };
  }
} 