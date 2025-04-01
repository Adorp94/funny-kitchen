'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Eye, Pen, Trash, FileText, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { ResponsiveTable } from "@/components/ui/responsive-table";

interface Producto {
  id: string
  descripcion: string
  precio_unitario: number
  cantidad: number
  precio_total: number
  color?: string
  descuento?: number
}

interface Cotizacion {
  id: number
  cliente_id: string
  productos: Producto[]
  subtotal: number
  descuento: number
  iva: number
  envio: number
  total: number
  moneda: 'Pesos' | 'Dólares'
  valor_iva: '16%' | '0%'
  tiempo_entrega: string
  estatus: string
  created_at: string
  pdf_url?: string
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
  const [cliente, setCliente] = useState<{ nombre: string; telefono: string; atencion?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  
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
        .eq('id', cotizacionId)
        .single()
      
      if (cotizacionError) throw cotizacionError
      
      if (cotizacionData) {
        // Format the cotizacion data
        const formattedCotizacion: Cotizacion = {
          id: cotizacionData.id,
          cliente_id: cotizacionData.cliente_id,
          productos: cotizacionData.productos || [],
          subtotal: cotizacionData.subtotal || 0,
          descuento: cotizacionData.descuento || 0,
          iva: cotizacionData.iva || 0,
          envio: cotizacionData.envio || 0,
          total: cotizacionData.total || 0,
          moneda: cotizacionData.moneda || 'Pesos',
          valor_iva: cotizacionData.valor_iva || '16%',
          tiempo_entrega: cotizacionData.tiempo_entrega || '7 días',
          estatus: cotizacionData.estatus || 'Pendiente',
          created_at: cotizacionData.created_at,
          pdf_url: cotizacionData.pdf_url,
        }
        
        setCotizacion(formattedCotizacion)
        
        // Fetch client data
        if (cotizacionData.cliente_id) {
          const { data: clienteData, error: clienteError } = await supabase
            .from('clientes')
            .select('nombre, telefono, atencion')
            .eq('id', cotizacionData.cliente_id)
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
        .eq('id', cotizacionId)
      
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
        link.setAttribute('download', `cotizacion-${cotizacion.id}.pdf`);
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
          <h1 className="text-2xl font-bold">Cotización #{cotizacion.id}</h1>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            cotizacion.estatus === 'Pendiente'
              ? 'bg-yellow-100 text-yellow-800'
              : cotizacion.estatus === 'Aceptada'
              ? 'bg-green-100 text-green-800'
              : cotizacion.estatus === 'Rechazada'
              ? 'bg-red-100 text-red-800'
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
          <Button variant="outline" onClick={() => router.push(`/cotizaciones/editar/${cotizacion.id}`)}>
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
                link.href = `/api/direct-pdf/${cotizacion.id}`;
                link.setAttribute('download', `cotizacion-${cotizacion.id}.pdf`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                // For desktop, open in a new tab
                window.open(`/api/direct-pdf/${cotizacion.id}`, '_blank');
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
                const response = await fetch(`/api/cotizaciones/${cotizacion.id}/pdf`, {
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
                    link.setAttribute('download', `cotizacion-${cotizacion.id}.pdf`);
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Información General</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Cliente</p>
              <p className="font-medium">{cliente?.nombre || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Teléfono</p>
              <p className="font-medium">{cliente?.telefono || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Atención a</p>
              <p className="font-medium">{cliente?.atencion || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fecha de creación</p>
              <p className="font-medium">{formatDate(cotizacion.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Moneda</p>
              <p className="font-medium">{cotizacion.moneda}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tiempo de entrega</p>
              <p className="font-medium">{cotizacion.tiempo_entrega}</p>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold mb-4">Productos</h2>
          
          {cotizacion.productos.length > 0 ? (
            <div className="border rounded-md">
              <ResponsiveTable noBorder>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Descripción
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Cantidad
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Precio Unitario
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cotizacion.productos.map((producto, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {producto.descripcion}
                          {producto.color && <span className="ml-2 text-gray-500">({producto.color})</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {producto.cantidad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCurrency(producto.precio_unitario, cotizacion.moneda === 'Dólares' ? 'USD' : 'MXN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCurrency(producto.precio_total, cotizacion.moneda === 'Dólares' ? 'USD' : 'MXN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveTable>
            </div>
          ) : (
            <div className="bg-gray-50 text-center py-8 rounded-md border border-gray-200">
              <p className="text-gray-500">No hay productos en esta cotización</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Resumen</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">
                {formatCurrency(cotizacion.subtotal, cotizacion.moneda === 'Dólares' ? 'USD' : 'MXN')}
              </span>
            </div>
            
            {cotizacion.descuento > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Descuento</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(cotizacion.descuento, cotizacion.moneda === 'Dólares' ? 'USD' : 'MXN')}
                </span>
              </div>
            )}
            
            {cotizacion.iva > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">IVA ({cotizacion.valor_iva})</span>
                <span className="font-medium">
                  {formatCurrency(cotizacion.iva, cotizacion.moneda === 'Dólares' ? 'USD' : 'MXN')}
                </span>
              </div>
            )}
            
            {cotizacion.envio > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Envío</span>
                <span className="font-medium">
                  {formatCurrency(cotizacion.envio, cotizacion.moneda === 'Dólares' ? 'USD' : 'MXN')}
                </span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center font-semibold text-lg">
              <span>Total</span>
              <span className="text-green-700">
                {formatCurrency(cotizacion.total, cotizacion.moneda === 'Dólares' ? 'USD' : 'MXN')}
              </span>
            </div>
          </div>
          
          <QuotationActions
            cotizacionId={cotizacion.id}
            clienteId={cotizacion.cliente_id}
            productos={cotizacion.productos}
            descuento={cotizacion.descuento}
            envio={cotizacion.envio}
            moneda={cotizacion.moneda}
            valor_iva={cotizacion.valor_iva}
            tiempo_entrega={cotizacion.tiempo_entrega}
            hasExistingPdf={!!cotizacion.pdf_url}
            onPdfGenerated={(pdfUrl) => {
              // Update the cotizacion state with the new PDF URL
              setCotizacion({
                ...cotizacion,
                pdf_url: pdfUrl
              });
              
              toast({
                title: "PDF Guardado",
                description: "La URL del PDF ha sido actualizada en la cotización.",
              });
            }}
          />
        </div>
      </div>
    </div>
  )
} 