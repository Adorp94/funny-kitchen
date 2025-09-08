const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to normalize text for comparison
function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[áàâäã]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôöõ]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate similarity score between two strings using various methods
function calculateSimilarity(str1, str2) {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  // Exact match gets highest score
  if (norm1 === norm2) return 1.0;
  
  // Check if one is contained in the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
  
  // Calculate Levenshtein distance-based similarity
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(norm1, norm2);
  const similarity = 1 - (distance / maxLen);
  
  // Boost score if significant words match
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  let wordMatches = 0;
  
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        wordMatches++;
        break;
      }
    }
  }
  
  const wordSimilarity = words1.length > 0 ? wordMatches / words1.length : 0;
  
  // Combine similarities with weights
  return (similarity * 0.7) + (wordSimilarity * 0.3);
}

// Levenshtein distance algorithm
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1)
    .fill()
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// LLM-powered intelligent matching function
function intelligentMatch(csvProductName, dbProducts) {
  const matches = [];

  for (const dbProduct of dbProducts) {
    const similarity = calculateSimilarity(csvProductName, dbProduct.nombre);
    
    if (similarity > 0.3) { // Only consider matches above 30% similarity
      matches.push({
        ...dbProduct,
        similarity,
        matchReason: getMatchReason(csvProductName, dbProduct.nombre, similarity)
      });
    }
  }

  // Sort by similarity score (descending)
  matches.sort((a, b) => b.similarity - a.similarity);

  // Apply LLM-like reasoning for ambiguous cases
  if (matches.length > 1) {
    const bestMatch = matches[0];
    const secondBest = matches[1];
    
    // If the difference is very small, check additional criteria
    if (bestMatch.similarity - secondBest.similarity < 0.1) {
      // Prefer products from 'Catálogo' over 'Personalizado'
      if (bestMatch.tipo_producto === 'Personalizado' && secondBest.tipo_producto === 'Catálogo') {
        return secondBest;
      }
      
      // Prefer products with SKUs
      if (!bestMatch.sku && secondBest.sku) {
        return secondBest;
      }
      
      // Prefer shorter names (often more canonical)
      if (bestMatch.nombre.length > secondBest.nombre.length + 10) {
        return secondBest;
      }
    }
  }

  return matches.length > 0 ? matches[0] : null;
}

function getMatchReason(csvName, dbName, similarity) {
  const norm1 = normalizeText(csvName);
  const norm2 = normalizeText(dbName);
  
  if (norm1 === norm2) return 'Exact match';
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 'Contains match';
  if (similarity > 0.8) return 'Very high similarity';
  if (similarity > 0.6) return 'High similarity';
  if (similarity > 0.4) return 'Medium similarity';
  return 'Low similarity';
}

