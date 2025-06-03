"use server";

// Import the exported Supabase client instance directly
import { supabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { convertToCSV, formatCurrency } from '@/lib/utils'; // Import the helper and formatCurrency

// Types for financial data
interface FinancialMetrics {
  ingresos: { mxn: number; usd: number };
  egresos: { mxn: number; usd: number };
  balance: { mxn: number; usd: number };
  cotizacionesPagadas: number;
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
    // Base queries
    let ingresosMXNQuery = supabase
      .from('cotizacion_pagos_view')
      .select('monto_mxn')
      .eq('moneda', 'MXN');
      
    let ingresosUSDQuery = supabase
      .from('cotizacion_pagos_view')
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
        const monthStartIngresos = new Date(year, month - 1, 1).toISOString();
        const monthEndIngresos = new Date(year, month, 1).toISOString(); // Use less than start of next month
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
         const monthStart = new Date(year, month - 1, 1).toISOString();
         // Calculate the first day of the next month
         let nextMonthYear = year;
         let nextMonth = month + 1;
         if (nextMonth > 12) {
             nextMonth = 1;
             nextMonthYear += 1;
         }
         const monthEnd = new Date(nextMonthYear, nextMonth - 1, 1).toISOString();
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
         const monthStart = new Date(year, month - 1, 1).toISOString();
         let nextMonthYear = year;
         let nextMonth = month + 1;
         if (nextMonth > 12) {
             nextMonth = 1;
             nextMonthYear += 1;
         }
         const monthEnd = new Date(nextMonthYear, nextMonth - 1, 1).toISOString();
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
    if (moneda === 'USD') {
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