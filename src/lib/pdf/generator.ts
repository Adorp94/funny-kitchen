import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

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
      // Create a document with standard fonts (no external fonts)
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        font: 'Helvetica',
        info: {
          Title: `Cotización ${data.num_cotizacion}`,
          Author: 'Funny Kitchen',
          Subject: `Cotización para ${data.cliente}`,
        }
      });

      // Buffer to store PDF content
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Header with logo
      try {
        const logoPath = path.join(process.cwd(), 'public/assets/logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 50, { width: 150 });
        } else {
          // Fallback if logo is not found
          doc.fontSize(16).font('Helvetica-Bold');
          doc.text('FUNNY KITCHEN', 50, 50);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
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
      let pageHeight = 750; // A4 page height (lowered a bit to account for margins)
      
      // Calculate the space needed for summary at the bottom
      const summaryHeight = 100; // estimated height needed for summary
      const footerHeight = 30; // estimated height for footer
      const maxRowsHeight = pageHeight - summaryHeight - footerHeight - yPos;
      
      productList.forEach((product, index) => {
        // Check if we need a new page
        if (yPos + 20 > maxRowsHeight) {
          doc.addPage();
          yPos = 50; // Reset Y position on the new page
          
          // Redraw headers on new page
          doc.fillColor('#668ca0');
          doc.rect(50, yPos, 500, 20).fill();
          doc.fillColor('white');
          
          let headerX = 50;
          tableHeaders.forEach((header, i) => {
            doc.text(header, headerX + 5, yPos + 5, { width: colWidths[i], align: 'center' });
            headerX += colWidths[i];
          });
          
          yPos += 20;
          doc.fillColor('black');
        }
        
        // Alternate row colors
        if (index % 2 === 0) {
          doc.fillColor('#f0f0f0');
          doc.rect(50, yPos, 500, 20).fill();
          doc.fillColor('black');
        }
        
        // Product description
        doc.fontSize(9).font('Helvetica');
        doc.text(product.descripcion, 55, yPos + 5, { width: colWidths[0] - 10 });
        
        // Price per unit
        doc.text(`$${product.pu}`, 50 + colWidths[0] + 5, yPos + 5, { width: colWidths[1] - 10, align: 'right' });
        
        // Quantity
        doc.text(product.cantidad, 50 + colWidths[0] + colWidths[1] + 5, yPos + 5, { width: colWidths[2] - 10, align: 'center' });
        
        // Total price
        doc.text(`$${product.precio}`, 50 + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPos + 5, { width: colWidths[3] - 10, align: 'right' });
        
        yPos += 20;
      });
      
      // Summary section
      const summaryX = 350;
      const summaryWidth = 200;
      let currentY = yPos + 20;
      
      // Subtotal row
      doc.fillColor('#f0f0f0');
      doc.rect(summaryX, currentY, summaryWidth, 20).fill();
      doc.fillColor('black');
      doc.text('Subtotal:', summaryX + 10, currentY + 5, { width: 80 });
      doc.text(`$${formatNumber(data.subtotal)}`, summaryX + 100, currentY + 5, { width: 70, align: 'right' });
      currentY += 20;
      
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

      // Bank information
      doc.fontSize(9).font('Helvetica-Bold').text('Datos Bancarios:', 50, 650);
      doc.font('Helvetica').text(`Titular: ${data.titular}`, 50, 665);
      doc.text(`Cuenta: ${data.cuenta}`, 50, 680);
      
      // Finalize the PDF
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

// Helper function to format currency values
function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
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