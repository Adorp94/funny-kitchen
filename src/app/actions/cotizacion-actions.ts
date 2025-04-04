'use server';

import { createServerSupabaseClient, getCurrentUserId } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

interface AdvancePaymentData {
  monto: number;
  metodo_pago: string;
  porcentaje: number;
  notas: string;
}

export async function updateCotizacionStatus(
  cotizacionId: number,
  newStatus: string,
  paymentData?: AdvancePaymentData
) {
  console.log('Update cotizacion status called with:', { cotizacionId, newStatus, paymentData });
  const supabase = createServerSupabaseClient();
  
  try {
    // Get user ID with fallback to system user if needed
    const userId = await getCurrentUserId();
    console.log('Using user ID for operation:', userId);
    
    // First, get the cotizacion to understand its structure
    const { data: existingCotizacion, error: getError } = await supabase
      .from('cotizaciones')
      .select('*')
      .eq('cotizacion_id', cotizacionId)
      .single();
    
    if (getError) {
      console.error('Error fetching cotizacion:', getError);
      throw new Error(`Error al obtener cotización: ${getError.message}`);
    }

    console.log('Existing cotizacion structure:', existingCotizacion);
    
    // Prepare update data
    const updateData: any = {
      estado: newStatus,
    };
    
    // Add estatus_pago update if needed
    if (['cerrada', 'aprobada'].includes(newStatus) && paymentData) {
      updateData.estatus_pago = 'anticipo';
    }
    
    // Update timestamp based on new status
    if (newStatus === 'aprobada') {
      updateData.fecha_aprobacion = new Date().toISOString();
    } else if (newStatus === 'cerrada') {
      updateData.fecha_cierre = new Date().toISOString();
    }
    
    // 1. Update the cotizacion status
    const { data: updatedCotizacion, error: updateError } = await supabase
      .from('cotizaciones')
      .update(updateData)
      .eq('cotizacion_id', cotizacionId)
      .select('*')
      .single();
    
    if (updateError) {
      console.error('Error updating cotizacion:', updateError);
      throw new Error(`Error al actualizar estado: ${updateError.message}`);
    }
    
    if (!updatedCotizacion) {
      console.error('No cotizacion found with ID:', cotizacionId);
      throw new Error('No se encontró la cotización');
    }
    
    console.log('Cotizacion updated successfully:', updatedCotizacion);
    
    // 2. Record the status change in history
    try {
      const historialData = {
        cotizacion_id: cotizacionId,
        estado_anterior: existingCotizacion.estado,
        estado_nuevo: newStatus,
        usuario_id: userId,
        notas: paymentData?.notas || null,
      };
      
      console.log('Inserting history data:', historialData);
      
      const { error: historyError } = await supabase
        .from('cotizacion_historial')
        .insert(historialData);
      
      if (historyError) {
        console.error('Error recording history:', historyError);
        console.log('Continuing despite history error');
      } else {
        console.log('History recorded successfully');
      }
    } catch (historyErr) {
      console.error('Failed to record status history:', historyErr);
      // Continue execution despite history recording failure
    }
    
    // 3. If payment data is provided for 'cerrada' or 'aprobada' status, record the advance payment
    if (['cerrada', 'aprobada'].includes(newStatus) && paymentData) {
      try {
        console.log('Recording payment for status:', newStatus, paymentData);
        const tipoCambio = existingCotizacion.tipo_cambio || 1;
        const moneda = existingCotizacion.moneda || 'MXN';
        
        // Calculate MXN amount if payment is in USD
        const montoMXN = moneda === 'USD' ? 
          paymentData.monto * tipoCambio : 
          paymentData.monto;
        
        const paymentInsertData = {
          cotizacion_id: cotizacionId,
          monto: paymentData.monto,
          monto_mxn: moneda === 'USD' ? montoMXN : null,
          tipo_cambio: moneda === 'USD' ? tipoCambio : null,
          moneda: moneda,
          metodo_pago: paymentData.metodo_pago,
          notas: paymentData.notas || '',
          usuario_id: userId,
          porcentaje: paymentData.porcentaje || Math.round((paymentData.monto / existingCotizacion.total) * 100),
        };
        
        console.log('Inserting payment data:', paymentInsertData);
        
        const { error: paymentError } = await supabase
          .from('pagos_anticipos')
          .insert(paymentInsertData);
        
        if (paymentError) {
          console.error('Error recording payment:', paymentError);
          console.log('Continuing despite payment error');
        } else {
          console.log('Payment recorded successfully');
          
          // Update monto_pagado and porcentaje_completado in cotizaciones
          try {
            const percentagePaid = Math.round((paymentData.monto / existingCotizacion.total) * 100);
            
            const { error: updatePaidAmountError } = await supabase
              .from('cotizaciones')
              .update({
                monto_pagado: paymentData.monto,
                monto_pagado_mxn: moneda === 'USD' ? montoMXN : paymentData.monto,
                porcentaje_completado: percentagePaid,
                fecha_pago_inicial: new Date().toISOString(),
              })
              .eq('cotizacion_id', cotizacionId);
            
            if (updatePaidAmountError) {
              console.error('Error updating paid amount:', updatePaidAmountError);
            } else {
              console.log('Paid amount updated successfully');
            }
          } catch (updateErr) {
            console.error('Failed to update paid amount:', updateErr);
          }
        }
      } catch (paymentErr) {
        console.error('Failed to record payment:', paymentErr);
      }
    }
    
    // Revalidate related paths
    revalidatePath('/dashboard/cotizaciones');
    revalidatePath('/dashboard/finanzas');
    revalidatePath(`/dashboard/cotizaciones/${cotizacionId}`);
    
    return { success: true, cotizacion: updatedCotizacion };
    
  } catch (error) {
    console.error('Error in updateCotizacionStatus:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

export async function getCotizacionDetails(cotizacionId: number) {
  const supabase = createServerSupabaseClient();
  
  try {
    // Get cotización details
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
    
    // Get productos
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
    
    // Format productos for frontend
    const formattedProductos = productos.map(item => ({
      id: item.cotizacion_producto_id.toString(),
      nombre: item.producto?.nombre || 'Producto personalizado',
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      precio_total: item.subtotal,
      descuento: item.descuento_producto
    }));
    
    // Get payments
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos_anticipos')
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
  const supabase = createServerSupabaseClient();
  
  try {
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get paginated payments with cotización info
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
    
    // Enrich with client info
    const clienteIds = [...new Set(pagos.map(pago => pago.cotizacion_data?.cliente_id))].filter(Boolean);
    
    // Get all clients in one query
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('cliente_id, nombre')
      .in('cliente_id', clienteIds);
    
    if (clientesError) {
      throw new Error(`Error al obtener clientes: ${clientesError.message}`);
    }
    
    // Create a lookup map for clients
    const clienteMap = clientes.reduce((acc, cliente) => {
      acc[cliente.cliente_id] = cliente.nombre;
      return acc;
    }, {});
    
    // Attach client names to payments
    const pagosConClientes = pagos.map(pago => ({
      ...pago,
      cliente_nombre: clienteMap[pago.cotizacion_data?.cliente_id] || 'Cliente desconocido',
      cotizacion: pago.cotizacion_data // Keep backward compatibility with existing code
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

/**
 * Gets the next consecutive folio number for a new cotizacion
 * Format: COT-{YEAR}-{SEQUENTIAL_NUMBER}
 */
export async function getNextFolioNumber() {
  const supabase = createServerSupabaseClient();
  const currentYear = new Date().getFullYear();
  
  try {
    // Get the latest quotation with a valid folio from the current year
    const { data: latestCotizacion, error } = await supabase
      .from('cotizaciones')
      .select('folio')
      .ilike('folio', `COT-${currentYear}-%`)
      .order('cotizacion_id', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned" error
      console.error('Error getting latest cotizacion:', error);
      // In case of error, create a random number as a fallback
      return `COT-${currentYear}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
    
    if (!latestCotizacion || !latestCotizacion.folio) {
      // If no cotizaciones exist for this year, start with 0001
      return `COT-${currentYear}-0001`;
    }
    
    // Extract the sequential number part from the folio (COT-YYYY-XXXX)
    const folioRegex = new RegExp(`COT-${currentYear}-(\\d+)`);
    const matches = latestCotizacion.folio.match(folioRegex);
    
    if (!matches || matches.length < 2) {
      // If the regex didn't match, start with 0001
      return `COT-${currentYear}-0001`;
    }
    
    // Get the last sequential number and increment by 1
    const lastNumber = parseInt(matches[1], 10);
    const nextNumber = lastNumber + 1;
    
    // Format with leading zeros to maintain 4 digits (e.g., 0001, 0012, 0123)
    return `COT-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating next folio number:', error);
    // Fallback to a random number in case of error
    return `COT-${currentYear}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
} 