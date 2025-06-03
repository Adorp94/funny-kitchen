import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ProductionPlannerService } from '@/services/productionPlannerService';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value;
        },
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.remove(name, options);
        },
      },
    }
  );

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