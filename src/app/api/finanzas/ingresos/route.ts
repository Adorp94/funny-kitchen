import { NextRequest, NextResponse } from 'next/server';
import { createIngreso } from '@/app/actions/finanzas-actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Format and validate the incoming data
    const ingresoData = {
      cotizacion_id: Number(body.cotizacion_id),
      monto: Number(body.monto),
      porcentaje: body.porcentaje ? Number(body.porcentaje) : undefined,
      metodo_pago: body.metodo_pago,
      fecha_pago: body.fecha_pago ? new Date(body.fecha_pago) : new Date(),
      comprobante_url: body.comprobante_url,
      notas: body.notas,
    };
    
    // Validate required fields
    if (!ingresoData.cotizacion_id || isNaN(ingresoData.cotizacion_id)) {
      return NextResponse.json({ success: false, error: 'ID de cotización inválido' }, { status: 400 });
    }
    
    if (!ingresoData.monto || isNaN(ingresoData.monto) || ingresoData.monto <= 0) {
      return NextResponse.json({ success: false, error: 'Monto inválido' }, { status: 400 });
    }
    
    if (!ingresoData.metodo_pago) {
      return NextResponse.json({ success: false, error: 'Método de pago requerido' }, { status: 400 });
    }
    
    // Invoke the server action
    const result = await createIngreso(ingresoData);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Ingreso registrado correctamente',
        data: result.data
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Error al registrar el ingreso' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error handling ingreso request:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
} 