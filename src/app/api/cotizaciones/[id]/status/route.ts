import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { ProductionPlannerService } from '@/services/productionPlannerService';
import { Database } from '@/lib/supabase/types';
import { revalidatePath } from 'next/cache'; // Need revalidatePath here now

// --- Helper function (copied) ---
function addBusinessDays(startDate: Date, days: number): Date {
    const date = new Date(startDate.valueOf());
    let addedDays = 0;
    while (addedDays < days) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            addedDays++;
        }
    }
    return date;
}
// --- End Helper Function ---

interface PaymentFormData {
  monto: number;
  metodo_pago: string;
  porcentaje?: number;
  notas?: string;
}

interface RequestBody {
  newStatus: string;
  paymentData?: PaymentFormData;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cotizacionIdStr = params.id;
  const cotizacionId = parseInt(cotizacionIdStr, 10);

  // Create authenticated Supabase client
  const supabase = await createClient();

  if (isNaN(cotizacionId)) {
    return NextResponse.json({ error: 'ID de cotización inválido' }, { status: 400 });
  }

  let newStatus: string;
  let paymentData: PaymentFormData | undefined;

  try {
    const body: RequestBody = await request.json();
    newStatus = body.newStatus;
    paymentData = body.paymentData; // Store payment data
    console.log('[API /cotizaciones/[id]/status POST] Request received:', { cotizacionId, newStatus, paymentData });

    // Validate the new status
    const validStatus = ['pendiente', 'producción', 'cancelada', 'enviada', 'rechazada'];
    if (!validStatus.includes(newStatus)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    // Validate payment data if provided and status is producción
    if (newStatus === 'producción' && paymentData) {
      if (typeof paymentData.monto !== 'number' || paymentData.monto < 0) {
        return NextResponse.json({ error: 'El monto del pago debe ser mayor o igual a 0' }, { status: 400 });
      }
      if (!paymentData.metodo_pago || typeof paymentData.metodo_pago !== 'string') {
        return NextResponse.json({ error: 'El método de pago es requerido' }, { status: 400 });
      }
      // Ensure percentage is number if provided
      if (paymentData.porcentaje && typeof paymentData.porcentaje !== 'number') {
          paymentData.porcentaje = parseFloat(paymentData.porcentaje as any);
          if(isNaN(paymentData.porcentaje)) {
              return NextResponse.json({ error: 'Porcentaje inválido' }, { status: 400 });
          }
      }
    } else if (newStatus === 'producción' && !paymentData) {
      console.warn(`[API /cotizaciones/[id]/status POST] Moving cotizacion ${cotizacionId} to 'producción' without payment data.`);
    }

  } catch (error) {
     console.error('[API /cotizaciones/[id]/status POST] Error parsing request body:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cuerpo de solicitud inválido' },
      { status: 400 }
    );
  }

  // --- Logic moved from server action starts here --- 
  let finalDeliveryDateStr: string | null = null;
  let planningWarnings: string[] = [];

