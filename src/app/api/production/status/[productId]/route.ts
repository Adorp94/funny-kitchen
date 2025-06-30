import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  console.log("[API /production/status GET] === STARTING REQUEST ===");
  
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
          cookieStore.remove(name, options);
        },
      },
    }
  );

  try {
    const productId = parseInt(params.productId);
    
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'ID de producto inválido' }, { status: 400 });
    }

    console.log(`[API /production/status GET] Fetching status for product ${productId}...`);

    // Get production status for the specific product
    const { data: productionStatus, error: statusError } = await supabase
      .from('production_active')
      .select('*')
      .eq('producto_id', productId)
      .single();

    if (statusError && statusError.code !== 'PGRST116') {
      console.error("[API /production/status GET] Error fetching production status:", statusError);
      return NextResponse.json({ error: 'Error al obtener estado de producción' }, { status: 500 });
    }

    // If no production_active record exists, create default values
    let status = productionStatus || {
      producto_id: productId,
      pedidos: 0,
      por_detallar: 0,
      detallado: 0,
      sancocho: 0,
      terminado: 0,
      piezas_en_proceso: 0
    };

    console.log("[API /production/status GET] Production status found:", status);

    return NextResponse.json({
      status,
      debug: {
        productId,
        hasExistingRecord: !!productionStatus
      }
    });

  } catch (error) {
    console.error('[API /production/status GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 