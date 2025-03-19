'use server'

import { supabaseAdmin } from '@/lib/supabase/client';
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
  productos: Array<{
    descripcion: string;
    precio_unitario?: number;
    precio_final?: number;
    cantidad: number;
    descuento?: number;
    color?: string;
  }>;
  cliente: {
    nombre: string;
    telefono: string;
    atencion?: string;
  };
  vendedor: {
    nombre: string;
    telefono: string;
    correo: string;
  };
  tiempo_entrega: string;
  valor_iva: string;
  moneda: string;
  datos_bancarios: {
    titular: string;
    cuenta: string;
    clabe: string;
  };
}

export interface PDFGenerationResult {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

export async function generateAndSaveQuotePDF(params: GeneratePDFParams): Promise<PDFGenerationResult> {
  try {
    // Current date formatted as DD/MM/YYYY
    const currentDate = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Format products for PDF generation
    const formattedProducts = params.productos
      .filter(p => p.descripcion && p.cantidad > 0)
      .map(p => ({
        descripcion: p.descripcion,
        precio_unitario: p.precio_final || p.precio_unitario || 0,
        cantidad: p.cantidad,
        descuento: p.descuento || 0,
        color: p.color || '',
      }));

    // Calculate totals
    const totals = formattedProducts.reduce((acc, product) => {
      const subtotalProduct = product.precio_unitario * product.cantidad * (1 - (product.descuento || 0));
      acc.subtotal += subtotalProduct;
      return acc;
    }, { 
      subtotal: 0, 
      descuento: 0, 
      iva: 0, 
      envio: 0, 
      total: 0 
    });

    // Fetch current cotizacion for additional details
    const { data: cotizacion, error: fetchError } = await supabaseAdmin
      .from('cotizaciones')
      .select('descuento, iva, envio')
      .eq('id', params.cotizacionId)
      .single();

    if (fetchError) {
      console.error('Error fetching cotizacion details:', fetchError);
      return { success: false, error: 'Failed to fetch cotizacion details' };
    }

    // Apply general discount
    totals.descuento = totals.subtotal * (cotizacion?.descuento || 0);
    
    // Calculate IVA
    const hasIVA = params.valor_iva === '16%';
    totals.iva = hasIVA ? (totals.subtotal - totals.descuento) * 0.16 : 0;
    
    // Add shipping
    totals.envio = cotizacion?.envio || 0;
    
    // Calculate total
    totals.total = (totals.subtotal - totals.descuento) + totals.iva + totals.envio;

    // Create products string (format: descripcion~precio_unitario~cantidad~precio_total)
    const productsString = formattedProducts.map(product => {
      const precio_total = product.precio_unitario * product.cantidad * (1 - (product.descuento || 0));
      return `${product.descripcion}~${product.precio_unitario.toFixed(2)}~${product.cantidad}~${precio_total.toFixed(2)}`;
    }).join('~');

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

    // Upload to Supabase Storage - use consistent filename to ensure replacement
    const fileName = `${params.cotizacionId}.pdf`;
    const pdfUrl = await uploadPDFToSupabase(pdfBuffer, fileName);

    // Update the cotizacion record in the database with the PDF URL
    const { error } = await supabaseAdmin
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