'use server';

import { revalidatePath } from 'next/cache';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/server';
import { ProductionPlannerService } from '@/services/productionPlannerService';
import { Database } from '@/lib/supabase/types';

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

interface AdvancePaymentData {
  monto: number;
  metodo_pago: string;
  porcentaje?: number;
  notas?: string;
}

interface UpdateStatusResult {
  success: boolean;
  cotizacion?: Database['public']['Tables']['cotizaciones']['Row'];
  error?: string;
  estimatedDeliveryDate?: string | null;
}

export async function updateCotizacionStatus(
  cotizacionId: number,
  newStatus: string,
  paymentData?: AdvancePaymentData
): Promise<UpdateStatusResult> {
  console.log('[Action updateCotizacionStatus] Called with:', { cotizacionId, newStatus, paymentData });
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('[Action updateCotizacionStatus] Error fetching user or user not authenticated:', userError);
    return { success: false, error: 'Usuario no autenticado.' };
  }
  const userId = user.id;
  console.log('[Action updateCotizacionStatus] Using user ID for operation:', userId);

  let finalDeliveryDateStr: string | null = null;
  let planningWarnings: string[] = [];

  try {
    const { data: existingCotizacion, error: getError } = await supabase
      .from('cotizaciones')
      .select('*, is_premium')
      .eq('cotizacion_id', cotizacionId)
      .single();
    
    if (getError) {
      console.error('[Action updateCotizacionStatus] Error fetching cotizacion:', getError);
      const errorMsg = getError.code === 'PGRST116' ? 'No se encontró la cotización' : `Error al obtener cotización: ${getError.message}`;
      return { success: false, error: errorMsg }; 
    }

    console.log('[Action updateCotizacionStatus] Existing cotizacion structure:', existingCotizacion);
    const isPremium = existingCotizacion.is_premium ?? false;
    
    const updateData: Partial<Database['public']['Tables']['cotizaciones']['Update']> = {
      estado: newStatus,
    };
    
    if (newStatus === 'producción') {
        updateData.estatus_pago = paymentData ? 'anticipo' : 'pendiente'; 
    } else if (newStatus === 'pendiente') { 
        // Reset payment status if moving back to pending?
        // updateData.estatus_pago = 'pendiente'; // Decide if this reset is needed
    }
    
    if (newStatus === 'producción') {
      updateData.fecha_aprobacion = new Date().toISOString();
    }
    
    console.log('[Action updateCotizacionStatus] Updating cotizacion with data:', updateData);
    const { data: updatedCotizacion, error: updateError } = await supabase
      .from('cotizaciones')
      .update(updateData)
      .eq('cotizacion_id', cotizacionId)
      .select('*')
      .single();
    
    if (updateError) {
      console.error('[Action updateCotizacionStatus] Error updating cotizacion:', updateError);
       return { success: false, error: `Error al actualizar estado: ${updateError.message}` };
    }
    
    if (!updatedCotizacion) {
      console.error('[Action updateCotizacionStatus] No cotizacion found after update attempt for ID:', cotizacionId);
       return { success: false, error: 'No se encontró la cotización después de intentar actualizar' };
    }
    
    console.log('[Action updateCotizacionStatus] Cotizacion updated successfully:', updatedCotizacion);
    
    if (newStatus === 'producción') {
      console.log(`[Action updateCotizacionStatus] Status is 'producción'. Initiating production planning for cotizacion ${cotizacionId}...`);
      
      console.log(`[Action updateCotizacionStatus] Fetching products for cotizacion ${cotizacionId}...`);
      const { data: cotizacionProductos, error: fetchProductsError } = await supabase
        .from('cotizacion_productos')
        .select('cotizacion_producto_id, producto_id, cantidad')
        .eq('cotizacion_id', cotizacionId);

      if (fetchProductsError) {
        const errorMsg = `Error fetching products for planning: ${fetchProductsError.message}`;
        console.error(`[Action updateCotizacionStatus] ${errorMsg}`);
        planningWarnings.push(errorMsg); 
      }

      if (!cotizacionProductos || cotizacionProductos.length === 0) {
        const warningMsg = `No products found for cotizacion ${cotizacionId}. Cannot initiate production planning.`;
        console.warn(`[Action updateCotizacionStatus] ${warningMsg}`);
        planningWarnings.push(warningMsg);
      } else {
        console.log(`[Action updateCotizacionStatus] Found ${cotizacionProductos.length} products to plan for cotizacion ${cotizacionId}.`);
        
        const plannerService = new ProductionPlannerService(supabase);
        let latestEtaEndDate: Date | null = null;

        for (const item of cotizacionProductos) {
          if (!item.producto_id || isNaN(Number(item.producto_id))) {
            const warningMsg = `Skipping planning for invalid producto_id in item: ${JSON.stringify(item)}`;
            console.warn(`[Action updateCotizacionStatus] ${warningMsg}`);
            planningWarnings.push(warningMsg);
            continue;
          }

          const currentProductId = Number(item.producto_id);
          console.log(`[Action updateCotizacionStatus] Processing product: cotizacion_producto_id=${item.cotizacion_producto_id}, producto_id=${currentProductId}, qty=${item.cantidad}`);

          const { data: productDetails, error: productFetchError } = await supabase
            .from('productos')
            .select('vueltas_max_dia')
            .eq('producto_id', currentProductId)
            .single();

          if (productFetchError || !productDetails) {
            const errorMsg = `Error fetching product details for ID ${currentProductId}: ${productFetchError?.message || 'Not found'}`;
            console.error(`[Action updateCotizacionStatus] ${errorMsg}`);
            planningWarnings.push(errorMsg);
            continue;
          }

          const vueltasMaxDia = productDetails.vueltas_max_dia ?? 1;
           console.log(`[Action updateCotizacionStatus] Product ${currentProductId} (cotizacion_producto_id: ${item.cotizacion_producto_id}) has vueltas_max_dia: ${vueltasMaxDia}`);

          try {
            const queueResult = await plannerService.addToQueueAndCalculateDates(
              item.cotizacion_producto_id,
              currentProductId,
              item.cantidad,
              isPremium,
              vueltasMaxDia
            );
            console.log(`[Action updateCotizacionStatus] Planning result for item ${item.cotizacion_producto_id}:`, queueResult);

            if (queueResult.eta_end_date) {
              const currentEndDate = new Date(queueResult.eta_end_date);
              if (!latestEtaEndDate || currentEndDate > latestEtaEndDate) {
                latestEtaEndDate = currentEndDate;
                console.log(`[Action updateCotizacionStatus] Updated latestEtaEndDate: ${latestEtaEndDate.toISOString().split('T')[0]}`);
              }
            }
          } catch (queueError: any) {
              const errorMsg = `Error adding item ${item.cotizacion_producto_id} (Product ID: ${currentProductId}) to production queue: ${queueError.message}`;
              console.error(`[Action updateCotizacionStatus] ${errorMsg}`, queueError);
              planningWarnings.push(errorMsg);
          }
        }

        if (latestEtaEndDate) {
          console.log(`[Action updateCotizacionStatus] Calculating final delivery date based on latest ETA: ${latestEtaEndDate.toISOString().split('T')[0]}`);
          const POST_PROCESSING_DAYS = 3;
          const SHIPPING_DAYS = 3;
              
          let deliveryDate = addBusinessDays(latestEtaEndDate, POST_PROCESSING_DAYS);
          deliveryDate = addBusinessDays(deliveryDate, SHIPPING_DAYS);
              
          finalDeliveryDateStr = deliveryDate.toISOString().split('T')[0];
          console.log(`[Action updateCotizacionStatus] Calculated finalDeliveryDate: ${finalDeliveryDateStr}`);

          console.log(`[Action updateCotizacionStatus] Updating cotizacion ${cotizacionId} with estimated_delivery_date: ${finalDeliveryDateStr}...`);
          const { error: updateDateError } = await supabase
            .from('cotizaciones')
            .update({ estimated_delivery_date: finalDeliveryDateStr })
            .eq('cotizacion_id', cotizacionId);

          if (updateDateError) {
            const errorMsg = `Error updating cotizacion ${cotizacionId} with final delivery date: ${updateDateError.message}`;
            console.error(`[Action updateCotizacionStatus] ${errorMsg}`);
            planningWarnings.push(errorMsg);
            finalDeliveryDateStr = null;
          } else {
            console.log(`[Action updateCotizacionStatus] Successfully updated cotizacion ${cotizacionId} with estimated_delivery_date.`);
            updatedCotizacion.estimated_delivery_date = finalDeliveryDateStr;
          }
        } else {
            const warningMsg = `No valid ETA end date found after processing items for cotizacion ${cotizacionId}. Cannot set estimated_delivery_date.`;
            console.warn(`[Action updateCotizacionStatus] ${warningMsg}`);
            if (cotizacionProductos.length > 0 && !planningWarnings.some(w => w.startsWith('Error fetching') || w.startsWith('Error adding'))) { 
                 planningWarnings.push("No se pudo calcular la fecha estimada de entrega.");
             }
        }
      }
    }
    
    try {
      const historialData = {
        cotizacion_id: cotizacionId,
        estado_anterior: existingCotizacion.estado,
        estado_nuevo: newStatus,
        usuario_id: userId,
        notas: `${paymentData?.notas || ''}${planningWarnings.length > 0 ? '\nPlanning Warnings: ' + planningWarnings.join('; ') : ''}`.trim() || null, 
      };
      
      console.log('[Action updateCotizacionStatus] Inserting history data:', historialData);
      
      const { error: historyError } = await supabase
        .from('cotizacion_historial')
        .insert(historialData);
      
      if (historyError) {
        console.error('[Action updateCotizacionStatus] Error recording history:', historyError);
      } else {
        console.log('[Action updateCotizacionStatus] History recorded successfully');
      }
    } catch (historyErr) {
      console.error('[Action updateCotizacionStatus] Failed to record status history:', historyErr);
    }
    
    if (paymentData) {
      try {
        console.log('[Action updateCotizacionStatus] Recording payment data:', paymentData);
        const tipoCambio = existingCotizacion.tipo_cambio || 1;
        const moneda = existingCotizacion.moneda || 'MXN';
        
        const montoMXN = (moneda === 'USD' || moneda === 'EUR') ? 
          paymentData.monto * tipoCambio : 
          paymentData.monto;
          
        const paymentInsertData = {
          cotizacion_id: cotizacionId,
          monto: paymentData.monto,
          monto_mxn: (moneda === 'USD' || moneda === 'EUR') ? montoMXN : null, 
          tipo_cambio: (moneda === 'USD' || moneda === 'EUR') ? tipoCambio : null,
          moneda: moneda,
          metodo_pago: paymentData.metodo_pago,
          notas: paymentData.notas || null,
          usuario_id: userId,
          porcentaje: paymentData.porcentaje ?? Math.round((paymentData.monto / (updatedCotizacion.total ?? paymentData.monto)) * 100),
        };
        
        console.log('[Action updateCotizacionStatus] Inserting payment data:', paymentInsertData);
        
        const { error: paymentError } = await supabase
          .from('pagos_anticipos')
          .insert(paymentInsertData);
        
        if (paymentError) {
          console.error('[Action updateCotizacionStatus] Error recording payment:', paymentError);
        } else {
          console.log('[Action updateCotizacionStatus] Payment recorded successfully');
          
          try {
              const { data: currentPaymentData, error: fetchPaymentError } = await supabase
                  .from('cotizaciones')
                  .select('monto_pagado, monto_pagado_mxn')
                  .eq('cotizacion_id', cotizacionId)
                  .single();

              if (fetchPaymentError) {
                   console.error('[Action updateCotizacionStatus] Error fetching current paid amount:', fetchPaymentError);
              } else {
                  const currentPaid = currentPaymentData?.monto_pagado || 0;
                  const currentPaidMxn = currentPaymentData?.monto_pagado_mxn || 0;
                  const newTotalPaid = currentPaid + paymentData.monto;
                  const newTotalPaidMxn = currentPaidMxn + montoMXN;
                  const totalCotizacion = updatedCotizacion.total || newTotalPaid;
                  const percentagePaid = totalCotizacion > 0 ? Math.round((newTotalPaid / totalCotizacion) * 100) : 100;

                  const { error: updatePaidAmountError } = await supabase
                    .from('cotizaciones')
                    .update({
                      monto_pagado: newTotalPaid,
                      monto_pagado_mxn: newTotalPaidMxn,
                      porcentaje_completado: percentagePaid,
                      fecha_pago_inicial: updatedCotizacion.fecha_pago_inicial || new Date().toISOString(),
                    })
                    .eq('cotizacion_id', cotizacionId);
                  
                  if (updatePaidAmountError) {
                    console.error('[Action updateCotizacionStatus] Error updating paid amount:', updatePaidAmountError);
                  } else {
                    console.log('[Action updateCotizacionStatus] Paid amount updated successfully');
                    updatedCotizacion.monto_pagado = newTotalPaid;
                    updatedCotizacion.monto_pagado_mxn = newTotalPaidMxn;
                    updatedCotizacion.porcentaje_completado = percentagePaid;
                    updatedCotizacion.fecha_pago_inicial = updatedCotizacion.fecha_pago_inicial || new Date().toISOString();
                  }
              }
          } catch (updateErr) {
            console.error('[Action updateCotizacionStatus] Failed to update paid amount:', updateErr);
          }
        }
      } catch (paymentErr) {
        console.error('[Action updateCotizacionStatus] Failed to record payment:', paymentErr);
      }
    }
    
    revalidatePath('/dashboard/cotizaciones');
    revalidatePath('/dashboard/finanzas');
    revalidatePath(`/dashboard/cotizaciones/${cotizacionId}`);
    revalidatePath('/produccion');
    
    console.log(`[Action updateCotizacionStatus] Action finished successfully for cotizacion ${cotizacionId}. Returning ETA: ${finalDeliveryDateStr}`);
    return { 
        success: true, 
        cotizacion: updatedCotizacion, 
        estimatedDeliveryDate: finalDeliveryDateStr
    }; 
    
  } catch (error) {
    console.error('[Action updateCotizacionStatus] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

export async function getCotizacionDetails(cotizacionId: number) {
  try {
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        cliente:cliente_id(nombre, celular, correo)
      `)
      .eq('cotizacion_id', cotizacionId)
      .single();
    
    if (cotizacionError) {
      throw new Error(`Error al obtener cotización: ${cotizacionError.message}`);
    }
    
    const { data: productos, error: productosError } = await supabase
      .from('cotizacion_productos')
      .select(`
        *,
        producto:producto_id(nombre, tipo_producto)
      `)
      .eq('cotizacion_id', cotizacionId);
    
    if (productosError) {
      throw new Error(`Error al obtener productos: ${productosError.message}`);
    }
    
    const formattedProductos = productos.map(item => ({
      id: item.cotizacion_producto_id.toString(),
      descripcion: item.descripcion || item.producto?.nombre || 'Producto personalizado',
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      precio_total: item.subtotal,
      descuento: item.descuento_producto,
      ...(item.colores && { colores: item.colores }),
      ...(item.acabado && { acabado: item.acabado }),
      producto_nombre: item.producto?.nombre,
      tipo_producto: item.producto?.tipo_producto
    }));
    
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .order('fecha_pago', { ascending: false });
    
    if (pagosError) {
      throw new Error(`Error al obtener pagos: ${pagosError.message}`);
    }
    
    return {
      success: true,
      data: {
        ...cotizacion,
        productos: formattedProductos,
        pagos: pagos
      }
    };
    
  } catch (error) {
    console.error('Error in getCotizacionDetails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export async function getAllAdvancePayments(page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;
    
    const { data: pagos, error: pagosError, count } = await supabase
      .from('pagos_anticipos')
      .select(`
        *,
        cotizacion_data:cotizacion_id(
          folio,
          cliente_id,
          moneda,
          total
        )
      `, { count: 'exact' })
      .order('fecha_pago', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (pagosError) {
      throw new Error(`Error al obtener pagos: ${pagosError.message}`);
    }
    
    const clienteIds = [...new Set(pagos.map(pago => pago.cotizacion_data?.cliente_id))].filter(Boolean);
    
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('cliente_id, nombre')
      .in('cliente_id', clienteIds);
    
    if (clientesError) {
      throw new Error(`Error al obtener clientes: ${clientesError.message}`);
    }
    
    const clienteMap = clientes.reduce((acc: { [key: number]: string }, cliente) => {
      acc[cliente.cliente_id] = cliente.nombre;
      return acc;
    }, {});
    
    const pagosConClientes = pagos.map(pago => ({
      ...pago,
      cliente_nombre: clienteMap[pago.cotizacion_data?.cliente_id as number] || 'Cliente desconocido',
      cotizacion: pago.cotizacion_data
    }));
    
    return {
      success: true,
      data: pagosConClientes,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
    
  } catch (error) {
    console.error('Error in getAllAdvancePayments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export async function getNextFolioNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  
  try {
    const { data: latestCotizacion, error: idError } = await supabase
      .from('cotizaciones')
      .select('cotizacion_id, folio')
      .order('cotizacion_id', { ascending: false })
      .limit(1)
      .single();
      
    console.log('Latest cotizacion found:', latestCotizacion);
    
    if (idError && idError.code !== 'PGRST116') {
      console.error('Error getting latest cotizacion ID:', idError);
      return fallbackGenerateFolio(currentYear, supabase);
    }
    
    if (!latestCotizacion) {
      console.log('No cotizaciones found, starting with 0001');
      return `COT-${currentYear}-0001`;
    }
    
    const nextNumber = latestCotizacion.cotizacion_id + 1;
    console.log(`Generating next folio based on cotizacion_id: ${latestCotizacion.cotizacion_id} → ${nextNumber}`);
    
    return `COT-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating next folio number:', error);
    return fallbackGenerateFolio(currentYear, supabase);
  }
}

async function fallbackGenerateFolio(currentYear: number, supabase: SupabaseClient) {
  try {
    console.log('Using fallback method to generate folio');
    const { data: latestCotizacion, error } = await supabase
      .from('cotizaciones')
      .select('folio')
      .ilike('folio', `COT-${currentYear}-%`)
      .order('cotizacion_id', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting latest cotizacion in fallback:', error);
      return `COT-${currentYear}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
    
    if (!latestCotizacion || !latestCotizacion.folio) {
      return `COT-${currentYear}-0001`;
    }
    
    const folioRegex = new RegExp(`COT-${currentYear}-(\\d+)`);
    const matches = latestCotizacion.folio.match(folioRegex);
    
    if (!matches || matches.length < 2) {
      return `COT-${currentYear}-0001`;
    }
    
    const lastNumber = parseInt(matches[1], 10);
    const nextNumber = lastNumber + 1;
    
    return `COT-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error in fallback folio generation:', error);
    return `COT-${currentYear}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
} 