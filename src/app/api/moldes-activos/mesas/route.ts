import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    const { data: mesas, error } = await supabase
      .from('mesas_moldes')
      .select(`
        *,
        mesa_productos:productos_en_mesa(
          *,
          producto:productos(nombre, sku)
        )
      `)
      .order('numero', { ascending: true });

    if (error) throw error;

    // Transform the data to match our interface
    const transformedMesas = mesas?.map(mesa => ({
      id: mesa.id.toString(),
      nombre: mesa.nombre,
      numero: mesa.numero,
      productos: mesa.mesa_productos?.map((mp: any) => ({
        id: mp.id.toString(),
        producto_id: mp.producto_id,
        nombre: mp.producto.nombre,
        sku: mp.producto.sku,
        cantidad_moldes: mp.cantidad_moldes
      })) || []
    })) || [];

    return NextResponse.json(transformedMesas);
  } catch (error) {
    console.error('Error fetching mesas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mesas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    const body = await request.json();
    const { nombre, numero } = body;

    if (!nombre || !numero) {
      return NextResponse.json(
        { error: 'Nombre and numero are required' },
        { status: 400 }
      );
    }

    const { data: mesa, error } = await supabase
      .from('mesas_moldes')
      .insert({
        nombre: nombre.trim(),
        numero: parseInt(numero)
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mesa: {
        id: mesa.id.toString(),
        nombre: mesa.nombre,
        numero: mesa.numero,
        productos: []
      }
    });
  } catch (error) {
    console.error('Error creating mesa:', error);
    return NextResponse.json(
      { error: 'Failed to create mesa' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    const { searchParams } = new URL(request.url);
    const mesaId = searchParams.get('id');

    if (!mesaId) {
      return NextResponse.json(
        { error: 'Mesa ID is required' },
        { status: 400 }
      );
    }

    // First delete all productos in the mesa
    await supabase
      .from('productos_en_mesa')
      .delete()
      .eq('mesa_id', mesaId);

    // Then delete the mesa
    const { error } = await supabase
      .from('mesas_moldes')
      .delete()
      .eq('id', mesaId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting mesa:', error);
    return NextResponse.json(
      { error: 'Failed to delete mesa' },
      { status: 500 }
    );
  }
} 