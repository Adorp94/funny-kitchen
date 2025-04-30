"use server";

// Import the exported Supabase client instance directly
import { supabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Types for financial data
interface FinancialMetrics {
  ingresos: { mxn: number; usd: number };
  egresos: { mxn: number; usd: number };
  balance: { mxn: number; usd: number };
  cotizacionesPagadas: number;
}

interface IngresoData {
  anticipo_id: number;
  cotizacion_id: number;
  folio: string;
  cliente_nombre: string;
  moneda: string;
  monto: number;
  monto_mxn: number;
  metodo_pago: string;
  fecha_pago: string;
  porcentaje: number;
  // notes and comprobante_url are removed / already optional
}

interface EgresoData {
  egreso_id: number;
  descripcion: string;
  categoria: string;
  fecha: string;
  monto: number;
  monto_mxn: number;
  moneda: string;
  metodo_pago: string;
  comprobante_url?: string | null;
  notas?: string | null;
}

interface PaginationResult {
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// Server action to get financial metrics
export async function getFinancialMetrics(): Promise<{ success: boolean; data?: FinancialMetrics; error?: string }> {
  try {
    // Use the imported supabase instance directly
    // const supabase = createClient(); <-- Remove this line
    
    // Get total ingresos in MXN
    const { data: ingresosMXN, error: errorIngresosMXN } = await supabase
      .from('cotizacion_pagos_view')
      .select('monto_mxn')
      .eq('moneda', 'MXN');
    
    // Get total ingresos in USD
    const { data: ingresosUSD, error: errorIngresosUSD } = await supabase
      .from('cotizacion_pagos_view')
      .select('monto')
      .eq('moneda', 'USD');
    
    // Get total egresos in MXN
    const { data: egresosMXN, error: errorEgresosMXN } = await supabase
      .from('egresos')
      .select('monto_mxn')
      .eq('moneda', 'MXN');
    
    // Get total egresos in USD
    const { data: egresosUSD, error: errorEgresosUSD } = await supabase
      .from('egresos')
      .select('monto')
      .eq('moneda', 'USD');
    
    // Get count of paid cotizaciones
    const { count: cotizacionesPagadas, error: errorCotizaciones } = await supabase
      .from('cotizaciones')
      .select('*', { count: 'exact', head: true })
      .eq('estatus_pago', 'pagado');
    
    // Log any errors but continue with available data
    if (errorIngresosMXN) console.error('Error fetching MXN ingresos:', errorIngresosMXN);
    if (errorIngresosUSD) console.error('Error fetching USD ingresos:', errorIngresosUSD);
    if (errorEgresosMXN) console.error('Error fetching MXN egresos:', errorEgresosMXN);
    if (errorEgresosUSD) console.error('Error fetching USD egresos:', errorEgresosUSD);
    if (errorCotizaciones) console.error('Error fetching paid cotizaciones:', errorCotizaciones);
    
    // Calculate totals, safely handling null/undefined data
    const ingresosMXNTotal = Array.isArray(ingresosMXN) 
      ? ingresosMXN.reduce((acc, curr) => acc + Number(curr?.monto_mxn || 0), 0) 
      : 0;
    
    const ingresosUSDTotal = Array.isArray(ingresosUSD) 
      ? ingresosUSD.reduce((acc, curr) => acc + Number(curr?.monto || 0), 0) 
      : 0;
    
    const egresosMXNTotal = Array.isArray(egresosMXN) 
      ? egresosMXN.reduce((acc, curr) => acc + Number(curr?.monto_mxn || 0), 0) 
      : 0;
    
    const egresosUSDTotal = Array.isArray(egresosUSD) 
      ? egresosUSD.reduce((acc, curr) => acc + Number(curr?.monto || 0), 0) 
      : 0;
    
    // Calculate balance
    const balanceMXN = ingresosMXNTotal - egresosMXNTotal;
    const balanceUSD = ingresosUSDTotal - egresosUSDTotal;
    
    return {
      success: true,
      data: {
        ingresos: { mxn: ingresosMXNTotal, usd: ingresosUSDTotal },
        egresos: { mxn: egresosMXNTotal, usd: egresosUSDTotal },
        balance: { mxn: balanceMXN, usd: balanceUSD },
        cotizacionesPagadas: cotizacionesPagadas || 0
      }
    };
  } catch (error) {
    console.error('Error getting financial metrics:', error);
    return { 
      success: true, // Return success true with empty data to avoid breaking UI
      data: {
        ingresos: { mxn: 0, usd: 0 },
        egresos: { mxn: 0, usd: 0 },
        balance: { mxn: 0, usd: 0 },
        cotizacionesPagadas: 0
      },
      error: error instanceof Error ? error.message : 'Failed to fetch financial metrics'
    };
  }
}

// Server action to get all ingresos with pagination
export async function getAllIngresos(page = 1, pageSize = 10): Promise<{ 
  success: boolean; 
  data?: IngresoData[]; 
  pagination?: PaginationResult;
  error?: string 
}> {
  try {
    // Use the imported supabase instance directly
    // const supabase = createClient(); <-- Remove this line
    
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('cotizacion_pagos_view')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting ingresos:', countError);
      // Continue with count as 0 instead of throwing
    }
    
    // Calculate pagination values
    const totalItems = count || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * pageSize;
    
    // Get paginated ingresos - Corrected select string
    const selectString = `
      anticipo_id,
      cotizacion_id,
      folio,
      cliente_id,
      moneda,
      monto,
      monto_mxn,
      metodo_pago,
      fecha_pago,
      porcentaje,
      precio_total
    `;
    const { data, error } = await supabase
      .from('cotizacion_pagos_view')
      .select(selectString)
      .order('fecha_pago', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
       console.error('Error fetching ingresos:', error);
      // Return empty data with pagination
      return {
        success: true,
        data: [],
        pagination: {
          page: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: pageSize
        },
        error: error.message
      };
    }
    
    const ingresos = Array.isArray(data) ? data : [];
    
    // Get client names only if we have ingresos with cliente_id
    const clienteIds = ingresos
      .map(ingreso => ingreso?.cliente_id)
      .filter(id => id != null) as number[];
    
    let clientesMap: Record<number, string> = {};
    
    if (clienteIds.length > 0) {
      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select('cliente_id, nombre')
        .in('cliente_id', clienteIds);
      
      if (clientesError) {
        console.error('Error fetching cliente names:', clientesError);
        // Continue with empty clientesMap
      } else if (Array.isArray(clientes)) {
        clientesMap = clientes.reduce((acc, cliente) => {
          if (cliente && cliente.cliente_id != null) {
            acc[cliente.cliente_id] = cliente.nombre || 'Cliente sin nombre';
          }
          return acc;
        }, {} as Record<number, string>);
      }
    }
    
    // Map ingresos with client names
    const formattedIngresos = ingresos.map(ingreso => ({
      // Explicitly map only needed fields to match IngresoData type
      anticipo_id: ingreso.anticipo_id,
      cotizacion_id: ingreso.cotizacion_id,
      folio: ingreso.folio,
      // cliente_id: ingreso.cliente_id, // Don't need to return cliente_id itself
      cliente_nombre: ingreso.cliente_id != null ? 
        (clientesMap[ingreso.cliente_id] || 'Cliente desconocido') : 
        'Cliente no especificado',
      moneda: ingreso.moneda,
      monto: ingreso.monto,
      monto_mxn: ingreso.monto_mxn,
      metodo_pago: ingreso.metodo_pago,
      fecha_pago: ingreso.fecha_pago,
      porcentaje: ingreso.porcentaje,
    }));

    return {
      success: true,
      data: formattedIngresos,
      pagination: {
        page: currentPage,
        totalPages,
        totalItems,
        itemsPerPage: pageSize
      }
    };
  } catch (error) {
    console.error('Error getting ingresos:', error);
    return { 
      success: true, 
      data: [],
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: pageSize
      },
      error: error instanceof Error ? error.message : 'Failed to fetch ingresos' 
    };
  }
}