  try {
      // 1. REMOVE Authentication Check
      /*
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[API /cotizaciones/[id]/status POST] Error fetching user or user not authenticated:', userError);
        return NextResponse.json({ error: 'Usuario no autenticado.' }, { status: 401 }); // Use 401 for unauthorized
      }
      const userId = user.id;
      console.log('[API /cotizaciones/[id]/status POST] User authenticated:', userId);
      */
      // Assume no user ID is available
      const userId = null; // Set userId to null

      // 2. Fetch existing cotizacion
      const { data: existingCotizacion, error: getError } = await supabase
        .from('cotizaciones')
        .select('*, is_premium') 
        .eq('cotizacion_id', cotizacionId)
        .single();
      
      if (getError) {
        console.error('[API /cotizaciones/[id]/status POST] Error fetching cotizacion:', getError);
        const errorMsg = getError.code === 'PGRST116' ? 'No se encontró la cotización' : `Error al obtener cotización: ${getError.message}`;
        const status = getError.code === 'PGRST116' ? 404 : 500;
        return NextResponse.json({ error: errorMsg }, { status: status }); 
      }
      console.log('[API /cotizaciones/[id]/status POST] Fetched existing cotizacion');
      const isPremium = existingCotizacion.is_premium ?? false;

      // 3. Prepare and Update Cotizacion Status/Payment Info
      const updateData: Partial<Database['public']['Tables']['cotizaciones']['Update']> = {
        estado: newStatus,
      };
      if (newStatus === 'producción') {
        updateData.estatus_pago = paymentData ? 'anticipo' : 'pendiente'; 
        updateData.fecha_aprobacion = new Date().toISOString();
      }
      // Add other status specific updates if needed

      console.log('[API /cotizaciones/[id]/status POST] Updating cotizacion with data:', updateData);
      const { data: updatedCotizacionData, error: updateError } = await supabase
        .from('cotizaciones')
        .update(updateData)
        .eq('cotizacion_id', cotizacionId)
        .select('*') // Select all needed fields
        .single();
      
      if (updateError) {
        console.error('[API /cotizaciones/[id]/status POST] Error updating cotizacion:', updateError);
        return NextResponse.json({ error: `Error al actualizar estado: ${updateError.message}` }, { status: 500 });
      }
      if (!updatedCotizacionData) {
        console.error('[API /cotizaciones/[id]/status POST] No cotizacion found after update attempt for ID:', cotizacionId);
        return NextResponse.json({ error: 'No se encontró la cotización después de intentar actualizar' }, { status: 404 });
      }
      console.log('[API /cotizaciones/[id]/status POST] Cotizacion updated successfully');
      // Use updatedCotizacionData for subsequent logic
      const updatedCotizacion = updatedCotizacionData;
      
      // 4. Status Change to Production (automatic bitácora addition removed)
      if (newStatus === 'producción') {
          console.log(`[API /cotizaciones/[id]/status POST] Status changed to 'producción' for cotizacion ${cotizacionId}. Manual selection will be required to add products to bitácora.`);
      }

      // 5. Record History
      try {
          const historyNotes = `${paymentData?.notas || ''}${planningWarnings.length > 0 ? '\nPlanning Warnings: ' + planningWarnings.join('; ') : ''}`.trim() || null;
          const { error: historyError } = await supabase.from('cotizacion_historial')
            .insert({ 
                cotizacion_id: cotizacionId, 
                estado_anterior: existingCotizacion.estado, 
                estado_nuevo: newStatus, 
                usuario_id: userId, // Will insert null now 
                notas: historyNotes 
            });
          if (historyError) console.error('[API /cotizaciones/[id]/status POST] Error recording history:', historyError); // Log but don't fail
          else console.log('[API /cotizaciones/[id]/status POST] History recorded (without user ID)');
      } catch (historyErr) { console.error('[API /cotizaciones/[id]/status POST] Failed to record history:', historyErr); }

      // 6. Record Payment (if provided and amount > 0)
      if (paymentData && paymentData.monto > 0) {
          try {
            const tipoCambio = existingCotizacion.tipo_cambio || 1;
            const moneda = existingCotizacion.moneda || 'MXN';
            const montoMXN = (moneda === 'USD' || moneda === 'EUR') ? paymentData.monto * tipoCambio : paymentData.monto;
            // Use total from the *updated* cotizacion record fetched after status change
            const totalCotizacionForPercentage = updatedCotizacion.total ?? paymentData.monto; 
            const percentage = paymentData.porcentaje ?? Math.round((paymentData.monto / totalCotizacionForPercentage) * 100);
            
            // <<< CHANGE TABLE NAME and field name >>>
            const { error: paymentInsertError } = await supabase.from('pagos') // Target 'pagos' table
              .insert({
                  cotizacion_id: cotizacionId, 
                  monto: paymentData.monto, 
                  monto_mxn: (moneda === 'USD' || moneda === 'EUR') ? montoMXN : null,
                  tipo_cambio: (moneda === 'USD' || moneda === 'EUR') ? tipoCambio : null, 
                  moneda: moneda, 
                  metodo_pago: paymentData.metodo_pago,
                  notas: paymentData.notas || null, 
                  usuario_id: userId, // Will insert null now
                  porcentaje_aplicado: percentage, // Use correct column name
                  tipo_pago: 'anticipo', // Explicitly set tipo_pago (though it defaults)
                  estado: 'completado' // Explicitly set estado (though it defaults)
              });
              
            if (paymentInsertError) console.error('[API /cotizaciones/[id]/status POST] Error recording payment into PAGOS table:', paymentInsertError); // Log but don't fail
            else {
                console.log('[API /cotizaciones/[id]/status POST] Payment recorded into PAGOS table (without user ID)');
                // Update aggregate payment info on cotizacion
                try {
                    // Use values from the updatedCotizacion record
                    const currentPaid = updatedCotizacion.monto_pagado || 0;
                    const currentPaidMxn = updatedCotizacion.monto_pagado_mxn || 0;
                    const newTotalPaid = currentPaid + paymentData.monto;
                    const newTotalPaidMxn = currentPaidMxn + montoMXN;
                    const totalCotizacion = updatedCotizacion.total || newTotalPaid; // Use updated total
                    const percentagePaid = totalCotizacion > 0 ? Math.round((newTotalPaid / totalCotizacion) * 100) : 100;
                    
                    const { error: updatePaidAmountError } = await supabase.from('cotizaciones').update({
                        monto_pagado: newTotalPaid, 
                        monto_pagado_mxn: newTotalPaidMxn,
                        porcentaje_completado: percentagePaid,
                        fecha_pago_inicial: updatedCotizacion.fecha_pago_inicial || new Date().toISOString(),
                        // Also update estatus_pago here to ensure consistency after payment
                        estatus_pago: 'anticipo' 
                    }).eq('cotizacion_id', cotizacionId);
                    
                    if (updatePaidAmountError) console.error('[API /cotizaciones/[id]/status POST] Error updating paid amount on COTIZACIONES:', updatePaidAmountError);
                    else console.log('[API /cotizaciones/[id]/status POST] Paid amount updated on COTIZACIONES');
                } catch (updateErr) { console.error('[API /cotizaciones/[id]/status POST] Failed to update paid amount on COTIZACIONES:', updateErr); }
            }
          } catch (paymentErr) { console.error('[API /cotizaciones/[id]/status POST] Failed to record payment overall:', paymentErr); }
      }

      // 7. Revalidate Paths
      try {
          revalidatePath('/dashboard/cotizaciones');
          revalidatePath('/dashboard/finanzas');
          revalidatePath(`/dashboard/cotizaciones/${cotizacionId}`);
          revalidatePath('/produccion');
          console.log('[API /cotizaciones/[id]/status POST] Paths revalidated');
      } catch (revalError) {
           console.error('[API /cotizaciones/[id]/status POST] Failed to revalidate paths:', revalError);
      }

      // 8. Return Success Response
      const successMessage = `Estado actualizado a "${newStatus}".`;
      // Log planning warnings to console for debugging (don't show to user)
      if (planningWarnings.length > 0) {
        console.warn(`[API /cotizaciones/[id]/status POST] Planning warnings for cotizacion ${cotizacionId}:`, planningWarnings.join('; '));
      }
      console.log(`[API /cotizaciones/[id]/status POST] Action finished successfully for cotizacion ${cotizacionId}. ETA: ${finalDeliveryDateStr}`);
      return NextResponse.json({ 
        success: true,
        message: successMessage,
        cotizacion: updatedCotizacion, // Return updated cotizacion data
        estimatedDeliveryDate: finalDeliveryDateStr
      }, { status: 200 });

  } catch (error) {
    console.error('[API /cotizaciones/[id]/status POST] Unexpected error in handler:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error inesperado en el servidor' },
      { status: 500 }
    );
  }
} 