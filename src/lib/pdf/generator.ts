import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { supabase } from '../supabase/client';

// Interface for PDF data
export interface PDFQuoteData {
  nombre_archivo: string;
  num_cotizacion: number;
  num_productos: number;
  cliente: string;
  telefono_cliente: string;
  vendedor: string;
  telefono_vendedor: string;
  correo_vendedor: string;
  fecha_cotizacion: string;
  valor_iva: string;
  tiempo_entrega: string;
  moneda: string;
  subtotal: number;
  descuento: number;
  iva: number;
  envio: number;
  total: number;
  titular: string;
  cuenta: string;
  clabe: string;
  atencion: string;
  productos: string;
}

interface ProductItem {
  descripcion: string;
  pu: string;
  cantidad: string;
  precio: string;
}

export async function generateQuotePDF(data: PDFQuoteData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Cotización ${data.num_cotizacion}`,
          Author: 'Funny Kitchen',
          Subject: `Cotización para ${data.cliente}`,
        }
      });

      // Buffer to store PDF
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Header with logo - try SVG first, then PNG as fallback
      const logoSvgPath = path.join(process.cwd(), 'public/assets/logo.svg');
      const logoPngPath = path.join(process.cwd(), 'public/assets/logo.png');
      
      if (fs.existsSync(logoSvgPath)) {
        doc.image(logoSvgPath, 50, 50, { width: 150 });
      } else if (fs.existsSync(logoPngPath)) {
        doc.image(logoPngPath, 50, 50, { width: 150 });
      } else {
        // Fallback if no logo is found
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('FUNNY KITCHEN', 50, 50);
      }
      
      // Client information
      doc.fontSize(12).font('Helvetica');
      doc.text('Empresa: ' + data.cliente, 50, 200);
      doc.text('Atención: ' + data.atencion, 50, 220);
      doc.text('Teléfono: ' + data.telefono_cliente, 50, 240);
      
      // Notes box
      const boxY = 270;
      doc.rect(50, boxY, 500, 100).stroke();
      doc.font('Helvetica-Bold').text('Nota:', 55, boxY + 10);
      doc.font('Helvetica').fontSize(10);
      
      // Notes content
      const notes = [
        "A) Precios sujetos a cambio sin previo aviso.",
        `B) El servicio será pagado en ${data.moneda === 'Dólares' ? 'dólares' : 'moneda nacional'}.`,
        `C) Fecha de la cotización: ${data.fecha_cotizacion}`
      ];
      
      // Add IVA note if not in dollars and has IVA
      if (data.moneda !== 'Dólares' && data.valor_iva !== "0%") {
        notes.push(`D) Valor del IVA: ${data.valor_iva}`);
      }
      
      // Add delivery time note
      const deliveryLetterIndex = data.moneda !== 'Dólares' && data.valor_iva !== "0%" ? 'E' : 'D';
      notes.push(`${deliveryLetterIndex}) Tiempo de Envío estimado: ${data.tiempo_entrega}`);
      
      // Print notes
      notes.forEach((note, index) => {
        doc.text(note, 55, boxY + 30 + (index * 15));
      });
      
      // Quotation number in top right
      doc.fontSize(8).fillColor('#ADD8E6');
      doc.text(`COT ${data.num_cotizacion}`, 450, 50, { align: 'right' });
      
      // Process products string into an array of product items
      const productList = parseProductsString(data.productos, data.num_productos);
      
      // Products table
      doc.fillColor('black').fontSize(12).font('Helvetica-Bold');
      const tableTop = 400;
      const tableHeaders = ['Descripción', 'Precio Unitario', 'Cantidad', 'Precio'];
      const colWidths = [250, 100, 70, 80];
      
      // Table header
      doc.fillColor('#668ca0');
      doc.rect(50, tableTop, 500, 20).fill();
      doc.fillColor('white');
      
      let xPos = 50;
      tableHeaders.forEach((header, i) => {
        doc.text(header, xPos + 5, tableTop + 5, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
      });
      
      // Table rows
      doc.fillColor('black');
      let yPos = tableTop + 20;
      
      productList.forEach((product, idx) => {
        // Alternate row colors
        if (idx % 2 === 0) {
          doc.fillColor('#f8f8f8');
          doc.rect(50, yPos, 500, 20).fill();
        }
        
        doc.fillColor('black').fontSize(10).font('Helvetica');
        
        // Format product data
        const description = product.descripcion;
        const unitPrice = product.pu;
        const quantity = product.cantidad;
        const totalPrice = product.precio;
        
        xPos = 50;
        doc.text(description, xPos + 5, yPos + 5, { width: colWidths[0] - 10 });
        xPos += colWidths[0];
        
        doc.text(`$${unitPrice}`, xPos + 5, yPos + 5, { width: colWidths[1] - 10, align: 'right' });
        xPos += colWidths[1];
        
        doc.text(quantity, xPos + 5, yPos + 5, { width: colWidths[2] - 10, align: 'center' });
        xPos += colWidths[2];
        
        doc.text(`$${totalPrice}`, xPos + 5, yPos + 5, { width: colWidths[3] - 10, align: 'right' });
        
        yPos += 20;
      });
      
      // Summary table
      const summaryX = 370;
      const summaryY = yPos + 20;
      const summaryWidth = 180;
      
      // Draw summary rows
      doc.font('Helvetica-Bold').fontSize(10);
      
      // Subtotal row
      doc.fillColor('#f0f0f0');
      doc.rect(summaryX, summaryY, summaryWidth, 20).fill();
      doc.fillColor('black');
      doc.text('Subtotal:', summaryX + 10, summaryY + 5, { width: 80 });
      doc.text(`$${formatNumber(data.subtotal)}`, summaryX + 100, summaryY + 5, { width: 70, align: 'right' });
      
      let currentY = summaryY + 20;
      
      // Discount row (if any)
      if (data.descuento > 0) {
        doc.fillColor('#f0f0f0');
        doc.rect(summaryX, currentY, summaryWidth, 20).fill();
        doc.fillColor('black');
        doc.text('Descuento:', summaryX + 10, currentY + 5, { width: 80 });
        doc.text(`-$${formatNumber(data.descuento)}`, summaryX + 100, currentY + 5, { width: 70, align: 'right' });
        currentY += 20;
      }
      
      // IVA row (if applicable)
      if (data.moneda !== 'Dólares' && data.iva > 0) {
        doc.fillColor('#f0f0f0');
        doc.rect(summaryX, currentY, summaryWidth, 20).fill();
        doc.fillColor('black');
        doc.text('IVA:', summaryX + 10, currentY + 5, { width: 80 });
        doc.text(`$${formatNumber(data.iva)}`, summaryX + 100, currentY + 5, { width: 70, align: 'right' });
        currentY += 20;
      }
      
      // Shipping row (if any)
      if (data.envio > 0) {
        doc.fillColor('#f0f0f0');
        doc.rect(summaryX, currentY, summaryWidth, 20).fill();
        doc.fillColor('black');
        doc.text('Envío:', summaryX + 10, currentY + 5, { width: 80 });
        doc.text(`$${formatNumber(data.envio)}`, summaryX + 100, currentY + 5, { width: 70, align: 'right' });
        currentY += 20;
      }
      
      // Total row
      doc.fillColor('#668ca0');
      doc.rect(summaryX, currentY, summaryWidth, 20).fill();
      doc.fillColor('white').font('Helvetica-Bold');
      doc.text('Total:', summaryX + 10, currentY + 5, { width: 80 });
      doc.text(`$${formatNumber(data.total)}`, summaryX + 100, currentY + 5, { width: 70, align: 'right' });
      
      // Footer
      doc.fillColor('black').fontSize(9);
      doc.text('Términos y Condiciones', 50, 700, { underline: true, link: 'https://funnykitchen.mx/pages/terminos-y-condiciones' });
      
      doc.fontSize(7);
      doc.text('CUIDADOS: TODAS LAS PIEZAS SON A PRUEBA DE MICROONDAS Y LAVAVAJILLA. NO APILAR PIEZAS MOJADAS, PODRÍAN DAÑAR ESMALTE.', 50, 720);
      doc.text('TODAS LAS PIEZAS SON ARTESANALES, POR LO TANTO NO EXISTE NINGUNA PIEZA IDÉNTICA Y TODAS ELLAS PUEDEN TENER VARIACIÓN DE TAMAÑO, FORMA Y COLOR.', 50, 730);
      
      doc.font('Helvetica-Bold');
      doc.text('DATOS BANCARIOS:', 50, 745);
      
      if (data.moneda === 'Dólares') {
        doc.text('LEAD BANK', 50, 755);
        doc.text('PABLO ANAYA', 50, 765);
        doc.text('210319511130', 50, 775);
        doc.text('ABA 101019644', 50, 785);
      } else {
        doc.text('BBVA', 50, 755);
        doc.text(data.titular, 50, 765);
        doc.text(`CUENTA: ${data.cuenta}`, 50, 775);
        doc.text(`CLABE: ${data.clabe}`, 50, 785);
        doc.text('ACEPTAMOS TODAS LAS TARJETAS DE CRÉDITO.', 50, 795);
      }
      
      // QR code - try SVG first, then PNG as fallback
      const qrSvgPath = path.join(process.cwd(), 'public/assets/qr.svg');
      const qrPngPath = path.join(process.cwd(), 'public/assets/qr.png');
      
      if (fs.existsSync(qrSvgPath)) {
        doc.image(qrSvgPath, 50, 720, { width: 60 });
      } else if (fs.existsSync(qrPngPath)) {
        doc.image(qrPngPath, 50, 720, { width: 60 });
      }
      
      // Vendor information on the right
      doc.font('Helvetica-Bold').fontSize(8);
      doc.text('ATENTAMENTE:', 400, 720, { align: 'right' });
      doc.text(data.vendedor, 400, 730, { align: 'right' });
      doc.text(data.correo_vendedor, 400, 740, { align: 'right' });
      doc.text(data.telefono_vendedor, 400, 750, { align: 'right' });
      doc.text('HTTPS://FUNNYKITCHEN.MX', 400, 760, { align: 'right' });
      doc.text('AZUCENAS #439 LOS GIRASOLES.', 400, 770, { align: 'right' });
      doc.text('ZAPOPAN, JALISCO 45138', 400, 780, { align: 'right' });
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}

// Helper function to parse the products string
function parseProductsString(productsString: string, numProducts: number): ProductItem[] {
  const products: ProductItem[] = [];
  const parts = productsString.split('~');
  
  for (let i = 0; i < numProducts; i++) {
    const baseIndex = i * 4;
    const descripcion = parts[baseIndex] || '';
    const pu = parts[baseIndex + 1] || '0';
    const cantidad = parts[baseIndex + 2] || '0';
    const precio = parts[baseIndex + 3] || '0';
    
    products.push({ descripcion, pu, cantidad, precio });
  }
  
  return products;
}

// Format number with commas as thousands separators
function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Upload PDF to Supabase Storage
export async function uploadPDFToSupabase(pdfBuffer: Buffer, fileName: string): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('cotizaciones')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('cotizaciones')
      .getPublicUrl(fileName);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading PDF to Supabase:', error);
    throw error;
  }
}

// Calculate totals based on products and settings
export function calculateTotals(
  subtotal: number, 
  descuento: number, 
  iva: number, 
  envio: number, 
  moneda: string
): { subtotal: number; descuento: number; iva: number; envio: number; total: number } {
  // If currency is USD or IVA is 0%, don't apply IVA
  if (moneda === "Dólares" || iva === 0) {
    return {
      subtotal,
      descuento,
      iva: 0,
      envio,
      total: subtotal - descuento + envio
    };
  } else {
    // For Mexican pesos with IVA
    const baseConDescuento = subtotal - descuento;
    const ivaAmount = baseConDescuento * 0.16; // 16% IVA
    const total = baseConDescuento + ivaAmount + envio;
    
    return {
      subtotal,
      descuento,
      iva: ivaAmount,
      envio,
      total
    };
  }
} 