// Server action to get all egresos with pagination
export async function getAllEgresos(page = 1, pageSize = 10): Promise<{ 
  success: boolean; 
  data?: EgresoData[]; 
  pagination?: PaginationResult;
  error?: string 
}> {
  try {
    // Use the imported supabase instance directly
    // const supabase = createClient(); <-- Remove this line
    
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('egresos')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting egresos:', countError);
      // Continue with count as 0 instead of throwing
    }
    
    // Calculate pagination values
    const totalItems = count || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * pageSize;
    
    // Get paginated egresos
    const { data, error } = await supabase
      .from('egresos')
      .select(`
        egreso_id, 
        descripcion, 
        categoria, 
        fecha, 
        monto, 
        monto_mxn, 
        moneda, 
        metodo_pago 
      `)
      .order('fecha', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('Error fetching egresos:', error);
      // Return empty data with pagination
      return {
        success: true,
        data: [],
        pagination: {
          page: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: pageSize
        },
        error: error.message
      };
    }
    
    // Ensure data is an array
    const egresos = Array.isArray(data) ? data : [];
    
    return {
      success: true,
      data: egresos,
      pagination: {
        page: currentPage,
        totalPages,
        totalItems,
        itemsPerPage: pageSize
      }
    };
  } catch (error) {
    console.error('Error getting egresos:', error);
    return { 
      success: true, 
      data: [],
      pagination: {
        page: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: pageSize
      },
      error: error instanceof Error ? error.message : 'Failed to fetch egresos' 
    };
  }
}

