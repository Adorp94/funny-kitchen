const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// List of cotizaciones that should remain in pedidos (these are the allowed ones)
const allowedCotizaciones = [
  2521, 2516, 2484, 2504, 2464, 2369, 2491, 2507, 2463, 2347,
  2497, 2480, 2487, 2483, 2481, 2466, 2315, 2459, 2376, 1079,
  2462, 2461, 2385, 2175, 2312, 2350, 2447, 2445, 2427, 2432,
  2433, 2414, 2391, 2424, 2422, 2412, 2416, 2411, 2335, 2184,
  2363, 2326, 2334, 2386, 2318, 2377, 2341, 2329, 2316, 2322,
  2287, 2075, 2213, 2262, 2305, 2286, 2298, 2284, 2291, 2289,
  2251, 2207, 2236, 2239, 2197, 2172, 2181, 2194, 2209, 2215,
  2249, 2052, 2117, 2158, 2122, 2111, 2205, 2165, 2155, 2118,
  2091, 2154, 2137, 2085, 1974, 2081, 2074, 2059, 2039, 2028,
  2030, 2016, 1924, 2008, 1939, 1936, 1914, 1822, 1817, 1794,
  1801, 1762, 1751, 1748, 1746, 1730, 1672
];

async function updateCotizacionStatuses() {
  try {
    console.log('🔍 Fetching current cotizaciones with production-related statuses...');
    
    // Get all cotizaciones currently in production statuses
    const { data: currentCotizaciones, error: fetchError } = await supabase
      .from('cotizaciones')
      .select('cotizacion_id, folio, estado, fecha_creacion')
      .in('estado', ['aprobada', 'producción', 'pagada'])
      .order('cotizacion_id', { ascending: false });

    if (fetchError) {
      throw new Error(`Error fetching cotizaciones: ${fetchError.message}`);
    }

    console.log(`📊 Found ${currentCotizaciones.length} cotizaciones with production statuses`);

    // Find cotizaciones that need to be updated (not in allowed list)
    const cotizacionesToUpdate = currentCotizaciones.filter(
      cot => !allowedCotizaciones.includes(cot.cotizacion_id)
    );

    console.log(`📋 Found ${cotizacionesToUpdate.length} cotizaciones that need status update`);
    console.log(`✅ ${allowedCotizaciones.length} cotizaciones will remain in production`);

    if (cotizacionesToUpdate.length === 0) {
      console.log('✨ All cotizaciones are already in the correct state!');
      return;
    }

    // Show which ones will be updated
    console.log('\n📝 Cotizaciones to be updated to "entregada" status:');
    cotizacionesToUpdate.slice(0, 10).forEach(cot => {
      console.log(`  - ${cot.folio} (ID: ${cot.cotizacion_id}) - Current: ${cot.estado}`);
    });
    
    if (cotizacionesToUpdate.length > 10) {
      console.log(`  ... and ${cotizacionesToUpdate.length - 10} more`);
    }

    console.log('\n🚀 Starting batch update...');

    // Update in batches to avoid timeout
    const batchSize = 50;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < cotizacionesToUpdate.length; i += batchSize) {
      const batch = cotizacionesToUpdate.slice(i, i + batchSize);
      const batchIds = batch.map(c => c.cotizacion_id);

      console.log(`🔄 Updating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cotizacionesToUpdate.length/batchSize)} (${batch.length} items)...`);

      const { data: updateResult, error: updateError } = await supabase
        .from('cotizaciones')
        .update({ estado: 'entregada' })
        .in('cotizacion_id', batchIds)
        .select('cotizacion_id, folio');

      if (updateError) {
        console.error(`❌ Error updating batch: ${updateError.message}`);
        errorCount += batch.length;
      } else {
        updatedCount += updateResult.length;
        console.log(`  ✅ Successfully updated ${updateResult.length} cotizaciones`);
      }
    }

    console.log('\n📊 FINAL RESULTS:');
    console.log(`✅ Successfully updated: ${updatedCount} cotizaciones`);
    console.log(`❌ Failed to update: ${errorCount} cotizaciones`);
    console.log(`🔄 Total processed: ${cotizacionesToUpdate.length} cotizaciones`);
    console.log(`✨ Remaining in production: ${allowedCotizaciones.length} cotizaciones`);

    // Verify the update worked
    console.log('\n🔍 Verifying update...');
    const { data: verificationData, error: verifyError } = await supabase
      .from('cotizaciones')
      .select('cotizacion_id, folio, estado')
      .in('estado', ['aprobada', 'producción', 'pagada'])
      .order('cotizacion_id', { ascending: false });

    if (!verifyError && verificationData) {
      console.log(`✅ Verification: ${verificationData.length} cotizaciones now have production statuses`);
      
      // Check if any forbidden ones still exist
      const stillInProduction = verificationData.filter(
        cot => !allowedCotizaciones.includes(cot.cotizacion_id)
      );
      
      if (stillInProduction.length > 0) {
        console.log(`⚠️  Warning: ${stillInProduction.length} non-allowed cotizaciones still in production:`);
        stillInProduction.forEach(cot => {
          console.log(`  - ${cot.folio} (ID: ${cot.cotizacion_id})`);
        });
      } else {
        console.log('🎉 Perfect! Only allowed cotizaciones remain in production status');
      }
    }

    console.log('\n🎯 Update completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Add a confirmation prompt
function askForConfirmation() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\n⚠️  This will update cotization statuses. Are you sure you want to continue? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  console.log('🏷️  COTIZACION STATUS UPDATE TOOL');
  console.log('==================================');
  console.log(`📝 This will update cotizaciones NOT in your allowed list to "entregada" status`);
  console.log(`✅ ${allowedCotizaciones.length} cotizaciones will remain in production status`);
  
  const confirmed = await askForConfirmation();
  if (!confirmed) {
    console.log('❌ Operation cancelled by user');
    process.exit(0);
  }

  await updateCotizacionStatuses();
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { updateCotizacionStatuses, allowedCotizaciones };