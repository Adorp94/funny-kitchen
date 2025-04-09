import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { updateCotizacionStatus } from '@/app/actions/cotizacion-actions';

interface RequestBody {
  newStatus: string;
  paymentData?: {
    monto: number;
    metodo_pago: string;
    porcentaje: number;
    notas: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cotizacionId = parseInt(params.id);
    if (isNaN(cotizacionId)) {
      return NextResponse.json(
        { error: 'ID de cotización inválido' },
        { status: 400 }
      );
    }

    const body: RequestBody = await request.json();
    const { newStatus, paymentData } = body;

    console.log('API status change request:', { cotizacionId, newStatus, paymentData });

    // Validate the new status
    const validStatus = ['pendiente', 'producción', 'cancelada', 'enviada'];
    if (!validStatus.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // If new status is 'producción', payment data is required
    if (newStatus === 'producción') {
      if (!paymentData || typeof paymentData !== 'object') {
        return NextResponse.json(
          { error: `Se requieren datos de pago para mandar a producción` },
          { status: 400 }
        );
      }
      
      // Validate payment data fields
      if (!paymentData.monto || typeof paymentData.monto !== 'number' || paymentData.monto <= 0) {
        return NextResponse.json(
          { error: 'El monto del pago debe ser mayor a 0' },
          { status: 400 }
        );
      }
      
      if (!paymentData.metodo_pago || typeof paymentData.metodo_pago !== 'string') {
        return NextResponse.json(
          { error: 'El método de pago es requerido' },
          { status: 400 }
        );
      }
      
      // Process the paymentData to ensure types are correct
      const processedPaymentData = {
        monto: Number(paymentData.monto),
        metodo_pago: paymentData.metodo_pago,
        porcentaje: paymentData.porcentaje ? Number(paymentData.porcentaje) : 0,
        notas: paymentData.notas || '',
      };
      
      // Update status via server action
      console.log('Calling updateCotizacionStatus with:', { cotizacionId, newStatus, paymentData: processedPaymentData });
      const result = await updateCotizacionStatus(cotizacionId, newStatus, processedPaymentData);
      console.log('Status update result:', result);
      
      if (result.success) {
        return NextResponse.json({ 
          success: true,
          message: `Estado actualizado correctamente a "${newStatus}"`,
          cotizacion: result.cotizacion
        });
      } else {
        // Log detailed error information
        console.error('Error updating status:', result.error);
        return NextResponse.json(
          { error: result.error || 'No se pudo actualizar el estado' },
          { status: 500 }
        );
      }
    } else {
      // For statuses that don't require payment
      console.log('Calling updateCotizacionStatus with:', { cotizacionId, newStatus, paymentData: undefined });
      const result = await updateCotizacionStatus(cotizacionId, newStatus, undefined);
      console.log('Status update result:', result);
      
      if (result.success) {
        return NextResponse.json({ 
          success: true,
          message: `Estado actualizado correctamente a "${newStatus}"`,
          cotizacion: result.cotizacion
        });
      } else {
        // Log detailed error information
        console.error('Error updating status:', result.error);
        return NextResponse.json(
          { error: result.error || 'No se pudo actualizar el estado' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error updating cotizacion status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
} 