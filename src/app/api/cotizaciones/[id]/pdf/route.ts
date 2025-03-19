import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import { generateAndSaveQuotePDF } from '@/app/actions/generate-pdf';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cotizacionId = parseInt(params.id, 10);
    
    if (isNaN(cotizacionId)) {
      return NextResponse.json(
        { error: 'Invalid cotizacion ID' },
        { status: 400 }
      );
    }
    
    // Fetch cotizacion data
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select(`
        *,
        cliente:cliente_id (
          id,
          nombre,
          telefono,
          atencion
        ),
        vendedor:vendedor_id (
          id,
          nombre,
          telefono,
          correo
        )
      `)
      .eq('id', cotizacionId)
      .single();
    
    if (cotizacionError) {
      console.error('Error fetching cotizacion:', cotizacionError);
      return NextResponse.json(
        { error: 'Failed to fetch cotizacion data' },
        { status: 500 }
      );
    }
    
    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotizacion not found' },
        { status: 404 }
      );
    }
    
    // Prepare data for PDF generation
    const generatePDFParams = {
      cotizacionId: cotizacion.id,
      productos: cotizacion.productos || [],
      cliente: {
        nombre: cotizacion.cliente?.nombre || 'Cliente',
        telefono: cotizacion.cliente?.telefono || '',
        atencion: cotizacion.cliente?.atencion || '',
      },
      vendedor: {
        nombre: cotizacion.vendedor?.nombre || 'Vendedor',
        telefono: cotizacion.vendedor?.telefono || '',
        correo: cotizacion.vendedor?.correo || '',
      },
      tiempo_entrega: cotizacion.tiempo_entrega || '7 días',
      valor_iva: cotizacion.valor_iva || '16%',
      moneda: cotizacion.moneda || 'Pesos',
      datos_bancarios: {
        titular: cotizacion.valor_iva === '16%' ? 'FUNNY KITCHEN S.A. DE C.V' : 'PABLO DANIEL ANAYA GOYA',
        cuenta: cotizacion.valor_iva === '16%' ? '012 244 0415' : '047 294 1945',
        clabe: cotizacion.valor_iva === '16%' ? '012 320 00122440415 9' : '0123 2000 4729 419455',
      }
    };
    
    // Generate and save the PDF
    const result = await generateAndSaveQuotePDF(generatePDFParams);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate PDF' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      pdfUrl: result.pdfUrl
    });
    
  } catch (error) {
    console.error('Error in PDF generation endpoint:', error);
    return NextResponse.json(
      { error: 'Server error during PDF generation' },
      { status: 500 }
    );
  }
} 