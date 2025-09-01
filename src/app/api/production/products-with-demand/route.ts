import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("[API /production/products-with-demand GET] === STARTING REQUEST ===");
  
  const supabase = await createClient();

  try {
    console.log("[API /production/products-with-demand GET] Fetching products with demand...");

    // Use optimized SQL query to get products that either have production activity OR pending client demands
    const { data: products, error: productsError } = await supabase.rpc('get_products_with_demand_or_production');

    if (productsError) {
      console.error("[API /production/products-with-demand GET] Error from function:", productsError);
      
      // Fallback to direct SQL query if function doesn't exist
      const { data: fallbackProducts, error: fallbackError } = await supabase
        .from('productos')
        .select(`
          producto_id,
          nombre,
          sku,
          vueltas_max_dia,
          moldes_disponibles,
          production_active!left (
            piezas_en_proceso
          )
        `)
        .not('production_active.piezas_en_proceso', 'is', null)
        .gt('production_active.piezas_en_proceso', 0)
        .order('nombre', { ascending: true });

      if (fallbackError) {
        console.error("[API /production/products-with-demand GET] Fallback query error:", fallbackError);
        return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
      }

      // Get products with client demands separately
      const { data: productsWithDemands, error: demandsError } = await supabase
        .from('cotizacion_productos')
        .select(`
          producto_id,
          productos!inner (
            producto_id,
            nombre,
            sku,
            vueltas_max_dia,
            moldes_disponibles
          ),
          cotizaciones!inner (
            estado,
            estatus_pago
          )
        `)
        .eq('cotizaciones.estado', 'producción')
        .in('cotizaciones.estatus_pago', ['anticipo', 'pagado']);

      if (demandsError) {
        console.error("[API /production/products-with-demand GET] Demands query error:", demandsError);
        return NextResponse.json({ error: 'Error al obtener demandas' }, { status: 500 });
      }

      // Combine and deduplicate products
      const productMap = new Map();
      
      // Add products with production activity
      (fallbackProducts || []).forEach(product => {
        productMap.set(product.producto_id, {
          producto_id: product.producto_id,
          nombre: product.nombre,
          sku: product.sku,
          vueltas_max_dia: product.vueltas_max_dia,
          moldes_disponibles: product.moldes_disponibles,
          piezas_en_proceso: product.production_active?.[0]?.piezas_en_proceso || 0,
          total_demanda: 0
        });
      });

      // Add products with client demands
      (productsWithDemands || []).forEach(item => {
        const producto = item.productos;
        if (productMap.has(producto.producto_id)) {
          productMap.get(producto.producto_id).total_demanda += 1;
        } else {
          productMap.set(producto.producto_id, {
            producto_id: producto.producto_id,
            nombre: producto.nombre,
            sku: producto.sku,
            vueltas_max_dia: producto.vueltas_max_dia,
            moldes_disponibles: producto.moldes_disponibles,
            piezas_en_proceso: 0,
            total_demanda: 1
          });
        }
      });

      const finalProducts = Array.from(productMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

      console.log("[API /production/products-with-demand GET] Found products with activity (fallback):", finalProducts.length);

      return NextResponse.json({
        products: finalProducts,
        debug: {
          totalProducts: finalProducts.length,
          productsWithActivity: finalProducts.length,
          source: 'fallback'
        }
      });
    }

    console.log("[API /production/products-with-demand GET] Found products with activity:", products?.length || 0);

    return NextResponse.json({
      products: products || [],
      debug: {
        totalProducts: products?.length || 0,
        productsWithActivity: products?.length || 0,
        source: 'function'
      }
    });

  } catch (error) {
    console.error('[API /production/products-with-demand GET] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 