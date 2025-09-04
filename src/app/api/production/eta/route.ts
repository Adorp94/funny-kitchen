import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Corrected: Import the instance
import { ProductionPlannerService } from '@/services/productionPlannerService';
import { Database } from '@/lib/database.types'; // Assuming this type import is correct

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const productIdStr = searchParams.get('productId');
    const qtyStr = searchParams.get('qty');
    const premiumStr = searchParams.get('premium');

    // --- Input Validation ---
    if (!productIdStr || !qtyStr) {
        return NextResponse.json({ error: 'Missing required parameters: productId and qty' }, { status: 400 });
    }

    const productId = parseInt(productIdStr, 10);
    const qty = parseInt(qtyStr, 10);
    const isPremium = premiumStr === 'true'; // Treat any other value or missing as false

    if (isNaN(productId) || productId <= 0) {
        return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
    }
    if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ error: 'Invalid qty' }, { status: 400 });
    }

    // --- Service Logic ---
    try {
        const supabase = await createClient();

        // Fetch product details using the imported supabase instance
        const { data: productData, error: productError } = await supabase
            .from('productos')
            .select('vueltas_max_dia')
            .eq('producto_id', productId)
            .single();

        if (productError) {
            console.error(`API Error fetching product ${productId}:`, productError);
            if (productError.code === 'PGRST116') { // Not found code
                 return NextResponse.json({ error: `Product with ID ${productId} not found.` }, { status: 404 });
            }
            return NextResponse.json({ error: 'Database error fetching product details' }, { status: 500 });
        }
        
        if (!productData) {
             return NextResponse.json({ error: `Product with ID ${productId} not found.` }, { status: 404 });
        }

        const vueltasMaxDia = productData.vueltas_max_dia ?? 1;

        // Instantiate the planner service using the imported supabase instance
        const plannerService = new ProductionPlannerService(supabase);

        // Calculate ETA
        const etaResult = await plannerService.calculateETA(
            productId,
            qty,
            isPremium,
            vueltasMaxDia
        );

        // --- Response ---
        return NextResponse.json(etaResult, { status: 200 });

    } catch (error: any) {
        // *** Enhanced Logging ***
        console.error('[API /api/production/eta] Caught Error:', error); 
        console.error('[API /api/production/eta] Error Name:', error.name);
        console.error('[API /api/production/eta] Error Message:', error.message);
        console.error('[API /api/production/eta] Error Stack:', error.stack);
        // *** End Enhanced Logging ***

        const errorMessage = error.message || 'Internal Server Error calculating ETA';
        const statusCode = 500; // Default to 500 for server errors

        // Ensure a valid JSON error response is sent
        return NextResponse.json({ error: `Failed ETA calculation: ${errorMessage}` }, { status: statusCode });
    }
} 