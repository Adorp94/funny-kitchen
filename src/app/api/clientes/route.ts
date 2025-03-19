import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const query = searchParams.get('query');
  
  try {
    if (id) {
      // Get a specific client
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('cliente_id', id)
        .single();
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else if (query) {
      // Search clients
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .ilike('nombre', `%${query}%`)
        .order('nombre');
        
      if (error) throw error;
      
      return NextResponse.json(data);
    } else {
      // Get all clients
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');
        
      if (error) throw error;
      
      return NextResponse.json(data);
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
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nombre: body.nombre.trim().toUpperCase(),
        celular: body.celular,
        correo: body.correo || null,
        razon_social: body.razon_social || null,
        rfc: body.rfc || null,
        tipo_cliente: body.tipo_cliente || 'Normal',
        lead: body.lead || 'No',
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
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  
  if (!body.cliente_id) {
    return NextResponse.json(
      { error: 'Cliente ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const { data, error } = await supabase
      .from('clientes')
      .update({
        nombre: body.nombre ? body.nombre.trim().toUpperCase() : undefined,
        celular: body.celular,
        correo: body.correo,
        razon_social: body.razon_social,
        rfc: body.rfc,
        tipo_cliente: body.tipo_cliente,
        lead: body.lead,
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