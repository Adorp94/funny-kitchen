import { NextRequest, NextResponse } from 'next/server';
import { generateQuotePDF } from '@/lib/pdf/generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cotizacionId = parseInt(params.id, 10);
    console.log(`Processing cotizacion ID: ${cotizacionId}`);
    
    if (isNaN(cotizacionId)) {
      console.log('Invalid cotizacion ID');
      return NextResponse.json(
        { error: 'Invalid cotizacion ID' },
        { status: 400 }
      );
    }

    // Get optional data from the query parameter
    const dataParam = request.nextUrl.searchParams.get('data');
    let quotationData;
    
    try {
      if (dataParam) {
        quotationData = JSON.parse(dataParam);
        console.log('Quote data received from parameter');
      }
    } catch (error) {
      console.error('Error parsing data parameter:', error);
    }
    
    // If no data was provided, use a mock quotation
    if (!quotationData) {
      console.log('No data provided, using mock quotation');
      quotationData = {
        cliente: {
          nombre: "Cliente de ejemplo",
          celular: "555-123-4567",
          atencion: "Sr. Director"
        },
        vendedor: {
          nombre: "Vendedor de prueba",
          celular: "555-987-6543",
          correo: "vendedor@funnykitchen.com"
        },
        productos: [
          {
            descripcion: "Gabinete de cocina",
            precio_final: 5000,
            cantidad: 1,
            descuento: 0
          },
          {
            descripcion: "Isla central",
            precio_final: 8500,
            cantidad: 1,
            descuento: 0
          },
          {
            descripcion: "Estante decorativo",
            precio_final: 1200,
            cantidad: 2,
            descuento: 0
          }
        ],
        moneda: "MXN",
        iva: 1.16,
        precio_total: 16900 * 1.16,
        tipo_cuenta: "MORAL",
        tiempo_estimado: 7,
        descuento_total: 0,
        envio: 0
      };
    }
    
    // Current date formatted as DD/MM/YYYY
    const currentDate = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Format the products string
    const productsString = quotationData.productos.map((product: { 
      descripcion?: string;
      nombre?: string;
      precio_final?: number;
      precio?: number;
      cantidad?: number;
      descuento?: number;
    }) => {
      const descripcion = product.descripcion || product.nombre || 'Producto';
      const precio_final = product.precio_final || product.precio || 0;
      const cantidad = product.cantidad || 1;
      const descuento = product.descuento || 0;
      const precio_total = precio_final * cantidad * (1 - descuento);
      return `${descripcion}~${precio_final.toFixed(2)}~${cantidad}~${precio_total.toFixed(2)}`;
    }).join('~');
    
    // Prepare data for PDF generation
    const pdfData = {
      nombre_archivo: `cotizacion_${cotizacionId}.pdf`,
      num_cotizacion: cotizacionId,
      num_productos: quotationData.productos.length,
      cliente: quotationData.cliente.nombre,
      telefono_cliente: quotationData.cliente.celular,
      vendedor: quotationData.vendedor.nombre,
      telefono_vendedor: quotationData.vendedor.celular,
      correo_vendedor: quotationData.vendedor.correo,
      fecha_cotizacion: currentDate,
      valor_iva: quotationData.iva === 1.16 ? '16%' : '0%',
      tiempo_entrega: `${quotationData.tiempo_estimado || 7} días`,
      moneda: quotationData.moneda === 'USD' ? 'Dólares' : 'Pesos',
      subtotal: quotationData.precio_total / (quotationData.iva || 1) || 0,
      descuento: (quotationData.descuento_total || 0) * (quotationData.subtotal || quotationData.precio_total / (quotationData.iva || 1) || 0),
      iva: quotationData.precio_total - (quotationData.precio_total / (quotationData.iva || 1)) || 0,
      envio: quotationData.envio || 0,
      total: quotationData.precio_total || 0,
      titular: quotationData.tipo_cuenta === 'MORAL' ? 'FUNNY KITCHEN S.A. DE C.V' : 'PABLO DANIEL ANAYA GOYA',
      cuenta: quotationData.tipo_cuenta === 'MORAL' ? '012 244 0415' : '047 294 1945',
      clabe: quotationData.tipo_cuenta === 'MORAL' ? '012 320 00122440415 9' : '0123 2000 4729 419455',
      atencion: quotationData.cliente.atencion || '',
      productos: productsString,
    };
    
    console.log('Generating PDF for direct download');
    
    // Generate PDF
    const pdfBuffer = await generateQuotePDF(pdfData);
    console.log(`PDF generation successful, size: ${pdfBuffer.length} bytes`);
    
    // Return the PDF directly as a download
    const response = new NextResponse(pdfBuffer);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="cotizacion_${cotizacionId}.pdf"`);
    
    console.log('Returning PDF as download');
    return response;
    
  } catch (error) {
    console.error('Error in direct PDF generation endpoint:', error);
    return NextResponse.json(
      { error: 'Server error during PDF generation' },
      { status: 500 }
    );
  }
} 