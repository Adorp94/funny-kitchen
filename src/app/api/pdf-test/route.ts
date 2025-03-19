import { NextRequest, NextResponse } from 'next/server';
import { generateQuotePDF, uploadPDFToSupabase } from '@/lib/pdf/generator';

export async function GET(request: NextRequest) {
  try {
    // Create test data for PDF generation
    const testData = {
      nombre_archivo: 'cotizacion_test.pdf',
      num_cotizacion: 12345,
      num_productos: 3,
      cliente: 'Cliente de Prueba, S.A. de C.V.',
      telefono_cliente: '(33) 1234-5678',
      vendedor: 'Vendedor de Prueba',
      telefono_vendedor: '(33) 8765-4321',
      correo_vendedor: 'vendedor@funnykitchen.mx',
      fecha_cotizacion: new Date().toISOString().split('T')[0],
      valor_iva: '16%',
      tiempo_entrega: '5-10 días hábiles',
      moneda: 'Pesos',
      subtotal: 12500,
      descuento: 1250,
      iva: 1800,
      envio: 350,
      total: 13400,
      titular: 'PABLO ANAYA',
      cuenta: '0123456789',
      clabe: '012345678901234567',
      atencion: 'Sr. Juan Pérez',
      productos: 'Plato Redondo 20cm (Azul)~850~4~3400~' +
        'Taza para Café 250ml~350~10~3500~' +
        'Juego de Cubiertos Completo~5600~1~5600',
    };

    // Generate the PDF
    const pdfBuffer = await generateQuotePDF(testData);
    
    // Upload to Supabase Storage
    const fileName = `test_${Date.now()}.pdf`;
    const pdfUrl = await uploadPDFToSupabase(pdfBuffer, fileName);
    
    // Return the PDF URL
    return NextResponse.json({ success: true, pdfUrl });
  } catch (error) {
    console.error('Error generating test PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate test PDF' },
      { status: 500 }
    );
  }
} 