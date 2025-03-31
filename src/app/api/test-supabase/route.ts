import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const results = {
      success: true,
      env: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.split('.')[0]}.***.supabase.co` 
        : 'Not set',
      tests: {
        basic: { success: false, error: null, duration: 0 },
        cotizaciones: { success: false, error: null, duration: 0, count: 0 },
        clientes: { success: false, error: null, duration: 0, count: 0 },
        productos: { success: false, error: null, duration: 0, count: 0 }
      }
    };

    // Test 1: Basic connection test
    try {
      console.log("Testing basic Supabase connection...");
      const start = Date.now();
      
      // Simple query to check if connection works
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('cotizacion_id')
        .limit(1);
        
      const duration = Date.now() - start;
      
      if (error) {
        results.tests.basic.error = error.message;
      } else {
        results.tests.basic.success = true;
        results.tests.basic.duration = duration;
      }
    } catch (error) {
      results.tests.basic.error = error instanceof Error ? error.message : String(error);
    }

    // Test 2: Cotizaciones count
    try {
      console.log("Testing cotizaciones query...");
      const start = Date.now();
      
      const { count, error } = await supabase
        .from('cotizaciones')
        .select('*', { count: 'exact', head: true });
        
      const duration = Date.now() - start;
      
      if (error) {
        results.tests.cotizaciones.error = error.message;
      } else {
        results.tests.cotizaciones.success = true;
        results.tests.cotizaciones.duration = duration;
        results.tests.cotizaciones.count = count || 0;
      }
    } catch (error) {
      results.tests.cotizaciones.error = error instanceof Error ? error.message : String(error);
    }

    // Test 3: Clientes count
    try {
      console.log("Testing clientes query...");
      const start = Date.now();
      
      const { count, error } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });
        
      const duration = Date.now() - start;
      
      if (error) {
        results.tests.clientes.error = error.message;
      } else {
        results.tests.clientes.success = true;
        results.tests.clientes.duration = duration;
        results.tests.clientes.count = count || 0;
      }
    } catch (error) {
      results.tests.clientes.error = error instanceof Error ? error.message : String(error);
    }

    // Test 4: Productos count
    try {
      console.log("Testing productos query...");
      const start = Date.now();
      
      const { count, error } = await supabase
        .from('productos')
        .select('*', { count: 'exact', head: true });
        
      const duration = Date.now() - start;
      
      if (error) {
        results.tests.productos.error = error.message;
      } else {
        results.tests.productos.success = true;
        results.tests.productos.duration = duration;
        results.tests.productos.count = count || 0;
      }
    } catch (error) {
      results.tests.productos.error = error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 