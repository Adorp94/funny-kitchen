'use server'

import { supabase } from '@/lib/supabase/client';
import { calculateTotals, generateQuotePDF, PDFQuoteData, uploadPDFToSupabase } from '@/lib/pdf/generator';

interface Product {
  id: string;
  descripcion: string;
  precio_unitario: number;
  cantidad: number;
  precio_total: number;
  color?: string;
  descuento?: number;
}

export interface GeneratePDFParams {
  cotizacionId: number;
  cliente: {
    id: string;
    nombre: string;
    telefono: string;
    atencion?: string;
  };
  vendedor: {
    nombre: string;
    telefono: string;
    correo: string;
  };
  productos: Product[];
  moneda: 'Pesos' | 'Dólares';
  descuento: number;
  envio: number;
  valor_iva: '16%' | '0%';
  tiempo_entrega: string;
  datos_bancarios: {
    titular: string;
    cuenta: string;
    clabe: string;
  }
}

export async function generateAndSaveQuotePDF(params: GeneratePDFParams) {
  try {
    // Format products for PDF generation
    const formattedProducts = params.productos.map(product => {
      const precioConDescuento = product.descuento ? 
        product.precio_unitario * (1 - (product.descuento / 100)) : 
        product.precio_unitario;
      
      const descripcion = product.color ? 
        `${product.descripcion} - ${product.color}` : 
        product.descripcion;
      
      return {
        descripcion,
        pu: precioConDescuento.toFixed(2),
        cantidad: product.cantidad.toString(),
        precio: (precioConDescuento * product.cantidad).toFixed(2)
      };
    });

    // Calculate subtotal
    const subtotal = params.productos.reduce((acc, product) => {
      return acc + product.precio_total;
    }, 0);

    // Calculate IVA based on moneda and valor_iva settings
    const ivaPercentage = params.valor_iva === '16%' && params.moneda !== 'Dólares' ? 0.16 : 0;
    const baseConDescuento = subtotal - params.descuento;
    const iva = baseConDescuento * ivaPercentage;

    // Calculate total including discount, IVA, and shipping
    const totals = calculateTotals(
      subtotal,
      params.descuento,
      iva,
      params.envio,
      params.moneda
    );

    // Prepare products string in the format required by PDF generator
    const productsString = formattedProducts.map(product => 
      `${product.descripcion}~${product.pu}~${product.cantidad}~${product.precio}`
    ).join('~');

    // Current date formatted as YYYY-MM-DD
    const currentDate = new Date().toISOString().split('T')[0];

    // Create PDF data object
    const pdfData: PDFQuoteData = {
      nombre_archivo: `cotizacion_${params.cotizacionId}.pdf`,
      num_cotizacion: params.cotizacionId,
      num_productos: formattedProducts.length,
      cliente: params.cliente.nombre,
      telefono_cliente: params.cliente.telefono,
      vendedor: params.vendedor.nombre,
      telefono_vendedor: params.vendedor.telefono,
      correo_vendedor: params.vendedor.correo,
      fecha_cotizacion: currentDate,
      valor_iva: params.valor_iva,
      tiempo_entrega: params.tiempo_entrega,
      moneda: params.moneda,
      subtotal: totals.subtotal,
      descuento: totals.descuento,
      iva: totals.iva,
      envio: totals.envio,
      total: totals.total,
      titular: params.datos_bancarios.titular,
      cuenta: params.datos_bancarios.cuenta,
      clabe: params.datos_bancarios.clabe,
      atencion: params.cliente.atencion || '',
      productos: productsString,
    };

    // Generate PDF
    const pdfBuffer = await generateQuotePDF(pdfData);

    // Upload to Supabase Storage
    const fileName = `cotizacion_${params.cotizacionId}_${Date.now()}.pdf`;
    const pdfUrl = await uploadPDFToSupabase(pdfBuffer, fileName);

    // Update the cotizacion record in the database with the PDF URL
    const { error } = await supabase
      .from('cotizaciones')
      .update({
        pdf_url: pdfUrl,
        total: totals.total,
        subtotal: totals.subtotal,
        iva: totals.iva,
        descuento: totals.descuento,
        envio: totals.envio,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.cotizacionId);

    if (error) {
      throw error;
    }

    return { success: true, pdfUrl };

  } catch (error) {
    console.error('Error generating and saving PDF:', error);
    return { success: false, error: (error as Error).message };
  }
} 