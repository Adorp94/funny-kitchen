import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;
    
    console.log('[API /finanzas/cuentas-por-cobrar GET] Fetching accounts receivable with filters:', { page, limit, month, year });
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get total count using RPC function
    const { data: totalCount, error: countError } = await supabase
      .rpc('get_accounts_receivable_count', {
        p_year: year || null,
        p_month: month || null
      });
    
    if (countError) {
      console.error('Error getting accounts receivable count:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Get paginated data using RPC function
    const { data: accountsData, error: accountsError } = await supabase
      .rpc('get_accounts_receivable', {
        p_page: page,
        p_limit: limit,
        p_year: year || null,
        p_month: month || null
      });

    if (accountsError) {
      console.error('Error fetching accounts receivable:', accountsError);
      return NextResponse.json({ error: accountsError.message }, { status: 500 });
    }

    // Process and calculate fields
    const processedAccounts = accountsData?.map(account => {
      const total = Number(account.total || 0);
      const totalMxn = Number(account.total_mxn || account.total || 0);
      const pagado = Number(account.monto_pagado || 0);
      const pagadoMxn = Number(account.monto_pagado_mxn || account.monto_pagado || 0);
      
      const saldoPendiente = total - pagado;
      const saldoPendienteMxn = totalMxn - pagadoMxn;
      
      // Calculate days since approval
      const fechaAprobacion = new Date(account.fecha_aprobacion);
      const hoy = new Date();
      const diasTranscurridos = Math.floor((hoy.getTime() - fechaAprobacion.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        cotizacion_id: account.cotizacion_id,
        folio: account.folio,
        estado: account.estado,
        total,
        total_mxn: totalMxn,
        monto_pagado: pagado,
        monto_pagado_mxn: pagadoMxn,
        saldo_pendiente: saldoPendiente,
        saldo_pendiente_mxn: saldoPendienteMxn,
        porcentaje_completado: Number(account.porcentaje_completado || 0),
        dias_transcurridos: diasTranscurridos,
        fecha_aprobacion: account.fecha_aprobacion,
        cliente_nombre: account.cliente_nombre || 'Cliente Desconocido',
        cliente_celular: account.cliente_celular || '',
        cliente_correo: account.cliente_correo || '',
        moneda: account.moneda,
        categoria_vencimiento: diasTranscurridos > 30 ? 'vencida' : diasTranscurridos > 15 ? 'por_vencer' : 'reciente'
      };
    }) || [];

    const totalPages = Math.ceil((totalCount || 0) / limit);

    console.log(`[API /finanzas/cuentas-por-cobrar GET] Returning ${processedAccounts.length} accounts receivable items`);

    return NextResponse.json({
      success: true,
      data: processedAccounts,
      pagination: {
        page,
        totalPages,
        totalItems: totalCount || 0,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('[API /finanzas/cuentas-por-cobrar GET] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}