async function main() {
  try {
    console.log('🚀 Starting intelligent product matching...');
    
    // Read CSV file
    const csvPath = path.join(__dirname, '../public/productos.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Parse CSV (skip header)
    const csvProducts = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Handle CSV parsing - split by comma but be careful with commas in names
        const [productName, productId] = line.split(',');
        if (productName && productName !== 'productos') {
          csvProducts.push({
            original_name: productName.replace(/"/g, ''),
            current_producto_id: productId?.trim() || ''
          });
        }
      }
    }

    console.log(`📊 Found ${csvProducts.length} products in CSV`);

    // Fetch all products from database
    const { data: dbProducts, error } = await supabase
      .from('productos')
      .select('producto_id, nombre, sku, tipo_producto, descripcion')
      .order('nombre');

    if (error) {
      throw error;
    }

    console.log(`📊 Found ${dbProducts.length} products in database`);

    // Perform intelligent matching
    const results = [];
    const unmatched = [];
    const multipleMatches = [];

    for (const csvProduct of csvProducts) {
      console.log(`🔍 Matching: ${csvProduct.original_name}`);
      
      const match = intelligentMatch(csvProduct.original_name, dbProducts);
      
      if (match) {
        // Check if we have high confidence (> 0.7) or exact matches
        if (match.similarity >= 0.7) {
          results.push({
            csv_name: csvProduct.original_name,
            matched_producto_id: match.producto_id,
            matched_name: match.nombre,
            similarity: match.similarity,
            match_reason: match.matchReason,
            sku: match.sku,
            tipo_producto: match.tipo_producto,
            confidence: 'HIGH'
          });
          console.log(`  ✅ HIGH confidence match: ${match.nombre} (${(match.similarity * 100).toFixed(1)}%)`);
        } else {
          results.push({
            csv_name: csvProduct.original_name,
            matched_producto_id: match.producto_id,
            matched_name: match.nombre,
            similarity: match.similarity,
            match_reason: match.matchReason,
            sku: match.sku,
            tipo_producto: match.tipo_producto,
            confidence: 'MEDIUM'
          });
          console.log(`  ⚠️  MEDIUM confidence match: ${match.nombre} (${(match.similarity * 100).toFixed(1)}%)`);
        }
      } else {
        unmatched.push(csvProduct.original_name);
        console.log(`  ❌ No match found`);
      }
    }

    // Generate output CSV
    const outputPath = path.join(__dirname, '../public/productos-matched.csv');
    let csvOutput = 'csv_name,producto_id,matched_name,similarity,confidence,match_reason,sku,tipo_producto\n';
    
    for (const result of results) {
      csvOutput += `"${result.csv_name}",${result.matched_producto_id},"${result.matched_name}",${result.similarity.toFixed(3)},${result.confidence},"${result.match_reason}","${result.sku || ''}","${result.tipo_producto || ''}"\n`;
    }

    fs.writeFileSync(outputPath, csvOutput);

    // Generate summary report
    const reportPath = path.join(__dirname, '../public/matching-report.txt');
    let report = `INTELLIGENT PRODUCT MATCHING REPORT\n`;
    report += `=====================================\n\n`;
    report += `Total CSV Products: ${csvProducts.length}\n`;
    report += `Successfully Matched: ${results.length}\n`;
    report += `Unmatched: ${unmatched.length}\n`;
    report += `Match Rate: ${((results.length / csvProducts.length) * 100).toFixed(1)}%\n\n`;

    report += `HIGH CONFIDENCE MATCHES (≥70%): ${results.filter(r => r.confidence === 'HIGH').length}\n`;
    report += `MEDIUM CONFIDENCE MATCHES (30-70%): ${results.filter(r => r.confidence === 'MEDIUM').length}\n\n`;

    if (unmatched.length > 0) {
      report += `UNMATCHED PRODUCTS:\n`;
      report += `==================\n`;
      unmatched.forEach(name => {
        report += `- ${name}\n`;
      });
      report += `\n`;
    }

    report += `MATCHING METHODOLOGY:\n`;
    report += `====================\n`;
    report += `1. Text normalization (accents, case, punctuation)\n`;
    report += `2. Exact match detection (100% score)\n`;
    report += `3. Substring matching (90% score)\n`;
    report += `4. Levenshtein distance similarity\n`;
    report += `5. Word-level matching for compound names\n`;
    report += `6. Intelligent tiebreaking:\n`;
    report += `   - Prefer 'Catálogo' over 'Personalizado'\n`;
    report += `   - Prefer products with SKUs\n`;
    report += `   - Prefer shorter canonical names\n\n`;

    fs.writeFileSync(reportPath, report);

    console.log('\n📋 MATCHING COMPLETE!');
    console.log(`✅ Matched: ${results.length}/${csvProducts.length} (${((results.length / csvProducts.length) * 100).toFixed(1)}%)`);
    console.log(`🔥 High confidence: ${results.filter(r => r.confidence === 'HIGH').length}`);
    console.log(`⚠️  Medium confidence: ${results.filter(r => r.confidence === 'MEDIUM').length}`);
    console.log(`❌ Unmatched: ${unmatched.length}`);
    console.log(`\n📄 Files generated:`);
    console.log(`   - productos-matched.csv (matched results)`);
    console.log(`   - matching-report.txt (detailed report)`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the matching
main();