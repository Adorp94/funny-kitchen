const fs = require('fs');
const path = require('path');

async function updateProductosCSV() {
  try {
    console.log('📝 Updating productos.csv with matched producto_ids...');
    
    // Read the matched results
    const matchedPath = path.join(__dirname, '../public/productos-matched.csv');
    const matchedContent = fs.readFileSync(matchedPath, 'utf8');
    const matchedLines = matchedContent.split('\n').filter(line => line.trim());
    
    // Create a map of product names to producto_ids
    const productIdMap = new Map();
    
    // Skip header and process matches
    for (let i = 1; i < matchedLines.length; i++) {
      const line = matchedLines[i].trim();
      if (line) {
        // Parse CSV line (handle quoted fields)
        const match = line.match(/^"([^"]*)",(\d+),/);
        if (match) {
          const csvName = match[1];
          const productoId = match[2];
          productIdMap.set(csvName, productoId);
        }
      }
    }
    
    console.log(`📊 Found ${productIdMap.size} matched products`);
    
    // Read the original CSV
    const originalPath = path.join(__dirname, '../public/productos.csv');
    const originalContent = fs.readFileSync(originalPath, 'utf8');
    const originalLines = originalContent.split('\n').filter(line => line.trim());
    
    // Create updated CSV content
    let updatedContent = 'productos,producto_id\n';
    
    for (let i = 1; i < originalLines.length; i++) {
      const line = originalLines[i].trim();
      if (line) {
        const [productName] = line.split(',');
        const cleanProductName = productName.replace(/"/g, '');
        const matchedId = productIdMap.get(cleanProductName);
        
        if (matchedId) {
          updatedContent += `${productName},${matchedId}\n`;
          console.log(`✅ ${cleanProductName} → ${matchedId}`);
        } else {
          updatedContent += `${productName},\n`;
          console.log(`❌ ${cleanProductName} → NO MATCH`);
        }
      }
    }
    
    // Write the updated CSV
    const updatedPath = path.join(__dirname, '../public/productos-updated.csv');
    fs.writeFileSync(updatedPath, updatedContent);
    
    console.log('\n🎉 SUCCESS!');
    console.log(`📄 Updated CSV saved as: productos-updated.csv`);
    console.log(`📊 Total products processed: ${originalLines.length - 1}`);
    console.log(`✅ Products with matching IDs: ${productIdMap.size}`);
    
    // Display summary of confidence levels
    const highConfidenceCount = Array.from(matchedLines).filter(line => line.includes(',HIGH,')).length - 1;
    const mediumConfidenceCount = Array.from(matchedLines).filter(line => line.includes(',MEDIUM,')).length - 1;
    
    console.log(`\n📈 CONFIDENCE BREAKDOWN:`);
    console.log(`🔥 High confidence matches (≥70%): ${highConfidenceCount}`);
    console.log(`⚠️  Medium confidence matches (30-70%): ${mediumConfidenceCount}`);
    
    console.log(`\n💡 NEXT STEPS:`);
    console.log(`1. Review productos-updated.csv for accuracy`);
    console.log(`2. Check medium confidence matches in productos-matched.csv`);
    console.log(`3. Replace the original productos.csv when satisfied`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the update
updateProductosCSV();