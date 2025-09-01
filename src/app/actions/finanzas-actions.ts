"use server";

// Import the Supabase client factory
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { convertToCSV, formatCurrency } from '@/lib/utils'; // Import the helper and formatCurrency

// Types for financial data
interface FinancialMetrics {
  ingresos: { mxn: number; usd: number };
  egresos: { mxn: number; usd: number };
  balance: { mxn: number; usd: number };
  cotizacionesPagadas: number;
}

interface AccountsReceivableMetrics {
  totalPorCobrar: { mxn: number; usd: number };
  clientesConSaldo: number;
  clientesMorosos: number;
  promedioDiasCobro: number;
}

interface AccountReceivableItem {
  cotizacion_id: number;
  folio: string;
  estado: string;
  total: number;
  total_mxn: number;
  monto_pagado: number;
  monto_pagado_mxn: number;
  saldo_pendiente: number;
  saldo_pendiente_mxn: number;
  porcentaje_completado: number;
  dias_transcurridos: number;
  fecha_aprobacion: string;
  cliente_nombre: string;
  cliente_celular: string;
  cliente_correo: string;
  moneda: string;
}

// Updated IngresoData to include new fields and make cotizacion-specific fields optional
interface IngresoData {
  pago_id: number; // Use pago_id as the primary identifier
  tipo_ingreso: 'cotizacion' | 'otro';
  descripcion?: string | null; // For 'otro' type
  cotizacion_id?: number | null; // Optional, for 'cotizacion' type
  folio?: string | null; // Optional, for 'cotizacion' type
  cliente_nombre?: string | null; // Optional, for 'cotizacion' type
  moneda: string;
  monto: number;
  monto_mxn: number;
  metodo_pago: string;
  fecha_pago: string;
  porcentaje?: number | null; // Optional, for 'cotizacion' type
  notas?: string | null;
  comprobante_url?: string | null;
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

// Updated server action to get financial metrics with filters
export async function getFinancialMetrics(
  month?: number, // Can be 0 for "Todos"
  year?: number   // Can be 0 for "Todos"
): Promise<{ success: boolean; data?: FinancialMetrics; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Base queries
    let ingresosMXNQuery = supabase
      .from('pagos')
      .select('monto_mxn, monto')
      .eq('moneda', 'MXN');
      
    let ingresosUSDQuery = supabase
      .from('pagos')
      .select('monto')
      .eq('moneda', 'USD');
      
    let egresosMXNQuery = supabase
      .from('egresos')
      .select('monto_mxn')
      .eq('moneda', 'MXN');
      
    let egresosUSDQuery = supabase
      .from('egresos')
      .select('monto')
      .eq('moneda', 'USD');
      
    // Assuming cotizaciones should be filtered by fecha_pago_inicial or similar
    // *** Adjust 'fecha_pago_inicial' if the relevant date column is different ***
    let cotizacionesQuery = supabase
      .from('cotizaciones')
      .select('*', { count: 'exact', head: true })
      .eq('estatus_pago', 'pagado');

    // Apply filters if year is provided and not 0
    if (year) {
      const yearStartIngresos = `${year}-01-01T00:00:00Z`;
      const yearEndIngresos = `${year}-12-31T23:59:59Z`;
      const yearStartEgresos = `${year}-01-01`;
      const yearEndEgresos = `${year}-12-31`;

      ingresosMXNQuery = ingresosMXNQuery.filter('fecha_pago', 'gte', yearStartIngresos).filter('fecha_pago', 'lte', yearEndIngresos);
      ingresosUSDQuery = ingresosUSDQuery.filter('fecha_pago', 'gte', yearStartIngresos).filter('fecha_pago', 'lte', yearEndIngresos);
      egresosMXNQuery = egresosMXNQuery.filter('fecha', 'gte', yearStartEgresos).filter('fecha', 'lte', yearEndEgresos);
      egresosUSDQuery = egresosUSDQuery.filter('fecha', 'gte', yearStartEgresos).filter('fecha', 'lte', yearEndEgresos);
      // Filter cotizaciones count - adjust date column if needed
      cotizacionesQuery = cotizacionesQuery.filter('fecha_pago_inicial', 'gte', yearStartIngresos).filter('fecha_pago_inicial', 'lte', yearEndIngresos);

      // Apply month filter if month and year are provided and not 0
      if (month) {
        // Use consistent UTC date formatting to avoid timezone issues
        const monthStartIngresos = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
        const nextMonthIngresos = month === 12 ? 1 : month + 1;
        const nextYearIngresos = month === 12 ? year + 1 : year;
        const monthEndIngresos = `${nextYearIngresos}-${String(nextMonthIngresos).padStart(2, '0')}-01T00:00:00Z`;
        
        const monthStartEgresos = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonthEgresos = month === 12 ? 1 : month + 1;
        const nextYearEgresos = month === 12 ? year + 1 : year;
        const monthEndEgresos = `${nextYearEgresos}-${String(nextMonthEgresos).padStart(2, '0')}-01`;

        ingresosMXNQuery = ingresosMXNQuery.filter('fecha_pago', 'gte', monthStartIngresos).filter('fecha_pago', 'lt', monthEndIngresos);
        ingresosUSDQuery = ingresosUSDQuery.filter('fecha_pago', 'gte', monthStartIngresos).filter('fecha_pago', 'lt', monthEndIngresos);
        egresosMXNQuery = egresosMXNQuery.filter('fecha', 'gte', monthStartEgresos).filter('fecha', 'lt', monthEndEgresos);
        egresosUSDQuery = egresosUSDQuery.filter('fecha', 'gte', monthStartEgresos).filter('fecha', 'lt', monthEndEgresos);
         // Filter cotizaciones count - adjust date column if needed
        cotizacionesQuery = cotizacionesQuery.filter('fecha_pago_inicial', 'gte', monthStartIngresos).filter('fecha_pago_inicial', 'lt', monthEndIngresos);
      }
    }

    // Execute all queries in parallel
    const [ 
      { data: ingresosMXN, error: errorIngresosMXN },
      { data: ingresosUSD, error: errorIngresosUSD },
      { data: egresosMXN, error: errorEgresosMXN },
      { data: egresosUSD, error: errorEgresosUSD },
      { count: cotizacionesPagadas, error: errorCotizaciones } 
    ] = await Promise.all([
      ingresosMXNQuery,
      ingresosUSDQuery,
      egresosMXNQuery,
      egresosUSDQuery,
      cotizacionesQuery
    ]);
    
    // Log any errors 
    if (errorIngresosMXN) console.error('Error fetching filtered MXN ingresos:', errorIngresosMXN);
    if (errorIngresosUSD) console.error('Error fetching filtered USD ingresos:', errorIngresosUSD);
    if (errorEgresosMXN) console.error('Error fetching filtered MXN egresos:', errorEgresosMXN);
    if (errorEgresosUSD) console.error('Error fetching filtered USD egresos:', errorEgresosUSD);
    if (errorCotizaciones) console.error('Error fetching filtered paid cotizaciones:', errorCotizaciones);

    // Check for critical errors - return failure if any query failed
    if (errorIngresosMXN || errorIngresosUSD || errorEgresosMXN || errorEgresosUSD || errorCotizaciones) {
        const errors = [
            errorIngresosMXN?.message,
            errorIngresosUSD?.message,
            errorEgresosMXN?.message,
            errorEgresosUSD?.message,
            errorCotizaciones?.message
        ].filter(Boolean).join('; ');
        return { success: false, error: `Failed to fetch some metrics: ${errors}` };
    }
    
    // Calculate totals (same logic as before, now on potentially filtered data)
    const ingresosMXNTotal = Array.isArray(ingresosMXN) 
      ? ingresosMXN.reduce((acc, curr) => acc + Number(curr?.monto || 0), 0) 
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
    // Return success: false on general catch error
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch financial metrics'
    };
  }
}

