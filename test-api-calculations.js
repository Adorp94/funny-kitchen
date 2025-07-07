// Test script to verify nueva cotizacion API calculations end-to-end
// This tests the actual flow by creating a real quotation and then checking/deleting it

const API_BASE = 'http://localhost:3000/api';

// Test data
const testQuotationData = {
    cliente: {
        nombre: "Cliente Test Calculaciones",
        celular: "5555555555",
        correo: "test-calc@test.com",
        atencion: "Test automation",
        tipo_cliente: "Fiscal"
    },
    create_client_if_needed: true,
    productos: [
        {
            nombre: "Producto Test 1",
            cantidad: 2,
            precio_unitario_mxn: 1000, // $1000 MXN each
            subtotal_mxn: 1800, // $2000 - 10% individual discount = $1800
            descuento: 10, // 10% individual discount
            producto_id: null, // Custom product
            sku: "TEST-001",
            descripcion: "Producto de prueba 1",
            colores: ["Rojo", "Azul"],
            acabado: "Mate"
        },
        {
            nombre: "Producto Test 2", 
            cantidad: 1,
            precio_unitario_mxn: 500, // $500 MXN each
            subtotal_mxn: 500, // No individual discount
            descuento: 0, // No individual discount
            producto_id: null, // Custom product
            sku: "TEST-002",
            descripcion: "Producto de prueba 2",
            colores: ["Verde"],
            acabado: "Brillante"
        }
    ],
    moneda: "MXN",
    subtotal_mxn: 2300, // 1800 + 500 = 2300 (sum of individual subtotals)
    descuento_global: 15, // 15% global discount
    iva: true, // 16% IVA
    monto_iva: 312.8, // 16% of (2300 * 0.85) = 16% of 1955 = 312.8
    incluye_envio: true,
    costo_envio_mxn: 200, // $200 shipping
    total_mxn: 2467.8, // 1955 + 312.8 + 200 = 2467.8
    tipo_cambio: 20.5,
    tiempo_estimado: 6,
    tiempo_estimado_max: 8,
    isPremium: false
};

