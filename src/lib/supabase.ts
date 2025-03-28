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
  direccion_envio: string | null;
  recibe: string | null;
  atencion: string | null;
}

// Define the Producto type based on the database schema
export interface Producto {
  producto_id: number;
  nombre: string;
  tipo_ceramica: string | null;
  precio: number | null;
  sku: string | null;
  capacidad: number | null;
  unidad: string | null;
  tipo_producto: string | null;
  descripcion: string | null;
  colores: string | null;
  tiempo_produccion: number | null;
  cantidad_inventario: number | null;
  inventario: number | null;
}

// Search for clients by name or phone with pagination
export async function searchClientes(query: string, page = 0, pageSize = 20) {
  const supabase = createClientComponentClient();
  
  try {
    // Call the API endpoint directly
    const response = await fetch(`/api/clientes?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }
    
    const result = await response.json();
    
    // Check if result is in the new format (contains data property) or old format (array)
    if (Array.isArray(result)) {
      // Old API format
      return { 
        data: result, 
        error: null, 
        count: result.length, 
        hasMore: result.length === pageSize 
      };
    } else {
      // New API format
      return { 
        data: result.data || [], 
        error: null, 
        count: result.count || 0, 
        hasMore: result.hasMore || false 
      };
    }
  } catch (error) {
    console.error('Error searching clientes:', error);
    return { data: null, error, count: 0, hasMore: false };
  }
}

// Search for products by name or SKU with pagination
export async function searchProductos(query: string, page = 0, pageSize = 20) {
  const supabase = createClientComponentClient();
  
  try {
    // Call the API endpoint directly
    const response = await fetch(`/api/productos?query=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    
    const result = await response.json();
    
    // Check if result is in the new format (contains data property) or old format (array)
    if (Array.isArray(result)) {
      // Old API format
      return { 
        data: result, 
        error: null, 
        count: result.length, 
        hasMore: result.length === pageSize 
      };
    } else {
      // New API format
      return { 
        data: result.data || [], 
        error: null, 
        count: result.count || 0, 
        hasMore: result.hasMore || false 
      };
    }
  } catch (error) {
    console.error('Error searching productos:', error);
    return { data: null, error, count: 0, hasMore: false };
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

// Get a product by ID
export async function getProductoById(id: number) {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('producto_id', id)
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error getting producto by ID:', error);
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

// Insert a new product
export async function insertProducto(producto: Omit<Producto, 'producto_id'>) {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .insert({
        nombre: producto.nombre.trim(),
        tipo_ceramica: producto.tipo_ceramica || null,
        precio: producto.precio || 0,
        sku: producto.sku || null,
        capacidad: producto.capacidad || null,
        unidad: producto.unidad || null,
        tipo_producto: producto.tipo_producto || null,
        descripcion: producto.descripcion || null,
        colores: producto.colores || null,
        tiempo_produccion: producto.tiempo_produccion || null,
        cantidad_inventario: producto.cantidad_inventario || 0,
        inventario: producto.inventario || null
      })
      .select()
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error inserting producto:', error);
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

// Update an existing product
export async function updateProducto(producto: Partial<Producto> & { producto_id: number }) {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .update({
        nombre: producto.nombre,
        tipo_ceramica: producto.tipo_ceramica,
        precio: producto.precio,
        sku: producto.sku,
        capacidad: producto.capacidad,
        unidad: producto.unidad,
        tipo_producto: producto.tipo_producto,
        descripcion: producto.descripcion,
        colores: producto.colores,
        tiempo_produccion: producto.tiempo_produccion,
        cantidad_inventario: producto.cantidad_inventario,
        inventario: producto.inventario
      })
      .eq('producto_id', producto.producto_id)
      .select()
      .single();
      
    return { data, error };
  } catch (error) {
    console.error('Error updating producto:', error);
    return { data: null, error };
  }
} 