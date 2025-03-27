import { NextRequest, NextResponse } from 'next/server';
import { generateQuotePDF } from '@/lib/pdf/generator';

export async function POST(request: NextRequest) {
  try {
    // Get the data from the request body
    const quoteData = await request.json();
    
    // Format the data for the PDF generator
    const currentDate = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Create a temporary quote ID if one isn't provided
    const tempQuoteId = quoteData.id || Math.floor(Math.random() * 10000);
    
    // Format the products string
    const productsString = quoteData.productos.map((product: any) => {
      const precio_total = product.precio_final * product.cantidad * (1 - (product.descuento || 0));
      return `${product.descripcion || 'Producto'}~${product.precio_final.toFixed(2)}~${product.cantidad}~${precio_total.toFixed(2)}`;
    }).join('~');
    
    // Prepare PDF data
    const pdfData = {
      nombre_archivo: `cotizacion_${tempQuoteId}.pdf`,
      num_cotizacion: tempQuoteId,
      num_productos: quoteData.productos.length,
      cliente: quoteData.cliente?.nombre || 'Cliente',
      telefono_cliente: quoteData.cliente?.celular || '',
      vendedor: quoteData.vendedor?.nombre || 'Vendedor',
      telefono_vendedor: quoteData.vendedor?.celular || '',
      correo_vendedor: quoteData.vendedor?.correo || '',
      fecha_cotizacion: currentDate,
      valor_iva: quoteData.iva === 1.16 ? '16%' : '0%',
      tiempo_entrega: `${quoteData.tiempo_estimado || 7} días`,
      moneda: quoteData.moneda === 'USD' ? 'Dólares' : 'Pesos',
      subtotal: quoteData.precio_total / (quoteData.iva || 1) || 0,
      descuento: (quoteData.descuento_total || 0) * (quoteData.precio_total || 0),
      iva: quoteData.precio_total - (quoteData.precio_total / (quoteData.iva || 1)) || 0,
      envio: quoteData.envio || 0,
      total: quoteData.precio_total || 0,
      titular: quoteData.tipo_cuenta === 'MORAL' ? 'FUNNY KITCHEN S.A. DE C.V' : 'PABLO DANIEL ANAYA GOYA',
      cuenta: quoteData.tipo_cuenta === 'MORAL' ? '012 244 0415' : '047 294 1945',
      clabe: quoteData.tipo_cuenta === 'MORAL' ? '012 320 00122440415 9' : '0123 2000 4729 419455',
      atencion: quoteData.cliente?.atencion || '',
      productos: productsString,
    };
    
    // Generate the PDF
    const pdfBuffer = await generateQuotePDF(pdfData);
    
    // Return the PDF directly
    const response = new NextResponse(pdfBuffer);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="cotizacion_${tempQuoteId}.pdf"`);
    
    return response;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 