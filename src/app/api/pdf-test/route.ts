import { NextRequest, NextResponse } from 'next/server';
import { generateQuotePDF, uploadPDFToSupabase } from '@/lib/pdf/generator';

export async function GET(request: NextRequest) {
  try {
    // Sample data for testing
    const testData = {
      nombre_archivo: 'test-cotizacion.pdf',
      num_cotizacion: 12345,
      num_productos: 3,
      cliente: 'Cliente de Prueba',
      telefono_cliente: '123-456-7890',
      vendedor: 'Vendedor de Prueba',
      telefono_vendedor: '987-654-3210',
      correo_vendedor: 'vendedor@example.com',
      fecha_cotizacion: new Date().toLocaleDateString('es-MX'),
      valor_iva: '16%',
      tiempo_entrega: '7 días',
      moneda: 'Pesos',
      subtotal: 10000,
      descuento: 1000,
      iva: 1440,
      envio: 500,
      total: 10940,
      titular: 'FUNNY KITCHEN S.A. DE C.V',
      cuenta: '012 244 0415',
      clabe: '012 320 00122440415 9',
      atencion: 'Juan Pérez',
      productos: 'Producto 1~1000~2~2000~Producto 2~2000~1~2000~Producto 3~3000~2~6000',
    };
    
    // Generate PDF
    console.log('Generating test PDF...');
    const pdfBuffer = await generateQuotePDF(testData);
    
    // Upload to Supabase
    console.log('Uploading test PDF to Supabase...');
    const pdfUrl = await uploadPDFToSupabase(pdfBuffer, 'test-cotizacion.pdf');
    
    return NextResponse.json({
      message: 'Test PDF generated successfully',
      pdfUrl
    });
  } catch (error) {
    console.error('Error generating test PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate test PDF' },
      { status: 500 }
    );
  }
} 