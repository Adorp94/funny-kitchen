import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  console.log("[API /production/status GET] === STARTING REQUEST ===");
  
  const supabase = await createClient();

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