// Server action to create a new ingreso (payment)
export async function createIngreso(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Use the imported supabase instance directly
    // const supabase = createClient(); <-- Remove this line
    
    // First, get the cotizacion details to calculate the percentage
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select('total, moneda, total_mxn')
      .eq('cotizacion_id', data.cotizacion_id)
      .single();
    
    if (cotizacionError) {
      throw cotizacionError;
    }
    
    // Calculate percentage of the total
    const cotizacionTotal = Number(cotizacion.total);
    const ingresoMonto = Number(data.monto);
    const porcentaje = (ingresoMonto / cotizacionTotal) * 100;
    
    // Calculate monto_mxn based on moneda
    let montoMXN = ingresoMonto;
    let tipoCambio = null;
    
    if (data.moneda === 'USD') {
      tipoCambio = data.tipo_cambio || 18; // Default exchange rate
      montoMXN = ingresoMonto * tipoCambio;
    }
    
    // Create the payment record
    const { error: insertError } = await supabase
      .from('pagos')
      .insert({
        cotizacion_id: data.cotizacion_id,
        monto: ingresoMonto,
        monto_mxn: montoMXN,
        moneda: data.moneda,
        tipo_cambio: tipoCambio,
        metodo_pago: data.metodo_pago,
        fecha_pago: data.fecha_pago || new Date().toISOString(),
        comprobante_url: data.comprobante_url,
        notas: data.notas,
        usuario_id: data.usuario_id
      });
    
    if (insertError) {
      throw insertError;
    }
    
    // Update the cotizacion with the payment information
    const { data: cotizacionActual, error: getCotizacionError } = await supabase
      .from('cotizaciones')
      .select('monto_pagado, monto_pagado_mxn, porcentaje_completado')
      .eq('cotizacion_id', data.cotizacion_id)
      .single();
    
    if (getCotizacionError) {
      throw getCotizacionError;
    }
    
    // Calculate new payment values
    const nuevoPagado = Number(cotizacionActual.monto_pagado || 0) + ingresoMonto;
    const nuevoPagadoMXN = Number(cotizacionActual.monto_pagado_mxn || 0) + montoMXN;
    const nuevoProcentaje = (nuevoPagado / cotizacionTotal) * 100;
    
    // Determine payment status
    let estatusPago = 'pendiente';
    if (nuevoProcentaje >= 99.5) {
      estatusPago = 'pagado';
    } else if (nuevoProcentaje > 0) {
      estatusPago = 'parcial';
    }
    
    // Update cotizacion
    const { error: updateError } = await supabase
      .from('cotizaciones')
      .update({
        monto_pagado: nuevoPagado,
        monto_pagado_mxn: nuevoPagadoMXN,
        porcentaje_completado: nuevoProcentaje,
        estatus_pago: estatusPago,
        fecha_pago_inicial: cotizacionActual.monto_pagado === 0 ? new Date().toISOString() : undefined
      })
      .eq('cotizacion_id', data.cotizacion_id);
    
    if (updateError) {
      throw updateError;
    }
    
    // Revalidate the finance and cotizaciones pages
    revalidatePath('/dashboard/finanzas');
    revalidatePath('/dashboard/cotizaciones');
    
    return { success: true };
  } catch (error) {
    console.error('Error creating ingreso:', error);
    return { success: false, error: 'Failed to create payment record' };
  }
}

