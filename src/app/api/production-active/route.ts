import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('Production Active API: Starting GET request');
    
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('production_active_with_gap')
      .select('*'); // Remove default ordering to allow frontend sorting

    console.log('Supabase response - data:', data);
    console.log('Supabase response - error:', error);

    if (error) {
      console.error('Error fetching production active data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Returning successful response with', data?.length || 0, 'items');
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error in GET:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle both single record and bulk upload
    const records = Array.isArray(body) ? body : [body];
    const validRecords = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const { 
        producto_id, 
        pedidos = 0, 
        por_detallar = 0, 
        detallado = 0, 
        sancocho = 0, 
        terminado = 0 
      } = record;

      // Validate required fields
      if (!producto_id) {
        errors.push(`Record ${i + 1}: Missing required field (producto_id)`);
        continue;
      }

      // Validate numeric fields
      const numericFields = { pedidos, por_detallar, detallado, sancocho, terminado };
      let hasInvalidNumbers = false;
      
      for (const [field, value] of Object.entries(numericFields)) {
        if (isNaN(Number(value)) || Number(value) < 0) {
          errors.push(`Record ${i + 1}: Invalid ${field} value "${value}"`);
          hasInvalidNumbers = true;
        }
      }

      if (hasInvalidNumbers) continue;

      validRecords.push({
        producto_id: parseInt(producto_id),
        pedidos: parseInt(pedidos),
        por_detallar: parseInt(por_detallar),
        detallado: parseInt(detallado),
        sancocho: parseInt(sancocho),
        terminado: parseInt(terminado)
      });
    }

    if (validRecords.length === 0) {
      return NextResponse.json({ 
        error: 'No valid records to insert', 
        details: errors 
      }, { status: 400 });
    }

    // Upsert valid records
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('production_active')
      .upsert(validRecords, { 
        onConflict: 'producto_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Error upserting production active data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data,
      summary: {
        processed: validRecords.length,
        errors: errors.length,
        errorDetails: errors
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      producto_id, 
      pedidos, 
      por_detallar, 
      detallado, 
      sancocho, 
      terminado 
    } = body;

    if (!producto_id) {
      return NextResponse.json({ error: 'producto_id requerido' }, { status: 400 });
    }

    const updateData: any = {};
    if (pedidos !== undefined) updateData.pedidos = parseInt(pedidos);
    if (por_detallar !== undefined) updateData.por_detallar = parseInt(por_detallar);
    if (detallado !== undefined) updateData.detallado = parseInt(detallado);
    if (sancocho !== undefined) updateData.sancocho = parseInt(sancocho);
    if (terminado !== undefined) updateData.terminado = parseInt(terminado);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('production_active')
      .update(updateData)
      .eq('producto_id', producto_id)
      .select();

    if (error) {
      console.error('Error updating production active data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const producto_id = searchParams.get('producto_id');

    if (!producto_id) {
      return NextResponse.json({ error: 'producto_id requerido' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('production_active')
      .delete()
      .eq('producto_id', parseInt(producto_id));

    if (error) {
      console.error('Error deleting production active data:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 