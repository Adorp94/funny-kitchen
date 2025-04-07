import { NextRequest, NextResponse } from 'next/server';
import { createEgreso } from '@/app/actions/finanzas-actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Format and validate the incoming data
    const egresoData = {
      descripcion: body.descripcion,
      categoria: body.categoria,
      fecha: body.fecha ? new Date(body.fecha) : new Date(),
      monto: Number(body.monto),
      metodo_pago: body.metodo_pago,
      moneda: body.moneda || 'MXN',
      comprobante_url: body.comprobante_url,
      notas: body.notas,
    };
    
    // Validate required fields
    if (!egresoData.descripcion || egresoData.descripcion.trim().length < 5) {
      return NextResponse.json({ 
        success: false, 
        error: 'La descripción debe tener al menos 5 caracteres' 
      }, { status: 400 });
    }
    
    if (!egresoData.categoria) {
      return NextResponse.json({ success: false, error: 'Categoría requerida' }, { status: 400 });
    }
    
    if (!egresoData.monto || isNaN(egresoData.monto) || egresoData.monto <= 0) {
      return NextResponse.json({ success: false, error: 'Monto inválido' }, { status: 400 });
    }
    
    if (!egresoData.metodo_pago) {
      return NextResponse.json({ success: false, error: 'Método de pago requerido' }, { status: 400 });
    }
    
    // Invoke the server action
    const result = await createEgreso(egresoData);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Egreso registrado correctamente'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Error al registrar el egreso' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error handling egreso request:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
} 