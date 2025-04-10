'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Eye, Pen, Trash, FileText, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { ResponsiveTable } from "@/components/ui/responsive-table";

interface Producto {
  id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  descuento?: number;
}

interface Cotizacion {
  cotizacion_id: number;
  cliente_id: number;
  fecha_cotizacion: string;
  moneda: string;
  tipo_cambio: number;
  iva: number;
  precio_total: number;
  descuento_total: number;
  tiempo_estimado: string;
  estatus: string;
  envio: number | null;
  productos: Producto[];
  estatus_pago?: string;
}

// Add function to detect mobile devices
const isMobileDevice = () => {
  return (
    typeof window !== 'undefined' && 
    (window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  );
};

export default function CotizacionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [cliente, setCliente] = useState<{ nombre: string; celular: string; correo?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const supabase = createClient();
  const cotizacionId = typeof params.id === 'string' ? parseInt(params.id, 10) : 0
  
  useEffect(() => {
    if (cotizacionId) {
      fetchCotizacion()
    }
  }, [cotizacionId])
  
  const fetchCotizacion = async () => {
    try {
      setIsLoading(true)
      
      // Fetch the cotizacion
      const { data: cotizacionData, error: cotizacionError } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('cotizacion_id', cotizacionId)
        .single()
      
      if (cotizacionError) throw cotizacionError
      
      if (cotizacionData) {
        // Fetch productos for this cotizacion
        const { data: productosData, error: productosError } = await supabase
          .from('cotizacion_productos')
          .select(`
            cotizacion_producto_id,
            producto_id,
            cantidad,
            precio_unitario,
            descuento_producto,
            subtotal,
            productos:producto_id (nombre)
          `)
          .eq('cotizacion_id', cotizacionId)
        
        if (productosError) {
          console.error('Error fetching products:', productosError)
        }
        
        // Format productos
        const productos = productosData ? productosData.map(item => ({
          id: item.cotizacion_producto_id.toString(),
          nombre: item.productos?.nombre || 'Producto sin nombre',
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          precio_total: item.subtotal,
          descuento: item.descuento_producto
        })) : [];
        
        // Format the cotizacion data
        const formattedCotizacion: Cotizacion = {
          cotizacion_id: cotizacionData.cotizacion_id,
          cliente_id: cotizacionData.cliente_id,
          fecha_cotizacion: cotizacionData.fecha_cotizacion,
          moneda: cotizacionData.moneda,
          tipo_cambio: cotizacionData.tipo_cambio,
          iva: cotizacionData.iva,
          descuento_total: cotizacionData.descuento_total,
          precio_total: cotizacionData.precio_total,
          tiempo_estimado: cotizacionData.tiempo_estimado,
          estatus: cotizacionData.estatus,
          envio: cotizacionData.envio,
          estatus_pago: cotizacionData.estatus_pago,
          productos: productos
        }
        
        setCotizacion(formattedCotizacion)
        
        // Fetch client data
        if (cotizacionData.cliente_id) {
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .select('nombre, celular, correo')
            .eq('cliente_id', cotizacionData.cliente_id)
            .single()
          
          if (clienteError) {
            console.error('Error fetching client:', clienteError)
          } else if (clienteData) {
            setCliente(clienteData)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching cotizacion:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar la cotización',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer.')) {
      return
    }
    
    try {
      setIsDeleting(true)
      
      const { error } = await supabase
        .from('cotizaciones')
        .delete()
        .eq('cotizacion_id', cotizacionId)
      
      if (error) throw error
      
      toast({
        title: 'Cotización eliminada',
        description: 'La cotización se ha eliminado correctamente',
      })
      
      router.push('/cotizaciones')
    } catch (error) {
      console.error('Error deleting cotizacion:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la cotización',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }
  
  const openPdf = () => {
    if (cotizacion?.pdf_url) {
      if (isMobileDevice()) {
        // For mobile devices, trigger download instead of opening in a new tab
        const link = document.createElement('a');
        link.href = cotizacion.pdf_url;
        link.setAttribute('download', `${cotizacion.cotizacion_id}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For desktop, open in a new tab
        window.open(cotizacion.pdf_url, '_blank');
      }
    } else {
      toast({
        title: 'PDF no disponible',
        description: 'Esta cotización aún no tiene un PDF generado',
        variant: 'destructive',
      });
    }
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!cotizacion) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Cotización no encontrada</h2>
          <p className="text-gray-600 mb-4">La cotización que buscas no existe o ha sido eliminada</p>
          <Link href="/cotizaciones">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a cotizaciones
            </Button>
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Link href="/cotizaciones">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Cotización #{cotizacion.cotizacion_id}</h1>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            cotizacion.estatus.toLowerCase() === 'pendiente'
              ? 'bg-yellow-100 text-yellow-800'
              : cotizacion.estatus.toLowerCase() === 'aprobada'
              ? 'bg-green-100 text-green-800'
              : cotizacion.estatus.toLowerCase() === 'rechazada'
              ? 'bg-red-100 text-red-800'
              : cotizacion.estatus.toLowerCase() === 'cerrada'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {cotizacion.estatus}
          </span>
        </div>
        
        <div className="flex gap-2">
          {cotizacion.pdf_url && (
            <Button variant="outline" onClick={openPdf}>
              <Eye className="mr-2 h-4 w-4" />
              Ver PDF
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/cotizaciones/editar/${cotizacion.cotizacion_id}`)}>
            <Pen className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash className="mr-2 h-4 w-4" />
                Eliminar
              </>
            )}
          </Button>
          
          <Button 
            variant="default"
            onClick={() => {
              // Use direct-pdf endpoint for immediate download
              if (isMobileDevice()) {
                // For mobile devices, create an anchor element and trigger download
                const link = document.createElement('a');
                link.href = `/api/direct-pdf/${cotizacion.cotizacion_id}`;
                link.setAttribute('download', `${cotizacion.cotizacion_id}.pdf`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                // For desktop, open in a new tab
                window.open(`/api/direct-pdf/${cotizacion.cotizacion_id}`, '_blank');
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          
          <Button 
            variant="outline"
            onClick={async () => {
              try {
                // Show loading indicator
                toast({
                  title: "Generando PDF",
                  description: "Por favor espere mientras se genera el PDF...",
                });
                
                // Make the API call
                const response = await fetch(`/api/cotizaciones/${cotizacion.cotizacion_id}/pdf`, {
                  method: 'POST',
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to generate PDF');
                }
                
                const data = await response.json();
                
                // Update the cotizacion state with the new PDF URL
                setCotizacion({
                  ...cotizacion,
                  pdf_url: data.pdfUrl
                });
                
                toast({
                  title: "PDF Generado",
                  description: "El PDF ha sido generado y guardado correctamente.",
                });
                
                // Handle viewing/downloading the PDF based on device
                if (data.pdfUrl) {
                  if (isMobileDevice()) {
                    // For mobile devices, trigger download
                    const link = document.createElement('a');
                    link.href = data.pdfUrl;
                    link.setAttribute('download', `${cotizacion.cotizacion_id}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } else {
                    // For desktop, open in a new tab
                    window.open(data.pdfUrl, '_blank');
                  }
                }
              } catch (error) {
                console.error('Error generating PDF:', error);
                toast({
                  title: "Error",
                  description: error instanceof Error ? error.message : "Ocurrió un error al generar el PDF",
                  variant: "destructive",
                });
              }
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            {cotizacion.pdf_url ? 'Regenerar PDF' : 'Generar PDF'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Información del Cliente</h2>
          
          {cliente ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium">{cliente.nombre}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{cliente.celular}</p>
              </div>
              
              {cliente.correo && (
                <div>
                  <p className="text-sm text-gray-500">Correo</p>
                  <p className="font-medium">{cliente.correo}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No se encontró información del cliente</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Detalles de la Cotización</h2>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Fecha</p>
              <p className="font-medium">{formatDate(cotizacion.fecha_cotizacion)}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Moneda</p>
              <p className="font-medium">{cotizacion.moneda}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Tiempo de Entrega</p>
              <p className="font-medium">{cotizacion.tiempo_estimado}</p>
            </div>
            
            {cotizacion.estatus_pago && (
              <div>
                <p className="text-sm text-gray-500">Estado de Pago</p>
                <p className="font-medium">{
                  cotizacion.estatus_pago === 'anticipo' 
                    ? 'Con anticipo' 
                    : cotizacion.estatus_pago === 'pagado' 
                    ? 'Pagado' 
                    : 'Pendiente'
                }</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Resumen</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">
                {formatCurrency(cotizacion.precio_total - (cotizacion.iva || 0) - (cotizacion.envio || 0), cotizacion.moneda)}
              </span>
            </div>
            
            {cotizacion.descuento_total > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Descuento</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(cotizacion.descuento_total, cotizacion.moneda)}
                </span>
              </div>
            )}
            
            {cotizacion.iva > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">IVA (16%)</span>
                <span className="font-medium">
                  {formatCurrency(cotizacion.iva, cotizacion.moneda)}
                </span>
              </div>
            )}
            
            {cotizacion.envio && cotizacion.envio > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Envío</span>
                <span className="font-medium">
                  {formatCurrency(cotizacion.envio, cotizacion.moneda)}
                </span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center font-bold">
              <span>Total</span>
              <span>
                {formatCurrency(cotizacion.precio_total, cotizacion.moneda)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Productos</h2>
        
        {cotizacion.productos && cotizacion.productos.length > 0 ? (
          <ResponsiveTable>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Unitario
                  </th>
                  {cotizacion.productos.some(p => p.descuento && p.descuento > 0) && (
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descuento
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cotizacion.productos.map((producto) => (
                  <tr key={producto.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {producto.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {producto.cantidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(producto.precio_unitario, cotizacion.moneda)}
                    </td>
                    {cotizacion.productos.some(p => p.descuento && p.descuento > 0) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        {producto.descuento ? `${producto.descuento}%` : '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(producto.precio_total, cotizacion.moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        ) : (
          <div className="bg-gray-50 p-4 rounded-md text-gray-500">
            No hay productos asociados a esta cotización
          </div>
        )}
      </div>
    </div>
  )
} 