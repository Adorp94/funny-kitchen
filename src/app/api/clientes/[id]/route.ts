import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const id = context.params.id;
    
    // Get a specific client
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('cliente_id', id)
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching cliente:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cliente' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const clienteId = context.params.id;
    const body = await request.json();
    
    if (!clienteId) {
      return NextResponse.json(
        { error: 'Cliente ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Updating client with ID: ${clienteId}`, body);
    
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
      .eq('cliente_id', clienteId)
      .select()
      .single();
      
    if (error) throw error;
    
    console.log('Client updated successfully:', data);
    
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