// Server action to create a new egreso (expense)
export async function createEgreso(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Use the imported supabase instance directly
    // const supabase = createClient(); <-- Remove this line
    
    // Calculate monto_mxn based on moneda
    let montoMXN = Number(data.monto);
    let tipoCambio = null;
    
    if (data.moneda === 'USD') {
      tipoCambio = data.tipo_cambio || 18; // Default exchange rate
      montoMXN = montoMXN * tipoCambio;
    }
    
    // Create the expense record
    const { error } = await supabase
      .from('egresos')
      .insert({
        descripcion: data.descripcion,
        categoria: data.categoria,
        fecha: data.fecha.toISOString(),
        monto: Number(data.monto),
        monto_mxn: montoMXN,
        moneda: data.moneda,
        tipo_cambio: tipoCambio,
        metodo_pago: data.metodo_pago,
        comprobante_url: data.comprobante_url,
        notas: data.notas,
        usuario_id: data.usuario_id
      });
    
    if (error) {
      throw error;
    }
    
    // Revalidate the finance page
    revalidatePath('/dashboard/finanzas');
    
    return { success: true };
  } catch (error) {
    console.error('Error creating egreso:', error);
    return { success: false, error: 'Failed to create expense record' };
  }
}

// Get available cotizaciones for payments
export async function getAvailableCotizaciones(): Promise<{ 
  success: boolean; 
  cotizaciones?: any[]; 
  error?: string 
}> {
  try {
    // Use the imported supabase instance directly
    // const supabase = createClient(); <-- Remove this line
    
    // Get cotizaciones with pending or partial payments
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        moneda,
        total,
        monto_pagado,
        porcentaje_completado,
        cliente_id
      `)
      // .in('estado', ['enviada', 'producción']) // Keep commented or adjust as needed
      .in('estatus_pago', ['pendiente', 'parcial']) // Restore this filter!
      .order('fecha_creacion', { ascending: false });
    
    if (error) {
      // Specific error for cotizacion fetch
      console.error('Error fetching cotizaciones:', error);
      throw new Error('Error al obtener cotizaciones de Supabase.'); 
    }
    
    // Get client names
    const clienteIds = data.map(cotizacion => cotizacion.cliente_id).filter(Boolean);
    
    let clientesMap: Record<number, string> = {};
    
    if (clienteIds.length > 0) {
      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select('cliente_id, nombre')
        .in('cliente_id', clienteIds);
      
      if (clientesError) {
         // Specific error for cliente fetch
        console.error('Error fetching client names:', clientesError);
        throw new Error('Error al obtener nombres de clientes de Supabase.'); 
      }
      
      clientesMap = clientes.reduce((acc, cliente) => {
        acc[cliente.cliente_id] = cliente.nombre || 'Cliente sin nombre';
        return acc;
      }, {} as Record<number, string>);
    }
    
    // Map cotizaciones with client names
    const cotizacionesWithClients = data.map(cotizacion => ({
      ...cotizacion,
      cliente_nombre: clientesMap[cotizacion.cliente_id] || 'Cliente desconocido'
    }));
    
    return {
      success: true,
      cotizaciones: cotizacionesWithClients
    };
  } catch (error) {
    console.error('Error getting available cotizaciones:', error);
    // Return the specific error message from the throw statements
    return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch available cotizaciones' 
    };
  }
} 