import { CotizacionData } from '@/components/cotizacion/cotizacion-form';
import { ClienteData } from '@/components/cotizacion/cliente-form';
import { ProductoData } from '@/components/cotizacion/producto-form';

export interface PdfGenerationData {
  cotizacion: CotizacionData;
  cliente: ClienteData;
  productos: ProductoData[];
}

/**
 * Generate PDF from cotizacion data
 */
export async function generatePDF(data: PdfGenerationData): Promise<Blob | null> {
  try {
    const response = await fetch('/api/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }
    
    return response.blob();
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  }
}

/**
 * Download PDF with filename
 */
export function downloadPDF(blob: Blob, filename: string = 'cotizacion.pdf'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}