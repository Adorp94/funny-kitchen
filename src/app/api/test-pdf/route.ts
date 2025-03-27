import { NextResponse } from 'next/server';
import { generateQuotePDF } from '@/lib/pdf/generator';

export async function GET() {
  try {
    // Sample data for PDF
    const pdfData = {
      nombre_archivo: 'cotizacion_test.pdf',
      num_cotizacion: 12345,
      num_productos: 3,
      cliente: 'Cliente de Prueba',
      telefono_cliente: '555-123-4567',
      vendedor: 'Vendedor de Prueba',
      telefono_vendedor: '555-987-6543',
      correo_vendedor: 'vendedor@example.com',
      fecha_cotizacion: new Date().toLocaleDateString('es-MX'),
      valor_iva: '16%',
      tiempo_entrega: '7 días',
      moneda: 'Pesos',
      subtotal: 10000,
      descuento: 500,
      iva: 1520,
      envio: 200,
      total: 11220,
      titular: 'FUNNY KITCHEN S.A. DE C.V',
      cuenta: '012 244 0415',
      clabe: '012 320 00122440415 9',
      atencion: 'Juan Pérez',
      productos: 'Gabinete de cocina~5000~1~5000~Isla central~4500~1~4500~Estante abierto~500~1~500',
    };
    
    // Generate PDF
    const pdfBuffer = await generateQuotePDF(pdfData);
    
    // Return the PDF as a download
    const response = new NextResponse(pdfBuffer);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', 'attachment; filename="cotizacion_test.pdf"');
    
    return response;
  } catch (error) {
    console.error('Error in test PDF generation:', error);
    return NextResponse.json({ error: 'Failed to generate test PDF' }, { status: 500 });
  }
} 