import { NextRequest, NextResponse } from 'next/server';
import { generateQuotePDF } from '@/lib/aws/lambda';
import { getSignedUrlFromS3 } from '@/lib/aws/s3';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Product {
  cantidad: number;
  precio_final: number;
  descuento: number;
  productos: {
    nombre: string;
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = createServerSupabaseClient();
  
  try {
    // Get the quote data from database
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select('*, clientes(*), vendedores(*)')
      .eq('cotizacion_id', body.cotizacion_id)
      .single();
      
    if (cotizacionError) throw cotizacionError;
    
    // Get the products related to the quote
    const { data: productos, error: productosError } = await supabase
      .from('prodsxcotizacion')
      .select('*, productos(*)')
      .eq('cotizacion_id', body.cotizacion_id);
      
    if (productosError) throw productosError;
    
    // Prepare the payload for the Lambda function
    const payload = {
      nombre_archivo: `COT-${cotizacion.cotizacion_id}-${cotizacion.clientes.nombre}.pdf`,
      num_cotizacion: cotizacion.cotizacion_id,
      num_productos: productos.length,
      cliente: cotizacion.clientes.nombre,
      telefono_cliente: cotizacion.clientes.celular,
      vendedor: `${cotizacion.vendedores.nombre} ${cotizacion.vendedores.apellidos}`,
      telefono_vendedor: cotizacion.vendedores.telefono,
      correo_vendedor: cotizacion.vendedores.correo,
      fecha_cotizacion: new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-MX'),
      valor_iva: cotizacion.iva === 1.16 ? "16%" : "0%",
      tiempo_entrega: `${cotizacion.tiempo_estimado} semanas`,
      moneda: cotizacion.moneda,
      subtotal: productos.reduce((sum: number, prod: Product) => {
        return sum + (prod.cantidad * prod.precio_final);
      }, 0).toFixed(2),
      descuento: (productos.reduce((sum: number, prod: Product) => {
        return sum + (prod.cantidad * prod.precio_final * prod.descuento);
      }, 0)).toFixed(2),
      iva: (productos.reduce((sum: number, prod: Product) => {
        const subtotal = prod.cantidad * prod.precio_final * (1 - prod.descuento);
        return sum + (subtotal * (cotizacion.iva - 1));
      }, 0)).toFixed(2),
      envio: cotizacion.envio || 0,
      total: cotizacion.precio_total.toFixed(2),
      titular: cotizacion.iva === 1.16 ? 'FUNNY KITCHEN S.A. DE C.V' : 'PABLO DANIEL ANAYA GOYA',
      cuenta: cotizacion.iva === 1.16 ? '012 244 0415' : '047 294 1945',
      clabe: cotizacion.iva === 1.16 ? '012 320 00122440415 9' : '0123 2000 4729 419455',
      atencion: cotizacion.clientes.atencion || '',
      productos: productos.map((prod: Product) => {
        const descripcion = prod.productos.nombre;
        const pu = prod.precio_final.toFixed(2);
        const cantidad = prod.cantidad.toString();
        const precio = (prod.cantidad * prod.precio_final * (1 - prod.descuento)).toFixed(2);
        return `${descripcion}~${pu}~${cantidad}~${precio}`;
      }).join('~')
    };
    
    // Call the Lambda function to generate the PDF
    await generateQuotePDF(payload);
    
    // Get a signed URL to the generated PDF
    const pdfUrl = await getSignedUrlFromS3(payload.nombre_archivo);
    
    return NextResponse.json({
      success: true,
      pdfUrl,
      fileName: payload.nombre_archivo
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}