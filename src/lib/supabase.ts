import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define the Cliente type based on the database schema
export interface Cliente {
  cliente_id: number;
  nombre: string;
  celular: string;
  correo: string | null;
  razon_social: string | null;
  rfc: string | null;
  tipo_cliente: string | null;
  lead: string | null;
  direccion_envio: string | null;
  recibe: string | null;
  atencion: string | null;
}

// Search for clients by name
export async function searchClientes(query: string) {
  const supabase = createClientComponentClient();
  
  try {
    if (!query || query.length < 2) {
      return { data: [], error: null };
    }
    
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .ilike('nombre', `%${query}%`)
      .order('nombre')
      .limit(10);
      
    return { data, error };
  } catch (error) {
    console.error('Error searching clientes:', error);
    return { data: null, error };
  }
}

// Get a client by ID
export async function getClienteById(id: number) {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('cliente_id', id)
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error getting cliente by ID:', error);
    return { data: null, error };
  }
}

// Insert a new client
export async function insertCliente(cliente: Omit<Cliente, 'cliente_id'>) {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nombre: cliente.nombre.trim(),
        celular: cliente.celular,
        correo: cliente.correo || null,
        razon_social: cliente.razon_social || null,
        rfc: cliente.rfc || null,
        tipo_cliente: cliente.tipo_cliente || 'Normal',
        lead: cliente.lead || null,
        direccion_envio: cliente.direccion_envio || null,
        recibe: cliente.recibe || null,
        atencion: cliente.atencion || null
      })
      .select()
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error inserting cliente:', error);
    return { data: null, error };
  }
}

// Update an existing client
export async function updateCliente(cliente: Partial<Cliente> & { cliente_id: number }) {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from('clientes')
      .update({
        nombre: cliente.nombre,
        celular: cliente.celular,
        correo: cliente.correo,
        razon_social: cliente.razon_social,
        rfc: cliente.rfc,
        tipo_cliente: cliente.tipo_cliente,
        lead: cliente.lead,
        direccion_envio: cliente.direccion_envio,
        recibe: cliente.recibe,
        atencion: cliente.atencion
      })
      .eq('cliente_id', cliente.cliente_id)
      .select()
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error updating cliente:', error);
    return { data: null, error };
  }
} 