import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the data from the request body
    const quoteData = await request.json();
    
    return generateHtmlResponse(quoteData);
  } catch (error) {
    console.error('Error generating HTML:', error);
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Try to get data from the query parameter
    const dataParam = request.nextUrl.searchParams.get('data');
    let quoteData;
    
    if (dataParam) {
      try {
        quoteData = JSON.parse(dataParam);
      } catch (e) {
        console.error('Error parsing data parameter:', e);
      }
    }
    
    // If no valid data was provided in query params, use mock data
    if (!quoteData) {
      // Get the ID from the URL parameters
      const id = request.nextUrl.searchParams.get('id') || Math.floor(Math.random() * 10000);
      
      // Create a mock quotation for demonstration
      quoteData = {
        id: id,
        cliente: {
          nombre: "Cliente de Ejemplo",
          celular: "555-123-4567",
          atencion: "Director General"
        },
        vendedor: {
          nombre: "Vendedor de Ejemplo",
          celular: "555-987-6543",
          correo: "vendedor@funnykitchen.mx"
        },
        fecha_cotizacion: new Date().toISOString(),
        moneda: "MXN",
        tipo_cambio: 17.5,
        iva: 1.16,
        tipo_cuenta: "MORAL",
        descuento_total: 0.05,
        precio_total: 20000 * (1 - 0.05) * 1.16,
        tiempo_estimado: 7,
        envio: 200,
        productos: [
          {
            descripcion: "Gabinete de cocina premium",
            colores: "Caoba",
            descuento: 0,
            cantidad: 1,
            precio_final: 12000
          },
          {
            descripcion: "Isla central con encimera",
            colores: "Blanco",
            descuento: 0.1,
            cantidad: 1,
            precio_final: 8000
          }
        ]
      };
    }
    
    return generateHtmlResponse(quoteData);
  } catch (error) {
    console.error('Error generating HTML:', error);
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    );
  }
}

// Helper function to generate HTML response
function generateHtmlResponse(quoteData: any) {
  // Format the data for the HTML
  const currentDate = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  // Create a temporary quote ID if one isn't provided
  const tempQuoteId = quoteData.id || Math.floor(Math.random() * 10000);
  
  // Create HTML for products table
  const productsHtml = quoteData.productos.map((product: any, index: number) => {
    const precioTotal = product.precio_final * product.cantidad * (1 - (product.descuento || 0));
    return `
      <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#ffffff'}">
        <td style="padding: 8px; border: 1px solid #ddd;">${product.descripcion || 'Producto'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${parseFloat(product.precio_final).toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${product.cantidad}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${precioTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');
  
  // Calculate totals
  const subtotal = quoteData.precio_total / (quoteData.iva || 1);
  const descuento = (quoteData.descuento_total || 0) * subtotal;
  const iva = quoteData.precio_total - subtotal;
  const envio = quoteData.envio || 0;
  const total = quoteData.precio_total;
  
  // Create HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cotización ${tempQuoteId}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1a8ea6; }
        .quote-number { color: #1a8ea6; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #1a8ea6; color: white; padding: 10px; text-align: left; }
        .notes { border: 1px solid #ddd; padding: 15px; margin: 30px 0; }
        .summary { margin-left: auto; width: 300px; }
        .total-row { background-color: #1a8ea6; color: white; font-weight: bold; }
        .bank-info { margin-top: 30px; }
        .footer { margin-top: 50px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print {
          body { margin: 0; }
          .print-button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="print-button" style="text-align: right; margin-bottom: 20px;">
        <button onclick="window.print()" style="padding: 8px 16px; background-color: #1a8ea6; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Imprimir / Guardar como PDF
        </button>
      </div>
    
      <div class="header">
        <div>
          <div class="company-name">FUNNY KITCHEN</div>
          <p>Soluciones de cocina a medida</p>
        </div>
        <div class="quote-number">
          <p>COTIZACIÓN #${tempQuoteId}</p>
          <p>Fecha: ${currentDate}</p>
        </div>
      </div>
      
      <div class="client-info">
        <p><strong>Empresa:</strong> ${quoteData.cliente?.nombre || 'Cliente'}</p>
        <p><strong>Atención:</strong> ${quoteData.cliente?.atencion || ''}</p>
        <p><strong>Teléfono:</strong> ${quoteData.cliente?.celular || ''}</p>
      </div>
      
      <div class="notes">
        <p><strong>Nota:</strong></p>
        <p>A) Precios sujetos a cambio sin previo aviso.</p>
        <p>B) El servicio será pagado en ${quoteData.moneda === 'USD' ? 'dólares' : 'moneda nacional'}.</p>
        <p>C) Fecha de la cotización: ${currentDate}</p>
        ${quoteData.moneda !== 'USD' && quoteData.iva === 1.16 ? '<p>D) Valor del IVA: 16%</p>' : ''}
        <p>E) Tiempo de Envío estimado: ${quoteData.tiempo_estimado || 7} días</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Descripción</th>
            <th style="width: 20%; text-align: right;">Precio Unitario</th>
            <th style="width: 10%; text-align: center;">Cantidad</th>
            <th style="width: 20%; text-align: right;">Precio</th>
          </tr>
        </thead>
        <tbody>
          ${productsHtml}
        </tbody>
      </table>
      
      <div class="summary">
        <table>
          <tr style="background-color: #f0f0f0;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Subtotal:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${subtotal.toFixed(2)}</td>
          </tr>
          ${descuento > 0 ? `
          <tr style="background-color: #f0f0f0;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Descuento:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">-$${descuento.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${iva > 0 ? `
          <tr style="background-color: #f0f0f0;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>IVA:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${iva.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${envio > 0 ? `
          <tr style="background-color: #f0f0f0;">
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Envío:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${envio.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td style="padding: 8px; border: 1px solid #1a8ea6;"><strong>Total:</strong></td>
            <td style="padding: 8px; border: 1px solid #1a8ea6; text-align: right;">$${total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <div class="bank-info">
        <h3>Datos Bancarios:</h3>
        <p><strong>Titular:</strong> ${quoteData.tipo_cuenta === 'MORAL' ? 'FUNNY KITCHEN S.A. DE C.V' : 'PABLO DANIEL ANAYA GOYA'}</p>
        <p><strong>Cuenta:</strong> ${quoteData.tipo_cuenta === 'MORAL' ? '012 244 0415' : '047 294 1945'}</p>
        <p><strong>CLABE:</strong> ${quoteData.tipo_cuenta === 'MORAL' ? '012 320 00122440415 9' : '0123 2000 4729 419455'}</p>
      </div>
      
      <div class="footer">
        <p>CUIDADOS: TODAS LAS PIEZAS SON A PRUEBA DE MICROONDAS Y LAVAVAJILLA. NO APILAR PIEZAS MOJADAS, PODRÍAN DAÑAR ESMALTE.</p>
        <p><a href="https://funnykitchen.mx/pages/terminos-y-condiciones">Términos y Condiciones</a></p>
      </div>
    </body>
    </html>
  `;
  
  // Return the HTML content
  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 