async function testApiCalculations() {
    console.log('=== Testing Nueva Cotizacion API Calculations ===\n');
    
    let createdCotizacionId = null;
    
    try {
        // Step 1: Create the quotation
        console.log('--- Step 1: Creating quotation via API ---');
        console.log('Test data:', JSON.stringify(testQuotationData, null, 2));
        
        const createResponse = await fetch(`${API_BASE}/cotizaciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testQuotationData)
        });
        
        if (!createResponse.ok) {
            const errorData = await createResponse.text();
            throw new Error(`API returned ${createResponse.status}: ${errorData}`);
        }
        
        const createResult = await createResponse.json();
        console.log('Create response:', createResult);
        
        if (!createResult.success || !createResult.cotizacion_id) {
            throw new Error('API did not return success or cotizacion_id');
        }
        
        createdCotizacionId = createResult.cotizacion_id;
        console.log(`✅ Quotation created successfully with ID: ${createdCotizacionId}`);
        
        // Step 2: Retrieve the created quotation to verify calculations
        console.log('\n--- Step 2: Retrieving quotation to verify calculations ---');
        
        const getResponse = await fetch(`${API_BASE}/cotizaciones?id=${createdCotizacionId}`);
        
        if (!getResponse.ok) {
            const errorData = await getResponse.text();
            throw new Error(`Get API returned ${getResponse.status}: ${errorData}`);
        }
        
        const getResult = await getResponse.json();
        console.log('Retrieved quotation:', JSON.stringify(getResult, null, 2));
        
        const cotizacion = getResult.cotizacion;
        
        // Step 3: Verify calculations
        console.log('\n--- Step 3: Verifying calculations ---');
        
        const expectedValues = {
            subtotal_mxn: 2300, // Base subtotal (sum of product subtotals with individual discounts)
            globalDiscountAmount: 2300 * 0.15, // 345
            subtotalAfterGlobalDiscount: 2300 * 0.85, // 1955
            iva_amount: 1955 * 0.16, // 312.8
            shipping: 200,
            total_mxn: 1955 + 312.8 + 200 // 2467.8
        };
        
        console.log('Expected values:');
        console.log(`  Base Subtotal MXN: ${expectedValues.subtotal_mxn}`);
        console.log(`  Global Discount Amount (15%): ${expectedValues.globalDiscountAmount}`);
        console.log(`  Subtotal After Global Discount: ${expectedValues.subtotalAfterGlobalDiscount}`);
        console.log(`  IVA Amount (16%): ${expectedValues.iva_amount}`);
        console.log(`  Shipping: ${expectedValues.shipping}`);
        console.log(`  Total MXN: ${expectedValues.total_mxn}`);
        
        console.log('\nActual values from DB:');
        console.log(`  Subtotal MXN: ${cotizacion.subtotal_mxn}`);
        console.log(`  Global Discount: ${cotizacion.descuento_global}%`);
        console.log(`  IVA: ${cotizacion.iva ? 'Yes' : 'No'}`);
        console.log(`  IVA Amount: ${cotizacion.monto_iva}`);
        console.log(`  Shipping Cost MXN: ${cotizacion.costo_envio_mxn}`);
        console.log(`  Total MXN: ${cotizacion.total_mxn}`);
        
        // Verify values
        const tolerance = 0.01; // Allow small floating point differences
        const results = {
            subtotal_correct: Math.abs(cotizacion.subtotal_mxn - expectedValues.subtotal_mxn) < tolerance,
            discount_percentage_correct: cotizacion.descuento_global === 15,
            iva_enabled_correct: cotizacion.iva === true,
            iva_amount_correct: Math.abs(cotizacion.monto_iva - expectedValues.iva_amount) < tolerance,
            shipping_correct: Math.abs(cotizacion.costo_envio_mxn - expectedValues.shipping) < tolerance,
            total_correct: Math.abs(cotizacion.total_mxn - expectedValues.total_mxn) < tolerance
        };
        
        console.log('\n--- Verification Results ---');
        console.log(`✅ Base Subtotal MXN: ${results.subtotal_correct ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Global Discount %: ${results.discount_percentage_correct ? 'PASS' : 'FAIL'}`);
        console.log(`✅ IVA Enabled: ${results.iva_enabled_correct ? 'PASS' : 'FAIL'}`);
        console.log(`✅ IVA Amount: ${results.iva_amount_correct ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Shipping Cost: ${results.shipping_correct ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Total MXN: ${results.total_correct ? 'PASS' : 'FAIL'}`);
        
        const allTestsPassed = Object.values(results).every(result => result === true);
        console.log(`\n${allTestsPassed ? '🎉 ALL TESTS PASSED! Calculations are correct.' : '❌ SOME TESTS FAILED!'}`);
        
        // Also verify products were stored correctly
        console.log('\n--- Product Verification ---');
        console.log(`Number of products stored: ${cotizacion.productos?.length || 0}`);
        if (cotizacion.productos && cotizacion.productos.length > 0) {
            cotizacion.productos.forEach((product, index) => {
                console.log(`Product ${index + 1}:`);
                console.log(`  Name: ${product.nombre}`);
                console.log(`  Quantity: ${product.cantidad}`);
                console.log(`  Unit Price: ${product.precio}`);
                console.log(`  Discount: ${product.descuento}%`);
                console.log(`  Subtotal: ${product.subtotal}`);
            });
        }
        
        return {
            success: allTestsPassed,
            cotizacionId: createdCotizacionId,
            results,
            expectedValues,
            actualValues: {
                subtotal_mxn: cotizacion.subtotal_mxn,
                descuento_global: cotizacion.descuento_global,
                iva: cotizacion.iva,
                monto_iva: cotizacion.monto_iva,
                costo_envio_mxn: cotizacion.costo_envio_mxn,
                total_mxn: cotizacion.total_mxn
            }
        };
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        return {
            success: false,
            error: error.message,
            cotizacionId: createdCotizacionId
        };
    }
}

// Helper function to clean up test quotation
async function cleanupTestQuotation(cotizacionId) {
    if (!cotizacionId) return;
    
    try {
        console.log(`\n--- Cleaning up test quotation ID: ${cotizacionId} ---`);
        
        const deleteResponse = await fetch(`${API_BASE}/cotizaciones?id=${cotizacionId}`, {
            method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
            console.log('✅ Test quotation cleaned up successfully');
        } else {
            console.log('⚠️  Could not clean up test quotation (you may need to delete manually)');
        }
    } catch (error) {
        console.log('⚠️  Error during cleanup:', error.message);
    }
}

// Run the test
async function runTest() {
    const result = await testApiCalculations();
    
    // Clean up the test quotation
    if (result.cotizacionId) {
        await cleanupTestQuotation(result.cotizacionId);
    }
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Status: ${result.success ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (result.error) {
        console.log(`Error: ${result.error}`);
    }
    
    return result;
}

// Execute
runTest().catch(console.error); 