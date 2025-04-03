import { NextRequest, NextResponse } from 'next/server';
import { getNextFolioNumber } from '@/app/actions/cotizacion-actions';

export async function GET(request: NextRequest) {
  try {
    // Get the next folio number without creating a cotizacion
    const nextFolio = await getNextFolioNumber();
    
    return NextResponse.json({ 
      nextFolio,
      timestamp: new Date().toISOString(),
      message: "This is just a preview, no cotizacion has been created."
    });
  } catch (error) {
    console.error('Error in folio test endpoint:', error);
    return NextResponse.json(
      { error: 'Error al generar el folio de prueba' },
      { status: 500 }
    );
  }
} 