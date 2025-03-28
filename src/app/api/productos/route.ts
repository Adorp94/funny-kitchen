import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const query = searchParams.get('query');
  const page = parseInt(searchParams.get('page') || '0');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const from = page * pageSize;
  
  console.log(`API request received for productos: id=${id}, query=${query}, page=${page}, pageSize=${pageSize}`);
  
  try {
    if (id) {
      // Get a specific product
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('producto_id', id)
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else if (query) {
      console.log(`Searching productos with query: "${query}"`);
      
      // Search products
      let searchQuery = supabase
        .from('productos')
        .select('*', { count: 'exact' });
        
      // Search across multiple fields: nombre, sku
      searchQuery = searchQuery
        .or(`nombre.ilike.%${query}%,sku.ilike.%${query}%`);
      
      // Apply pagination and order
      const { data, error, count } = await searchQuery
        .order('nombre')
        .range(from, from + pageSize - 1)
        .limit(pageSize);
        
      if (error) throw error;
      
      console.log(`Found ${data.length} results, total count: ${count}`);
      
      // Return results with pagination info
      return NextResponse.json({
        data,
        count,
        hasMore: data.length === pageSize
      });
    } else {
      console.log(`Fetching all productos, page: ${page}, pageSize: ${pageSize}`);
      
      // Get all products (paginated)
      const { data, error, count } = await supabase
        .from('productos')
        .select('*', { count: 'exact' })
        .order('nombre')
        .range(from, from + pageSize - 1)
        .limit(pageSize);
        
      if (error) throw error;
      
      console.log(`Found ${data.length} results, total count: ${count}`);
      
      return NextResponse.json({
        data,
        count,
        hasMore: data && data.length === pageSize
      });
    }
  } catch (error) {
    console.error('Error fetching productos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch productos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .insert({
        nombre: body.nombre.trim(),
        tipo_ceramica: body.tipo_ceramica || null,
        precio: body.precio || 0,
        sku: body.sku || null,
        capacidad: body.capacidad || null,
        unidad: body.unidad || null,
        tipo_producto: body.tipo_producto || null,
        descripcion: body.descripcion || null,
        colores: body.colores || null,
        tiempo_produccion: body.tiempo_produccion || null,
        cantidad_inventario: body.cantidad_inventario || 0,
        inventario: body.inventario || null
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      producto: data
    });
  } catch (error) {
    console.error('Error creating producto:', error);
    return NextResponse.json(
      { error: 'Failed to create producto' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  if (!body.producto_id) {
    return NextResponse.json(
      { error: 'Producto ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .update({
        nombre: body.nombre,
        tipo_ceramica: body.tipo_ceramica,
        precio: body.precio,
        sku: body.sku,
        capacidad: body.capacidad,
        unidad: body.unidad,
        tipo_producto: body.tipo_producto,
        descripcion: body.descripcion,
        colores: body.colores,
        tiempo_produccion: body.tiempo_produccion,
        cantidad_inventario: body.cantidad_inventario,
        inventario: body.inventario
      })
      .eq('producto_id', body.producto_id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      producto: data
    });
  } catch (error) {
    console.error('Error updating producto:', error);
    return NextResponse.json(
      { error: 'Failed to update producto' },
      { status: 500 }
    );
  }
}