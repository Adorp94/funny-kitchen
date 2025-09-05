import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { mesa_id, producto_id, cantidad_moldes } = body;

    if (!mesa_id || !producto_id || cantidad_moldes === undefined) {
      return NextResponse.json(
        { error: 'Mesa ID, producto ID and cantidad_moldes are required' },
        { status: 400 }
      );
    }

    // Check if producto already exists in this mesa
    const { data: existing, error: checkError } = await supabase
      .from('productos_en_mesa')
      .select('*')
      .eq('mesa_id', mesa_id)
      .eq('producto_id', producto_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      // If product exists, add to the existing quantity
      const newQuantity = existing.cantidad_moldes + parseInt(cantidad_moldes);
      
      const { data: updatedProducto, error: updateError } = await supabase
        .from('productos_en_mesa')
        .update({
          cantidad_moldes: newQuantity
        })
        .eq('id', existing.id)
        .select(`
          *,
          producto:productos(nombre, sku)
        `)
        .single();

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        action: 'updated',
        producto: {
          id: updatedProducto.id.toString(),
          producto_id: updatedProducto.producto_id,
          nombre: updatedProducto.producto.nombre,
          sku: updatedProducto.producto.sku,
          cantidad_moldes: updatedProducto.cantidad_moldes
        },
        addedQuantity: parseInt(cantidad_moldes),
        previousQuantity: existing.cantidad_moldes
      });
    }

    // If product doesn't exist, create new entry
    const { data: productoEnMesa, error } = await supabase
      .from('productos_en_mesa')
      .insert({
        mesa_id: parseInt(mesa_id),
        producto_id: parseInt(producto_id),
        cantidad_moldes: parseInt(cantidad_moldes)
      })
      .select(`
        *,
        producto:productos(nombre, sku)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      action: 'created',
      producto: {
        id: productoEnMesa.id.toString(),
        producto_id: productoEnMesa.producto_id,
        nombre: productoEnMesa.producto.nombre,
        sku: productoEnMesa.producto.sku,
        cantidad_moldes: productoEnMesa.cantidad_moldes
      }
    });
  } catch (error) {
    console.error('Error adding producto to mesa:', error);
    return NextResponse.json(
      { error: 'Failed to add producto to mesa' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, cantidad_moldes } = body;

    if (!id || cantidad_moldes === undefined) {
      return NextResponse.json(
        { error: 'ID and cantidad_moldes are required' },
        { status: 400 }
      );
    }

    const { data: productoEnMesa, error } = await supabase
      .from('productos_en_mesa')
      .update({
        cantidad_moldes: parseInt(cantidad_moldes)
      })
      .eq('id', id)
      .select(`
        *,
        producto:productos(nombre, sku)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      producto: {
        id: productoEnMesa.id.toString(),
        producto_id: productoEnMesa.producto_id,
        nombre: productoEnMesa.producto.nombre,
        sku: productoEnMesa.producto.sku,
        cantidad_moldes: productoEnMesa.cantidad_moldes
      }
    });
  } catch (error) {
    console.error('Error updating producto cantidad:', error);
    return NextResponse.json(
      { error: 'Failed to update producto cantidad' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get('id');

    if (!productoId) {
      return NextResponse.json(
        { error: 'Producto ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('productos_en_mesa')
      .delete()
      .eq('id', productoId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing producto from mesa:', error);
    return NextResponse.json(
      { error: 'Failed to remove producto from mesa' },
      { status: 500 }
    );
  }
} 