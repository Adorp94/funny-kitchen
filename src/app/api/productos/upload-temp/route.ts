import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();
    
    // Validate that we have an array of productos
    if (!Array.isArray(body.productos)) {
      return NextResponse.json(
        { error: 'Expected an array of productos' },
        { status: 400 }
      );
    }

    const productos = body.productos;
    
    // Prepare data for insertion
    const insertData = productos.map((producto: any) => ({
      nombre: producto.nombre?.trim(),
      tipo_ceramica: producto.tipo_ceramica || null,
      precio: parseFloat(producto.precio) || 0,
      sku: producto.sku || null,
      capacidad: producto.capacidad ? parseInt(producto.capacidad) : null,
      unidad: producto.unidad || null,
      tipo_producto: producto.tipo_producto || null,
      colores: producto.colores || null,
      descripcion: producto.descripcion || null,
      cantidad_inventario: producto.cantidad_inventario ? parseInt(producto.cantidad_inventario) : 0
    }));

    // Insert into temporal table
    const { data, error } = await supabase
      .from('productos_temp')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Error inserting to productos_temp:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${data.length} productos uploaded to temporal table`,
      uploaded_count: data.length,
      data
    });

  } catch (error) {
    console.error('Error in upload-temp endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to upload productos to temporal table' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get all records from temporal table
    const { data, error } = await supabase
      .from('productos_temp')
      .select('*')
      .order('temp_id', { ascending: true });

    if (error) {
      console.error('Error fetching productos_temp:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      data
    });

  } catch (error) {
    console.error('Error in upload-temp GET endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch temporal productos' },
      { status: 500 }
    );
  }
} 