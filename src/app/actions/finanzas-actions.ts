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

// Updated server action to get all ingresos with pagination and filters
export async function getAllIngresos(
  page = 1, 
  pageSize = 10, 
  month?: number, 
  year?: number
): Promise<{ 
  success: boolean; 
  data?: IngresoData[]; 
  pagination?: PaginationResult;
  error?: string 
}> {
  try {
    let query = supabase
      .from('cotizacion_pagos_view')
      .select('*', { count: 'exact', head: true });

    // Apply filters if provided
    if (year) {
      query = query.filter('fecha_pago', 'gte', `${year}-01-01T00:00:00Z`);
      query = query.filter('fecha_pago', 'lte', `${year}-12-31T23:59:59Z`);
    }
    if (month && year) {
       // Adjust month filter to work correctly with Supabase date functions
       // Supabase/Postgres MONTH is 1-12
       const startDate = new Date(year, month - 1, 1).toISOString();
       const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString(); // Last day of the month
       query = query.filter('fecha_pago', 'gte', startDate);
       query = query.filter('fecha_pago', 'lt', new Date(year, month, 1).toISOString()); // Use less than the start of the next month
       // Alternative using EXTRACT - requires function call or RPC
       // query = query.filter('EXTRACT(MONTH FROM fecha_pago)', 'eq', month);
       // query = query.filter('EXTRACT(YEAR FROM fecha_pago)', 'eq', year);
    }

    // Get total count for pagination WITH filters applied
    const { count, error: countError } = await query;
    
    if (countError) {
      console.error('Error counting filtered ingresos:', countError);
      // Return success: false on count error
      return {
        success: false, 
        error: `Failed to count ingresos: ${countError.message}`
      };
    }
    
    // Calculate pagination values
    const totalItems = count || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages)); // Ensure page is at least 1
    const offset = (currentPage - 1) * pageSize;
    
    // Build the data query with filters
    let dataQuery = supabase
      .from('cotizacion_pagos_view')
      .select(`
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
      `);

    // Apply filters to data query
    if (year) {
      dataQuery = dataQuery.filter('fecha_pago', 'gte', `${year}-01-01T00:00:00Z`);
      dataQuery = dataQuery.filter('fecha_pago', 'lte', `${year}-12-31T23:59:59Z`);
    }
    if (month && year) {
       const startDate = new Date(year, month - 1, 1).toISOString();
       const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString(); // Last day of the month
       dataQuery = dataQuery.filter('fecha_pago', 'gte', startDate);
       dataQuery = dataQuery.filter('fecha_pago', 'lt', new Date(year, month, 1).toISOString()); // Use less than the start of the next month
       // Alternative using EXTRACT - requires function call or RPC
       // dataQuery = dataQuery.filter('EXTRACT(MONTH FROM fecha_pago)', 'eq', month);
       // dataQuery = dataQuery.filter('EXTRACT(YEAR FROM fecha_pago)', 'eq', year);
    }

    // Apply ordering and pagination
    dataQuery = dataQuery
      .order('fecha_pago', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Execute the data query
    const { data, error } = await dataQuery;

    if (error) {
       console.error('Error fetching filtered ingresos:', error);
      // Return success: false on data fetch error
      return {
        success: false,
        error: `Failed to fetch ingresos: ${error.message}`
      };
    }
    
    const ingresos = Array.isArray(data) ? data : [];
    
    // Get client names (remains the same)
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
        // Log but don't fail the whole request
      } else if (Array.isArray(clientes)) {
        clientesMap = clientes.reduce((acc, cliente) => {
          if (cliente && cliente.cliente_id != null) {
            acc[cliente.cliente_id] = cliente.nombre || 'Cliente sin nombre';
          }
          return acc;
        }, {} as Record<number, string>);
      }
    }
    
    // Map ingresos with client names (remains the same)
    const formattedIngresos = ingresos.map(ingreso => ({
      anticipo_id: ingreso.anticipo_id,
      cotizacion_id: ingreso.cotizacion_id,
      folio: ingreso.folio,
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
    console.error('Error in getAllIngresos:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred fetching ingresos' 
    };
  }
}

// Updated server action to get all egresos with pagination and filters
export async function getAllEgresos(
  page = 1, 
  pageSize = 10, 
  month?: number, 
  year?: number
): Promise<{ 
  success: boolean; 
  data?: EgresoData[]; 
  pagination?: PaginationResult;
  error?: string 
}> {
  try {
    let countQuery = supabase
      .from('egresos')
      .select('*', { count: 'exact', head: true });

    // Apply filters to count query
    if (year) {
      countQuery = countQuery.filter('fecha', 'gte', `${year}-01-01`);
      countQuery = countQuery.filter('fecha', 'lte', `${year}-12-31`);
    }
    if (month && year) {
      // Supabase/Postgres MONTH is 1-12
      // Use date range for month filtering
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      countQuery = countQuery.filter('fecha', 'gte', startDate);
      countQuery = countQuery.filter('fecha', 'lt', endDate); // Less than start of next month
       // Alternative using EXTRACT - requires function call or RPC
       // countQuery = countQuery.filter('EXTRACT(MONTH FROM fecha)', 'eq', month);
       // countQuery = countQuery.filter('EXTRACT(YEAR FROM fecha)', 'eq', year);
    }

    // Get total count for pagination WITH filters applied
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error counting filtered egresos:', countError);
       // Return success: false on count error
      return {
        success: false, 
        error: `Failed to count egresos: ${countError.message}`
      };
    }
    
    // Calculate pagination values
    const totalItems = count || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages)); // Ensure page is at least 1
    const offset = (currentPage - 1) * pageSize;
    
    // Build the data query with filters
    let dataQuery = supabase
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
      `);

    // Apply filters to data query
    if (year) {
      dataQuery = dataQuery.filter('fecha', 'gte', `${year}-01-01`);
      dataQuery = dataQuery.filter('fecha', 'lte', `${year}-12-31`);
    }
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      dataQuery = dataQuery.filter('fecha', 'gte', startDate);
      dataQuery = dataQuery.filter('fecha', 'lt', endDate);
       // Alternative using EXTRACT - requires function call or RPC
       // dataQuery = dataQuery.filter('EXTRACT(MONTH FROM fecha)', 'eq', month);
       // dataQuery = dataQuery.filter('EXTRACT(YEAR FROM fecha)', 'eq', year);
    }

    // Apply ordering and pagination
    dataQuery = dataQuery
      .order('fecha', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Execute data query
    const { data, error } = await dataQuery;
    
    if (error) {
      console.error('Error fetching filtered egresos:', error);
      // Return success: false on data fetch error
      return {
        success: false,
        error: `Failed to fetch egresos: ${error.message}`
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
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred fetching egresos' 
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