// Updated server action to get all ingresos with pagination and filters
export async function getAllIngresos(
  page = 1,
  pageSize = 10,
  month?: number, // Can be 0 for "Todos"
  year?: number   // Can be 0 for "Todos"
): Promise<{
  success: boolean;
  data?: IngresoData[];
  pagination?: PaginationResult;
  error?: string
}> {
  try {
    const supabase = await createClient();
    
    // Base query now targets the 'pagos' table
    let countQuery = supabase
      .from('pagos')
      .select('*', { count: 'exact', head: true });

    // Apply filters directly to 'pagos' table 'fecha_pago'
    if (year) {
      const yearStart = `${year}-01-01T00:00:00Z`;
      const yearEnd = `${year}-12-31T23:59:59Z`;
      countQuery = countQuery.filter('fecha_pago', 'gte', yearStart).filter('fecha_pago', 'lte', yearEnd);

      if (month) {
         // Use consistent UTC date formatting to avoid timezone issues
         const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
         // Calculate the first day of the next month
         let nextMonthYear = year;
         let nextMonth = month + 1;
         if (nextMonth > 12) {
             nextMonth = 1;
             nextMonthYear += 1;
         }
         const monthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;
         countQuery = countQuery.filter('fecha_pago', 'gte', monthStart);
         countQuery = countQuery.filter('fecha_pago', 'lt', monthEnd); // Use 'lt' for end date exclusive
      }
    }

    // Get total count for pagination WITH filters applied
    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting filtered ingresos (pagos):', countError);
      return {
        success: false,
        error: `Failed to count ingresos: ${countError.message}`
      };
    }

    // Calculate pagination values
    const totalItems = count || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const offset = (currentPage - 1) * pageSize;

    // Build the data query from 'pagos'
    let dataQuery = supabase
      .from('pagos')
      .select(`
        pago_id,
        cotizacion_id,
        monto,
        monto_mxn,
        tipo_cambio,
        moneda,
        metodo_pago,
        fecha_pago,
        comprobante_url,
        notas,
        tipo_ingreso,
        descripcion,
        porcentaje_aplicado
      `); // Select all relevant fields from pagos

    // Apply filters to data query
    if (year) {
       const yearStart = `${year}-01-01T00:00:00Z`;
       const yearEnd = `${year}-12-31T23:59:59Z`;
       dataQuery = dataQuery.filter('fecha_pago', 'gte', yearStart).filter('fecha_pago', 'lte', yearEnd);

       if (month) {
         // Use consistent UTC date formatting to avoid timezone issues
         const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
         let nextMonthYear = year;
         let nextMonth = month + 1;
         if (nextMonth > 12) {
             nextMonth = 1;
             nextMonthYear += 1;
         }
         const monthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;
         dataQuery = dataQuery.filter('fecha_pago', 'gte', monthStart);
         dataQuery = dataQuery.filter('fecha_pago', 'lt', monthEnd);
       }
    }


    // Apply ordering and pagination
    dataQuery = dataQuery
      .order('fecha_pago', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Execute the data query
    const { data: pagosData, error: pagosError } = await dataQuery;

    if (pagosError) {
       console.error('Error fetching filtered ingresos (pagos):', pagosError);
      return {
        success: false,
        error: `Failed to fetch ingresos: ${pagosError.message}`
      };
    }

    const ingresos = Array.isArray(pagosData) ? pagosData : [];

    // --- Fetch related data for 'cotizacion' type ingresos ---
    const cotizacionIds = ingresos
      .filter(ing => ing.tipo_ingreso === 'cotizacion' && ing.cotizacion_id != null)
      .map(ing => ing.cotizacion_id as number);

    let cotizacionesMap: Record<number, { folio: string | null; cliente_id: number | null }> = {};
    let clientesMap: Record<number, string> = {};

    if (cotizacionIds.length > 0) {
      // Fetch related cotizaciones
      const { data: cotizaciones, error: cotizacionesError } = await supabase
        .from('cotizaciones')
        .select('cotizacion_id, folio, cliente_id')
        .in('cotizacion_id', cotizacionIds);

      if (cotizacionesError) {
        console.error('Error fetching related cotizaciones:', cotizacionesError);
        // Decide if this is a critical error or if we can proceed without folio/cliente
      } else if (Array.isArray(cotizaciones)) {
        cotizacionesMap = cotizaciones.reduce((acc, cot) => {
          if (cot && cot.cotizacion_id != null) {
            acc[cot.cotizacion_id] = { folio: cot.folio, cliente_id: cot.cliente_id };
          }
          return acc;
        }, {} as Record<number, { folio: string | null; cliente_id: number | null }>);

        // Fetch related client names based on cotizaciones found
        const clienteIds = cotizaciones
          .map(cot => cot.cliente_id)
          .filter(id => id != null) as number[];

        if (clienteIds.length > 0) {
          const { data: clientes, error: clientesError } = await supabase
            .from('clientes')
            .select('cliente_id, nombre')
            .in('cliente_id', clienteIds);

          if (clientesError) {
            console.error('Error fetching cliente names:', clientesError);
          } else if (Array.isArray(clientes)) {
            clientesMap = clientes.reduce((acc, cliente) => {
              if (cliente && cliente.cliente_id != null) {
                acc[cliente.cliente_id] = cliente.nombre || 'Cliente sin nombre';
              }
              return acc;
            }, {} as Record<number, string>);
          }
        }
      }
    }
    // --- End related data fetch ---


    const formattedIngresos = ingresos.map((ingreso): IngresoData => {
      const cotizacionDetails = ingreso.cotizacion_id ? cotizacionesMap[ingreso.cotizacion_id] : null;
      const clienteId = cotizacionDetails?.cliente_id;
      const clienteNombre = clienteId ? clientesMap[clienteId] : null;

      return {
        pago_id: ingreso.pago_id,
        tipo_ingreso: ingreso.tipo_ingreso as 'cotizacion' | 'otro',
        descripcion: ingreso.descripcion,
        cotizacion_id: ingreso.cotizacion_id,
        folio: cotizacionDetails?.folio || null,
        cliente_nombre: clienteNombre || (ingreso.tipo_ingreso === 'cotizacion' ? 'Cliente no encontrado' : null),
        moneda: ingreso.moneda,
        monto: ingreso.monto,
        monto_mxn: ingreso.monto_mxn,
        metodo_pago: ingreso.metodo_pago,
        fecha_pago: ingreso.fecha_pago,
        porcentaje: ingreso.porcentaje_aplicado, // Use the specific percentage field if available
        notas: ingreso.notas,
        comprobante_url: ingreso.comprobante_url,
      };
    });

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
  month?: number, // Can be 0 for "Todos"
  year?: number   // Can be 0 for "Todos"
): Promise<{ 
  success: boolean; 
  data?: EgresoData[]; 
  pagination?: PaginationResult;
  error?: string 
}> {
  try {
    const supabase = await createClient();
    
    let countQuery = supabase
      .from('egresos')
      .select('*', { count: 'exact', head: true });

    // Apply filters to count query only if year is provided and not 0 ("Todos")
    if (year) { 
      countQuery = countQuery.filter('fecha', 'gte', `${year}-01-01`);
      countQuery = countQuery.filter('fecha', 'lte', `${year}-12-31`);

      // Apply month filter only if month and year are provided and not 0 ("Todos")
      if (month) { 
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        countQuery = countQuery.filter('fecha', 'gte', startDate);
        countQuery = countQuery.filter('fecha', 'lt', endDate); 
      }
    }

    // Get total count for pagination WITH filters applied
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error counting filtered egresos:', countError);
      return {
        success: false, 
        error: `Failed to count egresos: ${countError.message}`
      };
    }
    
    // Calculate pagination values
    const totalItems = count || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const offset = (currentPage - 1) * pageSize;
    
    // Build the data query
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

    // Apply filters to data query only if year is provided and not 0 ("Todos")
    if (year) { 
      dataQuery = dataQuery.filter('fecha', 'gte', `${year}-01-01`);
      dataQuery = dataQuery.filter('fecha', 'lte', `${year}-12-31`);

      // Apply month filter only if month and year are provided and not 0 ("Todos")
      if (month) { 
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        dataQuery = dataQuery.filter('fecha', 'gte', startDate);
        dataQuery = dataQuery.filter('fecha', 'lt', endDate);
      }
    }

    // Apply ordering and pagination
    dataQuery = dataQuery
      .order('fecha', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Execute data query
    const { data, error } = await dataQuery;
    
    if (error) {
      console.error('Error fetching filtered egresos:', error);
      return {
        success: false,
        error: `Failed to fetch egresos: ${error.message}`
      };
    }
    
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

// Server action to create a new ingreso (payment or general income)
// Input data expected:
// - tipo_ingreso: 'cotizacion' | 'otro'
// - cotizacion_id: number (required if tipo_ingreso is 'cotizacion')
// - descripcion: string (required if tipo_ingreso is 'otro')
// - monto: number (required)
// - moneda: string (required, e.g., 'MXN', 'USD')
// - metodo_pago: string (required)
// - fecha_pago: string (ISO format, optional, defaults to now)
// - tipo_cambio: number (optional, required/used if moneda is 'USD')
// - comprobante_url: string (optional)
// - notas: string (optional)
// - usuario_id: number (optional)
export async function createIngreso(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const tipoIngreso = data.tipo_ingreso || (data.cotizacion_id ? 'cotizacion' : 'otro'); // Infer type if not provided
    const cotizacionId = tipoIngreso === 'cotizacion' ? Number(data.cotizacion_id) : null;
    const descripcion = tipoIngreso === 'otro' ? data.descripcion : null;
    const ingresoMonto = Number(data.monto);
    const moneda = data.moneda || 'MXN';

    // --- Input Validation ---
    if (isNaN(ingresoMonto) || ingresoMonto <= 0) {
      return { success: false, error: 'Monto inválido.' };
    }
    if (!data.metodo_pago) {
      return { success: false, error: 'Método de pago requerido.' };
    }
    if (tipoIngreso === 'cotizacion' && (!cotizacionId || isNaN(cotizacionId))) {
      return { success: false, error: 'Se requiere un ID de cotización válido para ingresos de tipo cotización.' };
    }
     if (tipoIngreso === 'otro' && (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length === 0)) {
       return { success: false, error: 'Se requiere una descripción para ingresos de tipo "otro".' };
     }
    // --- End Validation ---


    let cotizacionTotal = null;
    let porcentajeAplicado = null;
    let montoMXN = ingresoMonto;
    let tipoCambio = null;

    // Calculate monto_mxn based on moneda
    if (moneda === 'USD' || moneda === 'EUR') {
      tipoCambio = data.tipo_cambio || 18; // Consider fetching this dynamically or using a better default
      montoMXN = ingresoMonto * tipoCambio;
    }

    // If it's related to a cotizacion, fetch its details and calculate percentage
    if (tipoIngreso === 'cotizacion' && cotizacionId) {
      const { data: cotizacion, error: cotizacionError } = await supabase
        .from('cotizaciones')
        .select('total, total_mxn, moneda') // Select total_mxn as well
        .eq('cotizacion_id', cotizacionId)
        .single();

      if (cotizacionError || !cotizacion) {
        console.error(`Error fetching cotizacion ${cotizacionId}:`, cotizacionError);
        return { success: false, error: `No se encontró la cotización con ID ${cotizacionId} o hubo un error al buscarla.` };
      }

      // Use total_mxn if available and consistent, otherwise use total based on payment moneda
      // This logic might need refinement based on how totals are stored
      const baseTotal = (moneda === 'MXN' && cotizacion.total_mxn)
          ? cotizacion.total_mxn
          : cotizacion.total;

      cotizacionTotal = Number(baseTotal);

      if (isNaN(cotizacionTotal) || cotizacionTotal <= 0) {
           console.warn(`Cotización ${cotizacionId} tiene un total inválido (${cotizacionTotal}) para calcular porcentaje.`);
           porcentajeAplicado = 0; // Avoid division by zero or NaN
       } else {
          // Calculate percentage based on MXN amounts for consistency? Or based on original currency?
          // Using MXN amounts:
          // const pagoActualMXN = await getPagoActualMXN(cotizacionId); // Helper needed?
          // const porcentajeCalculado = ((pagoActualMXN + montoMXN) / cotizacion.total_mxn) * 100;

          // Or simpler: percentage of this specific payment relative to total
          porcentajeAplicado = (ingresoMonto / cotizacionTotal) * 100;
       }

    }

    // Create the payment record in 'pagos' table
    const { error: insertError } = await supabase
      .from('pagos')
      .insert({
        cotizacion_id: cotizacionId, // Will be null for 'otro'
        monto: ingresoMonto,
        monto_mxn: montoMXN,
        moneda: moneda,
        tipo_cambio: tipoCambio, // Store exchange rate used
        metodo_pago: data.metodo_pago,
        fecha_pago: data.fecha_pago || new Date().toISOString(),
        comprobante_url: data.comprobante_url,
        notas: data.notas,
        usuario_id: data.usuario_id, // Make sure this is passed correctly from the frontend/API
        tipo_ingreso: tipoIngreso,
        descripcion: descripcion, // Will be null for 'cotizacion'
        porcentaje_aplicado: porcentajeAplicado // Store calculated percentage for this payment
      });

    if (insertError) {
      console.error("Error inserting pago:", insertError);
      return { success: false, error: `Error al guardar el registro de pago: ${insertError.message}` };
    }

    // If it was a cotizacion payment, update the cotizacion totals and status
    if (tipoIngreso === 'cotizacion' && cotizacionId) {
        // Recalculate totals from the 'pagos' table for accuracy
        const { data: pagosCotizacion, error: pagosError } = await supabase
            .from('pagos')
            .select('monto, monto_mxn')
            .eq('cotizacion_id', cotizacionId);

        if (pagosError) {
            console.error(`Error fetching payments for cotizacion ${cotizacionId} after insert:`, pagosError);
            // Continue, but log the issue. The payment is saved, but totals might be off.
        }

        const totalPagado = pagosCotizacion?.reduce((sum, p) => sum + Number(p.monto || 0), 0) || 0;
        const totalPagadoMXN = pagosCotizacion?.reduce((sum, p) => sum + Number(p.monto_mxn || 0), 0) || 0;

        // Fetch cotizacion total again just in case (or use value from above if confident)
        const { data: cotizacion, error: cotizacionCheckError } = await supabase
          .from('cotizaciones')
          .select('total, total_mxn, monto_pagado') // Check current monto_pagado for fecha_pago_inicial logic
          .eq('cotizacion_id', cotizacionId)
          .single();

        if (cotizacionCheckError || !cotizacion) {
           console.error(`Error re-fetching cotizacion ${cotizacionId} for update:`, cotizacionCheckError);
           return { success: false, error: `Error al actualizar la cotización después de guardar el pago.` };
        }

        const cotizacionTotalMXN = Number(cotizacion.total_mxn || 0); // Use MXN total for status calculation
        const nuevoPorcentajeCompletado = (cotizacionTotalMXN > 0) ? (totalPagadoMXN / cotizacionTotalMXN) * 100 : 0;

        // Determine payment status based on MXN amounts
        let estatusPago = 'pendiente';
        if (nuevoPorcentajeCompletado >= 99.5) { // Use a threshold for floating point issues
          estatusPago = 'pagado';
        } else if (nuevoPorcentajeCompletado > 0) {
          estatusPago = 'parcial';
        }

        // Update cotizacion
        const { error: updateError } = await supabase
          .from('cotizaciones')
          .update({
            monto_pagado: totalPagado,
            monto_pagado_mxn: totalPagadoMXN,
            porcentaje_completado: nuevoPorcentajeCompletado,
            estatus_pago: estatusPago,
            // Set initial payment date only if it was previously 0
            fecha_pago_inicial: (Number(cotizacion.monto_pagado || 0) === 0 && totalPagado > 0) ? new Date().toISOString() : undefined
          })
          .eq('cotizacion_id', cotizacionId);

        if (updateError) {
          console.error(`Error updating cotizacion ${cotizacionId}:`, updateError);
          // Payment was saved, but cotizacion update failed. Log and possibly return partial success/warning?
          return { success: false, error: `Pago guardado, pero error al actualizar la cotización: ${updateError.message}` };
        }
        // Revalidate cotizaciones path only if a cotizacion was updated
        revalidatePath(`/dashboard/cotizaciones/${cotizacionId}`); // More specific revalidation
        revalidatePath('/dashboard/cotizaciones');
    }

    // Revalidate the finance page always
    revalidatePath('/dashboard/finanzas');

    return { success: true };
  } catch (error) {
    console.error('Error creating ingreso:', error);
    // Distinguish between known errors (like validation) and unexpected ones
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al crear el ingreso.';
    // Avoid exposing raw DB errors directly if possible
    return { success: false, error: errorMessage.includes('constraint') ? 'Error de base de datos.' : errorMessage };
  }
}

// Server action to create a new egreso (expense)
export async function createEgreso(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Calculate monto_mxn based on moneda
    let montoMXN = Number(data.monto);
    let tipoCambio = null;
    
    if (data.moneda === 'USD' || data.moneda === 'EUR') {
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
        notas: data.notas
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
    const supabase = await createClient();
    
    const allowedStatuses = ['pendiente', 'aprobada', 'anticipo_pagado', 'pagada_parcial', 'producción']; 

    // Fetch cotizaciones and join client name
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        moneda,
        total,
        monto_pagado,
        porcentaje_completado,
        cliente_id,
        clientes ( nombre ) /* Join and select client name */ 
      `)
      .in('estado', allowedStatuses)
      .order('fecha_creacion', { ascending: false });
    
    if (error) {
      console.error("Error fetching available cotizaciones:", error);
      return { success: false, error: error.message };
    }

    // Map data, now using the joined client name
    const mappedCotizaciones = data?.map(c => {
      const total = c.total || 0;
      const pagado = c.monto_pagado || 0;
      const restante = Math.max(0, total - pagado);
      const restanteFormatted = formatCurrency(restante, c.moneda);
      // Access the nested client name correctly
      const clienteNombre = c.clientes?.nombre || 'Cliente Desconocido'; 
      const label = `${c.folio} - ${clienteNombre} (${restanteFormatted} ${restante > 0 ? 'restante' : 'pagado'})`;
      
      return {
        ...c,
        label: label, 
        value: c.cotizacion_id, 
        restante: restante
        // No need to spread c.clientes here unless other client fields are needed downstream
      };
    }) || [];

    return { success: true, cotizaciones: mappedCotizaciones };

  } catch (error) {
    console.error('Error getting available cotizaciones:', error);
    // Return the specific error message from the throw statements
    return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch available cotizaciones' 
    };
  }
}

// --- SERVER ACTION for Ingresos CSV (Downloads ALL) ---
export async function getAllIngresosForCSV(
  // Remove month/year parameters
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('pagos')
      .select(`
        pago_id,
        tipo_ingreso,
        descripcion,
        cotizacion_id,
        cotizaciones!pagos_cotizacion_id_fkey ( folio, clientes ( nombre ) ), 
        monto,
        moneda,
        monto_mxn,
        metodo_pago,
        fecha_pago,
        notas,
        comprobante_url
      `)
      .order('fecha_pago', { ascending: false });

    // Remove date filter logic
    /* 
    if (year) { ... } 
    */

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all ingresos for CSV:', error);
      return {
        success: false,
        error: `Failed to fetch ingresos for CSV: ${error.message}`
      };
    }

    // Flatten and structure data for CSV
    const formattedData = data?.map(pago => ({
        ID_Pago: pago.pago_id,
        Tipo: pago.tipo_ingreso,
        Descripcion: pago.descripcion || 'N/A',
        ID_Cotizacion: pago.cotizacion_id || 'N/A',
        Folio_Cotizacion: pago.cotizaciones?.folio || 'N/A',
        Cliente: pago.cotizaciones?.clientes?.nombre || 'N/A',
        Monto_Original: pago.monto,
        Moneda: pago.moneda,
        Monto_MXN: pago.monto_mxn,
        Metodo_Pago: pago.metodo_pago,
        Fecha_Pago: pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString('es-MX') : '',
        Notas: pago.notas || '',
        URL_Comprobante: pago.comprobante_url || ''
    })) || [];

    // Convert to CSV string
    const csvString = convertToCSV(formattedData);

    return { success: true, data: csvString };

  } catch (error) {
    console.error('Error in getAllIngresosForCSV catch block:', error);
    // Ensure a meaningful error string is always returned
    const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
            ? error 
            : JSON.stringify(error) || 'An unexpected error occurred while generating Ingresos CSV';
    return {
      success: false,
      error: errorMessage
    };
  }
}

// --- SERVER ACTION for Egresos CSV (Downloads ALL) ---
export async function getAllEgresosForCSV(
  // Remove month/year parameters
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('egresos')
      .select('*') 
      .order('fecha', { ascending: false });

    // Remove date filter logic
    /* 
     if (year) { ... } 
    */

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all egresos for CSV:', error);
      return {
        success: false,
        error: `Failed to fetch egresos for CSV: ${error.message}`
      };
    }

     // Optional: Flatten or structure data if needed, otherwise use raw data
     const formattedData = data?.map(egreso => ({
        ID_Egreso: egreso.egreso_id,
        Descripcion: egreso.descripcion,
        Categoria: egreso.categoria,
        Fecha: egreso.fecha ? new Date(egreso.fecha + 'T00:00:00').toLocaleDateString('es-MX') : '', // Adjust date parsing if needed
        Monto_Original: egreso.monto,
        Moneda: egreso.moneda,
        Monto_MXN: egreso.monto_mxn,
        Metodo_Pago: egreso.metodo_pago,
        Notas: egreso.notas || '',
        URL_Comprobante: egreso.comprobante_url || ''
     })) || [];

    // Convert to CSV string
    const csvString = convertToCSV(formattedData);

    return { success: true, data: csvString };

  } catch (error) {
    console.error('Error in getAllEgresosForCSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while generating Egresos CSV'
    };
  }
}

// Delete ingreso (payment) function
export async function deleteIngreso(pagoId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    // Check if the payment exists and get its cotizacion_id to update totals
    const { data: pagoData, error: fetchError } = await supabase
      .from('pagos')
      .select('pago_id, cotizacion_id, monto, monto_mxn')
      .eq('pago_id', pagoId)
      .single();

    if (fetchError) {
      console.error('Error fetching payment to delete:', fetchError);
      return { success: false, error: 'Payment not found' };
    }

    if (!pagoData) {
      return { success: false, error: 'Payment not found' };
    }

    // Delete the payment
    const { error: deleteError } = await supabase
      .from('pagos')
      .delete()
      .eq('pago_id', pagoId);

    if (deleteError) {
      console.error('Error deleting payment:', deleteError);
      return { success: false, error: 'Failed to delete payment' };
    }

    // If this payment was associated with a cotizacion, update the cotizacion totals
    if (pagoData.cotizacion_id) {
      // Get all remaining payments for this cotizacion
      const { data: remainingPayments, error: paymentsError } = await supabase
        .from('pagos')
        .select('monto, monto_mxn')
        .eq('cotizacion_id', pagoData.cotizacion_id);

      if (paymentsError) {
        console.warn('Error fetching remaining payments for cotizacion update:', paymentsError);
        // Don't fail the delete operation, just log the warning
      } else {
        // Calculate new totals
        const newMontoPagado = remainingPayments?.reduce((sum, p) => sum + (Number(p.monto) || 0), 0) || 0;
        const newMontoPagadoMxn = remainingPayments?.reduce((sum, p) => sum + (Number(p.monto_mxn) || 0), 0) || 0;

        // Get the cotizacion total to calculate percentage
        const { data: cotizacionData, error: cotizacionError } = await supabase
          .from('cotizaciones')
          .select('total, total_mxn, monto_pagado') // Check current monto_pagado for fecha_pago_inicial logic
          .eq('cotizacion_id', pagoData.cotizacion_id)
          .single();

        if (!cotizacionError && cotizacionData) {
          const total = Number(cotizacionData.total_mxn || cotizacionData.total) || 0;
          const newPorcentaje = total > 0 ? Math.round((newMontoPagadoMxn / total) * 100) : 0;

          // Determine new payment status
          let newEstatusPago = 'pendiente';
          if (newPorcentaje >= 100) {
            newEstatusPago = 'pagado';
          } else if (newPorcentaje > 0) {
            newEstatusPago = 'parcial';
          }

          // Update the cotizacion
          const { error: updateError } = await supabase
            .from('cotizaciones')
            .update({
              monto_pagado: newMontoPagado,
              monto_pagado_mxn: newMontoPagadoMxn,
              porcentaje_completado: newPorcentaje,
              estatus_pago: newEstatusPago
            })
            .eq('cotizacion_id', pagoData.cotizacion_id);

          if (updateError) {
            console.warn('Error updating cotizacion after payment deletion:', updateError);
            // Don't fail the delete operation, just log the warning
          }
        }
      }
    }

    // Revalidate the finance page
    revalidatePath('/dashboard/finanzas');

    return { success: true };
  } catch (error) {
    console.error('Error deleting payment:', error);
    return { success: false, error: 'Failed to delete payment' };
  }
}

// Delete egreso function
export async function deleteEgreso(egresoId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    // Check if the egreso exists
    const { data: egresoData, error: fetchError } = await supabase
      .from('egresos')
      .select('egreso_id')
      .eq('egreso_id', egresoId)
      .single();

    if (fetchError) {
      console.error('Error fetching egreso to delete:', fetchError);
      return { success: false, error: 'Expense not found' };
    }

    if (!egresoData) {
      return { success: false, error: 'Expense not found' };
    }

    // Delete the egreso
    const { error: deleteError } = await supabase
      .from('egresos')
      .delete()
      .eq('egreso_id', egresoId);

    if (deleteError) {
      console.error('Error deleting egreso:', deleteError);
      return { success: false, error: 'Failed to delete expense' };
    }

    // Revalidate the finance page
    revalidatePath('/dashboard/finanzas');

    return { success: true };
  } catch (error) {
    console.error('Error deleting egreso:', error);
    return { success: false, error: 'Failed to delete expense' };
  }
}

export async function getCashFlowMetrics(
  month?: number, 
  year?: number
): Promise<{
  success: boolean;
  data?: {
    totalActiveQuotes: { mxn: number; usd: number };
    actualPayments: { mxn: number; usd: number };
    pendingCollections: { mxn: number; usd: number };
    collectionRate: number;
    activeCotizaciones: number;
    totalCotizaciones: number;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    // Build date filters for PAYMENTS (not cotización creation)
    let paymentDateFilter = '';
    if (year) {
      if (month) {
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
        let nextMonthYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextMonthYear += 1;
        }
        const monthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;
        paymentDateFilter = `fecha_pago.gte.${monthStart},fecha_pago.lt.${monthEnd}`;
      } else {
        const yearStart = `${year}-01-01T00:00:00Z`;
        const yearEnd = `${year}-12-31T23:59:59Z`;
        paymentDateFilter = `fecha_pago.gte.${yearStart},fecha_pago.lte.${yearEnd}`;
      }
    }

    // Get ALL cotizaciones that have had payments (sold cotizaciones)
    let cotizacionesWithPaymentsQuery = supabase
      .from('pagos')
      .select(`
        cotizacion_id,
        monto,
        monto_mxn,
        moneda,
        cotizaciones!inner (
          cotizacion_id,
          total,
          total_mxn,
          moneda,
          estado,
          estatus_pago,
          folio
        )
      `)
      .eq('tipo_ingreso', 'cotizacion')
      .not('cotizacion_id', 'is', null);

    // Apply payment date filters
    if (paymentDateFilter) {
      const filters = paymentDateFilter.split(',');
      for (const filter of filters) {
        const [field, operator, value] = filter.split('.');
        if (operator === 'gte') {
          cotizacionesWithPaymentsQuery = cotizacionesWithPaymentsQuery.gte(field, value);
        } else if (operator === 'lt') {
          cotizacionesWithPaymentsQuery = cotizacionesWithPaymentsQuery.lt(field, value);
        } else if (operator === 'lte') {
          cotizacionesWithPaymentsQuery = cotizacionesWithPaymentsQuery.lte(field, value);
        }
      }
    }

    // Get all cotizaciones for context (total count)
    const { data: allCotizaciones, error: allCotizacionesError } = await supabase
      .from('cotizaciones')
      .select('cotizacion_id');

    const { data: paymentsData, error: paymentsError } = await cotizacionesWithPaymentsQuery;

    if (paymentsError || allCotizacionesError) {
      console.error('Error fetching cash flow data:', { 
        paymentsError, 
        allCotizacionesError 
      });
      return { 
        success: false, 
        error: paymentsError?.message || allCotizacionesError?.message 
      };
    }

    // Extract unique cotizaciones and calculate actual payments in period
    const uniqueCotizaciones = new Map();
    let actualPaymentsMXN = 0;
    let actualPaymentsUSD = 0;

    paymentsData?.forEach(payment => {
      const cot = payment.cotizaciones;
      if (cot && !uniqueCotizaciones.has(cot.cotizacion_id)) {
        uniqueCotizaciones.set(cot.cotizacion_id, cot);
      }
      
      // FIXED: Sum actual payments with proper NULL handling for monto_mxn
      if (payment.moneda === 'MXN') {
        // Use monto_mxn if available, fallback to monto for MXN payments
        actualPaymentsMXN += Number(payment.monto_mxn || payment.monto || 0);
      } else if (payment.moneda === 'USD' || payment.moneda === 'EUR') {
        // For USD/EUR payments (if any), monto_mxn contains the converted amount
        actualPaymentsMXN += Number(payment.monto_mxn || 0);
        actualPaymentsUSD += Number(payment.monto || 0);
      }
    });

    const soldCotizaciones = Array.from(uniqueCotizaciones.values());

    // Calculate total value of sold cotizaciones
    let totalActiveQuotesMXN = 0;
    let totalActiveQuotesUSD = 0;

    soldCotizaciones.forEach(cot => {
      if (cot.moneda === 'MXN') {
        // For MXN cotizaciones, use total_mxn (which should equal total)
        totalActiveQuotesMXN += Number(cot.total_mxn || cot.total || 0);
      } else if (cot.moneda === 'USD' || cot.moneda === 'EUR') {
        // For USD/EUR cotizaciones, track both currencies
        totalActiveQuotesUSD += Number(cot.total || 0);
        totalActiveQuotesMXN += Number(cot.total_mxn || 0); // MXN equivalent
      }
    });

    // Calculate collection rate based on actual payments vs total value
    const totalActiveValue = totalActiveQuotesMXN + (totalActiveQuotesUSD * 20);
    const totalPaymentsValue = actualPaymentsMXN + (actualPaymentsUSD * 20);
    const collectionRate = totalActiveValue > 0 ? (totalPaymentsValue / totalActiveValue) * 100 : 0;

    // Calculate pending collections
    const pendingCollectionsMXN = totalActiveQuotesMXN - actualPaymentsMXN;
    const pendingCollectionsUSD = totalActiveQuotesUSD - actualPaymentsUSD;

    return {
      success: true,
      data: {
        totalActiveQuotes: { 
          mxn: totalActiveQuotesMXN, 
          usd: totalActiveQuotesUSD 
        },
        actualPayments: { 
          mxn: actualPaymentsMXN, 
          usd: actualPaymentsUSD 
        },
        pendingCollections: { 
          mxn: Math.max(0, pendingCollectionsMXN), 
          usd: Math.max(0, pendingCollectionsUSD) 
        },
        collectionRate: Math.round(collectionRate * 100) / 100,
        activeCotizaciones: soldCotizaciones?.length || 0,
        totalCotizaciones: allCotizaciones?.length || 0
      }
    };

  } catch (error) {
    console.error('Error calculating cash flow metrics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export async function getCotizacionPayments(
  page = 1, 
  pageSize = 10,
  month?: number,
  year?: number
): Promise<{
  success: boolean;
  data?: any[];
  pagination?: PaginationResult;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    const offset = (page - 1) * pageSize;

    // Build the query for payments from ALL cotizaciones that have been sold (have payments)
    let query = supabase
      .from('pagos')
      .select(`
        pago_id,
        cotizacion_id,
        monto,
        monto_mxn,
        moneda,
        metodo_pago,
        fecha_pago,
        notas,
        porcentaje_aplicado,
        cotizaciones!inner (
          cotizacion_id,
          folio,
          total,
          total_mxn,
          moneda,
          cliente_id,
          fecha_creacion,
          estado,
          estatus_pago
        )
      `, { count: 'exact' })
      .eq('tipo_ingreso', 'cotizacion')
      .not('cotizacion_id', 'is', null);

    // Apply date filters
    if (year) {
      if (month) {
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
        let nextMonthYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextMonthYear += 1;
        }
        const monthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;
        query = query.gte('fecha_pago', monthStart).lt('fecha_pago', monthEnd);
      } else {
        const yearStart = `${year}-01-01T00:00:00Z`;
        const yearEnd = `${year}-12-31T23:59:59Z`;
        query = query.gte('fecha_pago', yearStart).lte('fecha_pago', yearEnd);
      }
    }

    const { data: payments, error: paymentsError, count } = await query
      .order('fecha_pago', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (paymentsError) {
      console.error('Error fetching cotizacion payments:', paymentsError);
      return { success: false, error: paymentsError.message };
    }

    // Get client names for the cotizaciones
    const clienteIds = [...new Set(
      payments?.map(p => p.cotizaciones?.cliente_id).filter(Boolean)
    )];

    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('cliente_id, nombre')
      .in('cliente_id', clienteIds);

    if (clientesError) {
      console.warn('Error fetching client names:', clientesError);
    }

    const clienteMap = clientes?.reduce((acc: { [key: number]: string }, cliente) => {
      acc[cliente.cliente_id] = cliente.nombre;
      return acc;
    }, {}) || {};

    // Format the data
    const formattedPayments = payments?.map(payment => ({
      ...payment,
      cliente_nombre: clienteMap[payment.cotizaciones?.cliente_id as number] || 'Cliente desconocido',
      folio: payment.cotizaciones?.folio,
      cotizacion_total: payment.cotizaciones?.total,
      cotizacion_estado: payment.cotizaciones?.estado
    })) || [];

    return {
      success: true,
      data: formattedPayments,
      pagination: {
        page,
        totalPages: Math.ceil((count || 0) / pageSize),
        totalItems: count || 0,
        itemsPerPage: pageSize
      }
    };

  } catch (error) {
    console.error('Error fetching cotizacion payments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Get all cash flow data for CSV export (filtered by month/year)
export async function getCashFlowDataForCSV(
  month?: number,
  year?: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    // Build the query for ALL payments from cotizaciones (sold = has payments)
    let query = supabase
      .from('pagos')
      .select(`
        pago_id,
        cotizacion_id,
        monto,
        monto_mxn,
        moneda,
        metodo_pago,
        fecha_pago,
        notas,
        porcentaje_aplicado,
        cotizaciones!inner (
          cotizacion_id,
          folio,
          total,
          total_mxn,
          moneda,
          cliente_id,
          fecha_creacion,
          estado,
          estatus_pago
        )
      `)
      .eq('tipo_ingreso', 'cotizacion')
      .not('cotizacion_id', 'is', null);

    // Apply date filters
    if (year) {
      if (month) {
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
        let nextMonthYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextMonthYear += 1;
        }
        const monthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;
        query = query.gte('fecha_pago', monthStart).lt('fecha_pago', monthEnd);
      } else {
        const yearStart = `${year}-01-01T00:00:00Z`;
        const yearEnd = `${year}-12-31T23:59:59Z`;
        query = query.gte('fecha_pago', yearStart).lte('fecha_pago', yearEnd);
      }
    }

    const { data: payments, error: paymentsError } = await query
      .order('fecha_pago', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching cash flow payments for CSV:', paymentsError);
      return { success: false, error: `Failed to fetch cash flow data: ${paymentsError.message}` };
    }

    if (!payments || payments.length === 0) {
      // Return empty CSV with headers
      const headers = [
        'ID_Pago',
        'Folio_Cotizacion',
        'Cliente',
        'Fecha_Pago',
        'Monto_Original',
        'Moneda',
        'Metodo_Pago',
        'Total_Cotizacion',
        'Estatus_Pago',
        'Estado_Cotizacion'
      ].join(',');
      return { success: true, data: headers };
    }

    // Get client names for the cotizaciones
    const clienteIds = [...new Set(
      payments?.map(p => p.cotizaciones?.cliente_id).filter(Boolean)
    )];

    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('cliente_id, nombre')
      .in('cliente_id', clienteIds);

    if (clientesError) {
      console.warn('Error fetching client names for CSV:', clientesError);
    }

    const clienteMap = clientes?.reduce((acc: { [key: number]: string }, cliente) => {
      acc[cliente.cliente_id] = cliente.nombre;
      return acc;
    }, {}) || {};

    // Format the data for CSV
    const formattedData = payments?.map(payment => ({
      ID_Pago: payment.pago_id,
      Folio_Cotizacion: payment.cotizaciones?.folio || '',
      Cliente: clienteMap[payment.cotizaciones?.cliente_id as number] || 'Cliente desconocido',
      Fecha_Pago: payment.fecha_pago ? new Date(payment.fecha_pago).toLocaleDateString('es-MX') : '',
      Monto_Original: payment.monto,
      Moneda: payment.moneda,
      Metodo_Pago: payment.metodo_pago,
      Total_Cotizacion: payment.cotizaciones?.total || payment.cotizaciones?.total_mxn || 0,
      Estatus_Pago: payment.cotizaciones?.estatus_pago || '',
      Estado_Cotizacion: payment.cotizaciones?.estado || ''
    })) || [];

    // Convert to CSV string
    const csvString = convertToCSV(formattedData);

    return { success: true, data: csvString };

  } catch (error) {
    console.error('Error in getCashFlowDataForCSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while generating Cash Flow CSV'
    };
  }
}

// Get all historic cash flow data for CSV export (no date filters)
export async function getCashFlowDataForCSVHistoric(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    // Get ALL cotizaciones that have had payments (historically sold), regardless of current status
    const { data: payments, error: paymentsError } = await supabase
      .from('pagos')
      .select(`
        pago_id,
        cotizacion_id,
        monto,
        monto_mxn,
        moneda,
        metodo_pago,
        fecha_pago,
        notas,
        porcentaje_aplicado,
        cotizaciones!inner (
          cotizacion_id,
          folio,
          total,
          total_mxn,
          moneda,
          cliente_id,
          fecha_creacion,
          estado,
          estatus_pago
        )
      `)
      .eq('tipo_ingreso', 'cotizacion')
      .not('cotizacion_id', 'is', null)
      .order('fecha_pago', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching historic cash flow payments for CSV:', paymentsError);
      return { success: false, error: `Failed to fetch historic cash flow data: ${paymentsError.message}` };
    }

    if (!payments || payments.length === 0) {
      // Return empty CSV with headers
      const headers = [
        'ID_Pago',
        'Folio_Cotizacion',
        'Cliente',
        'Fecha_Pago',
        'Monto_Original',
        'Moneda',
        'Metodo_Pago',
        'Total_Cotizacion',
        'Estatus_Pago',
        'Estado_Cotizacion'
      ].join(',');
      return { success: true, data: headers };
    }

    // Get client names for the cotizaciones
    const clienteIds = [...new Set(
      payments?.map(p => p.cotizaciones?.cliente_id).filter(Boolean)
    )];

    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('cliente_id, nombre')
      .in('cliente_id', clienteIds);

    if (clientesError) {
      console.warn('Error fetching client names for historic CSV:', clientesError);
    }

    const clienteMap = clientes?.reduce((acc: { [key: number]: string }, cliente) => {
      acc[cliente.cliente_id] = cliente.nombre;
      return acc;
    }, {}) || {};

    // Format the data for CSV
    const formattedData = payments?.map(payment => ({
      ID_Pago: payment.pago_id,
      Folio_Cotizacion: payment.cotizaciones?.folio || '',
      Cliente: clienteMap[payment.cotizaciones?.cliente_id as number] || 'Cliente desconocido',
      Fecha_Pago: payment.fecha_pago ? new Date(payment.fecha_pago).toLocaleDateString('es-MX') : '',
      Monto_Original: payment.monto,
      Moneda: payment.moneda,
      Metodo_Pago: payment.metodo_pago,
      Total_Cotizacion: payment.cotizaciones?.total || payment.cotizaciones?.total_mxn || 0,
      Estatus_Pago: payment.cotizaciones?.estatus_pago || '',
      Estado_Cotizacion: payment.cotizaciones?.estado || ''
    })) || [];

    // Convert to CSV string
    const csvString = convertToCSV(formattedData);

    return { success: true, data: csvString };

  } catch (error) {
    console.error('Error in getCashFlowDataForCSVHistoric:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while generating historic Cash Flow CSV'
    };
  }
}

// Get all financial data (ingresos + egresos) combined for CSV export (historic)
export async function getAllFinancialDataForCSV(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    console.log('[getAllFinancialDataForCSV] Starting CSV generation...');

    // Get all ingresos (pagos)
    const { data: ingresos, error: ingresosError } = await supabase
      .from('pagos')
      .select(`
        pago_id,
        monto,
        monto_mxn,
        moneda,
        metodo_pago,
        fecha_pago,
        tipo_pago,
        estado,
        notas,
        descripcion,
        tipo_ingreso,
        cotizacion_id,
        cotizaciones!inner(folio, clientes!inner(nombre))
      `)
      .order('fecha_pago', { ascending: false });

    if (ingresosError) {
      console.error('[getAllFinancialDataForCSV] Error fetching ingresos:', ingresosError);
      return { success: false, error: `Error fetching ingresos: ${ingresosError.message}` };
    }

    // Get all egresos
    const { data: egresos, error: egresosError } = await supabase
      .from('egresos')
      .select('*')
      .order('fecha', { ascending: false });

    if (egresosError) {
      console.error('[getAllFinancialDataForCSV] Error fetching egresos:', egresosError);
      return { success: false, error: `Error fetching egresos: ${egresosError.message}` };
    }

    const allData: any[] = [];

    // Add ingresos
    if (Array.isArray(ingresos)) {
      ingresos.forEach((ingreso) => {
        allData.push({
          Tipo: 'Ingreso',
          Fecha: ingreso.fecha_pago ? new Date(ingreso.fecha_pago).toISOString().slice(0, 10) : '',
          Descripcion: ingreso.descripcion || 
            (ingreso.cotizaciones?.folio ? `Pago de cotización ${ingreso.cotizaciones.folio}` : 'Ingreso general'),
          Categoria: ingreso.tipo_pago || 'Sin categoría',
          Cliente: ingreso.cotizaciones?.clientes?.nombre || 'N/A',
          Folio: ingreso.cotizaciones?.folio || 'N/A',
          Moneda: ingreso.moneda,
          Monto: ingreso.monto,
          MontoMXN: ingreso.monto_mxn,
          MetodoPago: ingreso.metodo_pago,
          Estado: ingreso.estado,
          Notas: ingreso.notas || ''
        });
      });
    }

    // Add egresos
    if (Array.isArray(egresos)) {
      egresos.forEach((egreso) => {
        allData.push({
          Tipo: 'Egreso',
          Fecha: egreso.fecha ? new Date(egreso.fecha).toISOString().slice(0, 10) : '',
          Descripcion: egreso.descripcion,
          Categoria: egreso.categoria,
          Cliente: 'N/A',
          Folio: 'N/A',
          Moneda: egreso.moneda,
          Monto: egreso.monto,
          MontoMXN: egreso.monto_mxn,
          MetodoPago: egreso.metodo_pago,
          Estado: 'Completado',
          Notas: ''
        });
      });
    }

    if (allData.length === 0) {
      console.log('[getAllFinancialDataForCSV] No financial data found');
      return { success: true, data: '' };
    }

    const csvData = convertToCSV(allData);
    console.log(`[getAllFinancialDataForCSV] CSV generated successfully with ${allData.length} records`);
    return { success: true, data: csvData };

  } catch (error) {
    console.error('[getAllFinancialDataForCSV] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// New server action for downloading ventas (cotizaciones sold) with filters
export async function getVentasForCSV(
  month?: number,
  year?: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    console.log('[getVentasForCSV] Starting ventas CSV generation with filters:', { month, year });

    // Build query from payments table (where actual payment dates are) and join to cotizaciones
    let query = supabase
      .from('pagos')
      .select(`
        fecha_pago,
        monto,
        monto_mxn,
        moneda,
        metodo_pago,
        cotizaciones!inner (
          cotizacion_id,
          folio,
          fecha_creacion,
          fecha_pago_inicial,
          moneda,
          total,
          total_mxn,
          clientes!inner(nombre, correo, celular, razon_social)
        )
      `)
      .eq('tipo_ingreso', 'cotizacion')
      .not('cotizacion_id', 'is', null);

    // Apply filters if provided (only if not "Todos" - which is 0)
    if (year && year > 0) {
      const yearStart = `${year}-01-01T00:00:00Z`;
      const yearEnd = `${year}-12-31T23:59:59Z`;
      
      if (month && month > 0) {
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;
        query = query.filter('fecha_pago', 'gte', monthStart).filter('fecha_pago', 'lt', monthEnd);
      } else {
        query = query.filter('fecha_pago', 'gte', yearStart).filter('fecha_pago', 'lte', yearEnd);
      }
    }
    // If year is 0 or undefined, no date filters are applied (gets all records)

    const { data: pagos, error } = await query.order('fecha_pago', { ascending: false });

    if (error) {
      console.error('[getVentasForCSV] Error fetching ventas:', error);
      return { success: false, error: `Error fetching ventas: ${error.message}` };
    }

    if (!Array.isArray(pagos) || pagos.length === 0) {
      console.log('[getVentasForCSV] No ventas found for the specified filters');
      return { success: true, data: '' };
    }

    // Group payments by cotizacion to avoid duplicates and get unique sales
    const cotizacionesMap = new Map();
    
    pagos.forEach(pago => {
      const cotizacion = pago.cotizaciones;
      if (cotizacion && !cotizacionesMap.has(cotizacion.cotizacion_id)) {
        cotizacionesMap.set(cotizacion.cotizacion_id, {
          ...cotizacion,
          primera_fecha_pago: pago.fecha_pago
        });
      }
    });

    const ventasUnicas = Array.from(cotizacionesMap.values());

    // Transform data for CSV
    const csvData = ventasUnicas.map((venta) => ({
      Folio: venta.folio || '',
      FechaCreacion: venta.fecha_creacion ? new Date(venta.fecha_creacion).toLocaleDateString('es-MX') : '',
      PrimeraFechaPago: venta.primera_fecha_pago ? new Date(venta.primera_fecha_pago).toLocaleDateString('es-MX') : '',
      FechaPagoInicial: venta.fecha_pago_inicial ? new Date(venta.fecha_pago_inicial).toLocaleDateString('es-MX') : '',
      Cliente: venta.clientes?.nombre || '',
      RazonSocial: venta.clientes?.razon_social || '',
      Correo: venta.clientes?.correo || '',
      Celular: venta.clientes?.celular || '',
      Moneda: venta.moneda || '',
      Total: venta.total || 0
    }));

    const csvString = convertToCSV(csvData);
    console.log(`[getVentasForCSV] CSV generated successfully with ${csvData.length} records`);
    return { success: true, data: csvString };

  } catch (error) {
    console.error('[getVentasForCSV] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// New server action for downloading only ingresos with filters
export async function getIngresosFilteredForCSV(
  month?: number,
  year?: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    console.log('[getIngresosFilteredForCSV] Starting ingresos CSV generation with filters:', { month, year });

    // Build query for ingresos with filters
    let query = supabase
      .from('pagos')
      .select(`
        pago_id,
        monto,
        monto_mxn,
        moneda,
        metodo_pago,
        fecha_pago,
        tipo_pago,
        estado,
        notas,
        descripcion,
        tipo_ingreso,
        porcentaje_aplicado,
        cotizacion_id,
        cotizaciones(folio, clientes(nombre))
      `);

    // Apply filters if provided (only if not "Todos" - which is 0)
    if (year && year > 0) {
      const yearStart = `${year}-01-01T00:00:00Z`;
      const yearEnd = `${year}-12-31T23:59:59Z`;
      
      if (month && month > 0) {
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;
        query = query.filter('fecha_pago', 'gte', monthStart).filter('fecha_pago', 'lt', monthEnd);
      } else {
        query = query.filter('fecha_pago', 'gte', yearStart).filter('fecha_pago', 'lte', yearEnd);
      }
    }
    // If year is 0 or undefined, no date filters are applied (gets all records)

    const { data: ingresos, error } = await query.order('fecha_pago', { ascending: false });

    if (error) {
      console.error('[getIngresosFilteredForCSV] Error fetching ingresos:', error);
      return { success: false, error: `Error fetching ingresos: ${error.message}` };
    }

    if (!Array.isArray(ingresos) || ingresos.length === 0) {
      console.log('[getIngresosFilteredForCSV] No ingresos found for the specified filters');
      return { success: true, data: '' };
    }

    // Transform data for CSV
    const csvData = ingresos.map((ingreso) => ({
      PagoID: ingreso.pago_id,
      Fecha: ingreso.fecha_pago ? new Date(ingreso.fecha_pago).toLocaleDateString('es-MX') : '',
      TipoIngreso: ingreso.tipo_ingreso || '',
      Descripcion: ingreso.descripcion || 
        (ingreso.cotizaciones?.folio ? `Pago de cotización ${ingreso.cotizaciones.folio}` : 'Ingreso general'),
      Cliente: ingreso.cotizaciones?.clientes?.nombre || 'N/A',
      Folio: ingreso.cotizaciones?.folio || 'N/A',
      Moneda: ingreso.moneda,
      Monto: ingreso.monto,
      MontoMXN: ingreso.monto_mxn,
      MetodoPago: ingreso.metodo_pago,
      TipoPago: ingreso.tipo_pago || '',
      PorcentajeAplicado: ingreso.porcentaje_aplicado || '',
      Estado: ingreso.estado,
      Notas: ingreso.notas || ''
    }));

    const csvString = convertToCSV(csvData);
    console.log(`[getIngresosFilteredForCSV] CSV generated successfully with ${csvData.length} records`);
    return { success: true, data: csvString };

  } catch (error) {
    console.error('[getIngresosFilteredForCSV] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// New server action for downloading only egresos with filters
export async function getEgresosFilteredForCSV(
  month?: number,
  year?: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    console.log('[getEgresosFilteredForCSV] Starting egresos CSV generation with filters:', { month, year });

    // Build query for egresos with filters
    let query = supabase
      .from('egresos')
      .select('*');

    // Apply filters if provided (only if not "Todos" - which is 0)
    if (year && year > 0) {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      
      if (month && month > 0) {
        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
        query = query.filter('fecha', 'gte', monthStart).filter('fecha', 'lte', monthEnd);
      } else {
        query = query.filter('fecha', 'gte', yearStart).filter('fecha', 'lte', yearEnd);
      }
    }
    // If year is 0 or undefined, no date filters are applied (gets all records)

    const { data: egresos, error } = await query.order('fecha', { ascending: false });

    if (error) {
      console.error('[getEgresosFilteredForCSV] Error fetching egresos:', error);
      return { success: false, error: `Error fetching egresos: ${error.message}` };
    }

    if (!Array.isArray(egresos) || egresos.length === 0) {
      console.log('[getEgresosFilteredForCSV] No egresos found for the specified filters');
      return { success: true, data: '' };
    }

    // Transform data for CSV
    const csvData = egresos.map((egreso) => ({
      EgresoID: egreso.egreso_id,
      Fecha: egreso.fecha ? new Date(egreso.fecha).toLocaleDateString('es-MX') : '',
      Descripcion: egreso.descripcion || '',
      Categoria: egreso.categoria || '',
      Moneda: egreso.moneda,
      Monto: egreso.monto,
      MontoMXN: egreso.monto_mxn,
      MetodoPago: egreso.metodo_pago,
      Notas: egreso.notas || ''
    }));

    const csvString = convertToCSV(csvData);
    console.log(`[getEgresosFilteredForCSV] CSV generated successfully with ${csvData.length} records`);
    return { success: true, data: csvString };

  } catch (error) {
    console.error('[getEgresosFilteredForCSV] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// --- REPORTES SECTION ACTIONS ---

export async function getVentasMonthlyReport(
  year: number,
  month: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    console.log('[getVentasMonthlyReport] Generating monthly ventas report for:', { year, month });
    
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;

    let query = supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        fecha_creacion,
        fecha_pago_inicial,
        moneda,
        total,
        clientes!inner(nombre, correo, celular, razon_social)
      `)
      .in('estatus_pago', ['anticipo', 'parcial', 'pagado'])
      .filter('fecha_pago_inicial', 'gte', monthStart)
      .filter('fecha_pago_inicial', 'lt', monthEnd);

    const { data: ventas, error } = await query.order('fecha_pago_inicial', { ascending: false });

    if (error) {
      console.error('[getVentasMonthlyReport] Error fetching ventas:', error);
      return { success: false, error: `Error fetching ventas: ${error.message}` };
    }

    if (!Array.isArray(ventas) || ventas.length === 0) {
      console.log('[getVentasMonthlyReport] No ventas found for the specified period');
      return { success: true, data: '' };
    }

    const csvData = ventas.map((venta) => ({
      Folio: venta.folio || '',
      FechaCreacion: venta.fecha_creacion ? new Date(venta.fecha_creacion).toLocaleDateString('es-MX') : '',
      FechaPagoInicial: venta.fecha_pago_inicial ? new Date(venta.fecha_pago_inicial).toLocaleDateString('es-MX') : '',
      Cliente: venta.clientes?.nombre || '',
      RazonSocial: venta.clientes?.razon_social || '',
      Correo: venta.clientes?.correo || '',
      Celular: venta.clientes?.celular || '',
      Moneda: venta.moneda || '',
      Total: venta.total || 0
    }));

    const csvString = convertToCSV(csvData);
    console.log(`[getVentasMonthlyReport] CSV generated successfully with ${csvData.length} records`);
    return { success: true, data: csvString };

  } catch (error) {
    console.error('[getVentasMonthlyReport] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function getVentasBiMonthlyReport(
  year: number,
  startMonth: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    console.log('[getVentasBiMonthlyReport] Generating bi-monthly ventas report for:', { year, startMonth });
    
    const monthStart = `${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00Z`;
    const endMonth = startMonth + 2 > 12 ? startMonth + 2 - 12 : startMonth + 2;
    const endYear = startMonth + 2 > 12 ? year + 1 : year;
    const monthEnd = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00Z`;

    let query = supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        fecha_creacion,
        fecha_pago_inicial,
        moneda,
        total,
        clientes!inner(nombre, correo, celular, razon_social)
      `)
      .in('estatus_pago', ['anticipo', 'parcial', 'pagado'])
      .filter('fecha_pago_inicial', 'gte', monthStart)
      .filter('fecha_pago_inicial', 'lt', monthEnd);

    const { data: ventas, error } = await query.order('fecha_pago_inicial', { ascending: false });

    if (error) {
      console.error('[getVentasBiMonthlyReport] Error fetching ventas:', error);
      return { success: false, error: `Error fetching ventas: ${error.message}` };
    }

    if (!Array.isArray(ventas) || ventas.length === 0) {
      console.log('[getVentasBiMonthlyReport] No ventas found for the specified period');
      return { success: true, data: '' };
    }

    const csvData = ventas.map((venta) => ({
      Folio: venta.folio || '',
      FechaCreacion: venta.fecha_creacion ? new Date(venta.fecha_creacion).toLocaleDateString('es-MX') : '',
      FechaPagoInicial: venta.fecha_pago_inicial ? new Date(venta.fecha_pago_inicial).toLocaleDateString('es-MX') : '',
      Cliente: venta.clientes?.nombre || '',
      RazonSocial: venta.clientes?.razon_social || '',
      Correo: venta.clientes?.correo || '',
      Celular: venta.clientes?.celular || '',
      Moneda: venta.moneda || '',
      Total: venta.total || 0
    }));

    const csvString = convertToCSV(csvData);
    console.log(`[getVentasBiMonthlyReport] CSV generated successfully with ${csvData.length} records`);
    return { success: true, data: csvString };

  } catch (error) {
    console.error('[getVentasBiMonthlyReport] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function getVentasTriMonthlyReport(
  year: number,
  quarter: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    console.log('[getVentasTriMonthlyReport] Generating tri-monthly ventas report for:', { year, quarter });
    
    const startMonth = (quarter - 1) * 3 + 1;
    const monthStart = `${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00Z`;
    const endMonth = startMonth + 3 > 12 ? startMonth + 3 - 12 : startMonth + 3;
    const endYear = startMonth + 3 > 12 ? year + 1 : year;
    const monthEnd = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00Z`;

    let query = supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        fecha_creacion,
        fecha_pago_inicial,
        moneda,
        total,
        clientes!inner(nombre, correo, celular, razon_social)
      `)
      .in('estatus_pago', ['anticipo', 'parcial', 'pagado'])
      .filter('fecha_pago_inicial', 'gte', monthStart)
      .filter('fecha_pago_inicial', 'lt', monthEnd);

    const { data: ventas, error } = await query.order('fecha_pago_inicial', { ascending: false });

    if (error) {
      console.error('[getVentasTriMonthlyReport] Error fetching ventas:', error);
      return { success: false, error: `Error fetching ventas: ${error.message}` };
    }

    if (!Array.isArray(ventas) || ventas.length === 0) {
      console.log('[getVentasTriMonthlyReport] No ventas found for the specified period');
      return { success: true, data: '' };
    }

    const csvData = ventas.map((venta) => ({
      Folio: venta.folio || '',
      FechaCreacion: venta.fecha_creacion ? new Date(venta.fecha_creacion).toLocaleDateString('es-MX') : '',
      FechaPagoInicial: venta.fecha_pago_inicial ? new Date(venta.fecha_pago_inicial).toLocaleDateString('es-MX') : '',
      Cliente: venta.clientes?.nombre || '',
      RazonSocial: venta.clientes?.razon_social || '',
      Correo: venta.clientes?.correo || '',
      Celular: venta.clientes?.celular || '',
      Moneda: venta.moneda || '',
      Total: venta.total || 0
    }));

    const csvString = convertToCSV(csvData);
    console.log(`[getVentasTriMonthlyReport] CSV generated successfully with ${csvData.length} records`);
    return { success: true, data: csvString };

  } catch (error) {
    console.error('[getVentasTriMonthlyReport] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function getVentasAnnualReport(
  year: number
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();
    console.log('[getVentasAnnualReport] Generating annual ventas report for:', { year });
    
    const yearStart = `${year}-01-01T00:00:00Z`;
    const yearEnd = `${year}-12-31T23:59:59Z`;

    let query = supabase
      .from('cotizaciones')
      .select(`
        cotizacion_id,
        folio,
        fecha_creacion,
        fecha_pago_inicial,
        moneda,
        total,
        clientes!inner(nombre, correo, celular, razon_social)
      `)
      .in('estatus_pago', ['anticipo', 'parcial', 'pagado'])
      .filter('fecha_pago_inicial', 'gte', yearStart)
      .filter('fecha_pago_inicial', 'lte', yearEnd);

    const { data: ventas, error } = await query.order('fecha_pago_inicial', { ascending: false });

    if (error) {
      console.error('[getVentasAnnualReport] Error fetching ventas:', error);
      return { success: false, error: `Error fetching ventas: ${error.message}` };
    }

    if (!Array.isArray(ventas) || ventas.length === 0) {
      console.log('[getVentasAnnualReport] No ventas found for the specified period');
      return { success: true, data: '' };
    }

    const csvData = ventas.map((venta) => ({
      Folio: venta.folio || '',
      FechaCreacion: venta.fecha_creacion ? new Date(venta.fecha_creacion).toLocaleDateString('es-MX') : '',
      FechaPagoInicial: venta.fecha_pago_inicial ? new Date(venta.fecha_pago_inicial).toLocaleDateString('es-MX') : '',
      Cliente: venta.clientes?.nombre || '',
      RazonSocial: venta.clientes?.razon_social || '',
      Correo: venta.clientes?.correo || '',
      Celular: venta.clientes?.celular || '',
      Moneda: venta.moneda || '',
      Total: venta.total || 0
    }));

    const csvString = convertToCSV(csvData);
    console.log(`[getVentasAnnualReport] CSV generated successfully with ${csvData.length} records`);
    return { success: true, data: csvString };

  } catch (error) {
    console.error('[getVentasAnnualReport] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Function to ensure opening balance exists for a given month
export async function ensureOpeningBalance(
  year: number, 
  month: number
): Promise<{ success: boolean; data?: { mxn: number; usd: number }; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: openingBalanceData, error } = await supabase
      .rpc('get_opening_balance', { target_year: year, target_month: month });
    
    if (error) {
      console.error('Error getting opening balance:', error);
      return { success: false, error: error.message };
    }
    
    if (openingBalanceData && openingBalanceData.length > 0) {
      const balance = openingBalanceData[0];
      // Parse the PostgreSQL row format "(amount_mxn,amount_usd)"
      const values = balance.get_opening_balance.replace(/[()]/g, '').split(',');
      const mxn = parseFloat(values[0]) || 0;
      const usd = parseFloat(values[1]) || 0;
      
      return {
        success: true,
        data: { mxn, usd }
      };
    }
    
    return { success: false, error: 'No opening balance found' };
  } catch (error) {
    console.error('Error ensuring opening balance:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to ensure opening balance' 
    };
  }
}

// Function to create opening balance ingreso for a specific month
export async function createOpeningBalanceIngreso(
  year: number, 
  month: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    // Check if opening balance ingreso already exists for this month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const { data: existingIngreso } = await supabase
      .from('pagos')
      .select('*')
      .eq('tipo_ingreso', 'otro')
      .eq('descripcion', 'Saldo inicial del mes')
      .gte('fecha_pago', `${year}-${month.toString().padStart(2, '0')}-01T00:00:00Z`)
      .lt('fecha_pago', `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00Z`)
      .single();
    
    if (existingIngreso) {
      return { success: true }; // Already exists
    }
    
    // Get the opening balance amount
    const { data: openingBalanceData, error: balanceError } = await supabase
      .rpc('get_opening_balance', { target_year: year, target_month: month });
    
    if (balanceError || !openingBalanceData || openingBalanceData.length === 0) {
      return { success: false, error: 'Could not calculate opening balance' };
    }
    
    const balance = openingBalanceData[0];
    const values = balance.opening_mxn ? [balance.opening_mxn, balance.opening_usd] : 
                    balance.get_opening_balance.replace(/[()]/g, '').split(',');
    const openingBalanceMXN = parseFloat(values[0]) || 0;
    const openingBalanceUSD = parseFloat(values[1]) || 0;
    
    // Only create ingreso if there's a non-zero opening balance
    if (openingBalanceMXN !== 0 || openingBalanceUSD !== 0) {
      // Create opening balance as ingreso entry
      const { error: insertError } = await supabase
        .from('pagos')
        .insert({
          tipo_ingreso: 'otro',
          descripcion: 'Saldo inicial del mes',
          moneda: 'MXN',
          monto: openingBalanceMXN,
          monto_mxn: openingBalanceMXN,
          metodo_pago: 'saldo_anterior',
          fecha_pago: `${year}-${month.toString().padStart(2, '0')}-01T00:00:01Z`,
          tipo_pago: 'saldo_inicial',
          estado: 'aprobado',
          notas: `Saldo arrastrado del mes anterior (${month === 1 ? 12 : month - 1}/${month === 1 ? year - 1 : year})`
        });
      
      if (insertError) {
        console.error('Error creating opening balance ingreso:', insertError);
        return { success: false, error: insertError.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating opening balance ingreso:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create opening balance ingreso' 
    };
  }
}

// --- ACCOUNTS RECEIVABLE (CUENTAS POR COBRAR) SERVER ACTIONS ---

export async function getAccountsReceivableMetrics(
  month?: number,
  year?: number
): Promise<{ success: boolean; data?: AccountsReceivableMetrics; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Use RPC function to get metrics
    const { data: metricsData, error } = await supabase.rpc('get_accounts_receivable_metrics', {
      filter_month: month || null,
      filter_year: year || null
    });

    if (error) {
      console.error('Error fetching accounts receivable metrics:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: metricsData
    };
  } catch (error) {
    console.error('Error getting accounts receivable metrics:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get accounts receivable metrics' 
    };
  }
}

export async function getAccountsReceivableList(
  page: number = 1,
  itemsPerPage: number = 10,
  month?: number,
  year?: number
): Promise<{ success: boolean; data?: AccountReceivableItem[]; pagination?: PaginationResult; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Use RPC function to get accounts receivable list
    const { data: listData, error } = await supabase.rpc('get_accounts_receivable_list', {
      page_num: page,
      items_per_page: itemsPerPage,
      filter_month: month || null,
      filter_year: year || null
    });

    if (error) {
      console.error('Error fetching accounts receivable list:', error);
      return { success: false, error: error.message };
    }

    // Process the JSON response from RPC function
    const accountsData = listData?.data || [];
    const totalCount = listData?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    // Process and calculate fields for each account
    const processedAccounts = accountsData.map((account: any) => {
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
    });

    return {
      success: true,
      data: processedAccounts,
      pagination: {
        page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage
      }
    };
  } catch (error) {
    console.error('Error getting accounts receivable list:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get accounts receivable list' 
    };
  }
} 