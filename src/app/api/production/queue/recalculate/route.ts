import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { ProductionPlannerService } from '@/services/productionPlannerService';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    console.log("[API /production/queue/recalculate POST] Starting full queue recalculation...");

    const plannerService = new ProductionPlannerService(supabase);
    
    // Call the recalculate method
    const success = await plannerService.recalculateEntireQueue();

    if (success) {
      console.log("[API /production/queue/recalculate POST] Queue recalculation completed successfully");
      return NextResponse.json({ 
        success: true, 
        message: 'Cola de producción recalculada exitosamente' 
      });
    } else {
      console.error("[API /production/queue/recalculate POST] Queue recalculation failed");
      return NextResponse.json({ 
        success: false, 
        error: 'Error al recalcular la cola de producción' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[API /production/queue/recalculate POST] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor al recalcular la cola' 
    }, { status: 500 });
  }
} 