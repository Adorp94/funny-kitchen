import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ProductionPlannerService } from '@/services/productionPlannerService';

interface SelectedProduct {
  folio: string;
  producto_id: number;
  producto_nombre: string;
  cantidad_total: number;
  cantidad_selected: number;
}

interface RequestBody {
  products: SelectedProduct[];
}

export async function POST(request: NextRequest) {
  console.log('[API /production/move-to-bitacora POST] Starting request...');
  
  // Create authenticated Supabase client
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    const body: RequestBody = await request.json();
    const { products } = body;

    console.log(`[API /production/move-to-bitacora POST] Received ${products.length} products to move`);

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    // Validate all products have required fields
    for (const product of products) {
      if (!product.folio || !product.producto_id || !product.cantidad_selected) {
        console.error('[API /production/move-to-bitacora POST] Invalid product data:', product);
        return NextResponse.json(
          { error: 'Invalid product data: missing required fields' },
          { status: 400 }
        );
      }
    }

    const plannerService = new ProductionPlannerService(supabase);
    const results = [];
    const errors = [];

    // Process each selected product
    for (const product of products) {
      try {
        console.log(`[API /production/move-to-bitacora POST] Processing product: ${product.producto_nombre} (ID: ${product.producto_id}, Folio: ${product.folio})`);

        // First, get the cotizacion_producto_id for this product in this quotation
        const { data: cotizacionProductos, error: fetchError } = await supabase
          .from('cotizacion_productos')
          .select('cotizacion_producto_id, cotizacion_id')
          .eq('producto_id', product.producto_id)
          .eq('cotizacion_id', (
            await supabase
              .from('cotizaciones')
              .select('cotizacion_id')
              .eq('folio', product.folio)
              .single()
          ).data?.cotizacion_id || 0)
          .single();

        if (fetchError || !cotizacionProductos) {
          console.error(`[API /production/move-to-bitacora POST] Error finding cotizacion_producto for ${product.producto_nombre}:`, fetchError);
          errors.push(`Error finding product ${product.producto_nombre} in quotation ${product.folio}`);
          continue;
        }

        // Get the cotizacion to check if it's premium
        const { data: cotizacion, error: cotizacionError } = await supabase
          .from('cotizaciones')
          .select('is_premium')
          .eq('cotizacion_id', cotizacionProductos.cotizacion_id)
          .single();

        if (cotizacionError) {
          console.error(`[API /production/move-to-bitacora POST] Error fetching cotizacion for premium status:`, cotizacionError);
          errors.push(`Error checking premium status for quotation ${product.folio}`);
          continue;
        }

        const isPremium = cotizacion?.is_premium || false;

        // Add the product to the production queue using the planner service
        const newQueueId = await plannerService.addItemToQueue(
          cotizacionProductos.cotizacion_producto_id,
          product.producto_id,
          product.cantidad_selected,
          isPremium
        );

        if (newQueueId) {
          results.push({
            folio: product.folio,
            producto_nombre: product.producto_nombre,
            queue_id: newQueueId,
            cantidad: product.cantidad_selected
          });
          console.log(`[API /production/move-to-bitacora POST] Successfully added ${product.producto_nombre} to queue with ID: ${newQueueId}`);
        } else {
          errors.push(`Failed to add ${product.producto_nombre} to production queue`);
        }

      } catch (error: any) {
        console.error(`[API /production/move-to-bitacora POST] Error processing product ${product.producto_nombre}:`, error);
        errors.push(`Error processing ${product.producto_nombre}: ${error.message}`);
      }
    }

    // Trigger global recalculation if any products were added
    if (results.length > 0) {
      console.log(`[API /production/move-to-bitacora POST] Triggering global queue date calculation for ${results.length} added products...`);
      try {
        const { success: calcSuccess, warnings: calcWarnings } = await plannerService.calculateGlobalQueueDates();
        if (!calcSuccess) {
          console.error('[API /production/move-to-bitacora POST] Global queue calculation failed');
          errors.push('Failed to calculate production dates');
        }
        if (calcWarnings.length > 0) {
          console.warn('[API /production/move-to-bitacora POST] Global calculation warnings:', calcWarnings);
        }
      } catch (calcError: any) {
        console.error('[API /production/move-to-bitacora POST] Error during global calculation:', calcError);
        errors.push(`Error calculating production dates: ${calcError.message}`);
      }
    }

    const responseData = {
      success: true,
      processed: results.length,
      errors: errors.length,
      results,
      error_details: errors
    };

    console.log(`[API /production/move-to-bitacora POST] Completed. Processed: ${results.length}, Errors: ${errors.length}`);

    if (errors.length > 0 && results.length === 0) {
      // All failed
      return NextResponse.json(
        { error: 'Failed to move any products to bitácora', details: errors },
        { status: 500 }
      );
    } else if (errors.length > 0) {
      // Partial success
      return NextResponse.json(responseData, { status: 207 }); // Multi-status
    } else {
      // All succeeded
      return NextResponse.json(responseData, { status: 200 });
    }

  } catch (error: any) {
    console.error('[API /production/move-to-bitacora POST] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}