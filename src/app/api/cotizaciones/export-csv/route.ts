import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get search params for filtering
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || '';
    const filterEstado = searchParams.get('estado') || 'todos';
    
    console.log('CSV export with filters:', { searchTerm, filterEstado });
    
              // Build the base query using Supabase's query builder
     let query = supabase
       .from('cotizaciones')
       .select(`
         cotizacion_id,
         folio,
         fecha_creacion,
         estado,
         cliente:cliente_id (
           nombre
         ),
         cotizacion_productos!cotizacion_productos_cotizacion_id_fkey (
           cotizacion_producto_id,
           precio_unitario,
           cantidad,
           producto:producto_id (
             nombre,
             sku
           )
         ),
         pagos (
           fecha_pago,
           tipo_pago,
           estado
         )
       `)
       .order('fecha_creacion', { ascending: false });
     
     // Add status filter (this works fine with direct fields)
     if (filterEstado && filterEstado !== 'todos') {
       query = query.eq('estado', filterEstado);
     }
     
     const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Error al obtener los datos' }, { status: 500 });
    }
    
         if (!data || !Array.isArray(data)) {
       return NextResponse.json({ error: 'No se encontraron datos' }, { status: 404 });
     }
     
     // Apply search filter to the fetched data
     let filteredData = data;
     if (searchTerm) {
       const searchLower = searchTerm.toLowerCase();
       filteredData = data.filter((cotizacion: any) => {
         const cliente = Array.isArray(cotizacion.cliente) ? cotizacion.cliente[0] : cotizacion.cliente;
         const folio = cotizacion.folio || '';
         const clienteNombre = cliente?.nombre || '';
         
         return folio.toLowerCase().includes(searchLower) || 
                clienteNombre.toLowerCase().includes(searchLower);
       });
     }
     
     // Flatten the data for CSV
     const csvData: any[] = [];
     
     filteredData.forEach((cotizacion: any) => {
      const cliente = Array.isArray(cotizacion.cliente) ? cotizacion.cliente[0] : cotizacion.cliente;
      const productos = cotizacion.cotizacion_productos || [];
      const pagos = cotizacion.pagos || [];
      
      // Find the first anticipo payment
      const anticipoPayment = pagos.find((pago: any) => 
        pago.tipo_pago === 'anticipo' && pago.estado === 'completado'
      );
      
      if (productos.length === 0) {
        // Handle cotizaciones without products
        csvData.push({
          cotizacion_id: cotizacion.cotizacion_id,
          folio: cotizacion.folio,
          cliente: cliente?.nombre || '',
          productos: '',
          sku: '',
          precio: '',
          cantidad: '',
          fecha: cotizacion.fecha_creacion,
          cotizacion_estado: cotizacion.estado,
          fecha_anticipo: anticipoPayment?.fecha_pago || ''
        });
      } else {
        // Handle each product in the cotizacion
        productos.forEach((cp: any) => {
          const producto = Array.isArray(cp.producto) ? cp.producto[0] : cp.producto;
          
          csvData.push({
            cotizacion_id: cotizacion.cotizacion_id,
            folio: cotizacion.folio,
            cliente: cliente?.nombre || '',
            productos: producto?.nombre || '',
            sku: producto?.sku || '',
            precio: cp.precio_unitario || '',
            cantidad: cp.cantidad || '',
            fecha: cotizacion.fecha_creacion,
            cotizacion_estado: cotizacion.estado,
            fecha_anticipo: anticipoPayment?.fecha_pago || ''
          });
        });
      }
    });
    
    // Format the data for CSV
    const csvHeaders = [
      'Cotización ID',
      'Folio',
      'Cliente',
      'Producto',
      'SKU',
      'Precio',
      'Cantidad',
      'Fecha Creación',
      'Estado',
      'Fecha Anticipo'
    ];
    
    const csvRows = csvData.map((row: any) => [
      row.cotizacion_id || '',
      row.folio || '',
      row.cliente || '',
      row.productos || '',
      row.sku || '',
      row.precio || '',
      row.cantidad || '',
      row.fecha ? new Date(row.fecha).toLocaleDateString('es-MX') : '',
      row.cotizacion_estado || '',
      row.fecha_anticipo ? new Date(row.fecha_anticipo).toLocaleDateString('es-MX') : ''
    ]);
    
    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(cell => 
          // Escape commas and quotes in CSV
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n');
    
    // Add BOM for proper UTF-8 encoding in Excel
    const bom = '\uFEFF';
    const csvWithBom = bom + csvContent;
    
    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cotizaciones_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
    
  } catch (error) {
    console.error('Error in CSV export:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 