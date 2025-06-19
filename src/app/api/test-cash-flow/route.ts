import { NextRequest, NextResponse } from 'next/server';
import { getCashFlowMetrics } from '@/app/actions/finanzas-actions';
import { supabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Test parameters - June 2025
    const testMonth = 6;
    const testYear = 2025;
    
    console.log('🧪 Starting Cash Flow Logic Test...');
    
    // Get our cash flow metrics using the application logic
    const appResult = await getCashFlowMetrics(testMonth, testYear);
    
    if (!appResult.success || !appResult.data) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get cash flow metrics from app',
        details: appResult.error
      });
    }
    
    // Get raw database data for verification
    const { data: rawCotizaciones, error: rawError } = await supabase
      .from('cotizaciones')
      .select('cotizacion_id, folio, estado, estatus_pago, total_mxn, monto_pagado_mxn, porcentaje_completado, fecha_creacion')
      .gte('fecha_creacion', '2025-06-01T00:00:00Z')
      .lt('fecha_creacion', '2025-07-01T00:00:00Z')
      .or('estado.eq.producción,estatus_pago.eq.anticipo');
    
    if (rawError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get raw data for verification',
        details: rawError.message
      });
    }
    
    // Manual calculations for verification
    const totalActiveMXN = rawCotizaciones?.reduce((sum, cot) => sum + Number(cot.total_mxn || 0), 0) || 0;
    const actualPaymentsMXN = rawCotizaciones?.reduce((sum, cot) => sum + Number(cot.monto_pagado_mxn || 0), 0) || 0;
    const pendingCollectionsMXN = totalActiveMXN - actualPaymentsMXN;
    const collectionRate = totalActiveMXN > 0 ? (actualPaymentsMXN / totalActiveMXN) * 100 : 0;
    
    // Business logic verification
    const cotizacionesWithAnticipo = rawCotizaciones?.filter(cot => cot.estatus_pago === 'anticipo') || [];
    const cotizacionesInProduction = rawCotizaciones?.filter(cot => cot.estado === 'producción') || [];
    const confirmedSalesByAnticipo = cotizacionesWithAnticipo.length;
    
    // Detailed breakdown for the test
    const testResults = {
      testName: 'Cash Flow Logic Verification',
      testDate: new Date().toISOString(),
      testPeriod: `${testMonth}/${testYear}`,
      
      // Application Results
      appMetrics: appResult.data,
      
      // Manual Verification
      manualCalculations: {
        totalActiveCotizaciones: rawCotizaciones?.length || 0,
        totalActiveMXN: Math.round(totalActiveMXN * 100) / 100,
        actualPaymentsMXN: Math.round(actualPaymentsMXN * 100) / 100,
        pendingCollectionsMXN: Math.round(pendingCollectionsMXN * 100) / 100,
        collectionRate: Math.round(collectionRate * 100) / 100
      },
      
      // Business Logic Verification
      businessLogic: {
        cotizacionesWithAnticipo: confirmedSalesByAnticipo,
        cotizacionesInProduction: cotizacionesInProduction.length,
        anticipo_confirms_sale_rule: 'Cotizaciones with anticipo are considered SOLD',
        production_indicates_activity: 'Cotizaciones in production show business activity'
      },
      
      // Detailed Breakdown
      detailedBreakdown: rawCotizaciones?.map(cot => ({
        folio: cot.folio,
        estado: cot.estado,
        estatus_pago: cot.estatus_pago,
        total_mxn: Number(cot.total_mxn || 0),
        pagado_mxn: Number(cot.monto_pagado_mxn || 0),
        porcentaje_completado: Number(cot.porcentaje_completado || 0),
        business_status: cot.estatus_pago === 'anticipo' ? 'SOLD (Has Anticipo)' : 
                        cot.estado === 'producción' ? 'ACTIVE (In Production)' : 'OTHER',
        pendiente_mxn: Number(cot.total_mxn || 0) - Number(cot.monto_pagado_mxn || 0)
      })),
      
      // Test Validation
      validation: {
        app_vs_manual_total_active: {
          app: appResult.data.totalActiveQuotes.mxn,
          manual: Math.round(totalActiveMXN * 100) / 100,
          match: Math.abs(appResult.data.totalActiveQuotes.mxn - totalActiveMXN) < 0.01
        },
        app_vs_manual_payments: {
          app: appResult.data.actualPayments.mxn,
          manual: Math.round(actualPaymentsMXN * 100) / 100,
          match: Math.abs(appResult.data.actualPayments.mxn - actualPaymentsMXN) < 0.01
        },
        app_vs_manual_pending: {
          app: appResult.data.pendingCollections.mxn,
          manual: Math.round(pendingCollectionsMXN * 100) / 100,
          match: Math.abs(appResult.data.pendingCollections.mxn - pendingCollectionsMXN) < 0.01
        },
        app_vs_manual_rate: {
          app: appResult.data.collectionRate,
          manual: Math.round(collectionRate * 100) / 100,
          match: Math.abs(appResult.data.collectionRate - collectionRate) < 0.1
        }
      }
    };
    
    // Overall test result
    const allValidationsPass = Object.values(testResults.validation).every(v => v.match);
    
    console.log('✅ Cash Flow Test Results:', {
      allValidationsPass,
      activeCotizaciones: testResults.manualCalculations.totalActiveCotizaciones,
      confirmedByAnticipo: confirmedSalesByAnticipo,
      collectionRate: testResults.manualCalculations.collectionRate
    });
    
    return NextResponse.json({
      success: allValidationsPass,
      testPassed: allValidationsPass,
      summary: {
        totalActiveCotizaciones: testResults.manualCalculations.totalActiveCotizaciones,
        totalActiveMXN: testResults.manualCalculations.totalActiveMXN,
        actualPaymentsMXN: testResults.manualCalculations.actualPaymentsMXN,
        collectionRate: testResults.manualCalculations.collectionRate,
        confirmedSalesByAnticipo: confirmedSalesByAnticipo,
        businessLogicWorking: allValidationsPass
      },
      detailedResults: testResults
    });
    
  } catch (error) {
    console.error('❌ Cash Flow Test Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed with exception',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 