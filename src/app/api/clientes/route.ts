import { NextRequest, NextResponse } from 'next/server';
// Import the simple Supabase client instance
import { supabase } from '@/lib/supabase/server';

// Force dynamic execution for Route Handler
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const from = page * pageSize;
    
    console.log(`API request received: id=${id}, search=${search}, page=${page}, pageSize=${pageSize}`);
    
    if (id) {
      // Get a specific client
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('cliente_id', id)
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else if (search) {
      console.log(`Searching clients with search term: "${search}"`);
      
      // Search clients
      let searchQuery = supabase
        .from('clientes')
        .select('*', { count: 'exact' });
        
      // Search across multiple fields: nombre, celular, correo, rfc
      searchQuery = searchQuery
        .or(`nombre.ilike.%${search}%,celular.ilike.%${search}%,correo.ilike.%${search}%,rfc.ilike.%${search}%`);
      
      // Apply pagination and order
      const { data, error, count } = await searchQuery
        .order('nombre')
        .range(from, from + pageSize - 1)
        .limit(pageSize);
        
      if (error) throw error;
      
      console.log(`Found ${data.length} results, total count: ${count}`);
      
      // Prepare the response object
      const responseObject = {
        clientes: data,
        count,
        hasMore: data.length === pageSize
      };
      
      // Log the object just before returning
      console.log('API returning object:', JSON.stringify(responseObject));
      
      // Return results with pagination info
      return NextResponse.json(responseObject);
    } else {
      console.log(`Fetching all clients (no search term), page: ${page}, pageSize: ${pageSize}`);
      
      // Get all clients (paginated)
      const { data, error, count } = await supabase
        .from('clientes')
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
    console.error('Error fetching clientes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nombre: body.nombre.trim().toUpperCase(),
        celular: body.celular,
        correo: body.correo || null,
        razon_social: body.razon_social || null,
        rfc: body.rfc || null,
        tipo_cliente: body.tipo_cliente || 'Normal',
        direccion_envio: body.direccion_envio || null,
        recibe: body.recibe || null,
        atencion: body.atencion || null
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      cliente: data
    });
  } catch (error) {
    console.error('Error creating cliente:', error);
    return NextResponse.json(
      { error: 'Failed to create cliente' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.cliente_id) {
      return NextResponse.json(
        { error: 'Cliente ID is required' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('clientes')
      .update({
        nombre: body.nombre ? body.nombre.trim().toUpperCase() : undefined,
        celular: body.celular,
        correo: body.correo,
        razon_social: body.razon_social,
        rfc: body.rfc,
        tipo_cliente: body.tipo_cliente,
        direccion_envio: body.direccion_envio,
        recibe: body.recibe,
        atencion: body.atencion
      })
      .eq('cliente_id', body.cliente_id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      cliente: data
    });
  } catch (error) {
    console.error('Error updating cliente:', error);
    return NextResponse.json(
      { error: 'Failed to update cliente' },
      { status: 500 }
    );
  }
}